/** views/status —— 服务器状态页（S3）。验收: SITE-FR1；15s 轮询、断网显示 — */
/* 逐字迁移自 src/prototype.js（步骤 S3）；行为变更需走评审。 */
import { backBase } from '../data/http.js';

export function applySystemStatus(d){
  REAL_CACHE.uptimeDays=d.uptimeDays;
  REAL_CACHE.dbSizeMb=d.dbSizeMb;
  document.querySelectorAll('#scr-status .hero-stat').forEach(function(el,i){
    var v=el.querySelector('.num');
    if(!v)return;
    if(i===0)v.textContent=d.cpu+'%';
    if(i===1)v.textContent=d.memory+'%';
    if(i===2)v.textContent=d.disk+'%';
  });
  var warn=(d.cpu>=85);
  var greet=document.querySelector('#scr-status .hero-card .greet span');
  if(greet)greet.textContent=warn?'资源用量 · 高负载 ⚠':'资源用量 · 负载平稳';
  var dbRow=document.getElementById('svc-db');
  if(dbRow){
    dbRow.querySelector('.svc-lat').textContent=(d.dbSizeMb!=null?(d.dbSizeMb>=1?d.dbSizeMb.toFixed(1)+' MB':(d.dbSizeMb*1024).toFixed(0)+' KB'):'kirameku.db')+(d.dbOk===false?' · 读取失败':'');
    var dchip=dbRow.querySelector('.svc-chip');
    if(dchip){dchip.textContent=d.dbOk===false?'异常':'正常';dchip.className='chip '+(d.dbOk===false?'chip-draft':'chip-pub')+' svc-chip';}
  }
  var sub=document.querySelector('#scr-status .nav-sub');
  if(sub)sub.innerHTML='<span class="dot" style="background:'+(warn?'var(--orange)':'var(--green)')+'"></span>'+(warn?'高负载运行中 · CPU '+d.cpu+'%':'服务器运行正常')+' · 已持续运行 '+d.uptimeDays+' 天';
}

export function fetchSystemStatus(){
  fetch(API_BASE+'/api/system/status')
    .then(function(r){return r.json();})
    .then(function(j){if(j&&j.code===0)applySystemStatus(j.data);})
    .catch(function(){/* 后端未启动:保留演示值 */});
}

export function probeSvc(){
  SVC_DOWN=[];
  var isHttp=location.protocol==='http:';
  var gwRow=document.getElementById('svc-gw'),gwPort=document.querySelector('.port-chip[data-port=\"8787\"]');
  if(gwRow)gwRow.style.display=isHttp?'':'none';
  if(gwPort)gwPort.parentNode.style.display=isHttp?'':'none';
  var items=[
    {key:'front',url:frontBase()+'/',noCors:true},
    {key:'api',url:API_BASE+'/api/health'}
  ];
  if(isHttp)items.push({key:'gw',url:'http://localhost:8787/',noCors:true});
  items.forEach(function(it){
    var t0=performance.now();
    fetch(it.url,{mode:it.noCors?'no-cors':'cors',cache:'no-store'})
      .then(function(){var ms=Math.max(1,Math.round(performance.now()-t0));svcPaint(it.key,true,ms);})
      .catch(function(){svcPaint(it.key,false,0);});
  });
}

export function svcPaint(key,ok,ms){
  if(!ok)SVC_DOWN.push({front:'前台网站',api:'后端接口',gw:'App 代理'}[key]||key);
  var row=document.getElementById('svc-'+key);if(!row)return;
  row.querySelector('.svc-lat').textContent=ok?('响应 '+ms+'ms'):'无法连接';
  var chip=row.querySelector('.svc-chip');
  if(chip){chip.textContent=ok?'运行中':'离线';chip.className='chip '+(ok?'chip-pub':'chip-draft')+' svc-chip';chip.style.color=ok?'':'var(--red)';}
  var port=({front:'3000',api:'8000',gw:'8787'})[key];
  var pc=document.querySelector('.port-chip[data-port="'+port+'"]');
  if(pc){pc.textContent=ok?'开放':'关闭';pc.className='chip '+(ok?'chip-pub':'chip-draft')+' port-chip';pc.setAttribute('data-port',port);}
}

