import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
for(const f of ['.env.local','.env']){try{process.loadEnvFile(f)}catch{}}
const root=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);const p=args.indexOf('--port');const port=p>-1?Number(args[p+1]):4173;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp'};

function withHelpers(res){
  res.status=(code)=>{res.statusCode=code;return res};
  res.json=(obj)=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(obj))};
  return res;
}
async function readJsonBody(req){
  const chunks=[];
  for await (const chunk of req) chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  return raw?JSON.parse(raw):{};
}

http.createServer(async (req,res)=>{
  const clean=decodeURIComponent((req.url||'/').split('?')[0]);

  if(clean==='/api/verify-recaptcha'){
    try{
      req.body=await readJsonBody(req);
      const {default:handler}=await import('./api/verify-recaptcha.js');
      await handler(req,withHelpers(res));
    }catch(err){
      withHelpers(res).status(500).json({success:false,error:'local_dev_bridge_failed'});
    }
    return;
  }

  const rel=clean==='/'?'index.html':clean.replace(/^\//,'');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)})
}).listen(port,'0.0.0.0',()=>console.log(`COMM funnel running on ${port}`));
