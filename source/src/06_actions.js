// ============================================================================
// actions: everything a story script can `yield`. Events reaching actions:
//   {type:"key", key:"left|right|up|down|space|enter|e|shift|back|1..9|..."}
//   {type:"tap", x, y}   {type:"move", x, y}    (logical 960x640 coordinates)
// ============================================================================
function isConfirm(ev) { return (ev.type === "key" && (ev.key === "e" || ev.key === "space" || ev.key === "enter")) || ev.type === "tap"; }

class Action {
  constructor() { this.done = false; this.result = null; this.t = 0; this.dimA = 0; }
  start(g) { this.g = g; this.t = 0; }
  handle(ev) { }
  update(dt) {
    this.t += dt;
    if (this.g.auto && this.t > 0.02) this.autoplay();
    else if (this.g.debugAuto && !this.done && this.t > this.autoDelay()) this.autoplay();   // debug "watch" mode
  }
  autoDelay() { return 2.4; }
  autoplay() { this.done = true; }
  draw(ctx) { }
}

function boxR() { return [20, HEIGHT - 176, WIDTH - 40, 158]; }

function portraitOf(g, speaker) {
  const colored = g.isColored(speaker), sprite = g.speakerSprite(speaker), key = speaker + "|" + sprite + "|" + colored;
  if (g.portraitCache[key] !== undefined) return g.portraitCache[key];
  let img = null;
  const a = g.art;
  if (sprite === "funke") {
    img = makeCanvas(84, 84);
    const c = img.getContext("2d"), gr = c.createRadialGradient(42, 44, 2, 42, 44, 40);
    gr.addColorStop(0, "rgba(255,245,190,1)"); gr.addColorStop(0.4, "rgba(255,190,80,0.6)"); gr.addColorStop(1, "rgba(255,150,50,0)");
    c.fillStyle = gr; c.beginPath(); c.arc(42, 44, 40, 0, TAU); c.fill();
    c.fillStyle = "rgb(255,252,232)"; c.beginPath(); c.arc(42, 44, 12, 0, TAU); c.fill();
    c.fillStyle = "rgb(90,50,30)"; c.fillRect(36, 40, 3, 5); c.fillRect(45, 40, 3, 5);
    c.fillRect(38, 49, 8, 2);
  } else if (a.people[sprite]) {
    const fr = (colored ? a.people : a.peopleGrey)[sprite].down[0];
    img = makeCanvas(84, 84);
    const c = img.getContext("2d"); c.imageSmoothingEnabled = false;
    c.drawImage(fr, 42 - fr.width, 4, fr.width * 2, fr.height * 2);
  } else if (a.animals[sprite]) {
    const fr = (colored ? a.animals : a.animalsGrey)[sprite].right[0];
    const k = Math.min(76 / fr.width, 76 / fr.height);
    img = makeCanvas(84, 84);
    const c = img.getContext("2d"); c.imageSmoothingEnabled = false;
    c.drawImage(fr, 42 - fr.width * k / 2, 42 - fr.height * k / 2, fr.width * k, fr.height * k);
  }
  g.portraitCache[key] = img;
  return img;
}

function drawImg(ctx, img, x, y, k) {
  ctx.imageSmoothingEnabled = false;
  if (!k || k === 1) ctx.drawImage(img, Math.round(x), Math.round(y));
  else ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(img.width * k), Math.round(img.height * k));
}

function tapHint(g) { return g.touch ? "нажми, чтобы продолжить" : "E — дальше"; }

// ---------------------------------------------------------------------------- dialogue
class Say extends Action {
  constructor(speaker, text, speak) { super(); this.speaker = speaker; this.text = text; this.speak = speak !== false; this.shown = 0; }
  start(g) {
    super.start(g);
    this.total = textLength(this.text, g.known, g.name);
    const de = germanParts(this.text, g.name);
    if (de && this.speak) { g.audio.say(de); g.lastGerman = de; }
    this.lastBlip = 0;
    this.hint = new Hint(hintFor(this.text, g.name));
  }
  autoDelay() { return 1.0 + this.total / 38; }
  handle(ev) { if (this.hint.handle(ev, this.t, this.g)) return; if (isConfirm(ev)) { if (this.shown < this.total) this.shown = this.total; else this.done = true; } }
  update(dt) {
    super.update(dt);
    if (this.shown < this.total) {
      this.shown += dt * (this.speaker ? 70 : 55);
      const b = Math.floor(this.shown / 3);
      if (b !== this.lastBlip) { this.lastBlip = b; if (this.speaker && this.speaker !== "think") this.g.audio.play("blip", 0.4); }
    }
  }
  draw(ctx) { drawSayBox(ctx, this.g, this.speaker, this.text, this.shown, this.shown >= this.total, this.t); this.hint.draw(ctx, this.g, this.t, WIDTH - 40); }
}

function drawSayBox(ctx, g, speaker, text, shown, finished, t) {
  const BOX = boxR();
  const narr = speaker === null || speaker === undefined, think = speaker === "think";
  panel(ctx, BOX, { color: narr ? [22, 18, 34] : PANEL, border: (narr || think) ? MUTED : GOLD });
  let x = BOX[0] + 22;
  if (!narr && !think) {
    const img = portraitOf(g, speaker);
    if (img) {
      const pr = [BOX[0] + 14, BOX[1] + 14, 92, 92];
      roundRect(ctx, pr[0], pr[1], pr[2], pr[3], 8); ctx.fillStyle = rgb(PANEL2); ctx.fill();
      ctx.drawImage(img, pr[0] + 4, pr[1] + 4);
      x = pr[0] + pr[2] + 18;
    }
    const name = g.speakerName(speaker), nw = measure(ctx, name, 28, true);
    panel(ctx, [x - 12, BOX[1] - 20, nw + 24, 34], { color: PANEL, border: GOLD, alpha: 255, radius: 8, width: 2 });
    drawText(ctx, name, x, BOX[1] - 12, 28, GOLD, { bold: true });
  }
  const rect = [x, BOX[1] + 22, BOX[0] + BOX[2] - x - 24, BOX[3] - 30];
  drawMixed(ctx, think ? "(" + text + ")" : text, g.known, rect, 29, Math.floor(shown), g.name);
  if (finished && Math.floor(t * 3) % 2 === 0) {
    const bx = BOX[0] + BOX[2], by = BOX[1] + BOX[3];
    ctx.fillStyle = rgb(GOLD); ctx.beginPath(); ctx.moveTo(bx - 30, by - 24); ctx.lineTo(bx - 18, by - 24); ctx.lineTo(bx - 24, by - 16); ctx.fill();
  }
}

// ---------------------------------------------------------------------------- hints (v4.1): a Russian translation of a German
// phrase, only on request. After HINT_DELAY seconds a small "? подсказка" pill appears; H or a tap opens it.
const HINT_DELAY = 4;
const HINT_TR_RAW = {
  "Hallo! Ich bin der Fuchs. Ich bin rot!": "Привет! Я лиса. Я рыжая!",
  "Ich bin klein…": "Я маленький…", "Ich bin klein!": "Я маленький!", "Ich bin groß!": "Я большой!", "Ich bin groß.": "Я большой.",
  "Du bist klein! Ha!": "Ты маленький! Ха!", "Du bist nicht klein.": "Ты не маленький.",
  "Du bist mein Freund.": "Ты мой друг.", "Du bist mein… Freund?": "Ты мой… друг?", "Und du bist mein Freund!": "А ты мой друг!",
  "Der Bär ist klein?": "Медведь маленький?", "Der Bär ist nicht klein!": "Медведь не маленький!", "Der Bär ist groß!": "Медведь большой!",
  "Er ist groß! Sehr groß!": "Он большой! Очень большой!", "Er ist klein. Er ist blau.": "Он маленький. Он синий.",
  "Er ist klein.": "Он маленький.", "Er ist rot.": "Он рыжий.",
  "Das Wasser ist kalt!": "Вода холодная!", "Das Wasser ist heiß!": "Вода горячая!", "Das Wasser ist blau!": "Вода синяя!",
  "Das Feuer ist heiß!": "Огонь горячий!", "Der Wald ist dunkel.": "Лес тёмный.",
  "Das Haus ist rot!": "Дом красный!", "Der Baum ist grün!": "Дерево зелёное!", "Die Blume ist gelb!": "Цветок жёлтый!", "Das Schaf ist weiß!": "Овца белая!",
  "Das Haus ist rot. Der Baum ist grün.": "Дом красный. Дерево зелёное.",
  "Das Haus ist rot. Der Baum ist grün. Die Blume ist gelb.": "Дом красный. Дерево зелёное. Цветок жёлтый.",
  "Du bist bunt!": "Ты пёстрый!", "du bist bunt!": "ты пёстрый!",
  "Hallo, {name}! Hallo, Magier!": "Привет, {name}! Привет, Маг!", "Brot? Bitte!": "Хлеба? Пожалуйста!", "Brot? Wie viele?": "Хлеба? Сколько?",
  "Wer bist du?": "Кто ты?", "Was ist das?": "Что это?", "Ich bin nicht allein.": "Я не один.", "Nicht… allein?": "Не один?",
  "Sehr gut!": "Очень хорошо!", "Sehr gut, {name}.": "Очень хорошо, {name}.", "Ja… Danke.": "Да… Спасибо.",
  "Eins, zwei, drei, vier, fünf!": "Один, два, три, четыре, пять!", "Eins, zwei, drei, vier, fünf…": "Один, два, три, четыре, пять…",
  "Danke, {name}! Danke, danke!": "Спасибо, {name}! Спасибо, спасибо!", "Danke, danke, {name}!": "Спасибо, спасибо, {name}!",
  "Hallo, {name}! Ich bin nicht allein. Du bist mein Freund. Der Wald ist grün. Das Wasser ist kalt. Das Feuer ist heiß. Danke! Komm mit!":
    "Привет, {name}! Я не один. Ты мой друг. Лес зелёный. Вода холодная. Огонь горячий. Спасибо! Пойдём со мной!",
};
const HINT_EXTRA = { er: "он", sehr: "очень", und: "и", gut: "хорошо", super: "отлично", ha: "ха", was: "что", wie: "как", viele: "много",
  bring: "принеси", mir: "мне", oma: "бабушка", opa: "дедушка", magier: "маг", bunt: "пёстрый", stein: "камень", der: "", die: "", das: "" };
