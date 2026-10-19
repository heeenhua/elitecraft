'use strict';
// ============================================================
//  ELITECRAFT — procedural music (original compositions, Web Audio)
//  menu: "War of the Schools"   meth: "Hymn of the Best Yet to Be"
//  hwa:  "The Eternal Flame"    + victory / defeat stingers
// ============================================================
const MUS = { on: true, want: null, track: null, step: 0, nextT: 0, out: null, bus: null, intense: false };
try { MUS.on = localStorage.getItem('elitecraft_music') !== 'off'; } catch (e) { /* storage unavailable */ }

const mf = n => 440 * Math.pow(2, (n - 69) / 12);

function musInit() {
  const a = AU.ctx; if (!a || MUS.out) return;
  MUS.out = a.createGain(); MUS.out.gain.value = 0; MUS.out.connect(a.destination);
  MUS.bus = a.createGain(); MUS.bus.gain.value = 1; MUS.bus.connect(MUS.out);
  // generated hall reverb
  const len = Math.floor(a.sampleRate * 2.6), ir = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const rev = a.createConvolver(); rev.buffer = ir;
  const wet = a.createGain(); wet.gain.value = 0.32;
  MUS.bus.connect(rev); rev.connect(wet); wet.connect(MUS.out);
}

// ---------------- instruments ----------------
function mEnv(t, att, hold, rel, vol) {
  const g = AU.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol, t + att + Math.max(0, hold)); g.gain.exponentialRampToValueAtTime(0.0001, t + att + Math.max(0, hold) + rel);
  return g;
}
function mOsc(type, f, t, end, dest, gain) {
  const o = AU.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  let node = o;
  if (gain != null) { const g = AU.ctx.createGain(); g.gain.value = gain; o.connect(g); node = g; }
  node.connect(dest); o.start(t); o.stop(end);
  return o;
}
function mLP(freq, q) { const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.7; return f; }
function mNoise(t, dur, vol, type, freq) {
  const a = AU.ctx, s = a.createBufferSource(); s.buffer = AU.noise;
  const f = a.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1000;
  const g = mEnv(t, 0.002, 0, dur, vol);
  s.connect(f); f.connect(g); g.connect(MUS.bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const INS = {
  organ(n, t, dur, v) {
    const g = mEnv(t, 0.07, dur - 0.12, 0.35, v); const lp = mLP(2600); g.connect(lp); lp.connect(MUS.bus);
    const f = mf(n), end = t + dur + 0.5;
    [[1, 1], [2, 0.45], [3, 0.2], [4, 0.14], [0.5, 0.3]].forEach(([h, a]) => mOsc('sine', f * h, t, end, g, a));
  },
  flute(n, t, dur, v) {
    const g = mEnv(t, 0.05, dur - 0.1, 0.25, v); g.connect(MUS.bus);
    const f = mf(n), end = t + dur + 0.4;
    const o = mOsc('sine', f, t, end, g, 1); mOsc('sine', f * 2, t, end, g, 0.18);
    const lfo = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = f * 0.006;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end);
  },
  bell(n, t, v) {
    const g = mEnv(t, 0.003, 0, 2.6, v); g.connect(MUS.bus);
    const f = mf(n), end = t + 2.8;
    mOsc('sine', f, t, end, g, 1); mOsc('sine', f * 2.76, t, end, g, 0.35); mOsc('sine', f * 5.4, t, end, g, 0.12); mOsc('sine', f * 0.5, t, end, g, 0.25);
  },
  pluck(n, t, v) { // guzheng-ish
    const f = mf(n), lp = mLP(3800, 2); const g = mEnv(t, 0.004, 0, 1.1, v);
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    g.connect(lp); lp.connect(MUS.bus);
    const o = mOsc('sawtooth', f * 1.012, t, t + 1.2, g, 0.6); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    mOsc('triangle', f * 2, t, t + 1.2, g, 0.3);
  },
  erhu(n, t, dur, v) {
    const f = mf(n), lp = mLP(1700, 1.5); const g = mEnv(t, 0.09, dur - 0.12, 0.3, v);
    g.connect(lp); lp.connect(MUS.bus);
    const end = t + dur + 0.45;
    const o = mOsc('sawtooth', f, t, end, g, 0.5);
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.08);
    const lfo = AU.ctx.createOscillator(), lg = AU.ctx.createGain(); lfo.frequency.value = 5.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + 0.3);
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end);
  },
  brass(n, t, dur, v) {
    const f = mf(n), lp = mLP(900, 1); const g = mEnv(t, 0.035, dur - 0.08, 0.18, v);
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1600, t + 0.08); lp.frequency.linearRampToValueAtTime(1100, t + dur);
    g.connect(lp); lp.connect(MUS.bus);
    const end = t + dur + 0.25;
    mOsc('sawtooth', f, t, end, g, 0.5); mOsc('sawtooth', f * 1.004, t, end, g, 0.4);
  },
  strings(n, t, dur, v) {
    const f = mf(n), lp = mLP(1300); const g = mEnv(t, 0.35, dur - 0.4, 0.6, v);
    g.connect(lp); lp.connect(MUS.bus);
    const end = t + dur + 0.7;
    mOsc('sawtooth', f, t, end, g, 0.35); mOsc('sawtooth', f * 1.006, t, end, g, 0.35); mOsc('sawtooth', f * 0.995, t, end, g, 0.3);
  },
  bass(n, t, dur, v) {
    const g = mEnv(t, 0.01, dur * 0.6, 0.15, v); const lp = mLP(700); g.connect(lp); lp.connect(MUS.bus);
    mOsc('triangle', mf(n), t, t + dur + 0.2, g, 1); mOsc('sine', mf(n) / 2, t, t + dur + 0.2, g, 0.5);
  },
  taiko(t, v) {
    const g = mEnv(t, 0.002, 0, 0.45, v); g.connect(MUS.bus);
    const o = mOsc('sine', 130, t, t + 0.5, g, 1); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    mNoise(t, 0.08, v * 0.5, 'lowpass', 700);
  },
  timpani(n, t, v) {
    const g = mEnv(t, 0.003, 0, 0.9, v); g.connect(MUS.bus);
    const o = mOsc('sine', mf(n) * 1.03, t, t + 1, g, 1); o.frequency.exponentialRampToValueAtTime(mf(n), t + 0.1);
    mNoise(t, 0.06, v * 0.4, 'lowpass', 1200);
  },
  gong(t, v) {
    const g = mEnv(t, 0.01, 0.2, 3.8, v); const lp = mLP(1800); g.connect(lp); lp.connect(MUS.bus);
    [[98, 1], [147, 0.6], [207, 0.45], [262, 0.3], [349, 0.2]].forEach(([f, a]) => { const o = mOsc('sine', f, t, t + 4.2, g, a); o.frequency.linearRampToValueAtTime(f * 0.985, t + 4); });
    mNoise(t, 1.6, v * 0.25, 'bandpass', 900);
  },
  snare(t, v) { mNoise(t, 0.14, v, 'highpass', 1400); },
  hat(t, v) { mNoise(t, 0.035, v, 'highpass', 7000); },
  woodblock(t, v) { const g = mEnv(t, 0.001, 0, 0.08, v); g.connect(MUS.bus); mOsc('sine', 1250, t, t + 0.1, g, 1); },
};

