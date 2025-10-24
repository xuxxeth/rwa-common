import { keccak256, toHex } from "viem"

import { errorsList } from "./errors"
import { AppErrorCodeToTextMap } from './AppErrorCodeToText'
import { ERROR_CODE } from "./constants";

/**
 * 规范化参数类型（将 `uint` -> `uint256`，`int` -> `int256`，去掉多余空格等）
 */
function canonicalizeParamType(t: string) {
  t = t.trim();
  if (t === "uint") return "uint256";
  if (t === "int") return "int256";
  // 规范化 `string`/`bytes` 等（通常无需改）
  // 保持其它类型不变 (address, bytes4, bytes, uint8, uint256, etc.)
  return t;
}

function canonicalizeErrorSignature(raw: string) {
  // 删除前缀 "error "（如果存在）
  let s = raw.trim();
  if (s.startsWith("error ")) s = s.slice(6).trim();

  const m = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (!m) {
    throw new Error(`Cannot parse error signature: ${raw}`);
  }
  const name = m[1];
  const argsStr = m[2].trim();
  const types = argsStr === ""
    ? []
    : argsStr.split(",").map(t => canonicalizeParamType(t));
  return `${name}(${types.join(",")})`;
}

/**
 * 计算 error selector：keccak256(canonicalSignature) 的前 4 字节 => hex 0x........
 * 注意：keccak256 返回的是 hex 字符串，我们直接 slice 前 10 个字符（0x + 8 hex chars）
 */
function errorSelectorFromSignature(signature: string) {
  // signature 应该已经是 canonicalized，如 "PauseAction(uint256)"
  // keccak256 输入是 raw utf-8 bytes of the signature
  const hashHex = keccak256(new TextEncoder().encode(signature)); // returns "0x...."
  // take first 4 bytes -> 8 hex char -> include 0x prefix => slice(0,10)
  return hashHex.slice(0, 10);
}


function buildErrorSelectorMap(list: string[]) {
  return list.map(raw => {
    const canonical = canonicalizeErrorSignature(raw);
    const selector = errorSelectorFromSignature(canonical);
    return { raw, canonical, selector };
  });
}
const errorSelectors = buildErrorSelectorMap(errorsList);

export function parseErrorFromMessage(error: any) {
  const message = error.toString()
  console.log(message)
  try {
    const match = message.match(/0x[0-9a-fA-F]{8}/);
    if (!match) {
      return null;
    }
    const selector = match[0];
    const errorSelector = errorSelectors.find(error => error.selector === selector)
    const name = errorSelector?.canonical ?? "UnknownError";
    console.log('Error: ', selector, name)
    return { selector, name };
  } catch (error) {
    console.log(message)
  }
  
}

type ExtractedError = { name: string; code: string }

/**
 * 从日志中提取错误名与 4 位错误码（优先严格匹配，兜底回溯）
 * - 错误码只匹配 4 位数字（\d{4}），可按需改为 \d+。
 * - 错误名匹配字母/下划线开头，后续字母数字下划线。
 *
 * @param log 原始日志文本
 * @returns { name, code } 或 null
 */
