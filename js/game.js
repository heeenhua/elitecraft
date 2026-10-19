'use strict';
// ============================================================
//  ELITECRAFT — engine: map, pathing, entities, combat, render
// ============================================================
const MW = 96, MH = 96, WW = MW * TILE, WH = MH * TILE;
const PANEL_H = 196, TOP_H = 36, MMS = 184;
const $ = id => document.getElementById(id);
const cv = $('game'), cx = cv.getContext('2d');
const mmc = $('minimap'), mx = mmc.getContext('2d');
let VW = 0, VH = 0;
let G = null;
const MOUSE = { x: 0, y: 0, in: false, down: -1, sx: 0, sy: 0, drag: false, lastClick: 0, lastClickId: 0 };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pick = a => a[(Math.random() * a.length) | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmtT = s => { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

// ============================================================
//  AUDIO (tiny synth)
// ============================================================
const AU = { ctx: null, on: true, last: {} };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.22; AU.master.connect(AU.ctx.destination);
    const len = AU.ctx.sampleRate * 1; AU.noise = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AU.ctx = null; }
}
function tone(f, dur, type, vol, f2, delay) {
  const a = AU.ctx, t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, delay) {
  const a = AU.ctx, t = a.currentTime + (delay || 0);
  const s = a.createBufferSource(); s.buffer = AU.noise;
  const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = freq || 1000;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(AU.master); s.start(t); s.stop(t + dur + 0.02);
}
function sfx(name, x, y) {
  if (!AU.on || !AU.ctx || !G) return;
  if (x != null && !onScreen(x, y, 120)) return;
  const now = AU.ctx.currentTime;
  if ((AU.last[name] || 0) > now - 0.07) return; AU.last[name] = now;
  switch (name) {
    case 'bell': tone(1320, 0.7, 'sine', 0.25); tone(1980, 0.45, 'sine', 0.1); tone(2640, 0.25, 'sine', 0.05); break;
    case 'fire': noise(0.25, 0.2, 900); break;
    case 'punch': tone(130, 0.12, 'square', 0.25, 50); noise(0.08, 0.2, 2200); break;
    case 'slash': noise(0.1, 0.18, 5000); tone(900, 0.06, 'triangle', 0.08, 300); break;
    case 'broom': noise(0.12, 0.15, 3000); break;
    case 'gun': noise(0.07, 0.3, 3500); tone(220, 0.05, 'square', 0.15, 80); break;
    case 'pop': tone(500, 0.08, 'triangle', 0.25, 1400); noise(0.12, 0.12, 6000); break;
    case 'ghost': tone(520, 0.5, 'sine', 0.15, 220); tone(530, 0.5, 'sine', 0.1, 230); break;
    case 'boom': noise(0.6, 0.45, 450); tone(70, 0.5, 'sine', 0.3, 30); break;
    case 'roar': tone(95, 0.8, 'sawtooth', 0.22, 55); noise(0.7, 0.25, 700); break;
    case 'magic': tone(660, 0.35, 'sine', 0.18, 1320); tone(990, 0.35, 'sine', 0.1, 1980, 0.05); break;
    case 'qi': tone(420, 0.2, 'triangle', 0.15, 900); break;
    case 'build': tone(260, 0.04, 'square', 0.08); break;
    case 'done': tone(660, 0.15, 'sine', 0.2); tone(990, 0.25, 'sine', 0.18, null, 0.12); break;
    case 'error': tone(170, 0.15, 'square', 0.15); break;
    case 'cash': tone(1600, 0.05, 'square', 0.1); tone(2100, 0.12, 'square', 0.08, null, 0.06); break;
    case 'firework': noise(0.35, 0.3, 1800); tone(1200, 0.2, 'sine', 0.06, 300); break;
    case 'click': tone(800, 0.03, 'square', 0.06); break;
    case 'alert': tone(440, 0.18, 'square', 0.12); tone(330, 0.25, 'square', 0.12, null, 0.2); break;
    case 'death': noise(0.15, 0.12, 1200); break;
    case 'prayer': tone(523, 1.2, 'sine', 0.15); tone(659, 1.2, 'sine', 0.12, null, 0.15); tone(784, 1.4, 'sine', 0.12, null, 0.3); break;
    case 'stun': tone(300, 0.4, 'sawtooth', 0.1, 120); break;
    case 'slam': noise(0.4, 0.4, 300); tone(60, 0.4, 'sine', 0.35, 30); break;
  }
}

// ============================================================
//  MAP
// ============================================================
const HQ_POS = [{ x: 7, y: 7 }, { x: MW - 11, y: MH - 11 }];
const EXPANSIONS = [{ x: 26, y: 10 }, { x: 10, y: 26 }, { x: 36, y: 38 }];
const START_PADDIES = [{ x: 14, y: 6 }, { x: 6, y: 14 }, { x: 13, y: 13 }];
const mirrorFP = (p, w, h) => ({ x: MW - p.x - w, y: MH - p.y - h });
function allExpansions() { return [...EXPANSIONS, ...EXPANSIONS.map(p => mirrorFP(p, 3, 2))]; }

function genMap(seed) {
  for (let k = 0; k < 15; k++) { const m = tryGenMap(seed + k * 7919, k === 14); if (m) return m; }
}
function tryGenMap(seed, force) {
  const R = mulberry32(seed), N = MW * MH;
  const blk = new Uint8Array(N), water = new Uint8Array(N), bridge = new Uint8Array(N), riverD = new Float32Array(N), tree = new Uint8Array(N);
  const bridges = [0, 42, -42];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, al = x - y;
    const d = (x + y - (MW - 1)) / Math.SQRT2;
    const wig = Math.sin(al * 0.11) * 1.8 + Math.sin(al * 0.043 + 1.3) * 1.4;
    riverD[i] = Math.abs(d - wig);
    if (riverD[i] < 2.4) {
      if (bridges.some(b => Math.abs(al - b) < 3.2)) bridge[i] = 1;
      else { water[i] = 1; blk[i] = 2; }
    }
  }
  const bridgeC = bridges.map(b => ({ x: (MW - 1 + b) / 2, y: (MH - 1 - b) / 2 }));
  const clearPts = [];
  HQ_POS.forEach(p => clearPts.push({ x: p.x + 2, y: p.y + 2, r: 14 }));
  allExpansions().forEach(p => clearPts.push({ x: p.x + 1.5, y: p.y + 1, r: 6 }));
  bridgeC.forEach(p => clearPts.push({ x: p.x, y: p.y, r: 8 }));
  const okTree = (x, y) => {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
    const i = y * MW + x;
    if (water[i] || bridge[i] || riverD[i] < 4) return false;
    for (const p of clearPts) if (Math.hypot(x - p.x, y - p.y) < p.r) return false;
    return true;
  };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const e = Math.min(x, y, MW - 1 - x, MH - 1 - y);
    if (e < 2 || (e < 3 && R() < 0.5)) { const i = y * MW + x; if (!water[i]) { tree[i] = 1; blk[i] = 1; } }
  }
  for (let k = 0; k < 52; k++) {
    let bx = R() * MW, by = R() * MH;
    if (k % 2) { bx = MW - bx; by = MH - by; } // rough symmetry
    const br = 1.5 + R() * 3.2;
    for (let y = Math.floor(by - br - 1); y <= by + br + 1; y++) for (let x = Math.floor(bx - br - 1); x <= bx + br + 1; x++) {
      if (Math.hypot(x - bx, y - by) < br * (0.7 + R() * 0.45) && okTree(x, y)) { tree[y * MW + x] = 1; blk[y * MW + x] = 1; }
    }
  }
  for (let k = 0; k < 120; k++) { const x = (R() * MW) | 0, y = (R() * MH) | 0; if (okTree(x, y)) { tree[y * MW + x] = 1; blk[y * MW + x] = 1; } }
  // connectivity: BFS from start 0 must reach start 1 and all expansions
  const seen = new Uint8Array(N), q = [ (HQ_POS[0].y + 5) * MW + HQ_POS[0].x + 5 ];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const ni = ny * MW + nx; if (!seen[ni] && !blk[ni]) { seen[ni] = 1; q.push(ni); }
    }
  }
  const reach = (x, y) => seen[Math.floor(y) * MW + Math.floor(x)];
  const targets = [{ x: HQ_POS[1].x - 1, y: HQ_POS[1].y - 1 }, ...allExpansions().map(p => ({ x: p.x - 1, y: p.y + 1 }))];
  if (!force && !targets.every(t => reach(t.x, t.y))) return null;
  return { blk, water, bridge, tree, riverD, seed };
}

function renderTerrain(m) {
  const c0 = document.createElement('canvas'); c0.width = WW; c0.height = WH;
  const c = c0.getContext('2d');
  const R = mulberry32(m.seed + 99);
  // grass
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const n = Math.sin(x * 0.21 + y * 0.13) + Math.sin(x * 0.07 - y * 0.19) * 1.3 + R() * 0.6;
    c.fillStyle = `hsl(${98 + n * 5},${42 + n * 3}%,${33 + n * 2.2}%)`;
    c.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  // soft blotches
  for (let k = 0; k < 260; k++) {
    const x = R() * WW, y = R() * WH, r = 30 + R() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const col = R() < 0.5 ? '60,110,40' : '140,170,70';
    g.addColorStop(0, `rgba(${col},0.18)`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // dirt plazas at bases
  for (const p of HQ_POS) {
    const x = (p.x + 2) * TILE, y = (p.y + 2) * TILE, r = 9 * TILE;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,120,80,0.55)'); g.addColorStop(0.7, 'rgba(150,120,80,0.25)'); g.addColorStop(1, 'rgba(150,120,80,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // grass blades & flowers
  for (let k = 0; k < 26000; k++) {
    const x = R() * WW, y = R() * WH;
    c.fillStyle = R() < 0.5 ? 'rgba(30,70,20,0.35)' : 'rgba(170,210,110,0.3)';
    c.fillRect(x, y, 1.5, 3);
  }
  for (let k = 0; k < 900; k++) {
    const x = R() * WW, y = R() * WH;
    c.fillStyle = pick(['#ffe680', '#ffffff', '#ff9ccf', '#c9a0ff']);
    c.fillRect(x, y, 2, 2);
  }
  // shores & water
  const T = TILE;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if (m.water[i] || m.bridge[i]) cir(c, x * T + T / 2, y * T + T / 2, 27, '#c9b27a');
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if (m.water[i] || m.bridge[i]) cir(c, x * T + T / 2, y * T + T / 2, 21, '#2f7fae');
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if ((m.water[i] || m.bridge[i]) && m.riverD[i] < 1.4) cir(c, x * T + T / 2, y * T + T / 2, 18, '#2a6f9c');
  }
  for (let k = 0; k < 1400; k++) {
    const x = (R() * MW) | 0, y = (R() * MH) | 0;
    if (m.water[y * MW + x]) { c.strokeStyle = 'rgba(200,235,255,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(x * T + R() * T, y * T + R() * T, 3 + R() * 4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  }
  // bridges (planks)
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    if (m.bridge[i] && m.riverD[i] < 3.4) {
      c.save(); c.translate(x * T + T / 2, y * T + T / 2); c.rotate(-Math.PI / 4);
      for (let p = -2; p <= 2; p++) { c.fillStyle = p % 2 ? '#8a6238' : '#9c7244'; c.fillRect(-24, p * 7 - 3, 48, 6.4); }
      c.restore();
    }
  }
  // trees, sorted by y
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!m.tree[y * MW + x]) continue;
    const px = x * T + T / 2 + (R() - 0.5) * 8, py = y * T + T / 2 + (R() - 0.5) * 8;
    if (R() < 0.28) drawPalm(c, px, py, R); else drawRainTree(c, px, py, R);
  }
  return c0;
}
function drawRainTree(c, x, y, R) {
  ell(c, x + 6, y + 10, 18, 8, 'rgba(0,0,0,0.25)');
  box(c, x - 2.5, y - 4, 5, 14, '#5a3a1e');
  const base = 26 + R() * 14;
  for (let i = 0; i < 6; i++) {
    const a = R() * TAU, r = R() * 9;
    cir(c, x + Math.cos(a) * r, y - 12 + Math.sin(a) * r * 0.6, 11 + R() * 6, `hsl(${110 + R() * 25},45%,${base - 8}%)`);
  }
  for (let i = 0; i < 4; i++) {
    const a = R() * TAU, r = R() * 7;
    cir(c, x + Math.cos(a) * r - 3, y - 16 + Math.sin(a) * r * 0.6, 7 + R() * 4, `hsl(${105 + R() * 25},50%,${base}%)`);
  }
}
function drawPalm(c, x, y, R) {
  ell(c, x + 8, y + 8, 14, 5, 'rgba(0,0,0,0.22)');
  const lean = (R() - 0.5) * 10;
  c.strokeStyle = '#8b6a3e'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 8); c.quadraticCurveTo(x + lean, y - 8, x + lean * 1.2, y - 24); c.stroke();
  const tx = x + lean * 1.2, ty = y - 24;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + R() * 0.3;
    c.strokeStyle = `hsl(${100 + R() * 20},55%,${28 + R() * 10}%)`; c.lineWidth = 4;
    c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * 12, ty + Math.sin(a) * 6 - 6, tx + Math.cos(a) * 20, ty + Math.sin(a) * 9 + 4); c.stroke();
  }
  cir(c, tx, ty, 3, '#6b4a22');
}

