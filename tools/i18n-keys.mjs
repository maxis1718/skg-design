// Collects every user-facing Chinese source string that needs an English entry in src/i18n.json.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const CJK=/[　-ヿ一-鿿＀-￯]/;
export function collectKeys(root){
  const read=f=>fs.readFileSync(path.join(root,'src',f),'utf8');const keys=new Set();
  const walk=x=>{if(typeof x==='string'){if(CJK.test(x))keys.add(x);}else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(CJK.test(k))keys.add(k);walk(v);}};
  walk(JSON.parse(read('project.json')));
  // Single-quoted literals in app.js / elevation.js: after wrapping, every CJK literal is a t()/tf() key or runtime-wrapped data.
  for(const f of ['app.js','elevation.js'])for(const m of read(f).matchAll(/'((?:[^'\\\n]|\\.)*)'/g))if(CJK.test(m[1]))keys.add(m[1].replace(/\\'/g,"'"));
  const shell=read('shell.html').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'');
  for(const m of shell.matchAll(/>([^<>]+)</g)){const s=m[1].trim();if(CJK.test(s))keys.add(s);}
  for(const m of shell.matchAll(/\b(?:aria-label|placeholder|title|alt)="([^"]*)"/g))if(CJK.test(m[1]))keys.add(m[1]);
  return [...keys].sort();
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const keys=collectKeys(root);
  const dict=fs.existsSync(path.join(root,'src','i18n.json'))?JSON.parse(fs.readFileSync(path.join(root,'src','i18n.json'),'utf8')).en:{};
  const missing=keys.filter(k=>!(k in dict));
  if(process.argv.includes('--missing'))console.log(JSON.stringify(missing,null,1));else console.log(`${keys.length} keys, ${missing.length} missing`);
}
