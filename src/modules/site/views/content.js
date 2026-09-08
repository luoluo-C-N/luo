/** views/content —— 内容管理：文章/说说/相册/九类资料/访客（S5）。验收: SITE-FR3 */
/* 逐字迁移自 src/prototype.js（步骤 S5）；行为变更需走评审。 */

export function loadPosts(){PG.posts=1;POSTS=[];_fetchPosts();}

export function loadMorePosts(){PG.posts++;_fetchPosts();}

export function _fetchPosts(){
  jfetch(API_BASE+'/api/posts?size='+PAGE_SIZE+'&page='+PG.posts).then(function(l){
    var list=unwrap(l)||[];
    POSTS=POSTS.concat(list);
    N.posts=POSTS.length;updCounts();renderPosts();
  }).catch(function(e){lerrEl(document.getElementById('postsReal'),e);});
}

export function renderPosts(){
  var h=document.getElementById('postsReal');if(!h)return;
  var kw=PQ.trim().toLowerCase();
  var list=POSTS.filter(function(p){
    if(kw&&String(p.title).toLowerCase().indexOf(kw)<0)return false;
    if(PF==='published'&&p.status!=='published')return false;
    if(PF==='draft'&&p.status!=='draft')return false;
    return true;
  });
  if(!list.length){h.innerHTML=emptyCard(kw?'没有匹配的文章':'还没有文章 · 点右上角 ✍️ 写一篇');return;}
  h.innerHTML=list.map(function(p){
    var pub=p.status==='published';
    return '<div class="card post-manage"><div class="pm-title">'+(p.is_pinned?'📌 ':'')+esc(p.title)+'</div>'+
      '<div class="pm-meta"><span class="chip '+(pub?'chip-pub':'chip-draft')+'">'+(pub?'已发布':'草稿')+'</span>'+
      '<span class="stat">👁 '+(p.views||0)+'</span><span class="stat">👍 '+(p.likes||0)+'</span>'+
      '<span>'+fdate(p.updated_at||p.created_at)+'</span>'+
      '<span class="pm-edit" onclick="openPostEditor('+p.id+')">编辑</span>'+
      '<span class="crud-act" title="置顶/取消置顶" onclick="togglePin('+p.id+')">📌</span>'+
      '<span class="crud-act" title="删除" style="color:var(--red)" onclick="delPost('+p.id+')">🗑</span></div></div>';
  }).join('');
  if(POSTS_MORE&&!kw)h.innerHTML+='<div class="card" style="padding:12px;text-align:center;font-size:13px;color:var(--accent);font-weight:700;cursor:pointer" onclick="loadMorePosts()">加载更多 ↓</div>';
}

export function filterPosts(v){PQ=v||'';renderPosts();}

export function togglePin(id){
  var p=POSTS.find(function(x){return x.id===id;});if(!p)return;
  jfetch(API_BASE+'/api/posts/'+id,{method:'PUT',body:JSON.stringify({is_pinned:!p.is_pinned})})
    .then(function(){toast(!p.is_pinned?'已置顶':'已取消置顶');loadPosts();}).catch(toastErr);
}

export function delPost(id){
  var p=POSTS.find(function(x){return x.id===id;});
  askConfirm('删除文章「'+(p?p.title:id)+'」？不可恢复').then(function(ok){
    if(!ok)return;
    jfetch(API_BASE+'/api/posts/'+id,{method:'DELETE'}).then(function(){toast('已删除');loadPosts();loadDash();}).catch(toastErr);
  });
}

export function loadMoments(){PG.moments=1;CRUD_DATA.chatters=[];_fetchMoments();}

export function loadMoreMoments(){PG.moments++;_fetchMoments();}

export function _fetchMoments(){
  jfetch(API_BASE+'/api/chatters/admin?size='+PAGE_SIZE+'&page='+PG.moments,{headers:authHeaders()}).then(function(l){
    var arr=unwrap(l)||[];
    MOMENTS_MORE=arr.length===PAGE_SIZE;
    CRUD_DATA.chatters=(CRUD_DATA.chatters||[]).concat(arr);
    N.moments=CRUD_DATA.chatters.length;updCounts();
    renderMoments();
  }).catch(function(e){lerrEl(document.getElementById('momentsReal'),e);});
}

