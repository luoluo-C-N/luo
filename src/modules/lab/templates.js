/** lab/templates —— 模板渲染与代码生成：7 形态/动态列表源/sandbox 文档 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB-2）；行为变更需走评审。 */

export function renderModInto(m,g){
  try{
    if(m.render==='preset'){
      // 零代码向导产物：走预设渲染引擎
      import('./preset-render.js').then(function(mod){mod.renderPresetModule(m,g);});
      m._last=Date.now();return;
    }
    if(m.type==='code')renderCodeModule(m,g);
    else renderTplModule(m,g);
    m._last=Date.now();
  }catch(err){
    var e=document.createElement('div');e.className='mod-err';
    e.textContent='⚠️ 模块「'+m.name+'」出错：'+err.message;
    g.appendChild(e);
  }
}

export function renderPanelMods(pk,gid){
  var host=document.getElementById(gid);if(!host)return;
  host.classList.remove('mod-grid'); /* 容器只作分区外壳,网格由内层自建(避免双网格嵌套压缩) */
  /* 渲染进一个包装容器，分区结构在里面 */
  var root=document.createElement('div');
  var list=customModules.filter(function(m){return m.panel===pk&&m.enabled;});
  var secs=PANEL_SECTIONS[pk]||[];
  if(!list.length&&!secs.length){
    host.innerHTML='<div class="mod-err" style="background:var(--glass);border-color:var(--glass-border);color:var(--ink-3);font-weight:600">本面板暂无自定义模块 · 点「＋ 添加」或去二次开发中心新建</div>';
    return;
  }
  function gridFor(container,mods){
    var g=document.createElement('div');g.className='mod-grid';
    mods.forEach(function(m){renderModInto(m,g);});
    container.appendChild(g);
    return g;
  }
  var first=true;
  /* 默认区（无分区标题，放最前） */
  var defMods=list.filter(function(m){return !m.sec||!secs.some(function(x){return x.id===m.sec;});});
  if(defMods.length){gridFor(root,defMods);first=false;}
  /* 命名分区 */
  secs.forEach(function(sec){
    var head=document.createElement('div');
    head.className='section-title';
    head.style.margin='16px 0 8px';
    head.innerHTML='<span contenteditable="true" spellcheck="false" style="outline:none;min-width:40px;display:inline-block" onblur="renameSection(\''+pk+'\',\''+sec.id+'\',this.textContent)">'+esc(sec.name)+'</span>'+
      '<span class="more" style="color:var(--red);cursor:pointer" onclick="askConfirm(\'删除分区「'+esc(sec.name)+'」？其中模块回落默认区\').then(function(ok){if(ok)delSection(\''+pk+'\',\''+sec.id+'\');})">✕</span>';
    root.appendChild(head);
    gridFor(root,list.filter(function(m){return m.sec===sec.id;}));
  });
  host.innerHTML='';
  host.appendChild(root);
  customModules.forEach(function(m){
    if(m.enabled&&m.panel===pk&&m.refresh>0){
      if(modTimers[m.id])clearTimeout(modTimers[m.id]);
      (function(mm){
        modTimers[mm.id]=setTimeout(function(){if(mm.enabled)renderMyModules();},mm.refresh*1000);
      })(m);
    }
  });
}

export const __exports__ = { renderModInto, renderPanelMods };
