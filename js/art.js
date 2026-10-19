'use strict';
// ============================================================
//  ELITECRAFT — procedural art: sprites, buildings, logos
//  All sprites are drawn facing right with origin at the feet.
// ============================================================
const TAU = Math.PI * 2;

function cir(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ell(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function box(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function rrPath(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function rbox(c, x, y, w, h, r, col, stroke, lw) {
  rrPath(c, x, y, w, h, r); if (col) { c.fillStyle = col; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
function poly(c, pts, col, stroke, lw) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); if (col) { c.fillStyle = col; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
function ln(c, x1, y1, x2, y2, col, w) { c.strokeStyle = col; c.lineWidth = w || 1; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function shade(hex, f) { // f<0 darken, f>0 lighten
  let n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}

// ---------------- generic person ----------------
// o: skin, hair, hairStyle, shirt, sleeve, pants, skirt, shoes, t, moving, bend
function person(c, o) {
  const t = o.t || 0, mv = o.moving;
  const sw = mv ? Math.sin(t * 14) * 2.6 : 0;
  const bob = mv ? Math.abs(Math.sin(t * 14)) * 1.2 : 0;
  c.save(); c.translate(0, -bob);
  // legs
  c.fillStyle = o.legs || o.pants || o.skin;
  c.fillRect(-4.6 + sw * 0.5, -9, 3.3, 8.5);
  c.fillRect(1.3 - sw * 0.5, -9, 3.3, 8.5);
  c.fillStyle = o.shoes || '#1d1d22';
  c.fillRect(-5 + sw * 0.5, -1.8, 4.4, 2.2);
  c.fillRect(1 - sw * 0.5, -1.8, 4.4, 2.2);
  if (o.bend) c.translate(o.bend, 0);
  // hips / skirt
  if (o.skirt) poly(c, [[-6, -12.5], [6, -12.5], [8, -5], [-8, -5]], o.skirt);
  else box(c, -5.2, -12.5, 10.4, 4.5, o.pants);
  // back arm
  box(c, -8.4, -19, 2.8, 7, o.sleeve || o.shirt);
  cir(c, -7, -11.6, 1.6, o.skin);
  // torso
  rbox(c, -6, -20.5, 12, 9.5, 2.5, o.shirt);
  // head
  cir(c, 0.5, -25, 5.3, o.skin);
  hair(c, o);
  // eyes
  if (!o.noFace) {
    c.fillStyle = '#1b1b1b';
    c.fillRect(2.3, -24.2, 1.3, 1.7); c.fillRect(4.6, -24.2, 1.1, 1.7);
    c.fillStyle = 'rgba(150,60,50,0.8)'; c.fillRect(3.2, -21.6, 2, 0.7);
  }
  c.restore();
  return bob;
}
function hair(c, o) {
  const h = o.hair || '#151515';
  const st = o.hairStyle || 'short';
  if (st === 'none') return;
  c.fillStyle = h;
  c.beginPath(); c.arc(0.5, -25.6, 5.7, Math.PI * 0.95, Math.PI * 2.05); c.fill();
  box(c, -5, -27, 3.6, 5.2, h); // back of head
  if (st === 'bob') { box(c, -5.6, -27, 4.2, 8.5, h); box(c, 4.3, -27.5, 1.8, 4, h); poly(c, [[-5.6, -18.5], [-1.4, -18.5], [-1.4, -21]], h); }
  if (st === 'long') { box(c, -6, -27, 4.6, 12, h); }
  if (st === 'bun') { cir(c, -4.6, -29.2, 2.6, h); }
  if (st === 'pony') { poly(c, [[-4.5, -27], [-8.5, -24], [-9, -17], [-6.5, -18], [-4, -23]], h); }
}
function frontArm(c, o, ang, len) { // arm pivot at shoulder (4.6,-18.5)
  c.save(); c.translate(4.6, -18.5); c.rotate(ang || 0);
  box(c, -1.4, 0, 2.8, len || 7, o.sleeve || o.shirt);
  cir(c, 0, (len || 7) + 0.6, 1.7, o.skin);
  c.restore();
}

// ---------------- unit sprites ----------------
// s = render state { t, moving, atk(0..1), combat, harvest, carry, cast, energy... }
const SPR = {};

SPR.maid = (c, s) => {
  const o = { skin: '#c48d61', hair: '#141414', hairStyle: 'bun', shirt: '#ff4f9a', pants: '#2b2b35', t: s.t, moving: s.moving };
  if (s.combat) { // school bags on her back
    rbox(c, -12.5, -23, 7, 8, 1.5, '#2e6bd6'); rbox(c, -13.5, -16, 7.5, 7, 1.5, '#e8332e');
    box(c, -10, -22, 1, 6, '#173a7a');
  }
  person(c, o);
  box(c, -3, -21, 6, 2, '#d3102c'); // collar
  box(c, -2, -17.5, 4, 1, '#ffd1e4'); // logo
  // broom
  const a = s.combat ? (s.atk > 0 ? -1.4 + s.atk * 2.2 : -0.6) : (s.building ? Math.sin(s.t * 12) * 0.6 - 0.2 : 0.25);
  c.save(); c.translate(4.6, -16); c.rotate(a);
  ln(c, 0, -4, 0, 17, '#8a5a2b', 1.8);
  poly(c, [[-3.2, 15], [3.2, 15], [4.5, 22], [-4.5, 22]], '#e6c35c', '#a8862c', 0.6);
  c.restore();
  frontArm(c, o, s.combat ? (s.atk > 0 ? -1.2 + s.atk * 1.6 : -0.5) : 0.2, 6);
  if (s.combat) { // headband
    box(c, -4.6, -28.4, 10.6, 1.6, '#ffffff');
  }
};

SPR.acsboy = (c, s) => {
  const o = { skin: '#f0c9a2', hair: '#121212', hairStyle: 'short', shirt: '#f6f6f6', pants: '#4a4f60', t: s.t, moving: s.moving };
  person(c, o);
  // striped tie
  box(c, 0.2, -20, 2, 7, '#1d2d6b'); box(c, 0.2, -18.4, 2, 0.9, '#d8a720'); box(c, 0.2, -16, 2, 0.9, '#c0262d');
  box(c, -4, -18, 2.4, 1.6, '#c9a94b'); // badge
  if (s.harvest) {
    // phone to the ear
    c.save(); c.translate(4.6, -18.5); c.rotate(-2.6); box(c, -1.4, 0, 2.8, 7, o.shirt); c.restore();
    rbox(c, 4.6, -29, 2.6, 5, 0.8, '#222'); box(c, 5, -28.4, 1.8, 3.6, '#59b3ff');
  } else frontArm(c, o, 0.15, 7);
};

SPR.rugger = (c, s) => {
  c.save(); c.scale(1.32, 1.32);
  const o = { skin: '#a8714a', hair: '#141414', hairStyle: 'short', shirt: '#f2c230', pants: '#141414', legs: '#a8714a', shoes: '#202020', t: s.t, moving: s.moving };
  person(c, o);
  for (let i = 0; i < 3; i++) box(c, -6, -19 + i * 3, 12, 1.5, '#141414');
  // socks
  box(c, -4.6, -4, 3.3, 2.4, '#f2c230'); box(c, 1.3, -4, 3.3, 2.4, '#f2c230');
  // bulging muscles
  cir(c, -7, -16.5, 2.6, o.skin);
  const punch = s.atk > 0 ? Math.sin(s.atk * Math.PI) : 0;
  c.save(); c.translate(4.6, -18.5); c.rotate(-1.35 * punch + 0.25);
  cir(c, 0, 3, 3, o.skin); box(c, -2, 2, 4, 7 + punch * 4, o.skin); cir(c, 0, 9.5 + punch * 4, 2.8, '#8c5a39');
  c.restore();
  if (!s.atk) ell(c, 9.5, -12, 4.2, 2.8, '#8b4f25'), ln(c, 7, -12, 12, -12, '#fff', 0.5);
  c.restore();
};

SPR.mgsgirl = (c, s) => {
  const o = { skin: '#f1cba8', hair: '#151515', hairStyle: 'pony', shirt: '#fafafa', skirt: '#24427f', legs: '#f1cba8', shoes: '#f4f4f4', t: s.t, moving: s.moving };
  person(c, o);
  box(c, -3.5, -18, 2.4, 1.8, '#c9a94b');
  const ring = s.atk > 0 ? Math.sin(s.t * 40) * 0.35 : 0;
  const a = s.atk > 0 ? -1.9 : (s.cast > 0 ? -2.6 : 0.1);
  c.save(); c.translate(4.6, -18.5); c.rotate(a);
  box(c, -1.4, 0, 2.8, 7, o.shirt); cir(c, 0, 7.6, 1.7, o.skin);
  c.translate(0, 9); c.rotate(ring);
  box(c, -0.7, 0, 1.4, 3, '#5b3a1a');
  poly(c, [[-1.8, 2.5], [1.8, 2.5], [3.6, 7.5], [-3.6, 7.5]], '#f0c43c', '#9c7a1a', 0.6);
  cir(c, 0, 8, 1, '#9c7a1a');
  c.restore();
};

SPR.float = (c, s) => {
  const t = s.t, bob = Math.sin(t * 3) * 1.2;
  ell(c, 0, 0, 30, 7, 'rgba(0,0,0,0.25)');
  // wheels
  for (const wx of [-20, 20]) { cir(c, wx, -4, 5.5, '#222'); cir(c, wx, -4, 2.2, '#888'); }
  c.save(); c.translate(0, bob);
  // platform with scalloped skirt
  rbox(c, -30, -22, 60, 14, 3, '#ff7a3d', '#b4441a', 1);
  for (let i = 0; i < 8; i++) { cir(c, -26 + i * 7.4, -8, 3.6, i % 2 ? '#3ec7ff' : '#ffe14a'); }
  // giant smiley at the back
  cir(c, -10, -38, 15, '#ffdc2e'); c.strokeStyle = '#c8a000'; c.lineWidth = 1.2; c.beginPath(); c.arc(-10, -38, 15, 0, TAU); c.stroke();
  ell(c, -15, -42, 2, 3.2, '#222'); ell(c, -5, -42, 2, 3.2, '#222');
  c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.arc(-10, -38, 9, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  // kids
  const kids = [['#f6f6f6', '#1d2d6b'], ['#fafafa', '#24427f'], ['#f6f6f6', '#c0262d'], ['#fafafa', '#24427f']];
  for (let i = 0; i < 4; i++) {
    const kx = 2 + i * 7, ky = -24 - Math.abs(Math.sin(t * 6 + i)) * 2;
    box(c, kx - 2.5, ky - 5, 5, 6, kids[i][0]); box(c, kx - 0.5, ky - 5, 1, 4, kids[i][1]);
    cir(c, kx, ky - 7.5, 2.8, '#f0c9a2'); box(c, kx - 2.8, ky - 10.3, 5.6, 2.2, '#151515');
    ln(c, kx + 2, ky - 4, kx + 4, ky - 9 - Math.sin(t * 8 + i) * 2, '#f0c9a2', 1.3);
  }
  // confetti cannon
  c.save(); c.translate(22, -22); c.rotate(-0.5 - (s.atk > 0 ? 0.3 : 0));
  poly(c, [[0, -3], [12, -5], [12, 5], [0, 3]], '#9b59ff', '#5a2aa8', 0.8); c.restore();
  // balloons
  for (let i = 0; i < 3; i++) {
    const bx = -26 + i * 6, by = -52 - i * 3 + Math.sin(t * 2 + i) * 2;
    ln(c, -24 + i * 3, -22, bx, by + 4, '#999', 0.6);
    ell(c, bx, by, 3.4, 4.2, ['#ff4f6e', '#4fc3ff', '#7bff6a'][i]);
  }
  c.restore();
};

SPR.polorider = (c, s) => {
  const t = s.t, mv = s.moving, g = mv ? t * 15 : 0;
  ell(c, 0, 0, 20, 5, 'rgba(0,0,0,0.28)');
  const bob = mv ? Math.abs(Math.sin(g)) * 2 : 0;
  // legs (far pair darker)
  const leg = (x, ph, col) => {
    const a = mv ? Math.sin(g + ph) * 0.55 : 0;
    c.save(); c.translate(x, -15 - bob); c.rotate(a);
    box(c, -1.6, 0, 3.2, 8, col); c.translate(0, 8); c.rotate(mv ? Math.max(0, Math.sin(g + ph + 1)) * 0.7 : 0);
    box(c, -1.4, 0, 2.8, 7, col); box(c, -1.8, 6, 3.6, 1.8, '#2a1a10');
    c.restore();
  };
  leg(-11, 0.0, '#6b4222'); leg(9, Math.PI, '#6b4222');
  leg(-9, Math.PI * 0.6, '#8a5a32'); leg(11, Math.PI * 1.6, '#8a5a32');
  c.save(); c.translate(0, -bob);
  // tail
  c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, -23);
  c.quadraticCurveTo(-24, -20 + (mv ? Math.sin(g) * 3 : 0), -22, -10); c.stroke();
  // body, neck, head
  ell(c, 0, -20, 17, 8, '#8a5a32');
  poly(c, [[8, -25], [14, -21], [22, -37], [16, -40]], '#8a5a32');
  c.save(); c.translate(21, -38); c.rotate(0.5); ell(c, 2, 0, 7, 3.6, '#8a5a32'); c.restore();
  cir(c, 21, -40, 0.9, '#111');
  poly(c, [[16, -40], [18, -43], [19, -39]], '#6b4222');
  poly(c, [[9, -27], [15, -41], [12, -41], [7, -28]], '#2a1a10'); // mane
  ln(c, 23, -35, 12, -30, '#3a2a1a', 0.8); // reins
  // saddle cloth
  rbox(c, -7, -28, 14, 10, 2, '#1d3c8f', '#f2c230', 1);
  c.restore();
  // rider
  c.save(); c.translate(-1, -24 - bob); c.scale(0.82, 0.82);
  const o = { skin: '#f0c9a2', hair: '#121212', hairStyle: 'none', shirt: '#fbfbfb', pants: '#f3f0e6', legs: '#f3f0e6', shoes: '#3a2414', t, moving: false };
  person(c, o);
  box(c, 1.3, -7, 3.6, 7, '#3a2414'); // riding boot
  box(c, -1.5, -20, 4, 2, '#1d3c8f'); box(c, -3.6, -17.5, 2.4, 2, '#c9a94b');
  // helmet
  c.fillStyle = '#1d3c8f'; c.beginPath(); c.arc(0.5, -26, 6, Math.PI, TAU); c.fill(); box(c, 2, -26.3, 6.5, 1.4, '#13285e');
  // mallet arm
  const a = s.atk > 0 ? -2.6 + s.atk * 3.4 : -0.5;
  c.save(); c.translate(4.6, -18.5); c.rotate(a);
  box(c, -1.4, 0, 2.8, 7, o.shirt); cir(c, 0, 7.6, 1.7, o.skin);
  ln(c, 0, 7, 0, 30, '#c8a46a', 1.4);
  box(c, -3.5, 29, 7, 3, '#e8e2d0');
  c.restore();
  c.restore();
};

SPR.chimera = (c, s) => {
  const t = s.t;
  ell(c, 0, 0, 44, 10, 'rgba(0,0,0,0.28)');
  // serpentine dragon body (drawn back to front)
  const seg = 13;
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const k = i / (seg - 1);
    pts.push([-48 + k * 62, -26 - Math.sin(t * 3 - i * 0.7) * 7 - k * 4]);
  }
  // legs with eagle claws
  for (const li of [3, 8]) {
    const [lx, ly] = pts[li];
    for (const off of [-3, 4]) {
      const st = s.moving ? Math.sin(t * 8 + li + off) * 3 : 0;
      ln(c, lx + off, ly + 3, lx + off + st, -4, '#b31b1b', 4);
      for (let k = -1; k <= 1; k++) ln(c, lx + off + st, -4, lx + off + st + k * 3 + 1.5, 0, '#f4f0dc', 1.6);
    }
  }
  for (let i = 0; i < seg; i++) {
    const [x, y] = pts[i]; const r = 6 + Math.sin(i / seg * Math.PI) * 4;
    cir(c, x, y, r, i % 2 ? '#c41e1e' : '#d93a1f');
    ell(c, x, y + r * 0.45, r * 0.8, r * 0.35, '#f2c230');
    poly(c, [[x - 2.5, y - r + 1], [x, y - r - 5], [x + 2.5, y - r + 1]], '#f2c230');
  }
  // tail flame
  const [tx, ty] = pts[0];
  poly(c, [[tx, ty], [tx - 10, ty - 6 + Math.sin(t * 9) * 3], [tx - 7, ty + 2], [tx - 12, ty + 6]], '#ffb21e');
  // lion head
  const [hx, hy0] = pts[seg - 1]; const hx2 = hx + 12, hy = hy0 - 4;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU + Math.sin(t * 4) * 0.05;
    poly(c, [[hx2 + Math.cos(a) * 9, hy + Math.sin(a) * 9], [hx2 + Math.cos(a + 0.22) * 18, hy + Math.sin(a + 0.22) * 18], [hx2 + Math.cos(a + 0.45) * 9, hy + Math.sin(a + 0.45) * 9]], i % 2 ? '#e88a12' : '#c7600b');
  }
  cir(c, hx2, hy, 11, '#f0b432');
  ell(c, hx2 + 6, hy + 4, 6, 4.5, '#f6d58a');
  cir(c, hx2 + 2, hy - 4, 2.2, '#fff'); cir(c, hx2 + 2.6, hy - 4, 1.2, '#c00');
  cir(c, hx2 + 8, hy - 4, 1.9, '#fff'); cir(c, hx2 + 8.5, hy - 4, 1, '#c00');
  ell(c, hx2 + 10, hy + 1, 2, 1.4, '#5a2a0a');
  // horns & whiskers
  ln(c, hx2 - 2, hy - 9, hx2 - 8, hy - 20, '#f4f0dc', 2); ln(c, hx2 + 3, hy - 10, hx2 + 2, hy - 21, '#f4f0dc', 2);
  c.strokeStyle = '#f2c230'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx2 + 10, hy + 3);
  c.quadraticCurveTo(hx2 + 20, hy + 2 + Math.sin(t * 5) * 4, hx2 + 26, hy + 10); c.stroke();
  const open = s.atk > 0 ? 5 : 1.5;
  ell(c, hx2 + 8, hy + 7, 4.5, open, '#5a0c0c');
  box(c, hx2 + 5, hy + 6.5 - open * 0.5, 1.2, 1.6, '#fff'); box(c, hx2 + 9, hy + 6.5 - open * 0.5, 1.2, 1.6, '#fff');
};

SPR.farmer = (c, s) => {
  const o = { skin: '#b9814f', hair: '#1a1a1a', hairStyle: 'short', shirt: '#4f6f93', pants: '#3d3a2c', legs: '#b9814f', t: s.t, moving: s.moving, bend: s.harvest ? 1.5 : 0 };
  box(c, -4.6, -9, 3.3, 3, '#3d3a2c'); box(c, 1.3, -9, 3.3, 3, '#3d3a2c');
  if (s.carry) { cir(c, -8, -18, 6, '#e3d2a6'); ln(c, -11, -21, -5, -15, '#b9a272', 0.8); }
  person(c, o);
  const a = s.harvest ? Math.sin(s.t * 9) * 0.8 + 0.5 : (s.atk > 0 ? -1 + s.atk * 2 : (s.building ? Math.sin(s.t * 12) * 0.7 - 0.3 : 0.3));
  c.save(); c.translate(4.6 + (o.bend || 0), -18.5); c.rotate(a);
  box(c, -1.4, 0, 2.8, 7, o.shirt); cir(c, 0, 7.6, 1.7, o.skin);
  if (s.building) { ln(c, 0, 7, 0, 13, '#7a5530', 1.5); box(c, -2.5, 12, 5, 3, '#777'); }
  else { ln(c, 0, 7, 0, 11, '#7a5530', 1.5); c.strokeStyle = '#ccc'; c.lineWidth = 1.4; c.beginPath(); c.arc(3, 11, 3.4, Math.PI, TAU * 0.9); c.stroke(); }
  c.restore();
  // conical straw hat
  c.save(); c.translate(o.bend || 0, 0);
  poly(c, [[-11, -26], [12, -26], [0.5, -35]], '#dcb565', '#a5823a', 0.8);
  ln(c, -6, -27.5, 6, -27.5, '#b8944a', 0.6);
  c.restore();
};

SPR.hwachie = (c, s) => {
  const o = { skin: '#f0c9a2', hair: '#111', hairStyle: 'short', shirt: '#fbfbfb', pants: '#2b2f4a', t: s.t, moving: s.moving };
  person(c, o);
  // glasses
  c.strokeStyle = '#222'; c.lineWidth = 0.7; c.strokeRect(1.9, -24.6, 2.3, 2.4); c.strokeRect(4.5, -24.6, 2, 2.4); ln(c, 4.2, -23.5, 4.5, -23.5, '#222', 0.6);
  box(c, -3.6, -18.5, 2.4, 2, '#c8102e');
  const a = s.atk > 0 ? -1.45 : -0.9;
  c.save(); c.translate(4.6, -18.5); c.rotate(a);
  box(c, -1.4, 0, 2.8, 7, o.shirt); cir(c, 0, 7.6, 1.7, o.skin);
  ln(c, 0, 5, 0, 15, '#6b3e1a', 2.2);
  c.translate(0, 15);
  const f = Math.sin(s.t * 18) * 1.2;
  poly(c, [[-3, 0], [3, 0], [1.5 + f, 7], [0, 10 + f], [-1.5 - f, 7]], '#ff6a00');
  poly(c, [[-1.6, 0], [1.6, 0], [0, 6 + f]], '#ffe14a');
  c.restore();
};

SPR.wushu = (c, s) => {
  const o = { skin: '#efc6a0', hair: '#121212', hairStyle: 'short', shirt: '#d6161c', sleeve: '#d6161c', pants: '#c8121a', shoes: '#151515', t: s.t, moving: s.moving };
  person(c, o);
  ln(c, -6, -20, 0, -11.5, '#f2c230', 1); ln(c, 0, -20.5, 0, -11.5, '#f2c230', 0.8);
  box(c, -5.2, -12.6, 10.4, 1.4, '#f2c230');
  const a = s.atk > 0 ? -2.4 + s.atk * 3.2 : -2.2;
  c.save(); c.translate(4.6, -18.5); c.rotate(a);
  box(c, -1.4, 0, 2.8, 7, o.sleeve); cir(c, 0, 7.6, 1.7, o.skin);
  // dao broadsword
  box(c, -0.8, 6, 1.6, 4, '#3a2a1a'); box(c, -2.5, 9.5, 5, 1.2, '#f2c230');
  c.beginPath(); c.moveTo(-1, 10.5); c.lineTo(-1.6, 24); c.quadraticCurveTo(2, 27, 4.8, 22); c.lineTo(2, 10.5); c.closePath();
  c.fillStyle = '#e6eaf0'; c.fill(); c.strokeStyle = '#9aa3b0'; c.lineWidth = 0.6; c.stroke();
  ln(c, 0, 6, -3, 3, '#e01c1c', 1.6);
  c.restore();
};

SPR.nanyang = (c, s) => {
  const o = { skin: '#f3cfae', hair: '#101010', hairStyle: 'bob', shirt: '#fbfbfb', sleeve: '#f3cfae', skirt: '#ececec', legs: '#f3cfae', shoes: '#fafafa', t: s.t, moving: s.moving };
  person(c, o);
  box(c, 1.6, -19, 3.4, 1.8, '#d21c2c'); box(c, 1.6, -19, 3.4, 0.6, '#f5d000');
  if (s.cast > 0 || s.atk > 0) {
    const g = 0.5 + Math.sin(s.t * 20) * 0.3;
    frontArm(c, o, -2.2, 7);
    cir(c, 8, -27, 3.2 + g, 'rgba(255,230,90,0.85)'); cir(c, 8, -27, 1.6, '#fff');
  } else frontArm(c, o, 0.1, 7);
};

SPR.exchange = (c, s) => {
  c.save();
  c.globalAlpha = 0.78 + Math.sin(s.t * 6) * 0.12;
  ell(c, 0, -13, 13, 18, 'rgba(120,220,255,0.25)');
  const o = { skin: '#f2d4b8', hair: '#121212', hairStyle: 'short', shirt: '#ffffff', pants: '#1e2a44', t: s.t, moving: s.moving };
  c.translate(0, -3 - Math.sin(s.t * 3) * 1.5);
  person(c, o);
  // lanyard & student pass
  ln(c, -2, -20, 0.5, -14, '#c8102e', 0.9); ln(c, 3, -20, 0.5, -14, '#c8102e', 0.9);
  rbox(c, -1.8, -14.5, 4.8, 5.6, 0.6, '#ffffff', '#3577d4', 0.7); box(c, -1.2, -13.8, 1.6, 1.6, '#8bb4f0');
  frontArm(c, o, s.atk > 0 ? -1.5 : 0.1, 7);
  c.restore();
};

SPR.archon = (c, s) => {
  const t = s.t, y = -30 + Math.sin(t * 2.4) * 3;
  ell(c, 0, 0, 18, 5, 'rgba(0,0,0,0.25)');
  const g = c.createRadialGradient(0, y, 2, 0, y, 26);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(255,224,80,0.8)'); g.addColorStop(0.75, 'rgba(70,130,255,0.55)'); g.addColorStop(1, 'rgba(70,130,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, y, 26, 0, TAU); c.fill();
  // yin-yang swirl
  c.save(); c.translate(0, y); c.rotate(t * 1.5);
  c.fillStyle = 'rgba(255,215,40,0.85)'; c.beginPath(); c.arc(0, 0, 10, -Math.PI / 2, Math.PI / 2); c.arc(0, 5, 5, Math.PI / 2, -Math.PI / 2, true); c.arc(0, -5, 5, Math.PI / 2, -Math.PI / 2); c.fill();
  c.fillStyle = 'rgba(40,90,220,0.85)'; c.beginPath(); c.arc(0, 0, 10, Math.PI / 2, Math.PI * 1.5); c.arc(0, -5, 5, -Math.PI / 2, Math.PI / 2, true); c.arc(0, 5, 5, -Math.PI / 2, Math.PI / 2); c.fill();
  c.restore();
  // two girls silhouettes back to back
  for (const sx of [-1, 1]) {
    c.save(); c.translate(sx * 7, y + 14); c.scale(sx * 0.75, 0.75); c.globalAlpha = 0.85;
    person(c, { skin: '#fff6e0', hair: '#202040', hairStyle: 'bob', shirt: '#ffffff', sleeve: '#fff6e0', skirt: '#f0f0f0', legs: '#fff6e0', shoes: '#fff', t, noFace: false });
    c.restore();
  }
  for (let i = 0; i < 6; i++) {
    const a = t * 3 + i * TAU / 6;
    cir(c, Math.cos(a) * 20, y + Math.sin(a) * 8, 1.6, i % 2 ? '#ffe14a' : '#7fb0ff');
  }
};

SPR.riotbus = (c, s) => {
  const t = s.t, fl = Math.sin(t * 2) * 2 - 3;
  ell(c, 0, 0, 30, 6, 'rgba(40,255,160,0.18)');
  c.save(); c.translate(0, fl);
  c.globalAlpha = 0.92;
  // ghostly glow
  rbox(c, -33, -34, 66, 32, 8, 'rgba(110,255,190,0.18)');
  // body
  rbox(c, -30, -31, 58, 26, 6, '#e9e1c6', '#7d7660', 1);
  rbox(c, 22, -27, 10, 22, 4, '#e9e1c6', '#7d7660', 1); // rounded nose
  box(c, -30, -15, 62, 4, '#2e4a3a');
  // windows with ghost faces
  for (let i = 0; i < 6; i++) {
    const wx = -27 + i * 8.5;
    rbox(c, wx, -28, 7, 9, 1.5, '#33423b');
    const gb = Math.sin(t * 4 + i) * 1;
    cir(c, wx + 3.5, -23.5 + gb, 2.4, 'rgba(200,255,230,0.7)');
    box(c, wx + 2.4, -24.5 + gb, 0.8, 1, '#123'); box(c, wx + 4, -24.5 + gb, 0.8, 1, '#123');
  }
  rbox(c, 26, -27, 5, 8, 1.5, '#33423b');
  // grill & lamp
  box(c, 29, -12, 3, 6, '#6b6656'); cir(c, 30.5, -9, 1.5, '#fffbbd');
  c.fillStyle = '#2e4a3a'; c.font = 'bold 4px sans-serif'; c.fillText('HOCK LEE', -20, -6.5);
  c.globalAlpha = 1;
  for (const wx of [-18, 18]) { cir(c, wx, -4, 5.5, '#2a2a2a'); cir(c, wx, -4, 2.2, '#aaa'); }
  c.restore();
  // wisps
  for (let i = 0; i < 3; i++) {
    const wx = -34 - i * 6, wy = -18 + Math.sin(t * 5 + i) * 4 + fl;
    cir(c, wx, wy, 3 - i * 0.7, 'rgba(160,255,210,' + (0.4 - i * 0.1) + ')');
  }
};

SPR.tankahkee = (c, s) => {
  const t = s.t, mv = s.moving;
  const st = mv ? Math.sin(t * 10) * 3 : 0;
  ell(c, 0, 0, 24, 6, 'rgba(0,0,0,0.25)');
  // panda legs
  box(c, -16 + st, -10, 7, 10, '#151515'); box(c, 9 - st, -10, 7, 10, '#151515');
  box(c, -10 - st, -10, 6, 9, '#151515'); box(c, 4 + st, -10, 6, 9, '#151515');
  // panda body
  ell(c, 0, -17, 20, 11, '#f6f6f2');
  ell(c, 0, -15, 20, 5, '#151515');
  // panda head
  cir(c, 19, -24, 9, '#f6f6f2');
  cir(c, 14, -32, 3.5, '#151515'); cir(c, 24, -32, 3.5, '#151515');
  ell(c, 18, -25, 2.6, 3.4, '#151515'); ell(c, 24, -25, 2.4, 3.2, '#151515');
  cir(c, 18.5, -25.5, 0.9, '#fff'); cir(c, 24, -25.5, 0.9, '#fff');
  ell(c, 25, -20.5, 2.2, 1.5, '#151515');
  // rider
  c.save(); c.translate(-3, -24);
  box(c, -4, -2, 9, 5, '#2b3048'); // legs over panda
  rbox(c, -5, -14, 11, 12, 2.5, '#2b3048');
  box(c, 0, -14, 1.4, 6, '#f6f6f6'); box(c, 0.2, -13, 1, 5, '#7a1d1d');
  cir(c, 1, -18.5, 5, '#e2b48a');
  c.strokeStyle = '#111'; c.lineWidth = 0.8;
  c.beginPath(); c.arc(2.4, -19, 1.6, 0, TAU); c.stroke(); c.beginPath(); c.arc(5.4, -19, 1.5, 0, TAU); c.stroke();
  box(c, 2.2, -16.3, 3, 0.8, '#222'); // moustache
  // fedora
  ell(c, 1, -22.5, 8, 2.2, '#6e563d'); rbox(c, -3.5, -28, 9, 6, 2, '#7d6447'); box(c, -3.5, -24.2, 9, 1.4, '#3a2a1c');
  // gun arm
  const a = s.atk > 0 ? -1.62 : -1.2;
  c.save(); c.translate(3.5, -11); c.rotate(a);
  box(c, -1.5, 0, 3, 8, '#2b3048'); cir(c, 0, 8.5, 1.7, '#e2b48a');
  box(c, -1, 8, 2, 9, '#333'); box(c, -1.6, 8, 3.2, 3, '#5a3a20');
  if (s.atk > 0.6) cir(c, 0, 18.5, 2.8, '#ffe14a');
  c.restore();
  c.restore();
};

// ---------------- buildings ----------------
// drawn at footprint top-left; W/H pixel size; may extend upward
const BLD = {};

function pennant(c, x, y, col) { ln(c, x, y, x, y - 14, '#333', 1.2); poly(c, [[x, y - 14], [x + 9, y - 11], [x, y - 8]], col); }
function shadowRect(c, x, y, w, h) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x + 4, y + 4, w, h); }
function windowsRow(c, x, y, n, gap, w, h, col) { for (let i = 0; i < n; i++) box(c, x + i * gap, y, w, h, col); }

BLD.schoolhall = (c, W, H, s) => {
  shadowRect(c, 6, 40, W - 12, H - 46);
  box(c, 2, H - 14, W - 4, 12, '#b9b2a0'); // steps/plinth
  for (let i = 0; i < 3; i++) box(c, W / 2 - 18 + i * 2, H - 14 + i * 4, 36 - i * 4, 4, '#d8d2c2');
  box(c, 8, 44, W - 16, H - 58, '#f4f1e8');
  windowsRow(c, 14, 54, 8, 13.5, 7, 14, '#2d4b7c');
  windowsRow(c, 14, 78, 8, 13.5, 7, 12, '#2d4b7c');
  for (let i = 0; i < 6; i++) box(c, 12 + i * 21, 50, 3.5, H - 64, '#ffffff');
  poly(c, [[2, 46], [W / 2, 22], [W - 2, 46]], '#1d3c8f', '#13285e', 1.5);
  // clock tower
  box(c, W / 2 - 12, -10, 24, 50, '#f4f1e8'); box(c, W / 2 - 12, -10, 24, 3, '#ddd6c4');
  poly(c, [[W / 2 - 15, -10], [W / 2, -30], [W / 2 + 15, -10]], '#1d3c8f');
  cir(c, W / 2, 6, 8, '#fffbe8'); c.strokeStyle = '#333'; c.lineWidth = 1; c.beginPath(); c.arc(W / 2, 6, 8, 0, TAU); c.stroke();
  const a = (s.t || 0) * 0.3; ln(c, W / 2, 6, W / 2 + Math.cos(a) * 6, 6 + Math.sin(a) * 6, '#222', 1.2); ln(c, W / 2, 6, W / 2, 1.5, '#222', 1.4);
  rbox(c, W / 2 - 7, H - 34, 14, 20, 6, '#6b3e1a');
  // crest
  poly(c, [[W / 2 - 6, 30], [W / 2 + 6, 30], [W / 2 + 6, 37], [W / 2, 41], [W / 2 - 6, 37]], '#f2c230', '#1d3c8f', 1);
};

BLD.bungalow = (c, W, H, s) => {
  box(c, 0, 0, W, H, '#5fae4a');
  rbox(c, 6, H - 30, 34, 22, 3, '#4fd3f2', '#e8e8e8', 2);
  ln(c, 12, H - 28, 12, H - 10, '#9be8fa', 1); ln(c, 20, H - 28, 20, H - 10, '#9be8fa', 1); ln(c, 28, H - 28, 28, H - 10, '#9be8fa', 1);
  shadowRect(c, 34, 14, W - 40, 44);
  box(c, 34, 22, W - 40, 38, '#fbfbf7');
  poly(c, [[30, 26], [34 + (W - 40) / 2, 2], [W - 2, 26]], '#b6452c', '#7a2a18', 1);
  windowsRow(c, 40, 32, 3, 14, 9, 10, '#7fc0e0');
  box(c, 52, 46, 10, 14, '#7a4a20');
  // supercar
  rbox(c, W - 34, H - 18, 26, 10, 4, '#d8141a'); rbox(c, W - 28, H - 22, 13, 6, 3, '#9fd5ff');
  cir(c, W - 28, H - 8, 2.8, '#111'); cir(c, W - 13, H - 8, 2.8, '#111');
};

BLD.rugbypitch = (c, W, H, s) => {
  box(c, 0, 0, W, H, '#3f9a3a');
  for (let i = 0; i < 6; i++) box(c, i * W / 6, 0, W / 12, H, 'rgba(255,255,255,0.05)');
  c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.strokeRect(10, 14, W - 20, H - 22);
  ln(c, W / 2, 14, W / 2, H - 8, '#fff', 1.2); ln(c, 34, 14, 34, H - 8, 'rgba(255,255,255,0.6)', 1); ln(c, W - 34, 14, W - 34, H - 8, 'rgba(255,255,255,0.6)', 1);
  // H-posts
  for (const px of [12, W - 12]) {
    ln(c, px, H / 2 - 12, px, H / 2 - 40, '#fff', 2); ln(c, px, H / 2 + 10, px, H / 2 - 18, '#fff', 2);
    ln(c, px - 1, H / 2 - 4, px + 1, H / 2 - 4, '#fff', 2);
  }
  // stand
  box(c, 16, 0, W - 32, 12, '#2a2a2a');
  for (let i = 0; i < 18; i++) cir(c, 22 + i * ((W - 44) / 17), 5 + (i % 2) * 2, 2, i % 2 ? '#f2c230' : '#1d3c8f');
  ell(c, W / 2 + 18, H / 2 + 8, 4, 2.6, '#8b4f25');
};

BLD.chapel = (c, W, H, s) => {
  shadowRect(c, 10, 30, W - 20, H - 34);
  box(c, 10, 34, W - 20, H - 38, '#fbfaf5');
  poly(c, [[6, 38], [W / 2, 12], [W - 6, 38]], '#3a3f55', '#24283a', 1);
  // steeple
  box(c, W / 2 - 8, -6, 16, 30, '#fbfaf5');
  poly(c, [[W / 2 - 10, -6], [W / 2, -30], [W / 2 + 10, -6]], '#3a3f55');
  box(c, W / 2 - 1.2, -44, 2.4, 14, '#f2c230'); box(c, W / 2 - 5, -40, 10, 2.4, '#f2c230');
  // rose window
  const rg = ['#e8333a', '#2f7de1', '#f2c230', '#3bbf5a'];
  for (let i = 0; i < 8; i++) { c.fillStyle = rg[i % 4]; c.beginPath(); c.moveTo(W / 2, 48); c.arc(W / 2, 48, 8, i * TAU / 8, (i + 1) * TAU / 8); c.fill(); }
  // arch door
  rbox(c, W / 2 - 7, H - 24, 14, 20, 7, '#6b3e1a');
  for (const wx of [18, W - 26]) rbox(c, wx, 50, 8, 18, 4, '#5a8fd6');
};

BLD.carnival = (c, W, H, s) => {
  const t = s.t || 0;
  box(c, 0, H - 10, W, 10, '#c9b27a');
  // ferris wheel
  const fx = W - 32, fy = 26;
  ln(c, fx - 12, H - 8, fx, fy, '#888', 2); ln(c, fx + 12, H - 8, fx, fy, '#888', 2);
  c.strokeStyle = '#ddd'; c.lineWidth = 1.4; c.beginPath(); c.arc(fx, fy, 24, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = t * 0.6 + i * TAU / 8;
    ln(c, fx, fy, fx + Math.cos(a) * 24, fy + Math.sin(a) * 24, '#bbb', 0.8);
    rbox(c, fx + Math.cos(a) * 24 - 3, fy + Math.sin(a) * 24, 6, 5, 1, ['#ff4f6e', '#4fc3ff', '#ffe14a', '#7bff6a'][i % 4]);
  }
  // striped circus tent
  const tx = 8, tw = W * 0.55, ty = 30;
  for (let i = 0; i < 8; i++) {
    poly(c, [[tx + i * tw / 8, H - 8], [tx + (i + 1) * tw / 8, H - 8], [tx + tw / 2, ty - 18]], i % 2 ? '#ffffff' : '#e8202a');
  }
  poly(c, [[tx + tw / 2 - 7, H - 8], [tx + tw / 2 + 7, H - 8], [tx + tw / 2, H - 26]], '#3a1010');
  ln(c, tx + tw / 2, ty - 18, tx + tw / 2, ty - 30, '#333', 1);
  poly(c, [[tx + tw / 2, ty - 30], [tx + tw / 2 + 9, ty - 27], [tx + tw / 2, ty - 24]], '#f2c230');
  // bunting
  for (let i = 0; i < 10; i++) poly(c, [[6 + i * 12, 6], [14 + i * 12, 6], [10 + i * 12, 12]], ['#ff4f6e', '#4fc3ff', '#ffe14a'][i % 3]);
  ln(c, 4, 6, W - 60, 6, '#555', 0.6);
};

BLD.familyoffice = (c, W, H, s) => {
  shadowRect(c, 14, -10, W - 28, H + 6);
  const g = c.createLinearGradient(14, 0, W - 14, 0); g.addColorStop(0, '#2a6fa8'); g.addColorStop(0.5, '#8fd0ff'); g.addColorStop(1, '#1d4f80');
  c.fillStyle = g; c.fillRect(14, -26, W - 28, H + 22);
  for (let y = -22; y < H - 8; y += 8) ln(c, 14, y, W - 14, y, 'rgba(255,255,255,0.35)', 0.8);
  for (let x = 20; x < W - 14; x += 9) ln(c, x, -26, x, H - 4, 'rgba(10,40,80,0.35)', 0.8);
  box(c, 14, -30, W - 28, 4, '#c9a94b');
  c.fillStyle = '#f2c230'; c.font = 'bold 20px Georgia'; c.textAlign = 'center'; c.fillText('$', W / 2, -36); c.textAlign = 'left';
  box(c, W / 2 - 8, H - 18, 16, 14, '#173a5e');
  box(c, 6, H - 6, W - 12, 4, '#9a9a9a');
};

BLD.cathedral = (c, W, H, s) => {
  const t = s.t || 0;
  const glow = c.createRadialGradient(W / 2, 20, 4, W / 2, 20, 80);
  glow.addColorStop(0, 'rgba(255,220,100,' + (0.35 + Math.sin(t * 2) * 0.1) + ')'); glow.addColorStop(1, 'rgba(255,220,100,0)');
  c.fillStyle = glow; c.fillRect(-20, -50, W + 40, H + 60);
  shadowRect(c, 10, 24, W - 20, H - 26);
  box(c, 12, 30, W - 24, H - 32, '#ece6d8');
  for (const sx of [10, W - 30]) {
    box(c, sx, -10, 20, H - 6, '#e2dccb');
    poly(c, [[sx - 2, -10], [sx + 10, -46], [sx + 22, -10]], '#c9a94b', '#8a6d1d', 1);
    rbox(c, sx + 6, 6, 8, 16, 4, '#4c6fb8');
  }
  poly(c, [[24, 32], [W / 2, 2], [W - 24, 32]], '#d7cfb8', '#a39980', 1);
  const rg = ['#e8333a', '#2f7de1', '#f2c230', '#3bbf5a', '#a14de0'];
  for (let i = 0; i < 10; i++) { c.fillStyle = rg[i % 5]; c.beginPath(); c.moveTo(W / 2, 50); c.arc(W / 2, 50, 12, i * TAU / 10, (i + 1) * TAU / 10); c.fill(); }
  rbox(c, W / 2 - 10, H - 30, 20, 28, 10, '#5a3416');
  // golden statue of Mr. Oldham
  c.save(); c.translate(W / 2, 4);
  person(c, { skin: '#f2c230', hair: '#c9a020', hairStyle: 'short', shirt: '#e6b422', pants: '#c9a020', shoes: '#c9a020', noFace: true });
  c.restore();
};

BLD.poloclub = (c, W, H, s) => {
  const t = s.t || 0;
  box(c, 0, 0, W, H, '#56a844');
  for (let i = 0; i < 8; i++) box(c, i * W / 8, 0, W / 16, H, 'rgba(255,255,255,0.05)');
  // white rail fence
  c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.strokeRect(3, 26, W - 6, H - 30);
  for (let x = 3; x <= W - 3; x += 14) ln(c, x, 26, x, H - 4, '#ffffff', 1.2);
  ln(c, 3, H - 10, W - 3, H - 10, '#ffffff', 1);
  // goal posts
  for (const gx of [12, W - 12]) { ln(c, gx, H / 2 + 2, gx, H / 2 + 22, '#f2c230', 2); }
  // stable block
  shadowRect(c, W - 62, 0, 56, 30);
  box(c, W - 62, 4, 56, 26, '#f4efe2');
  poly(c, [[W - 66, 8], [W - 34, -12], [W - 2, 8]], '#9c2f1e', '#5e1a10', 1);
  for (let i = 0; i < 3; i++) {
    const dx = W - 58 + i * 18;
    box(c, dx, 12, 14, 16, '#5a3416'); box(c, dx, 12, 14, 7, '#2a1a0c');
    ell(c, dx + 8, 17, 3.2, 2.6, i === 1 ? '#f0e6d0' : '#8a5a32'); // horse heads
  }
  box(c, W - 35, -18, 2, 8, '#ddd'); // weathervane
  poly(c, [[W - 34, -20], [W - 24, -17 + Math.sin(t * 2)], [W - 34, -14]], '#1d3c8f');
  // clubhouse sign
  rbox(c, 6, 4, 60, 16, 3, '#1d3c8f', '#f2c230', 1.2);
  c.fillStyle = '#f2c230'; c.font = 'bold 8px Georgia'; c.textAlign = 'center'; c.fillText('POLO CLUB', 36, 15); c.textAlign = 'left';
  // ball
  cir(c, W / 2 - 8, H / 2 + 14, 2.2, '#ffffff');
};

BLD.guardhouse = (c, W, H, s) => {
  shadowRect(c, 8, 10, W - 26, H - 16);
  box(c, 8, 16, W - 28, H - 20, '#e8e2d0');
  box(c, 4, 10, W - 20, 6, '#2b4f8a');
  box(c, 12, 22, W - 36, 12, '#8fd0ff');
  // guard
  c.save(); c.translate(20, 40); c.scale(0.7, 0.7);
  person(c, { skin: '#b07a4f', hair: '#111', shirt: '#2b4f8a', pants: '#1b2b4a', t: s.t }); c.restore();
  // boom gate
  box(c, W - 14, H - 22, 6, 18, '#666');
  const up = s.attacking ? -0.9 : 0;
  c.save(); c.translate(W - 11, H - 20); c.rotate(up);
  for (let i = 0; i < 6; i++) box(c, -i * 7 - 7, -2, 7, 4, i % 2 ? '#fff' : '#e8202a');
  c.restore();
};

BLD.jadepagoda = (c, W, H, s) => {
  shadowRect(c, 10, 20, W - 20, H - 22);
  box(c, 2, H - 14, W - 4, 12, '#8d8577'); box(c, 6, H - 18, W - 12, 4, '#a39b8c');
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, w = (W - 24) * (1 - k * 0.55), x = W / 2 - w / 2;
    const yb = H - 18 - i * 30, ht = 22;
    box(c, x + 4, yb - ht, w - 8, ht, '#b31b1b');
    for (let p = 0; p < 4; p++) box(c, x + 6 + p * (w - 16) / 3, yb - ht, 2.4, ht, '#7a0f0f');
    box(c, x + 10, yb - ht + 5, w - 20, 7, 'rgba(255,215,90,0.6)');
    // jade roof with upturned eaves
    c.beginPath(); c.moveTo(x - 10, yb - ht - 2);
    c.quadraticCurveTo(x, yb - ht + 2, x + 10, yb - ht - 6); c.lineTo(x + w - 10, yb - ht - 6);
    c.quadraticCurveTo(x + w, yb - ht + 2, x + w + 10, yb - ht - 2);
    c.lineTo(x + w - 6, yb - ht - 14); c.lineTo(x + 6, yb - ht - 14); c.closePath();
    const g = c.createLinearGradient(0, yb - ht - 14, 0, yb - ht); g.addColorStop(0, '#2ee39b'); g.addColorStop(1, '#0d8a5a');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#06603c'; c.lineWidth = 1; c.stroke();
  }
  const topY = H - 18 - tiers * 30 + 8 - 14;
  ln(c, W / 2, topY, W / 2, topY - 16, '#f2c230', 2.5);
  cir(c, W / 2, topY - 18, 3.5, '#f2c230');
  rbox(c, W / 2 - 7, H - 34, 14, 16, 4, '#3a0a0a');
};

BLD.ricepaddy = (c, W, H, s) => {
  const amt = s.amount != null ? Math.max(0, Math.min(1, s.amount / (s.max || 1200))) : 1;
  box(c, 0, 0, W, H, '#7a5b37');
  box(c, 3, 3, W - 6, H - 6, '#5e9fa0');
  box(c, 3, 3, W - 6, H - 6, 'rgba(80,140,60,' + (0.35 * amt) + ')');
  const rows = 5, cols = 12;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    if (((r * 7 + q * 3) % 10) / 10 > amt + 0.05) continue;
    const x = 7 + q * (W - 14) / (cols - 1), y = 9 + r * (H - 16) / (rows - 1);
    const sw = Math.sin((s.t || 0) * 1.5 + q * 0.5) * 0.8;
    ln(c, x, y + 2, x - 1.6 + sw, y - 3, '#6cc24a', 1); ln(c, x, y + 2, x + 1.6 + sw, y - 3, '#9be05a', 1);
  }
  for (const yy of [H / 2]) ln(c, 3, yy, W - 3, yy, '#7a5b37', 2);
};

