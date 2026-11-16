// ============================================================================
// game (v3): the engine. Several locations (worlds) with travel between them,
// Funke the talking spark who follows you, gentle hints (sparkles over things
// with a new word, "!" over whoever moves the story on), light self-tuning
// pacing, keyboard + touch controls, HUD, Word Book, menu, saving.
// ============================================================================
const SAVE_KEY = "wortwald_save_v3";
function storeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
function storeSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }

class Game {
  constructor(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.auto = !!opts.auto; this.touch = false;
    this.art = new Art(); this.art.build();
    this.audio = new Audio();
    this.audio.speech.onError = err => { if (this._voiceErr) return; this._voiceErr = true; this.toast("Голос не звучит (" + err + "). Подробности: ESC → меню", MUTED); };
    this.state = "title"; this.titleSel = 0; this.time = 0;
    this.portraitCache = {};
    this.keys = new Set(); this.joy = null; this.runHeld = false; this.btns = [];
    this.darkCanvas = makeCanvas(WIDTH, HEIGHT);
    this.newState();
  }

  // ------------------------------------------------------------------ state
  newState() {
    this.worlds = {};
    this.known = {}; this.flags = new Set(); this.name = "Мика"; this.goalText = ""; this.chapterLabel = ""; this.chapter = 1;
    this.abilities = new Set(); this.script = null; this.action = null; this.queue = []; this.lastResult = null;
    this.toasts = []; this.particles = []; this.emotes = []; this.playTime = 0; this.cam = [0, 0];
    this.fadeLevel = 0; this.overlay = null; this.lastGerman = ""; this.shake = 0; this.bumpCool = 0;
    this.lantern = false; this.darkness = 0; this.portraitCache = {};
    this.streak = 0; this.weak = {};
    this.player = new Player(15, 13); this.player.dir = "up";
    this.funke = { x: 0, y: 0, t: 0 };
    this.enter("square", [15, 13], "up");
  }
  getWorld(id) {
    if (!this.worlds[id]) { const w = new World(id); this.worlds[id] = w; Story.populate(this, w); Story.applyFlags(this, w); }
    return this.worlds[id];
  }
  enter(id, at, dir) {
    this.loc = id; this.world = this.getWorld(id); this.world.player = this.player;
    const p = this.player;
    p.x = (at[0] + 0.5) * TILE; p.y = (at[1] + 1) * TILE - 4; if (dir) p.dir = dir;
    p.jumpT = 0; p.size = "normal"; p.scale = p.targetScale = 1;
    this.flags.delete("small_from_s"); this.flags.delete("small_from_n");
    this.funke.x = p.x - 26; this.funke.y = p.y - 56;
    this.snapCam();
    this.darkness = 0;
  }
  snapCam() { const [x, y] = this.camTarget(); this.cam = [x, y]; }
  camTarget() {
    const p = this.player, W = this.world.w * TILE, H = this.world.h * TILE;
    const x = W <= WIDTH ? (W - WIDTH) / 2 : clamp(p.x - WIDTH / 2, 0, W - WIDTH);
    const y = H <= HEIGHT ? (H - HEIGHT) / 2 : clamp(p.y - 20 - HEIGHT / 2, 0, H - HEIGHT);
    return [x, y];
  }
  has(f) { return this.flags.has(f); }
  flag(f) { this.flags.add(f); }
  goal(text, label) { this.goalText = text; if (label !== undefined) this.chapterLabel = label; }
  learn(key, silent) {
    const isNew = !this.known[key];
    this.known[key] = (this.known[key] || 0) + 1;
    if (isNew) { this.toast("Новое слово: " + withArticle(key), wordColor(key)); if (!silent) this.audio.play("word"); }
    this.portraitCache = {};
  }
  use(key, n) { if (this.known[key]) this.known[key] += (n || 1); }
  // light self-tuning: right answers in a row make explanations shorter; mistakes bring a word back sooner
  reportAnswer(ok, key) {
    if (ok) { this.streak++; if (key && this.weak[key]) this.weak[key] = Math.max(0, this.weak[key] - 1); }
    else { this.streak = 0; if (key) this.weak[key] = (this.weak[key] || 0) + 2; }
  }
  fastLearner() { return this.streak >= 3; }
  // the known word that most needs another round: mistakes first, then the least used
  weakestWords(n, exclude) {
    const keys = Object.keys(this.known).filter(k => !(exclude || []).includes(k));
    keys.sort((a, b) => ((this.weak[b] || 0) - (this.weak[a] || 0)) || (this.known[a] - this.known[b]) || (Math.random() - 0.5));
    return keys.slice(0, n);
  }
  toast(text, color) { this.toasts.push([text, color || GOLD, 3.2]); }
  color(name) {
    this.flags.add("col:" + name); this.portraitCache = {};
    const e = this.world.ent[name]; if (e) this.sparkle(e.x, e.y - 30, 30);
  }
  isColored(name) {
    if (name === "hero") return this.flags.has("col:hero");
    if (name === "funke") return true;
    if (this.flags.has("col:" + name)) return true;
    const e = this.world.ent[name];
    if (!e) return false;
    if (e.word && this.known[e.word]) return true;
    return !!this.world.colored;
  }
  sparkle(x, y, n, colors) {
    for (let i = 0; i < (n || 24); i++) {
      const a = Math.random() * TAU, sp = uniform(30, 160);
      this.particles.push([x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, uniform(0.5, 1.2), choice(colors || [GOLD, [255, 255, 255], [150, 220, 255], [255, 160, 200]])]);
    }
  }
  emote(ent, sym, dur) { this.emotes.push([ent, sym, dur || 1.6]); }
  speakerSprite(sp) { if (sp === "funke") return "funke"; const e = this.world.ent[sp]; if (e) return e.sprite; return (SPEAKERS[sp] || [sp, sp])[1]; }
  speakerName(sp) { return sp === "hero" ? this.name : (SPEAKERS[sp] || [sp])[0]; }
  say(sp, text) { return new Say(sp, text); }
  think(text) { return new Say("think", text); }
  narr(text) { return new Say(null, text); }
  choice(sp, prompt, options, correct, image) { return new Choice(sp, prompt, options, correct, image); }
  spark(key, feel, effect, image, fast) { return new Spark(key, feel, effect, image, fast); }
  wait(t) { return new Wait(t); }
  walk(ent, tx, ty, speed) { ent.walkTo(tx, ty, speed); return new WaitWalk(ent); }
  run(gen) { if (gen) this.queue.push(gen); }
  busy() { return !!(this.script || this.action || this.queue.length); }

