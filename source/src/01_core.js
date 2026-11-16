// ============================================================================
// core: screen size, colours, seeded random, canvas helpers, text drawing
// ============================================================================
"use strict";
let WIDTH = 960;
const HEIGHT = 640;
const SCALE = 2, TILE = 16 * SCALE;
const WHITE = [250, 246, 236], INK = [40, 32, 48], MUTED = [170, 164, 180], GOLD = [250, 214, 96];
const DE = [255, 222, 120], PANEL = [32, 26, 44], PANEL2 = [52, 42, 70];
const GREEN = [120, 210, 120], RED = [235, 110, 110];
const TAU = Math.PI * 2;

function rgb(c, a) {
  if (a === undefined) a = c.length > 3 ? c[3] / 255 : 1;
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function light(c, k) { if (k === undefined) k = 0.35; return c.map(v => Math.round(v + (255 - v) * k)); }
function shade(c, k) { return [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.floor(c[i] * k)))); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function uniform(a, b) { return a + Math.random() * (b - a); }

// mulberry32 seeded random
function Rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.randint = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.choice = arr => arr[Math.floor(f() * arr.length)];
  return f;
}
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  return c;
}

// pygame Font(None, size) is roughly 0.7 of the size in CSS pixels
const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
function fontCss(size, bold) { return `${bold ? 800 : 600} ${Math.round(size * 0.72)}px ${FONT_FAMILY}`; }
const _mcache = new Map();
function measure(ctx, text, size, bold) {
  const k = size + (bold ? "b" : "") + "|" + text;
  let w = _mcache.get(k);
  if (w === undefined) {
    ctx.font = fontCss(size, bold);
    w = ctx.measureText(text).width;
    if (_mcache.size > 5000) _mcache.clear();
    _mcache.set(k, w);
  }
  return w;
}

// draw_text(ctx, text, x, y, size, color, {center, right, shadow, bold, alpha})
function drawText(ctx, text, x, y, size, color, o) {
  o = o || {};
  size = size || 26; color = color || WHITE;
  text = String(text);
  ctx.font = fontCss(size, o.bold);
  const w = ctx.measureText(text).width;
  const h = Math.round(size * 0.72);
  let tx = x, ty = y;
  if (o.center) { tx = x - w / 2; ty = y - h * 0.55; }
  else if (o.right) { tx = x - w; }
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (o.shadow !== false) { ctx.fillStyle = rgb([15, 10, 20], a); ctx.fillText(text, tx + 2, ty + 2); }
  ctx.fillStyle = rgb(color, a);
  ctx.fillText(text, tx, ty);
  return { x: tx, y: ty, w, h, right: tx + w, bottom: ty + h };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// panel(ctx, [x,y,w,h], {color, border, alpha(0-255), radius, width})
function panel(ctx, r, o) {
  o = o || {};
  const color = o.color || PANEL, border = o.border === undefined ? GOLD : o.border;
  const alpha = (o.alpha === undefined ? 235 : o.alpha) / 255, radius = o.radius === undefined ? 10 : o.radius;
  const width = o.width || 3;
  roundRect(ctx, r[0], r[1], r[2], r[3], radius);
  ctx.fillStyle = rgb(color, alpha);
  ctx.fill();
  if (border) {
    roundRect(ctx, r[0] + width / 2, r[1] + width / 2, r[2] - width, r[3] - width, radius);
    ctx.lineWidth = width;
    ctx.strokeStyle = rgb(border, 1);
    ctx.stroke();
  }
  return r;
}

function dim(ctx, a) {
  if (a > 0) { ctx.fillStyle = `rgba(10,6,20,${a / 255})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
}

function inRect(r, x, y) { return x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]; }
