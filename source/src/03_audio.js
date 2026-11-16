// ============================================================================
// audio: synthesized sound effects + small music loops (WebAudio) and German
// speech through the browser's own speech synthesis (speechSynthesis, de-DE).
// ============================================================================
const RATE = 22050;

function synthTone(freqs, dur, wave, vol, slide, a, r, noise) {
  wave = wave || "sine"; slide = slide || 0; a = a === undefined ? 0.01 : a; r = r === undefined ? 0.4 : r; noise = noise || 0;
  const n = Math.floor(RATE * dur), out = new Float32Array(n), rnd = Rng(1);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const f = freqs[Math.min(freqs.length - 1, Math.floor(k * freqs.length))] * (1 + slide * k);
    ph += TAU * f / RATE;
    let v;
    if (wave === "sine") v = Math.sin(ph);
    else if (wave === "square") v = Math.sin(ph) > 0 ? 0.6 : -0.6;
    else if (wave === "tri") v = 2 / Math.PI * Math.asin(Math.sin(ph));
    else v = rnd() * 2 - 1;
    if (noise) v = v * (1 - noise) + (rnd() * 2 - 1) * noise;
    const t = i / RATE, rel = dur * r;
    let env = 1;
    if (t < a) env = t / a; else if (t > dur - rel) env = Math.max(0, (dur - t) / rel);
    out[i] = v * env;
  }
  return out;
}
function synthMix(...tracks) {
  const n = Math.max(...tracks.map(t => t.length)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (const t of tracks) if (i < t.length) s += t[i]; out[i] = s / tracks.length * 1.4; }
  return out;
}
function concat(arrs) {
  const n = arrs.reduce((a, b) => a + b.length, 0), out = new Float32Array(n);
  let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
const NOTE_NAMES = "C C# D D# E F F# G G# A A# B".split(" ");
function note(name, oct) { oct = oct === undefined ? 4 : oct; return 440 * Math.pow(2, (NOTE_NAMES.indexOf(name) - 9) / 12) * Math.pow(2, oct - 4); }

function musicLoop(kind) {
  let mel, bass, tempo, wave, oc;
  if (kind === "village") { mel = "G A C D E D C A G E G A C A G -".split(" "); bass = "C C A A F F G G".split(" "); tempo = 0.26; wave = "tri"; oc = 5; }
  else if (kind === "forest") { mel = "E - G A - B A - E - D E - G E -".split(" "); bass = "E E C C D D E E".split(" "); tempo = 0.32; wave = "sine"; oc = 5; }
  else if (kind === "tower") { mel = "A - C - B - E - A - F - E - - -".split(" "); bass = "A A F F D D E E".split(" "); tempo = 0.4; wave = "sine"; oc = 4; }
  else { mel = "C E G C G E F A C A G B D B C -".split(" "); bass = "C C F F G G C C".split(" "); tempo = 0.2; wave = "square"; oc = 5; }
  const m = concat(mel.map(n => n === "-" ? new Float32Array(Math.floor(RATE * tempo)) : synthTone([note(n, oc)], tempo, wave, 1, 0, 0.01, 0.7)));
  const b = concat(bass.map(n => synthTone([note(n, 3)], tempo * 2, "sine", 1, 0, 0.02, 0.3)));
  for (let i = 0; i < b.length; i++) b[i] *= 0.8;
  return synthMix(m, b);
}

class Audio {
  constructor() {
    this.ctx = null; this.snd = {}; this.music = null;
    this.current = null; this.currentColored = true; this.musicOn = true; this.voiceOn = true; this.ready = false;
    this.speech = new Speech();
  }
  // must be called from a user gesture (tap / key)
  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.build();
    this.ready = true;
    try { this.music = new Music(this.ctx); this.music.set(this.current, this.currentColored); } catch (e) { this.music = null; }
    this.speech.unlock();
  }
  buf(samples, vol) {
    const b = this.ctx.createBuffer(1, samples.length, RATE), d = b.getChannelData(0);
    for (let i = 0; i < samples.length; i++) d[i] = Math.max(-1, Math.min(1, samples[i] * vol));
    return b;
  }
  build() {
    const S = (n, s) => { this.snd[n] = this.buf(s, 0.6); };
    S("blip", synthTone([880], 0.03, "square", 1, 0, 0.01, 0.5).map(v => v * 0.12));
    S("step", synthTone([120], 0.05, "noise").map(v => v * 0.08));
    S("ok", synthMix(synthTone([note("C", 5), note("E", 5), note("G", 5)], 0.25, "tri"), synthTone([note("C", 6)], 0.25)));
    S("wrong", synthTone([300, 240], 0.25, "tri").map(v => v * 0.35));
    S("chime", synthMix(synthTone([note("E", 6), note("G", 6), note("B", 6), note("E", 7)], 0.7, "sine", 1, 0, 0.01, 0.7), synthTone([note("E", 5)], 0.7, "tri", 1, 0, 0.01, 0.8)));
    S("word", synthMix(synthTone([note("C", 5), note("G", 5), note("C", 6), note("E", 6), note("G", 6)], 0.9, "tri", 1, 0, 0.01, 0.6), synthTone([note("C", 4)], 0.9, "sine", 1, 0, 0.01, 0.8)));
    S("jump", synthTone([300], 0.22, "square", 1, 1.2).map(v => v * 0.25));
    S("land", synthTone([90], 0.08, "noise").map(v => v * 0.25));
    S("woof", synthTone([220, 180], 0.16, "square", 1, 0, 0.01, 0.4, 0.3).map(v => v * 0.3));
    S("meow", synthTone([600, 800, 500], 0.35, "tri").map(v => v * 0.3));
    S("baa", synthTone([330, 320, 340, 310], 0.45, "square", 1, 0, 0.01, 0.4, 0.15).map(v => v * 0.2));
    S("crackle", synthTone([60], 0.4, "noise").map(v => v * 0.2));
    S("brr", synthTone([90, 110, 90, 110, 90], 0.35, "square").map(v => v * 0.2));
    S("grow", synthTone([150], 0.6, "tri", 1, 2.0).map(v => v * 0.4));
    S("shrink", synthTone([600], 0.6, "tri", 1, -0.7).map(v => v * 0.4));
    S("whoosh", synthTone([200], 0.35, "noise", 1, 1).map(v => v * 0.25));
    S("shadow", synthTone([70, 65, 60], 0.6, "square", 1, 0, 0.01, 0.4, 0.4).map(v => v * 0.2));
    S("poof", synthMix(synthTone([note("G", 5), note("C", 6), note("E", 6)], 0.35), synthTone([200], 0.35, "noise")));
    S("splash", synthTone([500], 0.3, "noise", 1, -0.6).map(v => v * 0.3));
    S("door", synthTone([180, 140], 0.3, "square", 1, 0, 0.01, 0.4, 0.2).map(v => v * 0.15));
    S("paint", synthTone([400, 600, 800], 0.3).map(v => v * 0.4));
    S("stone", synthTone([140, 120], 0.12, "square", 1, 0, 0.01, 0.4, 0.5).map(v => v * 0.25));
    S("owl", synthMix(synthTone([note("A", 4)], 0.25, "sine", 1, 0, 0.01, 0.6), synthTone([note("F", 4)], 0.4, "sine", 1, 0, 0.01, 0.6)));
    S("growl", synthTone([80, 70, 90, 60], 0.6, "square", 1, 0, 0.01, 0.4, 0.3).map(v => v * 0.25));
    S("page", synthTone([2000], 0.08, "noise").map(v => v * 0.12));
    S("tick", synthTone([1200], 0.02, "square").map(v => v * 0.1));
  }
  play(name, vol) {
    if (!this.ctx || !this.snd[name]) return;
    try {
      const src = this.ctx.createBufferSource(); src.buffer = this.snd[name];
      const g = this.ctx.createGain(); g.gain.value = vol === undefined ? 1 : vol;
      src.connect(g); g.connect(this.ctx.destination); src.start();
    } catch (e) { }
  }
  setMusic(kind, colored) {
    colored = colored !== false;
    this.current = kind; this.currentColored = colored;
    if (this.music) this.music.set(kind, colored);
  }
  tickMusic() { if (this.music) { try { this.music.tick(); } catch (e) { } } }
  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.music) this.music.setOn(this.musicOn);
  }
  say(text) { if (this.voiceOn) this.speech.say(text); }
}

class Speech {
  constructor() {
    this.voice = null; this.available = false;
    this.synth = (typeof window !== "undefined" && window.speechSynthesis) || null;
    if (!this.synth) return;
    const pick = () => {
      const vs = this.synth.getVoices() || [];
      const de = vs.filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith("de"));
      const pref = de.find(v => /anna|petra|google|de-de/i.test(v.name + v.lang) && v.localService) || de.find(v => v.localService) || de[0];
      if (pref) { this.voice = pref; this.available = true; }
      else if (vs.length) this.available = false;
    };
    pick();
    try { this.synth.addEventListener("voiceschanged", pick); } catch (e) { this.synth.onvoiceschanged = pick; }
    this.assumeOk = true;   // Android often reports no voices until the first utterance: try anyway with lang=de-DE
  }
  unlock() {
    if (!this.synth) return;
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; u.lang = "de-DE"; this.synth.speak(u); } catch (e) { }
  }
  say(text) {
    if (!this.synth || !text) return;
    text = text.replace(/…/g, " ");
    try {
      this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE"; u.rate = 0.85;
      if (this.voice) u.voice = this.voice;
      this.synth.speak(u);
    } catch (e) { }
  }
}