BLD.granary = (c, W, H, s) => {
  shadowRect(c, 6, 14, W - 12, H - 16);
  box(c, 8, 22, W - 16, H - 24, '#c99a5a');
  for (let i = 0; i < 4; i++) ln(c, 8, 26 + i * 8, W - 8, 26 + i * 8, '#9d7440', 1);
  poly(c, [[2, 24], [W / 2, -2], [W - 2, 24]], '#d8be6a', '#a68b3a', 1);
  for (let i = 0; i < 5; i++) ln(c, 6 + i * 12, 22, W / 2, 0, 'rgba(120,90,30,0.4)', 0.8);
  box(c, W / 2 - 5, H - 16, 10, 14, '#5a3a1a');
  ell(c, 8, H - 6, 6, 5, '#efe3c2'); ell(c, W - 9, H - 6, 6, 5, '#efe3c2');
};

BLD.clanhouse = (c, W, H, s) => {
  const t = s.t || 0;
  shadowRect(c, 6, 26, W - 12, H - 28);
  box(c, 8, 30, W - 16, H - 32, '#c4271f');
  c.beginPath(); c.moveTo(-2, 34); c.quadraticCurveTo(10, 30, 14, 20); c.lineTo(W - 14, 20); c.quadraticCurveTo(W - 10, 30, W + 2, 34);
  c.lineTo(W - 4, 26); c.lineTo(4, 26); c.closePath();
  c.fillStyle = '#1f7a4c'; c.fill(); c.strokeStyle = '#0c4a2c'; c.stroke();
  box(c, 12, 12, W - 24, 9, '#1f7a4c');
  rbox(c, W / 2 - 16, 36, 32, 11, 2, '#1a1a1a', '#f2c230', 1);
  c.fillStyle = '#f2c230'; c.font = 'bold 8px serif'; c.textAlign = 'center'; c.fillText('會 館', W / 2, 44.5); c.textAlign = 'left';
  box(c, W / 2 - 8, H - 22, 16, 20, '#3a0a0a');
  for (const lx of [14, W - 14]) {
    const sw = Math.sin(t * 2 + lx) * 1.5;
    ln(c, lx, 34, lx + sw, 42, '#333', 0.8); ell(c, lx + sw, 48, 5, 6, '#ff2b1c'); box(c, lx + sw - 2, 53, 4, 2, '#f2c230');
  }
};

