/** modules/site/state —— 共享状态单一声明（T4.8，逐字迁自 prototype.js）
 * 视图函数经全局过渡层以裸标识符读写（globalThis 属性），此处为唯一初始化点。 */
import { backBase } from './data/http.js';

var SUB_TOP=52;

var drawerEl=null,maskEl=null,pageEl=null,phoneEl=null;
if(typeof document!=='undefined'){
  drawerEl=document.getElementById('drawer');maskEl=document.getElementById('drawerMask');
  pageEl=document.querySelector('.screens');phoneEl=document.querySelector('.phone');
}


var DW=292,dProgress=0;

var subDrag=null;

var panels={
  site:{name:'网站',icon:'🌐',bg:'linear-gradient(135deg,var(--accent),var(--accent2))',def:'scr-status',enabled:true,closed:false,pinned:false},
};

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

var panelOrder=[];

var curPanel='site',ACT=170,openRow=null;

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

var curWall='aurora';

var wallT={blur:0,veil:14};

var previewTimer=null,previewPage='pg-wallpaper';

var MUSIC_ROWS=[];

var protoAudioEl=null;

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

var AUTH={token:"",user:null};

var GH_BACK=backBase();

var NAV_DEF={site:[['scr-home','看板'],['scr-content','内容'],['scr-status','状态'],['scr-review','审核'],['scr-me','我的']]};

var PANEL_DEF={site:'网站'};

var PANEL_KEYS=['site'];

var SEC_DEF={'sec-svc':'服务状态','sec-ports':'开放端口','sec-mymods':'自定义模块','sec-net':'今日网络与安全',
             'sec-todo':'待办提醒','sec-switch':'分区开关速览'};

var renameStore={nav:{},panel:{},sec:{}};

var cardSizes={};

var cusSecN=0;

var glassT={t:70,b:20};

var toastTimer=null;

var API_BASE=backBase();

var N={posts:0,moments:0,music:0,albums:0};

var PEND={cmt:0,msg:0};

var POSTS=[],POST_EDIT=null,PQ='';

var PG={posts:1,moments:1},PAGE_SIZE=50,POSTS_MORE=false,MOMENTS_MORE=false;

var ALBUMS=[],CUR_ALBUM=null,CUR_PHOTOS=[];

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

var AUDIT_MAP={cmt:'pane-review-cmt',msg:'pane-review-msg',cht:'pane-review-cht'};

var CATS=[];

var PF='all';

var DRAFT_KEY='postDraft',_draftT=null;

var PF_AV='';

var THEMES={
  sky:{name:'晴空',accent:'#0A84FF',accent2:'#5E5CE6',wall:'aurora'},
  violet:{name:'暮紫',accent:'#8F7CE8',accent2:'#BF5AF2',wall:'violet'},
  forest:{name:'森绿',accent:'#28B463',accent2:'#00C7BE',wall:'mint'},
  gold:{name:'暗金',accent:'#D4A017',accent2:'#FF9F0A',wall:'peach'}
};

var SVC_DOWN=[];

var SVC_META={3000:{nm:'前台网站 Next.js',url:'http://localhost:3000/',ic:'🚀'},8000:{nm:'后台接口 FastAPI',url:backBase()+'/api/health',ic:'⚙️'},8787:{nm:'App 代理 Pocket',url:'http://localhost:8787/',ic:'🌐'}};

var SVC_CTRL=false;

var BACKEND_OK=null;

var CFG_KEY='app.cfg.v1',CLOUD_ON=null;

var _pushT=null;

var NOTIF_BASE={audit:-1,svcDown:false,highLoad:false,backend:false};

var NOTIF_SEEN={};

var POLL_JOBS=[];

var rep_open_imgpick=function(){};

export const __exports__ = { SUB_TOP, drawerEl, maskEl, pageEl, phoneEl, DW, dProgress, subDrag, panels, PANEL_COLORS, panelSkins, panelOrder, curPanel, ACT, openRow, wallpapers, customWalls, curWall, wallT, previewTimer, previewPage, MUSIC_ROWS, protoAudioEl, EXAMPLES, AUTH, GH_BACK, NAV_DEF, PANEL_DEF, PANEL_KEYS, SEC_DEF, renameStore, cardSizes, cusSecN, glassT, toastTimer, API_BASE, N, PEND, POSTS, POST_EDIT, PQ, PG, PAGE_SIZE, POSTS_MORE, MOMENTS_MORE, ALBUMS, CUR_ALBUM, CUR_PHOTOS, CRUD_K, CRUD_DATA, FORM_K, FORM_ID, BMC, CRUD_DEFS, AUDIT_MAP, CATS, PF, DRAFT_KEY, _draftT, PF_AV, THEMES, SVC_DOWN, SVC_META, SVC_CTRL, BACKEND_OK, CFG_KEY, CLOUD_ON, _pushT, NOTIF_BASE, NOTIF_SEEN, POLL_JOBS, rep_open_imgpick };
