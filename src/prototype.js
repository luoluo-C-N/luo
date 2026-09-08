/* ============================================================
 * ⚠️ 冻结文件（2026-09-08，S7 完成后状态）
 * 本文件剩余内容仅为：
 *   1. lab（自编译模块平台）的共享状态 var 与启动期初始化（函数已全部迁至 modules/lab/）
 *   2. 共享状态 var 声明 —— 迁移期由各视图模块经全局作用域读写（v0.03+ 状态重构另立任务）
 *   3. 启动期 IIFE 与顶层初始化（含 doLogin/renderRealAudit 历史包装，行为已等价内联）
 * 禁止在此添加任何新业务逻辑（架构设计-v1.0.md §14.6）。
 * 已迁出功能见 src/modules/site/（迁移记录: docs/plans/site-migration.md）。
 * ============================================================ */

/* Tab 切换 */
document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
    document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active')});
    t.classList.add('active');
    var s=document.getElementById(t.dataset.scr);s.classList.add('active');s.scrollTop=0;
  });
});
/* 分段切换：scope = seg-content / seg-review */
/* iOS 开关 */
/* 审核 */
/* 子页 */
var SUB_TOP=52;

/* 快速操作面板(右上角 + 触发) */
/* ============ 侧边栏:屏幕左缘右滑打开,跟手丝滑开合(方案 C 全套景深) ============ */
var drawerEl=document.getElementById('drawer'),maskEl=document.getElementById('drawerMask');
var pageEl=document.querySelector('.screens'),phoneEl=document.querySelector('.phone');
var DW=292,dProgress=0;
var subDrag=null;
document.querySelector('.phone').addEventListener('pointerdown',function(e){
  /* 展开卡片:点到别处自动恢复 */
  if(openRow && !openRow.contains(e.target)){openRow._close();openRow.classList.remove('open');openRow=null}
  var r=this.getBoundingClientRect();
  var inLeftZone=(e.clientX-r.left)<56;
  /* 子页打开:左缘右滑=关闭子页返回(不碰侧边栏) */
  var subs=document.querySelectorAll('.subpage.show');
  var sub=subs[subs.length-1];
  if(sub){
    if(inLeftZone){subDrag={el:sub,x0:e.clientX};}
    return;
  }
});
document.querySelector('.phone').addEventListener('pointermove',function(e){
  if(subDrag){
    var dx=Math.max(0,e.clientX-subDrag.x0);
    subDrag.el.style.transition='none';
    subDrag.el.style.transform='translateX('+dx+'px)';
    subDrag.el.style.opacity=String(Math.max(.15,1-dx/420));
    return;
  }
});
document.querySelector('.phone').addEventListener('pointerup',function(e){
  if(subDrag){
    var el=subDrag.el,dx=e.clientX-subDrag.x0;subDrag=null;
    if(dx>70){closeSub(el.id);}
    else{
      el.style.transition='transform .3s var(--ease-item),opacity .25s ease';
      el.style.transform='';el.style.opacity='';
      setTimeout(function(){el.style.transition='';el.style.opacity='';},320);
    }
    return;
  }
});

/* ============ 多面板工作台:面板卡片左滑渐变出操作 ============ */
var panels={
  site:{name:'网站',icon:'🌐',bg:'linear-gradient(135deg,var(--accent),var(--accent2))',def:'scr-status',enabled:true,closed:false,pinned:false},
};
/* 置顶持久化:下次打开软件,优先打开置顶的面板 */
try{var savedPins=JSON.parse(localStorage.getItem('panelPins')||'[]');savedPins.forEach(function(k){if(panels[k])panels[k].pinned=true;});}catch(e){}
/* 自定义面板持久化 */
try{var savedCP=JSON.parse(localStorage.getItem('customPanels')||'[]');savedCP.forEach(function(c){panels[c.key]={name:c.name,icon:c.icon,bg:c.bg,def:'scr-'+c.key,enabled:true,closed:false,pinned:false,custom:true};});}catch(e){}
/* 面板皮肤(图标/配色)覆盖层,All 面板可用 */
var PANEL_COLORS=[
  'linear-gradient(135deg,var(--accent),var(--accent2))',
  'linear-gradient(135deg,#30D158,#00C7BE)',
  'linear-gradient(135deg,#BF5AF2,#FF375F)',
  'linear-gradient(135deg,#FF9F0A,#FF453A)',
  'linear-gradient(135deg,#64D2FF,var(--accent))',
  'linear-gradient(135deg,#FFD60A,#FF9F0A)',
  'linear-gradient(135deg,#F5A8BC,#C9A3F5)',
  'linear-gradient(135deg,#8E8E93,#48484A)'
];
var panelSkins={};
try{panelSkins=JSON.parse(localStorage.getItem('panelSkins')||'{}');}catch(e){panelSkins={}}
Object.keys(panelSkins).forEach(function(k){
  if(panels[k]){if(panelSkins[k].icon)panels[k].icon=panelSkins[k].icon;if(panelSkins[k].bg)panels[k].bg=panelSkins[k].bg;}
});
/* 面板顺序持久化(拖动排序结果) */
var panelOrder=[];
try{panelOrder=JSON.parse(localStorage.getItem('panelOrder')||'[]');}catch(e){panelOrder=[]}
var curPanel='site',ACT=170,openRow=null;
renderPanels();
/* 自定义面板的屏也在启动时生成(若被持久化过) */
Object.keys(panels).filter(function(k){return panels[k].custom;}).forEach(function(k){
  ensureCustomScreen(k,panels[k].name,panels[k].icon);
});
/* 启动时:优先打开置顶的面板;无置顶则优先「网站」,不可用则取第一个可用面板 */
bootDefaultPanel();

