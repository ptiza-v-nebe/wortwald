// ============================================================================
// story (v4: softer Oma, gentle Funke, small steps, less banter)
// a journey through nine places with Funke, the last living spark of
// a word, as your companion. Each place has a local who brings you up to speed.
// Wrong words don't punish - they make something funny happen.
// ============================================================================
const SPEAKERS = {
  oma: ["Ома Грета", "oma"], bello: ["Белло", "dog"], mimi: ["Мими", "cat"], paul: ["Пауль", "paul"], anna: ["Анна", "anna"],
  baker: ["Пекарь Ханс", "baecker"], klaus: ["Фермер Клаус", "klaus"], lotte: ["Лотте", "lotte"], opa: ["Опа Ульрих", "opa"],
  eule: ["Сова", "owl"], baer: ["Медведь", "bear"], fuchs: ["Лиса", "fox"], hase: ["Заяц", "hare"], vogel: ["Птичка", "bird"],
  magier: ["Немой Маг", "magier"], funke: ["Искорка", "funke"], hero: ["", "hero"],
};
const HOUSE_WORDS = ["brot", "wasser", "apfel", "blume", "katze"];
const COLORS = ["rot", "blau", "gruen", "gelb", "weiss"];
const PAINT_ORDER = ["rot", "gruen", "gelb", "weiss", "blau"];
const CH_WORDS = {};
for (const k of ORDER) (CH_WORDS[WORDS[k].ch] = CH_WORDS[WORDS[k].ch] || []).push(k);
const CH_TITLES = { 1: "Hallo", 2: "Ich bin…", 3: "Das Haus", 4: "Eins, zwei, drei", 5: "Rot, blau, grün", 6: "Geh! Spring!", 7: "Heiß und kalt", 8: "Der Wald", 9: "Die Brücke", 10: "Der stumme Magier" };
const SHADOWS = {
  hase: { pos: [14, 35], sprite: "hare", options: ["hase", "baer", "eule"], hints: ["Тень дрожит, у неё длиннющие уши.", "<Er ist klein.>", "Прыг! И снова на месте. Прыг-прыг!"] },
  fuchs: { pos: [22, 30], sprite: "fox", options: ["baer", "fuchs", "hase"], hints: ["Пушистый хвост метёт по земле.", "<Er ist rot.>", "Глаза хитрые, щёлочками. Тяв!"] },
  vogel: { pos: [27, 28], sprite: "bird", options: ["fuchs", "baer", "vogel"], hints: ["Тень порхает над тропинкой: фр-р-р!", "<Er ist klein. Er ist blau.>", "Тоненько посвистывает: тю-ли-тю!"] },
  eule: { pos: [30, 24], sprite: "owl", options: ["vogel", "eule", "hase"], hints: ["Два огромных круглых глаза, и не моргают.", "Голову поворачивает чуть ли не задом наперёд!", "Ух-ху… ух-ху…"] },
  baer: { pos: [24, 17], sprite: "bear", options: ["hase", "fuchs", "baer", "vogel"], hints: ["Земля вздрагивает. Тень закрыла полнеба.", "<Er ist groß! Sehr groß!>", "Брумм… Пахнет мёдом и малиной."] },
};
const SHADOW_ORDER = ["hase", "fuchs", "vogel", "eule", "baer"];
const GROUP_OF = id => LOCATIONS[id].group;

// ------------------------------------------------------------------ helpers
function pic(g, kind, name) {
  const a = g.art;
  if (kind === "person") return [a.people[name].down[0], a.peopleGrey[name].down[0]];
  if (kind === "animal") return [a.animals[name].right[0], a.animalsGrey[name].right[0]];
  return [a.get(name), a.get(name, true)];
}
function iconBig(g, key, k) { const ic = g.art.wordIcon(key); k = k || 2; return scaledCanvas(ic, ic.width * k, ic.height * k); }
function big2(img) { return scaledCanvas(img, img.width * 2, img.height * 2); }
function ent(g, name) { return g.world.ent[name]; }
function tileOf(e) { return [Math.floor(e.x / TILE), Math.floor((e.y - 4) / TILE)]; }
function place(e, tx, ty, facing) { e.x = (tx + 0.5) * TILE; e.y = (ty + 1) * TILE - 4; e.home = [e.x, e.y]; e.path = []; if (facing) e.dir = facing; }
function countKnown(g, keys) { return keys.filter(k => g.known[k]).length; }
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function* askUntil(g, sp, prompt, options, correct, retorts, image) {
  while (true) {
    const r = yield g.choice(sp, prompt, options, correct, image);
    if (r === correct) return r;
    const line = retorts && retorts[r];
    if (line) { if (typeof line === "function") yield* line(); else yield g.say(sp, line); }
  }
}
function sayOnce(g, sp, text) { return (function* () { yield sp === "think" ? g.think(text) : g.say(sp, text); })(); }
function F(g, text) { return g.say("funke", text); }
function startChapter(g, n, sub) { g.chapter = n; return new Title("Глава " + n, CH_TITLES[n], sub); }
function* chapterDone(g, n) { yield new ChapterCard(n, CH_TITLES[n], CH_WORDS[n].filter(k => g.known[k])); g.chapter = n + 1; }
function colorGroup(g, group) {
  g.flags.add("zone:" + group);
  for (const w of Object.values(g.worlds)) if (w.def.group === group) w.colored = true;
}
// a quick check of an older word on the way (v4.1): only things you can SEE - nouns and colours;
// words with mistakes and rarely used ones come up more often, and the last few are not repeated
const ABSTRACT_NOUNS = ["freund", "wald"];
function isThing(k) { return !!WORDS[k].art && !ABSTRACT_NOUNS.includes(k); }
function isColour(k) { return WORDS[k].icon.startsWith("c_"); }
function reviewKind(k) { return isThing(k) ? "thing" : isColour(k) ? "colour" : null; }
function* review(g) {
  const known = Object.keys(g.known).filter(reviewKind);
  const byKind = k => known.filter(x => reviewKind(x) === reviewKind(k));
  g.recentReview = g.recentReview || [];
  let pool = known.filter(k => byKind(k).length >= 3 && !g.recentReview.includes(k));
  if (!pool.length) pool = known.filter(k => byKind(k).length >= 3);
  if (!pool.length) return;
  const weight = k => 1 + 3 * (g.weak[k] || 0) + 4 / (1 + g.known[k]);
  let r = Math.random() * pool.reduce((a, k) => a + weight(k), 0), key = pool[pool.length - 1];
  for (const k of pool) { r -= weight(k); if (r <= 0) { key = k; break; } }
  g.recentReview.push(key); if (g.recentReview.length > 4) g.recentReview.shift();
  const others = shuffle(byKind(key).filter(k => k !== key)).slice(0, 2);
  const opts = shuffle([key, ...others]), right = opts.indexOf(key), colour = reviewKind(key) === "colour";
  const prompt = colour ? choice(["Пока идём, давай вспомним. Какой это цвет?", "Смотри, какой цвет. Как он называется?"])
    : choice(["Пока идём, давай вспомним. Что это?", "Я по дороге вспомнила одно слово. Как это называется?", "Давай повторим. Что это?"]);
  const res = yield g.choice("funke", prompt, opts.map(k => `<${withArticle(k)}>`), right, iconBig(g, key));
  if (res === right) { g.use(key); yield F(g, choice(["<Ja!> Правильно.", "<Gut!> Помнишь!", "<Ja, ja!> Идём дальше."])); }
  else { g.reportAnswer(false, key); yield F(g, `Это <${withArticle(key)}>. Ничего, потом ещё раз спрошу.`); }
}

// ------------------------------------------------------------------ travel
function* travel(g, to, at, dir) {
  yield new Fade(true, 0.35);
  g.enter(to, at, dir);
  yield new Fade(false, 0.35);
  yield* onArrive(g, to);
}
function* onArrive(g, to) {
  const f = g.flags, first = !f.has("seen_" + to);
  f.add("seen_" + to);
  if (to === "oma_house" && first) yield* houseIntro(g);
  if (to === "field" && first) { yield g.narr("Дорога выводит в поле. Пахнет землёй и сеном. У пустого загона кто-то тяжело вздыхает."); yield* review(g); g.goal("Найди фермера Клауса.", "Глава 4 · Eins, zwei, drei"); }
  if (to === "workshop" && first) { yield g.narr("Наверху, за площадью, мастерская. Двери настежь, на полке горшочки, у окна мольберт."); yield* review(g); g.goal("Поговори с Лотте.", "Глава 5 · Rot, blau, grün"); }
  if (!first && ["square", "field", "workshop", "pier"].includes(to) && f.has("ch3_done") && Math.random() < 0.4) yield* review(g);
  if (to === "pier" && first) { yield g.narr("Тропинка спускается к реке. Вода шумит, у причала покачивается плот. Старик в шляпе машет тебе рукой."); yield* review(g); g.goal("Поговори с Опой на причале.", "Глава 6 · Geh! Spring!"); }
  if (to === "forest" && !f.has("ch8")) yield* forestIntro(g);
  if (to === "glade" && !f.has("ch9")) yield* gladeIntro(g);
  if (to === "tower" && !f.has("ch10")) yield* ch10Tower(g);
}

// ------------------------------------------------------------------ population (per location)
function populate(g, w) {
  const person = (n, s, x, y, f) => w.addEnt(new Entity(n, s, x, y, "person", f || "down"));
  const animal = (n, s, x, y, f) => w.addEnt(new Entity(n, s, x, y, "animal", f || "right"));
  const P = w.propByName;
  if (w.id === "square") {
    person("oma", "oma", 5, 11).talk = talkOma;
    const b = animal("bello", "dog", 18, 14); b.talk = talkBello; b.wander = 2; b.word = "hund";
    person("paul", "paul", 21, 14, "left").talk = talkKids;
    person("anna", "anna", 22, 14, "left").talk = talkKids;
    person("baker", "baecker", 25, 21).talk = talkBaker;
    for (const n of ["klaus", "lotte", "opa", "magier"]) { const e = person(n, n, 2, 2); e.visible = false; e.talk = talkFestival; }
    for (const [n, s] of [["eule", "owl"], ["baer", "bear"]]) { const e = animal(n, s, 2, 2); e.visible = false; e.talk = talkFestival; e.word = n; }
    P.well.interact = touchWell;
    P.house_oma.interact = touchHouse;
    P.sign.interact = readSign;
  } else if (w.id === "oma_house") {
    person("oma", "oma", 7, 5).talk = talkOmaHouse;
    const m = animal("mimi", "cat", 10, 10, "left"); m.talk = talkMimi; m.word = "katze"; m.wander = 1;
    for (const n of ["bread", "bucket_in", "apple", "flower"]) P[n].interact = touchHouseThing;
  } else if (w.id === "field") {
    const k = person("klaus", "klaus", 18, 9); k.talk = talkKlaus;
    const b = animal("bello", "dog", 21, 13, "left"); b.talk = talkBelloField; b.word = "hund";
    const s0 = animal("sheep0", "sheep", 29, 7); s0.wander = 2; s0.talk = talkSheep; s0.word = "schaf"; s0.solid = false;
    [[5, 16], [16, 2], [33, 18], [12, 19], [30, 21]].forEach(([x, y], i) => {
      const s = animal("sheep" + (i + 1), "sheep", x, y, "left"); s.wander = i === 4 ? 0 : 1; s.talk = talkSheep; s.word = "schaf"; s.solid = false;
    });
    P.bigtree.interact = touchFieldTree;
    P.scarecrow.interact = function* (g) { yield g.narr("Пугало в старой шляпе. Ворон оно давно не пугает: одна сидит прямо у него на плече."); };
  } else if (w.id === "workshop") {
    person("lotte", "lotte", 16, 8, "left").talk = talkLotte;
    for (const c of COLORS) P["pot_" + c].interact = touchPot;
    P.easel.interact = function* (g) { yield g.narr(g.has("ch5_done") ? "На холсте деревня. Яркая, весёлая, чуть-чуть кривая. Лотте довольна." : "Пустой серый холст. Лотте смотрит на него и вздыхает."); };
  } else if (w.id === "pier") {
    person("opa", "opa", 15, 10).talk = talkOpa;
  } else if (w.id === "meadow") {
    for (const n of ["fire", "icewater", "mush_blue", "mush_blue2", "mush_red", "lantern"]) P[n].interact = touchMeadow;
  } else if (w.id === "forest") {
    for (const [k, d] of Object.entries(SHADOWS)) { const s = animal(k, d.sprite, d.pos[0], d.pos[1], "left"); s.shadow = true; s.talk = talkShadow; s.reach = 60; s.word = k; }
  } else if (w.id === "glade") {
    for (const [n, s, x, y] of [["eule", "owl", 20, 10], ["baer", "bear", 10, 13], ["fuchs", "fox", 25, 16], ["hase", "hare", 8, 19], ["vogel", "bird", 27, 10]]) {
      const e = animal(n, s, x, y, "left"); e.talk = talkGlade; e.word = n; e.reach = 56;
    }
  } else if (w.id === "tower") {
    person("magier", "magier", 14, 7).talk = talkMagier;
  }
}