// notes per bar as arrays of step-values; null = rest, '-' = hold previous
function holdLen(arr, i) { let n = 1; while (arr[i + n] === '-') n++; return n; }

// ---------------- tracks ----------------
const TRACKS = {
  // D minor march, both factions' colours (brass + pentatonic bells)
  menu: {
    bpm: 100, sub: 2, // 8 steps per bar
    chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], // Dm Bb C A
    roots: [38, 34, 36, 33],
    mel: [
      [74, '-', '-', 77, 76, '-', 74, '-'], [70, '-', 74, '-', 77, '-', '-', '-'],
      [76, '-', 72, '-', 79, '-', 76, '-'], [73, '-', '-', '-', 69, '-', null, null],
      [74, '-', 81, '-', 79, '-', 77, 76], [74, '-', '-', 70, 72, '-', 74, '-'],
      [76, '-', 79, '-', 84, '-', 79, 76], [81, '-', '-', '-', '-', '-', null, null],
    ],
    play(s, t, d) {
      const bar = Math.floor(s / 8) % 16, pos = s % 8, ci = bar % 4;
      if (pos === 0) this.chords[ci].forEach(n => INS.strings(n + 12, t, d * 8, 0.035));
      if (pos % 2 === 0) INS.bass(this.roots[ci], t, d * 0.9, 0.16);
      if (pos === 0 || pos === 4) INS.timpani(this.roots[ci] + 12, t, 0.3);
      if (pos === 2 || pos === 6) INS.snare(t, 0.06);
      if (bar % 4 === 3 && pos >= 5) INS.snare(t + d / 2, 0.05);
      if (bar >= 8) {
        const m = this.mel[bar - 8];
        if (m[pos] != null && m[pos] !== '-') INS.brass(m[pos] - 12, t, d * holdLen(m, pos) * 0.95, 0.07);
      } else if (pos % 2 === 0) {
        const pent = [62, 65, 67, 69, 72, 74];
        if ((bar * 3 + pos) % 5 !== 0) INS.pluck(pent[(bar * 2 + pos / 2 * 3) % pent.length] + 12, t, 0.06);
      }
      if (bar % 8 === 0 && pos === 0) INS.bell(62, t, 0.08);
    },
  },
  // F major hymn: organ chorale, flute/bell melody, church bells
  meth: {
    bpm: 74, sub: 2,
    chords: [[53, 57, 60], [52, 55, 60], [50, 53, 57], [50, 53, 58], [53, 57, 60], [50, 53, 58], [52, 55, 60], [53, 57, 60]], // F C/E Dm Bb F Bb C F
    roots: [41, 36, 38, 34, 41, 34, 36, 41],
    // scale degrees of F major: 65 F 67 G 69 A 70 Bb 72 C 74 D 76 E 77 F 79 G
    mel: [
      [65, '-', 69, '-', 72, '-', '-', '-'], [76, '-', 72, '-', 79, '-', '-', '-'],
      [74, '-', 72, '-', 74, '-', 77, '-'], [77, '-', '-', '-', 74, '-', 70, '-'],
      [72, '-', 74, '-', 72, '-', 69, '-'], [70, '-', 74, '-', 77, '-', 74, '-'],
      [72, '-', '-', '-', 76, '-', 79, '-'], [77, '-', '-', '-', '-', '-', null, null],
    ],
    play(s, t, d) {
      const bar = Math.floor(s / 8) % 16, pos = s % 8, b = bar % 8, pass = bar >= 8;
      if (pos === 0) this.chords[b].forEach(n => INS.organ(n, t, d * 8, 0.03));
      if (pos === 0 || pos === 4) INS.organ(this.roots[b], t, d * 4, 0.035);
      const m = this.mel[b];
      if (m[pos] != null && m[pos] !== '-') {
        const len = d * holdLen(m, pos);
        if (pass) { INS.bell(m[pos] + 12, t, 0.05); INS.flute(m[pos], t, len * 0.95, 0.05); }
        else INS.flute(m[pos], t, len * 0.95, 0.07);
      }
      if (pos === 0 && b % 4 === 0) INS.bell(53, t, 0.09);
      if (MUS.intense) {
        if (pos === 0 || pos === 4) INS.timpani(this.roots[b] + 12, t, 0.28);
        if (pos === 6) INS.timpani(this.roots[b] + 12, t, 0.16);
        if (pos % 2 === 1) INS.snare(t, 0.025);
      }
    },
  },
  // D major pentatonic: guzheng plucks, erhu, taiko and gong
  hwa: {
    bpm: 92, sub: 2,
    pent: [62, 64, 66, 69, 71, 74, 76, 78, 81, 83],
    roots: [38, 38, 35, 33, 38, 43, 33, 38],
    mel: [
      [5, null, 4, 3, 5, null, 6, null], [7, 6, 5, null, 4, 3, 4, null],
      [3, null, 2, 3, 5, 4, 3, 2], [0, '-', '-', '-', 2, 3, 4, null],
      [5, 5, 6, 7, 8, '-', 7, 6], [5, null, 4, 5, 6, '-', 5, 4],
      [3, 4, 3, 2, 0, null, 2, null], [0, '-', '-', '-', null, null, null, null],
    ],
    play(s, t, d) {
      const bar = Math.floor(s / 8) % 16, pos = s % 8, b = bar % 8, pass = bar >= 8;
      if (pos === 0 && b % 4 === 0) { INS.strings(50, t, d * 32, 0.03); INS.strings(57, t, d * 32, 0.025); }
      if (pos === 0 || pos === 3 || pos === 6) INS.bass(this.roots[b], t, d * 1.6, 0.13);
      if (pos === 0) INS.taiko(t, 0.32); else if (pos === 3 || pos === 4) INS.taiko(t, 0.16); else if (pos === 6) INS.taiko(t, 0.12);
      if (pos === 2 || pos === 7) INS.woodblock(t, 0.04);
      if (pos === 0 && b === 0) INS.gong(t, 0.14);
      const m = this.mel[b];
      const v = m[pos];
      if (v != null && v !== '-') {
        const n = this.pent[v];
        if (pass) INS.erhu(n, t, d * holdLen(m, pos) * 0.98, 0.055);
        else { INS.pluck(n, t, 0.09); if (pos % 4 === 0) INS.pluck(n - 12, t, 0.04); }
      }
      if (MUS.intense) {
        INS.taiko(t + d / 2, 0.07);
        if (pos % 2 === 0) INS.hat(t, 0.03);
        if (pos === 4 && b % 2 === 1) INS.gong(t, 0.05);
      }
    },
  },
};

