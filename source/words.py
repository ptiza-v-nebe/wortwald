"""
words.py - every German word in the game.

Each word has:
  de     - the German word as written in the game (nouns without article)
  ru     - Russian meaning (hidden in the Word Book until you hold SHIFT)
  art    - der / die / das for nouns (the word's "hat"), None otherwise
  icon   - sprite name used as the word's picture
  feel   - what your body notices first (used when the word is born)
  ex     - an example in German, built from words met earlier (spiral)
  ch     - chapter where it is born
"""

HAT_COLORS = {
    "der": (70, 130, 230),   # blue hat
    "die": (225, 80, 90),    # red hat
    "das": (80, 190, 110),   # green hat
    None: (235, 200, 90),    # no hat: gold
}

W = {}


def w(key, de, ru, art=None, icon=None, feel="", ex="", ch=0):
    W[key] = dict(key=key, de=de, ru=ru, art=art, icon=icon or key, feel=feel, ex=ex, ch=ch)


# --- Chapter 1: Hallo -------------------------------------------------------
w("hallo", "Hallo", "привет", icon="wave",
  feel="Бабушка машет тебе рукой и улыбается так, будто давно тебя ждала.", ex="Hallo, Oma!", ch=1)
w("ja", "ja", "да", icon="yes",
  feel="Голова сама кивает. Ты согласен, и тебе от этого хорошо.", ex="Ja, danke!", ch=1)
w("nein", "nein", "нет", icon="no",
  feel="Ты мотаешь головой и делаешь шаг назад. Спасибо, не надо.", ex="Nein, danke.", ch=1)
w("danke", "danke", "спасибо", icon="heart",
  feel="Тебя угостили, и на душе сразу потеплело. Хочется сказать доброе слово в ответ.", ex="Danke, Oma!", ch=1)
w("bitte", "bitte", "пожалуйста", icon="gift",
  feel="Ты протягиваешь угощение на ладони: держи, это тебе.", ex="Brot? Bitte!", ch=1)
w("tschuess", "tschüss", "пока", icon="bye",
  feel="Машешь рукой на прощание и уходишь. Легко, без грусти, ведь вы ещё увидитесь.", ex="Tschüss, Bello!", ch=1)

# --- Chapter 2: Ich ---------------------------------------------------------
w("ich", "ich", "я", icon="me",
  feel="Ты кладёшь ладонь себе на грудь. Вот он, ты сам.", ex="Wer bin ich?", ch=2)
w("du", "du", "ты", icon="you",
  feel="Показываешь пальцем на другого и смотришь ему в глаза.", ex="Du bist Oma.", ch=2)
w("bin", "bin", "(я) есть", icon="me",
  feel="Говоришь «Ich bin…» и называешь себя. Сразу чувствуешь, что стоишь на земле крепко.", ex="Ich bin klein.", ch=2)
w("bist", "bist", "(ты) есть", icon="you",
  feel="Говоришь «Du bist…» и называешь другого.", ex="Du bist Bello!", ch=2)
w("wer", "wer", "кто", icon="question",
  feel="Ты удивлённо поднимаешь брови и склоняешь голову набок: а это кто?", ex="Wer bist du?", ch=2)

# --- Chapter 3: Das Haus (things) -------------------------------------------
w("brunnen", "Brunnen", "колодец", "der", icon="well",
  feel="Под ладонью холодный камень, снизу тянет сыростью и мхом, а голос гулко отдаётся эхом.", ex="Der Brunnen ist kalt.", ch=3)
w("haus", "Haus", "дом", "das", icon="house",
  feel="Стены, крыша, внутри пахнет печкой. Тут можно укрыться от ветра.", ex="Das Haus ist rot.", ch=3)
w("tuer", "Tür", "дверь", "die", icon="door",
  feel="Петли скрипят, ты толкаешь тяжёлое дерево, и путь открыт.", ex="Öffne die Tür!", ch=3)
w("brot", "Brot", "хлеб", "das", icon="bread",
  feel="Корочка хрустит, мякиш ещё тёплый. В животе урчит.", ex="Brot? Ja, bitte!", ch=3)
w("wasser", "Wasser", "вода", "das", icon="water",
  feel="Прохладная струйка бежит между пальцами. Сделаешь глоток, и сразу легче.", ex="Das Wasser ist kalt.", ch=3)
w("apfel", "Apfel", "яблоко", "der", icon="apple",
  feel="Круглое, гладкое, увесистое. Откусываешь: сладко и чуть кисло.", ex="Der Apfel ist rot.", ch=3)
w("baum", "Baum", "дерево", "der", icon="tree",
  feel="Задираешь голову. Кора шершавая, а листва шумит где-то высоко-высоко.", ex="Der Baum ist groß.", ch=3)
