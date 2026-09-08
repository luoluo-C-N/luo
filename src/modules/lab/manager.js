/** lab/manager —— 模块管理：示例库/我的模块/增删改复制 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB）；行为变更需走评审。 */

export function openModLib(){
  closeSub('pg-mod-editor');
  openSub('pg-lib');
  var body=document.getElementById('modLibBody');
  var installed={};customModules.forEach(function(m){installed[m.libk]=true;});
  body.innerHTML='<div style="font-size:12px;color:var(--ink-3);margin-bottom:10px">点击安装到「'+esc(panels[curPanel]?panels[curPanel].name:'网站')+'」面板 · 装完可改可删</div>'+
    PRESETS.map(function(p){
      var has=installed[p.k];
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">'+
        '<div class="crud-ic" style="font-size:17px">'+p.ic+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:700">'+esc(p.name)+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+esc(p.ds)+'</div></div>'+
        (has?'<span class="chip chip-pub">已装</span>':'<button style="padding:8px 14px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit" onclick="installPreset(\''+p.k+'\')">安装</button>')+
        '</div>';
    }).join('');
}

export function installPreset(k){
  var p=null;PRESETS.forEach(function(x){if(x.k===k)p=x;});
  if(!p)return;
  var panel=(typeof presetPanel==='string'&&presetPanel)?presetPanel:(curPanel||'site');
  var m=p.make(panel);
  m.libk=k;
  customModules.push(m);saveModules();renderMyModules();
  closeSub('pg-lib');closeSub('pg-mod-editor');
  toast('「'+p.name+'」已装到当前面板 ✓');
}

export function saveModules(){try{localStorage.setItem('customModules',JSON.stringify(customModules));}catch(e){toast('存储空间不足');}}

export function renderMyModules(){
  /* 按面板分发:每个面板渲染自己名下的自定义模块 */
  renderPanelMods('site','myMods');
  Object.keys(panels).filter(function(k){return panels[k].custom&&!panels[k].closed;}).forEach(function(k){
    renderPanelMods(k,'mods-'+k);
  });
}

export function refreshMyModules(){
  customModules.forEach(function(m){m._last=0;});
  renderMyModules();
  toast('模块数据已刷新');
}

export function openModManager(){closeDrawer();renderClosedPanels();renderModList();renderExamples();renderFieldDict();openSub('pg-mods');}

export function renderModList(){
  var l=document.getElementById('modList');if(!l)return;l.innerHTML='';
  if(!customModules.length){
    l.innerHTML='<div class="mod-err" style="background:var(--glass);border-color:var(--glass-border);color:var(--ink-3);font-weight:600">还没有模块 · 点右上「＋ 新建」</div>';
    return;
  }
  customModules.forEach(function(m){
    var r=document.createElement('div');r.className='mod-row';
    var tInfo=m.type==='code'?{icon:'⌨️',name:'代码模式'}:(TEMPLATES.find(function(t){return t.t===m.type;})||{icon:'🧩',name:'模板'});
    r.innerHTML='<div class="ic" style="background:'+(m.type==='code'?'linear-gradient(135deg,var(--accent2),#BF5AF2)':'linear-gradient(135deg,var(--accent),var(--accent2))')+'">'+tInfo.icon+'</div>'+
      '<div class="tx"><b>'+esc(m.name)+'</b><span>'+(panels[m.panel]?panels[m.panel].name:'网站')+'面板 · '+tInfo.name+' · '+(m.enabled?'启用中':'已停用')+'</span></div>'+
      '<div class="ops">'+
      '<button class="mini-btn" title="编辑" onclick="editModule(\''+m.id+'\')">✏️</button>'+
      '<button class="mini-btn" title="复制" onclick="copyModule(\''+m.id+'\')">⧉</button>'+
      '<button class="mini-btn" title="导出分享码" data-k="'+m.id+'" onclick="exportModuleCodeByEl(this)">⤓</button>'+
      '<button class="mini-btn" title="'+(m.enabled?'停用':'启用')+'" onclick="toggleModule(\''+m.id+'\')">'+(m.enabled?'⏸':'▶')+'</button>'+
      '<button class="mini-btn" title="删除" onclick="delModule(\''+m.id+'\')">🗑️</button>'+
      '</div>';
    l.appendChild(r);
  });
}

export function renderExamples(){
  var l=document.getElementById('exampleList');if(!l)return;l.innerHTML='';
  EXAMPLES.forEach(function(ex,i){
    var c=document.createElement('div');c.className='ex-card';
    c.innerHTML='<div class="ic">'+ex.icon+'</div><div><b>'+ex.name+'</b><span>'+ex.desc+'</span></div><span class="add">＋ 添加</span>';
    c.onclick=function(){addExample(i);};
    l.appendChild(c);
  });
}

export function addExample(i){
  var c=JSON.parse(JSON.stringify(EXAMPLES[i].mod));c.id='m'+Date.now();c.icon=EXAMPLES[i].icon;
  customModules.push(c);saveModules();renderModList();renderMyModules();
  toast('已添加示例「'+EXAMPLES[i].name+'」');
}

export function openAddFor(pk){presetPanel=pk;newModuleFlow();}

export function newModuleFlow(){
  edDraft=null;
  var pn=presetPanel||'site';
  var b=document.getElementById('edBody');
  document.getElementById('edTitle').textContent='新建模块';
  b.innerHTML='<div class="card" style="padding:14px 18px"><div style="font-size:13px;color:var(--ink-2);line-height:1.6">选择创建方式：「模板模式」选好形态、绑上数据即可用；「代码模式」用 HTML/CSS/JS 自由编写，可接入任意开放接口，理论上限 = 你能写出什么。<b>将添加到「'+panels[pn].name+'」面板</b>，稍后可在编辑器里更改所属面板。</div></div>'+
    '<div class="tpl-grid" style="margin-top:12px">'+
    '<div class="tpl-card" onclick="startEditor(\'tpl\')"><div class="ti">🧩</div><div class="tx">模板模式</div><div class="ds">7 种形态 · 绑数据即用</div></div>'+
    '<div class="tpl-card" onclick="startEditor(\'code\')"><div class="ti">⌨️</div><div class="tx">代码模式</div><div class="ds">HTML/CSS/JS · 理论无限</div></div>'+
    '<div class="tpl-card" onclick="openModLib()" style="grid-column:1/-1"><div class="ti">📦</div><div class="tx">模块库</div><div class="ds">8 个开箱即用的常用模块 · 装上就能用</div></div>'+
    '</div>';
  openSub('pg-mod-editor');
}

export function copyModule(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  var c=JSON.parse(JSON.stringify(m));c.id='m'+Date.now();c.name=m.name+' 副本';
  customModules.push(c);saveModules();renderModList();toast('已复制「'+m.name+'」');
}

export function toggleModule(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  m.enabled=!m.enabled;saveModules();renderModList();renderMyModules();
  toast('「'+m.name+'」已'+(m.enabled?'启用':'停用'));
}

export function delModule(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  customModules=customModules.filter(function(x){return x.id!==id;});
  saveModules();renderModList();renderMyModules();toast('已删除「'+m.name+'」');
}

export const __exports__ = { openModLib, installPreset, saveModules, renderMyModules, refreshMyModules, openModManager, renderModList, renderExamples, addExample, openAddFor, newModuleFlow, copyModule, toggleModule, delModule };
