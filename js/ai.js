'use strict';
// ============================================================
//  ELITECRAFT — computer opponent
// ============================================================
const AI_PLAN = {
  meth: ['rugbypitch', 'poloclub', 'chapel', 'carnival', 'familyoffice', 'guardhouse', 'poloclub', 'cathedral', 'carnival', 'chapel', 'guardhouse'],
  hwa: ['wushustadium', 'ricepaddy', 'flametemple', 'busdepot', 'granary', 'pavilion', 'wushustadium', 'dragongate', 'pandasanctuary', 'ricepaddy', 'busdepot', 'dragongate'],
};
const AI_MIX = {
  rugbypitch: { rugger: 1 }, poloclub: { polorider: 1 }, chapel: { mgsgirl: 1 }, carnival: { float: 1 }, cathedral: { chimera: 1 },
  wushustadium: { hwachie: 0.55, wushu: 0.45 }, busdepot: { riotbus: 1 }, pavilion: { nanyang: 1 }, pandasanctuary: { tankahkee: 1 },
};
const AI_RESEARCH = ['calltoprayer', 'trustfund', 'proteinshakes', 'handbellchoir', 'ironricebowl', 'eternalflame', 'tenthousand', 'fourvirtues'];
const AI_DIFF = {
  easy: { wave: 8, waveInc: 3, first: 420, gap: 150, workers: 12 },
  normal: { wave: 14, waveInc: 5, first: 300, gap: 120, workers: 16 },
  hard: { wave: 18, waveInc: 6, first: 230, gap: 95, workers: 20 },
};

