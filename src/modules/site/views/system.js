/** views/system —— 系统杂项（S7）：连接设置/云同步(占位)/通知/轮询注册。v0.04+ 拆往内核设置与 remind */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function openConn(){
  var a=document.getElementById('connApi'),f=document.getElementById('connFront');
  if(a)a.value=localStorage.getItem('pocket.server')||'';
  if(f)f.value=localStorage.getItem('pocket.front')||'';
  connPaint();
  openSub('pg-conn');
}

export function connPaint(){
  var el=document.getElementById('connStatus');if(!el)return;
  var eff=localStorage.getItem('pocket.server')||'(默认) http://localhost:8000';
  el.innerHTML='<div style="display:flex;align-items:center;gap:8px"><span class="dot" id="connDot" style="background:var(--ink-3)"></span><div style="flex:1"><div style="font-size:13px;font-weight:700">当前后端</div><div style="font-size:11.5px;color:var(--ink-3)">'+esc(eff)+'</div></div></div>';
}

export function saveConn(){
  var a=document.getElementById('connApi').value.trim().replace(/\/+$/,'');
  var f=document.getElementById('connFront').value.trim().replace(/\/+$/,'');
  if(a&&!/^https?:\/\//.test(a)){toast('后端地址需以 http(s):// 开头');return;}
  try{
    if(a)localStorage.setItem('pocket.server',a);else localStorage.removeItem('pocket.server');
    if(f)localStorage.setItem('pocket.front',f);else localStorage.removeItem('pocket.front');
  }catch(e){}
  toast('已保存，正在重测连接…');
  setTimeout(function(){testConn(true);},200);
}

export function testConn(silent){
  var base=localStorage.getItem('pocket.server')||'http://localhost:8000';
  var t0=performance.now();
  fetch(base+'/api/health',{cache:'no-store'})
    .then(function(r){return r.json();})
    .then(function(j){
      var ms=Math.max(1,Math.round(performance.now()-t0));
      var ok=j&&j.status==='ok';
      var dot=document.getElementById('connDot');
      if(dot)dot.style.background=ok?'var(--green)':'var(--orange)';
      var el=document.getElementById('connStatus');
      if(el){
        var st=el.querySelector('.dot');
        if(st)st.style.background=ok?'var(--green)':'var(--orange)';
        el.innerHTML=el.innerHTML.replace(/<\/div>$/,'')+'<div style="font-size:11.5px;color:'+(ok?'var(--green)':'var(--orange)')+';margin-top:6px">'+(ok?'✓ 连接正常 · '+ms+'ms':'⚠️ 响应异常（返回的不是 Kirameku 后端）')+'</div>';
      }
      connStatePaint(ok);
      if(!silent)toast(ok?'连接正常 ✓':'后端响应异常');
      BACKEND_OK=ok;
    })
    .catch(function(){
      var el=document.getElementById('connStatus');
      if(el&&!el.querySelector('.conn-err'))el.innerHTML+='<div class="conn-err" style="font-size:11.5px;color:var(--red);margin-top:6px">✕ 无法连接：检查地址、防火墙，或确认电脑后端已启动</div>';
      var dot=document.getElementById('connDot');if(dot)dot.style.background='var(--red)';
      connStatePaint(false);
      if(!silent)toast('无法连接后端');
      BACKEND_OK=false;
    });
}

export function connStatePaint(ok){
  var el=document.getElementById('connState');if(!el)return;
  el.textContent=ok?'已连接':'未连接';
  el.style.color=ok?'var(--green)':'var(--red)';
}

export function cfgCollect(){
  var keys=['wallpaper','customPanels','panelOrder','renameNames','cardSizes','customModules','panelPins','wallTuning','glassTuning','darkMode'];
  var cfg={_ts:new Date().toISOString()};
  keys.forEach(function(k){var v=localStorage.getItem(k);if(v!=null)cfg[k]=v;});
  return JSON.stringify(cfg);
}

export function cfgApply(txt){
  var cfg=typeof txt==='string'?JSON.parse(txt):txt;
  if(!cfg||typeof cfg!=='object')throw new Error('配置格式不正确');
  Object.keys(cfg).forEach(function(k){
    if(k==='_ts')return;
    localStorage.setItem(k,cfg[k]);
  });
  return cfg;
}

export function cloudEnabled(){return CLOUD_ON!==null?CLOUD_ON:localStorage.getItem('cloudSync')==='1';}

export function toggleCloudSync(row){
  var next=!cloudEnabled();
  CLOUD_ON=next;
  localStorage.setItem('cloudSync',next?'1':'0');
  var sw=document.getElementById('swCloud');if(sw)sw.classList.toggle('on',next);
  toast(next?'云端同步已开启，改动将自动上传':'云端同步已关闭');
  if(next)pushCloud();
}

export function pushCloud(manual){
  if(!AUTH.token){toast('请先登录');return;}
  if(!cloudEnabled()&&!manual){return;}
  var payload={value:cfgCollect(),description:'掌上小站配置备份'};
  jfetch(API_BASE+'/api/site-config/'+CFG_KEY,{method:'PUT',body:JSON.stringify(payload)})
    .catch(function(e){
      if(String(e.message).indexOf('404')>-1||String(e.message).indexOf('不存在')>-1)
        return jfetch(API_BASE+'/api/site_config',{method:'POST',body:JSON.stringify(Object.assign({key:CFG_KEY},payload))});
      throw e;
    })
    .then(function(){
      var t=new Date();
      var el=document.getElementById('lastSync');if(el)el.textContent=('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2);
      if(manual)toast('配置已上传云端 ✓');
    })
    .catch(function(e){if(manual)toastErr(e);});
}

export function pullCloud(){
  if(!AUTH.token){toast('请先登录');return;}
  jfetch(API_BASE+'/api/site-config/'+CFG_KEY).then(function(r){
    var val=unwrap(r);
    if(val&&typeof val==='object'&&val.value)val=val.value;
    if(!val){toast('云端还没有配置备份');return;}
    cfgApply(val);
    toast('已恢复云端配置，即将刷新…');
    setTimeout(function(){location.reload();},900);
  }).catch(function(e){if(String(e.message).indexOf('不存在')>-1||String(e.message).indexOf('404')>-1){toast('云端还没有配置备份');}else toastErr(e);});
}

export function cloudPaint(){
  var sw=document.getElementById('swCloud');if(sw)sw.classList.toggle('on',cloudEnabled());
}

export function autoPush(){
  if(!cloudEnabled()||!AUTH.token)return;
  clearTimeout(_pushT);_pushT=setTimeout(function(){pushCloud();},10000);
}

export function notifSaveSeen(){try{localStorage.setItem('notifSeen',JSON.stringify(NOTIF_SEEN));}catch(e){}}

export function notifCheck(manual){
  var items=[];
  var h=authHeaders();
  Promise.all([
    jfetch(API_BASE+'/api/comments/admin?status=pending&size=1',{headers:h}).then(unwrap).catch(function(){return null;}),
    jfetch(API_BASE+'/api/messages/admin?status=pending&size=1',{headers:h}).then(unwrap).catch(function(){return null;}),
    jfetch(API_BASE+'/api/chatters/comments/admin?status=pending&size=1',{headers:h}).then(unwrap).catch(function(){return null;}),
    jfetch(API_BASE+'/api/system/status').then(function(r){var d=unwrap(r);return d;}).catch(function(){return null;})
  ]).then(function(rs){
    var cmt=rs[0]?rs[0].length:-1,msg=rs[1]?rs[1].length:-1,cht=rs[2]?rs[2].length:-1;
    var sys=rs[3];
    var audit=(cmt<0?0:cmt)+(msg<0?0:msg)+(cht<0?0:cht);
    var loggedOut=(cmt<0&&msg<0);
    if(audit>0)items.push({t:'📝',txt:audit+' 条内容待审核',sub:'文章评论 '+(cmt<0?0:cmt)+' · 留言 '+msg+' · 说说评 '+cht,act:"jumpTab('scr-review')",key:'audit',n:audit});
    if(sys){
      if(sys.cpu>=85)items.push({t:'🔥',txt:'CPU 高负载 '+sys.cpu+'%',sub:'资源紧张，建议检查进程',act:"jumpTab('scr-status')",key:'cpu',n:1});
      if(sys.dbOk===false)items.push({t:'🗄️',txt:'数据库读取异常',sub:'kirameku.db 不可读',act:"openSvcMgr()",key:'db',n:1});
    }
    if(BACKEND_OK===false)items.push({t:'📡',txt:'后端不可达',sub:'请检查连接设置',act:"openConn()",key:'backend',n:1});
    if(window.SVC_DOWN&&SVC_DOWN.length)items.push({t:'🛑',txt:'服务离线：'+SVC_DOWN.join('、'),sub:'服务状态页可查看详情',act:"openSvcMgr()",key:'svc',n:SVC_DOWN.length});
    if(!items.length)items.push({t:'✅',txt:'一切正常',sub:'无待审内容 · 服务在线 · 负载平稳',key:'ok',n:0});
    renderNotif(items);
    var total=items.reduce(function(a,b){return a+(b.n||0);},0);
    if(NOTIF_SEEN.n==='reset'){items.forEach(function(it){if(it.key!=='ok')NOTIF_SEEN[it.key]=it.n||0;});delete NOTIF_SEEN.n;notifSaveSeen();}
    var unread=items.reduce(function(a,b){
      if(!b.key||b.key==='ok')return a;
      var seen=typeof NOTIF_SEEN[b.key]==='number'?NOTIF_SEEN[b.key]:0;
      return a+Math.max(0,(b.n||0)-seen);
    },0);
    var dot=document.getElementById('bellDot');
    if(dot){
      dot.style.display=unread>0?'block':'none';
      dot.textContent=unread>99?'99+':unread;
    }
    window._NOTIF_ITEMS=items;
    var newCount=items.reduce(function(a,b){
      if(!b.key||b.key==='ok')return a;
      var seen=typeof NOTIF_SEEN[b.key]==='number'?NOTIF_SEEN[b.key]:0;
      return a+Math.max(0,(b.n||0)-seen);
    },0);
    if(newCount>0&&newCount>(window._lastPush||0)&&document.hidden){
      var top=items.filter(function(x){return (x.n||0)>0;})[0];
      if(top)pushLocal('掌上小站 · '+top.txt,top.sub||'');
    }
    window._lastPush=newCount;
    if(manual&&!total)toast('没有新通知');
  });
}

export function renderNotif(items){
  var body=document.getElementById('notifBody');if(!body)return;
  body.innerHTML=items.map(function(it){
    var seenK=typeof NOTIF_SEEN[it.key]==='number'?NOTIF_SEEN[it.key]:0;
    var isNew=it.key&&it.key!=='ok'&&(it.n||0)>seenK;
    return '<div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:'+(it.act?'pointer':'default')+'" '+(it.act?('onclick="'+it.act+'"'):'')+'>'+
      '<div style="display:flex;gap:10px;align-items:flex-start">'+
      '<div class="crud-ic" style="font-size:15px">'+it.t+'</div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:700">'+esc(it.txt)+'</div>'+
      '<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">'+esc(it.sub||'')+'</div></div>'+
      (it.act?'<span class="arrow">›</span>':'')+'</div></div>';
  }).join('');
}

export function pushLocal(title,body){
  try{
    var C=window.Capacitor;
    if(C&&C.Plugins&&C.Plugins.LocalNotifications){
      C.Plugins.LocalNotifications.schedule({notifications:[{title:title,body:body||'',id:(Date.now()%2000000000)}]});
    }
  }catch(e){}
}

export function openNotif(){
  var items=window._NOTIF_ITEMS||[];
  items.forEach(function(it){if(it.key&&it.key!=='ok')NOTIF_SEEN[it.key]=it.n||0;});
  notifSaveSeen();
  var dot=document.getElementById('bellDot');if(dot)dot.style.display='none';
  openSub('pg-notif');
  notifCheck();
}

export const __exports__ = { openConn, connPaint, saveConn, testConn, connStatePaint, cfgCollect, cfgApply, cloudEnabled, toggleCloudSync, pushCloud, pullCloud, cloudPaint, autoPush, notifSaveSeen, notifCheck, renderNotif, pushLocal, openNotif };
