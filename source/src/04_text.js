// ============================================================================
// text: Russian with German mixed in.
//   [key|русское]       German word once you know it, else the Russian
//   [key:Form|русское]  same, with a German form (Schafe, Vögel)
//   <Deutsch>           German that is always German (somebody says it)
//   {name}              the hero's name
// ============================================================================
// WORDS, ORDER, HAT come from the generated data block
function hatColor(art) { return HAT[art === null || art === undefined ? "null" : art]; }
function withArticle(key) { const d = WORDS[key]; return d.art ? `${d.art} ${d.de}` : d.de; }
function wordColor(key) { const d = WORDS[key]; if (!d) return DE; return d.art ? hatColor(d.art) : GOLD; }

let _deIndex = null;
function deIndex() {
  if (!_deIndex) {
    _deIndex = {};
    for (const k of ORDER) _deIndex[WORDS[k].de.toLowerCase()] = k;
    Object.assign(_deIndex, { "schafe": "schaf", "äpfel": "apfel", "geh": "gehen", "lauf": "laufen", "spring": "springen", "öffne": "oeffnen", "vögel": "vogel" });
  }
  return _deIndex;
}
const TOKEN_RE = /\[([^\]|]+)\|([^\]]*)\]|<([^>]+)>|\{name\}/g;
const CORE_RE = /[^\wäöüÄÖÜß]/g;
function coreOf(p) { return p.replace(CORE_RE, "").toLowerCase(); }

// -> [{t, c, key, de}]
function parseMixed(text, known, name) {
  const segs = [];
  let pos = 0, m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > pos) segs.push({ t: text.slice(pos, m.index), c: WHITE, key: null, de: false });
    if (m[1]) {
      let key = m[1], form = null;
      if (key.includes(":")) [key, form] = key.split(":");
      const ru = m[2];
      if (known[key] && WORDS[key]) {
        let de = form || WORDS[key].de;
        if (ru[0] && ru[0] !== ru[0].toLowerCase() && de[0] === de[0].toLowerCase()) de = de[0].toUpperCase() + de.slice(1);
        segs.push({ t: de, c: light(wordColor(key)), key, de: true });
      } else segs.push({ t: ru, c: WHITE, key: null, de: false });
    } else if (m[3]) {
      const phrase = m[3].replace(/\{name\}/g, name);
      const parts = phrase.split(/(\s+)/), cores = parts.map(coreOf);
      for (let i = 0; i < parts.length; i++) {
        const core = cores[i], k = deIndex()[core];
        if (["der", "die", "das"].includes(core) && i + 2 < parts.length) {
          const nk = deIndex()[cores[i + 2]];
          if (nk && known[nk] && WORDS[nk].art === core) { segs.push({ t: parts[i], c: light(hatColor(core)), key: null, de: true }); continue; }
        }
        if (k && known[k]) segs.push({ t: parts[i], c: light(wordColor(k)), key: k, de: true });
        else segs.push({ t: parts[i], c: DE, key: k || null, de: true });
      }
    } else segs.push({ t: name, c: [255, 255, 255], key: null, de: false });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) segs.push({ t: text.slice(pos), c: WHITE, key: null, de: false });
  return segs;
}
function germanParts(text, name) {
  const out = []; let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) if (m[3]) out.push(m[3].replace(/\{name\}/g, name));
  return out.join(" ");
}
function textLength(text, known, name) { return parseMixed(text, known, name).reduce((a, s) => a + s.t.replace(/\s/g, "").length, 0); }

function layoutMixed(ctx, segs, width, size) {
  const lines = [[]];
  let x = 0;
  const space = measure(ctx, " ", size);
  for (const s of segs) {
    for (const p of s.t.split(/(\s+|\n)/)) {
      if (p === "") continue;
      if (p === "\n") { lines.push([]); x = 0; continue; }
      if (/^\s+$/.test(p)) { if (x > 0) x += space; continue; }
      const w = measure(ctx, p, size);
      if (x + w > width && x > 0) { lines.push([]); x = 0; }
      lines[lines.length - 1].push({ p, c: s.c, key: s.key, de: s.de, x, w });
      x += w;
    }
  }
  return lines;
}

// draw mixed text into rect [x,y,w,h]; reveal = number of visible characters
function drawMixed(ctx, text, known, rect, size, reveal, name, lineH) {
  const segs = typeof text === "string" ? parseMixed(text, known, name) : text;
  const lines = layoutMixed(ctx, segs, rect[2], size);
  const lh = lineH || Math.floor(size * 0.95);
  let y = rect[1], left = reveal === undefined || reveal === null ? 1e9 : reveal;
  ctx.font = fontCss(size); ctx.textBaseline = "top"; ctx.textAlign = "left";
  for (const line of lines) {
    for (const it of line) {
      if (left <= 0) continue;
      const t = it.p.slice(0, Math.max(0, left));
      left -= it.p.length;
      ctx.fillStyle = "rgb(12,8,18)"; ctx.fillText(t, rect[0] + it.x + 2, y + 2);
      ctx.fillStyle = rgb(it.c); ctx.fillText(t, rect[0] + it.x, y);
      if (it.de) {
        ctx.fillStyle = rgb(it.c);
        ctx.fillRect(rect[0] + it.x, y + lh - 3, measure(ctx, t, size), 1);
      }
    }
    y += lh;
  }
  return y;
}