export function renderMoments(){
  {
    var arr=CRUD_DATA.chatters||[];
    var h=document.getElementById('momentsReal');if(!h)return;
    if(!arr.length){h.innerHTML=emptyCard('还没有说说 · 点下方按钮发第一条');return;}
    h.innerHTML=arr.map(function(m){
      var pub=m.status==='published';
      return '<div class="card moment-card"><div style="font-size:12px;color:var(--ink-3)">'+fdate(m.created_at)+
        ' · <span style="color:'+(pub?'var(--green)':'var(--orange)')+';font-weight:600">'+(pub?'已发布':'草稿')+'</span></div>'+
        '<div class="moment-text">'+esc(m.content)+'</div>'+
        (m.images&&m.images.length?'<div class="moment-imgs">'+m.images.slice(0,3).map(function(){return '<div class="mi" style="background:linear-gradient(135deg,#7EB6F7,#C9A3F5)">🖼️</div>';}).join('')+'</div>':'')+
        '<div class="moment-act"><span>👍 '+(m.likes||0)+'</span><span>💬 '+(m.comments_count||0)+'</span>'+
        '<span class="crud-act" title="编辑" onclick="openCrudForm(\'chatters\','+m.id+')">✏️</span>'+
        '<span style="margin-left:auto;color:var(--red);cursor:pointer" onclick="delMoment('+m.id+')">删除</span></div></div>';
    }).join('');
    if(MOMENTS_MORE)h.innerHTML+='<div class="card" style="padding:12px;text-align:center;font-size:13px;color:var(--accent);font-weight:700;cursor:pointer" onclick="loadMoreMoments()">加载更多 ↓</div>';
  }
}

export function delMoment(id){
  askConfirm('删除这条说说？不可恢复').then(function(ok){
    if(!ok)return;
    jfetch(API_BASE+'/api/chatters/'+id,{method:'DELETE'}).then(function(){toast('已删除');loadMoments();loadDash();}).catch(toastErr);
  });
}

export function gotoAlbum(){jumpTab('scr-content');segTo('content','album');if(CUR_ALBUM)loadAlbumPhotos(CUR_ALBUM.id,CUR_ALBUM.title);else loadAlbums();}

export function loadAlbums(){
  if(CUR_ALBUM){loadAlbumPhotos(CUR_ALBUM.id,CUR_ALBUM.title);return;}
  jfetch(API_BASE+'/api/albums').then(function(l){
    ALBUMS=unwrap(l)||[];N.albums=ALBUMS.length;updCounts();renderAlbums();
  }).catch(function(e){lerrEl(document.getElementById('albumsReal'),e);});
}

export function renderAlbums(){
  var h=document.getElementById('albumsReal');if(!h)return;
  var add=document.getElementById('albumAddBtn');if(add)add.style.display='';
  if(!ALBUMS.length){h.innerHTML=emptyCard('还没有相册 · 点下方新建');return;}
  h.innerHTML=ALBUMS.map(function(a){
    return '<div class="card" style="padding:12px 14px;cursor:pointer" onclick="openAlbum('+a.id+')">'+
      '<div style="display:flex;gap:12px;align-items:center">'+
      (a.cover?'<img src="'+escAttr(imgSrc(a.cover))+'" style="width:52px;height:52px;border-radius:12px;object-fit:cover;flex-shrink:0" onerror="this.outerHTML=\'<div class=crud-ic style=&quot;width:52px;height:52px;font-size:22px&quot;>🏞️</div>\'">':'<div class="crud-ic" style="width:52px;height:52px;font-size:22px">🏞️</div>')+
      '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600">'+esc(a.title)+'</div>'+
      '<div style="font-size:12px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.description||'')+'</div></div>'+
      '<span class="chip chip-local">'+(a.photo_count||0)+' 张</span>'+
      '<span class="crud-act" onclick="event.stopPropagation();openCrudForm(\'albums\','+a.id+')">✏️</span></div></div>';
  }).join('');
}

export function openAlbum(id){var a=ALBUMS.find(function(x){return x.id===id;});if(!a)return;CUR_ALBUM=a;loadAlbumPhotos(id,a.title);}

export function closeAlbum(){
  CUR_ALBUM=null;
  var det=document.getElementById('albumDetail'),list=document.getElementById('albumsReal'),add=document.getElementById('albumAddBtn');
  if(det){det.style.display='none';det.innerHTML='';}
  if(list)list.style.display='';
  if(add)add.style.display='';
}

