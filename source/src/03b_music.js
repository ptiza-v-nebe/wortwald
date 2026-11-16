// ============================================================================
// music (v2): endless, gently changing background music made on the fly.
// Every 8 bars a new section: its own chord order, a new little melody
// (repeated with small changes, the way a person hums), sometimes only a
// quiet "breath" without melody. Each zone has its own key, tempo and voices.
// While a zone is still grey, the music is sparser and more muffled.
// ============================================================================
const STYLES = {
  village: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 84, lead: ["pluck", "bell"], density: [0.35, 0.65], bassBeats: [0, 2],
    progs: [[[0, "M"], [9, "m"], [5, "M"], [7, "M"]], [[0, "M"], [4, "m"], [5, "M"], [7, "M"]], [[9, "m"], [5, "M"], [0, "M"], [7, "M"]], [[5, "M"], [7, "M"], [0, "M"], [0, "M"]]] },
  forest: { root: 62, scale: [0, 3, 5, 7, 10], bpm: 66, lead: ["flute", "bell"], density: [0.25, 0.5], bassBeats: [0], birds: true,
    progs: [[[0, "m"], [10, "M"], [8, "M"], [10, "M"]], [[0, "m"], [7, "m"], [8, "M"], [3, "M"]], [[0, "m"], [5, "m"], [10, "M"], [0, "m"]]] },
  tower: { root: 57, scale: [0, 2, 3, 7, 8], bpm: 56, lead: ["bell"], density: [0.15, 0.32], bassBeats: [0],
    progs: [[[0, "m"], [8, "M"], [5, "m"], [7, "M"]], [[0, "m"], [5, "m"], [8, "M"], [7, "M"]]] },
  house: { root: 60, scale: [0, 2, 4, 7, 9], bpm: 72, lead: ["bell", "pluck"], density: [0.25, 0.45], bassBeats: [0],
    progs: [[[0, "M"], [5, "M"], [9, "m"], [7, "M"]], [[0, "M"], [9, "m"], [5, "M"], [7, "M"]]] },
  field: { root: 62, scale: [0, 2, 4, 7, 9], bpm: 92, lead: ["pluck", "flute"], density: [0.4, 0.7], bassBeats: [0, 2],
    progs: [[[0, "M"], [7, "M"], [9, "m"], [5, "M"]], [[0, "M"], [5, "M"], [7, "M"], [0, "M"]], [[9, "m"], [5, "M"], [0, "M"], [7, "M"]]] },
  river: { root: 64, scale: [0, 2, 4, 7, 9], bpm: 104, lead: ["pluck"], density: [0.5, 0.8], bassBeats: [0, 2],
    progs: [[[0, "M"], [9, "m"], [5, "M"], [7, "M"]], [[0, "M"], [7, "M"], [5, "M"], [7, "M"]]] },
  glade: { root: 65, scale: [0, 2, 4, 6, 7, 11], bpm: 70, lead: ["bell", "flute"], density: [0.3, 0.55], bassBeats: [0], birds: true,
    progs: [[[0, "M"], [2, "M"], [0, "M"], [7, "M"]], [[0, "M"], [4, "m"], [2, "M"], [0, "M"]]] },
  festival: { root: 67, scale: [0, 2, 4, 7, 9], bpm: 108, lead: ["pluck", "pluck", "bell"], density: [0.55, 0.85], bassBeats: [0, 2],
    progs: [[[0, "M"], [5, "M"], [7, "M"], [0, "M"]], [[0, "M"], [9, "m"], [5, "M"], [7, "M"]], [[5, "M"], [0, "M"], [7, "M"], [0, "M"]]] },
};
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