// ============================================================
//  PATHFINDING (A* on tiles + LOS smoothing)
// ============================================================
const PF = { g: new Float32Array(MW * MH), par: new Int32Array(MW * MH), stamp: new Uint32Array(MW * MH), closed: new Uint32Array(MW * MH), cur: 0 };
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
function walkT(tx, ty) { return tx >= 0 && ty >= 0 && tx < MW && ty < MH && G.blk[ty * MW + tx] === 0; }
function walkPx(x, y) { return walkT(Math.floor(x / TILE), Math.floor(y / TILE)); }
function los(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const n = Math.ceil(d / 10), px = -dy / d * 7, py = dx / d * 7;
  for (let k = 1; k <= n; k++) {
    const x = x0 + dx * k / n, y = y0 + dy * k / n;
    if (!walkPx(x, y) || !walkPx(x + px, y + py) || !walkPx(x - px, y - py)) return false;
  }
  return true;
}
function nearestFreeTile(gx, gy, sx, sy) {
  if (walkT(gx, gy)) return [gx, gy];
  for (let r = 1; r < 12; r++) {
    let best = null, bd = 1e9;
    for (let y = gy - r; y <= gy + r; y++) for (let x = gx - r; x <= gx + r; x++) {
      if (Math.max(Math.abs(x - gx), Math.abs(y - gy)) !== r || !walkT(x, y)) continue;
      const d = Math.hypot(x - sx, y - sy) + Math.hypot(x - gx, y - gy) * 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (best) return best;
  }
  return [gx, gy];
}
function astar(sx, sy, gx, gy) {
  const blk = G.blk, cur = ++PF.cur, g = PF.g, par = PF.par, stamp = PF.stamp, closed = PF.closed;
  const start = sy * MW + sx, goal = gy * MW + gx;
  const hI = [], hF = [];
  const push = (i, f) => { let k = hI.length; hI.push(i); hF.push(f); while (k > 0) { const p = (k - 1) >> 1; if (hF[p] <= hF[k]) break; [hI[p], hI[k]] = [hI[k], hI[p]]; [hF[p], hF[k]] = [hF[k], hF[p]]; k = p; } };
  const pop = () => {
    const top = hI[0], li = hI.pop(), lf = hF.pop();
    if (hI.length) { hI[0] = li; hF[0] = lf; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < hI.length && hF[l] < hF[m]) m = l; if (r < hI.length && hF[r] < hF[m]) m = r; if (m === k) break; [hI[m], hI[k]] = [hI[k], hI[m]]; [hF[m], hF[k]] = [hF[k], hF[m]]; k = m; } }
    return top;
  };
  const H = i => { const x = i % MW, y = (i / MW) | 0, dx = Math.abs(x - gx), dy = Math.abs(y - gy); return dx + dy - 0.5858 * Math.min(dx, dy); };
  stamp[start] = cur; g[start] = 0; par[start] = -1; push(start, H(start));
  let best = start, bestH = H(start), it = 0;
  while (hI.length && it++ < 9000) {
    const c = pop();
    if (closed[c] === cur) continue; closed[c] = cur;
    if (c === goal) { best = c; break; }
    const h = H(c); if (h < bestH) { bestH = h; best = c; }
    const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const ni = ny * MW + nx;
      if (blk[ni] || closed[ni] === cur) continue;
      if (dx && dy && (blk[y * MW + nx] || blk[ny * MW + x])) continue;
      const ng = g[c] + cost;
      if (stamp[ni] !== cur || ng < g[ni]) { stamp[ni] = cur; g[ni] = ng; par[ni] = c; push(ni, ng + H(ni)); }
    }
  }
  const out = []; let n = best, guard = 0;
  while (n !== start && n >= 0 && guard++ < 5000) { out.push(n); n = par[n]; }
  out.reverse();
  return out;
}
function computePath(u, x, y) {
  const sx = Math.floor(u.x / TILE), sy = Math.floor(u.y / TILE);
  let gx = clamp(Math.floor(x / TILE), 0, MW - 1), gy = clamp(Math.floor(y / TILE), 0, MH - 1);
  let finalPt = { x, y };
  if (!walkT(gx, gy)) { [gx, gy] = nearestFreeTile(gx, gy, sx, sy); finalPt = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 }; }
  const tiles = astar(clamp(sx, 0, MW - 1), clamp(sy, 0, MH - 1), gx, gy);
  const pts = tiles.map(i => ({ x: (i % MW) * TILE + TILE / 2, y: ((i / MW) | 0) * TILE + TILE / 2 }));
  if (pts.length) {
    const last = tiles[tiles.length - 1];
    if (last === gy * MW + gx) pts[pts.length - 1] = finalPt;
  } else pts.push(finalPt);
  const out = []; let fx = u.x, fy = u.y, i = 0;
  while (i < pts.length) {
    let j = Math.min(pts.length - 1, i + 14);
    while (j > i && !los(fx, fy, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); fx = pts[j].x; fy = pts[j].y; i = j + 1;
  }
  return out;
}

// ============================================================
//  ENTITIES
// ============================================================
let NEXT_ID = 1;
function mkUnit(type, owner, x, y) {
  const d = UNITS[type], P = G.players[owner];
  const u = {
    id: NEXT_ID++, kind: 'u', type, d, owner, x, y, r: d.r, hp: d.hp, maxhp: d.hp,
    energy: d.energy ? (d.startEnergy || 50) : 0, order: null, path: null, pi: 0, goal: null,
    cd: 0, atkT: 0, face: owner === 0 ? 1 : -1, t: Math.random() * 10, scanT: Math.random() * 0.3, buffs: {},
    carry: 0, still: 0, harvest: false, shield: 0, shieldUntil: 0, stunUntil: 0, abCd: {}, healT: 1, castT: 0,
    stuckT: 0, lastX: x, lastY: y, born: G.t,
  };
  if (d.life) u.life = d.life;
  if (type === 'rugger' && P.up.proteinshakes) { u.maxhp += 50; u.hp += 50; }
  if (type === 'polorider' && P.up.thoroughbreds) { u.maxhp += 40; u.hp += 40; }
  G.ents.push(u); G.byId.set(u.id, u);
  if (!d.summoned) P.stats.made++;
  return u;
}
function mkBuilding(type, owner, tx, ty, done) {
  const d = BUILDINGS[type];
  const b = {
    id: NEXT_ID++, kind: 'b', type, d, owner, tx, ty, x: (tx + d.w / 2) * TILE, y: (ty + d.h / 2) * TILE,
    r: Math.max(d.w, d.h) * TILE / 2, hp: done ? d.hp : d.hp * 0.1, maxhp: d.hp, constructing: !done, progress: done ? 1 : 0,
    queue: [], rally: null, t: Math.random() * 10, cd: 0, scanT: 0, nb: 0, atkT: 0, buffs: {}, seen: owner === 0,
  };
  if (d.resource) { b.amount = d.resource; b.maxAmount = d.resource; }
  setBlock(b, 9);
  G.ents.push(b); G.byId.set(b.id, b);
  return b;
}
function setBlock(b, v) {
  for (let y = b.ty; y < b.ty + b.d.h; y++) for (let x = b.tx; x < b.tx + b.d.w; x++) G.blk[y * MW + x] = v;
}
function bRect(b) { return { x0: b.tx * TILE, y0: b.ty * TILE, x1: (b.tx + b.d.w) * TILE, y1: (b.ty + b.d.h) * TILE }; }
function edgeDist(a, b) { // a: unit or building, b: unit or building
  if (b.kind === 'b') {
    const r = bRect(b);
    if (a.kind === 'b') { const ra = bRect(a); const dx = Math.max(0, ra.x0 - r.x1, r.x0 - ra.x1), dy = Math.max(0, ra.y0 - r.y1, r.y0 - ra.y1); return Math.hypot(dx, dy); }
    const px = clamp(a.x, r.x0, r.x1), py = clamp(a.y, r.y0, r.y1);
    return Math.hypot(a.x - px, a.y - py) - a.r;
  }
  if (a.kind === 'b') { const r = bRect(a); const px = clamp(b.x, r.x0, r.x1), py = clamp(b.y, r.y0, r.y1); return Math.hypot(b.x - px, b.y - py) - b.r; }
  return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
}
function approachPt(u, t, range) {
  if (t.kind === 'b') {
    const r = bRect(t);
    let px = clamp(u.x, r.x0, r.x1), py = clamp(u.y, r.y0, r.y1);
    let dx = u.x - px, dy = u.y - py, d = Math.hypot(dx, dy);
    if (d < 0.5) { dx = 0; dy = 1; d = 1; py = r.y1; }
    const off = Math.min(u.r + 3 + Math.max(0, range - 8), u.r + 3 + range * 0.8);
    const p = { x: px + dx / d * off, y: py + dy / d * off };
    if (range > 40 || canStand(p.x, p.y, u)) return p;
    // blocked: pick the closest walkable tile hugging the footprint
    let best = null, bd = 1e9;
    for (let y = t.ty - 1; y <= t.ty + t.d.h; y++) for (let x = t.tx - 1; x <= t.tx + t.d.w; x++) {
      if (x >= t.tx && x < t.tx + t.d.w && y >= t.ty && y < t.ty + t.d.h) continue;
      if (!walkT(x, y)) continue;
      const cx_ = x * TILE + TILE / 2, cy_ = y * TILE + TILE / 2, dd = Math.hypot(cx_ - u.x, cy_ - u.y);
      if (dd < bd) { bd = dd; best = { x: cx_, y: cy_ }; }
    }
    return best || p;
  }
  return { x: t.x, y: t.y };
}
function isEnemy(a, b) { return a.owner >= 0 && b.owner >= 0 && a.owner !== b.owner; }
function canFight(u) { return u.kind === 'u' && ((u.d.attack && !u.d.worker) || (u.type === 'maid' && u.combat)); }
function atkOf(e) {
  let base = e.d.attack;
  if (e.type === 'maid') base = e.combat ? e.d.combat : null;
  if (!base) return null;
  const P = G.players[e.owner];
  let dmg = base.dmg, range = base.range;
  if (e.type === 'rugger' && P.up.proteinshakes) dmg += 3;
  if (e.type === 'hwachie' && P.up.eternalflame) { dmg += 4; range += 15; }
  if (e.type === 'mgsgirl' && P.up.handbellchoir) range += 30;
  return { dmg, range, cd: base.cd, proj: base.proj, splash: base.splash, bonus: base.bonus, cone: base.cone };
}
function armorOf(e) {
  let a = e.d.armor || 0;
  if (e.horde) a += 1;
  if (e.type === 'maid' && e.combat) a += 1;
  return a;
}
function hordeBonus(P) { return P.up.tenthousand ? 0.35 : 0.25; }
function dmgMult(e) {
  if (e.kind !== 'u') return 1;
  let m = 1;
  if (e.buffs.prayer > G.t) m += 0.5;
  if (e.horde) m += hordeBonus(G.players[e.owner]);
  if (e.tkk) m += 0.15;
  return m;
}
function bonusVs(A, t) {
  if (!A.bonus || t.kind !== 'u') return 1;
  let m = 1;
  for (const k in A.bonus) if (t.d.tags && t.d.tags.includes(k)) m *= A.bonus[k];
  return m;
}
function speedOf(u) { let s = u.d.speed; if (u.horde) s *= 1.1; if (u.type === 'polorider' && G.players[u.owner].up.thoroughbreds) s += 20; return s; }

