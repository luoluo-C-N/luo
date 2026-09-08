import {createEditor} from './editor.js';
import {$,$$,escape,message,button} from './ui.js';
export function setupArticles(pocket){
 const host=$('#pane-content-posts');let page=1,query='',rows=[],categories=[];
 const editor=createEditor({api:pocket.api,onChange:s=>{const bar=$('#pg-editor .sync-bar');bar.textContent=s.storageError|| (s.synced?`已保存到服务器 · ${new Date(s.savedAt||Date.now()).toLocaleTimeString()}`:'已保存在本机 · 尚未同步服务器');}});
 const area=$('#pg-editor .ed-text'),title=$('#pg-editor .ed-title');
 const fields=document.createElement('div');fields.className='pocket-editor-fields';fields.innerHTML='<label>文章路径<input class="pocket-input" id="article-slug" placeholder="留空自动生成唯一地址"></label><label>摘要<input class="pocket-input" id="article-description" placeholder="文章简短介绍"></label><label>标签（逗号分隔）<input class="pocket-input" id="article-tags"></label><label>分类<select class="pocket-input" id="article-category"><option value="keep">保留原分类</option><option value="">无分类</option></select></label>';
 title.after(fields);
 const editorFooter=$('#pg-editor .sync-bar').nextElementSibling;editorFooter.textContent='正文自动保存在本机；存草稿或发布后同步服务器。';
 const mappings=[[title,'title'],[area,'content'],[$('#article-slug'),'slug'],[$('#article-description'),'description'],[$('#article-tags'),'tags']];
 mappings.forEach(([el,key])=>el.addEventListener('input',()=>editor.change({[key]:el.value})));
 $('#article-category').onchange=e=>{if(e.target.value!=='keep')editor.change({category_id:e.target.value?Number(e.target.value):null})};
 const wrapPairs=[['**','**'],['*','*'],['## ',''],['> ',''],['`','`'],['[','](https://)'],['![','](https://)'],['- ','']];
 $$('#pg-editor .ed-tb').forEach((b,i)=>{b.onclick=()=>{const [a,z]=wrapPairs[i],start=area.selectionStart,end=area.selectionEnd;area.setRangeText(a+area.value.slice(start,end)+z,start,end,'select');area.dispatchEvent(new Event('input'));area.focus();};});
 function showState(){for(const [el,key]of mappings)el.value=editor.state[key]||'';$('#article-category').value='keep';}
 window.openEditor=async(id=null)=>{
  if(!pocket.requireAuth())return;
  if(editor.busy)return;
  window.openSub('pg-editor');
  if(id){messageBar('正在加载文章…');try{editor.load(await pocket.api.request(`/api/posts/detail/${id}`));if(editor.restore(id))window.toast('已恢复本机最近的编辑');showState();}catch(e){messageBar(e.message);return;}}
  else{editor.load();if(editor.restore())window.toast('已恢复未发布草稿');showState();}
  try{categories=await pocket.api.request('/api/categories');$('#article-category').innerHTML='<option value="keep">保留原分类</option><option value="">无分类</option>'+categories.map(c=>`<option value="${c.id}">${escape(c.name)}</option>`).join('');if(Object.hasOwn(editor.state,'category_id'))$('#article-category').value=editor.state.category_id??'';}catch{}
 };
 function messageBar(text){$('#pg-editor .sync-bar').textContent=text;}
 async function save(status){if(!pocket.requireAuth())return;const buttons=$$('#pg-editor .btn-save');buttons.forEach(b=>b.disabled=true);try{await editor.save(status);window.toast(status==='published'?'文章已发布':'草稿已保存到服务器');await load();}catch(e){messageBar(`保存失败：${e.message}。正文保留在本机。`);}finally{buttons.forEach(b=>b.disabled=false);}}
 $('#pg-editor .btn-draft').onclick=()=>save('draft');$('#pg-editor .btn-pub').onclick=()=>save('published');
 async function load(){
  if(!pocket.authenticated()){message(host,'登录后查看和管理文章');return;}
  message(host,'正在读取文章…');
  try{rows=await pocket.api.request(`/api/posts?page=${page}&size=20`);render();}catch(e){message(host,e.message,true);host.append(button('重试',load));}
 }
 function render(){
  host.innerHTML='<div class="pocket-toolbar"><input class="pocket-input" id="article-search" placeholder="搜索本页文章" aria-label="搜索文章"><button class="pocket-button pocket-primary" id="article-new">写文章</button></div><div id="article-list" class="pocket-list"></div><div class="pocket-toolbar" id="article-pages"></div>';
  $('#article-search').value=query;$('#article-search').oninput=e=>{query=e.target.value;renderRows();};$('#article-new').onclick=()=>window.openEditor();
  const prev=button('上一页',()=>{page--;load();});prev.disabled=page===1;const next=button('下一页',()=>{page++;load();});next.disabled=rows.length<20;
  $('#article-pages').append(prev,document.createTextNode(`第 ${page} 页`),next,button('刷新',load));
  renderRows();
 }
 function renderRows(){const list=$('#article-list');list.innerHTML='';const filtered=rows.filter(r=>r.title.toLowerCase().includes(query.toLowerCase()));if(!filtered.length){message(list,query?'本页没有匹配文章':'还没有文章，写下第一篇吧');return;}
  for(const r of filtered){const card=document.createElement('div');card.className='card post-manage';card.innerHTML=`<div class="pm-title">${escape(r.title)}</div><div class="pocket-meta"><span class="pocket-pill">${r.status==='published'?'已发布':'草稿'}</span> · ${r.views??0} 浏览 · ${escape((r.updated_at||r.created_at||'').slice(0,10))}</div>`;const actions=document.createElement('div');actions.className='pocket-toolbar';actions.append(button('编辑',()=>window.openEditor(r.id)),button('删除',async()=>{if(!confirm(`删除文章「${r.title}」？此操作无法撤销。`))return;try{await pocket.api.request(`/api/posts/${r.id}`,{method:'DELETE'});window.toast('文章已删除');load();}catch(e){window.toast(e.message);}},'pocket-danger'));card.append(actions);list.append(card);}
 }
 return {load,editor};
}
