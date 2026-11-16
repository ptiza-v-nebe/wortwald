"""Build dist/index.html: one self-contained page (HTML + CSS + all scripts + word data)."""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import words  # the same vocabulary as the Python version

data = "const WORDS = %s;\nconst ORDER = %s;\nconst HAT = %s;\n" % (
    json.dumps(words.W, ensure_ascii=False),
    json.dumps(words.ORDER),
    json.dumps({("null" if k is None else k): list(v) for k, v in words.HAT_COLORS.items()}),
)
scripts = [data] + [open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(HERE, "src", "*.js")))]

HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#140e1c">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Wortwald — Лес слов (v4.3)</title>
<style>
  html, body { margin: 0; height: 100%; background: #0e0a16; overflow: hidden; touch-action: none;
    -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  body { display: flex; align-items: center; justify-content: center; font-family: "Trebuchet MS", Roboto, Arial, sans-serif; }
  #game { display: block; image-rendering: pixelated; image-rendering: crisp-edges; touch-action: none; outline: none; }
  .overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(14,10,22,.92); color: #faf6ec; text-align: center; z-index: 10; padding: 24px; box-sizing: border-box; }
  .overlay h2 { color: #fad660; margin: 0 0 12px; font-size: 26px; }
  .overlay p { color: #b0a8bc; max-width: 420px; line-height: 1.4; margin: 6px 0 18px; }
  .btn { background: #34284a; color: #faf6ec; border: 2px solid #fad660; border-radius: 12px; padding: 12px 26px; font-size: 20px; font-family: inherit; }
  #ask-input { font-size: 26px; padding: 10px 14px; border-radius: 10px; border: 2px solid #fad660; background: #140e1c; color: #faf6ec;
    width: min(320px, 80vw); text-align: center; margin: 8px 0 16px; font-family: inherit; }
  #loading { display: flex; }
  .phone { font-size: 64px; display: inline-block; animation: rot 2s ease-in-out infinite; }
  @keyframes rot { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
</style>
</head>
<body>
<canvas id="game" tabindex="0"></canvas>
<div id="loading" class="overlay"><h2>Wortwald</h2><p>слова собираются…</p></div>
<div id="rotate" class="overlay">
  <div class="phone">📱</div>
  <h2>Поверни телефон горизонтально</h2>
  <p>Игра широкая: так помещаются и деревня, и кнопки.</p>
  <button id="rotate-ok" class="btn">Всё равно играть так</button>
</div>
<div id="ask" class="overlay">
  <h2 id="ask-title">Как тебя будут звать?</h2>
  <input id="ask-input" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false">
  <button id="ask-ok" class="btn">Готово</button>
</div>
<script>
%s
</script>
</body>
</html>
"""
os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
out = os.path.join(HERE, "dist", "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(HTML.replace("%s", "\n".join(scripts), 1))
print("built", out, os.path.getsize(out) // 1024, "KB")