export function extractErrorNameAndCode(log: string): ExtractedError | null {
  console.log(log)
  if (!log || typeof log !== 'string') return null;

  // 优先严格模式：同时捕获 name 与 4 位 code
  const patterns: RegExp[] = [
    // ✅ 匹配多行形式: Error: AppError(uint32 code)\n   (1234)
    /(?:Error:\s*)?([A-Za-z_][A-Za-z0-9_]*)[^\n\r]*\)[^\S\r\n]*[\r\n]+\s*\(\s*(\d{4})\s*\)/i,

    // ✅ 匹配单行紧跟形式: AppError(...)(1234)
    /(?:Error:\s*)?([A-Za-z_][A-Za-z0-9_]*)[^\n\r]*\)\s*\(\s*(\d{4})\s*\)/i,

    // ✅ 匹配 key:value 形式: Error: AppError: 1234 或 AppError: 1234
    /(?:Error[^\S\r\n]*[:]\s*)?([A-Za-z_][A-Za-z0-9_]*)[^\S\r\n]*[:=]\s*(\d{4})\b/i,

    // ✅ 匹配 code=1234 形式: AppError(... code=1234 ...)
    /(?:Error:\s*)?([A-Za-z_][A-Za-z0-9_]*)[^\n\r]{0,120}\bcode\s*=\s*(\d{4})\b/i,

    // ✅ 兜底：AppError ... (1234) 在同一行内
    /(?:Error:\s*)?([A-Za-z_][A-Za-z0-9_]*)[^\n\r]{0,120}\(\s*(\d{4})\s*\)/i,
  ];


  for (const re of patterns) {
    const m = log.match(re);
    if (m && m[1] && m[2]) {
      return { name: m[1], code: m[2] };
    }
  }

  // 如果上面的严格模式没有命中，尝试更通用的回溯策略：
  // 1. 找到所有 "(1234)" 出现位置（或 standalone 4-digit），
  // 2. 对每个位置向左截取一段上下文（例如 200 字符），在这段文本中找最近的 "Name(" 或 "Name:" 或 "Name" 模式。
  const parenRegex = /\(\s*(\d{4})\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(log)) !== null) {
    const code = match[1];
    const idx = match.index;
    // 向左回溯一定长度（例如 200 字符）
    const leftSliceStart = Math.max(0, idx - 200);
    const leftContext = log.slice(leftSliceStart, idx);

    // 在 leftContext 中从右向左寻找形如 Name( 或 Name: 或 Error Name
    // 我们先找 Name( 最严格，再找 Name: 或 Name =
    const namePatterns: RegExp[] = [
      /([A-Za-z_][A-Za-z0-9_]*)\s*\($/i, // ... Name(
      /([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*$/i, // ... Name:
      /([A-Za-z_][A-Za-z0-9_]*)\b$/i, // ... Name (结束)
    ];

    // 为了让 $ 在 right-context 有意义，我们直接尝试从后面匹配
    for (const np of namePatterns) {
      const mm = leftContext.match(np);
      if (mm && mm[1]) {
        return { name: mm[1], code };
      }
    }

    // 另外尝试：在 leftContext 中找到第一个像 ErrorName(...) 的单词（从右侧寻找）
    const generic = /([A-Za-z_][A-Za-z0-9_]*)[^\w]{0,10}$/i;
    const gen = leftContext.match(generic);

    if (gen && gen[1]) {
      return { name: gen[1], code };
    }
  }

  // 如果仍然没有匹配，尝试查找 " code=1234 " 并回溯 name 前缀
  const codeEq = /code\s*=\s*(\d{4})/i.exec(log);
  if (codeEq) {
    const code = codeEq[1];
    const idx = codeEq.index;
    const leftSliceStart = Math.max(0, idx - 200);
    const leftContext = log.slice(leftSliceStart, idx);
    const nameMatch = leftContext.match(/([A-Za-z_][A-Za-z0-9_]*)[^\n\r]*$/i);
    if (nameMatch && nameMatch[1]) {
      return { name: nameMatch[1], code };
    }
  }

  return null;
}

export function getAppErrorMessageFromCode(error: ExtractedError | null) {
  if (error?.name === 'AppError' && error?.code) {
    return AppErrorCodeToTextMap.get(error.code)
  }
}

export function getUserRejection(error: any) {
  const msg = typeof error === "string" ? error : error?.message || error?.details || "";
  const patterns = [
    /User rejected the request/i,
    /User denied transaction/i,
    /User rejected signature/i,
  ];

  for (const regex of patterns) {
    const match = msg.match(regex);
    if (match) return { code: ERROR_CODE.USERREJECT, name: match[0] } ;
  }

  return null;
}
