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
  stone:'#c9c5bb', glass:'#e3edf0', level:'#8fa197', steel:'#e4e6e2', dark:'#4b5751',
  paper:'#e6e4de', warm:'#f3c46b', screen:'#3d4743', socket:'#f7f7f4', cavity:'#e2ddd2'
};
let T = s => s;
// Current door state while rendering; extras with `when: 'open'|'closed'` only draw in that state (interiors, sockets).
let ST = 'closed';
// Elevation-level front style (elev.frontStyle), e.g. handleless slab fronts for the whole kitchen; null = classic fronts.
let FS = null;
// gap = reveal between fronts (0.3 = 3 mm); lip = wall-door overhang below the carcass (finger pull from below);
// groove = top-edge finger groove depth on base fronts; lipAbove = fronts whose bottom is at/above this height use the lip.
const FRONT_STYLES = {slab: {gap:.3, lip:2, groove:2, lipAbove:140}};
// FL = draw labels on front faces (view.frontLabels === false hides them in the closed state).
let FL = true;
// Fit a label into a w × h box: horizontal unless the box is taller than wide and the text does not fit across; font shrinks to fit.
function fitLabel(g, cx, cy, w, h, s, base, a = {}) {
  const L = Math.max(em(s), .5), across = L * base <= w - 1.5, vert = !across && h > w;
  const fs = Math.max(base * .5, Math.min(base, ((vert ? h : w) - 1.5) / L));
  if (vert) g.vtext(cx + fs * .32, cy, s, {...a, 'font-size':fs});
  else g.text(cx, cy - fs * .35, s, {'text-anchor':'middle', ...a, 'font-size':fs});
}
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
  // fr.leaves: explicit unit-relative leaves [{x, w}] (e.g. inner fronts between spacer strips and a centre divider).
  if (fr.leaves) return fr.leaves.map(l => ({x:l.x, w:l.w, hinge:l.hinge ?? 'L'}));
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
  } else if (it.type === 'dishwasher' && FS) {
    // Slab kitchens: factory panel in white, hidden top controls — no bar handle, no front control strip; thin top recess only.
    g.rect(x, y, w, h, {fill:'#f6f5f0', stroke:C.line, 'stroke-width':.3, rx:.6});
    g.line(x + .8, y + h - 1.6, x + w - .8, y + h - 1.6, {stroke:'#b9bdb6', 'stroke-width':.3});
  } else if (it.type === 'dishwasher') {
    g.rect(x, y + h - 6.5, w, 6.5, {fill:'#d4d8d3', stroke:'none'});
    g.rect(x + w * .3, y + h - 9.5, w * .4, 1, {fill:'#8a948e', stroke:'none', rx:.5});
    g.rect(x + w - 9, y + h - 4.3, 6, 1.6, {fill:'#7a8580', stroke:'none', rx:.4});
  }
  if (labels !== false && it.name) {
    const cy = it.type === 'oven' ? y + h * .42 : y + h * .5;
    g.text(x + w / 2, cy, it.name, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .82});
    if (it.sizeLabel) g.text(x + w / 2, cy - g.f * 1.15, it.sizeLabel, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .66});
    if (it.sub) fitLabel(g, x + w / 2, cy - g.f * 2.1, w, g.f, it.sub, g.f * .6, {fill:C.thin});
  }
}

