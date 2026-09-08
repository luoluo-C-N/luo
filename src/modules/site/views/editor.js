/** views/editor —— 文章编辑器（S6）。验收: SITE-FR5；401 保留草稿 */
/* 逐字迁移自 src/prototype.js（步骤 S6）；行为变更需走评审。 */

export function openPostEditor(id){
  jfetch(API_BASE+'/api/posts/detail/'+id).then(function(p){
    POST_EDIT=p;
    var t=document.getElementById('edPostTitle'),b=document.getElementById('edPostBody');
    if(t)t.value=p.title||'';if(b)b.value=p.content||'';
    postMetaUpd();
    var st=document.querySelector('#pg-editor .sub-title');if(st)st.textContent='编辑文章';
    openSub('pg-editor');
  }).catch(toastErr);
}

export function postMetaUpd(){
  var b=document.getElementById('edPostBody'),m=document.getElementById('edPostMeta');
  if(!b||!m)return;var n=b.value.length;
  m.textContent=n+' 字 · 预计阅读 '+Math.max(1,Math.ceil(n/400))+' 分钟 · 存到 Kirameku 数据库';
}

export function openEditor(){
  POST_EDIT=null;
  var t=document.getElementById('edPostTitle'),b=document.getElementById('edPostBody');
  if(t)t.value='';if(b)b.value='';postMetaUpd();
  var st=document.querySelector('#pg-editor .sub-title');if(st)st.textContent='写文章';
  openSub('pg-editor');
  draftHook();
  var raw=null;try{raw=localStorage.getItem(DRAFT_KEY);}catch(e){}
  if(raw){
    try{
      var d=JSON.parse(raw);
      if(d&&(d.title||d.body)){
        askConfirm('发现未完成的草稿「'+(d.title||'无标题')+'」，恢复继续写？','恢复').then(function(ok){
          if(!ok){draftClear();return;}
          var t2=document.getElementById('edPostTitle'),b2=document.getElementById('edPostBody');
          if(t2)t2.value=d.title||'';if(b2)b2.value=d.body||'';
          postMetaUpd();toast('草稿已恢复 ✓');
        });
      }
    }catch(e){}
  }
}

export function buildPostPayload(status){
  var t=document.getElementById('edPostTitle'),b=document.getElementById('edPostBody');
  var title=t.value.trim(),content=b.value;
  if(!title){toast('请先写标题');return null;}
  var p=POST_EDIT||{};
  var tagsInp=document.getElementById('edPostTags');
  var tags=tagsInp?tagsInp.value.split(/[,，]/).map(function(x){return x.trim();}).filter(Boolean)
                 :(p.tags||[]).map(function(x){return String(x).trim();});
  tags=[...new Set(tags)];
  var covInp=document.getElementById('edPostCover');
  var cover=covInp?(covInp.value.trim()||p.cover||''):(p.cover||'');
  var pl={title:title,slug:p.slug||slugify(title),description:p.description||content.slice(0,80),
    content:content,cover:cover,tags:tags,status:status!=null?status:(p.status||'draft'),
    is_pinned:!!p.is_pinned,word_count:content.length,reading_time:Math.max(1,Math.ceil(content.length/400))};
  var catSel=document.getElementById('edPostCat');
  if(catSel&&catSel.value!=='')pl.category_id=+catSel.value;
  return pl;
}

export function sendPost(pl,msg){
  var done=function(){toast(msg);closeSub('pg-editor');draftClear();loadPosts();loadDash();};
  if(POST_EDIT&&POST_EDIT.id){jfetch(API_BASE+'/api/posts/'+POST_EDIT.id,{method:'PUT',body:JSON.stringify(pl)}).then(done).catch(toastErr);}
  else{jfetch(API_BASE+'/api/posts',{method:'POST',body:JSON.stringify(pl)}).then(done).catch(toastErr);}
}

export function savePostDraft(){
  var pl=buildPostPayload(null);if(!pl)return;
  if(POST_EDIT&&POST_EDIT.status==='published')pl.status='published';
  sendPost(pl,'草稿已保存 ✓');
}

export function publishPost(){
  var pl=buildPostPayload('published');if(!pl)return;
  sendPost(pl,'已发布 · 网站即时可见 ✓');
}

