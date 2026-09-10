/** lab/share —— 分享码导入导出 + 字段字典 */
/* 逐字迁移自 src/prototype.js（步骤 S-LAB）；行为变更需走评审。 */

/** HTML 转义（防御 XSS）：任何拼进 innerHTML 的动态数据必须先过这里 */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export function b64enc(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}

export function b64dec(s){return JSON.parse(decodeURIComponent(escape(atob(s))));}

export function showShareModal(title,bodyHtml){
  var old=document.getElementById('shareModal');if(old)old.remove();
  var ov=document.createElement('div');ov.id='shareModal';
  ov.innerHTML='<div class="sh-box"><div class="sh-title">'+esc(title)+'</div>'+esc(bodyHtml)+'</div>';
  document.querySelector('.phone').appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  return ov;
}

export function exportModuleCodeByEl(btn){exportModuleCode(btn.dataset.k);}

export function exportModuleCode(id){
  var m=customModules.find(function(x){return x.id===id;});if(!m)return;
  var code=b64enc(m);
  var ov=showShareModal('导出分享码 · '+m.name,
    '<textarea readonly id="shTa">'+code+'</textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="upload-btn" style="flex:1;margin:0" id="shCopy">复制分享码</button><button class="mini-btn" style="width:auto;padding:0 16px;height:40px" onclick="this.closest(\'#shareModal\').remove()">关闭</button></div>');
  ov.querySelector('#shCopy').onclick=function(){
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(function(){toast('分享码已复制');});}
    else{var t=ov.querySelector('#shTa');t.select();document.execCommand('copy');toast('已复制');}
  };
}

export function importModuleFlow(){
  var ov=showShareModal('导入模块',
    '<textarea id="impTa" style="height:130px" placeholder="粘贴模块分享码"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="upload-btn" style="flex:1;margin:0" id="impDo">导入</button><button class="mini-btn" style="width:auto;padding:0 16px;height:40px" onclick="document.getElementById(\'shareModal\').remove()">取消</button></div>');
  ov.querySelector('#impDo').onclick=function(){
    try{
      var m=b64dec(document.getElementById('impTa').value.trim());
      if(!m.name||!m.type)throw new Error('bad');
      m.id='m'+Date.now();m.enabled=true;m.closed=false;
      if(!panels[m.panel])m.panel='site';
      customModules.push(m);saveModules();renderModList();renderMyModules();
      ov.remove();toast('已导入「'+m.name+'」');
    }catch(e){toast('分享码无效,请检查后重试');}
  };
}

export function renderFieldDict(){
  var l=document.getElementById('fieldDict');if(!l)return;l.innerHTML='';
  var descs={cpu:'系统实时采集',mem:'系统实时采集',disk:'系统实时采集',visitors:'站点统计',pv:'站点统计',comments:'站点统计',posts:'站点统计',study:'学习面板记录'};
  Object.keys(FIELDS).forEach(function(k){
    var f=FIELDS[k];
    var r=document.createElement('div');r.className='mod-row';
    r.innerHTML='<div class="ic" style="background:linear-gradient(135deg,var(--accent2),var(--accent))">'+esc(f.unit||'f')+'</div><div class="tx"><b>'+esc(f.name)+'</b><span>key: '+esc(k)+' · '+esc(descs[k])+'</span></div>';
    l.appendChild(r);
  });
}

export const __exports__ = { b64enc, b64dec, showShareModal, exportModuleCodeByEl, exportModuleCode, importModuleFlow, renderFieldDict };
