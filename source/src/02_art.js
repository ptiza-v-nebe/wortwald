// ============================================================================
// art: every picture is drawn by code into a tiny pixel buffer (crisp, no
// anti-aliasing), outlined, scaled x2 and turned into a canvas. Each one also
// gets a grey twin: things that lost their name are grey.
// ============================================================================
const OUT = [34, 26, 40];

class PS {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c.length > 3 ? c[3] : 255;
  }
  alpha(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, c) {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) this.set(xx, yy, c);
  }
  circle(cx, cy, r, c, width) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 <= r * r + r * 0.5 && (!width || d2 >= (r - width) * (r - width))) this.set(x, y, c);
      }
  }
  ellipse(x, y, w, h, c) {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
    for (let yy = Math.floor(y); yy < y + h; yy++)
      for (let xx = Math.floor(x); xx < x + w; xx++) {
        const dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) this.set(xx, yy, c);
      }
  }
  line(x0, y0, x1, y1, c, width) {
    width = width || 1;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      if (width === 1) this.set(x, y, c);
      else {
        const o = Math.floor((width - 1) / 2);
        this.rect(x - o, y - o, width, width, c);
      }
    }
  }
  lines(pts, c, width) { for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, width); }
  polygon(pts, c) {
    let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (const [x, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    for (let y = Math.floor(minY); y <= maxY; y++)
      for (let x = Math.floor(minX); x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) this.line(Math.round(pts[j][0]), Math.round(pts[j][1]), Math.round(pts[i][0]), Math.round(pts[i][1]), c);
  }
  arc(x, y, w, h, a0, a1, c, width) {
    const cx = x + w / 2, cy = y + h / 2;
    width = width || 1;
    for (let k = 0; k < width; k++) {
      const rx = w / 2 - k - 0.5, ry = h / 2 - k - 0.5;
      for (let t = 0; t <= 60; t++) {
        const a = a0 + (a1 - a0) * t / 60;
        this.set(Math.round(cx + Math.cos(a) * rx - 0.5), Math.round(cy - Math.sin(a) * ry - 0.5), c);
      }
    }
  }
}

function outline(s, color) {
  color = color || OUT;
  const src = new Uint8ClampedArray(s.d);
  const a = (x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h) ? 0 : src[(y * s.w + x) * 4 + 3];
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    if (a(x, y) === 0 && (a(x + 1, y) > 200 || a(x - 1, y) > 200 || a(x, y + 1) > 200 || a(x, y - 1) > 200)) s.set(x, y, color);
  }
  return s;
}
function upPS(s, k) {
  k = k || SCALE;
  const o = new PS(s.w * k, s.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    const i = ((y / k | 0) * s.w + (x / k | 0)) * 4, j = (y * o.w + x) * 4;
    o.d[j] = s.d[i]; o.d[j + 1] = s.d[i + 1]; o.d[j + 2] = s.d[i + 2]; o.d[j + 3] = s.d[i + 3];
  }
  return o;
}
function greyPS(s) {
  const o = new PS(s.w, s.h);
  for (let i = 0; i < s.d.length; i += 4) {
    const l = s.d[i] * 0.299 + s.d[i + 1] * 0.587 + s.d[i + 2] * 0.114;
    o.d[i] = l * 205 / 255; o.d[i + 1] = l * 205 / 255; o.d[i + 2] = l * 222 / 255; o.d[i + 3] = s.d[i + 3];
  }
  return o;
}
function flipPS(s) {
  const o = new PS(s.w, s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = (y * s.w + x) * 4, j = (y * s.w + (s.w - 1 - x)) * 4;
    for (let k = 0; k < 4; k++) o.d[j + k] = s.d[i + k];
  }
  return o;
}
function shadowPS(s) {
  const o = new PS(s.w, s.h);
  for (let i = 0; i < s.d.length; i += 4) {
    if (s.d[i + 3] === 0) continue;
    o.d[i] = Math.min(s.d[i], 26) + 40; o.d[i + 1] = Math.min(s.d[i + 1], 18) + 26; o.d[i + 2] = Math.min(s.d[i + 2], 44) + 70; o.d[i + 3] = s.d[i + 3];
  }
  return o;
}
function toCanvas(s) {
  const c = makeCanvas(s.w, s.h);
  const ctx = c.getContext("2d");
  const id = ctx.createImageData(s.w, s.h);
  id.data.set(s.d);
  ctx.putImageData(id, 0, 0);
  return c;
}
// canvas scaled with nearest neighbour
function scaledCanvas(src, w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

const SKIN = [[242, 200, 160], [226, 176, 134], [196, 140, 100]];

// --------------------------------------------------------------------------- people
function person(direction, frame, o) {
  const W = 18, H = 26, s = new PS(W, H), X = 1, HY = 6, BY = 14, LY = 20;
  const skin = o.skin || SKIN[0], hair = o.hair || [110, 70, 40], shirt = o.shirt || [70, 120, 190];
  const pants = o.pants || [80, 70, 60], boots = o.boots || [70, 45, 30], dress = !!o.dress;
  const side = direction === "right";
  const R = (x, y, w, h, c) => s.rect(x, y, w, h, c), P = (x, y, c) => s.set(x, y, c);
  // legs
  if (!dress) {
    if (!side) {
      const lu = frame === 1 ? 1 : 0, ru = frame === 2 ? 1 : 0;
      R(X + 5, LY, 3, 4 - lu, pants); R(X + 5, LY + 4 - lu, 3, 1, boots);
      R(X + 9, LY, 3, 4 - ru, pants); R(X + 9, LY + 4 - ru, 3, 1, boots);
    } else if (frame === 0) {
      R(X + 6, LY, 4, 4, pants); R(X + 6, LY + 4, 5, 1, boots);
    } else {
      const f = frame === 1 ? 1 : -1;
      R(X + 7 + f * 2, LY, 3, 4, pants); R(X + 7 + f * 2, LY + 4, 4, 1, boots);
      R(X + 7 - f * 2, LY, 3, 3, shade(pants, 0.8)); R(X + 7 - f * 2, LY + 3, 4, 1, shade(boots, 0.8));
    }
  } else {
    const dc = o.dress_color || shirt;
    if (!side) {
      s.polygon([[X + 4, BY], [X + 13, BY], [X + 14, LY + 3], [X + 3, LY + 3]], dc);
      const off = [0, 1, -1][frame];
      R(X + 5 + off, LY + 4, 3, 1, boots); R(X + 10 - off, LY + 4, 3, 1, boots);
    } else {
      s.polygon([[X + 5, BY], [X + 11, BY], [X + 13, LY + 3], [X + 4, LY + 3]], dc);
      const off = [0, 2, -2][frame];
      R(X + 7 + off, LY + 4, 4, 1, boots);
    }
  }
  // torso and arms
  if (!side) {
    R(X + 4, BY, 10, 6, shirt);
    R(X + 4, BY + 5, 10, 1, !dress ? shade(pants, 0.9) : shade(shirt, 0.8));
    const sw = [0, 1, -1][frame];
    R(X + 2, BY + Math.max(0, sw), 2, 4, shade(shirt, 0.85)); R(X + 2, BY + 4 + Math.max(0, sw), 2, 1, skin);
    R(X + 14, BY + Math.max(0, -sw), 2, 4, shade(shirt, 0.85)); R(X + 14, BY + 4 + Math.max(0, -sw), 2, 1, skin);
    if (o.apron) R(X + 6, BY + 1, 6, 7, [236, 232, 220]);
    if (o.scarf) R(X + 5, BY, 8, 2, o.scarf);
  } else {
    R(X + 5, BY, 7, 6, shirt);
    R(X + 5, BY + 5, 7, 1, !dress ? shade(pants, 0.9) : shade(shirt, 0.8));
    const sw = [0, 2, -2][frame];
    R(X + 7 + Math.floor(sw / 2), BY + 1, 3, 4, shade(shirt, 0.82)); R(X + 7 + sw, BY + 5, 3, 1, skin);
    if (o.apron) R(X + 10, BY + 1, 2, 7, [236, 232, 220]);
    if (o.scarf) R(X + 6, BY, 6, 2, o.scarf);
  }
  // head
  const style = o.hair_style || "short", eye = o.eye || [40, 30, 40];
  if (direction === "down") {
    R(X + 4, HY, 10, 8, skin);
    if (style !== "bald") {
      R(X + 4, HY, 10, 3, hair); R(X + 4, HY + 3, 1, 2, hair); R(X + 13, HY + 3, 1, 2, hair);
      if (style === "long") { R(X + 3, HY + 1, 2, 10, hair); R(X + 13, HY + 1, 2, 10, hair); }
      if (style === "bun") R(X + 7, HY - 2, 4, 2, hair);
    }
    P(X + 6, HY + 4, eye); P(X + 11, HY + 4, eye);
    P(X + 5, HY + 5, [232, 140, 130]); P(X + 12, HY + 5, [232, 140, 130]);
    R(X + 8, HY + 6, 2, 1, shade(skin, 0.75));
    if (o.beard) { R(X + 5, HY + 5, 8, 4, o.beard); R(X + 6, HY + 9, 6, 2, o.beard); R(X + 8, HY + 6, 2, 1, shade(o.beard, 0.7)); }
    if (o.glasses) {
      R(X + 5, HY + 3, 3, 3, [60, 60, 70]); R(X + 10, HY + 3, 3, 3, [60, 60, 70]);
      P(X + 6, HY + 4, [200, 230, 250]); P(X + 11, HY + 4, [200, 230, 250]);
    }
  } else if (direction === "up") {
    R(X + 4, HY, 10, 8, skin);
    if (style !== "bald") {
      R(X + 4, HY, 10, 7, hair);
      if (style === "long") R(X + 3, HY + 1, 12, 10, hair);
      if (style === "bun") R(X + 7, HY - 2, 4, 3, hair);
    }
    if (o.beard) { R(X + 4, HY + 6, 1, 2, o.beard); R(X + 13, HY + 6, 1, 2, o.beard); }
  } else {
    R(X + 5, HY, 9, 8, skin); P(X + 14, HY + 4, skin);
    if (style !== "bald") {
      R(X + 5, HY, 9, 3, hair); R(X + 5, HY + 3, 4, 3, hair);
      if (style === "long") R(X + 4, HY + 1, 4, 10, hair);
      if (style === "bun") R(X + 4, HY - 1, 3, 3, hair);
    }
    P(X + 11, HY + 4, eye);
    R(X + 11, HY + 6, 2, 1, shade(skin, 0.75)); P(X + 10, HY + 5, [232, 140, 130]);
    if (o.beard) { R(X + 9, HY + 5, 5, 4, o.beard); R(X + 9, HY + 9, 4, 2, o.beard); }
    if (o.glasses) { R(X + 10, HY + 3, 3, 3, [60, 60, 70]); P(X + 11, HY + 4, [200, 230, 250]); }
  }
  // hats
  const hat = o.hat;
  if (hat === "kerchief") {
    const c = o.hat_color || [200, 60, 60];
    if (direction === "right") { R(X + 4, HY - 1, 10, 4, c); R(X + 4, HY + 3, 4, 3, c); }
    else {
      R(X + 3, HY - 1, 12, 4, c);
      if (direction === "up") { R(X + 4, HY + 3, 10, 4, c); s.polygon([[X + 7, HY + 7], [X + 11, HY + 7], [X + 9, HY + 10]], c); }
    }
    for (const [dx, dy] of [[5, 0], [9, 1], [12, 0], [7, 2]]) P(X + dx, HY - 1 + dy, [250, 240, 230]);
  } else if (hat === "wizard") {
    const c = o.hat_color || [80, 70, 160];
    R(X + 2, HY + 1, 14, 2, c);
    s.polygon([[X + 4, HY + 1], [X + 13, HY + 1], [X + 11, HY - 4], [X + 9, HY - 6], [X + 7, HY - 3]], c);
    P(X + 9, HY - 1, [250, 220, 90]); P(X + 8, HY - 2, [250, 220, 90]);
  } else if (hat === "straw") {
    const c = [226, 192, 100];
    R(X + 1, HY + 1, 16, 2, c); R(X + 4, HY - 2, 10, 3, c); R(X + 4, HY, 10, 1, [190, 70, 60]);
  } else if (hat === "beret") {
    const c = o.hat_color || [180, 60, 120];
    R(X + 3, HY - 1, 11, 3, c); R(direction !== "right" ? X + 11 : X + 5, HY - 2, 3, 2, c);
  } else if (hat === "hood") {
    const c = o.hat_color || [60, 50, 80];
    if (direction === "down") { R(X + 3, HY - 2, 12, 4, c); R(X + 3, HY + 2, 2, 9, c); R(X + 13, HY + 2, 2, 9, c); }
    else if (direction === "up") R(X + 3, HY - 2, 12, 12, c);
    else { R(X + 4, HY - 2, 10, 4, c); R(X + 4, HY + 2, 5, 9, c); }
  }
  return s;
}

const PEOPLE = {
  hero: { hair: [150, 96, 52], shirt: [70, 130, 200], pants: [90, 80, 70], scarf: [230, 180, 60] },
  oma: { hair: [220, 220, 225], skin: SKIN[0], dress: true, dress_color: [120, 90, 150], shirt: [120, 90, 150], apron: true, hat: "kerchief", hat_color: [200, 70, 70], hair_style: "bun", glasses: true },
  klaus: { hair: [90, 60, 40], skin: SKIN[1], shirt: [170, 70, 60], pants: [70, 90, 140], hat: "straw", beard: [110, 75, 50] },
  lotte: { hair: [220, 120, 50], skin: SKIN[0], shirt: [240, 210, 90], dress: true, dress_color: [90, 160, 150], hat: "beret", hat_color: [200, 70, 130], hair_style: "long" },
  opa: { hair: [230, 230, 235], skin: SKIN[1], shirt: [70, 80, 160], pants: [70, 80, 160], dress: true, dress_color: [70, 80, 160], hat: "wizard", hat_color: [70, 80, 160], beard: [235, 235, 240] },
  paul: { hair: [240, 210, 120], skin: SKIN[0], shirt: [110, 180, 90], pants: [70, 90, 140] },
  anna: { hair: [70, 45, 35], skin: SKIN[2], shirt: [230, 140, 160], dress: true, dress_color: [230, 140, 160], hair_style: "long" },
  baecker: { hair: [60, 50, 50], skin: SKIN[1], shirt: [240, 240, 235], pants: [110, 100, 90], apron: true, hat: "beret", hat_color: [245, 245, 245] },
  magier: { hair: [40, 40, 50], skin: [190, 180, 200], shirt: [50, 44, 70], pants: [50, 44, 70], dress: true, dress_color: [50, 44, 70], hat: "hood", hat_color: [70, 60, 100], eye: [160, 200, 255] },
  magier_frei: { hair: [150, 140, 150], skin: [226, 196, 170], shirt: [70, 60, 110], pants: [50, 44, 70], dress: true, dress_color: [70, 60, 110], beard: [160, 150, 160], scarf: [230, 180, 60] },
};

// --------------------------------------------------------------------------- animals (facing right)
function animal(kind, frame) {
  frame = frame || 0;
  let s;
  const lfA = [0, 1, -1][frame % 3];
  if (kind === "dog") {
    s = new PS(20, 16);
    const c = [196, 140, 80], d = [150, 100, 55];
    s.ellipse(3, 6, 12, 6, c); s.rect(12, 2, 6, 6, c); s.rect(17, 5, 2, 2, c); s.set(18, 5, OUT);
    s.rect(12, 1, 2, 4, d); s.set(15, 4, OUT);
    for (const x of [4, 7]) s.rect(x + lfA, 11, 2, 4, d);
    for (const x of [11, 13]) s.rect(x - lfA, 11, 2, 4, c);
    s.rect(1, 5 - (frame % 2), 3, 2, c);
    if (frame) s.set(17, 8, [230, 90, 100]);
  } else if (kind === "cat") {
    s = new PS(16, 13);
    const c = [90, 90, 100];
    s.ellipse(2, 5, 10, 5, c); s.rect(9, 2, 5, 5, c); s.set(9, 1, c); s.set(13, 1, c);
    s.set(12, 4, [200, 230, 90]); s.rect(0, 2 + frame % 2, 2, 5, c);
    for (const x of [3, 5, 8, 10]) s.rect(x, 9, 1, 3, c);
  } else if (kind === "sheep") {
    s = new PS(20, 16);
    const w = [245, 245, 240];
    for (const [x, y, r] of [[5, 7, 4], [9, 6, 4], [12, 8, 4], [7, 9, 4], [10, 9, 4]]) s.circle(x, y, r, w);
    s.rect(14, 4, 5, 5, [60, 55, 60]); s.set(17, 5, [240, 240, 240]); s.rect(13, 3, 2, 2, [60, 55, 60]);
    for (const x of [5, 8, 11, 13]) s.rect(x + (x < 10 ? lfA : -lfA), 12, 1, 3, [60, 55, 60]);
  } else if (kind === "fox") {
    s = new PS(24, 15);
    const c = [230, 120, 50], w = [250, 240, 230];
    s.ellipse(6, 6, 12, 6, c);
    s.polygon([[16, 7], [22, 8], [17, 3], [16, 2], [15, 4]], c);
    s.set(18, 6, OUT); s.set(22, 8, OUT); s.rect(15, 1, 2, 3, c); s.rect(18, 9, 3, 1, w);
    const tw = frame % 2;
    s.ellipse(0, 4 - tw, 9, 5, c); s.rect(0, 5 - tw, 3, 3, w);
    for (const x of [8, 10]) s.rect(x + lfA, 11, 1, 3, [60, 40, 40]);
    for (const x of [14, 16]) s.rect(x - lfA, 11, 1, 3, [60, 40, 40]);
  } else if (kind === "hare") {
    s = new PS(16, 16);
    const c = [170, 140, 110];
    s.ellipse(2, 8, 10, 6, c); s.ellipse(9, 5, 6, 5, c);
    s.rect(10, frame % 2, 2, 6, c); s.rect(12, 1, 2, 5, shade(c, 0.9));
    s.set(13, 7, OUT); s.rect(1, 9, 2, 2, [245, 245, 245]); s.rect(3, 13, 4, 2, c); s.rect(9, 13, 2, 2, c);
  } else if (kind === "owl") {
    s = new PS(16, 18);
    const c = [150, 110, 80], b = [220, 200, 160];
    s.ellipse(2, 3, 12, 14, c); s.ellipse(5, 9, 6, 7, b); s.set(3, 2, c); s.set(12, 2, c);
    const blink = frame % 4 === 3;
    for (const ex of [4, 9]) {
      s.rect(ex, 5, 3, 3, [250, 240, 200]);
      if (!blink) s.set(ex + 1, 6, OUT); else s.rect(ex, 6, 3, 1, OUT);
    }
    s.set(7, 8, [230, 170, 60]); s.set(8, 8, [230, 170, 60]);
    s.rect(5, 16, 2, 1, [230, 170, 60]); s.rect(9, 16, 2, 1, [230, 170, 60]);
  } else if (kind === "bird") {
    s = new PS(12, 10);
    const c = [70, 130, 220];
    s.ellipse(1, 3, 8, 5, c); s.rect(6, 1, 4, 4, c); s.set(8, 2, OUT); s.set(10, 3, [240, 180, 60]); s.rect(7, 5, 2, 2, [240, 160, 120]);
    if (frame % 2) s.polygon([[3, 4], [7, 4], [5, 0]], shade(c, 0.8)); else s.rect(3, 4, 4, 2, shade(c, 0.8));
    s.set(4, 8, OUT); s.set(6, 8, OUT);
  } else if (kind === "bear") {
    s = new PS(30, 24);
    const c = [120, 80, 50];
    s.ellipse(2, 6, 22, 13, c); s.ellipse(17, 3, 11, 10, c); s.circle(19, 3, 2, c); s.circle(25, 3, 2, c);
    s.rect(25, 8, 4, 3, [200, 160, 120]); s.set(28, 8, OUT); s.set(23, 6, OUT);
    for (const x of [4, 8]) s.rect(x + lfA, 17, 4, 6, shade(c, 0.85));
    for (const x of [15, 19]) s.rect(x - lfA, 17, 4, 6, c);
  }
  return s;
}

// --------------------------------------------------------------------------- objects
function treePS(kind, seed, apples) {
  const r = Rng(seed + 11);
  if (kind === "pine") {
    const s = new PS(28, 44);
    s.rect(12, 34, 4, 9, [100, 70, 45]);
    const g1 = [46, 110, 70], g2 = [36, 90, 60];
    [[2, 6], [8, 12], [15, 18], [22, 24], [28, 26]].forEach(([y, w], i) =>
      s.polygon([[14, y - 2], [14 - w / 2, y + 8], [14 + w / 2, y + 8]], i % 2 ? g2 : g1));
    return outline(s);
  }
  const s = new PS(32, 40);
  s.rect(13, 24, 6, 15, [110, 76, 48]); s.rect(13, 24, 2, 15, [130, 92, 60]);
  const g = [78, 150, 70];
  for (const [x, y, rr] of [[16, 13, 11], [9, 17, 7], [23, 17, 7], [16, 7, 7], [10, 10, 6], [22, 10, 6]]) s.circle(x, y, rr, g);
  for (let i = 0; i < 14; i++) s.set(r.randint(6, 26), r.randint(4, 22), [110, 180, 90]);
  for (let i = 0; i < 10; i++) s.set(r.randint(6, 26), r.randint(8, 24), [60, 120, 58]);
  if (apples) for (const [x, y] of [[10, 14], [20, 9], [23, 18], [15, 20], [14, 11]]) s.rect(x, y, 2, 2, [220, 50, 50]);
  return outline(s);
}

function housePS(wt, roof, wall) {
  roof = roof || [180, 70, 60]; wall = wall || [232, 214, 180];
  const W = wt * 16, H = 56, s = new PS(W, H), top = 24, beam = [120, 80, 52];
  s.rect(2, top, W - 4, H - top - 1, wall);
  s.rect(2, top, W - 4, 2, beam);
  for (let x = 2; x < W - 2; x += 12) s.rect(x, top, 2, H - top - 1, beam);
  s.rect(2, H - 3, W - 4, 2, beam);
  s.polygon([[0, top + 1], [W, top + 1], [W - 8, 4], [8, 4]], roof);
  for (let y = 8; y < top; y += 4) s.line(0, y + 1, W, y + 1, shade(roof, 0.82));
  s.rect(8, 3, W - 16, 2, shade(roof, 0.7));
  s.rect(W - 18, 0, 5, 9, [150, 120, 110]);
  const dx = Math.floor(W / 2) - 5;
  for (let wx = 8; wx < W - 10; wx += 22) {
    if (Math.abs(wx - dx) < 14) continue;
    s.rect(wx, top + 9, 9, 9, [90, 70, 50]); s.rect(wx + 1, top + 10, 7, 7, [250, 220, 130]);
    s.rect(wx + 4, top + 10, 1, 7, [90, 70, 50]); s.rect(wx + 1, top + 13, 7, 1, [90, 70, 50]);
  }
  s.rect(dx, H - 20, 11, 19, [110, 70, 45]); s.rect(dx + 1, H - 19, 9, 18, [140, 92, 58]); s.set(dx + 8, H - 10, [240, 210, 90]);
  return outline(s);
}

function wellPS() {
  const s = new PS(30, 38), stone = [160, 160, 168], dark = [120, 120, 130];
  s.rect(3, 24, 24, 13, stone);
  for (const y of [27, 31, 35]) for (let x = 3 + (y % 2) * 3; x < 27; x += 6) s.rect(x, y, 1, 2, dark);
  s.rect(5, 22, 20, 4, [60, 90, 140]);
  s.rect(5, 6, 2, 18, [120, 80, 52]); s.rect(23, 6, 2, 18, [120, 80, 52]);
  s.polygon([[1, 9], [29, 9], [22, 1], [8, 1]], [170, 70, 60]);
  s.rect(7, 12, 16, 1, [100, 80, 60]); s.rect(14, 12, 1, 7, [100, 80, 60]); s.rect(12, 18, 5, 4, [130, 100, 70]);
  return outline(s);
}

function smallPS(kind, frame) {
  frame = frame || 0;
  let s = new PS(18, 18);
  const P = (x, y, c) => s.set(x, y, c), R = (x, y, w, h, c) => s.rect(x, y, w, h, c);
  if (kind === "flower") {
    const cols = [[240, 210, 60], [240, 110, 140], [250, 250, 250]];
    [[4, 6], [11, 4], [8, 10], [14, 11]].forEach(([x, y], i) => {
      R(x, y + 2, 1, 4, [60, 130, 60]);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P(x + dx, y + dy, cols[i % 3]);
      P(x, y, [240, 160, 40]);
    });
    return s;
  }
  if (kind === "bigflower") {
    R(8, 8, 2, 9, [60, 140, 60]); R(10, 12, 3, 2, [70, 160, 70]);
    for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3; s.circle(9 + Math.trunc(Math.cos(ang) * 4), 6 + Math.trunc(Math.sin(ang) * 4), 2, [250, 220, 60]); }
    s.circle(9, 6, 2, [200, 120, 40]);
  } else if (kind === "bush") {
    for (const [x, y, r] of [[6, 10, 5], [12, 10, 5], [9, 7, 5]]) s.circle(x, y, r, [70, 140, 66]);
    P(7, 6, [110, 180, 90]); P(12, 8, [110, 180, 90]);
  } else if (kind === "rock") {
    s.ellipse(2, 7, 14, 9, [150, 150, 158]); s.ellipse(4, 8, 7, 4, [180, 180, 186]);
  } else if (kind === "boulder") {
    s = new PS(28, 28);
    s.ellipse(1, 3, 26, 23, [130, 128, 136]); s.ellipse(5, 6, 12, 9, [165, 162, 170]); s.line(14, 14, 20, 22, [100, 98, 106]);
  } else if (kind === "fence_h") {
    R(0, 7, 18, 2, [150, 110, 70]); R(0, 12, 18, 2, [150, 110, 70]); R(2, 4, 3, 13, [170, 126, 80]); R(12, 4, 3, 13, [170, 126, 80]);
  } else if (kind === "fence_v") {
    R(7, 0, 3, 18, [170, 126, 80]);
  } else if (kind === "sign") {
    R(8, 9, 2, 8, [120, 80, 52]); R(2, 3, 14, 8, [180, 130, 80]);
    for (const y of [5, 8]) R(4, y, 10, 1, [120, 80, 52]);
  } else if (kind === "mushroom_red") {
    R(7, 9, 4, 7, [240, 230, 210]); s.ellipse(2, 3, 14, 9, [220, 50, 50]);
    for (const [x, y] of [[6, 5], [11, 6], [8, 8]]) R(x, y, 2, 2, [250, 250, 250]);
  } else if (kind === "mushroom_blue") {
    R(8, 11, 3, 5, [230, 230, 240]); s.ellipse(4, 7, 11, 7, [80, 120, 230]); P(7, 9, [220, 240, 255]); P(11, 10, [220, 240, 255]);
  } else if (kind === "fire") {
    R(3, 13, 12, 3, [110, 70, 45]); R(5, 12, 8, 2, [90, 60, 40]);
    const f = frame % 3;
    for (const [x, y] of [[9, 2 + f], [6, 5 + (f + 1) % 3], [12, 5 + (f + 2) % 3]]) {
      s.polygon([[x, y], [x - 3, 13], [x + 3, 13]], [240, 120, 40]);
      s.polygon([[x, y + 4], [x - 1, 13], [x + 1, 13]], [250, 220, 90]);
    }
    return s;
  } else if (kind === "icewater") {
    s.ellipse(1, 5, 16, 11, [180, 220, 245]); s.ellipse(3, 7, 12, 7, [120, 180, 230]); P(6, 9, [250, 250, 255]); P(11, 10, [250, 250, 255]);
  } else if (kind === "lantern") {
    R(8, 1, 2, 3, [60, 60, 60]); R(5, 4, 8, 10, [60, 50, 40]); R(6, 5, 6, 8, frame ? [250, 220, 120] : [90, 90, 80]); R(4, 14, 10, 2, [60, 50, 40]);
  } else if (kind === "bucket") {
    s.polygon([[3, 6], [15, 6], [13, 16], [5, 16]], [150, 110, 70]); R(3, 6, 13, 2, [90, 140, 210]); s.arc(3, 0, 12, 12, 0, Math.PI, [80, 80, 80]);
  } else if (kind === "bread") {
    s.ellipse(1, 6, 16, 9, [210, 150, 80]);
    for (const x of [5, 9, 13]) s.line(x - 1, 8, x + 1, 11, [240, 200, 130]);
  } else if (kind === "apple") {
    s.circle(9, 10, 6, [220, 50, 50]); P(7, 7, [250, 150, 150]); R(9, 2, 1, 3, [100, 70, 40]); R(10, 3, 3, 2, [80, 160, 70]);
  } else if (kind === "table") {
    R(1, 6, 16, 4, [160, 110, 70]); R(2, 10, 2, 7, [130, 90, 55]); R(14, 10, 2, 7, [130, 90, 55]);
  } else if (kind === "stone_word") {
    s.ellipse(1, 5, 16, 10, [170, 165, 155]); s.ellipse(3, 6, 10, 5, [195, 190, 180]);
  } else if (kind === "hay") {
    s.ellipse(1, 4, 16, 12, [226, 196, 100]);
    for (let x = 3; x < 15; x += 3) s.line(x, 6, x + 1, 14, [196, 160, 70]);
  } else if (kind === "crystal") {
    const c = [[160, 200, 255], [200, 170, 255]][frame % 2];
    s.polygon([[9, 1], [14, 8], [9, 16], [4, 8]], c); s.line(9, 3, 7, 8, [250, 250, 255]);
  }
  return outline(s);
}

