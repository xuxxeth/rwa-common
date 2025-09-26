import { keccak256, toHex } from "viem"

import { errorsList } from "./errors"

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

// 运行并打印
// const table = 
// console.log(table);