function hurt(t, raw, src) {
  if (!t || t.dead || t.d.invuln) return;
  if (t.owner < 0) return;
  let dmg = Math.max(1, raw - armorOf(t));
  if (t.shield > 0 && t.shieldUntil > G.t) { const a = Math.min(t.shield, dmg); t.shield -= a; dmg -= a; }
  t.hp -= dmg; t.hitT = G.t;
  const P = G.players[t.owner];
  if (src && src.owner >= 0 && src.owner !== t.owner) {
    t.lastAttacker = src.id;
    P.underAttack = { x: t.x, y: t.y, t: G.t };
    if (P.idx === 0 && G.t - P.lastAlert > 12) {
      P.lastAlert = G.t;
      msg(t.kind === 'b' ? 'Your base is under attack!' : 'Your forces are under attack!', '#ff6b6b');
      sfx('alert'); G.pings.push({ x: t.x, y: t.y, t: G.t });
    }
  }
  if (t.hp <= 0) kill(t, src);
}
function areaHurt(x, y, r, dmg, owner, src, A) {
  for (const e of G.ents) {
    if (e.dead || e.owner < 0 || e.owner === owner) continue;
    const d = e.kind === 'b' ? edgeDist({ x, y, r: 0, kind: 'u' }, e) : Math.hypot(e.x - x, e.y - y) - e.r;
    if (d <= r) hurt(e, dmg * (A ? bonusVs(A, e) : 1), src);
  }
}
function kill(e, src, silent) {
  if (e.dead) return;
  e.dead = true; e.hp = 0;
  const P = G.players[e.owner];
  if (e.kind === 'b') {
    setBlock(e, 0);
    if (!silent) {
      for (let i = 0; i < 40; i++) part(e.x + (Math.random() - 0.5) * e.d.w * TILE, e.y + (Math.random() - 0.5) * e.d.h * TILE, (Math.random() - 0.5) * 120, -Math.random() * 160, 0.8 + Math.random() * 0.8, pick(['#ff7a00', '#ffb21e', '#555', '#888', '#ffe14a']), 3 + Math.random() * 4, 200);
      fxRing(e.x, e.y, 10, e.r * 1.6, 0.6, '#ffb21e', 4);
      sfx('boom', e.x, e.y);
    }
    if (P && src && src.owner >= 0 && src.owner !== e.owner) G.players[src.owner].stats.razed++;
  } else {
    if (!silent) {
      for (let i = 0; i < 12; i++) part(e.x, e.y - 10, (Math.random() - 0.5) * 80, -Math.random() * 80, 0.6, pick(['#ddd', '#bbb', '#999']), 3, 120);
      sfx(e.d.vehicle || e.type === 'chimera' ? 'boom' : 'death', e.x, e.y);
      if (e.d.vehicle || e.type === 'chimera') for (let i = 0; i < 24; i++) part(e.x, e.y - 12, (Math.random() - 0.5) * 140, -Math.random() * 140, 0.8, pick(['#ff7a00', '#ffb21e', '#444']), 4, 200);
    }
    if (P && !e.d.summoned && !silent) P.stats.lost++;
    if (src && src.owner >= 0 && src.owner !== e.owner) {
      const S = G.players[src.owner];
      S.stats.killed++;
      if (e.d.bounty) {
        S.res += e.d.bounty; S.stats.gathered += e.d.bounty;
        floatText(e.x, e.y - 30, '+' + e.d.bounty + ' Daddy\'s allowance!', '#ffe14a');
        if (S.idx === 0) sfx('cash');
        if (P.idx === 0) msg('An ACS Boy was killed — the enemy took his allowance!', '#ffb0b0');
      }
    }
  }
  if (G.selSet.has(e.id)) { G.selSet.delete(e.id); G.sel = G.sel.filter(s => s !== e); G.cardMenu = null; }
}

// ============================================================
//  PLAYERS
// ============================================================
function mkPlayer(idx, fac, ai, diff) {
  return {
    idx, fac, F: FACTIONS[fac], ai, diff, res: FACTIONS[fac].start.res, up: {}, prayerUntil: 0, cdUntil: {},
    bc: {}, bcAll: {}, uc: {}, sup: 0, supMax: 0, incMult: 1, lastAlert: -99, underAttack: null,
    stats: { made: 0, lost: 0, killed: 0, razed: 0, gathered: 0 }, income: 0, defeated: false,
  };
}
function tallies() {
  for (const P of G.players) { P.bc = {}; P.bcAll = {}; P.uc = {}; P.sup = 0; P.supMax = 0; P.researching = {}; }
  for (const e of G.ents) {
    if (e.dead || e.owner < 0) continue;
    const P = G.players[e.owner];
    if (e.kind === 'b') {
      P.bcAll[e.type] = (P.bcAll[e.type] || 0) + 1;
      if (!e.constructing) { P.bc[e.type] = (P.bc[e.type] || 0) + 1; P.supMax += e.d.supply || 0; }
      for (const q of e.queue) {
        if (q.unit) { P.uc[q.unit] = (P.uc[q.unit] || 0) + 1; P.sup += UNITS[q.unit].supply; }
        if (q.research) P.researching[q.research] = true;
      }
    } else { P.uc[e.type] = (P.uc[e.type] || 0) + 1; P.sup += e.d.supply; }
  }
  for (const P of G.players) P.supMax = Math.min(200, P.supMax);
}
function reqMet(P, d) { return !d.req || d.req.every(r => P.bc[r] > 0); }
function reqText(d) { return d.req ? d.req.map(r => BUILDINGS[r].name).join(', ') : ''; }

// ============================================================
//  EFFECTS
// ============================================================
function part(x, y, vx, vy, life, col, size, grav, shape) {
  if (G.parts.length > 1800) return;
  G.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, shape });
}
function fxRing(x, y, r0, r1, life, col, w) { G.fx.push({ k: 'ring', x, y, r0, r1, life, max: life, col, w: w || 2 }); }
function fxBeam(x1, y1, x2, y2, life, col, w) { G.fx.push({ k: 'beam', x1, y1, x2, y2, life, max: life, col, w: w || 2 }); }
function fxSlash(x, y, face, col) { G.fx.push({ k: 'slash', x, y, face, life: 0.18, max: 0.18, col: col || '#fff' }); }
function floatText(x, y, text, col, size) { G.floats.push({ x, y, text, col, life: 1.6, max: 1.6, size: size || 12 }); }
function say(u, list, force) {
  if (!list || !list.length) return;
  if (!force && u.say && u.say.until > G.t) return;
  u.say = { text: pick(list), until: G.t + 2.2 };
}
function msg(text, col) {
  const box = $('msgs');
  const el = document.createElement('div'); el.className = 'msg'; el.textContent = text; if (col) el.style.color = col;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 3200);
}

// ============================================================
//  PROJECTILES & ATTACKS
// ============================================================
function fire(u, t, A) {
  const dil = u.buffs && u.buffs.diligence > G.t ? 1.5 : 1;
  u.cd = A.cd / dil; u.atkT = 0.3;
  if (u.kind === 'u') u.face = t.x >= u.x ? 1 : -1;
  const dmg = A.dmg * dmgMult(u);
  const mx_ = u.x + (u.kind === 'u' ? u.face * 8 : 0), my_ = u.y - (u.kind === 'u' ? (u.d.artH || 30) * 0.55 : 40);
  const tx = t.x, ty = t.y - (t.kind === 'u' ? Math.min(14, (t.d.artH || 30) * 0.4) : 10);
  switch (A.proj) {
    case 'mallet': {
      areaHurt(t.x, t.y, A.splash || 30, dmg, u.owner, u, A);
      fxSlash(u.x + u.face * (u.r + 10), u.y - 18, u.face, '#f3f0e6');
      fxRing(t.x, t.y, 4, A.splash || 30, 0.25, 'rgba(255,255,255,0.6)', 2);
      sfx('punch', u.x, u.y);
      if (Math.random() < 0.15) floatText(tx, ty - 12, pick(['THWACK!', 'Tally-ho!', 'FORE— wrong sport']), '#ffffff', 12);
      break;
    }
    case 'melee': case 'broom': case 'slash': case 'punch': {
      hurt(t, dmg * bonusVs(A, t), u);
      fxSlash(u.x + u.face * (u.r + 4), u.y - 12, u.face, A.proj === 'slash' ? '#e6eaf0' : '#fff');
      if (A.proj === 'punch') {
        sfx('punch', u.x, u.y);
        if (t.d.tags && t.d.tags.includes('mech') && Math.random() < 0.4) floatText(tx, ty - 10, pick(['POW!', 'WHAM!', 'CRUNCH!']), '#ffe14a', 13);
      } else sfx(A.proj === 'broom' ? 'broom' : 'slash', u.x, u.y);
      for (let i = 0; i < 4; i++) part(tx, ty, (Math.random() - 0.5) * 60, -Math.random() * 50, 0.3, '#fff', 2, 100);
      break;
    }
    case 'bell': {
      hurt(t, dmg, u);
      fxRing(mx_, my_, 3, 18, 0.35, '#ffe68a', 2);
      fxRing(tx, ty, 4, 22, 0.4, '#ffd34a', 2.5); fxRing(tx, ty, 2, 14, 0.3, '#fff3b8', 1.5);
      sfx('bell', u.x, u.y); break;
    }
    case 'flame': {
      for (let i = 0; i < 9; i++) {
        const k = Math.random();
        const vx = (tx - mx_) * (1.6 + Math.random()) + (Math.random() - 0.5) * 30, vy = (ty - my_) * (1.6 + Math.random()) + (Math.random() - 0.5) * 30;
        part(mx_, my_, vx, vy, 0.35 + k * 0.15, pick(['#ff6a00', '#ffb21e', '#ffe14a', '#ff3b00']), 4 + Math.random() * 3, -30, 'flame');
      }
      areaHurt(t.x, t.y, A.splash || 20, dmg * bonusVs(A, t), u.owner, u, A);
      sfx('fire', u.x, u.y); break;
    }
    case 'dragonfire': {
      const ang = Math.atan2(t.y - u.y, t.x - u.x);
      const hx = u.x + u.face * 30, hy = u.y - 40;
      for (let i = 0; i < 26; i++) {
        const a = ang + (Math.random() - 0.5) * 0.9, sp = 200 + Math.random() * 220;
        part(hx, hy, Math.cos(a) * sp, Math.sin(a) * sp + 40, 0.5, pick(['#ff6a00', '#ffb21e', '#ffe14a', '#ff2b00']), 5 + Math.random() * 5, -20, 'flame');
      }
      for (const e of G.ents) {
        if (e.dead || !isEnemy(u, e)) continue;
        const d = edgeDist(u, e); if (d > A.range + 20) continue;
        let da = Math.abs(((Math.atan2(e.y - u.y, e.x - u.x) - ang + Math.PI * 3) % TAU) - Math.PI);
        if (da < 0.55 || e === t) hurt(e, dmg * bonusVs(A, e), u);
      }
      if (Math.random() < 0.5) sfx('roar', u.x, u.y); else sfx('fire', u.x, u.y);
      break;
    }
    default: {
      const sp = { confetti: 300, ghost: 230, bullet: 750, firework: 340, qibolt: 420, qiblast: 360 }[A.proj] || 400;
      const d = Math.hypot(tx - mx_, ty - my_);
      G.projs.push({ x: mx_, y: my_, sx: mx_, sy: my_, tx, ty, tid: t.id, sp, dmg, owner: u.owner, src: u.id, kind: A.proj, splash: A.splash, A, dur: Math.max(0.08, d / sp), age: 0, arc: (A.proj === 'confetti' || A.proj === 'firework') ? Math.min(80, d * 0.35) : 0 });
      sfx({ confetti: 'pop', ghost: 'ghost', bullet: 'gun', firework: 'firework', qibolt: 'qi', qiblast: 'qi' }[A.proj], u.x, u.y);
    }
  }
}
function updProjs(dt) {
  for (const p of G.projs) {
    p.age += dt;
    const t = G.byId.get(p.tid);
    if (t && !t.dead) { p.tx = t.x; p.ty = t.y - (t.kind === 'u' ? Math.min(14, (t.d.artH || 30) * 0.4) : 10); }
    const k = Math.min(1, p.age / p.dur);
    p.px = p.x; p.py = p.y;
    p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
    if (p.kind === 'ghost' && Math.random() < 0.5) part(p.x, p.y, 0, -10, 0.4, 'rgba(180,255,220,0.6)', 3, 0);
    if (p.kind === 'firework') part(p.x, p.y, 0, 0, 0.3, '#ffe14a', 2, 0);
    if (k >= 1) {
      p.done = true;
      const src = G.byId.get(p.src) || { owner: p.owner, id: p.src, x: p.x, y: p.y };
      if (p.splash) areaHurt(p.tx, p.ty + 8, p.splash, p.dmg, p.owner, src, p.A);
      else if (t && !t.dead) hurt(t, p.dmg * bonusVs(p.A, t), src);
      impactFx(p);
    }
  }
  G.projs = G.projs.filter(p => !p.done);
}
function impactFx(p) {
  switch (p.kind) {
    case 'confetti':
      for (let i = 0; i < 26; i++) part(p.x, p.y, (Math.random() - 0.5) * 180, -Math.random() * 160, 1 + Math.random() * 0.6, pick(['#ff4f6e', '#4fc3ff', '#ffe14a', '#7bff6a', '#c77dff', '#fff']), 3, 220, 'conf');
      fxRing(p.x, p.y, 4, p.splash || 30, 0.3, 'rgba(255,255,255,0.7)', 2); break;
    case 'firework':
      for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; part(p.x, p.y, Math.cos(a) * 110, Math.sin(a) * 110, 0.6, pick(['#ff4f6e', '#ffe14a', '#4fc3ff']), 2.5, 60); }
      sfx('pop', p.x, p.y); break;
    case 'ghost':
      fxRing(p.x, p.y, 4, 20, 0.4, 'rgba(160,255,210,0.8)', 2); break;
    case 'qiblast':
      fxRing(p.x, p.y, 4, p.splash || 30, 0.4, '#ffe14a', 3); fxRing(p.x, p.y, 2, (p.splash || 30) * 0.7, 0.35, '#6fa0ff', 2); break;
    case 'qibolt':
      fxRing(p.x, p.y, 2, 10, 0.25, '#ffe680', 1.5); break;
    default:
      part(p.x, p.y, 0, 0, 0.15, '#ffe14a', 3, 0);
  }
}

