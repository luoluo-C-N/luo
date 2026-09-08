/** views/crud —— 九类资料管理 + 访客（S5，自 content.js 拆分以满足 ≤300 行约束）。验收: SITE-FR3 */
/* 逐字迁移自 src/prototype.js；行为变更需走评审。 */
export function openCrudAt(k){openSub('pg-crud');crudSegTo(k);}

export function gotoData(){jumpTab('scr-content');segTo('content','data');}

export function crudSegTo(k){
  CRUD_K=k;
  document.querySelectorAll('#seg-crud .seg').forEach(function(x){x.classList.toggle('on',x.dataset.k===k);});
  var def=CRUD_DEFS[k]||{t:k==='bookmarks'?'收藏':'资料',ro:0};
  document.getElementById('crudTitle').textContent=def.t+'管理';
  document.getElementById('crudAddBtn').style.display=def.ro?'none':'';
  loadCrud(k);
}

export function crudAdd(){if(CRUD_K==='bookmarks')openCrudForm('bmc');else openCrudForm();}

export function loadCrud(k){
  var h=document.getElementById('crudList');if(!h)return;
  h.innerHTML=emptyCard('加载中…');
  if(k==='visitors'){loadVisitors();return;}
  if(k==='bookmarks'){loadBookmarks();return;}
  var def=CRUD_DEFS[k];
  jfetch(API_BASE+def.api+(def.admin||''),{headers:authHeaders()}).then(function(l){
    var arr=unwrap(l)||[];CRUD_DATA[k]=arr;
    if(!arr.length){h.innerHTML=emptyCard('暂无'+def.t+' · 点右上「＋ 新建」');return;}
    h.innerHTML=arr.map(function(m){
      var chip=def.chip(m);
      return '<div class="card" style="padding:4px 14px"><div class="crud-row"><div class="crud-ic">'+def.ic+'</div>'+
        '<div style="flex:1;min-width:0">'+def.row(m)+'</div>'+
        (chip?'<span class="chip '+(chip==='已通过'||chip==='已发布'?'chip-pub':'chip-local')+'">'+esc(chip)+'</span>':'')+
        (def.noSort?'':'<span class="crud-act" title="上移" onclick="moveCrud(\''+k+'\','+m.id+',-1)">↑</span><span class="crud-act" title="下移" onclick="moveCrud(\''+k+'\','+m.id+',1)">↓</span>')+
        '<span class="crud-act" onclick="openCrudForm(\''+k+'\','+m.id+')">✏️</span>'+
        '<span class="crud-act" style="color:var(--red)" onclick="delCrud(\''+k+'\','+m.id+')">🗑</span></div></div>';
    }).join('');
  }).catch(function(e){lerrEl(h,e);});
}

export function delCrud(k,id){
  var def=CRUD_DEFS[k];
  askConfirm('删除这个'+def.t+'？不可恢复').then(function(ok){
    if(!ok)return;
  jfetch(API_BASE+def.api+'/'+id,{method:'DELETE'}).then(function(){
    toast('已删除');loadDash();
    if(k==='albums')loadAlbums();
    else if(k==='chatters')loadMoments();
    else if(k==='bmc'||k==='bms'||CRUD_K==='bookmarks')loadBookmarks();
    if(CRUD_K&&document.getElementById('pg-crud').classList.contains('show'))loadCrud(CRUD_K);
  }).catch(toastErr);
  });
}

