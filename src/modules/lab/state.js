/** modules/lab/state —— 共享状态单一声明（T4.8，逐字迁自 prototype.js）
 * 视图函数经全局过渡层以裸标识符读写（globalThis 属性），此处为唯一初始化点。 */

var TEMPLATES=[
  {t:'stat',   name:'数值卡',  ds:'名称+大数字+单位', icon:'🔢'},
  {t:'progress',name:'进度卡', ds:'名称+进度条+百分比',icon:'📊'},
  {t:'status', name:'状态行',  ds:'名称+状态点+描述', icon:'🟢'},
  {t:'toggle', name:'开关卡',  ds:'名称+开关状态',    icon:'🎚️'},
  {t:'list',   name:'列表卡',  ds:'标题+多行 名称|值',icon:'📋'},
  {t:'chart',  name:'迷你图表',ds:'名称+柱状图',      icon:'📈'},
  {t:'dynlist',name:'动态列表',ds:'最新评论/文章等实时流',icon:'🗞️'}
];

var FIELDS={
  cpu:{name:'CPU 占用',unit:'%',get:function(){return 15+Math.round(Math.random()*40);}},
  mem:{name:'内存占用',unit:'%',get:function(){return 45+Math.round(Math.random()*30);}},
  disk:{name:'磁盘占用',unit:'%',get:function(){return 47;}},
  visitors:{name:'今日访客',unit:'人',get:function(){return 100+Math.round(Math.random()*80);}},
  pv:{name:'今日浏览',unit:'',get:function(){return 400+Math.round(Math.random()*300);}},
  comments:{name:'待审评论',unit:'条',get:function(){return Math.round(Math.random()*4);}},
  posts:{name:'文章总数',unit:'篇',get:function(){return 4;}},
  study:{name:'今日学习',unit:'分钟',get:function(){return 120+Math.round(Math.random()*90);}},
  uptime:{name:'运行天数',unit:'天',get:function(){return 0;},real:'uptime'},
  pendingAll:{name:'待审总数',unit:'条',get:function(){return (PEND.cmt||0)+(PEND.msg||0)+(PEND.cht||0);},real:'pending'},
  dbSize:{name:'数据库大小',unit:'MB',get:function(){return 0;},real:'db'}
};

var DYN_SOURCES={
  latestComments:{name:'最新待审评论',fetch:function(){
    return jfetch(API_BASE+'/api/comments/admin?status=pending&size=4',{headers:authHeaders()}).then(unwrap).then(function(rows){
      return (rows||[]).map(function(x){return {t:(x.github_user?(x.github_user.login||'访客'):('访客'+String(x.ip||'').slice(0,8))),s:String(x.content||'').slice(0,40)};});
    });
  }},
  latestPosts:{name:'最近文章',fetch:function(){
    return jfetch(API_BASE+'/api/posts?size=4').then(unwrap).then(function(rows){
      return (rows||[]).map(function(x){return {t:x.title,s:(x.status==='published'?'已发布':'草稿')+' · 👁 '+(x.views||0)};});
    });
  }}
};

