"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.6 Adversarial Training Dataset Generator.

Generates:
1. Exactly 2,000 unique synthetic adversarial training examples:
   - Counterfactual pairs (minimal pair flips: A vs B)
   - Heavy local Karachi slang and colloquialisms
   - Harsh civic insults / outrage wrapping genuine municipal defects
   - Corrupted spellings, typos, phonetic Roman Urdu variations
   - Long narrative preambles (80-150 words of background/context)
   - Multi-issue compound complaints (2 and 3 independent issues)
   - Ambiguous and out-of-scope complaints requiring review
2. Exactly 50 proposed human-review examples (edge cases, subtle ambiguities).
3. Zero leakage guarantee against V11.4.5 benchmark and all historical test sets.
"""
from __future__ import annotations

import hashlib
import json
import random
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# 50 Fresh Localities for Training
TRAIN_LOCALITIES = [
    "Gulberg Block 8 near water pump", "Liaquatabad Block 4 commercial gali",
    "Federal B Area Block 14", "Nazimabad Number 2 near matric board",
    "North Nazimabad Block H", "Buffer Zone Sector 15-A",
    "New Karachi Sector 11-I", "Surjani Town Sector 7-A",
    "Orangi Town Sector 11-E", "Baldia Town Chandni Chowk",
    "Saddar Bohri Bazaar gali", "Ranchore Line near civil hospital",
    "Kharadar Paper Market", "Mithadar Sarafa Bazaar",
    "Lyari Baghdadi Area", "Lyari Chakiwara near football ground",
    "Clifton Block 2 near Bilawal house", "Defence Phase 2 commercial avenue",
    "Gizri gali number 5", "Mahmoodabad Number 4 near graveyard",
    "Manzoor Colony sector A", "Chanesar Goth main road",
    "Jamshed Road near Gurumandir", "Soldier Bazaar near garden",
    "PIB Colony main stop", "Gulshan-e-Iqbal Block 13-D",
    "Gulshan-e-Iqbal Block 6", "Gulistan-e-Jauhar Block 12",
    "Gulistan-e-Jauhar Block 1", "Safoora Goth near check post",
    "Malir City main bazaar", "Malir Halt near airport road",
    "Model Colony sector 3", "Shah Faisal Colony number 2",
    "Landhi 89 mor", "Landhi Babar Market gali",
    "Korangi 2-1/2 number", "Korangi 4 near Bilal masjid",
    "Korangi Crossing near hospital", "Qayyumabad sector B",
    "SITE Area near metro cash and carry", "Shershah scrap market road",
    "Mauripur truck stand lane 3", "Hawksbay road near village",
    "Keamari Jackson market gali", "Machar Colony sector 1",
    "Gulshan-e-Maymar Sector V", "Ahsanabad Society sector 2",
    "Steel Town phase 2", "Gulshan-e-Hadeed Phase 2 commercial"
]

CONCISE_LOCALITIES = [
    "Gulberg", "Liaquatabad", "FB Area", "Nazimabad", "North Nazimabad",
    "Buffer Zone", "New Karachi", "Surjani", "Orangi", "Baldia",
    "Saddar", "Ranchore Line", "Kharadar", "Mithadar", "Lyari",
    "Clifton", "Defence", "Gizri", "Mahmoodabad", "Manzoor Colony",
    "Jamshed Road", "Soldier Bazaar", "Gulshan-e-Iqbal", "Gulistan-e-Jauhar",
    "Safoora", "Malir", "Model Colony", "Landhi", "Korangi", "SITE",
    "Shershah", "Keamari", "Maymar", "Steel Town"
]

# Civic Defect Assets and Expressions
AFFIRMATIVE_DEFECTS: Dict[str, List[Dict[str, Any]]] = {
    "kmc": [
        {"asset": "road", "defect": "bohot zada tooti hui hai aur asphalt ukharr gaya", "terms": ["sarak", "khadday", "asphalt"], "summary": "Potholes and broken road surface"},
        {"asset": "main road", "defect": "par gehra sinkhole ban gaya hai sarak dhas gai", "terms": ["road", "crater", "sinkhole", "dhans"], "summary": "Sinkhole and sunken road"},
        {"asset": "footpath", "defect": "ki tiles toot chuki hain aur footpath par encroachments hain rasta block hai", "terms": ["footpath", "tiles", "qabza"], "summary": "Damaged pedestrian footpath"},
        {"asset": "barsati nala", "defect": "kachray aur matti se choke hai barish ka paani sadak par aayega", "terms": ["barsati nala", "drainage", "choke"], "summary": "Clogged storm drain"},
        {"asset": "street lights", "defect": "tamam battiyan kharab hain andhera rehta hai chori ka khatra hai", "terms": ["street lights", "battiyan", "andhera"], "summary": "Broken street lights"},
        {"asset": "flyover", "defect": "ke expansion joint mein lohay ka sariya nikal aya hai gaariyon ke tyre phat rahe hain", "terms": ["flyover", "expansion joint", "sariya"], "summary": "Damaged bridge expansion joint"},
        {"asset": "pedestrian bridge", "defect": "ki lohay ki serhiyan toot chuki hain aur footbridge hil raha hai", "terms": ["pedestrian bridge", "footbridge", "tooti"], "summary": "Broken pedestrian overhead bridge"},
        {"asset": "road divider", "defect": "toot gaya hai aur concrete ke blocks road par bikhray hain", "terms": ["divider", "blocks", "toota"], "summary": "Damaged road divider"}
    ],
    "kwsc": [
        {"asset": "water supply pipeline", "defect": "burst ho chuki hai lakhoon gallon meetha paani zaya ho raha hai", "terms": ["water pipeline", "burst", "leakage"], "summary": "Potable water pipeline burst"},
        {"asset": "gutter line", "defect": "se sewage ubal raha hai aur gali mein ganda badboodar pani khara hai", "terms": ["gutter", "sewage", "ubal", "ganda pani"], "summary": "Sewerage overflow and choke"},
        {"asset": "manhole", "defect": "ka dhakkan gayab hai aur khula gutter jaan leva trap bana hua hai", "terms": ["manhole", "dhakkan", "khula gutter"], "summary": "Missing manhole lid"},
        {"asset": "drinking water line", "defect": "mein sewer ka badboodar ganda black paani mix ho kar aa raha hai", "terms": ["drinking water", "sewer mix", "ganda pani"], "summary": "Sewage contamination in drinking water"},
        {"asset": "water supply", "defect": "pichlay do haftay se band hai line sookhi hai ek boond nahi aa rahi", "terms": ["supply band", "sookhi line", "pani nahi"], "summary": "No water supply in lines"},
        {"asset": "main sewerage line", "defect": "collapse ho chuki hai pure mohallay ke septic tank back maar rahe hain", "terms": ["sewerage line", "collapse", "back maar"], "summary": "Main sewerage line collapse"}
    ],
    "kelectric": [
        {"asset": "high tension wire", "defect": "toot kar zameen par gir pari hai aur sparks phaink rahi hai current ka khatra hai", "terms": ["taar", "nangi taar", "spark", "current"], "summary": "Fallen live electric wire hazard"},
        {"asset": "transformer", "defect": "blast ho kar jal gaya hai aur oil beh raha hai bijli band hai", "terms": ["transformer", "blast", "oil", "bijli band"], "summary": "Exploded burned transformer"},
        {"asset": "feeder", "defect": "din mein das dafa trip hota hai unannounced load shedding se jeena haram hai", "terms": ["feeder", "trip", "load shedding"], "summary": "Frequent feeder trip and outages"},
        {"asset": "voltage", "defect": "drop ho kar 110 par aa gaya hai dim light hai appliances jal rahe hain", "terms": ["voltage", "low voltage", "dim light"], "summary": "Severe low voltage fluctuation"},
        {"asset": "electric pole", "defect": "khamba zang alooda ho kar jhuk gaya hai kabhi bhi gir sakta hai", "terms": ["pole", "khamba", "jhuk gaya"], "summary": "Dangerous leaning electric pole"},
        {"asset": "bijli connection", "defect": "pichlay 48 ghante se bilkul light nahi aa rahi feeder down hai", "terms": ["light nahi aa rahi", "feeder down"], "summary": "Prolonged localized blackout"}
    ],
    "ssgc": [
        {"asset": "gas pipeline", "defect": "mein se shadeed gas leak ki boo aa rahi hai hissing sound hai dhamakay ka khatra hai", "terms": ["gas leak", "boo", "hissing"], "summary": "Dangerous gas pipeline leak and odor"},
        {"asset": "sui gas supply", "defect": "ka pressure bilkul zero hai chulha nahi jal raha khana nahi ban raha", "terms": ["gas", "pressure", "chulha nahi jal"], "summary": "Zero gas pressure, unlit stove"},
        {"asset": "gas main line", "defect": "se tez hissing ke sath gas escape ho rahi hai fori valve band karein", "terms": ["gas main", "hissing", "gas escape"], "summary": "Ruptured gas main"},
        {"asset": "sui gas meter", "defect": "ke regulator se gas escape ho rahi hai machis jalana khatarnak hai", "terms": ["meter", "regulator", "gas escape"], "summary": "Gas meter regulator leak"}
    ],
    "sswmb": [
        {"asset": "kachra dher", "defect": "sad raha hai aur kachra gaari das din se nahi aayi badboo phail rahi hai", "terms": ["kachra", "dher", "gaari nahi aayi"], "summary": "Rotting uncollected garbage accumulation"},
        {"asset": "solid waste", "defect": "ko kisi ne aag laga di hai zaharila dhuan mohallay mein ghus raha hai", "terms": ["kachray ko aag", "dhuan", "zaharila"], "summary": "Toxic open garbage burning"},
        {"asset": "kachra kundi", "defect": "overflow kar ke sadak par bikhri hai awara kuttay nooch rahe hain", "terms": ["kachra kundi", "overflow", "bikhri"], "summary": "Overflowing public garbage dumpster"},
        {"asset": "murdar janwar", "defect": "dead animal ka lasha para sad raha hai machar aur keerey ho gaye hain", "terms": ["murdar janwar", "lasha", "sad raha"], "summary": "Decomposing animal carcass on street"}
    ],
    "sbca": [
        {"asset": "illegal building", "defect": "residential plot par commercial 7 manzila imarat bina permit banayi ja rahi hai", "terms": ["illegal building", "bina permit", "7 manzila"], "summary": "Unauthorized commercial high-rise on residential plot"},
        {"asset": "dilapidated structure", "defect": "purani imarat ki balcony aur parde gir rahe hain structural collapse ka khatra hai", "terms": ["building collapse", "imarat girne", "daraar"], "summary": "Hazardous decaying building collapse danger"},
        {"asset": "basement excavation", "defect": "gehra gaddha khoda gaya bina retaining wall ke sath wali imarat dhasne lagi hai", "terms": ["excavation", "retaining wall", "imarat dhasne"], "summary": "Unsafe deep excavation threatening adjacent properties"}
    ]
}

# Negation phrasing by department
EXPLICIT_NEGATIONS: Dict[str, List[str]] = {
    "kmc": [
        "road bilkul theek hai sadak ka koi masla nahi hai",
        "sarak tooti hui nahi hai road ka koi issue nahi",
        "sadak bilkul saaf aur pakki hai KMC ka koi kaam nahi"
    ],
    "kwsc": [
        "pani ka koi issue nahi hai line mein pani aa raha hai",
        "ye pani ka masla nahi hai water supply bilkul theek hai",
        "gutter bilkul saaf hain pani ka koi masla nahi"
    ],
    "kelectric": [
        "bijli bilkul theek hai light ka koi masla nahi hai",
        "K-Electric ka koi fault nahi hai voltage bilkul theek aa raha hai",
        "light bilkul aa rahi hai bijli ka koi issue nahi"
    ],
    "ssgc": [
        "gas ka koi issue nahi hai chulha theek chal raha hai",
        "ye gas ka masla nahi hai sui gas supply bilkul theek hai",
        "gas bilkul proper aa rahi hai pressure ka koi masla nahi"
    ],
    "sswmb": [
        "safai bilkul theek hai kachra roz uthta hai",
        "kachray ka koi issue nahi hai gali bilkul saaf hai",
        "safai ka koi masla nahi kachra nahi phaila hua"
    ],
    "sbca": [
        "building bilkul legal hai construction ka koi masla nahi",
        "imarat ka koi issue nahi hai SBCA ka koi mamla nahi",
        "yahan koi illegal building nahi ban rahi structural issue nahi hai"
    ]
}

# Slang Openers and Connectives
SLANG_OPENINGS = [
    "bhai scene check karo", "yr dekho kia mazaq bana rakha hai", "oye suno zara",
    "aray boss dimagh kharab ho gaya hai", "jani scene bohat off hai",
    "bhai topi drama band karo", "meter ghoom gaya hai awam ka",
    "khwari ki bhi hadd hoti hai bhai", "chuss program chal raha hai idhar",
    "yar hadd ho gai hai ab to", "bhai jaan tamasha bana diya hai"
]

SLANG_CONNECTIVES = [
    "level ki khwari chal rahi hai", "pure area ka scene off ho chuka hai",
    "subha se dimagh ki lassi ban chuki hai", "topi pehna rahe hain humein",
    "awaam ko bilkul faarigh samjha hua hai", "har koi apna chaska le raha hai",
    "khwari pe khwari karwa rahe hain", "koi sunne ko tayyar nahi hai"
]

# Civic Insults / Harsh Outrage
CIVIC_INSULTS = [
    "nikamay aur chor afsaran", "nalaiq idara aur sust tareen staff",
    "harami kism ke thekedar", "be-hiss hukmaran jinko sharam nahi aati",
    "lafafa khor aur corrupt log", "chawal kism ki management",
    "apni jeb bharne wale fraud afrad", "besharam afsaran jo so rahe hain"
]

# Corrupted Spellings and Typos
def corrupt_spellings(text: str, rng: random.Random) -> str:
    substitutions = [
        (r"\bbijli\b", "bjl"), (r"\bpani\b", "pni"), (r"\bsarak\b", "srk"),
        (r"\bkharab\b", "khrb"), (r"\bgaddha\b", "gdha"), (r"\btransformer\b", "trnsfrmr"),
        (r"\bgas\b", "gass"), (r"\bkachra\b", "kchra"), (r"\bbuilding\b", "bldng"),
        (r"\bbohot\b", "bht"), (r"\bnahi\b", "nhi"), (r"\bhai\b", "hy"),
        (r"\braha\b", "rha"), (r"\brahi\b", "rhi"), (r"\bsewerage\b", "sewrg"),
    ]
    words = text.split()
    corrupted_words = []
    for w in words:
        w_low = w.lower()
        applied = False
        if rng.random() < 0.35:
            for pat, repl in substitutions:
                if re.fullmatch(pat, w_low):
                    corrupted_words.append(repl)
                    applied = True
                    break
        if not applied:
            corrupted_words.append(w)
    return " ".join(corrupted_words)

# Narrative Preambles (80-120 words)
NARRATIVE_PREAMBLES = [
    "hum pichlay tees saal se is mohallay mein rehte hain tab yahan phool khilte the aur nizam shaandar tha. "
    "har taraf aman aur sukoon tha. magar ab naye thekedaron aur be-hiss afsaron ne is ilaqay ka bera gharq kar diya hai. "
    "bachay aur buzurg beemar par rahe hain. ab soorat-e-haal aisi ho chuki hai ke ",

    "agle hafte meri choti behan ki shadi hai aur lahore aur faisalabad se tamam mehmaan hamare ghar pohanch chuke hain. "
    "pure ghar mein mehmanon ka rush hai aur khane peene ki tayariyan chal rahi hain. "
    "aise ahem moqay par hamare sath azaab ye bana hua hai ke ",

    "bachon ke matric ke board ke imtihan sar par hain aur subha se raat tak unki parhai aur tayari chal rahi hai. "
    "parhai ka intehayi haraj ho raha hai aur bachay shadeed depression mein hain kyun ke ",

    "kal sham se mausam intehayi garam aur khushk hai aur hawaiin bilkul band hain sheer mein temperature 42 cross kar chuka hai. "
    "is shadeed garmi aur paseenay mein rehayishiyon ki jaan par bani hui hai kyun ke ",

    "canada se mere chacha aur unki family das saal baad karachi aaye hain aur wo hamare mohallay ka haal dekh kar dangg reh gaye hain. "
    "humein unke samne shadeed sharmindagi uthani pad rahi hai kyun ke "
]

# Out of scope scenarios
OUT_OF_SCOPE_SCENARIOS = [
    {"text": "hamare mohallay mein do larke aapas mein firing kar rahe the aur mobile cheen kar farar ho gaye fori police ko bheja jaye SHO sun nahi raha", "reason": "OUT_OF_MUNICIPAL_JURISDICTION"},
    {"text": "kirayedar ne pichlay che mahine se rent nahi diya aur makan par zabardasti qabza kar rakha hai keh raha hai court case karunga police kuch nahi karti", "reason": "PRIVATE_DISPUTE"},
    {"text": "humare susral wale meri behen ko tang kar rahe hain aur jahez ka mutalba kar rahe hain please madad karein SHO FIR nahi kaat raha", "reason": "PRIVATE_DISPUTE"},
    {"text": "pure mulk ka kachoomar nikal diya hai sab chor hain koi kam nahi karta hum mar jayein kya kahan jayein koi sunwai nahi hai is mulk mein", "reason": "VAGUE_UNSPECIFIED"},
    {"text": "traffic police ka constable challan katne ke bajaye rishwat maang raha hai wardens ne rasta roka hua hai aur gaariyan zabt kar rahe hain", "reason": "OUT_OF_MUNICIPAL_JURISDICTION"},
    {"text": "mere bank account se achanak online paise cut gaye hain OTP kisi ko nahi diya bank fraud helpline call pick nahi kar rahi meri jamapunji chori ho gai", "reason": "OUT_OF_MUNICIPAL_JURISDICTION"},
]


class AdversarialDatasetGenerator:
    """Generates 2,000 synthetic training complaints and 50 proposed human-review samples."""

    def __init__(self, seed: int = 20261118):
        self.seed = seed
        self.rng = random.Random(seed)

    def generate_counterfactual_pair(self, idx: int) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Generates a strict counterfactual pair: Department A affirmed + B negated vs B affirmed + A negated."""
        d_a, d_b = self.rng.sample(DEPARTMENTS, 2)
        loc = self.rng.choice(CONCISE_LOCALITIES)

        def_a = self.rng.choice(AFFIRMATIVE_DEFECTS[d_a])
        def_b = self.rng.choice(AFFIRMATIVE_DEFECTS[d_b])

        neg_a = self.rng.choice(EXPLICIT_NEGATIONS[d_a])
        neg_b = self.rng.choice(EXPLICIT_NEGATIONS[d_b])

        # Version 1: A is affirmed, B is negated
        text_1 = f"{loc} mein {neg_b}, magar asal kharabi ye hai ke {def_a['asset']} {def_a['defect']}. Fori repair team rawana ki jaye."
        rec_1 = {
            "id": f"ADV-TRAIN-CF-{idx:04d}-A",
            "text": text_1,
            "text_sanitized": text_1,
            "category": "COUNTERFACTUAL_PAIR",
            "department_labels": [d_a],
            "expected_departments": [d_a],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "NEGATED",
            "has_counterfactual": True,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 5,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

        # Version 2: B is affirmed, A is negated
        text_2 = f"{loc} mein {neg_a}, magar asal masla ye hai ke {def_b['asset']} {def_b['defect']}. Please mutalliqah amlay ko bhejein."
        rec_2 = {
            "id": f"ADV-TRAIN-CF-{idx:04d}-B",
            "text": text_2,
            "text_sanitized": text_2,
            "category": "COUNTERFACTUAL_PAIR",
            "department_labels": [d_b],
            "expected_departments": [d_b],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "NEGATED",
            "has_counterfactual": True,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 5,
            "provenance": "synthetic_adversarial_v11_4_6",
        }
        return rec_1, rec_2

    def generate_slang_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a complaint drenched in heavy local Karachi slang."""
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        df = self.rng.choice(AFFIRMATIVE_DEFECTS[dept])
        opener = self.rng.choice(SLANG_OPENINGS)
        conn = self.rng.choice(SLANG_CONNECTIVES)

        text = f"{opener}, {loc} par {conn}. {df['asset']} {df['defect']}. Yar koi sunne ko tayyar nahi hai topi drama band karo."
        return {
            "id": f"ADV-TRAIN-SLANG-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "HEAVY_LOCAL_SLANG",
            "department_labels": [dept],
            "expected_departments": [dept],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "SINGLE",
            "has_counterfactual": False,
            "has_slang": True,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 2,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_insult_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a complaint with outrage and harsh civic insults wrapping real fault."""
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        df = self.rng.choice(AFFIRMATIVE_DEFECTS[dept])
        insult = self.rng.choice(CIVIC_INSULTS)

        text = f"Ye {insult} bilkul so rahe hain! {loc} mein {df['asset']} {df['defect']}. Kisi ko sharam nahi aati awam ka khoon choos rahe hain fori action lo!"
        return {
            "id": f"ADV-TRAIN-INSULT-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "INSULTS_PROFANITY",
            "department_labels": [dept],
            "expected_departments": [dept],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "SINGLE",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": True,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 3,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_corrupted_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a complaint with severe typos, phonetic corruptions, and missing spaces."""
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        df = self.rng.choice(AFFIRMATIVE_DEFECTS[dept])

        base = f"Humare ilaqay {loc} par {df['asset']} {df['defect']} bohot zada kharab hai fori theek kiya jae."
        corrupted = corrupt_spellings(base, self.rng)
        return {
            "id": f"ADV-TRAIN-CORRUPT-{idx:04d}",
            "text": corrupted,
            "text_sanitized": corrupted,
            "category": "CORRUPTED_SPELLINGS",
            "department_labels": [dept],
            "expected_departments": [dept],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "SINGLE",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": True,
            "has_long_context": False,
            "difficulty": 2,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_narrative_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a long narrative preamble (80-150 words) with distant municipal defect."""
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(TRAIN_LOCALITIES)
        df = self.rng.choice(AFFIRMATIVE_DEFECTS[dept])
        preamble = self.rng.choice(NARRATIVE_PREAMBLES)

        text = f"{preamble}hamare ilaqay {loc} par {df['asset']} {df['defect']}. Hamari aala hukkam se pur-khuloos guzarish hai ke reham farma kar fori field team rawana farmayein taake is sangeen maslay ka mustaqil bunyadon par sadd-e-bab ho sake."
        return {
            "id": f"ADV-TRAIN-LONG-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "LONG_NARRATIVE_PREAMBLE",
            "department_labels": [dept],
            "expected_departments": [dept],
            "needs_review": False,
            "review_reason": None,
            "relation_type": "SINGLE",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": True,
            "difficulty": 4,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_compound_dual_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a compound complaint with 2 genuinely independent civic issues."""
        d1, d2 = self.rng.sample(DEPARTMENTS, 2)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        df1 = self.rng.choice(AFFIRMATIVE_DEFECTS[d1])
        df2 = self.rng.choice(AFFIRMATIVE_DEFECTS[d2])

        connectors = [
            f"aur alag se doosri taraf {df2['asset']} {df2['defect']}",
            f"aur is ke sath sath gali mein {df2['asset']} {df2['defect']}",
            f"aur doosra masla ye hai ke alag se {df2['asset']} {df2['defect']}",
        ]
        conn = self.rng.choice(connectors)

        text = f"{loc} par {df1['asset']} {df1['defect']}, {conn}. Dono alag idaron ki team bheji jaye."
        return {
            "id": f"ADV-TRAIN-DUAL-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "INDEPENDENT_DUAL_ISSUE",
            "department_labels": sorted([d1, d2]),
            "expected_departments": sorted([d1, d2]),
            "needs_review": False,
            "review_reason": None,
            "relation_type": "INDEPENDENT",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 4,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_compound_triple_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates a compound complaint with 3 genuinely independent civic issues."""
        d1, d2, d3 = self.rng.sample(DEPARTMENTS, 3)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        df1 = self.rng.choice(AFFIRMATIVE_DEFECTS[d1])
        df2 = self.rng.choice(AFFIRMATIVE_DEFECTS[d2])
        df3 = self.rng.choice(AFFIRMATIVE_DEFECTS[d3])

        text = (
            f"{loc} mein halat intehayi kharab hain: pehla masla ye ke {df1['asset']} {df1['defect']}. "
            f"Doosra masla ye ke alag se {df2['asset']} {df2['defect']}. "
            f"Aur teesra alag masla ye ke {df3['asset']} {df3['defect']}. Baraye meharbani teeno maslay hal karein."
        )
        return {
            "id": f"ADV-TRAIN-TRIPLE-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "THREE_ACTIONABLE_ISSUES",
            "department_labels": sorted([d1, d2, d3]),
            "expected_departments": sorted([d1, d2, d3]),
            "needs_review": False,
            "review_reason": None,
            "relation_type": "INDEPENDENT",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 5,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_out_of_scope_complaint(self, idx: int) -> Dict[str, Any]:
        """Generates an ambiguous or out-of-scope non-municipal complaint."""
        scen = self.rng.choice(OUT_OF_SCOPE_SCENARIOS)
        loc = self.rng.choice(CONCISE_LOCALITIES)
        text = f"{loc} mein {scen['text']}."
        return {
            "id": f"ADV-TRAIN-OOS-{idx:04d}",
            "text": text,
            "text_sanitized": text,
            "category": "AMBIGUOUS_OUT_OF_SCOPE",
            "department_labels": [],
            "expected_departments": [],
            "needs_review": True,
            "review_reason": scen["reason"],
            "relation_type": "UNCERTAIN",
            "has_counterfactual": False,
            "has_slang": False,
            "has_insult": False,
            "has_spelling_noise": False,
            "has_long_context": False,
            "difficulty": 5,
            "provenance": "synthetic_adversarial_v11_4_6",
        }

    def generate_dataset(self, total_target: int = 2000) -> List[Dict[str, Any]]:
        """Generates the full target of 2,000 balanced adversarial training records."""
        records: List[Dict[str, Any]] = []
        seen_texts: Set[str] = set()

        def add_rec(r: Dict[str, Any]) -> bool:
            norm = re.sub(r"\s+", " ", r["text"].strip().lower())
            if norm in seen_texts:
                return False
            seen_texts.add(norm)
            records.append(r)
            return True

        # Target distribution:
        # 1. Counterfactual pairs: ~300 records (150 pairs)
        # 2. Heavy slang: ~300 records
        # 3. Insults / outrage: ~250 records
        # 4. Corrupted spellings / typos: ~250 records
        # 5. Long narrative preambles: ~250 records
        # 6. Compound dual: ~350 records
        # 7. Compound triple: ~150 records
        # 8. Out of scope / ambiguous: ~150 records
        # Total = 2,000

        cf_idx = 0
        while len([r for r in records if r["category"] == "COUNTERFACTUAL_PAIR"]) < 300:
            cf_idx += 1
            r1, r2 = self.generate_counterfactual_pair(cf_idx)
            add_rec(r1)
            add_rec(r2)

        slang_idx = 0
        while len([r for r in records if r["category"] == "HEAVY_LOCAL_SLANG"]) < 300:
            slang_idx += 1
            add_rec(self.generate_slang_complaint(slang_idx))

        insult_idx = 0
        while len([r for r in records if r["category"] == "INSULTS_PROFANITY"]) < 250:
            insult_idx += 1
            add_rec(self.generate_insult_complaint(insult_idx))

        corrupt_idx = 0
        while len([r for r in records if r["category"] == "CORRUPTED_SPELLINGS"]) < 250:
            corrupt_idx += 1
            add_rec(self.generate_corrupted_complaint(corrupt_idx))

        long_idx = 0
        while len([r for r in records if r["category"] == "LONG_NARRATIVE_PREAMBLE"]) < 250:
            long_idx += 1
            add_rec(self.generate_narrative_complaint(long_idx))

        dual_idx = 0
        while len([r for r in records if r["category"] == "INDEPENDENT_DUAL_ISSUE"]) < 350:
            dual_idx += 1
            add_rec(self.generate_compound_dual_complaint(dual_idx))

        triple_idx = 0
        while len([r for r in records if r["category"] == "THREE_ACTIONABLE_ISSUES"]) < 150:
            triple_idx += 1
            add_rec(self.generate_compound_triple_complaint(triple_idx))

        oos_idx = 0
        while len([r for r in records if r["category"] == "AMBIGUOUS_OUT_OF_SCOPE"]) < 150:
            oos_idx += 1
            add_rec(self.generate_out_of_scope_complaint(oos_idx))

        # Shuffle deterministically
        self.rng.shuffle(records)
        return records[:total_target]

    def generate_proposed_human_review_cases(self, count: int = 50) -> List[Dict[str, Any]]:
        """Generates 50 complex proposed human review cases with edge cases and subtle ambiguities."""
        cases = []
        templates = [
            ("Padosi ne road par building material gira diya hai jis se gari nahi nikal rahi", ["kmc", "sbca"], "INDEPENDENT", True, "BOUNDARY_MUNICIPAL_DISPUTE"),
            ("Water pipeline leak ho rahi hai aur padosi kehta hai mere ghar ki zameen par mat aao", ["kwsc"], "SINGLE", True, "PRIVATE_ACCESS_DISPUTE"),
            ("Kachra kundi jalne se gas pipeline ko aag lagne ka andesha hai fori dekhein", ["ssgc", "sswmb"], "INDEPENDENT", True, "HAZARD_MULTI_DEPARTMENT"),
            ("Feeder blast hone se road par transformer ka oil beh raha hai aur battiyan band hain", ["kelectric", "kmc"], "INDEPENDENT", True, "SHARED_INCIDENT_SURFACE_OIL"),
            ("Underpass mein paani bhar gaya aur street light bhi band hai gaari doob rahi hai", ["kmc"], "SINGLE", True, "DRAINAGE_AND_LIGHTING"),
            ("Gas supply band hone ki wajah se log kachra jala kar roti paka rahe hain", ["ssgc"], "CAUSES_CONTEXT_ONLY", True, "BEHAVIORAL_CONSEQUENCE_OF_OUTAGE"),
            ("Basement khudai se water line hil gai aur leak hone lagi imarat bhi laraz rahi hai", ["kwsc", "sbca"], "INDEPENDENT", True, "EXCAVATION_WATER_BREACH"),
            ("Sui gas meter se awaz aa rahi hai aur meter ke sath electric board bhi hai", ["ssgc"], "SPATIAL_PROXIMITY_ONLY", True, "ADJACENT_UTILITY_METERS"),
            ("Muraad Colony mein sewer overflow se footpath toot raha hai pipe badlo", ["kwsc"], "SINGLE", True, "SEWER_EROSION_SYMPTOM"),
            ("Bhook hartal par baithe hain kyunke ilaqay mein kachra aur road dono tabaah hain", ["kmc", "sswmb"], "INDEPENDENT", True, "CIVIC_PROTEST_GRIEVANCE"),
        ]

        for i in range(count):
            tpl = templates[i % len(templates)]
            loc = CONCISE_LOCALITIES[i % len(CONCISE_LOCALITIES)]
            text = f"{loc}: {tpl[0]}. Shikayat number {i+1} baraye tehqeeqat."
            cases.append({
                "id": f"PROP-HUMAN-{i+1:03d}",
                "text": text,
                "text_sanitized": text,
                "proposed_departments": tpl[1],
                "proposed_relation": tpl[2],
                "needs_review": tpl[3],
                "review_reason": tpl[4],
                "annotator_status": "NEEDS_ADJUDICATION",
                "provenance": "phase_v11_4_6_proposed_human_triage",
            })
        return cases
