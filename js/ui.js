'use strict';
// ============================================================
//  ELITECRAFT — input, commands, HUD
// ============================================================
const KEYS = {};
const TRAIN_KEYS = { maid: 'D', acsboy: 'B', rugger: 'R', mgsgirl: 'G', float: 'F', chimera: 'C', polorider: 'P', farmer: 'F', hwachie: 'H', wushu: 'W', nanyang: 'N', riotbus: 'B', tankahkee: 'T' };
const RES_KEYS = { calltoprayer: 'P', proteinshakes: 'P', thoroughbreds: 'T', trustfund: 'T', handbellchoir: 'H', ironricebowl: 'I', eternalflame: 'E', tenthousand: 'T', fourvirtues: 'V' };
const BUILD_KEYS = {
  schoolhall: 'H', bungalow: 'B', rugbypitch: 'R', chapel: 'C', carnival: 'F', familyoffice: 'O', poloclub: 'P', cathedral: 'M', guardhouse: 'G',
  jadepagoda: 'J', ricepaddy: 'P', granary: 'G', clanhouse: 'C', wushustadium: 'W', flametemple: 'T', busdepot: 'B', pavilion: 'N', pandasanctuary: 'S', greatwall: 'L', dragongate: 'D',
};
const TYPE_ORDER = ['tankahkee', 'chimera', 'archon', 'nanyang', 'mgsgirl', 'riotbus', 'float', 'polorider', 'wushu', 'rugger', 'hwachie', 'exchange', 'maid', 'farmer', 'acsboy'];
const TIPS = [
  'Right-click to move or attack. Drag to box-select. Double-click selects all of a type.',
  'A + click = attack-move. Ctrl+1–9 creates control groups. Tab cycles unit types in a selection.',
  'Space jumps to your selection (or base). Hold Shift while placing to place several buildings.',
  'Right-click with a production building selected to set its rally point.',
];

function ownSel() { return G.sel.filter(e => e.owner === 0); }
function selUnits() { return G.sel.filter(e => e.owner === 0 && e.kind === 'u'); }
function sortSel(list) {
  return list.slice().sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'u' ? -1 : 1;
    const ia = TYPE_ORDER.indexOf(a.type), ib = TYPE_ORDER.indexOf(b.type);
    return ia - ib;
  });
}
function setSelection(list, add) {
  let s = add ? [...G.sel, ...list.filter(e => !G.selSet.has(e.id))] : list.slice();
  // can't mix own and foreign
  if (s.some(e => e.owner === 0)) s = s.filter(e => e.owner === 0); else s = s.slice(0, 1);
  G.sel = sortSel(s);
  G.selSet = new Set(G.sel.map(e => e.id));
  G.cardMenu = null; G.placing = null; G.targeting = null;
  G.activeType = G.sel.length ? G.sel[0].type : null;
  const lead = G.sel[0];
  if (lead && lead.owner === 0 && lead.kind === 'u') say(lead, lead.d.lines.select, true);
  G.uiT = 0;
}
function activeGroup() {
  const sel = ownSel(); if (!sel.length) return [];
  const at = sel.some(e => e.type === G.activeType) ? G.activeType : sel[0].type;
  return sel.filter(e => e.type === at);
}

// ---------------- commands ----------------
function formation(units, x, y) {
  const n = units.length;
  if (n === 1) return new Map([[units[0], { x, y }]]);
  const sp = Math.max(...units.map(u => u.r)) * 2 + 6;
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (slots.length >= n) break;
    let sx = x + (c - (cols - 1) / 2) * sp, sy = y + (r - (rows - 1) / 2) * sp;
    if (!walkPx(sx, sy)) { sx = x; sy = y; }
    slots.push({ x: sx, y: sy });
  }
  const m = new Map(), left = units.slice();
  for (const s of slots) {
    let bi = 0, bd = 1e9;
    left.forEach((u, i) => { const d = Math.hypot(u.x - s.x, u.y - s.y); if (d < bd) { bd = d; bi = i; } });
    m.set(left[bi], s); left.splice(bi, 1);
  }
  return m;
}
function cmdMove(units, x, y, amove, quiet) {
  if (!units.length) return;
  const f = formation(units, x, y);
  for (const u of units) {
    const p = f.get(u);
    u.order = { type: amove && canFight(u) ? 'amove' : 'move', x: p.x, y: p.y };
    u.path = null; u.goal = null; u.still = 0;
  }
  if (!quiet) {
    G.fx.push({ k: 'mark', x, y, life: 0.5, max: 0.5, col: amove ? '#ff5a5a' : '#7bff6a' });
    const lead = units[0]; say(lead, amove ? (lead.d.lines.attack || lead.d.lines.move) : lead.d.lines.move, true);
  }
}
function cmdAttack(units, t, quiet) {
  for (const u of units) {
    if (atkOf(u)) { u.order = { type: 'attack', target: t.id }; u.path = null; }
    else { u.order = { type: 'move', x: t.x, y: t.y + 30 }; u.path = null; }
  }
  if (!quiet) { G.fx.push({ k: 'mark', x: t.x, y: t.y, life: 0.5, max: 0.5, col: '#ff5a5a' }); const lead = units[0]; say(lead, lead.d.lines.attack || lead.d.lines.move, true); }
}
function cmdStop(units) { for (const u of units) { u.order = null; u.path = null; u.goal = null; } }
function cmdHold(units) { for (const u of units) { u.order = { type: 'hold' }; u.path = null; u.goal = null; } }
function cmdGather(units, node, quiet) {
  const farmers = units.filter(u => u.d.gatherer), others = units.filter(u => !u.d.gatherer);
  for (const u of farmers) { u.order = { type: 'gather', node: node.id, st: u.carry >= carryCap(u) ? 'return' : 'go' }; u.path = null; }
  if (others.length) cmdMove(others, node.x, node.y + 40, false, true);
  if (!quiet && farmers.length) { say(farmers[0], ['Harvest time!', 'Rice is life.', 'To the paddy!'], true); G.fx.push({ k: 'mark', x: node.x, y: node.y, life: 0.5, max: 0.5, col: '#ffe14a' }); }
}
function cmdReturn(units) {
  for (const u of units) if (u.d.gatherer && u.carry > 0) {
    const node = u.order && u.order.type === 'gather' ? u.order.node : (findPaddy(u) || {}).id;
    u.order = { type: 'gather', node, st: 'return' }; u.path = null;
  }
}