function applyFlags(g, w) {
  const f = g.flags, P = w.propByName;
  w.colored = f.has("zone:" + w.def.group);
  if (w.id === "square") {
    if (f.has("ch1_done")) place(w.ent.oma, 7, 11, "down");
    else if (f.has("oma_bread")) place(w.ent.oma, 15, 13, "down");
    else w.ent.oma.visible = !!f.has("oma_came");
    if (f.has("col:bello")) place(w.ent.bello, 18, 14);
    if (f.has("ch3_done")) w.ent.bello.visible = false;
    if (f.has("ending")) festivalPositions(g, w);
  } else if (w.id === "field") {
    for (let i = 1; i < 6; i++) if (f.has(`sheep${i}_in`)) { const s = w.ent["sheep" + i]; place(s, 25 + i, 6 + (i % 3)); s.wander = 2; s.visible = true; }
    if (!f.has("sheep4_in") && !f.has("sheep4_out")) w.ent.sheep4.visible = false;
  } else if (w.id === "workshop") {
    for (const c of PAINT_ORDER) if (f.has("paint_" + c)) paintStep(g, c, true);
  } else if (w.id === "meadow") {
    if (f.has("boulder_gone")) { P.boulder.visible = false; w.removeFoot(P.boulder); }
    if (f.has("lantern")) { g.lantern = true; P.lantern.visible = false; }
  } else if (w.id === "forest") {
    for (const k of SHADOW_ORDER) if (f.has("named_" + k)) { const s = w.ent[k]; s.shadow = false; s.visible = false; }
  } else if (w.id === "glade") {
    for (let i = 1; i < 5; i++) if (f.has("plank" + i)) buildPlank(g, i, true, w);
  } else if (w.id === "tower") {
    if (f.has("ch10_done")) w.ent.magier.sprite = "magier_frei";
  }
}
function* resume(g) { yield new Fade(false, 1.0); g.toast(`С возвращением, ${g.name}!`); }

// ------------------------------------------------------------------ hints for the engine
function teachable(g, o) {
  const k = o.word;
  if (!k || g.known[k] || !WORDS[k] || WORDS[k].ch > g.chapter) return false;
  const f = g.flags;
  if (o.shadow) return true;
  if (o.name === "lantern") return !!g.known.dunkel;
  if (o.name && o.name.startsWith("mush_blue")) return !!(g.known.heiss && g.known.kalt);
  if (o.name === "mush_red") return !!g.known.klein;
  if (o.name === "fire" || o.name === "icewater") return f.has("ch7_feel");
  if (o.name && o.name.startsWith("pot_")) return f.has("ch5");
  if (o.name === "house_oma") return f.has("ch3");
  if (o.name === "bigtree") return f.has("ch4");
  if (o.name === "bello") return g.loc === "field" && f.has("stubborn_seen");
  if (o.name && o.name.startsWith("sheep")) return false;
  if (g.loc === "glade") return false;
  return true;
}
function questTarget(g) {
  const f = g.flags, L = g.loc;
  if (L === "square") {
    if (f.has("funke") && !f.has("ch1_brunnen")) return "well";
    if (f.has("ch1_done") && !f.has("ch2_done")) return "paul";
    if (f.has("ch2_done") && !f.has("ch3")) return "oma";
    if (f.has("ch3") && !f.has("seen_oma_house")) return "house_oma";
  }
  if (L === "oma_house" && f.has("house_all") && !f.has("ch3_done")) return "oma";
  if (L === "field" && !f.has("ch4")) return "klaus";
  if (L === "field" && f.has("ch4") && !f.has("ch4_done") && [1, 2, 3, 4, 5].every(i => f.has(`sheep${i}_in`))) return "klaus";
  if (L === "workshop" && !f.has("ch5_done") && (!f.has("ch5") || f.has("ch5_pots"))) return "lotte";
  if (L === "pier" && !f.has("ch6_done")) return "opa";
  if (L === "glade" && f.has("ch9") && !f.has("ch9_jump")) return GLADE_STEPS[gladeStep(g)] ? GLADE_STEPS[gladeStep(g)].who : null;
  return null;
}

// ------------------------------------------------------------------ triggers
function afterScript(g) {
  const f = g.flags;
  if (g.loc === "oma_house" && f.has("ch3") && !f.has("house_all")) {
    const n = countKnown(g, HOUSE_WORDS);
    if (n >= HOUSE_WORDS.length) { f.add("house_all"); g.goal("Всё в доме ожило. Поговори с Омой."); }
    else g.goal(`Потрогай вещи в доме (там, где искорки): ${n} из ${HOUSE_WORDS.length}`);
  }
  if (f.has("ch5") && !f.has("ch5_pots")) {
    const n = countKnown(g, COLORS);
    if (n >= 5) { f.add("ch5_pots"); g.goal("Все пять красок ожили. Поговори с Лотте."); }
    else g.goal(`Потрогай краски на полке: ${n} из 5`);
  }
}
function checkTriggers(g) {
  const p = g.player, f = g.flags, w = g.world;
  const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 4) / TILE);
  if (g.loc === "square" && f.has("oma_bread") && !f.has("ch1_done")) {
    const o = w.ent.oma;
    if (Math.hypot(o.x - p.x, o.y - p.y) > 5 * TILE) { g.run(omaTschuess(g)); return; }
  }
  if (g.loc === "meadow") {
    if (ty <= 21 && !f.has("ch7_feel")) { g.run(ch7Feel(g)); return; }
    if (p.size === "small" && ((f.has("small_from_s") && ty <= 13) || (f.has("small_from_n") && ty >= 17))) { g.run(sizeBack(g, "Гриб больше не действует. Ты снова обычного роста, и трава снова просто трава.")); return; }
    if (p.size === "big" && ty <= 10) { g.run(sizeBack(g, "Сила уходит. Ты снова обычного роста.")); return; }
    if (w.tileAt(tx, ty) === "d" && !f.has("dunkel_done")) { g.run(caveDark(g)); return; }
    if (ty <= 5 && w.tileAt(tx, ty) === "d" && !g.lantern) { g.run(caveBlock(g)); return; }
  }
  if (g.loc === "forest") for (const k of SHADOW_ORDER) {
    const s = w.ent[k];
    if (s.shadow && s.visible && Math.hypot(s.x - p.x, s.y - p.y) < 70) { g.run(shadowFight(g, k)); return; }
  }
  if (g.loc === "glade" && f.has("ch9_jump") && ty <= 1 && !f.has("ch10")) { g.run(travel(g, "tower", [14, 16], "up")); return; }
}
function onBump(g, tiles) {
  const f = g.flags, p = g.player, has = t => tiles.has(t), anyRow = r => [...tiles].some(t => +t.split(",")[1] === r);
  if (g.loc === "meadow") {
    if (anyRow(22) && g.abilities.has("springen")) { g.toast(g.touch ? "Встань у воды и жми «прыжок»!" : "ПРОБЕЛ — spring!"); g.bumpCool = 2.5; return null; }
    if (has("10,15") && p.size !== "small") return sayOnce(g, "funke", "Внизу в изгороди есть дыра. Только она совсем маленькая. Нам бы стать поменьше…");
    if (anyRow(15)) return sayOnce(g, "funke", "Изгородь сплошная и колючая, тут не перелезть. Попробуем ту дыру внизу.");
    if (has("10,11") && !f.has("boulder_gone")) {
      if (p.size === "big") return pushBoulder(g);
      return sayOnce(g, "funke", "Валун тяжёлый, его не сдвинуть. Вот если бы ты был побольше…");
    }
  }
  if (g.loc === "glade" && [...tiles].some(t => { const y = +t.split(",")[1]; return y >= 2 && y <= 6; })) {
    if (f.has("ch9_jump")) { g.toast(g.touch ? "С края моста — «прыжок»!" : "С края моста — ПРОБЕЛ!"); g.bumpCool = 2.5; return null; }
    if (f.has("ch9")) return sayOnce(g, "funke", "Вода ледяная, а течение быстрое, вплавь не получится. Сова говорила про мост из слов.");
  }
  return null;
}