function hintNorm(s) { return s.toLowerCase().replace(/[^a-z0-9äöüß{} ]/g, " ").replace(/\s+/g, " ").trim(); }
let _hintTr = null;
function hintTr() { if (!_hintTr) { _hintTr = {}; for (const [k, v] of Object.entries(HINT_TR_RAW)) _hintTr[hintNorm(k)] = v; } return _hintTr; }
function glossWord(w) {
  w = hintNorm(w); const k = deIndex()[w];
  if (k) return WORDS[k].ru;
  return w in HINT_EXTRA ? HINT_EXTRA[w] : null;
}
function glossList(tokens) {
  return tokens.map(t => { const r = glossWord(t); return r ? `${t} — ${r}` : null; }).filter(Boolean).join(" · ");
}
// the hint for a line of mixed text, or null when it has no German phrase worth explaining
function hintFor(text, name) {
  const raw = []; let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) if (m[3]) raw.push(m[3]);
  if (!raw.length) return null;
  const norm = hintNorm(raw.join(" ")), words = norm.split(" ").filter(w => w && w !== "{name}");
  let tr = hintTr()[norm];
  const bm = !tr && norm.match(/^bring mir (\S+)$/);
  if (bm) tr = `Принеси мне ${glossWord(bm[1]) || bm[1]}!`;
  if (!tr && words.length < 3) return null;
  if (!tr) tr = glossList(words);
  return tr ? tr.replace(/\{name\}/g, name) : null;
}
class Hint {
  constructor(text, delay) { this.text = text; this.delay = delay || HINT_DELAY; this.open = false; this.rect = null; }
  ready(t) { return !!this.text && t >= this.delay; }
  handle(ev, t, g) {
    if (!this.ready(t)) return false;
    const hit = (ev.type === "key" && ev.key === "h") || (ev.type === "tap" && this.rect && inRect(this.rect, ev.x, ev.y));
    if (hit) { this.open = !this.open; if (g) g.audio.play("tick"); }
    return hit;
  }
  // mode "box": above the dialogue box (maxW = free width); mode "free": pill at (px,py), panel at area [x,y,w]
  draw(ctx, g, t, maxW, area) {
    this.rect = null;
    if (!this.ready(t)) return;
    const a = Math.min(1, (t - this.delay) * 3), size = 24;
    ctx.save(); ctx.globalAlpha = a;
    if (!this.open) {
      const label = g.touch ? "?  подсказка" : "H — подсказка", w = measure(ctx, label, size, true) + 28;
      const r = area ? [area.px, area.py, w, 38] : [boxR()[0], boxR()[1] - 66, w, 38];
      panel(ctx, r, { color: PANEL, border: MUTED, alpha: 235, radius: 10, width: 2 });
      drawText(ctx, label, r[0] + 14, r[1] + 7, size, [190, 205, 240], { bold: true });
      this.rect = r;
    } else {
      const w = area ? area.w : maxW, lines = layoutMixed(ctx, [{ t: this.text, c: WHITE, key: null, de: false }], w - 32, size);
      const h = lines.length * 25 + 22;
      const r = area ? [area.x, area.y, w, h] : [boxR()[0], boxR()[1] - 30 - h, w, h];
      panel(ctx, r, { color: [26, 30, 52], border: [150, 170, 230], alpha: 240, radius: 10, width: 2 });
      drawMixed(ctx, this.text, {}, [r[0] + 16, r[1] + 11, w - 32, h], size, null, g.name, 25);
      this.rect = r;
    }
    ctx.restore();
  }
}

class Choice extends Action {
  constructor(speaker, prompt, options, correct, image) {
    super(); this.speaker = speaker; this.prompt = prompt; this.options = options;
    this.correct = correct === undefined ? 0 : correct; this.image = image || null; this.sel = 0; this.rects = [];
  }
  start(g) {
    super.start(g);
    const de = germanParts(this.prompt, g.name);
    if (de) { g.audio.say(de); g.lastGerman = de; }
    this.hint = new Hint(hintFor(this.prompt, g.name));
  }
  autoplay() { this.pick(this.correct === null ? 0 : this.correct); }
  pick(i) {
    this.result = i; this.done = true;
    if (this.correct !== null && this.options.length > 1) this.g.reportAnswer(i === this.correct, null);
    const de = germanParts(this.options[i], this.g.name);
    if (de) { this.g.audio.say(de); this.g.lastGerman = de; }
    this.g.audio.play("blip");
  }
  handle(ev) {
    const n = this.options.length;
    if (this.hint.handle(ev, this.t, this.g)) return;
    if (ev.type === "key") {
      if (ev.key === "up") { this.sel = (this.sel - 1 + n) % n; this.g.audio.play("tick"); }
      else if (ev.key === "down") { this.sel = (this.sel + 1) % n; this.g.audio.play("tick"); }
      else if (/^[1-9]$/.test(ev.key) && +ev.key - 1 < n) this.pick(+ev.key - 1);
      else if (isConfirm(ev)) this.pick(this.sel);
    } else if (ev.type === "move") { this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.sel = i; }); }
    else if (ev.type === "tap") { this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.pick(i); }); }
  }
  draw(ctx) {
    const g = this.g;
    if (this.image) {
      const w = this.image.width, h = this.image.height, x = WIDTH / 2 - w / 2, y = 200 - h / 2;
      panel(ctx, [x - 20, y - 20, w + 40, h + 40], { alpha: 250 });
      drawImg(ctx, this.image, x, y);
    }
    drawSayBox(ctx, g, this.speaker, this.prompt, 1e6, false, this.t);
    const BOX = boxR();
    const n = this.options.length, bw = g.touch ? 380 : 330, bh = g.touch ? 52 : 44, gap = bh + 8;
    this.rects = [];
    const y0 = BOX[1] - 20 - n * gap;
    this.options.forEach((o, i) => {
      const r = [WIDTH - bw - 34, y0 + i * gap, bw, bh];
      this.rects.push(r);
      const sel = i === this.sel && !g.touch;
      panel(ctx, r, { color: sel ? PANEL2 : PANEL, border: sel ? GOLD : MUTED, alpha: 245, width: sel ? 3 : 2 });
      drawText(ctx, String(i + 1), r[0] + 14, r[1] + bh / 2 - 9, 24, sel ? GOLD : MUTED);
      drawMixed(ctx, o, g.known, [r[0] + 40, r[1] + bh / 2 - 11, r[2] - 50, 30], 30, null, g.name);
      if (sel) { ctx.fillStyle = rgb(GOLD); ctx.beginPath(); const cy = r[1] + bh / 2; ctx.moveTo(r[0] - 16, cy - 7); ctx.lineTo(r[0] - 6, cy); ctx.lineTo(r[0] - 16, cy + 7); ctx.fill(); }
    });
    this.hint.draw(ctx, g, this.t, WIDTH - bw - 100);
  }
}

// ---------------------------------------------------------------------------- the birth of a word
function drawHat(ctx, cx, bottom, color, k) {
  k = k || 1;
  const w = 46 * k;
  ctx.fillStyle = rgb(color);
  ctx.beginPath(); ctx.ellipse(cx, bottom - 3 * k, w / 2, 5 * k, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - w / 3, bottom - 4 * k); ctx.lineTo(cx + w / 3, bottom - 4 * k); ctx.lineTo(cx + 4, bottom - 30 * k); ctx.lineTo(cx - 6, bottom - 26 * k); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(light(color, 0.4));
  ctx.beginPath(); ctx.ellipse(cx, bottom - 7 * k, w / 3, 3 * k, 0, 0, TAU); ctx.fill();
}