function furniturePS(kind) {
  let s;
  if (kind === "stove") {
    s = new PS(24, 30);
    s.rect(2, 8, 20, 21, [190, 180, 170]); s.rect(2, 8, 20, 3, [150, 140, 130]);
    s.rect(6, 16, 12, 9, [60, 40, 40]); s.rect(8, 18, 8, 6, [240, 140, 50]); s.rect(9, 20, 6, 3, [250, 220, 90]);
    s.rect(15, 0, 5, 9, [150, 140, 130]);
  } else if (kind === "bed") {
    s = new PS(22, 30);
    s.rect(1, 2, 20, 27, [140, 96, 60]); s.rect(3, 4, 16, 8, [245, 245, 240]); s.rect(3, 12, 16, 15, [200, 80, 90]);
    for (let y = 14; y < 26; y += 4) s.rect(3, y, 16, 1, [230, 120, 130]);
  } else if (kind === "window") {
    s = new PS(20, 18);
    s.rect(1, 1, 18, 16, [120, 80, 52]); s.rect(3, 3, 14, 10, [170, 210, 240]); s.rect(9, 3, 2, 10, [120, 80, 52]); s.rect(3, 7, 14, 1, [120, 80, 52]);
    s.rect(0, 13, 20, 4, [150, 110, 74]);
  } else if (kind === "shelf") {
    s = new PS(24, 22);
    s.rect(1, 1, 22, 20, [130, 90, 55]); s.rect(3, 3, 18, 7, [90, 60, 40]); s.rect(3, 12, 18, 7, [90, 60, 40]);
    for (const [x, c] of [[4, [200, 80, 60]], [9, [80, 120, 200]], [14, [230, 200, 80]]]) s.rect(x, 5, 4, 5, c);
    s.rect(5, 14, 12, 5, [220, 210, 190]);
  } else if (kind === "rug") {
    s = new PS(32, 18);
    s.ellipse(0, 0, 32, 18, [170, 60, 70]); s.ellipse(4, 3, 24, 12, [210, 170, 90]); s.ellipse(9, 6, 14, 6, [170, 60, 70]);
    return s;
  } else if (kind === "easel") {
    s = new PS(24, 34);
    s.line(4, 33, 11, 2, [120, 80, 52], 2); s.line(20, 33, 13, 2, [120, 80, 52], 2); s.line(12, 10, 12, 33, [120, 80, 52], 2);
    s.rect(3, 6, 18, 16, [250, 248, 240]); s.rect(3, 22, 18, 2, [120, 80, 52]);
    s.rect(6, 9, 5, 4, [220, 80, 80]); s.rect(12, 12, 6, 6, [90, 140, 220]); s.rect(7, 15, 4, 4, [240, 210, 80]);
  } else if (kind === "washline") {
    s = new PS(48, 30);
    s.rect(1, 2, 2, 27, [120, 80, 52]); s.rect(45, 2, 2, 27, [120, 80, 52]); s.line(2, 5, 46, 7, [230, 230, 230]);
    [[6, [220, 90, 90]], [18, [90, 150, 220]], [30, [240, 210, 90]]].forEach(([x, c], i) => s.rect(x, 6 + (i % 2), 10, 12 + i * 2, c));
  } else if (kind === "raft") {
    s = new PS(40, 24);
    for (let x = 2; x < 38; x += 6) { s.rect(x, 2, 5, 20, [150, 105, 65]); s.rect(x, 2, 1, 20, [175, 130, 85]); }
    s.rect(2, 6, 36, 2, [100, 70, 45]); s.rect(2, 16, 36, 2, [100, 70, 45]);
  } else if (kind === "scarecrow") {
    s = new PS(24, 34);
    s.rect(11, 8, 2, 25, [120, 80, 52]); s.rect(2, 12, 20, 2, [120, 80, 52]);
    s.circle(12, 6, 5, [230, 200, 120]); s.rect(5, 0, 14, 3, [150, 110, 60]);
    s.rect(7, 13, 10, 10, [90, 130, 80]); s.set(10, 6, OUT); s.set(14, 6, OUT);
  } else if (kind === "barrel") {
    s = new PS(16, 18);
    s.ellipse(1, 1, 14, 17, [150, 105, 65]); s.rect(1, 5, 14, 1, [90, 90, 100]); s.rect(1, 12, 14, 1, [90, 90, 100]);
  } else if (kind === "lilies") {
    s = new PS(18, 12);
    s.ellipse(1, 3, 10, 6, [70, 140, 80]); s.ellipse(8, 5, 9, 6, [80, 160, 90]); s.circle(5, 5, 1, [250, 220, 240]);
    return s;
  } else if (kind === "glowshroom") {
    s = new PS(14, 16);
    s.rect(6, 8, 2, 7, [230, 230, 240]); s.ellipse(1, 3, 12, 7, [150, 110, 230]); s.set(4, 5, [240, 220, 255]); s.set(9, 4, [240, 220, 255]);
  } else if (kind === "doormat") {
    s = new PS(24, 10);
    s.rect(0, 0, 24, 10, [150, 110, 70]); for (let x = 2; x < 22; x += 3) s.rect(x, 2, 1, 6, [120, 85, 55]);
    return s;
  }
  return outline(s);
}

