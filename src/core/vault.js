/**
 * vault —— 敏感数据安全地基（v0.03）。
 *
 * 设计：主密码 + PBKDF2-SHA256 派生 AES-GCM 256 位密钥；
 * 明文中不落盘，落盘的只有 salt / 校验密文 / 业务密文；
 * 锁定后内存中的 CryptoKey 立即丢弃（架构 §8.2 §12.1）。
 *
 * 内核边界：本文件不认识任何业务语义，只提供加解密与锁状态。
 */

const SALT_KEY = 'vault:salt';
const VERIFY_KEY = 'vault:verify';
const DEFAULT_ITERATIONS = 120000;
const VERIFY_PLAINTEXT = 'pocket-vault-ok';

function toBase64(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return globalThis.btoa ? globalThis.btoa(bin) : Buffer.from(bytes).toString('base64');
}

function fromBase64(text) {
  if (globalThis.atob) {
    const bin = globalThis.atob(text);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(text, 'base64'));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * @param {{driver?: any, iterations?: number, autoLockMs?: number}} [options]
 */
export function createVault(options = {}) {
  const driver = options.driver;
  const bus = options.bus;
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const autoLockMs = options.autoLockMs ?? 5 * 60 * 1000;

  /** @type {CryptoKey|null} 仅解锁期间驻留内存 */
  let cryptoKey = null;
  let timer = 0;
  let lastError = null;

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const base = await globalThis.crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return globalThis.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function scheduleAutoLock() {
    if (timer) clearTimeout(timer);
    timer = 0;
    if (!autoLockMs) return;
    timer = setTimeout(() => { lock(); }, autoLockMs);
    // 不阻止进程退出（Node 测试/后台场景）
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function lock() {
    cryptoKey = null;
    if (bus) bus.emit('vault:locked', {});
    if (timer) { clearTimeout(timer); timer = 0; }
  }

  async function encryptRaw(key, plaintextBytes) {
    const iv = randomBytes(12);
    const ct = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, plaintextBytes
    );
    return { iv: toBase64(iv), ct: toBase64(ct) };
  }

  async function decryptRaw(key, record) {
    const bytes = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.ct)
    );
    return new Uint8Array(bytes);
  }

  const vault = {
    /** 是否已设置主密码（salt 存在即视为已设置） */
    async isSet() {
      if (!driver) return false;
      return Boolean(await driver.get(SALT_KEY));
    },

    isUnlocked() {
      return cryptoKey !== null;
    },

    /** 首次设置主密码 */
    async setMaster(password) {
      if (!driver) throw new Error('vault 缺少 driver，无法持久化');
      const salt = randomBytes(16);
      const key = await deriveKey(password, salt);
      const enc = new TextEncoder();
      const verify = await encryptRaw(key, enc.encode(VERIFY_PLAINTEXT));
      await driver.set(SALT_KEY, toBase64(salt));
      await driver.set(VERIFY_KEY, JSON.stringify(verify));
      cryptoKey = key;
      lastError = null;
      scheduleAutoLock();
      if (bus) bus.emit('vault:unlocked', {});
      return true;
    },

    /** 用主密码解锁；密码错误返回 false（不抛错，交由调用方提示） */
    async unlock(password) {
      if (!driver) throw new Error('vault 缺少 driver，无法读取');
      const saltText = await driver.get(SALT_KEY);
      if (!saltText) throw new Error('尚未设置主密码');
      const key = await deriveKey(password, fromBase64(saltText));
      try {
        const verify = JSON.parse(await driver.get(VERIFY_KEY));
        const plain = await decryptRaw(key, verify);
        if (new TextDecoder().decode(plain) !== VERIFY_PLAINTEXT) throw new Error('校验失败');
      } catch (error) {
        lastError = error.message;
        return false;
      }
      cryptoKey = key;
      lastError = null;
      scheduleAutoLock();
      if (bus) bus.emit('vault:unlocked', {});
      return true;
    },

    lock,

    lastError() {
      return lastError;
    },

    /** 加密任意可 JSON 化的数据 */
    async encrypt(value) {
      if (!cryptoKey) throw new Error('vault 已锁定，请先解锁');
      const enc = new TextEncoder();
      return encryptRaw(cryptoKey, enc.encode(JSON.stringify(value ?? null)));
    },

    /** 解密；失败抛错（密文被篡改或密钥不符） */
    async decrypt(record) {
      if (!cryptoKey) throw new Error('vault 已锁定，请先解锁');
      const bytes = await decryptRaw(cryptoKey, record);
      return JSON.parse(new TextDecoder().decode(bytes));
    },
  };

  return vault;
}

export { VERIFY_PLAINTEXT };
