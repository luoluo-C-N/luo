/** shell/panels —— 多面板工作台（S7，过渡保留；目标态=导航分组壳） */
/* 逐字迁移自 src/prototype.js（步骤 S7）；行为变更需走评审。 */

export function persistPins(){try{localStorage.setItem('panelPins',JSON.stringify(Object.keys(panels).filter(function(k){return panels[k].pinned;})));}catch(e){}}

export function savePanelSkins(){try{localStorage.setItem('panelSkins',JSON.stringify(panelSkins));}catch(e){}}

export function setPanelIcon(k,v){panelSkins[k]=panelSkins[k]||{};panelSkins[k].icon=v;savePanelSkins();renderPanels();}

export function setPanelColor(k,ci){panelSkins[k]=panelSkins[k]||{ci:0};panelSkins[k].ci=ci;panelSkins[k].bg=PANEL_COLORS[ci%PANEL_COLORS.length];savePanelSkins();renderPanels();toast('配色已更新');}

export function renderPanels(){
  openRow=null;
  var list=document.getElementById('panelList');list.innerHTML='';
  var keys=Object.keys(panels).filter(function(k){return !panels[k].closed});
  var canPin=keys.length>1; /* 只剩一个面板时无需置顶 */
  /* 排序:置顶恒在最顶,其余按拖动保存的顺序 */
  keys.sort(function(a,b){
    var pa=panels[a].pinned?1:0,pb=panels[b].pinned?1:0;
    if(pa!==pb)return pb-pa;
    var ia=panelOrder.indexOf(a),ib=panelOrder.indexOf(b);
    return (ia===-1?999:ia)-(ib===-1?999:ib);
  });
  panelOrder=keys.slice();
  try{localStorage.setItem('panelOrder',JSON.stringify(panelOrder));}catch(e){}
  keys.forEach(function(k,idx){
    var p=panels[k];
    var svgPin='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>';
    var svgPause='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 5v14"/><path d="M15 5v14"/></svg>';
    var svgPlay='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/></svg>';
    var svgX='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
    var row=document.createElement('div');
    row.className='panel-row sg'+(p.enabled?'':' off');
    row.style.setProperty('--i',String(idx+1));
    row.dataset.key=k;
    row.innerHTML=
      '<div class="pr-actions">'+
        (canPin?'<button class="pra pra-pin'+(p.pinned?' on':'')+'" title="置顶">'+svgPin+'</button>':'')+
        '<button class="pra pra-tg '+(p.enabled?'pra-off':'pra-on')+'" title="启用/停用">'+(p.enabled?svgPause:svgPlay)+'</button>'+
        '<button class="pra pra-x" title="关闭">'+svgX+'</button>'+
      '</div>'+
      '<div class="pr-body"><div class="ic" style="background:'+p.bg+'">'+p.icon+'</div>'+
        '<div class="pr-name">'+p.name+'</div>'+
        (p.pinned?'<span class="pin-tag">置顶</span>':'')+
        (curPanel===k?'<span class="dot-cur"></span>':'')+
      '</div>';
    var body=row.querySelector('.pr-body'),acts=row.querySelector('.pr-actions');
    var sx=0,syY=0,dx=0,drag=false,moved=false,lpTimer=null,reorder=null;
    var ROWH=74;
    function rowList(){return [...list.children];}
    function pinnedRowExists(){
      return rowList().some(function(r){var kk=r.dataset.key;return panels[kk]&&panels[kk].pinned;});
    }
    function setX(v){
      dx=v;
      var r=Math.max(0,Math.min(1,-v/ACT));
      if(r<=0.001){body.style.opacity=''}else{body.style.opacity=String(1-0.84*r)}
      acts.style.opacity=String(r);
      acts.style.transform='translateX('+((1-r)*18)+'px)';
    }
    row._close=function(){row.classList.add('anim');setX(0);row.classList.remove('open')};
    body.addEventListener('pointerdown',function(e){
      drag=true;moved=false;sx=e.clientX-dx;syY=e.clientY;row.classList.remove('anim');
      try{body.setPointerCapture(e.pointerId)}catch(_){}
      /* 长按 300ms 进入拖动排序(置顶面板固定在顶,不参与拖动) */
      if(!p.pinned&&list.children.length>1){
        lpTimer=setTimeout(function(){
          reorder={sy:syY,from:rowList().indexOf(row),cur:rowList().indexOf(row)};
          row.classList.add('dragging');
          body.style.touchAction='none';
        },300);
      }
    });
    body.addEventListener('pointermove',function(e){
      if(lpTimer&&!reorder&&(Math.abs(e.clientX-sx-dx)>8||Math.abs(e.clientY-syY)>10)){clearTimeout(lpTimer);lpTimer=null;}
      if(reorder){
        moved=true;
        var dy=e.clientY-reorder.sy;
        row.style.transform='translateY('+dy+'px) scale(1.03)';
        var n=rowList().length,min=pinnedRowExists()?1:0;
        var tgt=Math.max(min,Math.min(n-1,reorder.from+Math.round(dy/ROWH)));
        if(tgt!==reorder.cur){
          rowList().forEach(function(r,i){
            if(r===row)return;
            r.classList.remove('shift-up','shift-down');
            if(reorder.from<tgt&&i>reorder.from&&i<=tgt)r.classList.add('shift-up');
            else if(reorder.from>tgt&&i>=tgt&&i<reorder.from)r.classList.add('shift-down');
          });
          reorder.cur=tgt;
        }
        return;
      }
      if(!drag)return;
      var v=e.clientX-sx;
      if(Math.abs(v)>8)moved=true;
      if(v>0)v=v/3;
      setX(Math.max(-ACT-8,Math.min(30,v)));
    });
    function end(){
      if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}
      if(reorder){
        /* 拖动排序收尾:写入新顺序,平滑归位 */
        var ro=reorder;reorder=null;drag=false;moved=true;
        rowList().forEach(function(r){r.classList.remove('shift-up','shift-down');});
        row.classList.remove('dragging');
        row.style.transform='';
        body.style.touchAction='';
        if(ro.cur!==ro.from){
          var order=rowList().map(function(r){return r.dataset.key;});
          var mk=order[ro.from];
          order.splice(ro.from,1);order.splice(ro.cur,0,mk);
          panelOrder=order;
          try{localStorage.setItem('panelOrder',JSON.stringify(panelOrder));}catch(_){}
          renderPanels();
          toast('顺序已调整');
        }
        return;
      }
      if(!drag)return;drag=false;row.classList.add('anim');
      if(dx<-ACT/2){
        /* 互斥:滑开这张时,其它已展开的卡片自动恢复 */
        if(openRow&&openRow!==row){openRow._close();openRow.classList.remove('open')}
        setX(-ACT);row.classList.add('open');openRow=row;
      }else{
        setX(0);row.classList.remove('open');if(openRow===row)openRow=null;
      }
    }
    body.addEventListener('pointerup',end);
    body.addEventListener('pointercancel',end);
    body.addEventListener('click',function(){
      if(moved){moved=false;return}
      if(row.classList.contains('open')){row._close();openRow=null;return}
      switchPanel(k);
    });
    var pinBtn=row.querySelector('.pra-pin');
    if(pinBtn)pinBtn.addEventListener('click',function(e){
      e.stopPropagation();
      if(!p.pinned){
        /* 置顶互斥:同一时间只有一个置顶面板 */
        Object.keys(panels).forEach(function(k){panels[k].pinned=false;});
        p.pinned=true;persistPins();renderPanels();
        toast('已置顶「'+p.name+'」· 下次启动优先打开');
      }else{
        p.pinned=false;persistPins();renderPanels();
        toast('已取消置顶');
      }
    });
    row.querySelector('.pra-tg').addEventListener('click',function(e){
      e.stopPropagation();
      if(curPanel===key&&p.enabled){toast('正在使用「'+p.name+'」，不能停用');return}
      p.enabled=!p.enabled;renderPanels();
      toast('「'+p.name+'」面板已'+(p.enabled?'启用':'停用'));
    });
    row.querySelector('.pra-x').addEventListener('click',function(e){
      e.stopPropagation();
      if(curPanel===k){toast('「'+p.name+'」正在使用，不能关闭');return}
      p.closed=true;p.enabled=false;
      row.classList.add('anim');
      row.style.height='0px';row.style.opacity='0';row.style.marginBottom='0';row.style.transform='scale(.92)';
      setTimeout(renderPanels,400);
      toast('已关闭「'+p.name+'」，可在「添加面板」恢复');
    });
    list.appendChild(row);
  });
}

