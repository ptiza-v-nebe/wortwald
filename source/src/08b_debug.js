// ============================================================================
// debug director (v4.2): for the developer. The bug icon on the title screen opens it.
// The story is cut into its main scenes. Jumping to a scene fast-forwards everything
// before it silently (auto mode), then plays the scene itself live: the director makes
// the hero touch, talk, walk and jump by itself; you click through the dialogue
// (or switch on "авто" and just watch). Back / again / next move between scenes.
// Nothing is saved while the director is on.
// ============================================================================
const DBG = {
  goto(g, tx, ty, dir) { g.player.x = (tx + 0.5) * TILE; g.player.y = (ty + 1) * TILE - 4; if (dir) g.player.dir = dir; },
  talk(n) { return g => { const e = g.world.ent[n]; if (!e) throw new Error("нет персонажа " + n + " в " + g.loc); g.run(e.talk(g, e)); }; },
  touch(n) { return g => { const p = g.world.propByName[n]; if (!p) throw new Error("нет предмета " + n + " в " + g.loc); g.run(p.interact(g, p)); }; },
  go(to, at) { return g => { g.run(Story.travel(g, to, at, "up")); }; },
  at(tx, ty, wait) { return g => { DBG.goto(g, tx, ty); return wait || 0.2; }; },
};
const DEBUG_SCENES = [
  { title: "Пролог: Искорка", steps: [g => { g.run(Story.prologue(g)); }] },
  { title: "Колодец и Ома", steps: [DBG.touch("well")] },
  { title: "Tschüss, глава 1", steps: [DBG.at(28, 20)] },
  { title: "Дети и имя", steps: [DBG.talk("paul")] },
  { title: "Дом Омы снаружи", steps: [DBG.talk("oma"), DBG.touch("house_oma"), DBG.touch("house_oma")] },
  { title: "Вещи в доме", steps: ["bread", "bucket_in", "apple", "flower"].map(DBG.touch).concat([DBG.talk("mimi")]) },
  { title: "Проверка Омы", steps: [DBG.talk("oma")] },
  { title: "Поле: Клаус", steps: [DBG.go("field", [1, 15]), DBG.talk("klaus")] },
  { title: "Овцы", steps: ["sheep1", "sheep2", "sheep3"].map(DBG.talk).concat([DBG.touch("bigtree"), DBG.talk("sheep5"), DBG.talk("bello")]) },
  { title: "Пересчёт, глава 4", steps: [DBG.talk("klaus")] },
  { title: "Мастерская: краски", steps: [DBG.go("workshop", [12, 15]), DBG.talk("lotte")].concat(Story.COLORS.map(c => DBG.touch("pot_" + c))) },
  { title: "Картина Лотте", steps: [DBG.talk("lotte")].concat(...Story.PAINT_ORDER.map(c => [DBG.touch("pot_" + c), DBG.talk("lotte")])) },
  { title: "Причал, плот и шлюз", steps: [DBG.go("pier", [13, 15]), DBG.talk("opa")] },
  { title: "Луг: жар и холод", steps: [DBG.at(16, 21), DBG.touch("fire"), DBG.touch("icewater")] },
  { title: "Грибы и валун", steps: [DBG.touch("mush_blue"), DBG.at(10, 13), DBG.touch("mush_red"), g => { g.run(Story.onBump(g, new Set(["10,11"]))); }] },
  { title: "Пещера и фонарь", steps: [DBG.at(10, 7), DBG.touch("lantern")] },
  { title: "Лес", steps: [DBG.at(10, 0, 0.4)] },
  { title: "Тени в лесу", steps: Story.SHADOW_ORDER.map(k => g => { const [x, y] = Story.SHADOWS[k].pos; DBG.goto(g, x, y + 1); return 0.5; }) },
  { title: "Говорящая поляна", steps: [DBG.at(18, 0, 0.4)] },
  { title: "Мост из фраз", steps: ["eule", "baer", "hase", "fuchs", "vogel"].map(DBG.talk) },
  { title: "Прыжок, Маг и праздник", steps: [g => { DBG.goto(g, 17, 3, "up"); g.tryJump(); return 1.2; }] },
];