class Spark extends Action {
  constructor(key, feel, effect, image, fast) {
    super(); this.key = key; this.feel = feel || WORDS[key].feel; this.effect = effect || null; this.image = image || null;
    this.fast = !!fast; this.phase = "feel"; this.shown = 0; this.letters = []; this.pt = 0; this.burst = [];
  }
  start(g) {
    super.start(g);
    const d = WORDS[this.key];
    this.de = d.de; this.art = d.art; this.col = wordColor(this.key);
    if (!this.image) { this.image = g.art.wordIcon(this.key); this.imageGrey = this.image; }
    else if (Array.isArray(this.image)) { this.imageGrey = this.image[1]; this.image = this.image[0]; }
    else this.imageGrey = this.image;
    this.total = this.feel.length;
    const ctx = g.ctx;
    const totalW = measure(ctx, this.de, 92, true);
    const aw = this.art ? measure(ctx, this.art, 60, true) + 26 : 0;
    let x = WIDTH / 2 - (totalW + aw) / 2 + aw;
    this.artX = x - aw / 2 - 8;
    let i = 0;
    for (const ch of this.de) {
      const w = measure(ctx, ch, 92, true), ang = Math.random() * TAU;
      this.letters.push({ ch, x, sx: WIDTH / 2 + Math.cos(ang) * 520, sy: 330 + Math.sin(ang) * 380, t: -i * (this.fast ? 0.06 : 0.11) });
      x += w; i++;
    }
    const sfx = { warm: "crackle", cold: "brr", small: "shrink", big: "grow", dark: "whoosh", light: "chime", dog: "woof", cat: "meow", sheep: "baa", owl: "owl", bear: "growl", water: "splash", door: "door", jump: "jump" }[this.effect];
    if (sfx) g.audio.play(sfx);
    if (this.fast) this.shown = this.total;
  }
  autoplay() { if (!this.done) { this.g.learn(this.key, true); this.done = true; } }
  handle(ev) {
    if (!isConfirm(ev)) return;
    if (this.phase === "feel") { if (this.shown < this.total) this.shown = this.total; else { this.phase = "form"; this.pt = 0; } }
    else if (this.phase === "form") { for (const L of this.letters) L.t = Math.max(L.t, 1); this.phase = "say"; this.pt = 0; }
    else if (this.phase === "say") this.speak();
    else if (this.phase === "done" && this.pt > 0.4) this.done = true;
  }
  speak() {
    const g = this.g;
    g.audio.say(withArticle(this.key)); g.lastGerman = withArticle(this.key);
    g.audio.play("word"); g.learn(this.key, true);
    this.phase = "done"; this.pt = 0;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * TAU, sp = uniform(80, 420);
      this.burst.push([WIDTH / 2, 330, Math.cos(a) * sp, Math.sin(a) * sp, uniform(0.6, 1.3), choice([this.col, GOLD, WHITE])]);
    }
  }
  update(dt) {
    super.update(dt);
    this.pt += dt; this.dimA = Math.min(218, this.dimA + dt * 500);
    const fast = this.g.fastLearner();
    if (this.phase === "feel") { if (this.shown < this.total) this.shown += dt * (fast ? 95 : 38); }
    else if (this.phase === "form") {
      let all = true;
      for (const L of this.letters) {
        const b = L.t; L.t += dt * (this.fast || fast ? 2.8 : 1.7);
        if (b < 1 && L.t >= 1) this.g.audio.play("tick", 0.6);
        if (L.t < 1) all = false;
      }
      if (all) { this.phase = "say"; this.pt = 0; }
    }
    for (const p of this.burst) { p[0] += p[2] * dt; p[1] += p[3] * dt; p[3] += 200 * dt; p[4] -= dt; }
    this.burst = this.burst.filter(p => p[4] > 0);
  }
  drawEffect(ctx) {
    const e = this.effect, t = this.t;
    const frame = (col, a) => { for (let i = 0; i < 8; i++) { ctx.strokeStyle = rgb(col, a * (8 - i) / 8 / 255); ctx.lineWidth = 14; ctx.strokeRect(i * 14 + 7, i * 14 + 7, WIDTH - i * 28 - 14, HEIGHT - i * 28 - 14); } };
    if (e === "warm") {
      frame([255, 120, 30], 70 + 30 * Math.sin(t * 6));
      ctx.fillStyle = "rgb(255,190,80)";
      for (let i = 0; i < 14; i++) { const x = (i * 137 + t * 40) % WIDTH, y = HEIGHT - ((t * 120 + i * 53) % HEIGHT); ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
    } else if (e === "cold") {
      frame([150, 210, 255], 70);
      ctx.fillStyle = "rgb(240,250,255)";
      for (let i = 0; i < 40; i++) { const x = ((i * 97 + Math.sin(t + i) * 30) % WIDTH + WIDTH) % WIDTH, y = (t * 60 + i * 41) % HEIGHT; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
    } else if (e === "dark") { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    else if (e === "light") {
      const r = 160 + 40 * Math.sin(t * 3);
      for (let i = 10; i > 0; i--) { ctx.fillStyle = "rgba(255,230,150,0.05)"; ctx.beginPath(); ctx.arc(WIDTH / 2, 200, r * i / 6, 0, TAU); ctx.fill(); }
    } else if (e === "small" || e === "big") {
      ctx.strokeStyle = "rgb(120,100,160)"; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const rr = e === "small" ? 360 - ((t * 140 + i * 60) % 360) : (t * 140 + i * 60) % 360;
        ctx.beginPath(); ctx.arc(WIDTH / 2, 200, Math.max(2, rr), 0, TAU); ctx.stroke();
      }
    }
  }
  draw(ctx) {
    const g = this.g;
    dim(ctx, this.dimA);
    this.drawEffect(ctx);
    const img = this.phase === "done" ? this.image : this.imageGrey;
    let cx = WIDTH / 2, cy = 170, k = img.width < 80 ? 2.2 : 1.6;
    if (this.effect === "small" && this.phase !== "done") k *= 0.8 + 0.2 * Math.cos(this.t * 2);
    if (this.effect === "big") k *= 1 + Math.min(0.4, this.t * 0.1);
    let ox = 0, rot = 0;
    if (this.effect === "shake" && this.phase === "feel") ox = Math.sin(this.t * 14) * 10;
    if (this.effect === "nod" && this.phase === "feel") cy += Math.sin(this.t * 9) * 8;
    if (this.effect === "wave" && this.phase === "feel") rot = Math.sin(this.t * 8) * 10 * Math.PI / 180;
    const w = img.width * k, h = img.height * k;
    if (this.phase === "done") { ctx.fillStyle = rgb(this.col, 60 / 255); ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 + 40, h / 2 + 40, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(cx + ox, cy); ctx.rotate(rot); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    if (this.phase === "feel" || !this.fast)
      drawMixed(ctx, this.feel, g.known, [150, 268, WIDTH - 300, 80], 30, this.phase === "feel" ? Math.floor(this.shown) : null, g.name);
    const baseY = 360;
    ctx.font = fontCss(92, true); ctx.textBaseline = "top"; ctx.textAlign = "left";
    for (const L of this.letters) {
      const tt = Math.max(0, Math.min(1, L.t));
      if (tt <= 0) continue;
      const e = 1 - Math.pow(1 - tt, 3);
      const x = L.sx + (L.x - L.sx) * e, y = L.sy + (baseY - L.sy) * e;
      const col = this.phase === "done" ? this.col : light(this.col, 0.5 * (1 - tt) + 0.2);
      ctx.fillStyle = "rgb(10,6,16)"; ctx.fillText(L.ch, x + 4, y + 4);
      ctx.fillStyle = rgb(col); ctx.fillText(L.ch, x, y);
      if (tt < 1) { ctx.fillStyle = rgb(GOLD); ctx.beginPath(); ctx.arc(x + 12, y + 30, 3, 0, TAU); ctx.fill(); }
    }
    if (this.art && (this.phase === "say" || this.phase === "done")) {
      const hc = hatColor(this.art);
      drawHat(ctx, this.artX, baseY + 26, hc, 1.15);
      drawText(ctx, this.art, this.artX, baseY + 52, 60, light(hc, 0.3), { center: true, bold: true });
    }
    for (const p of this.burst) { ctx.fillStyle = rgb(p[5]); ctx.fillRect(p[0] - 2, p[1] - 2, 5, 5); }
    if (this.phase === "feel" && this.shown >= this.total && Math.floor(this.t * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
    if (this.phase === "say") {
      const pulse = 1 + 0.06 * Math.sin(this.pt * 6), w2 = 420 * pulse, h2 = 54 * pulse;
      panel(ctx, [WIDTH / 2 - w2 / 2, 520 - h2 / 2, w2, h2], { color: PANEL2, border: this.col });
      drawText(ctx, g.touch ? "Нажми и скажи вслух" : "ПРОБЕЛ — скажи вслух", WIDTH / 2, 520, 30, WHITE, { center: true });
    }
    if (this.phase === "done") {
      drawText(ctx, "Новое слово в книге!", WIDTH / 2, 500, 30, GOLD, { center: true });
      if (Math.floor(this.pt * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
    }
  }
}

// ---------------------------------------------------------------------------- sentence building
function keyOfToken(tok) { return deIndex()[tok.toLowerCase().replace(/[!?.,]/g, "")] || null; }
function tileColor(tok) {
  const l = tok.toLowerCase();
  if (l === "der" || l === "die" || l === "das") return hatColor(l);
  const k = keyOfToken(tok);
  return k ? wordColor(k) : [230, 220, 200];
}
function drawStone(ctx, r, color, text, small, sel, glow) {
  if (glow) { roundRect(ctx, r[0] - 15, r[1] - 15, r[2] + 30, r[3] + 30, 20); ctx.fillStyle = rgb(GOLD, 70 / 255); ctx.fill(); }
  const y = sel ? r[1] - 6 : r[1];
  roundRect(ctx, r[0], y + 5, r[2], r[3], 14); ctx.fillStyle = "rgb(70,64,60)"; ctx.fill();
  roundRect(ctx, r[0], y, r[2], r[3], 14); ctx.fillStyle = "rgb(176,170,160)"; ctx.fill();
  roundRect(ctx, r[0] + 5, y + 5, r[2] - 10, r[3] - 18, 10); ctx.fillStyle = "rgb(205,200,190)"; ctx.fill();
  roundRect(ctx, r[0] + 2, y + 2, r[2] - 4, r[3] - 4, 13); ctx.strokeStyle = rgb(color); ctx.lineWidth = 4; ctx.stroke();
  if (sel) { roundRect(ctx, r[0] - 4, y - 4, r[2] + 8, r[3] + 8, 16); ctx.strokeStyle = rgb(GOLD); ctx.lineWidth = 3; ctx.stroke(); }
  drawText(ctx, text, r[0] + r[2] / 2, y + r[3] / 2, small ? 36 : 40, color.map(v => v * 0.55), { center: true, bold: true, shadow: false });
}

class Sentence extends Action {
  constructor(context, answer, extra, image) {
    super();
    this.context = context; this.answer = answer.slice(); this.tiles = answer.concat(extra || []);
    const r = Rng(context.length);
    for (let i = this.tiles.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]]; }
    if (this.tiles.slice(0, this.answer.length).join("|") === this.answer.join("|")) this.tiles.push(this.tiles.shift());
    this.used = this.tiles.map(() => false); this.slots = []; this.sel = 0; this.image = image || null;
    this.shake = 0; this.win = 0; this.rects = []; this.slotRects = [];
    this.hint = new Hint(glossList([...new Set(this.tiles)].filter(t => !/^[A-ZА-Я]/.test(t) || keyOfToken(t))), 6);
  }
  autoplay() { if (!this.done) { this.result = true; this.done = true; } }
  place(i) {
    if (this.used[i] || this.win) return;
    this.used[i] = true; this.slots.push(i); this.g.audio.play("stone");
    if (this.slots.length === this.answer.length) {
      const words = this.slots.map(j => this.tiles[j]);
      if (words.join("|") === this.answer.join("|")) {
        this.win = 0.01; this.g.audio.play("ok"); this.g.reportAnswer(this.mistakes === 0, null);
        const s = words.join(" "); this.g.audio.say(s); this.g.lastGerman = s;
        for (const w of words) { const k = keyOfToken(w); if (k) this.g.use(k); }
      } else { this.shake = 0.5; this.mistakes = (this.mistakes || 0) + 1; this.g.audio.play("wrong"); this.g.reportAnswer(false, null); }
    }
  }
  undo() { if (this.slots.length && !this.win) this.used[this.slots.pop()] = false; }
  handle(ev) {
    const n = this.tiles.length;
    if (this.win > 0.6 && isConfirm(ev)) { this.result = true; this.done = true; return; }
    if (!this.win && this.hint.handle(ev, this.t, this.g)) return;
    if (ev.type === "key") {
      if (ev.key === "left") this.sel = (this.sel - 1 + n) % n;
      else if (ev.key === "right") this.sel = (this.sel + 1) % n;
      else if (ev.key === "back") this.undo();
      else if (isConfirm(ev)) {
        this.place(this.sel);
        if (!this.win) { const free = []; for (let i = 0; i < n; i++) if (!this.used[i]) free.push(i); if (free.length) this.sel = free.reduce((a, b) => ((a - this.sel + n) % n <= (b - this.sel + n) % n ? a : b)); }
      }
    } else if (ev.type === "tap") {
      if (this.slotRects.some(r => inRect(r, ev.x, ev.y))) { this.undo(); return; }
      this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.place(i); });
    } else if (ev.type === "move") this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.sel = i; });
  }
  update(dt) {
    super.update(dt);
    this.dimA = Math.min(190, this.dimA + dt * 500);
    if (this.shake > 0) { this.shake -= dt; if (this.shake <= 0) { for (const i of this.slots) this.used[i] = false; this.slots = []; } }
    if (this.win) this.win += dt;
  }
  draw(ctx) {
    const g = this.g;
    dim(ctx, this.dimA);
    let top = 40;
    if (this.image) { drawImg(ctx, this.image, WIDTH / 2 - this.image.width / 2, 120 - this.image.height / 2); top = 120 + this.image.height / 2 + 10; }
    panel(ctx, [80, top, WIDTH - 160, 70], { alpha: 220, border: MUTED });
    drawMixed(ctx, this.context, g.known, [100, top + 12, WIDTH - 200, 60], 28, null, g.name);
    const widths = this.answer.map(t => Math.max(110, measure(ctx, t, 40, true) + 34));
    const total = widths.reduce((a, b) => a + b, 0) + 14 * (widths.length - 1);
    let x = WIDTH / 2 - total / 2;
    const ox = this.shake > 0 ? Math.sin(this.shake * 40) * 12 : 0;
    this.slotRects = [];
    widths.forEach((w, k) => {
      const r = [x + ox, 300, w, 64];
      this.slotRects.push(r);
      if (k < this.slots.length) { const tok = this.tiles[this.slots[k]]; drawStone(ctx, r, tileColor(tok), tok, false, false, this.win > 0); }
      else { roundRect(ctx, r[0], r[1], r[2], r[3], 12); ctx.strokeStyle = "rgb(90,80,110)"; ctx.lineWidth = 3; ctx.stroke(); }
      x += w + 14;
    });
    if (this.win) {
      drawText(ctx, "Верно!", WIDTH / 2, 250, 44, GREEN, { center: true, bold: true });
      if (this.win > 0.6 && Math.floor(this.win * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
    } else if (this.shake > 0) drawText(ctx, "Порядок не тот. Попробуй ещё раз!", WIDTH / 2, 250, 32, RED, { center: true });
    const tw = this.tiles.map(t => Math.max(100, measure(ctx, t, 36, true) + 30));
    const tt = tw.reduce((a, b) => a + b, 0) + 12 * (tw.length - 1);
    x = WIDTH / 2 - tt / 2;
    this.rects = [];
    this.tiles.forEach((t, i) => {
      const r = [x, 450, tw[i], 58];
      this.rects.push(r);
      if (!this.used[i]) drawStone(ctx, r, tileColor(t), t, true, i === this.sel && !this.win && !g.touch);
      else { roundRect(ctx, r[0], r[1], r[2], r[3], 12); ctx.strokeStyle = "rgb(60,52,76)"; ctx.lineWidth = 2; ctx.stroke(); }
      x += tw[i] + 12;
    });
    if (!this.win) this.hint.draw(ctx, g, this.t, 0, { px: 20, py: HEIGHT - 46, x: 80, y: 374, w: WIDTH - 160 });
    if (!this.win) drawText(ctx, g.touch ? "Нажимай на камни по порядку. Ошибся? Нажми на фразу, и последний камень вернётся." : "Стрелки — выбрать камень, E — положить, Backspace — убрать последний (можно и мышью)", WIDTH / 2, 560, 22, MUTED, { center: true });
  }
}

// ---------------------------------------------------------------------------- naming a shadow
class ShadowBattle extends Action {
  constructor(animal, key, options, hints) {
    super(); this.animal = animal; this.key = key; this.options = options; this.hints = hints;
    this.removed = new Set(); this.nhints = 1; this.sel = 0; this.phase = "fight"; this.pt = 0; this.shake = 0; this.burst = []; this.rects = [];
  }
  start(g) { super.start(g); g.audio.play("shadow"); }
  autoplay() { if (!this.done) { this.g.learn(this.key, true); this.done = true; } }
  choose(i) {
    if (this.removed.has(i) || this.phase !== "fight") return;
    const k = this.options[i];
    if (k === this.key) {
      this.phase = "named"; this.pt = 0;
      this.g.audio.play("poof"); this.g.audio.say(withArticle(k)); this.g.lastGerman = withArticle(k); this.g.learn(k, true);
      for (let j = 0; j < 90; j++) { const a = Math.random() * TAU, sp = uniform(60, 380); this.burst.push([WIDTH / 2, 230, Math.cos(a) * sp, Math.sin(a) * sp, uniform(0.6, 1.4), choice([[60, 40, 90], GOLD, wordColor(k), WHITE])]); }
    } else {
      this.removed.add(i); this.shake = 0.5; this.g.audio.play("growl"); this.g.reportAnswer(false, this.key);
      this.nhints = Math.min(this.hints.length, this.nhints + 1);
      for (let j = 0; j < this.options.length; j++) if (!this.removed.has(j)) { this.sel = j; break; }
    }
  }
  handle(ev) {
    const n = this.options.length;
    if (this.phase === "named") { if (isConfirm(ev) && this.pt > 0.8) this.done = true; return; }
    if (ev.type === "key") {
      if (ev.key === "up" || ev.key === "left") { do { this.sel = (this.sel - 1 + n) % n; } while (this.removed.has(this.sel)); }
      else if (ev.key === "down" || ev.key === "right") { do { this.sel = (this.sel + 1) % n; } while (this.removed.has(this.sel)); }
      else if (/^[1-9]$/.test(ev.key) && +ev.key - 1 < n) this.choose(+ev.key - 1);
      else if (isConfirm(ev)) this.choose(this.sel);
    } else if (ev.type === "tap") this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.choose(i); });
    else if (ev.type === "move") this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y) && !this.removed.has(i)) this.sel = i; });
  }
  update(dt) {
    super.update(dt);
    this.pt += dt; this.dimA = Math.min(215, this.dimA + dt * 400);
    if (this.shake > 0) this.shake -= dt;
    if (this.phase === "fight" && this.nhints < this.hints.length && this.pt > 5 * this.nhints) this.nhints++;
    for (const p of this.burst) { p[0] += p[2] * dt; p[1] += p[3] * dt; p[3] += 120 * dt; p[4] -= dt; }
    this.burst = this.burst.filter(p => p[4] > 0);
  }
  draw(ctx) {
    const g = this.g, a = g.art;
    dim(ctx, this.dimA);
    let img;
    if (this.phase === "fight") { const fr = a.shadows[this.animal].right; img = fr[Math.floor(this.t * 4) % fr.length]; }
    else { const fr = a.animals[this.animal].right; img = fr[Math.floor(this.t * 3) % fr.length]; }
    let k = img.width < 50 ? 3.2 : 2.4;
    if (this.phase === "fight") k *= 1 + 0.04 * Math.sin(this.t * 3) + 0.04 * this.removed.size;
    const w = img.width * k, h = img.height * k, ox = this.shake > 0 ? Math.sin(this.shake * 50) * 14 : 0;
    const rx = WIDTH / 2 + ox - w / 2, ry = 210 - h / 2;
    if (this.phase === "fight") for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(70,40,110,0.09)"; ctx.beginPath(); ctx.ellipse(WIDTH / 2 + ox, 210, w / 2 + 60 - i * 9, h / 2 + 60 - i * 9, 0, 0, TAU); ctx.fill(); }
    drawImg(ctx, img, rx, ry, k);
    if (this.phase === "fight") {
      const ex = rx + w * (this.animal !== "owl" ? 0.72 : 0.35), ey = ry + h * (this.animal !== "owl" ? 0.28 : 0.35);
      for (const dx of (this.animal !== "owl" ? [0] : [0, w * 0.3])) {
        ctx.fillStyle = "rgb(255,240,140)"; ctx.beginPath(); ctx.arc(ex + dx, ey, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(ex + dx, ey, 2, 0, TAU); ctx.fill();
      }
      const de = WORDS[this.key].de, show = this.removed.size;
      drawText(ctx, [...de].map((c, i) => i < show ? c : "_").join(" "), WIDTH / 2, 330, 38, MUTED, { center: true });
      let y = 365;
      for (const h2 of this.hints.slice(0, this.nhints)) { drawMixed(ctx, h2, g.known, [140, y, WIDTH - 280, 40], 27, null, g.name); y += 30; }
      drawText(ctx, "Назови тень по имени, и она снова станет собой:", WIDTH / 2, 470, 26, GOLD, { center: true });
      const n = this.options.length, bw = 230, x0 = WIDTH / 2 - (n * bw + (n - 1) * 16) / 2;
      this.rects = [];
      this.options.forEach((k2, i) => {
        const r = [x0 + i * (bw + 16), 500, bw, 60];
        this.rects.push(r);
        if (this.removed.has(i)) { roundRect(ctx, r[0], r[1], r[2], r[3], 12); ctx.strokeStyle = "rgb(60,50,70)"; ctx.lineWidth = 2; ctx.stroke(); drawText(ctx, withArticle(k2), r[0] + bw / 2, r[1] + 30, 30, [90, 80, 100], { center: true }); return; }
        const sel = i === this.sel && !g.touch;
        panel(ctx, r, { color: sel ? PANEL2 : PANEL, border: sel ? GOLD : MUTED, width: sel ? 3 : 2 });
        drawText(ctx, withArticle(k2), r[0] + bw / 2, r[1] + 30, 32, light(wordColor(k2), 0.3), { center: true, bold: true });
      });
    } else {
      const d = WORDS[this.key];
      drawHat(ctx, WIDTH / 2, 352, hatColor(d.art), 1.2);
      drawText(ctx, withArticle(this.key), WIDTH / 2, 390, 64, light(wordColor(this.key), 0.2), { center: true, bold: true });
      drawMixed(ctx, d.feel, g.known, [160, 440, WIDTH - 320, 80], 28, null, g.name);
      if (this.pt > 0.8 && Math.floor(this.pt * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
    }
    for (const p of this.burst) { ctx.fillStyle = rgb(p[5]); ctx.fillRect(p[0] - 2, p[1] - 2, 5, 5); }
  }
}

// ---------------------------------------------------------------------------- "Opa says": commands for the body
const CMD_KEYS = { links: ["ВЛЕВО", "left"], rechts: ["ВПРАВО", "right"], gehen: ["ВВЕРХ", "up"], springen: ["ПРОБЕЛ", "space"], laufen: ["SHIFT", "shift"], halt: ["замри!", null] };
const CMD_TEXT = { links: "Links!", rechts: "Rechts!", gehen: "Geh!", springen: "Spring!", laufen: "Lauf!", halt: "Halt!" };
const CMD_BTN = [["links", "←"], ["gehen", "↑"], ["rechts", "→"], ["springen", "прыжок"], ["laufen", "бег"]];

class OpaSays extends Action {
  constructor(commands, need, hints, timeLimit) {
    super(); this.commands = commands; this.need = need || 6; this.hints = hints !== false; this.timeLimit = timeLimit || 3.2;
    this.score = 0; this.cmd = null; this.ct = 0; this.state = "wait"; this.st = 0; this.heroAnim = null; this.msg = ""; this.last = null; this.btnRects = [];
  }
  start(g) { super.start(g); if (g.touch) this.timeLimit += 0.8; this.nextCmd(); }
  autoplay() { if (!this.done) { for (const c of this.commands) this.g.use(c); this.done = true; } }
  nextCmd() {
    const opts = this.commands.filter(c => c !== this.last);
    this.cmd = choice(opts.length ? opts : this.commands); this.last = this.cmd; this.ct = 0; this.state = "ask";
    this.g.audio.say(CMD_TEXT[this.cmd]); this.g.lastGerman = CMD_TEXT[this.cmd];
  }
  judge(ok) {
    this.state = ok ? "ok" : "bad"; this.st = 0;
    this.g.reportAnswer(ok, this.cmd);
    if (ok) { this.score++; this.g.audio.play("ok", 0.6); this.g.use(this.cmd); this.msg = choice(["<Gut!>", "<Ja!>", "<Super!>", "Отлично!", "<Ja, ja!>"]); }
    else { this.score = Math.max(0, this.score - 1); this.g.audio.play("wrong", 0.6); this.msg = choice(["Ой, руки-ноги перепутались!", "Ой! <Nein, nein!>", "Не спеши, сначала послушай.", "<Nein!> Давай ещё разок."]); }
  }
  press(c) { if (this.state !== "ask") return; this.heroAnim = [c, 0]; this.judge(c === this.cmd); }
  handle(ev) {
    if (this.state === "won") { if (isConfirm(ev) && this.st > 0.8) this.done = true; return; }
    if (ev.type === "tap") { for (const [r, c] of this.btnRects) if (inRect(r, ev.x, ev.y)) this.press(c); return; }
    if (ev.type !== "key") return;
    for (const [c, [, k]] of Object.entries(CMD_KEYS)) if (k && ev.key === k) { this.press(c); return; }
  }
  update(dt) {
    super.update(dt);
    this.dimA = Math.min(200, this.dimA + dt * 500); this.ct += dt; this.st += dt;
    if (this.heroAnim) this.heroAnim[1] += dt;
    if (this.state === "ask" && this.ct > this.timeLimit) {
      if (this.cmd === "halt") { this.heroAnim = ["halt", 0]; this.judge(true); } else this.judge(false);
    } else if ((this.state === "ok" || this.state === "bad") && this.st > 1.1) {
      this.heroAnim = null;
      if (this.score >= this.need) { this.state = "won"; this.st = 0; this.g.audio.play("chime"); } else this.nextCmd();
    }
  }
  draw(ctx) {
    const g = this.g;
    dim(ctx, this.dimA);
    const ar = [130, 150, WIDTH - 260, 300];
    roundRect(ctx, ar[0], ar[1], ar[2], ar[3], 24); ctx.fillStyle = "rgb(96,150,70)"; ctx.fill(); ctx.strokeStyle = "rgb(70,120,56)"; ctx.lineWidth = 4; ctx.stroke();
    const opa = g.art.people.opa.right[0];
    drawImg(ctx, opa, ar[0] + 30, ar[1] + ar[3] - opa.height * 2 - 20, 2);
    const hs = g.art.people.hero;
    let frame = hs.down[0], hx = ar[0] + ar[2] / 2 + 60, hy = ar[1] + ar[3] - 30;
    if (this.heroAnim) {
      const [c, t] = this.heroAnim;
      if (c === "links") { frame = hs.left[Math.floor(t * 8) % 3]; hx -= Math.min(1, t * 3) * 90; }
      else if (c === "rechts") { frame = hs.right[Math.floor(t * 8) % 3]; hx += Math.min(1, t * 3) * 90; }
      else if (c === "gehen") { frame = hs.up[Math.floor(t * 8) % 3]; hy -= Math.min(1, t * 3) * 40; }
      else if (c === "springen") { hy -= Math.sin(Math.min(1, t * 2) * Math.PI) * 90; frame = hs.down[1]; }
      else if (c === "laufen") {
        frame = hs.right[Math.floor(t * 16) % 3]; hx += Math.sin(t * 20) * 6;
        for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgb(200,190,160)"; ctx.beginPath(); ctx.arc(hx - 40 - i * 14, hy - 6 - (i % 2) * 4, 5 - i, 0, TAU); ctx.fill(); }
      }
    }
    drawImg(ctx, frame, hx - frame.width, hy - frame.height * 2, 2);
    if (["ask", "ok", "bad"].includes(this.state)) {
      const bub = [ar[0] + 120, ar[1] + 20, 300, 80];
      panel(ctx, bub, { color: [250, 246, 236], border: INK, alpha: 255 });
      drawText(ctx, CMD_TEXT[this.cmd], bub[0] + 150, bub[1] + 40, 56, INK, { center: true, shadow: false, bold: true });
      if (this.hints) {
        const ic = g.art.wordIcon(this.cmd);
        ctx.drawImage(ic, bub[0] + bub[2] + 14, bub[1] + 10);
        drawText(ctx, CMD_KEYS[this.cmd][0], bub[0] + bub[2] + 70, bub[1] + 26, 30, GOLD);
      }
      if (this.state === "ask") {
        const k = 1 - this.ct / this.timeLimit;
        ctx.fillStyle = "rgb(60,50,70)"; ctx.fillRect(ar[0] + 120, ar[1] + 108, 300, 8);
        ctx.fillStyle = rgb(this.cmd !== "halt" ? GOLD : MUTED); ctx.fillRect(ar[0] + 120, ar[1] + 108, 300 * Math.max(0, k), 8);
      } else {
        drawMixed(ctx, this.msg, g.known, [ar[0] + 120, ar[1] + 124, 400, 40], 30, null, g.name);
        ctx.fillStyle = rgb(this.state === "ok" ? GREEN : RED); ctx.beginPath(); ctx.arc(ar[0] + ar[2] - 40, ar[1] + 40, 18, 0, TAU); ctx.fill();
      }
    }
    for (let i = 0; i < this.need; i++) {
      ctx.fillStyle = rgb(i < this.score ? GOLD : [70, 60, 80]); ctx.beginPath(); ctx.arc(WIDTH / 2 - (this.need - 1) * 16 + i * 32, 480, 11, 0, TAU); ctx.fill();
    }
    if (this.state === "won") {
      drawText(ctx, "Sehr gut! Тело уже понимает по-немецки!", WIDTH / 2, 120, 40, GOLD, { center: true, bold: true });
      if (this.st > 0.8 && Math.floor(this.st * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
    } else drawText(ctx, g.touch ? "Опа командует, а ты делаешь. На «Halt!» замри и ничего не нажимай!" : "Опа командует, а ты делаешь: стрелки, ПРОБЕЛ, SHIFT. На «Halt!» замри!", WIDTH / 2, 120, 24, MUTED, { center: true });
    // big touch buttons for the commands
    this.btnRects = [];
    if (g.touch && this.state !== "won") {
      const bw = 150, gap = 14, x0 = WIDTH / 2 - (CMD_BTN.length * bw + (CMD_BTN.length - 1) * gap) / 2;
      CMD_BTN.forEach(([c, label], i) => {
        const r = [x0 + i * (bw + gap), 512, bw, 76];
        this.btnRects.push([r, c]);
        panel(ctx, r, { color: PANEL2, border: MUTED, alpha: 240, radius: 16 });
        drawText(ctx, label, r[0] + bw / 2, r[1] + 38, label.length < 3 ? 60 : 34, WHITE, { center: true, bold: true });
      });
    }
  }
}

// ---------------------------------------------------------------------------- counting
const NUM_KEYS = ["eins", "zwei", "drei", "vier", "fuenf"];
class Count extends Action {
  constructor(imgKey, n, mode, isAnimal) { super(); this.imgKey = imgKey; this.n = n; this.mode = mode || "ask"; this.isAnimal = !!isAnimal; this.appeared = 0; this.at = 0; this.sel = 0; this.state = "appear"; this.st = 0; this.rects = []; }
  start(g) {
    super.start(g);
    this.img = this.isAnimal ? g.art.animals[this.imgKey].right[0] : g.art.get(this.imgKey);
    if (this.mode === "ask") { g.audio.say("Wie viele?"); g.lastGerman = "Wie viele?"; }
  }
  autoplay() { if (!this.done) { this.result = true; this.done = true; } }
  update(dt) {
    super.update(dt);
    this.dimA = Math.min(200, this.dimA + dt * 500); this.at += dt; this.st += dt;
    const gap = this.mode === "show" ? 0.9 : 0.35;
    if (this.appeared < this.n && this.at > gap) {
      this.at = 0; this.appeared++; this.g.audio.play(this.isAnimal ? "baa" : "stone", 0.5);
      if (this.mode === "show") this.g.audio.say(WORDS[NUM_KEYS[this.appeared - 1]].de);
    }
    if (this.appeared >= this.n && this.state === "appear" && this.at > 0.8) { this.state = this.mode === "ask" ? "choose" : "shown"; this.st = 0; }
  }
  pick(i) {
    if (this.state !== "choose") return;
    if (i === this.n - 1) { this.state = "right"; this.g.audio.play("ok"); this.g.reportAnswer(true, NUM_KEYS[i]); this.g.audio.say(WORDS[NUM_KEYS[i]].de); this.g.use(NUM_KEYS[i]); this.result = true; }
    else { this.g.audio.play("wrong"); this.state = "wrongpick"; this.wrong = i; this.g.reportAnswer(false, NUM_KEYS[this.n - 1]); }
    this.st = 0;
  }
  handle(ev) {
    if (this.state === "right" || this.state === "shown") { if (isConfirm(ev) && this.st > 0.5) this.done = true; return; }
    if (this.state === "wrongpick") { if (this.st > 0.6) this.state = "choose"; else return; }
    if (this.state !== "choose") return;
    if (ev.type === "key") {
      if (ev.key === "left") this.sel = (this.sel + 4) % 5;
      else if (ev.key === "right") this.sel = (this.sel + 1) % 5;
      else if (/^[1-5]$/.test(ev.key)) this.pick(+ev.key - 1);
      else if (isConfirm(ev)) this.pick(this.sel);
    } else if (ev.type === "tap") this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.pick(i); });
    else if (ev.type === "move") this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) this.sel = i; });
  }
  draw(ctx) {
    const g = this.g;
    dim(ctx, this.dimA);
    const k = this.img.width < 50 ? 3 : 2, w = this.img.width * k + 20, h = this.img.height * k, x0 = WIDTH / 2 - this.n * w / 2;
    for (let i = 0; i < this.appeared; i++) {
      drawImg(ctx, this.img, x0 + i * w + 10, 230 - h / 2 + Math.sin(this.t * 4 + i) * 4, k);
      if (this.mode === "show" || this.state === "right") drawText(ctx, WORDS[NUM_KEYS[i]].de, x0 + i * w + w / 2, 300 + h / 2 - 30, 34, GOLD, { center: true, bold: true });
    }
    if (this.mode === "ask") {
      drawText(ctx, "Wie viele?", WIDTH / 2, 90, 56, DE, { center: true, bold: true });
      drawText(ctx, "(сколько?)", WIDTH / 2, 132, 24, MUTED, { center: true });
      if (["choose", "wrongpick", "right"].includes(this.state)) {
        this.rects = [];
        const bw = 150, xx = WIDTH / 2 - (5 * bw + 48) / 2;
        NUM_KEYS.forEach((kk, i) => {
          const r = [xx + i * (bw + 12), 470, bw, 60];
          this.rects.push(r);
          const sel = i === this.sel && !g.touch;
          let border = sel ? GOLD : MUTED;
          if (this.state === "wrongpick" && i === this.wrong) border = RED;
          if (this.state === "right" && i === this.n - 1) border = GREEN;
          panel(ctx, r, { color: sel ? PANEL2 : PANEL, border, width: sel ? 3 : 2 });
          drawText(ctx, WORDS[kk].de, r[0] + bw / 2, r[1] + 30, 34, g.known[kk] ? GOLD : WHITE, { center: true, bold: true });
        });
      }
    }
    if ((this.state === "right" || this.state === "shown") && this.st > 0.5 && Math.floor(this.st * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, 600, 26, MUTED, { center: true });
  }
}

