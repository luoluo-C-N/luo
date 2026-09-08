import {$,escape,message,button} from './ui.js';
export function setupDashboard(pocket){
 const home=$('#scr-home');const title=home.querySelector('.page-head');home.replaceChildren(title);const view=document.createElement('div');home.append(view);
 const status=$('#scr-status');$('#card-svc').innerHTML='<div class="pocket-state">正在检查 API 服务…</div>';
 $('#card-ports').innerHTML='<div class="pocket-state">当前接口未提供端口检测数据。</div>';
 $('#sec-net').nextElementSibling.innerHTML='<div class="pocket-state">当前接口未提供流量与防火墙数据。</div>';
 const state={};pocket.live=state;
 for(const [key,field]of Object.entries(window.FIELDS||{}))field.get=()=>state[key]??'--';
 window.fetchSystemStatus=async()=>{
  const sub=status.querySelector('.nav-sub');
  try{const d=await pocket.api.request('/api/system/status');window.applySystemStatus(d);state.cpu=d.cpu;state.mem=d.memory;state.disk=d.disk;sub.textContent=`实时数据 · ${new Date().toLocaleTimeString()} · 每 15 秒刷新`;$('#card-svc').innerHTML=`<div class="svc-row"><div class="icon-circle">⚙️</div><div class="pocket-grow">FastAPI 服务<div class="pocket-meta">${escape(pocket.base()||'同源连接')} · 已收到响应</div></div><span class="chip chip-pub">在线</span></div>`;}
  catch(e){status.querySelectorAll('.hero-stat .num').forEach(n=>n.textContent='--');sub.textContent=`未连接 · ${e.message}`;$('#card-svc').innerHTML='<div class="pocket-state pocket-error">无法获取实时数据</div>';$('#card-svc').append(button('重试',window.fetchSystemStatus));}
 };
 async function load(){message(view,'正在读取站点统计…');try{const d=await pocket.api.request('/api/dashboard/stats');state.posts=d.counts.posts;view.innerHTML=`<div class="nav-sub">来自站点数据库 · ${new Date().toLocaleTimeString()}</div><div class="pocket-stat-grid">${[['已发布',d.counts.posts],['草稿',d.counts.drafts],['访客记录',d.counts.visitors],['评论',d.counts.comments],['留言',d.counts.messages],['分类',d.counts.categories]].map(([k,v])=>`<div class="card"><div class="pocket-stat-value">${v??'--'}</div><div class="pocket-meta">${k}</div></div>`).join('')}</div><div class="section-title" id="sec-todo">快捷管理</div><div id="dash-actions" class="pocket-toolbar"></div><div class="section-title">最近访客趋势</div><div class="card"><div class="pocket-meta">按接口返回日期统计，非实时在线人数</div><div class="pocket-bars">${d.visitor_trend.slice(-7).map(v=>`<div><span>${v.count}</span><i style="height:${Math.max(3,v.count/Math.max(1,...d.visitor_trend.slice(-7).map(t=>t.count))*70)}px"></i>${escape(v.date.slice(5))}</div>`).join('')}</div></div>`;$('#dash-actions').append(button('写文章',()=>window.openEditor()),button('待审核',()=>window.jumpTab('scr-review')),button('刷新',load));}catch(e){message(view,e.message,true);view.append(button('重试',load));}}
 return {load};
}
