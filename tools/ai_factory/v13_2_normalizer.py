#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.2 Python Roman Urdu Normalizer (Parity with TypeScript)
"""

import re
import unicodedata

SPELLING_VARIANTS = {
    # Electricity / K-Electric
    "bijli": ["bejli", "bigli", "bijlee", "bjli", "bjl", "bijlli"],
    "transformer": ["tranforma", "transfarmer", "transformr", "trasformer", "transfomer", "trnsfrmr", "transfarer", "transfamer"],
    "taar": ["tar", "taarein", "taren", "tarein", "wire", "wires"],
    "current": ["curnt", "crnt", "karant", "karent"],
    "khamba": ["khumba", "khambah", "pole", "pol"],
    "sparking": ["spark", "sparks", "chingari", "chingariyan", "chingariyon"],
    "voltage": ["voltg", "voltaj", "voltege"],
    "tripping": ["triping", "trip", "tripp"],

    # Water & Sewerage / KWSC
    "pani": ["pane", "paani", "panii", "panie", "pni", "paney"],
    "sewerage": ["sewrage", "severage", "sever", "sewrege", "sewage"],
    "gutter": ["gutar", "gatter", "gatar", "gutr", "gathr"],
    "dhakkan": ["dhakan", "dhakn", "dakkan", "dhkn", "dhakna"],
    "motor": ["motar", "motr", "pump", "waterpump"],
    "tanker": ["tankar", "tankr"],
    "sookhi": ["suki", "sukhi", "sokhi", "sooki", "khushk"],
    "ubal": ["ubhal", "ubalna", "ubhalna", "chhalak"],

    # Sui Southern Gas / SSGC
    "gas": ["gass", "gaas", "gss", "gees"],
    "chulha": ["choolha", "chula", "choola", "chulhe", "chulhay", "stove"],
    "cylinder": ["slender", "silender", "silinder", "cylndr"],
    "boodar": ["boo", "badboo", "badbu", "bad-boo", "smell", "odor", "bhoo"],
    "pressure": ["prshr", "pressre", "presure", "presher"],

    # Roads & Infrastructure / KMC
    "road": ["rod", "rood", "sarak", "sadak", "srk", "sark"],
    "toot": ["tooti", "tuti", "toti", "toota", "tuta", "tota", "tut", "tootaa"],
    "khadda": ["khadday", "khadde", "gadda", "gadday", "gadde", "gadha", "pothole", "potholes"],
    "footpath": ["futpath", "foot path", "fut path"],
    "bridge": ["pul", "plyover", "flyover", "underpass"],
    "gali": ["glee", "galli", "gully", "street"],

    # Solid Waste / SSWMB
    "kachra": ["kachrah", "kooda", "kuda", "kachre", "kachrey", "garbage", "trash", "waste"],
    "dustbin": ["dastbin", "kundi", "kachra kundi", "dumpster"],
    "dumper": ["damper", "dampr", "dumpr"],
    "sweeper": ["swpr", "jamadar", "safai wala", "safai walay"],
    "dher": ["dhaer", "dheer", "ambar", "pile"],

    # Building Control / SBCA
    "building": ["bldng", "bilding", "imarat", "emarat", "plaza", "bldg"],
    "crack": ["cracks", "daraar", "darar", "daraarein", "draren"],
    "chhat": ["chath", "chat", "roof"],
    "deewar": ["diwar", "dewaarein", "diwarein", "wall"],
    "illegal": ["ghair qanooni", "ghairqanooni", "najaiz", "unauthorized"],
    "girne": ["girna", "gir", "collapse", "girne wali"],

    # Common Auxiliary & Verbal Tokens
    "nahi": ["nhi", "ni", "nai", "nahe", "nahin", "nahee", "nhn", "nae"],
    "rahi": ["rhi", "rhin", "rahii"],
    "raha": ["rha", "rahaa"],
    "rahe": ["rhe", "rhay"],
    "hai": ["hy", "h", "he"],
    "hain": ["hn", "hen", "hae"],
    "wajah": ["waja", "vajha", "vaja", "wjh"],
    "bohot": ["boht", "bht", "bohat", "bhat", "bhot"],
    "zyada": ["zada", "zyadh", "ziada", "ziyada"],
    "kharab": ["khrab", "khrb", "kharb", "xarab", "xraab"],
    "band": ["bnd", "bund"],
    "chal": ["chl", "chalti", "chalta", "chaltay"],
    "shikayat": ["shkayat", "complaint", "complant", "shikayt"],
    "shuru": ["shru", "shuroo"],
}

VARIANT_TO_LEMMA = {}
for lemma, variants in SPELLING_VARIANTS.items():
    VARIANT_TO_LEMMA[lemma.lower()] = lemma.lower()
    for v in variants:
        VARIANT_TO_LEMMA[v.lower()] = lemma.lower()


def collapse_repeated_characters(text: str) -> str:
    def repl(match):
        char = match.group(1)
        if char.lower() in ["a", "e", "o"]:
            return char + char
        return char
    return re.sub(r"([a-zA-Z])\1{2,}", repl, text)


def split_joined_civic_tokens(text: str) -> str:
    t = text
    t = re.sub(r"\b(bijli|gas|pani|road|sarak|kachra|gutter|taar)(nahi|nhi|ni|nai)(a?r[a-z]*)\b", r"\1 nahi \3", t, flags=re.I)
    t = re.sub(r"\b(bijli|gas|pani|road|sarak|kachra|gutter|taar|light)(nahi|nhi|ni|nai|chali|band|gul)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(pani|gas|bijli|light)(aaraha|aarahi|aarha|aarhi|arha|arhi)\b", r"\1 aa rahi", t, flags=re.I)
    t = re.sub(r"\b(road|sarak|sadak|gutter|transformer)(kharab|khrab|toot|choke|burst|blast)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(taar|wire)(toot|gir|latak|latki)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(gutter|gatar)(dhakkan|dhakan|dhakna|ubal|choke)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(gas|pani)(leak|leek|pipeline|line|pressure)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(kachra|kooda)(dher|dhair|gari|gaari)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(main)(line|pipe|road|hole|sewer)\b", r"\1 \2", t, flags=re.I)

    t = re.sub(r"\b(se|ke|ki|ka|mein|par)(bijli|gas|pani|road|sarak|kachra|gutter|transformer|line|pipe|building)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(bijli|gas|pani|road|sarak|kachra|gutter|transformer|line|pipe|building)(se|ke|ki|ka|mein|par|ko)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(hai|hain|tha|thi)(aur|lekin|magar|isliye|iski)\b", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\b(is|us)(wajah|liye|sabab)\b", r"\1 \2", t, flags=re.I)
    return t


def normalize_verbal_stems(text: str) -> str:
    t = text
    t = re.sub(r"\b(aa\s*rhi|aarhi|arhi|aarahi|arahi)\b", "aa rahi", t, flags=re.I)
    t = re.sub(r"\b(aa\s*rha|aarha|arha|aaraha|araha)\b", "aa raha", t, flags=re.I)
    t = re.sub(r"\b(aa\s*rhe|aarhe|arhe|aaraye)\b", "aa rahe", t, flags=re.I)
    t = re.sub(r"\b(ho\s*gae|ho\s*gai|ho\s*gy|hogai|hogayi)\b", "ho gayi", t, flags=re.I)
    t = re.sub(r"\b(ho\s*gaya|hogaya|hogy)\b", "ho gaya", t, flags=re.I)
    t = re.sub(r"\b(kar\s*diya|kardiya|kr\s*diya)\b", "kar diya", t, flags=re.I)
    t = re.sub(r"\b(chal\s*rahi|chalrhi|chl\s*rhi)\b", "chal rahi", t, flags=re.I)
    t = re.sub(r"\b(jal\s*raha|jalrha|jl\s*rha)\b", "jal raha", t, flags=re.I)
    t = re.sub(r"\b(band\s*hai|bnd\s*h|bnd\s*hai)\b", "band hai", t, flags=re.I)
    t = re.sub(r"\b(toot\s*gai|tut\s*gai|tootgai|tutgai)\b", "toot gayi", t, flags=re.I)
    return t


def normalize_roman_urdu_v13_2(raw_text: str) -> str:
    if not raw_text or not isinstance(raw_text, str):
        return ""

    text = unicodedata.normalize("NFKD", raw_text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))

    text = collapse_repeated_characters(text)
    text = split_joined_civic_tokens(text)

    # Token-by-token replacement preserving punctuation
    tokens = re.split(r"(\s+|[.,!?;:()\[\]\"'–—/])", text)
    for i in range(len(tokens)):
        token = tokens[i]
        if not token or token.isspace() or re.match(r"^[.,!?;:()\[\]\"'–—/]$", token):
            continue
        clean_word = re.sub(r"[^a-z0-9_-]", "", token.lower())
        canonical = VARIANT_TO_LEMMA.get(clean_word)
        if canonical:
            tokens[i] = canonical

    text = "".join(tokens)
    text = normalize_verbal_stems(text)
    return re.sub(r"[ \t]+", " ", text).strip()
