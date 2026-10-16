import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const d=JSON.parse(fs.readFileSync(path.join(root,'src','project.json'),'utf8'));
assert.equal(d.rooms.length,7);assert.equal(new Set(d.objects.map(o=>o.id)).size,d.objects.length);
for(const o of d.objects){assert(d.rooms.some(r=>r.id===o.room_id));const b=o.bounds_pt;assert(b.length===4&&b.every(Number.isFinite)&&b[0]<b[2]&&b[1]<b[3]);for(const axis of ['w','d'])assert(o.dimensions[axis].cm>0);}
for(const v of d.roomVersions.kitchen){for(const[id,p]of Object.entries(v.objectOverrides)){assert(d.objects.some(o=>o.id===id));assert(p.bounds_pt[0]<p.bounds_pt[2]&&p.bounds_pt[1]<p.bounds_pt[3]);}}
new vm.Script(fs.readFileSync(path.join(root,'src','app.js'),'utf8'));
const html=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');assert(!html.includes('每一寸，都有依據。'));assert(!/class="[^"]*unit-stamp/.test(html));assert(!html.includes('/*__'));assert(!html.includes('SKG_CLOUD_ENABLED=true'));
assert(html.includes('id="kitchen-sink-geometry"')&&html.includes('id="kitchen-hob-geometry"'));assert(html.includes('上層 · 氣炸鍋'));assert(html.includes('中層 · 微波爐'));assert(html.includes('下層 · 烤吐司機'));assert(html.includes('window.SKGElevation'));
const sum=a=>a.reduce((s,b)=>s+b.h,0),E=d.elevations||{};
const checkUnits=(id,units)=>{for(const[uid,u]of Object.entries(units)){assert(Math.abs(sum(u.bands)-u.h)<0.05,id+'/'+uid+' bands must sum to unit height');for(const f of u.fronts||[])assert(f.from>=0&&f.to<=u.h+0.01&&f.from<f.to,id+'/'+uid+' front out of range');}};
const checkViews=(id,views,units)=>{for(const v of views){assert(v,id+' references a missing view');for(const r of v.units||(v.ref?[{ref:v.ref}]:[]))assert(units[r.ref],id+' view '+v.id+' missing unit '+r.ref);}};
for(const[id,e]of Object.entries(E)){
  if(e.shared){checkUnits(id,e.units);checkViews(id,e.views,e.units);continue;}
  assert(d.objects.some(o=>o.id===id),'elevation for unknown object '+id);
  if(e.alias)assert(E[e.alias]&&!E[e.alias].alias,id+' alias must point at a concrete elevation');
  const b=e.alias?{...E[e.alias],...e}:e,inc=b.include?E[b.include]:null;if(b.include)assert(inc?.shared,id+' include must be shared');
  const units={...(inc?.units||{}),...(b.units||{})},views=b.views.map(v=>typeof v==='string'?inc?.views.find(x=>x.id===v):v);
  assert(views.length&&b.states?.length&&b.spec?.length,id+' needs views, states and spec');checkUnits(id,b.units||{});checkViews(id,views,units);
}
for(const id of ['appliance-tower','master-wardrobe-left','master-wardrobe-right','kitchen-hob','dishwasher','spice-pullout','kitchen-oven'])assert(E[id],'missing elevation '+id);
const {collectKeys}=await import('./i18n-keys.mjs');const dict=JSON.parse(fs.readFileSync(path.join(root,'src','i18n.json'),'utf8')).en;
const missing=collectKeys(root).filter(k=>typeof dict[k]!=='string'||!dict[k].trim());assert(!missing.length,'Missing English for '+missing.length+' strings, e.g. '+missing.slice(0,5).join(' | '));
for(const[k,v]of Object.entries(dict)){const ph=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join();assert(ph(k)===ph(v),'Placeholder mismatch: '+k);}
assert(html.includes('id="i18n-data"')&&html.includes('data-lang="en"'),'language switch missing');
new vm.Script(fs.readFileSync(path.join(root,'src','elevation.js'),'utf8'));
console.log('PASS: source records, kitchen variants, elevations, i18n coverage, script syntax, compact header and static build.');