BLD.wushustadium = (c, W, H, s) => {
  const t = s.t || 0;
  ell(c, W / 2 + 3, H / 2 + 4, W / 2 - 2, H / 2 - 4, 'rgba(0,0,0,0.25)');
  ell(c, W / 2, H / 2, W / 2 - 2, H / 2 - 4, '#b31b1b');
  ell(c, W / 2, H / 2, W / 2 - 10, H / 2 - 11, '#d43a2a');
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU;
    cir(c, W / 2 + Math.cos(a) * (W / 2 - 7), H / 2 + Math.sin(a) * (H / 2 - 8), 1.8, i % 2 ? '#f2c230' : '#fff');
  }
  ell(c, W / 2, H / 2, W / 2 - 18, H / 2 - 18, '#e8d29a');
  // sparring figures
  for (const [fx, fl] of [[W / 2 - 10, 1], [W / 2 + 10, -1]]) {
    c.save(); c.translate(fx, H / 2 + 8); c.scale(fl * 0.6, 0.6);
    person(c, { skin: '#efc6a0', shirt: '#d6161c', pants: '#c8121a', t: t, moving: true });
    c.restore();
  }
  for (const bx of [10, W - 10]) { ln(c, bx, H / 2, bx, H / 2 - 34, '#5a3a1a', 1.5); poly(c, [[bx, H / 2 - 34], [bx + (bx < W / 2 ? 10 : -10), H / 2 - 30 + Math.sin(t * 3) * 2], [bx, H / 2 - 24]], '#f2c230'); }
};