class Music {
  constructor(ctx) {
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; this.lp = lp;
    // a soft echo makes it sound like a room, not a toy
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    this.bus = ctx.createGain(); this.bus.gain.value = 1;
    this.bus.connect(lp); lp.connect(this.out);
    lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.out);
    this.out.connect(ctx.destination);
    this.style = null; this.kind = null; this.colored = true; this.on = true; this.volume = 0.6;
    this.next = 0; this.step = 0;
  }
  set(kind, colored) {
    if (kind === this.kind && colored === this.colored) return;
    const ctx = this.ctx, now = ctx.currentTime, changed = kind !== this.kind;
    this.kind = kind; this.colored = colored;
    this.lp.frequency.setTargetAtTime(colored ? 2600 : 1300, now, 0.8);
    if (!changed) return;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.25);
    this.pendingStart = now + 0.9;
    this.style = kind ? STYLES[kind] : null;
    this.sectionCount = 0;
  }
  setOn(on) {
    this.on = on;
    this.out.gain.setTargetAtTime(on && this.style ? this.volume : 0, this.ctx.currentTime, 0.3);
  }
  tick() {
    const ctx = this.ctx, now = ctx.currentTime;
    if (this.pendingStart && now >= this.pendingStart) {
      this.pendingStart = 0; this.next = now + 0.1; this.step = 0; this.newSection();
      if (this.on && this.style) this.out.gain.setTargetAtTime(this.volume, now, 1.2);
    }
    if (!this.style || this.pendingStart) return;
    if (this.next < now - 1) this.next = now + 0.05;      // the tab was asleep: don't play a backlog
    const eighth = 30 / this.style.bpm;
    while (this.next < now + 0.35) { this.playStep(this.step, this.next, eighth); this.step++; this.next += eighth; }
  }
  // ------------------------------------------------------------------ composing
  newSection() {
    const s = this.style, r = Math.random;
    this.prog = s.progs[Math.floor(r() * s.progs.length)];
    this.breath = this.sectionCount > 0 && r() < 0.22;        // now and then: only pad and bass
    this.density = (s.density[0] + r() * (s.density[1] - s.density[0])) * (this.colored ? 1 : 0.55);
    this.leadVoice = s.lead[Math.floor(r() * s.lead.length)];
    this.octave = this.leadVoice === "bell" && r() < 0.35 ? 12 : (r() < 0.15 ? -5 : 0);
    this.motif = this.makeMotif();
    this.sectionCount = (this.sectionCount || 0) + 1;
  }
  makeMotif() {
    // one bar = 8 eighths: which eighths sound, and which scale step each one takes
    const r = Math.random, notes = [];
    let deg = Math.floor(r() * 3);
    for (let i = 0; i < 8; i++) {
      const strong = i % 2 === 0;
      if (r() < (strong ? 0.75 : 0.35) * (0.5 + this.density)) {
        deg += [-1, 1, 1, -2, 2, 0][Math.floor(r() * 6)];
        deg = Math.max(-2, Math.min(6, deg));
        notes.push({ i, deg, len: r() < 0.3 ? 2 : 1 });
      }
    }
    if (!notes.length) notes.push({ i: 0, deg: 2, len: 2 });
    return notes;
  }
  scaleNote(deg) {
    const sc = this.style.scale, n = sc.length;
    const o = Math.floor(deg / n), d = ((deg % n) + n) % n;
    let m = this.style.root + o * 12 + sc[d] + this.octave;
    while (m > 84) m -= 12;
    while (m < 52) m += 12;
    return m;
  }
  // on strong beats the melody leans onto the nearest note of the current chord
  snap(m, root, third) {
    let best = m, bd = 99;
    for (let o = -24; o <= 36; o += 12) for (const iv of [0, third, 7]) { const c = root + o + iv, d = Math.abs(c - m); if (d < bd) { bd = d; best = c; } }
    return bd <= 2 ? best : m;
  }
  playStep(step, t, eighth) {
    const s = this.style, bar = Math.floor(step / 8), i = step % 8;
    if (step > 0 && step % 64 === 0) this.newSection();
    const chord = this.prog[Math.floor((bar % 8) / 2)], root = s.root + chord[0], third = chord[1] === "M" ? 4 : 3;
    // pad: a soft chord every two bars
    if (i === 0 && bar % 2 === 0) for (const iv of [0, third, 7]) this.voice("pad", midiHz(root + iv), t, eighth * 16, 0.05);
    // bass
    if (i % 2 === 0 && s.bassBeats.includes(i / 2) && !(this.breath && i > 0)) this.voice("bass", midiHz(root - 12), t, eighth * 3, 0.16);
    // melody: the motif, varied a little on each repeat; the 4th bar of a phrase rests on a long chord tone
    if (this.breath) return;
    const phraseBar = bar % 4;
    if (phraseBar === 3) {
      if (i === 0 && Math.random() < 0.7) { let m = root + (Math.random() < 0.5 ? 12 : 7); while (m > 81) m -= 12; this.voice(this.leadVoice, midiHz(m), t, eighth * 5, 0.09); }
      return;
    }
    for (const n of this.motif) {
      if (n.i !== i) continue;
      let deg = n.deg + (phraseBar === 1 ? 1 : phraseBar === 2 ? -1 : 0);
      if (Math.random() < 0.12) deg += Math.random() < 0.5 ? 1 : -1;      // a small slip, like humming
      if (Math.random() > 0.35 + this.density) continue;
      let m = this.scaleNote(deg);
      if (i % 4 === 0) m = this.snap(m, root, third);
      this.voice(this.leadVoice, midiHz(m), t + (Math.random() - 0.5) * 0.012, eighth * n.len * 1.6, 0.085);
    }
    if (s.birds && this.colored && i === 5 && Math.random() < 0.06) this.bird(t);
  }
  // ------------------------------------------------------------------ instruments
  voice(kind, f, t, dur, vol) {
    const ctx = this.ctx, g = ctx.createGain();
    g.connect(this.bus);
    const oscs = [];
    const osc = (type, freq, v) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; const og = ctx.createGain(); og.gain.value = v; o.connect(og); og.connect(g); oscs.push(o); return o; };
    let end;
    if (kind === "pluck") {
      osc("triangle", f, 1); osc("sine", f * 2, 0.15);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.4); end = t + dur + 0.45;
    } else if (kind === "bell") {
      osc("sine", f, 1); osc("sine", f * 2.01, 0.25); osc("sine", f * 3.99, 0.06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.9, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.2); end = t + 2.3;
    } else if (kind === "flute") {
      const o = osc("sine", f, 1); osc("triangle", f, 0.2);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); oscs.push(lfo);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.85, t + 0.09); g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.1, dur - 0.1)); g.gain.linearRampToValueAtTime(0, t + dur + 0.25); end = t + dur + 0.3;
    } else if (kind === "pad") {
      osc("triangle", f, 0.6); osc("triangle", f * 1.004, 0.6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.2); g.gain.setValueAtTime(vol, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.6); end = t + dur + 0.7;
    } else {   // bass
      osc("sine", f, 1); osc("triangle", f, 0.25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dur); end = t + dur + 0.05;
    }
    for (const o of oscs) { o.start(t); o.stop(end); }
    oscs[0].onended = () => { try { g.disconnect(); } catch (e) { } };
  }
  bird(t) {
    const ctx = this.ctx;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t0 = t + k * 0.11, f = 2200 + Math.random() * 900;
      o.type = "sine"; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 1.35, t0 + 0.07);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.09);
      o.connect(g); g.connect(this.bus); o.start(t0); o.stop(t0 + 0.1);
    }
  }
}