export function setActiveTab(barId,scr){
  document.querySelectorAll('#'+barId+' .tab').forEach(function(t){t.classList.toggle('active',t.dataset.scr===scr);});
}

export function switchPanel(key){
  var p=panels[key];
  if(!p||p.closed||!p.enabled){toast('该面板已停用，请先左滑启用');return}
  if(curPanel===key){closeDrawer();return}
  curPanel=key;
  document.getElementById('tabbar-site').style.display='flex';
  setActiveTab('tabbar-site',p.def);
  document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active')});
  var s=document.getElementById(p.def);s.classList.add('active');s.scrollTop=0;
  closeDrawer();renderPanels();
  toast('已切换到「'+p.name+'」面板');
}

export function addPanel(){
  var closed=Object.keys(panels).filter(function(k){return panels[k].closed});
  if(closed.length){
    closed.forEach(function(k){panels[k].closed=false;panels[k].enabled=true});
    renderPanels();
    toast('已恢复 '+closed.length+' 个已关闭的面板');
  }else{
    toast('二次开发入口：在此注册新面板，拥有独立导航体系');
  }
}

export function bootDefaultPanel(){
  var avail=Object.keys(panels).filter(function(k){return panels[k].enabled&&!panels[k].closed;});
  var pinned=avail.filter(function(k){return panels[k].pinned;});
  var key=pinned.length?pinned[0]:(avail.indexOf('site')>-1?'site':(avail[0]||'site'));
  var p=panels[key];
  curPanel=key;
  document.getElementById('tabbar-site').style.display='flex';
  setActiveTab('tabbar-site',p.def);
  document.querySelectorAll('.screen').forEach(function(x){x.classList.remove('active');});
  document.getElementById(p.def).classList.add('active');
}

export const __exports__ = { persistPins, savePanelSkins, setPanelIcon, setPanelColor, renderPanels, setActiveTab, switchPanel, addPanel, bootDefaultPanel };