var PRESETS=[
 {k:'latestComments',name:'最新评论',ic:'💬',ds:'待审评论实时流，点击进审核',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'最新评论',icon:'💬',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:60,bind:'none',api:{url:'',path:''},
   code:{html:'<div class="hd">💬 最新评论</div><div id="rows"><div class="empty">加载中…</div></div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:6px}.row{padding:7px 0;border-bottom:1px solid rgba(0,0,0,.05)}.row b{font-size:12px;color:#1c1c1e}.row div{font-size:11.5px;color:#8a8f99;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.empty{font-size:12px;color:#8a8f99}',
   js:'host.api("/api/comments/admin?status=pending&size=3").then(function(rows){var el=document.getElementById("rows");if(!(rows||[]).length){el.innerHTML=\'<div class="empty">暂无待审评论 🎉</div>\';return;}el.innerHTML=rows.map(function(x){var who=x.github_user?(x.github_user.login||"访客"):("访客"+String(x.ip||"").slice(0,8));return \'<div class="row"><b>\'+who+\'</b><div>\'+String(x.content||"").slice(0,42)+\'</div></div>\';}).join("");}).catch(function(e){document.getElementById("rows").innerHTML=\'<div class="empty">\'+e.message+\'</div>\';});'}};}},
 {k:'latestPosts',name:'最近文章',ic:'📝',ds:'最新文章列表，点击进编辑',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'最近文章',icon:'📝',size:'full',w:'f',hc:'s',sec:'',enabled:true,panel:panel,refresh:120,bind:'none',api:{url:'',path:''},
   code:{html:'<div class="hd">📝 最近文章</div><div id="rows"><div class="empty">加载中…</div></div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:6px}.row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05)}.t{flex:1;font-size:13px;font-weight:600;color:#1c1c1e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.m{font-size:11px;color:#8a8f99}.empty{font-size:12px;color:#8a8f99}',
   js:'host.api("/api/posts?size=4").then(function(rows){var el=document.getElementById("rows");if(!(rows||[]).length){el.innerHTML=\'<div class="empty">还没有文章</div>\';return;}el.innerHTML=rows.map(function(x){return \'<div class="row"><div class="t">\'+x.title+\'</div><div class="m">\'+(x.status==="published"?"👁 "+(x.views||0):(x.status==="draft"?"草稿":x.status))+\'</div></div>\';}).join("");}).catch(function(e){document.getElementById("rows").innerHTML=\'<div class="empty">\'+e.message+\'</div>\';});'}};}},
 {k:'uptime',name:'运行天数',ic:'⏱️',ds:'服务器持续运行天数',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'tpl',type:'stat',name:'站点运行',icon:'⏱️',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:0,data:{source:'uptime'},unit:'天',rows:'',bind:'none',api:{url:'',path:''}};}},
 {k:'pendingAll',name:'待办速览',ic:'📥',ds:'三类待审合计，点击进审核',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'tpl',type:'stat',name:'待办速览',icon:'📥',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:0,data:{source:'pendingAll'},unit:'条',rows:'',bind:'none',api:{url:'',path:''}};}},
 {k:'music',name:'音乐点播',ic:'🎵',ds:'站点曲库第一首，即点即播',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'音乐点播',icon:'🎵',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:300,bind:'none',api:{url:'',path:''},
   code:{html:'<div id="box"><div class="hd">🎵 站点音乐</div><div class="empty">加载中…</div></div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:8px}.t{font-size:14px;font-weight:700;color:#1c1c1e}.a{font-size:11.5px;color:#8a8f99;margin-top:2px}.play{margin-top:10px;width:100%;padding:9px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}.empty{font-size:12px;color:#8a8f99}',
   js:'host.api("/api/music").then(function(d){var list=(d&&d.data)||[];if(!list.length){document.getElementById("box").innerHTML+=\'<div class="empty">曲库为空</div>\';return;}var t=list[0];var b=document.createElement("button");b.className="play";b.textContent="▶ 播放 · "+t.title;var playing=false;b.onclick=function(){playing=!playing;b.textContent=(playing?"⏸ 暂停 · ":"▶ 播放 · ")+t.title;host.play(playing?t.url:"");};document.getElementById("box").appendChild(b);}).catch(function(e){document.getElementById("box").innerHTML+=\'<div class="empty">\'+e.message+\'</div>\';});'}};}},
 {k:'backup',name:'备份状态',ic:'📦',ds:'自动备份最近时间与份数',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'备份状态',icon:'📦',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:600,bind:'none',api:{url:'',path:''},
   code:{html:'<div class="hd">📦 自动备份</div><div id="v" class="big">…</div><div id="s" class="sub">加载中…</div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:6px}.big{font-size:22px;font-weight:800;color:#1c1c1e}.sub{font-size:11.5px;color:#8a8f99;margin-top:3px}',
   js:'host.api("/api/system/backup-info").then(function(d){document.getElementById("v").textContent=(d.count||0)+" 份";document.getElementById("s").textContent=d.last?("最近 "+d.last.slice(5,16)+" · 每日 03:20"):"尚未生成 · 每日 03:20";}).catch(function(e){document.getElementById("s").textContent=e.message;});'}};}},
 {k:'anniversary',name:'上线纪念日',ic:'🎂',ds:'第一篇文章至今的天数',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'上线纪念日',icon:'🎂',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:0,bind:'none',api:{url:'',path:''},
   code:{html:'<div class="hd">🎂 已陪伴你</div><div id="v" class="big">…</div><div class="sub">从第一篇文章开始</div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:6px}.big{font-size:26px;font-weight:800;color:#1c1c1e}.big small{font-size:12px;color:#8a8f99;font-weight:600}.sub{font-size:11.5px;color:#8a8f99;margin-top:3px}',
   js:'host.api("/api/posts?size=200").then(function(rows){var min=null;(rows||[]).forEach(function(x){if(x.created_at&&(!min||x.created_at<min))min=x.created_at;});var el=document.getElementById("v");if(!min){el.textContent="—";return;}var days=Math.max(1,Math.ceil((Date.now()-new Date(min).getTime())/86400000));el.innerHTML=days+\' <small>天</small>\';}).catch(function(e){document.getElementById("v").textContent="—";});'}};}},
 {k:'note',name:'本地便签',ic:'🗒️',ds:'写给自己的一句话（存本机）',
  make:function(panel){return {id:'m'+Date.now()+Math.floor(Math.random()*999),mode:'code',type:'code',name:'本地便签',icon:'🗒️',size:'half',w:'h',hc:'s',sec:'',enabled:true,panel:panel,refresh:0,bind:'none',api:{url:'',path:''},
   code:{html:'<div class="hd">🗒️ 便签</div><textarea id="ta" placeholder="写给自己的一句话…"></textarea><button id="sv">保存</button><div id="st"></div>',
   css:'body{padding:12px;font-family:-apple-system,"PingFang SC",sans-serif}.hd{font-size:11.5px;font-weight:700;color:#8a8f99;margin-bottom:6px}textarea{width:100%;height:64px;border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:8px;font-family:inherit;font-size:12.5px;resize:none;box-sizing:border-box;background:rgba(255,255,255,.5);outline:none}button{margin-top:6px;width:100%;padding:8px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit}#st{font-size:11px;color:#30D158;margin-top:4px;height:14px}',
   js:'host.storage("mynote").then(function(v){document.getElementById("ta").value=v||"";});document.getElementById("sv").onclick=function(){var v=document.getElementById("ta").value;host.storage("mynote",v).then(function(){document.getElementById("st").textContent="已保存 ✓";setTimeout(function(){document.getElementById("st").textContent="";},1500);});};'}};}}
];