function rightClick(wx, wy) {
  if (G.placing) { G.placing = null; return; }
  if (G.targeting) { G.targeting = null; return; }
  const sel = ownSel(); if (!sel.length) return;
  const hit = entAt(wx, wy);
  if (sel[0].kind === 'b') {
    for (const b of sel) if (b.d.trains) b.rally = { x: wx, y: wy, id: hit && hit.type === 'ricepaddy' ? hit.id : null };
    G.fx.push({ k: 'mark', x: wx, y: wy, life: 0.5, max: 0.5, col: '#7bff6a' });
    return;
  }
  const units = selUnits();
  if (hit && isEnemy(units[0], hit)) { cmdAttack(units, hit); return; }
  if (hit && hit.type === 'ricepaddy' && !hit.constructing && (hit.owner < 0 || hit.owner === 0) && units.some(u => u.d.gatherer)) { cmdGather(units, hit); return; }
  if (hit && hit.owner === 0 && hit.kind === 'b' && hit.constructing && units.some(u => u.d.builder)) {
    const bs = units.filter(u => u.d.builder);
    for (const u of bs) { u.order = { type: 'build', b: hit.id }; u.path = null; }
    say(bs[0], bs[0].d.lines.build, true);
    const rest = units.filter(u => !u.d.builder); if (rest.length) cmdMove(rest, wx, wy, false, true);
    return;
  }
  if (hit && hit.owner === 0 && hit.d.dropoff && units.some(u => u.d.gatherer && u.carry > 0)) { cmdReturn(units); return; }
  cmdMove(units, wx, wy, false);
}
function execTarget(wx, wy, shift) {
  const T = G.targeting; if (!T) return;
  const units = selUnits();
  const hit = entAt(wx, wy);
  if (T.type === 'amove') {
    if (hit && units.length && isEnemy(units[0], hit)) cmdAttack(units, hit);
    else cmdMove(units, wx, wy, true);
  } else if (T.type === 'move') cmdMove(units, wx, wy, false);
  else if (T.type === 'gather') {
    if (hit && hit.type === 'ricepaddy') cmdGather(units, hit); else { msg('Select a rice paddy.', '#ffb0b0'); sfx('error'); return; }
  } else if (T.type === 'spell') issueAbility(activeGroup(), T.key, wx, wy);
  if (!shift) G.targeting = null;
}
function tryPlace(shift) {
  const pl = G.placing; if (!pl) return;
  ghostTile();
  const builders = selUnits().filter(u => u.d.builder);
  if (!builders.length) { G.placing = null; return; }
  // choose the closest builder (shift-chains reuse it)
  const cx_ = (pl.tx + BUILDINGS[pl.type].w / 2) * TILE, cy_ = (pl.ty + BUILDINGS[pl.type].h / 2) * TILE;
  let best = builders[0], bd = 1e9;
  for (const u of builders) { const busy = u.order && u.order.type === 'build' ? 400 : 0; const d = Math.hypot(u.x - cx_, u.y - cy_) + busy; if (d < bd) { bd = d; best = u; } }
  const b = placeBuilding(pl.type, pl.tx, pl.ty, 0, [best]);
  if (b) { say(best, best.d.lines.build, true); if (!shift) G.placing = null; }
}
function startPlacing(type) {
  const P = G.players[0], d = BUILDINGS[type];
  if (!reqMet(P, d)) return fail(P, false, 'Requires: ' + reqText(d));
  if (P.res < d.cost) return fail(P, false, 'Not enough ' + P.F.res + '.');
  G.placing = { type }; G.targeting = null;
}