BLD.flametemple = (c, W, H, s) => {
  const t = s.t || 0;
  shadowRect(c, 6, 20, W - 12, H - 22);
  box(c, 6, 24, W - 12, H - 30, '#2a1a14');
  for (let i = 0; i < 4; i++) box(c, 10 + i * (W - 26) / 3, 26, 5, H - 34, '#c4271f');
  c.beginPath(); c.moveTo(-4, 28); c.quadraticCurveTo(8, 24, 12, 12); c.lineTo(W - 12, 12); c.quadraticCurveTo(W - 8, 24, W + 4, 28); c.lineTo(W - 4, 20); c.lineTo(4, 20); c.closePath();
  c.fillStyle = '#1a1a1a'; c.fill();
  box(c, 0, H - 8, W, 6, '#6e6455');
  // brazier with eternal flame
  const bx = W / 2, by = H - 16;
  poly(c, [[bx - 14, by - 10], [bx + 14, by - 10], [bx + 8, by + 4], [bx - 8, by + 4]], '#b8862c', '#6b4a10', 1);
  for (let i = 0; i < 5; i++) {
    const f = Math.sin(t * 10 + i * 1.7) * 3, h = 22 + Math.sin(t * 7 + i) * 6;
    poly(c, [[bx - 12 + i * 6 - 4, by - 10], [bx - 12 + i * 6 + 4, by - 10], [bx - 12 + i * 6 + f, by - 10 - h]], i % 2 ? '#ff7a00' : '#ffb21e');
  }
  poly(c, [[bx - 6, by - 10], [bx + 6, by - 10], [bx + Math.sin(t * 12) * 2, by - 34]], '#fff2a0');
};