// ------------------------------------------------------------------ chapter 1: the well, Oma, Bello
function* prologue(g) {
  g.fadeLevel = 255; g.chapter = 1; g.goal("", "Пролог");
  yield g.narr("Тихо. Так тихо, будто у мира выключили звук.");
  yield g.narr("Ты лежишь на холодных камнях. Над тобой серое небо, а где-то рядом тихонько потрескивает.");
  yield new Fade(false, 1.4);
  yield g.think("Где я?.. И почему всё такое серое?");
  g.flag("funke"); g.sparkle(g.funke.x, g.funke.y, 30); g.audio.play("chime");
  yield F(g, "Ой! Ты очнулся! Как хорошо. А я уж боялась, что осталась тут совсем одна.");
  yield F(g, "Я Искорка. Маленький кусочек слова, последний в этой деревне."); yield F(g, "Ночью здесь прошёл Немой Маг и унёс все слова. А я спряталась в ведре у колодца, вот он меня и не заметил.");
  yield g.think("Говорящий огонёк… Ну, раз уж всё вокруг такое странное, почему бы и нет.");
  yield F(g, "Давай начнём с колодца. Он тут самый старый и всё помнит. Подойди и потрогай его.");
  yield startChapter(g, 1, "Привет");
  g.goal("Потрогай колодец: подойди и нажми E.", "Глава 1 · Hallo");
  if (g.touch) g.toast("Кнопка E — потрогать или поговорить");
}
function* touchWell(g, prop) {
  const f = g.flags;
  if (!g.known.brunnen) {
    yield g.spark("brunnen", "Кладёшь ладони на край. Камень холодный и шершавый, снизу тянет сыростью, а твоё «эй!» возвращается гулким эхом.", "water", pic(g, "prop", "well"));
    g.sparkle(prop.x, prop.y - 40, 40); f.add("ch1_brunnen");
    yield F(g, "Видишь? Ты назвал колодец, и он ожил. Вот так здесь всё и устроено: есть у вещи имя, есть и цвет."); yield F(g, "Ой, кто-то идёт. Давай поздороваемся.");
    yield* omaArrives(g);
    return;
  }
  g.use("brunnen");
  yield g.narr(choice(["Der Brunnen. Снизу эхо: «…унен… унен…»", "Der Brunnen. Ты заглядываешь вниз. Оттуда на тебя смотрит кто-то лохматый. А, это же ты."]));
}
function* omaArrives(g) {
  const oma = ent(g, "oma"), bello = ent(g, "bello");
  g.flag("oma_came"); oma.visible = true; place(oma, 5, 11);
  oma.walkTo(9, 12); oma.walkTo(14, 13);
  yield new WaitWalk(oma);
  oma.face(g.player); g.player.face(oma); g.emote(oma, "!");
  yield g.say("oma", "<Hallo!>");
  yield g.narr("Седая старушка машет тебе рукой и улыбается во весь рот. От её слова в сером воздухе вспыхивают искорки.");
  yield g.spark("hallo", null, "wave", pic(g, "person", "oma"));
  yield* askUntil(g, "oma", "Старушка ждёт и прикладывает ладонь к уху.", ["<Hallo!>", "…промолчать"], 0,
    { 1: function* () { yield g.narr("Старушка наклоняется поближе, у глаз собираются добрые морщинки."); yield g.say("oma", "<Hal-lo?..> Ну же, скажи хоть словечко."); } });
  g.use("hallo"); g.color("oma"); g.audio.play("chime");
  yield g.narr("Ты отвечаешь, и старушка на глазах наливается цветом: красный платок, сиреневое платье, белый фартук.");
  yield g.say("oma", "Батюшки! Ты сказал «[hallo|привет]»! Значит, хоть одно слово ещё живо!");
  yield g.say("oma", "Я Ома Грета. «Ома» по-нашему значит «бабушка», вот меня все так и зовут.");
  yield g.say("oma", "Вчера ночью через деревню прошёл Немой Маг. Прошёл молча и унёс с собой все слова, до последнего.");
  yield g.say("oma", "А вещь, у которой нет имени, выцветает. Сам видишь: дома серые, деревья серые. И люди уже забывают, кто они такие.");
  yield F(g, "Здравствуйте, Ома. Я Искорка. Это я его разбудила.");
  yield g.say("oma", "Ох ты, огонёчек! Живой! Ну, раз вы вдвоём, мне уже спокойнее.");
  bello.wander = 0; g.audio.play("woof");
  yield g.walk(bello, 15, 14, 130);
  bello.face(oma);
  yield g.say("oma", "А вот и Белло, наш пёс. Тоже весь посерел, бедолага."); yield g.narr("Ома достаёт из кармана фартука горбушку и показывает её псу.");
  yield g.say("oma", "<Brot?>");
  g.audio.play("woof"); g.emote(bello, "heart");
  yield g.narr("Белло подпрыгивает и виляет хвостом изо всех сил. Ома кивает за него.");
  yield g.say("oma", "<Ja! Ja!>");
  yield g.spark("ja", null, "nod", pic(g, "animal", "dog"));
  yield g.narr("Потом Ома поднимает с земли камешек и протягивает его Белло.");
  yield g.say("oma", "<Stein?>");
  g.emote(bello, "…");
  yield g.narr("Белло фыркает и отворачивается. Ома мотает головой.");
  yield g.say("oma", "<Nein! Nein!>");
  yield g.spark("nein", null, "shake", g.art.get("rock"));
  yield F(g, "Понятно: хлеб — <ja>, камень — <nein>.");
  yield g.say("oma", "Ну а ты, голубчик? Голодный ведь, по глазам вижу.");
  const r = yield g.choice("oma", "<Brot?>", ["<Ja!>", "<Nein!>"], 0);
  if (r === 1) {
    g.audio.play("woof"); g.emote(bello, "heart");
    yield g.narr("Не успеваешь ты договорить, как Белло подпрыгивает и ловко выхватывает горбушку прямо у Омы из рук.");
    yield g.say("oma", "Ох, Белло, ну что ты будешь делать… Ничего, милый, у меня ещё есть. Только теперь скажи как надо.");
    yield g.choice("oma", "<Brot?>", ["<Ja!>"], 0);
  }
  g.use("ja");
  yield g.say("oma", "<Bitte!>");
  yield g.spark("bitte", "Ома протягивает тебе тёплый хлеб на раскрытой ладони: держи, это тебе.", null, pic(g, "prop", "bread"));
  yield g.narr("Корочка хрустит, мякиш ещё тёплый. И на душе вдруг тоже тепло.");
  yield g.spark("danke");
  yield* askUntil(g, "oma", "(Ома ждёт.)", ["<Danke!>", "<Nein!>", "<Hallo!>"], 0,
    { 1: "<Nein?!> Да ты уже жуёшь! Ха-ха!", 2: "<Hallo, hallo!> Так мы уж поздоровались, милый." });
  g.use("danke");
  yield g.say("oma", "<Bitte, bitte!> Ох, как же приятно снова слышать слова…");
  yield g.narr("Белло смотрит на твой хлеб так, будто от этого зависит вся его собачья жизнь.");
  const r2 = yield g.choice("think", "Поделиться с Белло?", ["<Bitte, Bello!>", "<Nein!>"], 0);
  if (r2 === 1) { g.emote(bello, "…"); yield g.narr("Белло так жалобно скулит, что через пару секунд ты сдаёшься."); }
  g.use("bitte"); g.color("bello"); g.audio.play("woof"); g.emote(bello, "heart");
  yield g.narr("Белло хватает хлеб и вдруг становится рыжим, с тёмными ушами! Похоже, он и сам удивился.");
  yield g.say("oma", "Ты посмотри! От доброго слова даже пёс раскрасился.");
  yield g.say("oma", "Ну, ступай, погуляй. Вон у пекарни, справа от колодца, дети играют. Познакомься с ними.");
  yield g.say("oma", "Только попрощаться не забудь, ладно?");
  bello.wander = 2; bello.home = [bello.x, bello.y];
  g.flag("oma_bread");
  g.goal("Иди к детям справа от колодца.");
}
function* omaTschuess(g) {
  const oma = ent(g, "oma"); oma.face(g.player);
  yield g.say("oma", "Эй, милый! Куда же ты, даже не попрощался?");
  yield g.narr("Ома машет тебе рукой, но уже не «здравствуй», а «до встречи».");
  yield g.say("oma", "<Tschüss!>");
  yield g.spark("tschuess", null, null, pic(g, "person", "oma"));
  yield* askUntil(g, "oma", "<Tschüss!>", ["<Tschüss, Oma!>", "<Hallo, Oma!>"], 0, { 1: "<Hallo?> Мы же прощаемся, а не здороваемся! Ха-ха." });
  g.use("tschuess"); g.emote(oma, "heart"); g.flag("ch1_done");
  oma.walkTo(7, 11);
  yield* chapterDone(g, 1);
  g.goal("Подойди к детям справа от колодца.", "Глава 2 · Ich bin…");
}

// ------------------------------------------------------------------ chapter 2: who am I
function* talkKids(g, e) {
  const f = g.flags, paul = ent(g, "paul");
  if (!f.has("ch1_done")) {
    yield g.narr("Мальчик и девочка молча перекидываются серым мячом. Смотрят на тебя с любопытством, но ничего не говорят.");
    if (f.has("oma_bread")) yield F(g, "Кажется, мы забыли попрощаться с Омой. Давай сначала к ней.");
    return;
  }
  if (!f.has("ch2_done")) { yield* ch2(g); return; }
  const [sp, line] = choice([["paul", "<Wer bist du?>"], ["anna", "<Hallo, {name}!> Мы играем в «кто ты?». Будешь с нами?"]]);
  yield g.say(sp, line);
  const r = yield g.choice(sp, "<Wer bist du?>", ["<Ich bin {name}!>", "<Du bist {name}!>", "<Ich bist {name}!>"], 0);
  if (r === 0) { g.use("ich"); g.use("bin"); g.emote(paul, "heart"); yield g.say("anna", "<Ja!> А я <ich bin Anna!> А он <du bist Paul!>"); }
  else if (r === 1) yield g.say("paul", "Ха-ха! «<Du bist {name}>» — это ты мне сказал, что я {name}! Про себя надо говорить <ich bin>.");
  else yield g.say("anna", "Почти! Только «<ich>» дружит с «<bin>»: <ich bin>. А «<bist>» дружит с «<du>»: <du bist>.");
}
function* ch2(g) {
  const paul = ent(g, "paul"), anna = ent(g, "anna");
  paul.face(g.player); anna.face(g.player);
  yield startChapter(g, 2, "Я…");
  g.goal("", "Глава 2 · Ich bin…");
  yield g.say("anna", "<Hallo!>");
  yield g.choice("anna", "<Hallo!>", ["<Hallo!>"], 0);
  g.use("hallo");
  yield g.narr("Девочка прикладывает ладонь к груди, как будто показывает: это я.");
  yield g.say("anna", "<Ich bin Anna.>");
  g.color("anna");
  yield g.spark("ich", null, null, pic(g, "person", "anna"));
  yield g.narr("Мальчик гордо стучит себя кулаком в грудь, прямо как рыцарь перед боем.");
  yield g.say("paul", "<Ich bin Paul!>");
  g.color("paul");
  yield g.spark("bin", null, null, pic(g, "person", "paul"));
  yield g.narr("Анна показывает пальцем на Пауля.");
  yield g.say("anna", "<Du bist Paul.>");
  yield g.spark("du");
  yield g.narr("Пауль показывает на Анну и хихикает.");
  yield g.say("paul", "<Und du bist Anna!>");
  yield g.spark("bist");
  yield g.narr("И тут оба поворачиваются к тебе, поднимают брови и склоняют головы набок.");
  yield g.say("anna", "<Wer bist du?>");
  yield g.spark("wer", null, null, pic(g, "person", "hero"));
  yield g.think("А кто я?.. Не помню!");
  yield F(g, "Он не помнит. Маг унёс и его имя.");
  yield g.say("paul", "Тогда давай придумаем тебе имя! Какое тебе нравится?");
  const name = yield new NameEntry("Мика");
  g.name = name; g.portraitCache = {};
  yield F(g, `${name}… Красиво. А теперь скажи его так, как говорят здесь.`);
  yield new Sentence("Положи руку на грудь и скажи детям, кто ты.", ["Ich", "bin", name], ["du", "bist"], big2(g.art.peopleGrey.hero.down[0]));
  g.color("hero"); g.sparkle(g.player.x, g.player.y - 30, 60); g.audio.play("chime");
  yield g.narr("Ты называешь своё имя, и к тебе возвращаются краски: руки, шарф, румянец на щеках. Теперь ты точно есть.");
  yield F(g, "Вот теперь ты совсем настоящий.");
  yield g.say("anna", "<Du bist {name}!>");
  yield g.say("paul", "<Hallo, {name}!> Слушай, тебя Ома звала. Она у своего дома, слева от колодца. <Tschüss!>");
  g.use("tschuess"); g.flag("ch2_done");
  yield* chapterDone(g, 2);
  g.goal("Ома ждёт у своего дома, слева от колодца.", "Глава 3 · Das Haus");
}