export function loadCats(){
  return jfetch(API_BASE+'/api/categories').then(function(l){CATS=unwrap(l)||[];fillCatSelect();}).catch(function(){});
}

export function fillCatSelect(keepName){
  var sel=document.getElementById('edPostCat');if(!sel)return;
  var cur=keepName||sel.dataset.cur||'';
  sel.innerHTML='<option value="">分类(不改变/无)</option>'+CATS.map(function(c){
    return '<option value="'+c.id+'"'+(cur&&c.name===cur?' selected':'')+'>'+esc(c.name)+'</option>';
  }).join('');
}

export function edViewMode(m){
  var ed=document.getElementById('et-edit'),pv=document.getElementById('et-prev');
  var ta=document.getElementById('edPostBody'),box=document.getElementById('edPreview');
  if(!ed||!pv||!ta||!box)return;
  if(m==='prev'){
    ed.classList.remove('on');pv.classList.add('on');
    ta.style.display='none';box.style.display='block';
    var md=window.marked?marked.parse(ta.value||''):('<pre>'+esc(ta.value||'')+'</pre>');
    box.innerHTML=md;
  }else{
    pv.classList.remove('on');ed.classList.add('on');
    box.style.display='none';ta.style.display='';
  }
}

export function uploadCover(input){
  var f=input.files&&input.files[0];if(!f)return;
  toast('封面上传中…');
  var fd=new FormData();fd.append('file',f);
  var up=function(ep){return fetch(API_BASE+ep,{method:'POST',headers:authHeaders(),body:fd}).then(function(r){return r.json();});};
  up('/api/upload/image').catch(function(){return up('/api/upload/image-local');}).then(function(j){
    if(j&&j.url){document.getElementById('edPostCover').value=j.url;toast('封面已就绪 ✓');}
    else throw new Error((j&&(j.detail||j.message))||'上传失败');
  }).catch(function(e){toast('⚠️ '+(e.message||'封面上传失败'));});
  input.value='';
}