var customModules=[];

var modTimers={};

var REAL_CACHE={};

var PANEL_SECTIONS={};

var presetPanel=null;

var edDraft=null,edTab='html',edCM=null;

var PRESET_LAYOUTS={
  monitor:{name:'监控优先',mods:[
    {libk:'pendingAll'},{libk:'uptime',w:'h'},{libk:'backup',w:'h'},
    {tpl:{type:'progress',name:'CPU 占用',icon:'🔥',data:{source:'cpu'},unit:'%'}},
    {tpl:{type:'progress',name:'内存占用',icon:'🧠',data:{source:'mem'},unit:'%'}},
    {tpl:{type:'progress',name:'磁盘占用',icon:'💾',data:{source:'disk'},unit:'%'}}
  ]},
  content:{name:'内容优先',mods:[
    {libk:'latestPosts'},{libk:'latestComments'},{libk:'pendingAll'},{libk:'music'}
  ]},
  minimal:{name:'极简',mods:[
    {libk:'uptime'},{libk:'pendingAll'}
  ]}
};

var DRAG=null;

export const __exports__ = { TEMPLATES, FIELDS, DYN_SOURCES, PRESETS, customModules, modTimers, REAL_CACHE, PANEL_SECTIONS, presetPanel, edDraft, edTab, edCM, PRESET_LAYOUTS, DRAG };