// ------------------------------------------------------------------ chapter 3: Oma's house
function* talkOma(g, e) {
  const f = g.flags;
  if (!f.has("oma_bread")) { yield g.say("oma", "<Hallo!>"); return; }
  if (!f.has("ch1_done")) { yield g.say("oma", "Иди, иди, погуляй. Только попрощаться не забудь!"); return; }
  if (!f.has("ch2_done")) { yield g.say("oma", "Дети у пекарни, справа от колодца. Иди познакомься, не стесняйся."); return; }
  if (!f.has("ch3")) {
    yield startChapter(g, 3, "Дом и вещи");
    g.flag("ch3");
    yield g.say("oma", "<Hallo, {name}!> Какое хорошее имя. Тебе идёт.");
    yield g.say("oma", "Пойдём ко мне в гости, я тебя чаем напою. Только дом у меня тоже посерел, бедный. Даже дверь не открывается.");
    yield g.say("oma", "Потрогай его. Может, он вспомнит, как его зовут.");
    g.goal("Потрогай дом Омы.");
    return;
  }
  yield g.say("oma", g.known.haus ? "Заходи, заходи, не стесняйся." : "Потрогай дом, милый. Он ждёт.");
}
function* touchHouse(g, prop) {
  const f = g.flags;
  if (!f.has("ch3")) { yield g.think("Серый дом. Даже дым из трубы серый."); return; }
  if (!g.known.haus) {
    yield g.spark("haus", "Ты прислоняешься к стене. Здесь живут: топят печку, пекут хлеб. Стены хранят тепло, как ладони.", null, pic(g, "prop", "house_oma"));
    g.sparkle(prop.x, prop.y - 50, 40);
    return;
  }
  if (!g.known.tuer) {
    yield g.narr("Стучишь: тук-тук. Толкаешь тёплое дерево, петли скрипят, и дверь открывается.");
    yield g.spark("tuer", null, "door");
  }
  yield* travel(g, "oma_house", [10, 12], "up");
}
function* houseIntro(g) {
  const oma = ent(g, "oma");
  oma.face(g.player);
  yield g.say("oma", "Ну вот мы и дома. Только видишь, всё серое, как в погребе.");
  yield g.say("oma", "Вот хлеб на столе, ведро с водой, яблоки, цветок на окне. И кошка моя, Мими.");
  yield g.say("oma", "Потрогай их, понюхай, послушай. Глядишь, они сами вспомнят, как их зовут.");
  yield F(g, "А я подскажу: где слово ждёт, там искрится.");
  g.goal(`Потрогай вещи в доме (там, где искорки): ${countKnown(g, HOUSE_WORDS)} из ${HOUSE_WORDS.length}`);
}
function* hatsTalk(g) {
  g.flag("hats");
  yield g.say("oma", "Ага! Видишь шапочку над словом? У каждого немецкого имени своя шапочка.");
  yield g.say("oma", "Синяя — <der>, красная — <die>, зелёная — <das>. Как у людей: кто в какой ходит.");
  yield g.say("oma", "Специально это не учи, просто примечай. Вот [hund|пёс] Белло, к примеру, в синей. А [katze|кошка] Мими в красной.");
}
const HOUSE_FEEL = {
  bread: [null, null, "Ома: «Ешь, ешь, не стесняйся»."],
  bucket_in: ["Опускаешь руку в ведро. Ух, прохладная! Делаешь глоток, и в горле сразу свежо.", "water", "Ома: «Это из нашего колодца. Вкусная, правда?»"],
  apple: ["Берёшь со стола что-то круглое, гладкое, увесистое. Хрум! Сладко и чуточку кисло.", null, "Ома: «Это с моей яблоньки. В этом году сладкие уродились»."],
  flower: [null, null, "Ома: «Я его каждое утро поливаю. А он мне за это пахнет»."],
};
function* touchHouseThing(g, prop) {
  const key = prop.word, [feel, eff, after] = HOUSE_FEEL[prop.name];
  if (g.known[key]) { g.use(key); yield g.narr(`<${withArticle(key)}>. ` + choice(["Всё на месте.", "Ты киваешь ему, как старому знакомому.", "Ома улыбается: запомнил."])); return; }
  yield g.spark(key, feel, eff, pic(g, "prop", prop.frameKey(0)));
  g.sparkle(prop.x, prop.y - 30, 36);
  if (!g.has("hats") && WORDS[key].art) yield* hatsTalk(g);
  else if (after) yield g.narr(after);
}
function* talkMimi(g, e) {
  g.audio.play("meow");
  if (!g.known.katze) {
    yield g.narr("Мягкая серая спинка выгибается под рукой. Мрр… Коготки цепляются за рукав.");
    yield g.spark("katze", null, "cat", pic(g, "animal", "cat"));
    yield g.say("oma", "Это она так здоровается. Она у меня с характером, но добрая.");
    if (!g.has("hats")) yield* hatsTalk(g);
    return;
  }
  g.use("katze");
  yield g.narr(choice(["[katze|Кошка] Мими жмурится. Мрр.", "Мими делает вид, что тебя тут нет. Ну [katze|кошка] как кошка.", "Мими трётся о твою ногу и уходит по своим делам."]));
}
function* talkOmaHouse(g, e) {
  const f = g.flags;
  if (!f.has("house_all")) {
    const left = HOUSE_WORDS.filter(k => !g.known[k]).length;
    yield g.say("oma", choice([`Ещё ${left}. Ищи там, где искрится. Я не тороплю.`, "Трогай, трогай, не бойся. Тут всё своё."]));
    return;
  }
  if (!f.has("ch3_done")) { yield* ch3End(g); return; }
  yield g.say("oma", choice(["<Brot?> Бери, бери, я много напекла.", "[katze|Кошка] опять на моей подушке спит. Ну что с ней поделаешь.", "Знаешь, что я поняла? Слова как [brot|хлеб]: их надо есть свежими и каждый день понемножку."]));
}
function* ch3End(g) {
  yield g.say("oma", "Ох! Слышишь? Дом опять зазвучал. Даже чайник засвистел.");
  yield g.say("oma", "А ну-ка, проверим. Я показываю, ты называешь. Как в детстве играли.");
  const quiz = [["apfel", ["<der Apfel>", "<das Brot>", "<die Katze>"], 0], ["katze", ["<der Brunnen>", "<die Katze>", "<die Blume>"], 1], ["wasser", ["<das Haus>", "<die Tür>", "<das Wasser>"], 2]];
  for (const [key, opts, right] of quiz) {
    while (true) {
      const r = yield g.choice("oma", "<Was ist das?>", opts, right, iconBig(g, key));
      if (r === right) { g.use(key); g.audio.play("ok"); break; }
      yield g.say("oma", choice(["Ха! Ты, видно, голодный. Глянь-ка получше!", "<Nein, nein!> Присмотрись ещё разок.", "Почти! Только шапочка не та."]));
    }
  }
  yield g.say("oma", "<Ja! Ja! Ja!> Вот умница!");
  yield g.say("oma", "А теперь у меня к тебе просьба. Фермер Клаус с утра кричит на всю деревню: у него разбежались эти… ну… кудрявые.");
  yield g.say("oma", "Его поле сразу за площадью, направо по дороге. Сходи к нему, а? <Bitte!>");
  yield F(g, "Пойдём. Я дорогу запомнила.");
  g.flag("ch3_done");
  yield* chapterDone(g, 3);
  g.goal("Выйди из дома и иди по дороге направо, на поле.", "Глава 4 · Eins, zwei, drei");
}

