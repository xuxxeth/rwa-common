import { decodeErrorResult } from 'viem';

// 1️⃣ 自定义错误 ABI 列表
const errorsAbi = [
  "error InsufficientBalance(uint256,uint256)",
  "error Forbidden()",
  "error AlreadyExecuted()",
  // 继续添加你的其他 custom error
];

// 2️⃣ 生成 selector -> ABI Map
const errorSelectorMap = new Map<string, string>();
for (const abi of errorsAbi) {
  // 计算 selector
  const selector = abiToSelector(abi);
  errorSelectorMap.set(selector, abi);
}

// 3️⃣ 工具函数：把 ABI 字符串转 selector（4 字节）
function abiToSelector(abi: string) {
  const fnSignature = abi.replace(/^error\s+/, ''); // 去掉 error 前缀
  // viem 的 encodeSelector 可以做同样事情，这里用简单方法
  // @ts-ignore
  return '0x' + Buffer.from(fnSignature).toString('hex').slice(0, 8);
}

// 4️⃣ 核心函数：从错误字符串解析
export function parseViemErrorFromString(errorStr: string, rawData?: string) {
  // 正则匹配 0x 开头的 8 位 hex（4 字节 selector）
  const regex = /0x[a-fA-F0-9]{8}/g;
  const matches = errorStr.match(regex);

  if (!matches || matches.length === 0) {
    console.log('No error signature found in the string.');
    return;
  }

  const signature = matches[0];
  const abi = errorSelectorMap.get(signature);

  if (!abi) {
    console.log('Unknown error signature:', signature);
    console.log('You can look it up here: https://openchain.xyz/signatures?query=' + signature);
    return;
  }

  if (!rawData) {
    console.log('Found error signature:', signature, 'but raw data not provided for decoding.');
    return;
  }

  try {
    // @ts-ignore
    const decoded = decodeErrorResult({ abi: [abi], data: rawData });
    console.log('Parsed error name:', abi.split('(')[0]);
    console.log('Parsed error args:', decoded);
  } catch (err) {
    console.log('Failed to decode error data:', err, 'raw data:', rawData);
  }
}