export function renderTrend(stats){
  var box=document.getElementById('trendCard');if(!box)return;
  function bars(rows,color){
    var seven=(rows||[]).slice(-7);
    var max=Math.max(1,seven.reduce(function(a,b){return Math.max(a,b.count||0);},0));
    return '<div style="display:flex;align-items:flex-end;gap:6px;height:56px">'+seven.map(function(r){
      var h=Math.round((r.count||0)/max*100);
      return '<div style="flex:1;text-align:center" title="'+r.date+' · '+r.count+'"><div style="height:'+Math.max(3,h)+'%;min-height:3px;background:'+color+';border-radius:6px 6px 3px 3px;opacity:.85"></div></div>';
    }).join('')+'</div>';
  }
  var pt=(stats.post_trend||[]).slice(-7),vt=(stats.visitor_trend||[]).slice(-7);
  var pSum=pt.reduce(function(a,b){return a+(b.count||0);},0);
  var vSum=vt.reduce(function(a,b){return a+(b.count||0);},0);
  box.innerHTML='<div style="font-size:12px;color:var(--ink-2);margin-bottom:6px">发文 <b style="color:var(--accent)">'+pSum+'</b> 篇 · 访客 <b style="color:var(--green)">'+vSum+'</b> 次</div>'+
    bars(pt,'linear-gradient(180deg,var(--accent),var(--accent2))')+
    '<div style="display:flex;gap:6px;margin:2px 0 8px">'+pt.map(function(r){return '<div style="flex:1;text-align:center;font-size:10px;color:var(--ink-3)">'+r.date.slice(5)+'</div>';}).join('')+'</div>'+
    '<div style="font-size:12px;color:var(--ink-2);margin-bottom:6px">访客趋势</div>'+
    bars(vt,'linear-gradient(180deg,#30D158,#00C7BE)');
}

export function openSvcMgr(){openSub('pg-svcmgr');svcMgrRender();}

