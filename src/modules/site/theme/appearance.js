/** theme/appearance —— 深色模式/玻璃质感/强调色/主题/字号/卡片调高（S7） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function saveCardSizes(){try{localStorage.setItem('cardSizes',JSON.stringify(cardSizes));}catch(e){}}

export function applyCardSizes(){
  Object.keys(cardSizes).forEach(function(id){
    var el=document.getElementById(id);
    if(!el)return;
    el.classList.add('collapsed');
    el.style.height=cardSizes[id]+'px';
    var st=el.previousElementSibling;
    if(st){var b=st.querySelector('.col-btn');if(b)b.textContent='⤵ 展开';}
  });
}

export function startResize(e,id,minH){
  e.stopPropagation();
  var el=document.getElementById(id);if(!el)return;
  var sy=e.clientY,h0=el.getBoundingClientRect().height;
  el.classList.add('collapsed');el.style.transition='none';
  var st=el.previousElementSibling;
  if(st){var b=st.querySelector('.col-btn');if(b)b.textContent='⤵ 展开';}
  function mv(ev){var h=Math.max(minH||120,Math.round(h0+(ev.clientY-sy)));el.style.height=h+'px';}
  function up(){
    document.removeEventListener('pointermove',mv);
    document.removeEventListener('pointerup',up);
    el.style.transition='';
    cardSizes[id]=Math.round(el.getBoundingClientRect().height);
    saveCardSizes();
  }
  document.addEventListener('pointermove',mv);
  document.addEventListener('pointerup',up);
}

export function addCustomSection(){
  addRealSection(curPanel||'site');
}

export function _oldAddCustomSection(){
  var host=document.getElementById('cusSections');if(!host)return;
  cusSecN++;
  var sec=document.createElement('div');
  sec.className='card';sec.style.padding='12px 16px';sec.style.marginBottom='2px';
  sec.innerHTML='<div style="display:flex;align-items:center;gap:8px">'+
    '<span contenteditable="true" spellcheck="false" style="font-size:16px;font-weight:700;outline:none;min-width:60px;color:var(--ink)">新分区</span>'+
    '<span style="margin-left:auto;color:var(--red);cursor:pointer;font-size:12px;font-weight:600" onclick="this.closest(\'.card\').remove();toast(\'分区已删除\')">✕ 删除</span></div>'+
    '<div style="font-size:12px;color:var(--ink-3);margin-top:8px">空分区 · 自编译模块可放入(开发中)</div>';
  host.appendChild(sec);
  sec.scrollIntoView({behavior:'smooth',block:'center'});
  toast('已添加分区标题 · 点击文字可改名');
}

export function setDark(on){
  document.querySelector('.phone').classList.toggle('dark',on);
  try{localStorage.setItem('darkMode',on?'1':'0');}catch(e){}
  var sw=document.getElementById('darkSw');
  if(sw)sw.classList.toggle('on',on);
}

export function setDarkToggle(){setDark(!document.querySelector('.phone').classList.contains('dark'));}

export function applyGlassTuning(){
  var t=clampN(glassT.t,0,100),b=clampN(glassT.b,0,40);
  var clear=1-t/100;
  var r=document.documentElement.style;
  r.setProperty('--glass','rgba(255,255,255,'+(0.03+clear*0.23).toFixed(3)+')');
  r.setProperty('--glass-strong','rgba(255,255,255,'+(0.05+clear*0.50).toFixed(3)+')');
  r.setProperty('--glass-border','rgba(255,255,255,'+(0.30+clear*0.27).toFixed(3)+')');
  r.setProperty('--glass-blur','blur('+b+'px) saturate(180%)');
  r.setProperty('--blur-xl','blur('+Math.round(b*1.8)+'px) saturate(220%)');
  r.setProperty('--tb-blur',Math.round(clampN(b,0,40)*1.3)+'px');
  r.setProperty('--tabbar-glass','rgba(250,252,255,'+(0.16+clear*0.44).toFixed(3)+')');
  r.setProperty('--drawer-blur',Math.round(clampN(b,0,40)*0.4)+'px');
  r.setProperty('--drawer-glass','rgba(250,252,255,'+(0.08+clear*0.74).toFixed(3)+')');
  r.setProperty('--pop-glass','rgba(250,252,255,'+(0.20+clear*0.74).toFixed(3)+')');
  r.setProperty('--card','rgba(255,255,255,'+clampN(0.20+clear*1.20,0.08,0.92).toFixed(3)+')');
  r.setProperty('--card-strong','rgba(255,255,255,'+clampN(0.32+clear*1.35,0.14,0.94).toFixed(3)+')');
  var av=document.getElementById('slAlphaV'),bv=document.getElementById('slBlurV');
  if(av)av.textContent=t;
  if(bv)bv.textContent=b;
}

export function saveGlassTuning(){try{localStorage.setItem('glassTuning',JSON.stringify(glassT));}catch(e){}}

export function syncGlassSliders(){
  var a=document.getElementById('slAlpha'),b=document.getElementById('slBlur');
  if(a)a.value=glassT.t;
  if(b)b.value=glassT.b;
}

export function resetGlass(){glassT={t:70,b:20};applyGlassTuning();syncGlassSliders();saveGlassTuning();toast('已恢复默认毛玻璃质感');}

export function setAccent(color){
  if(!/^#[0-9a-fA-F]{6}$/.test(color))return;
  document.querySelector('.phone').style.setProperty('--accent',color);
  document.documentElement.style.setProperty('--accent',color);
  document.documentElement.style.setProperty('--accent2',shade(color,-18));
  document.documentElement.style.setProperty('--accent-rgb',accRgb(color));
  try{localStorage.setItem('accent',color);}catch(e){}
  renderMyModules();
  renderAccentPicker();
}

export function shade(hex,pct){
  var h=hex.replace('#','');var n=parseInt(h,16);
  var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  function adj(v){return Math.max(0,Math.min(255,Math.round(v+(pct/100)*255)));}
  return '#'+[adj(r),adj(g),adj(b)].map(function(v){var t=v.toString(16);return t.length<2?'0'+t:t;}).join('');
}

export function renderAccentPicker(){
  var host=document.getElementById('accentPick');
  if(!host)return;
  var cur=localStorage.getItem('accent')||'#0A84FF';
  var PAL=['#0A84FF','#5E5CE6','#BF5AF2','#FF6482','#FF9F0A','#30D158','#00C7BE','#8E8E93'];
  host.innerHTML='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'+
    PAL.map(function(c){return '<span data-c="'+c+'" onclick="setAccent(this.dataset.c);toast(\'主题色已更新\')" style="width:34px;height:34px;border-radius:50%;background:'+c+';cursor:pointer;box-shadow:'+(c.toLowerCase()===cur.toLowerCase()?'0 0 0 3px var(--ink) ':'0 2px 8px rgba(0,0,0,.15)')+';display:inline-block"></span>';}).join('')+
    '<label style="width:34px;height:34px;border-radius:50%;border:1.5px dashed var(--ink-3);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden">🎨<input type="color" value="'+cur+'" onchange="setAccent(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>'+
    '</div>';
}

export function renderThemePresets(){
  var host=document.getElementById('themePresets');
  if(!host)return;
  host.innerHTML=Object.keys(THEMES).map(function(k){
    var t=THEMES[k];
    return '<div onclick="applyTheme(\''+k+'\')" style="cursor:pointer;border-radius:14px;overflow:hidden;border:1px solid var(--glass-border)">'+
      '<div style="height:44px;background:linear-gradient(135deg,'+t.accent+','+t.accent2+')"></div>'+
      '<div style="padding:8px 10px;font-size:12.5px;font-weight:700;color:var(--ink);background:var(--glass)">'+t.name+'</div></div>';
  }).join('');
}

export function applyTheme(k){
  var t=THEMES[k];if(!t)return;
  setAccent(t.accent);
  if(wallpapers[t.wall])applyWallpaper(t.wall);
  toast('「'+t.name+'」主题已应用 ✓');
}

export function setFontSize(f){
  var ph=document.querySelector('.phone');
  ph.classList.remove('fs-s','fs-m','fs-l');
  ph.classList.add('fs-'+f);
  try{localStorage.setItem('fontSize',f);}catch(e){}
  document.querySelectorAll('[data-fs]').forEach(function(x){x.classList.toggle('on',x.dataset.fs===f);});
  toast('字号：'+(f==='s'?'小':(f==='l'?'大':'标准')));
}

export function clampN(v,a,b){return Math.max(a,Math.min(b,v));}
export const __exports__ = { clampN, saveCardSizes, applyCardSizes, startResize, addCustomSection, _oldAddCustomSection, setDark, setDarkToggle, applyGlassTuning, saveGlassTuning, syncGlassSliders, resetGlass, setAccent, shade, renderAccentPicker, renderThemePresets, applyTheme, setFontSize };