// ---------------------------------------------------------------------------- misc
class NameEntry extends Action {
  constructor(def) { super(); this.def = def || "Мика"; this.asked = false; }
  start(g) {
    super.start(g);
    if (g.auto) return;
    if (g.debug) { this.autoplay(); return; }
    g.askText("Как тебя будут звать?", this.def, v => {
      v = (v || "").trim() || this.def;
      v = v.slice(0, 14); this.result = v[0].toUpperCase() + v.slice(1); this.done = true;
    });
  }
  autoplay() { this.result = this.def; this.done = true; }
  draw(ctx) { dim(ctx, 170); }
}

class Title extends Action {
  constructor(top, big, sub) { super(); this.top = top; this.big = big; this.sub = sub; }
  start(g) { super.start(g); g.audio.play("chime"); g.audio.say(this.big); }
  handle(ev) { if (isConfirm(ev) && this.t > 0.8) this.done = true; }
  update(dt) { super.update(dt); if (this.t > 4) this.done = true; }
  draw(ctx) {
    const a = this.t < 3.4 ? Math.min(1, this.t * 2) : Math.max(0, (4 - this.t) / 0.6);
    dim(ctx, 210 * a);
    if (a > 0.1) {
      drawText(ctx, this.top, WIDTH / 2, 230, 30, MUTED, { center: true, alpha: a });
      drawText(ctx, this.big, WIDTH / 2, 300, 84, DE, { center: true, bold: true, alpha: a });
      drawText(ctx, this.sub, WIDTH / 2, 370, 32, WHITE, { center: true, alpha: a });
      ctx.fillStyle = rgb(GOLD, a); ctx.fillRect(WIDTH / 2 - 160, 410, 320, 2);
    }
  }
}
class Fade extends Action {
  constructor(toBlack, dur) { super(); this.toBlack = toBlack !== false; this.dur = dur || 0.8; }
  start(g) { super.start(g); g.fadeLevel = this.toBlack ? 0 : 255; }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.dur);
    this.g.fadeLevel = 255 * (this.toBlack ? k : 1 - k);
    if (k >= 1 || this.g.auto) { this.g.fadeLevel = this.toBlack ? 255 : 0; this.done = true; }
  }
}
class Wait extends Action {
  constructor(dur) { super(); this.dur = dur; }
  update(dt) { super.update(dt); if (this.t >= this.dur) this.done = true; }
}
class WaitWalk extends Action {
  constructor(...ents) { super(); this.ents = ents; }
  update(dt) {
    this.t += dt;
    if (this.ents.every(e => !e.path.length) || this.t > 12) this.done = true;
    if (this.g.auto) { for (const e of this.ents) if (e.path.length) { [e.x, e.y] = e.path[e.path.length - 1]; e.path = []; } this.done = true; }
  }
}