/* ============ 壁纸系统:预设 + 自由上传图片,选择持久化 ============ */
var wallpapers={
  aurora:{name:'极光 · 默认',bg:'#EAF0FA',blobs:['#7EB6F7','#C9A3F5','#F5A8BC','#9BDCF5','#F7CE9E']},
  violet:{name:'暮紫',bg:'#F1ECFA',blobs:['#B79CF0','#8F7CE8','#E8A8D8','#A8C4F5','#D9C2F2']},
  ocean:{name:'海盐',bg:'#E7F2FB',blobs:['#6FB4F5','#7EC8F0','#5E8FE8','#9BDCF5','#BFE3F7']},
  peach:{name:'蜜桃',bg:'#FBF1EC',blobs:['#F5A8BC','#F7CE9E','#F090A8','#FFD8C4','#E8B4D8']},
  mint:{name:'薄荷',bg:'#EBFAF3',blobs:['#7EE8C8','#63D2A8','#9BDCF5','#C8F0D8','#58C8B0']},
  sakura:{name:'樱雪',bg:'#FBEFF4',blobs:['#F8C8D8','#E8A8C8','#F5D8E8','#C8A8E8','#F0C0D0']},
  /* 用户上传的自定义壁纸 */
  guitar:{name:'吉他少女',img:'wallpapers/guitar.png',custom:true}
};
var customWalls=[];
try{customWalls=JSON.parse(localStorage.getItem('customWalls')||'[]');}catch(e){customWalls=[]}
customWalls.forEach(function(c){wallpapers[c.key]={name:c.name,img:c.img,custom:true,deletable:true};});
var curWall='aurora';
try{var savedWall=localStorage.getItem('wallpaper');if(savedWall&&wallpapers[savedWall])curWall=savedWall;}catch(e){}

/* 壁纸层的模糊度与纱度(实时可调) */
var wallT={blur:0,veil:14};
try{var savedWT=JSON.parse(localStorage.getItem('wallTuning')||'null');if(savedWT&&typeof savedWT.blur==='number')wallT=savedWT;}catch(e){}

/* 拖滑杆 → 壁纸页自动淡出实时预览;松手/停下 → 自动淡回 */
var previewTimer=null,previewPage='pg-wallpaper';

applyWallpaper(curWall);
applyWallTuning();

/* ============ 原型音乐段:接 Kirameku 后端(真实列表/上传/播放/删除) ============ */
var MUSIC_ROWS=[];
var protoAudioEl=null;
fetchProtoMusic();

/* 壁纸/玻璃滑杆接线:拖动即实时预览(壁纸页自动淡出),松手自动回到本页 */
(function(){
  function wire(id,onInput){
    var el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('input',function(){onInput(+this.value);dragPreview();});
    el.addEventListener('change',function(){onInput(+this.value);endPreviewNow();});
  }
  wire('slWallBlur',function(v){wallT.blur=v;applyWallTuning();saveWallTuning();});
  wire('slWallVeil',function(v){wallT.veil=v;applyWallTuning();saveWallTuning();});
  applyWallTuning();
  syncWallSliders();
})();

/* ============ 自编译模块系统 ============ */
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
/* 动态列表源(dynlist):返回 [{t,s,url?}] */
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
/* ---------- 模块库:8 个预置模块 ---------- */
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
try{customModules=JSON.parse(localStorage.getItem('customModules')||'[]');}catch(e){customModules=[]}
customModules.forEach(function(m){if(!m.panel)m.panel='site';});
var modTimers={};
/* esc/escAttr 已迁至 modules/site/data/format.js（S2），经全局过渡层提供 */
var REAL_CACHE={};

/* 模块消息分发:高度自适应/刷新/API 代理/存储/导航 */
window.addEventListener('message',function(e){
  var d=e.data||{};
  if(!d.__mod)return;
  var wrap=document.querySelector('[data-mid="'+d.id+'"]');
  if(d.__mod==='height'&&wrap){
    var f=wrap.querySelector('iframe');
    if(f)f.style.height=Math.max(46,Math.min(600,d.h))+'px';
    return;
  }
  if(d.__mod==='refresh'){
    var m=null;for(var i=0;i<customModules.length;i++){if(customModules[i].id===d.id){m=customModules[i];break;}}
    if(m){var g=wrap?wrap.parentNode:null;if(g){if(m.type==='code')renderCodeModule(m,g);else renderTplModule(m,g);}}
    return;
  }
  if(d.__mod==='nav'&&d.scr){jumpTab(d.scr);return;}
  if(d.__mod==='open'&&d.url){window.open(d.url);return;}
  if(d.__mod==='play'&&d.url){protoPlay(d.url);return;}
  if(d.__mod==='api'||d.__mod==='storage'){
    var rid=d.rid;
    if(d.__mod==='api'){
      jfetch(backBase()+d.path,d.opts).then(function(data){
        var f=wrap&&wrap.querySelector('iframe');
        if(f)f.contentWindow.postMessage({__modres:true,rid:rid,data:data},'*');
      }).catch(function(err){
        var f=wrap&&wrap.querySelector('iframe');
        if(f)f.contentWindow.postMessage({__modres:true,rid:rid,err:err.message},'*');
      });
    }else{
      try{
        var val=d.value===undefined||d.value===null?localStorage.getItem(d.key):(localStorage.setItem(d.key,d.value),d.value);
        var f2=wrap&&wrap.querySelector('iframe');
        if(f2)f2.contentWindow.postMessage({__modres:true,rid:rid,value:val},'*');
      }catch(err){
        var f3=wrap&&wrap.querySelector('iframe');
        if(f3)f3.contentWindow.postMessage({__modres:true,rid:rid,err:err.message},'*');
      }
    }
  }
});
/* ---- 真实审核数据(Kirameku 后端) ---- */