// ------------------------------------------------------------------ chapter 4: the field
function* talkKlaus(g, e) {
  const f = g.flags;
  if (!f.has("ch4")) { yield* ch4Start(g); return; }
  if (!f.has("ch4_done")) {
    const n = [1, 2, 3, 4, 5].filter(i => f.has(`sheep${i}_in`)).length;
    if (n >= 5) { yield* ch4End(g); return; }
    yield g.say("klaus", choice([`Уже ${n}! Остальные где-то на поле бродят.`, "Подойди к [schaf|овце], она тебя послушается и сама пойдёт домой."]));
    return;
  }
  yield g.say("klaus", choice(["<Eins, zwei, drei, vier, fünf…> И ещё одна. Все дома. Каждый вечер пересчитываю.", "Мои [schaf:Schafe|овцы] теперь сытые и довольные. И я с ними."]));
  yield new Count(choice(["apple", "bread", "hay"]), randInt(2, 5), "ask");
  yield g.say("klaus", "<Ja!> Считаешь, как настоящий фермер!");
}
function* ch4Start(g) {
  yield startChapter(g, 4, "Числа");
  g.flag("ch4");
  yield g.say("klaus", "<Hallo!> Ох, беда, беда!");
  g.color("klaus");
  yield g.say("klaus", "Ты меня понимаешь?! Вот хорошо! А то все молчат, как рыбы.");
  yield g.say("klaus", "Мои эти… ну, кудрявые… Да сам погляди!");
  yield g.narr("В загоне стоит одна-единственная овечка. Шерсть тёплая, кудрявая, пахнет сеном. Мээ!");
  yield g.spark("schaf", null, "sheep", pic(g, "animal", "sheep"));
  g.color("sheep0");
  yield g.say("klaus", "<Ja!> [schaf:Schafe|Овцы]! Было шесть, осталась одна. Как только слова пропали, они забыли, что забор — это забор, и разбрелись по полю.");
  yield g.say("klaus", "Подойди к [schaf|овце], она тебя послушается и пойдёт в загон. А я буду считать.");
  g.goal("Подходи к [schaf:Schafen|овцам] на поле — они пойдут в загон: 0 из 5");
}
function sheepRun(g, s) { s.wander = 0; s.solid = false; s.path = []; s.speed = 120; s.walkTo(27, 13); s.walkTo(27, 9); }
function* talkSheep(g, e) {
  const f = g.flags; g.audio.play("baa");
  if (e.name === "sheep0" || !f.has("ch4") || f.has(e.name + "_in")) { yield g.narr("Мээ! " + (g.known.schaf ? "[schaf|Овца] жуёт и смотрит на тебя добрыми глазами." : "Овца жуёт и смотрит на тебя.")); return; }
  if (e.name === "sheep5" && !f.has("bello_helped")) {
    f.add("stubborn_seen");
    g.emote(e, "!");
    e.walkTo(tileOf(e)[0] - 3, tileOf(e)[1]);
    yield g.narr("Эта овца смотрит на тебя и пятится. Ты подходишь ближе, а она отходит ещё дальше.");
    yield F(g, "Упрямая. Может, Белло поможет? Он рядом с Клаусом.");
    g.goal("Упрямая овца не идёт. Позови Белло.");
    return;
  }
  g.emote(e, "heart");
  yield g.narr("[schaf|Овца] радостно блеет и трусит к загону.");
  sheepRun(g, e);
  yield new WaitWalk(e);
  yield* sheepHome(g, e);
}
function* sheepHome(g, s) {
  const i = +s.name.slice(5);
  g.flag(`sheep${i}_in`); s.home = [s.x, s.y]; s.wander = 2;
  const n = [1, 2, 3, 4, 5].filter(j => g.has(`sheep${j}_in`)).length;
  const key = ["eins", "zwei", "drei", "vier", "fuenf"][n - 1];
  g.emote(s, String(n));
  yield g.say("klaus", `<${cap(WORDS[key].de)}!>`);
  if (!g.known[key]) {
    const feel = { eins: "Клаус загибает палец. Одна дома.", zwei: "Два пальца. Две овцы бодаются лбами: привет, подружка!", drei: "Три пальца. Клаус уже не кричит, а только ворчит под нос.",
      vier: "Четыре пальца. Клаус улыбается в бороду. Почти.", fuenf: "Вся пятерня! Клаус машет раскрытой ладонью: пять!" }[key];
    yield g.spark(key, feel, null, pic(g, "animal", "sheep"), true);
  }
  g.goal(n >= 5 ? "Все [schaf:Schafe|овцы] дома! Поговори с Клаусом." : `Подходи к [schaf:Schafen|овцам] на поле — они пойдут в загон: ${n} из 5`);
}
function* talkBelloField(g, e) {
  g.audio.play("woof");
  if (!g.known.hund) {
    yield g.narr("Белло тычется мокрым носом тебе в ладонь, а хвост так и ходит ходуном. Гав!");
    yield g.spark("hund", null, "dog", pic(g, "animal", "dog"));
  }
  if (g.has("stubborn_seen") && !g.has("bello_helped")) {
    g.flag("bello_helped");
    yield F(g, "Покажи ему на овцу. Он поймёт.");
    yield g.narr("Ты показываешь на упрямую овцу. Белло срывается с места, обегает её кругом, гавкает разок, и овца сама трусит к загону.");
    const s = ent(g, "sheep5");
    e.walkTo(tileOf(s)[0] - 1, tileOf(s)[1], 160);
    sheepRun(g, s);
    yield new WaitWalk(s);
    e.walkTo(21, 13, 120);
    yield* sheepHome(g, s);
    yield g.say("klaus", "Вот это [hund|пёс]! Настоящий пастух!");
    return;
  }
  g.use("hund");
  yield g.narr(choice(["[hund|Пёс] Белло плюхается на спину: чеши пузо!", "Белло нюхает твой карман. Там когда-то был [brot|хлеб]."]));
}
function* touchFieldTree(g, prop) {
  if (!g.known.baum && g.has("ch4")) {
    yield g.narr("Из-за дерева кто-то шумно жуёт. Ты задираешь голову: кора шершавая, а листва шумит где-то высоко-высоко.");
    yield g.spark("baum", null, null, pic(g, "prop", "tree1"));
    const s = ent(g, "sheep4");
    if (!g.has("sheep4_in")) {
      g.flag("sheep4_out"); s.visible = true; place(s, 13, 19);
      g.audio.play("baa"); g.emote(s, "!");
      yield g.narr("Из-за ствола выходит овца с полным ртом листьев. Смотрит на тебя, жуёт… и спокойно идёт к загону, будто так и было задумано.");
      sheepRun(g, s);
      yield new WaitWalk(s);
      yield* sheepHome(g, s);
    }
    return;
  }
  g.use("baum");
  yield g.narr("Der Baum. В тени тихо и прохладно.");
}
function* ch4End(g) {
  yield g.say("klaus", "Все дома! Все до единой! Давай-ка пересчитаем вместе, для верности.");
  yield new Count("sheep", 5, "show", true);
  yield g.say("klaus", "<Ja!> А теперь ты. Я показываю, ты считаешь.");
  for (const [img, n] of [["apple", 3], ["hay", 4]]) while (true) { const ok = yield new Count(img, n, "ask"); if (ok) break; }
  yield g.say("klaus", "<Danke, {name}! Danke, danke!>");
  yield g.narr("Клаус крепко жмёт тебе руку. Ладонь у него шершавая и тёплая.");
  yield g.say("klaus", "Слушай, есть у нас Лотте, художница. Её мастерская наверху, за площадью. Без красок она совсем загрустила.");
  yield g.say("klaus", "Загляни к ней, а? <Bitte!>");
  g.flag("ch4_done");
  yield* chapterDone(g, 4);
  g.goal("Вернись на площадь и иди вверх, к мастерской Лотте.", "Глава 5 · Rot, blau, grün");
}

// ------------------------------------------------------------------ chapter 5: colours
const POT_FEEL = {
  rot: ["Макаешь палец в горшочек. Тепло, как от огня, и сладко, как от яблока. Щёки так и горят.", "warm"],
  blau: ["Палец уходит во что-то прохладное и глубокое, как небо или вода в колодце.", "cold"],
  gruen: ["Пахнет свежескошенной травой. Мягко, как мох под босыми ногами.", null],
  gelb: ["Солнце бьёт в глаза, приходится щуриться. Коже тепло, как в полдень.", "light"],
  weiss: ["Чистое и лёгкое, как облако, как молоко, как первый снег.", null],
};
const PAINT_TARGET = { rot: "<Das Haus ist rot!>", gruen: "<Der Baum ist grün!>", gelb: "<Die Blume ist gelb!>", weiss: "<Das Schaf ist weiß!>", blau: "<Das Wasser ist blau!>" };
const PAINT_SEE = {
  rot: "Лотте взмахивает кистью, и на холсте вспыхивают красные крыши.",
  gruen: "Кисть свистит, и на холсте зеленеют деревья.",
  gelb: "Лотте брызгает жёлтым, и по холсту рассыпаются цветы.",
  weiss: "Белый мазок, и на холсте пасутся облачные овцы.",
  blau: "Последний мазок синим через всё небо. Лотте отступает на шаг… и цвет срывается с холста!",
};
const WRONG_POT = {
  rot: "Лотте не глядя ведёт кистью, и у нарисованного Клауса краснеет нос. Она смеётся: «Ну, вообще-то похоже».",
  gruen: "Мазок зелёным, и нарисованная Ома вдруг позеленела. «Ой. Давай ей не будем это показывать».",
  gelb: "Жёлтая клякса посреди неба. «Ладно, пусть будет второе солнце».",
  weiss: "Белый мазок, и нарисованный Белло стал похож на привидение. Настоящий Белло где-то за окном обиженно гавкает.",
  blau: "Синий мазок, и нарисованное яблоко стало как слива. «Ну и ладно, сливы тоже вкусные».",
};
function* talkLotte(g, e) {
  const f = g.flags;
  if (!f.has("ch5")) { yield* ch5Start(g); return; }
  if (!f.has("ch5_pots")) { yield g.say("lotte", "Потрогай горшочки на полке, все пять. Почувствуй их…"); return; }
  if (f.has("ch5_done")) { yield g.say("lotte", choice(["<Das Haus ist rot. Der Baum ist grün.> Какое же это счастье, просто смотреть!", "Хочешь, нарисую тебя? Шарф <gelb>, рубашка <blau>. А весь ты <bunt>, то есть пёстрый!"])); return; }
  const want = PAINT_ORDER.find(c => !f.has("paint_" + c)), carry = g.player.carry;
  if (!carry) { yield g.say("lotte", `<Bring mir ${cap(WORDS[want].de)}!>`); yield g.narr("Лотте показывает на горшочки, а потом на свою кисть: принеси, мол."); return; }
  g.player.carry = null;
  if (carry !== want) {
    g.audio.play("wrong"); g.reportAnswer(false, want);
    yield g.narr(WRONG_POT[carry]);
    yield g.say("lotte", `Это было <${WORDS[carry].de}>. А мне нужен <${WORDS[want].de}>! <Bring mir ${cap(WORDS[want].de)}!>`);
    return;
  }
  g.use(want); g.audio.play("paint"); g.reportAnswer(true, want);
  yield* paintScene(g, want);
}
function* ch5Start(g) {
  yield startChapter(g, 5, "Цвета");
  g.flag("ch5");
  yield g.narr("Девушка в берете сидит перед пустым серым холстом. Кисть в руке, а рисовать нечем.");
  yield g.say("lotte", "<Hallo…>");
  yield g.say("lotte", "Краски-то у меня остались, видишь горшочки на полке? Маг их не тронул, краска ведь не слово.");
  yield g.say("lotte", "А вот названия цветов он унёс. И без них я ни капли смешать не могу, кисть не слушается.");
  yield g.say("lotte", "Потрогай каждый горшочек, почувствуй цвет. Может, название и вернётся.");
  g.goal("Потрогай краски на полке: 0 из 5");
}
function* touchPot(g, prop) {
  const f = g.flags, c = prop.name.slice(4);
  if (!f.has("ch5")) { yield g.think("Горшочки с краской. Единственное яркое пятно во всей серой мастерской."); return; }
  if (!g.known[c]) { yield g.spark(c, POT_FEEL[c][0], POT_FEEL[c][1], g.art.get(prop.img)); return; }
  if (f.has("ch5_pots") && !f.has("ch5_done")) {
    if (f.has("paint_" + c)) { yield g.narr(`Горшочек почти пустой. <${WORDS[c].de}> уже на холсте.`); return; }
    g.player.carry = c; g.audio.play("tick");
    yield g.narr(`Ты берёшь горшочек. <${cap(WORDS[c].de)}!>`);
    return;
  }
  yield g.narr(`<${WORDS[c].de}>. ${POT_FEEL[c][0].split(".")[0]}.`);
}
function paintStep(g, c, quiet) { g.flags.add("paint_" + c); }
function* paintScene(g, c) {
  paintStep(g, c);
  yield g.say("lotte", PAINT_TARGET[c]);
  if (!g.known.ist) {
    yield g.narr("Лотте показывает кистью на нарисованный дом, потом на краску. «Ist» будто склеивает их вместе: вещь и её цвет.");
    yield g.spark("ist");
  }
  g.audio.play("chime");
  yield g.narr(PAINT_SEE[c]);
  const left = PAINT_ORDER.filter(x => !g.has("paint_" + x));
  if (left.length) {
    yield g.say("lotte", `<Ja!> А теперь… <Bring mir ${cap(WORDS[left[0]].de)}!>`);
    g.goal(`Принеси Лотте краску: <${WORDS[left[0]].de}>`);
    return;
  }
  g.shake = 1; g.audio.play("word");
  colorGroup(g, "village"); g.color("lotte");
  for (let i = 0; i < 6; i++) g.sparkle(g.player.x + uniform(-300, 300), g.player.y + uniform(-200, 150), 25);
  yield g.narr("Краска срывается с холста, как стая птиц, и разлетается по деревне: на крыши, деревья, заборы, овец. Где-то вдалеке радостно блеют [schaf:Schafe|овцы].");
  g.flag("ch5_done");
  yield g.say("lotte", "<Danke, danke, {name}!> Деревня снова цветная! Ты только посмотри!");
  yield F(g, "Как красиво… Я и не знала, что всё вокруг такое яркое.");
  yield g.say("lotte", "А тебе теперь к реке. Опа Ульрих ждёт тебя на причале, внизу за площадью. Он хочет научить тебя чему-то новому.");
  yield* chapterDone(g, 5);
  g.goal("Вернись на площадь и иди вниз, к реке.", "Глава 6 · Geh! Spring!");
}