// ---------------------------------------------------------------------------- the raft ride (v3)
// The river carries the raft. Rocks, logs and whirlpools come towards you; Opa shouts the
// command in German (first with a picture, then only the word, at the end not at all).
// Buttons are German words: links, rechts, Halt!, Spring!
const RAFT_LANES = [-1, 0, 1];
const RAFT_FUN = ["Плюх! Опа выжимает бороду.", "Бум! Плот крутится, как карусель.", "Хрясь! Кажется, это было весло.", "Опа: «Ну хоть умылись»."];
class RaftRide extends Action {
  constructor() {
    super();
    this.wantsPointer = true;
    this.lane = 0; this.rx = 0; this.speed = 170; this.scroll = 0; this.events = []; this.hits = 0; this.passes = 0;
    this.jumpT = 0; this.haltT = 0; this.msg = ""; this.msgT = 0; this.shout = ""; this.shoutT = 0; this.btnRects = []; this.spin = 0;
    // phase 1: hints with pictures, phase 2: only the word, phase 3: nobody shouts
    const plan = [["rock", 1, 1], ["rock", -1, 1], ["log", 0, 1], ["whirl", 0, 1], ["rock", 0, 1],
      ["rock", 1, 2], ["log", 0, 2], ["rock", -1, 2], ["whirl", 0, 2], ["rock", 0, 2],
      ["rock", -1, 3], ["log", 0, 3], ["rock", 1, 3], ["whirl", 0, 3]];
    let y = -200;
    for (const [type, lane, phase] of plan) { this.events.push({ type, lane, phase, y, state: "come" }); y -= type === "whirl" ? 560 : 430; }
    this.endY = y - 300;
  }
  start(g) { super.start(g); g.audio.play("splash"); }
  autoplay() { if (!this.done) { for (const c of ["links", "rechts", "springen", "halt"]) this.g.use(c); this.result = 0; this.done = true; } }
  rightCmd(ev) {
    if (ev.type === "log") return "springen";
    if (ev.type === "whirl") return "halt";
    if (ev.type === "rock") {
      if (this.lane !== ev.lane) return null;
      return this.lane === 1 ? "links" : this.lane === -1 ? "rechts" : (ev.lane === 0 ? "links" : null);
    }
    return null;
  }
  press(cmd) {
    const g = this.g;
    if (cmd === "links" && this.lane > -1) { this.lane--; g.audio.play("whoosh", 0.5); }
    else if (cmd === "rechts" && this.lane < 1) { this.lane++; g.audio.play("whoosh", 0.5); }
    else if (cmd === "springen" && this.jumpT <= 0) { this.jumpT = 0.75; g.audio.play("jump"); }
    else if (cmd === "halt" && this.haltT <= 0) { this.haltT = 1.6; g.audio.play("stone"); }
    g.use(cmd);
  }
  handle(ev) {
    if (ev.type !== "key") return;
    const map = { left: "links", right: "rechts", space: "springen", down: "halt", h: "halt" };
    if (map[ev.key]) this.press(map[ev.key]);
  }
  pointer(id, x, y, down) {
    if (!down) return;
    for (const [r, c] of this.btnRects) if (inRect(r, x, y)) this.press(c);
  }
  say(text, t) { this.msg = text; this.msgT = t || 1.8; }
  update(dt) {
    super.update(dt);
    if (this.done) return;
    this.dimA = Math.min(255, this.dimA + dt * 600);
    const g = this.g;
    const v = this.haltT > 0 ? 0 : this.speed;
    this.scroll += v * dt;
    this.rx += (this.lane * 150 - this.rx) * (1 - Math.exp(-dt * 10));
    if (this.jumpT > 0) this.jumpT -= dt;
    if (this.haltT > 0) this.haltT -= dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.shoutT > 0) this.shoutT -= dt;
    if (this.spin > 0) this.spin -= dt;
    const RY = 430;
    for (const ev of this.events) {
      const sy = ev.y + this.scroll;
      if (ev.state === "come" && sy > RY - 380) {
        ev.state = "near";
        if (ev.phase < 3) {
          const cmd = ev.type === "log" ? "springen" : ev.type === "whirl" ? "halt" : (this.lane === ev.lane ? (ev.lane === 1 ? "links" : ev.lane === -1 ? "rechts" : choice(["links", "rechts"])) : null);
          if (cmd) { this.shout = cmd; this.shoutT = 1.8; g.audio.say(CMD_TEXT[cmd]); g.lastGerman = CMD_TEXT[cmd]; }
        }
      }
      if (ev.type === "whirl" && ev.state === "near" && this.haltT > 0 && sy > RY - 260 && sy < RY + 40) {
        ev.state = "gone"; this.passes++; g.audio.play("ok", 0.5); this.say(choice(["<Gut!> Водоворот покрутился и уплыл.", "<Halt!> И водоворот ушёл без нас.", "Опа: «<Ja!> Вот так. Выдохни»."]));
      }
      if (ev.state === "near" && sy > RY - 10) {
        let hit = false;
        if (ev.type === "rock") hit = this.lane === ev.lane;
        else if (ev.type === "log") hit = this.jumpT <= 0;
        else if (ev.type === "whirl") hit = true;
        ev.state = hit ? "hit" : "passed";
        if (hit) {
          this.hits++; g.shake = 0.3; g.audio.play("splash");
          if (ev.type === "whirl") { this.spin = 1.2; this.say("Водоворот закрутил плот! Опа: «Надо было <Halt!>»."); }
          else this.say(choice(RAFT_FUN));
        } else { this.passes++; g.audio.play("tick"); if (ev.type === "log") this.say(choice(["<Spring!> Перелетели!", "<Super!> Бревно осталось позади."])); }
      }
    }
    if (this.endY + this.scroll > RY) { this.result = this.hits; this.done = true; }
  }
  draw(ctx) {
    const g = this.g;
    ctx.fillStyle = rgb([64, 128, 200]); ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // water ripples
    const t = this.scroll;
    ctx.fillStyle = "rgba(170,210,245,0.55)";
    for (let i = 0; i < 70; i++) { const x = (i * 197) % WIDTH, y = ((i * 89 + t * 1.0) % (HEIGHT + 40)) - 20; ctx.fillRect(x, y, 26, 3); }
    // banks with trees passing by
    const bankW = Math.max(120, (WIDTH - 600) / 2);
    ctx.fillStyle = rgb([96, 158, 70]); ctx.fillRect(0, 0, bankW, HEIGHT); ctx.fillRect(WIDTH - bankW, 0, bankW, HEIGHT);
    ctx.fillStyle = rgb([226, 206, 150]); ctx.fillRect(bankW - 14, 0, 14, HEIGHT); ctx.fillRect(WIDTH - bankW, 0, 14, HEIGHT);
    const tree = g.art.img.tree2, pine = g.art.img.pine1;
    for (let i = 0; i < 6; i++) {
      const y = ((i * 170 + t) % (HEIGHT + 160)) - 120;
      ctx.drawImage(i % 2 ? tree : pine, bankW / 2 - 40 + (i % 3) * 10, y);
      ctx.drawImage(i % 2 ? pine : tree, WIDTH - bankW / 2 - 30 - (i % 3) * 10, y + 60);
    }
    const cx = WIDTH / 2, RY = 430;
    // obstacles
    for (const ev of this.events) {
      const sy = ev.y + this.scroll;
      if (sy < -120 || sy > HEIGHT + 80 || ev.state === "gone") continue;
      if (ev.type === "rock") drawImg(ctx, g.art.img.boulder, cx + ev.lane * 150 - 56, sy - 60, 2);
      else if (ev.type === "log") {
        ctx.fillStyle = "rgb(120,80,50)"; roundRect(ctx, cx - 240, sy - 18, 480, 34, 16); ctx.fill();
        ctx.fillStyle = "rgb(150,105,65)"; ctx.fillRect(cx - 230, sy - 12, 460, 6);
        ctx.fillStyle = "rgb(200,160,110)"; ctx.beginPath(); ctx.ellipse(cx - 238, sy - 1, 9, 16, 0, 0, TAU); ctx.fill();
      } else if (ev.type === "whirl") {
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = `rgba(230,245,255,${0.7 - k * 0.15})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(cx, sy, 200 - k * 40, 60 - k * 12, 0, this.t * 3 + k, this.t * 3 + k + 4.4); ctx.stroke();
        }
      }
    }
    // raft with hero and Opa
    const jy = this.jumpT > 0 ? Math.sin((0.75 - this.jumpT) / 0.75 * Math.PI) * 60 : 0;
    ctx.save(); ctx.translate(cx + this.rx, RY - jy);
    if (this.spin > 0) ctx.rotate(this.spin * 6);
    drawImg(ctx, g.art.img.raft, -80, -30, 2);
    const hero = g.art.people.hero.up[0], opa = g.art.people.opa.up[0];
    drawImg(ctx, opa, -46, -78, 1.4); drawImg(ctx, hero, 4, -78, 1.4);
    ctx.restore();
    if (this.haltT > 0) drawText(ctx, "Halt!", cx + this.rx, RY + 70, 34, DE, { center: true, bold: true });
    // Opa's shout
    if (this.shoutT > 0 && this.shout) {
      const r = [cx - 170, 70, 340, 74];
      panel(ctx, r, { color: [250, 246, 236], border: INK, alpha: 255 });
      drawText(ctx, CMD_TEXT[this.shout], cx, 107, 52, INK, { center: true, bold: true, shadow: false });
      const phase = (this.events.find(e => e.state === "near") || {}).phase || 1;
      if (phase === 1) { const ic = g.art.wordIcon(this.shout); ctx.drawImage(ic, r[0] + r[2] + 12, 82); }
    }
    if (this.msgT > 0) drawMixed(ctx, this.msg, g.known, [cx - 300, 160, 600, 40], 28, null, g.name);
    drawText(ctx, `камней и брёвен позади: ${this.passes}`, 20, 14, 22, WHITE);
    // German buttons
    this.btnRects = [];
    const btns = [["links", "← links"], ["halt", "Halt!"], ["springen", "Spring!"], ["rechts", "rechts →"]];
    const bw = g.touch ? 170 : 150, gap = 14, x0 = cx - (btns.length * bw + (btns.length - 1) * gap) / 2;
    btns.forEach(([c, label], i) => {
      const r = [x0 + i * (bw + gap), HEIGHT - 92, bw, 70];
      this.btnRects.push([r, c]);
      panel(ctx, r, { color: PANEL2, border: MUTED, alpha: 235, radius: 16 });
      drawText(ctx, label, r[0] + bw / 2, r[1] + 35, 36, light(GOLD, 0.2), { center: true, bold: true });
    });
    if (!g.touch) drawText(ctx, "клавиши: ← → · ↓ = Halt · ПРОБЕЛ = Spring", cx, HEIGHT - 112, 20, WHITE, { center: true });
  }
}

// ---------------------------------------------------------------------------- end of chapter card (v3)
class ChapterCard extends Action {
  constructor(num, title, keys) { super(); this.num = num; this.title = title; this.keys = keys; }
  start(g) { super.start(g); g.audio.play("chime"); }
  handle(ev) { if (isConfirm(ev) && this.t > 0.8) this.done = true; }
  draw(ctx) {
    const g = this.g;
    dim(ctx, Math.min(200, this.t * 500));
    const n = this.keys.length, cols = Math.min(4, n), rows = Math.ceil(n / cols);
    const cw = 214, ch = 92, W = cols * cw + 60, H = 150 + rows * ch;
    const x0 = WIDTH / 2 - W / 2, y0 = Math.max(20, HEIGHT / 2 - H / 2 - 10);
    const k = Math.min(1, this.t * 3);
    ctx.save(); ctx.translate(WIDTH / 2, HEIGHT / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-WIDTH / 2, -HEIGHT / 2);
    roundRect(ctx, x0, y0, W, H, 14); ctx.fillStyle = "rgb(236,222,190)"; ctx.fill(); ctx.strokeStyle = "rgb(120,80,52)"; ctx.lineWidth = 5; ctx.stroke();
    drawText(ctx, `Глава ${this.num} пройдена`, WIDTH / 2, y0 + 36, 30, [120, 100, 90], { center: true, shadow: false });
    drawText(ctx, this.title, WIDTH / 2, y0 + 78, 50, [70, 50, 44], { center: true, shadow: false, bold: true });
    this.keys.forEach((key, i) => {
      const cx = x0 + 30 + (i % cols) * cw, cy = y0 + 120 + Math.floor(i / cols) * ch;
      const appear = Math.min(1, Math.max(0, this.t * 4 - i * 0.35));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      roundRect(ctx, cx, cy, cw - 14, ch - 14, 10); ctx.fillStyle = "rgb(250,242,220)"; ctx.fill();
      const ic = g.art.wordIcon(key);
      ctx.drawImage(ic, cx + 8, cy + (ch - 14) / 2 - ic.height / 2);
      drawText(ctx, withArticle(key), cx + 58, cy + (ch - 14) / 2 - 10, 27, wordColor(key).map(v => v * 0.6), { shadow: false, bold: true, center: false });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    if (this.t > 0.8 && Math.floor(this.t * 2.5) % 2 === 0) drawText(ctx, tapHint(g), WIDTH / 2, Math.min(HEIGHT - 24, y0 + H + 30), 26, WHITE, { center: true });
  }
}