// Draw a unit (front elevation) at (ox, oy).
function drawUnit(g, u, ox, oy, state, detail, labels) {
  // board = shelf/carcass board thickness; side = side-panel thickness (defaults to board).
  const t = u.board ?? 1.8, sd = u.side ?? t, B = bands(u), sw = detail ? .35 : .3;
  // sideL / sideR override one side panel (e.g. two sub-columns sharing one divider); default = side.
  const sl = u.sideL ?? sd, sr = u.sideR ?? sd;
  if (!u.noCarcass) g.rect(ox, oy, u.w, u.h, {fill:C.interior, stroke:'none'});
  // Closed state: contents of a band fully behind a closed front are hidden anyway — skip them so their labels never
  // collide (in bbox or on screen) with the front's own label.
  // Drawer / pull-out fronts stay drawn in the open state too (the section view shows them pulled out).
  const hidden = b => (u.fronts || []).some(fr => (state !== 'open' || fr.kind === 'drawer' || fr.kind === 'pullout' || fr.kind === 'fixed') && fr.from <= b.y0 + .01 && fr.to >= b.y1 - .01);
  for (const b of B) {
    const y0 = oy + b.y0, ix = ox + sl, iw = u.w - sl - sr;
    // plinth.inset: plinth sits between end gables that run to the floor; fill: e.g. a shadowed recessed face.
    if (b.kind === 'plinth') { const ins = b.inset ?? 0; g.rect(ox + ins, y0, u.w - 2 * ins, b.h, {fill:b.fill || C.plinth, stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'filler') { g.rect(ox, y0, u.w, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2}); continue; }
    if (b.kind === 'board') { g.rect(ox, y0, u.w, b.h, FS && state !== 'open' ? {fill:C.front, stroke:'#8d9891', 'stroke-width':.15} : {fill:C.board, stroke:'none'}); if (b.led) ledStrip(g, b, ix, iw, y0, state, detail); continue; }
    if (b.kind === 'panel') { g.rect(ox, y0, u.w, b.h, {fill:C.front, stroke:C.line, 'stroke-width':sw}); if (FS) g.rect(ox, y0, u.w, b.h, {fill:'url(#elev-grain)', stroke:'none'}); continue; }
    if (b.kind === 'worktop') { g.rect(ox, y0, u.w, b.h, {fill:C.stone, stroke:C.line, 'stroke-width':.25}); continue; }
    if (b.kind === 'builtin') {
      const it = b.item, w = Math.min(it.w, u.w), h = Math.min(it.h, b.h), x = ox + (u.w - w) / 2;
      if (!u.noCarcass) { g.rect(ox, y0, u.w, b.h, {fill:C.front, stroke:C.line, 'stroke-width':sw}); if (FS) g.rect(ox, y0, u.w, b.h, {fill:'url(#elev-grain)', stroke:'none'}); }
      else g.rect(ox, y0, u.w, b.h, {fill:'#f4f5f1', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      appliance(g, it, x, y0 + (it.lift ?? 0), w, h, labels);
      continue;
    }
    if (b.kind === 'tier') {
      g.rect(ix + .4, y0, iw - .8, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      if (detail && !b.noSocket) g.rect(ix + 1.5, oy + b.y1 - 4.5, 3.6, 2.4, {fill:'#fff', stroke:C.thin, 'stroke-width':.2, rx:.4});
      if (!hidden(b)) placeItems(g, b.items || [], ix, iw, y0 + 1.6, detail, b.h - 1.6, b.align, b.gap);
      continue;
    }
    if (b.kind === 'boxes' || b.kind === 'cabinet') {
      for (const s of b.shelves || []) g.rect(ix, y0 + s, iw, b.glass ? .8 : t, b.glass ? {fill:C.glass, stroke:'#9fb4ba', 'stroke-width':.2} : {fill:C.board, stroke:'none'});
      if (!hidden(b)) placeItems(g, b.items || [], ix, iw, y0, detail, b.h, b.align, b.gap);
      continue;
    }
    if (b.kind === 'toprack') { if (state === 'open') topRackFront(g, b, ox, oy + b.y1, detail, labels); continue; }
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
  // Slab style: panel-only units (end / filler panels) are one finished panel, no carcass sides; built-in openings and
  // fronts-less units show their side boards edge-banded in the door finish. Classic style: tan board edges.
  const panelOnly = u.bands.every(b => b.kind === 'plinth' || b.kind === 'panel');
  // (Open state keeps tan boards on units with fronts, matching the interior/construction rendering.)
  const finSides = FS && (state !== 'open' || !u.fronts?.length || u.bands.some(b => b.kind === 'builtin'));
  if (!u.noCarcass && !(FS && panelOnly)) {
    const side = finSides ? {fill:C.front, stroke:'#8d9891', 'stroke-width':.2} : {fill:C.board, stroke:'none'};
    for (const [sx, swd] of [[ox, sl], [ox + u.w - sr, sr]]) {
      g.rect(sx, oy, swd, u.h, side);
      if (finSides) g.rect(sx, oy, swd, u.h, {fill:'url(#elev-grain)', stroke:'none'});
    }
  }
  // Slab style, closed: light carcass outline drawn beneath the fronts, so the fine reveals (not unit boxes) read as the face
  // and overhanging lip doors cover the carcass bottom edge.
  const slabShut = FS && state !== 'open';
  if (!u.noCarcass && slabShut) g.rect(ox, oy, u.w, u.h, {fill:'none', stroke:'#8d9891', 'stroke-width':.25});
  // u.posts: vertical boards seen when the doors are open — {x, w, from, to, kind: 'divider' | 'spacer'} (unit-relative).
  if (state === 'open') for (const p of u.posts || []) g.rect(ox + p.x, oy + p.from, p.w, p.to - p.from, p.kind === 'spacer' ? {fill:'#e9dfcc', stroke:C.thin, 'stroke-width':.2} : {fill:C.board, stroke:C.thin, 'stroke-width':.2});
  const late = [];
  for (const fr of u.fronts || []) {
    // fr.inner: front behind a full-height door (inner drawer / pull-out) — only drawn when the doors are open.
    if (fr.inner && state !== 'open') continue;
    if (FS && fr.kind !== 'mirror' && !fr.mirror && !fr.swing) { slabFront(g, u, fr, ox, oy, state, labels, detail, late); continue; }
    const y0 = oy + fr.from, h = fr.to - fr.from;
    // kind 'mirror' = fixed mirror panel (never opens); door + mirror:true = mirrored door leaf.
    const dashed = state === 'open' && fr.kind !== 'drawer' && fr.kind !== 'mirror';
    // fr.openLeaves: leaves (by index) drawn pulled out in the open state, revealing fr.inside (unit-relative extras).
    const opened = i => state === 'open' && fr.openLeaves?.includes(i);
    if (state === 'open' && fr.inside) extras(g, fr.inside.map(e => shift(e, ox, oy)), state);
    frontLeaves(u, fr).forEach((lf, li) => {
      const i = li, x = ox + lf.x;
      if (fr.kind === 'mirror') {
        mirrorFace(g, x, y0 + .2, lf.w, h - .4, sw);
      } else if (opened(i)) {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:'none', stroke:C.dim, 'stroke-width':.3, 'stroke-dasharray':'1.6 1.1'});
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
      } else if ((fr.kind === 'drawer' || fr.kind === 'pullout') && fr.grip === 'groove') {
        // Handleless top-edge finger groove (J-pull) on a classic-style front: panel stops `groove` short, shadow band above.
        const gv = fr.groove ?? 2;
        g.rect(x, y0 + h - gv, lf.w, gv - .2, {fill:'#b9b2a3', stroke:'none'});
        g.rect(x, y0 + .2, lf.w, h - gv - .2, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        g.rect(x + .1, y0 + h - gv - .8, lf.w - .2, .6, {fill:'#e6e2d8', stroke:'none'});
        if (fr.labels?.[i] && labels) fitLabel(g, x + lf.w / 2, y0 + (h - gv) / 2, lf.w, h - gv, fr.labels[i], g.f * (detail ? .7 : .66), {fill:C.thin});
      } else if (fr.kind === 'drawer' || fr.kind === 'pullout') {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        if (fr.notch) { if (!fr.notchLeaves || fr.notchLeaves.includes(i)) notch(g, x + lf.w / 2, y0 + h - .2, fr.notch.w, fr.notch.h); }
        else g.rect(x + lf.w * .3, y0 + h - 2.6, lf.w * .4, .7, {fill:C.thin, stroke:'none', rx:.35});
      } else {
        g.rect(x, y0 + .2, lf.w, h - .4, {fill:C.front, stroke:C.line, 'stroke-width':sw});
        // fr.handle === false: handleless (finger pull) door — no bar handle and no swing diagonals on the closed face.
        if (fr.handle !== false) {
          const hx = lf.hinge === 'L' ? x : x + lf.w, fx = lf.hinge === 'L' ? x + lf.w : x, my = y0 + h / 2;
          g.path(`M${fx} ${g.Y(y0 + h - .2)}L${hx} ${g.Y(my)}L${fx} ${g.Y(y0 + .2)}`, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
          const hy = Math.min(Math.max(y0 + 4, 100), y0 + h - 14), handleX = lf.hinge === 'L' ? x + lf.w - 1.6 : x + 1;
          g.rect(handleX, hy, .6, Math.min(12, h * .4), {fill:C.thin, stroke:'none', rx:.3});
        }
        // Concealed hinge cups (behind the closed leaf), drawn faint on the hinge edge.
        for (const hm of fr.hingeMarks?.[li] || []) g.rect(lf.hinge === 'L' ? x + .6 : x + lf.w - 4.1, hm - 1.75, 3.5, 3.5, {fill:'none', stroke:C.faint, 'stroke-width':.25, rx:1.75});
      }
    });
    if (fr.label && !dashed && labels) {
      if (fr.vertical && h > u.w) g.vtext(ox + u.w / 2 + g.f * .3, y0 + h / 2, fr.label, {fill:C.thin, 'font-size':g.f * .74});
      else fitLabel(g, ox + u.w / 2, y0 + h / 2 + g.f * .05, u.w, h, fr.label, g.f * (detail ? .78 : .74), {fill:C.thin, 'paint-order':'stroke', stroke:C.front, 'stroke-width':g.f * .25, 'stroke-linejoin':'round'});
    }
  }
  if (!u.noCarcass && !slabShut) g.rect(ox, oy, u.w, u.h, {fill:'none', stroke:C.line, 'stroke-width':detail ? .5 : .4});
  late.forEach(fn => fn());
}

// Top-mounted side-pull trouser racks (band kind 'toprack'), front view: per row (b.rows[{x, label}], unit-relative) the rail's
// end cap hangs from the board above (top = board underside), a hook cantilevers to the right at b.rail.hookAt below it,
// and the front-most folded garment hangs from the hook. b.rail = {w, h, hook, hookAt}; b.garments.lens per row.
function topRackFront(g, b, ox, top, detail, labels) {
  const R = b.rail || {}, rw = R.w ?? 3.4, rh = R.h ?? 13, hk = R.hook ?? 22, hy = top - (R.hookAt ?? 12), lens = b.garments?.lens || [52];
  b.rows.forEach((row, i) => {
    const x = ox + row.x, L = lens[i % lens.length], gx = x + rw + .6, gw = hk - 1.2;
    g.rect(gx, hy - L, gw, L, {fill:C.garment, stroke:'#9db0a3', 'stroke-width':.25, rx:1.4});
    g.rect(gx, hy - 3.2, gw, 3.2, {fill:'#bccdc1', stroke:'none', rx:1});
    g.rect(x + rw, hy - .5, hk, 1, {fill:'#5b625e', stroke:'none', rx:.5});
    g.rect(x, top - rh, rw, rh, {fill:'#5b625e', stroke:C.line, 'stroke-width':.2, rx:.4});
    g.rect(x + rw, top - 2.2, hk, 2.2, {fill:'#d9dcd7', stroke:C.thin, 'stroke-width':.2});
    if (labels && row.label) fitLabel(g, gx + gw / 2, hy - L / 2, gw, L - 4, row.label, g.f * (detail ? .7 : .66), {fill:C.thin});
  });
}

// Handleless slab front (elev.frontStyle = {gap, lip, groove, lipAbove}): equal fine reveals, matte grain laminate, no bar handles.
// Grip per front (fr.grip overrides): 'lip' when the front's bottom sits at/above lipAbove (wall units) — the door runs `lip`
// below the carcass and is pulled from underneath; otherwise 'groove' — top-edge finger groove (panel stops `groove` short of
// the zone top, back edge chamfered), drawn as a shadow band; 'push' = no grip (TIP-ON push-to-open, e.g. a door stacked
// above a lift-up flap). Closed lip doors carry no face label or swing marks.
// fr.kind 'lift' = lift-up flap hinged at its top edge (stay lift): faint chevron when closed; when open it is drawn raised
// above its zone (foreshortened underside). fr.kind 'fixed' = fixed false front (never opens, e.g. hiding a hood body).
function slabGrip(fr, oy) { return fr.grip || (oy + fr.from >= (FS.lipAbove ?? 140) ? 'lip' : 'groove'); }
function slabFront(g, u, fr, ox, oy, state, labels, detail, late = []) {
  const n = fr.count || 1, gp = FS.gap ?? .3, w = (u.w - gp * n) / n, grip = slabGrip(fr, oy);
  const lip = grip === 'lip' ? (fr.lip ?? FS.lip ?? 2) : 0, groove = grip === 'groove' ? (fr.groove ?? FS.groove ?? 2) : 0;
  const bot = oy + fr.from - lip + (lip ? 0 : gp / 2), top = oy + fr.to - gp / 2, ptop = top - groove + (groove ? gp / 2 : 0);
  const door = fr.kind !== 'drawer' && fr.kind !== 'pullout' && fr.kind !== 'fixed', dashed = state === 'open' && door;
  if (state === 'open' && fr.inside) extras(g, fr.inside.map(e => shift(e, ox, oy)), state);
  // Closed / drawer fronts: back the whole zone with the reveal shadow, so reveals read as even dark hairlines and nothing behind shows.
  if (!dashed) g.rect(ox, bot - (lip ? 0 : gp / 2), u.w, top + gp / 2 - bot + (lip ? 0 : gp / 2), {fill:'#9aa29c', stroke:'none'});
  for (let i = 0; i < n; i++) {
    const x = ox + gp / 2 + i * (w + gp);
    if (dashed) {
      g.rect(x, bot, w, top - bot, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      if (fr.kind === 'lift') late.push(() => liftRaised(g, x, w, top, (top - bot) * (fr.raise ?? .3), labels !== false));
      continue;
    }
    if (groove) g.rect(x - gp / 2, ptop, w + gp, top + gp / 2 - ptop, {fill:'#b9b2a3', stroke:'none'});
    g.rect(x, bot, w, ptop - bot, {fill:C.front, stroke:'#8d9891', 'stroke-width':.22});
    g.rect(x, bot, w, ptop - bot, {fill:'url(#elev-grain)', stroke:'none'});
    // Grip edge: chamfered top edge (groove) or the free bottom edge of an overhanging door (lip).
    if (groove) g.rect(x + .1, ptop - .7, w - .2, .6, {fill:'#e6e2d8', stroke:'none'});
    if (lip) { g.rect(x + .1, bot + .1, w - .2, .7, {fill:'#dedad0', stroke:'none'}); g.line(x, bot, x + w, bot, {stroke:C.dark, 'stroke-width':.3}); }
    if (fr.kind === 'lift') { const cx = x + w / 2, cy = (bot + ptop) / 2, k = Math.min(2.4, w * .06); g.path(`M${cx - k} ${g.Y(cy - k * .35)}L${cx} ${g.Y(cy + k * .4)}L${cx + k} ${g.Y(cy - k * .35)}`, {fill:'none', stroke:'#cdd3ce', 'stroke-width':.25, 'stroke-linecap':'round'}); }
    if (fr.kind === 'fixed' && state === 'open') fitLabel(g, x + w / 2, (bot + ptop) / 2, w, ptop - bot, T('固定'), g.f * .5, {fill:C.thin});
  }
  if (fr.label && !dashed && labels && (!lip || fr.kind === 'lift') && (FL || state === 'open')) fitLabel(g, ox + u.w / 2, (bot + ptop) / 2, u.w, ptop - bot, fr.label, g.f * (detail ? .78 : .74), {fill:C.thin});
}

// Open lift-up flap seen from the front: its underside, foreshortened, rising from the hinge line (y = hinge) by hh.
function liftRaised(g, x, w, hinge, hh, label) {
  g.rect(x, hinge, w, hh, {fill:'#f1efe8', stroke:C.line, 'stroke-width':.3});
  g.line(x, hinge + hh, x + w, hinge + hh, {stroke:C.dark, 'stroke-width':.35});
  if (label && hh > g.f * .9) fitLabel(g, x + w / 2, hinge + hh / 2, w, hh, T('上掀'), g.f * .55, {fill:C.thin});
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

// Arc finger-pull / cable notch cut into the top edge of a front (cx centre, top = edge height, w wide, h deep).
function notch(g, cx, top, w, h) {
  g.path(`M${cx - w / 2} ${g.Y(top)}A${w / 2} ${h} 0 0 0 ${cx + w / 2} ${g.Y(top)}Z`, {fill:C.cavity, stroke:C.line, 'stroke-width':.3});
}
// Offset an extra's coordinates (x, x0/x1, y, y0/y1, pts, lx/ly) by (dx, dy).
function shift(e, dx, dy) {
  const o = {...e};
  for (const k of ['x', 'x0', 'x1', 'lx']) if (o[k] != null) o[k] += dx;
  for (const k of ['y', 'y0', 'y1', 'ly']) if (o[k] != null) o[k] += dy;
  if (o.pts) o.pts = o.pts.map(([x, y]) => [x + dx, y + dy]);
  return o;
}
// Type G (BS 1363) socket plate seen from the front: n gangs plus an optional USB pair.
function socketPlate(g, x, y, w, h, n, usb) {
  g.rect(x, y, w, h, {fill:C.socket, stroke:C.line, 'stroke-width':.25, rx:.4});
  const slots = n + (usb ? 1 : 0), cw = w / slots, cy = y + h / 2;
  for (let i = 0; i < n; i++) {
    const cx = x + cw * (i + .5);
    g.rect(cx - .45, cy + .4, .9, 1.3, {fill:C.dark, stroke:'none'});
    g.rect(cx - 1.5, cy - 1.3, 1.1, .6, {fill:C.dark, stroke:'none'});
    g.rect(cx + .4, cy - 1.3, 1.1, .6, {fill:C.dark, stroke:'none'});
  }
  if (usb) for (const k of [-.8, .8]) g.rect(x + cw * (n + .5) - .7, cy + k - .3, 1.4, .6, {fill:C.dark, stroke:'none', rx:.2});
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
      const fh = fs * (it.w < fs * 3 ? .8 : 1), fitsAcross = em(name) * fh <= it.w - 1;
      if ((it.w > fs * Math.min(name.length, 4) * .9 || it.w > fs * 2.6) && (fitsAcross || h <= it.w)) g.text(x + it.w / 2, y0 + h / 2 + fs * .35, name, {'text-anchor':'middle', fill:C.line, 'font-size':fitsAcross ? fh : Math.max(fh * .55, (it.w - 1) / em(name))});
      else g.vtext(x + it.w / 2 + fs * .32, y0 + h / 2, name, {fill:C.line, 'font-size':Math.min(fs * .8, Math.max(fs * .45, (h - 1.5) / em(name)))});
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
// Mirror of rightChain for a unit at the left end of a view (view.leftChain = {ref, min?}); numbers sit left of the line.
function leftChain(g, u, ox, oy, x, rc) {
  const B = bands(u), tick = 1.2, s = {stroke:C.dim, 'stroke-width':.25}, fs = g.f * .8;
  g.line(x, oy, x, oy + u.h, s);
  for (const b of B) {
    g.line(x - tick, oy + b.y0, x + tick, oy + b.y0, s);
    if (b.h >= (rc.min ?? 2.5)) g.text(x - 1.6, oy + (b.y0 + b.y1) / 2 - fs * .36, fmt(b.h), {'text-anchor':'end', fill:C.dim, 'font-size':fs});
  }
  g.line(x - tick, oy + u.h, x + tick, oy + u.h, s);
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

function extras(g, list, state = ST) {
  for (let e of list || []) {
    if (e.when && e.when !== state) continue;
    if (dryExtra(g, e) || toeExtra(g, e)) continue;
    if (e.dxOpen && state === 'open') e = shift(e, e.dxOpen, 0);
    const fsz = g.f * (e.size || .7);
    if (e.type === 'wallpaper') {
      // Feature-wall finish (wallpaper over a timber/ply base); e.gaps adds 0.8 shadow gaps at both ends and the top.
      const y = e.y ?? 0;
      g.rect(e.x, y, e.w, e.h, {fill:C.paper, stroke:'none'});
      g.rect(e.x, y, e.w, e.h, {fill:'url(#elev-paper)', stroke:'none'});
      if (e.gaps) for (const r of [[e.x, y, .8, e.h], [e.x + e.w - .8, y, .8, e.h], [e.x, y + e.h - .8, e.w, .8]]) g.rect(...r, {fill:'#9aa199', stroke:'none'});
      if (e.label) g.text(e.lx ?? e.x + 4, e.ly ?? y + e.h - g.f * 1.6, e.label, {fill:C.thin, 'font-size':fsz, 'text-anchor':e.anchor || 'start'});
      continue;
    }
    if (e.type === 'wash') { g.rect(e.x, e.y, e.w, e.h, {fill:'url(#elev-warm)', stroke:'none', opacity:e.opacity ?? .5}); continue; }
    if (e.type === 'beam') { g.path(`M${e.pts.map(([x, y]) => `${x} ${g.Y(y)}`).join('L')}Z`, {fill:'url(#elev-warm)', stroke:'none', opacity:e.opacity ?? .55}); continue; }
    if (e.type === 'soffit') {
      g.rect(e.x, e.y, e.w, e.h, {fill:'#eef0eb', stroke:C.thin, 'stroke-width':.3});
      if (e.slot) g.rect(e.slot[0], e.y - .6, e.slot[1], 1.2, {fill:C.warm, stroke:C.line, 'stroke-width':.2});
      if (e.label) g.text(e.lx ?? e.x + e.w / 2, e.ly ?? e.y + e.h / 2 - fsz * .35, e.label, {'text-anchor':e.anchor || 'middle', fill:C.thin, 'font-size':fsz});
      continue;
    }
    if (e.type === 'tv') {
      if (e.side) g.rect(e.x, e.y, e.w, e.h, {fill:C.screen, stroke:C.line, 'stroke-width':.25});
      else {
        // e.cut: only the lower part of the TV is in view, so skip the top edge.
        g.rect(e.x, e.y, e.w, e.h, {fill:'#2c3330', stroke:e.cut ? 'none' : C.line, 'stroke-width':.35, rx:e.cut ? 0 : .3});
        g.rect(e.x + 1.6, e.y + 1.6, e.w - 3.2, e.h - (e.cut ? 1.6 : 3.2), {fill:C.screen, stroke:'none'});
      }
      if (e.label) g.text(e.lx ?? e.x + e.w / 2, e.ly ?? e.y + e.h / 2 + fsz * .2, e.label, {'text-anchor':e.anchor || 'middle', fill:e.side ? C.line : '#eef1ec', 'font-size':fsz});
      if (e.sub) g.text(e.lx ?? e.x + e.w / 2, (e.ly ?? e.y + e.h / 2 + fsz * .2) - fsz * 1.35, e.sub, {'text-anchor':e.anchor || 'middle', fill:e.side ? C.thin : '#c3cbc6', 'font-size':fsz * .82});
      continue;
    }
    if (e.type === 'socket' && e.w != null) {
      if (e.side) g.rect(e.x, e.y, e.w, e.h, {fill:C.socket, stroke:C.line, 'stroke-width':.25});
      else socketPlate(g, e.x, e.y, e.w, e.h, e.n || 2, e.usb);
      if (e.label) g.text(e.lx ?? e.x + e.w / 2, e.ly ?? e.y + e.h + fsz * .45, e.label, {'text-anchor':e.anchor || 'middle', fill:e.color || C.line, 'font-size':fsz});
      continue;
    }
    if (e.type === 'device' || e.type === 'cavity') {
      const cav = e.type === 'cavity';
      g.rect(e.x, e.y, e.w, e.h, {fill:cav ? C.cavity : e.dashed ? 'none' : C.item, stroke:cav ? C.thin : e.dashed ? C.faint : C.itemLine, 'stroke-width':.3, 'stroke-dasharray':e.dashed ? '1.4 1' : null, rx:cav ? 0 : .5});
      if (e.label) g.text(e.lx ?? e.x + e.w / 2, e.ly ?? e.y + e.h / 2 - fsz * .35, e.label, {'text-anchor':e.anchor || 'middle', fill:e.color || C.line, 'font-size':fsz});
      continue;
    }
    if (e.type === 'conduit' || e.type === 'cable') {
      const cd = e.type === 'conduit';
      g.path(`M${e.pts.map(([x, y]) => `${x} ${g.Y(y)}`).join('L')}`, {fill:'none', stroke:cd ? '#8a6f4e' : C.dark, 'stroke-width':cd ? .9 : .35, 'stroke-dasharray':cd ? '2 1.2' : null, 'stroke-linejoin':'round'});
      if (e.label) { const a = {fill:e.color || '#8a6f4e', 'font-size':fsz}; if (e.vertical) g.vtext(e.lx, e.ly, e.label, a); else g.text(e.lx, e.ly, e.label, {...a, 'text-anchor':e.anchor || 'start'}); }
      continue;
    }
    if (e.type === 'cablearm') {
      // Folding cable arm / drag chain from the fixed end (x0) to the moving drawer back (x1).
      const n = e.links || 4, dx = (e.x1 - e.x0) / n, pts = [];
      for (let i = 0; i <= n; i++) pts.push(`${e.x0 + dx * i} ${g.Y(e.y + (i % 2 ? e.h : 0))}`);
      g.path(`M${pts.join('L')}`, {fill:'none', stroke:'#7a6a55', 'stroke-width':.8, 'stroke-linejoin':'round'});
      if (e.label) g.text(e.lx ?? (e.x0 + e.x1) / 2, e.ly ?? e.y - fsz * 1.1, e.label, {'text-anchor':e.anchor || 'middle', fill:'#7a6a55', 'font-size':fsz});
      continue;
    }
    if (e.type === 'callout') {
      // Leader from the pointed feature (x, y) to a label at (lx, ly).
      g.path(`M${e.x} ${g.Y(e.y)}L${e.lx - .8} ${g.Y(e.ly + fsz * .3)}`, {fill:'none', stroke:C.dim, 'stroke-width':.22});
      g.rect(e.x - .5, e.y - .5, 1, 1, {fill:C.dim, stroke:'none', rx:.5});
      g.text(e.lx, e.ly, e.label, {fill:e.color || C.line, 'font-size':fsz});
      continue;
    }
    if (e.type === 'lining') {
      g.rect(e.x, e.y ?? 0, e.w, e.h, {fill:'#efe6d6', stroke:C.thin, 'stroke-width':.25});
      if (e.label) g.vtext(e.x + e.w / 2 + fsz * .3, (e.y ?? 0) + e.h * (e.at ?? .5), e.label, {fill:C.thin, 'font-size':fsz});
      continue;
    }
    if (e.type === 'dryer') { dryer(g, e); if (e.label) g.text(e.lx ?? e.x, e.ly ?? e.y + 1.4, e.label, {'text-anchor':e.anchor || 'middle', fill:C.line, 'font-size':g.f * (e.size || .62)}); continue; }
    if (e.type === 'socket' && e.w == null) { socketMark(g, e); if (e.label) g.text(e.x + (e.dx ?? 0), e.y - (e.size ?? 8.6) / 2 - g.f * .95, e.label, {'text-anchor':e.anchor || 'middle', fill:C.dim, 'font-size':g.f * (e.fs || .6)}); continue; }
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
      // Optional material label (e.g. 岩板檯面 · 面 90) placed above the worktop at labelX/labelY.
      if (e.label) g.text(e.labelX ?? e.x + e.w / 2, e.labelY ?? e.y + e.h + g.f * .5, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * (e.size || .62)});
    } else if (e.type === 'hob') {
      g.rect(e.x, e.y, e.w, 1.2, {fill:C.dark, stroke:'none'});
      for (const k of [.22, .5, .78]) g.rect(e.x + e.w * k - 4, e.y + 1.2, 8, 1.6, {fill:C.dark, stroke:'none'});
      if (e.label) g.text(e.x + e.w / 2, e.y + 4.6, e.label, {'text-anchor':'middle', fill:C.line, 'font-size':g.f * .78});
    } else if (e.type === 'sink') {
      const bowl = !e.bowlWhen || e.bowlWhen === state;
      if (bowl) g.rect(e.x, e.y - e.depth, e.w, e.depth, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      g.path(`M${e.x + e.w / 2} ${g.Y(e.y)}v-14h5v2`, {fill:'none', stroke:C.line, 'stroke-width':.6});
      if (e.label && bowl) g.text(e.x + e.w / 2, e.y - e.depth / 2 - g.f * .3, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * .78});
    } else if (e.type === 'optional' && e.leaves) {
      // Possible future cabinet: faint dashed slab leaves (same reveal / lip as the wall units), small label inside.
      const n = e.leaves, gp = FS?.gap ?? .3, lw = (e.w - gp * n) / n, lip = e.lip ?? 0;
      for (let i = 0; i < n; i++) g.rect(e.x + gp / 2 + i * (lw + gp), e.y - lip, lw, e.h + lip, {fill:C.front, 'fill-opacity':.55, stroke:C.thin, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      if (e.label) g.text(e.x + e.w / 2, e.y - lip + g.f * .7, e.label, {'text-anchor':'middle', fill:C.thin, 'font-size':g.f * (e.size || .55)});
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

// Toe-kick light (TV console): 45° corner LED profile in the angle between the carcass underside and a recessed plinth face.
// toe-light front: {x, w, y (carcass underside), p (profile size)} — lit diffuser bar + glow down to the floor.
// toe-light section: {section:true, x (plinth face), y, p, front (drawer front line), board} — base board, profile, beam.
// toe-detail: magnified inset {x, y (box bottom-left), k (scale), x0..x1 / y0..y1 (real window), front, recess, y (underside)
// via `under`, p, eye:[height, distance], labels:{title, recess, eye, led}} — profile angle, recess depth and seated sightline.
function toeBeam(ox, oy, a1, a2, xMax) {
  // Rays from the diffuser centre (ox, oy) at a1..a2 degrees below horizontal, ending on the floor (clipped at xMax).
  const hit = a => { const t = Math.tan(a * Math.PI / 180), x = ox + oy / t; return x <= xMax ? [[x, 0]] : [[xMax, oy - (xMax - ox) * t], [xMax, 0]]; };
  return [[ox, oy], ...hit(a1), ...hit(a2).slice(-1)];
}
function toeProfile(g, X, Y, x, y, p, sw) {
  // Right-angle aluminium body in the corner (x = plinth face, y = carcass underside); opal diffuser on the 45° face.
  g.path(`M${X(x)} ${Y(y)}L${X(x + p)} ${Y(y)}L${X(x)} ${Y(y - p)}Z`, {fill:'#c7cbc6', stroke:C.line, 'stroke-width':sw});
  g.path(`M${X(x + p)} ${Y(y)}L${X(x)} ${Y(y - p)}`, {fill:'none', stroke:'#f6c25e', 'stroke-width':sw * 3.2, 'stroke-linecap':'round'});
}
function toeExtra(g, e) {
  if (e.type === 'toe-light' && !e.section) {
    const p = e.p ?? 1.8;
    g.rect(e.x, 0, e.w, e.y - p, {fill:'url(#elev-warm)', stroke:'none', opacity:e.opacity ?? .8});
    g.rect(e.x - 3, 0, e.w + 6, .7, {fill:C.warm, stroke:'none', opacity:.85, rx:.35});
    // Profile is hidden behind the front line: drawn dashed.
    g.rect(e.x, e.y - p, e.w, p, {fill:'#fff3d2', 'fill-opacity':.6, stroke:'#b39a68', 'stroke-width':.2, 'stroke-dasharray':'1.2 .8'});
    if (e.label) g.text(e.lx ?? e.x + e.w / 2, e.ly ?? 1.6, e.label, {'text-anchor':e.anchor || 'middle', fill:e.color || C.dim, 'font-size':g.f * (e.size || .58)});
    return true;
  }
  if (e.type === 'toe-light') {
    const p = e.p ?? 1.8, cx = e.x + p / 2, cy = e.y - p / 2, X = v => v, Y = v => g.Y(v);
    g.rect(0, e.y, e.front - (e.board ?? 1.8), e.board ?? 1.8, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
    const pts = toeBeam(cx, cy, e.a1 ?? 10, e.a2 ?? 80, e.reach ?? e.front + 30);
    g.path(`M${pts.map(([x, y]) => `${x} ${Y(y)}`).join('L')}Z`, {fill:'url(#elev-warm)', stroke:'none', opacity:.75});
    g.rect(pts.at(-1)[0], 0, (pts[1][0]) - pts.at(-1)[0], .6, {fill:C.warm, stroke:'none', opacity:.8});
    toeProfile(g, X, Y, e.x, e.y, p, .2);
    return true;
  }
  if (e.type === 'toe-detail') {
    const k = e.k ?? 3, x0 = e.x0, x1 = e.x1, y0 = e.y0 ?? -2.5, y1 = e.y1 ?? 13, fr = e.front, rc = e.recess, uy = e.under ?? 8, p = e.p ?? 1.8, bd = e.board ?? 1.8;
    const X = v => e.x + (v - x0) * k, Y = v => g.Y(e.y + (v - y0) * k), L = e.labels || {}, fs = g.f * (e.size || .56);
    const box = (ax, ay, bx, by, a) => g.path(`M${X(ax)} ${Y(ay)}H${X(bx)}V${Y(by)}H${X(ax)}Z`, a);
    box(x0, y0, x1, y1, {fill:'#fff', stroke:C.thin, 'stroke-width':.3});
    if (L.title) g.text(e.x, e.y + (y1 - y0) * k + fs * .6, L.title, {fill:C.line, 'font-size':fs * 1.1});
    g.path(`M${X(x0)} ${Y(0)}H${X(x1)}`, {stroke:C.line, 'stroke-width':.45});
    box(x0, 0, fr - rc, uy, {fill:e.plinthFill || C.plinth, stroke:C.thin, 'stroke-width':.2});
    box(x0, uy, fr - bd, uy + bd, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
    box(fr - bd, uy + .2, fr, y1, {fill:C.front, stroke:C.line, 'stroke-width':.3});
    const pts = toeBeam(fr - rc + p / 2, uy - p / 2, e.a1 ?? 10, e.a2 ?? 80, x1);
    g.path(`M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}Z`, {fill:'url(#elev-warm)', stroke:'none', opacity:.75});
    // Beam axis at 45° and the seated sightline grazing the front-bottom edge.
    const ax = fr - rc + p / 2, ay = uy - p / 2;
    g.path(`M${X(ax)} ${Y(ay)}L${X(ax + ay)} ${Y(0)}`, {stroke:C.dim, 'stroke-width':.22, 'stroke-dasharray':'.9 .7'});
    if (L.angle) g.text(X(ax + ay * .62) + fs * .35, ay * .38 * k + e.y - y0 * k - fs * .25, L.angle, {fill:C.dim, 'font-size':fs});
    toeProfile(g, X, Y, fr - rc, uy, p, .25);
    if (e.eye) {
      const sl = (e.eye[0] - uy) / e.eye[1], ya = x => uy + (x - fr) * sl, xa = Math.max(fr - rc, fr - uy / sl), xs = Math.min(x1, fr + (y1 - uy) / sl);
      g.path(`M${X(xs)} ${Y(ya(xs))}L${X(xa)} ${Y(ya(xa))}`, {stroke:'#5d7f9a', 'stroke-width':.3, 'stroke-dasharray':'1.6 .9'});
      // Label under the sightline, above the beam (right end of the window).
      if (L.eye) g.text(X(x1) - .8, e.y + (uy - .7 - y0) * k, L.eye, {'text-anchor':'end', fill:'#5d7f9a', 'font-size':fs});
    }
    if (L.led) g.text(X(fr - rc) - .8, e.y + (uy - 2.4 - y0) * k, L.led, {'text-anchor':'end', fill:C.line, 'font-size':fs, 'paint-order':'stroke', stroke:'#fff', 'stroke-width':fs * .25});
    // Recess dimension under the floor line; underside height on the right of the front line.
    const dy = e.y + (-1.2 - y0) * k, s = {stroke:C.dim, 'stroke-width':.22};
    g.line(X(fr - rc), dy, X(fr), dy, s); for (const v of [fr - rc, fr]) g.line(X(v), dy - .9, X(v), dy + .9, s);
    if (L.recess) g.text((X(fr - rc) + X(fr)) / 2, dy - fs * 1.15, L.recess, {'text-anchor':'middle', fill:C.dim, 'font-size':fs});
    const vx = X(fr) + 2.2; g.line(vx, e.y - y0 * k, vx, e.y + (uy - y0) * k, s);
    for (const v of [0, uy]) g.line(vx - .9, e.y + (v - y0) * k, vx + .9, e.y + (v - y0) * k, s);
    g.text(vx + .9, e.y + (uy / 2 - y0) * k - fs * .35, fmt(uy), {fill:C.dim, 'font-size':fs});
    return true;
  }
  return false;
}

function defs() {
  return `<defs><pattern id="elev-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V2" stroke="#b7beb6" stroke-width=".5"/></pattern><pattern id="elev-wall" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" stroke="#a8b1a9" stroke-width=".35"/></pattern><pattern id="elev-paper" width="9" height="7" patternUnits="userSpaceOnUse"><path d="M.6 1.2h2.2M5.2 3.1h2.6M2.1 5.4h1.7M7.3 6.2h1.2" stroke="#cfccc3" stroke-width=".22" stroke-linecap="round"/><circle cx="4.1" cy="1.4" r=".18" fill="#d3d0c8"/><circle cx="8.2" cy="4.6" r=".16" fill="#d3d0c8"/></pattern><pattern id="elev-grain" width="4.6" height="38" patternUnits="userSpaceOnUse"><path d="M.7 0C.9 9 .5 19 .8 38M2.1 0C2.3 12 1.9 25 2.2 38M3.6 0C3.4 8 3.8 22 3.5 38" stroke="#ece8df" stroke-width=".14" fill="none"/></pattern><linearGradient id="elev-warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c46b" stop-opacity=".9"/><stop offset="1" stop-color="#f3c46b" stop-opacity="0"/></linearGradient></defs>`;
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
  const lc = view.leftChain && units.find(r => r.ref === view.leftChain.ref);
  if (lc) m.l += rightChainWidth(g, lc.u, view.leftChain);
  levels(g, view, -m.l + f * .4, W);
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  if (!view.noCeiling) {
    g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
    g.text(rc ? W : W + m.r - f, H + (rc ? f * .5 : .9), view.ceilingLabel || `${T('天花')} ${fmt(H)}`, {'text-anchor':'end', fill:C.thin, 'font-size':f * .72});
  }
  extras(g, view.under, state);
  FL = !(view.frontLabels === false && state !== 'open');
  // view.clip: units cut at the view edges (a run view showing part of a wider unit).
  if (view.clip) { const id = `elev-clip-${esc(view.id)}`; g.out.push(`<clipPath id="${id}"><rect x="0" y="${-f * 4}" width="${W}" height="${H + f * 8}"/></clipPath><g clip-path="url(#${id})">`); }
  for (const r of units) drawUnit(g, r.u, r.x, r.y || 0, state, detail, labels);
  if (view.clip) g.out.push('</g>');
  FL = true;
  extras(g, view.extras, state);
  if (chainUnit) chain(g, chainUnit.u, chainUnit.x, chainUnit.y || 0, Math.max(chainUnit.x + chainUnit.u.w, W) + f * 1.1, detail);
  if (rc) rightChain(g, rc.u, rc.x, rc.y || 0, Math.max(rc.x + rc.u.w, W) + f * 1.1, view.rightChain);
  if (lc) leftChain(g, lc.u, lc.x, lc.y || 0, Math.min(lc.x, 0) - f * 1.1, view.leftChain);
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
  // Label room: at least view.labelRoom (default 16), widened so the longest tier / drawer label stays inside the drawing.
  const longest = Math.max(0, ...B.filter(b => b.kind === 'tier' || b.kind === 'drawers' || b.kind === 'cabinet' || b.kind === 'rack' || b.kind === 'toprack').map(b => em(b.short || b.label || '')));
  const W = D + ext + Math.max(view.labelRoom ?? 16, longest * f * .74 + 4);
  const m = {l: Math.max(f * 6.2, levelMargin(view, f)) + (view.wallAt ? 4 - view.wallAt : 0), r: view.chain ? f * 6 : f * 2, t: f * 2.4, b: f * 3.6};
  const g = canvas(H, f);
  levels(g, view, -m.l + f * .4, W);
  const wx = view.wallAt ?? 0; // structural wall face; a lining (feature-wall build-up) may sit between it and the cabinet back (x=0)
  g.rect(wx - 4, 0, 4, H, {fill:'url(#elev-wall)', stroke:C.line, 'stroke-width':.4});
  g.line(-m.l + f * .4, 0, W + m.r - f, 0, {stroke:C.line, 'stroke-width':.6});
  if (!view.noCeiling) g.line(-m.l + f * .4, H, W + m.r - f, H, {stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'3 1.6'});
  g.rect(0, 0, D, top, {fill:C.interior, stroke:C.line, 'stroke-width':.45});
  extras(g, view.under, state);
  const back = 1, dxAll = whole && open ? ext : 0;
  const firstY = B.find(b => b.kind !== 'plinth')?.y0 ?? 0;
  if (whole) {
    g.rect(back + dxAll, firstY, 1.6, top - firstY - .5, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
  }
  for (const b of B) {
    const y0 = b.y0;
    if (b.kind === 'plinth') { const rc = b.recess ?? 5; g.rect(0, y0, D - rc, b.h, {fill:b.fill || C.plinth, stroke:C.thin, 'stroke-width':.2}); g.rect(D - rc, y0, rc, b.h, {fill:'#fff', stroke:'none'}); }
    else if (b.kind === 'board') {
      // b.depth: board stops short of the front (e.g. behind a door); b.led: LED profile under the front edge, glowing when open.
      const bd = b.depth ?? D;
      g.rect(0, y0, bd, b.h, {fill:C.board, stroke:'none'});
      if (b.led) {
        if (open) g.path(`M${bd - 6} ${g.Y(y0 - .8)}L${bd - 2} ${g.Y(y0 - .8)}L${bd + 4} ${g.Y(y0 - (b.led.glow ?? 26))}L${bd - 14} ${g.Y(y0 - (b.led.glow ?? 26))}Z`, {fill:'#fbe7a1', opacity:.38, stroke:'none'});
        g.rect(bd - 6, y0 - .8, 4, .8, {fill:open ? '#e8b923' : '#c9b98a', stroke:'none', rx:.3});
      }
    }
    else if (b.kind === 'filler') g.rect(0, y0, D, b.h, {fill:'url(#elev-hatch)', stroke:C.thin, 'stroke-width':.2});
    else if (b.kind === 'hang') {
      // Hanging zone seen from the side: rail (b.railX, default mid-depth), hanger and the longest garment face-on (shoulders across the depth).
      const rx = b.railX ?? D / 2, ry = b.rail, gw = b.garments?.width ?? 44, gl = Math.max(...(b.garments?.lens || [90]));
      g.rect(rx - gw / 2, ry - 3.2 - gl, gw, gl - 1.6, {fill:C.garment, stroke:'#9db0a3', 'stroke-width':.25, rx:2.4, opacity:.85});
      g.path(`M${rx - gw / 2 + 1} ${g.Y(ry - 4.4)}L${rx} ${g.Y(ry - 1.4)}L${rx + gw / 2 - 1} ${g.Y(ry - 4.4)}Z`, {fill:'none', stroke:C.itemLine, 'stroke-width':.35, 'stroke-linejoin':'round'});
      g.path(`M${rx} ${g.Y(ry - 1.4)}V${g.Y(ry + .4)}A.9 .9 0 0 0 ${rx - 1.8} ${g.Y(ry + .4)}`, {fill:'none', stroke:C.itemLine, 'stroke-width':.3});
      g.out.push(`<circle cx="${rx}" cy="${g.Y(ry)}" r=".8" fill="#8f9a93"/>`);
      if (b.short) fitLabel(g, rx, ry - 3.2 - gl / 2, gw - 4, gl, b.short, f * .7, {fill:C.thin});
    } else if (b.kind === 'boxes') {
      // Storage boxes from the back (b.depth deep, default 55), one per tier.
      const it = (b.items || [])[0];
      if (it) { const bd = b.boxDepth ?? 55; g.rect(1.8, y0, bd, Math.min(it.h, b.h - .5), {fill:C.box, stroke:C.itemLine, 'stroke-width':.3, rx:.6}); fitLabel(g, 1.8 + bd / 2, y0 + it.h / 2, bd, it.h, it.name, f * .7, {fill:C.line}); }
    } else if (b.kind === 'rack') {
      // Pull-out trouser rack: frame (floor on runners, back post, side rail) with round rods across the width, spaced front-to-back;
      // garments folded over the rods. b.inset = front set back behind a door; b.boxFrom = frame back; b.rods = {n, pitch, d, first}.
      const dx = open ? (view.drawerExtension ?? ext - 5) : 0, ins = b.inset ?? 0, fx = D - ins - 1.8, bx = b.boxFrom ?? back;
      const R = b.rods || {}, n = R.n ?? 7, pitch = R.pitch ?? 7, rd = R.d ?? 1.6, rg = b.runner ?? 1.4;
      const rodC = y0 + b.h - 1 - rd / 2, floor = y0 + rg + 1.6, lens = b.garments?.lens || [50];
      g.rect(bx + dx, y0 + rg, fx - bx, 1.6, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      g.rect(bx + dx, y0 + rg, 1.6, rodC + rd / 2 - y0 - rg, {fill:C.board, stroke:C.thin, 'stroke-width':.2});
      g.rect(bx + dx, rodC - 1.5, fx - bx, 3, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
      for (let i = 0; i < n; i++) {
        const cx = fx + dx - (R.first ?? 3) - rd / 2 - i * pitch, r = rd / 2 + .5, L = Math.min(lens[i % lens.length], rodC - floor - 1.5);
        g.path(`M${+(cx - r).toFixed(2)} ${+g.Y(rodC - L).toFixed(2)}V${+g.Y(rodC).toFixed(2)}A${r} ${r} 0 0 1 ${+(cx + r).toFixed(2)} ${+g.Y(rodC).toFixed(2)}V${+g.Y(rodC - L + 3).toFixed(2)}`, {fill:'none', stroke:'#a9bfb0', 'stroke-width':1, 'stroke-linecap':'round'});
        g.out.push(`<circle cx="${+cx.toFixed(2)}" cy="${+g.Y(rodC).toFixed(2)}" r="${rd / 2}" fill="${R.color || '#3a3d3b'}"/>`);
      }
      const gv = b.groove ?? 0;
      g.rect(fx + dx, y0 + .2, 1.8, b.h - .4 - gv, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + dx + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
      if (open) hdim(g, D, D + dx, y0 - 5.6, `${T('滿拉')} ≈ ${fmt(dx)}`);
    } else if (b.kind === 'toprack') {
      // Top-mounted side-pull trouser rack in section: fixed runner under the board (b.rail.fixed = [x0, x1]), moving profile
      // (b.rail.from, len) with hooks pointing at the viewer (pitch along the depth) and garments folded over each hook.
      const R = b.rail || {}, top = y0 + b.h, dx = open ? (view.drawerExtension ?? ext - 5) : 0, rh = R.h ?? 13;
      const [f0, f1] = R.fixed || [2, 54], x0 = (R.from ?? 8) + dx, len = R.len ?? 46, hy = top - (R.hookAt ?? 12), floor = y0;
      const lens = b.garments?.sideLens || b.garments?.lens || [52], n = R.n ?? 9, pitch = R.pitch ?? 5;
      for (let i = 0; i < n; i++) {
        const cx = x0 + len - (R.first ?? 3) - i * pitch, r = .9, L = Math.min(lens[i % lens.length], hy - floor - 2);
        g.path(`M${+(cx - r).toFixed(2)} ${+g.Y(hy - L).toFixed(2)}V${+g.Y(hy).toFixed(2)}A${r} ${r} 0 0 1 ${+(cx + r).toFixed(2)} ${+g.Y(hy).toFixed(2)}V${+g.Y(hy - L + 3).toFixed(2)}`, {fill:'none', stroke:'#a9bfb0', 'stroke-width':1, 'stroke-linecap':'round'});
        g.out.push(`<circle cx="${+cx.toFixed(2)}" cy="${+g.Y(hy).toFixed(2)}" r=".6" fill="#5b625e"/>`);
      }
      g.rect(x0, hy + .6, len, top - 3.2 - hy - .6, {fill:'#e2e4df', stroke:'#5b625e', 'stroke-width':.3, rx:.4});
      g.rect(f0, top - 3.2, f1 - f0, 3.2, {fill:'#5b625e', stroke:'none'});
      g.rect(x0 + len - 1.2, hy - .6, 1.2, rh - 2.4, {fill:'#5b625e', stroke:'none', rx:.3});
      const lx = Math.max(D, x0 + len) + 1.6;
      g.text(lx, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
      if (open) hdim(g, D, x0 + len, y0 - 5.6, `${T('滿拉')} ≈ ${fmt(dx)}`);
    }
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
      // b.boxFrom/boxTo/boxLift/boxH: explicit drawer-box geometry (e.g. a service void behind a short box).
      // b.inset: inner drawer behind a door — front set back by inset; b.groove: top finger groove on classic fronts.
      const dx = open ? (view.drawerExtension ?? ext - 5) : 0, bx = b.boxFrom ?? back, bt = b.boxTo ?? D - 4, ins = b.inset ?? 0;
      g.rect(bx + dx, y0 + (b.boxLift ?? 2), bt - bx, b.boxH ?? b.h - 6, {fill:b.boxH ? '#f3efe6' : 'none', stroke:C.thin, 'stroke-width':.3});
      g.rect(D - ins - 1.8 + dx, y0 + .2, 1.8, b.h - .4 - (FS ? FS.groove ?? 2 : b.groove ?? 0), {fill:C.front, stroke:C.line, 'stroke-width':.35});
      if (!b.noLabel) g.text(D + dx + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    } else if (b.kind === 'cabinet') {
      // shelves containing 0 = the cabinet's own bottom panel, so the door starts at the band (no overlap below).
      // Slab front style: wall-unit doors (zone bottom ≥ lipAbove) hang `lip` below the carcass as the finger pull.
      // b.grip 'push' (TIP-ON door stacked above a flap): no lip. b.lift = {angle, label}: lift-up flap hinged at the band top.
      const lo = ((b.shelves || []).includes(0) ? 0 : 1.6) + (FS && y0 >= (FS.lipAbove ?? 140) && b.grip !== 'push' ? FS.lip ?? 2 : 0);
      for (const s of b.shelves || []) g.rect(0, y0 + s, D - 2.5, t, {fill:C.board, stroke:'none'});
      if (open && b.lift) liftSection(g, D, y0 + b.h, b.h + lo, b.lift, f);
      else if (open) g.rect(D, y0 - lo, Math.min(ext, u.w / 2), b.h + lo, {fill:'none', stroke:C.thin, 'stroke-width':.3, 'stroke-dasharray':'1.4 1'});
      else g.rect(D - 1.8, y0 - lo, 1.8, b.h + lo, {fill:C.front, stroke:C.line, 'stroke-width':.35});
      g.text(D + 1.6, y0 + b.h / 2 - f * .3, b.short || b.label, {fill:C.line, 'font-size':f * .74});
    }
  }
  if (whole) {
    g.rect(D - 1.8 + dxAll, firstY + .2, 1.8, top - firstY - .4 - (FS ? FS.groove ?? 2 : 0), {fill:C.front, stroke:C.line, 'stroke-width':.4});
    if (open) hdim(g, D, D + ext, top + 3.4, `${T('拉出')} ≈ ${fmt(ext)}`);
    else g.text(D + 1.6, firstY + (top - firstY) / 2, u.caption || '', {fill:C.line, 'font-size':f * .74});
  }
  if (!u.noBack) g.rect(0, 0, back, top, {fill:C.board, stroke:'none'});
  extras(g, view.extras, state);
  if (view.chain) chain(g, u, 0, 0, W + f * .6, false);
  hdim(g, 0, D, -f * 1.6, `${fmt(D)}（${T('櫃深')}）`, true);
  return svg([-m.l, -m.t, W + m.l + m.r, H + m.t + m.b], g.out, view.aria || elev.title);
}

// Lift-up flap in section, opened by `angle` about its top hinge (hx, hy): rotated front, dashed edge path, closed ghost.
function liftSection(g, hx, hy, L, lift, f) {
  const a = (lift.angle ?? 86) * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a), t = 1.8;
  const P = (dx, dy) => [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs];
  const pts = [P(0, 0), P(0, -L), P(-t, -L), P(-t, 0)].map(([x, y]) => `${+x.toFixed(2)} ${+g.Y(y).toFixed(2)}`);
  g.rect(hx - t, hy - L, t, L, {fill:'none', stroke:C.faint, 'stroke-width':.25, 'stroke-dasharray':'1.4 1'});
  g.path(`M${hx} ${g.Y(hy - L)}A${L} ${L} 0 0 0 ${+(hx + L * sn).toFixed(2)} ${+g.Y(hy - L * cs).toFixed(2)}`, {fill:'none', stroke:C.dim, 'stroke-width':.22, 'stroke-dasharray':'1 .8'});
  g.path(`M${pts.join('L')}Z`, {fill:C.front, stroke:C.line, 'stroke-width':.35});
  if (lift.label) g.text(hx + L * sn + 1.2, hy - L * cs + f * .9, lift.label, {fill:C.dim, 'font-size':f * .62});
}

function svg(vb, out, label) {
  return `<svg class="elev-svg" viewBox="${vb.map(v => +v.toFixed(2)).join(' ')}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" font-family="var(--sans), sans-serif">${defs()}${out.join('')}</svg>`;
}

function render(elev, viewId, state, translate) {
  T = typeof translate === 'function' ? translate : (s => s);
  ST = state;
  // frontStyle: 'slab' (preset) or {style:'slab', gap, lip, groove, lipAbove} overrides; set on the including elevation.
  const fsIn = elev.frontStyle;
  FS = fsIn ? {...FRONT_STYLES.slab, ...(typeof fsIn === 'string' ? FRONT_STYLES[fsIn] : fsIn)} : null;
  const view = elev.views.find(v => v.id === viewId) || elev.views[0];
  return view.kind === 'section' ? renderSection(elev, view, state) : renderFront(elev, view, state);
}

window.SKGElevation = {render, bands, checkUnit};
})();