// ------------------------------------------------------------------ chapter 6: the pier and the raft
function* talkOpa(g, e) {
  const f = g.flags;
  if (!f.has("ch6")) { yield* ch6Pier(g); return; }
  yield g.say("opa", "Садись на плот, поплывём.");
  yield* ch6Raft(g);
}
function* ch6Pier(g) {
  yield startChapter(g, 6, "Слова-заклинания");
  g.flag("ch6"); g.flags.add("col:opa");
  yield g.say("opa", "<Hallo, {name}.> Я давно за тобой приглядываю.");
  yield g.say("opa", "Ты вернул имена вещам, а деревне вернул краски. Только вещи — это пол-языка.");
  yield g.say("opa", "Вторая половина — движение. Слова, от которых тело само начинает двигаться. Смотри на меня и повторяй.");
  yield g.narr("Опа делает шаг вперёд, потом ещё один.");
  yield g.say("opa", "<Geh!>");
  yield g.spark("gehen");
  yield g.narr("Теперь Опа поворачивается в ту сторону, где сердце.");
  yield g.say("opa", "<Links!>");
  yield g.spark("links");
  yield g.narr("А теперь в другую, туда, где рука, которой пишешь.");
  yield g.say("opa", "<Rechts!>");
  yield g.spark("rechts");
  yield g.narr("Опа приседает, колени пружинят, и он подпрыгивает. Доски причала тихонько скрипят.");
  yield g.say("opa", "<Spring!>");
  yield g.spark("springen", null, "jump");
  yield g.narr("А потом замирает. Совсем. Даже борода не шелохнётся.");
  yield g.say("opa", "<Halt!>");
  yield g.spark("halt");
  yield g.narr("И вдруг срывается с места и бегает вокруг тебя, придерживая шляпу.");
  yield g.say("opa", "<Lauf! Lauf!>");
  yield g.spark("laufen");
  yield g.say("opa", "Теперь ты. Я командую, а ты делай. Голову можно не включать, тело само поймёт.");
  yield new OpaSays(["links", "rechts", "gehen", "springen", "halt", "laufen"], 5, true);
  yield g.say("opa", "А теперь без подсказок. Только уши и тело.");
  yield new OpaSays(["links", "rechts", "gehen", "springen", "halt", "laufen"], 5, false);
  g.abilities.add("springen"); g.abilities.add("laufen");
  g.toast(g.touch ? "Кнопка «прыжок» — spring!" : "ПРОБЕЛ — прыжок (spring!)");
  g.toast(g.touch ? "Кнопка «бег» — lauf!" : "SHIFT — бег (lauf!)");
  yield g.say("opa", "<Sehr gut!> Тело понимает быстрее головы. Так язык и растёт.");
  yield* ch6Raft(g);
}
function* ch6Raft(g) {
  yield g.say("opa", "Садись на плот. Поплывём вниз по реке, к лугу. Река быстрая, так что я буду кричать, а ты делай. А потом я замолчу, и дальше ты сам.");
  yield F(g, "Я сяду тебе на плечо. Так мне не страшно.");
  const hits = yield new RaftRide();
  if (hits <= 2) yield g.say("opa", "<Super!> Ни разу не намокли!");
  else if (hits <= 5) yield g.say("opa", "Немножко промокли, зато доплыли. Для первого раза очень хорошо.");
  else yield g.say("opa", "Ну, искупались мы с тобой как следует. Ничего, тело запомнило, а это главное.");
  yield g.narr("Впереди шлюз. Тяжёлые деревянные ворота перегородили реку. Маг запечатал их тишиной.");
  yield g.say("opa", "Но есть слово, которое открывает. Смотри.");
  yield g.narr("Опа кладёт ладонь на ворота и легонько толкает. Щёлк! В щель пробивается свет.");
  yield g.say("opa", "<Öffne!>");
  yield g.spark("oeffnen", null, "door");
  yield* askUntil(g, "opa", "Теперь ты. Скажи воротам.", ["<Öffne!>", "<Halt!>", "<Spring!>"], 0, {
    1: "Ворота и так стоят. Тут нужно другое слово.",
    2: function* () { g.shake = 0.4; g.audio.play("splash"); yield g.narr("Ты подпрыгиваешь, плот качается, Опа хватается за шляпу."); yield g.say("opa", "Прыгать ты уже умеешь, это хорошо. Но ворота так не открыть."); },
  });
  g.use("oeffnen"); g.audio.play("door");
  yield g.narr("Ворота распахиваются, и плот выносит на солнечный луг.");
  g.flag("ch6_done");
  yield* travel(g, "meadow", [16, 26], "up");
  yield g.say("opa", "Дальше пешком. За лугом скалы и лес, а за лесом, за рекой, стоит башня Немого Мага.");
  yield g.say("opa", "Слушай своё тело, {name}. Оно подскажет слова. <Tschüss!>");
  yield* askUntil(g, "opa", "<Tschüss!>", ["<Tschüss, Opa!>", "<Hallo, Opa!>"], 0, { 1: "<Hallo?> Мы же прощаемся. Ну-ка, ещё разок." });
  g.abilities.add("springen"); g.abilities.add("laufen");
  yield* chapterDone(g, 6);
  yield startChapter(g, 7, "Что чувствует тело");
  g.goal(g.touch ? "Иди на север. Через ручей — кнопка «прыжок»." : "Иди на север. Через ручей — ПРОБЕЛ.", "Глава 7 · Heiß und kalt");
}

// ------------------------------------------------------------------ chapter 7: the meadow and the cave
function* ch7Feel(g) {
  g.flag("ch7_feel");
  yield g.narr("Слева от тропинки трещит костёр, справа булькает родник. От одного тянет жаром, от другого холодом.");
  yield F(g, "Чувствуешь? С одной стороны тепло, с другой холодно. Давай потрогаем и то, и другое.");
  g.goal("Потрогай костёр и родник у тропинки.");
}
function meadowGoal(g) { if (g.known.heiss && g.known.kalt && !g.known.klein) g.goal("Иди по тропинке к изгороди. Ищи, где искрится."); }
function* touchMeadow(g, prop) {
  const f = g.flags, p = g.player, n = prop.name;
  if (n === "fire") {
    if (!g.known.feuer) {
      yield g.narr("Костёр. Кто-то развёл его и ушёл. Трещит, искры летят вверх, пахнет дымом и печёной картошкой.");
      yield g.spark("feuer", null, "warm", pic(g, "prop", "fire1"));
      yield g.narr("Ты тянешь руку всё ближе и ближе. Жаром обдаёт ладонь, и пальцы сами отдёргиваются!");
      g.shake = 0.25;
      yield g.spark("heiss", null, "warm");
      yield* askUntil(g, "think", "Ай! Как это сказать?", ["<Heiß!>", "<Kalt!>"], 0, { 1: "Холодно?! Да у тебя пальцы до сих пор горят!" });
      g.use("heiss");
      yield g.say("hero", "<Das Feuer ist heiß!>");
      yield F(g, "Ты сказал целую фразу! Сам, даже не заметил как.");
      meadowGoal(g); return;
    }
    g.use("feuer"); yield g.narr("<Das Feuer ist heiß.> Греешь ладони. Не слишком близко."); return;
  }
  if (n === "icewater") {
    if (!g.known.kalt) {
      yield g.narr("Родник. [wasser|Вода] прозрачная, голубоватая. Зачерпываешь её ладонями и пьёшь…");
      p.shiver = 2;
      yield g.spark("kalt", null, "cold", pic(g, "prop", "icewater"));
      yield* askUntil(g, "think", "Бр-р-р! Какая вода?", ["<Das Wasser ist kalt!>", "<Das Wasser ist heiß!>"], 0, { 1: "Горячая?! У тебя зуб на зуб не попадает!" });
      g.use("kalt"); g.use("wasser");
      yield F(g, "Бр-р. Я к воде лучше близко не подлетаю.");
      meadowGoal(g); return;
    }
    p.shiver = 1; g.use("kalt"); yield g.narr("<Kalt! Kalt!> Зубы стучат, зато вкусно."); return;
  }
  if (n.startsWith("mush_blue")) {
    if (!g.known.kalt || !g.known.heiss) { yield F(g, "Подожди с грибами. Сначала костёр и родник: пусть тело узнает, что такое жар и холод."); return; }
    g.audio.play("shrink"); p.size = "small"; p.targetScale = 0.55;
    f.delete("small_from_s"); f.delete("small_from_n"); f.add(p.y > 15 * TILE ? "small_from_s" : "small_from_n");
    if (!g.known.klein) {
      yield g.narr("Синий гриб пахнет мятой. Ты откусываешь кусочек, и мир вокруг начинает расти!");
      yield g.spark("klein", null, "small", pic(g, "prop", "mushroom_blue"));
      yield F(g, "Ты стал совсем маленький! Скорее в ту дыру в изгороди, пока не вырос обратно.");
      g.goal("Пролезь в дыру в изгороди, пока ты <klein>.");
    } else { g.use("klein"); yield g.think("<Ich bin klein!> Мир снова огромный."); }
    return;
  }
  if (n === "mush_red") {
    g.audio.play("grow"); p.size = "big"; p.targetScale = 1.5;
    if (!g.known.gross) {
      yield g.narr("Красный гриб в белую крапинку. Жжётся на языке, как перец! Плечи раздаются вширь, голова выше кустов…");
      g.shake = 0.4;
      yield g.spark("gross", null, "big", pic(g, "prop", "mushroom_red"));
      yield F(g, "Ого, какой ты стал! Теперь попробуй сдвинуть тот валун.");
      g.goal("Ты <groß>! Сдвинь валун впереди.");
    } else { g.use("gross"); yield g.think("<Ich bin groß!>"); }
    return;
  }
  if (n === "lantern") {
    if (!g.known.dunkel) { yield g.think("Старый фонарь у входа в пещеру. Пригодится?"); return; }
    yield g.narr("Нащупываешь холодный металл. Фонарь! Чирк, и огонёк дрожит, разгорается, заливает светом ладони…");
    g.lantern = true; f.add("lantern"); prop.visible = false;
    yield g.spark("hell", null, "light", [g.art.get("lantern_on"), g.art.get("lantern")]);
    yield F(g, "Как светло! Теперь видно каждый камешек. Пойдём через пещеру.");
    g.goal("Пройди через пещеру на север.");
  }
}
function* sizeBack(g, text) {
  g.player.size = "normal"; g.player.targetScale = 1; g.flags.delete("small_from_s"); g.flags.delete("small_from_n");
  g.audio.play("whoosh");
  yield g.narr(text);
}
function pushBoulder(g) {
  return (function* () {
    yield g.narr("Упираешься плечом в валун. Он скрипит, качается и катится в сторону, ломая кусты!");
    const b = g.world.propByName.boulder;
    g.world.removeFoot(b); g.shake = 0.6; g.audio.play("stone");
    for (let i = 0; i < 12; i++) { b.x += 9; b.y += 2; yield g.wait(0.04); }
    b.visible = false; g.flags.add("boulder_gone"); g.audio.play("land");
    yield g.say("hero", "<Ich bin groß!>");
    yield* sizeBack(g, "Сила уходит. Ты снова обычного роста. Впереди чернеет вход в пещеру.");
    g.goal("Зайди в пещеру.");
  })();
}
function* caveDark(g) {
  g.flag("dunkel_done");
  yield g.wait(0.5);
  yield g.narr("Темно, хоть глаз выколи. Рука шарит по холодной мокрой стене, где-то капает вода.");
  yield g.spark("dunkel", null, "dark", pic(g, "prop", "cave"));
  yield F(g, "Я свечу совсем слабо, тут мне не справиться. Но у входа что-то звякнуло. Давай поищем.");
  g.goal("Поищи что-нибудь у входа в пещеру.");
}
function* caveBlock(g) { g.player.y += TILE * 0.8; yield F(g, "Слишком <dunkel>. Без света дальше нельзя. Давай найдём фонарь."); }

