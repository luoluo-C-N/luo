import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','src'])fs.cpSync(name,path.join('dist',name),{recursive:true});
for(const name of fs.readdirSync('public'))fs.cpSync(path.join('public',name),path.join('dist',name),{recursive:true});
const assets=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(!p.endsWith('service-worker.js'))assets.push('/'+path.relative('dist',p).replaceAll('\\','/'));}}
walk('dist');
fs.writeFileSync('dist/service-worker.js',`const CACHE='pocket-0.01-${Date.now()}';const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/uploads/'))return;if(!ASSETS.includes(u.pathname)&&u.pathname!=='/')return;e.respondWith(fetch(e.request).catch(()=>caches.match(u.pathname==='/'?'/index.html':u.pathname)));});`);
console.log(`Built ${assets.length} static assets in dist`);
