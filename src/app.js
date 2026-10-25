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
let project=localize(projectSource);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg', STORAGE='skg-home-atlas-v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:1});
const statusNames={annotated:'原圖標註',scaled:'圖面估算',design:'設計配置',fit:'配適設計'};
let elevView={},elevState='closed';
let changes={notes:{},actual:{},versions:{}}, roomId='floor', objectId=null, showDims=true, showObjects=true, dirty=false, storageOK=true, toastTimer;
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved&&saved.notes&&saved.actual) changes=saved;}catch(e){storageOK=false;}
changes.versions??={};
// Kitchen scheme: A = kitchen-window-sink (default), B = kitchen-tower-left, original = kitchen-current. The URL (?kitchen=a|b|original) is the only selection state.
const KITCHEN_KEYS={a:'kitchen-window-sink',b:'kitchen-tower-left',original:'kitchen-current'},KITCHEN_ORDER=Object.values(KITCHEN_KEYS);
let selectedVersions={kitchen:KITCHEN_KEYS[(new URLSearchParams(location.search).get('kitchen')||'').toLowerCase()]||KITCHEN_KEYS.a};
const repoMode=window.SKG_REPO_MODE===true;let draftActive=!repoMode,draftChanges=structuredClone(changes);
if(repoMode)changes={notes:{},actual:{},versions:{}};
const room=id=>project.rooms.find(r=>r.id===id), baseObject=id=>project.objects.find(o=>o.id===id);
function kitchenVersions(){const rank=v=>{const i=KITCHEN_ORDER.indexOf(v.id);return i<0?99:i;};return [...(project.roomVersions?.kitchen||[])].sort((a,b)=>rank(a)-rank(b));}
function kitchenVersion(){const vs=kitchenVersions();return vs.find(v=>v.id===selectedVersions.kitchen)||vs.find(v=>v.id===KITCHEN_KEYS.a)||vs[0];}
function syncLangLinks(){$$('[data-lang]').forEach(a=>{const u=new URL(location.href);u.searchParams.set('lang',a.dataset.lang);a.href=u.pathname+u.search+u.hash;});}
function syncKitchenURL(){const key=Object.keys(KITCHEN_KEYS).find(k=>KITCHEN_KEYS[k]===kitchenVersion()?.id);if(!key)return;const u=new URL(location.href);if(u.searchParams.get('kitchen')!==key){u.searchParams.set('kitchen',key);history.replaceState(null,'',u.pathname+u.search+u.hash);}syncLangLinks();}
function object(id){const o=baseObject(id);if(!o)return;const patch=o.room_id==='kitchen'?kitchenVersion()?.objectOverrides?.[id]:null;return patch?{...o,...patch,dimensions:patch.dimensions?{...o.dimensions,...patch.dimensions}:o.dimensions}:o;}
function visibleObjects(){return project.objects.filter(o=>!o.onlyLayouts||o.onlyLayouts.includes(kitchenVersion()?.layout)).map(o=>object(o.id));}
const actual=o=>({...o.actual,...(changes.actual[o.id]||{})});
const fieldsFor=r=>r.id==='kitchen'?kitchenVersion()?.notes||r.notes:r.notes;
const note=(r,key)=>r.id==='kitchen'?(changes.versions['kitchen:'+kitchenVersion().id]?.notes?.[key]??(kitchenVersion().id==='kitchen-current'?changes.notes.kitchen?.[key]:null)??kitchenVersion().notes[key]??''):(changes.notes[r.id]?.[key]??r.notes[key]??'');
const dimension=d=>`${['scaled','fit'].includes(d.status)?'≈ ':''}${num(d.cm)}`;
const size=o=>`${dimension(o.dimensions.w)} × ${dimension(o.dimensions.d)}`;
const roomSize=r=>{const p=r.parts[0];return `≈ ${num(p.horizontal_cm)} × ${num(p.vertical_cm)}`;};
const statuses=o=>[...new Set(Object.values(o.dimensions).map(d=>t(statusNames[d.status])))].join(' / ');
const labelPositions={living:[507,249],kitchen:[514,318],helper:[442,320],master:[230,252],kid:[309,312],study:[326,200],guest:[371,198]};
const originalSources={new:'/*__SOURCE_NEW__*/',original:'/*__SOURCE_OLD__*/'};
function svgEl(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
function save(){dirty=true;try{localStorage.setItem(STORAGE,JSON.stringify(changes));storageOK=true;$('#save-status').textContent=t('個人紀錄已存於此瀏覽器');}catch(e){storageOK=false;$('#save-status').textContent=t('此環境無法自動儲存，請匯出備份');}window.dispatchEvent(new CustomEvent('skg:change')); }
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function syncEditMode(){
 const locked=repoMode&&!draftActive;
 $$('textarea[data-note-key],[data-actual]').forEach(el=>el.readOnly=locked);
 $('#draft-mode').setAttribute('aria-pressed',String(draftActive));$('#draft-mode').classList.toggle('active',draftActive);
 $('#save-status').textContent=draftActive?t('本機草稿'):t('共用設計版')+' '+project.project.revision;
}
function effectiveVersionCopy(){const v=structuredClone(kitchenVersion());v.notes=Object.fromEntries(Object.keys(fieldsFor(room('kitchen'))).map(k=>[k,note(room('kitchen'),k)]));return v;}
// A layout-specific entry 'objectId@layout' wins over the plain 'objectId' entry (e.g. kitchen scheme B = tower-left).
function elevationFor(id){
 const all=project.elevations||{};let e=all[id+'@'+kitchenVersion()?.layout]||all[id];if(!e||e.shared||!window.SKGElevation)return null;
 if(e.alias){const{alias,...own}=e;e={...all[alias],...own};}
 if(e.onlyLayouts&&!e.onlyLayouts.includes(kitchenVersion()?.layout))return null;
 if(e.include){const s=all[e.include];e={...e,units:{...(s?.units||{}),...(e.units||{})},views:e.views.map(v=>typeof v==='string'?s?.views.find(x=>x.id===v):v).filter(Boolean)};}
 return e;
}
function elevationBlock(){
 const e=objectId&&elevationFor(objectId);if(!e)return '';
 const o=object(objectId),view=e.views.find(v=>v.id===elevView[objectId])||e.views[0],names=view.stateNames||{};
 const list=items=>`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 return `<div class="elev-block" id="elevation"><div class="elev-head"><div><p class="eyebrow">ELEVATION / ${o.code}</p><h3>${esc(e.title)}</h3><p class="elev-viewpoint">${esc(e.viewpoint)}</p></div><div class="elev-controls"><div class="seg" role="group" aria-label="${t('立面視圖')}">${e.views.map(v=>`<button class="tool ${v.id===view.id?'active':''}" data-elev-view="${esc(v.id)}" aria-pressed="${v.id===view.id}">${esc(v.name)}</button>`).join('')}</div><div class="seg" role="group" aria-label="${t('門片狀態')}">${e.states.map(st=>`<button class="tool ${st.id===elevState?'active':''}" data-elev-state="${esc(st.id)}" aria-pressed="${st.id===elevState}">${esc(names[st.id]||st.name)}</button>`).join('')}</div></div></div><div class="elev-grid"><figure class="elev-figure">${window.SKGElevation.render(e,view.id,elevState,t)}<figcaption>${t('單位 cm · 設計提案，非施工圖。')}${LANG==='en'?' ':''}${esc(e.ceiling_note)}</figcaption></figure><div class="elev-spec">${e.risks?.length?`<div class="elev-risk-callout" role="note"><h4 class="elev-risk-title">${t('需評估')}</h4><ul class="elev-risks">${e.risks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}<div class="detail-subhead"><h3>${t('分區 · 由上到下')}</h3><span class="status-tag design">${t('設計配置')}</span></div>${e.spec.map(z=>`<div class="elev-row"><div><b>${esc(z.zone)}</b><span>${esc(z.h)}</span></div><p>${esc(z.note)}</p></div>`).join('')}<h4>${t('五金與機電')}</h4>${list(e.hardware)}<h4>${t('設計說明')}</h4>${list(e.rationale)}<h4>${t('待確認')}</h4><p class="elev-open">${e.open_questions.map(esc).join(t('、'))}</p></div></div></div>`;
}
function bindElevation(){
 $$('[data-elev-view]').forEach(b=>b.onclick=()=>{elevView[objectId]=b.dataset.elevView;refreshElevation();});
 $$('[data-elev-state]').forEach(b=>b.onclick=()=>{elevState=b.dataset.elevState;refreshElevation();});
}
function refreshElevation(){const el=$('#elevation');if(!el)return;el.outerHTML=elevationBlock();bindElevation();}
function buildTabs(){
  $('#tabs').innerHTML=[{id:'floor',name:'Floor plan',number:'00'},...project.rooms].map(r=>`<button class="tab" role="tab" id="tab-${r.id}" aria-controls="main-panel" aria-selected="${r.id===roomId}" tabindex="${r.id===roomId?'0':'-1'}" data-room="${r.id}"><span class="tab-number">${r.number}</span>${r.name}</button>`).join('');
  $$('#tabs button').forEach((btn,i,buttons)=>{btn.addEventListener('click',()=>selectRoom(btn.dataset.room));btn.addEventListener('keydown',e=>{let k=i;if(e.key==='ArrowRight')k=(i+1)%buttons.length;else if(e.key==='ArrowLeft')k=(i-1+buttons.length)%buttons.length;else if(e.key==='Home')k=0;else if(e.key==='End')k=buttons.length-1;else return;e.preventDefault();selectRoom(buttons[k].dataset.room);buttons[k].focus();});});
}
function buildPlan(){
  for(const r of project.rooms){
    const zone=svgEl('polygon',{points:r.polygon_pt.map(p=>p.join(',')).join(' '),'data-room':r.id,class:'room-zone'});
    zone.addEventListener('click',e=>{e.stopPropagation();selectRoom(r.id);});$('#room-zones').append(zone);
    const[x,y]=labelPositions[r.id];const g=svgEl('g',{class:'room-label','data-label-room':r.id});
    g.append(svgEl('text',{x,y},r.name));
    const english=r.id==='living'?'LIVING / DINING':r.id==='helper'?'HELPER':r.english.toUpperCase();
    if(LANG!=='en')g.append(svgEl('text',{x,y:y+4.8,class:'en'},english));
    g.append(svgEl('text',{x,y:y+(LANG==='en'?4.8:9.4),class:'size'},roomSize(r)+' cm'));$('#room-labels').append(g);
  }
  const auxLabels=[['主臥陽台',225,157],['客廳陽台',505,143],['衛浴 1',216,338],['衛浴 2',401,309],['A/C',164,279],['A/C',385,340],['入口',563,394]];
  for(const[label,x,y]of auxLabels)$('#room-labels').append(svgEl('text',{x,y,class:'aux-label'},t(label)));
  for(const o of project.objects){
    const[x0,y0,x1,y1]=o.bounds_pt, attrs={x:x0,y:y0,width:x1-x0,height:y1-y0,rx:.8,'data-object':o.id};
    $('#object-fills').append(svgEl('rect',{...attrs,class:'object-fill'}));
    const hit=svgEl('rect',{...attrs,class:'object-hit','aria-label':`${o.name}${t('，')}${size(o)} cm`});
    // No native <title> here: the single custom hover label below replaces it (aria-label keeps the accessible name).
    hit.addEventListener('pointerenter',e=>showTip(e,object(o.id)));hit.addEventListener('pointermove',positionTip);hit.addEventListener('pointerleave',hideTip);
    hit.addEventListener('click',e=>{e.stopPropagation();selectObject(o.id);hideTip();});$('#object-hits').append(hit);
  }
}
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
 const visible=new Set(visibleObjects().map(o=>o.id));
 $$('.object-hit,.object-fill').forEach(el=>{const o=object(el.dataset.object);el.style.display=visible.has(o.id)?'':'none';const[x0,y0,x1,y1]=o.bounds_pt;for(const[k,v]of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))el.setAttribute(k,v);if(el.classList.contains('object-hit')){el.setAttribute('aria-label',`${o.name}${t('，')}${size(o)} cm`);}});
 if(objectId&&!visible.has(objectId)){objectId=null;try{history.replaceState(null,'',location.search+'#'+roomId);}catch(e){}}
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
    if(id==='study'||id==='guest'){
      dimensionLine(g,x0,130,x1,130,'≈ '+num(p.horizontal_cm));
      if(id==='guest'||roomId!=='floor')dimensionLine(g,x1-3,y0,x1-3,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='kid'){
      dimensionLine(g,x0,363,x1,363,'≈ '+num(p.horizontal_cm));
      dimensionLine(g,x1-3,y0,x1-3,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='kitchen'){
      dimensionLine(g,x0,365,x1,365,'320.5');
      if(roomId!=='floor')dimensionLine(g,x1-3,y0,x1-3,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='master'){
      dimensionLine(g,x0,190,x1,190,'≈ '+num(p.horizontal_cm));
      dimensionLine(g,260,y0,260,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='helper'){
      dimensionLine(g,x0,346,x1,346,'≈ '+num(p.horizontal_cm));
      dimensionLine(g,454,y0,454,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='living'){
      dimensionLine(g,x0,177,x1,177,'≈ '+num(p.horizontal_cm));
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
  dimensionLine(g,vx,y0,vx,y1,dimension(vd)+' cm',true);
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
  if(id!=='floor'&&!room(id))return;roomId=id;if(!keepObject)objectId=null;
  $$('#tabs .tab').forEach(b=>{const selected=b.dataset.room===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  $('#main-panel').setAttribute('aria-labelledby','tab-'+id);
  $('#drawing-title').textContent=id==='floor'?t('全屋平面圖'):tf('{name} · 空間定位',{name:room(id).name});
  $('#drawing-kicker').textContent=id==='floor'?'THE PROPOSED LAYOUT':room(id).english.toUpperCase();
  $$('.room-zone').forEach(z=>{z.classList.toggle('selected',z.dataset.room===id);z.classList.toggle('dimmed',id!=='floor'&&z.dataset.room!==id);});
  $$('[data-label-room]').forEach(z=>z.classList.toggle('muted',id!=='floor'&&z.dataset.labelRoom!==id));
  $$('.object-hit').forEach(z=>z.classList.toggle('selected',z.dataset.object===objectId));
  history.replaceState(null,'','#'+(objectId?'object-'+objectId:id));
  renderKitchenVersion();renderDimensions();renderInspector();renderDetails();renderInventory();syncEditMode();hideTip();
}
function selectObject(id,{scroll=false}={}){
  const o=object(id);if(!o)return;objectId=id;selectRoom(o.room_id,{keepObject:true});
  if(scroll)$('#main-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
}
function renderInspector(){
  const node=$('#inspector');
  if(objectId){
    const o=object(objectId),r=room(o.room_id),a=actual(o);
    node.innerHTML=`<p class="eyebrow">OBJECT / ${o.code}</p><h2>${esc(o.name)}</h2><div class="en-title">${tf('{name} · 圖面占位',{name:r.name})}</div><div class="big-number">${size(o)}<span>cm</span></div><div class="inspector-note">W × D · ${statuses(o)}</div><p class="inspector-text">${esc(o.source_note)}</p><hr class="inspector-rule"><div class="detail-subhead"><h3>${t('實物資料')}</h3><span class="status-tag">${t('待補齊')}</span></div><div class="actual-form">${['w','d','h'].map((k,i)=>`<label>${t(['寬 W','深 D','高 H'][i])} · cm<input type="number" step="0.1" min="0.1" max="10000" inputmode="decimal" data-actual="${k}" value="${a[k]??''}" placeholder="${t('待提供')}" aria-label="${o.name} ${t(['實物寬','實物深','實物高'][i])} (cm)"></label>`).join('')}<label class="wide">${t('品牌')}<input data-actual="brand" value="${esc(a.brand)}" placeholder="${t('待提供')}"></label><label class="wide">${t('型號')}<input data-actual="model" value="${esc(a.model)}" placeholder="${t('待提供')}"></label></div><button class="inspector-button" id="return-room">${tf('回到{name}概覽',{name:r.name})}</button>`;
    $$('#inspector [data-actual]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.actual;let value=input.value.trim();if(['w','d','h'].includes(key)){value=value===''?null:Number(value);if(value!==null&&(!Number.isFinite(value)||value<=0||value>10000)){input.setCustomValidity(t('請輸入大於 0 的有效尺寸。'));input.reportValidity();return;}input.setCustomValidity('');}else value=value||null;changes.actual[o.id]={...(changes.actual[o.id]||{}),[key]:value};save();renderInventory();const current=actual(o),filled=['w','d','h','brand','model'].filter(k=>current[k]!=null).length;$('#inspector .status-tag').textContent=filled===5?t('資料齊全'):filled>0?t('已有部分資料'):t('待補齊');}));
    const filled=['w','d','h','brand','model'].filter(k=>a[k]!=null).length;$('#inspector .status-tag').textContent=filled===5?t('資料齊全'):filled>0?t('已有部分資料'):t('待補齊');
    $('#return-room').onclick=()=>selectRoom(r.id);return;
  }
  if(roomId==='floor'){
    node.innerHTML=`<p class="eyebrow">${t('目前圖面')} / ${project.project.revision}</p><h2>${t('配置與尺寸')}</h2><div class="en-title">${esc(kitchenVersion().name)}</div><hr class="inspector-rule"><p class="inspector-text">${t('選房間查看分區尺寸與設計筆記。點選物件可補充實物尺寸、品牌與型號。')}</p><div class="inspector-pair"><span>${t('書房按摩椅')}</span><strong>76 × 127 cm</strong></div><div class="inspector-pair"><span>${t('客房衣櫃')}</span><strong>120 × 60 cm</strong></div><div class="inspector-pair"><span>${t('主要空間')}</span><strong>07</strong></div><div class="inspector-pair"><span>${t('本版物件')}</span><strong>${String(visibleObjects().length).padStart(2,'0')}</strong></div><p class="inspector-foot">${t('尺寸單位 cm。≈ 為圖面估算。')}<br>${t('原標、設計值與實物資料分開記錄。')}</p>`;
  }else{
    const r=room(roomId),p=r.parts[0],count=visibleObjects().filter(o=>o.room_id===r.id).length;
    node.innerHTML=`<p class="eyebrow">SPACE / ${r.number}</p><h2>${r.name}</h2><div class="en-title">${LANG==='en'?esc(r.source_label):r.english}</div><div class="big-number">${roomSize(r)}<span>cm</span></div><div class="inspector-note">${tf('{label} · 橫向 × 縱向',{label:esc(p.label)})}</div><p class="inspector-text">${r.focus}</p><hr class="inspector-rule"><div class="inspector-pair"><span>${t('原圖名稱')}</span><strong>${esc(r.source_label)}</strong></div><div class="inspector-pair"><span>${t('收錄物件')}</span><strong>${tf('{n} 件',{n:count})}</strong></div><div class="inspector-pair"><span>${t('尺寸依據')}</span><strong>${t('內牆面 / 窗室內側線')}</strong></div>`;
  }
}
function renderDetails(){
  if(roomId==='floor'){
    $('#details-title').textContent=t('空間索引');$('#details-kicker').textContent='THE SPACES';$('#details-caption').textContent=tf('7 個空間 · 本版 {n} 個大型物件',{n:visibleObjects().length});
    $('#elevation-slot').innerHTML='';$('#details-content').innerHTML=`<div class="room-grid">${project.rooms.map(r=>`<button class="room-index" data-open-room="${r.id}"><div class="room-index-no">SPACE ${r.number}</div><span class="arrow">↗</span><h3>${r.name}</h3><div class="room-index-en">${LANG==='en'?esc(r.source_label):r.english}</div><div class="room-index-dim">${roomSize(r)} cm${['master','living'].includes(r.id)?t(' · 主區'):''}</div><p class="room-index-focus">${r.focus}</p></button>`).join('')}</div>`;
    $$('[data-open-room]').forEach(b=>b.onclick=()=>{selectRoom(b.dataset.openRoom);$('#main-panel').scrollIntoView({behavior:'smooth',block:'start'});});return;
  }
  const r=room(roomId),editing=!repoMode||draftActive,noteKeys=Object.keys(fieldsFor(r)).filter(k=>editing||String(note(r,k)).trim());$('#details-title').textContent=tf('{name} · 細節紀錄',{name:r.name});$('#details-kicker').textContent='SPACE '+r.number+' / DETAILS';$('#details-caption').textContent='';
  $('#elevation-slot').innerHTML=elevationBlock();$('#details-content').innerHTML=`<div class="room-detail-grid"><div class="dimension-list"><div class="detail-subhead"><h3>${t('分區量測')}</h3><small>${t('cm · ≈ 為圖面估算')}</small></div>${r.parts.map(p=>`<div class="dimension-row"><span>${esc(p.label)}</span><strong>${p.horizontal_cm===0?'':(p.horizontal_cm===320.5?'':'≈ ')+num(p.horizontal_cm)+' × '}${p.vertical_cm===387.5?'':'≈ '}${num(p.vertical_cm)}</strong></div>`).join('')}${!objectId&&r.id==='kitchen'&&elevationFor('kitchen-lower-worktop')?'<button class="plain-button elev-link" data-elev-open="kitchen-lower-worktop">'+esc(object('kitchen-lower-worktop').name)+' · '+t('空間規劃')+' ↗</button>':''}${!objectId&&r.id==='kitchen'&&elevationFor('kitchen-upper-worktop')?'<button class="plain-button elev-link" data-elev-open="kitchen-upper-worktop">'+esc(object('kitchen-upper-worktop').name)+' · '+t('空間規劃')+' ↗</button>':''}${!objectId&&r.id==='kitchen'&&elevationFor('appliance-tower')?'<button class="plain-button elev-link" data-elev-open="appliance-tower">'+t('電器櫃 · 立面設計 ↗')+'</button>':''}${!objectId&&r.id==='living'&&elevationFor('tv-console')?'<button class="plain-button elev-link" data-elev-open="tv-console">'+t('電視牆 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='master'&&elevationFor('bath1-mirror-cabinet')?'<button class="plain-button elev-link" data-elev-open="bath1-mirror-cabinet">'+t('主浴鏡櫃 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='living'&&elevationFor('bath2-mirror-cabinet')?'<button class="plain-button elev-link" data-elev-open="bath2-mirror-cabinet">'+t('衛浴 2 鏡櫃 · 空間規劃 ↗')+'</button>':''}${!objectId&&r.id==='master'?'<button class="plain-button elev-link" data-elev-open="master-wardrobe-left">'+t('左側衣櫃 · 立面設計 ↗')+'</button><button class="plain-button elev-link" data-elev-open="master-wardrobe-right">'+t('右側衣櫃 · 立面設計 ↗')+'</button>':''}</div><div class="notes-panel"><div class="detail-subhead"><h3>${r.id==='kitchen'?esc(kitchenVersion().name)+t(' · 筆記'):t('設計筆記')}</h3><button class="plain-button" id="copy-discussion">${t('複製討論提示 ↗')}</button></div>${noteKeys.length?'':`<p class="quiet-note">${t('尚無筆記。')}</p>`}${noteKeys.map((key,i)=>`<div class="note-field"><label for="note-${i}">${esc(t(key))}</label><textarea id="note-${i}" data-note-key="${esc(key)}" rows="${note(r,key).length>45?3:2}" placeholder="${t('待討論 / 待提供')}">${esc(note(r,key))}</textarea></div>`).join('')}</div></div>`;
  bindElevation();$$('[data-elev-open]').forEach(b=>b.onclick=()=>{selectObject(b.dataset.elevOpen);$('#elevation')?.scrollIntoView({behavior:'smooth',block:'start'});});
  fitNotes();$$('[data-note-key]').forEach(input=>input.addEventListener('input',()=>fitNote(input)));
  $$('[data-note-key]').forEach(input=>input.addEventListener('input',()=>{if(r.id==='kitchen'){const v=effectiveVersionCopy();v.notes[input.dataset.noteKey]=input.value;changes.versions['kitchen:'+v.id]=v;}else changes.notes[r.id]={...(changes.notes[r.id]||{}),[input.dataset.noteKey]:input.value};save();}));
  $('#copy-discussion').onclick=async()=>{const text=`${tf('請修改 SKG 空間規劃的{name}（room_id: {id}）',{name:r.name,id:r.id})}${r.id==='kitchen'?tf('，方案 {v}（{id}）',{v:kitchenVersion().name,id:kitchenVersion().id}):''}${t('。')}\n${t('目前配置：')}${Object.keys(fieldsFor(r)).map(k=>t(k)+t('：')+note(r,k)).join('\n')}\n${t('本次調整：')}`;
    try{await navigator.clipboard.writeText(text);toast(t('討論提示已複製，可貼回對話補充需求。'));}catch(e){toast(tf('可直接在對話中指定：{name}（{id}）',{name:r.name,id:r.id}));}};
}
// Notes grow with their content so longer text at the larger type size is never clipped inside the box.
function fitNote(el){if(!el.offsetParent)return;el.style.height='auto';el.style.height=el.scrollHeight+2+'px';}
function fitNotes(){$$('[data-note-key]').forEach(fitNote);}
let fitTimer;window.addEventListener('resize',()=>{clearTimeout(fitTimer);fitTimer=setTimeout(fitNotes,120);});
function renderInventory(){
  const q=$('#object-search').value.trim().toLowerCase();const filtered=visibleObjects().filter(o=>(roomId==='floor'||o.room_id===roomId)&&`${o.name} ${o.code} ${o.id} ${room(o.room_id).name}`.toLowerCase().includes(q));
  $('#inventory-title').textContent=roomId==='floor'?t('大型物件尺寸簿'):tf('{name} · 物件尺寸簿',{name:room(roomId).name});
  $('#inventory-body').innerHTML=filtered.map(o=>{const r=room(o.room_id),a=actual(o);const vals=['w','d','h'].map(k=>a[k]==null?'—':num(a[k]));return `<tr data-item-row="${o.id}" class="${o.id===objectId?'is-selected':''}"><td><button data-open-object="${o.id}"><span class="item-code">${o.code}</span>${esc(o.name)}</button></td><td>${r.name}</td><td>${size(o)}</td><td><span class="status-tag ${/design|fit/.test(Object.values(o.dimensions).map(d=>d.status).join())?'design':''}">${statuses(o)}</span></td><td class="${vals.every(v=>v==='—')?'table-muted':''}">${vals.join(' × ')}</td><td class="table-muted">${esc([a.brand,a.model].filter(Boolean).join(' / ')||t('待提供'))}</td></tr>`;}).join('');
  $('#no-results').hidden=filtered.length>0;$$('[data-open-object]').forEach(b=>b.onclick=()=>selectObject(b.dataset.openObject,{scroll:true}));
}
function exportBackup(){
  const effective=structuredClone(projectSource);for(const r of effective.rooms)for(const key of Object.keys(r.notes))r.notes[key]=note(r,key)||null;for(const o of effective.objects)o.actual=actual(o);
  const payload={format:'skg-home-atlas-backup',version:1,exported_at:new Date().toISOString(),overrides:changes,project:effective};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skg-home-atlas-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(t('已匯出完整尺寸簿與個人紀錄。'));
}
function validateOverrides(incoming){
  if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||typeof incoming.notes!=='object'||typeof incoming.actual!=='object')throw new Error(t('備份格式不正確。'));
  const clean={notes:{},actual:{},versions:{}};
  for(const[id,fields]of Object.entries(incoming.notes||{})){const r=room(id);if(!r||!fields||typeof fields!=='object')continue;clean.notes[id]={};for(const key of Object.keys(r.notes))if(typeof fields[key]==='string'&&fields[key].length<=20000)clean.notes[id][key]=fields[key];}
  for(const[id,fields]of Object.entries(incoming.actual||{})){if(!object(id)||!fields||typeof fields!=='object')continue;clean.actual[id]={};for(const key of ['w','d','h'])if(fields[key]===null||typeof fields[key]==='number'&&Number.isFinite(fields[key])&&fields[key]>0&&fields[key]<=10000)clean.actual[id][key]=fields[key];for(const key of ['brand','model'])if(fields[key]===null||typeof fields[key]==='string'&&fields[key].length<1000)clean.actual[id][key]=fields[key];}
  for(const[key,v]of Object.entries(incoming.versions||{})){
    if(!/^kitchen:kitchen-[a-zA-Z0-9-]+$/.test(key)||!v||typeof v!=='object'||key!=='kitchen:'+v.id||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!['original','window-sink','tower-left'].includes(v.layout)||typeof v.baseId!=='string'||typeof v.createdAt!=='string')continue;
    const notes={};for(const[k,value]of Object.entries(v.notes||{}).slice(0,40))if(typeof value==='string'&&value.length<=20000)notes[k]=value;
    const objectOverrides={};for(const[id,patch]of Object.entries(v.objectOverrides||{})){if(!baseObject(id)||baseObject(id).room_id!=='kitchen'||!Array.isArray(patch.bounds_pt)||patch.bounds_pt.length!==4||!patch.bounds_pt.every(Number.isFinite))continue;const b=patch.bounds_pt;if(b[0]>=b[2]||b[1]>=b[3]||b[0]<100||b[2]>700||b[1]<70||b[3]>450)continue;objectOverrides[id]={bounds_pt:b};if(patch.dimensions){const dims={};for(const axis of ['w','d']){const d=patch.dimensions[axis];if(d&&Number.isFinite(d.cm)&&d.cm>0&&d.cm<=10000&&statusNames[d.status])dims[axis]={cm:d.cm,status:d.status};}objectOverrides[id].dimensions=dims;}}
    clean.versions[key]={id:v.id,name:v.name,baseId:v.baseId,layout:v.layout,notes,objectOverrides,createdAt:v.createdAt};
  }
  return clean;
}
function buildReference(){
  const p=project.measurement_policy;
  $('#measurement-policy').innerHTML=[['基準',p.basis],['原標',p.annotated],['估算',p.scaled],['配適',p.fit],['實物',p.actual],['校準',p.calibration],['範圍',p.scope]].map(([k,v])=>`<p><b>${t(k)}</b>${LANG==='en'?' ':'\u3000'}${esc(v)}</p>`).join('');
  $('#change-list').innerHTML=project.changes.map(c=>`<div class="change-item"><span>${c.id} / ${Number(c.id.slice(1))<=3?'R02':Number(c.id.slice(1))<=6?'R03':Number(c.id.slice(1))<=7?'R04':Number(c.id.slice(1))<=8?'R05':Number(c.id.slice(1))<=9?'R06':Number(c.id.slice(1))<=11?'R07':Number(c.id.slice(1))<=12?'R08':Number(c.id.slice(1))<=13?'R09':Number(c.id.slice(1))<=14?'R10':Number(c.id.slice(1))<=15?'R11':Number(c.id.slice(1))<=16?'R12':Number(c.id.slice(1))<=18?'R13':Number(c.id.slice(1))<=19?'R14':Number(c.id.slice(1))<=20?'R15':Number(c.id.slice(1))<=21?'R16':Number(c.id.slice(1))<=22?'R17':Number(c.id.slice(1))<=23?'R18':Number(c.id.slice(1))<=24?'R19':Number(c.id.slice(1))<=25?'R20':Number(c.id.slice(1))<=26?'R21':Number(c.id.slice(1))<=27?'R22':'R23'}</span>${esc(c.text)}</div>`).join('');
  const names={'master-balcony':'主臥陽台','living-balcony':'客廳陽台',bath1:'主臥衛浴 1',bath2:'衛浴 2','ac-ledge-west':'西側冷氣平台','ac-ledge-south':'南側冷氣平台'};
  const notes={'master-balcony':'右下有缺角，為最大內跨度。','living-balcony':'滑門線有階差，中央深度再增加約 10 cm。',bath1:'不規則；主要區約 243 × 198，最大外框約 285 × 218 cm。',bath2:'不規則；為最大內跨度，下半區約 247 × 107 cm。','ac-ledge-west':'主體內側跨度，含平台區，非居住空間。','ac-ledge-south':'主體內側跨度，未加入右側小凹位。'};
  $('#auxiliary-list').innerHTML=`<div class="auxiliary-grid">${project.auxiliary.spaces.map(s=>{const p=s.parts[0];return `<div>${t(names[s.id])} · ≈ ${Math.round(p.horizontal_cm)} × ${Math.round(p.vertical_cm)} cm<small>${t(notes[s.id])}</small></div>`;}).join('')}</div>`;
}
$('#toggle-dims').onclick=()=>{showDims=!showDims;$('#toggle-dims').classList.toggle('active',showDims);$('#toggle-dims').setAttribute('aria-pressed',String(showDims));renderDimensions();$('#selected-dimensions').style.display=showDims?'':'none';};
$('#toggle-objects').onclick=()=>{showObjects=!showObjects;$('#toggle-objects').classList.toggle('active',showObjects);$('#toggle-objects').setAttribute('aria-pressed',String(showObjects));$('#object-fills').style.display=showObjects?'':'none';$('#object-hits').style.display=showObjects?'':'none';hideTip();};
$('#object-search').addEventListener('input',renderInventory);$('#export-data').onclick=exportBackup;
$('#import-data').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw new Error(t('備份檔過大。'));const payload=JSON.parse(await file.text());if(payload.format!=='skg-home-atlas-backup')throw new Error(t('請選擇由此圖冊匯出的 JSON 備份。'));const incoming=validateOverrides(payload.overrides);if(!draftActive){draftActive=true;changes=structuredClone(draftChanges);}for(const[id,fields]of Object.entries(incoming.notes))changes.notes[id]={...(changes.notes[id]||{}),...fields};for(const[id,fields]of Object.entries(incoming.actual))changes.actual[id]={...(changes.actual[id]||{}),...fields};changes.versions={...changes.versions,...incoming.versions};save();renderKitchenVersion();renderDetails();renderInspector();renderInventory();syncEditMode();toast(t('備份已合併至本機草稿。'));}catch(error){toast(error.message||t('無法讀取此備份。'));}e.target.value='';};
$('#show-source').onclick=()=>{$('#source-dialog').showModal();};$('#close-source').onclick=()=>$('#source-dialog').close();
$$('[data-source]').forEach(b=>b.onclick=()=>{$$('[data-source]').forEach(x=>x.classList.toggle('active',x===b));$('#source-image').src=originalSources[b.dataset.source];$('#source-caption').textContent=b.dataset.source==='new'?t('新格局來源。原圖保留原始標註（mm）；互動圖冊已統一換算 cm。'):t('原始格局，僅作比較與 5 m 比例尺校驗。原 PDF 圖面與文字為左右鏡像，此處忠實保留。');});
$('#source-dialog').addEventListener('click',e=>{if(e.target===$('#source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
// The plan has no zoom of its own: it always fits its container width, and the browser's page zoom / pinch handles magnification.
window.addEventListener('scroll',hideTip,{passive:true});$('#plan-stage').addEventListener('pointerleave',hideTip);
$('#kitchen-version').addEventListener('click',e=>{const b=e.target.closest('[data-kitchen-version]');if(b)chooseKitchenVersion(b.dataset.kitchenVersion);});
$('#draft-mode').onclick=()=>{if(draftActive){draftChanges=structuredClone(changes);changes={notes:{},actual:{},versions:{}};draftActive=false;}else{changes=structuredClone(draftChanges);draftActive=true;}selectRoom(roomId,{keepObject:true});toast(draftActive?t('本機草稿'):t('共用設計版'));};
$('.brand').addEventListener('click',e=>{e.preventDefault();selectRoom('floor');});
// Static shell text: translate text nodes and a few attributes, remembering the Chinese source per node.
const DYNAMIC='#inspector,#details-content,#elevation-slot,#inventory-body,#tabs,#room-labels,#tooltip,#measurement-policy,#change-list,#auxiliary-list,#toast,#kitchen-version,#save-status,#drawing-title,#drawing-kicker,#details-title,#details-caption,#inventory-title,#source-caption,script,style';
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
  if(next===LANG)return;LANG=next;project=localize(projectSource);
  const u=new URL(location.href);u.searchParams.set('lang',LANG);history.replaceState(null,'',u.pathname+u.search+u.hash);
  for(const id of ['#room-zones','#room-labels','#object-fills','#object-hits'])$(id).replaceChildren();
  applyStatic();buildTabs();buildPlan();buildReference();renderKitchenVersion();selectRoom(roomId,{keepObject:true});syncEditMode();
}
$$('[data-lang]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setLang(a.dataset.lang);}));
applyStatic();syncKitchenURL();
buildTabs();buildPlan();buildReference();renderKitchenVersion();
const hash=decodeURIComponent(location.hash.slice(1));if(hash.startsWith('object-')&&object(hash.slice(7)))selectObject(hash.slice(7));else selectRoom(room(hash)?hash:'floor');
if(Object.keys(changes.notes).length||Object.keys(changes.actual).length)$('#save-status').textContent=t('已載入此瀏覽器的個人紀錄');
if(!storageOK)$('#save-status').textContent=t('此環境無法自動儲存，請匯出備份');
syncEditMode();
// Expose a read-only snapshot for focused QA and efficient future updates.
window.SKGAtlas={lang:()=>LANG,setLang,snapshot:()=>({roomId,objectId,showDims,showObjects,selectedVersions:{...selectedVersions},project:structuredClone(project),overrides:structuredClone(changes)}),applyOverrides:next=>{changes=validateOverrides(next);try{localStorage.setItem(STORAGE,JSON.stringify(changes));}catch{}renderKitchenVersion();renderInspector();renderDetails();renderInventory();renderDimensions();}};
})();
