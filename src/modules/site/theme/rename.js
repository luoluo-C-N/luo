/** theme/rename —— 重命名体系：导航/面板/区块（S7） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function rnNavName(bar,scr){var g=renameStore.nav[bar]||{};return g[scr]||(NAV_DEF[bar].filter(function(p){return p[0]===scr;})[0]||['',''])[1];}

export function rnPanelName(k){return (renameStore.panel&&renameStore.panel[k])||PANEL_DEF[k];}

export function rnSecName(id){return (renameStore.sec&&renameStore.sec[id])||SEC_DEF[id]||'';}

export function applyNavNames(){
  Object.keys(NAV_DEF).forEach(function(bar){
    NAV_DEF[bar].forEach(function(p){
      var nm=rnNavName(bar,p[0]);
      var t=document.querySelector('#tabbar-'+bar+' .tab[data-scr="'+p[0]+'"] .lbl');
      if(t)t.textContent=nm;
      var h=document.querySelector('#'+p[0]+' .nav-title');
      if(h)h.textContent=nm;
    });
  });
}

export function applySecNames(){
  Object.keys(SEC_DEF).forEach(function(id){
    var el=document.getElementById(id);
    if(el&&el.firstChild&&el.firstChild.nodeType===3)el.firstChild.nodeValue=rnSecName(id)+' ';
  });
}

export function applyPanelNames(){
  Object.keys(PANEL_DEF).forEach(function(k){panels[k].name=rnPanelName(k);});
}

export function applyAllNames(){applyNavNames();applySecNames();applyPanelNames();if(typeof renderPanels==='function')renderPanels();}

export function setNavName(bar,scr,val){
  val=val.trim();
  renameStore.nav[bar]=renameStore.nav[bar]||{};
  if(!val)delete renameStore.nav[bar][scr];else renameStore.nav[bar][scr]=val;
  saveRenames();applyNavNames();
}

export function setPanelName(k,val){
  val=val.trim();renameStore.panel=renameStore.panel||{};
  if(!val)delete renameStore.panel[k];else renameStore.panel[k]=val;
  saveRenames();applyPanelNames();renderPanels();
}

export function setSecName(id,val){
  val=val.trim();renameStore.sec=renameStore.sec||{};
  if(!val)delete renameStore.sec[id];else renameStore.sec[id]=val;
  saveRenames();applySecNames();
}

export function saveRenames(){try{localStorage.setItem('renameNames',JSON.stringify(renameStore));}catch(e){}}

export function resetRenames(){
  renameStore={nav:{},panel:{},sec:{}};
  try{localStorage.removeItem('renameNames');}catch(e){}
  applyPanelNames();applyAllNames();renderRenamePage();
  toast('已恢复默认命名');
}

export function rnInput(cur,oninput){
  var w=document.createElement('div');w.style.marginTop='8px';
  var i=document.createElement('input');i.value=cur;
  i.addEventListener('input',function(){oninput(this.value);});
  w.appendChild(i);return w;
}

export function renderRenamePage(){
  var b=document.getElementById('rnBody');if(!b)return;b.innerHTML='';
  /* 分组卡:渐变图标头 + 玻璃输入行 */
  function grp(icon,bg,title,sub){
    var st=document.createElement('div');st.className='section-title';st.textContent=title;b.appendChild(st);
    var c=document.createElement('div');c.className='card rn-group';b.appendChild(c);
    var head=document.createElement('div');head.className='grp-head';
    head.innerHTML='<div class="grp-ic" style="background:'+bg+'">'+icon+'</div><div class="grp-tx"><b>'+title.split(' · ')[0]+'</b><span>'+sub+'</span></div>';
    c.appendChild(head);
    return c;
  }
  function row(c,label,val,oninput){
    var r=document.createElement('div');r.className='rn-row';
    r.innerHTML='<span class="rn-lb">'+label+'</span>';
    var i=document.createElement('input');i.value=val;i.spellcheck=false;
    i.addEventListener('input',function(){oninput(this.value);});
    r.appendChild(i);c.appendChild(r);
    return r;
  }
  var g1=grp('🧭','linear-gradient(135deg,var(--accent),var(--accent2))','网站面板 · 导航标签','底部导航与页面标题跟随改名');
  NAV_DEF.site.forEach(function(p){row(g1,p[1],rnNavName('site',p[0]),function(v){setNavName('site',p[0],v);});});
  var g2=grp('📚','linear-gradient(135deg,#30D158,#00C7BE)','学习面板 · 导航标签','同上,作用于学习面板');
  var g3=grp('🗂️','linear-gradient(135deg,#BF5AF2,#FF375F)','面板名称','侧边栏 · 启动页 · 编辑器全部跟随');
  PANEL_KEYS.forEach(function(k){row(g3,panels[k].name,rnPanelName(k),function(v){setPanelName(k,v);});});
  var g4=grp('📄','linear-gradient(135deg,#FF9F0A,#FF453A)','区块标题 · 状态页','页面内各区块的标题文字');
  [['sec-svc','服务状态'],['sec-ports','开放端口'],['sec-mymods','自定义模块'],['sec-net','网络与安全']].forEach(function(p){
    row(g4,p[1],rnSecName(p[0]),function(v){setSecName(p[0],v);});
  });
  var g5=grp('🏠','linear-gradient(135deg,#30D158,#00C7BE)','区块标题 · 看板页','看板页各区块的标题文字');
  [['sec-todo','待办提醒'],['sec-switch','分区开关速览']].forEach(function(p){
    row(g5,p[1],rnSecName(p[0]),function(v){setSecName(p[0],v);});
  });
  var g6=grp('☀️','linear-gradient(135deg,#FF9F0A,#FF453A)','区块标题 · 学习今日','学习面板今日页的区块标题');
  [].forEach(function(p){
    row(g6,p[1],rnSecName(p[0]),function(v){setSecName(p[0],v);});
  });
  b.scrollTop=0;
}

export function openRenameManager(){renderRenamePage();openSub('pg-rename');}

export const __exports__ = { rnNavName, rnPanelName, rnSecName, applyNavNames, applySecNames, applyPanelNames, applyAllNames, setNavName, setPanelName, setSecName, saveRenames, resetRenames, rnInput, renderRenamePage, openRenameManager };