export function imgInsertOpen(){
  openSub('pg-imgpick');
  var body=document.getElementById('imgPickBody');
  body.innerHTML='<div class="card" style="padding:12px;font-size:12.5px;color:var(--ink-3)">加载相册…</div>';
  jfetch(API_BASE+'/api/albums').then(function(l){
    var albums=unwrap(l)||[];
    if(!albums.length){body.innerHTML=emptyCard('还没有相册 · 可点右上 🔗 手输网址');return;}
    body.innerHTML='<div style="font-size:12px;color:var(--ink-2);margin-bottom:8px">点相册展开照片，点照片插入正文</div>'+albums.map(function(a){
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:pointer" onclick="imgPickAlbum('+a.id+',\''+escAttr(a.title)+'\')">'+
        '<div style="font-size:14.5px;font-weight:600">'+esc(a.title)+'<span class="chip chip-local" style="margin-left:8px">'+(a.photo_count||0)+' 张</span></div></div>';
    }).join('');
  }).catch(function(e){body.innerHTML=emptyCard('⚠️ '+e.message);});
}

export function imgPickAlbum(id,title){
  var body=document.getElementById('imgPickBody');
  body.innerHTML='<div class="album-back" onclick="imgInsertOpen()">‹ 返回相册列表</div><div class="card" style="padding:12px;font-size:12.5px;color:var(--ink-3)">加载中…</div>';
  jfetch(API_BASE+'/api/albums/'+id+'/photos').then(function(l){
    var arr=unwrap(l)||[];
    body.innerHTML='<div class="album-back" onclick="imgInsertOpen()">‹ 返回相册列表</div>'+
      '<div class="card" style="padding:12px"><div style="font-size:14.5px;font-weight:700;margin-bottom:10px">'+esc(title)+'</div>'+
      '<div class="gallery">'+arr.map(function(ph){
        return '<div class="gcell photo-cell" onclick="imgPickUse(\''+ph.url.replace(/'/g,"")+'\')">'+
          (imgSrc(ph.url)?'<img src="'+escAttr(imgSrc(ph.url))+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">':'🖼️')+'</div>';
      }).join('')+(arr.length?'':'<div style="font-size:12px;color:var(--ink-3);padding:8px">相册为空</div>')+'</div></div>';
  }).catch(function(e){body.innerHTML=emptyCard('⚠️ '+e.message);});
}

export function imgPickUse(url){
  closeSub('pg-imgpick');
  edViewMode('edit');
  var ta=document.getElementById('edPostBody');if(!ta)return;
  var sc=ta.selectionStart===null?ta.value.length:ta.selectionStart;
  var snip='\n!['+(sc>=0?'':('')+escAttr(url.split('/').pop()))+']('+url+')\n';
  var v=ta.value;
  ta.value=v.slice(0,sc)+snip+v.slice(sc);
  ta.selectionStart=ta.selectionEnd=sc+snip.length;
  ta.focus();postMetaUpd();
  toast('图片已插入正文 ✓');
}

export function imgPickManual(){
  askText('插入图片网址','在光标处插入 Markdown 图片','https://… 或 /images/xx.webp').then(function(u){
    if(!u)return;
    closeSub('pg-imgpick');
    edViewMode('edit');
    var ta=document.getElementById('edPostBody');if(!ta)return;
    var sc=ta.selectionStart===null?ta.value.length:ta.selectionStart;
    var snip='\n![]('+u.trim()+')\n';
    var v=ta.value;
    ta.value=v.slice(0,sc)+snip+v.slice(sc);
    ta.selectionStart=ta.selectionEnd=sc+snip.length;
    ta.focus();postMetaUpd();
    toast('图片已插入正文 ✓');
  });
}

export function setPostFilter(f){
  PF=f||'all';
  document.querySelectorAll('[data-f]').forEach(function(x){x.classList.toggle('on',x.dataset.f===PF);});
  renderPosts();
}

export function draftSave(){
  if(POST_EDIT)return; // 编辑已有文章不暂存（直接保存即可）
  var t=document.getElementById('edPostTitle'),b=document.getElementById('edPostBody');
  if(!t||!b)return;
  if(!t.value.trim()&&!b.value.trim()){localStorage.removeItem(DRAFT_KEY);return;}
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify({title:t.value,body:b.value,ts:Date.now()}));}catch(e){}
}

export function draftHook(){
  var t=document.getElementById('edPostTitle'),b=document.getElementById('edPostBody');
  if(!t||!b)return;
  ['input','change'].forEach(function(ev){
    t.addEventListener(ev,function(){clearTimeout(_draftT);_draftT=setTimeout(draftSave,3000);});
    b.addEventListener(ev,function(){clearTimeout(_draftT);_draftT=setTimeout(draftSave,3000);});
  });
}

export function draftClear(){try{localStorage.removeItem(DRAFT_KEY);}catch(e){}}

export function mdWrap(open,close){
  var ta=document.getElementById('edPostBody');if(!ta)return;
  var sc=ta.selectionStart===null?ta.value.length:ta.selectionStart;
  var ec=ta.selectionEnd===null?sc:ta.selectionEnd;
  var v=ta.value;
  ta.value=v.slice(0,sc)+open+v.slice(sc,ec)+close+v.slice(ec);
  var pos=sc+open.length+(ec-sc);
  ta.selectionStart=ta.selectionEnd=pos;
  ta.focus();postMetaUpd();
}

export function mdLine(pre){
  var ta=document.getElementById('edPostBody');if(!ta)return;
  var s=ta.selectionStart===null?0:ta.selectionStart;
  var v=ta.value;
  var ls=v.lastIndexOf('\n',Math.max(0,s-1))+1;
  ta.value=v.slice(0,ls)+pre+v.slice(ls);
  ta.selectionStart=ta.selectionEnd=s+pre.length;
  ta.focus();postMetaUpd();
}

export function setCover(pid){
  if(!CUR_ALBUM)return;
  var ph=(CUR_PHOTOS||[]).find(function(x){return x.id===pid;});
  if(!ph)return;
  jfetch(API_BASE+'/api/albums/'+CUR_ALBUM.id,{method:'PUT',body:JSON.stringify({cover:ph.url})})
    .then(function(){toast('已设为相册封面');CUR_ALBUM.cover=ph.url;loadAlbums();})
    .catch(toastErr);
}

export const __exports__ = { openPostEditor, postMetaUpd, openEditor, buildPostPayload, sendPost, savePostDraft, publishPost, loadCats, fillCatSelect, edViewMode, uploadCover, imgInsertOpen, imgPickAlbum, imgPickUse, imgPickManual, setPostFilter, draftSave, draftHook, draftClear, mdWrap, mdLine, setCover };