// ============================================================
//  UNIT LOGIC
// ============================================================
function setPath(u, x, y) {
  u.goal = { x, y };
  if (los(u.x, u.y, x, y)) { u.path = [{ x, y }]; u.pi = 0; return; }
  if (G.pathBudget > 0) { G.pathBudget--; u.path = computePath(u, x, y); u.pi = 0; }
  else { u.path = null; u.pathWait = true; }
}
function moveTo(u, x, y, dt, arrive) {
  if (Math.hypot(u.x - x, u.y - y) <= arrive) { u.path = null; u.goal = null; return true; }
  if (!u.goal || Math.abs(u.goal.x - x) > 24 || Math.abs(u.goal.y - y) > 24 || !u.path) setPath(u, x, y);
  if (!u.path || !u.path.length) return false;
  let wp = u.path[u.pi];
  const sp = speedOf(u) * dt;
  let dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy);
  if (d < Math.max(5, sp * 1.5)) {
    if (u.pi < u.path.length - 1) { u.pi++; wp = u.path[u.pi]; dx = wp.x - u.x; dy = wp.y - u.y; d = Math.hypot(dx, dy); }
    else { u.path = null; u.goal = null; return true; }
  }
  if (d > 0.01) {
    step(u, dx / d * Math.min(sp, d), dy / d * Math.min(sp, d));
    if (Math.abs(dx) > 0.5) u.face = dx > 0 ? 1 : -1;
    u.moving = true;
  }
  // stuck detection
  u.stuckT += dt;
  if (u.stuckT > 0.6) {
    const moved = Math.hypot(u.x - u.lastX, u.y - u.lastY);
    u.lastX = u.x; u.lastY = u.y; u.stuckT = 0;
    if (moved < 4) {
      u.stuckN = (u.stuckN || 0) + 1;
      if (Math.hypot(u.x - x, u.y - y) < 40 + u.r * 2 || u.stuckN > 4) { u.path = null; u.goal = null; u.stuckN = 0; return true; }
      u.path = null;
    } else u.stuckN = 0;
  }
  return false;
}
function canStand(x, y, u) {
  const r = Math.min(u.r * 0.55, 10);
  return walkPx(x, y) && walkPx(x + r, y) && walkPx(x - r, y) && walkPx(x, y + r) && walkPx(x, y - r);
}
function step(u, mx_, my_) {
  if (!canStand(u.x, u.y, u)) { u.x = clamp(u.x + mx_, 4, WW - 4); u.y = clamp(u.y + my_, 4, WH - 4); return; }
  const nx = u.x + mx_, ny = u.y + my_;
  if (canStand(nx, ny, u)) { u.x = nx; u.y = ny; }
  else if (canStand(nx, u.y, u)) u.x = nx;
  else if (canStand(u.x, ny, u)) u.y = ny;
}
function sightPx(e) { return e.d.sight * TILE; }
function findTarget(u, range) {
  let best = null, bs = 1e9;
  for (const e of G.ents) {
    if (e.dead || !isEnemy(u, e) || e.d.invuln) continue;
    const d = edgeDist(u, e); if (d > range) continue;
    let s = d;
    if (e.kind === 'b') s += e.d.attack ? 60 : 260;
    else if (!e.d.attack && !e.d.combat) s += 120;
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
// returns false if target invalid
function engage(u, t, dt, A, noChase) {
  if (!t || t.dead || t.d.invuln || (t.owner < 0)) return false;
  const d = edgeDist(u, t);
  if (d <= A.range) {
    u.path = null; u.goal = null;
    u.face = t.x >= u.x ? 1 : -1;
    if (u.cd <= 0) fire(u, t, A);
    return true;
  }
  if (noChase) return false;
  const ap = approachPt(u, t, A.range);
  moveTo(u, ap.x, ap.y, dt, 2);
  return true;
}
function updUnit(u, dt) {
  u.t += dt; u.moving = false; u.building = false;
  if (u.atkT > 0) u.atkT -= dt;
  if (u.castT > 0) u.castT -= dt;
  if (u.cd > 0) u.cd -= dt;
  const P = G.players[u.owner];
  if (u.d.energy) u.energy = Math.min(u.d.energy, u.energy + dt * 0.6 * (u.type === 'nanyang' && P.up.fourvirtues ? 1.5 : 1));
  if (u.d.life) { u.life -= dt; if (u.life <= 0) { for (let i = 0; i < 16; i++) part(u.x, u.y - 15, (Math.random() - 0.5) * 60, -Math.random() * 60, 0.8, 'rgba(150,230,255,0.8)', 3, -20); floatText(u.x, u.y - 34, 'Pass expired!', '#9fe0ff'); kill(u, null, true); return; } }
  // maid combat mode
  if (u.type === 'maid') {
    const c = P.prayerUntil > G.t;
    if (c && !u.combat) { u.combat = true; if (Math.random() < 0.5) say(u, u.d.lines.attack, true); }
    else if (!c && u.combat) { u.combat = false; if (u.order && (u.order.type === 'attack' || u.order.type === 'amove')) u.order = null; }
  }
  if (u.stunUntil > G.t) { u.path = null; return; }
  // MGS auto-heal
  if (u.type === 'mgsgirl') {
    u.healT -= dt;
    if (u.healT <= 0) {
      u.healT = 1;
      let best = null, bh = 1;
      for (const e of G.ents) {
        if (e.dead || e.kind !== 'u' || e.owner !== u.owner || e.hp >= e.maxhp || e.d.invuln) continue;
        if (Math.hypot(e.x - u.x, e.y - u.y) > 150) continue;
        const f = e.hp / e.maxhp; if (f < bh) { bh = f; best = e; }
      }
      if (best) {
        best.hp = Math.min(best.maxhp, best.hp + u.d.heal);
        fxBeam(u.x, u.y - 22, best.x, best.y - 14, 0.35, 'rgba(255,230,120,0.85)', 2);
        part(best.x, best.y - 20, 0, -30, 0.7, '#7bff6a', 4, 0, 'plus');
      }
    }
  }
  const o = u.order;
  const A = atkOf(u);
  if (!o) {
    if (A && (canFight(u))) {
      u.scanT -= dt;
      if (u.scanT <= 0) {
        u.scanT = 0.3 + Math.random() * 0.15;
        const tg = findTarget(u, sightPx(u));
        if (tg) u.order = { type: 'attack', target: tg.id, auto: true, hx: u.x, hy: u.y };
      }
    }
  } else switch (o.type) {
    case 'move':
      if (moveTo(u, o.x, o.y, dt, o.arrive || 6)) u.order = null;
      break;
    case 'attack': {
      const t = G.byId.get(o.target);
      if (!A) { u.order = null; break; }
      if (o.auto && Math.hypot(u.x - o.hx, u.y - o.hy) > sightPx(u) * 1.6) { u.order = { type: 'move', x: o.hx, y: o.hy }; break; }
      if (!engage(u, t, dt, A)) u.order = o.auto ? null : null;
      break;
    }
    case 'amove': {
      if (!A || !canFight(u)) { if (moveTo(u, o.x, o.y, dt, 8)) u.order = null; break; }
      if (o.tgt) {
        const t = G.byId.get(o.tgt);
        if (!t || t.dead || edgeDist(u, t) > sightPx(u) * 1.4) o.tgt = null;
        else if (engage(u, t, dt, A)) break; else o.tgt = null;
      }
      u.scanT -= dt;
      if (u.scanT <= 0) { u.scanT = 0.25 + Math.random() * 0.1; const tg = findTarget(u, sightPx(u)); if (tg) { o.tgt = tg.id; break; } }
      if (moveTo(u, o.x, o.y, dt, 10)) u.order = null;
      break;
    }
    case 'hold': {
      if (!A || !canFight(u)) break;
      u.scanT -= dt;
      if (u.scanT <= 0) { u.scanT = 0.25; const tg = findTarget(u, A.range); o.tgt = tg ? tg.id : null; }
      if (o.tgt) { const t = G.byId.get(o.tgt); if (!engage(u, t, dt, A, true)) o.tgt = null; }
      break;
    }
    case 'gather': updGather(u, o, dt, P); break;
    case 'build': {
      const b = G.byId.get(o.b);
      if (!b || b.dead || !b.constructing) {
        u.order = null;
        if (b && !b.dead && b.d.resource && u.d.gatherer) u.order = { type: 'gather', node: b.id, st: 'go' };
        break;
      }
      if (edgeDist(u, b) <= 12) {
        u.building = true; b.nb++; u.path = null; u.goal = null;
        u.face = b.x >= u.x ? 1 : -1;
        if (Math.random() < dt * 3) { sfx('build', u.x, u.y); part(u.x + u.face * 10, u.y - 8, (Math.random() - 0.5) * 40, -40, 0.4, '#d8c49a', 2.5, 150); }
      } else { const ap = approachPt(u, b, 0); moveTo(u, ap.x, ap.y, dt, 3); }
      break;
    }
    case 'merge': {
      const p = G.byId.get(o.p);
      if (!p || p.dead || !p.order || p.order.type !== 'merge' || p.order.p !== u.id) { u.order = null; break; }
      if (Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.r + 6) {
        if (u.id < p.id) {
          const x = (u.x + p.x) / 2, y = (u.y + p.y) / 2, owner = u.owner;
          kill(u, null, true); kill(p, null, true);
          const a = mkUnit('archon', owner, x, y);
          for (let i = 0; i < 30; i++) { const ang = i / 30 * TAU; part(x, y - 25, Math.cos(ang) * 120, Math.sin(ang) * 120, 0.6, i % 2 ? '#ffe14a' : '#6fa0ff', 3, 0); }
          fxRing(x, y - 25, 5, 60, 0.6, '#ffe14a', 3);
          sfx('magic', x, y); say(a, a.d.lines.select, true);
          if (owner === 0) { G.selSet.add(a.id); G.sel.push(a); }
        }
      } else moveTo(u, p.x, p.y, dt, u.r + p.r);
      break;
    }
    case 'cast': {
      const AB = ABILITIES[o.key];
      if (Math.hypot(u.x - o.x, u.y - o.y) <= AB.range) { u.order = null; doCast(u, o.key, o.x, o.y); }
      else moveTo(u, o.x, o.y, dt, AB.range - 4);
      break;
    }
  }
  if (u.type === 'acsboy') {
    if (u.moving) u.still = 0; else u.still += dt;
    u.harvest = u.still > 1;
    if (u.harvest) {
      const rate = u.d.income * (P.up.trustfund ? 1.5 : 1) * (P.prayerUntil > G.t ? 2 : 1) * P.incMult;
      P.res += rate * dt; P.stats.gathered += rate * dt; P.income += rate;
      u.cashT = (u.cashT || Math.random() * 3) - dt;
      if (u.cashT <= 0) { u.cashT = 2.5 + Math.random() * 2; part(u.x + 6, u.y - 34, (Math.random() - 0.5) * 10, -25, 1.2, '#7bff6a', 10, 0, 'dollar'); }
      if (Math.random() < dt * 0.02 && onScreen(u.x, u.y, 0)) say(u, u.d.lines.harvest);
    }
  }
}
function carryCap(u) { return 5 + (G.players[u.owner].up.ironricebowl ? 2 : 0); }
function nearestDrop(u) {
  let best = null, bd = 1e9;
  for (const e of G.ents) if (!e.dead && e.kind === 'b' && e.owner === u.owner && e.d.dropoff && !e.constructing) { const d = edgeDist(u, e); if (d < bd) { bd = d; best = e; } }
  return best;
}
function findPaddy(u, near) {
  let best = null, bd = 1e9;
  const ref = near || u;
  for (const e of G.ents) {
    if (e.dead || e.type !== 'ricepaddy' || e.constructing || e.amount <= 0) continue;
    if (e.owner >= 0 && e.owner !== u.owner) continue;
    const n = gatherersOn(e, u);
    const d = Math.hypot(e.x - ref.x, e.y - ref.y) + n * 70;
    if (d < bd && d < 1400) { bd = d; best = e; }
  }
  return best;
}
function gatherersOn(node, except) {
  let n = 0;
  for (const e of G.ents) if (!e.dead && e.kind === 'u' && e !== except && e.order && e.order.type === 'gather' && e.order.node === node.id) n++;
  return n;
}
function updGather(u, o, dt, P) {
  let n = G.byId.get(o.node);
  if (!n || n.dead || n.amount <= 0) {
    if (u.carry > 0 && o.st !== 'return') o.st = 'return';
    if (o.st !== 'return') { n = findPaddy(u, n || u); if (!n) { u.order = null; return; } o.node = n.id; }
  }
  if (o.st === 'return' || u.carry >= carryCap(u)) {
    o.st = 'return';
    const dp = nearestDrop(u);
    if (!dp) { u.order = null; return; }
    if (edgeDist(u, dp) <= 12) {
      const amt = u.carry * P.incMult;
      P.res += amt; P.stats.gathered += amt; u.carry = 0; o.st = 'go';
      if (u.owner === 0 && onScreen(u.x, u.y, 0)) floatText(u.x, u.y - 34, '+' + Math.round(amt) + ' 🍚', '#fff4c0', 11);
    } else { const ap = approachPt(u, dp, 0); moveTo(u, ap.x, ap.y, dt, 3); }
    return;
  }
  if (!n) { u.order = null; return; }
  if (edgeDist(u, n) <= 12) {
    o.st = 'harvest'; u.path = null; u.goal = null; u.face = n.x >= u.x ? 1 : -1;
    o.ht = (o.ht || 0) + dt;
    if (o.ht >= 2.7) {
      o.ht = 0;
      const amt = Math.min(carryCap(u), n.amount);
      n.amount -= amt; u.carry = amt; o.st = 'return';
      if (n.amount <= 0) {
        if (n.owner === 0 || G.players[0].fac === 'hwa') { if (n.owner === 0) msg('A rice paddy has run dry.', '#ffe0a0'); }
        kill(n, null, true);
      }
    }
  } else { o.st = 'go'; const ap = approachPt(u, n, 0); moveTo(u, ap.x, ap.y, dt, 3); }
}

// ============================================================
//  BUILDINGS
// ============================================================
function updBld(b, dt) {
  b.t += dt;
  if (b.atkT > 0) b.atkT -= dt;
  if (b.constructing) {
    const n = b.nb; b.nb = 0;
    if (n > 0) {
      const dp = (1 + 0.5 * (n - 1)) / b.d.time * dt * (G.players[b.owner].ai ? G.players[b.owner].buildMult || 1 : 1);
      b.progress += dp; b.hp = Math.min(b.maxhp, b.hp + b.maxhp * 0.9 * dp);
      if (b.progress >= 1) completeBld(b);
    }
    return;
  }
  if (b.owner < 0) return;
  const P = G.players[b.owner];
  if (b.queue.length) {
    const q = b.queue[0]; q.t += dt;
    if (q.t >= q.time) { b.queue.shift(); finishItem(b, q, P); }
  }
  if (b.d.attack) {
    b.cd -= dt; b.scanT -= dt;
    let t = b.tgt ? G.byId.get(b.tgt) : null;
    if (!t || t.dead || edgeDist(b, t) > b.d.attack.range) { t = null; b.tgt = null; }
    if (!t && b.scanT <= 0) { b.scanT = 0.3; t = findTargetB(b); if (t) b.tgt = t.id; }
    if (t && b.cd <= 0) fire(b, t, b.d.attack);
  }
  if (b.hp < b.maxhp * 0.5 && Math.random() < dt * 6) {
    part(b.x + (Math.random() - 0.5) * b.d.w * 20, b.y - 10 + (Math.random() - 0.5) * b.d.h * 16, 0, -30, 0.8, pick(['#ff7a00', '#ffb21e', '#666']), 4, -40, 'flame');
  }
}
function findTargetB(b) {
  let best = null, bd = 1e9;
  for (const e of G.ents) {
    if (e.dead || e.kind !== 'u' || !isEnemy(b, e) || e.d.invuln) continue;
    const d = edgeDist(b, e); if (d <= b.d.attack.range && d < bd) { bd = d; best = e; }
  }
  return best;
}
function completeBld(b) {
  b.constructing = false; b.progress = 1;
  const P = G.players[b.owner];
  if (P && P.idx === 0) { msg(b.d.name + ' complete.', '#a8ffb0'); sfx('done'); }
  for (let i = 0; i < 18; i++) part(b.x + (Math.random() - 0.5) * b.d.w * TILE, b.y + b.d.h * TILE / 2 - 4, (Math.random() - 0.5) * 50, -Math.random() * 60, 0.7, '#e8dcb8', 3, 80);
}
function spawnPoint(b, tx, ty) {
  let best = null, bd = 1e9;
  const tgt = tx != null ? { x: tx, y: ty } : { x: b.x, y: b.y + 999 };
  for (let r = 1; r < 6 && !best; r++) {
    for (let y = b.ty - r; y < b.ty + b.d.h + r; y++) for (let x = b.tx - r; x < b.tx + b.d.w + r; x++) {
      if (x > b.tx - r && x < b.tx + b.d.w + r - 1 && y > b.ty - r && y < b.ty + b.d.h + r - 1) continue;
      if (!walkT(x, y)) continue;
      const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
      const d = Math.hypot(px - tgt.x, py - tgt.y);
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
  }
  return best || { x: b.x, y: b.y + b.d.h * TILE / 2 + 16 };
}
function finishItem(b, q, P) {
  if (q.unit) {
    const sp = spawnPoint(b, b.rally && b.rally.x, b.rally && b.rally.y);
    const u = mkUnit(q.unit, b.owner, sp.x + (Math.random() - 0.5) * 6, sp.y + (Math.random() - 0.5) * 6);
    if (b.rally) {
      const rt = b.rally.id ? G.byId.get(b.rally.id) : null;
      if (rt && !rt.dead && rt.type === 'ricepaddy' && u.d.gatherer) u.order = { type: 'gather', node: rt.id, st: 'go' };
      else u.order = { type: canFight(u) ? 'amove' : 'move', x: b.rally.x, y: b.rally.y };
    } else if (u.d.gatherer && P.idx !== 0) { /* AI assigns */ }
    else if (u.d.gatherer) { const n = findPaddy(u); if (n) u.order = { type: 'gather', node: n.id, st: 'go' }; }
    if (P.idx === 0) { say(u, u.d.lines.select, true); if (q.unit === 'chimera') sfx('roar'); }
    if (q.unit === 'chimera') { fxRing(u.x, u.y - 30, 10, 120, 1, '#ffe14a', 4); if (P.idx === 0) msg('Mr. Oldham has willed a Chimera into being!', '#ffe14a'); }
    if (q.unit === 'tankahkee' && P.idx === 0) msg('Tan Kah Kee rides into battle!', '#ffe14a');
  } else if (q.research) {
    P.up[q.research] = true;
    if (q.research === 'thoroughbreds') for (const e of G.ents) if (!e.dead && e.type === 'polorider' && e.owner === P.idx) { e.maxhp += 40; e.hp += 40; }
    if (q.research === 'proteinshakes') for (const e of G.ents) if (!e.dead && e.type === 'rugger' && e.owner === P.idx) { e.maxhp += 50; e.hp += 50; }
    if (P.idx === 0) { msg('Research complete: ' + RESEARCH[q.research].name, '#a8ffb0'); sfx('done'); }
  }
}
function queueItem(b, item, P, quiet) {
  if (b.constructing || b.queue.length >= 5) return fail(P, quiet, 'Queue is full.');
  if (item.unit) {
    const d = UNITS[item.unit];
    if (d.limit && (P.uc[item.unit] || 0) >= d.limit) return fail(P, quiet, d.name + ': limit of ' + d.limit + ' reached.');
    if (P.res < d.cost) return fail(P, quiet, 'Not enough ' + P.F.res + '.');
    if (P.sup + d.supply > P.supMax) return fail(P, quiet, 'Not enough supply — build a ' + BUILDINGS[P.F.supplyBld].name + '.');
    P.res -= d.cost; P.sup += d.supply; P.uc[item.unit] = (P.uc[item.unit] || 0) + 1;
    b.queue.push({ unit: item.unit, t: 0, time: d.time });
  } else {
    const r = RESEARCH[item.research];
    if (P.up[item.research] || P.researching[item.research]) return fail(P, quiet, 'Already researched.');
    if (P.res < r.cost) return fail(P, quiet, 'Not enough ' + P.F.res + '.');
    P.res -= r.cost; P.researching[item.research] = true;
    b.queue.push({ research: item.research, t: 0, time: r.time });
  }
  if (!quiet) sfx('click');
  return true;
}
function cancelQueue(b, idx) {
  const q = b.queue[idx]; if (!q) return;
  const P = G.players[b.owner];
  b.queue.splice(idx, 1);
  P.res += q.unit ? UNITS[q.unit].cost : RESEARCH[q.research].cost;
}
function fail(P, quiet, text) { if (!quiet && P.idx === 0) { msg(text, '#ffb0b0'); sfx('error'); } return false; }

function canPlace(type, tx, ty, owner) {
  const d = BUILDINGS[type];
  if (tx < 1 || ty < 1 || tx + d.w > MW - 1 || ty + d.h > MH - 1) return false;
  for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) {
    if (G.blk[y * MW + x]) return false;
    if (owner === 0 && !G.vis[y * MW + x]) return false;
  }
  const x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + d.w * TILE, y1 = y0 + d.h * TILE;
  for (const e of G.ents) if (!e.dead && e.kind === 'u' && e.owner !== owner && e.x > x0 - 4 && e.x < x1 + 4 && e.y > y0 - 4 && e.y < y1 + 4) return false;
  return true;
}
function placeBuilding(type, tx, ty, owner, builders) {
  const d = BUILDINGS[type], P = G.players[owner];
  if (P.res < d.cost) return fail(P, false, 'Not enough ' + P.F.res + '.');
  if (!reqMet(P, d)) return fail(P, false, 'Requires: ' + reqText(d));
  if (!canPlace(type, tx, ty, owner)) return fail(P, false, 'Can\'t build there.');
  P.res -= d.cost;
  const b = mkBuilding(type, owner, tx, ty, false);
  // eject own units standing on the footprint
  const r = bRect(b);
  for (const e of G.ents) {
    if (e.dead || e.kind !== 'u') continue;
    if (e.x > r.x0 - 6 && e.x < r.x1 + 6 && e.y > r.y0 - 6 && e.y < r.y1 + 6) { const sp = spawnPoint(b, e.x, e.y); e.x = sp.x; e.y = sp.y; e.path = null; e.goal = null; }
  }
  for (const u of builders) { u.order = { type: 'build', b: b.id }; u.carry = u.carry; }
  if (owner === 0) sfx('build');
  return b;
}

// ============================================================
//  ABILITIES
// ============================================================
function canCast(u, key, quiet) {
  const A = ABILITIES[key], P = G.players[u.owner];
  if (A.needs && !P.up[A.needs]) return fail(P, quiet, 'Requires research: ' + RESEARCH[A.needs].name);
  if (A.global && P.cdUntil[key] > G.t) return fail(P, quiet, A.name + ' is on cooldown.');
  if (A.cd && !A.global && (u.abCd[key] || 0) > G.t) return fail(P, quiet, A.name + ' is on cooldown.');
  if (A.energy && u.energy < A.energy) return fail(P, quiet, 'Not enough energy.');
  if (u.stunUntil > G.t) return false;
  return true;
}
function doCast(u, key, x, y) {
  const A = ABILITIES[key], P = G.players[u.owner];
  if (!canCast(u, key, P.idx !== 0)) return false;
  if (A.energy) u.energy -= A.energy;
  if (A.cd && !A.global) u.abCd[key] = G.t + A.cd;
  u.castT = 0.6;
  const allies = (r) => G.ents.filter(e => !e.dead && e.kind === 'u' && e.owner === u.owner && Math.hypot(e.x - u.x, e.y - u.y) <= r);
  switch (key) {
    case 'calltoprayer': {
      P.cdUntil[key] = G.t + A.cd; P.prayerUntil = G.t + A.dur;
      for (const e of G.ents) if (!e.dead && e.owner === u.owner && (e.type === 'chapel' || e.type === 'cathedral')) fxRing(e.x, e.y, 10, 260, 1.4, '#ffe68a', 3);
      if (P.idx === 0) { msg('Call to Prayer! Maids take up their brooms; Daddy\'s money flows double.', '#ffe68a'); sfx('prayer'); }
      break;
    }
    case 'pray': {
      const dur = P.up.handbellchoir ? 15 : 10;
      for (const e of allies(A.radius)) e.buffs.prayer = G.t + dur;
      fxRing(u.x, u.y - 10, 6, A.radius, 0.8, '#ffe68a', 3);
      say(u, ['Lord, grant us strength!', 'Let us pray!', 'Amen!'], true); sfx('prayer', u.x, u.y);
      break;
    }
    case 'diligence': {
      for (const e of allies(A.radius)) e.buffs.diligence = G.t + A.dur;
      fxRing(u.x, u.y - 10, 6, A.radius, 0.7, '#7fd3ff', 3);
      floatText(u.x, u.y - 40, '勤 DILIGENCE', '#7fd3ff', 13); say(u, ['Homework never sleeps!', 'By Diligence!'], true); sfx('magic', u.x, u.y);
      break;
    }
    case 'prudence': {
      for (const e of allies(A.radius)) { e.shield = A.shield; e.shieldUntil = G.t + A.dur; }
      fxRing(u.x, u.y - 10, 6, A.radius, 0.7, '#9fb8ff', 3);
      floatText(u.x, u.y - 40, '慎 PRUDENCE', '#9fb8ff', 13); say(u, ['With Prudence!', 'Be careful, everyone.'], true); sfx('magic', u.x, u.y);
      break;
    }
    case 'respectability': {
      for (const e of G.ents) if (!e.dead && e.kind === 'u' && isEnemy(u, e) && Math.hypot(e.x - x, e.y - y) <= A.radius + e.r) { e.stunUntil = G.t + A.stun; e.path = null; }
      fxRing(x, y, 6, A.radius, 0.6, '#ff8a8a', 3);
      for (let i = 0; i < 6; i++) floatText(x + (Math.random() - 0.5) * A.radius, y - 20 + (Math.random() - 0.5) * 40, pick(['😤', '端', 'Tsk.', 'Shameful!']), '#ffb0b0', 13);
      say(u, ['Have some respect!', 'How disgraceful.', 'Shameful!'], true); sfx('stun', x, y);
      break;
    }
    case 'summonstudent': {
      const ex = mkUnit('exchange', u.owner, u.x + u.face * 20, u.y + 6);
      fxRing(ex.x, ex.y - 14, 4, 50, 0.6, '#9fe0ff', 3);
      say(ex, ex.d.lines.select, true); sfx('magic', u.x, u.y);
      if (u.owner === 0) { ex.order = null; }
      break;
    }
    case 'pandaslam': {
      for (const e of G.ents) if (!e.dead && e.kind === 'u' && isEnemy(u, e) && Math.hypot(e.x - u.x, e.y - u.y) <= A.radius + e.r) { hurt(e, A.dmg, u); e.stunUntil = G.t + A.stun; }
      fxRing(u.x, u.y, 8, A.radius, 0.5, '#ffffff', 5); fxRing(u.x, u.y, 4, A.radius * 0.7, 0.45, '#222', 3);
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; part(u.x, u.y, Math.cos(a) * 140, Math.sin(a) * 70, 0.5, '#c9b27a', 4, 0); }
      say(u, ['PANDA SLAM!', 'For the people!'], true); sfx('slam', u.x, u.y);
      break;
    }
  }
  return true;
}
// issue ability from selected group: picks the best caster
function issueAbility(units, key, x, y) {
  const A = ABILITIES[key];
  if (A.fuse) { fuseGirls(units); return; }
  const cands = units.filter(u => u.d.abilities && u.d.abilities.includes(key) && !(u.stunUntil > G.t));
  if (!cands.length) return;
  if (A.global) { doCast(cands[0], key, x, y); return; }
  let best = null;
  for (const u of cands) {
    if (!canCast(u, key, true)) continue;
    if (!best || (x != null ? Math.hypot(u.x - x, u.y - y) < Math.hypot(best.x - x, best.y - y) : u.energy > best.energy)) best = u;
  }
  if (!best) { canCast(cands[0], key, cands[0].owner !== 0); return; }
  if (A.target === 'point') {
    if (Math.hypot(best.x - x, best.y - y) <= A.range) doCast(best, key, x, y);
    else best.order = { type: 'cast', key, x, y };
  } else doCast(best, key);
}
function fuseGirls(units) {
  const girls = units.filter(u => u.type === 'nanyang' && !(u.order && u.order.type === 'merge'));
  if (girls.length < 2) { if (units[0] && units[0].owner === 0) { msg('Select two Nanyang Girls to fuse.', '#ffb0b0'); sfx('error'); } return; }
  const used = new Set();
  for (const a of girls) {
    if (used.has(a.id)) continue;
    let best = null, bd = 1e9;
    for (const b of girls) if (b !== a && !used.has(b.id)) { const d = dist(a, b); if (d < bd) { bd = d; best = b; } }
    if (!best) break;
    used.add(a.id); used.add(best.id);
    a.order = { type: 'merge', p: best.id }; best.order = { type: 'merge', p: a.id };
    a.path = best.path = null;
    say(a, ['Focus your qi!', 'Simplicity: we become one.'], true);
  }
}

// ============================================================
//  AURAS / HORDE (every 0.5s)
// ============================================================
function updAuras() {
  const units = G.ents.filter(e => !e.dead && e.kind === 'u');
  for (const u of units) { u.horde = false; u.tkk = false; }
  for (const P of G.players) {
    if (P.fac !== 'hwa') continue;
    const th = P.up.tenthousand ? 7 : 10;
    const f = units.filter(u => u.owner === P.idx && !u.d.worker);
    let count = 0;
    for (const u of f) {
      let n = 0;
      for (const v of f) if (Math.abs(v.x - u.x) < 260 && Math.abs(v.y - u.y) < 260 && Math.hypot(v.x - u.x, v.y - u.y) < 260) n++;
      if (n >= th) { u.horde = true; count++; }
    }
    P.hordeCount = count;
    for (const k of units) if (k.type === 'tankahkee' && k.owner === P.idx) for (const u of units) if (u.owner === P.idx && u !== k && Math.hypot(u.x - k.x, u.y - k.y) < k.d.aura.radius) u.tkk = true;
  }
}

// ============================================================
//  SEPARATION
// ============================================================
function separate() {
  const cell = 48, grid = new Map();
  const units = [];
  for (const e of G.ents) if (!e.dead && e.kind === 'u') {
    units.push(e);
    const k = ((e.x / cell) | 0) + ((e.y / cell) | 0) * 1000;
    let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e);
  }
  for (const a of units) {
    const gx = (a.x / cell) | 0, gy = (a.y / cell) | 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const list = grid.get(gx + ox + (gy + oy) * 1000); if (!list) continue;
      for (const b of list) {
        if (b.id <= a.id) continue;
        let dx = b.x - a.x, dy = b.y - a.y; const rr = (a.r + b.r) * 0.85;
        if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
        let d = Math.hypot(dx, dy);
        if (d >= rr) continue;
        if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
        const ov = Math.min(3, (rr - d)) ;
        const wa = anchored(a) ? 0.15 : (a.moving ? 0.6 : 1), wb = anchored(b) ? 0.15 : (b.moving ? 0.6 : 1);
        const s = ov / (wa + wb);
        step(a, -dx / d * s * wa, -dy / d * s * wa);
        step(b, dx / d * s * wb, dy / d * s * wb);
      }
    }
  }
}
function anchored(u) { return u.building || u.harvest || (u.order && (u.order.type === 'hold' || u.order.st === 'harvest')) || u.r > 18; }

