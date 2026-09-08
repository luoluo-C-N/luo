/** shell/util —— 轮询注册等通用机制（S7） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function regPoll(fn,ms){POLL_JOBS.push({fn:fn,ms:ms,due:Date.now()+ms});}

export const __exports__ = { regPoll };