function paintPot(color) {
  const s = new PS(18, 18);
  s.polygon([[3, 6], [15, 6], [14, 16], [4, 16]], [120, 100, 90]); s.ellipse(3, 4, 13, 5, color); s.rect(5, 6, 2, 6, color);
  return outline(s);
}
function towerPS() {
  const s = new PS(64, 120), stone = [110, 100, 130], dark = [80, 72, 100];
  s.rect(12, 34, 40, 85, stone);
  for (let y = 36; y < 118; y += 7) {
    for (let x = 12 + (Math.floor(y / 7) % 2) * 5; x < 52; x += 10) s.rect(x, y, 1, 4, dark);
    s.rect(12, y + 5, 40, 1, dark);
  }
  s.polygon([[6, 36], [58, 36], [32, 2]], [60, 50, 90]); s.polygon([[32, 2], [32, 36], [58, 36]], [80, 68, 120]);
  s.rect(27, 92, 10, 26, [40, 32, 50]); s.circle(32, 92, 5, [40, 32, 50]);
  for (const [x, y] of [[22, 52], [38, 68]]) { s.rect(x, y, 5, 8, [30, 26, 40]); s.rect(x + 1, y + 1, 3, 6, [140, 170, 230]); }
  return outline(s);
}
function cavePS() {
  const s = new PS(48, 40);
  s.ellipse(0, 4, 48, 40, [120, 116, 112]); s.ellipse(4, 6, 22, 16, [150, 146, 140]); s.ellipse(12, 16, 24, 28, [20, 16, 24]);
  return outline(s);
}
function gatePS(open) {
  const s = new PS(48, 32), post = [120, 80, 52];
  s.rect(0, 2, 5, 30, post); s.rect(43, 2, 5, 30, post); s.rect(0, 0, 48, 4, post);
  if (!open) {
    for (let x = 6; x < 43; x += 6) s.rect(x, 6, 3, 25, [160, 116, 72]);
    s.rect(5, 12, 38, 3, [130, 90, 55]); s.rect(5, 24, 38, 3, [130, 90, 55]); s.rect(22, 15, 4, 5, [200, 180, 80]);
  }
  return outline(s);
}
function hedgePS(hole) {
  const s = new PS(16, 22);
  for (const [x, y, r] of [[4, 8, 5], [11, 8, 5], [8, 4, 5], [4, 15, 5], [11, 15, 5]]) s.circle(x, y, r, [50, 120, 58]);
  for (const [x, y] of [[4, 5], [10, 3], [12, 12], [5, 14]]) s.set(x, y, [90, 160, 80]);
  if (hole) { s.ellipse(4, 13, 8, 8, [20, 40, 22]); s.rect(4, 17, 8, 4, [20, 40, 22]); }
  return outline(s);
}
function plankPS() {
  const s = new PS(16, 16);
  s.rect(0, 1, 16, 14, [160, 116, 72]);
  for (const y of [4, 8, 12]) s.rect(0, y, 16, 1, [120, 84, 52]);
  s.rect(0, 0, 16, 1, [110, 76, 48]); s.rect(0, 15, 16, 1, [110, 76, 48]);
  return s;
}

