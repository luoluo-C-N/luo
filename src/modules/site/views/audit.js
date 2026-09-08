/** views/audit —— 审核收件箱（S4）。验收: SITE-FR4；三类+子级内联；pending 变化经 PEND 共享 */
/* 逐字迁移自 src/prototype.js（步骤 S4）；行为变更需走评审。 */
import { backBase } from '../data/http.js';

export function refreshAudit(){
  if(!AUTH.token)return;
  var h=authHeaders();
  Promise.all([
    fetch(backBase()+"/api/comments/admin?status=pending&size=20",{headers:h}).then(function(r){if(r.status===401)throw new Error("auth");return r.json();}),
    fetch(backBase()+"/api/messages/admin?status=pending&size=20",{headers:h}).then(function(r){if(r.status===401)throw new Error("auth");return r.json();})
  ]).then(function(rs){
    renderRealAudit("cmt",rs[0]);
    renderRealAudit("msg",rs[1]);
  }).catch(function(){/* 后端未启动:保留演示卡 */});
}

export function auditCard(kind,item){
  var gu=item.github_user||{};
  var who=gu.nickname||gu.username||("访客"+String(item.ip||"").slice(0,12));
  var time=String(item.created_at||"").replace("T"," ").slice(5,16);
  var card=document.createElement("div");card.className="audit-real";
  card.style.cssText="border-radius:16px;border:1px solid var(--glass-border);background:var(--glass);padding:12px 14px;margin-bottom:10px";
    var kids=(item.replies||[]).filter(function(r){return r.status!=='approved';});
    var kidHtml=kids.map(function(r){
      var rwho=r.github_user?(r.github_user.login||'访客'):('访客'+String(r.ip||'').slice(0,8));
      return '<div style="margin-top:8px;padding:8px 10px;border-left:2px solid var(--accent);background:var(--glass);border-radius:0 10px 10px 0" data-kidbox="'+r.id+'">'+
        '<div style="font-size:11px;color:var(--ink-3)">↳ 回复 · '+(r.status==='pending'?'<span style="color:var(--orange);font-weight:700">待审</span>':'已拒')+' · '+esc(rwho)+'</div>'+
        '<div style="font-size:13px;margin-top:3px">'+esc(r.content||'')+'</div>'+
        '<div style="display:flex;gap:6px;margin-top:6px">'+
        '<button style="flex:1;padding:6px;border:none;border-radius:8px;background:rgba(48,209,88,.15);color:var(--green);font-weight:700;font-size:12px;cursor:pointer;font-family:inherit" data-kid="'+r.id+'" data-kact="approved">✓ 通过</button>'+
        '<button style="flex:1;padding:6px;border:none;border-radius:8px;background:rgba(255,69,58,.12);color:var(--red);font-weight:700;font-size:12px;cursor:pointer;font-family:inherit" data-kid="'+r.id+'" data-kact="rejected">✕ 拒绝</button></div></div>';
    }).join('');
    card.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
    '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#64D2FF,var(--accent));color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:14px">'+who.slice(0,1)+'</div>'+
    '<div><div style="font-size:13.5px;font-weight:700">'+esc(who)+'</div><div style="font-size:11px;color:var(--ink-3)">'+esc(String(item.created_at||"").replace("T"," ").slice(5,16))+'</div></div></div>'+
    '<div style="font-size:13.5px;line-height:1.6;color:var(--ink);margin-bottom:10px">'+esc(item.content||"")+'</div>'+kidHtml+
    '<div style="display:flex;gap:8px"><button style="flex:1;padding:8px;border:none;border-radius:10px;background:rgba(48,209,88,.15);color:var(--green);font-weight:700;font-size:13px;cursor:pointer;font-family:inherit" data-act="approved">✓ 通过</button>'+
    '<button style="flex:1;padding:8px;border:none;border-radius:10px;background:rgba(255,69,58,.12);color:var(--red);font-weight:700;font-size:13px;cursor:pointer;font-family:inherit" data-act="rejected">✕ 拒绝</button></div>';
  card.querySelectorAll('[data-act]').forEach(function(b){
    b.addEventListener('click',function(){auditAct(kind,item.id,b.dataset.act,card);});
  });
  card.querySelectorAll('[data-kid]').forEach(function(b){
    b.addEventListener('click',function(){
      var box=card.querySelector('[data-kidbox="'+b.dataset.kid+'"]');
      auditAct(kind,+b.dataset.kid,b.dataset.kact,box||card);
    });
  });
  return card;
}

