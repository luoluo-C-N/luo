/** lab/panels —— 自定义面板/区块/布局预设/拖拽 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB）；行为变更需走评审。 */

export function saveSections(){try{localStorage.setItem('panelSections',JSON.stringify(PANEL_SECTIONS));}catch(e){}}

export function addRealSection(pk){
  var arr=PANEL_SECTIONS[pk]||(PANEL_SECTIONS[pk]=[]);
  arr.push({id:'s'+Date.now(),name:'新分区'});
  saveSections();renderMyModules();
  toast('分区已添加 · 点名称可改名，✕ 删除（模块回落默认区）');
}

export function renameSection(pk,sid,name){
  var arr=PANEL_SECTIONS[pk]||[];
  var sec=null;arr.forEach(function(x){if(x.id===sid)sec=x;});
  if(sec&&name.trim()){sec.name=name.trim();saveSections();renderMyModules();}
}

export function delSection(pk,sid){
  var arr=PANEL_SECTIONS[pk]||[];
  PANEL_SECTIONS[pk]=arr.filter(function(x){return x.id!==sid;});
  saveSections();renderMyModules();
  toast('分区已删除 · 其中模块回落默认区');
}

export function renderClosedPanels(){
  var l=document.getElementById('closedPanels');if(!l)return;l.innerHTML='';
  var closed=Object.keys(panels).filter(function(k){return panels[k].closed;});
  if(!closed.length){
    l.innerHTML='<div class="mod-err" style="background:var(--glass);border-color:var(--glass-border);color:var(--ink-3);font-weight:600">暂无已关闭的面板</div>';
    return;
  }
  closed.forEach(function(k){
    var p=panels[k];
    var r=document.createElement('div');r.className='mod-row';
    r.innerHTML='<div class="ic" style="background:'+p.bg+'">'+p.icon+'</div><div class="tx"><b>'+esc(p.name)+'</b><span>已关闭 · 恢复后回到面板列表</span></div><button class="mini-btn" style="margin-left:auto;color:var(--accent);border-color:rgba(var(--accent-rgb),.35)" onclick="restorePanel(\''+k+'\')">恢复</button>';
    l.appendChild(r);
  });
}

export function restorePanel(k){
  var p=panels[k];if(!p)return;
  p.closed=false;p.enabled=true;renderPanels();renderClosedPanels();
  toast('已恢复「'+p.name+'」面板');
}

export function ensureCustomScreen(key,name,icon){
  var id='scr-'+key;
  if(document.getElementById(id))return id;
  var s=document.createElement('div');s.className='screen';s.id=id;
  s.innerHTML='<div class="page-head"><div class="nav-title">'+esc(name)+'</div><button class="page-fab" onclick="openAddFor(\''+key+'\')">＋</button></div>'+
    '<div class="nav-sub">'+icon+' 自定义面板 · 自由组合模块与分区</div>'+
    '<div class="section-title">自定义模块 <span class="more" onclick="openAddFor(\''+key+'\')">＋ 添加</span></div>'+
    '<div class="mod-grid" id="mods-'+key+'"></div>'+
    '<div class="section-title">分区标题 <span class="more" onclick="addSectionTo(\''+key+'\')">＋ 添加</span></div>'+
    '<div id="secs-'+key+'"></div>';
  document.querySelector('.screens').appendChild(s);
  return id;
}

export function createPanelFlow(){var f=document.getElementById('npForm');f.style.display=f.style.display==='block'?'none':'block';}

export function saveCustomPanels(){
  try{localStorage.setItem('customPanels',JSON.stringify(Object.keys(panels).filter(function(k){return panels[k].custom;}).map(function(k){return {key:k,name:panels[k].name,icon:panels[k].icon,bg:panels[k].bg};})));}catch(e){}
}

export function doCreatePanel(){
  var nm=document.getElementById('npName').value.trim();
  var ic=document.getElementById('npIcon').value.trim()||'🧩';
  if(!nm){toast('请输入面板名称');return}
  var key='p'+Date.now();
  var bgs=['linear-gradient(135deg,var(--accent),var(--accent2))','linear-gradient(135deg,#30D158,#00C7BE)','linear-gradient(135deg,#BF5AF2,#FF375F)','linear-gradient(135deg,#FF9F0A,#FF453A)'];
  panels[key]={name:nm,icon:ic,bg:bgs[Math.floor(Math.random()*bgs.length)],def:ensureCustomScreen(key,nm,ic),enabled:true,closed:false,pinned:false,custom:true,sections:[]};
  saveCustomPanels();renderPanels();renderClosedPanels();
  closeSub('pg-mods');closeSub('pg-mod-editor');
  switchPanel(key);
  toast('已创建「'+nm+'」面板');
}

export function addSectionTo(key){
  var host=document.getElementById('secs-'+key);if(!host)return;
  var sec=document.createElement('div');sec.className='section-title';
  sec.contentEditable=true;sec.spellcheck=false;sec.textContent='新分区';
  host.appendChild(sec);sec.scrollIntoView({behavior:'smooth'});toast('已添加分区标题 · 点击文字可改名');
}

export function cycleModWidth(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  m.w=(m.w==='q')?'h':((m.w==='h'||!m.w)?'f':'q');
  saveModules();renderMyModules();
  toast('宽度：'+(m.w==='q'?'¼ 窄':(m.w==='f'?'全宽':'½ 标准')));
}