// ---------------- picking ----------------
function entAt(wx, wy) {
  let best = null, by = -1e9;
  for (const e of G.ents) {
    if (e.dead || e.kind !== 'u') continue;
    if (e.owner !== 0 && !visibleTo0(e)) continue;
    const h = e.d.artH || 30, hw = Math.max(e.r + 3, e.d.vehicle || e.type === 'chimera' || e.type === 'polorider' ? e.r * 1.5 : 0);
    if (Math.abs(wx - e.x) <= hw && wy >= e.y - h - 2 && wy <= e.y + 5 && e.y > by) { by = e.y; best = e; }
  }
  if (best) return best;
  for (const e of G.ents) {
    if (e.dead || e.kind !== 'b' || !shownTo0(e)) continue;
    const r = bRect(e);
    if (wx >= r.x0 && wx <= r.x1 && wy >= r.y0 - (e.d.h > 1 ? 20 : 0) && wy <= r.y1) return e;
  }
  return null;
}
function clickSelect(shift, ctrl) {
  const wx = MOUSE.x + G.cam.x, wy = MOUSE.y + G.cam.y;
  const hit = entAt(wx, wy);
  const now = performance.now();
  if (!hit) { if (!shift) setSelection([]); return; }
  const dbl = now - MOUSE.lastClick < 350 && MOUSE.lastClickId === hit.id;
  MOUSE.lastClick = now; MOUSE.lastClickId = hit.id;
  if ((dbl || ctrl) && hit.owner === 0) {
    const same = G.ents.filter(e => !e.dead && e.owner === 0 && e.type === hit.type && onScreen(e.x, e.y, -10));
    setSelection(same, shift); return;
  }
  if (shift && hit.owner === 0 && G.selSet.has(hit.id)) { setSelection(G.sel.filter(e => e !== hit)); return; }
  setSelection([hit], shift && hit.owner === 0);
  sfx('click');
}
function boxSelect(shift) {
  const x0 = Math.min(MOUSE.sx, MOUSE.x) + G.cam.x, x1 = Math.max(MOUSE.sx, MOUSE.x) + G.cam.x;
  const y0 = Math.min(MOUSE.sy, MOUSE.y) + G.cam.y, y1 = Math.max(MOUSE.sy, MOUSE.y) + G.cam.y;
  let list = G.ents.filter(e => !e.dead && e.owner === 0 && e.kind === 'u' && e.x + e.r >= x0 && e.x - e.r <= x1 && e.y >= y0 && e.y - (e.d.artH || 30) <= y1);
  if (!list.length) list = G.ents.filter(e => !e.dead && e.owner === 0 && e.kind === 'b' && e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1);
  if (list.length || !shift) setSelection(list, shift);
}