  // ------------------------------------------------------------------ save / load
  save() {
    if (this.auto || this.debug) return;
    const data = { name: this.name, known: this.known, flags: [...this.flags], loc: this.loc, pos: [this.player.x, this.player.y], goal: this.goalText,
      label: this.chapterLabel, chapter: this.chapter, abilities: [...this.abilities], playTime: this.playTime, weak: this.weak, version: 3 };
    storeSet(SAVE_KEY, JSON.stringify(data));
  }
  hasSave() { return !!storeGet(SAVE_KEY); }
  // v4.5: a saved position outside the map or inside a wall (old exit bug) -> nearest walkable tile
  rescuePlayer() {
    const p = this.player, w = this.world;
    let tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 4) / TILE);
    const ok = (x, y) => x > 0 && y > 0 && x < w.w - 1 && y < w.h - 1 && !w.solidTile(x, y);
    if (ok(tx, ty)) return;
    tx = Math.max(1, Math.min(w.w - 2, tx)); ty = Math.max(1, Math.min(w.h - 2, ty));
    for (let r = 0; r < Math.max(w.w, w.h); r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !ok(tx + dx, ty + dy)) continue;
        p.x = (tx + dx + 0.5) * TILE; p.y = (ty + dy + 1) * TILE - 4; return;
      }
  }
  load() {
    let d; try { d = JSON.parse(storeGet(SAVE_KEY)); } catch (e) { return false; }
    if (!d) return false;
    this.newState();
    this.name = d.name || "Мика";
    for (const [k, v] of Object.entries(d.known || {})) if (WORDS[k]) this.known[k] = v;
    this.flags = new Set(d.flags || []); this.abilities = new Set(d.abilities || []);
    this.goalText = d.goal || ""; this.chapterLabel = d.label || ""; this.chapter = d.chapter || 1; this.playTime = d.playTime || 0; this.weak = d.weak || {};
    this.worlds = {};
    this.enter(LOCATIONS[d.loc] ? d.loc : "square", [15, 13], "down");
    if (d.pos) { this.player.x = d.pos[0]; this.player.y = d.pos[1]; }
    this.rescuePlayer(); this.snapCam();
    if (this.has("lantern")) this.lantern = true;
    return true;
  }

  // ------------------------------------------------------------------ scripts
  stepScript() {
    for (let guard = 0; guard < 200; guard++) {
      if (this.action) { if (this.action.done) { this.lastResult = this.action.result; this.action = null; continue; } return; }
      if (!this.script) { if (!this.queue.length) return; this.script = this.queue.shift(); this.lastResult = null; }
      let r;
      try { r = this.script.next(this.lastResult); } catch (e) { console.error(e); r = { done: true }; }
      this.lastResult = null;
      if (r.done) { this.script = null; if (!this.queue.length) { Story.afterScript(this); this.save(); } continue; }
      if (!r.value) continue;
      this.action = r.value; this.action.start(this);
    }
  }

  // ------------------------------------------------------------------ input
  keyEvent(key, down) {
    if (down) this.keys.add(key); else { this.keys.delete(key); return; }
    this.audio.unlock();
    this.handle({ type: "key", key });
  }
  pointerDown(id, x, y, isTouch) {
    this.audio.unlock();
    if (isTouch && !this.touch) this.touch = true;
    if (this.debug && this.state === "play" && this.debug.handle({ type: "tap", x, y })) return;
    if (this.action && this.action.wantsPointer) { this.action.pointer(id, x, y, true); return; }
    if (this.state === "play" && !this.overlay && !this.busy() && this.touch) {
      for (const b of this.btns) if (Math.hypot(x - b.x, y - b.y) < b.r + 10) { b.down(id); return; }
      if (x < WIDTH * 0.55 && y > 120) { this.joy = { id, cx: x, cy: y, x, y }; return; }
    }
    this.handle({ type: "tap", x, y });
  }
  pointerMove(id, x, y) {
    if (this.joy && this.joy.id === id) { this.joy.x = x; this.joy.y = y; return; }
    this.handle({ type: "move", x, y });
  }
  pointerUp(id) {
    if (this.joy && this.joy.id === id) this.joy = null;
    if (this.runHeld === id) this.runHeld = false;
    if (this.action && this.action.wantsPointer) this.action.pointer(id, 0, 0, false);
  }
  touchButtons() {
    const b = [];
    b.push({ name: "e", x: WIDTH - 92, y: 540, r: 56, label: "E", down: () => this.interact() });
    if (this.abilities.has("springen")) b.push({ name: "jump", x: WIDTH - 214, y: 582, r: 44, label: "прыжок", down: () => this.tryJump() });
    if (this.abilities.has("laufen")) b.push({ name: "run", x: WIDTH - 204, y: 464, r: 40, label: "бег", down: id => { this.runHeld = id; } });
    b.push({ name: "book", x: WIDTH - 80, y: 30, r: 34, label: "", down: () => { this.overlay = new Book(this); this.audio.play("page"); } });
    b.push({ name: "menu", x: WIDTH - 196, y: 30, r: 26, label: "", down: () => { this.overlay = new Menu(this); } });
    this.btns = b;
  }
  handle(ev) {
    if (this.state === "title") { this.handleTitle(ev); return; }
    if (this.debug && this.debug.handle(ev)) return;
    if (this.overlay) { this.overlay.handle(ev); return; }
    if (ev.type === "key") {
      if (ev.key === "m") { this.audio.toggleMusic(); this.toast("Музыка: " + (this.audio.musicOn ? "вкл" : "выкл"), MUTED); return; }
      if (ev.key === "r" && this.lastGerman) { this.audio.say(this.lastGerman); return; }
      if (ev.key === "v") { this.audio.voiceOn = !this.audio.voiceOn; this.toast("Голос: " + (this.audio.voiceOn ? "вкл" : "выкл"), MUTED); return; }
    }
    if (this.action) { this.action.handle(ev); return; }
    if (ev.type === "key") {
      if (ev.key === "esc") this.overlay = new Menu(this);
      else if (ev.key === "tab") { this.overlay = new Book(this); this.audio.play("page"); }
      else if (ev.key === "e" || ev.key === "enter") this.interact();
      else if (ev.key === "space") this.tryJump();
    } else if (ev.type === "tap") {
      if (inRect([WIDTH - 150, 10, 138, 40], ev.x, ev.y)) { this.overlay = new Book(this); this.audio.play("page"); }
      else if (inRect([WIDTH - 280, 10, 125, 40], ev.x, ev.y)) this.overlay = new Menu(this);
    }
  }
  titleOptions() { const o = ["Новая игра"]; if (this.hasSave()) o.unshift("Продолжить"); return o; }
  handleTitle(ev) {
    const opts = this.titleOptions();
    if (ev.type === "key") {
      if (ev.key === "up") this.titleSel = (this.titleSel - 1 + opts.length) % opts.length;
      else if (ev.key === "down") this.titleSel = (this.titleSel + 1) % opts.length;
      else if (isConfirm(ev)) this.titlePick(opts[this.titleSel]);
    } else if (ev.type === "tap") {
      opts.forEach((o, i) => { if (inRect([WIDTH / 2 - 160, 370 + i * 64, 320, 54], ev.x, ev.y)) this.titlePick(o); });
      if (this.fullscreenBtn && inRect(this.fullscreenBtn, ev.x, ev.y) && this.onFullscreen) this.onFullscreen();
      if (this.bugBtn && inRect(this.bugBtn, ev.x, ev.y)) { this.audio.unlock(); this.debug = new Director(this); this.debug.jump(0); }
    } else if (ev.type === "move") opts.forEach((o, i) => { if (inRect([WIDTH / 2 - 160, 370 + i * 64, 320, 54], ev.x, ev.y)) this.titleSel = i; });
  }
  titlePick(o) {
    this.audio.unlock(); this.audio.play("ok");
    if (o === "Продолжить" && this.load()) { this.state = "play"; this.fadeLevel = 255; this.run(Story.resume(this)); }
    else { this.newState(); this.state = "play"; this.run(Story.prologue(this)); }
    this.debug = null; this.debugAuto = false;
  }
  askText(title, def, cb) { if (this.onAskText) this.onAskText(title, def, cb); else cb(def); }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.time += dt;
    this.audio.tickMusic();
    if (this.state === "title") {
      const W = this.world.w * TILE;
      this.cam[0] = (W - WIDTH) / 2 + Math.sin(this.time * 0.1) * Math.max(0, (W - WIDTH) / 2); this.cam[1] = 4 * TILE;
      for (const e of this.world.entities) e.update(dt, this.world);
      this.audio.setMusic("village", true);
      return;
    }
    if (this.overlay) { this.overlay.update(dt); return; }
    this.playTime += dt;
    this.stepScript();
    if (this.action) this.action.update(dt);
    this.stepScript();
    if (this.debug && !this.auto) this.debug.update(dt);
    for (const e of this.world.entities) e.update(dt, this.world);
    this.updatePlayer(dt);
    this.updateFunke(dt);
    const [tx, ty] = this.camTarget(), k = 1 - Math.exp(-dt * 8);
    this.cam[0] += (tx - this.cam[0]) * k; this.cam[1] += (ty - this.cam[1]) * k;
    if (this.shake > 0) this.shake -= dt;
    for (const q of this.particles) { q[0] += q[2] * dt; q[1] += q[3] * dt; q[3] += 90 * dt; q[4] -= dt; }
    this.particles = this.particles.filter(q => q[4] > 0);
    for (const t of this.toasts) t[2] -= dt;
    this.toasts = this.toasts.filter(t => t[2] > 0).slice(-4);
    for (const e of this.emotes) e[2] -= dt;
    this.emotes = this.emotes.filter(e => e[2] > 0);
    this.bumpCool -= dt;
    const p = this.player;
    const tile = this.world.tileAt(Math.floor(p.x / TILE), Math.floor((p.y - 4) / TILE));
    this.darkness += ((tile === "d" ? 1 : 0) - this.darkness) * (1 - Math.exp(-dt * 4));
    const music = this.has("ending") && this.loc === "square" ? "festival" : this.world.def.music;
    this.audio.setMusic(music, this.has("ending") || !!this.world.colored);
    if (!this.busy()) { this.checkExits(); if (!this.busy()) Story.checkTriggers(this); }
  }
  checkExits() {
    const p = this.player, tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 4) / TILE);
    for (const ex of this.world.exits) {
      if (tx < ex.x0 || tx > ex.x1 || ty < ex.y0 || ty > ex.y1) continue;
      if (ex.cond && !this.has(ex.cond.flag)) {
        // step back and hear why
        // v4.5: push back INTO the map (the old table pushed the hero off the edge)
        const back = ex.x0 === 0 ? [1, 0] : ex.x1 === this.world.w - 1 ? [-1, 0] : ex.y0 === 0 ? [0, 1] : [0, -1];
        p.x += back[0] * TILE * 1.2; p.y += back[1] * TILE * 1.2;
        p.dir = { "1,0": "right", "-1,0": "left", "0,1": "down", "0,-1": "up" }[back.join(",")];
        this.keys.clear(); this.joy = null;
        if (this.bumpCool <= 0) {
          this.bumpCool = 2;
          this.run((function* (g) {
            const sayIt = t => g.flags.has("funke") ? g.say("funke", t) : g.think(t);
            yield sayIt(ex.cond.msg);
            if (g.goalText) yield sayIt("Сейчас важнее другое. " + g.goalText);
          })(this));
        }
        return;
      }
      this.run(Story.travel(this, ex.to, ex.at, ex.dir));
      return;
    }
  }
  updateFunke(dt) {
    const f = this.funke, p = this.player;
    f.t += dt;
    const side = p.dir === "left" ? 1 : -1;
    const tx = p.x + side * 26 + Math.sin(f.t * 1.3) * 8, ty = p.y - 58 + Math.sin(f.t * 2.1) * 6;
    const k = 1 - Math.exp(-dt * 4);
    f.x += (tx - f.x) * k; f.y += (ty - f.y) * k;
  }
  moveInput() {
    let dx = (this.keys.has("right") ? 1 : 0) - (this.keys.has("left") ? 1 : 0);
    let dy = (this.keys.has("down") ? 1 : 0) - (this.keys.has("up") ? 1 : 0);
    let mag = 1;
    if (this.joy) { const jx = this.joy.x - this.joy.cx, jy = this.joy.y - this.joy.cy, d = Math.hypot(jx, jy); if (d > 12) { dx = jx / d; dy = jy / d; mag = Math.min(1, d / 60); } }
    return [dx, dy, mag];
  }
  updatePlayer(dt) {
    const p = this.player;
    p.anim += dt;
    p.scale += (p.targetScale - p.scale) * (1 - Math.exp(-dt * 6));
    if (p.shiver > 0) p.shiver -= dt;
    if (p.jumpT > 0) {
      p.jumpT += dt;
      const k = Math.min(1, p.jumpT / 0.45);
      p.x = p.jumpFrom[0] + (p.jumpTo[0] - p.jumpFrom[0]) * k; p.y = p.jumpFrom[1] + (p.jumpTo[1] - p.jumpFrom[1]) * k;
      if (k >= 1) { p.jumpT = 0; this.audio.play("land"); }
      return;
    }
    p.moving = false;
    if (this.busy() || this.overlay) return;
    let [dx, dy, mag] = this.moveInput();
    if (!dx && !dy) return;
    if (Math.abs(dx) >= Math.abs(dy)) p.dir = dx > 0 ? "right" : "left"; else p.dir = dy > 0 ? "down" : "up";
    const running = (this.keys.has("shift") || this.runHeld !== false) && this.abilities.has("laufen");
    const sp = 125 * (running ? 1.75 : 1) * (p.size === "small" ? 0.85 : 1) * Math.max(0.5, mag);
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const small = p.size === "small";
    let moved = false;
    // v4.7: an animal that wandered INTO the hero must not trap him - let him walk out of it
    const inside = this.world.entities.filter(e => e !== p && e.visible && e.solid && rectsOverlap(e.rect(), p.rect()));
    for (const e of inside) e.solid = false;
    try {
    for (const [ax, ay] of [[dx, 0], [0, dy]]) {
      if (!ax && !ay) continue;
      const r = p.rect(), nx = p.x + ax * sp * dt, ny = p.y + ay * sp * dt;
      const nr = [nx - r[2] / 2, ny - r[3], r[2], r[3]];
      if (!this.world.blockedRect(nr, small, p)) { p.x = nx; p.y = ny; moved = true; }
      else if (Math.abs(ax) > 0.3 || Math.abs(ay) > 0.3) this.bump(nr);
    }
    } finally { for (const e of inside) e.solid = true; }
    p.moving = moved;
    if (moved) {
      p.stepT += dt * (running ? 1.6 : 1);
      if (p.stepT > 0.28) { p.stepT = 0; this.audio.play("step", 0.5); }
      if (running && Math.random() < 0.3) this.particles.push([p.x - (p.dir === "right" ? 8 : -8), p.y - 2, uniform(-20, 20), -uniform(5, 25), 0.4, [200, 186, 150]]);
    }
  }
  bump(r) {
    if (this.bumpCool > 0) return;
    const tiles = new Set();
    for (let ty = Math.floor(r[1] / TILE); ty <= Math.floor((r[1] + r[3] - 1) / TILE); ty++)
      for (let tx = Math.floor(r[0] / TILE); tx <= Math.floor((r[0] + r[2] - 1) / TILE); tx++) tiles.add(tx + "," + ty);
    const gen = Story.onBump(this, tiles);
    if (gen) { this.bumpCool = 1.5; this.run(gen); }
  }
  facingVec() { return { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.player.dir]; }
  tryJump() {
    const p = this.player;
    if (!this.abilities.has("springen") || p.jumpT > 0 || this.busy()) return;
    if (p.size === "big") { this.toast("Слишком тяжёлый, чтобы прыгать!", MUTED); return; }
    const [vx, vy] = this.facingVec();
    for (const dist of [2.2, 1.2]) {
      const tx = p.x + vx * TILE * dist, ty = p.y + vy * TILE * dist, r = p.rect();
      const nr = [tx - r[2] / 2, ty - r[3], r[2], r[3]];
      if (!this.world.blockedRect(nr, p.size === "small", p)) {
        const mx = Math.floor((p.x + vx * TILE * dist / 2) / TILE), my = Math.floor((p.y - 4 + vy * TILE * dist / 2) / TILE);
        const mid = this.world.tileAt(mx, my);
        if (mid === "r" || mid === "k" || mid === "w") continue;
        if (this.world.foot.has(mx + "," + my) && mid !== "s") {
          const big = this.world.props.some(pp => pp.foot.some(([a, b]) => a === mx && b === my) && /^(t|pine|house|tower|hedge|boulder|gate|p[tblr]\d)/.test(pp.name));
          if (big || !this.world.props.some(pp => pp.foot.some(([a, b]) => a === mx && b === my))) continue;
        }
        p.jumpFrom = [p.x, p.y]; p.jumpTo = [tx, ty]; p.jumpT = 0.0001; this.audio.play("jump");
        return;
      }
    }
    p.jumpFrom = [p.x, p.y]; p.jumpTo = [p.x, p.y]; p.jumpT = 0.0001; this.audio.play("jump");
  }
  findTarget() {
    const p = this.player, [vx, vy] = this.facingVec();
    const fx = p.x + vx * 22, fy = p.y - 10 + vy * 22;
    let best = null, bd = 1e9;
    for (const e of this.world.entities) {
      if (!e.visible || !e.talk) continue;
      const d = Math.hypot(e.x - fx, e.y - 10 - fy);
      if (d < e.reach * (this.touch ? 1.3 : 1) && d < bd) { best = e; bd = d; }
    }
    for (const pr of this.world.props) {
      if (!pr.visible || !pr.interact) continue;
      const d = Math.hypot(pr.x - fx, pr.y - 12 - fy), reach = (pr.reach + (pr.w - 1) * 16) * (this.touch ? 1.25 : 1);
      if (d < reach && d < bd) { best = pr; bd = d; }
    }
    return best;
  }
  interact() {
    if (this.busy()) return;
    const t = this.findTarget();
    if (!t) return;
    if (t instanceof Entity) { t.face(this.player); this.player.face(t); this.run(t.talk(this, t)); }
    else this.run(t.interact(this, t));
  }

  // ------------------------------------------------------------------ drawing
  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgb(14,10,22)"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawWorld(ctx);
    if (this.state === "title") { this.drawTitle(ctx); return; }
    this.drawHud(ctx);
    if (this.action) this.action.draw(ctx);
    if (this.fadeLevel > 0) {
      ctx.fillStyle = `rgba(8,6,14,${this.fadeLevel / 255})`; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      if (this.action instanceof Say && this.fadeLevel > 200) this.action.draw(ctx);
    }
    if (this.touch && this.state === "play" && !this.overlay && !this.busy()) this.drawTouch(ctx);
    if (this.overlay) this.overlay.draw(ctx);
    this.drawToasts(ctx);
    if (this.debug && this.state === "play") this.debug.draw(ctx);
    if (this.hasFocus === false && !this.touch) {
      const msg = "Нажми мышкой на игру, чтобы управлять с клавиатуры";
      const w = measure(ctx, msg, 26, true) + 40;
      panel(ctx, [WIDTH / 2 - w / 2, HEIGHT - 70, w, 46], { color: PANEL2, border: GOLD, alpha: 245 });
      drawText(ctx, msg, WIDTH / 2, HEIGHT - 47, 26, WHITE, { center: true, bold: true });
    }
  }
  drawWorld(ctx) {
    const art = this.art, wd = this.world, col = !!wd.colored;
    const ox = Math.round(this.cam[0] + (this.shake > 0 ? uniform(-4, 4) : 0)), oy = Math.round(this.cam[1] + (this.shake > 0 ? uniform(-4, 4) : 0));
    const x0 = Math.max(0, Math.floor(ox / TILE)), y0 = Math.max(0, Math.floor(oy / TILE));
    const x1 = Math.min(wd.w, Math.floor((ox + WIDTH) / TILE) + 2), y1 = Math.min(wd.h, Math.floor((oy + HEIGHT) / TILE) + 2);
    const fr = Math.floor(this.time * 3) % 3, bank = col ? art.tiles : art.tilesGrey;
    for (let ty = y0; ty < y1; ty++) {
      const row = wd.tiles[ty], vr = wd.vari[ty];
      for (let tx = x0; tx < x1; tx++) {
        const kind = TILE_KIND[row[tx]], f = (kind === "water" || kind === "stream") ? fr : 0;
        ctx.drawImage(bank[kind + vr[tx] + "_" + f], tx * TILE - ox, ty * TILE - oy, TILE + 0.5, TILE + 0.5);
      }
    }
    const items = [];
    for (const p of wd.props) {
      if (!p.visible || !p.img) continue;
      if (p.x < ox - 200 || p.x > ox + WIDTH + 200 || p.y < oy - 40 || p.y > oy + HEIGHT + 300) continue;
      items.push([p.y + p.layer * 10000, 0, p]);
    }
    for (const e of wd.entities) if (e.visible && e.x > ox - 100 && e.x < ox + WIDTH + 100 && e.y > oy - 60 && e.y < oy + HEIGHT + 120) items.push([e.y, 1, e]);
    items.push([this.player.y, 2, this.player]);
    items.sort((a, b) => a[0] - b[0]);
    for (const [, kind, obj] of items) {
      if (kind === 0) {
        const p = obj;
        let colored = p.forceColor || (p.word ? !!this.known[p.word] : col);
        if (p.word && col) colored = true;
        const img = art.get(p.frameKey(this.time), !colored);
        const w = img.width * p.scale, h = img.height * p.scale;
        ctx.drawImage(img, Math.round(p.x - w / 2 - ox + p.offset[0]), Math.round(p.y - h - oy + p.offset[1]), w, h);
      } else this.drawEntity(ctx, obj, ox, oy);
    }
    for (const q of this.particles) { ctx.fillStyle = rgb(q[5]); const s = q[4] < 0.5 ? 2 : 3; ctx.fillRect(q[0] - ox - s / 2, q[1] - oy - s / 2, s * 1.5, s * 1.5); }
    if (this.darkness > 0.02) this.drawDarkness(ctx, ox, oy);
    if (this.state === "play") this.drawHints(ctx, ox, oy);
    if (this.has("funke") && this.state === "play") this.drawFunke(ctx, this.funke.x - ox, this.funke.y - oy, 1);
    for (const [ent, sym] of this.emotes) this.drawEmote(ctx, ent, sym, ox, oy);
    if (this.state === "play" && !this.busy() && !this.overlay) {
      const t = this.findTarget();
      if (t) {
        const isE = t instanceof Entity;
        let tx = t.x - ox, ty = (isE ? t.y - 62 : t.y - 54) - oy;
        if (isE && t.kind !== "person") ty = t.y - 40 - oy;
        ty += Math.sin(this.time * 6) * 3;
        roundRect(ctx, tx - 13, ty - 13, 26, 26, 6); ctx.fillStyle = rgb([250, 246, 236]); ctx.fill(); ctx.strokeStyle = rgb(INK); ctx.lineWidth = 2; ctx.stroke();
        drawText(ctx, "E", tx, ty, 24, INK, { center: true, shadow: false, bold: true });
      }
    }
  }
  // sparkles over things that have a word to give right now; "!" over whoever moves the story on
  drawHints(ctx, ox, oy) {
    if (this.busy() || this.overlay) return;
    const t = this.time;
    const twinkle = (x, y, seed) => {
      for (let i = 0; i < 3; i++) {
        const ph = t * 2.2 + seed + i * 2.1, a = (Math.sin(ph) + 1) / 2;
        if (a < 0.35) continue;
        const sx = x + Math.cos(seed + i * 2.4) * 14, sy = y - 6 + Math.sin(seed * 1.7 + i) * 8 - (ph % 3) * 2;
        ctx.fillStyle = `rgba(255,236,150,${a * 0.9})`;
        ctx.fillRect(sx - 1, sy - 4, 2, 8); ctx.fillRect(sx - 4, sy - 1, 8, 2);
      }
    };
    for (const p of this.world.props) if (p.visible && p.interact && Story.teachable(this, p)) twinkle(p.x - ox, p.y - oy - (p.img && this.art.img[p.frameKey(0)] ? this.art.img[p.frameKey(0)].height * p.scale * 0.7 : 30), p.x * 0.01);
    for (const e of this.world.entities) if (e.visible && e.talk && Story.teachable(this, e)) twinkle(e.x - ox, e.y - oy - (e.kind === "person" ? 52 : 34), e.x * 0.013);
    const q = Story.questTarget(this);
    const qe = q && (this.world.ent[q] || this.world.propByName[q]);
    if (qe && qe.visible !== false) {
      const isE = qe instanceof Entity;
      const x = qe.x - ox, y = qe.y - oy - (isE ? (qe.kind === "person" ? 74 : 52) : 70) + Math.sin(t * 4) * 3;
      ctx.fillStyle = rgb(GOLD); ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(INK); ctx.lineWidth = 2; ctx.stroke();
      drawText(ctx, "!", x, y, 26, INK, { center: true, shadow: false, bold: true });
    }
  }
  drawFunke(ctx, x, y, k) {
    const n = Object.keys(this.known).length, flick = 0.85 + 0.15 * Math.sin(this.time * 9) * Math.sin(this.time * 5.3);
    const r = (7 + Math.min(10, n / 6)) * k * flick;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 3.2);
    g.addColorStop(0, "rgba(255,240,170,0.9)"); g.addColorStop(0.35, "rgba(255,190,80,0.45)"); g.addColorStop(1, "rgba(255,150,50,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgb(255,250,225)"; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
    // two tiny eyes so he can look cheeky
    ctx.fillStyle = "rgb(90,50,30)";
    const look = this.player.dir === "left" ? -1.5 : this.player.dir === "right" ? 1.5 : 0;
    ctx.fillRect(x - r * 0.28 + look - 1, y - r * 0.12 - 1, 2 * k, 3 * k); ctx.fillRect(x + r * 0.2 + look - 1, y - r * 0.12 - 1, 2 * k, 3 * k);
  }
  drawEntity(ctx, e, ox, oy) {
    const art = this.art, colored = this.isColored(e.name);
    let img;
    if (e.kind === "person") {
      const frames = (colored ? art.people : art.peopleGrey)[e.sprite][e.dir];
      img = frames[e.moving ? [1, 0, 2, 0][Math.floor(e.anim * 8) % 4] : 0];
    } else {
      const bank = e.shadow ? art.shadows[e.sprite] : (colored ? art.animals : art.animalsGrey)[e.sprite];
      const frames = bank[e.dir] || bank.right;
      const f = e.moving ? Math.floor(e.anim * 8) % frames.length : ((e.sprite === "owl" || e.sprite === "bird") ? Math.floor(e.anim * 1.5) % frames.length : 0);
      img = frames[f];
    }
    const k = e === this.player ? this.player.scale : e.scale;
    const w = img.width * k, h = img.height * k;
    let x = e.x - w / 2 - ox, y = e.y - h - oy + 4;
    if (e === this.player) {
      const p = this.player;
      if (p.jumpT > 0) y -= Math.sin(Math.min(1, p.jumpT / 0.45) * Math.PI) * 34;
      if (p.shiver > 0) x += Math.sin(this.time * 60) * 2;
    }
    if (e.shadow) {
      y += Math.sin(this.time * 2 + e.x) * 3;
      ctx.fillStyle = "rgba(60,30,100,0.27)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 4, w / 2 + 15, h / 2 + 10, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,0.23)"; ctx.beginPath(); ctx.ellipse(e.x - ox, e.y - oy, w * 0.35, 4, 0, 0, TAU); ctx.fill();
    ctx.drawImage(img, Math.round(x), Math.round(y), w, h);
    if (e.shadow) { ctx.fillStyle = "rgb(255,240,140)"; ctx.beginPath(); ctx.arc(x + w * (e.dir === "right" ? 0.74 : 0.26), y + h * 0.3, 3, 0, TAU); ctx.fill(); }
    if (e === this.player && this.player.carry) {
      const pot = art.get("pot_" + this.player.carry);
      ctx.drawImage(pot, Math.round(e.x - pot.width / 2 - ox), Math.round(y - pot.height + 6));
    }
  }
  drawEmote(ctx, ent, sym, ox, oy) {
    const x = ent.x - ox, y = ent.y - (ent.kind === "person" ? 66 : 44) - oy - 14;
    roundRect(ctx, x - 17, y - 15, 34, 30, 10); ctx.fillStyle = rgb([250, 246, 236]); ctx.fill(); ctx.strokeStyle = rgb(INK); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y + 14); ctx.lineTo(x + 5, y + 14); ctx.lineTo(x, y + 22); ctx.fill();
    if (sym === "heart") {
      ctx.fillStyle = "rgb(225,70,90)";
      ctx.beginPath(); ctx.arc(x - 5, y - 2, 6, 0, TAU); ctx.arc(x + 5, y - 2, 6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 10); ctx.fill();
    } else drawText(ctx, sym, x, y, 30, INK, { center: true, shadow: false, bold: true });
  }
  drawDarkness(ctx, ox, oy) {
    if (this.darkCanvas.width !== WIDTH) this.darkCanvas = makeCanvas(WIDTH, HEIGHT);
    const c = this.darkCanvas, d = c.getContext("2d");
    const a = 0.98 * this.darkness, px = this.player.x - ox, py = this.player.y - 20 - oy, rad = this.lantern ? 150 : 34;
    d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, WIDTH, HEIGHT);
    d.fillStyle = `rgba(4,2,10,${a})`; d.fillRect(0, 0, WIDTH, HEIGHT);
    d.globalCompositeOperation = "destination-out";
    const gr = d.createRadialGradient(px, py, rad * 0.25, px, py, rad + 10);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = gr; d.beginPath(); d.arc(px, py, rad + 10, 0, TAU); d.fill();
    d.globalCompositeOperation = "source-over";
    ctx.drawImage(c, 0, 0, WIDTH, HEIGHT);
    if (this.lantern) { ctx.fillStyle = "rgba(255,200,90,0.1)"; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
  }
  drawHud(ctx) {
    const hideGoal = this.action && (this.action instanceof Spark || this.action instanceof ShadowBattle || this.action instanceof Sentence || this.action instanceof OpaSays || this.action instanceof Count || this.action instanceof RaftRide || this.action instanceof ChapterCard);
    if (this.goalText && !hideGoal) {
      const plainGoal = parseMixed(this.goalText, this.known, this.name).map(s => s.t).join("");
      const w = Math.min(Math.max(measure(ctx, plainGoal, 24), measure(ctx, this.chapterLabel + " · " + (this.world.def.title || ""), 21)) + 30, this.touch ? 540 : 600);
      panel(ctx, [12, 10, w, 56], { alpha: 200, border: null });
      drawText(ctx, this.chapterLabel + (this.world.def.title ? "  ·  " + this.world.def.title : ""), 26, 15, 21, GOLD);
      drawMixed(ctx, this.goalText, this.known, [26, 37, w - 20, 30], 24, null, this.name);
    }
    const n = Object.keys(this.known).length, r = [WIDTH - 150, 10, 138, 40];
    if (this.touch) r[0] = WIDTH - 140;
    panel(ctx, r, { alpha: 200, border: null });
    ctx.fillStyle = "rgb(180,70,60)"; ctx.fillRect(r[0] + 12, r[1] + 9, 18, 22);
    ctx.fillStyle = "rgb(250,230,200)"; ctx.fillRect(r[0] + 15, r[1] + 11, 13, 18);
    ctx.fillStyle = "rgb(180,70,60)"; ctx.fillRect(r[0] + 20, r[1] + 11, 2, 18);
    drawText(ctx, `${n} / ${ORDER.length}`, r[0] + 40, r[1] + 11, 26, WHITE);
    if (!this.touch) {
      drawText(ctx, "TAB", r[0] + r[2] - 6, r[1] + r[3] + 4, 18, MUTED, { right: true });
      drawText(ctx, "ESC — меню", r[0] - 12, r[1] + 12, 20, MUTED, { right: true });
      let y = 70;
      for (const [k, label] of [["springen", "ПРОБЕЛ: spring!"], ["laufen", "SHIFT: lauf!"]])
        if (this.abilities.has(k) && !this.busy()) { drawText(ctx, label, WIDTH - 14, y, 20, MUTED, { right: true }); y += 20; }
    }
  }
  drawTouch(ctx) {
    this.touchButtons();
    for (const b of this.btns) {
      if (b.name === "book") continue;
      if (b.name === "menu") {
        ctx.fillStyle = "rgba(32,26,44,0.78)"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = rgb(WHITE); for (let i = -1; i <= 1; i++) ctx.fillRect(b.x - 11, b.y + i * 7 - 1.5, 22, 3);
        continue;
      }
      const pressed = b.name === "run" && this.runHeld !== false;
      ctx.fillStyle = pressed ? "rgba(250,214,96,0.55)" : "rgba(32,26,44,0.55)"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(250,246,236,0.7)"; ctx.lineWidth = 3; ctx.stroke();
      drawText(ctx, b.label, b.x, b.y, b.label.length < 2 ? 56 : 26, WHITE, { center: true, bold: true });
    }
    const j = this.joy, cx = j ? j.cx : 120, cy = j ? j.cy : 520;
    ctx.fillStyle = j ? "rgba(32,26,44,0.45)" : "rgba(32,26,44,0.28)"; ctx.beginPath(); ctx.arc(cx, cy, 66, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(250,246,236,0.45)"; ctx.lineWidth = 3; ctx.stroke();
    let kx = cx, ky = cy;
    if (j) { const dx = j.x - j.cx, dy = j.y - j.cy, d = Math.hypot(dx, dy), m = Math.min(d, 60); if (d > 0) { kx = cx + dx / d * m; ky = cy + dy / d * m; } }
    ctx.fillStyle = "rgba(250,246,236,0.6)"; ctx.beginPath(); ctx.arc(kx, ky, 28, 0, TAU); ctx.fill();
  }
  drawToasts(ctx) {
    let y = 92;
    for (const [text, col, t] of this.toasts) {
      const a = Math.min(1, t / 0.4), w = measure(ctx, text, 26, true) + 36, r = [WIDTH - 12 - w, y, w, 38];
      roundRect(ctx, r[0], r[1], r[2], r[3], 19); ctx.fillStyle = rgb(PANEL, 0.9 * a); ctx.fill();
      ctx.strokeStyle = rgb(col, a); ctx.lineWidth = 2; ctx.stroke();
      drawText(ctx, text, r[0] + w / 2, r[1] + 19, 26, col, { center: true, bold: true, shadow: false, alpha: a });
      y += 44;
    }
  }
  drawTitle(ctx) {
    ctx.fillStyle = "rgba(14,10,26,0.67)"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawText(ctx, "Wortwald", WIDTH / 2, 170, 120, DE, { center: true, bold: true });
    drawText(ctx, "Лес слов", WIDTH / 2, 245, 40, WHITE, { center: true });
    drawText(ctx, "маленькая деревня, большой лес и немного немецкого", WIDTH / 2, 300, 24, MUTED, { center: true });
    this.drawFunke(ctx, WIDTH / 2 + 250 + Math.sin(this.time) * 10, 150 + Math.sin(this.time * 1.7) * 8, 1.6);
    this.titleOptions().forEach((o, i) => {
      const r = [WIDTH / 2 - 160, 370 + i * 64, 320, 54], sel = i === this.titleSel && !this.touch;
      panel(ctx, r, { color: sel ? PANEL2 : PANEL, border: sel || this.touch ? GOLD : MUTED, width: sel ? 3 : 2 });
      drawText(ctx, o, r[0] + 160, r[1] + 27, 34, WHITE, { center: true });
    });
    this.fullscreenBtn = null;
    if (this.onFullscreen && this.touch) {
      this.fullscreenBtn = [WIDTH / 2 - 160, 370 + this.titleOptions().length * 64, 320, 44];
      panel(ctx, this.fullscreenBtn, { color: PANEL, border: MUTED, width: 2 });
      drawText(ctx, "на весь экран", WIDTH / 2, this.fullscreenBtn[1] + 22, 26, MUTED, { center: true });
    }
    drawText(ctx, this.touch ? "джойстик слева — ходить, кнопка E — говорить и трогать, книжка вверху — слова" : "стрелки или WASD — ходить, E — говорить, TAB — книга слов, R — повторить, ESC — меню", WIDTH / 2, HEIGHT - 50, 21, MUTED, { center: true });
    drawText(ctx, "включи звук: слова произносит немецкий голос", WIDTH / 2, HEIGHT - 26, 20, [140, 132, 150], { center: true });
    // v4.2: an unremarkable bug in the corner opens the developer's scene director
    this.bugBtn = [WIDTH - 48, HEIGHT - 48, 40, 40];
    ctx.save(); ctx.globalAlpha = 0.35; drawBug(ctx, WIDTH - 28, HEIGHT - 27, 0.75, [170, 160, 180]); ctx.restore();
  }
}

