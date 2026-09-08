/**
 * 模块注册表 —— 内核只认识「模块」，不认识任何业务。
 *
 * 职责：
 * - 校验 manifest 必填字段与权限合法性
 * - 维护模块表，支持运行时注册（热插拔）
 * - 注册失败只把该模块标记为 broken，不影响其他模块
 *
 * @typedef {Object} ModuleManifest
 * @property {string} id            全局唯一，小写字母开头，如 'wallet'
 * @property {string} name          显示名
 * @property {string} [icon]        单个 emoji 或图标 key
 * @property {string} version       语义化版本
 * @property {'tab'|'tool'|'hidden'} [nav] 导航形态，默认 'tab'
 * @property {number} [order]       排序，默认 100
 * @property {string[]} [permissions] 'storage'|'net'|'notify'|'vault'|'files'
 * @property {(ctx:ModuleContext)=>void|Promise<void>} mount
 * @property {()=>void} [unmount]
 * @property {(ctx:ModuleContext)=>void} [onShow]
 * @property {()=>void} [onHide]
 * @property {()=>void} [onLock]    声明 vault 权限时必填
 */

import { CoreError, CoreErrorCode } from './errors.js';

/** 全部合法权限。用到什么能力就在 manifest 里声明什么。 */
export const PERMISSIONS = /** @type {const} */ (['storage', 'net', 'notify', 'vault', 'files']);

export const NAV_KINDS = /** @type {const} */ (['tab', 'tool', 'hidden']);

const ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/**
 * 校验 manifest，抛出 CoreError（由 register 捕获转为 broken）。
 * @param {any} manifest
 * @returns {ModuleManifest}
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, 'manifest 必须是对象');
  }
  const { id, name, version, nav = 'tab', icon = '🧩', order, permissions, mount, unmount, onLock } = manifest;

  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new CoreError(
      CoreErrorCode.MANIFEST_INVALID,
      `id 非法：需匹配 ${ID_RE}，收到 ${JSON.stringify(id)}`,
      { moduleId: typeof id === 'string' ? id : undefined },
    );
  }
  if (typeof name !== 'string' || !name.trim()) {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, 'name 不能为空', { moduleId: id });
  }
  if (typeof version !== 'string' || !VERSION_RE.test(version)) {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, `version 需为语义化版本，收到 ${version}`, { moduleId: id });
  }
  if (!NAV_KINDS.includes(nav)) {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, `nav 必须是 ${NAV_KINDS.join('/')}`, { moduleId: id });
  }
  if (mount !== undefined && typeof mount !== 'function') {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, 'mount 必须是函数', { moduleId: id });
  }
  if (unmount !== undefined && typeof unmount !== 'function') {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, 'unmount 必须是函数', { moduleId: id });
  }

  const perms = permissions ?? [];
  if (!Array.isArray(perms)) {
    throw new CoreError(CoreErrorCode.MANIFEST_INVALID, 'permissions 必须是数组', { moduleId: id });
  }
  for (const p of perms) {
    if (!PERMISSIONS.includes(p)) {
      throw new CoreError(CoreErrorCode.PERMISSION_UNKNOWN, `未知权限 "${p}"`, { moduleId: id });
    }
  }
  // vault 是硬约束：能读到敏感数据的模块必须能响应锁定
  if (perms.includes('vault') && typeof onLock !== 'function') {
    throw new CoreError(
      CoreErrorCode.PERMISSION_MISSING,
      '声明 vault 权限的模块必须实现 onLock()',
      { moduleId: id },
    );
  }

  return {
    ...manifest,
    icon,
    nav,
    order: typeof order === 'number' ? order : 100,
    permissions: perms,
  };
}

/**
 * @param {{log?:ReturnType<import('./errors.js').createDegradationLog>}} [deps]
 */
export function createRegistry(deps = {}) {
  /** @type {Map<string, {manifest:ModuleManifest, status:'registered'|'broken', error?:string}>} */
  const modules = new Map();

  const api = {
    /**
     * 注册模块。永远不会抛异常——失败则以 broken 登记。
     * @param {ModuleManifest} manifest
     * @returns {{ok:boolean, id:string, status:'registered'|'broken', error?:string}}
     */
    register(manifest) {
      let checked;
      try {
        checked = validateManifest(manifest);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const id = manifest && typeof manifest.id === 'string' ? manifest.id : '<unknown>';
        deps.log?.record(id, 'register', error);
        // 非法 manifest 也登记，保证导航上能看见「不可用」
        if (!modules.has(id)) {
          modules.set(id, { manifest: { id, name: id, version: '0.0.0', nav: 'tab' }, status: 'broken', error: message });
        }
        return { ok: false, id, status: 'broken', error: message };
      }

      const { id } = checked;
      if (modules.has(id) && modules.get(id).status === 'registered') {
        const message = `模块 id 重复：${id}`;
        const error = new CoreError(CoreErrorCode.MANIFEST_DUPLICATE, message, { moduleId: id });
        deps.log?.record(id, 'register', error);
        return { ok: false, id, status: 'broken', error: message };
      }

      modules.set(id, { manifest: checked, status: 'registered' });
      return { ok: true, id, status: 'registered' };
    },

    /**
     * 卸载并移除一个模块（热插拔）。
     * @param {string} id
     */
    unregister(id) {
      const record = modules.get(id);
      if (!record) return false;
      try {
        record.manifest.unmount?.();
      } catch (error) {
        deps.log?.record(id, 'unmount', error);
      }
      return modules.delete(id);
    },

    /** @param {string} id */
    get(id) {
      return modules.get(id)?.manifest ?? null;
    },

    /**
     * @param {string} id
     * @returns {'registered'|'broken'|'missing'}
     */
    status(id) {
      return modules.has(id) ? modules.get(id).status : 'missing';
    },

    /** 把已注册模块标记为 broken（mount 失败等运行时降级）。 */
    markBroken(id, error) {
      const record = modules.get(id);
      if (!record) return;
      record.status = 'broken';
      record.error = error instanceof Error ? error.message : String(error);
    },

    /** 全部模块记录（含 broken）。 */
    all() {
      return Array.from(modules.values());
    },

    /** 仅健康模块。 */
    healthy() {
      return this.all()
        .filter((r) => r.status === 'registered')
        .map((r) => r.manifest);
    },

    /** 参与导航的模块，按 order 升序。 */
    nav() {
      return this.all()
        .filter((r) => r.manifest.nav !== 'hidden')
        .sort((a, b) => a.manifest.order - b.manifest.order || a.manifest.id.localeCompare(b.manifest.id))
        .map((r) => ({ ...r.manifest, status: r.status, error: r.error }));
    },

    /**
     * 是否声明了某权限。
     * @param {string} id
     * @param {string} permission
     */
    hasPermission(id, permission) {
      return Boolean(modules.get(id)?.manifest.permissions?.includes(permission));
    },

    size() {
      return modules.size;
    },

    clear() {
      modules.clear();
    },
  };

  return api;
}