// ---------------- input ----------------
function setupInput() {
  window.addEventListener('resize', resize);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  $('panel').addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    audioInit();
    if (!G || G.over || G.paused) return;
    MOUSE.x = e.clientX; MOUSE.y = e.clientY;
    const wx = e.clientX + G.cam.x, wy = e.clientY + G.cam.y;
    if (e.button === 0) {
      if (G.placing) { tryPlace(e.shiftKey); return; }
      if (G.targeting) { execTarget(wx, wy, e.shiftKey); return; }
      MOUSE.down = 0; MOUSE.sx = e.clientX; MOUSE.sy = e.clientY; MOUSE.drag = false;
    } else if (e.button === 2) rightClick(wx, wy);
    else if (e.button === 1) { MOUSE.pan = { x: e.clientX, y: e.clientY, cx: G.cam.x, cy: G.cam.y }; e.preventDefault(); }
  });
  window.addEventListener('mousemove', e => {
    MOUSE.x = e.clientX; MOUSE.y = e.clientY; MOUSE.in = true;
    if (MOUSE.down === 0 && Math.hypot(MOUSE.x - MOUSE.sx, MOUSE.y - MOUSE.sy) > 6) MOUSE.drag = true;
    if (MOUSE.pan && G) { G.cam.x = MOUSE.pan.cx - (e.clientX - MOUSE.pan.x); G.cam.y = MOUSE.pan.cy - (e.clientY - MOUSE.pan.y); clampCam(); }
    if (G && e.target === cv) G.hover = entAt(e.clientX + G.cam.x, e.clientY + G.cam.y); else if (G) G.hover = null;
  });
  document.addEventListener('mouseleave', () => { MOUSE.in = false; });
  window.addEventListener('blur', () => { MOUSE.in = false; for (const k in KEYS) KEYS[k] = false; });
  window.addEventListener('mouseup', e => {
    if (e.button === 1) MOUSE.pan = null;
    if (e.button === 0 && MOUSE.down === 0 && G) {
      if (MOUSE.drag) boxSelect(e.shiftKey); else clickSelect(e.shiftKey, e.ctrlKey);
    }
    if (e.button === 0) { MOUSE.down = -1; MOUSE.drag = false; }
  });
  // minimap
  const mmGo = e => {
    const r = mmc.getBoundingClientRect();
    const wx = (e.clientX - r.left) / MMS * WW, wy = (e.clientY - r.top) / MMS * WH;
    return { wx, wy };
  };
  mmc.addEventListener('mousedown', e => {
    audioInit(); if (!G || G.paused) return;
    const { wx, wy } = mmGo(e);
    if (e.button === 0) {
      if (G.targeting && G.targeting.type !== 'spell') { execTarget(wx, wy, e.shiftKey); return; }
      centerCam(wx, wy); MOUSE.mm = true;
    } else if (e.button === 2) {
      const units = selUnits(); if (units.length) cmdMove(units, wx, wy, false);
      else for (const b of ownSel()) if (b.d.trains) b.rally = { x: wx, y: wy };
    }
  });
  window.addEventListener('mousemove', e => { if (MOUSE.mm && G) { const { wx, wy } = mmGo(e); centerCam(wx, wy); } });
  window.addEventListener('mouseup', () => { MOUSE.mm = false; });
  mmc.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (!G || G.over || !$('overlay').classList.contains('hidden') && !G.paused) return;
    const k = e.key;
    KEYS[k] = true;
    if (k === 'Escape') {
      if (G.placing || G.targeting) { G.placing = null; G.targeting = null; }
      else if (G.cardMenu) G.cardMenu = null;
      else togglePause();
      G.uiT = 0; return;
    }
    if (G.paused) return;
    if (k === 'F10') { togglePause(); e.preventDefault(); return; }
    if (/^[0-9]$/.test(k)) {
      if (e.ctrlKey) { G.groups[k] = ownSel().map(x => x.id); msg('Control group ' + k + ' set.', '#cfe8ff'); e.preventDefault(); }
      else {
        const list = (G.groups[k] || []).map(id => G.byId.get(id)).filter(x => x && !x.dead);
        if (list.length) {
          const now = performance.now();
          if (G.lastGroup === k && now - G.lastGroupT < 400) { const c = list[0]; centerCam(c.x, c.y); }
          G.lastGroup = k; G.lastGroupT = now;
          setSelection(list, e.shiftKey);
        }
      }
      return;
    }
    if (k === 'Tab') {
      e.preventDefault();
      const types = [...new Set(ownSel().map(x => x.type))];
      if (types.length > 1) { const i = types.indexOf(G.activeType); G.activeType = types[(i + 1) % types.length]; G.cardMenu = null; G.uiT = 0; }
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      const s = G.sel[0] || G.byId.get(G.players[0].hq) || G.ents.find(x => x.owner === 0);
      if (s) centerCam(s.x, s.y);
      return;
    }
    if (k.startsWith('Arrow')) { e.preventDefault(); return; }
    const up = k.length === 1 ? k.toUpperCase() : k;
    const btn = (G.cardBtns || []).find(b => b.key === up);
    if (btn) { e.preventDefault(); if (btn.enabled === false) { if (btn.why) { msg(btn.why, '#ffb0b0'); sfx('error'); } } else { btn.onClick(e.shiftKey); G.uiT = 0; } }
  });
  window.addEventListener('keyup', e => { KEYS[e.key] = false; });

  $('cmd').addEventListener('mousedown', e => {
    audioInit();
    const el = e.target.closest('.cb'); if (!el || !G) return;
    const b = G.cardBtns[+el.dataset.i]; if (!b) return;
    if (b.enabled === false) { if (b.why) { msg(b.why, '#ffb0b0'); sfx('error'); } return; }
    b.onClick(e.shiftKey); G.uiT = 0;
  });
  $('cmd').addEventListener('mouseover', e => {
    const el = e.target.closest('.cb'); if (!el || !G) return;
    G.hoverBtn = +el.dataset.i; showTip(G.cardBtns[G.hoverBtn], el);
  });
  $('cmd').addEventListener('mouseleave', () => { if (G) G.hoverBtn = null; hideTip(); });
  $('info').addEventListener('mousedown', e => {
    if (!G) return;
    const q = e.target.closest('[data-q]');
    if (q) { const b = G.sel[0]; if (b && b.owner === 0) { cancelQueue(b, +q.dataset.q); sfx('click'); G.uiT = 0; } return; }
    const s = e.target.closest('[data-sel]');
    if (s) {
      const ent = G.byId.get(+s.dataset.sel); if (!ent) return;
      if (e.shiftKey) setSelection(G.sel.filter(x => x !== ent));
      else if (e.ctrlKey) setSelection(G.sel.filter(x => x.type === ent.type));
      else setSelection([ent]);
    }
  });
  $('idleBtn').addEventListener('click', () => {
    if (!G) return;
    const idle = G.ents.filter(e => !e.dead && e.owner === 0 && e.kind === 'u' && e.d.worker && !e.order && !e.combat);
    if (!idle.length) return;
    G.idleIdx = ((G.idleIdx || 0) + 1) % idle.length;
    const u = idle[G.idleIdx]; setSelection([u]); centerCam(u.x, u.y);
  });
  $('menuBtn').addEventListener('click', () => togglePause());
  $('musicBtn').addEventListener('click', () => { audioInit(); musicToggle(); });
  $('muteBtn').addEventListener('click', () => { AU.on = !AU.on; $('muteBtn').textContent = AU.on ? '🔊' : '🔇'; });
  $('speedBtn').addEventListener('click', () => {
    if (!G) return; const sp = [1, 1.5, 2, 0.75]; G.speed = sp[(sp.indexOf(G.speed) + 1) % sp.length]; $('speedBtn').textContent = G.speed + '×';
  });
}
function scrollCam(dt) {
  let vx = 0, vy = 0; const s = 950;
  if (MOUSE.in && !MOUSE.pan) {
    if (MOUSE.x < 6) vx = -1; else if (MOUSE.x > VW - 7) vx = 1;
    if (MOUSE.y < 6) vy = -1; else if (MOUSE.y > VH - 7) vy = 1;
  }
  if (KEYS.ArrowLeft) vx = -1; if (KEYS.ArrowRight) vx = 1; if (KEYS.ArrowUp) vy = -1; if (KEYS.ArrowDown) vy = 1;
  if (vx || vy) { G.cam.x += vx * s * dt; G.cam.y += vy * s * dt; clampCam(); }
}
function resize() {
  VW = cv.width = window.innerWidth; VH = cv.height = window.innerHeight;
  if (G) clampCam();
}

