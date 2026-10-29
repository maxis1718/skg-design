"""Build the self-contained deliverable from focused, indexed sources."""
from pathlib import Path
import json,base64,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'src'
def read(name):return (src/name).read_text(encoding='utf8')
def data_image(name):return 'data:image/png;base64,'+base64.b64encode((ROOT/'assets'/name).read_bytes()).decode()
project=json.loads(read('project.json'))
assert len(project["rooms"])==11
assert len({o['id'] for o in project['objects']})==len(project['objects'])
assert all(o['room_id'] in {r['id'] for r in project['rooms']} for o in project['objects'])
for o in project['objects']:
    assert all(o['dimensions'][k]['cm']>0 for k in ('w','d'))
    assert o['bounds_pt'][0]<o['bounds_pt'][2] and o['bounds_pt'][1]<o['bounds_pt'][3]
kid_source=read('furniture-kid.svg')
# 2026-10-20 kid-room bed removed (user: no double bed; spec to come): bed frame, pillows, blanket fold and headboard band (source paths 666-688)
# are dropped from the kid-room copy only; the guest room keeps the full mirrored symbol.
kid_bed=re.findall(r'<path\b[^>]*data-source-path="(?:66[6-9]|67\d|68[0-8])"[^>]*/>',kid_source)
assert len(kid_bed)==23
kid=kid_source
for fragment in kid_bed:kid=kid.replace(fragment,'')
# R27: NE room (study) = mirrored wardrobe only; guest schemes A/B in the south room (furniture-guest-plan-a/-b.svg).
guest_wardrobe=kid_source
for fragment in kid_bed:guest_wardrobe=guest_wardrobe.replace(fragment,'')
old_study=read('furniture-guest.svg')
# R20: desk front (129) and both chairs (646-665, 808-827) removed; only the 120x60 cabinet stays, rotated 180°.
study_drop=re.findall(r'<path\b[^>]*data-source-path="(?:129|64[6-9]|65\d|66[0-5]|80[89]|81\d|82[0-7])"[^>]*/>',old_study)
assert len(study_drop)==41
study=old_study
for fragment in study_drop:study=study.replace(fragment,'')
furniture=f'<g data-layout="kid-original">{kid}</g>\n<g id="layout-a-geometry"><g data-layout="guest-mirrored" transform="matrix(-1 0 0 1 693.36 0)">'+guest_wardrobe+'</g><g id="guest-plan-a" data-guest-plan="guest-a">'+read('furniture-guest-plan-a.svg')+'</g><g id="guest-plan-b" data-guest-plan="guest-b" hidden>'+read('furniture-guest-plan-b.svg')+'</g><g data-guest-plan="guest-c" hidden>'+read('furniture-guest-plan-c.svg')+'</g><g id="kid-study-geometry">'+read('furniture-kid-study.svg')+'</g></g><g id="layout-b-geometry" hidden>'+read('furniture-layout-b.svg')+'<g data-guest-plan="guest-a">'+read('furniture-guest-plan-lb-a.svg')+'</g><g data-guest-plan="guest-b" hidden>'+read('furniture-guest-plan-lb-b.svg')+'</g><g data-guest-plan="guest-c" hidden>'+read('furniture-guest-plan-lb-c.svg')+'</g></g>'
html=read('shell.html')
plan=read('plan-paths.svg')
sink=re.findall(r'<path\b[^>]*data-source-path="(?:75[3-9]|76\d|77\d)"[^>]*/>',plan)
hob=re.findall(r'<path\b[^>]*data-source-path="(?:78\d|79\d|80[0-6])"[^>]*/>',plan)
assert len(sink)==27 and len(hob)==27
for fragment in sink+hob:plan=plan.replace(fragment,'')
# R07 dining redraw: original table (543) and 8 chairs (519-591) replaced by src/furniture-living.svg.
dining=re.findall(r'<path\b[^>]*data-source-path="(?:519|5[2-8]\d|59[01])"[^>]*/>',plan)
assert len(dining)==73
for fragment in dining:plan=plan.replace(fragment,'')
# R08 TV wall redraw: sofa (592-610), console outline + rear band (56, 615-620, 952), TV symbol (637-643), corner circle (738) replaced by src/furniture-living.svg.
tv_wall=re.findall(r'<path\b[^>]*data-source-path="(?:59[2-9]|60\d|610|56|61[5-9]|620|952|63[7-9]|64[0-3]|738)"[^>]*/>',plan)
assert len(tv_wall)==35
for fragment in tv_wall:plan=plan.replace(fragment,'')
# R21: study (440/441) and bath-2 (510/511) swing doors replaced by sliding doors (src/furniture-doors.svg).
swing_doors=re.findall(r'<path\b[^>]*data-source-path="(?:44[01]|51[01])"[^>]*/>',plan)
assert len(swing_doors)==4
for fragment in swing_doors:plan=plan.replace(fragment,'')
# Helper room: source bed symbol (714-727: body, pillow, blanket, headboard) replaced by src/furniture-helper.svg.
helper_bed=re.findall(r'<path\b[^>]*data-source-path="(?:71[4-9]|72[0-7])"[^>]*/>',plan)
assert len(helper_bed)==14
for fragment in helper_bed:plan=plan.replace(fragment,'')
# Master bed: source KING SIZE symbol (329–345: frame, headboard line, pillows) replaced by src/furniture-master.svg (bed 220 × 200 + co-sleeper).
master_bed=re.findall(r'<path\b[^>]*data-source-path="(?:329|33\d|34[0-5])"[^>]*/>',plan)
assert len(master_bed)==17
for fragment in master_bed:plan=plan.replace(fragment,'')
furniture+='\n<g id="kitchen-sink-geometry">'+''.join(sink)+'</g><g id="kitchen-hob-geometry">'+''.join(hob)+'</g><g id="appliance-tower-geometry" hidden></g><g id="living-geometry">'+read('furniture-living.svg')+'</g><g id="door-geometry">'+read('furniture-doors.svg')+'</g><g id="balcony-geometry">'+read('furniture-balcony.svg')+'</g><g id="helper-geometry">'+read('furniture-helper.svg')+'</g><g id="master-geometry">'+read('furniture-master.svg')+'</g>'
replacements={'STYLE':read('style.css'),'PLAN':plan,'FURNITURE':furniture,'DATA':json.dumps(project,ensure_ascii=False,separators=(',',':')).replace('</','<\\/'),'ELEVATION':read('elevation.js'),'I18N':json.dumps(json.loads(read('i18n.json')) if (src/'i18n.json').exists() else {'en':{}},ensure_ascii=False,separators=(',',':')).replace('</','<\\/'),'APP':read('app.js')}
for key,value in replacements.items():html=html.replace('/*__'+key+'__*/',value)
html=html.replace('/*__SOURCE_NEW__*/',data_image('layout-source.png')).replace('/*__SOURCE_OLD__*/',data_image('summary-original.png'))
assert not re.search(r'/\*__[A-Z_]+__\*/',html),'Unresolved template slot'
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)="https?://',html),'Standalone file must not depend on network'
out=ROOT/'dist'/'index.html';out.parent.mkdir(exist_ok=True);out.write_text(html,encoding='utf8')
manifest={'output':'dist/index.html','sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'size_bytes':out.stat().st_size,'rooms':len(project['rooms']),'objects':len(project['objects'])}
(ROOT/'qa'/'build-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
source_manifest=[]
for filename,page in [('Floor plan scale.pdf',1),('Summary.pdf',4)]:
    p=ROOT.parent/filename
    if p.exists():source_manifest.append({'file':filename,'used_page':page,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'qa'/'source-manifest.json').write_text(json.dumps(source_manifest,indent=2),encoding='utf8')
lines=['# Focused record index','', 'Source: `src/project.json`. Retrieve a single record with `python tools/records.py show room study` or `python tools/records.py show object fridge`. Edit sources; rebuild `dist/index.html` with `python tools/build.py`.','','## Rooms','','| ID | 名稱 | 主要區尺寸 cm |','| --- | --- | --- |']
for r in project['rooms']:
    p=r['parts'][0];lines.append(f'| `{r["id"]}` | {r["name"]} | ≈ {p["horizontal_cm"]} × {p["vertical_cm"]} |')
lines+=['','## Objects','','| Code | Stable ID | 名稱 | 圖面 W × D cm |','| --- | --- | --- | --- |']
for o in project['objects']:
    w=o['dimensions']['w']['cm'];d=o['dimensions']['d']['cm'];lines.append(f'| {o["code"]} | `{o["id"]}` | {o["name"]} | {w} × {d} |')
lines+=['','All actual W/D/H/brand/model fields are initially null. Keep source geometry and semantic dimension values synchronized. Full measurement provenance is under `reference/`.','','Geometry edits:','- Guest mirroring: `tools/build.py`, `data-layout="guest-mirrored"`, matrix(-1,0,0,1,693.36,0).','- Rooms (R27): NW room = `kid` (bed removed, keeps the original 120×60 wardrobe `kid-wardrobe`); NE room = `study` (mirrored original wardrobe `study-wardrobe`, massage chair (backrest east, reclines west) + 100 desk + 27" monitor in `src/furniture-kid-study.svg`); south room = `guest`.','- Guest (R27): schemes A/B in `src/furniture-guest-plan-a.svg` / `-b.svg` (MALM Queen 15 off the window for the curtain; A = wardrobe 49 + desk on the west wall, B = wardrobe 90 + desk on the north wall). Toggle: roomVersions.guest, objects carry onlyGuest, URL ?guest=a|b.','- Doors (R21): NE/NW rooms keep swing doors; south room and bath-2 use corridor-side sliding doors in `src/furniture-doors.svg`.','- Fixed physical geometry: `src/plan-paths.svg`; native PDFs are not required for ordinary note/actual-size edits.']
(ROOT/'RECORD_INDEX.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps(manifest))