w("blume", "Blume", "цветок", "die", icon="flower",
  feel="Наклоняешься и утыкаешься носом в лепестки. Пахнет мёдом и летом.", ex="Die Blume ist gelb.", ch=3)
w("hund", "Hund", "собака", "der", icon="dog",
  feel="Мокрый нос тычется в ладонь, хвост так и ходит ходуном. Гав!", ex="Der Hund ist klein.", ch=3)
w("katze", "Katze", "кошка", "die", icon="cat",
  feel="Мягкая спинка выгибается под рукой, слышно тихое «мрр». Коготки цепляют рукав.", ex="Die Katze ist weiß.", ch=3)

# --- Chapter 4: Zahlen ------------------------------------------------------
w("schaf", "Schaf", "овца", "das", icon="sheep",
  feel="Тёплая кудрявая шерсть, пахнет сеном. Мээ!", ex="Ein Schaf, zwei Schafe.", ch=4)
w("eins", "eins", "один", icon="n1", feel="Загибаешь один палец.", ex="eins", ch=4)
w("zwei", "zwei", "два", icon="n2", feel="Два пальца. Получилась пара.", ex="eins, zwei", ch=4)
w("drei", "drei", "три", icon="n3", feel="Три пальца.", ex="eins, zwei, drei", ch=4)
w("vier", "vier", "четыре", icon="n4", feel="Четыре пальца.", ex="vier Schafe", ch=4)
w("fuenf", "fünf", "пять", icon="n5", feel="Вся ладонь, пятерня.", ex="fünf Äpfel", ch=4)

# --- Chapter 5: Farben ------------------------------------------------------
w("rot", "rot", "красный", icon="c_rot",
  feel="Тёплый, как огонь, и сладкий, как яблоко. От него горят щёки.", ex="Der Apfel ist rot.", ch=5)
w("blau", "blau", "синий", icon="c_blau",
  feel="Прохладный и глубокий, как небо или вода в колодце.", ex="Das Wasser ist blau.", ch=5)
w("gruen", "grün", "зелёный", icon="c_gruen",
  feel="Пахнет свежей травой, под ногами мягко. Это цвет листьев.", ex="Der Baum ist grün.", ch=5)
w("gelb", "gelb", "жёлтый", icon="c_gelb",
  feel="Солнце бьёт в глаза, приходится щуриться. Коже тепло.", ex="Die Blume ist gelb.", ch=5)
w("weiss", "weiß", "белый", icon="c_weiss",
  feel="Чистый и лёгкий, как облако или молоко.", ex="Das Schaf ist weiß.", ch=5)
w("ist", "ist", "(он/она/оно) есть", icon="equals",
  feel="Связывает вещь и её свойство: Apfel ist rot. Яблоко какое? Красное.", ex="Der Hund ist klein.", ch=5)

# --- Chapter 6: Verben = Zauber ---------------------------------------------
w("gehen", "geh", "иди", icon="walk",
  feel="Шаг, ещё шаг. Чувствуешь землю под ногами.", ex="Geh links!", ch=6)
w("links", "links", "налево", icon="left",
  feel="Поворачиваешься в ту сторону, где сердце.", ex="Geh links!", ch=6)
w("rechts", "rechts", "направо", icon="right",
  feel="Поворачиваешься в другую сторону, туда, где рука, которой пишешь.", ex="Geh rechts!", ch=6)
w("springen", "spring", "прыгай", icon="jump",
  feel="Колени пружинят, толчок, и ты в воздухе! Ветер свистит в ушах.", ex="Spring!", ch=6)
w("halt", "halt", "стой", icon="stop",
  feel="Ты замираешь на месте и даже дышать перестаёшь.", ex="Halt! Nicht gehen!", ch=6)
w("laufen", "lauf", "беги", icon="run",
  feel="Сердце колотится, ветер бьёт в лицо, земля так и летит из-под ног.", ex="Lauf, Hase, lauf!", ch=6)
w("oeffnen", "öffne", "открой", icon="open",
  feel="Толкаешь ладонью, щёлк, и в щель пробивается свет.", ex="Öffne die Tür!", ch=6)

# --- Chapter 7: Körper fühlt (adjectives) -----------------------------------
w("heiss", "heiß", "горячий", icon="fire",
  feel="Жаром обдаёт лицо, пальцы сами отдёргиваются. Ай!", ex="Das Feuer ist heiß.", ch=7)
w("kalt", "kalt", "холодный", icon="snow",
  feel="По спине бегут мурашки, зубы стучат. Бр-р-р!", ex="Das Wasser ist kalt.", ch=7)
w("feuer", "Feuer", "огонь", "das", icon="fire",
  feel="Трещит, искры летят вверх, пахнет дымом.", ex="Das Feuer ist heiß.", ch=7)
w("klein", "klein", "маленький", icon="small",
  feel="Всё вокруг вдруг стало огромным. Травинки как деревья, а ты как мышка.", ex="Ich bin klein.", ch=7)
