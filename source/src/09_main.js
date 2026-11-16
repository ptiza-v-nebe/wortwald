// ============================================================================
// main: page setup - sharp canvas on any screen, keyboard + touch input,
// name entry field, "rotate your phone" hint, fullscreen, the game loop.
// ============================================================================
(function () {
  const canvas = document.getElementById("game");
  const params = new URLSearchParams(location.search);
  const game = new Game(canvas, { auto: params.has("auto") });
  window.WW = game;
  let scale = 1, dpr = 1;

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // phones in landscape are wider than 3:2 - show more of the world instead of black bars
    const wide = Math.round(Math.max(960, Math.min(1440, HEIGHT * vw / vh)));
    if (wide !== WIDTH) { WIDTH = wide; game.darkCanvas = makeCanvas(WIDTH, HEIGHT); }
    scale = Math.min(vw / WIDTH, vh / HEIGHT);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.floor(WIDTH * scale) + "px";
    canvas.style.height = Math.floor(HEIGHT * scale) + "px";
    canvas.width = Math.floor(WIDTH * scale * dpr);
    canvas.height = Math.floor(HEIGHT * scale * dpr);
    game.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    game.ctx.imageSmoothingEnabled = false;
    const rot = document.getElementById("rotate");
    rot.style.display = (game.touch || "ontouchstart" in window) && vh > vw * 1.1 && !rot.dismissed ? "flex" : "none";
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  document.getElementById("rotate-ok").addEventListener("click", () => { document.getElementById("rotate").dismissed = true; resize(); });

  // ---- keyboard
  const KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down",
    A: "left", D: "right", W: "up", S: "down", " ": "space", Enter: "enter", e: "e", E: "e", Shift: "shift", Backspace: "back", Delete: "back",
    Tab: "tab", Escape: "esc", r: "r", R: "r", m: "m", M: "m", v: "v", V: "v", h: "h", H: "h", "р": "h", n: "n", N: "n", "т": "n", b: "b", B: "b", "и": "b", p: "p", P: "p", "з": "p",
    "ф": "left", "в": "right", "ц": "up", "ы": "down", "у": "e", "к": "r", "ь": "m", "м": "v" };
  window.addEventListener("keydown", e => {
    if (e.target && e.target.tagName === "INPUT") return;
    let k = KEYMAP[e.key];
    if (!k && /^[1-9]$/.test(e.key)) k = e.key;
    if (!k) return;
    e.preventDefault();
    if (e.repeat && !["left", "right", "up", "down", "shift"].includes(k)) return;
    if (e.repeat) return;
    game.keyEvent(k, true);
  });
  window.addEventListener("keyup", e => { const k = KEYMAP[e.key]; if (k) game.keyEvent(k, false); });
  window.addEventListener("blur", () => { game.keys.clear(); game.joy = null; game.runHeld = false; });

  // ---- pointer (mouse + touch, multi-touch)
  function pos(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * WIDTH, (e.clientY - r.top) / r.height * HEIGHT]; }
  // the game may live inside a frame (claude.ai): take the keyboard focus explicitly on every click/tap
  const grabFocus = () => { try { window.focus(); canvas.focus({ preventScroll: true }); } catch (_) { } };
  window.addEventListener("focus", () => { game.hasFocus = true; });
  window.addEventListener("blur", () => { game.hasFocus = false; });
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    grabFocus(); game.hasFocus = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
    const [x, y] = pos(e);
    const wasTouch = game.touch;
    game.pointerDown(e.pointerId, x, y, e.pointerType === "touch" || e.pointerType === "pen");
    if (!wasTouch && game.touch) resize();
  });
  canvas.addEventListener("pointermove", e => { const [x, y] = pos(e); game.pointerMove(e.pointerId, x, y); });
  const up = e => game.pointerUp(e.pointerId);
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  if ("ontouchstart" in window) game.touch = true;

  // ---- name entry with the phone's keyboard
  const ask = document.getElementById("ask"), askInput = document.getElementById("ask-input");
  game.onAskText = (title, def, cb) => {
    document.getElementById("ask-title").textContent = title;
    askInput.value = ""; askInput.placeholder = def;
    ask.style.display = "flex";
    setTimeout(() => askInput.focus(), 50);
    const done = () => { ask.style.display = "none"; askInput.blur(); cb(askInput.value || def); };
    document.getElementById("ask-ok").onclick = done;
    askInput.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); done(); } };
  };

  // ---- fullscreen (and landscape lock where the browser allows it)
  game.onFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(el)).then(() => { try { screen.orientation.lock("landscape").catch(() => { }); } catch (_) { } }).catch(() => { });
  };

  // ---- loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(frame);
  }
  resize();
  grabFocus(); game.hasFocus = document.hasFocus();
  requestAnimationFrame(frame);
  document.getElementById("loading").style.display = "none";
})();
