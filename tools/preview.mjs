import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8765);let lastBuild=0;
function build(){const sources=[...fs.readdirSync(path.join(root,'src')).filter(n=>!['cloud.js','source-original.svg','path-index.json'].includes(n)).map(n=>path.join(root,'src',n)),...fs.readdirSync(path.join(root,'assets')).map(n=>path.join(root,'assets',n))];const changed=Math.max(...sources.map(p=>fs.statSync(p).mtimeMs));if(changed>lastBuild){const r=spawnSync(process.execPath,[path.join(root,'tools','build.mjs')],{stdio:'inherit'});if(r.status!==0)throw new Error('Build failed');lastBuild=changed;}}
build();http.createServer((req,res)=>{try{if(!['/','/index.html','/.nojekyll'].includes(new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end('Not found');return;}build();res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(root,'dist','index.html')));}catch{res.writeHead(500);res.end('Build failed; inspect the terminal.');}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}\nEdit src/, then refresh. Ctrl+C to stop.`));