export function renderRealAudit(kind,rows){
  var pane=document.getElementById(AUDIT_MAP[kind]);if(!pane)return;
  if(kind==='cmt'){PEND.cmt=rows?rows.length:0;cnt('n-cmt',PEND.cmt);}
  else if(kind==='msg'){PEND.msg=rows?rows.length:0;cnt('n-msg',PEND.msg);}
  else{PEND.cht=rows?rows.length:0;cnt('n-cht',PEND.cht);}
  heroPend();
  if(!rows){pane.innerHTML='';return;}
  if(!rows.length){
    pane.innerHTML='<div class="mod-err" style="background:var(--glass);border-color:var(--glass-border);color:var(--ink-3);font-weight:600">暂无待审内容 · 真实数据(后端已连接)</div>';
    return;
  }
  pane.innerHTML='';
  rows.forEach(function(item){pane.appendChild(auditCard(kind,item));});
}

export function auditAct(kind,id,status,card){
  var url=kind==="cmt"
    ?backBase()+"/api/comments/"+id+"/status"
    :backBase()+"/api/messages/"+id+"/status";
  fetch(url,{method:"PUT",headers:Object.assign({"Content-Type":"application/json"},authHeaders()),
    body:JSON.stringify({status:status})})
    .then(function(r){if(!r.ok)throw new Error("fail");return r.json();})
    .then(function(){
      card.style.opacity="";
      card.querySelectorAll("button").forEach(function(b){b.remove();});
      var ok=document.createElement("div");
      ok.style.cssText="text-align:center;font-size:12px;font-weight:700;color:"+(status==="approved"?"var(--green)":"var(--red)");
      ok.textContent=status==="approved"?"✓ 已通过并同步到网站":"✕ 已拒绝";
      var undo=document.createElement("button");
      undo.style.cssText="margin-left:10px;padding:2px 10px;border:none;border-radius:8px;background:var(--glass);color:var(--accent);font-weight:700;font-size:11.5px;cursor:pointer;font-family:inherit";
      undo.textContent="↺ 撤销";
      ok.appendChild(undo);
      card.appendChild(ok);
      toast(status==="approved"?"已通过并同步到网站":"已拒绝");
      var timer=setTimeout(function(){if(undo.parentNode)undo.remove();},5000);
      undo.onclick=function(){
        clearTimeout(timer);
        if(undo.parentNode)undo.remove();
        var path={cmt:'comments',msg:'messages',cht:'chatters/comments'}[kind]||'comments';
        jfetch(API_BASE+'/api/'+path+'/'+id+'/status',{method:'PUT',body:JSON.stringify({status:'pending'})})
          .then(function(){toast('已撤销，回到待审');setTimeout(refreshAudit,300);})
          .catch(toastErr);
      };
      setTimeout(refreshAudit,5300);
    })
    .catch(function(){toast("操作失败,请重试");});
}

export function auditDel(kind,id,btn){
  askConfirm('彻底删除这条记录？数据库中移除，不可恢复').then(function(ok){
    if(!ok)return;
    var path={cmt:'comments',msg:'messages',cht:'chatters/comments'}[kind]||'comments';
    jfetch(API_BASE+'/api/'+path+'/'+id,{method:'DELETE'}).then(function(){
      var card=btn.closest('.review-card');
      if(card)card.remove();
      toast('已彻底删除');
    }).catch(toastErr);
  });
}

export function renderDone(rows){
  var pane=document.getElementById('pane-review-done');if(!pane)return;
  if(!rows.length){pane.innerHTML='<div class="mod-err" style="background:var(--glass);border-color:var(--glass-border);color:var(--ink-3);font-weight:600">还没有处理记录</div>';return;}
  pane.innerHTML='';
  rows.forEach(function(item){
    var gu=item.github_user||{};
    var who=gu.login||gu.nickname||('访客'+String(item.ip||'').slice(0,10));
    var ok=item.status==='approved';
    var el=document.createElement('div');
    el.className='card review-card '+(ok?'done-ok':'done-no');
    el.innerHTML='<div class="rv-head"><div class="icon-circle" style="width:34px;height:34px;font-size:14px;background:'+(ok?'rgba(48,209,88,.14)':'rgba(255,69,58,.10)')+'">'+item._ic+'</div>'+
      '<div><div class="rv-name" style="font-size:13px">'+esc(who)+'</div><div class="rv-time">'+fdate(item.created_at)+'</div></div>'+
      '<span class="chip '+(ok?'chip-pub':'chip-draft')+'" style="margin-left:auto">'+(ok?'✓ 已通过':'✕ 已拒绝')+'</span>'+
      '<span class="crud-act" title="彻底删除" style="color:var(--red)" onclick="auditDel(&#39;'+item._kind+'&#39;,'+item.id+',this)">🗑</span></div>'+
      '<div class="rv-body" style="font-size:13px;color:var(--ink-2)">'+esc(String(item.content||'').slice(0,80))+'</div>'+
      '<div class="rv-src">'+item._src+' · '+fdate(item.updated_at||item.created_at)+'</div>';
    pane.appendChild(el);
  });
}

export const __exports__ = { refreshAudit, auditCard, renderRealAudit, auditAct, auditDel, renderDone };
