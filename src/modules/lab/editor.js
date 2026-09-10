/** lab/editor —— 模块编辑器：三标签 CodeMirror/预览/保存 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB）；行为变更需走评审。 */

/** HTML 转义（防御 XSS）：任何拼进 innerHTML 的动态数据必须先过这里 */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export function startEditor(mode){
  edDraft={id:'m'+Date.now(),mode:mode,type:mode==='tpl'?'stat':'code',name:'',icon:mode==='tpl'?'🔢':'⌨️',size:'half',w:'h',hc:'s',dynsrc:'latestComments',sec:'',enabled:true,panel:presetPanel||'site',
    data:{source:'cpu',manual:50},unit:'',rows:'示例项目|值',refresh:0,
    bind:'none',api:{url:'',path:''},code:{html:'<div id="box">Hello 模块</div>',css:'body{padding:16px}#box{font:700 18px sans-serif}',js:'// host.data 为绑定数据,host.refresh() 触发刷新\ndocument.getElementById("box").textContent="运行成功 ✓";'},
    api:{url:'',path:''}};
  presetPanel=null;
  renderEditor();
}

export function editModule(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  edDraft=JSON.parse(JSON.stringify(m));
  renderEditor();
}

export function collectDraft(){
  if(edCM){edCM.save();}

  var n=document.getElementById('edName');if(n)edDraft.name=n.value.trim();
  var i=document.getElementById('edIcon');if(i)edDraft.icon=i.value||'🔢';
  var u=document.getElementById('edUnit');if(u)edDraft.unit=u.value;
  var r=document.getElementById('edRefresh');if(r)edDraft.refresh=+r.value;
  var mv=document.getElementById('edManual');if(mv)edDraft.data.manual=+mv.value;
  var rt=document.getElementById('edRows');if(rt)edDraft.rows=rt.value;
  var ta=document.getElementById('codeTa');if(ta)edDraft.code[edTab]=ta.value;
  var au=document.getElementById('edApiUrl');if(au)edDraft.api.url=au.value;
  var ap=document.getElementById('edApiPath');if(ap)edDraft.api.path=ap.value;
}

export function setTpl(t){collectDraft();edDraft.type=t;renderEditor();}

export function setSource(v){collectDraft();edDraft.data.source=v;renderEditor();}

export function setW(w){collectDraft();edDraft.w=w;renderEditor();}

export function setHc(h){collectDraft();edDraft.hc=h;renderEditor();}

export function setSize(s){collectDraft();edDraft.size=s;edDraft.w=(s==='full'?'f':'h');renderEditor();}

export function setBind(v){collectDraft();edDraft.bind=v;renderEditor();}

export function setEdTab(t){
  if(edCM){edDraft.code[edTab]=edCM.getValue();edCM.toTextArea();edCM=null;}
  collectDraft();edTab=t;renderEditor();
}

