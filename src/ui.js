export const $=(s,root=document)=>root.querySelector(s);
export const $$=(s,root=document)=>[...root.querySelectorAll(s)];
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function message(host,text,error=false){host.innerHTML=`<div class="card pocket-state ${error?'pocket-error':''}">${escape(text)}</div>`;}
export function button(text,fn,cls=''){const b=document.createElement('button');b.type='button';b.className='pocket-button '+cls;b.textContent=text;b.onclick=fn;return b;}
export function safeUrl(value,base=location.origin){try{const u=new URL(value,base);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return '';}}
export function modal(title,body){let page=$('#pocket-dialog');if(!page){page=document.createElement('div');page.id='pocket-dialog';page.className='subpage';page.style.zIndex=95;$('.phone').append(page);}page.innerHTML=`<div class="sub-top"><button class="sub-back" aria-label="返回">‹</button><div class="sub-title">${escape(title)}</div></div><div class="sub-body">${body}</div>`;$('.sub-back',page).onclick=()=>page.classList.remove('show');page.classList.add('show');return $('.sub-body',page);}
