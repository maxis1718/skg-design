// Elevation renderer: draws cabinet front / section / wall views from project.json → elevations.
// Units are cm; elevation y is measured up from the finished floor. Pure string output, no DOM needed.
(() => {
'use strict';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
const C = {
  line:'#2f443c', thin:'#7f8c84', faint:'#b9c2bb', front:'#fbfaf5', interior:'#eef1ea', board:'#d3c4aa',
  plinth:'#d7dbd2', dim:'#a96f47', item:'#ffffff', itemLine:'#55695f', box:'#eadcc4', garment:'#cfdcd2',
  stone:'#c9c5bb', glass:'#e3edf0', level:'#8fa197'
};

// Resolve bands (bottom → top) to absolute ranges inside a unit.
function bands(u) { let y = 0; return u.bands.map(b => { const r = {...b, y0:y, y1:y + b.h}; y += b.h; return r; }); }
function checkUnit(u) { const total = u.bands.reduce((s, b) => s + b.h, 0); return Math.abs(total - u.h) < 0.05; }

function canvas(H, font) {
  const out = [];
  const Y = y => H - y; // floor-up cm → svg y
  const f = font;
  const api = {
    out, f, Y,
    rect(x, y, w, h, a = {}) { out.push(`<rect x="${x}" y="${Y(y + h)}" width="${w}" height="${h}" ${attrs(a)}/>`); },
    line(x1, y1, x2, y2, a = {}) { out.push(`<line x1="${x1}" y1="${Y(y1)}" x2="${x2}" y2="${Y(y2)}" ${attrs(a)}/>`); },
    path(d, a = {}) { out.push(`<path d="${d}" ${attrs(a)}/>`); },
    text(x, y, s, a = {}) { out.push(`<text x="${x}" y="${Y(y)}" ${attrs({'font-size':f, ...a})}>${esc(s)}</text>`); },
  };
  return api;
}
function attrs(a) { return Object.entries(a).filter(([, v]) => v != null).map(([k, v]) => `${k}="${esc(v)}"`).join(' '); }

function frontLeaves(u, fr) {
  const n = fr.count || 1, gap = 0.4, w = (u.w - gap * (n + 1)) / n;
  return Array.from({length:n}, (_, i) => ({x: gap + i * (w + gap), w, hinge: fr.hinges?.[i] ?? (n === 2 ? (i === 0 ? 'L' : 'R') : 'L')}));
}

// Draw a unit (front elevation) at (ox, oy).
function drawUnit(g, u, ox, oy, state, detail) {
  const t = u.board ?? 1.8, B = bands(u), sw = detail ? .35 : .3;
  g.rect(ox, oy, u.w, u.h, {fill:C.interior, stroke:'none'});
  for (const b of B) {
    const y0 = oy + b.y0, ix = ox + t, iw = u.w - 2 * t;
    if (b.kind === 'plinth') { g.rect(ox, y0, u.w, b.h, {fill:C.plinth, stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'filler') { g.rect(ox, y0, u.w, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'board') { g.rect(ox, y0, u.w, b.h, {fill:C.board, stroke:'none'}); continue; }
    if (b.kind === 'worktop') { g.rect(ox, y0, u.w, b.h, {fill:C.stone, stroke:C.line, 'stroke-width':.25}); continue; }
    if (b.kind === 'tier') {
      g.rect(ix + .4, y0, iw - .8, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      if (detail) g.rect(ix + 1.5, oy + b.y1 - 4.5, 3.6, 2.4, {fill:'#fff', stroke:C.thin, 'stroke-width':.2, rx:.4});
      placeItems(g, b.items || [], ix, iw, y0 + 1.6, detail, b.h - 1.6);
      continue;
    }
    if (b.kind === 'boxes' || b.kind === 'cabinet') {
      for (const s of b.shelves || []) g.rect(ix, y0 + s, iw, t, {fill:C.board, stroke:'none'});
      placeItems(g, b.items || [], ix, iw, y0, detail, b.h, b.align);
      continue;
    }
    if (b.kind === 'hang') {
      const rail = oy + b.rail, gl = b.garments?.len ?? 90, n = b.garments?.count ?? 8;
      for (let i = 0; i < n; i++) {
        const cx = ix + 4 + (i + .5) * ((iw - 8) / n), wv = Math.min(4.2, (iw - 8) / n * .55);
        g.path(`M${cx} ${g.Y(rail)}v3.2`, {stroke:C.thin, 'stroke-width':.25, fill:'none'});
        g.rect(cx - wv / 2, rail - 3.2 - gl, wv, gl, {fill:C.garment, stroke:'#9db0a3', 'stroke-width':.2, rx:1.2});
      }
      g.rect(ix, rail - .6, iw, 1.2, {fill:'#8f9a93', stroke:'none', rx:.6});
      if (detail) g.text(ix + iw / 2, y0 + 1.6, b.garments?.label || '', {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
    }
  }
  // side panels
  g.rect(ox, oy, t, u.h, {fill:C.board, stroke:'none'});
  g.rect(ox + u.w - t, oy, t, u.h, {fill:C.board, stroke:'none'});
  // fronts
  for (const fr of u.fronts || []) {
    const y0 = oy + fr.from, h = fr.to - fr.from;
    for (const lf of frontLeaves(u, fr)) {
      const x = ox + lf.x;
      if (fr.kind === 'drawer') {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        g.rect(x + lf.w * .3, y0 + h - 2.6, lf.w * .4, .7, {fill:C.thin, stroke:'none', rx:.35});
      } else if (state === 'open') {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      } else {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        const hx = lf.hinge === 'L' ? x : x + lf.w, fx = lf.hinge === 'L' ? x + lf.w : x, my = y0 + h / 2;
        g.path(`M${fx} ${g.Y(y0 + h - .2)}L${hx} ${g.Y(my)}L${fx} ${g.Y(y0 + .2)}`, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
        const hy = Math.min(Math.max(y0 + 4, 100), y0 + h - 14), handleX = lf.hinge === 'L' ? x + lf.w - 1.6 : x + 1;
        g.rect(handleX, hy, .6, Math.min(12, h * .4), {fill:C.thin, stroke:'none', rx:.3});
      }
    }
    if (fr.label && (fr.kind === 'drawer' || state !== 'open') && detail !== false) {
      g.text(ox + u.w / 2, y0 + h / 2 - g.f * .3, fr.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * (detail ? .78 : .9)});
    }
  }
  g.rect(ox, oy, u.w, u.h, {fill:'none', stroke:C.line, 'stroke-width':detail ? .5 : .4});
  if (u.caption && !detail) g.text(ox + u.w / 2, oy + u.h + g.f * .55, u.caption, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .85});
}

function placeItems(g, items, ix, iw, y0, detail, room, align) {
  if (!items.length) return;
  const gap = 3, total = items.reduce((s, it) => s + it.w, 0) + gap * (items.length - 1);
  let x = ix + (align === 'left' ? 1.5 : Math.max(1, (iw - total) / 2));
  for (const it of items) {
    const h = Math.min(it.h, room - .5);
    g.rect(x, y0, it.w, h, {fill:it.dashed ? 'none' : (it.box ? C.box : C.item), stroke:it.dashed ? C.faint : C.itemLine, 'stroke-width':.3, 'stroke-dasharray':it.dashed ? '1.4 1' : null, rx:it.box ? .6 : 1.6});
    const fs = g.f * (detail ? .74 : .8);
    if (h > fs * 2.4 && it.w > fs * 2) {
      g.text(x + it.w / 2, y0 + h / 2 + fs * .35, it.name, {'text-anchor':'middle', fill:C.line, 'font-size':fs});
      if (detail && it.size !== false && h > fs * 4) g.text(x + it.w / 2, y0 + h / 2 - fs * 1.05, it.sizeLabel ?? `${fmt(it.w)}×${fmt(it.h)}`, {'text-anchor':'middle', fill:C.thin, 'font-size':fs * .82});
    }
    x += it.w + gap;
  }
}

// Vertical dimension chain to the right of a unit.
function chain(g, u, ox, oy, x) {
  const B = bands(u), tick = 1.2, s = {stroke:C.dim, 'stroke-width':.25};
  g.line(x, oy, x, oy + u.h, s);
  for (const b of B) {
    g.line(x - tick, oy + b.y0, x + tick, oy + b.y0, s);
    if (b.h >= 5) g.text(x + 1.6, oy + (b.y0 + b.y1) / 2 - g.f * .32, fmt(b.h), {fill:C.dim, 'font-size':g.f * .8});
  }
  g.line(x - tick, oy + u.h, x + tick, oy + u.h, s);
  const x2 = x + g.f * 3.6;
  g.line(x2, oy, x2, oy + u.h, s); g.line(x2 - tick, oy, x2 + tick, oy, s); g.line(x2 - tick, oy + u.h, x2 + tick, oy + u.h, s);
  const my = oy + u.h / 2;
  g.out.push(`<text x="${x2 + 1.4}" y="${g.Y(my)}" font-size="${g.f * .85}" fill="${C.dim}" transform="rotate(-90 ${x2 + 1.4} ${g.Y(my)})" text-anchor="middle" dy="${g.f * .7}">${fmt(u.h)}</text>`);
}
function hdim(g, x0, x1, y, label, emphasize) {
  const s = {stroke:C.dim, 'stroke-width':.25};
  g.line(x0, y, x1, y, s); g.line(x0, y - 1.2, x0, y + 1.2, s); g.line(x1, y - 1.2, x1, y + 1.2, s);
  g.text((x0 + x1) / 2, y + .9, label, {'text-anchor':'middle', fill:C.dim, 'font-size':g.f * (emphasize ? .85 : .78)});
}
function levels(g, view, x0, x1) {
  for (const lv of view.levels || []) {
    g.line(x0, lv.y, x1, lv.y, {stroke:C.level, 'stroke-width':.2, 'stroke-dasharray':'2 1.4'});
    g.text(x0, lv.y + .9, `▽ ${fmt(lv.y)} ${lv.label || ''}`, {fill:C.level, 'font-size':g.f * .72});
  }
}

function extras(g, list) {
  for (const e of list || []) {
    if (e.type === 'window') {
      g.rect(e.x, e.y, e.w, e.h, {fill:C.glass, stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'2 1.2'});
      g.line(e.x + e.w / 2, e.y, e.x + e.w / 2, e.y + e.h, {stroke:C.faint, 'stroke-width':.25});
      if (e.label) g.text(e.x + e.w / 2, e.y + e.h / 2, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
      if (e.sub) g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * 1.2, e.sub, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .62});
    } else if (e.type === 'hood') {
      g.path(`M${e.x} ${g.Y(e.y)}H${e.x + e.w}L${e.x + e.w - 4} ${g.Y(e.y + e.h)}H${e.x + 4}Z`, {fill:'#e2e4de', stroke:C.line, 'stroke-width':.35});
      g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * .3, e.label || '排油煙機', {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .8});
    } else if (e.type === 'worktop') {
      g.rect(e.x, e.y, e.w, e.h, {fill:C.stone, stroke:C.line, 'stroke-width':.3});
    } else if (e.type === 'hob') {
      g.rect(e.x, e.y, e.w, 1.2, {fill:'#4b5751', stroke:'none'});
      for (const k of [.28, .72]) g.rect(e.x + e.w * k - 5, e.y + 1.2, 10, 1.6, {fill:'#4b5751', stroke:'none'});
      if (e.label) g.text(e.x + e.w / 2, e.y + 4.4, e.label, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .78});
    } else if (e.type === 'sink') {
      g.rect(e.x, e.y - e.depth, e.w, e.depth, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      g.path(`M${e.x + e.w / 2} ${g.Y(e.y)}v-14h5v2`, {fill:'none', stroke:C.line, 'stroke-width':.6});
      if (e.label) g.text(e.x + e.w / 2, e.y - e.depth / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
    } else if (e.type === 'optional') {
      g.rect(e.x, e.y, e.w, e.h, {fill:'none', stroke:C.dim, 'stroke-width':.3, 'stroke-dasharray':'1.6 1.2'});
      if (e.label) g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:C.dim, 'font-size':g.f * .7});
    } else if (e.type === 'wall') {
      g.rect(e.x, 0, e.w, e.h, {fill:'url(#elev-wall)', stroke:C.line, 'stroke-width':.4});
      if (e.label) g.out.push(`<text x="${e.x + e.w / 2}" y="${g.Y(e.h / 2)}" font-size="${g.f * .78}" fill="${C.thin}" transform="rotate(-90 ${e.x + e.w / 2} ${g.Y(e.h / 2)})" text-anchor="middle" dy="${g.f * .3}">${esc(e.label)}</text>`);
    } else if (e.type === 'text') {
      g.text(e.x, e.y, e.label, {'text-anchor':e.anchor || 'middle', fill:e.color || C.thin, 'font-size':g.f * (e.size || .8)});
    }
  }
}

function defs() {
  return `<defs><pattern id="elev-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V2" stroke="#b7beb6" stroke-width=".5"/></pattern><pattern id="elev-wall" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" stroke="#a8b1a9" stroke-width=".35"/></pattern></defs>`;
}

function renderFront(elev, view, state) {
  const units = view.units.map(r => ({...r, u:elev.units[r.ref]}));
  const W = view.width ?? Math.max(...units.map(r => r.x + r.u.w)), H = view.height ?? elev.ceiling_cm;
  const detail = view.detail !== false && units.length === 1;
  const f = view.font ?? Math.max(5.4, W / 24);
  const m = {l: view.levels?.length ? f * 6.2 : f * 2, r: detail ? f * 8 : f * 2, t: f * 2.4, b: f * (view.hcuts ? 5.4 : 3.6)};
  const g = canvas(H, f);
  levels(g, view, -m.l + f * .4, W);
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
  g.text(W + m.r - f, H + .9, view.ceilingLabel || `天花 ${fmt(H)}`, {'text-anchor':'end', fill:C.thin, 'font-size':f * .72});
  extras(g, view.under);
  for (const r of units) drawUnit(g, r.u, r.x, r.y || 0, state, detail);
  extras(g, view.extras);
  if (detail) { const r = units[0]; chain(g, r.u, r.x, r.y || 0, r.x + r.u.w + f * 1.1); hdim(g, r.x, r.x + r.u.w, -f * 1.6, `${fmt(r.u.w)}`, true); }
  for (const r of units) if (r.label) g.text(r.x + r.u.w / 2, -f * 1.6, r.label, {'text-anchor':'middle', fill:C.line, 'font-size':f * .8});
  if (view.hcuts) {
    const cuts = view.hcuts;
    for (let i = 0; i < cuts.length - 1; i++) hdim(g, cuts[i], cuts[i + 1], -f * 1.6, fmt(cuts[i + 1] - cuts[i]));
    hdim(g, cuts[0], cuts[cuts.length - 1], -f * 3.6, view.totalLabel || fmt(cuts[cuts.length - 1] - cuts[0]), true);
  }
  const vb = [-m.l, -m.t, W + m.l + m.r, H + m.t + m.b];
  return svg(vb, g.out, view.aria || elev.title);
}

// Side section (depth axis horizontal; wall at x=0, room to the right). Shows pull-outs extended when state=open.
function renderSection(elev, view, state) {
  const u = elev.units[view.ref], B = bands(u), D = u.d, t = u.board ?? 1.8, ext = view.extension ?? 55;
  const W = D + ext + 6, H = elev.ceiling_cm, f = view.font ?? 5.4;
  const m = {l: f * 6.2, r: f * 2, t: f * 2.4, b: f * 3.6};
  const g = canvas(H, f), open = state === 'open';
  levels(g, view, -m.l + f * .4, W);
  g.rect(-4, 0, 4, H, {fill:'url(#elev-wall)', stroke:C.line, 'stroke-width':.4});
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
  g.rect(0, 0, D, H - (B.find(b => b.kind === 'filler')?.h || 0), {fill:C.interior, stroke:C.line, 'stroke-width':.45});
  const front = D, back = 1;
  for (const b of B) {
    const y0 = b.y0;
    if (b.kind === 'plinth') { g.rect(0, y0, D - 5, b.h, {fill:C.plinth, stroke:C.thin, 'stroke-width':.2}); g.rect(D - 5, y0, 5, b.h, {fill:'#fff', stroke:'none'}); }
    else if (b.kind === 'board') g.rect(0, y0, D, b.h, {fill:C.board, stroke:'none'});
    else if (b.kind === 'filler') g.rect(0, y0, D, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2});
    else if (b.kind === 'tier') {
      const tray = D - back - 3, dx = open ? ext : 0, x = back + dx;
      g.rect(x, y0, tray, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      g.rect(x + tray - 1.2, y0, 1.2, 4, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      let ix = x + tray - 2.5;
      for (const it of b.items || []) { if (it.dashed) continue; const d = it.d ?? 35; ix -= d; g.rect(ix, y0 + 1.6, d, Math.min(it.h, b.h - 2), {fill:open ? C.item : 'none', stroke:C.itemLine, 'stroke-width':.3, 'stroke-dasharray':open ? null : '1.4 1', rx:1.4}); break; }
      g.rect(D - 6, y0 + 1.6, 1, 1.2, {fill:C.line, stroke:'none'});
      g.text(open ? x + tray + 1.2 : D + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
      if (open && b === B.filter(z => z.kind === 'tier').at(-1)) hdim(g, D, D + ext, y0 + b.h + 3.2, `滿拉 ≈ ${fmt(ext)}`);
    } else if (b.kind === 'drawers') {
      const dx = open ? (view.drawerExtension ?? ext - 5) : 0;
      g.rect(back + dx, y0 + 2, D - back - 4, b.h - 6, {fill:'none', stroke:C.thin, 'stroke-width':.3});
      g.rect(D - 1.8 + dx, y0 + .2, 1.8, b.h - .4, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + dx + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    } else if (b.kind === 'cabinet') {
      for (const s of b.shelves || []) g.rect(0, y0 + s, D - 2.5, t, {fill:C.board, stroke:'none'});
      if (open) g.rect(D, y0 - 1.6, Math.min(ext, u.w / 2), b.h + 1.6, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      else g.rect(D - 1.8, y0 - 1.6, 1.8, b.h + 1.6, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    }
  }
  g.rect(0, 0, back, H - (B.find(b => b.kind === 'filler')?.h || 0), {fill:C.board, stroke:'none'});
  hdim(g, 0, D, -f * 1.6, `${fmt(D)}（櫃深）`, true);
  return svg([-m.l, -m.t, W + m.l + m.r, H + m.t + m.b], g.out, view.aria || elev.title);
}

function svg(vb, out, label) {
  return `<svg class="elev-svg" viewBox="${vb.map(v => +v.toFixed(2)).join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" font-family="var(--sans), sans-serif">${defs()}${out.join('')}</svg>`;
}

function render(elev, viewId, state) {
  const view = elev.views.find(v => v.id === viewId) || elev.views[0];
  return view.kind === 'section' ? renderSection(elev, view, state) : renderFront(elev, view, state);
}

window.SKGElevation = {render, bands, checkUnit};
})();
