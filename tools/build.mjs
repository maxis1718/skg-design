import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
const project=JSON.parse(read('project.json'));
if(project.rooms.length!==7||new Set(project.objects.map(o=>o.id)).size!==project.objects.length)throw new Error('Invalid record index');
const kid=read('furniture-kid.svg'),study=read('furniture-guest.svg').replace(/<path\b[^>]*data-source-path="129"[^>]*\/>/g,'');
let plan=read('plan-paths.svg');
const sink=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:75[3-9]|76\d|77\d)"[^>]*\/>/g)].map(m=>m[0]);
const hob=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:78\d|79\d|80[0-6])"[^>]*\/>/g)].map(m=>m[0]);
if(sink.length!==27||hob.length!==27)throw new Error('Kitchen source index changed');
for(const fragment of [...sink,...hob])plan=plan.replace(fragment,'');
// R07 dining redraw: original 200×80 table (543) and 8 chairs (519–591) are replaced by src/furniture-living.svg.
const dining=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:519|5[2-8]\d|59[01])"[^>]*\/>/g)].map(m=>m[0]);
if(dining.length!==73)throw new Error('Dining source index changed');
for(const fragment of dining)plan=plan.replace(fragment,'');
// R08 TV wall redraw: sofa symbol (592–610), console outline + rear 10.2 band (56, 615–620, 952), 120 cm TV symbol (637–643)
// and the corner circle (738) are replaced by the 210×95 sofa, 3-drawer console, The Frame 75" and 5 cm feature-wall build-up in src/furniture-living.svg.
const tvWall=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:59[2-9]|60\d|610|56|61[5-9]|620|952|63[7-9]|64[0-3]|738)"[^>]*\/>/g)].map(m=>m[0]);
if(tvWall.length!==35)throw new Error('Living TV-wall source index changed');
for(const fragment of tvWall)plan=plan.replace(fragment,'');
const furniture=`<g data-layout="kid-original">${kid}</g><g data-layout="guest-mirrored" transform="matrix(-1 0 0 1 693.36 0)">${kid}</g><g data-layout="study-rotated" transform="matrix(-1 0 0 -1 693.36 496.52)">${study}</g><path data-layout="study-desk-fit" class="furnishing" d="M287.64 283.72V348.88" fill="none" stroke="currentColor" stroke-width=".36"/><g id="kitchen-sink-geometry">${sink.join('')}</g><g id="kitchen-hob-geometry">${hob.join('')}</g><g id="appliance-tower-geometry" hidden></g><g id="living-geometry">${read('furniture-living.svg')}</g>`;
let html=read('shell.html');
for(const[key,value]of Object.entries({STYLE:read('style.css'),PLAN:plan,FURNITURE:furniture,DATA:JSON.stringify(project).replaceAll('</','<\\/'),ELEVATION:read('elevation.js'),I18N:fs.existsSync(path.join(root,'src','i18n.json'))?JSON.stringify(JSON.parse(read('i18n.json'))).replaceAll('</','<\\/'):'{"en":{}}',APP:read('app.js')}))html=html.replace('/*__'+key+'__*/',()=>value);
for(const[key,file]of [['NEW','layout-source.png'],['OLD','summary-original.png']])html=html.replaceAll('/*__SOURCE_'+key+'__*/','data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',file)).toString('base64'));
if(/\/\*__[A-Z_]+__\*\//.test(html))throw new Error('Unresolved template');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.mkdirSync(path.join(root,'qa'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','index.html'),html);fs.writeFileSync(path.join(root,'dist','.nojekyll'),'');
fs.writeFileSync(path.join(root,'qa','build-manifest.json'),JSON.stringify({revision:project.project.revision,objects:project.objects.length,rooms:project.rooms.length,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')},null,2));
console.log(`Built dist/index.html · ${project.project.revision} · 7 rooms · ${project.objects.length} objects`);