export function openCrudForm(k,id,presetCat){
  if(!k)k=CRUD_K||'categories';
  FORM_K=k;FORM_ID=id||null;
  var def=CRUD_DEFS[k];
  var m=null;
  if(id){var arr=CRUD_DATA[k]||[];for(var i=0;i<arr.length;i++){if(arr[i].id===id)m=arr[i];}}
  document.getElementById('crudFormTitle').textContent=(id?'编辑':'新建')+' · '+def.t;
  var render=function(){
    var b=document.getElementById('crudFormBody');
    b.innerHTML=def.fields.map(function(f){
      var v=m&&m[f.k]!=null?m[f.k]:'';
      if(f.t==='textarea')
        return '<div class="fld"><label>'+f.l+(f.req?' *':'')+'</label><textarea rows="4" id="cf_'+f.k+'" placeholder="'+escAttr(f.ph||'')+'">'+esc(v)+'</textarea></div>';
      if(f.t==='select'){
        var opts=f.o.slice();
        if(f.k==='category_id')opts=BMC.map(function(c){return {v:c.id,n:c.name};});
        return '<div class="fld"><label>'+f.l+'</label><select id="cf_'+f.k+'">'+opts.map(function(o){
          return '<option value="'+escAttr(String(o.v))+'"'+(String(v)===String(o.v)?' selected':'')+'>'+esc(o.n)+'</option>';}).join('')+'</select></div>';
      }
      if(f.t==='list')
        return '<div class="fld"><label>'+f.l+'(逗号分隔)</label><input id="cf_'+f.k+'" value="'+escAttr(Array.isArray(v)?v.join(', '):String(v||''))+'" placeholder="'+escAttr(f.ph||'')+'"></div>';
      var num=f.t==='number';
      return '<div class="fld"><label>'+f.l+(f.req?' *':'')+'</label><input type="'+(num?'number':'text')+'" id="cf_'+f.k+'" value="'+escAttr(v)+'" placeholder="'+escAttr(f.ph||(f.auto?'留空自动生成':''))+'"></div>';
    }).join('')+'<div style="height:8px"></div>';
    if(presetCat){var sel=document.getElementById('cf_category_id');if(sel)sel.value=String(presetCat);}
    openSub('pg-crud-form');
  };
  if(def.fields.some(function(f){return f.k==='category_id';})&&!BMC.length){
    jfetch(API_BASE+'/api/bookmarks/categories').then(function(l){BMC=unwrap(l)||[];render();}).catch(function(e){toastErr(e);});
  }else render();
}

export function submitCrudForm(){
  var def=CRUD_DEFS[FORM_K];if(!def)return;
  var pl={};
  for(var i=0;i<def.fields.length;i++){
    var f=def.fields[i],el=document.getElementById('cf_'+f.k);
    if(!el)continue;
    var v=el.value;
    if(f.t==='number')v=+v||0;
    else if(f.t==='list')v=v.split(/[,，]/).map(function(x){return x.trim();}).filter(Boolean);
    else v=v.trim();
    if(f.bool&&v!=='')v=(v===true||v==='true');
    if(f.req&&!v&&f.t!=='number'){toast(f.l+' 为必填');return;}
    if(f.auto&&!v)v=slugify((document.getElementById('cf_name')||{}).value||(document.getElementById('cf_title')||{}).value);
    if(v!==''||f.t==='number')pl[f.k]=v;
  }
  var body=pl,sendOpts={method:FORM_ID?'PUT':'POST',body:JSON.stringify(pl)};
  if(def.form){var fd=new FormData();def.fields.forEach(function(f){var el=document.getElementById('cf_'+f.k);if(el&&el.value!=='')fd.append(f.k,el.value.trim());});body=fd;sendOpts={method:FORM_ID?'PUT':'POST',body:fd};}
  var done=function(msg){toast(msg);closeSub('pg-crud-form');
    if(FORM_K==='albums')loadAlbums();
    else if(FORM_K==='chatters')loadMoments();
    else if(FORM_K==='music')fetchProtoMusic();
    else if(FORM_K!=='bms')loadCrud(FORM_K);
    if(FORM_K==='bmc'||FORM_K==='bms')loadBookmarks();
    else if(CRUD_K)loadCrud(CRUD_K);
    loadDash();};
  if(FORM_ID)jfetch(API_BASE+def.api+'/'+FORM_ID,sendOpts).then(function(){done('已保存');}).catch(toastErr);
  else jfetch(API_BASE+def.api,sendOpts).then(function(){done('已创建');}).catch(toastErr);
}

