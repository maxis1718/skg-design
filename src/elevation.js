// Elevation renderer: draws cabinet front / section / wall views from project.json → elevations.
// Units are cm; elevation y is measured up from the finished floor. Pure string output, no DOM needed.
// render(elev, viewId, state, T) — T translates the few literal labels drawn here (data labels arrive localized).
(() => {
'use strict';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
const C = {
  line:'#2f443c', thin:'#7f8c84', faint:'#b9c2bb', front:'#fbfaf5', interior:'#eef1ea', board:'#d3c4aa',
  plinth:'#d7dbd2', dim:'#a96f47', item:'#ffffff', itemLine:'#55695f', box:'#eadcc4', garment:'#cfdcd2',
  stone:'#c9c5bb', glass:'#e3edf0', level:'#8fa197', steel:'#e4e6e2', dark:'#4b5751'
};
let T = s => s;
// Current door state while rendering; extras with `when: 'open'|'closed'` only draw in that state (interiors, sockets).
let ST = 'closed';
// Rough text width in em: CJK ≈ 1em, other ≈ 0.56em.
const em = s => [...String(s)].reduce((w, ch) => w + (/[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/.test(ch) ? 1 : .56), 0);
const levelMargin = (view, f) => view.levels?.length ? Math.max(f * 6.2, Math.max(...view.levels.map(lv => em(`▽ ${fmt(lv.y)} ${lv.label || ''}`))) * f * .72 + f * .9) : f * 2;

// Resolve bands (bottom → top) to absolute ranges inside a unit.
function bands(u) { let y = 0; return u.bands.map(b => { const r = {...b, y0:y, y1:y + b.h}; y += b.h; return r; }); }
function checkUnit(u) { const total = u.bands.reduce((s, b) => s + b.h, 0); return Math.abs(total - u.h) < 0.05; }

function canvas(H, font) {
  const out = [];
  const Y = y => H - y; // floor-up cm → svg y
  const f = font;
  return {
    out, f, Y,
    rect(x, y, w, h, a = {}) { out.push(`<rect x="${x}" y="${Y(y + h)}" width="${w}" height="${h}" ${attrs(a)}/>`); },
    line(x1, y1, x2, y2, a = {}) { out.push(`<line x1="${x1}" y1="${Y(y1)}" x2="${x2}" y2="${Y(y2)}" ${attrs(a)}/>`); },
    path(d, a = {}) { out.push(`<path d="${d}" ${attrs(a)}/>`); },
    text(x, y, s, a = {}) { out.push(`<text x="${x}" y="${Y(y)}" ${attrs({'font-size':f, ...a})}>${esc(s)}</text>`); },
    vtext(x, y, s, a = {}) { out.push(`<text x="${x}" y="${Y(y)}" transform="rotate(-90 ${x} ${Y(y)})" text-anchor="middle" ${attrs({'font-size':f, ...a})}>${esc(s)}</text>`); },
  };
}
function attrs(a) { return Object.entries(a).filter(([, v]) => v != null).map(([k, v]) => `${k}="${esc(v)}"`).join(' '); }

function frontLeaves(u, fr) {
  const n = fr.count || 1, gap = 0.4, w = (u.w - gap * (n + 1)) / n;
  return Array.from({length:n}, (_, i) => ({x: gap + i * (w + gap), w, hinge: fr.hinges?.[i] ?? (n === 2 ? (i === 0 ? 'L' : 'R') : 'L')}));
}

// Built-in / freestanding appliance face (oven, dishwasher).
function appliance(g, it, x, y, w, h, labels) {
  g.rect(x, y, w, h, {fill:C.steel, stroke:C.line, 'stroke-width':.35, rx:.6});
  if (it.type === 'oven') {
    const panel = Math.min(10, h * .17);
    g.rect(x, y + h - panel, w, panel, {fill:C.dark, stroke:'none', rx:.6});
    for (const k of [.18, .82]) g.rect(x + w * k - 1.4, y + h - panel / 2 - 1.4, 2.8, 2.8, {fill:'#9aa39d', stroke:'none', rx:1.4});
    g.rect(x + w * .12, y + h - panel - 4.2, w * .76, 1.1, {fill:'#8a948e', stroke:'none', rx:.55});
    g.rect(x + w * .1, y + 5, w * .8, h - panel - 13, {fill:'#c9d1cf', stroke:'#8a948e', 'stroke-width':.3, rx:1.2});
  } else if (it.type === 'dishwasher') {
    g.rect(x, y + h - 6.5, w, 6.5, {fill:'#d4d8d3', stroke:'none'});
    g.rect(x + w * .3, y + h - 9.5, w * .4, 1, {fill:'#8a948e', stroke:'none', rx:.5});
    g.rect(x + w - 9, y + h - 4.3, 6, 1.6, {fill:'#7a8580', stroke:'none', rx:.4});
  }
  if (labels !== false && it.name) {
    const cy = it.type === 'oven' ? y + h * .42 : y + h * .5;
    g.text(x + w / 2, cy, it.name, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .82});
    if (it.sizeLabel) g.text(x + w / 2, cy - g.f * 1.15, it.sizeLabel, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .66});
  }
}

// Draw a unit (front elevation) at (ox, oy).
function drawUnit(g, u, ox, oy, state, detail, labels) {
  // board = shelf/carcass board thickness; side = side-panel thickness (defaults to board).
  const t = u.board ?? 1.8, sd = u.side ?? t, B = bands(u), sw = detail ? .35 : .3;
  // sideL / sideR override one side panel (e.g. two sub-columns sharing one divider); default = side.
  const sl = u.sideL ?? sd, sr = u.sideR ?? sd;
  if (!u.noCarcass) g.rect(ox, oy, u.w, u.h, {fill:C.interior, stroke:'none'});
  for (const b of B) {
    const y0 = oy + b.y0, ix = ox + sl, iw = u.w - sl - sr;
    if (b.kind === 'plinth') { g.rect(ox, y0, u.w, b.h, {fill:C.plinth, stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'filler') { g.rect(ox, y0, u.w, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'board') { g.rect(ox, y0, u.w, b.h, {fill:C.board, stroke:'none'}); if (b.led) ledStrip(g, b, ix, iw, y0, state, detail); continue; }
    if (b.kind === 'panel') { g.rect(ox, y0, u.w, b.h, {fill:C.front, stroke:C.line, 'stroke-width':sw}); continue; }
    if (b.kind === 'worktop') { g.rect(ox, y0, u.w, b.h, {fill:C.stone, stroke:C.line, 'stroke-width':.25}); continue; }
    if (b.kind === 'builtin') {
      const it = b.item, w = Math.min(it.w, u.w), h = Math.min(it.h, b.h), x = ox + (u.w - w) / 2;
      if (!u.noCarcass) g.rect(ox, y0, u.w, b.h, {fill:C.front, stroke:C.line, 'stroke-width':sw});
      else g.rect(ox, y0, u.w, b.h, {fill:'#f4f5f1', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      appliance(g, it, x, y0 + (it.lift ?? 0), w, h, labels);
      continue;
    }
    if (b.kind === 'tier') {
      g.rect(ix + .4, y0, iw - .8, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      if (detail && !b.noSocket) g.rect(ix + 1.5, oy + b.y1 - 4.5, 3.6, 2.4, {fill:'#fff', stroke:C.thin, 'stroke-width':.2, rx:.4});
      placeItems(g, b.items || [], ix, iw, y0 + 1.6, detail, b.h - 1.6, b.align, b.gap);
      continue;
    }
    if (b.kind === 'boxes' || b.kind === 'cabinet') {
      for (const s of b.shelves || []) g.rect(ix, y0 + s, iw, b.glass ? .8 : t, b.glass ? {fill:C.glass, stroke:'#9fb4ba', 'stroke-width':.2} : {fill:C.board, stroke:'none'});
      placeItems(g, b.items || [], ix, iw, y0, detail, b.h, b.align, b.gap);
      continue;
    }
    if (b.kind === 'hang') {
      const rail = oy + b.rail, n = b.garments?.count ?? 8, lens = b.garments?.lens;
      for (let i = 0; i < n; i++) {
        const gl = lens?.length ? lens[i % lens.length] : (b.garments?.len ?? 90);
        const cx = ix + 4 + (i + .5) * ((iw - 8) / n), wv = Math.min(4.2, (iw - 8) / n * .55);
        g.path(`M${cx} ${g.Y(rail)}v3.2`, {stroke:C.thin, 'stroke-width':.25, fill:'none'});
        g.rect(cx - wv / 2, rail - 3.2 - gl, wv, gl, {fill:C.garment, stroke:'#9db0a3', 'stroke-width':.2, rx:1.2});
      }
      g.rect(ix, rail - .6, iw, 1.2, {fill:'#8f9a93', stroke:'none', rx:.6});
      if (detail) g.text(ix + iw / 2, y0 + 1.6, b.garments?.label || '', {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
    }
  }
  if (!u.noCarcass) {
    g.rect(ox, oy, sl, u.h, {fill:C.board, stroke:'none'});
    g.rect(ox + u.w - sr, oy, sr, u.h, {fill:C.board, stroke:'none'});
  }
  for (const fr of u.fronts || []) {
    const y0 = oy + fr.from, h = fr.to - fr.from;
    // kind 'mirror' = fixed mirror panel (never opens); door + mirror:true = mirrored door leaf.
    const dashed = state === 'open' && fr.kind !== 'drawer' && fr.kind !== 'mirror';
    frontLeaves(u, fr).forEach((lf, li) => {
      const x = ox + lf.x;
      if (fr.kind === 'mirror') {
        mirrorFace(g, x, y0 + .2, lf.w, h - .4, sw);
      } else if (dashed) {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
        // swing object (wardrobe): foreshortened open leaf; swing true (mirror cabinet): leaf seen edge-on outside its hinge.
        if (fr.swing && typeof fr.swing === 'object') swingLeaf(g, fr, lf, li, x, y0, h, labels);
        else if (fr.swing) g.rect(lf.hinge === 'L' ? x - 2.3 : x + lf.w, y0 + .2, 2.3, h - .4, {fill:fr.mirror ? C.glass : C.front, stroke:C.line, 'stroke-width':sw});
      } else if (fr.mirror) {
        mirrorFace(g, x, y0 + .2, lf.w, h - .4, sw);
        const hx = lf.hinge === 'L' ? x : x + lf.w, fx = lf.hinge === 'L' ? x + lf.w : x, my = y0 + h / 2;
        g.path(`M${fx} ${g.Y(y0 + h - .2)}L${hx} ${g.Y(my)}L${fx} ${g.Y(y0 + .2)}`, {fill:'none', stroke:C.thin, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
        g.rect(lf.hinge === 'L' ? fx - 7 : fx + 1, y0 + .2, 6, .7, {fill:C.dark, stroke:'none'});
      } else if (fr.kind === 'drawer' || fr.kind === 'pullout') {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        g.rect(x + lf.w * .3, y0 + h - 2.6, lf.w * .4, .7, {fill:C.thin, stroke:'none', rx:.35});
      } else {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        const hx = lf.hinge === 'L' ? x : x + lf.w, fx = lf.hinge === 'L' ? x + lf.w : x, my = y0 + h / 2;
        g.path(`M${fx} ${g.Y(y0 + h - .2)}L${hx} ${g.Y(my)}L${fx} ${g.Y(y0 + .2)}`, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
        const hy = Math.min(Math.max(y0 + 4, 100), y0 + h - 14), handleX = lf.hinge === 'L' ? x + lf.w - 1.6 : x + 1;
        g.rect(handleX, hy, .6, Math.min(12, h * .4), {fill:C.thin, stroke:'none', rx:.3});
        // Concealed hinge cups (behind the closed leaf), drawn faint on the hinge edge.
        for (const hm of fr.hingeMarks?.[li] || []) g.rect(lf.hinge === 'L' ? x + .6 : x + lf.w - 4.1, hm - 1.75, 3.5, 3.5, {fill:'none', stroke:C.faint, 'stroke-width':.25, rx:1.75});
      }
    });
    if (fr.label && !dashed && labels) {
      if (fr.vertical || u.w < g.f * fr.label.length * .55) g.vtext(ox + u.w / 2 + g.f * .3, y0 + h / 2, fr.label, {fill:C.thin, 'font-size':g.f * .74});
      else g.text(ox + u.w / 2, y0 + h / 2 - g.f * .3, fr.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * (detail ? .78 : .74)});
    }
  }
  if (!u.noCarcass) g.rect(ox, oy, u.w, u.h, {fill:'none', stroke:C.line, 'stroke-width':detail ? .5 : .4});
}

// Opened door leaf seen at ~120°: a foreshortened quad outside the carcass showing its inner face.
// fr.swing = {k: projection ratio, mirror: {leaf, from, to, inHinge, inFree, label}}; fr.hingeMarks[i] = hinge heights.
function swingLeaf(g, fr, lf, li, x, y0, h, labels) {
  const k = fr.swing.k ?? .38, p = lf.w * k, s = h * .035, dir = lf.hinge === 'L' ? -1 : 1;
  const xh = lf.hinge === 'L' ? x : x + lf.w;
  const P = (u, v) => [xh + dir * p * u, y0 + s * u + v * (h - 2 * s * u)];
  const quad = (u0, u1, v0, v1) => { const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]; return 'M' + pts.map(([px, py]) => `${+px.toFixed(2)} ${+g.Y(py).toFixed(2)}`).join('L') + 'Z'; };
  g.path(quad(0, 1, 0, 1), {fill:C.front, stroke:C.line, 'stroke-width':.35});
  for (const hm of fr.hingeMarks?.[li] || []) { const [cx, cy] = P(2.2 / lf.w, (hm - y0) / h); g.out.push(`<ellipse cx="${+cx.toFixed(2)}" cy="${+g.Y(cy).toFixed(2)}" rx="${+(1.75 * k).toFixed(2)}" ry="1.75" fill="#fff" stroke="${C.thin}" stroke-width=".25"/>`); }
  const m = fr.swing.mirror;
  if (m && m.leaf === li) {
    const u0 = (m.inHinge ?? 7) / lf.w, u1 = 1 - (m.inFree ?? 4) / lf.w, v0 = (m.from - y0) / h, v1 = (m.to - y0) / h;
    g.path(quad(u0, u1, v0, v1), {fill:'#d6e6ec', stroke:'#7d9aa5', 'stroke-width':.35});
    for (const [a, b] of [[.2, .38], [.3, .44]]) { const [ax, ay] = P(u0 + (u1 - u0) * .25, v0 + (v1 - v0) * a), [bx, by] = P(u0 + (u1 - u0) * .75, v0 + (v1 - v0) * b); g.path(`M${+ax.toFixed(2)} ${+g.Y(ay).toFixed(2)}L${+bx.toFixed(2)} ${+g.Y(by).toFixed(2)}`, {stroke:'#ffffff', 'stroke-width':.6, fill:'none'}); }
    if (labels) { const [lx, ly] = P((u0 + u1) / 2, (v0 + v1) / 2); g.vtext(lx + g.f * .26, ly, m.label || T('鏡面'), {fill:'#4f6d78', 'font-size':g.f * .72}); }
  }
}

// LED strip under a board (shelf underside); glows when the doors are open (door-contact switch).
function ledStrip(g, b, ix, iw, y0, state, detail) {
  const L = b.led, x0 = ix + 1.5, x1 = ix + iw - 1.5;
  if (state === 'open') g.path(`M${x0} ${g.Y(y0 - .8)}L${x1} ${g.Y(y0 - .8)}L${x1 + 2} ${g.Y(y0 - (L.glow ?? 26))}L${x0 - 2} ${g.Y(y0 - (L.glow ?? 26))}Z`, {fill:'#fbe7a1', opacity:.38, stroke:'none'});
  g.rect(x0, y0 - .8, x1 - x0, .8, {fill:state === 'open' ? '#e8b923' : '#c9b98a', stroke:'none', rx:.3});
  if (detail && state === 'open') g.text(ix + iw / 2, y0 - g.f * .95, L.label || T('感應燈'), {'text-anchor':'middle', fill:'#9a7413', 'font-size':g.f * .7});
}

function mirrorFace(g, x, y, w, h, sw) {
  g.rect(x, y, w, h, {fill:C.glass, stroke:C.line, 'stroke-width':sw});
  const k = Math.min(w, h) * .35;
  for (const d of [0, k * .45]) g.path(`M${x + w - k - d} ${g.Y(y + h - 1.5)}L${x + w - 1.5} ${g.Y(y + h - k - d)}`, {stroke:'#ffffff', 'stroke-width':.9, 'stroke-opacity':.9, fill:'none'});
}

// Hair dryer hung head-up (barrel axis left–right). e.x = centre, e.y = head top; cord runs to e.cord [x, y].
function dryer(g, e) {
  const hh = e.head ?? 7.7, hw = (e.headW ?? 9.8) / 2, total = e.h ?? 28.8, hb = e.y - total, cx = e.x;
  if (e.cord) {
    const [sx, sy] = e.cord;
    const low = Math.min(hb, sy) - (e.sag ?? 12);
    g.path(`M${cx} ${g.Y(hb)}C${cx} ${g.Y(low)} ${sx} ${g.Y(low)} ${sx} ${g.Y(sy)}`, {fill:'none', stroke:C.dark, 'stroke-width':.45});
  }
  if (e.profile) g.out.push(`<circle cx="${cx}" cy="${g.Y(e.y - hh / 2)}" r="${hh / 2}" fill="${C.steel}" stroke="${C.line}" stroke-width=".35"/>`);
  else g.rect(cx - hw, e.y - hh, hw * 2, hh, {fill:C.steel, stroke:C.line, 'stroke-width':.35, rx:hh / 2.4});
  g.rect(cx - 1.8, hb, 3.6, total - hh, {fill:C.steel, stroke:C.line, 'stroke-width':.35, rx:1.2});
  g.rect(cx - (e.profile ? 3.6 : hw + 1), e.y - hh - 1, e.profile ? 7.2 : hw * 2 + 2, 1, {fill:C.dark, stroke:'none', rx:.4});
}

// Wall socket face at centre (x, y): kind 'shaver' = 2-pin shaver supply unit; otherwise 13A switched, `gang` 1 or 2.
function socketMark(g, e) {
  const gang = e.gang ?? 1, h = 8.6, w = e.kind === 'shaver' ? 8.6 : gang === 2 ? 14.6 : 8.6, x = e.x - w / 2, y = e.y - h / 2;
  g.rect(x, y, w, h, {fill:'#fff', stroke:C.dim, 'stroke-width':.4, rx:.7});
  if (e.kind === 'shaver') {
    for (const dx of [-1.4, 1.4]) g.out.push(`<circle cx="${e.x + dx}" cy="${g.Y(e.y)}" r=".55" fill="${C.dark}"/>`);
    return;
  }
  for (let i = 0; i < gang; i++) {
    const cx = gang === 2 ? x + w * (i ? .72 : .28) : e.x;
    g.rect(cx - .45, e.y - 2.4, .9, 1.8, {fill:C.dark, stroke:'none'});
    for (const dx of [-1.9, 1.1]) g.rect(cx + dx, e.y + .4, .8, 1.6, {fill:C.dark, stroke:'none'});
    g.rect(cx - .7, y + h - 2.6, 1.4, 1.8, {fill:'#c96f4a', stroke:'none', rx:.3});
  }
}

function placeItems(g, items, ix, iw, y0, detail, room, align, gapIn) {
  if (!items.length) return;
  const gap = gapIn ?? 3, total = items.reduce((s, it) => s + it.w, 0) + gap * (items.length - 1);
  let x = ix + (align === 'left' ? 1.5 : Math.max(1, (iw - total) / 2));
  for (const it of items) {
    const h = Math.min(it.h, room - .5);
    g.rect(x, y0, it.w, h, {fill:it.dashed ? 'none' : (it.box ? C.box : C.item), stroke:it.dashed ? C.faint : C.itemLine, 'stroke-width':.3, 'stroke-dasharray':it.dashed ? '1.4 1' : null, rx:it.box ? .6 : Math.min(1.6, it.w / 4)});
    const fs = g.f * (detail ? .74 : .8), name = (!detail && it.short) || it.name;
    if (name && h > fs * 2.4) {
      if (it.w > fs * Math.min(name.length, 4) * .9 || it.w > fs * 2.6) g.text(x + it.w / 2, y0 + h / 2 + fs * .35, name, {'text-anchor':'middle', fill:C.line, 'font-size':fs * (it.w < fs * 3 ? .8 : 1)});
      else g.vtext(x + it.w / 2 + fs * .32, y0 + h / 2, name, {fill:C.line, 'font-size':fs * .8});
      if (detail && it.size !== false && h > fs * 4 && it.w > fs * 2.6) g.text(x + it.w / 2, y0 + h / 2 - fs * 1.05, it.sizeLabel ?? `${fmt(it.w)}×${fmt(it.h)}`, {'text-anchor':'middle', fill:C.thin, 'font-size':fs * .78});
    }
    x += it.w + gap;
  }
}

// Vertical dimension chain for a unit; text horizontal to the right of the line.
function chain(g, u, ox, oy, x, total = true) {
  const B = bands(u), tick = 1.2, s = {stroke:C.dim, 'stroke-width':.25};
  g.line(x, oy, x, oy + u.h, s);
  for (const b of B) {
    g.line(x - tick, oy + b.y0, x + tick, oy + b.y0, s);
    if (b.h >= 5) g.text(x + 1.6, oy + (b.y0 + b.y1) / 2 - g.f * .32, fmt(b.h), {fill:C.dim, 'font-size':g.f * .8});
  }
  g.line(x - tick, oy + u.h, x + tick, oy + u.h, s);
  if (!total) return;
  const x2 = x + g.f * 3.6;
  g.line(x2, oy, x2, oy + u.h, s); g.line(x2 - tick, oy, x2 + tick, oy, s); g.line(x2 - tick, oy + u.h, x2 + tick, oy + u.h, s);
  g.vtext(x2 + g.f * .9, oy + u.h / 2, fmt(u.h), {fill:C.dim, 'font-size':g.f * .85});
}
// Plain right-side height chain for one unit of a multi-unit view (view.rightChain = {ref, min?, note?}).
// Ticks at every band boundary; numbers only for bands ≥ min (default 2.5, so 1.8 boards stay unlabelled).
function rightChainWidth(g, u, rc) {
  const fs = g.f * .8, nums = u.bands.filter(b => b.h >= (rc.min ?? 2.5)).map(b => em(fmt(b.h)));
  const note = rc.note ? em(rc.note) * g.f * .6 : 0;
  return g.f * 1.1 + Math.max(1.6 + Math.max(0, ...nums) * fs, note) + g.f * .9;
}
function rightChain(g, u, ox, oy, x, rc) {
  const B = bands(u), tick = 1.2, s = {stroke:C.dim, 'stroke-width':.25}, fs = g.f * .8;
  g.line(x, oy, x, oy + u.h, s);
  for (const b of B) {
    g.line(x - tick, oy + b.y0, x + tick, oy + b.y0, s);
    if (b.h >= (rc.min ?? 2.5)) g.text(x + 1.6, oy + (b.y0 + b.y1) / 2 - fs * .36, fmt(b.h), {fill:C.dim, 'font-size':fs});
  }
  g.line(x - tick, oy + u.h, x + tick, oy + u.h, s);
  if (rc.note) g.text(x - tick, oy - g.f * 1.35, rc.note, {fill:C.dim, 'font-size':g.f * .6});
}
function hdim(g, x0, x1, y, label, emphasize) {
  const s = {stroke:C.dim, 'stroke-width':.25};
  g.line(x0, y, x1, y, s); g.line(x0, y - 1.2, x0, y + 1.2, s); g.line(x1, y - 1.2, x1, y + 1.2, s);
  g.text((x0 + x1) / 2, y + .9, label, {'text-anchor':'middle', fill:C.dim, 'font-size':g.f * (emphasize ? .85 : .74)});
}
function levels(g, view, x0, x1) {
  for (const lv of view.levels || []) {
    g.line(x0, lv.y, x1, lv.y, {stroke:C.level, 'stroke-width':.2, 'stroke-dasharray':'2 1.4'});
    g.text(x0, lv.y + .9, `▽ ${fmt(lv.y)} ${lv.label || ''}`, {fill:C.level, 'font-size':g.f * .72});
  }
}

function extras(g, list) {
  for (const e of list || []) {
    if (dryExtra(g, e)) continue;
    if (e.when && e.when !== ST) continue;
    if (e.type === 'dryer') { dryer(g, e); if (e.label) g.text(e.lx ?? e.x, e.ly ?? e.y + 1.4, e.label, {'text-anchor':e.anchor || 'middle', fill:C.line, 'font-size':g.f * (e.size || .62)}); continue; }
    if (e.type === 'socket') { socketMark(g, e); if (e.label) g.text(e.x + (e.dx ?? 0), e.y - (e.size ?? 8.6) / 2 - g.f * .95, e.label, {'text-anchor':e.anchor || 'middle', fill:C.dim, 'font-size':g.f * (e.fs || .6)}); continue; }
    if (e.type === 'vanity') {
      // Context only: vanity / basin / tap drawn dashed (not part of this design).
      const ds = {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.6 1.1'};
      g.rect(e.x, e.y - e.top, e.w, e.top, {...ds, fill:'#f4f5f1'});
      if (e.plinth) g.rect(e.x, 0, e.w, e.y - e.top, ds);
      if (e.basin) {
        const bx = e.basinX ?? e.x + (e.w - e.basin) / 2, bd = e.basinDepth ?? 12;
        g.path(`M${bx} ${g.Y(e.y)}Q${bx + 2} ${g.Y(e.y - bd)} ${bx + e.basin / 2} ${g.Y(e.y - bd)}Q${bx + e.basin - 2} ${g.Y(e.y - bd)} ${bx + e.basin} ${g.Y(e.y)}`, ds);
        const tx = e.tapX ?? bx + e.basin / 2, th = e.tap ?? 20, reach = e.tapReach ?? 0, ts = {fill:'#dfe2dd', stroke:C.line, 'stroke-width':.3};
        g.rect(tx - 1.1, e.y, 2.2, th, ts);
        if (reach) g.path(`M${tx} ${g.Y(e.y + th - 1)}h${reach}v2.6`, {fill:'none', stroke:C.line, 'stroke-width':.9});
        else g.rect(tx - 3.2, e.y + th - 2.2, 6.4, 2.2, {...ts, rx:.8});
        if (e.tapLabel) g.text(tx + Math.max(reach, 3.2) + 1.2, e.y + th - g.f * .5, e.tapLabel, {fill:C.thin, 'font-size':g.f * .56});
      }
      if (e.label) g.text(e.x + e.w / 2, (e.y - e.top) / 2, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .62});
      if (e.sub) g.text(e.x + e.w / 2, (e.y - e.top) / 2 - g.f * 1.05, e.sub, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .54});
      continue;
    }
    if (e.type === 'rect') {
      g.rect(e.x, e.y, e.w, e.h, {fill:e.fill || 'none', stroke:e.stroke || C.thin, 'stroke-width':e.sw ?? .3, 'stroke-dasharray':e.dashed ? '1.4 1' : null, rx:e.rx});
      if (e.label) g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:e.color || C.thin, 'font-size':g.f * (e.size || .62)});
      continue;
    }
    if (e.type === 'led') { g.rect(e.x, e.y - .6, e.w, .6, {fill:'#f2c46b', stroke:'none'}); g.rect(e.x, e.y - 4.6, e.w, 4, {fill:'#f6dc9b', 'fill-opacity':.35, stroke:'none'}); continue; }
    if (e.type === 'stand') {
      // Dyson stand profile (simplified): base plate + upright + cradle.
      g.rect(e.x - e.w / 2, e.y, e.w, 1.4, {fill:C.dark, stroke:'none', rx:.5});
      g.rect(e.x - .9, e.y + 1.4, 1.8, e.h - 3, {fill:'#8a948e', stroke:'none'});
      g.rect(e.x - e.w / 2 + 1, e.y + e.h - 1.6, e.w - 2, 1.6, {fill:'#8a948e', stroke:'none', rx:.6});
      if (e.label) g.text(e.x, e.y - g.f * .95, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .54});
      continue;
    }
    if (e.type === 'window') {
      g.rect(e.x, e.y, e.w, e.h, {fill:C.glass, stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'2 1.2'});
      g.line(e.x + e.w / 2, e.y, e.x + e.w / 2, e.y + e.h, {stroke:C.faint, 'stroke-width':.25});
      if (e.label) g.text(e.x + e.w / 2, e.y + e.h / 2, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
      if (e.sub) g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * 1.2, e.sub, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .62});
    } else if (e.type === 'hood' && e.slim) {
      g.rect(e.x, e.y, e.w, e.h, {fill:'#dfe2dd', stroke:C.line, 'stroke-width':.35});
      g.rect(e.x + e.w * .3, e.y + e.h * .45, e.w * .4, .5, {fill:'#9aa39d', stroke:'none'});
      g.text(e.x + e.w / 2, e.y - g.f * 1.05, e.label || T('排油煙機'), {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .72});
    } else if (e.type === 'hood') {
      g.path(`M${e.x} ${g.Y(e.y)}H${e.x + e.w}L${e.x + e.w - 4} ${g.Y(e.y + e.h)}H${e.x + 4}Z`, {fill:'#e2e4de', stroke:C.line, 'stroke-width':.35});
      g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * .3, e.label || T('排油煙機'), {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .8});
    } else if (e.type === 'worktop') {
      g.rect(e.x, e.y, e.w, e.h, {fill:C.stone, stroke:C.line, 'stroke-width':.3});
      // Optional material label (e.g. 燒結石檯面 · 面 90) placed above the worktop at labelX/labelY.
      if (e.label) g.text(e.labelX ?? e.x + e.w / 2, e.labelY ?? e.y + e.h + g.f * .5, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * (e.size || .62)});
    } else if (e.type === 'hob') {
      g.rect(e.x, e.y, e.w, 1.2, {fill:C.dark, stroke:'none'});
      for (const k of [.22, .5, .78]) g.rect(e.x + e.w * k - 4, e.y + 1.2, 8, 1.6, {fill:C.dark, stroke:'none'});
      if (e.label) g.text(e.x + e.w / 2, e.y + 4.6, e.label, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .78});
    } else if (e.type === 'sink') {
      g.rect(e.x, e.y - e.depth, e.w, e.depth, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      g.path(`M${e.x + e.w / 2} ${g.Y(e.y)}v-14h5v2`, {fill:'none', stroke:C.line, 'stroke-width':.6});
      if (e.label) g.text(e.x + e.w / 2, e.y - e.depth / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
    } else if (e.type === 'optional') {
      g.rect(e.x, e.y, e.w, e.h, {fill:'none', stroke:C.dim, 'stroke-width':.3, 'stroke-dasharray':'1.6 1.2'});
      if (e.label) g.text(e.x + e.w / 2, e.y + e.h / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:C.dim, 'font-size':g.f * .7});
    } else if (e.type === 'wall') {
      g.rect(e.x, e.y ?? 0, e.w, e.h, {fill:'url(#elev-wall)', stroke:C.line, 'stroke-width':.4});
      if (e.label) g.vtext(e.x + e.w / 2 + g.f * .3, (e.y ?? 0) + e.h / 2, e.label, {fill:C.thin, 'font-size':g.f * .74});
    } else if (e.type === 'note') {
      g.text(e.x, e.y, e.label, {'text-anchor':e.anchor || 'middle', fill:e.color || C.dim, 'font-size':g.f * (e.size || .72)});
    } else if (e.type === 'clear') {
      const s = {stroke:C.dim, 'stroke-width':.25};
      if (e.vertical) {
        g.line(e.x, e.y0, e.x, e.y1, s); g.line(e.x - 1.2, e.y0, e.x + 1.2, e.y0, s); g.line(e.x - 1.2, e.y1, e.x + 1.2, e.y1, s);
        if (e.rotate) g.vtext(e.x + g.f * .95, (e.y0 + e.y1) / 2, e.label, {fill:C.dim, 'font-size':g.f * .7});
        else g.text(e.x + 1.4, (e.y0 + e.y1) / 2 - g.f * .3, e.label, {fill:C.dim, 'font-size':g.f * .7});
      }
      else hdim(g, e.x0, e.x1, e.y, e.label);
    }
  }
}

// Dry-kitchen primitives: framed glass partition, countertop device, tap column, socket.
function dryExtra(g, e) {
  if (e.type === 'dk-glass') {
    const fw = e.frame ?? 1.6, fr = {fill:'#2b2f2d', stroke:'none'};
    g.rect(e.x, e.y, e.w, e.h, {fill:C.glass, 'fill-opacity':.7, stroke:'none'});
    for (const k of [.18, .26]) g.line(e.x + e.w * k, e.y + e.h * .35, e.x + e.w * (k + .14), e.y + e.h * .7, {stroke:'#ffffff', 'stroke-width':.8, 'stroke-opacity':.8});
    g.rect(e.x, e.y, e.w, fw, fr); if (!e.cutTop) g.rect(e.x, e.y + e.h - fw, e.w, fw, fr);
    g.rect(e.x, e.y, fw, e.h, fr); g.rect(e.x + e.w - fw, e.y, fw, e.h, fr);
    for (const mx of e.mullions || []) g.rect(mx - fw / 2, e.y, fw, e.h, fr);
    const cy = e.y + e.h * (e.labelAt ?? .5);
    if (e.label) g.text(e.x + e.w / 2, cy, e.label, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .8});
    if (e.sub) g.text(e.x + e.w / 2, cy - g.f * 1.25, e.sub, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .64});
    return true;
  }
  if (e.type === 'dk-device') {
    const dash = e.dashed ? {'stroke-dasharray':'1.4 1'} : {};
    if (e.shape === 'pot') {
      g.rect(e.x, e.y, e.w, e.h, {fill:'none', stroke:C.itemLine, 'stroke-width':.3, rx:1.2, ...dash});
      for (const hx of [e.x - 3.5, e.x + e.w]) g.rect(hx, e.y + e.h - 3, 3.5, 1.2, {fill:'none', stroke:C.itemLine, 'stroke-width':.3, rx:.5, ...dash});
    } else {
      g.rect(e.x, e.y, e.w, e.h, {fill:e.dashed ? 'none' : C.item, stroke:C.itemLine, 'stroke-width':.35, rx:Math.min(1.6, e.w / 4), ...dash});
      if (e.shape === 'coffee') {
        g.rect(e.x + .6, e.y + .5, e.w - 1.2, 1.2, {fill:C.dark, stroke:'none', rx:.4});
        g.rect(e.x + .8, e.y + e.h - 1.8, e.w - 1.6, 1, {fill:'#9aa39d', stroke:'none', rx:.4});
      }
    }
    const fs = g.f * (e.size || .7);
    if (e.label && e.vertical) g.vtext(e.x + e.w / 2 + fs * .32, e.y + (e.labelY ?? e.h * .3), e.label, {fill:C.line, 'font-size':fs});
    else if (e.label) g.text(e.x + e.w / 2, e.y + (e.labelY ?? e.h / 2 - fs * .35), e.label, {'text-anchor':'middle', fill:e.dashed ? C.thin : C.line, 'font-size':fs});
    if (e.sizeLabel) g.text(e.x + e.w / 2, e.y + (e.labelY ?? e.h / 2) - fs * 1.4, e.sizeLabel, {'text-anchor':'middle', fill:C.thin, 'font-size':fs * .85});
    return true;
  }
  if (e.type === 'dk-tap') {
    // Slim tap column standing on the worktop; spout swings out at the top (reach toward +x).
    const head = Math.min(6, e.h * .2), reach = e.reach ?? 5;
    g.rect(e.x, e.y, e.w, e.h - head, {fill:'#fbfbf8', stroke:C.itemLine, 'stroke-width':.35, rx:1.2});
    g.rect(e.x - .3, e.y + e.h - head, e.w + .6, head, {fill:'#fbfbf8', stroke:C.itemLine, 'stroke-width':.35, rx:1.6});
    g.rect(e.x + e.w * .25, e.y + e.h - head * .55, e.w * .5, head * .3, {fill:'#9aa39d', stroke:'none', rx:.4});
    if (reach) {
      const oy = e.outlet ?? e.y + e.h - head - 1.5;
      g.rect(e.x + e.w, oy, reach, 1.6, {fill:'#fbfbf8', stroke:C.itemLine, 'stroke-width':.3, rx:.6});
      g.line(e.x + e.w + reach - 1, oy, e.x + e.w + reach - 1, oy - 4, {stroke:'#7fa8b8', 'stroke-width':.4, 'stroke-dasharray':'.8 .8'});
    }
    if (e.label) g.vtext(e.x + e.w / 2 + g.f * .22, e.y + (e.h - head) / 2, e.label, {fill:C.line, 'font-size':g.f * (e.size || .62)});
    return true;
  }
  if (e.type === 'dk-socket') {
    const w = 4.2, h = 2.8, x = e.x - w / 2;
    g.rect(x, e.y, w, h, {fill:'#fff', stroke:C.dim, 'stroke-width':.25, rx:.4, ...(e.dashed ? {'stroke-dasharray':'.8 .6'} : {})});
    for (const k of [.32, .68]) g.rect(x + w * k - .3, e.y + 1, .6, .9, {fill:C.dim, stroke:'none'});
    if (e.label) g.text(e.x + (e.anchor === 'end' ? -w / 2 - .8 : w / 2 + .8), e.y + .5, e.label, {'text-anchor':e.anchor || 'start', fill:C.dim, 'font-size':g.f * (e.size || .6)});
    return true;
  }
  return false;
}

function defs() {
  return `<defs><pattern id="elev-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V2" stroke="#b7beb6" stroke-width=".5"/></pattern><pattern id="elev-wall" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" stroke="#a8b1a9" stroke-width=".35"/></pattern></defs>`;
}

function renderFront(elev, view, state) {
  const units = view.units.map(r => ({...r, u:elev.units[r.ref]}));
  const W = view.width ?? Math.max(...units.map(r => r.x + r.u.w)), H = view.height ?? elev.ceiling_cm;
  const detail = view.detail !== false && units.length === 1;
  const labels = view.labels ?? detail;
  const f = view.font ?? Math.max(5.4, W / 24);
  const chainUnit = view.chain != null ? units[view.chain] : detail ? units[0] : null;
  const rc = view.rightChain && units.find(r => r.ref === view.rightChain.ref);
  const m = {l: levelMargin(view, f), r: view.marginR != null ? f * view.marginR : chainUnit ? f * 8 : f * 2, t: f * 2.4, b: f * (view.hcuts ? 5.4 : 3.6)};
  const g = canvas(H, f);
  if (rc) m.r = Math.max(m.r, rightChainWidth(g, rc.u, view.rightChain));
  levels(g, view, -m.l + f * .4, W);
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  if (!view.noCeiling) {
    g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
    g.text(rc ? W : W + m.r - f, H + (rc ? f * .5 : .9), view.ceilingLabel || `${T('天花')} ${fmt(H)}`, {'text-anchor':'end', fill:C.thin, 'font-size':f * .72});
  }
  extras(g, view.under);
  for (const r of units) drawUnit(g, r.u, r.x, r.y || 0, state, detail, labels);
  extras(g, view.extras);
  if (chainUnit) chain(g, chainUnit.u, chainUnit.x, chainUnit.y || 0, Math.max(chainUnit.x + chainUnit.u.w, W) + f * 1.1, detail);
  if (rc) rightChain(g, rc.u, rc.x, rc.y || 0, Math.max(rc.x + rc.u.w, W) + f * 1.1, view.rightChain);
  if (detail) { const r = units[0]; hdim(g, r.x, r.x + r.u.w, -f * 1.6, `${fmt(r.u.w)}`, true); }
  for (const r of units) if (r.label) g.text(r.x + r.u.w / 2, -f * 1.6, r.label, {'text-anchor':'middle', fill:C.line, 'font-size':f * .8});
  if (view.hcuts) {
    const cuts = view.hcuts;
    for (let i = 0; i < cuts.length - 1; i++) hdim(g, cuts[i], cuts[i + 1], -f * 1.6, fmt(cuts[i + 1] - cuts[i]));
    hdim(g, cuts[0], cuts[cuts.length - 1], -f * 3.6, view.totalLabel || fmt(cuts[cuts.length - 1] - cuts[0]), true);
  }
  return svg([-m.l, -m.t, W + m.l + m.r, H + m.t + m.b], g.out, view.aria || elev.title);
}

// Side section (depth axis horizontal; wall at x=0, room to the right). Pull-outs extend when state=open.
// unit.pullout === 'whole' moves every band above the plinth (and the full-height front) together.
function renderSection(elev, view, state) {
  const u = elev.units[view.ref], B = bands(u), D = u.d, t = u.board ?? 1.8, ext = view.extension ?? 55;
  const whole = u.pullout === 'whole', open = state === 'open';
  const H = view.height ?? elev.ceiling_cm, f = view.font ?? 5.4;
  const top = u.h - (B.find(b => b.kind === 'filler')?.h || 0);
  const W = D + ext + (view.labelRoom ?? 16);
  const m = {l: Math.max(f * 6.2, levelMargin(view, f)), r: view.chain ? f * 6 : f * 2, t: f * 2.4, b: f * 3.6};
  const g = canvas(H, f);
  levels(g, view, -m.l + f * .4, W);
  g.rect(-4, 0, 4, H, {fill:'url(#elev-wall)', stroke:C.line, 'stroke-width':.4});
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  if (!view.noCeiling) g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
  g.rect(0, 0, D, top, {fill:C.interior, stroke:C.line, 'stroke-width':.45});
  extras(g, view.under);
  const back = 1, dxAll = whole && open ? ext : 0;
  const firstY = B.find(b => b.kind !== 'plinth')?.y0 ?? 0;
  if (whole) {
    g.rect(back + dxAll, firstY, 1.6, top - firstY - .5, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
  }
  for (const b of B) {
    const y0 = b.y0;
    if (b.kind === 'plinth') { g.rect(0, y0, D - 5, b.h, {fill:C.plinth, stroke:C.thin, 'stroke-width':.2}); g.rect(D - 5, y0, 5, b.h, {fill:'#fff', stroke:'none'}); }
    else if (b.kind === 'board') g.rect(0, y0, D, b.h, {fill:C.board, stroke:'none'});
    else if (b.kind === 'filler') g.rect(0, y0, D, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2});
    else if (b.kind === 'tier') {
      const tray = D - back - 3, dx = whole ? dxAll : open ? ext : 0, x = back + dx;
      g.rect(x, y0, tray, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      g.rect(x + tray - 1.2, y0, 1.2, b.lip ?? 4, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      if (whole) g.rect(x + 2, y0, 1.2, b.lip ?? 4, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      const solid = open || whole;
      const sty = {fill:solid ? C.item : 'none', stroke:C.itemLine, 'stroke-width':.3, 'stroke-dasharray':solid ? null : '1.4 1'};
      const real = (b.items || []).filter(it => !it.dashed);
      if (view.allItems) {
        let ix = x + tray - 2.5;
        for (const it of real) for (let k = 0; k < (it.repeat || 1); k++) { const d = it.d ?? 8; ix -= d + .8; if (ix < x + 3) break; g.rect(ix, y0 + 1.6, d, Math.min(it.h, b.h - 2), {...sty, rx:Math.min(1.4, d / 3)}); }
      } else if (real.length) {
        // Unknown depth (d null) is drawn dashed at a nominal 35 so it never reads as a measured size.
        const it = real.reduce((a, c) => (c.d ?? 0) > (a.d ?? 0) ? c : a), d = it.d ?? 35;
        g.rect(x + tray - 2.5 - d, y0 + 1.6, d, Math.min(it.h, b.h - 2), {...sty, ...(it.d == null ? {'stroke-dasharray':'1.4 1'} : {}), rx:1.4});
      }
      if (!whole) g.rect(D - 6, y0 + 1.6, 1, 1.2, {fill:C.line, stroke:'none'});
      const lx = (open || whole && open) ? x + tray + 1.2 : D + 1.6;
      if (!whole || open) g.text(lx + (whole ? 2 : 0), y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
      if (!whole && open && b === B.filter(z => z.kind === 'tier').at(-1)) hdim(g, D, D + ext, y0 + b.h + 3.2, `${T('滿拉')} ≈ ${fmt(ext)}`);
    } else if (b.kind === 'drawers') {
      const dx = open ? (view.drawerExtension ?? ext - 5) : 0;
      g.rect(back + dx, y0 + 2, D - back - 4, b.h - 6, {fill:'none', stroke:C.thin, 'stroke-width':.3});
      g.rect(D - 1.8 + dx, y0 + .2, 1.8, b.h - .4, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + dx + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    } else if (b.kind === 'cabinet') {
      // shelves containing 0 = the cabinet's own bottom panel, so the door starts at the band (no overlap below).
      const lo = (b.shelves || []).includes(0) ? 0 : 1.6;
      for (const s of b.shelves || []) g.rect(0, y0 + s, D - 2.5, t, {fill:C.board, stroke:'none'});
      if (open) g.rect(D, y0 - lo, Math.min(ext, u.w / 2), b.h + lo, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      else g.rect(D - 1.8, y0 - lo, 1.8, b.h + lo, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    }
  }
  if (whole) {
    g.rect(D - 1.8 + dxAll, firstY + .2, 1.8, top - firstY - .4, {fill:C.front, stroke:C.line, 'stroke-width':.4});
    if (open) hdim(g, D, D + ext, top + 3.4, `${T('拉出')} ≈ ${fmt(ext)}`);
    else g.text(D + 1.6, firstY + (top - firstY) / 2, u.caption || '', {fill:C.line, 'font-size':f * .74});
  }
  g.rect(0, 0, back, top, {fill:C.board, stroke:'none'});
  extras(g, view.extras);
  if (view.chain) chain(g, u, 0, 0, W + f * .6, false);
  hdim(g, 0, D, -f * 1.6, `${fmt(D)}（${T('櫃深')}）`, true);
  return svg([-m.l, -m.t, W + m.l + m.r, H + m.t + m.b], g.out, view.aria || elev.title);
}

function svg(vb, out, label) {
  return `<svg class="elev-svg" viewBox="${vb.map(v => +v.toFixed(2)).join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" font-family="var(--sans), sans-serif">${defs()}${out.join('')}</svg>`;
}

function render(elev, viewId, state, translate) {
  T = typeof translate === 'function' ? translate : (s => s);
  ST = state;
  const view = elev.views.find(v => v.id === viewId) || elev.views[0];
  return view.kind === 'section' ? renderSection(elev, view, state) : renderFront(elev, view, state);
}

window.SKGElevation = {render, bands, checkUnit};
})();
