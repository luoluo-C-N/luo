/** views/profile —— 我的 + 全局搜索（S6）。验收: SITE-FR6 */
/* 逐字迁移自 src/prototype.js（步骤 S6）；行为变更需走评审。 */

export function meCardPaint(){
  var u=AUTH.user||{};
  var av=document.getElementById('meAvatar');
  if(av){
    var url=u.avatar||'';
    if(url){
      av.innerHTML='<img src="'+escAttr(imgSrc(url))+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" onerror="this.remove()">';
    }else av.textContent=(u.nickname||'洛').slice(0,1);
  }
  var nk=document.getElementById('meNick');
  if(nk)nk.innerHTML=esc(u.nickname||'洛洛')+' <span style="font-size:12px;color:var(--accent);font-weight:600">编辑 ›</span>';
  var bio=document.getElementById('meBio');
  if(bio)bio.textContent=u.bio||u.description||'Kirameku · 站点管理员';
}

export function pfAvatarPaint(url){
  var el=document.getElementById('pfAvatar');
  if(!el)return;
  if(url)el.innerHTML='<img src="'+escAttr(imgSrc(url))+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">';
  else el.textContent=((AUTH.user&&AUTH.user.nickname)||'洛').slice(0,1);
}

export function uploadAvatar(input){
  var f=input.files&&input.files[0];if(!f)return;
  toast('头像上传中…');
  var fd=new FormData();fd.append('file',f);
  var up=function(ep){return fetch(API_BASE+ep,{method:'POST',headers:authHeaders(),body:fd}).then(function(r){return r.json();});};
  up('/api/upload/image').catch(function(){return up('/api/upload/image-local');}).then(function(j){
    if(!j||!j.url)throw new Error((j&&(j.detail||j.message))||'上传失败');
    PF_AV=j.url;
    pfAvatarPaint(j.url);
    toast('头像已就绪，保存后生效 ✓');
  }).catch(function(e){toast('⚠️ '+(e.message||'头像上传失败'));});
  input.value='';
}

export function openProfile(){
  var fill=function(u){
    u=u||{};
    var n=document.getElementById('pfNick'),e=document.getElementById('pfEmail'),b=document.getElementById('pfBio');
    if(n)n.value=u.nickname||'';
    if(e)e.value=u.email||'';
    if(b)b.value=u.description||u.bio||'';
    PF_AV=u.avatar||'';
    pfAvatarPaint(u.avatar);
  };
  if(AUTH.token){
    jfetch(API_BASE+'/api/auth/me',{headers:authHeaders()}).then(function(r){fill(unwrap(r));}).catch(function(){fill(AUTH.user);});
  }else fill(AUTH.user);
  openSub('pg-profile');
}

export function saveProfile(){
  var pl={nickname:document.getElementById('pfNick').value.trim(),
          email:document.getElementById('pfEmail').value.trim(),
          description:document.getElementById('pfBio').value.trim()};
  if(PF_AV)pl.avatar=PF_AV;
  if(!pl.nickname){toast('昵称不能为空');return;}
  jfetch(API_BASE+'/api/auth/me',{method:'PUT',body:JSON.stringify(pl)})
    .then(function(){
      try{
        var u=JSON.parse(localStorage.getItem('authUser')||'{}');
        u.nickname=pl.nickname;if(pl.avatar)u.avatar=pl.avatar;u.bio=pl.description;
        localStorage.setItem('authUser',JSON.stringify(u));
      }catch(e){}
      AUTH.user=Object.assign(AUTH.user||{},pl);
      meCardPaint();
      toast('资料已保存 ✓');closeSub('pg-profile');
    }).catch(toastErr);
}

export function openSearch(){
  openSub('pg-search');
  var g=document.getElementById('gq');
  if(g){g.value='';g.focus();}
  var out=document.getElementById('gSearchOut');
  if(out)out.innerHTML='<div class="card" style="padding:12px;font-size:12.5px;color:var(--ink-3)">输入关键词回车 · 并行搜索文章 / 说说 / 相册</div>';
}

export function globalSearch(){
  var kw=(document.getElementById('gq').value||'').trim();
  var out=document.getElementById('gSearchOut');
  if(!kw){out.innerHTML=emptyCard('输入关键词开始搜索');return;}
  out.innerHTML='<div class="card" style="padding:12px;font-size:12.5px;color:var(--ink-3)">搜索中…</div>';
  var kwl=kw.toLowerCase();
  Promise.all([
    jfetch(API_BASE+'/api/posts?size=200').then(unwrap).catch(function(){return [];}),
    jfetch(API_BASE+'/api/chatters/admin?size=200',{headers:authHeaders()}).then(unwrap).catch(function(){return [];}),
    jfetch(API_BASE+'/api/albums').then(unwrap).catch(function(){return [];})
  ]).then(function(rs){
    var posts=(rs[0]||[]).filter(function(p){return String(p.title).toLowerCase().indexOf(kwl)>-1;});
    var moms=(rs[1]||[]).filter(function(m){return String(m.content).toLowerCase().indexOf(kwl)>-1;});
    var als=(rs[2]||[]).filter(function(a){return (String(a.title)+' '+String(a.description||'')).toLowerCase().indexOf(kwl)>-1;});
    var html='';
    function group(title,rows,render){
      if(!rows.length)return '';
      return '<div class="section-title" style="margin:12px 0 6px">'+title+' · '+rows.length+'</div>'+rows.map(render).join('');
    }
    html+=group('文章',posts.slice(0,10),function(p){
      return '<div class="card" style="padding:10px 14px;cursor:pointer" onclick="closeSub(\'pg-search\');openPostEditor('+p.id+')"><div style="font-size:13.5px;font-weight:600">'+esc(p.title)+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+(p.status==='published'?'已发布':'草稿')+' · 👁 '+(p.views||0)+'</div></div>';
    });
    html+=group('说说',moms.slice(0,10),function(m){
      return '<div class="card" style="padding:10px 14px;cursor:pointer" onclick="closeSub(\'pg-search\');jumpTab(\'scr-content\');segTo(\'content\',\'moments\')"><div style="font-size:13px">'+esc(String(m.content).slice(0,60))+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+fdate(m.created_at)+'</div></div>';
    });
    html+=group('相册',als.slice(0,10),function(a){
      return '<div class="card" style="padding:10px 14px;cursor:pointer" onclick="closeSub(\'pg-search\');jumpTab(\'scr-content\');segTo(\'content\',\'album\');openAlbum('+a.id+')"><div style="font-size:13.5px;font-weight:600">'+esc(a.title)+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+(a.photo_count||0)+' 张</div></div>';
    });
    out.innerHTML=html||emptyCard('没有找到「'+esc(kw)+'」相关内容');
  }).catch(function(e){out.innerHTML=emptyCard('⚠️ '+e.message);});
}

export const __exports__ = { meCardPaint, pfAvatarPaint, uploadAvatar, openProfile, saveProfile, openSearch, globalSearch };