BLD.busdepot = (c, W, H, s) => {
  const t = s.t || 0;
  ell(c, W / 2, H / 2, W / 2 + 6, H / 2 + 4, 'rgba(80,255,170,' + (0.08 + Math.sin(t * 2) * 0.04) + ')');
  shadowRect(c, 4, 12, W - 8, H - 14);
  box(c, 4, 16, W - 8, H - 18, '#7c8478');
  for (let x = 6; x < W - 4; x += 5) ln(c, x, 16, x, H - 2, 'rgba(0,0,0,0.15)', 1);
  poly(c, [[0, 18], [W / 2, 2], [W, 18]], '#5a6156', '#3a4038', 1);
  for (let i = 0; i < 3; i++) {
    const gx = 10 + i * (W - 20) / 3;
    box(c, gx, 34, (W - 20) / 3 - 6, H - 36, '#2a2f2a');
    for (let k = 0; k < 5; k++) ln(c, gx, 38 + k * 6, gx + (W - 20) / 3 - 6, 38 + k * 6, '#444b44', 1);
  }
  c.fillStyle = '#b8ffd8'; c.font = 'bold 8px sans-serif'; c.fillText('DEPOT', 8, 28);
  // ghostly bus nose
  rbox(c, W / 2 - 10, H - 18, 22, 16, 5, 'rgba(233,225,198,0.85)');
  box(c, W / 2 - 10, H - 9, 22, 3, '#2e4a3a'); cir(c, W / 2 + 8, H - 6, 1.6, '#fffbbd');
};

