import fs from 'node:fs';
import path from 'node:path';
const out='public';
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out);
const skip=new Set(['verify-recaptcha.js','dev-server.mjs','build.mjs']);
for(const f of fs.readdirSync('.')){
  if(skip.has(f)||!/\.(html|css|js|png|webp|ico|svg)$/.test(f))continue;
  fs.copyFileSync(f,path.join(out,f));
}
console.log('Static build ready');