class Director {
  constructor(g) { this.g = g; this.i = 0; this.steps = []; this.si = 0; this.wait = 0; this.state = "idle"; this.rects = {}; this.err = ""; this.doneT = 0; }
  // ---- fast-forward everything before scene i, silently
  pump(frames) {
    const g = this.g;
    for (let n = 0; n < (frames || 0); n++) g.update(1 / 60);
    for (let n = 0; n < 9000; n++) { g.update(1 / 60); if (!g.busy() && n > 4) break; }
  }
  jump(i) {
    const g = this.g;
    this.i = Math.max(0, Math.min(DEBUG_SCENES.length - 1, i)); this.err = "";
    g.newState(); g.state = "play"; g.overlay = null; g.name = "Мика";
    const play = g.audio.play, say = g.audio.say;
    g.audio.play = () => { }; g.audio.say = () => { }; g.auto = true;
    try {
      for (let k = 0; k < this.i; k++) for (const st of DEBUG_SCENES[k].steps) { const d = st(g); this.pump(Math.round((d || 0) * 60)); }
    } catch (e) { console.error(e); this.err = String(e.message || e); }
    g.auto = false; g.audio.play = play; g.audio.say = say;
    g.toasts = []; g.particles = []; g.emotes = []; g.fadeLevel = 0; g.shake = 0;
    this.begin();
  }
  begin() { this.steps = DEBUG_SCENES[this.i].steps.slice(); this.si = 0; this.state = "run"; this.wait = 0.4; this.doneT = 0; }
  next() {
    if (this.i >= DEBUG_SCENES.length - 1) return;
    if (this.state === "done" && !this.err) { this.i++; this.begin(); } else this.jump(this.i + 1);
  }
  // ---- live: run the scene's steps one after another, each when the game is free
  update(dt) {
    const g = this.g;
    if (this.state === "done") {
      this.doneT += dt;
      if (g.debugAuto && this.doneT > 1.5 && !g.busy()) this.next();
      return;
    }
    if (this.state !== "run") return;
    if (g.busy() || g.overlay) { this.wait = Math.max(this.wait, 0.3); return; }
    if (this.wait > 0) { this.wait -= dt; return; }
    if (this.si >= this.steps.length) { this.state = "done"; return; }
    try { const d = this.steps[this.si++](g); this.wait = (d || 0) + 0.2; }
    catch (e) { console.error(e); this.err = String(e.message || e); this.state = "done"; }
  }
  // ---- the bar
  handle(ev) {
    const g = this.g, R = this.rects;
    let cmd = null;
    if (ev.type === "tap") { for (const [k, r] of Object.entries(R)) if (inRect(r, ev.x, ev.y)) cmd = k; if (!cmd && R.bar && inRect(R.bar, ev.x, ev.y)) return true; }
    else if (ev.type === "key") cmd = { n: "next", b: "prev", p: "auto" }[ev.key] || null;
    if (!cmd || cmd === "bar") return false;
    g.audio.play("tick");
    if (cmd === "prev") this.jump(this.i - 1);
    else if (cmd === "again") this.jump(this.i);
    else if (cmd === "next") this.next();
    else if (cmd === "auto") g.debugAuto = !g.debugAuto;
    else if (cmd === "close") { g.debug = null; g.debugAuto = false; g.action = null; g.script = null; g.queue = []; g.overlay = null; g.state = "title"; g.titleSel = 0; }
    return true;
  }
  draw(ctx) {
    const g = this.g, y = 72, h = 42, bar = [12, y, 680, h];
    this.rects = { bar };
    panel(ctx, bar, { color: [40, 20, 30], border: [200, 90, 90], alpha: 225, radius: 10, width: 2 });
    drawBug(ctx, 34, y + h / 2, 0.8, [230, 120, 110]);
    const st = this.err ? "ошибка" : this.state === "done" ? "готово" : "идёт…";
    const label = `${this.i + 1}/${DEBUG_SCENES.length}  ${DEBUG_SCENES[this.i].title}`;
    drawText(ctx, label, 56, y + 10, 22, WHITE, { bold: true });
    drawText(ctx, st, 392, y + 11, 20, this.err ? RED : this.state === "done" ? GREEN : MUTED);
    const btn = (name, x, w, drawIcon, on) => {
      const r = [x, y + 4, w, h - 8]; this.rects[name] = r;
      panel(ctx, r, { color: on ? [90, 50, 60] : [60, 34, 44], border: on ? GOLD : [150, 90, 100], alpha: 255, radius: 8, width: 2 });
      drawIcon(r[0] + r[2] / 2, r[1] + r[3] / 2);
    };
    const tri = (cx, cy, dir) => { ctx.fillStyle = "rgb(240,230,220)"; ctx.beginPath(); ctx.moveTo(cx - 7 * dir, cy - 9); ctx.lineTo(cx + 8 * dir, cy); ctx.lineTo(cx - 7 * dir, cy + 9); ctx.fill(); };
    btn("prev", 470, 40, (cx, cy) => tri(cx, cy, -1));
    btn("again", 514, 40, (cx, cy) => { ctx.strokeStyle = "rgb(240,230,220)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 8, 0.6, TAU - 0.3); ctx.stroke(); ctx.fillStyle = "rgb(240,230,220)"; ctx.beginPath(); ctx.moveTo(cx + 9, cy - 9); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx + 3, cy - 3); ctx.fill(); });
    btn("next", 558, 40, (cx, cy) => tri(cx, cy, 1));
    btn("auto", 602, 46, (cx, cy) => drawText(ctx, "авто", cx, cy, 18, g.debugAuto ? GOLD : WHITE, { center: true, bold: true }), g.debugAuto);
    btn("close", 652, 34, (cx, cy) => { ctx.strokeStyle = "rgb(240,230,220)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7); ctx.stroke(); });
    if (this.err) drawText(ctx, this.err.slice(0, 80), 20, y + h + 6, 18, RED);
    else if (!g.touch) drawText(ctx, "N — дальше, B — назад, P — авто", 20, y + h + 6, 17, [200, 170, 170]);
  }
}
// a small beetle: round body, head, six legs, feelers
function drawBug(ctx, cx, cy, k, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  ctx.strokeStyle = rgb(col); ctx.fillStyle = rgb(col); ctx.lineWidth = 2.4; ctx.lineCap = "round";
  for (const s of [-1, 1]) for (const dy of [-6, 1, 8]) { ctx.beginPath(); ctx.moveTo(6 * s, dy); ctx.lineTo(15 * s, dy + (dy < 0 ? -5 : dy > 4 ? 5 : 0)); ctx.stroke(); }
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2 * s, -14); ctx.lineTo(7 * s, -21); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 2, 9, 12, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -12, 5, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(14,10,26,0.7)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 13); ctx.stroke();
  ctx.restore();
}