BLD.pavilion = (c, W, H, s) => {
  const t = s.t || 0;
  ell(c, W / 2, H - 14, W / 2 - 2, 12, '#3f8fa8');
  for (let i = 0; i < 4; i++) { const lx = 10 + i * 22; ell(c, lx, H - 12 + (i % 2) * 4, 5, 2.6, '#3caa4a'); cir(c, lx + 1, H - 14 + (i % 2) * 4, 2, '#ff9ccf'); }
  box(c, 14, 28, W - 28, 4, '#e8e0d0');
  for (let i = 0; i < 4; i++) box(c, 16 + i * (W - 36) / 3, 26, 4, H - 46, '#c4271f');
  box(c, 12, H - 22, W - 24, 6, '#e0d6c0');
  // hexagonal yellow roof w/ blue trim
  c.beginPath(); c.moveTo(-2, 30); c.quadraticCurveTo(10, 28, 16, 14); c.lineTo(W / 2, -4); c.lineTo(W - 16, 14); c.quadraticCurveTo(W - 10, 28, W + 2, 30); c.closePath();
  c.fillStyle = '#f5d000'; c.fill(); c.strokeStyle = '#2f6fb8'; c.lineWidth = 2.5; c.stroke();
  poly(c, [[W / 2 - 10, 10], [W / 2, 2], [W / 2 + 10, 10], [W / 2, 18]], '#5bb8e8', '#2f6fb8', 1);
  cir(c, W / 2, -6, 3, '#f2c230');
};