// ============================================================
//  FOG OF WAR (human = player 0)
// ============================================================
function updFog() {
  const vis = G.vis;
  for (let i = 0; i < vis.length; i++) if (vis[i] === 2) vis[i] = 1;
  for (const e of G.ents) {
    if (e.dead || e.owner !== 0) continue;
    const r = e.d.sight, cx_ = e.x / TILE, cy_ = e.y / TILE;
    const r2 = (r + (e.kind === 'b' ? Math.max(e.d.w, e.d.h) / 2 : 0)) ** 2, R = Math.ceil(Math.sqrt(r2));
    for (let y = Math.max(0, Math.floor(cy_ - R)); y <= Math.min(MH - 1, cy_ + R); y++)
      for (let x = Math.max(0, Math.floor(cx_ - R)); x <= Math.min(MW - 1, cx_ + R); x++)
        if ((x + 0.5 - cx_) ** 2 + (y + 0.5 - cy_) ** 2 <= r2) vis[y * MW + x] = 2;
  }
  for (const e of G.ents) if (e.kind === 'b' && !e.seen && e.owner !== 0) {
    for (let y = e.ty; y < e.ty + e.d.h && !e.seen; y++) for (let x = e.tx; x < e.tx + e.d.w; x++) if (vis[y * MW + x] === 2) { e.seen = true; break; }
  }
  const img = G.fogImg, d = img.data;
  for (let i = 0; i < vis.length; i++) d[i * 4 + 3] = vis[i] === 2 ? 0 : vis[i] === 1 ? 135 : 255;
  G.fogX.putImageData(img, 0, 0);
}
function visibleTo0(e) {
  if (e.owner === 0) return true;
  if (G.revealAll) return true;
  if (e.kind === 'b') {
    for (let y = e.ty; y < e.ty + e.d.h; y++) for (let x = e.tx; x < e.tx + e.d.w; x++) if (G.vis[y * MW + x] === 2) return true;
    return false;
  }
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
  return tx >= 0 && ty >= 0 && tx < MW && ty < MH && G.vis[ty * MW + tx] === 2;
}
function shownTo0(e) { return e.kind === 'b' ? (e.owner === 0 || e.seen || G.revealAll || e.owner < 0 && e.seen) : visibleTo0(e); }