w("gross", "groß", "большой", icon="big",
  feel="Плечи раздаются вширь, голова выше крыш, земля дрожит под ногами.", ex="Der Bär ist groß.", ch=7)
w("dunkel", "dunkel", "тёмный", icon="dark",
  feel="Глаза открыты, а ничего не видно. Рука нащупывает стену.", ex="Der Wald ist dunkel.", ch=7)
w("hell", "hell", "светлый", icon="light",
  feel="Свет греет веки, глаза щурятся. Теперь всё видно!", ex="Das Feuer ist hell.", ch=7)

# --- Chapter 8: Der Wald (animals) ------------------------------------------
w("wald", "Wald", "лес", "der", icon="tree",
  feel="Кругом стволы, сотни стволов. Пахнет смолой и грибами, где-то хрустнула ветка.", ex="Der Wald ist groß.", ch=8)
w("hase", "Hase", "заяц", "der", icon="hare",
  feel="Длинные уши подрагивают. Прыг, и его уже нет.", ex="Der Hase ist klein.", ch=8)
w("fuchs", "Fuchs", "лиса", "der", icon="fox",
  feel="Рыжий хвост мелькает между деревьями, глаза хитрые.", ex="Der Fuchs ist rot.", ch=8)
w("vogel", "Vogel", "птица", "der", icon="bird",
  feel="Над головой трель и лёгкое «фр-р-р» крыльев.", ex="Der Vogel ist klein.", ch=8)
w("eule", "Eule", "сова", "die", icon="owl",
  feel="В темноте два круглых глаза. «Ух-ху». Голову поворачивает чуть ли не задом наперёд.", ex="Hallo, Eule!", ch=8)
w("baer", "Bär", "медведь", "der", icon="bear",
  feel="Земля вздрагивает, огромные лапы, тёплое дыхание. Брумм.", ex="Der Bär ist groß.", ch=8)

# --- Chapter 9: Die Brücke (sentences) --------------------------------------
w("nicht", "nicht", "не", icon="no",
  feel="Маленькое слово, которое всё меняет на обратное: Ich bin nicht kalt.", ex="Ich bin nicht klein.", ch=9)
w("springe", "springe", "(я) прыгаю", icon="jump",
  feel="Это уже не приказ, а рассказ о себе: я прыгаю.", ex="Ich springe.", ch=9)
w("bruecke", "Brücke", "мост", "die", icon="bridge",
  feel="Доски пружинят под ногами, а внизу шумит река.", ex="Die Brücke ist groß.", ch=9)

# --- Chapter 10: Der stumme Magier ------------------------------------------
w("allein", "allein", "один, одинокий", icon="alone",
  feel="Пустая комната. Никто не ответит, и от тишины звенит в ушах.", ex="Du bist nicht allein.", ch=10)
w("freund", "Freund", "друг", "der", icon="friends",
  feel="Кто-то кладёт руку тебе на плечо. С ним не страшно ошибиться.", ex="Du bist mein Freund.", ch=10)
w("mein", "mein", "мой", icon="me",
  feel="Прижимаешь к груди: это моё.", ex="Mein Hund. Mein Haus.", ch=10)
w("komm", "komm", "иди сюда", icon="come",
  feel="Машешь ладонью к себе: иди сюда, к нам.", ex="Komm mit!", ch=10)
w("mit", "mit", "с, вместе", icon="friends",
  feel="Плечом к плечу. Вдвоём не страшно.", ex="Komm mit!", ch=10)


def with_article(key):
    d = W[key]
    return f"{d['art']} {d['de']}" if d["art"] else d["de"]


CHAPTERS_V3 = {
    1: ["hallo", "ja", "nein", "danke", "bitte", "tschuess", "brunnen"],
    2: ["ich", "du", "bin", "bist", "wer"],
    3: ["haus", "tuer", "brot", "wasser", "apfel", "katze", "blume"],
    4: ["schaf", "eins", "zwei", "drei", "vier", "fuenf", "hund", "baum"],
    5: ["rot", "blau", "gruen", "gelb", "weiss", "ist"],
    6: ["gehen", "links", "rechts", "springen", "halt", "laufen", "oeffnen"],
    7: ["heiss", "kalt", "feuer", "klein", "gross", "dunkel", "hell"],
    8: ["wald", "hase", "fuchs", "vogel", "eule", "baer"],
    9: ["nicht", "springe", "bruecke"],
    10: ["allein", "freund", "mein", "komm", "mit"],
}
ORDER = []
for _ch, _keys in CHAPTERS_V3.items():
    for _k in _keys:
        W[_k]["ch"] = _ch
        ORDER.append(_k)
assert sorted(ORDER) == sorted(W.keys()), set(W) ^ set(ORDER)