/* ---------- 真分区:面板内分组容器 ---------- */
var PANEL_SECTIONS={};
try{PANEL_SECTIONS=JSON.parse(localStorage.getItem('panelSections')||'{}');}catch(e){PANEL_SECTIONS={};}
/* ---- 自定义面板:创建 · 独立屏 · 持久化 ---- */
var EXAMPLES=[
  {icon:'🕐',name:'实时时钟',desc:'代码模式 · 纯 JS 每秒刷新',mod:{name:'实时时钟',type:'code',mode:'code',size:'half',enabled:true,refresh:0,bind:'none',api:{url:'',path:''},
    code:{html:'<div id="t">--:--:--</div>',css:'body{display:flex;align-items:center;justify-content:center;height:100vh}#t{font:700 26px ui-monospace,Consolas,monospace;color:#1C1C1E}',
    js:'function tick(){document.getElementById("t").textContent=new Date().toLocaleTimeString("zh-CN",{hour12:false});}\ntick();setInterval(tick,1000);'}}},
  {icon:'💬',name:'随机一言',desc:'代码模式 · 接入 hitokoto 开放接口',mod:{name:'随机一言',type:'code',mode:'code',size:'full',enabled:true,refresh:60,bind:'none',api:{url:'',path:''},
    code:{html:'<div id="h">加载中…</div>',css:'body{display:flex;align-items:center;justify-content:center;height:100vh;padding:0 14px;box-sizing:border-box}#h{font:600 14px sans-serif;color:#1C1C1E;line-height:1.7;text-align:center}',
    js:'function load(){fetch("https://v1.hitokoto.cn/?encode=json").then(function(r){return r.json();}).then(function(d){document.getElementById("h").textContent="「"+d.hitokoto+"」— "+d.from;}).catch(function(){document.getElementById("h").textContent="接口暂时不可用";});}\nload();'}}},
  {icon:'🌤️',name:'实时天气 · 北京',desc:'代码模式 · 接入 open-meteo 开放接口',mod:{name:'实时天气 · 北京',type:'code',mode:'code',size:'half',enabled:true,refresh:300,bind:'none',api:{url:'',path:''},
    code:{html:'<div id="w">加载中…</div>',css:'body{display:flex;align-items:center;justify-content:center;height:100vh}#w{font:700 15px sans-serif;color:#1C1C1E;text-align:center;line-height:1.8}',
    js:'fetch("https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current_weather=true").then(function(r){return r.json();}).then(function(d){var w=d.current_weather;document.getElementById("w").innerHTML="北京 "+w.temperature+"°C<br>风速 "+w.windspeed+" km/h";}).catch(function(){document.getElementById("w").textContent="接口暂时不可用";});'}}}
];
var presetPanel=null;
/* ---- 编辑器 ---- */
var edDraft=null,edTab='html',edCM=null;

/* ---- 真实账号体系(JWT) ---- */
var AUTH={token:"",user:null};
try{AUTH.token=localStorage.getItem("authToken")||"";AUTH.user=JSON.parse(localStorage.getItem("authUser")||"null");}catch(e){}
/* ---- GitHub OAuth 登录 ---- */
var GH_BACK=window.backBase();
(function(){
  var q=new URLSearchParams(location.search);
  if(q.get('auth_callback')==='1'&&q.get('token')){
    var tk=q.get('token');
    try{localStorage.setItem('ghToken',tk);}catch(e){}
    history.replaceState(null,'',location.pathname);
    fetch(GH_BACK+'/api/auth/github/me',{headers:{Authorization:'Bearer '+tk}})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(u){if(u){ghApplyUser(u);toast('🐙 GitHub 登录成功 · '+u.login);}})
      .catch(function(){});
  }else{
    var saved=null;
    try{saved=localStorage.getItem('ghUser');}catch(e){}
    if(saved){try{ghApplyUser(JSON.parse(saved));}catch(e){}}
  }
})();

/* ============ 模块大小切换:长按浮现 ⤢,点它紧凑/展开互切(FLIP 平滑变形) ============ */
document.addEventListener('pointerdown',function(e){
  if(!e.target.closest('.mod-card.lp,.mod-wrap.lp'))
    document.querySelectorAll('.mod-card.lp,.mod-wrap.lp').forEach(function(c){c.classList.remove('lp');});
},true);