// ============================================================
//  GAME SETUP & LOOP
// ============================================================
function newGame(fac, diff) {
  const seed = (Math.random() * 1e9) | 0;
  const m = genMap(seed);
  const enemyFac = fac === 'meth' ? 'hwa' : 'meth';
  G = {
    t: 0, ents: [], byId: new Map(), projs: [], parts: [], fx: [], floats: [], pings: [],
    blk: m.blk, map: m, players: [mkPlayer(0, fac, false), mkPlayer(1, enemyFac, true, diff)],
    cam: { x: 0, y: 0 }, sel: [], selSet: new Set(), groups: {}, placing: null, targeting: null, cardMenu: null, activeType: null,
    speed: 1, paused: false, over: false, pathBudget: 40, auraT: 0, fogT: 0, aiT: 0, uiT: 0, vis: new Uint8Array(MW * MH),
    diff,
  };
  NEXT_ID = 1;
  G.terrC = renderTerrain(m);
  G.miniBase = document.createElement('canvas'); G.miniBase.width = G.miniBase.height = MMS;
  G.miniBase.getContext('2d').drawImage(G.terrC, 0, 0, MMS, MMS);
  G.fogC = document.createElement('canvas'); G.fogC.width = MW; G.fogC.height = MH; G.fogX = G.fogC.getContext('2d');
  G.fogImg = G.fogX.createImageData(MW, MH);
  // neutral expansion paddies
  for (const p of allExpansions()) { const b = mkBuilding('ricepaddy', -1, p.x, p.y, true); b.amount = b.maxAmount = 2000; }
  const slots = Math.random() < 0.5 ? [0, 1] : [1, 0];
  G.players.forEach((P, i) => {
    const s = slots[i]; P.slot = s;
    const hp = HQ_POS[s];
    const hq = mkBuilding(P.F.hq, P.idx, hp.x, hp.y, true);
    P.hq = hq.id;
    if (P.fac === 'hwa') for (const sp of START_PADDIES) { const p = s === 0 ? sp : mirrorFP(sp, 3, 2); const b = mkBuilding('ricepaddy', -1, p.x, p.y, true); b.amount = b.maxAmount = 1800; }
    let k = 0;
    for (const [type, n] of P.F.start.units) for (let j = 0; j < n; j++) {
      const sp = spawnPoint(hq, s === 0 ? hq.x + 200 : hq.x - 200, s === 0 ? hq.y + 200 : hq.y - 200);
      const u = mkUnit(type, P.idx, sp.x + ((k % 3) - 1) * 18, sp.y + (Math.floor(k / 3)) * 18); k++;
      if (u.d.gatherer) { const n2 = findPaddy(u); if (n2) u.order = { type: 'gather', node: n2.id, st: 'go' }; }
    }
    P.stats.made = 0;
    if (P.ai) aiInit(P);
  });
  if (diff === 'hard') G.players[1].incMult = 1.35;
  if (diff === 'easy') G.players[1].incMult = 0.75;
  const hq = G.byId.get(G.players[0].hq);
  centerCam(hq.x, hq.y);
  updFog();
  setupHUD();
}
function centerCam(x, y) {
  G.cam.x = x - VW / 2; G.cam.y = y - (VH - PANEL_H + TOP_H) / 2;
  clampCam();
}
function clampCam() {
  G.cam.x = clamp(G.cam.x, 0, Math.max(0, WW - VW));
  G.cam.y = clamp(G.cam.y, -TOP_H, Math.max(-TOP_H, WH - VH + PANEL_H));
}
function onScreen(x, y, m) { return G && x > G.cam.x - m && x < G.cam.x + VW + m && y > G.cam.y - m && y < G.cam.y + VH + m; }

