// ============================================================================
// locations (v3): every place of the game is its own small map.
//   square → Oma's house → field → workshop → pier (raft) → meadow+cave
//   → forest → glade (bridge) → tower
// Exits: {x0,y0,x1,y1, to, at:[tx,ty], dir, cond:{flag, msg}}
// ============================================================================
function borderTrees(w, r, gaps, kind) {
  // trees around the edge of a map, leaving gaps (list of [side, from, to])
  const free = (side, i) => gaps.some(([s, a, b]) => s === side && i >= a && i <= b);
  for (let x = 0; x < w.w; x += 2) {
    if (!free("top", x) && !free("top", x + 1)) w.tree(x, 0, kind);
    if (!free("bottom", x) && !free("bottom", x + 1)) w.tree(x, w.h - 1, kind);
  }
  for (let y = 2; y < w.h - 1; y += 2) {
    if (!free("left", y) && !free("left", y + 1)) w.tree(0, y, kind);
    if (!free("right", y) && !free("right", y + 1)) w.tree(w.w - 1, y, kind);
  }
  // keep the edges closed between the trees
  for (let x = 0; x < w.w; x++) {
    if (!free("top", x)) w.foot.add(World.k(x, 0));
    if (!free("bottom", x)) w.foot.add(World.k(x, w.h - 1));
  }
  for (let y = 0; y < w.h; y++) {
    if (!free("left", y)) w.foot.add(World.k(0, y));
    if (!free("right", y)) w.foot.add(World.k(w.w - 1, y));
  }
}
function scatter(w, r, n, img, okTiles, area, opts) {
  for (let i = 0; i < n; i++) {
    const x = r.randint(area[0], area[2]), y = r.randint(area[1], area[3]);
    if (okTiles.includes(w.tiles[y][x]) && !w.foot.has(World.k(x, y))) w.add(new Prop(`${img}${i}_${x}_${y}`, img, x, y, Object.assign({ solid: false, layer: -1 }, opts || {})));
  }
}
function grassBase(w, r) { for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) w.tiles[y][x] = r() < 0.3 ? "G" : "g"; }

