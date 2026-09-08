import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.env.APP_ROOT||'.');
const backend=new URL(process.env.BACKEND_URL||'http://127.0.0.1:8000');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/uploads/')){
  try{
   const headers={...req.headers};delete headers.host;delete headers.origin;
   const upstream=await fetch(new URL(req.url,backend),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req,duplex:'half',redirect:'manual',signal:AbortSignal.timeout(60000)});
   res.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([k])=>!['content-encoding','content-length','transfer-encoding'].includes(k))));
   res.end(Buffer.from(await upstream.arrayBuffer()));
  }catch{res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:'后端服务未连接，请启动 FastAPI 或检查连接设置'}));}return;
 }
 const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
 const candidates=[path.resolve(root,relative),path.resolve(root,'public',relative)];
 if(relative==='service-worker.js')candidates.push(path.resolve(root,'dist','service-worker.js'));
 const file=candidates.find(p=>p.startsWith(root+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile());
 if(!file||relative.split('/').some(x=>x.startsWith('.'))||relative.startsWith('node_modules/')||relative.endsWith('.md')){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.PORT||8787),'0.0.0.0',()=>console.log(`Pocket app http://localhost:${server.address().port} → ${backend.origin}`));
