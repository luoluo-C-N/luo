/**
 * 统一错误与降级处理。
 *
 * 内核的唯一承诺：任何模块出错，都只影响它自己。
 * 所有跨内核的异常都必须经过本文件，禁止裸 try/catch 吞异常。
 */

/** 错误码枚举（用于日志、降级卡片提示，不直接展示给用户原文）。 */
export const CoreErrorCode = {
  MANIFEST_INVALID: 'manifest/invalid',
  MANIFEST_DUPLICATE: 'manifest/duplicate',
  PERMISSION_UNKNOWN: 'permission/unknown',
  PERMISSION_MISSING: 'permission/missing',
  MODULE_LOAD: 'module/load',
  MODULE_MOUNT: 'module/mount',
  MODULE_UNMOUNT: 'module/unmount',
  MODULE_RUNTIME: 'module/runtime',
  CAPABILITY_DENIED: 'capability/denied',
};

export class CoreError extends Error {
  /**
   * @param {string} code 见 CoreErrorCode
   * @param {string} message 人话描述
   * @param {{moduleId?:string, phase?:string, cause?:unknown}} [meta]
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'CoreError';
    this.code = code;
    this.moduleId = meta.moduleId;
    this.phase = meta.phase;
    if (meta.cause) this.cause = meta.cause;
  }
}

/** 把任意 throw 出来的东西规整成 Error。 */
export function toError(value) {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

/**
 * 降级记录表：模块崩了往里记一条，导航与「关于」页据此展示。
 */
export function createDegradationLog() {
  /** @type {Array<{moduleId:string, phase:string, code:string, message:string, at:number}>} */
  const items = [];

  return {
    /**
     * @param {string} moduleId
     * @param {string} phase 'register' | 'mount' | 'unmount' | 'runtime'
     * @param {unknown} error
     */
    record(moduleId, phase, error) {
      const err = toError(error);
      const entry = {
        moduleId,
        phase,
        code: err instanceof CoreError ? err.code : CoreErrorCode.MODULE_RUNTIME,
        message: err.message || String(err),
        at: Date.now(),
      };
      items.push(entry);
      // 保留内核自己的可见性，但不中断流程
      console.warn(`[core] 模块 ${moduleId} 在 ${phase} 阶段降级：${entry.message}`);
      return entry;
    },
    list() {
      return items.slice();
    },
    forModule(moduleId) {
      return items.filter((it) => it.moduleId === moduleId);
    },
    clear() {
      items.length = 0;
    },
  };
}

/**
 * @typedef {{ok:true, value:T}|{ok:false, error:Error}} AttemptResult<T>
 * @template T
 */

/**
 * 同 guard，但显式区分「成功且返回 undefined」与「抛异常」。
 * 模块 mount() 常常不返回任何值，因此不能用 null 判断失败。
 *
 * @template T
 * @param {string} moduleId
 * @param {string} phase
 * @param {() => T | Promise<T>} fn
 * @param {{log?:ReturnType<typeof createDegradationLog>}} [deps]
 * @returns {Promise<AttemptResult<T>>}
 */
export async function attempt(moduleId, phase, fn, deps = {}) {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    const err = toError(error);
    if (deps.log) deps.log.record(moduleId, phase, err);
    return { ok: false, error: err };
  }
}

/**
 * 执行一段可能炸的模块代码；炸了就记降级并返回 null，绝不向外抛。
 * 注意：fn 正常返回 undefined 时也会得到 null，判断失败请用 attempt()。
 *
 * @template T
 * @param {string} moduleId
 * @param {string} phase
 * @param {() => T | Promise<T>} fn
 * @param {{log?:ReturnType<typeof createDegradationLog>}} [deps]
 * @returns {Promise<T | null>}
 */
export async function guard(moduleId, phase, fn, deps = {}) {
  try {
    return await fn();
  } catch (error) {
    if (deps.log) deps.log.record(moduleId, phase, error);
    return null;
  }
}
