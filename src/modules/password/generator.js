/** password · 密码生成器（v0.21） */
export function generatePassword(length = 16) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';
  const all = lower + upper + digits + symbols;
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) result += all[bytes[i] % all.length];
  // 确保至少各含一个（替换前 4 位）
  result = result.slice(0, length - 4)
    + lower[bytes[0] % lower.length]
    + upper[bytes[1] % upper.length]
    + digits[bytes[2] % digits.length]
    + symbols[bytes[3] % symbols.length];
  // 打乱
  const arr = result.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export const __exports__ = { generatePassword };