// --------------------------------------------------------------------------- tiles
const TILE_COLORS = {
  grass: [104, 168, 76], grass2: [96, 158, 70], path: [204, 172, 120], plaza: [186, 176, 160], water: [64, 128, 200],
  stream: [84, 150, 210], forest: [62, 118, 64], dark: [40, 44, 52], floor: [150, 110, 74], sand: [226, 206, 150],
  towerfloor: [70, 64, 90], meadow: [128, 178, 84], rockwall: [128, 122, 118],
  wall: [196, 170, 134], soil: [128, 92, 62], glade: [92, 150, 112], void: [20, 16, 28],
};
function tilePS(kind, variant, frame) {
  const r = Rng(strHash(kind + variant));
  const s = new PS(16, 16), base = TILE_COLORS[kind];
  s.rect(0, 0, 16, 16, base);
  const P = (x, y, c) => s.set(x, y, c);
  const rectOutline = (x, y, w, h, c) => { s.rect(x, y, w, 1, c); s.rect(x, y + h - 1, w, 1, c); s.rect(x, y, 1, h, c); s.rect(x + w - 1, y, 1, h, c); };
  if (["grass", "grass2", "forest", "meadow"].includes(kind)) {
    for (let i = 0; i < 10; i++) { const x = r.randint(0, 15), y = r.randint(0, 14); P(x, y, shade(base, 1.15)); P(x, y + 1, shade(base, 0.85)); }
    if (kind === "meadow" && variant % 3 === 0) P(r.randint(2, 13), r.randint(2, 13), [250, 240, 120]);
    if (kind === "forest") for (let i = 0; i < 3; i++) P(r.randint(0, 15), r.randint(0, 15), [90, 80, 50]);
  } else if (kind === "path") {
    for (let i = 0; i < 14; i++) P(r.randint(0, 15), r.randint(0, 15), shade(base, r.choice([0.88, 1.08])));
    if (variant % 4 === 0) s.rect(r.randint(2, 11), r.randint(2, 11), 2, 2, [170, 150, 120]);
  } else if (kind === "plaza") {
    for (let y = 0; y < 16; y += 8) {
      const off = (y / 8) % 2 ? 4 : 0;
      for (let x = -8 + off; x < 16; x += 8) rectOutline(x, y, 8, 8, shade(base, 0.8));
    }
    P(r.randint(1, 14), r.randint(1, 14), shade(base, 1.1));
  } else if (kind === "water" || kind === "stream") {
    for (let i = 0; i < 3; i++) { const y = (i * 5 + frame * 2 + variant) % 16, x = (i * 7 + variant * 3) % 12; s.rect(x, y, 4, 1, shade(base, 1.25)); }
  } else if (kind === "floor") {
    for (let y = 0; y < 16; y += 4) s.rect(0, y, 16, 1, shade(base, 0.8));
    s.rect((variant * 5) % 16, 0, 1, 16, shade(base, 0.85));
  } else if (kind === "towerfloor") {
    rectOutline(0, 0, 16, 16, shade(base, 0.8)); P(r.randint(2, 13), r.randint(2, 13), shade(base, 1.3));
  } else if (kind === "sand") {
    for (let i = 0; i < 8; i++) P(r.randint(0, 15), r.randint(0, 15), shade(base, 0.92));
  } else if (kind === "rockwall") {
    for (let y = 0; y < 16; y += 5) {
      const off = (Math.floor(y / 5) % 2) * 4;
      for (let x = -4 + off; x < 16; x += 8) { s.rect(x + 1, y + 1, 6, 3, shade(base, 1.12)); rectOutline(x, y, 8, 5, shade(base, 0.7)); }
    }
  } else if (kind === "wall") {
    s.rect(0, 0, 16, 3, [120, 80, 52]); s.rect(0, 13, 16, 3, [150, 110, 74]);
    s.rect(variant % 2 ? 2 : 10, 3, 2, 10, [150, 110, 74]);
    for (let i = 0; i < 5; i++) P(r.randint(0, 15), r.randint(4, 12), shade(base, 0.93));
  } else if (kind === "soil") {
    for (let y = 1; y < 16; y += 4) { s.rect(0, y, 16, 2, shade(base, 0.78)); s.rect(0, y + 2, 16, 1, shade(base, 1.15)); }
    if (variant % 3 === 0) { P(r.randint(1, 14), r.randint(1, 14), [110, 170, 80]); }
  } else if (kind === "glade") {
    for (let i = 0; i < 10; i++) { const x = r.randint(0, 15), y = r.randint(0, 14); P(x, y, shade(base, 1.15)); P(x, y + 1, shade(base, 0.85)); }
    if (variant % 2 === 0) P(r.randint(2, 13), r.randint(2, 13), [200, 230, 255]);
  } else if (kind === "dark") {
    for (let i = 0; i < 6; i++) P(r.randint(0, 15), r.randint(0, 15), shade(base, 1.2));
  }
  return upPS(s);
}

