/** shell/tabs —— 导航基座 + 通用 UI 壳（S7）：jumpTab/segTo/tg/openSub/closeSub/toast 等 */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function jumpTab(id){
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
  document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active')});
  document.querySelector('.tab[data-scr="'+id+'"]').classList.add('active');
  var s=document.getElementById(id);s.classList.add('active');s.scrollTop=0;
}

export function segTo(scope,name){
  var seg=document.getElementById('seg-'+scope);
  seg.querySelectorAll('.seg').forEach(function(x){x.classList.toggle('on',x.dataset.pane===name)});
  document.querySelectorAll('[id^="pane-'+scope+'-"]').forEach(function(p){p.style.display='none'});
  document.getElementById('pane-'+scope+'-'+name).style.display='block';
  document.getElementById('scr-'+scope).scrollTop=0;
}

export function tg(el,label){
  el.classList.toggle('on');
  var on=el.classList.contains('on');
  toast(label+(on?' 已开启 · 前台已生效':' 已关闭 · 前台已隐藏'));
}

export function review(btn,kind){
  var card=btn.closest('.review-card');
  card.classList.add(kind==='ok'?'done-ok':'done-no');
  toast(kind==='ok'?'已通过并同步到网站':'已删除');
  var done=document.getElementById('pane-review-done');
  if(kind==='ok'){var c=card.cloneNode(true);done.insertBefore(c,done.firstChild);}
}

export function subSyncScreens(){
  /* 子页打开时隐藏底层屏幕内容,让壁纸直通(与主页形式一致);全关后恢复 */
  var any=document.querySelector('.subpage.show');
  var sc=document.querySelector('.screens');
  if(sc)sc.style.opacity=any?'0':'';
}

export function openSub(id){
  var el=document.getElementById(id);
  if(!el)return;
  SUB_TOP=Math.min(SUB_TOP+1,63);
  el.style.zIndex=SUB_TOP;
  el.classList.add('show');
  subSyncScreens();
  if(id==='pg-wallpaper'&&typeof renderAccentPicker==='function'){renderAccentPicker();renderThemePresets();}
}

export function closeSub(id){
  var el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('show');
  el.style.zIndex=52;
  subSyncScreens();
}

export function openModules(){openSub('pg-modules')}

export function toggleSheet(){
  var open=document.getElementById('sheet').classList.toggle('show');
  document.getElementById('mask').classList.toggle('show',open);
  document.querySelector('.phone').classList.toggle('sheet-open',open);
}

export function hideSheet(){
  document.getElementById('sheet').classList.remove('show');
  document.getElementById('mask').classList.remove('show');
  document.querySelector('.phone').classList.remove('sheet-open');
}

export function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('show')},1800);
}

export function askConfirm(msg,okText){
  return new Promise(function(res){moOpen({msg:msg,ok:okText||'删除',danger:true},function(v){res(v===true);});});
}

export function askText(title,msg,placeholder,val){
  return new Promise(function(res){moOpen({title:title,msg:msg,input:placeholder,val:val||'',ok:'添加'},function(v){res(v);});});
}

export const __exports__ = { jumpTab, segTo, tg, review, subSyncScreens, openSub, closeSub, openModules, toggleSheet, hideSheet, toast, askConfirm, askText };