/* ============ 重命名体系:导航 / 面板 / 区块标题 ============ */
var NAV_DEF={site:[['scr-home','看板'],['scr-content','内容'],['scr-status','状态'],['scr-review','审核'],['scr-me','我的']]};
var PANEL_DEF={site:'网站'};
var PANEL_KEYS=['site'];
var SEC_DEF={'sec-svc':'服务状态','sec-ports':'开放端口','sec-mymods':'自定义模块','sec-net':'今日网络与安全',
             'sec-todo':'待办提醒','sec-switch':'分区开关速览'};
var renameStore={nav:{},panel:{},sec:{}};
try{var savedRN=JSON.parse(localStorage.getItem('renameNames')||'null');if(savedRN)renameStore=savedRN;}catch(e){}

/* ============ 卡片折叠 · 拖拽调高 · 自定义分区标题 ============ */
var cardSizes={};
try{cardSizes=JSON.parse(localStorage.getItem('cardSizes')||'{}');}catch(e){cardSizes={}}
var cusSecN=0;

/* ============ 深色模式 ============ */
(function(){
  var d=null;try{d=localStorage.getItem('darkMode');}catch(e){}
  if(d==='1')document.querySelector('.phone').classList.add('dark');
  var sw=document.getElementById('darkSw');if(sw)sw.classList.toggle('on',d==='1');
})();

/* 已登录则不弹登录页 */
(function(){
  var tk=null;try{tk=localStorage.getItem('authToken');}catch(e){}
  if(tk){var lg=document.getElementById('pg-login');if(lg)lg.classList.remove('show');}
  if(typeof subSyncScreens==='function')subSyncScreens();
})();

/* ============ 分享码:导出 / 导入 ============ */
/* ============ 内置字段字典 ============ */
applyAllNames();

renderMyModules();

/* ============ 毛玻璃质感调节:滑杆实时预览全 App 玻璃 ============ */
var glassT={t:70,b:20};
try{var savedG=JSON.parse(localStorage.getItem('glassTuning')||'null');if(savedG&&typeof savedG.t==='number')glassT=savedG;}catch(e){}
(function(){
  var a=document.getElementById('slAlpha'),b=document.getElementById('slBlur');
  if(a)a.addEventListener('input',function(){glassT.t=+this.value;applyGlassTuning();saveGlassTuning();dragPreview();});
  if(a)a.addEventListener('change',function(){glassT.t=+this.value;applyGlassTuning();saveGlassTuning();endPreviewNow();});
  if(b)b.addEventListener('input',function(){glassT.b=+this.value;applyGlassTuning();saveGlassTuning();dragPreview();});
  if(b)b.addEventListener('change',function(){glassT.b=+this.value;applyGlassTuning();saveGlassTuning();endPreviewNow();});
  applyGlassTuning();
  syncGlassSliders();
})();

/* ============ Tab Bar:内容下滑自动隐藏,上滑呼出;栏上下滑收起,底缘上滑呼出 ============ */
/* 查看页面时:往下滑(看内容)→ 隐藏;往上滑 → 呼出 */
document.querySelectorAll('.screen').forEach(function(s){
  var last=s.scrollTop;
  s.addEventListener('scroll',function(){
    var d=s.scrollTop-last;last=s.scrollTop;
    if(d>10)tabbarHide();else if(d<-10)tabbarShow();
  });
});
(function(){
  var drag=null; /* {bar,sy,mode:'hide'|'show'} */
  function setY(bar,p){ /* p:1 完全显示 → 0 完全隐藏 */
    bar.style.transition='none';
    bar.style.transform='translateY('+Math.round((1-p)*150)+'%)';
    bar.style.opacity=String(0.15+0.85*p);
  }
  document.querySelectorAll('.tabbar').forEach(function(t){
    t.addEventListener('pointerdown',function(e){drag={bar:t,sy:e.clientY,mode:'hide'};});
  });
  document.querySelector('.phone').addEventListener('pointerdown',function(e){
    if(drag)return;
    var tb=[...document.querySelectorAll('.tabbar')].filter(function(x){return x.style.display!=='none';})[0];
    if(!tb||!tb.classList.contains('hidden'))return;
    var r=this.getBoundingClientRect();
    if(r.bottom-e.clientY<54){drag={bar:tb,sy:e.clientY,mode:'show'};}
  });
  document.querySelector('.phone').addEventListener('pointermove',function(e){
    if(!drag)return;
    if(drag.mode==='hide'){
      var down=e.clientY-drag.sy;
      if(down>0)setY(drag.bar,Math.max(0,1-down/130));
    }else{
      var up=drag.sy-e.clientY;
      setY(drag.bar,Math.max(0,Math.min(1,up/130)));
    }
  });
  document.querySelector('.phone').addEventListener('pointerup',function(e){
    if(!drag)return;
    var d=drag;drag=null;
    var moved=(d.mode==='hide')?(e.clientY-d.sy):(d.sy-e.clientY);
    d.bar.style.transition='transform .45s cubic-bezier(.32,.72,0,1),opacity .35s ease';
    d.bar.style.transform='';d.bar.style.opacity='';
    setTimeout(function(){d.bar.style.transition='';},480);
    if(d.mode==='hide'){ if(moved>44){d.bar.classList.add('hidden');toast('导航已收起 · 底部上滑呼出');} else {d.bar.classList.remove('hidden');} }
    else { if(moved>44){d.bar.classList.remove('hidden');} else {d.bar.classList.add('hidden');} }
  });
})();
/* Toast */
var toastTimer=null;
/* 审核 Tab 角标（演示：处理后减少） */

