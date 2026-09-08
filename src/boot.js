/* Route legacy prototype requests through the selected server. No credential forwarding to third parties. */
window.POCKET_VERSION='0.01';
window.POCKET_BASE=(localStorage.getItem('pocket.server')||'').replace(/\/$/,'');
window.POCKET_FETCH=window.fetch.bind(window);
window.fetch=function(input,options){
 if(typeof input==='string'&&/^http:\/\/(localhost|127\.0\.0\.1):8000\//.test(input)){
  window.POCKET_BASE=(localStorage.getItem('pocket.server')||'').replace(/\/$/,'');
  input=window.POCKET_BASE+input.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/,'');
 }
 return window.POCKET_FETCH(input,options);
};

window.addEventListener('DOMContentLoaded',function(){
 import('/src/drawer-gesture.js').then(function(module){
  var surface=document.querySelector('.phone');
  if(!surface||typeof window.applyDrawer!=='function')return;
  module.installDrawerGesture({
   surface:surface,
   width:window.DW||292,
   getProgress:function(){return window.dProgress||0;},
   applyProgress:window.applyDrawer,
   settle:window.snapDrawer,
   canStart:function(event,progress){
    if(document.querySelector('.subpage.show'))return false;
    var target=event.target;
    if(progress<=0.002){
     var rect=surface.getBoundingClientRect();
     return event.clientX-rect.left<96;
    }
    if(target.closest('#drawerMask'))return true;
    if(!target.closest('#drawer'))return false;
    return !target.closest('.panel-row,.drawer-add,.drawer-row,.id-card,button,input,select,textarea,a');
   },
   onStart:function(){surface.classList.add('drawer-dragging');},
   onEnd:function(){surface.classList.remove('drawer-dragging');}
  });
 }).catch(function(error){console.error('drawer gesture unavailable',error);});
});