// =============================================================================== overlays
class Book {
  constructor(g) {
    this.g = g; this.keys = ORDER; this.t = 0; this.peek = false; this.rects = [];
    const kn = this.keys.map((k, i) => g.known[k] ? i : -1).filter(i => i >= 0);
    this.sel = kn.length ? kn[kn.length - 1] : 0;
  }
  close() { this.g.overlay = null; this.g.audio.play("page"); }
  sayIt() { const k = this.keys[this.sel]; if (this.g.known[k]) this.g.audio.say(withArticle(k)); }
  handle(ev) {
    const n = this.keys.length, C = 8;
    if (ev.type === "key") {
      if (ev.key === "tab" || ev.key === "esc") this.close();
      else if (ev.key === "right") this.sel = (this.sel + 1) % n;
      else if (ev.key === "left") this.sel = (this.sel - 1 + n) % n;
      else if (ev.key === "down") this.sel = Math.min(n - 1, this.sel + C);
      else if (ev.key === "up") this.sel = Math.max(0, this.sel - C);
      else if (["r", "e", "space", "enter"].includes(ev.key)) this.sayIt();
    } else if (ev.type === "tap") {
      if (this.closeR && inRect(this.closeR, ev.x, ev.y)) { this.close(); return; }
      if (this.peekR && inRect(this.peekR, ev.x, ev.y)) { this.peek = !this.peek; return; }
      if (this.listenR && inRect(this.listenR, ev.x, ev.y)) { this.sayIt(); return; }
      if (!inRect([30, 20, WIDTH - 60, HEIGHT - 40], ev.x, ev.y)) { this.close(); return; }
      this.rects.forEach((r, i) => { if (inRect(r, ev.x, ev.y)) { if (this.sel === i) this.sayIt(); this.sel = i; this.peek = false; } });
    }
  }
  update(dt) { this.t += dt; }
  draw(ctx) {
    const g = this.g, ink = [60, 44, 40], soft = [150, 130, 110];
    ctx.fillStyle = "rgba(10,6,20,0.84)"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const page = [30, 20, WIDTH - 60, HEIGHT - 40];
    roundRect(ctx, page[0], page[1], page[2], page[3], 12); ctx.fillStyle = "rgb(236,222,190)"; ctx.fill(); ctx.strokeStyle = "rgb(120,80,52)"; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = "rgb(200,180,140)"; ctx.fillRect(page[0] + 560, page[1] + 20, 2, page[3] - 40);
    drawText(ctx, "Книга слов · Wörterbuch", page[0] + 24, page[1] + 18, 32, ink, { shadow: false, bold: true });
    drawText(ctx, `${Object.keys(g.known).length} из ${ORDER.length}`, page[0] + 540, page[1] + 24, 24, [120, 100, 90], { shadow: false, right: true });
    this.rects = [];
    const cw = 64, ch = 62, gx = page[0] + 22, gy = page[1] + 62;
    this.keys.forEach((k, i) => {
      const r = [gx + (i % 8) * cw, gy + Math.floor(i / 8) * ch, cw - 6, ch - 6];
      this.rects.push(r);
      const kn = !!g.known[k];
      roundRect(ctx, r[0], r[1], r[2], r[3], 8); ctx.fillStyle = kn ? "rgb(250,242,220)" : "rgb(214,200,170)"; ctx.fill();
      if (i === this.sel) { ctx.strokeStyle = "rgb(200,120,40)"; ctx.lineWidth = 3; ctx.stroke(); }
      if (kn) {
        const ic = g.art.wordIcon(k), s = 0.75;
        ctx.drawImage(ic, r[0] + r[2] / 2 - ic.width * s / 2, r[1] + r[3] / 2 - 6 - ic.height * s / 2, ic.width * s, ic.height * s);
        ctx.font = fontCss(17, true); const tw = Math.min(ctx.measureText(WORDS[k].de).width, r[2] - 4);
        ctx.fillStyle = rgb(wordColor(k).map(v => v * 0.6)); ctx.textBaseline = "bottom";
        ctx.fillText(WORDS[k].de, r[0] + r[2] / 2 - tw / 2, r[1] + r[3] - 1, r[2] - 4); ctx.textBaseline = "top";
      } else drawText(ctx, "?", r[0] + r[2] / 2, r[1] + r[3] / 2, 30, [180, 164, 140], { center: true, shadow: false });
    });
    const k = this.keys[this.sel], dx = page[0] + 590;
    this.peekR = null; this.listenR = null;
    if (g.known[k]) {
      const d = WORDS[k], ic = g.art.wordIcon(k);
      drawImg(ctx, ic, dx + 140 - ic.width, page[1] + 120 - ic.height, 2);
      if (d.art) drawHat(ctx, dx + 140, page[1] + 214, hatColor(d.art), 0.9);
      drawText(ctx, withArticle(k), dx + 140, page[1] + 238, 50, wordColor(k).map(v => v * 0.65), { center: true, shadow: false, bold: true });
      // feeling, wrapped
      ctx.font = fontCss(23); let x = dx, y = page[1] + 274;
      for (const wd of d.feel.split(" ")) {
        const w = ctx.measureText(wd + " ").width;
        if (x + w > dx + 290) { x = dx; y += 22; }
        ctx.fillStyle = rgb(ink); ctx.fillText(wd, x, y); x += w;
      }
      drawText(ctx, d.ex, dx + 140, page[1] + 410, 30, [90, 60, 120], { center: true, shadow: false });
      const stars = 1 + (g.known[k] >= 3) + (g.known[k] >= 6);
      for (let i = 0; i < 3; i++) star(ctx, dx + 110 + i * 30, page[1] + 452, 11, i < stars ? [230, 170, 40] : [200, 186, 160]);
      const peek = this.peek || g.keys.has("shift");
      if (g.touch) {
        this.peekR = [dx + 40, page[1] + 474, 200, 40];
        roundRect(ctx, ...this.peekR, 10); ctx.fillStyle = "rgb(226,210,176)"; ctx.fill();
        drawText(ctx, peek ? d.ru : "перевод", dx + 140, page[1] + 494, peek ? 30 : 24, peek ? [160, 60, 50] : soft, { center: true, shadow: false, bold: peek });
        this.listenR = [dx + 40, page[1] + 520, 200, 36];
        roundRect(ctx, ...this.listenR, 10); ctx.fillStyle = "rgb(226,210,176)"; ctx.fill();
        drawText(ctx, "послушать", dx + 140, page[1] + 538, 24, soft, { center: true, shadow: false });
      } else {
        if (peek) drawText(ctx, d.ru, dx + 140, page[1] + 494, 32, [160, 60, 50], { center: true, shadow: false, bold: true });
        else drawText(ctx, "зажми SHIFT, чтобы подсмотреть перевод", dx + 140, page[1] + 494, 20, soft, { center: true, shadow: false });
        drawText(ctx, "E / R — послушать", dx + 140, page[1] + 524, 20, soft, { center: true, shadow: false });
      }
    } else {
      drawText(ctx, "Это слово ещё не проснулось.", dx + 140, page[1] + 200, 28, soft, { center: true, shadow: false });
      drawText(ctx, "Глава " + WORDS[k].ch, dx + 140, page[1] + 236, 22, soft, { center: true, shadow: false });
    }
    if (g.has("hats")) {
      let x = page[0] + 24; const ly = page[1] + page[3] - 40;
      for (const a of ["der", "die", "das"]) { drawHat(ctx, x + 16, ly + 22, hatColor(a), 0.55); drawText(ctx, a, x + 36, ly + 4, 24, hatColor(a).map(v => v * 0.6), { shadow: false, bold: true }); x += 90; }
    }
    this.closeR = [page[0] + page[2] - 170, page[1] + page[3] - 44, 160, 36];
    drawText(ctx, g.touch ? "× закрыть" : "TAB — закрыть", page[0] + page[2] - 20, page[1] + page[3] - 34, 22, soft, { right: true, shadow: false });
  }
}
function star(ctx, x, y, r, col) {
  ctx.fillStyle = rgb(col); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.45; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

class Menu {
  constructor(g) { this.g = g; this.sel = 0; }
  options() { const a = this.g.audio; return ["Продолжить", "Книга слов", "Музыка: " + (a.musicOn ? "вкл" : "выкл"), "Голос: " + (a.voiceOn ? "вкл" : "выкл"), "Экранные кнопки: " + (this.g.touch ? "вкл" : "выкл"), "Выйти в главное меню"]; }
  handle(ev) {
    const n = this.options().length;
    if (ev.type === "key") {
      if (ev.key === "esc") this.g.overlay = null;
      else if (ev.key === "up") this.sel = (this.sel - 1 + n) % n;
      else if (ev.key === "down") this.sel = (this.sel + 1) % n;
      else if (isConfirm(ev)) this.pick(this.sel);
    } else if (ev.type === "tap") {
      let hit = false;
      for (let i = 0; i < n; i++) if (inRect([WIDTH / 2 - 180, 170 + i * 60, 360, 50], ev.x, ev.y)) { this.pick(i); hit = true; }
      if (!hit) this.g.overlay = null;
    } else if (ev.type === "move") for (let i = 0; i < n; i++) if (inRect([WIDTH / 2 - 180, 170 + i * 60, 360, 50], ev.x, ev.y)) this.sel = i;
  }
  pick(i) {
    const g = this.g; g.audio.play("tick");
    if (i === 0) g.overlay = null;
    else if (i === 1) g.overlay = new Book(g);
    else if (i === 2) g.audio.toggleMusic();
    else if (i === 3) { g.audio.voiceOn = !g.audio.voiceOn; if (g.audio.voiceOn) g.audio.say("Hallo! Ich bin der Funke."); }
    else if (i === 4) { g.touch = !g.touch; g.manualControls = true; }
    else if (i === 5) { if (!g.busy()) g.save(); g.overlay = null; g.state = "title"; g.titleSel = 0; g.debug = null; g.debugAuto = false; }
  }
  update() { }
  draw(ctx) {
    ctx.fillStyle = "rgba(10,6,20,0.75)"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawText(ctx, "Пауза", WIDTH / 2, 110, 56, GOLD, { center: true, bold: true });
    drawText(ctx, "Wortwald " + GAME_VERSION, WIDTH - 20, HEIGHT - 30, 20, [150, 140, 170], { right: true });
    this.options().forEach((o, i) => {
      const r = [WIDTH / 2 - 180, 170 + i * 60, 360, 50], sel = i === this.sel && !this.g.touch;
      panel(ctx, r, { color: sel ? PANEL2 : PANEL, border: sel ? GOLD : MUTED, width: sel ? 3 : 2 });
      drawText(ctx, o, r[0] + 180, r[1] + 25, 30, WHITE, { center: true });
    });
    drawText(ctx, "Голос: " + this.g.audio.speech.status(), WIDTH / 2, HEIGHT - 92, 20, [170, 160, 190], { center: true });
    drawText(ctx, "Игра сама сохраняется после каждой сцены (в этом браузере).", WIDTH / 2, HEIGHT - 60, 22, MUTED, { center: true });
  }
}