function update(dt) {
  G.t += dt;
  G.pathBudget = 40;
  tallies();
  for (const P of G.players) P.income = 0;
  for (const e of G.ents) { if (e.dead) continue; if (e.kind === 'u') updUnit(e, dt); else updBld(e, dt); }
  separate();
  updProjs(dt);
  for (const p of G.parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.shape === 'conf') { p.vx *= 0.97; p.vy *= 0.97; } }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const f of G.fx) f.life -= dt; G.fx = G.fx.filter(f => f.life > 0);
  for (const f of G.floats) { f.life -= dt; f.y -= 22 * dt; } G.floats = G.floats.filter(f => f.life > 0);
  G.pings = G.pings.filter(p => G.t - p.t < 3);
  G.auraT -= dt; if (G.auraT <= 0) { G.auraT = 0.5; updAuras(); }
  G.fogT -= dt; if (G.fogT <= 0) { G.fogT = 0.15; updFog(); }
  G.aiT -= dt; if (G.aiT <= 0) { G.aiT = 0.5; for (const P of G.players) if (P.ai && !P.defeated) aiTick(P); }
  if (G.ents.some(e => e.dead)) {
    G.ents = G.ents.filter(e => { if (e.dead) G.byId.delete(e.id); return !e.dead; });
  }
  G.sel = G.sel.filter(e => !e.dead);
  checkVictory();
}
function checkVictory() {
  if (G.over) return;
  for (const P of G.players) {
    const alive = G.ents.some(e => e.kind === 'b' && e.owner === P.idx && !e.d.wall && e.type !== 'ricepaddy');
    if (!alive) { P.defeated = true; }
  }
  if (G.players[0].defeated) endGame(false);
  else if (G.players[1].defeated) endGame(true);
}

