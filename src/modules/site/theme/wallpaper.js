/** theme/wallpaper —— 壁纸系统（S7）：预设/上传压缩/质感联动 */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function renderWallLayer(){
  var w=wallpapers[curWall],wl=document.getElementById('wallLayer');
  if(!w||!wl)return;
  var v=(clampN(wallT.veil,0,80)/100).toFixed(3);
  if(w.img){
    wl.style.backgroundImage='linear-gradient(rgba(250,252,255,'+v+'),rgba(250,252,255,'+v+')),url("'+w.img+'")';
  }else{
    wl.style.backgroundImage='none';
    wl.style.backgroundColor=w.bg;
  }
}

export function applyWallTuning(){
  document.documentElement.style.setProperty('--wall-blur',clampN(wallT.blur,0,30)+'px');
  renderWallLayer();
  var bv=document.getElementById('slWallBlurV'),vv=document.getElementById('slWallVeilV');
  if(bv)bv.textContent=clampN(wallT.blur,0,30)+'px';
  if(vv)vv.textContent=clampN(wallT.veil,0,80)+'%';
}

export function saveWallTuning(){try{localStorage.setItem('wallTuning',JSON.stringify(wallT));}catch(e){}}

export function syncWallSliders(){
  var b=document.getElementById('slWallBlur'),v=document.getElementById('slWallVeil');
  if(b)b.value=wallT.blur;
  if(v)v.value=wallT.veil;
}

export function enterPreview(){document.getElementById(previewPage).classList.add('previewing');}

export function exitPreview(){document.getElementById(previewPage).classList.remove('previewing');}

export function dragPreview(){
  enterPreview();
  clearTimeout(previewTimer);
  previewTimer=setTimeout(exitPreview,1200);
}

export function endPreviewNow(){clearTimeout(previewTimer);exitPreview();}

export function saveCustomWalls(){try{localStorage.setItem('customWalls',JSON.stringify(customWalls));}catch(e){toast('存储空间不足，请删除部分自定义壁纸');}}

export function applyWallpaper(key){
  var w=wallpapers[key];if(!w)return;
  curWall=key;
  var meshEl=document.querySelector('.mesh');
  if(w.img){
    meshEl.style.opacity='0';
  }else{
    meshEl.style.opacity='';
    document.querySelectorAll('.mesh .blob').forEach(function(b,i){
      b.style.background=w.blobs[i]||w.blobs[w.blobs.length-1];
    });
  }
  renderWallLayer();
  try{localStorage.setItem('wallpaper',key);}catch(e){}
  renderWpGrid();
}

export function renderWpGrid(){
  var g=document.getElementById('wpGrid');if(!g)return;g.innerHTML='';
  /* 上传卡 */
  var up=document.createElement('div');up.className='wp-card';
  up.innerHTML='<div class="wp-thumb wp-upload">🖼️<div class="up-tx">上传图片做壁纸</div></div><div class="wp-name">自定义壁纸</div>';
  up.onclick=function(){document.getElementById('wpFile').click();};
  g.appendChild(up);
  /* 自定义壁纸(含用户上传,可删除的带 ✕)排在前 */
  Object.keys(wallpapers).filter(function(k){return wallpapers[k].custom;}).reverse().forEach(function(k){
    g.appendChild(makeWpCard(k,wallpapers[k]));
  });
  /* 预设 */
  Object.keys(wallpapers).forEach(function(k){
    if(!wallpapers[k].custom)g.appendChild(makeWpCard(k,wallpapers[k]));
  });
}

export function makeWpCard(k,w){
  var c=document.createElement('div');c.className='wp-card'+(curWall===k?' on':'');
  var thumbStyle=w.img?'background:url(&quot;'+w.img+'&quot;) center/cover':'background:linear-gradient(135deg,'+w.blobs[0]+','+w.blobs[1]+' 45%,'+w.blobs[2]+' 72%,'+w.blobs[3]+')';
  c.innerHTML='<div class="wp-thumb" style="'+thumbStyle+'">'+
    (w.custom&&w.deletable?'<span class="wp-del" title="删除">✕</span>':'')+
    (curWall===k?'<span class="wp-check">✓</span>':'')+
    '</div><div class="wp-name">'+w.name+'</div>';
  c.onclick=function(){applyWallpaper(k);toast(w.img?'已应用图片壁纸 · '+w.name:'已切换壁纸 · '+w.name);};
  var del=c.querySelector('.wp-del');
  if(del){del.onclick=function(e){e.stopPropagation();deleteCustom(k);};}
  return c;
}

export function deleteCustom(k){
  customWalls=customWalls.filter(function(c){return c.key!==k;});
  delete wallpapers[k];
  saveCustomWalls();
  if(curWall===k)applyWallpaper('aurora');
  renderWpGrid();
  toast('已删除该自定义壁纸');
}

export function handleWpFile(input){
  var f=input.files&&input.files[0];if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    var img=new Image();
    img.onload=function(){
      /* 压缩到 820px 宽以内,JPG 82%,控制 localStorage 体积 */
      var maxW=820,s=Math.min(1,maxW/img.width);
      var cv=document.createElement('canvas');
      cv.width=Math.max(1,Math.round(img.width*s));cv.height=Math.max(1,Math.round(img.height*s));
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      var data='';
      try{data=cv.toDataURL('image/jpeg',0.82);}catch(e){toast('图片处理失败，换一张试试');return;}
      var key='c'+Date.now();
      var entry={key:key,name:'自定义 '+(customWalls.length+1),img:data};
      customWalls.push(entry);
      if(customWalls.length>8)customWalls.shift();
      wallpapers[key]={name:entry.name,img:data,custom:true,deletable:true};
      saveCustomWalls();
      renderWpGrid();
      applyWallpaper(key);
      toast('壁纸已上传并应用');
    };
    img.onerror=function(){toast('图片读取失败');};
    img.src=rd.result;
  };
  rd.readAsDataURL(f);
  input.value='';
}

export const __exports__ = { renderWallLayer, applyWallTuning, saveWallTuning, syncWallSliders, enterPreview, exitPreview, dragPreview, endPreviewNow, saveCustomWalls, applyWallpaper, renderWpGrid, makeWpCard, deleteCustom, handleWpFile };