export function renderEditor(){
  document.getElementById('edTitle').textContent=edDraft.name?('编辑 · '+edDraft.name):'编辑模块';
  var b=document.getElementById('edBody');
  var h='<div class="fld"><label>模块名称</label><input id="edName" value="'+escAttr(edDraft.name)+'" placeholder="给模块起个名字" oninput="edDraft.name=this.value"></div>';
    h+='<div class="fld"><label>宽度</label><div class="seg2">'+
      [['q','¼ 窄'],['h','½ 标准'],['f','全宽']].map(function(o){return '<div class="opt'+((edDraft.w||'h')===o[0]?' on':'')+'" data-v="'+o[0]+'" onclick="setW(this.dataset.v)">'+o[1]+'</div>';}).join('')+'</div></div>';
    h+='<div class="fld"><label>高度</label><div class="seg2">'+
      [['s','标准'],['c','紧凑']].map(function(o){return '<div class="opt'+((edDraft.hc||'s')===o[0]?' on':'')+'" data-v="'+o[0]+'" onclick="setHc(this.dataset.v)">'+o[1]+'</div>';}).join('')+'</div></div>';
  h+='<div class="fld"><label>所属面板(显示在它的页面里)</label><select onchange="edDraft.panel=this.value">'+
    Object.keys(panels).filter(function(k){return !panels[k].closed;}).map(function(k){
      return '<option value="'+k+'"'+(edDraft.panel===k?' selected':'')+'>'+panels[k].name+'</option>';
    }).join('')+'</select></div>';
  h+='<div class="fld"><label>所属分区(可选)</label><select onchange="edDraft.sec=this.value">'+
    '<option value=""'+(!edDraft.sec?' selected':'')+'>默认区</option>'+
    (PANEL_SECTIONS[edDraft.panel]||[]).map(function(x){return '<option value="'+x.id+'"'+(edDraft.sec===x.id?' selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></div>';
  h+='<div class="fld"><label>刷新策略</label><select id="edRefresh" onchange="edDraft.refresh=+this.value">'+
    [[0,'手动刷新'],[30,'每 30 秒'],[60,'每 1 分钟'],[300,'每 5 分钟']].map(function(o){
      return '<option value="'+o[0]+'"'+(edDraft.refresh===o[0]?' selected':'')+'>'+o[1]+'</option>';
    }).join('')+'</select></div>';
  if(edDraft.mode==='tpl'){
    h+='<div class="fld"><label>模板形态</label><div class="tpl-grid">'+TEMPLATES.map(function(t){
      return '<div class="tpl-card'+(edDraft.type===t.t?' on':'')+'" onclick="setTpl(\''+t.t+'\')"><div class="ti">'+t.icon+'</div><div class="tx">'+t.name+'</div><div class="ds">'+t.ds+'</div></div>';
    }).join('')+'</div></div>';
    h+='<div class="fld"><label>图标(任意 emoji)</label><input id="edIcon" value="'+escAttr(edDraft.icon)+'" oninput="edDraft.icon=this.value"></div>';
    if(edDraft.type==='dynlist'){
      h+='<div class="fld"><label>动态数据源</label><select onchange="edDraft.dynsrc=this.value">'+
        Object.keys(DYN_SOURCES).map(function(k){return '<option value="'+k+'"'+(edDraft.dynsrc===k?' selected':'')+'>'+DYN_SOURCES[k].name+'</option>';}).join('')+'</select></div>';
    }else{
      h+='<div class="fld"><label>数据源</label><select id="edSource" onchange="setSource(this.value)">'+
        Object.keys(FIELDS).map(function(k){return '<option value="'+k+'"'+(edDraft.data.source===k?' selected':'')+'>'+FIELDS[k].name+'</option>';}).join('')+
        '<option value="manual"'+(edDraft.data.source==='manual'?' selected':'')+'>手动数值</option></select></div>';
    }
    if(edDraft.data.source==='manual')h+='<div class="fld"><label>数值</label><input type="number" value="'+(edDraft.data.manual||0)+'" oninput="edDraft.data.manual=+this.value"></div>';
    h+='<div class="fld"><label>单位 / 后缀</label><input value="'+escAttr(edDraft.unit||'')+'" oninput="edDraft.unit=this.value"></div>';
    if(edDraft.type==='list')h+='<div class="fld"><label>列表行(每行: 名称|值)</label><textarea rows="4" oninput="edDraft.rows=this.value">'+esc(edDraft.rows||'')+'</textarea></div>';
    h+='<div class="fld"><label>实时预览</label><div class="mod-grid" id="edPrev"></div></div>';
    h+='<button class="upload-btn" style="background:var(--glass);color:var(--ink-2);margin-top:2px" onclick="tplToCodeFlow()">⌨️ 转为代码模式（从这里开始魔改）</button>';
  }else{
    h+='<div class="ed-tabs">'+['html','css','js'].map(function(t){
      return '<div class="ed-tab'+(edTab===t?' on':'')+'" onclick="setEdTab(\''+t+'\')">'+t.toUpperCase()+'</div>';
    }).join('')+'</div>';
    h+='<div class="code-wrap"><textarea class="code-ta" id="codeTa" spellcheck="false" oninput="edDraft.code.'+edTab+'=this.value">'+esc(edDraft.code[edTab]||'')+'</textarea></div>';
    h+='<div class="fld"><label>数据接入(可选)</label><select onchange="setBind(this.value)">'+
      '<option value="none"'+(!edDraft.bind||edDraft.bind==='none'?' selected':'')+'>不绑定(纯展示)</option>'+
      '<option value="api"'+(edDraft.bind==='api'?' selected':'')+'>自定义 API</option>'+
      Object.keys(FIELDS).map(function(k){return '<option value="'+k+'"'+(edDraft.bind===k?' selected':'')+'>'+FIELDS[k].name+'</option>';}).join('')+'</select></div>';
    if(edDraft.bind==='api'){
      h+='<div class="fld"><label>接口地址(返回 JSON)</label><input value="'+escAttr(edDraft.api.url)+'" placeholder="https://api.example.com/data" oninput="edDraft.api.url=this.value"></div>';
      h+='<div class="fld"><label>取值路径(如 data.temp)</label><input value="'+escAttr(edDraft.api.path)+'" oninput="edDraft.api.path=this.value"></div>';
    }
    h+='<button class="upload-btn" onclick="runPreview()">▶ 运行预览</button>';
    h+='<div id="edPrevHolder"></div>';
    h+='<div class="card" style="padding:12px 14px;margin-top:12px"><div style="font-size:12px;color:var(--ink-2);line-height:1.7"><b>模块 API：</b>绑定数据通过 <b>host.data</b> 注入；代码里调 <b>host.refresh()</b> 可触发数据刷新；运行出错会在预览里直接显示。</div></div>';
  }
  h+='<div style="height:8px"></div>';
  b.innerHTML=h;
  if(edDraft.mode==='tpl'){renderEdPreview();}
  else{
    var holder=document.getElementById('edPrevHolder');
    var f=document.createElement('iframe');f.className='mod-prev';f.setAttribute('sandbox','allow-scripts');
    f.setAttribute('srcdoc','<!DOCTYPE html><html><body style="font:13px sans-serif;color:#888;padding:20px">点击「▶ 运行预览」查看效果</body></html>');
    holder.appendChild(f);
    var cta=document.getElementById('codeTa');
    if(cta&&window.CodeMirror){
      if(edCM){edCM.toTextArea();edCM=null;}
      edCM=CodeMirror.fromTextArea(cta,{mode:edTab==='html'?'htmlmixed':edTab,lineNumbers:true,indentUnit:2,lineWrapping:true,viewportMargin:Infinity});
      edCM.setSize('100%','240px');
      edCM.on('change',function(){edDraft.code[edTab]=edCM.getValue();});
    }
  }
  b.scrollTop=0;
}

export function renderEdPreview(){
  var g=document.getElementById('edPrev');if(!g)return;g.innerHTML='';
  try{renderTplModule(edDraft,g);}catch(err){
    g.innerHTML='<div class="mod-err">⚠️ '+esc(err.message)+'</div>';
  }
}

export function runPreview(){
  if(edCM){edCM.save();}
  collectDraft();
  var f=document.querySelector('#edPrevHolder iframe');
  if(f)f.setAttribute('srcdoc',codeDoc(edDraft,resolvePreviewData(edDraft)));
}

export function resolvePreviewData(m){
  if(m.bind==='api'&&m.api.url)return {value:'(运行时拉取)'};
  return resolveData(m);
}

export function saveModule(){
  collectDraft();
  if(!edDraft.name){toast('请先给模块起个名字');return;}
  var i=customModules.findIndex(function(m){return m.id===edDraft.id;});
  if(i>-1)customModules[i]=edDraft;else customModules.push(edDraft);
  saveModules();renderMyModules();
  closeSub('pg-mod-editor');renderModList();
  toast('模块「'+edDraft.name+'」已保存');
}

export const __exports__ = { startEditor, editModule, collectDraft, setTpl, setSource, setW, setHc, setSize, setBind, setEdTab, renderEditor, renderEdPreview, runPreview, resolvePreviewData, saveModule };