export function _oldToggleModuleSize(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  var gid='myMods';
  var g=document.getElementById(gid);if(!g)return;
  var card=g.querySelector('.mod-card[data-mid="'+id+'"],.mod-wrap[data-mid="'+id+'"]');
  if(!card)return;
  var first=card.getBoundingClientRect();
  m.size=m.size==='full'?'half':'full';
  saveModules();renderPanelMods(m.panel,gid);
  var nc=g.querySelector('.mod-card[data-mid="'+id+'"],.mod-wrap[data-mid="'+id+'"]');
  if(!nc)return;
  var last=nc.getBoundingClientRect();
  var dx=first.left-last.left,dy=first.top-last.top;
  var sx=first.width/last.width,sy=first.height/last.height;
  nc.style.transformOrigin='top left';
  nc.style.transition='none';
  nc.style.transform='translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')';
  requestAnimationFrame(function(){
    nc.style.transition='transform .45s cubic-bezier(.22,1,.36,1)';
    nc.style.transform='';
    setTimeout(function(){nc.style.transition='';},500);
  });
}

export function openPresetApply(){
  var names=Object.keys(PRESET_LAYOUTS);
  moOpen({title:'应用预设布局',msg:'将替换「网站」面板当前的模块组合（现有模块会被移除）：\n'+names.map(function(k,i){return (i+1)+'. '+PRESET_LAYOUTS[k].name;}).join('  ')+'',input:'',ok:'选择…'},function(){});
  /* 用三个按钮的自定义流程：直接问名字 */
  askText('应用预设布局','输入编号：1=监控优先  2=内容优先  3=极简','1/2/3').then(function(v){
    var k=Object.keys(PRESET_LAYOUTS)[(parseInt(v)||0)-1];
    if(!k)return;
    applyPresetLayout(k);
  });
}

export function applyPresetLayout(k){
  var def=PRESET_LAYOUTS[k];
  if(!def)return;
  askConfirm('应用「'+def.name+'」预设？网站面板现有模块将被移除替换。','应用').then(function(ok){
    if(!ok)return;
    for(var i=customModules.length-1;i>=0;i--){
      if(customModules[i].panel==='site')customModules.splice(i,1);
    }
    def.mods.forEach(function(spec){
      if(spec.libk){
        var p=null;PRESETS.forEach(function(x){if(x.k===spec.libk)p=x;});
        if(!p)return;
        var m=p.make('site');
        if(spec.w)m.w=spec.w;
        m.libk=spec.libk;
        customModules.push(m);
      }else if(spec.tpl){
        var t=spec.tpl;
        customModules.push({id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'tpl',type:t.type,name:t.name,icon:t.icon||'🔢',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:'site',refresh:0,data:t.data||{source:'manual',manual:0},unit:t.unit||'',rows:'',bind:'none',api:{url:'',path:''}});
      }
    });
    saveModules();renderMyModules();
    toast('「'+def.name+'」预设已应用 ✓');
  });
}

export function startModDrag(el, mid, e0){
  var m=null;customModules.forEach(function(x){if(x.id===mid)m=x;});
  if(!m)return;
  DRAG={el:el,mid:mid,m:m,offX:e0.clientX,offY:e0.clientY,baseX:0,baseY:0,moved:false};
  var r=el.getBoundingClientRect();
  DRAG.baseX=r.left;DRAG.baseY=r.top;
  el.classList.add('dragging');
  el.style.width=r.width+'px';el.style.height=r.height+'px';
  el.style.position='fixed';el.style.left=r.left+'px';el.style.top=r.top+'px';
  el.style.zIndex=300;el.style.margin='0';el.style.pointerEvents='none';
  el.style.transition='none';el.style.boxShadow='0 22px 50px rgba(28,28,30,.35)';
  document.body.appendChild(el);
  moveDragTo(e0.clientX,e0.clientY);
}

export function moveDragTo(x,y){
  if(!DRAG)return;
  DRAG.el.style.left=(x-DRAG.offX+ (DRAG.el._ox||0))+'px';
  DRAG.el.style.top=(y-DRAG.offY)+'px';
}

export function endModDrag(){
  if(!DRAG)return;
  var d=DRAG;DRAG=null;
  d.el.classList.remove('dragging');
  d.el.style.cssText='';
  /* 按 DOM 顺序重排同分区内模块 */
  var grid=d.el.parentElement;
  if(grid){
    var order=[...grid.querySelectorAll('[data-mid]')].map(function(x){return x.dataset.mid;});
    customModules.sort(function(a,b){
      if(a.panel!==b.panel)return 0;
      var ia=order.indexOf(a.id),ib=order.indexOf(b.id);
      if(ia<0&&ib<0)return 0;
      if(ia<0)return 1;
      if(ib<0)return -1;
      return ia-ib;
    });
  }
  saveModules();renderMyModules();
}

export function moOpen(o,cb){
  var m=document.getElementById('mo-ask');if(!m){cb(o.input!=null?null:false);return;}
  document.getElementById('moTitle').textContent=o.title||'确认操作';
  document.getElementById('moMsg').textContent=o.msg||'';
  var inp=document.getElementById('moInput');
  inp.style.display=o.input!=null?'block':'none';
  if(o.input!=null){inp.placeholder=o.input;inp.value=o.val||'';}
  var ok=document.getElementById('moOk');
  ok.textContent=o.ok||'确定';
  ok.style.background=o.danger?'var(--red)':'var(--accent)';
  m.style.display='flex';
  function close(v){m.style.display='none';ok.onclick=null;document.getElementById('moCancel').onclick=null;cb(v);}
  ok.onclick=function(){close(o.input!=null?inp.value.trim():true);};
  document.getElementById('moCancel').onclick=function(){close(o.input!=null?null:false);};
}

export const __exports__ = { saveSections, addRealSection, renameSection, delSection, renderClosedPanels, restorePanel, ensureCustomScreen, createPanelFlow, saveCustomPanels, doCreatePanel, addSectionTo, cycleModWidth, _oldToggleModuleSize, openPresetApply, applyPresetLayout, startModDrag, moveDragTo, endModDrag, moOpen };
