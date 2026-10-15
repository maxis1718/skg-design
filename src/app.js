(() => {
'use strict';
const project=JSON.parse(document.getElementById('project-data').textContent);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg', STORAGE='skg-home-atlas-v1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:1});
const statusNames={annotated:'原圖標註',scaled:'圖面估算',design:'設計配置',fit:'配適設計'};
let changes={notes:{},actual:{},versions:{}}, roomId='floor', objectId=null, zoom=1, pan={x:0,y:0}, showDims=true, showObjects=true, dirty=false, storageOK=true, toastTimer;
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved&&saved.notes&&saved.actual) changes=saved;}catch(e){storageOK=false;}
changes.versions??={};let selectedVersions={kitchen:'kitchen-current'};
const repoMode=window.SKG_REPO_MODE===true;let draftActive=!repoMode,draftChanges=structuredClone(changes);
if(repoMode)changes={notes:{},actual:{},versions:{}};
try{selectedVersions={...selectedVersions,...JSON.parse(localStorage.getItem('skg-room-versions-v1')||'{}')};}catch{}
const room=id=>project.rooms.find(r=>r.id===id), baseObject=id=>project.objects.find(o=>o.id===id);
function kitchenVersions(){const versions=new Map((project.roomVersions?.kitchen||[]).map(v=>[v.id,v]));for(const[key,v]of Object.entries(changes.versions||{}))if(key.startsWith('kitchen:'))versions.set(v.id,v);return [...versions.values()];}
function kitchenVersion(){return kitchenVersions().find(v=>v.id===selectedVersions.kitchen)||kitchenVersions()[0];}
function object(id){const o=baseObject(id);if(!o)return;const patch=o.room_id==='kitchen'?kitchenVersion()?.objectOverrides?.[id]:null;return patch?{...o,...patch,dimensions:patch.dimensions?{...o.dimensions,...patch.dimensions}:o.dimensions}:o;}
function visibleObjects(){return project.objects.filter(o=>!o.onlyLayouts||o.onlyLayouts.includes(kitchenVersion()?.layout)).map(o=>object(o.id));}
const actual=o=>({...o.actual,...(changes.actual[o.id]||{})});
const fieldsFor=r=>r.id==='kitchen'?kitchenVersion()?.notes||r.notes:r.notes;
const note=(r,key)=>r.id==='kitchen'?(changes.versions['kitchen:'+kitchenVersion().id]?.notes?.[key]??(kitchenVersion().id==='kitchen-current'?changes.notes.kitchen?.[key]:null)??kitchenVersion().notes[key]??''):(changes.notes[r.id]?.[key]??r.notes[key]??'');
const dimension=d=>`${['scaled','fit'].includes(d.status)?'≈ ':''}${num(d.cm)}`;
const size=o=>`${dimension(o.dimensions.w)} × ${dimension(o.dimensions.d)}`;
const roomSize=r=>{const p=r.parts[0];return `≈ ${num(p.horizontal_cm)} × ${num(p.vertical_cm)}`;};
const statuses=o=>[...new Set(Object.values(o.dimensions).map(d=>statusNames[d.status]))].join(' / ');
const labelPositions={living:[483,249],kitchen:[514,318],helper:[442,320],master:[230,252],kid:[315,204],study:[321,319],guest:[378,204]};
const originalSources={new:'/*__SOURCE_NEW__*/',original:'/*__SOURCE_OLD__*/'};
function svgEl(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
function save(){dirty=true;try{localStorage.setItem(STORAGE,JSON.stringify(changes));storageOK=true;$('#save-status').textContent='個人紀錄已存於此瀏覽器';}catch(e){storageOK=false;$('#save-status').textContent='此環境無法自動儲存，請匯出備份';}window.dispatchEvent(new CustomEvent('skg:change')); }
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function syncEditMode(){
 const locked=repoMode&&!draftActive;
 $$('textarea[data-note-key],[data-actual]').forEach(el=>el.readOnly=locked);
 $('#copy-version').disabled=locked;$('#rename-version').disabled=locked;
 $('#draft-mode').setAttribute('aria-pressed',String(draftActive));$('#draft-mode').classList.toggle('active',draftActive);
 $('#save-status').textContent=draftActive?'本機草稿 · 僅此裝置；正式修改請由 agent commit / push':'共用版本 R03 · 正式修改經 repo 發佈';
}
function effectiveVersionCopy(){const v=structuredClone(kitchenVersion());v.notes=Object.fromEntries(Object.keys(fieldsFor(room('kitchen'))).map(k=>[k,note(room('kitchen'),k)]));return v;}
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
    g.append(svgEl('text',{x,y:y+4.8,class:'en'},english));
    g.append(svgEl('text',{x,y:y+9.4,class:'size'},roomSize(r)+' cm'));$('#room-labels').append(g);
  }
  const auxLabels=[['主臥陽台',225,157],['客廳陽台',505,143],['衛浴 1',216,338],['衛浴 2',401,309],['A/C',164,279],['A/C',385,340],['入口',563,394]];
  for(const[t,x,y]of auxLabels)$('#room-labels').append(svgEl('text',{x,y,class:'aux-label'},t));
  for(const o of project.objects){
    const[x0,y0,x1,y1]=o.bounds_pt, attrs={x:x0,y:y0,width:x1-x0,height:y1-y0,rx:.8,'data-object':o.id};
    $('#object-fills').append(svgEl('rect',{...attrs,class:'object-fill'}));
    const hit=svgEl('rect',{...attrs,class:'object-hit','aria-label':`${o.name}，${size(o)} cm`});
    hit.append(svgEl('title',{},`${o.code} ${o.name} · ${size(o)} cm · ${statuses(o)}；高度待提供`));
    hit.addEventListener('pointerenter',e=>showTip(e,object(o.id)));hit.addEventListener('pointermove',positionTip);hit.addEventListener('pointerleave',hideTip);
    hit.addEventListener('click',e=>{e.stopPropagation();selectObject(o.id);hideTip();});$('#object-hits').append(hit);
  }
}
function renderKitchenVersion(){
 const version=kitchenVersion();if(!version)return;
 $('#kitchen-version').innerHTML=kitchenVersions().map(v=>`<option value="${esc(v.id)}" ${v.id===version.id?'selected':''}>${esc(v.name)}</option>`).join('');
 $('#version-brief').textContent=version.layout==='original'?'原配置保留':'窗下水槽 · 右端瓦斯爐 · 三層可拉出電器櫃';
 const baseline={'kitchen-sink':[462.36,336.28,479.52,350.56],'kitchen-hob':[497.64,337.24,518.88,349.12]};
 for(const[id,source]of Object.entries(baseline)){
   const target=object(id).bounds_pt,sx=(target[2]-target[0])/(source[2]-source[0]),sy=(target[3]-target[1])/(source[3]-source[1]);
   $('#'+id+'-geometry').setAttribute('transform',`translate(${target[0]} ${target[1]}) scale(${sx} ${sy}) translate(${-source[0]} ${-source[1]})`);
 }
 const tower=$('#appliance-tower-geometry');tower.replaceChildren();tower.toggleAttribute('hidden',version.layout!=='window-sink');
 if(version.layout==='window-sink'){
   const[x0,y0,x1,y1]=object('appliance-tower').bounds_pt;
   tower.append(svgEl('rect',{x:x0,y:y0,width:x1-x0,height:y1-y0,fill:'#d5c2a5','fill-opacity':'.65',stroke:'#8e704c','stroke-width':'.5'}));
   tower.append(svgEl('path',{d:`M${x0+2} ${y0+5}H${x1-2}M${x0+2} ${y0+9}H${x1-2}M${x0+2} ${y0+13}H${x1-2}`,stroke:'#8e704c','stroke-width':'.4'}));
 }
 const visible=new Set(visibleObjects().map(o=>o.id));
 $$('.object-hit,.object-fill').forEach(el=>{const o=object(el.dataset.object);el.style.display=visible.has(o.id)?'':'none';const[x0,y0,x1,y1]=o.bounds_pt;for(const[k,v]of Object.entries({x:x0,y:y0,width:x1-x0,height:y1-y0}))el.setAttribute(k,v);if(el.classList.contains('object-hit')){el.setAttribute('aria-label',`${o.name}，${size(o)} cm`);const title=el.querySelector('title');if(title)title.textContent=`${o.code} ${o.name} · ${size(o)} cm · ${statuses(o)}`;}});
 if(objectId&&!visible.has(objectId))objectId=null;
}
function chooseKitchenVersion(id){
 if(!kitchenVersions().some(v=>v.id===id))return;selectedVersions.kitchen=id;
 try{localStorage.setItem('skg-room-versions-v1',JSON.stringify(selectedVersions));}catch{}
 renderKitchenVersion();selectRoom(roomId,{keepObject:true});
}
function copyVersion(){
 const current=kitchenVersion(),name=prompt('新方案名稱',current.name+' · 副本');if(!name?.trim())return;
 const id='kitchen-'+Date.now().toString(36);const version=structuredClone(current);version.id=id;version.name=name.trim().slice(0,80);version.baseId=current.id;version.createdAt=new Date().toISOString();
 version.notes=Object.fromEntries(Object.keys(fieldsFor(room('kitchen'))).map(k=>[k,note(room('kitchen'),k)]));
 changes.versions['kitchen:'+id]=version;save();chooseKitchenVersion(id);toast('方案已複製，筆記可獨立修改。');
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
    if(id==='kid'||id==='guest'){
      dimensionLine(g,x0,130,x1,130,'≈ '+num(p.horizontal_cm));
      if(id==='guest'||roomId!=='floor')dimensionLine(g,x1-3,y0,x1-3,y1,'≈ '+num(p.vertical_cm));
    }else if(id==='study'){
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
  dimensionLine(g,x0,y0-3,x1,y0-3,dimension(hd)+' cm',true);
  dimensionLine(g,x1+4,y0,x1+4,y1,dimension(vd)+' cm',true);
}
function showTip(e,o){
  const a=actual(o),hasActual=['w','d','h'].some(k=>a[k]!=null);
  $('#tooltip').innerHTML=`<span class="tip-code">${o.code}</span><strong>${esc(o.name)}</strong><div class="tip-value">${size(o)} <small>cm</small></div><small>${statuses(o)}</small>${hasActual?`<div><small>實物 W × D × H：${['w','d','h'].map(k=>a[k]==null?'—':num(a[k])).join(' × ')} cm</small></div>`:'<div><small>實物寬、深、高待提供</small></div>'}`;
  $('#tooltip').hidden=false;positionTip(e);
}
function positionTip(e){const tip=$('#tooltip');if(tip.hidden)return;const box=$('#plan-stage').getBoundingClientRect();const left=Math.max(8,Math.min(e.clientX-box.left+15,box.width-tip.offsetWidth-8));const top=Math.max(8,Math.min(e.clientY-box.top+14,box.height-tip.offsetHeight-8));tip.style.left=left+'px';tip.style.top=top+'px';}
function hideTip(){$('#tooltip').hidden=true;}
function selectRoom(id,{keepObject=false}={}){
  if(id!=='floor'&&!room(id))return;roomId=id;if(!keepObject)objectId=null;
  $$('#tabs .tab').forEach(b=>{const selected=b.dataset.room===id;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  $('#main-panel').setAttribute('aria-labelledby','tab-'+id);
  $('#drawing-title').textContent=id==='floor'?'全屋平面圖':room(id).name+' · 空間定位';
  $('#drawing-kicker').textContent=id==='floor'?'THE PROPOSED LAYOUT':room(id).english.toUpperCase();
  $$('.room-zone').forEach(z=>{z.classList.toggle('selected',z.dataset.room===id);z.classList.toggle('dimmed',id!=='floor'&&z.dataset.room!==id);});
  $$('[data-label-room]').forEach(z=>z.classList.toggle('muted',id!=='floor'&&z.dataset.labelRoom!==id));
  $$('.object-hit').forEach(z=>z.classList.toggle('selected',z.dataset.object===objectId));
  history.replaceState(null,'','#'+(objectId?'object-'+objectId:id));
  if(zoom>1){pan={x:0,y:0};applyZoom();}
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
    node.innerHTML=`<p class="eyebrow">OBJECT / ${o.code}</p><h2>${esc(o.name)}</h2><div class="en-title">${r.name} · 圖面占位</div><div class="big-number">${size(o)}<span>cm</span></div><div class="inspector-note">W × D · ${statuses(o)}</div><p class="inspector-text">${esc(o.source_note)}</p><hr class="inspector-rule"><div class="detail-subhead"><h3>實物資料</h3><span class="status-tag">待補齊</span></div><div class="actual-form">${['w','d','h'].map((k,i)=>`<label>${['寬 W','深 D','高 H'][i]} · cm<input type="number" step="0.1" min="0.1" max="10000" inputmode="decimal" data-actual="${k}" value="${a[k]??''}" placeholder="待提供" aria-label="${o.name}${['實物寬','實物深','實物高'][i]}（cm）"></label>`).join('')}<label class="wide">品牌<input data-actual="brand" value="${esc(a.brand)}" placeholder="待提供"></label><label class="wide">型號<input data-actual="model" value="${esc(a.model)}" placeholder="待提供"></label></div><p class="edit-hint">共用版透過 agent 更新 repo；若要暫記，可開啟頁首「本機草稿」。草稿只存此裝置。</p><div class="spacer"></div><button class="inspector-button" id="return-room">回到${r.name}概覽</button>`;
    $$('#inspector [data-actual]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.actual;let value=input.value.trim();if(['w','d','h'].includes(key)){value=value===''?null:Number(value);if(value!==null&&(!Number.isFinite(value)||value<=0||value>10000)){input.setCustomValidity('請輸入大於 0 的有效尺寸。');input.reportValidity();return;}input.setCustomValidity('');}else value=value||null;changes.actual[o.id]={...(changes.actual[o.id]||{}),[key]:value};save();renderInventory();const current=actual(o),filled=['w','d','h','brand','model'].filter(k=>current[k]!=null).length;$('#inspector .status-tag').textContent=filled===5?'資料齊全':filled>0?'已有部分資料':'待補齊';}));
    const filled=['w','d','h','brand','model'].filter(k=>a[k]!=null).length;$('#inspector .status-tag').textContent=filled===5?'資料齊全':filled>0?'已有部分資料':'待補齊';
    $('#return-room').onclick=()=>selectRoom(r.id);return;
  }
  if(roomId==='floor'){
    node.innerHTML=`<p class="eyebrow">目前圖面 / ${project.project.revision}</p><h2>配置與尺寸</h2><div class="en-title">${esc(kitchenVersion().name)}</div><hr class="inspector-rule"><p class="inspector-text">選房間查看分區尺寸與設計筆記。點選物件可補充實物尺寸、品牌與型號。</p><div class="inspector-pair"><span>書房書桌</span><strong>≈ 230 × 50 cm</strong></div><div class="inspector-pair"><span>客房衣櫃</span><strong>120 × 60 cm</strong></div><div class="inspector-pair"><span>廚房方案</span><strong>${kitchenVersions().length} 版，可切換</strong></div><div class="spacer"></div><div class="inspector-pair"><span>主要空間</span><strong>07</strong></div><div class="inspector-pair"><span>本版物件</span><strong>${String(visibleObjects().length).padStart(2,'0')}</strong></div><p class="inspector-foot">尺寸單位 cm。≈ 為圖面估算。<br>原標、設計值與實物資料分開記錄。</p>`;
  }else{
    const r=room(roomId),p=r.parts[0],count=visibleObjects().filter(o=>o.room_id===r.id).length;
    node.innerHTML=`<p class="eyebrow">SPACE / ${r.number}</p><h2>${r.name}</h2><div class="en-title">${r.english}</div><div class="big-number">${roomSize(r)}<span>cm</span></div><div class="inspector-note">${esc(p.label)} · 橫向 × 縱向</div><p class="inspector-text">${r.focus}</p><hr class="inspector-rule"><div class="inspector-pair"><span>原圖名稱</span><strong>${esc(r.source_label)}</strong></div><div class="inspector-pair"><span>收錄物件</span><strong>${count} 件</strong></div><div class="inspector-pair"><span>尺寸依據</span><strong>內牆面 / 窗室內側線</strong></div><div class="spacer"></div><p class="inspector-foot">${['master','living'].includes(r.id)?'不規則空間；上方為主要矩形區尺寸，分區詳見下方。':'包含櫃體與家具占位；淨走道另行記錄。'}<br>圖面讀值不代表現場實測。</p><button class="inspector-button" id="go-details">查看空間細節 ↓</button>`;
    $('#go-details').onclick=()=>$('#details-section').scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function renderDetails(){
  if(roomId==='floor'){
    $('#details-title').textContent='空間索引';$('#details-kicker').textContent='THE SPACES';$('#details-caption').textContent=`7 個空間 · 本版 ${visibleObjects().length} 個大型物件`;
    $('#details-content').innerHTML=`<div class="room-grid">${project.rooms.map(r=>`<button class="room-index" data-open-room="${r.id}"><div class="room-index-no">SPACE ${r.number}</div><span class="arrow">↗</span><h3>${r.name}</h3><div class="room-index-en">${r.english}</div><div class="room-index-dim">${roomSize(r)} cm${['master','living'].includes(r.id)?' · 主區':''}</div><p class="room-index-focus">${r.focus}</p></button>`).join('')}</div>`;
    $$('[data-open-room]').forEach(b=>b.onclick=()=>{selectRoom(b.dataset.openRoom);$('#main-panel').scrollIntoView({behavior:'smooth',block:'start'});});return;
  }
  const r=room(roomId);$('#details-title').textContent=r.name+' · 細節紀錄';$('#details-kicker').textContent='SPACE '+r.number+' / DETAILS';$('#details-caption').textContent=repoMode&&!draftActive?'共用紀錄 · 正式修改經 agent / repo 發佈':'本機草稿 · 點選文字即可編輯';
  $('#details-content').innerHTML=`<div class="room-detail-grid"><div class="dimension-list"><div class="detail-subhead"><h3>分區量測</h3><small>全部單位 cm</small></div>${r.parts.map(p=>`<div class="dimension-row"><span>${esc(p.label)}</span><strong>${p.horizontal_cm===0?'':(p.horizontal_cm===320.5?'':'≈ ')+num(p.horizontal_cm)+' × '}${p.vertical_cm===387.5?'':'≈ '}${num(p.vertical_cm)}</strong></div>`).join('')}<p class="quiet-note">依新格局圖量測內牆面，包含固定櫃占位。≈ 為等比讀值；小數原標尺寸保留。${['master','living'].includes(r.id)?'不以外包矩形推算整間面積。':''}</p>${r.id==='kitchen'&&kitchenVersion().layout==='window-sink'?'<div class="tower-elevation"><h3>電器櫃分區</h3><small>立面示意，不按比例；櫃高與每格淨尺寸待量</small><div class="tower-slot">上層 · 氣炸鍋 <span>可拉出</span></div><div class="tower-slot">中層 · 微波爐 <span>可拉出</span></div><div class="tower-slot">下層 · 電鍋 <span>可拉出</span></div><div class="tower-base">底部 · 封閉收納</div></div>':''}</div><div class="notes-panel"><div class="detail-subhead"><h3>${r.id==='kitchen'?esc(kitchenVersion().name)+' · 筆記':'設計筆記'}</h3><button class="plain-button" id="copy-discussion">複製討論提示 ↗</button></div>${Object.keys(fieldsFor(r)).map((key,i)=>`<div class="note-field"><label for="note-${i}">${esc(key)}</label><textarea id="note-${i}" data-note-key="${esc(key)}" rows="${note(r,key).length>45?3:2}" placeholder="待討論 / 待提供">${esc(note(r,key))}</textarea></div>`).join('')}<p class="quiet-note">${repoMode&&!draftActive?'共用筆記從 repo 載入；透過 Telegram／agent 修改後發佈。':'本機草稿只存此裝置，匯出可備份；不會直接修改共用版。'}${r.id==='kitchen'?'每個方案的筆記獨立保存。':''}</p></div></div>`;
  $$('[data-note-key]').forEach(input=>input.addEventListener('input',()=>{if(r.id==='kitchen'){const v=effectiveVersionCopy();v.notes[input.dataset.noteKey]=input.value;changes.versions['kitchen:'+v.id]=v;}else changes.notes[r.id]={...(changes.notes[r.id]||{}),[input.dataset.noteKey]:input.value};save();}));
  $('#copy-discussion').onclick=async()=>{const text=`請修改 SKG 空間圖冊的${r.name}（room_id: ${r.id}）${r.id==='kitchen'?'，方案 '+kitchenVersion().name+'（'+kitchenVersion().id+'）':''}。\n目前配置：${Object.keys(fieldsFor(r)).map(k=>k+'：'+note(r,k)).join('\n')}\n本次調整：`;
    try{await navigator.clipboard.writeText(text);toast('討論提示已複製，可貼回對話補充需求。');}catch(e){toast('可直接在對話中指定：'+r.name+'（'+r.id+'）');}};
}
function renderInventory(){
  const q=$('#object-search').value.trim().toLowerCase();const filtered=visibleObjects().filter(o=>(roomId==='floor'||o.room_id===roomId)&&`${o.name} ${o.code} ${o.id} ${room(o.room_id).name}`.toLowerCase().includes(q));
  $('#inventory-title').textContent=roomId==='floor'?'大型物件尺寸簿':room(roomId).name+' · 物件尺寸簿';
  $('#inventory-body').innerHTML=filtered.map(o=>{const r=room(o.room_id),a=actual(o);const vals=['w','d','h'].map(k=>a[k]==null?'—':num(a[k]));return `<tr data-item-row="${o.id}" class="${o.id===objectId?'is-selected':''}"><td><button data-open-object="${o.id}"><span class="item-code">${o.code}</span>${esc(o.name)}</button></td><td>${r.name}</td><td>${size(o)}</td><td><span class="status-tag ${/design|fit/.test(Object.values(o.dimensions).map(d=>d.status).join())?'design':''}">${statuses(o)}</span></td><td class="${vals.every(v=>v==='—')?'table-muted':''}">${vals.join(' × ')}</td><td class="table-muted">${esc([a.brand,a.model].filter(Boolean).join(' / ')||'待提供')}</td></tr>`;}).join('');
  $('#no-results').hidden=filtered.length>0;$$('[data-open-object]').forEach(b=>b.onclick=()=>selectObject(b.dataset.openObject,{scroll:true}));
}
function applyZoom(){
  const view={x:137,y:101,w:484,h:330};let centerX=379,centerY=266;
  if(roomId!=='floor'){const b=room(roomId).bounds_pt;centerX=(b[0]+b[2])/2;centerY=(b[1]+b[3])/2;}
  if(zoom===1){centerX=379;centerY=266;pan={x:0,y:0};}
  const w=view.w/zoom,h=view.h/zoom;
  let x=centerX-w/2+pan.x,y=centerY-h/2+pan.y;
  x=Math.max(137,Math.min(x,621-w));y=Math.max(101,Math.min(y,431-h));
  $('#plan').setAttribute('viewBox',[x,y,w,h].join(' '));$('#zoom-value').textContent=Math.round(zoom*100)+'%';
  $('#zoom-out').disabled=zoom<=1;$('#zoom-in').disabled=zoom>=3;
}
function exportBackup(){
  const effective=structuredClone(project);for(const r of effective.rooms)for(const key of Object.keys(r.notes))r.notes[key]=note(r,key)||null;for(const o of effective.objects)o.actual=actual(o);
  const payload={format:'skg-home-atlas-backup',version:1,exported_at:new Date().toISOString(),overrides:changes,project:effective};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skg-home-atlas-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出完整尺寸簿與個人紀錄。');
}
function validateOverrides(incoming){
  if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||typeof incoming.notes!=='object'||typeof incoming.actual!=='object')throw new Error('備份格式不正確。');
  const clean={notes:{},actual:{},versions:{}};
  for(const[id,fields]of Object.entries(incoming.notes||{})){const r=room(id);if(!r||!fields||typeof fields!=='object')continue;clean.notes[id]={};for(const key of Object.keys(r.notes))if(typeof fields[key]==='string'&&fields[key].length<=20000)clean.notes[id][key]=fields[key];}
  for(const[id,fields]of Object.entries(incoming.actual||{})){if(!object(id)||!fields||typeof fields!=='object')continue;clean.actual[id]={};for(const key of ['w','d','h'])if(fields[key]===null||typeof fields[key]==='number'&&Number.isFinite(fields[key])&&fields[key]>0&&fields[key]<=10000)clean.actual[id][key]=fields[key];for(const key of ['brand','model'])if(fields[key]===null||typeof fields[key]==='string'&&fields[key].length<1000)clean.actual[id][key]=fields[key];}
  for(const[key,v]of Object.entries(incoming.versions||{})){
    if(!/^kitchen:kitchen-[a-zA-Z0-9-]+$/.test(key)||!v||typeof v!=='object'||key!=='kitchen:'+v.id||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!['original','window-sink'].includes(v.layout)||typeof v.baseId!=='string'||typeof v.createdAt!=='string')continue;
    const notes={};for(const[k,value]of Object.entries(v.notes||{}).slice(0,40))if(typeof value==='string'&&value.length<=20000)notes[k]=value;
    const objectOverrides={};for(const[id,patch]of Object.entries(v.objectOverrides||{})){if(!baseObject(id)||baseObject(id).room_id!=='kitchen'||!Array.isArray(patch.bounds_pt)||patch.bounds_pt.length!==4||!patch.bounds_pt.every(Number.isFinite))continue;const b=patch.bounds_pt;if(b[0]>=b[2]||b[1]>=b[3]||b[0]<100||b[2]>700||b[1]<70||b[3]>450)continue;objectOverrides[id]={bounds_pt:b};if(patch.dimensions){const dims={};for(const axis of ['w','d']){const d=patch.dimensions[axis];if(d&&Number.isFinite(d.cm)&&d.cm>0&&d.cm<=10000&&statusNames[d.status])dims[axis]={cm:d.cm,status:d.status};}objectOverrides[id].dimensions=dims;}}
    clean.versions[key]={id:v.id,name:v.name,baseId:v.baseId,layout:v.layout,notes,objectOverrides,createdAt:v.createdAt};
  }
  return clean;
}
function buildReference(){
  const p=project.measurement_policy;
  $('#measurement-policy').innerHTML=[['基準',p.basis],['原標',p.annotated],['估算',p.scaled],['配適',p.fit],['實物',p.actual],['校準',p.calibration],['範圍',p.scope]].map(([k,v])=>`<p><b>${k}</b>　${esc(v)}</p>`).join('');
  $('#change-list').innerHTML=project.changes.map(c=>`<div class="change-item"><span>${c.id} / ${Number(c.id.slice(1))<=3?'R02':'R03'}</span>${esc(c.text)}</div>`).join('');
  const names={'master-balcony':'主臥陽台','living-balcony':'客廳陽台',bath1:'主臥衛浴 1',bath2:'衛浴 2','ac-ledge-west':'西側冷氣平台','ac-ledge-south':'南側冷氣平台'};
  const notes={'master-balcony':'右下有缺角，為最大內跨度。','living-balcony':'滑門線有階差，中央深度再增加約 10 cm。',bath1:'不規則；主要區約 243 × 198，最大外框約 285 × 218 cm。',bath2:'不規則；為最大內跨度，下半區約 247 × 107 cm。','ac-ledge-west':'主體內側跨度，含平台區，非居住空間。','ac-ledge-south':'主體內側跨度，未加入右側小凹位。'};
  $('#auxiliary-list').innerHTML=`<div class="auxiliary-grid">${project.auxiliary.spaces.map(s=>{const p=s.parts[0];return `<div>${names[s.id]} · ≈ ${Math.round(p.horizontal_cm)} × ${Math.round(p.vertical_cm)} cm<small>${notes[s.id]}</small></div>`;}).join('')}</div>`;
}
$('#toggle-dims').onclick=()=>{showDims=!showDims;$('#toggle-dims').classList.toggle('active',showDims);$('#toggle-dims').setAttribute('aria-pressed',String(showDims));renderDimensions();$('#selected-dimensions').style.display=showDims?'':'none';};
$('#toggle-objects').onclick=()=>{showObjects=!showObjects;$('#toggle-objects').classList.toggle('active',showObjects);$('#toggle-objects').setAttribute('aria-pressed',String(showObjects));$('#object-fills').style.display=showObjects?'':'none';$('#object-hits').style.display=showObjects?'':'none';hideTip();};
$('#zoom-in').onclick=()=>{zoom=Math.min(3,zoom+.25);applyZoom();};$('#zoom-out').onclick=()=>{zoom=Math.max(1,zoom-.25);applyZoom();};$('#reset-view').onclick=()=>{zoom=1;applyZoom();};
$('#object-search').addEventListener('input',renderInventory);$('#export-data').onclick=exportBackup;
$('#import-data').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw new Error('備份檔過大。');const payload=JSON.parse(await file.text());if(payload.format!=='skg-home-atlas-backup')throw new Error('請選擇由此圖冊匯出的 JSON 備份。');const incoming=validateOverrides(payload.overrides);if(!draftActive){draftActive=true;changes=structuredClone(draftChanges);}for(const[id,fields]of Object.entries(incoming.notes))changes.notes[id]={...(changes.notes[id]||{}),...fields};for(const[id,fields]of Object.entries(incoming.actual))changes.actual[id]={...(changes.actual[id]||{}),...fields};changes.versions={...changes.versions,...incoming.versions};save();renderKitchenVersion();renderDetails();renderInspector();renderInventory();syncEditMode();toast('備份已合併至本機草稿。');}catch(error){toast(error.message||'無法讀取此備份。');}e.target.value='';};
$('#show-source').onclick=()=>{$('#source-dialog').showModal();};$('#close-source').onclick=()=>$('#source-dialog').close();
$$('[data-source]').forEach(b=>b.onclick=()=>{$$('[data-source]').forEach(x=>x.classList.toggle('active',x===b));$('#source-image').src=originalSources[b.dataset.source];$('#source-caption').textContent=b.dataset.source==='new'?'新格局來源。原圖保留原始標註（mm）；互動圖冊已統一換算 cm。':'原始格局，僅作比較與 5 m 比例尺校驗。原 PDF 圖面與文字為左右鏡像，此處忠實保留。';});
$('#source-dialog').addEventListener('click',e=>{if(e.target===$('#source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let drag=null;
$('#plan').addEventListener('pointerdown',e=>{if(zoom<=1||e.target.closest('.object-hit')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,pan:{...pan},moved:false};});
$('#plan').addEventListener('pointermove',e=>{if(!drag)return;const box=$('#plan').getBoundingClientRect();const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(drag.moved){pan={x:drag.pan.x-dx*484/zoom/box.width,y:drag.pan.y-dy*330/zoom/box.height};applyZoom();hideTip();}});
window.addEventListener('pointerup',()=>{if(drag?.moved){$('#plan').addEventListener('click',e=>{e.stopPropagation();e.preventDefault();},{once:true,capture:true});}drag=null;});
$('#kitchen-version').onchange=e=>chooseKitchenVersion(e.target.value);$('#copy-version').onclick=copyVersion;
$('#rename-version').onclick=()=>{const v=effectiveVersionCopy(),name=prompt('方案名稱',v.name);if(!name?.trim())return;v.name=name.trim().slice(0,80);changes.versions['kitchen:'+v.id]=v;save();renderKitchenVersion();renderInspector();renderDetails();syncEditMode();};
$('#draft-mode').onclick=()=>{if(draftActive){draftChanges=structuredClone(changes);changes={notes:{},actual:{},versions:{}};draftActive=false;}else{changes=structuredClone(draftChanges);draftActive=true;}selectRoom(roomId,{keepObject:true});toast(draftActive?'本機草稿只存這台裝置；正式修改請透過 Telegram／agent 更新 repo。':'已切回 repo 發佈的共用版本。');};
$('.brand').addEventListener('click',e=>{e.preventDefault();selectRoom('floor');});
buildTabs();buildPlan();buildReference();renderKitchenVersion();applyZoom();
const hash=decodeURIComponent(location.hash.slice(1));if(hash.startsWith('object-')&&object(hash.slice(7)))selectObject(hash.slice(7));else selectRoom(room(hash)?hash:'floor');
if(Object.keys(changes.notes).length||Object.keys(changes.actual).length)$('#save-status').textContent='已載入此瀏覽器的個人紀錄';
if(!storageOK)$('#save-status').textContent='此環境無法自動儲存，請匯出備份';
syncEditMode();
// Expose a read-only snapshot for focused QA and efficient future updates.
window.SKGAtlas={snapshot:()=>({roomId,objectId,zoom,showDims,showObjects,selectedVersions:{...selectedVersions},project:structuredClone(project),overrides:structuredClone(changes)}),applyOverrides:next=>{changes=validateOverrides(next);try{localStorage.setItem(STORAGE,JSON.stringify(changes));}catch{}renderKitchenVersion();renderInspector();renderDetails();renderInventory();renderDimensions();}};
})();