function musicPlay(name) { MUS.want = name; }
function musicTick() {
  const a = AU.ctx;
  if (!a || a.state !== 'running') return;
  musInit();
  const target = !MUS.on ? 0 : (G && G.paused ? 0.15 : 0.45);
  MUS.out.gain.setTargetAtTime(target, a.currentTime, 0.25);
  MUS.intense = !!(G && !G.over && G.players[0].underAttack && G.t - G.players[0].underAttack.t < 8);
  if (MUS.want !== MUS.track) { MUS.track = MUS.want; MUS.step = 0; MUS.nextT = a.currentTime + 0.25; }
  if (!MUS.track || !MUS.on) return;
  const T = TRACKS[MUS.track], d = 60 / T.bpm / T.sub;
  if (MUS.nextT < a.currentTime) MUS.nextT = a.currentTime + 0.05;
  while (MUS.nextT < a.currentTime + 0.3) { T.play(MUS.step, MUS.nextT, d); MUS.nextT += d; MUS.step++; }
}
function musicStinger(win) {
  MUS.want = null; MUS.track = null;
  const a = AU.ctx; if (!a || !MUS.on) return;
  musInit();
  const t = a.currentTime + 0.1;
  if (win) {
    [62, 66, 69, 74].forEach((n, i) => INS.brass(n, t + i * 0.18, 0.5, 0.09));
    [50, 57, 62, 66, 69].forEach(n => INS.strings(n + 12, t + 0.72, 2.6, 0.035));
    INS.brass(78, t + 0.72, 2.2, 0.08); INS.bell(74, t + 0.72, 0.12); INS.timpani(50, t + 0.72, 0.4);
  } else {
    [69, 65, 62, 61].forEach((n, i) => INS.strings(n, t + i * 0.5, 0.9, 0.05));
    INS.strings(50, t + 2, 3, 0.05); INS.strings(57, t + 2, 3, 0.04); INS.gong(t + 2, 0.18);
  }
  setTimeout(() => { if (!G || G.over) MUS.want = 'menu'; }, 6500);
}
function musicSyncBtns() { document.querySelectorAll('.musicBtn').forEach(b => { b.classList.toggle('mute', !MUS.on); b.title = MUS.on ? 'Music: on' : 'Music: off'; }); }
function musicToggle() {
  MUS.on = !MUS.on;
  try { localStorage.setItem('elitecraft_music', MUS.on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (MUS.on) MUS.track = null; // restart cleanly
  document.querySelectorAll('.musicBtn').forEach(b => { b.classList.toggle('mute', !MUS.on); b.title = MUS.on ? 'Music: on' : 'Music: off'; });
}
setInterval(musicTick, 50);
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { audioInit(); musInit(); }, true));
