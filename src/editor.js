export function createEditor({api,storage=localStorage,onChange=()=>{}}){
 let state=blank(),busy=false;
 function blank(){return {id:null,title:'',slug:'',description:'',content:'',tags:'',cover:'',status:'draft',synced:false};}
 function key(id=state.id){return `pocket.draft.${id??'new'}`;}
 function persist(){try{storage.setItem(key(),JSON.stringify(state));}catch{state.storageError='本地空间不足，请复制正文备份';}onChange(state);}
 return {
  get state(){return state},get busy(){return busy},
  load(article=null){state={...blank(),...article,tags:Array.isArray(article?.tags)?article.tags.join(', '):article?.tags||'',synced:!!article};onChange(state);},
  restore(id=null){try{const saved=JSON.parse(storage.getItem(key(id)));if(!saved)return false;state=saved;onChange(state);return true;}catch{return false;}},
  change(values){state={...state,...values,synced:false};persist();},
  async save(status){
   if(busy)throw new Error('正在保存，请稍候');
   if(!state.title.trim())throw new Error('请先填写文章标题');
   if(!['draft','published'].includes(status))throw new Error('文章状态不正确');
   busy=true;
   const snapshot={...state};
   const slug=state.slug.trim()||`pocket-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
   const body={title:state.title.trim(),slug,description:state.description,content:state.content,cover:state.cover,tags:[...new Set(state.tags.split(/[,，]/).map(x=>x.trim()).filter(Boolean))],status,word_count:state.content.replace(/\s/g,'').length,reading_time:Math.max(1,Math.ceil(state.content.length/400))};
   if(Object.hasOwn(state,'category_id'))body.category_id=state.category_id;
   const oldKey=key();
   try{
    const result=await api.request(state.id?`/api/posts/${state.id}`:'/api/posts',{method:state.id?'PUT':'POST',body});
    const changed=Object.keys(snapshot).some(k=>snapshot[k]!==state[k]);
    state={...state,id:result.id??state.id,slug,status,synced:!changed,savedAt:new Date().toISOString()};
    if(oldKey!==key())storage.removeItem(oldKey);
    persist();return result;
   }finally{busy=false;}
  }
 };
}