// --------------------------------------------------------------------------- word book pictograms
function iconPS(name) {
  const s = new PS(16, 16);
  const Y = [250, 210, 70], R_ = [225, 70, 80], B = [70, 130, 230], G = [80, 180, 100], Wt = [245, 245, 245], D = [40, 34, 50], sk = SKIN[0];
  const R = (x, y, w, h, c) => s.rect(x, y, w, h, c), P = (x, y, c) => s.set(x, y, c), L = (a, b, c, d, col, w) => s.line(a, b, c, d, col, w);
  if (name === "wave") {
    R(6, 6, 5, 7, sk); [5, 7, 9, 11].forEach((x, i) => R(x, 2 + (i % 2), 1, 5, sk)); R(3, 7, 2, 3, sk);
    for (const y of [3, 7, 11]) { P(14, y, Y); P(1, y + 1, Y); }
  } else if (name === "yes") s.lines([[2, 8], [6, 13], [14, 3]], G, 3);
  else if (name === "no") { L(3, 3, 13, 13, R_, 3); L(13, 3, 3, 13, R_, 3); }
  else if (name === "heart") { s.circle(5, 6, 3, R_); s.circle(11, 6, 3, R_); s.polygon([[2, 7], [14, 7], [8, 14]], R_); }
  else if (name === "gift") { R(2, 6, 12, 9, R_); R(7, 6, 2, 9, Y); R(1, 5, 14, 2, R_); s.circle(6, 4, 2, Y, 1); s.circle(10, 4, 2, Y, 1); }
  else if (name === "bye") { R(6, 6, 5, 7, sk); for (const x of [5, 7, 9, 11]) R(x, 2, 1, 5, sk); L(1, 14, 15, 14, B, 2); s.polygon([[15, 14], [11, 11], [11, 15]], B); }
  else if (name === "me" || name === "you") {
    s.circle(8, 5, 3, sk); R(4, 9, 8, 6, name === "me" ? B : G);
    if (name === "me") R(7, 10, 3, 2, sk); else L(0, 2, 4, 4, Y, 2);
  } else if (name === "question") { s.arc(4, 1, 8, 8, -Math.PI / 2, Math.PI, Y, 2); R(7, 8, 2, 3, Y); R(7, 13, 2, 2, Y); }
  else if (/^n\d$/.test(name)) { const n = +name[1]; for (let i = 0; i < n; i++) R(2 + i * 3, 4 + (i % 2) * 2, 2, 8, sk); }
  else if (name.startsWith("c_")) {
    const col = { c_rot: [220, 50, 50], c_blau: [60, 110, 230], c_gruen: [70, 180, 80], c_gelb: [250, 220, 60], c_weiss: [250, 250, 250] }[name];
    s.circle(8, 8, 6, col); s.circle(8, 8, 6, shade(col, 0.8), 1);
  } else if (name === "equals") { R(3, 5, 10, 2, Y); R(3, 10, 10, 2, Y); }
  else if (name === "walk" || name === "run") {
    s.circle(9, 3, 2, sk); L(9, 5, 8, 10, B, 2); L(8, 10, 5, 15, D, 2); L(8, 10, 11, 15, D, 2); L(9, 6, 5, 9, sk); L(9, 6, 12, 9, sk);
    if (name === "run") for (const y of [5, 8, 11]) R(1, y, 3, 1, Wt);
  } else if (name === "left") s.polygon([[2, 8], [8, 2], [8, 6], [14, 6], [14, 10], [8, 10], [8, 14]], Y);
  else if (name === "right") s.polygon([[14, 8], [8, 2], [8, 6], [2, 6], [2, 10], [8, 10], [8, 14]], Y);
  else if (name === "jump") { s.circle(8, 3, 2, sk); L(8, 5, 8, 9, B, 2); L(8, 9, 5, 11, D, 2); L(8, 9, 11, 11, D, 2); s.arc(1, 8, 14, 10, 0, Math.PI, Y); }
  else if (name === "stop") { s.polygon([[5, 1], [11, 1], [15, 5], [15, 11], [11, 15], [5, 15], [1, 11], [1, 5]], R_); R(4, 7, 8, 2, Wt); }
  else if (name === "open") { R(3, 2, 10, 13, [110, 70, 45]); s.polygon([[3, 2], [9, 4], [9, 15], [3, 15]], [160, 110, 70]); R(10, 3, 2, 11, Y); }
  else if (name === "snow") { for (let a = 0; a < 3; a++) { const ang = a * Math.PI / 3, dx = Math.trunc(Math.cos(ang) * 6), dy = Math.trunc(Math.sin(ang) * 6); L(8 - dx, 8 - dy, 8 + dx, 8 + dy, [180, 220, 255], 2); } }
  else if (name === "small") { s.circle(8, 10, 2, sk); R(7, 12, 3, 3, B); L(2, 2, 5, 5, Y); L(14, 2, 11, 5, Y); }
  else if (name === "big") { s.circle(8, 3, 3, sk); R(4, 6, 9, 9, B); L(0, 8, 3, 8, Y); L(13, 8, 15, 8, Y); }
  else if (name === "dark") { s.circle(8, 8, 6, [230, 230, 200]); s.circle(11, 6, 6, [0, 0, 0, 0]); }
  else if (name === "light") { s.circle(8, 8, 4, Y); for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; P(8 + Math.trunc(Math.cos(ang) * 7), 8 + Math.trunc(Math.sin(ang) * 7), Y); } }
  else if (name === "alone") { s.circle(8, 6, 3, [150, 150, 170]); R(5, 10, 7, 5, [100, 100, 120]); for (let x = 0; x < 16; x += 3) P(x, 15, [80, 80, 100]); }
  else if (name === "friends" || name === "come") {
    s.circle(5, 5, 2, sk); R(3, 8, 4, 6, B); s.circle(11, 5, 2, SKIN[2]); R(9, 8, 4, 6, G);
    if (name === "friends") R(6, 9, 4, 1, sk); else { L(14, 1, 14, 4, Y); L(12, 2, 15, 2, Y); }
  } else s.circle(8, 8, 5, Y, 2);
  return s;
}

