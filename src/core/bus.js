/**
 * 模块间事件总线 —— 模块之间唯一允许的通信方式。
 *
 * 设计要点：
 * 1. 监听器互相隔离：某个监听器抛异常不影响其他监听器，也不影响 emit 调用方。
 * 2. 事件名建议 `模块id:语义`，如 `site:pending-changed`。
 * 3. 禁止用总线绕开权限模型传递敏感数据（vault 数据一律不出模块）。
 */

/**
 * @typedef {(payload:any, event:string) => void} BusListener
 */

export function createBus() {
  /** @type {Map<string, Set<BusListener>>} */
  const channels = new Map();
  /** @type {Array<{moduleId?:string, error:unknown, event:string}>} */
  let failures = [];

  function bucket(event) {
    let set = channels.get(event);
    if (!set) {
      set = new Set();
      channels.set(event, set);
    }
    return set;
  }

  return {
    /**
     * 订阅事件，返回取消订阅函数。
     * @param {string} event
     * @param {BusListener} listener
     * @returns {() => void}
     */
    on(event, listener) {
      if (typeof listener !== 'function') return () => {};
      bucket(event).add(listener);
      return () => this.off(event, listener);
    },

    /**
     * 只订阅一次。
     * @param {string} event
     * @param {BusListener} listener
     * @returns {() => void}
     */
    once(event, listener) {
      const off = this.on(event, (payload, evt) => {
        off();
        listener(payload, evt);
      });
      return off;
    },

    /**
     * @param {string} event
     * @param {BusListener} listener
     */
    off(event, listener) {
      channels.get(event)?.delete(listener);
    },

    /**
     * 广播事件。单个监听器异常被吞掉并记入 failures。
     * @param {string} event
     * @param {any} [payload]
     * @returns {{delivered:number, errors:number}}
     */
    emit(event, payload) {
      const listeners = channels.get(event);
      if (!listeners || listeners.size === 0) return { delivered: 0, errors: 0 };
      let delivered = 0;
      let errors = 0;
      // 快照，防止监听器在回调里增删订阅导致迭代异常
      for (const listener of Array.from(listeners)) {
        try {
          listener(payload, event);
          delivered += 1;
        } catch (error) {
          errors += 1;
          failures.push({ event, error });
          console.warn(`[core] 事件 ${event} 的监听器抛异常：`, error);
        }
      }
      return { delivered, errors };
    },

    /** 清空某事件的全部订阅；不传则清空总线。 */
    clear(event) {
      if (event) channels.delete(event);
      else channels.clear();
    },

    /** 测试与调试用。 */
    listenerCount(event) {
      return channels.get(event)?.size ?? 0;
    },

    /** 取出并清空监听器异常记录。 */
    drainFailures() {
      const out = failures;
      failures = [];
      return out;
    },
  };
}