export function svcMgrRender(){
  var body=document.getElementById('svcMgrBody');if(!body)return;
  body.innerHTML='<div class="card" style="padding:12px;font-size:12.5px;color:var(--ink-3)">探测中…</div>';
  probeSvc();
  jfetch(API_BASE+'/api/system/processes',{headers:authHeaders()}).then(function(r){
    var rows=unwrap(r)||[];
    body.innerHTML=rows.map(function(p){
      var meta=SVC_META[p.port]||{nm:p.name,url:'#',ic:'🖥️'};
      var on=p.listening;
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px">'+
        '<div style="display:flex;align-items:center;gap:10px">'+
        '<div class="crud-ic">'+meta.ic+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:600">'+esc(meta.nm)+'</div>'+
        '<div style="font-size:11.5px;color:var(--ink-3)">端口 '+p.port+' · '+(on?('PID '+p.pid+' · '+esc(p.proc||'')+' · '+p.memMb+' MB'):'未监听')+'</div>'+
        (on&&p.created?'<div style="font-size:11px;color:var(--ink-3)">启动于 '+p.created+' · CPU '+p.cpu+'%</div>':'')+
        '</div><span class="chip '+(on?'chip-pub':'chip-draft')+'">'+(on?'运行中':'离线')+'</span></div>'+
        '<div style="display:flex;gap:8px;margin-top:10px">'+
        '<button style="flex:1;padding:8px;border:none;border-radius:10px;background:var(--glass);color:var(--accent);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit" onclick="window.open(\''+meta.url+'\')">打开</button>'+
        '<button style="flex:1;padding:8px;border:none;border-radius:10px;background:var(--glass);color:var(--ink-2);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit" onclick="copySvcAddr(\''+meta.url+'\')">复制地址</button>'+
        (p.port===8000?'<button style="flex:1;padding:8px;border:none;border-radius:10px;background:var(--glass);color:var(--purple);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit" onclick="window.open(\'backBase()/docs\')">API 文档</button>':'')+
        '</div>'+
        (SVC_CTRL&&on&&(p.port===3000||p.port===8787)?'<div style="display:flex;gap:8px;margin-top:8px"><button style="flex:1;padding:8px;border:none;border-radius:10px;background:rgba(255,69,58,.10);color:var(--red);font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit" onclick="restartSvc('+p.port+')">⚠ 重启该服务</button><div style="flex:1.4;font-size:11px;color:var(--ink-3);align-self:center">终止进程并拉起 · 需数秒恢复</div></div>':'')+
        '</div>';
    }).join('')+
    '<div class="card" style="padding:10px 14px"><div style="font-size:11.5px;color:var(--ink-3);line-height:1.7">进程信息来自后端 psutil（需管理员登录）。重启功能需后端 .env 设置 ENABLE_SERVICE_CONTROL=true（当前'+(SVC_CTRL?'<b style="color:var(--green)">已启用</b>':'未启用')+'；后端自身 8000 出于自杀保护不支持 App 重启）。</div></div>'+
    '<div class="card" style="padding:10px 14px;margin-top:10px" id="bkInfoCard"><div style="font-size:12px;color:var(--ink-3)">备份信息加载中…</div></div>';
    jfetch(API_BASE+'/api/system/backup-info').then(function(r){
      var d=unwrap(r)||{};
      var el=document.getElementById('bkInfoCard');
      if(el)el.innerHTML='<div style="font-size:12.5px;font-weight:700;margin-bottom:3px">📦 自动备份</div><div style="font-size:11.5px;color:var(--ink-3)">'+(d.last?('每日 03:20 快照 · 最近 '+d.last.slice(5,16)+' · 已保留 '+d.count+' 份'):'尚未生成（首次快照在每日 03:20）')+' · <span style="color:var(--accent);cursor:pointer" onclick="backupDb()">手动下载</span></div>';
    }).catch(function(){});
  }).catch(function(e){
    body.innerHTML=emptyCard('⚠️ '+(e&&e.message||'加载失败'));
  });
}

export function restartSvc(port){
  askConfirm('重启端口 '+port+' 的服务？正在处理的请求会中断，服务需数秒恢复。').then(function(ok){
    if(!ok)return;
    toast('重启指令已发送…');
    jfetch(API_BASE+'/api/system/services/restart',{method:'POST',body:JSON.stringify({port:port})})
      .then(function(r){toast(unwrap(r).message||'已执行');})
      .catch(function(e){toastErr(e);});
    var tries=0;
    var poll=function(){
      tries++;
      jfetch(API_BASE+'/api/system/processes',{headers:authHeaders()}).then(function(r){
        var rows=unwrap(r)||[];
        var row=rows.find(function(x){return x.port===port;});
        if(row&&row.listening){toast('✓ 端口 '+port+' 已恢复在线');if(document.getElementById('pg-svcmgr').classList.contains('show'))svcMgrRender();}
        else if(tries<20)setTimeout(poll,3000);
        else toast('⚠️ 60 秒内未恢复，请到服务器查看进程');
      }).catch(function(){if(tries<20)setTimeout(poll,3000);});
    };
    setTimeout(poll,4000);
  });
}

export function copySvcAddr(u){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(function(){toast('已复制 '+u);}).catch(function(){toast(u);});}
  else toast(u);
}

export const __exports__ = { applySystemStatus, fetchSystemStatus, probeSvc, svcPaint, renderTrend, openSvcMgr, svcMgrRender, restartSvc, copySvcAddr };