// ---------------- command card ----------------
function abilityBtn(group, key) {
  const A = ABILITIES[key], P = G.players[0];
  let enabled = true, why = '', cdFrac = 0;
  if (A.needs && !P.up[A.needs]) { enabled = false; why = 'Requires research: ' + RESEARCH[A.needs].name + ' (Chapel)'; }
  if (A.global && P.cdUntil[key] > G.t) { enabled = false; why = A.name + ' is on cooldown.'; cdFrac = (P.cdUntil[key] - G.t) / A.cd; }
  if (A.cd && !A.global) { const c = Math.min(...group.map(u => (u.abCd[key] || 0) - G.t)); if (c > 0) { enabled = false; why = A.name + ' is on cooldown.'; cdFrac = c / A.cd; } }
  if (A.energy && !group.some(u => u.energy >= A.energy)) { enabled = false; why = 'Not enough energy (' + A.energy + ' needed).'; }
  if (A.fuse && group.filter(u => u.type === 'nanyang').length < 2) { enabled = false; why = 'Select two Nanyang Girls to fuse.'; }
  const active = key === 'calltoprayer' && P.prayerUntil > G.t;
  return {
    icon: A.icon, key: A.key, name: A.name, desc: A.desc, energy: A.energy, enabled, why, cdFrac, active,
    onClick: () => {
      if (A.target === 'point') { G.targeting = { type: 'spell', key }; }
      else issueAbility(group, key);
    },
  };
}
function cardButtons() {
  const sel = ownSel(); if (!sel.length) return [];
  const P = G.players[0];
  const group = activeGroup(); const lead = group[0];
  const B = [];
  if (lead.kind === 'u') {
    const units = selUnits();
    if (G.cardMenu === 'build') {
      for (const t of BUILD_MENUS[P.fac]) {
        const d = BUILDINGS[t]; const ok = reqMet(P, d);
        B.push({ img: bldIcon(t, 44), key: BUILD_KEYS[t], name: d.name, cost: d.cost, time: d.time, desc: d.desc, enabled: ok, why: ok ? '' : 'Requires: ' + reqText(d), req: ok ? '' : reqText(d), onClick: () => startPlacing(t) });
      }
      while (B.length < 11) B.push(null);
      B.push({ icon: '↩', key: 'X', name: 'Back', desc: 'Return to the command card.', onClick: () => { G.cardMenu = null; } });
      return B;
    }
    const fighters = units.some(u => atkOf(u) || u.type === 'maid');
    B.push({ icon: '👣', key: 'M', name: 'Move', desc: 'Move to a location (ignores enemies).', onClick: () => { G.targeting = { type: 'move' }; } });
    B.push({ icon: '✋', key: 'S', name: 'Stop', desc: 'Stop all orders.', onClick: () => cmdStop(units) });
    if (fighters) {
      B.push({ icon: '🛡', key: 'H', name: 'Hold Position', desc: 'Stay put and attack anything in range.', onClick: () => cmdHold(units) });
      B.push({ icon: '⚔️', key: 'A', name: 'Attack', desc: 'Attack-move: move and engage any enemy along the way. Click an enemy to focus it.', onClick: () => { G.targeting = { type: 'amove' }; } });
    } else { B.push(null); B.push(null); }
    if (lead.d.builder) B.push({ icon: '🔨', key: 'B', name: 'Build', desc: lead.type === 'maid' ? 'Open the Methodist building menu.' : 'Open the Hwachung building menu.', onClick: () => { G.cardMenu = 'build'; } });
    if (lead.d.gatherer) {
      B.push({ icon: '🌾', key: 'G', name: 'Harvest', desc: 'Harvest rice from a paddy.', onClick: () => { G.targeting = { type: 'gather' }; } });
      B.push({ icon: '🍚', key: 'R', name: 'Return Rice', desc: 'Carry harvested rice back to the Jade Pagoda or a Granary.', onClick: () => cmdReturn(units) });
    }
    while (B.length % 4) B.push(null);
    for (const a of lead.d.abilities || []) B.push(abilityBtn(group, a));
    return B;
  }
  // building
  if (lead.constructing) {
    B.push({ icon: '✖', key: 'X', name: 'Cancel Construction', desc: 'Cancel and refund 75% of the cost.', onClick: () => { const b = lead; G.players[0].res += Math.floor(b.d.cost * 0.75); kill(b, null, true); } });
    return B;
  }
  for (const t of lead.d.trains || []) {
    const d = UNITS[t];
    const lim = d.limit && (P.uc[t] || 0) >= d.limit;
    B.push({ img: unitIcon(t, 44), key: TRAIN_KEYS[t], name: 'Train ' + d.name, cost: d.cost, time: d.time, supply: d.supply, desc: d.desc, enabled: !lim, why: lim ? 'Limit reached (' + d.limit + ').' : '',
      onClick: (shift) => { const n = shift ? 5 : 1; for (let i = 0; i < n; i++) { const tgt = group.slice().sort((a, b) => a.queue.length - b.queue.length)[0]; if (!queueItem(tgt, { unit: t }, P, i > 0)) break; } } });
  }
  for (const r of lead.d.research || []) {
    if (P.up[r]) continue;
    const R = RESEARCH[r]; const busy = P.researching[r];
    B.push({ icon: R.icon, key: RES_KEYS[r], name: 'Research ' + R.name, cost: R.cost, time: R.time, desc: R.desc, enabled: !busy, why: busy ? 'Already researching.' : '', onClick: () => queueItem(lead, { research: r }, P) });
  }
  for (const a of lead.d.abilities || []) B.push(abilityBtn(group, a));
  if (lead.d.trains) B.push({ icon: '🚩', key: 'Y', name: 'Set Rally Point', desc: 'Right-click the map to set where new units go.', onClick: () => msg('Right-click the map to set the rally point.', '#cfe8ff') });
  return B;
}
function renderCard() {
  const B = cardButtons();
  G.cardBtns = B.filter(Boolean);
  let html = '', i = 0;
  const P = G.players[0];
  for (let s = 0; s < 12; s++) {
    const b = B[s];
    if (!b) { html += '<div class="cb empty"></div>'; continue; }
    const idx = G.cardBtns.indexOf(b);
    const afford = b.cost == null || P.res >= b.cost;
    html += `<div class="cb${b.enabled === false ? ' off' : ''}${!afford ? ' poor' : ''}${b.active ? ' active' : ''}" data-i="${idx}">` +
      (b.img ? `<img src="${b.img}">` : `<span class="ic">${b.icon}</span>`) +
      `<span class="hk">${b.key === 'Escape' ? 'Esc' : b.key}</span>` +
      (b.cost != null ? `<span class="cost">${b.cost}</span>` : '') +
      (b.cdFrac ? `<div class="cdov" style="height:${(b.cdFrac * 100).toFixed(0)}%"></div>` : '') + '</div>';
    i++;
  }
  if (html !== G.cardHTML) {
    $('cmd').innerHTML = html; G.cardHTML = html;
    if (G.hoverBtn != null) { const el = $('cmd').querySelector(`[data-i="${G.hoverBtn}"]`); if (el && G.cardBtns[G.hoverBtn]) showTip(G.cardBtns[G.hoverBtn], el); else hideTip(); }
  }
}
function showTip(b, el) {
  if (!b) return hideTip();
  const P = G.players[0];
  let h = `<div class="tt-h">${b.name} <span class="tt-k">[${b.key}]</span></div>`;
  const parts = [];
  if (b.cost != null) parts.push(`${P.F.resIcon} ${b.cost}`);
  if (b.supply) parts.push(`👥 ${b.supply}`);
  if (b.time) parts.push(`⏱ ${b.time}s`);
  if (b.energy) parts.push(`✨ ${b.energy} energy`);
  if (parts.length) h += `<div class="tt-c">${parts.join(' &nbsp; ')}</div>`;
  h += `<div class="tt-d">${b.desc || ''}</div>`;
  if (b.enabled === false && b.why) h += `<div class="tt-r">${b.why}</div>`;
  const t = $('tooltip'); t.innerHTML = h; t.style.display = 'block';
  const r = el.getBoundingClientRect();
  t.style.left = Math.min(window.innerWidth - 300, r.left - 140) + 'px';
  t.style.bottom = (window.innerHeight - r.top + 8) + 'px';
}
function hideTip() { $('tooltip').style.display = 'none'; }

