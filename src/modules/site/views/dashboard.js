/** views/dashboard —— 看板（S5）。验收: SITE-FR2；hero 三格/趋势/待办 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB-X）；行为变更需走评审。 */

export function updCounts(){cnt('n-posts',N.posts);cnt('n-moments',N.moments);cnt('n-music',N.music);cnt('n-album',N.albums);}

export const __exports__ = { updCounts };
