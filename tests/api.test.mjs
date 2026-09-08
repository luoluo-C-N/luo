import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
let createApi;
try { ({createApi}=await import('../src/api.js')); } catch {}
test('API adapter is available',()=>assert.equal(typeof createApi,'function'));
test('real HTTP envelopes, raw data, auth expiry, errors and timeout',{skip:!createApi},async()=>{
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/slow')return;
  if(req.url==='/expired'){res.statusCode=401;return res.end('{"detail":"expired"}');}
  if(req.url==='/bad'){res.statusCode=422;return res.end('{"detail":[{"msg":"title required"}]}');}
  if(req.url==='/business')return res.end('{"code":1,"message":"denied"}');
  if(req.url==='/raw')return res.end('[{"id":1}]');
  if(req.url==='/auth')return res.end(JSON.stringify({token:req.headers.authorization}));
  if(req.url==='/count')return res.end('{"code":0,"count":9}');
  res.end('{"code":0,"data":{"value":42}}');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let expired=0;const baseUrl=`http://127.0.0.1:${server.address().port}`;
 const api=createApi({baseUrl,token:()=> 'test-token',onUnauthorized:()=>expired++,timeoutMs:80});
 try {
  assert.deepEqual(await api.request('/raw'),[{id:1}]);
  assert.deepEqual(await api.request('/wrapped'),{value:42});
  assert.equal((await api.request('/auth')).token,'Bearer test-token');
  assert.equal((await api.request('/count')).count,9);
  await assert.rejects(api.request('/expired'),/expired/);assert.equal(expired,1);
  await assert.rejects(api.request('/bad'),/title required/);
  await assert.rejects(api.request('/business'),/denied/);
  await assert.rejects(api.request('/slow'),/超时/);
  await assert.rejects(api.request('https://example.com/steal'),/相对/);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