// --------------------------------------------------------------------------- the bank of all images
class Art {
  constructor() {
    this.img = {}; this.grey = {}; this.people = {}; this.peopleGrey = {}; this.animals = {}; this.animalsGrey = {};
    this.shadows = {}; this.tiles = {}; this.tilesGrey = {}; this.icons = {};
  }
  add(name, ps) { this.img[name] = toCanvas(ps); this.grey[name] = toCanvas(greyPS(ps)); }
  get(name, g) { return (g ? this.grey : this.img)[name]; }
  build() {
    for (const [name, o] of Object.entries(PEOPLE)) {
      const col = {}, gr = {};
      for (const d of ["down", "up", "right"]) {
        const frames = [0, 1, 2].map(f => upPS(outline(person(d, f, o))));
        col[d] = frames.map(toCanvas); gr[d] = frames.map(f => toCanvas(greyPS(f)));
        if (d === "right") { col.left = frames.map(f => toCanvas(flipPS(f))); gr.left = frames.map(f => toCanvas(greyPS(flipPS(f)))); }
      }
      this.people[name] = col; this.peopleGrey[name] = gr;
    }
    for (const k of ["dog", "cat", "sheep", "fox", "hare", "owl", "bird", "bear"]) {
      const n = k === "owl" ? 4 : 3;
      const fr = []; for (let f = 0; f < n; f++) fr.push(upPS(outline(animal(k, f))));
      const make = fn => ({ right: fr.map(f => toCanvas(fn(f))), left: fr.map(f => toCanvas(fn(flipPS(f)))) });
      this.animals[k] = make(f => f); this.animalsGrey[k] = make(greyPS); this.shadows[k] = make(shadowPS);
    }
    for (let i = 0; i < 4; i++) { this.add("tree" + i, upPS(treePS("round", i))); this.add("pine" + i, upPS(treePS("pine", i))); }
    this.add("appletree", upPS(treePS("round", 7, true)));
    this.add("house_oma", upPS(housePS(5, [180, 70, 60])));
    this.add("house_klaus", upPS(housePS(6, [150, 110, 60], [236, 220, 190])));
    this.add("house_lotte", upPS(housePS(5, [90, 120, 190], [240, 228, 200])));
    this.add("house_opa", upPS(housePS(4, [90, 70, 150], [220, 210, 230])));
    this.add("house_paul", upPS(housePS(4, [120, 150, 80])));
    this.add("house_baker", upPS(housePS(5, [200, 140, 60], [245, 235, 210])));
    this.add("well", upPS(wellPS())); this.add("tower", upPS(towerPS())); this.add("cave", upPS(cavePS()));
    this.add("gate", upPS(gatePS(false))); this.add("gate_open", upPS(gatePS(true)));
    this.add("hedge", upPS(hedgePS(false))); this.add("hedge_hole", upPS(hedgePS(true))); this.add("plank", upPS(plankPS()));
    for (const k of ["flower", "bigflower", "bush", "rock", "boulder", "fence_h", "fence_v", "sign", "mushroom_red", "mushroom_blue", "icewater", "bucket", "bread", "apple", "table", "stone_word", "hay"])
      this.add(k, upPS(smallPS(k)));
    for (let f = 0; f < 3; f++) this.add("fire" + f, upPS(smallPS("fire", f)));
    for (const k of ["stove", "bed", "window", "shelf", "rug", "easel", "washline", "raft", "scarecrow", "barrel", "lilies", "glowshroom", "doormat"]) this.add(k, upPS(furniturePS(k)));
    this.add("lantern", upPS(smallPS("lantern", 0))); this.add("lantern_on", upPS(smallPS("lantern", 1)));
    this.add("crystal0", upPS(smallPS("crystal", 0))); this.add("crystal1", upPS(smallPS("crystal", 1)));
    for (const [nm, c] of [["rot", [220, 50, 50]], ["blau", [60, 110, 230]], ["gruen", [70, 180, 80]], ["gelb", [250, 220, 60]], ["weiss", [250, 250, 250]]])
      this.add("pot_" + nm, upPS(paintPot(c)));
    for (const k of Object.keys(TILE_COLORS))
      for (let v = 0; v < 4; v++)
        for (let f = 0; f < ((k === "water" || k === "stream") ? 3 : 1); f++) {
          const t = tilePS(k, v, f);
          this.tiles[k + v + "_" + f] = toCanvas(t); this.tilesGrey[k + v + "_" + f] = toCanvas(greyPS(t));
        }
  }
  wordIcon(key) {
    if (this.icons[key]) return this.icons[key];
    const ic = WORDS[key].icon;
    const obj = { well: "well", house: "house_oma", bread: "bread", apple: "apple", tree: "tree0", flower: "bigflower", water: "bucket", fire: "fire1", bridge: "plank" }[ic];
    const animalMap = { dog: 1, cat: 1, sheep: 1, hare: 1, fox: 1, bird: 1, owl: 1, bear: 1 };
    let src;
    if (obj) src = this.img[obj];
    else if (animalMap[ic]) src = this.animals[ic].right[0];
    else if (ic === "door") {
      const d = new PS(16, 16);
      d.rect(3, 1, 10, 15, [110, 70, 45]); d.rect(4, 2, 8, 14, [150, 100, 62]); d.set(10, 9, [240, 210, 90]);
      src = toCanvas(upPS(outline(d)));
    } else src = toCanvas(upPS(iconPS(ic), 3));
    const k = Math.min(44 / src.width, 44 / src.height);
    const out = scaledCanvas(src, Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)));
    this.icons[key] = out;
    return out;
  }
}