export function loadAlbumPhotos(id,title){
  jfetch(API_BASE+'/api/albums/'+id+'/photos').then(function(l){
    var arr=unwrap(l)||[];CUR_PHOTOS=arr;
    var list=document.getElementById('albumsReal'),det=document.getElementById('albumDetail'),add=document.getElementById('albumAddBtn');
    if(!det)return;
    list.style.display='none';if(add)add.style.display='none';
    det.style.display='block';
    det.innerHTML='<div class="album-back" onclick="closeAlbum()">‹ 返回相册列表</div>'+
      '<div class="card" style="padding:14px"><div style="font-size:15px;font-weight:700;margin-bottom:2px">'+esc(title)+'</div>'+
      '<div style="font-size:12px;color:var(--ink-3);margin-bottom:10px">'+arr.length+' 张照片</div>'+
      '<div class="gallery">'+arr.map(function(ph){
        return '<div class="gcell photo-cell" title="'+escAttr(ph.caption||'')+'">'+
          (imgSrc(ph.url)?'<img src="'+escAttr(imgSrc(ph.url))+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.parentNode.textContent=\'🖼️\'">':'🖼️')+
          '<span class="photo-x" style="left:4px;right:auto;background:rgba(var(--accent-rgb),.78)" title="设为相册封面" onclick="event.stopPropagation();setCover('+ph.id+')">🖼</span>'+
          '<span class="photo-x" onclick="delPhoto('+ph.id+')">✕</span></div>';
      }).join('')+
      '<div class="gcell add" onclick="document.getElementById(\'photoFile\').click()">✚</div>'+
      '<div class="gcell add" style="font-size:13px" onclick="addPhotoUrl()">🔗</div></div></div>'+
      '<div style="font-size:12px;color:var(--ink-3);text-align:center;margin-top:4px">✚ 上传手机照片 · 🔗 添加图片网址</div>';
  }).catch(function(e){CUR_ALBUM=null;lerrEl(document.getElementById('albumsReal'),e);});
}

export function delPhoto(pid){
  if(!CUR_ALBUM){return;}
  askConfirm('删除这张照片？不可恢复').then(function(ok){
    if(!ok)return;
    jfetch(API_BASE+'/api/albums/photos/'+pid,{method:'DELETE'}).then(function(){toast('已删除');loadAlbumPhotos(CUR_ALBUM.id,CUR_ALBUM.title);}).catch(toastErr);
  });
}

export function uploadPhotos(input){
  var fs=input.files;if(!fs||!fs.length||!CUR_ALBUM)return;
  var ok=0,fail=0;
  var upOss=function(f){
    var fd=new FormData();fd.append('file',f);
    return fetch(API_BASE+'/api/upload/image',{method:'POST',headers:authHeaders(),body:fd})
      .then(function(r){return r.json();})
      .then(function(j){
        if(!j||!j.url)throw new Error((j&&(j.detail||j.message))||'OSS 未配置');
        return j;
      });
  };
  var upLocal=function(f){
    var fd=new FormData();fd.append('file',f);
    return fetch(API_BASE+'/api/upload/image-local',{method:'POST',headers:authHeaders(),body:fd})
      .then(function(r){return r.json();})
      .then(function(j){
        if(!j||!j.url)throw new Error((j&&(j.detail||j.message))||'本地上传失败');
        return j;
      });
  };
  var up=function(f){
    return upOss(f).catch(function(){return upLocal(f);}).then(function(j){
      return jfetch(API_BASE+'/api/albums/photos',{method:'POST',body:JSON.stringify({album_id:CUR_ALBUM.id,url:j.url,caption:f.name.replace(/\.[^.]+$/,''),orientation:j.orientation||'landscape'})});
    });
  };
  var seq=Promise.resolve();
  Array.prototype.forEach.call(fs,function(f){seq=seq.then(function(){return up(f).then(function(){ok++;}).catch(function(){fail++;});});});
  seq.then(function(){
    input.value='';
    toast('已上传 '+ok+' 张'+(fail?' · 失败 '+fail+' 张，可点 🔗 用网址添加':''));
    loadAlbumPhotos(CUR_ALBUM.id,CUR_ALBUM.title);
  });
}

export function addPhotoUrl(){
  if(!CUR_ALBUM)return;
  askText('添加图片网址','支持 https:// 链接或站内路径','https://… 或 /images/xx.webp').then(function(u){
    if(!u)return;
    jfetch(API_BASE+'/api/albums/photos',{method:'POST',body:JSON.stringify({album_id:CUR_ALBUM.id,url:u.trim(),caption:'',orientation:'landscape'})})
      .then(function(){toast('已添加');loadAlbumPhotos(CUR_ALBUM.id,CUR_ALBUM.title);}).catch(toastErr);
  });
}















export const __exports__ = { loadPosts, loadMorePosts, _fetchPosts, renderPosts, filterPosts, togglePin, delPost, loadMoments, loadMoreMoments, _fetchMoments, renderMoments, delMoment, gotoAlbum, loadAlbums, renderAlbums, openAlbum, closeAlbum, loadAlbumPhotos, delPhoto, uploadPhotos, addPhotoUrl };