let LAST = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - LAST) / 1000 || 0); LAST = ts;
  if (G && !G.paused && !G.over) {
    scrollCam(dt);
    update(dt * G.speed);
  }
  if (G) { render(); uiFrame(dt); }
  requestAnimationFrame(frame);
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  const cam = G.cam, ox = Math.round(cam.x), oy = Math.round(cam.y);
  cx.fillStyle = '#000'; cx.fillRect(0, 0, VW, VH);
  cx.save(); cx.translate(-ox, -oy);
  const sx = Math.max(0, ox), sy = Math.max(0, oy), sw = Math.min(WW - sx, VW), sh = Math.min(WH - sy, VH);
  if (sw > 0 && sh > 0) cx.drawImage(G.terrC, sx, sy, sw, sh, sx, sy, sw, sh);
  // collect drawables
  const list = [];
  for (const e of G.ents) {
    if (!onScreen(e.x, e.y, 160)) continue;
    if (e.owner !== 0 && !shownTo0(e)) continue;
    list.push(e);
  }
  list.sort((a, b) => sortY(a) - sortY(b));
  // ground layer: paddies + selection marks
  for (const e of list) if (e.kind === 'b' && e.type === 'ricepaddy') drawBld(e);
  for (const e of list) drawSelMark(e);
  // rally lines
  for (const e of G.sel) if (e.kind === 'b' && e.rally && e.owner === 0) {
    cx.setLineDash([5, 5]); ln(cx, e.x, e.y, e.rally.x, e.rally.y, 'rgba(120,255,140,0.7)', 1.5); cx.setLineDash([]);
    pennant(cx, e.rally.x, e.rally.y, '#7bff6a');
  }
  for (const e of list) { if (e.kind === 'b') { if (e.type !== 'ricepaddy') drawBld(e); } else drawUnit(e); }
  // projectiles
  for (const p of G.projs) drawProj(p);
  // particles
  for (const p of G.parts) {
    const a = Math.max(0, p.life / p.max);
    cx.globalAlpha = a;
    if (p.shape === 'flame') { cir(cx, p.x, p.y, p.size * (0.5 + a * 0.6), p.col); }
    else if (p.shape === 'conf') { cx.fillStyle = p.col; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.life * 9); cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); cx.restore(); }
    else if (p.shape === 'plus') { cx.fillStyle = p.col; cx.fillRect(p.x - 4, p.y - 1.2, 8, 2.4); cx.fillRect(p.x - 1.2, p.y - 4, 2.4, 8); }
    else if (p.shape === 'dollar') { cx.fillStyle = p.col; cx.font = 'bold ' + p.size + 'px sans-serif'; cx.fillText('$', p.x, p.y); }
    else { cx.fillStyle = p.col; cx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  cx.globalAlpha = 1;
  for (const f of G.fx) drawFx(f);
  cx.restore();
  // fog
  cx.save(); cx.imageSmoothingEnabled = true;
  cx.drawImage(G.fogC, 0, 0, MW, MH, -ox, -oy, WW, WH);
  cx.restore();
  // overlays in world space above fog
  cx.save(); cx.translate(-ox, -oy);
  if (G.placing) drawGhost();
  for (const e of list) drawBars(e);
  for (const e of list) if (e.say && e.say.until > G.t && e.kind === 'u') drawBubble(e);
  for (const f of G.floats) {
    cx.globalAlpha = Math.min(1, f.life / f.max * 2);
    cx.font = 'bold ' + f.size + 'px Trebuchet MS, sans-serif'; cx.textAlign = 'center';
    cx.lineWidth = 3; cx.strokeStyle = 'rgba(0,0,0,0.7)'; cx.strokeText(f.text, f.x, f.y); cx.fillStyle = f.col; cx.fillText(f.text, f.x, f.y);
  }
  cx.globalAlpha = 1; cx.textAlign = 'left';
  // move markers
  cx.restore();
  // drag box
  if (MOUSE.drag) {
    cx.strokeStyle = '#7bff6a'; cx.lineWidth = 1; cx.fillStyle = 'rgba(123,255,106,0.08)';
    const x = Math.min(MOUSE.sx, MOUSE.x), y = Math.min(MOUSE.sy, MOUSE.y), w = Math.abs(MOUSE.x - MOUSE.sx), h = Math.abs(MOUSE.y - MOUSE.sy);
    cx.fillRect(x, y, w, h); cx.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  if (G.targeting) {
    cx.strokeStyle = G.targeting.type === 'spell' ? '#ffd34a' : '#ff5a5a'; cx.lineWidth = 2;
    const r = G.targeting.type === 'spell' ? ABILITIES[G.targeting.key].radius || 20 : 10;
    cx.beginPath(); cx.arc(MOUSE.x, MOUSE.y, r, 0, TAU); cx.stroke();
    ln(cx, MOUSE.x - r - 6, MOUSE.y, MOUSE.x - r + 6, MOUSE.y, cx.strokeStyle, 2); ln(cx, MOUSE.x + r - 6, MOUSE.y, MOUSE.x + r + 6, MOUSE.y, cx.strokeStyle, 2);
  }
}
function sortY(e) { return e.kind === 'b' ? (e.ty + e.d.h) * TILE - 6 : e.y; }
const TEAMC = ['#3fd2ff', '#ff4848'];
function drawSelMark(e) {
  const sel = G.selSet.has(e.id), hov = G.hover === e;
  if (e.kind === 'u') {
    const col = e.owner === 0 ? TEAMC[0] : TEAMC[1];
    cx.globalAlpha = 0.35; ell(cx, e.x, e.y + 1, e.r * 1.1, e.r * 0.5, col); cx.globalAlpha = 1;
    if (sel || hov) { cx.strokeStyle = e.owner === 0 ? '#7bff6a' : '#ff5a5a'; cx.lineWidth = sel ? 2 : 1; cx.beginPath(); cx.ellipse(e.x, e.y + 1, e.r * 1.35 + 2, e.r * 0.65 + 2, 0, 0, TAU); cx.stroke(); }
    if (e.horde) { cx.globalAlpha = 0.45 + Math.sin(G.t * 8 + e.id) * 0.2; cx.strokeStyle = '#ff6a00'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(e.x, e.y + 1, e.r * 1.5, e.r * 0.7, 0, 0, TAU); cx.stroke(); cx.globalAlpha = 1; }
  } else if (sel || hov) {
    const r = bRect(e);
    cx.strokeStyle = e.owner === 0 ? '#7bff6a' : e.owner < 0 ? '#ffe14a' : '#ff5a5a'; cx.lineWidth = sel ? 2 : 1;
    cx.strokeRect(r.x0 - 2, r.y0 - 2, r.x1 - r.x0 + 4, r.y1 - r.y0 + 4);
  }
}
function drawUnit(u) {
  const st = { t: u.t, moving: u.moving, atk: u.atkT > 0 ? Math.max(0.02, 1 - u.atkT / 0.3) : 0, combat: u.combat, harvest: u.harvest || (u.order && u.order.st === 'harvest'), carry: u.carry > 0, building: u.building, cast: u.castT };
  if (!u.d.vehicle && u.type !== 'chimera' && u.type !== 'polorider' && u.type !== 'tankahkee' && u.type !== 'archon' && u.type !== 'riotbus') ell(cx, u.x, u.y, u.r * 0.85, u.r * 0.32, 'rgba(0,0,0,0.28)');
  if (u.buffs.prayer > G.t) { cx.globalAlpha = 0.25 + Math.sin(G.t * 6) * 0.1; ell(cx, u.x, u.y - (u.d.artH || 30) / 2, u.r + 6, (u.d.artH || 30) / 2 + 4, '#ffe68a'); cx.globalAlpha = 1; }
  cx.save(); cx.translate(u.x, u.y);
  if (u.face < 0) cx.scale(-1, 1);
  if (u.stunUntil > G.t) cx.rotate(Math.sin(G.t * 20) * 0.06);
  SPR[u.type](cx, st);
  cx.restore();
  const top = u.y - (u.d.artH || 30) - 4;
  if (u.shield > 0 && u.shieldUntil > G.t) { cx.globalAlpha = 0.35; cx.strokeStyle = '#9fb8ff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(u.x, u.y - (u.d.artH || 30) / 2, (u.d.artH || 30) * 0.6 + 2, 0, TAU); cx.stroke(); cx.globalAlpha = 1; }
  if (u.stunUntil > G.t) for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * TAU / 3; cx.fillStyle = '#ffe14a'; cx.font = '10px sans-serif'; cx.fillText('★', u.x + Math.cos(a) * 10 - 4, top + Math.sin(a) * 3); }
  if (u.buffs.diligence > G.t && Math.random() < 0.15) part(u.x - u.face * 8, u.y - 14, -u.face * 40, 0, 0.25, '#7fd3ff', 2, 0);
}
function drawBld(b) {
  const x = b.tx * TILE, y = b.ty * TILE, W = b.d.w * TILE, H = b.d.h * TILE;
  cx.save(); cx.translate(x, y);
  if (b.constructing) {
    box(cx, 0, 0, W, H, 'rgba(110,85,55,0.85)');
    cx.strokeStyle = '#d8c49a'; cx.setLineDash([4, 3]); cx.strokeRect(1, 1, W - 2, H - 2); cx.setLineDash([]);
    const top = -50, full = H - top, cut = H - full * b.progress;
    cx.save(); cx.beginPath(); cx.rect(-30, cut, W + 60, H - cut + 2); cx.clip();
    cx.globalAlpha = 0.9; BLD[b.type](cx, W, H, { t: b.t, amount: b.amount, max: b.maxAmount }); cx.globalAlpha = 1;
    cx.restore();
    // scaffolding
    cx.strokeStyle = '#8a6a3a'; cx.lineWidth = 1.5;
    for (let i = 0; i <= b.d.w; i++) ln(cx, i * TILE * 0.98 + 1, H, i * TILE * 0.98 + 1, Math.max(cut, -40), '#8a6a3a', 1.5);
    for (let yy = H; yy > Math.max(cut, -40); yy -= 14) ln(cx, 0, yy, W, yy, '#8a6a3a', 1);
  } else {
    BLD[b.type](cx, W, H, { t: b.t, amount: b.amount, max: b.maxAmount, attacking: b.atkT > 0 });
  }
  if (b.owner >= 0) pennant(cx, 4, 2, TEAMC[b.owner === 0 ? 0 : 1]);
  cx.restore();
}
function drawBars(e) {
  const sel = G.selSet.has(e.id), hov = G.hover === e;
  if (e.owner < 0) {
    if ((sel || hov) && e.amount != null) {
      const w = e.d.w * TILE - 10, x = e.x - w / 2, y = e.ty * TILE - 8;
      box(cx, x, y, w, 4, '#222'); box(cx, x, y, w * e.amount / e.maxAmount, 4, '#9be05a');
    }
    return;
  }
  const dmg = e.hp < e.maxhp;
  if (!(sel || hov || dmg || (e.kind === 'b' && e.constructing))) return;
  const f = Math.max(0, e.hp / e.maxhp);
  let w, x, y;
  if (e.kind === 'b') { w = e.d.w * TILE - 10; x = e.x - w / 2; y = e.ty * TILE - (e.d.h > 2 ? 46 : 18); }
  else { w = Math.max(18, e.r * 2.2); x = e.x - w / 2; y = e.y - (e.d.artH || 30) - 10; }
  box(cx, x - 1, y - 1, w + 2, 5, 'rgba(0,0,0,0.7)');
  box(cx, x, y, w * f, 3, f > 0.6 ? '#4dff5a' : f > 0.3 ? '#ffd23a' : '#ff4040');
  if (e.shield > 0 && e.shieldUntil > G.t) box(cx, x, y - 3, w * Math.min(1, e.shield / 60), 2, '#9fb8ff');
  if (e.kind === 'u' && e.d.energy && (sel || hov)) { box(cx, x - 1, y + 4, w + 2, 4, 'rgba(0,0,0,0.7)'); box(cx, x, y + 5, w * e.energy / e.d.energy, 2, '#c77dff'); }
  if (e.life != null) { box(cx, x - 1, y + 4, w + 2, 4, 'rgba(0,0,0,0.7)'); box(cx, x, y + 5, w * e.life / e.d.life, 2, '#9fe0ff'); }
  if (e.kind === 'b' && e.constructing) { box(cx, x, y + 5, w * e.progress, 3, '#ffd23a'); }
  if (e.kind === 'b' && e.queue.length && e.owner === 0) { const q = e.queue[0]; box(cx, x, y + 5, w * q.t / q.time, 3, '#7fd3ff'); }
}
function drawBubble(u) {
  const text = u.say.text;
  cx.font = 'bold 11px Trebuchet MS, sans-serif';
  const w = cx.measureText(text).width + 12, h = 18;
  const x = u.x - w / 2, y = u.y - (u.d.artH || 30) - 34;
  cx.globalAlpha = Math.min(1, (u.say.until - G.t) * 3);
  rbox(cx, x, y, w, h, 6, 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0.5)', 1);
  poly(cx, [[u.x - 4, y + h], [u.x + 4, y + h], [u.x, y + h + 6]], 'rgba(255,255,255,0.95)');
  cx.fillStyle = '#1a1a2a'; cx.fillText(text, x + 6, y + 13);
  cx.globalAlpha = 1;
}
function drawProj(p) {
  switch (p.kind) {
    case 'confetti': for (let i = 0; i < 5; i++) { cx.fillStyle = ['#ff4f6e', '#4fc3ff', '#ffe14a', '#7bff6a', '#c77dff'][i]; cx.fillRect(p.x - 4 + i * 2, p.y - 3 + Math.sin(G.t * 30 + i) * 2, 2.5, 2.5); } break;
    case 'ghost': {
      cx.save(); cx.translate(p.x, p.y + Math.sin(G.t * 12) * 2); cx.globalAlpha = 0.85;
      cx.fillStyle = '#e8fff4'; cx.beginPath(); cx.arc(0, -2, 6, Math.PI, 0); cx.lineTo(6, 5); cx.lineTo(3, 3); cx.lineTo(0, 6); cx.lineTo(-3, 3); cx.lineTo(-6, 5); cx.closePath(); cx.fill();
      cx.fillStyle = '#123'; cx.fillRect(-3, -3, 1.6, 2.4); cx.fillRect(1.4, -3, 1.6, 2.4);
      cx.restore(); break;
    }
    case 'bullet': ln(cx, p.px || p.x, p.py || p.y, p.x, p.y, '#ffe680', 2); break;
    case 'firework': cir(cx, p.x, p.y, 3, '#ff4f6e'); break;
    case 'qibolt': cir(cx, p.x, p.y, 4, 'rgba(255,230,90,0.6)'); cir(cx, p.x, p.y, 2, '#fff'); break;
    case 'qiblast': cir(cx, p.x, p.y, 8, 'rgba(110,160,255,0.5)'); cir(cx, p.x, p.y, 5, 'rgba(255,230,90,0.85)'); cir(cx, p.x, p.y, 2.5, '#fff'); break;
  }
}
function drawFx(f) {
  const k = 1 - f.life / f.max;
  cx.globalAlpha = Math.max(0, f.life / f.max);
  if (f.k === 'ring') { cx.strokeStyle = f.col; cx.lineWidth = f.w; cx.beginPath(); cx.ellipse(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, (f.r0 + (f.r1 - f.r0) * k) * 0.6, 0, 0, TAU); cx.stroke(); }
  else if (f.k === 'beam') ln(cx, f.x1, f.y1, f.x2, f.y2, f.col, f.w);
  else if (f.k === 'slash') { cx.strokeStyle = f.col; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(f.x, f.y, 10, f.face > 0 ? -1.2 + k : Math.PI + 1.2 - k, f.face > 0 ? 0.6 + k : Math.PI - 0.6 - k, f.face < 0); cx.stroke(); }
  else if (f.k === 'mark') { cx.strokeStyle = f.col; cx.lineWidth = 2; const r = 10 * (1 - k) + 3; cx.beginPath(); cx.ellipse(f.x, f.y, r, r * 0.55, 0, 0, TAU); cx.stroke(); }
  cx.globalAlpha = 1;
}
function ghostTile() {
  const d = BUILDINGS[G.placing.type];
  const tx = Math.floor((MOUSE.x + G.cam.x) / TILE - d.w / 2 + 0.5), ty = Math.floor((MOUSE.y + G.cam.y) / TILE - d.h / 2 + 0.5);
  G.placing.tx = tx; G.placing.ty = ty;
  return [tx, ty];
}
function drawGhost() {
  const d = BUILDINGS[G.placing.type];
  const [tx, ty] = ghostTile();
  const ok = canPlace(G.placing.type, tx, ty, 0);
  for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) {
    const free = x >= 1 && y >= 1 && x < MW - 1 && y < MH - 1 && !G.blk[y * MW + x] && G.vis[y * MW + x];
    box(cx, x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2, free ? 'rgba(80,255,120,0.28)' : 'rgba(255,60,60,0.4)');
  }
  cx.save(); cx.translate(tx * TILE, ty * TILE); cx.globalAlpha = ok ? 0.65 : 0.35;
  BLD[G.placing.type](cx, d.w * TILE, d.h * TILE, { t: G.t, amount: 1200, max: 1200 });
  cx.restore(); cx.globalAlpha = 1;
  if (d.attack) { cx.strokeStyle = 'rgba(255,255,255,0.3)'; cx.beginPath(); cx.arc((tx + d.w / 2) * TILE, (ty + d.h / 2) * TILE, d.attack.range, 0, TAU); cx.stroke(); }
}

// ============================================================
//  MINIMAP
// ============================================================
function drawMinimap() {
  const s = MMS / WW;
  mx.drawImage(G.miniBase, 0, 0);
  for (const e of G.ents) {
    if (e.owner !== 0 && !shownTo0(e)) continue;
    const col = e.owner < 0 ? '#b9f07a' : TEAMC[e.owner === 0 ? 0 : 1];
    mx.fillStyle = col;
    if (e.kind === 'b') mx.fillRect(e.tx * TILE * s, e.ty * TILE * s, Math.max(3, e.d.w * TILE * s), Math.max(3, e.d.h * TILE * s));
    else mx.fillRect(e.x * s - 1.5, e.y * s - 1.5, 3, 3);
  }
  mx.drawImage(G.fogC, 0, 0, MMS, MMS);
  for (const p of G.pings) { const k = (G.t - p.t) % 1; mx.strokeStyle = '#ff4040'; mx.lineWidth = 2; mx.beginPath(); mx.arc(p.x * s, p.y * s, 4 + k * 14, 0, TAU); mx.stroke(); }
  mx.strokeStyle = '#fff'; mx.lineWidth = 1;
  mx.strokeRect(G.cam.x * s + 0.5, (G.cam.y + TOP_H) * s + 0.5, VW * s, (VH - PANEL_H - TOP_H) * s);
}
