/** shell/drawer —— 侧边栏抽屉开合（S7；与 src/drawer-gesture.js DI 版并存，待合并） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function applyDrawer(p){
  dProgress=Math.max(0,Math.min(1,p));
  drawerEl.style.transform='translate3d('+(dProgress*DW-DW)+'px,0,0)';
  maskEl.style.opacity=String(dProgress);
  maskEl.style.pointerEvents=dProgress>0.02?'auto':'none';
  phoneEl.classList.toggle('open',dProgress>0.02);
  if(dProgress<=0.001){
    pageEl.style.transform='';pageEl.style.borderRadius='';pageEl.style.boxShadow='';
  }else{
    pageEl.style.transform='translate3d('+(58*dProgress).toFixed(1)+'px,0,0) scale('+(1-0.06*dProgress).toFixed(3)+')';
    pageEl.style.borderRadius=(28*dProgress).toFixed(1)+'px';
    pageEl.style.boxShadow=dProgress>0.02?'-24px 0 60px rgba(28,28,30,'+(0.20*dProgress).toFixed(3)+')':'none';
  }
}

export function snapDrawer(open){
  drawerEl.classList.add('anim');maskEl.classList.add('anim');pageEl.classList.add('anim');
  applyDrawer(open?1:0);
  setTimeout(function(){drawerEl.classList.remove('anim');maskEl.classList.remove('anim');pageEl.classList.remove('anim')},380);
}

export function openDrawer(){snapDrawer(true)}

export function closeDrawer(){snapDrawer(false)}

export const __exports__ = { applyDrawer, snapDrawer, openDrawer, closeDrawer };
