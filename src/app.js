(() => {
'use strict';
const projectSource=JSON.parse(document.getElementById('project-data').textContent);
const I18N=(()=>{try{return JSON.parse(document.getElementById('i18n-data').textContent);}catch{return {en:{}};}})();
const langParam=()=>{const v=(new URLSearchParams(location.search).get('lang')||'').toLowerCase();return v==='en'?'en':'zh';};
let LANG=langParam();
// t(): exact-string dictionary lookup (zh source → en). Missing keys fall back to the Chinese source.
const t=s=>LANG==='en'&&typeof s==='string'?(I18N.en[s]??s):s;
const tf=(s,v={})=>t(s).replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const CJK=/[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/;
const localize=x=>typeof x==='string'?(CJK.test(x)?t(x):x):Array.isArray(x)?x.map(localize):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,localize(v)])):x;
// Whole-home layout (R30, swapped R34): internal 'layout-b' = 格局 A (guest NE, study south; default), 'layout-a' = 格局 B (base rooms: study NE / guest south). URL ?layout=a|b.
const LAYOUT_KEYS={a:'layout-b',b:'layout-a'};
let layoutId=LAYOUT_KEYS[(new URLSearchParams(location.search).get('layout')||'').toLowerCase()]||LAYOUT_KEYS.a;
function withLayout(p){
  const spec=(p.layouts||[]).find(l=>l.id===layoutId);
  if(spec?.rooms)p.rooms=p.rooms.map(r=>spec.rooms[r.id]?{...r,...spec.rooms[r.id]}:r);
  p.objects=p.objects.filter(o=>!o.onlyLayout||o.onlyLayout.includes(layoutId));
  if(spec&&spec.id!=='layout-a'&&p.roomVersions)p.roomVersions={...p.roomVersions,guest:spec.guestVersions||[]};
  return p;
}
let project=withLayout(localize(projectSource));
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:1});
const statusNames={annotated:'原圖標註',scaled:'圖面估算',design:'設計配置',fit:'配適設計'};
let elevView={},elevState='closed';
let roomId='floor', objectId=null, showDims=true, showObjects=true;
// Power & network layer (⚡): off by default, URL ?power=1 is the only state. powerId = selected point.
let showPower=new URLSearchParams(location.search).get('power')==='1', powerId=null;
// Wi-Fi scheme inside the ⚡ layer: a = Deco X50-PoE, b = UniFi U7 Lite (default). URL ?net=a|b. Points with onlyNet / onlyLayout are filtered.
let netId=(()=>{const v=(new URLSearchParams(location.search).get('net')||'').toLowerCase();return v==='a'||v==='b'?v:null;})();
// Kitchen scheme: A = kitchen-window-sink (default), B = kitchen-tower-left, original = kitchen-current. The URL (?kitchen=a|b|original) is the only selection state.
const KITCHEN_KEYS={a:'kitchen-window-sink',b:'kitchen-tower-left',original:'kitchen-current'},KITCHEN_ORDER=Object.values(KITCHEN_KEYS);
let selectedVersions={kitchen:KITCHEN_KEYS[(new URLSearchParams(location.search).get('kitchen')||'').toLowerCase()]||KITCHEN_KEYS.a};
// Guest-room scheme (R34 order): A = guest-a (loose wardrobe 70 + desk 70 × 40, default), B = guest-b (built-in wardrobe + desk), C = guest-c (narrow wardrobe + desk). URL ?guest=a|b|c.
const GUEST_KEYS={a:'guest-a',b:'guest-b',c:'guest-c'};
selectedVersions.guest=GUEST_KEYS[(new URLSearchParams(location.search).get('guest')||'').toLowerCase()]||GUEST_KEYS.a;
const room=id=>project.rooms.find(r=>r.id===id), baseObject=id=>project.objects.find(o=>o.id===id);
function kitchenVersions(){const rank=v=>{const i=KITCHEN_ORDER.indexOf(v.id);return i<0?99:i;};return [...(project.roomVersions?.kitchen||[])].sort((a,b)=>rank(a)-rank(b));}
function layoutSpec(){return (project.layouts||[]).find(l=>l.id===layoutId);}
function guestVersions(){return project.roomVersions?.guest||[];}
function guestVersion(){const vs=guestVersions();return vs.find(v=>v.id===selectedVersions.guest)||vs[0];}
function kitchenVersion(){const vs=kitchenVersions();return vs.find(v=>v.id===selectedVersions.kitchen)||vs.find(v=>v.id===KITCHEN_KEYS.a)||vs[0];}
function syncLangLinks(){$$('[data-lang]').forEach(a=>{const u=new URL(location.href);u.searchParams.set('lang',a.dataset.lang);a.href=u.pathname+u.search+u.hash;});}
function syncKitchenURL(){const key=Object.keys(KITCHEN_KEYS).find(k=>KITCHEN_KEYS[k]===kitchenVersion()?.id);if(!key)return;const u=new URL(location.href);if(u.searchParams.get('kitchen')!==key){u.searchParams.set('kitchen',key);history.replaceState(null,'',u.pathname+u.search+u.hash);}syncLangLinks();}
function object(id){const o=baseObject(id);if(!o)return;const patch=o.room_id==='kitchen'?kitchenVersion()?.objectOverrides?.[id]:null;return patch?{...o,...patch,dimensions:patch.dimensions?{...o.dimensions,...patch.dimensions}:o.dimensions}:o;}
function visibleObjects(){return project.objects.filter(o=>(!o.onlyLayouts||o.onlyLayouts.includes(kitchenVersion()?.layout))&&(!o.onlyGuest||o.onlyGuest.includes(guestVersion()?.layout))).map(o=>object(o.id));}
const actual=o=>o.actual||{};
const fieldsFor=r=>r.id==='kitchen'?kitchenVersion()?.notes||r.notes:r.id==='guest'&&guestVersion()?{...r.notes,...guestVersion().notes}:r.notes;
const note=(r,key)=>String(fieldsFor(r)?.[key]??'');
const dimension=d=>num(d.cm);
const size=o=>`${dimension(o.dimensions.w)} × ${dimension(o.dimensions.d)}`;
const roomSize=r=>{const p=r.parts[0];return `${num(p.horizontal_cm)} × ${num(p.vertical_cm)}`;};
const statuses=o=>[...new Set(Object.values(o.dimensions).map(d=>t(statusNames[d.status])))].join(' / ');
const labelPositions={living:[507,249],kitchen:[514,318],helper:[442,320],master:[230,252],kid:[318,196],study:[378,196],guest:[309,312],'master-balcony':[240,150],'living-balcony':[495,141]};
const originalSources={new:'/*__SOURCE_NEW__*/',original:'/*__SOURCE_OLD__*/'};
function svgEl(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
// A layout-specific entry 'objectId@layout' wins over the plain 'objectId' entry (e.g. kitchen scheme B = tower-left).
function elevationFor(id){
 const all=project.elevations||{};let e=all[id+'@'+kitchenVersion()?.layout]||all[id];if(!e||e.shared||!window.SKGElevation)return null;
 if(e.alias){const{alias,...own}=e;e={...all[alias],...own};}
 if(e.onlyLayouts&&!e.onlyLayouts.includes(kitchenVersion()?.layout))return null;
 if(e.include){const s=all[e.include];e={...e,units:{...(s?.units||{}),...(e.units||{})},views:e.views.map(v=>typeof v==='string'?s?.views.find(x=>x.id===v):v).filter(Boolean)};}
 return e;
}
const elevId=()=>objectId||(roomId==='guest'?guestVersion()?.elevation:null);
function elevationBlock(){
 const eid=elevId(),e=eid&&elevationFor(eid);if(!e)return '';
 const view=e.views.find(v=>v.id===elevView[eid])||e.views[0],names=view.stateNames||{};
 const list=items=>`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 // specFirst: zones of the focused unit lead the spec list (run elevations shared by several objects).
 const rank=z=>{const i=(e.specFirst||[]).indexOf(z.zone);return i<0?1e3:i;},spec=[...e.spec].sort((a,b)=>rank(a)-rank(b));
 return `<div class="elev-block" id="elevation"><div class="elev-head"><div><h3>${esc(e.title)}</h3><p class="elev-viewpoint">${esc(e.viewpoint)}</p></div><div class="elev-controls"><div class="seg" role="group" aria-label="${t('立面視圖')}">${e.views.map(v=>`<button class="tool ${v.id===view.id?'active':''}" data-elev-view="${esc(v.id)}" aria-pressed="${v.id===view.id}">${esc(v.name)}</button>`).join('')}</div><div class="seg" role="group" aria-label="${t('門片狀態')}">${e.states.map(st=>`<button class="tool ${st.id===elevState?'active':''}" data-elev-state="${esc(st.id)}" aria-pressed="${st.id===elevState}">${esc(names[st.id]||st.name)}</button>`).join('')}</div></div></div><div class="elev-grid"><figure class="elev-figure">${window.SKGElevation.render(e,view.id,elevState,t)}${e.ceiling_note?`<figcaption>${esc(e.ceiling_note)}</figcaption>`:''}</figure><div class="elev-spec">${e.risks?.length?`<div class="elev-risk-callout" role="note"><h4 class="elev-risk-title">${t('需評估')}</h4><ul class="elev-risks">${e.risks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<div class="detail-subhead"><h3>${t('分區 · 由上到下')}</h3></div>${spec.map(z=>`<div class="elev-row${(e.specFirst||[]).includes(z.zone)?' is-focus':''}"><div><b>${esc(z.zone)}</b><span>${esc(z.h)}</span></div><p>${esc(z.note)}</p></div>`).join('')}${e.hardware?.length?`<h4>${t('五金與機電')}</h4>${list(e.hardware)}`:''}${e.rationale?.length?`<h4>${t('設計說明')}</h4>${list(e.rationale)}`:''}${e.open_questions?.length?`<h4>${t('待確認')}</h4><p class="elev-open">${e.open_questions.map(esc).join(t('、'))}</p>`:''}</div></div></div>`;
}
function bindElevation(){
 $$('[data-elev-view]').forEach(b=>b.onclick=()=>{elevView[elevId()]=b.dataset.elevView;refreshElevation();});
 $$('[data-elev-state]').forEach(b=>b.onclick=()=>{elevState=b.dataset.elevState;refreshElevation();});
}
function refreshElevation(){const el=$('#elevation');if(!el)return;el.outerHTML=elevationBlock();bindElevation();}
function buildTabs(){
  $('#tabs').innerHTML=[{id:'floor',name:t('全屋'),number:'00'},...project.rooms].map(r=>`<button class="tab" role="tab" id="tab-${r.id}" aria-controls="main-panel" aria-selected="${r.id===roomId}" tabindex="${r.id===roomId?'0':'-1'}" data-room="${r.id}"><span class="tab-number">${r.number}</span>${r.name}</button>`).join('');
  $$('#tabs button').forEach((btn,i,buttons)=>{btn.addEventListener('click',()=>selectRoom(btn.dataset.room));btn.addEventListener('keydown',e=>{let k=i;if(e.key==='ArrowRight')k=(i+1)%buttons.length;else if(e.key==='ArrowLeft')k=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')k=0;else if(e.key==='End')k=buttons.length-1;else return;e.preventDefault();selectRoom(buttons[k].dataset.room);buttons[k].focus();});});
}
function buildPlan(){
  for(const r of project.rooms){
    const zone=svgEl('polygon',{points:r.polygon_pt.map(p=>p.join(',')).join(' '),'data-room':r.id,class:'room-zone'});
    zone.addEventListener('click',e=>{e.stopPropagation();selectRoom(r.id);});$('#room-zones').append(zone);
    const[x,y]=layoutSpec()?.labels?.[r.id]||labelPositions[r.id];const g=svgEl('g',{class:'room-label','data-label-room':r.id});
    g.append(svgEl('text',{x,y},r.name));
    g.append(svgEl('text',{x,y:y+4.8,class:'size'},roomSize(r)+' cm'));$('#room-labels').append(g);
  }
  const auxLabels=[['衛浴 1',216,338],['衛浴 2',401,309],['A/C',164,279],['A/C',385,340],['入口',563,394]];
  for(const[label,x,y]of auxLabels)$('#room-labels').append(svgEl('text',{x,y,class:'aux-label'},t(label)));
  for(const o of project.objects){
    const[x0,y0,x1,y1]=o.bounds_pt, attrs={x:x0,y:y0,width:x1-x0,height:y1-y0,rx:.8,'data-object':o.id};
    $('#object-fills').append(svgEl('rect',{...attrs,class:'object-fill'}));
    const hit=svgEl('rect',{...attrs,class:'object-hit','aria-label':`${o.name}${t('，')}${size(o)} cm`});
    // No native <title> here: the single custom hover label below replaces it (aria-label keeps the accessible name).
    hit.addEventListener('pointerenter',e=>showTip(e,object(o.id)));hit.addEventListener('pointermove',positionTip);hit.addEventListener('pointerleave',hideTip);
    hit.addEventListener('click',e=>{e.stopPropagation();selectObject(o.id);hideTip();});$('#object-hits').append(hit);
  }
  buildPower();
}
// ⚡ layer: points sit on fixed plan geometry (pt); room membership is computed from the current room polygons, so layout swaps need no data change.
const POWER_KINDS={socket:'插座','ceiling-power':'天花電源',camera:'攝影機',ap:'Wi-Fi AP',data:'網路孔',hub:'網路主機',curtain:'電動窗簾',switch:'智能開關',scene:'一鍵全關'};
const currentNet=()=>netId||project.electrical?.defaultNet||'b';
const powerPoints=()=>(project.electrical?.points||[]).filter(p=>(!p.onlyNet||p.onlyNet.includes(currentNet()))&&(!p.onlyLayout||p.onlyLayout.includes(layoutId)));
const powerPoint=id=>powerPoints().find(p=>p.id===id);
const powerMount=p=>p.mount==='ceiling'?t('天花'):tf('離地 {h} cm',{h:p.mount});
function inPoly(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
const powerRoom=p=>project.rooms.find(r=>inPoly(p.x,p.y,r.polygon_pt))?.id||p.room||null;
function powerGlyph(p){
  const g=svgEl('g',{class:'power-mark','data-power':p.id,transform:`translate(${p.x} ${p.y})`,tabindex:'0',role:'button','aria-label':`${p.name}${t('，')}${p.place}`});
  const O='#d9731c',B='#2f68a6',C='#24443b',V='#6a4f97';
  if(p.kind==='socket'){g.append(svgEl('circle',{r:2.6,fill:'#fff',stroke:O,'stroke-width':.75}),svgEl('path',{d:'M-.85 -1v2M.85 -1v2',stroke:O,'stroke-width':.55}));}
  else if(p.kind==='ceiling-power'){g.append(svgEl('circle',{r:2.2,fill:O}),svgEl('circle',{r:.75,fill:'#fff'}));}
  else if(p.kind==='camera'){g.append(svgEl('circle',{r:2.8,fill:C}),svgEl('circle',{r:1.15,fill:'#fff'}),svgEl('circle',{r:.5,fill:C}));}
  else if(p.kind==='ap'&&p.shape==='square'){g.append(svgEl('rect',{x:-3.1,y:-3.1,width:6.2,height:6.2,rx:1,fill:'#fff',stroke:B,'stroke-width':.75}),svgEl('circle',{r:1.5,fill:'none',stroke:B,'stroke-width':.5}),svgEl('circle',{r:.55,fill:B}));}
  else if(p.kind==='ap'){g.append(svgEl('circle',{r:3.3,fill:'#fff',stroke:B,'stroke-width':.75}),svgEl('circle',{r:1.5,fill:'none',stroke:B,'stroke-width':.5}),svgEl('circle',{r:.55,fill:B}));}
  else if(p.kind==='data'){g.append(svgEl('rect',{x:-2.3,y:-2.3,width:4.6,height:4.6,rx:.5,fill:'#fff',stroke:B,'stroke-width':.65}),svgEl('rect',{x:-1.1,y:-.7,width:2.2,height:1.5,fill:B}));}
  else if(p.kind==='curtain'){g.append(svgEl('rect',{x:-2.4,y:-2.4,width:4.8,height:4.8,rx:.9,fill:V}),svgEl('path',{d:'M-1.2 -1.1v2.2M0 -1.1v2.2M1.2 -1.1v2.2',stroke:'#fff','stroke-width':.45}),svgEl('circle',{cx:2.4,cy:-2.4,r:1.05,fill:O,stroke:'#fff','stroke-width':.3}));}
  else if(p.kind==='switch'){g.append(svgEl('rect',{x:-2.1,y:-2.1,width:4.2,height:4.2,rx:.5,fill:'#fff',stroke:V,'stroke-width':.6}),svgEl('rect',{x:-.55,y:-1.25,width:1.1,height:2.5,rx:.3,fill:V}));}
  else if(p.kind==='scene'){g.append(svgEl('rect',{x:-2.4,y:-2.4,width:4.8,height:4.8,rx:.6,fill:V}),svgEl('path',{d:'M-.95 -.75A1.3 1.3 0 1 0 .95 -.75M0 -1.5V0',fill:'none',stroke:'#fff','stroke-width':.45,'stroke-linecap':'round'}));}
  else if(p.kind==='hub'){g.append(svgEl('rect',{x:-3.3,y:-2.3,width:6.6,height:4.6,rx:.7,fill:B}),svgEl('path',{d:'M-1.8 0h.01M0 0h.01M1.8 0h.01',stroke:'#fff','stroke-width':.9,'stroke-linecap':'round'}));}
  g.append(svgEl('circle',{class:'pm-ring',r:p.kind==='ap'?4.6:4.1}),svgEl('circle',{class:'pm-hit',r:5}));
  g.addEventListener('pointerenter',e=>showTip(e,{name:p.name,code:p.code}));g.addEventListener('pointermove',positionTip);g.addEventListener('pointerleave',hideTip);
  g.addEventListener('click',e=>{e.stopPropagation();hideTip();selectPower(p.id);});
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPower(p.id);}});
  return g;
}
function buildPower(){
  const layer=$('#power-layer');if(!layer)return;layer.replaceChildren();const el=project.electrical;if(!el)return;
  const under=svgEl('g',{class:'power-under'});
  const pts=powerPoints();
  for(const p of pts){
    if(p.kind==='curtain'&&p.pocket){const[x0,y0,x1,y1]=p.pocket,vert=x1-x0<y1-y0;under.append(svgEl('rect',{class:'curtain-pocket',x:x0,y:y0,width:x1-x0,height:y1-y0}));
      for(const f of [.32,.68]){under.append(svgEl('path',{class:'curtain-track',d:vert?`M${x0+(x1-x0)*f} ${y0}V${y1}`:`M${x0} ${y0+(y1-y0)*f}H${x1}`}));}}
    if(p.kind==='ap')under.append(svgEl('circle',{cx:p.x,cy:p.y,r:85,fill:'url(#ap-glow)'}));
    if(p.kind==='camera'&&p.aim!=null){const R=46,h=45*Math.PI/180,a=p.aim*Math.PI/180,pt=k=>`${(p.x+R*Math.cos(k)).toFixed(2)} ${(p.y+R*Math.sin(k)).toFixed(2)}`;
      under.append(svgEl('path',{class:'cam-cone',d:`M${p.x} ${p.y}L${pt(a-h)}A${R} ${R} 0 0 1 ${pt(a+h)}Z`}));}
  }
  for(const r of el.runs||[])under.append(svgEl('polyline',{class:'power-run',points:r.path.map(q=>q.join(',')).join(' ')}));
  layer.append(under);
  const marks=svgEl('g',{class:'power-marks'});for(const p of pts)marks.append(powerGlyph(p));layer.append(marks);
  renderPowerLayer();
}
function renderPowerLayer(){
  const btn=$('#toggle-power');btn.classList.toggle('active',showPower);btn.setAttribute('aria-pressed',String(showPower));
  $('#power-layer').style.display=showPower?'':'none';
  $$('.power-mark').forEach(g=>g.classList.toggle('selected',g.dataset.power===powerId));
  const lg=$('#power-legend');lg.hidden=!showPower;
  lg.innerHTML=Object.entries(POWER_KINDS).map(([k,v])=>`<span><i class="pk pk-${k}"></i>${esc(t(v))}</span>`).join('')+`<span><i class="pk pk-run"></i>${esc(t('網路線'))}</span>`;
  renderNetVersion();renderSmartRecord();
}
function renderNetVersion(){
  const grp=$('#net-version-group'),seg=$('#net-version'),nets=project.electrical?.nets||[];if(!grp||!seg)return;
  grp.hidden=!showPower||!nets.length;seg.setAttribute('aria-label',t('切換網路方案'));
  seg.innerHTML=nets.map(n=>`<button type="button" class="tool ${n.id===currentNet()?'active':''}" data-net-version="${esc(n.id)}" aria-pressed="${n.id===currentNet()}" title="${esc(n.note||'')}">${esc(n.name)}</button>`).join('');
  $('#version-toolbar').hidden=$$('#version-toolbar .version-group').every(g=>g.hidden);
}
function chooseNet(id){
  if(id===currentNet()||!(project.electrical?.nets||[]).some(n=>n.id===id))return;netId=id;
  const u=new URL(location.href);u.searchParams.set('net',id);history.replaceState(null,'',u.pathname+u.search+u.hash);syncLangLinks();
  if(powerId&&!powerPoint(powerId))powerId=null;buildPower();renderInspector();
}
// 電與智能家居 record: shown under the plan on the whole-home view while ⚡ is on. `auto` sections are tables built from the visible points.
const specOf=(p,k)=>(p.specs||[]).find(s=>s[0]===k)?.[1]??'';
function recordTable(head,rows,first=false){
  return `<div class="sr-table"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i===0&&first&&c&&typeof c==='object'?`<td><button class="sr-open" data-power-open="${esc(c.id)}"><i class="pk pk-${c.kind}"></i>${esc(c.label)}</button></td>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function recordAuto(kind){
  const pts=powerPoints(),open=p=>({id:p.id,kind:p.kind,label:p.code});
  if(kind==='curtain'){const ps=pts.filter(p=>p.kind==='curtain'),ks=['軌長','軌道／馬達','馬達端','窗簾盒淨深'];
    return recordTable([t('編號'),t('位置'),...ks.map(t)],ps.map(p=>[open(p),p.place,...ks.map(k=>specOf(p,t(k))||specOf(p,k))]),true);}
  if(kind==='switch'){const ps=pts.filter(p=>p.kind==='scene'||p.kind==='switch');
    return recordTable([t('編號'),t('位置'),t('鍵數'),t('控制')],ps.map(p=>[open(p),p.place,specOf(p,t('鍵數'))||specOf(p,'鍵數'),specOf(p,t('控制'))||specOf(p,'控制')]),true);}
  if(kind==='power'){const ps=pts.filter(p=>['socket','ceiling-power','curtain'].includes(p.kind));
    return recordTable([t('編號'),t('位置'),t('類型'),t('安裝'),t('用途')],ps.map(p=>[open(p),p.place,p.kind==='curtain'?t('13A 插座 · 窗簾盒'):t(POWER_KINDS[p.kind]),powerMount(p),p.use||'']),true);}
  return '';
}
function renderSmartRecord(){
  const node=$('#smart-record');if(!node)return;const rec=project.electrical?.record;
  const on=showPower&&roomId==='floor'&&!!rec;node.hidden=!on;if(!on){node.innerHTML='';return;}
  node.innerHTML=`<div class="section-heading"><h2>${esc(rec.title)}</h2><span>${esc(rec.asof)}</span></div><nav class="sr-nav">${rec.sections.map((s,i)=>`<a href="#sr-${esc(s.id)}">${i+1}. ${esc(s.title)}</a>`).join('')}</nav>`+rec.sections.map((s,i)=>`<section class="sr-block" id="sr-${esc(s.id)}"><h3><span>${i+1}</span>${esc(s.title)}</h3>${s.table?recordTable(s.table.head,s.table.rows):''}${s.auto?recordAuto(s.auto):''}${s.text?`<ul class="sr-text">${s.text.split('\n').map(l=>`<li>${esc(l.replace(/^・/,''))}</li>`).join('')}</ul>`:''}${s.sources?.length?`<p class="power-sources">${s.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join(' · ')}</p>`:''}</section>`).join('');
  node.querySelectorAll('[data-power-open]').forEach(b=>b.onclick=()=>{selectPower(b.dataset.powerOpen);$('#main-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});});
  node.querySelectorAll('.sr-nav a').forEach(a=>a.onclick=e=>{e.preventDefault();document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({behavior:'smooth',block:'start'});});
}
function selectPower(id){
  if(!powerPoint(id))return;powerId=id;objectId=null;
  $$('.object-hit').forEach(z=>z.classList.remove('selected'));renderSelectedDimensions();
  renderPowerLayer();renderInspector();
  if(matchMedia('(max-width:900px)').matches)$('#inspector').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function powerSummary(){
  const el=project.electrical,pts=powerPoints().filter(p=>roomId==='floor'||powerRoom(p)===roomId);
  const kinds=Object.keys(POWER_KINDS).filter(k=>pts.some(p=>p.kind===k));
  const counts=kinds.map(k=>`<span><i class="pk pk-${k}"></i>${esc(t(POWER_KINDS[k]))} <b>${pts.filter(p=>p.kind===k).length}</b></span>`).join('');
  const rows=kinds.map(k=>pts.filter(p=>p.kind===k).map(p=>`<button class="power-row" data-power-open="${esc(p.id)}"><i class="pk pk-${k}"></i><span>${esc(p.name)}</span><small>${esc(p.code)}</small></button>`).join('')).join('');
  return `<h2>${esc(el.title)}</h2><div class="power-counts">${counts||esc(t('此空間沒有電與網路點位'))}</div>${roomId==='floor'?`<p class="inspector-text">${esc(el.summary)}</p>`:''}<div class="power-list">${rows}</div>${roomId==='floor'?`<p class="power-sources">${el.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>`:''}`;
}
function bindPowerRows(){$$('[data-power-open]').forEach(b=>b.onclick=()=>selectPower(b.dataset.powerOpen));}
function renderKitchenVersion(){
 const version=kitchenVersion();if(!version)return;
 $('#kitchen-version').setAttribute('aria-label',t('切換廚房方案'));
 $('#kitchen-version').innerHTML=kitchenVersions().map(v=>`<button type="button" class="tool ${v.id===version.id?'active':''}" data-kitchen-version="${esc(v.id)}" aria-pressed="${v.id===version.id}">${esc(v.name)}</button>`).join('');
 const baseline={'kitchen-sink':[462.36,336.28,479.52,350.56],'kitchen-hob':[497.64,337.24,518.88,349.12]};
 for(const[id,source]of Object.entries(baseline)){
   const target=object(id).bounds_pt,sx=(target[2]-target[0])/(source[2]-source[0]),sy=(target[3]-target[1])/(source[3]-source[1]);
   $('#'+id+'-geometry').setAttribute('transform',`translate(${target[0]} ${target[1]}) scale(${sx} ${sy}) translate(${-source[0]} ${-source[1]})`);
 }
 const towerLayouts=['window-sink','tower-left'],tower=$('#appliance-tower-geometry');tower.replaceChildren();tower.toggleAttribute('hidden',!towerLayouts.includes(version.layout));
 if(towerLayouts.includes(version.layout)){
   const[x0,y0,x1,y1]=object('appliance-tower').bounds_pt;
   tower.append(svgEl('rect',{x:x0,y:y0,width:x1-x0,height:y1-y0,fill:'#d5c2a5','fill-opacity':'.65',stroke:'#8e704c','stroke-width':'.5'}));
   tower.append(svgEl('path',{d:`M${x0+2} ${y0+5}H${x1-2}M${x0+2} ${y0+9}H${x1-2}M${x0+2} ${y0+13}H${x1-2}`,stroke:'#8e704c','stroke-width':'.4'}));
 }
 renderGuestVersion();
 $('#kitchen-version-group').hidden=roomId!=='kitchen';renderLayoutVersion();$('#version-toolbar').hidden=$$('#version-toolbar .version-group').every(g=>g.hidden);
 const visible=new Set(visibleObjects().map(o=>o.id));
 $$('.object-hit,.object-fill').forEach(el=>{const o=object(el.dataset.object);el.style.display=visible.has(o.id)?'':'none';const[x0,y0,x1,y1]=o.bounds_pt;for(const[k,v]of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))el.setAttribute(k,v);if(el.classList.contains('object-hit')){el.setAttribute('aria-label',`${o.name}${t('，')}${size(o)} cm`);}});
 if(objectId&&!visible.has(objectId)){objectId=null;try{history.replaceState(null,'',location.search+'#'+roomId);}catch(e){}}
}
function renderGuestVersion(){
 const v=guestVersion(),seg=$('#guest-version');if(!v||!seg){$('#guest-version-group').hidden=true;return;}
 seg.setAttribute('aria-label',t('切換客房方案'));
 seg.innerHTML=guestVersions().map(x=>`<button type="button" class="tool ${x.id===v.id?'active':''}" data-guest-version="${esc(x.id)}" aria-pressed="${x.id===v.id}">${esc(x.name)}</button>`).join('');
 $('#guest-version-group').hidden=roomId!=='guest';
 $$('[data-guest-plan]').forEach(g=>g.toggleAttribute('hidden',g.dataset.guestPlan!==v.layout));
 const lab=document.querySelector('[data-label-room="guest"]'),base=layoutSpec()?.labels?.guest||labelPositions.guest;if(lab&&v.label)lab.setAttribute('transform',`translate(${v.label[0]-base[0]} ${v.label[1]-base[1]})`);
}
function renderLayoutVersion(){
 const seg=$('#layout-version');if(!seg)return;seg.setAttribute('aria-label',t('切換格局'));
 seg.innerHTML=(project.layouts||[]).map(x=>`<button type="button" class="tool ${x.id===layoutId?'active':''}" data-layout-version="${esc(x.id)}" aria-pressed="${x.id===layoutId}" title="${esc(x.note||'')}">${esc(x.name)}</button>`).join('');
 $('#layout-version-group').hidden=roomId!=='floor';
 $('#layout-a-geometry')?.toggleAttribute('hidden',layoutId!=='layout-a');$('#layout-b-geometry')?.toggleAttribute('hidden',layoutId!=='layout-b');
}
function chooseLayout(id){
 if(id===layoutId||!(project.layouts||[]).some(l=>l.id===id))return;layoutId=id;
 const key=Object.keys(LAYOUT_KEYS).find(k=>LAYOUT_KEYS[k]===id),u=new URL(location.href);u.searchParams.set('layout',key);history.replaceState(null,'',u.pathname+u.search+u.hash);syncLangLinks();
 project=withLayout(localize(projectSource));
 for(const g of ['#room-zones','#room-labels','#object-fills','#object-hits'])$(g).replaceChildren();
 buildTabs();buildPlan();renderKitchenVersion();selectRoom(objectId&&!project.objects.some(o=>o.id===objectId)?roomId:roomId,{keepObject:project.objects.some(o=>o.id===objectId)});
}
function chooseGuestVersion(id){
 if(!guestVersions().some(v=>v.id===id)||id===guestVersion()?.id)return;selectedVersions.guest=id;
 const key=Object.keys(GUEST_KEYS).find(k=>GUEST_KEYS[k]===id),u=new URL(location.href);u.searchParams.set('guest',key);history.replaceState(null,'',u.pathname+u.search+u.hash);syncLangLinks();
 selectRoom(roomId,{keepObject:true});
}
function chooseKitchenVersion(id){
 if(!kitchenVersions().some(v=>v.id===id)||id===kitchenVersion()?.id)return;selectedVersions.kitchen=id;
 syncKitchenURL();selectRoom(roomId,{keepObject:true});
}
function dimensionLine(group,x1,y1,x2,y2,label,selected=false){
  const vertical=x1===x2, klass=selected?'selected-dim':'dimension-line', tklass=selected?'selected-dim-text':'dimension-text';
  const path=vertical?`M${x1-1.4} ${y1}h2.8M${x1} ${y1}V${y2}M${x2-1.4} ${y2}h2.8`:`M${x1} ${y1-1.4}v2.8M${x1} ${y1}H${x2}M${x2} ${y2-1.4}v2.8`;
  group.append(svgEl('path',{d:path,class:klass}));
  const x=vertical?x1+3:(x1+x2)/2,y=vertical?(y1+y2)/2:y1-2;
  const attrs={x,y,class:tklass};if(vertical)attrs.transform=`rotate(-90 ${x} ${y})`;
  group.append(svgEl('text',attrs,label));
}
function renderDimensions(){
  const g=$('#dimension-layer');g.replaceChildren();g.style.display=showDims?'':'none';
  if(!showDims)return;
  const ids=roomId==='floor'?['kid','guest','study','kitchen']: [roomId];
  for(const id of ids){const r=room(id),p=r.parts[0],[x0,y0,x1,y1]=p.bounds_pt;
    // Balconies: width along the inner edge, depth on the east side.
    if(id==='master-balcony'||id==='living-balcony'){const b=id==='master-balcony';dimensionLine(g,x0,b?172:124,x1,b?172:124,num(p.horizontal_cm));if(roomId!=='floor')dimensionLine(g,b?258:580,y0,b?258:580,y1,num(p.vertical_cm));continue;}
    const geo=y0<200&&x0<300?'NW':y0<200&&x0<400?'NE':y0>260&&x0<300&&['kid','study','guest'].includes(id)?'S':null;
    if(geo==='NW'||geo==='NE'){
      dimensionLine(g,x0,130,x1,130,num(p.horizontal_cm));
      if(geo==='NE'||roomId!=='floor'){const vx=geo==='NE'?x0+3:x1-3;dimensionLine(g,vx,y0,vx,y1,num(p.vertical_cm));}
    }else if(geo==='S'){
      dimensionLine(g,x0,363,x1,363,num(p.horizontal_cm));
      const vx=id==='study'?x0+3:x1-3;dimensionLine(g,vx,y0,vx,y1,num(p.vertical_cm));
    }else if(id==='kitchen'){
      dimensionLine(g,x0,365,x1,365,'320.5');
      if(roomId!=='floor')dimensionLine(g,x1-3,y0,x1-3,y1,num(p.vertical_cm));
    }else if(id==='master'){
      dimensionLine(g,x0,190,x1,190,num(p.horizontal_cm));
      dimensionLine(g,260,y0,260,y1,num(p.vertical_cm));
    }else if(id==='helper'){
      dimensionLine(g,x0,346,x1,346,num(p.horizontal_cm));
      dimensionLine(g,454,y0,454,y1,num(p.vertical_cm));
    }else if(id==='living'){
      dimensionLine(g,x0,177,x1,177,num(p.horizontal_cm));
      dimensionLine(g,603,171.64,603,281.56,'387.5');
    }
  }
  renderSelectedDimensions();
}
function renderSelectedDimensions(){
  const g=$('#selected-dimensions');g.replaceChildren();
  if(!objectId||!showDims)return;const o=object(objectId),[x0,y0,x1,y1]=o.bounds_pt;
  const horizontal=(x1-x0)*project.scale.nominal_cm_per_pt;
  const w=o.dimensions.w,d=o.dimensions.d;
  const hd=Math.abs(horizontal-w.cm)<Math.abs(horizontal-d.cm)?w:d,vd=hd===w?d:w;
  // Dining table: chairs flank the long sides and the Tripp Trapp sits at the north end, so put the width below (corridor end, no chair) and the length outside the east chairs.
  const dining=o.id==='dining-table',hy=dining?y1+7:y0-3,vx=dining?x1+7.5:x1+4;
  dimensionLine(g,x0,hy,x1,hy,dimension(hd)+' cm',true);
  const vx2=o.clearances?x0-4:vx;dimensionLine(g,vx2,y0,vx2,y1,dimension(vd)+' cm',true);
  for(const c of o.clearances||[]){const[a,b,c2,d]=c.line;dimensionLine(g,a,b,c2,d,c.label,true);}
}
// Hover label: name (+ muted code) only — sizes, status and actual fields live in the inspector after a click.
// Mouse/pen only (a touch tap selects instead). Fixed to the viewport, offset from the cursor, flipping left/up near edges.
function showTip(e,o){
  if(e.pointerType==='touch')return;
  $('#tooltip').innerHTML=`<span class="tip-name">${esc(o.name)}</span><span class="tip-code">${esc(o.code)}</span>`;
  $('#tooltip').hidden=false;positionTip(e);
}
function positionTip(e){
  const tip=$('#tooltip');if(tip.hidden)return;if(e.pointerType==='touch')return hideTip();
  const gapX=14,gapY=20,edge=8,w=tip.offsetWidth,h=tip.offsetHeight,vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
  let x=e.clientX+gapX,y=e.clientY+gapY;
  if(x+w>vw-edge)x=e.clientX-gapX-w;if(y+h>vh-edge)y=e.clientY-gapX-h;
  tip.style.left=Math.max(edge,x)+'px';tip.style.top=Math.max(edge,y)+'px';
}
function hideTip(){$('#tooltip').hidden=true;}
function selectRoom(id,{keepObject=false}={}){
  if(id!=='floor'&&!room(id))return;roomId=id;if(!keepObject){objectId=null;powerId=null;}
  $$('#tabs .tab').forEach(b=>{const selected=b.dataset.room===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  $('#main-panel').setAttribute('aria-labelledby','tab-'+id);
  // Narrow screens: the tab strip scrolls sideways; keep the active tab in view (e.g. balconies at the end).
  {const nav=$('#tabs'),tb=$('#tab-'+id);if(nav&&tb&&nav.scrollWidth>nav.clientWidth)nav.scrollLeft+=tb.getBoundingClientRect().left-nav.getBoundingClientRect().left-(nav.clientWidth-tb.offsetWidth)/2;}
  $('#drawing-title').textContent=id==='floor'?t('全屋'):room(id).name;
  $$('.room-zone').forEach(z=>{z.classList.toggle('selected',z.dataset.room===id);z.classList.toggle('dimmed',id!=='floor'&&z.dataset.room!==id);});
  $$('[data-label-room]').forEach(z=>z.classList.toggle('muted',id!=='floor'&&z.dataset.labelRoom!==id));
  const grp=objectId&&object(objectId)?.group;$$('.object-hit').forEach(z=>z.classList.toggle('selected',z.dataset.object===objectId||(!!grp&&object(z.dataset.object)?.group===grp)));
  history.replaceState(null,'','#'+(objectId?'object-'+objectId:id));
  renderKitchenVersion();renderDimensions();renderInspector();renderDetails();renderInventory();hideTip();
}
function selectObject(id,{scroll=false}={}){
  const o=object(id);if(!o)return;objectId=id;powerId=null;selectRoom(o.room_id,{keepObject:true});
  if(scroll)$('#main-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
}
function renderInspector(){
  const node=$('#inspector');node.hidden=!objectId&&roomId==='floor'&&!showPower;
  renderPowerLayer();
  if(showPower&&powerId&&!objectId&&powerPoint(powerId)){
    const p=powerPoint(powerId);
    node.innerHTML=`<p class="eyebrow">${esc(p.code)} · ${esc(t(POWER_KINDS[p.kind]))}</p><h2>${esc(p.name)}</h2><div class="inspector-note">${esc(p.place)}</div><div class="inspector-pair"><span>${t('安裝')}</span><strong>${esc(powerMount(p))}</strong></div>${p.product?`<div class="inspector-pair"><span>${t('型號')}</span><strong>${esc(p.product)}</strong></div>`:''}${(p.specs||[]).map(([k,v])=>`<div class="inspector-pair"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}<p class="inspector-text">${esc(p.notes)}</p><button class="inspector-button" id="power-back">${t('回到電與網路總覽')}</button>`;
    $('#power-back').onclick=()=>{powerId=null;renderInspector();};return;
  }
  if(objectId){
    const o=object(objectId),r=room(o.room_id),a=actual(o),dims=['w','d','h'].map(k=>a[k]),brand=[a.brand,a.model].filter(Boolean).join(' / ');
    node.innerHTML=`<p class="eyebrow">${esc(o.code)}</p><h2>${esc(o.name)}</h2><div class="big-number">${size(o)}<span>cm</span></div><div class="inspector-note">W × D · ${statuses(o)}</div>${o.source_note?`<p class="inspector-text">${esc(o.source_note)}</p>`:''}${dims.some(v=>v!=null)?`<div class="inspector-pair"><span>${t('實物')}</span><strong>${dims.map(v=>v==null?'—':num(v)).join(' × ')} cm</strong></div>`:''}${brand?`<div class="inspector-pair"><span>${t('品牌')} / ${t('型號')}</span><strong>${esc(brand)}</strong></div>`:''}<button class="inspector-button" id="return-room">${tf('回到{name}概覽',{name:r.name})}</button>`;
    $('#return-room').onclick=()=>selectRoom(r.id);return;
  }
  if(roomId==='floor'){node.innerHTML=showPower&&project.electrical?powerSummary():'';bindPowerRows();return;}
  const r=room(roomId),p=r.parts[0];
  node.innerHTML=`<div class="big-number">${roomSize(r)}<span>cm</span></div><div class="inspector-note">${esc(p.label)}</div><p class="inspector-text">${r.focus}</p>${showPower&&project.electrical?`<hr class="inspector-rule">${powerSummary()}`:''}`;bindPowerRows();
}
function renderDetails(){
  if(roomId==='floor'){
    $('#details-title').textContent=t('空間索引');
    $('#elevation-slot').innerHTML='';$('#details-content').innerHTML=`<div class="room-grid">${project.rooms.map(r=>`<button class="room-index" data-open-room="${r.id}"><h3>${r.name}</h3><div class="room-index-dim">${roomSize(r)} cm${['master','living'].includes(r.id)?t(' · 主區'):''}</div><p class="room-index-focus">${r.focus}</p></button>`).join('')}</div>`;
    $$('[data-open-room]').forEach(b=>b.onclick=()=>{selectRoom(b.dataset.openRoom);$('#main-panel').scrollIntoView({behavior:'smooth',block:'start'});});return;
  }
  const r=room(roomId),noteKeys=Object.keys(fieldsFor(r)||{}).filter(k=>note(r,k).trim());$('#details-title').textContent=r.name;
  $('#elevation-slot').innerHTML=elevationBlock();$('#details-content').innerHTML=`<div class="room-detail-grid"><div class="dimension-list"><div class="detail-subhead"><h3>${t('分區量測')}</h3><small>cm</small></div>${r.parts.map(p=>`<div class="dimension-row"><span>${esc(p.label)}</span><strong>${p.horizontal_cm===0?'':num(p.horizontal_cm)+' × '}${num(p.vertical_cm)}</strong></div>`).join('')}${!objectId&&r.id==='kitchen'&&elevationFor('kitchen-lower-worktop')?'<button class="plain-button elev-link" data-elev-open="kitchen-lower-worktop">'+esc(object('kitchen-lower-worktop').name)+' · '+t('空間規劃')+' ↗</button>':''}${!objectId&&r.id==='kitchen'&&elevationFor('kitchen-upper-worktop')?'<button class="plain-button elev-link" data-elev-open="kitchen-upper-worktop">'+esc(object('kitchen-upper-worktop').name)+' · '+t('空間規劃')+' ↗</button>':''}${!objectId&&r.id==='kitchen'&&elevationFor('appliance-tower')?'<button class="plain-button elev-link" data-elev-open="appliance-tower">'+t('電器櫃 · 立面設計 ↗')+'</button>':''}${!objectId&&r.id==='living'&&elevationFor('tv-console')?'<button class="plain-button elev-link" data-elev-open="tv-console">'+t('電視牆 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='master'&&elevationFor('bath1-mirror-cabinet')?'<button class="plain-button elev-link" data-elev-open="bath1-mirror-cabinet">'+t('主浴鏡櫃 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='living'&&elevationFor('bath2-mirror-cabinet')?'<button class="plain-button elev-link" data-elev-open="bath2-mirror-cabinet">'+t('衛浴 2 鏡櫃 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='master'?'<button class="plain-button elev-link" data-elev-open="master-wardrobe-left">'+t('左側衣櫃 · 立面設計 ↗')+'</button><button class="plain-button elev-link" data-elev-open="master-wardrobe-right">'+t('右側衣櫃 · 立面設計 ↗')+'</button>':''}${!objectId&&r.id==='helper'&&elevationFor('helper-bed')?'<button class="plain-button elev-link" data-elev-open="helper-bed">'+t('收納床台 · 立面設計 ↗')+'</button>':''}</div>${noteKeys.length?`<div class="notes-panel"><div class="detail-subhead"><h3>${r.id==='kitchen'?esc(kitchenVersion().name)+t(' · 筆記'):r.id==='guest'&&guestVersions().length?esc(guestVersion().name)+t(' · 筆記'):t('設計筆記')}</h3></div>${(()=>{const rk=r.id==='guest'?guestVersion()?.risks:null;return rk?.length?`<div class="elev-risk-callout" role="note"><h4 class="elev-risk-title">${t('需評估')}</h4><ul class="elev-risks">${rk.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';})()}${noteKeys.map(key=>`<div class="note-field"><span class="note-key">${esc(t(key))}</span><p class="note-text">${esc(note(r,key))}</p></div>`).join('')}</div>`:''}</div>`;
  bindElevation();$$('[data-elev-open]').forEach(b=>b.onclick=()=>{selectObject(b.dataset.elevOpen);$('#elevation')?.scrollIntoView({behavior:'smooth',block:'start'});});
}
function renderInventory(){
  const q=$('#object-search').value.trim().toLowerCase();const filtered=visibleObjects().filter(o=>(roomId==='floor'||o.room_id===roomId)&&`${o.name} ${o.code} ${o.id} ${room(o.room_id).name}`.toLowerCase().includes(q));
  $('#inventory-title').textContent=roomId==='floor'?t('大型物件尺寸簿'):tf('{name} · 物件尺寸簿',{name:room(roomId).name});
  $('#inventory-body').innerHTML=filtered.map(o=>{const r=room(o.room_id),a=actual(o);const vals=['w','d','h'].map(k=>a[k]==null?'—':num(a[k]));return `<tr data-item-row="${o.id}" class="${o.id===objectId?'is-selected':''}"><td><button data-open-object="${o.id}"><span class="item-code">${o.code}</span>${esc(o.name)}</button></td><td>${r.name}</td><td>${size(o)}</td><td><span class="status-tag ${/design|fit/.test(Object.values(o.dimensions).map(d=>d.status).join())?'design':''}">${statuses(o)}</span></td><td class="${vals.every(v=>v==='—')?'table-muted':''}">${vals.join(' × ')}</td><td class="table-muted">${esc([a.brand,a.model].filter(Boolean).join(' / ')||t('待提供'))}</td></tr>`;}).join('');
  $('#no-results').hidden=filtered.length>0;$$('[data-open-object]').forEach(b=>b.onclick=()=>selectObject(b.dataset.openObject,{scroll:true}));
}
function buildReference(){
  const p=project.measurement_policy;
  $('#measurement-policy').innerHTML=[['基準',p.basis],['原標',p.annotated],['估算',p.scaled],['配適',p.fit],['實物',p.actual],['校準',p.calibration],['範圍',p.scope]].map(([k,v])=>`<p><b>${t(k)}</b>${LANG==='en'?' ':'\u3000'}${esc(v)}</p>`).join('');
  $('#change-list').innerHTML=project.changes.map(c=>`<div class="change-item"><span>${c.id} / ${Number(c.id.slice(1))<=3?'R02':Number(c.id.slice(1))<=6?'R03':Number(c.id.slice(1))<=7?'R04':Number(c.id.slice(1))<=8?'R05':Number(c.id.slice(1))<=9?'R06':Number(c.id.slice(1))<=11?'R07':Number(c.id.slice(1))<=12?'R08':Number(c.id.slice(1))<=13?'R09':Number(c.id.slice(1))<=14?'R10':Number(c.id.slice(1))<=15?'R11':Number(c.id.slice(1))<=16?'R12':Number(c.id.slice(1))<=18?'R13':Number(c.id.slice(1))<=19?'R14':Number(c.id.slice(1))<=20?'R15':Number(c.id.slice(1))<=21?'R16':Number(c.id.slice(1))<=22?'R17':Number(c.id.slice(1))<=23?'R18':Number(c.id.slice(1))<=24?'R19':Number(c.id.slice(1))<=25?'R20':Number(c.id.slice(1))<=26?'R21':Number(c.id.slice(1))<=27?'R22':Number(c.id.slice(1))<=28?'R23':Number(c.id.slice(1))<=29?'R24':Number(c.id.slice(1))<=30?'R25':Number(c.id.slice(1))<=31?'R26':Number(c.id.slice(1))<=32?'R27':Number(c.id.slice(1))<=33?'R28':Number(c.id.slice(1))<=34?'R29':Number(c.id.slice(1))<=35?'R30':Number(c.id.slice(1))<=36?'R31':Number(c.id.slice(1))<=37?'R32':Number(c.id.slice(1))<=39?'R33':Number(c.id.slice(1))<=42?'R34':'R35'}</span>${esc(c.text)}</div>`).join('');
  const names={'master-balcony':'主臥陽台','living-balcony':'客廳陽台',bath1:'主臥衛浴 1',bath2:'衛浴 2','ac-ledge-west':'西側冷氣平台','ac-ledge-south':'南側冷氣平台'};
  const notes={'master-balcony':'右下有缺角，為最大內跨度。','living-balcony':'滑門線有階差，中央深度再增加約 10 cm。',bath1:'不規則；主要區約 243 × 198，最大外框約 285 × 218 cm。',bath2:'不規則；為最大內跨度，下半區約 247 × 107 cm。','ac-ledge-west':'主體內側跨度，含平台區，非居住空間。','ac-ledge-south':'主體內側跨度，未加入右側小凹位。'};
  $('#auxiliary-list').innerHTML=`<div class="auxiliary-grid">${project.auxiliary.spaces.map(s=>{const p=s.parts[0];return `<div>${t(names[s.id])} · ${Math.round(p.horizontal_cm)} × ${Math.round(p.vertical_cm)} cm<small>${t(notes[s.id])}</small></div>`;}).join('')}</div>`;
}
$('#toggle-dims').onclick=()=>{showDims=!showDims;$('#toggle-dims').classList.toggle('active',showDims);$('#toggle-dims').setAttribute('aria-pressed',String(showDims));renderDimensions();$('#selected-dimensions').style.display=showDims?'':'none';};
$('#toggle-objects').onclick=()=>{showObjects=!showObjects;$('#toggle-objects').classList.toggle('active',showObjects);$('#toggle-objects').setAttribute('aria-pressed',String(showObjects));$('#object-fills').style.display=showObjects?'':'none';$('#object-hits').style.display=showObjects?'':'none';hideTip();};
$('#toggle-power').onclick=()=>{showPower=!showPower;powerId=null;const u=new URL(location.href);if(showPower)u.searchParams.set('power','1');else u.searchParams.delete('power');history.replaceState(null,'',u.pathname+u.search+u.hash);syncLangLinks();hideTip();renderInspector();};
$('#object-search').addEventListener('input',renderInventory);
$('#show-source').onclick=()=>{$('#source-dialog').showModal();};$('#close-source').onclick=()=>$('#source-dialog').close();
$$('[data-source]').forEach(b=>b.onclick=()=>{$$('[data-source]').forEach(x=>x.classList.toggle('active',x===b));$('#source-image').src=originalSources[b.dataset.source];$('#source-caption').textContent=b.dataset.source==='new'?t('新格局來源。原圖保留原始標註（mm）；互動圖冊已統一換算 cm。'):t('原始格局，僅作比較與 5 m 比例尺校驗。原 PDF 圖面與文字為左右鏡像，此處忠實保留。');});
$('#source-dialog').addEventListener('click',e=>{if(e.target===$('#source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
// The plan has no zoom of its own: it always fits its container width, and the browser's page zoom / pinch handles magnification.
window.addEventListener('scroll',hideTip,{passive:true});$('#plan-stage').addEventListener('pointerleave',hideTip);
$('#kitchen-version').addEventListener('click',e=>{const b=e.target.closest('[data-kitchen-version]');if(b)chooseKitchenVersion(b.dataset.kitchenVersion);});
$('#layout-version').addEventListener('click',e=>{const b=e.target.closest('[data-layout-version]');if(b)chooseLayout(b.dataset.layoutVersion);});
$('#net-version').addEventListener('click',e=>{const b=e.target.closest('[data-net-version]');if(b)chooseNet(b.dataset.netVersion);});
$('#guest-version').addEventListener('click',e=>{const b=e.target.closest('[data-guest-version]');if(b)chooseGuestVersion(b.dataset.guestVersion);});
$('.brand').addEventListener('click',e=>{e.preventDefault();selectRoom('floor');});
// Static shell text: translate text nodes and a few attributes, remembering the Chinese source per node.
const DYNAMIC='#smart-record,#net-version,#power-legend,#power-layer,#inspector,#details-content,#elevation-slot,#inventory-body,#tabs,#room-labels,#tooltip,#measurement-policy,#change-list,#auxiliary-list,#kitchen-version,#drawing-title,#details-title,#inventory-title,#source-caption,script,style';
const staticText=new Map(),staticAttr=new Map();
function applyStatic(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest(DYNAMIC)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  for(let n;(n=walker.nextNode());){if(!staticText.has(n)){if(!CJK.test(n.nodeValue))continue;staticText.set(n,n.nodeValue);}const src=staticText.get(n),m=src.match(/^(\s*)([\s\S]*?)(\s*)$/);n.nodeValue=m[1]+t(m[2])+m[3];}
  for(const el of document.querySelectorAll('[aria-label],[placeholder],[title],[alt]'))for(const a of ['aria-label','placeholder','title','alt']){if(!el.hasAttribute(a)||el.closest(DYNAMIC))continue;const key=el;if(!staticAttr.has(key))staticAttr.set(key,{});const store=staticAttr.get(key);if(!(a in store)){const v=el.getAttribute(a);if(!CJK.test(v))continue;store[a]=v;}el.setAttribute(a,t(store[a]));}
  document.documentElement.lang=LANG==='en'?'en':'zh-Hant';document.title=t('SKG 空間規劃');
  $('.edition b').textContent=project.project.revision;
  $$('[data-lang]').forEach(a=>{const on=a.dataset.lang===LANG;a.classList.toggle('active',on);a.setAttribute('aria-current',on?'true':'false');const u=new URL(location.href);u.searchParams.set('lang',a.dataset.lang);a.href=u.pathname+u.search+u.hash;});
}
function setLang(next){
  if(next===LANG)return;LANG=next;project=withLayout(localize(projectSource));
  const u=new URL(location.href);u.searchParams.set('lang',LANG);history.replaceState(null,'',u.pathname+u.search+u.hash);
  for(const id of ['#room-zones','#room-labels','#object-fills','#object-hits'])$(id).replaceChildren();
  applyStatic();buildTabs();buildPlan();buildReference();renderKitchenVersion();selectRoom(roomId,{keepObject:true});
}
$$('[data-lang]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setLang(a.dataset.lang);}));
applyStatic();syncKitchenURL();
buildTabs();buildPlan();buildReference();renderKitchenVersion();
const hash=decodeURIComponent(location.hash.slice(1));if(hash.startsWith('object-')&&object(hash.slice(7)))selectObject(hash.slice(7));else selectRoom(room(hash)?hash:'floor');
// Expose a read-only snapshot for focused QA and efficient future updates.
window.SKGAtlas={lang:()=>LANG,setLang,snapshot:()=>({roomId,objectId,showDims,showObjects,showPower,powerId,net:currentNet(),selectedVersions:{...selectedVersions},project:structuredClone(project)})};
})();