function aiInit(P) {
  const D = AI_DIFF[P.diff] || AI_DIFF.normal;
  P.aiS = { D, wave: D.wave, nextAttack: D.first, attacking: false, target: null, lastBuildT: -99 };
  P.buildMult = P.diff === 'hard' ? 1.15 : 1;
}
function aiMine(P) { return G.ents.filter(e => !e.dead && e.owner === P.idx); }
function aiHQ(P) {
  return G.byId.get(P.hq) && !G.byId.get(P.hq).dead ? G.byId.get(P.hq)
    : G.ents.find(e => !e.dead && e.owner === P.idx && e.kind === 'b' && !e.d.wall && e.type !== 'ricepaddy');
}
function aiSpot(P, type, near) {
  const d = BUILDINGS[type], hq = near || aiHQ(P); if (!hq) return null;
  const cx_ = hq.x / TILE, cy_ = hq.y / TILE;
  const toward = P.slot === 0 ? 1 : -1;
  for (let r = 4; r < 22; r++) {
    for (let k = 0; k < 14; k++) {
      let a = Math.random() * TAU;
      // bias towards the map interior
      if (Math.random() < 0.6) a = Math.PI / 4 + (toward < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 2.2;
      const tx = Math.round(cx_ + Math.cos(a) * r - d.w / 2), ty = Math.round(cy_ + Math.sin(a) * r - d.h / 2);
      if (!canPlace(type, tx, ty, P.idx)) continue;
      // keep a 1-tile margin free so we don't wall ourselves in
      let ok = true;
      for (let y = ty - 1; y <= ty + d.h && ok; y++) for (let x = tx - 1; x <= tx + d.w; x++) {
        if (x < 0 || y < 0 || x >= MW || y >= MH || G.blk[y * MW + x] === 9) { ok = false; break; }
      }
      if (ok) return { tx, ty };
    }
  }
  return null;
}
function aiBuilder(P, x, y) {
  let best = null, bd = 1e9;
  for (const e of G.ents) {
    if (e.dead || e.owner !== P.idx || e.kind !== 'u' || !e.d.builder) continue;
    if (e.order && e.order.type === 'build') continue;
    if (e.combat) continue;
    const d = Math.hypot(e.x - x, e.y - y) + (e.carry ? 200 : 0);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function aiTryBuild(P, type, near) {
  const d = BUILDINGS[type];
  if (P.res < d.cost || !reqMet(P, d)) return false;
  const s = aiSpot(P, type, near); if (!s) return false;
  const b = aiBuilder(P, (s.tx + d.w / 2) * TILE, (s.ty + d.h / 2) * TILE); if (!b) return false;
  return !!placeBuilding(type, s.tx, s.ty, P.idx, [b]);
}

function aiTick(P) {
  const S = P.aiS, D = S.D;
  const mine = aiMine(P);
  const hq = aiHQ(P); if (!hq) return;
  const blds = mine.filter(e => e.kind === 'b');
  const units = mine.filter(e => e.kind === 'u');
  const workers = units.filter(u => u.d.worker);
  const army = units.filter(u => !u.d.worker && u.type !== 'acsboy');
  const constructing = blds.filter(b => b.constructing);

  // ---- builders: help unfinished buildings that nobody works on
  for (const b of constructing) {
    if (!units.some(u => u.order && u.order.type === 'build' && u.order.b === b.id)) {
      const w = aiBuilder(P, b.x, b.y); if (w) w.order = { type: 'build', b: b.id };
    }
  }

  // ---- economy
  if (P.fac === 'hwa') {
    const paddies = G.ents.filter(e => !e.dead && e.type === 'ricepaddy' && !e.constructing && e.amount > 0 && (e.owner < 0 || e.owner === P.idx) && blds.some(b => b.d.dropoff && !b.constructing && Math.hypot(b.x - e.x, b.y - e.y) < 560));
    for (const w of workers) {
      if (!w.order) {
        let best = null, bn = 1e9;
        for (const p of paddies) { const n = gatherersOn(p) * 300 + Math.hypot(p.x - w.x, p.y - w.y); if (n < bn) { bn = n; best = p; } }
        if (best) w.order = { type: 'gather', node: best.id, st: w.carry ? 'return' : 'go' };
      }
    }
    const want = Math.min(D.workers + 8, 4 + paddies.length * 3);
    if (workers.length + (P.uc.farmer || 0) - workers.length < want) {
      for (const b of blds) if (b.type === 'jadepagoda' && !b.constructing && b.queue.length < 1 && (P.uc.farmer || 0) < want) queueItem(b, { unit: 'farmer' }, P, true);
    }
    const sat = paddies.reduce((s, p) => s + Math.max(0, 3 - gatherersOn(p)), 0);
    if (sat <= 1 && P.res >= 75 && !constructing.some(b => b.type === 'ricepaddy') && workers.length >= 4) {
      const drop = blds.filter(b => b.d.dropoff && !b.constructing);
      aiTryBuild(P, 'ricepaddy', pick(drop));
    }
  } else {
    const wantBoys = D.workers + 4, wantMaids = 4;
    for (const b of blds) {
      if (b.constructing || b.queue.length >= 1) continue;
      if (b.type === 'schoolhall' && (P.uc.maid || 0) < wantMaids) queueItem(b, { unit: 'maid' }, P, true);
      else if ((b.type === 'schoolhall' || b.type === 'bungalow') && (P.uc.acsboy || 0) < wantBoys) queueItem(b, { unit: 'acsboy' }, P, true);
    }
    // keep ACS boys tucked safely behind the base
    for (const u of units) if (u.type === 'acsboy' && !u.order && Math.hypot(u.x - hq.x, u.y - hq.y) > 260) u.order = { type: 'move', x: hq.x + (Math.random() - 0.5) * 220, y: hq.y + (Math.random() - 0.5) * 220 };
  }

  // ---- supply
  const supB = P.F.supplyBld;
  const supBuilding = constructing.filter(b => BUILDINGS[b.type].supply).length;
  if (P.supMax < 200 && P.sup >= P.supMax - (P.supMax > 60 ? 10 : 5) && supBuilding < (P.supMax > 80 || P.res > 400 ? 2 : 1)) aiTryBuild(P, supB);

  // ---- tech plan (desired counts by plan prefix)
  const plan = AI_PLAN[P.fac];
  const have = {};
  for (const b of blds) have[b.type] = (have[b.type] || 0) + 1;
  const want = {};
  let next = null;
  for (const t of plan) {
    want[t] = (want[t] || 0) + 1;
    if ((have[t] || 0) < want[t]) { next = t; break; }
  }
  if (next && G.t - S.lastBuildT > 6 && constructing.length < 2) {
    if (aiTryBuild(P, next)) S.lastBuildT = G.t;
  }
  // spend a surplus on extra production
  if (P.res > 650 && constructing.length < 2 && G.t - S.lastBuildT > 8) {
    const prod = P.fac === 'meth' ? ['rugbypitch', 'carnival', 'poloclub', 'chapel'] : ['wushustadium', 'busdepot', 'pavilion', 'wushustadium'];
    const opts = prod.filter(t => reqMet(P, BUILDINGS[t]) && (have[t] || 0) < 3);
    if (opts.length && aiTryBuild(P, pick(opts))) S.lastBuildT = G.t;
  }
  // stalled construction: send a different builder
  for (const b of constructing) {
    if (b.lastProg == null || b.progress > b.lastProg + 0.001) { b.lastProg = b.progress; b.stallT = G.t; }
    else if (G.t - b.stallT > 12) {
      for (const u of units) if (u.order && u.order.type === 'build' && u.order.b === b.id) u.order = null;
      const w = aiBuilder(P, b.x, b.y); if (w) w.order = { type: 'build', b: b.id };
      b.stallT = G.t;
    }
  }
  const reserve = next ? BUILDINGS[next].cost * 0.6 : 0;

  // ---- research
  for (const b of blds) {
    if (b.constructing || b.queue.length || !b.d.research) continue;
    for (const r of b.d.research) {
      if (P.up[r] || P.researching[r]) continue;
      if (G.t > 150 && P.res >= RESEARCH[r].cost + reserve * 0.5) { queueItem(b, { research: r }, P, true); break; }
    }
  }

  // ---- army production
  for (const b of blds) {
    if (b.constructing || !AI_MIX[b.type] || b.queue.length >= 2) continue;
    const mix = AI_MIX[b.type];
    let r = Math.random(), type = null;
    for (const k in mix) { r -= mix[k]; if (r <= 0) { type = k; break; } }
    type = type || Object.keys(mix)[0];
    const d = UNITS[type];
    if (P.res - d.cost >= reserve || P.res > 600) queueItem(b, { unit: type }, P, true);
    if (!b.rally) { const rp = aiRally(P, hq); b.rally = { x: rp.x, y: rp.y }; }
  }

  // ---- abilities
  aiAbilities(P, units);

  // ---- army control
  const enemies = G.ents.filter(e => !e.dead && e.owner >= 0 && e.owner !== P.idx);
  let threat = null, td = 1e9;
  for (const e of enemies) {
    if (e.kind !== 'u') continue;
    for (const b of blds) { const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < 520 && d < td) { td = d; threat = e; } }
  }
  if (threat) {
    for (const u of army) if (!u.order || u.order.type === 'move' || (u.order.type === 'amove' && !u.order.tgt && S.attacking === false)) u.order = { type: 'amove', x: threat.x, y: threat.y };
    if (P.fac === 'meth' && P.up.calltoprayer && !(P.cdUntil.calltoprayer > G.t)) {
      const ch = blds.find(b => b.type === 'chapel' && !b.constructing); if (ch) doCast(ch, 'calltoprayer');
    }
    if (P.fac === 'hwa' && army.length < 3) {
      // farmers defend the homeland when the army is gone
      for (const w of workers) if (Math.hypot(w.x - threat.x, w.y - threat.y) < 260 && w.order && w.order.type !== 'attack') w.order = { type: 'attack', target: threat.id };
    }
    return;
  }
  const armySup = army.reduce((s, u) => s + u.d.supply, 0);
  if (S.attacking) {
    if (army.length < 3 || armySup < S.wave * 0.3) { S.attacking = false; const rp = aiRally(P, hq); for (const u of army) u.order = { type: 'move', x: rp.x, y: rp.y }; return; }
    let tgt = S.target ? G.byId.get(S.target) : null;
    if (!tgt || tgt.dead) {
      const eb = enemies.filter(e => e.kind === 'b' && e.type !== 'ricepaddy');
      let best = null, bd = 1e9; const c = army[0];
      for (const e of eb) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; } }
      tgt = best; S.target = best ? best.id : null;
    }
    if (tgt) for (const u of army) if (!u.order || u.order.type === 'move') u.order = { type: 'amove', x: tgt.x, y: tgt.y };
  } else {
    const rp = aiRally(P, hq);
    for (const u of army) if (!u.order && Math.hypot(u.x - rp.x, u.y - rp.y) > 160) u.order = { type: 'move', x: rp.x + (Math.random() - 0.5) * 100, y: rp.y + (Math.random() - 0.5) * 100 };
    if (G.t >= S.nextAttack && armySup >= S.wave) {
      S.attacking = true; S.target = null; S.wave += D.waveInc; S.nextAttack = G.t + D.gap;
      if (G.players[0] && !G.players[0].defeated) msg(P.fac === 'meth' ? 'The Methodists are marching on you!' : 'The Hwachung horde is coming!', '#ff9b9b');
    }
  }
}
function aiRally(P, hq) {
  const dir = P.slot === 0 ? 1 : -1;
  return { x: hq.x + dir * 280, y: hq.y + dir * 280 };
}
function aiAbilities(P, units) {
  const foes = G.ents.filter(e => !e.dead && e.kind === 'u' && e.owner >= 0 && e.owner !== P.idx && !e.d.invuln);
  const near = (u, r) => foes.filter(e => Math.hypot(e.x - u.x, e.y - u.y) < r);
  const allies = (u, r) => units.filter(e => Math.hypot(e.x - u.x, e.y - u.y) < r);
  const girls = [];
  for (const u of units) {
    if (u.stunUntil > G.t) continue;
    if (u.type === 'mgsgirl' && u.energy >= 50) { if (near(u, 260).length >= 2 && allies(u, 170).length >= 3) doCast(u, 'pray'); }
    if (u.type === 'tankahkee' && !((u.abCd.pandaslam || 0) > G.t) && near(u, 110).length >= 2) doCast(u, 'pandaslam');
    if (u.type === 'nanyang') {
      girls.push(u);
      const n = near(u, 280);
      if (!n.length) continue;
      if (u.energy >= 100) { doCast(u, 'summonstudent'); continue; }
      if (u.energy >= 75) {
        let best = null, bc = 0;
        for (const e of n) { const c = foes.filter(f => Math.hypot(f.x - e.x, f.y - e.y) < 90).length; if (c > bc) { bc = c; best = e; } }
        if (best && bc >= 3) { issueAbility([u], 'respectability', best.x, best.y); continue; }
      }
      if (u.energy >= 60 && allies(u, 130).length >= 4) { doCast(u, 'prudence'); continue; }
      if (u.energy >= 40 && allies(u, 130).length >= 3) doCast(u, 'diligence');
    }
  }
  const idleGirls = girls.filter(g => g.energy < 40 && !(g.order && g.order.type === 'merge'));
  if (girls.length >= 4 && idleGirls.length >= 2) fuseGirls(idleGirls.slice(0, 2));
  // Methodists: Call to Prayer for the income whenever it is ready
  if (P.fac === 'meth' && P.up.calltoprayer && !(P.cdUntil.calltoprayer > G.t)) {
    const ch = G.ents.find(b => !b.dead && b.owner === P.idx && b.type === 'chapel' && !b.constructing);
    if (ch) doCast(ch, 'calltoprayer');
  }
}
