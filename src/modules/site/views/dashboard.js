/** views/dashboard —— 看板（S5）。验收: SITE-FR2；hero 三格/趋势/待办 */
/* 逐字迁移自 src/prototype.js（步骤 S5）；行为变更需走评审。 */

export function heroPend(){cnt('h-pending',(PEND.cmt||0)+(PEND.msg||0)+(PEND.cht||0));cnt('td-cmt',PEND.cmt);cnt('td-msg',PEND.msg);
  var d1=document.getElementById('td-cmt-d');if(d1)d1.textContent=PEND.cmt+' 条等待处理';
  var d2=document.getElementById('td-msg-d');if(d2)d2.textContent=PEND.msg+' 条等待处理';}

export function loadDash(){
  jfetch(API_BASE+'/api/dashboard/stats').then(function(s){
    var c=(s&&s.counts)||{};
    cnt('h-visitors',c.visitors!=null?c.visitors:'—');
    cnt('h-views',c.posts!=null?c.posts:'—');
    heroPend();
    renderTrend(s);
  }).catch(function(){});
}

export function renderDist(stats){
  var box=document.getElementById('distCard');if(!box)return;
  var cats=stats.category_distribution||[];
  var brs=(stats.browser_distribution||[]).slice(0,4);
  if(!cats.length&&!brs.length){box.innerHTML='<div style="font-size:12.5px;color:var(--ink-3);padding:8px 0">暂无分布数据</div>';}
  else{
    var catTotal=cats.reduce(function(a,b){return a+(b.value||0);},0)||1;
    var seg=cats.map(function(c,i){
      var colors=['var(--accent)','#30D158','#BF5AF2','#FF9F0A','#64D2FF'];
      return '<div style="flex:'+(c.value||0)+';background:'+(colors[i%5])+';height:14px" title="'+esc(c.name)+' '+c.value+'"></div>';
    }).join('');
    var legend=cats.map(function(c,i){
      var colors=['var(--accent)','#30D158','#BF5AF2','#FF9F0A','#64D2FF'];
      return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--ink-2)"><span style="width:8px;height:8px;border-radius:2px;background:'+colors[i%5]+'"></span>'+esc(c.name)+' '+c.value+'</span>';
    }).join(' <span style="color:var(--hairline)"></span>');
    var brRows=brs.map(function(b){
      var max=brs[0].value||1;
      return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><div style="width:64px;font-size:11.5px;color:var(--ink-2)">'+esc(b.name)+'</div><div style="flex:1;height:8px;border-radius:99px;background:var(--glass)"><div style="width:'+Math.round((b.value||0)/max*100)+'%;height:100%;border-radius:99px;background:linear-gradient(90deg,#30D158,#00C7BE)"></div></div><div style="font-size:11px;color:var(--ink-3)">'+b.value+'</div></div>';
    }).join('');
    box.innerHTML='<div style="font-size:12px;color:var(--ink-2);margin-bottom:6px">文章分类分布</div>'+
      (cats.length?'<div style="display:flex;gap:2px;border-radius:7px;overflow:hidden">'+seg+'</div><div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">'+legend+'</div>':'<div style="font-size:12px;color:var(--ink-3)">—</div>')+
      '<div style="font-size:12px;color:var(--ink-2);margin:12px 0 2px">访客浏览器 TOP</div>'+brRows;
  }
  var top=(POSTS||[]).slice().sort(function(a,b){return (b.views||0)-(a.views||0);}).slice(0,5);
  var tc=document.getElementById('topCard');
  if(tc){
    tc.innerHTML='<div style="font-size:12px;color:var(--ink-2);margin-bottom:6px">热门文章 TOP5 <span style="color:var(--ink-3)">· 按浏览量</span></div>'+
      (top.length?top.map(function(p,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--hairline)">'+
          '<div style="width:20px;text-align:center;font-weight:800;font-size:13px;color:'+(i===0?'var(--orange)':'var(--ink-3)')+'">'+(i+1)+'</div>'+
          '<div style="flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.title)+'</div>'+
          '<div style="font-size:11.5px;color:var(--ink-3)">👁 '+(p.views||0)+'</div></div>';
      }).join(''):'<div style="font-size:12.5px;color:var(--ink-3)">暂无文章</div>');
  }
}

export function updCounts(){cnt('n-posts',N.posts);cnt('n-moments',N.moments);cnt('n-music',N.music);cnt('n-album',N.albums);}
export const __exports__ = { updCounts, heroPend, loadDash, renderDist };