BLD.pandasanctuary = (c, W, H, s) => {
  const t = s.t || 0;
  box(c, 0, 0, W, H, '#4f8f3a');
  for (let i = 0; i < 16; i++) {
    const bx = 6 + (i * 37) % (W - 12), sw = Math.sin(t * 1.5 + i) * 2;
    ln(c, bx, H - 4 - (i % 3) * 6, bx + sw, 6 + (i % 4) * 8, '#7fc24a', 3);
    for (let k = 0; k < 4; k++) ln(c, bx - 2, 14 + k * 18, bx + 2, 14 + k * 18, '#5a9a32', 1);
    ell(c, bx + 4 + sw, 10 + (i % 4) * 8, 5, 1.8, '#9be05a');
  }
  // paifang gate
  box(c, 20, 20, 6, H - 30, '#c4271f'); box(c, W - 26, 20, 6, H - 30, '#c4271f');
  box(c, 14, 22, W - 28, 6, '#c4271f'); box(c, 10, 14, W - 20, 7, '#1a1a1a');
  rbox(c, W / 2 - 18, 30, 36, 10, 2, '#f2c230');
  c.fillStyle = '#7a0f0f'; c.font = 'bold 8px serif'; c.textAlign = 'center'; c.fillText('熊 貓 園', W / 2, 38); c.textAlign = 'left';
  // sitting panda
  c.save(); c.translate(W / 2, H - 14);
  ell(c, 0, -10, 13, 12, '#f6f6f2'); ell(c, 0, -4, 13, 6, '#151515');
  cir(c, 0, -26, 8, '#f6f6f2'); cir(c, -6, -33, 3, '#151515'); cir(c, 6, -33, 3, '#151515');
  ell(c, -3, -27, 2, 2.8, '#151515'); ell(c, 3, -27, 2, 2.8, '#151515'); ell(c, 0, -22.5, 1.6, 1, '#151515');
  ln(c, 8, -14, 14, -30, '#7fc24a', 2.5);
  c.restore();
};

BLD.greatwall = (c, W, H, s) => {
  box(c, 2, 4, W - 4, H - 4, '#9a8f7c');
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) c.strokeStyle = '#7b715f', c.lineWidth = 0.7, c.strokeRect(2 + q * 9.3 + (r % 2) * 4, 8 + r * 7.5, 9.3, 7.5);
  for (let i = 0; i < 3; i++) box(c, 2 + i * 10, -4, 7, 8, '#a99e8a');
  box(c, 2, 2, W - 4, 3, '#b8ad98');
};

