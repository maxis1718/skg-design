import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const d=JSON.parse(fs.readFileSync(path.join(root,'src','project.json'),'utf8'));
assert.equal(d.rooms.length,7);assert.equal(new Set(d.objects.map(o=>o.id)).size,d.objects.length);
for(const o of d.objects){assert(d.rooms.some(r=>r.id===o.room_id));const b=o.bounds_pt;assert(b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3]);for(const axis of ['w','d'])assert(o.dimensions[axis].cm>0);}
for(const v of d.roomVersions.kitchen){for(const[id,p]of Object.entries(v.objectOverrides)){assert(d.objects.some(o=>o.id===id));assert(p.bounds_pt[0]<p.bounds_pt[2]&&p.bounds_pt[1]<p.bounds_pt[3]);}}
new vm.Script(fs.readFileSync(path.join(root,'src','app.js'),'utf8'));
const html=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');assert(!html.includes('每一寸，都有依據。'));assert(!/class="[^"]*unit-stamp/.test(html));assert(!html.includes('/*__'));assert(!html.includes('SKG_CLOUD_ENABLED=true'));
assert(html.includes('id="kitchen-sink-geometry"')&&html.includes('id="kitchen-hob-geometry"'));assert(html.includes('上層 · 氣炸鍋'));assert(html.includes('中層 · 微波爐'));assert(html.includes('下層 · 電鍋'));
console.log('PASS: source records, kitchen variants, script syntax, compact header and static build.');