// ------------------------------------------------------------------ chapter 8: the forest
function* forestIntro(g) {
  if (!g.has("ch7_done")) {
    g.flag("ch7_done"); colorGroup(g, "meadow");
    yield* chapterDone(g, 7);
  }
  g.flag("ch8");
  yield startChapter(g, 8, "Лес");
  yield g.narr("Лес. Стволы, стволы, сотни стволов. Пахнет смолой и грибами. Где-то хрустнула ветка, и снова тишина.");
  yield g.spark("wald", null, null, pic(g, "prop", "pine0"));
  yield F(g, "<Der Wald ist dunkel.> Мне кажется, на нас кто-то смотрит. Держись тропинки, ладно?");
  g.goal("Иди по лесной тропинке. Тени боятся своих имён.", "Глава 8 · Der Wald");
}
function* talkShadow(g, e) { if (e.shadow) yield* shadowFight(g, e.name); }
function* shadowFight(g, k) {
  const s = ent(g, k), d = SHADOWS[k];
  s.face(g.player); g.player.face(s); g.audio.play("shadow");
  if (!g.has("fought_any")) {
    g.flag("fought_any");
    yield g.narr("На тропинке тень. Живая, дрожащая, с горящим глазом. Загораживает дорогу и тихо рычит.");
    yield F(g, "Не бойся. Это не чудовище, это кто-то, кто забыл своё имя. Назови его, и он вспомнит.");
  } else yield F(g, k === "baer" ? "Эта тень очень большая. Но ты уже знаешь, что делать." : "Ещё одна тень. Посмотри на неё внимательно.");
  if (k === "baer") { g.shake = 0.6; g.audio.play("growl"); }
  yield new ShadowBattle(d.sprite, k, d.options, d.hints);
  s.shadow = false; g.flag("named_" + k); g.color(k);
  yield* afterShadow(g, k);
}
function* afterShadow(g, k) {
  const s = ent(g, k);
  const lines = {
    hase: "Тень лопается, как мыльный пузырь, и на тропинке сидит самый настоящий [hase|заяц]. Нос дёргается. Он смотрит на тебя, говорит «<Danke!>» и удирает.",
    fuchs: "Пуф! Рыжая [fuchs|лиса] отряхивается, хитро щурится и говорит: «<Danke!>» А потом исчезает в кустах.",
    vogel: "Тень рассыпается пёрышками, и в небо вспархивает синяя [vogel|птичка]. Тю-ли-тю! Кажется, это было «<danke>».",
    eule: "Тень светлеет, и на ветке сидит [eule|сова]. «Ух-ху. <Danke!> Мы все соберёмся на поляне у реки. Приходи туда».",
    baer: "Огромная тень съёживается, светлеет, и вот на тропинке сидит бурый [baer|медведь]. Он чешет за ухом и зевает во всю пасть.",
  };
  yield g.narr(lines[k]);
  if (k === "baer") {
    yield g.say("baer", "Брумм…");
    yield g.choice("hero", "Он смотрит на тебя маленькими добрыми глазками.", ["<Der Bär ist groß!>", "<Hallo, Bär!>"], 0);
    g.use("gross");
    yield F(g, "Какой он большой. И совсем не страшный.");
  }
  s.solid = false; const [tx, ty] = tileOf(s); s.walkTo(tx + (k === "fuchs" ? -6 : 6), ty - 2, 140);
  yield new WaitWalk(s); s.visible = false;
  if (SHADOW_ORDER.every(x => g.has("named_" + x))) {
    colorGroup(g, "forest"); g.audio.play("chime");
    yield g.narr("И лес вокруг вдруг наполняется красками: зелёной, бурой, золотой. Птицы пробуют голоса.");
    g.flag("ch8_done");
    yield* chapterDone(g, 8);
    g.goal("Иди по тропинке дальше, на поляну у реки.", "Глава 9 · Die Brücke");
  }
}

// ------------------------------------------------------------------ chapter 9: the talking glade and the bridge
const GLADE_STEPS = [
  { who: "eule", plank: 1 }, { who: "baer", plank: 2 }, { who: "hase", plank: 3 }, { who: "fuchs", plank: 4 }, { who: "vogel", plank: 5 },
];
function gladeStep(g) { let i = 0; while (i < 5 && g.has("glade" + (i + 1))) i++; return i; }
function* gladeIntro(g) {
  g.flag("ch9");
  yield startChapter(g, 9, "Мост из фраз");
  yield g.narr("Поляна у реки. Светятся грибы, звенят кристаллы. И здесь все, кого ты назвал в лесу. Они разговаривают! По-немецки, конечно.");
  yield g.say("fuchs", "<Hallo! Ich bin der Fuchs. Ich bin rot!>");
  yield g.say("hase", "<Ich bin klein…>");
  yield F(g, "Слышишь? Ты их понимаешь! Ну, почти всё.");
  yield g.say("eule", "Ух-ху. <Hallo, {name}!> Подойди ко мне, к самой воде. Есть дело.");
  g.goal("Поговори с [eule|совой] у реки.", "Глава 9 · Die Brücke");
}
function* talkGlade(g, e) {
  const f = g.flags, step = gladeStep(g), cur = GLADE_STEPS[step];
  if (!f.has("ch9")) return;
  if (!cur || f.has("ch9_jump")) {
    const idle = { eule: "Ух-ху. <Du bist nicht klein.> Иди, башня ждёт.", baer: "Брумм. <Ich bin groß.>", fuchs: "<Du bist mein… Freund?> Ой, это я ещё не выучила.", hase: "<Hallo!> Прыг.", vogel: "Тю-ли-тю! <Ja, ja!>" };
    yield g.say(e.name, idle[e.name]);
    return;
  }
  if (e.name !== cur.who) {
    const wait = { eule: "Ух-ху. Сначала дело, потом разговоры.", baer: "Брумм. <Nein.> Не сейчас.", fuchs: "<Hallo!> Подожди немножко, я скоро.", hase: "Ой! Ты меня напугал.", vogel: "Тю-ли? Тю-ли." };
    yield g.say(e.name, wait[e.name]);
    yield F(g, `Кажется, сейчас нам к ${{ eule: "сове", baer: "медведю", hase: "зайцу", fuchs: "лисе", vogel: "птичке" }[cur.who]}.`);
    return;
  }
  g.flag("glade" + (step + 1));
  if (cur.who === "eule") {
    yield g.say("eule", "Маг рассыпал мост на слова. Вон, камни со словами валяются на берегу.");
    yield g.say("eule", "Одно слово ещё не мост. А вот фраза уже доска. Каждый из нас даст тебе по фразе. Начнём с меня.");
    yield g.spark("bruecke", null, null, pic(g, "prop", "plank"));
    yield new Sentence("Река шумит: «Кто идёт?» Скажи ей, кто ты.", ["Ich", "bin", g.name], ["du", "bist", "Bär"], big2(g.art.people.hero.down[0]));
    buildPlank(g, 1);
    yield g.narr("Из воды поднимается первая доска и ложится на сваи.");
    yield g.say("eule", "Ух-ху! Теперь иди к медведю. Он стесняется, но очень тебя ждёт.");
  } else if (cur.who === "baer") {
    yield g.say("baer", "Брумм. Скажи… какой я?");
    yield new Sentence("[baer|Медведь] выпрямляется во весь рост и ждёт. Какой он?", ["Der", "Bär", "ist", "groß"], ["klein", "Die", "Das"], big2(g.art.animals.bear.right[0]));
    buildPlank(g, 2);
    yield g.say("baer", "Брумм! <Danke!> Теперь к зайцу, он сидит у самой воды.");
  } else if (cur.who === "hase") {
    yield g.say("hase", "Я лапку в реку окунул… Попробуй и ты. Какая она?");
    yield new Sentence("Ты опускаешь руку в реку. Бр-р-р! Какая [wasser|вода]?", ["Das", "Wasser", "ist", "kalt"], ["heiß", "Der", "rot"], iconBig(g, "kalt"));
    buildPlank(g, 3);
    yield g.say("hase", "<Ja!> Вот и я говорю. А теперь иди к лисе.");
  } else if (cur.who === "fuchs") {
    yield g.say("fuchs", "<Du bist klein! Ha!>");
    yield F(g, "Она дразнится. Но ты можешь ей возразить. Для этого есть одно маленькое слово.");
    yield F(g, "<Der Bär ist klein?> <Nein!> <Der Bär ist nicht klein!> Слышишь? Одно маленькое слово, и смысл меняется.");
    yield g.spark("nicht", null, "shake");
    yield new Sentence("[fuchs|Лиса] дразнит тебя маленьким. Возрази ей!", ["Ich", "bin", "nicht", "klein"], ["du", "ist", "Der"], iconBig(g, "klein"));
    buildPlank(g, 4);
    yield g.say("fuchs", "Ладно-ладно. <Du bist nicht klein.> Иди к птичке, она знает, что дальше.");
  } else if (cur.who === "vogel") {
    yield g.say("vogel", "Тю-ли! Последнюю доску унесло течением. Её не построить. Но через воду можно…");
    yield g.spark("springe", "Это уже не приказ, а рассказ о себе: я прыгаю.", "jump");
    yield new Sentence("Скажи реке, что ты сейчас сделаешь.", ["Ich", "springe"], ["Spring", "du", "bin"], iconBig(g, "springen"));
    g.flag("ch9_jump");
    yield F(g, "Ну, вперёд! Встань на край моста и прыгай. Я полечу рядом.");
    g.goal(g.touch ? "Пройди по мосту и перепрыгни последнюю воду («прыжок»)." : "Пройди по мосту и перепрыгни последнюю воду (ПРОБЕЛ).");
  }
}
function buildPlank(g, i, quiet, w) {
  w = w || g.world;
  const y = 7 - i;
  for (const x of [17, 18]) w.set(x, y, "b");
  g.flags.add("plank" + i);
  if (i === 4) for (const x of [17, 18]) w.set(x, 2, "s");
  if (!quiet) { g.audio.play("stone"); g.sparkle(18 * TILE, y * TILE, 30); g.shake = 0.2; }
}

