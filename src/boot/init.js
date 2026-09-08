/** src/boot/init.js —— 启动期初始化（T4.8，逐字迁自 prototype.js 顶层，保序）
 * 必须最后加载：依赖 site/lab 过渡层已暴露的全部函数与状态。 */
import '../modules/site/index.js';
import '../modules/lab/index.js';

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

/* 快速操作面板(右上角 + 触发) */
/* ============ 侧边栏:屏幕左缘右滑打开,跟手丝滑开合(方案 C 全套景深) ============ */
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
/* 置顶持久化:下次打开软件,优先打开置顶的面板 */
try{var savedPins=JSON.parse(localStorage.getItem('panelPins')||'[]');savedPins.forEach(function(k){if(panels[k])panels[k].pinned=true;});}catch(e){}
/* 自定义面板持久化 */
try{var savedCP=JSON.parse(localStorage.getItem('customPanels')||'[]');savedCP.forEach(function(c){panels[c.key]={name:c.name,icon:c.icon,bg:c.bg,def:'scr-'+c.key,enabled:true,closed:false,pinned:false,custom:true};});}catch(e){}
/* 面板皮肤(图标/配色)覆盖层,All 面板可用 */
try{panelSkins=JSON.parse(localStorage.getItem('panelSkins')||'{}');}catch(e){panelSkins={}}
Object.keys(panelSkins).forEach(function(k){
  if(panels[k]){if(panelSkins[k].icon)panels[k].icon=panelSkins[k].icon;if(panelSkins[k].bg)panels[k].bg=panelSkins[k].bg;}
});
/* 面板顺序持久化(拖动排序结果) */
try{panelOrder=JSON.parse(localStorage.getItem('panelOrder')||'[]');}catch(e){panelOrder=[]}
renderPanels();
/* 自定义面板的屏也在启动时生成(若被持久化过) */
Object.keys(panels).filter(function(k){return panels[k].custom;}).forEach(function(k){
  ensureCustomScreen(k,panels[k].name,panels[k].icon);
});
/* 启动时:优先打开置顶的面板;无置顶则优先「网站」,不可用则取第一个可用面板 */
bootDefaultPanel();

/* ============ 壁纸系统:预设 + 自由上传图片,选择持久化 ============ */
try{customWalls=JSON.parse(localStorage.getItem('customWalls')||'[]');}catch(e){customWalls=[]}
customWalls.forEach(function(c){wallpapers[c.key]={name:c.name,img:c.img,custom:true,deletable:true};});
try{var savedWall=localStorage.getItem('wallpaper');if(savedWall&&wallpapers[savedWall])curWall=savedWall;}catch(e){}

/* 壁纸层的模糊度与纱度(实时可调) */
try{var savedWT=JSON.parse(localStorage.getItem('wallTuning')||'null');if(savedWT&&typeof savedWT.blur==='number')wallT=savedWT;}catch(e){}

/* 拖滑杆 → 壁纸页自动淡出实时预览;松手/停下 → 自动淡回 */

applyWallpaper(curWall);
applyWallTuning();

/* ============ 原型音乐段:接 Kirameku 后端(真实列表/上传/播放/删除) ============ */
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
/* 动态列表源(dynlist):返回 [{t,s,url?}] */
/* ---------- 模块库:8 个预置模块 ---------- */

try{customModules=JSON.parse(localStorage.getItem('customModules')||'[]');}catch(e){customModules=[]}
customModules.forEach(function(m){if(!m.panel)m.panel='site';});
/* esc/escAttr 已迁至 modules/site/data/format.js（S2），经全局过渡层提供 */

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
try{PANEL_SECTIONS=JSON.parse(localStorage.getItem('panelSections')||'{}');}catch(e){PANEL_SECTIONS={};}
/* ---- 自定义面板:创建 · 独立屏 · 持久化 ---- */
/* ---- 编辑器 ---- */

/* ---- 真实账号体系(JWT) ---- */
try{AUTH.token=localStorage.getItem("authToken")||"";AUTH.user=JSON.parse(localStorage.getItem("authUser")||"null");}catch(e){}
/* ---- GitHub OAuth 登录 ---- */
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
try{var savedRN=JSON.parse(localStorage.getItem('renameNames')||'null');if(savedRN)renameStore=savedRN;}catch(e){}

/* ============ 卡片折叠 · 拖拽调高 · 自定义分区标题 ============ */
try{cardSizes=JSON.parse(localStorage.getItem('cardSizes')||'{}');}catch(e){cardSizes={}}

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
/* 审核 Tab 角标（演示：处理后减少） */

/* 兜底:确保重命名在任何时序下最终生效 */
window.addEventListener('load',function(){try{applyAllNames();}catch(e){}});
setTimeout(function(){try{applyAllNames();}catch(e){}},200);
setTimeout(function(){try{applyAllNames();}catch(e){}},800);
setInterval(function(){try{applyAllNames();}catch(e){}},2000);

/* ============ 真实数据接入:Kirameku 后端(带回退,失败保留演示值) ============ */
fetchSystemStatus();

;

/* ============ App v2 · 内容 CRUD 层(接 Kirameku 后端真实数据) ============ */
/* jfetch/unwrap/fdate/slugify/cnt/emptyCard/lerrEl/toastErr/frontBase/backBase/imgSrc
   已迁至 modules/site/data/{http,format}.js（S2），本模块执行前由全局过渡层暴露 */
(function(){if(typeof protoRenderMusic==='function'){var _p=window.protoRenderMusic;window.protoRenderMusic=function(rows){N.music=rows?rows.length:0;updCounts();_p(rows);};}})();

/* ---------- 看板 hero + 待办计数(挂钩现有审核渲染) ---------- */

/* ---------- 文章 ---------- */

/* ---------- 说说 ---------- */

/* ---------- 相册 ---------- */

/* ---------- 通用 CRUD 引擎 ---------- */

/* ---------- 收藏夹(双层) ---------- */

/* ---------- 访客(只读+清理) ---------- */

/* 审核统一层 v2 已迁至 modules/site/views/audit.js（S4），AUDIT_MAP 留此供其他引用 */
window.refreshAudit=function(){
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

/* ---------- 文章编辑器:分类/标签/封面 ---------- */
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
/* ---------- 草稿筛选 ---------- */

/* ---------- 防丢稿自动暂存 ---------- */
(function(){
  document.addEventListener('click',function(e){
    if(e.target.closest&&(e.target.closest('.btn-draft')||e.target.closest('.btn-pub')))draftClear();
  },true);
})();

/* ---------- Markdown 工具栏 ---------- */

/* ---------- 相册设为封面 ---------- */

/* ---------- 账号资料编辑 ---------- */

/* ---------- 全局搜索 ---------- */

/* ---------- 预设布局(三套一键) ---------- */

/* ---------- 卡片长按拖拽排序(同分区内) ---------- */
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

/* ---------- 连接设置(真机开箱即用) ---------- */
/* 启动引导：后端不可达时提示进入连接设置 */
setTimeout(function(){
  fetch(backBase()+'/api/health',{cache:'no-store'})
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
/* 配置变化自动上传（开启时，10s 防抖） */
['click','input'].forEach(function(ev){
  document.addEventListener(ev,function(e){
    var t=e.target;
    if(t.closest&&(t.closest('#pg-wallpaper')||t.closest('#pg-rename')||t.closest('#pg-mods')||t.closest('#pg-mod-editor')||t.closest('.side-panels')||t.id==='darkSw'||t.closest('#drawer'))){autoPush();}
  },true);
});

/* ---------- 通知中心 ---------- */
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


