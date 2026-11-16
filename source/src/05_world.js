// ============================================================================
// world (v3): one World per location. Each location is a small map with its
// own size, tiles, props, people and exits to other locations (05b_locations).
// ============================================================================
const SOLID_TILES = "wsrkv";
const TILE_KIND = { g: "grass", G: "grass2", m: "meadow", p: "path", z: "plaza", w: "water", s: "stream", f: "forest", r: "rockwall", d: "dark",
  t: "towerfloor", b: "floor", n: "sand", k: "wall", o: "soil", l: "glade", v: "void" };

class Prop {
  constructor(name, img, tx, ty, o) {
    o = o || {};
    this.name = name; this.img = img; this.tx = tx; this.ty = ty; this.w = o.w || 1;
    this.x = (o.anchorX !== undefined ? o.anchorX : tx + this.w / 2) * TILE;
    this.y = (ty + 1) * TILE;
    const solid = o.solid === undefined ? true : o.solid;
    this.foot = o.foot ? o.foot : (solid ? Array.from({ length: this.w }, (_, i) => [tx + i, ty]) : []);
    this.word = o.word || null; this.interact = null; this.visible = true; this.forceColor = false;
    this.layer = o.layer || 0; this.reach = o.reach || 44; this.offset = [0, 0]; this.scale = 1;
  }
  frameKey(t) { return Array.isArray(this.img) ? this.img[Math.floor(t * 6) % this.img.length] : this.img; }
}

class Entity {
  constructor(name, sprite, tx, ty, kind, facing) {
    this.name = name; this.sprite = sprite; this.kind = kind || "person";
    this.x = (tx + 0.5) * TILE; this.y = (ty + 1) * TILE - 4;
    facing = facing || "down";
    this.dir = this.kind === "person" ? facing : (facing === "left" ? "left" : "right");
    this.talk = null; this.visible = true; this.solid = true; this.shadow = false; this.moving = false; this.word = null;
    this.anim = 0; this.path = []; this.speed = 70; this.follow = null; this.wander = 0;
    this.home = [this.x, this.y]; this.wanderT = Math.random() * 3; this.scale = 1; this.reach = 46;
  }
  walkTo(tx, ty, speed) { this.path.push([(tx + 0.5) * TILE, (ty + 1) * TILE - 4]); if (speed) this.speed = speed; }
  update(dt, world) {
    this.anim += dt;
    let target = null;
    if (this.path.length) target = this.path[0];
    else if (this.follow) { const f = this.follow; if (Math.hypot(f.x - this.x, f.y - this.y) > 40) target = [f.x, f.y]; }
    else if (this.wander) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 3;
        const tx = this.home[0] + uniform(-1, 1) * this.wander * TILE, ty = this.home[1] + uniform(-1, 1) * this.wander * TILE * 0.6;
        if (!world.blockedRect([tx - 8, ty - 6, 16, 8], false, this)) this.path.push([tx, ty]);
      }
    }
    this.moving = false;
    if (target) {
      const dx = target[0] - this.x, dy = target[1] - this.y, d = Math.hypot(dx, dy);
      const sp = this.speed * (this.follow && !this.path.length ? 1.6 : 1);
      if (d < 3) { if (this.path.length) this.path.shift(); }
      else {
        const step = Math.min(d, sp * dt);
        this.x += dx / d * step; this.y += dy / d * step; this.moving = true;
        if (this.kind === "person") this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        else if (Math.abs(dx) > 2) this.dir = dx > 0 ? "right" : "left";
      }
    }
  }
  face(o) {
    const dx = o.x - this.x, dy = o.y - this.y;
    if (this.kind === "person") this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    else this.dir = dx > 0 ? "right" : "left";
  }
  rect() { return [this.x - 10, this.y - 8, 20, 10]; }
}

class Player extends Entity {
  constructor(tx, ty) {
    super("hero", "hero", tx, ty);
    this.speed = 120; this.jumpT = 0; this.jumpFrom = null; this.jumpTo = null;
    this.size = "normal"; this.scale = 1; this.targetScale = 1; this.stepT = 0; this.carry = null; this.shiver = 0;
  }
  rect() {
    const k = Math.min(this.scale, 1);
    let w = 14 * k, h = 8 * k;
    if (this.size === "big") { w = 22; h = 10; }
    return [this.x - w / 2, this.y - h, w, h];
  }
}

function rectsOverlap(a, b) { return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]; }

class World {
  constructor(id) {
    const L = LOCATIONS[id];
    this.id = id; this.def = L; this.w = L.w; this.h = L.h;
    this.tiles = []; this.vari = [];
    for (let y = 0; y < this.h; y++) { this.tiles.push(new Array(this.w).fill(L.base || "g")); this.vari.push(new Array(this.w).fill(0)); }
    this.props = []; this.entities = []; this.propByName = {}; this.ent = {};
    this.foot = new Set(); this.special = {}; this.colored = false; this.exits = []; this.triggers = [];
    const r = Rng(strHash(id));
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.vari[y][x] = r.randint(0, 3);
    L.build(this, r);
  }
  static k(x, y) { return x + "," + y; }
  set(x, y, c) { if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.tiles[y][x] = c; }
  fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  path(pts, c, w) {
    c = c || "p"; w = w || 2;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (ax === bx) { for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let j = 0; j < w; j++) this.set(ax + j, y, c); }
      else { for (let x = Math.min(ax, bx); x < Math.max(ax, bx) + w; x++) for (let j = 0; j < w; j++) this.set(x, ay + j, c); }
    }
  }
  add(p) { this.props.push(p); this.propByName[p.name] = p; for (const [x, y] of p.foot) this.foot.add(World.k(x, y)); return p; }
  removeFoot(p) { for (const [x, y] of p.foot) this.foot.delete(World.k(x, y)); p.foot = []; }
  addEnt(e) { this.entities.push(e); this.ent[e.name] = e; return e; }
  tree(tx, ty, kind) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.foot.has(World.k(tx, ty))) return null;
    const i = (tx * 7 + ty * 3) % 4;
    return this.add(new Prop(`t${tx}_${ty}`, `${kind === "pine" ? "pine" : "tree"}${i}`, tx, ty));
  }
  exit(x0, y0, x1, y1, to, at, dir, cond) { this.exits.push({ x0, y0, x1, y1, to, at, dir, cond }); }
  tileAt(tx, ty) { return (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) ? this.tiles[ty][tx] : "v"; }
  solidTile(tx, ty, small) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return true;
    if (SOLID_TILES.includes(this.tiles[ty][tx])) return true;
    const k = World.k(tx, ty);
    if (this.foot.has(k)) return true;
    if (this.special[k] === "hole" && !small) return true;
    return false;
  }
  blockedRect(r, small, ignore, ents) {
    const x0 = Math.floor(r[0] / TILE), x1 = Math.floor((r[0] + r[2] - 1) / TILE);
    const y0 = Math.floor(r[1] / TILE), y1 = Math.floor((r[1] + r[3] - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty, small)) return true;
    if (ents !== false) for (const e of this.entities) {
      if (e === ignore || !e.visible || !e.solid) continue;
      if (rectsOverlap(e.rect(), r)) return true;
    }
    return false;
  }
}