BLD.dragongate = (c, W, H, s) => {
  const t = s.t || 0;
  shadowRect(c, 6, 6, W - 12, H - 8);
  box(c, 8, 10, W - 16, H - 12, '#c4271f');
  rbox(c, W / 2 - 6, H - 18, 12, 16, 6, '#2a0a0a');
  for (let i = 0; i < 2; i++) {
    const y = 10 - i * 16, w = W - 4 - i * 14, x = W / 2 - w / 2;
    c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x + 4, y - 2, x + 8, y - 9); c.lineTo(x + w - 8, y - 9); c.quadraticCurveTo(x + w - 4, y - 2, x + w + 4, y); c.closePath();
    c.fillStyle = '#1f7a4c'; c.fill();
    if (i === 0) box(c, x + 10, y - 16, w - 20, 8, '#c4271f');
  }
  cir(c, W / 2, -20, 3, '#f2c230');
  // firework launcher tubes
  for (let i = 0; i < 3; i++) box(c, W / 2 - 8 + i * 6, -14 - (s.attacking && i === 1 ? 2 : 0), 4, 8, ['#ffe14a', '#ff4f6e', '#4fc3ff'][i]);
};

// ---------------- logos (SVG) ----------------
const LOGO = {};
LOGO.meth = () => {
  let leaves = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const deg = 112 + i * 16; // left branch: bottom-left, up the side, to the top
      const a = (side === -1 ? deg : 180 - deg) * Math.PI / 180;
      const r = 80, x = 100 + Math.cos(a) * r, y = 108 + Math.sin(a) * r;
      for (const off of [-1, 1]) {
        const tang = (side === -1 ? deg + 90 : 90 - deg) + off * 28 * side;
        const lx = x + Math.cos(a) * off * 8, ly = y + Math.sin(a) * off * 8;
        leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="12" ry="5" transform="rotate(${tang.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="url(#gold)" stroke="#0b1d3a" stroke-width="1.6"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9cc7a"/><stop offset=".5" stop-color="#b08640"/><stop offset="1" stop-color="#e9cc7a"/></linearGradient>
    <clipPath id="shieldClip"><path d="M58 62 H142 V128 Q142 160 100 176 Q58 160 58 128 Z"/></clipPath>
  </defs>
  <circle cx="100" cy="108" r="96" fill="#0b1d3a" stroke="#b08640" stroke-width="2"/>
  ${leaves}
  <path d="M84 196 L100 182 L116 196 L110 206 L100 196 L90 206 Z" fill="url(#gold)" stroke="#0b1d3a" stroke-width="2"/>
  <g clip-path="url(#shieldClip)">
    <rect x="58" y="62" width="42" height="120" fill="#f2c230"/><rect x="100" y="62" width="42" height="120" fill="#1d3c8f"/>
  </g>
  <path d="M58 62 H142 V128 Q142 160 100 176 Q58 160 58 128 Z" fill="none" stroke="#c8102e" stroke-width="4"/>
  <path d="M60 50 Q78 30 100 44 Q122 30 140 50 Q124 46 112 56 L100 52 L88 56 Q76 46 60 50 Z" fill="url(#gold)" stroke="#0b1d3a" stroke-width="1.5"/>
  <circle cx="100" cy="44" r="7" fill="url(#gold)" stroke="#0b1d3a" stroke-width="1.5"/>
  <rect x="98" y="16" width="4" height="22" fill="url(#gold)"/><rect x="91" y="22" width="18" height="4" fill="url(#gold)"/>
  ${[['M', 60], ['G', 87], ['S', 114]].map(([l, x], i) => `<path d="M${x} ${76 + (i === 1 ? -3 : 0)} q13 -4 26 0 v24 q-13 4 -26 0 z" fill="url(#gold)" stroke="#0b1d3a" stroke-width="1.6"/><text x="${x + 13}" y="${95 + (i === 1 ? -3 : 0)}" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="#0b1d3a">${l}</text>`).join('')}
  <text x="100" y="146" text-anchor="middle" font-family="Georgia,serif" font-size="40" font-weight="bold" fill="#c8102e" stroke="#0b1d3a" stroke-width="1">A</text>
  <text x="80" y="162" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="bold" fill="#1d3c8f" stroke="#f2c230" stroke-width=".6">S</text>
  <text x="120" y="162" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="bold" fill="#f2c230" stroke="#0b1d3a" stroke-width=".6">C</text>
  <path d="M30 168 Q100 190 170 168 L176 184 Q100 206 24 184 Z" fill="#1d3c8f" stroke="#f2c230" stroke-width="2"/>
  <text x="100" y="185" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" font-weight="bold" fill="#f2c230">THE BEST IS YET TO BE</text>
</svg>`;
};
LOGO.hwa = () => `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="topArc" d="M30 100 A70 70 0 0 1 170 100"/>
    <path id="botArc" d="M34 108 A66 66 0 0 0 166 108"/>
  </defs>
  <circle cx="100" cy="100" r="92" fill="#f5d000" stroke="#7a5c00" stroke-width="3"/>
  <circle cx="100" cy="100" r="62" fill="#fff8d0" stroke="#7a5c00" stroke-width="2"/>
  <text font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" fill="#7a5c00" letter-spacing="2"><textPath href="#topArc" startOffset="50%" text-anchor="middle">MANDATE OF</textPath></text>
  <text font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" fill="#7a5c00" letter-spacing="2" dy="12"><textPath href="#botArc" startOffset="50%" text-anchor="middle">HWACHUNG</textPath></text>
  <path d="M100 40 L160 100 L100 160 L40 100 Z" fill="#5bb8e8" stroke="#2f6fb8" stroke-width="3"/>
  <g transform="translate(100 102) scale(0.62) translate(-100 -110)" fill="#d4101e">
    <path d="M58 40 L78 40 L98 62 L80 84 L94 98 L74 98 L58 82 L74 62 Z"/>
    <path d="M90 40 L110 40 L130 62 L112 84 L126 98 L106 98 L90 82 L106 62 Z"/>
    <path d="M122 40 L142 40 L162 62 L144 84 L158 98 L138 98 L122 82 L138 62 Z"/>
    <path d="M40 104 L170 104 L156 122 L54 122 Z"/>
    <rect x="66" y="130" width="78" height="20"/>
    <path d="M86 158 L124 158 L105 180 Z"/>
  </g>
  <path d="M22 178 Q100 200 178 178 L184 196 Q100 218 16 196 Z" fill="#d4101e" stroke="#f5d000" stroke-width="2"/>
  <text x="100" y="199" text-anchor="middle" font-family="serif" font-size="15" font-weight="bold" fill="#f5d000" letter-spacing="6">勤慎端朴</text>
</svg>`;

// ---------------- icon/portrait cache ----------------
const ICONS = {};
function unitIcon(type, size, bg) {
  const key = 'u_' + type + '_' + size + (bg ? '_bg' : '');
  if (ICONS[key]) return ICONS[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const d = UNITS[type], fac = FACTIONS[d.faction];
  if (bg) {
    const g = c.createRadialGradient(size / 2, size * 0.4, 2, size / 2, size / 2, size * 0.75);
    g.addColorStop(0, shade(fac.color, 0.35)); g.addColorStop(1, shade(fac.color, -0.55));
    c.fillStyle = g; c.fillRect(0, 0, size, size);
  }
  const h = d.artH || 30, sc = size * 0.78 / h;
  c.save(); c.translate(size / 2 - (d.vehicle || type === 'chimera' ? 0 : 1) * sc, size * 0.9); c.scale(sc, sc);
  SPR[type](c, { t: 0.3, moving: false, atk: 0 });
  c.restore();
  ICONS[key] = cv.toDataURL();
  return ICONS[key];
}
function bldIcon(type, size, bg) {
  const key = 'b_' + type + '_' + size + (bg ? '_bg' : '');
  if (ICONS[key]) return ICONS[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const d = BUILDINGS[type], fac = FACTIONS[d.faction];
  if (bg) { c.fillStyle = shade(fac.color, -0.5); c.fillRect(0, 0, size, size); }
  const W = d.w * TILE, H = d.h * TILE;
  const ext = 50; // vertical overflow allowance
  const sc = Math.min(size * 0.9 / (W + 24), size * 0.9 / (H + ext));
  c.save(); c.translate(size / 2 - W * sc / 2, size * 0.95 - H * sc); c.scale(sc, sc);
  BLD[type](c, W, H, { t: 0.5, amount: 1200, max: 1200 });
  c.restore();
  ICONS[key] = cv.toDataURL();
  return ICONS[key];
}
