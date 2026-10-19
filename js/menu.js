'use strict';
// ============================================================
//  ELITECRAFT — main menu, codex (display cards), pause, end
// ============================================================
const MENU = { fac: 'meth', diff: 'normal' };

function showMain() {
  G = null;
  musicPlay('menu');
  $('hud').classList.add('hidden');
  const o = $('overlay'); o.classList.remove('hidden');
  o.innerHTML = `
  <div class="menu">
    <div class="title-row">
      <div class="t-logo">${LOGO.meth()}</div>
      <div class="title">
        <h1>ELITECRAFT</h1>
        <div class="subtitle">War of the Elite Schools</div>
        <div class="vs">Methodists <span>vs</span> Hwachung</div>
      </div>
      <div class="t-logo">${LOGO.hwa()}</div>
    </div>
    <div class="pick">Choose your faction</div>
    <div class="facs">
      ${['meth', 'hwa'].map(k => facCard(k)).join('')}
    </div>
    <div class="row">
      <span class="lbl">Opponent:</span>
      ${['easy', 'normal', 'hard'].map(d => `<button class="diff${MENU.diff === d ? ' on' : ''}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
    </div>
    <div class="row">
      <button class="big" id="startBtn">⚔️ Start Battle</button>
      <button class="mid" id="codexBtn">📖 Unit Codex</button>
      <button class="mid" id="helpBtn">❓ How to Play</button>
      <button class="mid musicBtn" id="menuMusic">🎵 Music</button>
    </div>
    <div class="fine">A parody real-time strategy game. All characters are cartoons; no school endorses this war.</div>
  </div>`;
  o.querySelectorAll('.fac').forEach(el => el.addEventListener('click', () => { MENU.fac = el.dataset.fac; o.querySelectorAll('.fac').forEach(f => f.classList.toggle('on', f.dataset.fac === MENU.fac)); audioInit(); sfx('click'); }));
  o.querySelectorAll('.diff').forEach(el => el.addEventListener('click', () => { MENU.diff = el.dataset.diff; o.querySelectorAll('.diff').forEach(f => f.classList.toggle('on', f.dataset.diff === MENU.diff)); }));
  $('startBtn').addEventListener('click', () => { audioInit(); newGame(MENU.fac, MENU.diff); });
  $('codexBtn').addEventListener('click', () => showCodex(MENU.fac));
  $('helpBtn').addEventListener('click', showHelp);
  $('menuMusic').addEventListener('click', () => { audioInit(); musicToggle(); });
  musicSyncBtns();
}
function facCard(k) {
  const F = FACTIONS[k];
  const units = Object.keys(UNITS).filter(u => UNITS[u].faction === k && !UNITS[u].summoned);
  return `<div class="fac ${k}${MENU.fac === k ? ' on' : ''}" data-fac="${k}">
    <div class="fac-logo">${LOGO[k]()}</div>
    <div class="fac-body">
      <h2>${F.name}</h2><div class="fac-sub">${F.sub} · Resource: ${F.resIcon} ${F.res}</div>
      <p>${F.lore}</p>
      <p class="mech">${F.mechanic}</p>
      <div class="fac-units">${units.map(u => `<img title="${UNITS[u].name}" src="${unitIcon(u, 46, true)}">`).join('')}</div>
    </div>
  </div>`;
}
function displayCard(type, isB) {
  const d = isB ? BUILDINGS[type] : UNITS[type], F = FACTIONS[d.faction];
  const img = isB ? bldIcon(type, 150, true) : unitIcon(type, 150, true);
  let stats = '';
  if (isB) {
    stats = `<span>❤️ ${d.hp}</span><span>${F.resIcon} ${d.cost}</span><span>⏱ ${d.time}s</span>` + (d.supply ? `<span>👥 +${d.supply}</span>` : '') + (d.attack ? `<span>⚔️ ${d.attack.dmg}</span>` : '');
  } else {
    const A = d.attack || d.combat;
    stats = `<span>❤️ ${d.invuln ? '∞' : d.hp}</span>` + (A ? `<span>⚔️ ${A.dmg}${A.bonus ? '×' + Object.values(A.bonus)[0] : ''}</span><span>🎯 ${A.range < 20 ? 'melee' : A.range}</span>` : '<span>⚔️ —</span>') +
      (d.cost ? `<span>${F.resIcon} ${d.cost}</span>` : '<span>✨ summon</span>') + (d.supply ? `<span>👥 ${d.supply}</span>` : '');
  }
  const trains = isB && d.trains ? `<div class="dc-x">Trains: ${d.trains.map(t => UNITS[t].name).join(', ')}</div>` : '';
  const res = isB && d.research ? `<div class="dc-x">Research: ${d.research.map(r => RESEARCH[r].name).join(', ')}</div>` : '';
  const req = isB && d.req ? `<div class="dc-x req">Requires: ${reqText(d)}</div>` : '';
  const ab = !isB && d.abilities ? `<div class="dc-x">${d.abilities.map(a => `<b>${ABILITIES[a].icon} ${ABILITIES[a].name}</b> — ${ABILITIES[a].desc}`).join('<br>')}</div>` : '';
  return `<div class="dcard ${d.faction}">
    <div class="dc-top"><span class="dc-name">${d.name}</span><span class="dc-role">${isB ? 'Building' : d.role}</span></div>
    <div class="dc-art"><img src="${img}"></div>
    <div class="dc-stats">${stats}</div>
    <div class="dc-desc">${d.desc}</div>
    ${ab}${trains}${res}${req}
    ${!isB && d.quote ? `<div class="dc-quote">“${d.quote}”</div>` : ''}
  </div>`;
}
function showCodex(fac) {
  const o = $('overlay'); o.classList.remove('hidden');
  const units = Object.keys(UNITS).filter(u => UNITS[u].faction === fac);
  const blds = Object.keys(BUILDINGS).filter(b => BUILDINGS[b].faction === fac);
  o.innerHTML = `<div class="codex">
    <div class="cx-head">
      <button class="mid" id="cxBack">← Back</button>
      <div class="cx-tabs">
        <button class="tab${fac === 'meth' ? ' on' : ''}" data-f="meth">✝️ The Methodists</button>
        <button class="tab${fac === 'hwa' ? ' on' : ''}" data-f="hwa">🔥 Mandate of Hwachung</button>
      </div>
    </div>
    <div class="cx-lore"><div class="cx-logo">${LOGO[fac]()}</div><div><h2>${FACTIONS[fac].name}</h2><p>${FACTIONS[fac].lore}</p><p class="mech">${FACTIONS[fac].mechanic}</p></div></div>
    <h3>Units</h3><div class="cards">${units.map(u => displayCard(u, false)).join('')}</div>
    <h3>Buildings &amp; Tech Tree</h3>
    ${techTree(fac)}
    <div class="cards">${blds.map(b => displayCard(b, true)).join('')}</div>
    <h3>Research</h3>
    <div class="research">${Object.keys(RESEARCH).filter(r => blds.some(b => (BUILDINGS[b].research || []).includes(r))).map(r => `<div class="rs"><b>${RESEARCH[r].icon} ${RESEARCH[r].name}</b> <small>${FACTIONS[fac].resIcon} ${RESEARCH[r].cost} · ${RESEARCH[r].time}s · ${BUILDINGS[blds.find(b => (BUILDINGS[b].research || []).includes(r))].name}</small><br>${RESEARCH[r].desc}</div>`).join('')}</div>
  </div>`;
  $('cxBack').addEventListener('click', () => { if (G && G.paused) showPause(); else showMain(); });
  o.querySelectorAll('.tab').forEach(el => el.addEventListener('click', () => showCodex(el.dataset.f)));
  o.scrollTop = 0;
}
function techTree(fac) {
  const blds = Object.keys(BUILDINGS).filter(b => BUILDINGS[b].faction === fac);
  // depth = longest requirement chain
  const depth = {};
  const dep = b => { if (depth[b] != null) return depth[b]; const r = BUILDINGS[b].req || []; return depth[b] = r.length ? 1 + Math.max(...r.map(dep)) : 0; };
  blds.forEach(dep);
  const tiers = [];
  blds.forEach(b => { (tiers[depth[b]] = tiers[depth[b]] || []).push(b); });
  return `<div class="tree">${tiers.map((t, i) => `<div class="tier"><div class="tier-n">Tier ${i + 1}</div>${t.map(b => `<div class="node"><img src="${bldIcon(b, 54, true)}"><div><b>${BUILDINGS[b].name}</b>${BUILDINGS[b].req ? `<small>needs ${BUILDINGS[b].req.map(r => BUILDINGS[r].name).join(' + ')}</small>` : ''}${BUILDINGS[b].trains ? `<small>→ ${BUILDINGS[b].trains.map(u => UNITS[u].name).join(', ')}</small>` : ''}</div></div>`).join('')}</div>`).join('<div class="arrow">➜</div>')}</div>`;
}
function showHelp() {
  const o = $('overlay'); o.classList.remove('hidden');
  o.innerHTML = `<div class="help">
    <h2>How to Play</h2>
    <p><b>Goal:</b> destroy every enemy building (walls and paddies don't count).</p>
    <table>
      <tr><td>Left-click / drag</td><td>Select units (double-click or Ctrl-click: all of that type on screen)</td></tr>
      <tr><td>Right-click</td><td>Move · attack · harvest a paddy · help build · set rally point (buildings)</td></tr>
      <tr><td>A, then click</td><td>Attack-move</td></tr>
      <tr><td>Command hotkeys</td><td>Shown on each button (e.g. B = Build, S = Stop, H = Hold)</td></tr>
      <tr><td>Shift</td><td>Shift-click train = queue 5 · Shift while placing = place several</td></tr>
      <tr><td>Ctrl+1–9 / 1–9</td><td>Create / recall control groups (double-tap to jump)</td></tr>
      <tr><td>Tab</td><td>Cycle between unit types in your selection</td></tr>
      <tr><td>Arrows / screen edge / middle-drag</td><td>Scroll the camera · Space = jump to selection</td></tr>
      <tr><td>Esc</td><td>Cancel · back · pause menu</td></tr>
    </table>
    <h3>✝️ The Methodists</h3>
    <ul>
      <li><b>Maids</b> build everything. They don't gather — your money comes from <b>ACS Boys</b>, who earn Money whenever they stand still (they're phoning their fathers).</li>
      <li>Build <b>Good Class Bungalows</b> for supply; they also raise more ACS Boys. Keep the boys safe — killing one hands the enemy his allowance.</li>
      <li>Research <b>Call to Prayer</b> at the Chapel. Casting it doubles ACS income and turns all Maids into broom-wielding fighters for 20 seconds.</li>
      <li>Facing a horde? Build a <b>Polo Club</b> (after the Rugby Pitch). <b>Polo Riders</b> are fast cavalry whose mallet sweeps splash around the target, with +50% damage against light infantry. Pair them with Ruggers for buses and MGS Girls for healing.</li>
      <li>Weak mid game, but the Family Office and the Cathedral of Mr. Oldham unlock a devastating late game.</li>
    </ul>
    <h3>🔥 Mandate of Hwachung</h3>
    <ul>
      <li><b>Rice Farmers</b> harvest paddies and carry the rice back to the Jade Pagoda or a Granary. Plant new Rice Paddies when the old ones run dry.</li>
      <li>Build <b>Clan Associations</b> for supply. Fighters massed in groups of 10+ trigger the <b>Horde</b> bonus.</li>
      <li><b>Nanyang Girls</b> cast the four virtues and can summon invincible exchange students. Select two and press <b>F</b> to fuse them into a Qi Archon.</li>
      <li>Wall off chokepoints with the <b>Great Wall</b> and Dragon Gate Towers.</li>
    </ul>
    <button class="mid" id="helpBack">← Back</button>
  </div>`;
  $('helpBack').addEventListener('click', () => { if (G && G.paused) showPause(); else showMain(); });
}
function showPause() {
  const o = $('overlay'); o.classList.remove('hidden');
  o.innerHTML = `<div class="pause"><h2>Paused</h2>
    <button class="big" id="pResume">▶ Resume</button>
    <button class="mid" id="pCodex">📖 Codex</button>
    <button class="mid" id="pHelp">❓ Controls</button>
    <button class="mid" id="pRestart">↻ Restart</button>
    <button class="mid" id="pQuit">⏏ Quit to Menu</button></div>`;
  $('pResume').addEventListener('click', togglePause);
  $('pCodex').addEventListener('click', () => showCodex(G.players[0].fac));
  $('pHelp').addEventListener('click', showHelp);
  $('pRestart').addEventListener('click', () => newGame(G.players[0].fac, G.diff));
  $('pQuit').addEventListener('click', showMain);
}
function endGame(win) {
  G.over = true;
  const P = G.players[0], E = G.players[1];
  musicStinger(win);
  setTimeout(() => {
    const o = $('overlay'); o.classList.remove('hidden');
    o.innerHTML = `<div class="end ${win ? 'win' : 'lose'}">
      <div class="end-logo">${LOGO[win ? P.fac : E.fac]()}</div>
      <h1>${win ? 'VICTORY' : 'DEFEAT'}</h1>
      <p>${win ? (P.fac === 'meth' ? 'The best was yet to be — and it has arrived. Daddy is very proud.' : 'The flame of Hwachung burns eternal. The imperialists are routed!') : (P.fac === 'meth' ? 'Your bungalows lie in ruins. Daddy has cut off your allowance.' : 'Your pagoda has fallen. The rice paddies weep.')}</p>
      <table class="stats">
        <tr><th></th><th>You</th><th>Enemy</th></tr>
        <tr><td>Time</td><td colspan="2">${fmtT(G.t)}</td></tr>
        <tr><td>Units produced</td><td>${P.stats.made}</td><td>${E.stats.made}</td></tr>
        <tr><td>Units killed</td><td>${P.stats.killed}</td><td>${E.stats.killed}</td></tr>
        <tr><td>Units lost</td><td>${P.stats.lost}</td><td>${E.stats.lost}</td></tr>
        <tr><td>Buildings razed</td><td>${P.stats.razed}</td><td>${E.stats.razed}</td></tr>
        <tr><td>${P.F.res} gathered</td><td>${Math.floor(P.stats.gathered)}</td><td>${Math.floor(E.stats.gathered)}</td></tr>
      </table>
      <button class="big" id="eAgain">↻ Play Again</button> <button class="mid" id="eMenu">⏏ Main Menu</button>
    </div>`;
    $('eAgain').addEventListener('click', () => newGame(P.fac, G.diff));
    $('eMenu').addEventListener('click', showMain);
  }, 1200);
}

// ---------------- boot ----------------
window.addEventListener('load', () => {
  resize();
  setupInput();
  musicSyncBtns();
  showMain();
  requestAnimationFrame(frame);
});