// ---------------- info panel ----------------
function statLine(label, v) { return `<span class="st"><i>${label}</i> ${v}</span>`; }
function renderInfo() {
  const el = $('info');
  const sel = G.sel;
  let h = '';
  if (!sel.length) {
    const P = G.players[0];
    h = `<div class="i-name">${P.F.name}</div><div class="i-role">${P.F.sub}</div><div class="i-tip">${TIPS[Math.floor(G.t / 12) % TIPS.length]}</div>`;
  } else if (sel.length === 1) {
    const e = sel[0], P = e.owner >= 0 ? G.players[e.owner] : null;
    const owner = e.owner < 0 ? 'Neutral' : e.owner === 0 ? 'You' : 'Enemy';
    if (e.kind === 'u') {
      const A = atkOf(e) || (e.type === 'maid' ? e.d.combat : null);
      h += `<div class="i-name">${e.d.name} <small class="${e.owner === 0 ? 'own' : 'foe'}">${owner}</small></div><div class="i-role">${e.d.role}</div>`;
      h += hpBar(e);
      h += '<div class="stats">' + statLine('Armour', armorOf(e)) + (A ? statLine('Damage', Math.round(A.dmg * dmgMult(e)) + (A.bonus ? ' (×' + Object.values(A.bonus)[0] + ' vs ' + Object.keys(A.bonus)[0] + ')' : '') + (A.splash ? ' splash' : '')) + statLine('Range', A.range < 20 ? 'melee' : A.range) : '') + statLine('Speed', Math.round(speedOf(e))) + '</div>';
      if (e.d.energy) h += `<div class="bar en"><div style="width:${e.energy / e.d.energy * 100}%"></div><span>Energy ${Math.floor(e.energy)} / ${e.d.energy}</span></div>`;
      const s = [];
      if (e.type === 'acsboy' && e.owner === 0) s.push(e.harvest ? `📞 Phoning Daddy: +${(e.d.income * (P.up.trustfund ? 1.5 : 1) * (P.prayerUntil > G.t ? 2 : 1)).toFixed(1)} Money/s` : '🚶 Moving (stand still to earn Money)');
      if (e.type === 'maid') s.push(e.combat ? '🧹 COMBAT MODE (Call to Prayer)' : (P && P.up.calltoprayer ? 'Cast Call to Prayer for combat mode.' : 'Research Call to Prayer at the Chapel for combat mode.'));
      if (e.carry) s.push(`🍚 Carrying ${e.carry} rice`);
      if (e.horde) s.push('🔥 HORDE: +' + Math.round(hordeBonus(P) * 100) + '% dmg, +1 armour');
      if (e.tkk) s.push('🐼 Inspired by Tan Kah Kee: +15% dmg');
      if (e.buffs.prayer > G.t) s.push('🙏 Prayer: +50% damage');
      if (e.buffs.diligence > G.t) s.push('📚 Diligence: +50% attack speed');
      if (e.shield > 0 && e.shieldUntil > G.t) s.push('🛡 Prudence shield: ' + Math.ceil(e.shield));
      if (e.stunUntil > G.t) s.push('😵 Stunned');
      if (e.life != null) s.push(`🎓 Student pass expires in ${Math.ceil(e.life)}s · Invincible`);
      if (e.type === 'tankahkee') s.push('Aura: allies within range deal +15% damage');
      if (e.type === 'mgsgirl') s.push('Auto-heals nearby wounded allies');
      if (s.length) h += '<div class="i-status">' + s.join('<br>') + '</div>';
    } else {
      h += `<div class="i-name">${e.d.name} <small class="${e.owner === 0 ? 'own' : e.owner < 0 ? 'neu' : 'foe'}">${owner}</small></div>`;
      if (e.owner >= 0) h += hpBar(e);
      if (e.constructing) h += `<div class="bar pr"><div style="width:${e.progress * 100}%"></div><span>Constructing ${Math.floor(e.progress * 100)}%${e.owner === 0 && !e.nbLast ? '' : ''}</span></div>`;
      if (e.amount != null) h += `<div class="bar rice"><div style="width:${e.amount / e.maxAmount * 100}%"></div><span>🍚 ${Math.floor(e.amount)} rice left</span></div>`;
      if (e.owner === 0 && e.queue.length) {
        h += '<div class="queue">';
        e.queue.forEach((q, i) => {
          const img = q.unit ? `<img src="${unitIcon(q.unit, 40)}">` : `<span class="ic">${RESEARCH[q.research].icon}</span>`;
          h += `<div class="qi" data-q="${i}" title="Click to cancel">${img}${i === 0 ? `<div class="qp" style="width:${q.t / q.time * 100}%"></div>` : ''}</div>`;
        });
        h += '</div>';
        const q = e.queue[0];
        h += `<div class="i-status">${q.unit ? 'Training ' + UNITS[q.unit].name : 'Researching ' + RESEARCH[q.research].name} — ${Math.ceil(q.time - q.t)}s</div>`;
      } else if (!e.constructing) {
        const s = [];
        if (e.d.supply) s.push(`Provides 👥 ${e.d.supply} supply`);
        if (e.d.dropoff) s.push('Rice drop-off point');
        if (e.d.attack) s.push(`Attacks: ${e.d.attack.dmg} dmg, range ${e.d.attack.range}`);
        if (e.type === 'chapel' && P && P.prayerUntil > G.t) s.push('🔔 Call to Prayer active: ' + Math.ceil(P.prayerUntil - G.t) + 's');
        s.push(`<span class="desc">${e.d.desc}</span>`);
        h += '<div class="i-status">' + s.join('<br>') + '</div>';
      }
    }
  } else {
    h += '<div class="grid">';
    for (const e of sel.slice(0, 30)) {
      const f = e.hp / e.maxhp, col = f > 0.6 ? '#4dff5a' : f > 0.3 ? '#ffd23a' : '#ff4040';
      const img = e.kind === 'u' ? unitIcon(e.type, 36, true) : bldIcon(e.type, 36, true);
      h += `<div class="gi${e.type === G.activeType ? ' act' : ''}" data-sel="${e.id}" style="border-color:${col}"><img src="${img}"></div>`;
    }
    if (sel.length > 30) h += `<div class="gi more">+${sel.length - 30}</div>`;
    h += '</div>';
  }
  if (h !== G.infoHTML) { el.innerHTML = h; G.infoHTML = h; }
}
function hpBar(e) {
  const f = Math.max(0, e.hp / e.maxhp);
  const cls = f > 0.6 ? 'g' : f > 0.3 ? 'y' : 'r';
  return `<div class="bar hp ${cls}"><div style="width:${f * 100}%"></div><span>${e.d.invuln ? 'INVINCIBLE' : Math.ceil(e.hp) + ' / ' + e.maxhp}</span></div>`;
}
const PC = $('portrait').getContext('2d');
function drawPortrait() {
  const c = PC, S = 120;
  const g = G.sel.length ? (activeGroup()[0] || G.sel[0]) : null;
  c.clearRect(0, 0, S, S);
  const fac = g ? (g.owner < 0 ? null : G.players[g.owner].F) : G.players[0].F;
  const bg = c.createRadialGradient(S / 2, S * 0.35, 4, S / 2, S / 2, S * 0.8);
  const col = fac ? fac.color : '#4a7a3a';
  bg.addColorStop(0, shade(col, 0.3)); bg.addColorStop(1, shade(col, -0.6));
  c.fillStyle = bg; c.fillRect(0, 0, S, S);
  if (!g) { c.font = '58px serif'; c.textAlign = 'center'; c.fillText(fac.key === 'meth' ? '✝️' : '🔥', S / 2, S / 2 + 20); c.textAlign = 'left'; return; }
  if (g.kind === 'u') {
    const h = g.d.artH || 30, sc = S * 0.74 / h;
    c.save(); c.translate(S / 2, S * 0.9); c.scale(sc, sc);
    SPR[g.type](c, { t: g.t, moving: g.moving, atk: g.atkT > 0 ? Math.max(0.02, 1 - g.atkT / 0.3) : 0, combat: g.combat, harvest: g.harvest || (g.order && g.order.st === 'harvest'), carry: g.carry > 0, building: g.building, cast: g.castT });
    c.restore();
  } else {
    const W = g.d.w * TILE, H = g.d.h * TILE, sc = Math.min(S * 0.86 / (W + 24), S * 0.86 / (H + 50));
    c.save(); c.translate(S / 2 - W * sc / 2, S * 0.94 - H * sc); c.scale(sc, sc);
    BLD[g.type](c, W, H, { t: g.t, amount: g.amount, max: g.maxAmount }); c.restore();
  }
}
function setupHUD() {
  const P = G.players[0];
  $('facLogo').innerHTML = LOGO[P.fac]();
  $('resIcon').textContent = P.F.resIcon;
  musicPlay(P.fac);
  $('overlay').classList.add('hidden');
  $('hud').classList.remove('hidden');
  G.cardHTML = ''; G.infoHTML = '';
  msg(P.fac === 'meth' ? 'The Methodists take the field. The best is yet to be!' : 'The Mandate of Hwachung rises. Keep the flame burning!', '#ffe68a');
  msg(P.fac === 'meth' ? 'Tip: ACS Boys earn Money while standing still. Build Good Class Bungalows for supply.' : 'Tip: Farmers harvest rice paddies. Build Clan Associations for supply.', '#cfe8ff');
}
function uiFrame(dt) {
  const P = G.players[0];
  $('res').textContent = Math.floor(P.res);
  $('income').textContent = P.fac === 'meth' ? `+${P.income.toFixed(1)}/s` : '';
  const blocked = P.sup >= P.supMax;
  $('supply').textContent = `${P.sup} / ${P.supMax}`; $('supply').style.color = blocked ? '#ff6b6b' : '';
  const idle = G.ents.filter(e => !e.dead && e.owner === 0 && e.kind === 'u' && e.d.worker && !e.order && !e.combat).length;
  $('idle').textContent = idle; $('idleBtn').style.opacity = idle ? 1 : 0.45;
  $('idleIcon').textContent = P.fac === 'meth' ? '🧹' : '👒';
  $('clock').textContent = fmtT(G.t);
  let st = '';
  if (P.fac === 'meth') {
    if (P.prayerUntil > G.t) st = `<span class="pill gold">🔔 Call to Prayer ${Math.ceil(P.prayerUntil - G.t)}s</span>`;
    else if (P.up.calltoprayer) st = P.cdUntil.calltoprayer > G.t ? `<span class="pill">🔔 ready in ${Math.ceil(P.cdUntil.calltoprayer - G.t)}s</span>` : `<span class="pill gold">🔔 Call to Prayer ready [C]</span>`;
  } else {
    st = `<span class="pill${P.hordeCount ? ' red' : ''}">🔥 Horde: ${P.hordeCount || 0} units</span>`;
  }
  $('status').innerHTML = st;
  drawMinimap();
  drawPortrait();
  G.uiT -= dt;
  if (G.uiT <= 0) { G.uiT = 0.2; renderInfo(); renderCard(); }
  document.body.style.cursor = G.targeting ? 'crosshair' : '';
}

// ---------------- pause / end ----------------
function togglePause() {
  if (!G || G.over) return;
  G.paused = !G.paused;
  if (G.paused) showPause(); else $('overlay').classList.add('hidden');
}