/* 兜底:确保重命名在任何时序下最终生效 */
window.addEventListener('load',function(){try{applyAllNames();}catch(e){}});
setTimeout(function(){try{applyAllNames();}catch(e){}},200);
setTimeout(function(){try{applyAllNames();}catch(e){}},800);
setInterval(function(){try{applyAllNames();}catch(e){}},2000);

/* ============ 真实数据接入:Kirameku 后端(带回退,失败保留演示值) ============ */
var API_BASE=window.backBase();
fetchSystemStatus();

;

/* ============ App v2 · 内容 CRUD 层(接 Kirameku 后端真实数据) ============ */
/* jfetch/unwrap/fdate/slugify/cnt/emptyCard/lerrEl/toastErr/frontBase/backBase/imgSrc
   已迁至 modules/site/data/{http,format}.js（S2），本模块执行前由全局过渡层暴露 */
var N={posts:0,moments:0,music:0,albums:0};
(function(){if(typeof protoRenderMusic==='function'){var _p=window.protoRenderMusic;window.protoRenderMusic=function(rows){N.music=rows?rows.length:0;updCounts();_p(rows);};}})();

/* ---------- 看板 hero + 待办计数(挂钩现有审核渲染) ---------- */
var PEND={cmt:0,msg:0};

/* ---------- 文章 ---------- */
var POSTS=[],POST_EDIT=null,PQ='';
var PG={posts:1,moments:1},PAGE_SIZE=50,POSTS_MORE=false,MOMENTS_MORE=false;

/* ---------- 说说 ---------- */

/* ---------- 相册 ---------- */
var ALBUMS=[],CUR_ALBUM=null,CUR_PHOTOS=[];

