/** Uniform client for the existing heterogeneous Kirameku REST API. */
export function createApi({baseUrl='',token=()=>'',onUnauthorized=()=>{},timeoutMs=15000}={}) {
 const base=baseUrl.replace(/\/$/,'');
 return {async request(path,{method='GET',body,signal}={}) {
  if(!path.startsWith('/')||path.startsWith('//'))throw new Error('接口路径必须是相对路径');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error('请求超时，请检查服务器连接')),timeoutMs);
  const abort=()=>controller.abort(signal.reason);signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  const headers=new Headers({Accept:'application/json'});
  const access=typeof token==='function'?token():token;
  if(access)headers.set('Authorization',`Bearer ${access}`);
  const form=typeof FormData!=='undefined'&&body instanceof FormData;
  if(body!==undefined&&!form)headers.set('Content-Type','application/json');
  try {
   const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:form?body:JSON.stringify(body),signal:controller.signal,redirect:'error'});
   const raw=await response.text();let value;
   try{value=raw?JSON.parse(raw):null;}catch{throw new Error(`服务器返回非 JSON 响应 (${response.status})`);}
   if(response.status===401)onUnauthorized();
   const detail=value?.detail;
   const message=(Array.isArray(detail)?detail.map(v=>v.msg).join('；'):typeof detail==='string'?detail:null)||value?.message||`请求失败 (${response.status})`;
   if(!response.ok)throw Object.assign(new Error(message),{status:response.status});
   if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'code')){
    if(value.code!==0)throw new Error(message);
    return Object.hasOwn(value,'data')?value.data:value;
   }
   return value;
  }catch(error){
   if(controller.signal.aborted)throw controller.signal.reason instanceof Error?controller.signal.reason:new Error('请求已取消');
   if(error instanceof TypeError)throw new Error('无法连接服务器，请检查地址与网络');
   throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }};
}