// ------------------------------------------------------------------ chapter 10: the tower
function* ch10Tower(g) {
  if (!g.has("ch9_done")) { g.flag("ch9_done"); colorGroup(g, "glade"); yield* chapterDone(g, 9); }
  g.flag("ch10");
  const mag = ent(g, "magier"); mag.face(g.player);
  yield startChapter(g, 10, "Немой Маг");
  yield g.narr("У подножия башни стоит человек в тёмном плаще. Вокруг клубится серый туман, а в тумане кружатся украденные слова. Тысячи слов.");
  yield g.narr("Он не произносит ни звука. Только поднимает руку.");
  g.shake = 0.8; g.audio.play("shadow");
  yield g.narr("Слова в твоей книге начинают дрожать. Искорка тускнеет.");
  yield F(g, "{name}… держи слова… Без них я погасну.");
  const pool = shuffle(Object.keys(g.known).filter(isThing)).slice(0, 3);
  for (const key of pool) while (true) {
    const others = shuffle(Object.keys(g.known).filter(k => k !== key && isThing(k))).slice(0, 2);
    const opts = shuffle([key, ...others]), right = opts.indexOf(key);
    const r = yield g.choice("magier", "Слово вырывается из книги и летит в туман…", opts.map(k => `<${withArticle(k)}>`), right, iconBig(g, key));
    if (r === right) { g.use(key); g.audio.play("ok"); yield g.narr("Слово вспыхивает и возвращается к тебе. Искорка чуть-чуть светлеет."); break; }
    g.audio.play("wrong"); g.reportAnswer(false, key); yield g.narr("Слово дрожит у самого края тумана… Ещё попытка!");
  }
  yield g.narr("Маг опускает руку. Туман редеет. И тут он впервые открывает рот. Голос хриплый, отвыкший.");
  yield g.say("magier", "<Ich… bin…>");
  yield g.wait(0.8);
  yield g.say("magier", "<…allein.>");
  yield g.spark("allein", null, null, pic(g, "person", "magier"));
  yield F(g, "Я знаю его историю, мне сова рассказывала. Когда-то он пришёл к нам из далёкой страны. Говорил медленно, с ошибками.");
  yield F(g, "А над ним смеялись и передразнивали его. И он замолчал."); yield F(g, "А потом решил: раз у него нет слов, пусть их не будет ни у кого. Тогда никто ни над кем не будет смеяться.");
  yield g.think("Он не злой. Ему просто очень одиноко. Как мне, когда я очнулся у колодца без имени.");
  yield new Sentence("Скажи ему то, что ему сейчас нужнее всего.", ["Du", "bist", "nicht", "allein"], ["Ich", "bin", "klein"], big2(g.art.peopleGrey.magier.down[0]));
  g.shake = 0.3; mag.sprite = "magier_frei"; g.portraitCache = {};
  yield g.narr("Маг вздрагивает. Капюшон сползает, а под ним самое обычное лицо. Немолодое, растерянное.");
  yield g.say("magier", "<Nicht… allein?>");
  yield g.narr("Ты вспоминаешь Ому, которая угостила тебя хлебом. Детей, которые придумали тебе имя. Клауса с его овцами. Опу, который смеялся вместе с тобой, а не над тобой.");
  yield g.spark("freund", "Кто-то кладёт руку тебе на плечо. Тепло. С таким человеком не страшно ошибаться.");
  yield g.spark("mein");
  yield new Sentence("Скажи ему, кто он для тебя.", ["Du", "bist", "mein", "Freund"], ["allein", "ich", "nicht"], iconBig(g, "freund"));
  yield g.narr("Маг улыбается. Неуверенно и криво, как улыбаются люди, которые очень давно этого не делали.");
  yield g.narr("Ты протягиваешь ему руку и машешь ладонью к себе: пойдём.");
  yield g.spark("komm", null, "wave");
  yield g.spark("mit");
  yield* askUntil(g, "hero", "Позови его с собой, в деревню, к людям.", ["<Komm mit!>", "<Tschüss!>", "<Halt!>"], 0,
    { 1: "Маг опускает голову. Нет-нет, ты же не прощаться пришёл!", 2: "Маг и так стоит как вкопанный. Тут нужно другое слово." });
  g.use("komm"); g.use("mit"); g.flags.add("col:magier");
  for (const grp of ["village", "meadow", "forest", "glade", "tower", "river"]) colorGroup(g, grp);
  g.audio.play("word"); g.shake = 1.0;
  for (let i = 0; i < 8; i++) g.sparkle(mag.x + uniform(-250, 250), mag.y + uniform(-250, 100), 30);
  yield g.narr("Туман лопается. Слова, сотни и тысячи, взмывают над башней, как стая [vogel:Vögel|птиц], и разлетаются по свету: домой, к своим вещам.");
  yield F(g, "Ой… Кажется, я расту! Смотри, я уже не искорка, а целый огонёк!");
  yield g.say("magier", "<Danke.>");
  yield g.narr("Первое слово, которое он сказал сам. Тихо, с акцентом. И лучше не скажешь.");
  g.flag("ch10_done");
  yield* epilogue(g);
}
function* talkMagier(g) {
  if (!g.has("ch10_done")) { yield g.narr("Он молчит. Только туман шевелится вокруг."); return; }
  yield g.say("magier", "<Danke>, {name}. <Du bist mein Freund.>");
}

// ------------------------------------------------------------------ epilogue
function festivalPositions(g, w) {
  w = w || g.world;
  const spots = { opa: [12, 10, "down"], oma: [19, 10, "down"], magier: [18, 13, "left"], klaus: [11, 13, "right"], lotte: [20, 14, "left"], paul: [14, 15, "up"],
    anna: [17, 15, "up"], baker: [10, 11, "right"], bello: [13, 14, null], eule: [21, 12, "left"], baer: [9, 14, "right"] };
  for (const [n, [x, y, fc]] of Object.entries(spots)) { const e = w.ent[n]; if (!e) continue; place(e, x, y, fc); e.visible = true; e.wander = n === "bello" ? 1 : 0; }
  w.ent.magier.sprite = "magier_frei";
  for (const n of ["klaus", "lotte", "opa", "magier", "eule", "baer"]) g.flags.add("col:" + n);
}
function* talkFestival(g, e) {
  const lines = { klaus: "<Eins, zwei, drei, vier, fünf…> Все дома. Можно и отдохнуть.", lotte: "<Du bist bunt!> Я тебя всё-таки нарисую.",
    opa: "<Sehr gut, {name}.> Вот и голова догнала тело.", magier: "<Danke.> Я учусь. <Ich bin nicht allein.>", eule: "Ух-ху. <Hallo!>", baer: "Брумм. <Brot? Bitte!>" };
  yield g.say(e.name, lines[e.name] || "<Hallo!>");
}
function* epilogue(g) {
  yield new Fade(true, 1.2);
  g.enter("square", [15, 13], "up");
  festivalPositions(g, g.world);
  g.flag("ending");
  yield new Fade(false, 1.2);
  yield new Title("Эпилог", "Das Fest", "Праздник");
  yield g.narr("Вечером вся деревня собирается у [brunnen|колодца]. Музыка, смех, пахнет свежим [brot|хлебом]. Даже [baer|медведь] пришёл, правда, сидит с краешку.");
  yield g.say("oma", "<Hallo, {name}! Hallo, Magier!> <Brot? Bitte!>");
  yield g.say("magier", "<Ja… Danke.>");
  yield g.say("klaus", "<Eins, zwei, drei, vier, fünf!> И ещё одна! Все дома!");
  yield g.say("lotte", "<Das Haus ist rot. Der Baum ist grün. Die Blume ist gelb.> А ты, {name}, <du bist bunt!>");
  yield g.say("paul", "<Wer bist du?>");
  yield g.choice("paul", "<Wer bist du?>", ["<Ich bin {name}!>"], 0);
  yield g.say("anna", "<Und du bist mein Freund!>");
  yield g.say("opa", "Слышишь? Они говорят по-немецки, а ты всё понимаешь. И не потому, что зубрил правила, а потому, что каждое слово прожил сам.");
  yield F(g, "А я с тобой с самого первого слова. Помнишь колодец? <Danke>, {name}.");
  yield g.narr("Маг протягивает тебе записку. Буквы неровные, но видно, что старался.");
  yield g.narr("<Hallo, {name}! Ich bin nicht allein. Du bist mein Freund. Der Wald ist grün. Das Wasser ist kalt. Das Feuer ist heiß. Danke! Komm mit!>");
  yield g.narr("Ты читаешь и понимаешь всё. Каждое слово.");
  yield* chapterDone(g, 10);
  yield new Ending();
  g.goal("Мир снова заговорил. Гуляй сколько хочешь, книга слов всегда с тобой.", "Конец · Ende");
}
class Ending extends Action {
  start(g) { super.start(g); g.audio.play("chime"); }
  handle(ev) { if (isConfirm(ev) && this.t > 2) this.done = true; }
  update(dt) { this.t += dt; if (this.g.auto) this.done = true; }
  draw(ctx) {
    const g = this.g;
    dim(ctx, Math.min(225, this.t * 160));
    if (this.t < 0.4) return;
    drawText(ctx, "Ende", WIDTH / 2, 150, 110, DE, { center: true, bold: true });
    const lines = [`Слов в книге: ${Object.keys(g.known).length} из ${ORDER.length}`, `Ты провёл в пути ${Math.floor(g.playTime / 60)} мин.`, "",
      "Язык не обязательно зубрить. В нём можно просто пожить.", "", "Danke fürs Spielen! Спасибо, что поиграл!"];
    let y = 250;
    for (const ln of lines) { if (ln) drawText(ctx, ln, WIDTH / 2, y, 32, WHITE, { center: true }); y += 42; }
    if (this.t > 2 && Math.floor(this.t * 2.5) % 2 === 0) drawText(ctx, g.touch ? "нажми, чтобы гулять дальше" : "E — гулять дальше", WIDTH / 2, 590, 26, MUTED, { center: true });
  }
}

// ------------------------------------------------------------------ the square: small talk and practice
function* talkBello(g, e) {
  g.audio.play("woof");
  if (!g.has("oma_bread")) { yield g.narr("Серый пёс смотрит на тебя и молчит. Даже хвостом не шевелит."); return; }
  g.emote(e, "heart");
  yield g.narr(choice(["Белло виляет хвостом и тычется носом тебе в карман. Там пусто, но он проверяет.", "Белло плюхается на спину: чеши пузо!"]));
}
function* readSign(g) { yield g.narr("Указатель: «→ Поле. ↑ Мастерская. ↓ Река». Внизу кто-то из детей нарисовал овечку."); }
function* talkBaker(g) {
  const f = g.flags;
  if (!f.has("oma_bread")) { yield g.narr("Серый пекарь молча месит серое тесто."); return; }
  yield g.say("baker", "<Hallo!>");
  yield* askUntil(g, "baker", "<Hallo!>", ["<Hallo!>", "<Tschüss!>"], 0, { 1: "<Tschüss?> Ты же только пришёл!" });
  g.use("hallo");
  if (!f.has("col:baker")) { g.color("baker"); yield g.narr("Пекарь расплывается в улыбке и становится румяным, как его булки."); }
  if (g.known.fuenf && Math.random() < 0.5) {
    yield g.say("baker", "<Brot? Wie viele?>");
    yield new Count("bread", randInt(1, 5), "ask");
  } else {
    const r = yield g.choice("baker", "<Brot?>", ["<Ja, bitte!>", "<Nein, danke!>"], 0);
    if (r === 1) { g.use("nein"); g.use("danke"); yield g.say("baker", "<Gut!> Вежливо. Но булку всё-таки возьми, она тёплая."); }
    else { g.use("ja"); g.use("bitte"); }
  }
  yield g.say("baker", "<Bitte!>");
  yield* askUntil(g, "baker", "(Пекарь ждёт.)", ["<Danke!>", "<Bitte!>", "<Nein!>"], 0,
    { 1: "Ха, «<bitte>» говорит тот, кто даёт. А тот, кто берёт, говорит…", 2: "<Nein?> Да ты попробуй, она же тёплая!" });
  g.use("danke");
}

const Story = { populate, applyFlags, resume, prologue, afterScript, checkTriggers, onBump, travel, teachable, questTarget, SHADOWS, SHADOW_ORDER, COLORS, PAINT_ORDER, HOUSE_WORDS, countKnown, tileOf, buildPlank, festivalPositions, colorGroup };