/* ---------- 通用 CRUD 引擎 ---------- */
var CRUD_K=null,CRUD_DATA={},FORM_K=null,FORM_ID=null,BMC=[];
var CRUD_DEFS={
  categories:{t:'分类',api:'/api/categories',ic:'📂',fields:[
    {k:'name',l:'名称',req:1},{k:'slug',l:'Slug',auto:1},{k:'description',l:'描述',t:'textarea'},{k:'sort',l:'排序',t:'number'}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</div><div style="font-size:11.5px;color:var(--ink-3);white-space:nowrap">'+esc(m.slug||'')+'</div>';},
    chip:function(m){return (m.post_count||0)+' 篇';}},
  tags:{t:'标签',api:'/api/tags',ic:'🏷️',noSort:1,fields:[
    {k:'name',l:'名称',req:1},{k:'slug',l:'Slug',auto:1}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</div><div style="font-size:11.5px;color:var(--ink-3);white-space:nowrap">'+esc(m.slug||'')+'</div>';},
    chip:function(m){return (m.post_count||0)+' 篇';}},
  projects:{t:'项目',api:'/api/projects',ic:'🚀',noSort:1,fields:[
    {k:'name',l:'项目名',req:1},{k:'slug',l:'Slug',auto:1},{k:'description',l:'简介',t:'textarea'},
    {k:'tech_stack',l:'技术栈',t:'list',ph:'Next.js, FastAPI'},
    {k:'link_github',l:'GitHub 链接'},{k:'link_live',l:'在线链接'},
    {k:'status',l:'状态',t:'select',o:[{v:'developing',n:'开发中'},{v:'released',n:'已发布'},{v:'maintaining',n:'维护中'}]},
    {k:'status_label',l:'状态文字',ph:'如：v2.0'}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600">'+esc(m.name)+'</div><div style="font-size:11.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.description||'')+'</div>';},
    chip:function(m){return m.status_label||m.status||'';}},
  friends:{t:'友链',api:'/api/friend-links',admin:'/admin',ic:'🔗',fields:[
    {k:'name',l:'站点名',req:1},{k:'url',l:'网址',req:1,ph:'https://…'},{k:'avatar',l:'头像图址'},
    {k:'description',l:'描述',t:'textarea'},{k:'sort',l:'排序',t:'number'},
    {k:'is_approved',l:'审核状态',t:'select',bool:1,o:[{v:'',n:'(不改变)'},{v:'true',n:'✓ 已通过(前台可见)'},{v:'false',n:'待审核'}]}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600">'+esc(m.name)+'</div><div style="font-size:11.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.url||'')+'</div>';},
    chip:function(m){return m.is_approved?'已通过':'待审核';}},
  albums:{t:'相册',api:'/api/albums',ic:'🏞️',fields:[
    {k:'title',l:'相册名',req:1},{k:'description',l:'描述',t:'textarea'},{k:'cover',l:'封面图址',ph:'/images/xx.webp 或 https://…'}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600">'+esc(m.title)+'</div>';},
    chip:function(m){return (m.photo_count||0)+' 张';}},
  chatters:{t:'说说',api:'/api/chatters',admin:'/admin',ic:'💭',fields:[
    {k:'content',l:'内容',req:1,t:'textarea',ph:'此刻的想法…'},
    {k:'images',l:'图片网址(逗号分隔)',t:'list',ph:'https://…/a.webp, /images/b.webp'},
    {k:'mood',l:'心情',ph:'开心'},
    {k:'status',l:'状态',t:'select',o:[{v:'published',n:'发布'},{v:'draft',n:'存草稿'}]}],
    row:function(m){return '<div style="font-size:13.5px;line-height:1.5;white-space:pre-wrap">'+esc(String(m.content||'').slice(0,80))+'</div>';},
    chip:function(m){return m.status==='published'?'已发布':'草稿';}},
  bmc:{t:'收藏夹',api:'/api/bookmarks/categories',ic:'📁',fields:[
    {k:'name',l:'夹名',req:1},{k:'icon',l:'图标',ph:'Code2 或 📁'},{k:'description',l:'描述'},{k:'sort',l:'排序',t:'number'}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(m.name)+'</div>';},
    chip:function(m){return '';}},
  bms:{t:'收藏站点',api:'/api/bookmarks/sites',ic:'⭐',fields:[
    {k:'category_id',l:'所属夹',t:'select',o:[]},{k:'name',l:'站点名',req:1},{k:'url',l:'网址',req:1,ph:'https://…'},
    {k:'icon',l:'图标'},{k:'description',l:'描述'}],
    row:function(m){return '<div style="font-size:14px;font-weight:600">'+esc(m.name)+'</div><div style="font-size:11px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.url||'')+'</div>';},
    chip:function(m){return '';}},
  visitors:{t:'访客',api:'/api/visitors',ro:1,ic:'🌐',fields:[],row:function(){return '';},chip:function(){return '';}},
  music:{t:'音乐',api:'/api/music',ic:'🎵',form:1,noAdd:1,fields:[
    {k:'title',l:'曲名',req:1},{k:'artist',l:'歌手',ph:'未知歌手'}],
    row:function(m){return '<div style="font-size:14.5px;font-weight:600">'+esc(m.title)+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+esc(m.artist||'未知歌手')+'</div>';},
    chip:function(m){return '';}}
};

/* ---------- 收藏夹(双层) ---------- */

/* ---------- 访客(只读+清理) ---------- */

/* 审核统一层 v2 已迁至 modules/site/views/audit.js（S4），AUDIT_MAP 留此供其他引用 */
var AUDIT_MAP={cmt:/pane-review-cmt/,msg:/pane-review-msg/,cht:/pane-review-cht/};/nwindow.refreshAudit=function(){
  if(!AUTH.token)return;
  Promise.all([
    jfetch(API_BASE+'/api/comments/admin?status=pending&size=20',{headers:authHeaders()}).then(unwrap).catch(function(){return null;}),
    jfetch(API_BASE+'/api/messages/admin?status=pending&size=20',{headers:authHeaders()}).then(unwrap).catch(function(){return null;}),
    jfetch(API_BASE+'/api/chatters/comments/admin?status=pending&size=20',{headers:authHeaders()}).then(unwrap).catch(function(){return null;})
  ]).then(function(rs){
    renderRealAudit('cmt',rs[0]);renderRealAudit('msg',rs[1]);renderRealAudit('cht',rs[2]);
    // 已处理：三类 × approved/rejected 最近各 3 条
    var defs=[
      {k:'cmt',path:'/api/comments/admin',ic:'💬',src:'文章评论'},
      {k:'msg',path:'/api/messages/admin',ic:'📩',src:'留言板'},
      {k:'cht',path:'/api/chatters/comments/admin',ic:'💭',src:'说说评论'}
    ];
    var pulls=[];
    defs.forEach(function(d){
      ['approved','rejected'].forEach(function(st){
        pulls.push(jfetch(API_BASE+d.path+'?status='+st+'&size=3',{headers:authHeaders()}).then(unwrap)
          .then(function(rows){return (rows||[]).map(function(x){return Object.assign({_kind:d.k,_ic:d.ic,_src:d.src},x);});})
          .catch(function(){return [];}));
      });
    });
    Promise.all(pulls).then(function(groups){
      var done=[].concat.apply([],groups);
      done.sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));});
      renderDone(done.slice(0,12));
    });
  });
};
window.auditAct=function(kind,id,status,card){
  var path={cmt:'comments',msg:'messages',cht:'chatters/comments'}[kind]||'comments';
  jfetch(API_BASE+'/api/'+path+'/'+id+'/status',{method:'PUT',body:JSON.stringify({status:status})})
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
    .catch(function(e){toast("操作失败: "+(e&&e.message||'请重试'));});
};

/* ---------- 文章编辑器:分类/标签/封面 ---------- */
var CATS=[];
/* 直接包装 openPostEditor/openEditor：在原实现后填充分类/标签/封面 */
(function(){
  var _openPostEditor=window.openPostEditor;
  window.openPostEditor=function(id){
    if(!CATS.length)loadCats();
    _openPostEditor(id);
    var tries=0;
    var fill=function(){
      tries++;
      var p=POST_EDIT;
      if(!p||p.id!==id){if(tries<20)setTimeout(fill,150);return;}
      var sel=document.getElementById('edPostCat');
      if(sel){sel.dataset.cur=p.category||'';fillCatSelect(p.category);}
      var tg=document.getElementById('edPostTags');if(tg)tg.value=(p.tags||[]).join(', ');
      var cv=document.getElementById('edPostCover');if(cv)cv.value=p.cover||'';
    };
    setTimeout(fill,150);
  };
  var _openEditor=window.openEditor;
  window.openEditor=function(){
    if(!CATS.length)loadCats();
    _openEditor();
    var sel=document.getElementById('edPostCat');
    if(sel){sel.dataset.cur='';fillCatSelect('');}
    var tg=document.getElementById('edPostTags');if(tg)tg.value='';
    var cv=document.getElementById('edPostCover');if(cv)cv.value='';
  };
})();

