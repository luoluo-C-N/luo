/** views/music —— 音乐管理（S5）。PUT 走 FormData；上传上限 50MB */
/* 逐字迁移自 src/prototype.js（步骤 S5）；行为变更需走评审。 */
import { backBase } from '../data/http.js';

export function protoRenderMusic(rows){
  MUSIC_ROWS=rows||[];
  CRUD_DATA.music=MUSIC_ROWS;
  var host=document.getElementById('musicReal');if(!host)return;
  host.innerHTML='';
  if(!rows||!rows.length){host.style.display='none';return;}
  host.style.display='block';
  rows.forEach(function(r){
    var el=document.createElement('div');el.className='music-row';
    el.innerHTML='<div class="music-cov" style="background:linear-gradient(135deg,var(--accent),var(--accent2));cursor:pointer" title="播放" onclick="protoPlay('+q0()+String(r.url)+q0()+')"><span style="color:#fff;font-size:14px">▶</span></div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(String(r.title))+'</div><div style="font-size:12px;color:var(--ink-2)">'+esc(String(r.artist||'本地上传'))+(r.duration?' · '+Math.floor(r.duration/60)+':'+String(r.duration%60).padStart(2,'0'):'')+'</div></div>'+
      '<span class="chip chip-local">本地上传</span>'+
      '<span class="crud-act" title="编辑信息" onclick="openCrudForm(&#39;music&#39;,'+r.id+')">✏️</span>'+
      '<span class="crud-act" title="上移" onclick="protoMoveMusic('+r.id+',-1)">↑</span>'+
      '<span class="crud-act" title="下移" onclick="protoMoveMusic('+r.id+',1)">↓</span>'+
      '<span class="grip" title="删除" style="cursor:pointer;color:var(--red)" onclick="protoDelMusic('+r.id+')">🗑</span>';
    host.appendChild(el);
  });
}

export function q0(){return String.fromCharCode(39);}

export function protoPlay(url){
  if(!protoAudioEl)protoAudioEl=document.getElementById('protoAudio');
  if(!protoAudioEl)return;
  if(protoAudioEl.dataset.src===url&&!protoAudioEl.paused){protoAudioEl.pause();return;}
  protoAudioEl.dataset.src=url;
  protoAudioEl.src=backBase()+url;
  protoAudioEl.play().catch(function(){});
}

export function protoMoveMusic(id,dir){
  var i=-1;for(var x=0;x<MUSIC_ROWS.length;x++){if(MUSIC_ROWS[x].id===id){i=x;break;}}
  var j=i+dir;if(i<0||j<0||j>=MUSIC_ROWS.length)return;
  var a=MUSIC_ROWS[i],b=MUSIC_ROWS[j];
  var sa=a.sort||0,sb=b.sort||0,na,nb;
  if(sa===sb){na=MUSIC_ROWS.length-1-j;nb=MUSIC_ROWS.length-1-i;}
  else{na=sb;nb=sa;}
  var fa=new FormData();fa.append('sort',na);
  var fb=new FormData();fb.append('sort',nb);
  Promise.all([
    fetch(backBase()+'/api/music/'+a.id,{method:'PUT',headers:authHeaders(),body:fa}),
    fetch(backBase()+'/api/music/'+b.id,{method:'PUT',headers:authHeaders(),body:fb})
  ]).then(function(rs){
    if(rs.some(function(r){return !r.ok;}))throw new Error('sort failed');
    toast('已调整排序');fetchProtoMusic();
  }).catch(function(){toast('排序失败');});
}

export function protoDelMusic(id){
  fetch(backBase()+'/api/music/'+id,{method:'DELETE',headers:authHeaders()})
    .then(function(r){return r.json();})
    .then(function(){fetchProtoMusic();toast('已删除');})
    .catch(function(){toast('删除失败');});
}

export function fetchProtoMusic(){
  fetch(backBase()+'/api/music')
    .then(function(r){return r.json();})
    .then(function(j){protoRenderMusic(j&&j.data);})
    .catch(function(){protoRenderMusic(null);});
}

export function uploadMusicFile(input){
  var f=input.files&&input.files[0];if(!f)return;
  var fd=new FormData();
  fd.append('file',f);
  fd.append('title',f.name.replace(/\.[^.]+$/,''));
  fetch(backBase()+'/api/music/upload',{method:'POST',headers:authHeaders(),body:fd})
    .then(function(r){return r.json();})
    .then(function(j){
      if(j&&j.code===0){fetchProtoMusic();toast('「'+j.data.title+'」已上传');}
      else toast('上传失败');
    })
    .catch(function(){toast('上传失败：后端未启动');});
  input.value='';
}

export const __exports__ = { protoRenderMusic, q0, protoPlay, protoMoveMusic, protoDelMusic, fetchProtoMusic, uploadMusicFile };