export function loadBookmarks(){
  var h=document.getElementById('crudList');if(!h)return;
  h.innerHTML=emptyCard('加载中…');
  Promise.all([jfetch(API_BASE+'/api/bookmarks/categories').then(unwrap),jfetch(API_BASE+'/api/bookmarks/sites').then(unwrap)])
    .then(function(rs){
      var cats=rs[0]||[],sites=rs[1]||[];
      BMC=cats;CRUD_DATA['bmc']=cats;CRUD_DATA['bms']=sites;
      if(!cats.length){h.innerHTML=emptyCard('暂无收藏夹 · 点右上「＋ 新建」');return;}
      h.innerHTML=cats.map(function(c){
        var ss=sites.filter(function(x){return x.category_id===c.id;});
        return '<div class="card" style="padding:12px 14px">'+
          '<div style="display:flex;align-items:center;gap:10px"><div class="crud-ic">'+esc(c.icon&&c.icon.length<=2?c.icon:'📁')+'</div>'+
          '<div style="flex:1"><div style="font-size:14.5px;font-weight:700">'+esc(c.name)+'</div><div style="font-size:11.5px;color:var(--ink-3)">'+ss.length+' 个站点</div></div>'+
          '<span class="crud-act" onclick="openCrudForm(\'bmc\','+c.id+')">✏️</span>'+
          '<span class="crud-act" style="color:var(--red)" onclick="delCrud(\'bmc\','+c.id+')">🗑</span></div>'+
          ss.map(function(sm){
            return '<div class="crud-row" style="padding:8px 0 0 44px"><div style="flex:1;min-width:0">'+CRUD_DEFS.bms.row(sm)+'</div>'+
              '<span class="crud-act" onclick="openCrudForm(\'bms\','+sm.id+')">✏️</span>'+
              '<span class="crud-act" style="color:var(--red)" onclick="delCrud(\'bms\','+sm.id+')">🗑</span></div>';
          }).join('')+
          '<div class="crud-row" style="padding:8px 0 0 44px"><span style="font-size:12.5px;color:var(--accent);font-weight:700;cursor:pointer" onclick="openBmsForm('+c.id+')">＋ 添加站点</span></div></div>';
      }).join('');
    }).catch(function(e){lerrEl(h,e);});
}

export function openBmsForm(cid){openCrudForm('bms',null,cid);}

export function loadVisitors(){
  var h=document.getElementById('crudList');if(!h)return;
  jfetch(API_BASE+'/api/visitors?size=100').then(function(j){
    var arr=unwrap(j)||[];
    h.innerHTML='<div class="card" style="padding:12px 14px;display:flex;align-items:center;gap:10px">'+
      '<div style="flex:1;font-size:13px;font-weight:700">共 '+arr.length+' 条访问记录</div>'+
      '<span class="crud-act" style="color:var(--red)" onclick="clearVisitors()">清空</span></div>'+
      (arr.length?'':emptyCard('暂无访客记录'))+
      arr.map(function(v){
        return '<div class="card" style="padding:4px 14px"><div class="crud-row"><div class="crud-ic">'+(v.is_mobile?'📱':'💻')+'</div>'+
          '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600">'+esc(v.ip)+'</div>'+
          '<div style="font-size:11.5px;color:var(--ink-3)">'+esc([v.country,v.city].filter(Boolean).join(' · ')||'未知地区')+' · '+esc(v.browser||'?')+' / '+esc(v.os||'?')+'</div>'+
          '<div style="font-size:11.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(v.path||'/')+' · '+fdate(v.created_at)+'</div></div>'+
          '<span class="crud-act" style="color:var(--red)" onclick="delVisitor('+v.id+')">🗑</span></div></div>';
      }).join('');
  }).catch(function(e){lerrEl(h,e);});
}

export function delVisitor(id){jfetch(API_BASE+'/api/visitors/'+id,{method:'DELETE'}).then(function(){toast('已删除');loadVisitors();loadDash();}).catch(toastErr);}

export function clearVisitors(){
  askConfirm('清空全部访客记录？不可恢复').then(function(ok){
    if(!ok)return;
    jfetch(API_BASE+'/api/visitors',{method:'DELETE'}).then(function(){toast('已清空');loadVisitors();loadDash();}).catch(toastErr);
  });
}

export function moveCrud(k,id,dir){
  var arr=CRUD_DATA[k]||[];
  var i=-1;for(var x=0;x<arr.length;x++){if(arr[x].id===id){i=x;break;}}
  var j=i+dir;
  if(i<0||j<0||j>=arr.length)return;
  var a=arr[i],b=arr[j];
  var sa=a.sort||0,sb=b.sort||0;
  var na,nb;
  if(sa===sb){na=j;nb=i;}else{na=sb;nb=sa;}
  var def=CRUD_DEFS[k];
  Promise.all([
    jfetch(API_BASE+def.api+'/'+a.id,{method:'PUT',body:JSON.stringify({sort:na})}),
    jfetch(API_BASE+def.api+'/'+b.id,{method:'PUT',body:JSON.stringify({sort:nb})})
  ]).then(function(){toast('已调整排序');loadCrud(k);}).catch(toastErr);
}

export const __exports__ = { openCrudAt, gotoData, crudSegTo, crudAdd, loadCrud, delCrud, openCrudForm, submitCrudForm, loadBookmarks, openBmsForm, loadVisitors, delVisitor, clearVisitors, moveCrud };