/* ---------- 编辑器:预览/封面传图/选图/防丢稿 ---------- */
/* 图片插入:工具栏 🖼️ 改为从相册选 */
/* 工具栏 🖼️ 按钮改调选图 */
rep_open_imgpick=function(){};
/* ---------- 草稿筛选 ---------- */
var PF='all';

/* ---------- 防丢稿自动暂存 ---------- */
var DRAFT_KEY='postDraft',_draftT=null;
(function(){
  document.addEventListener('click',function(e){
    if(e.target.closest&&(e.target.closest('.btn-draft')||e.target.closest('.btn-pub')))draftClear();
  },true);
})();

/* ---------- Markdown 工具栏 ---------- */

/* ---------- 相册设为封面 ---------- */

/* ---------- 账号资料编辑 ---------- */
var PF_AV='';

/* ---------- 全局搜索 ---------- */

/* ---------- 预设布局(三套一键) ---------- */
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

/* ---------- 卡片长按拖拽排序(同分区内) ---------- */
var DRAG=null;
document.addEventListener('pointermove',function(e){
  if(!DRAG)return;
  e.preventDefault();
  moveDragTo(e.clientX,e.clientY);
  /* 命中其它卡片中心 → 交换位置(DOM move) */
  var under=document.elementFromPoint(e.clientX,e.clientY);
  var card=under?under.closest('.mod-card,.mod-frame-wrap'):null;
  if(card&&card!==DRAG.el&&card.dataset.mid!==DRAG.mid&&card.parentElement===DRAG.el.parentElement){
    var r=card.getBoundingClientRect();
    var before=(e.clientY < r.top + r.height/2) || (e.clientX < r.left + r.width/2 && Math.abs(e.clientY-(r.top+r.height/2))<r.height);
    card.parentNode.insertBefore(DRAG.el, before?card:card.nextSibling);
    DRAG.el.style.left=(e.clientX-DRAG.offX)+'px';
    DRAG.el.style.top=(e.clientY-DRAG.offY)+'px';
  }
},{passive:false});
document.addEventListener('pointerup',function(){if(DRAG)endModDrag();});

/* ---------- 主题色自定义 ---------- */
/* ---------- 主题预设四套 ---------- */
var THEMES={
  sky:{name:'晴空',accent:'#0A84FF',accent2:'#5E5CE6',wall:'aurora'},
  violet:{name:'暮紫',accent:'#8F7CE8',accent2:'#BF5AF2',wall:'violet'},
  forest:{name:'森绿',accent:'#28B463',accent2:'#00C7BE',wall:'mint'},
  gold:{name:'暗金',accent:'#D4A017',accent2:'#FF9F0A',wall:'peach'}
};
/* ---------- 全局字号三档 ---------- */
(function(){
  var f=null;try{f=localStorage.getItem('fontSize');}catch(e){}
  if(f){setFontSize(f);}
  var a=null;try{a=localStorage.getItem('accent');}catch(e){}
  if(a)setAccent(a);
  renderThemePresets();
  var op=openSub; /* 外观页打开时重渲染选择器（选中态） */
})();

/* ---------- 数据库备份下载 ---------- */

/* ---------- 通用排序(上移/下移) ---------- */

/* ---------- 服务状态/端口探测(真实可达性) ---------- */
var SVC_DOWN=[];
/* ---------- 看板趋势卡 ---------- */
/* ---------- 登出清理(包装原 logout) ---------- */
(function(){
  var _lo=window.logout;
  window.logout=function(){
    _lo();
    CRUD_DATA.chatters=[];N.moments=0;updCounts();
    var mr=document.getElementById('momentsReal');if(mr)mr.innerHTML=emptyCard('登录后加载说说');
    PEND.cmt=0;PEND.msg=0;PEND.cht=0;heroPend();
    cnt('n-cmt','—');cnt('n-msg','—');cnt('n-cht','—');
    ['cmt','msg','cht'].forEach(function(k){var p=document.getElementById(AUDIT_MAP[k]);if(p)p.innerHTML='';});
    try{localStorage.removeItem('ghToken');localStorage.removeItem('ghUser');}catch(e){}
    var gb=document.getElementById('ghBtnTxt');if(gb)gb.textContent='GitHub 登录';
  };
})();

/* ---------- 服务管理子页(一期:详情/重测/打开/复制;二期重启见文档15章) ---------- */
var SVC_META={3000:{nm:'前台网站 Next.js',url:'http://localhost:3000/',ic:'🚀'},8000:{nm:'后台接口 FastAPI',url:window.backBase()+'/api/health',ic:'⚙️'},8787:{nm:'App 代理 Pocket',url:'http://localhost:8787/',ic:'🌐'}};
var SVC_CTRL=false;