const LOCATIONS = {
  // ---------------------------------------------------------------- the village square
  square: {
    w: 32, h: 24, music: "village", title: "Площадь", group: "village",
    build(w, r) {
      grassBase(w, r);
      w.fill(9, 7, 22, 16, "z");
      w.path([[5, 10], [5, 12], [9, 12]]);
      w.path([[22, 11], [31, 11]]);
      w.path([[15, 0], [15, 7]]);
      w.path([[15, 16], [15, 23]]);
      w.path([[21, 16], [21, 21], [25, 21]]);
      borderTrees(w, r, [["right", 11, 12], ["top", 15, 16], ["bottom", 15, 16]]);
      const A = p => w.add(p);
      A(new Prop("house_oma", "house_oma", 3, 9, { w: 5, foot: [3, 4, 5, 6, 7].flatMap(x => [[x, 7], [x, 8], [x, 9]]), reach: 54 }));
      A(new Prop("house_baker", "house_baker", 23, 19, { w: 5, foot: [23, 24, 25, 26, 27].flatMap(x => [[x, 17], [x, 18], [x, 19]]) }));
      A(new Prop("house_paul", "house_paul", 24, 4, { w: 4, foot: [24, 25, 26, 27].flatMap(x => [[x, 2], [x, 3], [x, 4]]) }));
      A(new Prop("well", "well", 15, 11, { w: 2, word: "brunnen" }));
      A(new Prop("bucket", "bucket", 18, 11));
      A(new Prop("sign", "sign", 23, 9, { reach: 40 }));
      for (const [k, x, y] of [["bush", 8, 5], ["bush", 11, 19], ["rock", 4, 16], ["bush", 28, 8], ["barrel", 22, 20], ["bush", 3, 20], ["rock", 20, 3]]) A(new Prop("d" + x + "_" + y, k, x, y));
      for (const [x, y] of [[4, 3], [10, 3], [6, 18], [27, 13], [12, 21], [29, 17], [19, 20]]) w.tree(x, y);
      scatter(w, r, 40, "flower", "gG", [2, 2, 29, 21]);
      w.exit(31, 11, 31, 12, "field", [1, 15], "right", { flag: "ch3_done", msg: "Ой, на поле нам пока рано. Туда мы ещё сходим." });
      w.exit(15, 0, 16, 0, "workshop", [12, 15], "up", { flag: "ch4_done", msg: "Ой, там мастерская Лотте. К ней мы ещё зайдём, но не сейчас." });
      w.exit(15, 23, 16, 23, "pier", [13, 15], "up", { flag: "ch5_done", msg: "Ой, это тропинка к реке. Туда нам пока рано." });
    },
  },
  // ---------------------------------------------------------------- inside Oma's house
  oma_house: {
    w: 22, h: 14, music: "house", title: "Дом Омы", group: "village", base: "b",
    build(w, r) {
      w.fill(0, 0, 21, 2, "k"); w.fill(0, 0, 0, 13, "k"); w.fill(21, 0, 21, 13, "k"); w.fill(0, 13, 21, 13, "k");
      w.set(10, 13, "b"); w.set(11, 13, "b");
      const A = p => w.add(p);
      A(new Prop("window1", "window", 5, 2, { solid: false })).offset = [0, -6];
      A(new Prop("window2", "window", 15, 2, { solid: false })).offset = [0, -6];
      A(new Prop("flower", "bigflower", 15, 3, { solid: false, word: "blume", layer: 1 })).offset = [0, -22];
      A(new Prop("stove", "stove", 2, 3));
      A(new Prop("shelf", "shelf", 8, 3));
      A(new Prop("bed", "bed", 19, 4, { foot: [[19, 4], [20, 4], [19, 3], [20, 3]] }));
      A(new Prop("table", "table", 10, 7));
      const b = A(new Prop("bread", "bread", 10, 7, { solid: false, word: "brot", layer: 1 })); b.offset = [0, -14];
      A(new Prop("bucket_in", "bucket", 3, 8, { word: "wasser" }));
      A(new Prop("table2", "table", 16, 7));
      const ap = A(new Prop("apple", "apple", 16, 7, { solid: false, word: "apfel", layer: 1 })); ap.offset = [0, -14];
      A(new Prop("rug", "rug", 10, 10, { solid: false, layer: -1 }));
      A(new Prop("doormat", "doormat", 10, 12, { solid: false, layer: -1, anchorX: 11 }));
      w.exit(10, 13, 11, 13, "square", [5, 11], "down", null);
    },
  },
  // ---------------------------------------------------------------- Klaus's field
  field: {
    w: 36, h: 24, music: "field", title: "Поле", group: "village",
    build(w, r) {
      grassBase(w, r);
      w.fill(3, 3, 19, 12, "o");
      w.path([[0, 15], [27, 15], [27, 12]]);
      borderTrees(w, r, [["left", 15, 16]]);
      const A = p => w.add(p);
      for (let x = 23; x <= 33; x++) { A(new Prop("pt" + x, "fence_h", x, 3)); if (x !== 27 && x !== 28) A(new Prop("pb" + x, "fence_h", x, 11)); }
      for (let y = 4; y <= 10; y++) { A(new Prop("pl" + y, "fence_v", 23, y)); A(new Prop("pr" + y, "fence_v", 33, y)); }
      A(new Prop("hay1", "hay", 30, 5)); A(new Prop("hay2", "hay", 25, 9));
      A(new Prop("bigtree", "tree1", 12, 18, { word: "baum" })).scale = 1.3;
      A(new Prop("scarecrow", "scarecrow", 10, 7));
      A(new Prop("barrel1", "barrel", 21, 5)); A(new Prop("barrel2", "barrel", 21, 6));
      for (const [x, y] of [[4, 19], [20, 20], [31, 16], [33, 20], [6, 15], [17, 17]]) w.tree(x, y);
      scatter(w, r, 30, "flower", "gG", [2, 13, 33, 21]);
      w.exit(0, 15, 0, 16, "square", [30, 11], "left", null);
    },
  },
  // ---------------------------------------------------------------- Lotte's workshop
  workshop: {
    w: 26, h: 18, music: "house", title: "Мастерская Лотте", group: "village",
    build(w, r) {
      grassBase(w, r);
      w.fill(3, 4, 22, 14, "z");
      w.path([[12, 14], [12, 17]]);
      borderTrees(w, r, [["bottom", 12, 13]]);
      const A = p => w.add(p);
      A(new Prop("house_lotte", "house_lotte", 8, 3, { w: 5, foot: [8, 9, 10, 11, 12].flatMap(x => [[x, 1], [x, 2], [x, 3]]) }));
      ["rot", "blau", "gruen", "gelb", "weiss"].forEach((c, i) => { const p = A(new Prop("pot_" + c, "pot_" + c, 14 + i, 5, { word: c })); p.forceColor = true; });
      A(new Prop("easel", "easel", 17, 9));
      A(new Prop("washline1", "washline", 5, 9, { w: 2, solid: false }));
      A(new Prop("washline2", "washline", 20, 12, { w: 2, solid: false }));
      A(new Prop("barrel1", "barrel", 21, 5)); A(new Prop("shelf_w", "shelf", 5, 5));
      for (const [x, y] of [[3, 15], [22, 15], [2, 6]]) w.tree(x, y);
      scatter(w, r, 14, "flower", "gG", [1, 1, 24, 16]);
      w.exit(12, 17, 13, 17, "square", [15, 1], "down", null);
    },
  },
  // ---------------------------------------------------------------- the river pier
  pier: {
    w: 28, h: 18, music: "river", title: "Причал", group: "river",
    build(w, r) {
      grassBase(w, r);
      w.fill(0, 0, 27, 7, "w"); w.fill(0, 8, 27, 8, "n");
      w.fill(13, 2, 14, 8, "b");
      w.path([[13, 9], [13, 17]]);
      borderTrees(w, r, [["bottom", 13, 14], ["top", 0, 27]]);
      for (let x = 0; x < 28; x++) w.foot.delete(World.k(x, 0));
      const A = p => w.add(p);
      A(new Prop("raft", "raft", 13, 1, { w: 2, solid: false, layer: -1 }));
      for (const [x, y] of [[5, 3], [20, 5], [24, 2], [8, 6]]) A(new Prop("lily" + x, "lilies", x, y, { solid: false, layer: -1 }));
      A(new Prop("barrel1", "barrel", 11, 9)); A(new Prop("barrel2", "barrel", 10, 10));
      for (const [x, y] of [[4, 12], [22, 13], [6, 16], [19, 10]]) w.tree(x, y);
      scatter(w, r, 20, "flower", "gG", [1, 9, 26, 16]);
      w.exit(13, 17, 14, 17, "square", [15, 22], "up", null);
    },
  },
  // ---------------------------------------------------------------- meadow and cave
  meadow: {
    w: 36, h: 30, music: "village", title: "Луг", group: "meadow", base: "m",
    build(w, r) {
      w.fill(0, 28, 35, 29, "w");
      w.fill(0, 0, 35, 2, "f");
      w.fill(0, 3, 35, 8, "r"); w.fill(9, 3, 11, 8, "d");
      w.fill(0, 22, 35, 22, "s");
      w.path([[16, 27], [16, 18], [10, 18], [10, 9]]);
      w.fill(16, 22, 17, 22, "s");
      w.fill(9, 9, 11, 10, "p");
      for (let x = 0; x < 36; x++) if (x !== 10) w.set(x, 11, "r");
      w.set(10, 11, "m");
      w.fill(15, 26, 18, 27, "b");
      const A = p => w.add(p);
      A(new Prop("raft_m", "raft", 16, 28, { w: 2, solid: false, layer: -1 }));
      for (let x = 0; x < 36; x++) {
        if (x === 10) { A(new Prop("hedge_hole", "hedge_hole", x, 15, { solid: false })); w.special[World.k(x, 15)] = "hole"; }
        else A(new Prop("hedge" + x, "hedge", x, 15));
      }
      A(new Prop("boulder", "boulder", 10, 11));
      A(new Prop("fire", ["fire0", "fire1", "fire2"], 13, 20, { word: "feuer" }));
      A(new Prop("icewater", "icewater", 20, 20, { word: "kalt" }));
      A(new Prop("mush_blue", "mushroom_blue", 12, 17, { solid: false, word: "klein" }));
      A(new Prop("mush_blue2", "mushroom_blue", 7, 13, { solid: false, word: "klein" }));
      A(new Prop("mush_red", "mushroom_red", 13, 13, { solid: false, word: "gross" }));
      A(new Prop("cave", "cave", 10, 9, { solid: false, layer: -1 })).y = 9.6 * TILE;
      A(new Prop("lantern", "lantern", 11, 8, { solid: false, word: "hell" }));
      for (const [x, y] of [[3, 25], [28, 24], [5, 19], [30, 18], [25, 13], [3, 12], [32, 10], [22, 9], [4, 9]]) w.tree(x, y);
      for (let x = 0; x < 36; x += 2) if (x < 8 || x > 12) w.tree(x, 1, "pine");
      scatter(w, r, 40, "flower", "m", [0, 9, 35, 27]);
      for (let y = 0; y < 30; y++) { w.foot.add(World.k(0, y)); w.foot.add(World.k(35, y)); }
      w.exit(9, 0, 11, 0, "forest", [14, 38], "up", null);
    },
  },
  // ---------------------------------------------------------------- the deep forest
  forest: {
    w: 36, h: 40, music: "forest", title: "Дремучий лес", group: "forest", base: "f",
    build(w, r) {
      const pts = [[14, 39], [14, 33], [22, 33], [22, 28], [30, 28], [30, 22], [24, 22], [24, 14], [12, 14], [12, 8], [18, 8], [18, 0]];
      w.path(pts);
      const near = new Set();
      for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (w.tiles[y][x] === "p") for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near.add(World.k(x + dx, y + dy));
      for (const [cx, cy] of [[14, 35], [22, 30], [27, 28], [30, 24], [24, 17], [15, 11]]) for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) near.add(World.k(cx + dx, cy + dy));
      for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
        if (near.has(World.k(x, y))) continue;
        if ((x + y * 3) % 2 === 0 && r() < 0.85) w.add(new Prop(`pine${x}_${y}`, "pine" + ((x + y) % 4), x, y));
        else if (r() < 0.06) w.add(new Prop(`fb${x}_${y}`, "bush", x, y));
        w.foot.add(World.k(x, y));
      }
      for (let i = 0; i < 40; i++) { const x = r.randint(1, 34), y = r.randint(1, 38); if (near.has(World.k(x, y)) && w.tiles[y][x] === "f") w.add(new Prop("ffl" + i, i % 5 ? "flower" : "glowshroom", x, y, { solid: false, layer: -1 })); }
      w.exit(14, 39, 15, 39, "meadow", [10, 1], "down", null);
      w.exit(18, 0, 19, 0, "glade", [17, 23], "up", null);
    },
  },
  // ---------------------------------------------------------------- the magic glade by the river
  glade: {
    w: 34, h: 26, music: "glade", title: "Волшебная поляна", group: "glade", base: "l",
    build(w, r) {
      w.fill(0, 0, 33, 1, "n"); w.fill(0, 2, 33, 6, "w"); w.fill(0, 7, 33, 7, "n");
      w.path([[17, 25], [17, 8]]);  // the bridge will be built at x 17-18, rows 6..3
      borderTrees(w, r, [["bottom", 17, 18], ["top", 0, 33]], "pine");
      for (let x = 0; x < 34; x++) w.foot.delete(World.k(x, 0));
      const A = p => w.add(p);
      for (const [x, y] of [[8, 12], [12, 10], [24, 11], [27, 16], [6, 18], [21, 19]]) A(new Prop("gs" + x, "glowshroom", x, y, { solid: false }));
      for (const [x, y] of [[10, 15], [25, 20], [29, 10], [4, 10]]) A(new Prop("cr" + x, ["crystal0", "crystal1"], x, y, { solid: false }));
      for (const [x, y] of [[6, 4], [26, 3], [12, 5]]) A(new Prop("lily" + x, "lilies", x, y, { solid: false, layer: -1 }));
      for (const [i, x] of [14, 15, 20, 21].entries()) A(new Prop("stone" + i, "stone_word", x, 8, { solid: false, layer: -1 }));
      for (const [x, y] of [[3, 22], [30, 22], [5, 14], [30, 13]]) w.tree(x, y);
      scatter(w, r, 50, "flower", "l", [1, 8, 32, 24]);
      w.exit(17, 25, 18, 25, "forest", [18, 1], "down", null);
      w.exit(17, 0, 18, 0, "tower", [14, 16], "up", null);
    },
  },
  // ---------------------------------------------------------------- the tower of the Silent Mage
  tower: {
    w: 30, h: 18, music: "tower", title: "Башня", group: "tower", base: "t",
    build(w, r) {
      w.fill(0, 17, 29, 17, "n");
      borderTrees(w, r, [["bottom", 13, 16]], "pine");
      const A = p => w.add(p);
      A(new Prop("tower", "tower", 14, 5, { w: 2, foot: [12, 13, 14, 15, 16, 17].flatMap(x => [[x, 2], [x, 3], [x, 4], [x, 5]]) }));
      for (const [x, y] of [[7, 7], [22, 7], [9, 3], [20, 3], [5, 12], [24, 12]]) A(new Prop("cr" + x + y, ["crystal0", "crystal1"], x, y, { solid: false }));
      for (const [x, y] of [[3, 4], [26, 4], [3, 9], [26, 9], [4, 14], [25, 14]]) w.tree(x, y, "pine");
    },
  },
};
