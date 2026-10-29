import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
const project=JSON.parse(read('project.json'));
if(project.rooms.length!==11||new Set(project.objects.map(o=>o.id)).size!==project.objects.length)throw new Error('Invalid record index');
const kidSource=read('furniture-kid.svg');
// 2026-10-20 kid-room bed removed (user: no double bed; spec to come): bed frame, pillows, blanket fold and headboard band (source paths 666–688)
// are dropped from the kid-room copy only; the guest room keeps the full mirrored symbol.
const kidBed=[...kidSource.matchAll(/<path\b[^>]*data-source-path="(?:66[6-9]|67\d|68[0-8])"[^>]*\/>/g)].map(m=>m[0]);
if(kidBed.length!==23)throw new Error('Kid-bed source index changed');
let kid=kidSource;for(const fragment of kidBed)kid=kid.replace(fragment,'');
// R23 (2026-10-25): guest room re-planned — the mirrored kid bed (666–688) and wardrobe (429–437) are dropped from the guest copy and
// redrawn unmirrored in src/furniture-guest-plan.svg (Queen 150×200 + desk niche 70 + wardrobe 50).
// R27: rooms re-assigned — NE room (mirrored symbol, wardrobe only, bed 666–688 dropped) is now the study; guest schemes A/B are drawn in the south room (furniture-guest-plan-a/-b.svg).
let guestWardrobe=kidSource;for(const fragment of kidBed)guestWardrobe=guestWardrobe.replace(fragment,'');
// R22 (2026-10-25): the old study (bottom room) became the kid room and is empty, so the rotated study group is no longer drawn.
// R20 (2026-10-24): user removed the study desk and both chairs (massage chair goes by the window); keep only the 120×60 cabinet (614, 644, 645).
const studySource=read('furniture-guest.svg');
const studyDrop=[...studySource.matchAll(/<path\b[^>]*data-source-path="(?:129|64[6-9]|65\d|66[0-5]|80[89]|81\d|82[0-7])"[^>]*\/>/g)].map(m=>m[0]);
if(studyDrop.length!==41)throw new Error('Study desk/chair source index changed');
let study=studySource;for(const fragment of studyDrop)study=study.replace(fragment,'');
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
// R21: study (440 arc, 441 leaf) and bath-2 (510 arc, 511 leaf) swing doors → sliding doors in src/furniture-doors.svg; jambs kept.
const swingDoors=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:44[01]|51[01])"[^>]*\/>/g)].map(m=>m[0]);
if(swingDoors.length!==4)throw new Error('Door source index changed');
for(const fragment of swingDoors)plan=plan.replace(fragment,'');
// Helper room: source bed symbol (714–727: body, pillow, blanket, headboard) → built-in platform bed in src/furniture-helper.svg.
const helperBed=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:71[4-9]|72[0-7])"[^>]*\/>/g)].map(m=>m[0]);
if(helperBed.length!==14)throw new Error('Helper bed source index changed');
for(const fragment of helperBed)plan=plan.replace(fragment,'');
// Master bed: source KING SIZE symbol (329–345) → bed 220 × 200 + co-sleeper in src/furniture-master.svg.
const masterBed=[...plan.matchAll(/<path\b[^>]*data-source-path="(?:329|33\d|34[0-5])"[^>]*\/>/g)].map(m=>m[0]);
if(masterBed.length!==17)throw new Error('Master bed source index changed');
for(const fragment of masterBed)plan=plan.replace(fragment,'');
const furniture=`<g data-layout="kid-original">${kid}</g><g id="layout-a-geometry"><g data-layout="guest-mirrored" transform="matrix(-1 0 0 1 693.36 0)">${guestWardrobe}</g><g id="guest-plan-a" data-guest-plan="guest-a">${read('furniture-guest-plan-a.svg')}</g><g id="guest-plan-b" data-guest-plan="guest-b" hidden>${read('furniture-guest-plan-b.svg')}</g><g data-guest-plan="guest-c" hidden>${read('furniture-guest-plan-c.svg')}</g><g id="kid-study-geometry">${read('furniture-kid-study.svg')}</g></g><g id="layout-b-geometry" hidden>${read('furniture-layout-b.svg')}<g data-guest-plan="guest-a">${read('furniture-guest-plan-lb-a.svg')}</g><g data-guest-plan="guest-b" hidden>${read('furniture-guest-plan-lb-b.svg')}</g><g data-guest-plan="guest-c" hidden>${read('furniture-guest-plan-lb-c.svg')}</g></g><g id="kitchen-sink-geometry">${sink.join('')}</g><g id="kitchen-hob-geometry">${hob.join('')}</g><g id="appliance-tower-geometry" hidden></g><g id="living-geometry">${read('furniture-living.svg')}</g><g id="door-geometry">${read('furniture-doors.svg')}</g><g id="balcony-geometry">${read('furniture-balcony.svg')}</g><g id="helper-geometry">${read('furniture-helper.svg')}</g><g id="master-geometry">${read('furniture-master.svg')}</g>`;
let html=read('shell.html');
for(const[key,value]of Object.entries({STYLE:read('style.css'),PLAN:plan,FURNITURE:furniture,DATA:JSON.stringify(project).replaceAll('</','<\\/'),ELEVATION:read('elevation.js'),I18N:fs.existsSync(path.join(root,'src','i18n.json'))?JSON.stringify(JSON.parse(read('i18n.json'))).replaceAll('</','<\\/'):'{"en":{}}',APP:read('app.js')}))html=html.replace('/*__'+key+'__*/',()=>value);
for(const[key,file]of [['NEW','layout-source.png'],['OLD','summary-original.png']])html=html.replaceAll('/*__SOURCE_'+key+'__*/','data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',file)).toString('base64'));
if(/\/\*__[A-Z_]+__\*\//.test(html))throw new Error('Unresolved template');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.mkdirSync(path.join(root,'qa'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','index.html'),html);fs.writeFileSync(path.join(root,'dist','.nojekyll'),'');
fs.writeFileSync(path.join(root,'qa','build-manifest.json'),JSON.stringify({revision:project.project.revision,objects:project.objects.length,rooms:project.rooms.length,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')},null,2));
console.log(`Built dist/index.html · ${project.project.revision} · ${project.rooms.length} rooms · ${project.objects.length} objects`);