/* ---------- 连接设置(真机开箱即用) ---------- */
var BACKEND_OK=null;
/* 启动引导：后端不可达时提示进入连接设置 */
setTimeout(function(){
  fetch(window.backBase()+'/api/health',{cache:'no-store'})
    .then(function(r){return r.json();})
    .then(function(j){
      var ok=j&&j.status==='ok';
      connStatePaint(ok);BACKEND_OK=ok;
      if(!ok){toast('⚠️ 后端连接异常 · 点「我的 → 连接设置」');}
    })
    .catch(function(){
      connStatePaint(false);BACKEND_OK=false;
      toast('⚠️ 无法连接后端 · 点「我的 → 连接设置」');
      openSub('pg-conn');
    });
},1200);

/* ---------- 配置云同步(site_config) ---------- */
var CFG_KEY='app.cfg.v1',CLOUD_ON=null;
/* 配置变化自动上传（开启时，10s 防抖） */
var _pushT=null;
['click','input'].forEach(function(ev){
  document.addEventListener(ev,function(e){
    var t=e.target;
    if(t.closest&&(t.closest('#pg-wallpaper')||t.closest('#pg-rename')||t.closest('#pg-mods')||t.closest('#pg-mod-editor')||t.closest('.side-panels')||t.id==='darkSw'||t.closest('#drawer'))){autoPush();}
  },true);
});

/* ---------- 通知中心 ---------- */
var NOTIF_BASE={audit:-1,svcDown:false,highLoad:false,backend:false};
var NOTIF_SEEN={};
try{NOTIF_SEEN=JSON.parse(localStorage.getItem('notifSeen')||'{}');}catch(e){}


/* ---------- 看板分布/热门文章 ---------- */
/* 直接包装：在原 loadDash 后追加分布渲染 */
(function(){
  var _loadDash=loadDash;
  window.loadDash=function(){
    _loadDash();
    jfetch(API_BASE+'/api/dashboard/stats').then(function(s){renderDist(s);}).catch(function(){});
  };
})();

/* ---------- 学习面板移除迁移 ---------- */
(function(){
  try{
    var ch=false;
    (customModules||[]).forEach(function(m){if(m.panel==='learn'){m.panel='site';ch=true;}});
    if(ch)saveModules();
    ['panelOrder','panelPins','customPanels'].forEach(function(k){
      var raw=localStorage.getItem(k);if(!raw)return;
      var v=JSON.parse(raw);
      var changed=false;
      if(Array.isArray(v)){var nv=v.filter(function(x){return x!=='learn'&&x!=='shop';});changed=nv.length!==v.length;v=nv;}
      else if(typeof v==='object'){for(var kk in v){if(kk==='learn'||kk==='shop'){delete v[kk];changed=true;}}}
      if(changed)localStorage.setItem(k,JSON.stringify(v));
    });
    if(localStorage.getItem('pinned')==='learn')localStorage.removeItem('pinned');
  }catch(e){}
})();

/* ---------- 统一确认/输入弹层 ---------- */

/* ---------- 轮询治理:统一调度 + 页面不可见暂停 ---------- */
var POLL_JOBS=[];
setInterval(function(){
  if(document.hidden)return;
  var now=Date.now();
  POLL_JOBS.forEach(function(j){
    if(now>=j.due){j.due=now+j.ms;try{j.fn();}catch(e){}}
  });
},2000);
document.addEventListener('visibilitychange',function(){
  if(!document.hidden){
    var now=Date.now();
    POLL_JOBS.forEach(function(j){j.due=Math.min(j.due,now+600);});
  }
});
regPoll(fetchSystemStatus,15000);
regPoll(probeSvc,30000);
regPoll(notifCheck,30000);
fetch(API_BASE+'/api/system/services/restart',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},authHeaders()),body:JSON.stringify({port:0})})
  .then(function(r){SVC_CTRL=(r.status!==403);})
  .catch(function(){SVC_CTRL=false;});

/* ---------- 分区条拖拽滚动(鼠标可拖,触屏原生滚动) ---------- */
(function(){
  function dragScroll(el){
    if(!el)return;
    var down=false,sx=0,sl=0,moved=false;
    el.addEventListener('pointerdown',function(e){
      if(e.pointerType!=='mouse')return;
      down=true;moved=false;sx=e.clientX;sl=el.scrollLeft;
    });
    el.addEventListener('pointermove',function(e){
      if(!down)return;
      var dx=e.clientX-sx;
      if(Math.abs(dx)>4){moved=true;el.scrollLeft=sl-dx;}
    });
    ['pointerup','pointerleave','pointercancel'].forEach(function(t){
      el.addEventListener(t,function(){down=false;if(moved){setTimeout(function(){moved=false;},0);}});
    });
    el.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();}},true);
  }
  dragScroll(document.getElementById('seg-content'));
  dragScroll(document.getElementById('seg-review'));
})();

/* ---------- 启动 ---------- */
loadPosts();loadAlbums();loadDash();loadMoments();loadCats();probeSvc();cloudPaint();subSyncScreens();meCardPaint();
if(typeof refreshAudit==='function')refreshAudit();
(function(){if(typeof doLogin==='function'){var _d=window.doLogin;window.doLogin=function(){_d();setTimeout(function(){loadMoments();loadDash();if(typeof refreshAudit==='function')refreshAudit();loadPosts();loadAlbums();loadCrud&&CRUD_K&&loadCrud(CRUD_K);},900);};}})();

