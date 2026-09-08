import test from 'node:test';
import assert from 'node:assert/strict';
let createEditor;
try{({createEditor}=await import('../src/editor.js'))}catch{}
test('article editor exists',()=>assert.equal(typeof createEditor,'function'));
test('new draft becomes update after first save, failures preserve local draft',{skip:!createEditor},async()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const writes=[];let fail=false;
 const api={request:async(path,options)=>{if(fail)throw Error('offline');writes.push({path,...options});return{id:10,...options.body}}};
 const editor=createEditor({api,storage});editor.change({title:'你好',content:'正文',tags:' one, one, two '});
 await editor.save('draft');assert.equal(writes[0].method,'POST');assert.equal(writes[0].body.status,'draft');assert.deepEqual(writes[0].body.tags,['one','two']);
 editor.change({content:'新正文'});await editor.save('published');assert.equal(writes[1].method,'PUT');assert.equal(writes[1].path,'/api/posts/10');
 fail=true;editor.change({content:'离线内容'});await assert.rejects(editor.save('draft'),/offline/);assert.equal(editor.state.content,'离线内容');assert.equal(editor.state.synced,false);
 const resumed=createEditor({api,storage});assert.equal(resumed.restore(10),true);assert.equal(resumed.state.content,'离线内容');
});
test('existing article keeps unknown category and stable slug',{skip:!createEditor},async()=>{
 let body;const editor=createEditor({api:{request:async(p,o)=>(body=o.body,{id:3,...o.body})},storage:{getItem:()=>null,setItem(){},removeItem(){}}});
 editor.load({id:3,title:'Original',slug:'existing',content:'body',tags:[],category:'Keep'});
 editor.change({title:'Changed'});await editor.save('draft');assert.equal(body.slug,'existing');assert.equal(Object.hasOwn(body,'category_id'),false);
 editor.change({category_id:5});await editor.save('published');assert.equal(body.category_id,5);
});
