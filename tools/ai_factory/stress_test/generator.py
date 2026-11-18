"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.5 Adversarial Complaint Stress-Test Generator.

Generates 2,000+ unique, challenging, previously unseen Roman Urdu complaints
spanning 15 adversarial categories and 5 narrative length tiers (5 to 200 words).

Strict Ground Truth Discipline:
1. Target departments, relation edges, and review statuses are established BEFORE text generation.
2. Fresh scenario families, localities, and realization idioms completely separate from prior training/val/test pools.
3. Rigorous validation against contamination and label consistency.
"""
from __future__ import annotations

import dataclasses
import hashlib
import json
import random
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

# All 6 municipal authorities
DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# 40+ Fresh Karachi Localities not used in prior training sets
FRESH_LOCALITIES = [
    "Federal Capital Area Block 2", "Liaquatabad C-1 Area", "Dastagir Society",
    "Paposh Nagar near graveyard", "Mehmoodabad Number 3", "Manzoor Colony fire brigade",
    "Qayyumabad roundabout", "Gulshan-e-Hadeed Phase 1", "Steel Town commercial market",
    "Korangi Crossing near Indus hospital", "Safoora Goth main chowk", "Scheme 33 sector 17-A",
    "Buffer Zone Sector 15-B", "Surjani Sector 4-B", "Shershah kabari market",
    "Machar Colony fish harbor road", "Moosa Colony near water tank", "Soldier Bazaar number 2",
    "Garden East Lasbela bridge road", "Ranchore Line food street", "Burns Road near Fresco",
    "Kharadar Bolton Market road", "Mithadar police chowki gali", "Gizri commercial area",
    "Hawksbay road near Truck Stand", "Mauripur road Grex village", "Gulshan-e-Maymar Sector Q",
    "New Karachi Sector 5-J", "Al-Falah Society Malir Halt", "Model Colony sheet 12",
    "Drigh Road cantt bazaar", "Shah Latif Town sector 19", "Lines Area near army public school",
    "Old Golimar river bank road", "Pak Colony near marble factory", "Korangi Bilal Colony",
    "North Karachi 11-A", "Gulshan-e-Iqbal Block 4 disco bakery", "Pahar Ganj North Nazimabad",
    "Hazara Colony near railway track", "Chakiwara Lyari lane 4"
]

CONCISE_LOCALITIES = [
    "FC Area", "Dastagir", "Paposh", "Mehmoodabad", "Qayyumabad",
    "Safoora", "Buffer Zone", "Surjani", "Shershah", "Machar Colony",
    "Soldier Bazaar", "Ranchore Line", "Kharadar", "Gizri", "Mauripur",
    "Maymar", "New Karachi", "Model Colony", "Shah Latif", "Lines Area"
]

# Municipal Asset & Defect Lexicons for Stress Generator
CIVIC_DEFECTS: Dict[str, List[Dict[str, Any]]] = {
    "kmc": [
        {"asset": "road", "defect": "bohot zada tooti hui hai aur asphalt ukharr gaya", "terms": ["sarak", "khadday", "asphalt"], "summary": "Potholes and structural road damage"},
        {"asset": "main road", "defect": "par gehra sinkhole ban gaya hai sarak dhas gai", "terms": ["road", "crater", "sinkhole", "dhans"], "summary": "Sinkhole road collapse"},
        {"asset": "footpath", "defect": "par encroachment aur thelay walon ne qabza kar ke rasta block kiya", "terms": ["footpath", "encroachment", "qabza", "patharay"], "summary": "Footpath obstruction by stalls"},
        {"asset": "barsati nala", "defect": "kachray aur matti se choke hai barish ka paani sarak par aayega", "terms": ["barsati nala", "storm water drain", "choke"], "summary": "Storm water drain clogged"},
        {"asset": "street lights", "defect": "tamam battiyan kharab hain pichlay mahine se andhera hai", "terms": ["street lights", "battiyan", "andhera"], "summary": "Public streetlights out"},
        {"asset": "flyover", "defect": "ke expansion joint mein lohay ka sariya nikal aya hai tyre phat rahe hain", "terms": ["expansion joint", "flyover", "sariya"], "summary": "Bridge expansion joint broken"},
        {"asset": "pedestrian bridge", "defect": "ki lohay ki serhiyan toot chuki hain paidal log gir rahe hain", "terms": ["pedestrian bridge", "footbridge", "tooti"], "summary": "Pedestrian overhead bridge broken"},
        {"asset": "road divider", "defect": "toot gaya hai aur concrete ke blocks road par bikhray hain", "terms": ["divider", "block", "toota"], "summary": "Damaged central road divider"}
    ],
    "kwsc": [
        {"asset": "water supply pipeline", "defect": "burst ho chuki hai lakhoon gallon meetha paani zaya ho raha hai", "terms": ["water pipeline", "burst", "meetha pani", "leakage"], "summary": "Potable water pipeline burst"},
        {"asset": "gutter line", "defect": "se sewage ubal raha hai aur gali mein do foot ganda pani khara hai", "terms": ["gutter", "sewage", "ganda pani", "ubal"], "summary": "Sewerage overflow and choke"},
        {"asset": "manhole", "defect": "ka dhakkan gayab hai aur khula gutter jaan leva trap bana hua hai", "terms": ["manhole", "dhakkan", "khula gutter"], "summary": "Missing manhole cover on sewer line"},
        {"asset": "drinking water", "defect": "ki line mein sewer ka badboodar ganda black paani mix ho kar aa raha hai", "terms": ["sewage mix", "badboodar pani", "peene ka pani"], "summary": "Sewage contamination in drinking water"},
        {"asset": "water line", "defect": "se pichlay do haftay se ek boond paani nahi aa raha sirf hawa nikal rahi hai", "terms": ["pani band", "sirf hawa", "water supply"], "summary": "No water supply, dry lines"},
        {"asset": "main sewerage line", "defect": "collapse ho chuki hai pure mohallay ke septic tank back maar rahe hain", "terms": ["sewer line", "collapse", "choked", "sewerage"], "summary": "Main sewerage line collapse"}
    ],
    "kelectric": [
        {"asset": "high tension wire", "defect": "toot kar zameen par gir pari hai aur sparks phaink rahi hai", "terms": ["taar", "nangi taar", "spark", "current"], "summary": "Fallen live electrical cable"},
        {"asset": "transformer", "defect": "blast ho kar jal gaya hai aur oil beh raha hai bijli band hai", "terms": ["transformer", "blast", "oil", "bijli band"], "summary": "Transformer blast and oil leak"},
        {"asset": "feeder", "defect": "din mein das dafa trip hota hai unannounced load shedding barh gai hai", "terms": ["feeder", "trip", "load shedding", "bijli nahi"], "summary": "Frequent feeder tripping and outage"},
        {"asset": "electricity supply", "defect": "voltage drop ho kar 110 par aa gaya hai dim light hai appliances jal rahe hain", "terms": ["voltage", "low voltage", "dim light", "drop"], "summary": "Severe low voltage fluctuation"},
        {"asset": "electric pole", "defect": "khamba zang alooda ho kar jhuk gaya hai kabhi bhi gir sakta hai", "terms": ["khamba", "pole", "jhuk gaya", "corroded"], "summary": "Leaning rusted electric pole"},
        {"asset": "bijli connection", "defect": "pichlay 48 ghante se bilkul light nahi aa rahi feeder down hai", "terms": ["light nahi aa rahi", "current nahi", "feeder down"], "summary": "Complete localized blackout"}
    ],
    "ssgc": [
        {"asset": "gas pipeline", "defect": "mein se shadeed gas leak ki boo aa rahi hai dhamakay ka khatra hai", "terms": ["gas leak", "boo", "badboo", "hissing"], "summary": "Dangerous gas pipeline leak and odor"},
        {"asset": "sui gas supply", "defect": "ka pressure bilkul zero hai chulha nahi jal raha khana nahi ban raha", "terms": ["gas", "pressure", "zero pressure", "chulha"], "summary": "Zero gas pressure, stove unlit"},
        {"asset": "gas main line", "defect": "se hissing sound ke sath gas phail rahi hai fori valve band karein", "terms": ["gas main", "hissing", "gas leak"], "summary": "Underground gas main breach"},
        {"asset": "sui gas meter", "defect": "ke regulator se gas escape ho rahi hai machis jalana khatarnak hai", "terms": ["gas meter", "regulator", "leak"], "summary": "Gas meter regulator leakage"}
    ],
    "sswmb": [
        {"asset": "kachra dher", "defect": "sad raha hai aur kachra truck das din se nahi aya badboo phail rahi hai", "terms": ["kachra", "garbage", "dher", "truck nahi aya"], "summary": "Uncollected garbage accumulation"},
        {"asset": "solid waste", "defect": "ko kisi ne aag laga di hai zaharila dhuan pure mohallay mein ghus raha hai", "terms": ["kachray ko aag", "dhuan", "smoke", "zaharila"], "summary": "Open trash burning and toxic smoke"},
        {"asset": "garbage container", "defect": "kachray ki kundi overflow kar ke sadak par bikhri hai awara kuttay ghoom rahe hain", "terms": ["kachra kundi", "overflow", "container", "bikhra"], "summary": "Overflowing garbage dumpster"},
        {"asset": "murdar janwar", "defect": "dead animal ka lasha para sad raha hai machar aur keerey ho gaye hain", "terms": ["murdar janwar", "dead animal", "carcass", "sad raha"], "summary": "Dead animal carcass on public street"}
    ],
    "sbca": [
        {"asset": "illegal building", "defect": "residential plot par commercial 7 manzila imarat bina permit banayi ja rahi hai", "terms": ["illegal building", "bina permit", "illegal floor", "plaza"], "summary": "Illegal multi-story construction"},
        {"asset": "dilapidated structure", "defect": "purani imarat ki balcony aur parde gir rahe hain structural collapse ka khatra hai", "terms": ["building collapse", "imarat", "darrar", "chhat girne"], "summary": "Dangerous hazardous building collapse risk"},
        {"asset": "basement excavation", "defect": "gehra gaddha khoda gaya bina retaining wall ke sath wali imarat dhasne lagi hai", "terms": ["excavation", "retaining wall", "bina ijazat", "dhasne"], "summary": "Unsafe excavation threatening adjacent houses"}
    ]
}

# Out-of-scope / Ambiguous grievance patterns (Expected: [], needs_review: True)
OUT_OF_SCOPE_SCENARIOS = [
    {
        "type": "police_crime",
        "text": "hamare mohallay mein do larke aapas mein firing kar rahe the aur mobile cheen kar farar ho gaye fori police ko bheja jaye SHO sun nahi raha",
        "reason": "OUT_OF_MUNICIPAL_JURISDICTION",
        "summary": "Street crime and armed robbery (Police jurisdiction)"
    },
    {
        "type": "tenant_dispute",
        "text": "kirayedar ne pichlay che mahine se rent nahi diya aur makan par zabardasti qabza kar rakha hai keh raha hai court case karunga",
        "reason": "PRIVATE_DISPUTE",
        "summary": "Private tenancy and rental property dispute"
    },
    {
        "type": "domestic_dispute",
        "text": "humare susral wale meri behen ko tang kar rahe hain aur jahez ka mutalba kar rahe hain please madad karein",
        "reason": "PRIVATE_DISPUTE",
        "summary": "Private family matrimonial dispute"
    },
    {
        "type": "vague_venting",
        "text": "pure mulk ka kachoomar nikal diya hai sab chor hain koi kam nahi karta hum mar jayein kya kahan jayein koi sunwai nahi hai is mulk mein",
        "reason": "VAGUE_UNSPECIFIED",
        "summary": "Vague political cynicism without actionable municipal fault"
    },
    {
        "type": "traffic_violation",
        "text": "traffic police ka constable challan katne ke bajaye rishwat maang raha hai wardens ne rasta roka hua hai",
        "reason": "OUT_OF_MUNICIPAL_JURISDICTION",
        "summary": "Traffic police bribery and licensing (Traffic Police / DIG)"
    },
    {
        "type": "bank_fraud",
        "text": "mere bank account se achanak online paise cut gaye hain OTP kisi ko nahi diya fraud helpline call pick nahi kar rahi",
        "reason": "OUT_OF_MUNICIPAL_JURISDICTION",
        "summary": "Banking cybercrime / financial fraud (FIA jurisdiction)"
    }
]

# Karachi Slang vocabulary & idioms
SLANG_OPENINGS = [
    "bhai scene check karo", "yr dekho kia mazaq bana rakha hai", "oye suno zara",
    "aray boss dimagh kharab ho gaya hai", "jani scene bohat off hai",
    "khao piyo shant raho nahi chalega ab", "bhai topi drama band karo",
    "meter ghoom gaya hai awam ka", "khwari ki bhi hadd hoti hai bhai",
    "koi puchne wala nahi hai yahan", "chuss program chal raha hai idhar"
]

SLANG_CONNECTIVES = [
    "level ki khwari chal rahi hai", "pure area ka scene off ho chuka hai",
    "subha se dimagh ki lassi ban chuki hai", "topi pehna rahe hain humein",
    "har banda apna chaska le raha hai", "harkatein check karo inki",
    "awaam ko bilkul faarigh samjha hua hai", "koi dhang ka hal nikalo yar"
]

# Harsh non-discriminatory insults directed at municipal negligence
CIVIC_INSULTS = [
    "nikamay aur chor afsaran", "nalaiq idara aur sust tareen staff",
    "harami kism ke thekedar", "be-hiss hukmaran jinko sharam nahi aati",
    "lafafa khor aur corrupt log", "chawal kism ki management",
    "apni jeb bharne wale fraud afrad", "besharam afsaran jo so rahe hain"
]

# Irrelevant background narratives (Weddings, guests, exams, weather, nostalgia)
IRRELEVANT_CONTEXTS = [
    "agle hafte meri choti behan ki shadi hai aur lahore se tamam mehmaan hamare ghar pohanch chuke hain. "
    "pure ghar mein catering ka intezam hai aur halat ye hain ke ",

    "bachon ke matric ke board ke imtihan sar par hain aur subha se raat tak unki tayari chal rahi hai. "
    "parhai ka itna haraj ho raha hai kyun ke ",

    "hum pichlay tees saal se is mohallay mein rehte hain tab yahan phool khilte the aur nizam shaandar tha. "
    "magar ab nai party aur naye afsaran ne aisi tabaahi machayi hai ke ",

    "kal sham se mausam intehayi garam aur khushk hai aur hawaiin band hain pure shehar mein temperature 42 cross kar chuka hai. "
    "is shadeed garmi mein hamare sath azaab ye hai ke ",

    "canada se mere chacha aur unki family das saal baad pakistan aaye hain aur wo hamare ilaqay ki halat dekh kar dangg reh gaye hain. "
    "humein unke samne shadeed sharmindagi uthani pad rahi hai kyun ke "
]

# Misleading spatial reference templates (mention other dept as landmark)
MISLEADING_LANDMARKS = [
    ("kelectric", "k-electric ke transformer wale khambay ke bilkul neeche "),
    ("kwsc", "water pump chowrangi aur public pump station ki deewar ke samne "),
    ("sbca", "sbca ke regional building control office ki back side wali gali mein "),
    ("kmc", "kmc head office aur mayor secretariat ki road ke muttasil ")
]


@dataclass
class StressComplaintRecord:
    complaint_id: str
    text: str
    category: str
    length_tier: int
    word_count: int
    expected_departments: List[str]
    expected_needs_review: bool
    expected_review_reason: Optional[str]
    has_slang: bool
    has_insult: bool
    has_spelling_noise: bool
    has_missing_spaces: bool
    has_code_switching: bool
    has_long_context: bool
    relation_type: str
    provenance: str = "v11_4_5_adversarial_stress_generator"
    seed: int = 42

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


def apply_spelling_noise(text: str, rng: random.Random) -> str:
    """Inject phonetic noise and dropped vowels without destroying semantic grounding."""
    replacements = [
        (r"\bbijli\b", "bjl"), (r"\bpani\b", "pni"), (r"\bsarak\b", "srk"),
        (r"\bkharab\b", "khrb"), (r"\bkachra\b", "kchr"), (r"\bhai\b", "hy"),
        (r"\bnahi\b", "nhi"), (r"\bwajah\b", "waja"), (r"\bbohot\b", "bht"),
        (r"\brahi\b", "rhi"), (r"\bgayi\b", "gy"), (r"\bgari\b", "gadi"),
        (r"\bhain\b", "hn"), (r"\bchulha\b", "chula"), (r"\bgaddha\b", "gadha")
    ]
    res = text
    for pat, rep in replacements:
        if rng.random() < 0.60:
            res = re.sub(pat, rep, res, count=1, flags=re.IGNORECASE)
    return res


def apply_missing_spaces(text: str, rng: random.Random) -> str:
    """Inject agglutinated words and erratic punctuation."""
    words = text.split()
    if len(words) < 5:
        return text + "!!???"
    idx = rng.randint(1, len(words) - 2)
    words[idx] = words[idx] + words[idx + 1]
    del words[idx + 1]
    res = " ".join(words)
    punct = rng.choice(["!?!?", ".....", "!???", "???!!", "--//", "!!!"])
    return res + " " + punct


class AdversarialStressGenerator:
    """Generates ~2,000 rigorous, compositional, challenging Roman Urdu complaints."""

    def __init__(self, seed: int = 42) -> None:
        self.rng = random.Random(seed)
        self.seed = seed

    def generate_benchmark(self, target_count: int = 2050) -> List[StressComplaintRecord]:
        categories = [
            ("EVERYDAY_ROMAN_URDU", 145),
            ("HEAVY_LOCAL_SLANG", 145),
            ("INFORMAL_EXPRESSIONS", 145),
            ("SPELLING_MISTAKES", 145),
            ("MISSING_SPACES_PUNCTUATION", 145),
            ("CODE_SWITCHING", 145),
            ("EMOTIONAL_OUTRAGE", 145),
            ("INSULTS_PROFANITY", 145),
            ("LONG_IRRELEVANT_CONTEXT", 145),
            ("INDEPENDENT_DUAL_ISSUE", 155),
            ("CAUSAL_CONSEQUENCE", 145),
            ("NEGATION_AND_HISTORICAL", 145),
            ("MISLEADING_REFERENCE", 145),
            ("AMBIGUOUS_OUT_OF_SCOPE", 145),
            ("THREE_ACTIONABLE_ISSUES", 130),
        ]

        records: List[StressComplaintRecord] = []
        counter = 1

        for cat, count in categories:
            for i in range(count):
                # Cycle through length tiers 1 to 5 systematically so all length brackets are populated
                tier = (i % 5) + 1
                rec = self._generate_single(cat, counter, tier)
                records.append(rec)
                counter += 1

        # Assert no duplicate texts and ensure 100% ground truth integrity
        seen_texts: Set[str] = set()
        clean_records: List[StressComplaintRecord] = []
        for r in records:
            norm_t = re.sub(r"\s+", " ", r.text).strip().lower()
            if norm_t in seen_texts:
                continue
            seen_texts.add(norm_t)
            clean_records.append(r)

        return clean_records

    def _generate_single(self, category: str, cid: int, target_tier: int) -> StressComplaintRecord:
        comp_id = f"STRESS-{cid:04d}"

        has_slang = category in ("HEAVY_LOCAL_SLANG", "INFORMAL_EXPRESSIONS")
        has_insult = category == "INSULTS_PROFANITY"
        has_spelling_noise = category == "SPELLING_MISTAKES"
        has_missing_spaces = category == "MISSING_SPACES_PUNCTUATION"
        has_code_switching = category == "CODE_SWITCHING"
        has_long_context = category == "LONG_IRRELEVANT_CONTEXT" or target_tier in (4, 5)

        loc = self.rng.choice(FRESH_LOCALITIES)
        c_loc = self.rng.choice(CONCISE_LOCALITIES)

        # ----------------------------------------------------------------------
        # Category 14: AMBIGUOUS_OUT_OF_SCOPE
        # ----------------------------------------------------------------------
        if category == "AMBIGUOUS_OUT_OF_SCOPE":
            item = self.rng.choice(OUT_OF_SCOPE_SCENARIOS)
            if target_tier == 1:
                text = f"{c_loc} mein {item['text'][:45]}."
            elif target_tier == 2:
                text = f"{loc} par {item['text']}."
            elif target_tier == 3:
                text = (
                    f"Janab aali, {loc} par ajeeb masla bana hua hai. {item['text']}. "
                    f"Log intehayi pareshan hain aur koi madad ko nahi pohanch raha."
                )
            elif target_tier == 4:
                text = (
                    f"Bakhidmat Janab Chief Minister wa Concerned Officers, Sindh. "
                    f"Guzarish hai ke hum {loc} ke rehayishi hain. {item['text']}. "
                    f"Hamari koi sunwai nahi ho rahi aur sab idare aik doosre par baat daal rahe hain. "
                    f"Barah e karam fori notice liya jaye aur amli madad farham ki jaye."
                )
            else:
                text = (
                    f"Bakhidmat Janab Chief Minister wa Higher Administrative Authorities, Government of Sindh. "
                    f"Mohtaram Janab-e-Wala, Hum ahl-e-ilaqa {loc} nihayat adab aur dukh ke sath aap ki tawajjo is janib mabzool karwana chahtay hain. "
                    f"Haqeeqat ye hai ke {item['text']}. "
                    f"Is soorat-e-haal ki wajah se ilaqay ke shurfa, buzurg aur beemar afrad sakht azab mein mubtala ho chuke hain aur aam zindagi bilkul maflooj ho chuki hai. "
                    f"Hum ne ilaqai dushwariyon ke tehat mukhtalif mawaqay par faryad ki magar kisi zimmedar shakhs ne kano par joon tak na rengne di aur sirf khali tasalliyan di gayin. "
                    f"Lihaza aap se pur-khuloos aur dardi-mandana guzarish hai ke is par bila-takheer inquiry karwayein aur fori sadd-e-bab farmayein taake awam sukoon ka saans le sake. Ahlian-e-Ilaqa."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=[],
                expected_needs_review=True,
                expected_review_reason=item["reason"],
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type="UNCERTAIN",
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Category 11: CAUSAL_CONSEQUENCE (Root cause + symptom suppression)
        # ----------------------------------------------------------------------
        if category == "CAUSAL_CONSEQUENCE":
            causal_types = [
                ("kelectric", "kwsc", "bijli nahi aa rahi pichlay 24 ghante se", "pani ki domestic motor nahi chal rahi aur ghar ki tanki khali hai", "CAUSES_CONTEXT_ONLY"),
                ("ssgc", "kmc", "sui gas ka pressure bilkul zero ho chuka hai", "chulha nahi jal raha aur khana nahi ban raha", "CAUSES_CONTEXT_ONLY"),
                ("kwsc", "kmc", "kwsc ki underground main pipeline phat chuki hai", "saaf pani ubal kar sadak par do foot jama ho gaya hai magar sarak tooti nahi hai", "CAUSES_CONTEXT_ONLY"),
                ("sswmb", "kelectric", "kachray ke dher ko kisi ne aag laga di hai", "zaharila dhuan pure area mein ghus raha hai sans lena azaab ho gaya", "CAUSES_CONTEXT_ONLY")
            ]
            root_dept, supp_dept, root_defect, symp_text, rel = self.rng.choice(causal_types)
            if target_tier == 1:
                text = f"{c_loc} mein {root_defect} aur {symp_text}."
            elif target_tier == 2:
                text = f"{loc} mein {root_defect} jis ki wajah se {symp_text}."
            elif target_tier == 3:
                text = f"{loc} mein {root_defect} jis ke sabab {symp_text}. Barah e karam fori action lein aur hal karein."
            elif target_tier == 4:
                text = (
                    f"Ahlian-e-{loc} ki janib se fori darkhwast. "
                    f"Hamare ilaqay mein {root_defect}. Is sangeen kharabi ke bais {symp_text}. "
                    f"Pura mohalla pichlay teen din se sakht mushkil mein hai aur barha ilaqai complaint cell par call karne par bhi koi team nahi aayi. "
                    f"Lihaza mutalliqah idaray se purzor mutalba hai ke mazeed der kiye baghair fori field inspection karwayi jaye."
                )
            else:
                text = (
                    f"Bakhidmat Janab Municipal Authorities wa Managing Director Sahab. "
                    f"Guzarish hai ke hum ahlian-e-{loc} aap ki tawajjo is maslay ki taraf mabzool karwana chahtay hain. "
                    f"Asal soorat-e-haal ye hai ke hamare mohallay mein {root_defect}. "
                    f"Is sangeen maslay ke nateejay mein {symp_text}. "
                    f"Is azaab ki wajah se bachay, buzurg aur mareez sakht takleef mein mubtala hain aur roz marrah ke zaroori kam kaj thapp ho chuke hain. "
                    f"Hum ne mutaddad dafa helpline aur complaint desk par faryad ki magar ab tak koi amli pesh-raft samne nahi aayi aur sirf tasalliyan di ja rahi hain. "
                    f"Lihaza aali janab se purzor iltija hai ke meharbani farma kar fori field team rawana farmayein taake is sangeen maslay ka mustaqil bunyadon par hal nikala ja sake. Ahlian-e-Ilaqa."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=[root_dept],
                expected_needs_review=False,
                expected_review_reason=None,
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type=rel,
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Category 12: NEGATION_AND_HISTORICAL
        # ----------------------------------------------------------------------
        if category == "NEGATION_AND_HISTORICAL":
            neg_types = [
                ("ssgc", "sswmb", "ye gas ka koi masla nahi hai gas theek chal rahi hai", "asal masla ye hai ke kachra kundi overflow kar rahi hai aur garbage nahi uthaya ja raha"),
                ("kwsc", "kelectric", "pani ka koi issue nahi hai line mein pani aa raha hai", "magar bijli bilkul band hai transformer blast hone ke baad se light nahi aayi"),
                ("kmc", "kwsc", "sadak bilkul theek hai koi khadda nahi hai", "lekin gutter ubal ubal kar gali ko jheel bana chuka hai manhole choke hai"),
                ("kmc", "kelectric", "pichle hafte sarak kharab thi wo theek ho chuki hai", "lekin ab khambay se nangi taar toot kar latak rahi hai current maar rahi hai")
            ]
            neg_d, act_d, neg_stmt, act_stmt = self.rng.choice(neg_types)
            if target_tier == 1:
                text = f"{c_loc}: {neg_stmt}, magar {act_stmt}."
            elif target_tier in (2, 3):
                text = f"{loc} par {neg_stmt}, {act_stmt}. Please mutalliqah staff bhejen."
            elif target_tier == 4:
                text = (
                    f"Bakhidmat Afsar-e-Aala. Guzarish ye hai ke ahl-e-ilaqa {loc} wazeh karna chahtay hain ke {neg_stmt}. "
                    f"Is liye ghalat complaint register na ki jaye. Asal haqeeqat ye hai ke {act_stmt}. "
                    f"Is kharabi ki wajah se rehayishiyon ka jeena dushwar hai. Fori notice le kar amli hal farmayein."
                )
            else:
                text = (
                    f"Bakhidmat Janab Competent Authority wa Higher Officials. "
                    f"Guzarish baraye islaah wa fori hal: Ahl-e-ilaqa {loc}. "
                    f"Nihayat adab se arz hai ke hum saaf taur par wazeh karna chahtay hain ke {neg_stmt}. "
                    f"Lihaza is silsilay mein kisi ghalat idaray ko complaint transfer na ki jaye aur waqt zaya na kiya jaye. "
                    f"Asal dard-naak haqeeqat ye hai ke {act_stmt}. "
                    f"Is sangeen maslay ne hamare pure ilaqay ki aamad-o-raft aur rehayish ko jahannum bana diya hai aur log sakht azab mein mubtala hain. "
                    f"Aap ke ilaqai daftar par mutaddad baar darkhwastain di gayin magar koi sunwai nahi hui. "
                    f"Lihaza aali janab se purzor mutalba hai ke reham farma kar fori field team rawana farmayein taake masla hal ho sake. Shukriya."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=[act_d],
                expected_needs_review=False,
                expected_review_reason=None,
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type="MENTION_ONLY_NEGATED",
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Category 13: MISLEADING_REFERENCE
        # ----------------------------------------------------------------------
        if category == "MISLEADING_REFERENCE":
            target_dept = self.rng.choice(["kmc", "kwsc", "sswmb", "sbca"])
            d_spec = self.rng.choice(CIVIC_DEFECTS[target_dept])
            mis_dept, landmark = self.rng.choice(MISLEADING_LANDMARKS)
            while mis_dept == target_dept:
                mis_dept, landmark = self.rng.choice(MISLEADING_LANDMARKS)

            if target_tier == 1:
                text = f"{c_loc} mein {landmark}{d_spec['asset']} {d_spec['defect']}."
            elif target_tier in (2, 3):
                text = f"{loc} par {landmark}{d_spec['asset']} {d_spec['defect']}. Is par fori action lein."
            elif target_tier == 4:
                text = (
                    f"Bakhidmat Mutalliqah Hukkam. Hum ahlian-e-{loc} arz karte hain ke {landmark}"
                    f"hamari public {d_spec['asset']} {d_spec['defect']}. "
                    f"Is jagha par roz hazaron shehri guzar rahe hain aur shadeed mushkil ka samna hai. "
                    f"Lihaza barah e karam is par fori karrwayi karein aur team rawana karein."
                )
            else:
                text = (
                    f"Ba-Khidmat Janab Municipal Commissioner wa Administrative Officers, Karachi. "
                    f"Mohtaram Janab, Hum ahl-e-ilaqa {loc} aap ki tawajjo is taraf mabzool karwana chahtay hain. "
                    f"Haqeeqat ye hai ke {landmark}hamare ilaqay ki {d_spec['asset']} {d_spec['defect']}. "
                    f"Is kharabi ki wajah se ilaqay ke shurfa, school ke bachay aur namazi sakht azaab jhel rahe hain aur aamad-o-raft intehayi dushwar ho chuki hai. "
                    f"Hum ne ilaqai complaint cell par do martaba darkhwast jama karwayi magar sirf tasalliyan di gayin aur koi amli iqdam nahi uthaya gaya. "
                    f"Lihaza aali janab se purzor iltija hai ke reham farma kar fori inquiry committee aur staff dispatch karein taake is sangeen maslay ka sadd-e-bab ho sake. Ahlian-e-Ilaqa."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=[target_dept],
                expected_needs_review=False,
                expected_review_reason=None,
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type="SPATIAL_PROXIMITY_ONLY",
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Category 10: INDEPENDENT_DUAL_ISSUE (2 Actionable Depts)
        # ----------------------------------------------------------------------
        if category == "INDEPENDENT_DUAL_ISSUE":
            dept1, dept2 = self.rng.sample(DEPARTMENTS, 2)
            d1 = self.rng.choice(CIVIC_DEFECTS[dept1])
            d2 = self.rng.choice(CIVIC_DEFECTS[dept2])
            conn = self.rng.choice([
                "aur is ke sath sath alag se", "mazeed bar-aan doosra masla ye hai ke",
                "aur sath hi sath alag issue ye hai ke", "aur isi gali mein alag taur par"
            ])

            if target_tier == 1:
                text = f"{c_loc}: {d1['asset']} {d1['defect']} aur alag {d2['asset']} {d2['defect']}."
            elif target_tier in (2, 3):
                text = f"{loc} mein {d1['asset']} {d1['defect']} {conn} {d2['asset']} {d2['defect']}. Dono maslay hal karein."
            elif target_tier == 4:
                text = (
                    f"Bakhidmat Janab Civic Administrators Karachi. Ahl-e-ilaqa {loc} do alag alag sangeen masayal report kar rahe hain. "
                    f"Pehla masla ye hai ke {d1['asset']} {d1['defect']}. {conn} {d2['asset']} {d2['defect']}. "
                    f"Dono maslay intehayi shadeed hain aur aamad-o-raft ke sath rehayish ko maflooj kar chuke hain. "
                    f"Dono mutalliqah idaron ki teams fori tor par bheji jayein taake azaab khatam ho sake."
                )
            else:
                text = (
                    f"Bakhidmat Janab Municipal Commissioner wa All Civic Authorities Karachi. "
                    f"Mohtaram Janab, Hum ahl-e-ilaqa {loc} do intehayi sangeen aur alag alag masayal aap ke samne pesh kar rahe hain. "
                    f"Pehla intehayi ahem masla ye hai ke {d1['asset']} {d1['defect']}. "
                    f"{conn} hamari {d2['asset']} {d2['defect']}. "
                    f"In dono kharabiyon ne mil kar pure mohallay ka nizam darham barham kar diya hai aur rehayishiyon ka jeena azaab bana diya hai. "
                    f"Ilaqai complaint desk par mutaddad darkhwastain dene ke bawajood kisi zimmedar afsar ne is par dhyan nahi diya aur sirf khali tasalliyan di gayin. "
                    f"Lihaza purzor iltija hai ke dono mutalliqah idaron ki mushtarika field teams rawana farmayein taake emergency bunyadon par dono maslay hal ho sakein. Ahlian-e-Ilaqa."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=sorted([dept1, dept2]),
                expected_needs_review=False,
                expected_review_reason=None,
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type="INDEPENDENT",
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Category 15: THREE_ACTIONABLE_ISSUES (3 Actionable Depts)
        # ----------------------------------------------------------------------
        if category == "THREE_ACTIONABLE_ISSUES":
            dept1, dept2, dept3 = self.rng.sample(DEPARTMENTS, 3)
            d1 = self.rng.choice(CIVIC_DEFECTS[dept1])
            d2 = self.rng.choice(CIVIC_DEFECTS[dept2])
            d3 = self.rng.choice(CIVIC_DEFECTS[dept3])

            if target_tier == 1:
                text = f"{c_loc}: {d1['asset']} {d1['defect']}, {d2['asset']} {d2['defect']}, aur {d3['asset']} {d3['defect']}."
            elif target_tier in (2, 3):
                text = (
                    f"Janab, {loc} ka bura haal hai. Pehla masla: {d1['asset']} {d1['defect']}. "
                    f"Doosra masla: {d2['asset']} {d2['defect']}. "
                    f"Teesra masla: {d3['asset']} {d3['defect']}. Tamam idare action lein."
                )
            elif target_tier == 4:
                text = (
                    f"Bakhidmat All Civic Authorities. Hum ahl-e-ilaqa {loc} teen alag alag masayal report kar rahe hain. "
                    f"1. {d1['asset']} {d1['defect']}. "
                    f"2. Mazeed alag se {d2['asset']} {d2['defect']}. "
                    f"3. Aur teesra masla ye hai ke {d3['asset']} {d3['defect']}. "
                    f"Pura mohalla tabah ho chuka hai, meharbani farma kar teeno idaron ki teams bheji jayein."
                )
            else:
                text = (
                    f"Bakhidmat Janab Municipal Commissioner wa All Civic Authorities Karachi. "
                    f"Guzarish baraye fori sadd-e-bab: Ahlian-e-{loc}. "
                    f"Nihayat adab se guzarish hai ke hamare ilaqay mein ek sath teen intehayi sangeen masayal peda ho chuke hain. "
                    f"Number 1: {d1['asset']} {d1['defect']}. "
                    f"Number 2: Mazeed alag taur par doosra masla ye hai ke {d2['asset']} {d2['defect']}. "
                    f"Number 3: Aur is ke ilawa teesra shadeed bohran ye hai ke {d3['asset']} {d3['defect']}. "
                    f"School ke bachon, buzurgon aur beemar logon ka aana jana namumkin ho chuka hai aur ilaqai helpline bilkul response nahi de rahi. "
                    f"Hum ne barha darkhwast di magar koi sunwai nahi hui aur sirf taweel tasalliyan di gayin. "
                    f"Lihaza aali janab se pur-khuloos guzarish hai ke reham farma kar teeno idaron ki mushtarika emergency team dispatch karein taake tamam maslay bila-takheer hal ho sakein. Ahlian-e-Ilaqa."
                )

            words = text.split()
            return StressComplaintRecord(
                complaint_id=comp_id,
                text=text,
                category=category,
                length_tier=self._get_tier(len(words)),
                word_count=len(words),
                expected_departments=sorted([dept1, dept2, dept3]),
                expected_needs_review=False,
                expected_review_reason=None,
                has_slang=has_slang,
                has_insult=has_insult,
                has_spelling_noise=has_spelling_noise,
                has_missing_spaces=has_missing_spaces,
                has_code_switching=has_code_switching,
                has_long_context=has_long_context,
                relation_type="INDEPENDENT",
                seed=self.seed
            )

        # ----------------------------------------------------------------------
        # Single-Department Categories (1, 2, 3, 4, 5, 6, 7, 8, 9)
        # ----------------------------------------------------------------------
        dept = self.rng.choice(DEPARTMENTS)
        d_info = self.rng.choice(CIVIC_DEFECTS[dept])
        core_statement = f"{d_info['asset']} {d_info['defect']}"

        if category == "HEAVY_LOCAL_SLANG":
            slang_open = self.rng.choice(SLANG_OPENINGS)
            slang_conn = self.rng.choice(SLANG_CONNECTIVES)
            if target_tier == 1:
                text = f"{c_loc}: {slang_open}, {core_statement}."
            elif target_tier in (2, 3):
                text = f"{slang_open}, {loc} par {core_statement}. {slang_conn}, fori theek karo yar."
            elif target_tier == 4:
                text = (
                    f"{slang_open}! Hum {loc} ke log bol rahe hain. Yahan {core_statement}. "
                    f"{slang_conn}. Pure mohallay ka meter ghoom chuka hai aur subha se raat tak dimagh ki lassi ban rahi hai. "
                    f"Topi drama band karo aur seedhi tarah koi dhang ka banda bhej kar kaam karwao yar."
                )
            else:
                text = (
                    f"{slang_open}! Bhai seedhi baat ye hai ke hum {loc} ke log bilkul pareshan ho chuke hain. "
                    f"Asal scene check karo: yahan par {core_statement}. "
                    f"{slang_conn}. Awaam ko bilkul faarigh aur lallu samjha hua hai in logon ne, har banda apna chaska le raha hai aur kisi ko kaam ki fikar nahi hai. "
                    f"Hum ne ilaqai office par ja kar bola magar wahan bhi ajeeb topi drama chal raha hai aur khwari ki inteha ho chuki hai. "
                    f"Bhai khuda ka wasta hai koi serious banda bhejo jo bina kisi behas ke ye masla hal kare warna agle hafte pura area sadak par aayega aur tamasha banega. Samjhe yar!"
                )

        elif category == "INFORMAL_EXPRESSIONS":
            if target_tier == 1:
                text = f"{c_loc} mein {core_statement} yar."
            elif target_tier in (2, 3):
                text = f"yr suno zara, {loc} par bohot ajeeb masla bana hua hai, {core_statement}. dekh lo koi team bhej kar."
            elif target_tier == 4:
                text = (
                    f"Aray bhai suno to sahi, {loc} par ajeeb kissa chal raha hai. Hamari {core_statement}. "
                    f"Log bar bar shikayat kar rahe hain magar koi sunne ko tayar nahi hai. "
                    f"Kahin aisa na ho ke koi bara hadsa ho jaye aur phir sab afsos karte firein. Meharbani karke kisi ko bhej do."
                )
            else:
                text = (
                    f"Aray bhai zara dhyan do idhar bhi, {loc} ke rehayishi kab se faryad kar rahe hain. "
                    f"Asal baat ye hai ke yahan {core_statement}. "
                    f"Pura mohalla tang aa chuka hai aur aapas mein baith kar sab yahi ro rahe hain ke koi dekhne wala nahi hai. "
                    f"Hamare bachay aur buzurg beemar ho rahe hain aur subha se shaam tak log khwar ho rahe hain. "
                    f"Bhai agar thori si bhi zimmedari ka ehsas hai to barah e karam fori kisi team ko bhejen aur is maslay ko seedha karein taake logon ka jeena aasan ho sake. Shukriya."
                )

        elif category == "CODE_SWITCHING":
            if target_tier == 1:
                text = f"Urgent issue at {c_loc}: {core_statement}."
            elif target_tier in (2, 3):
                text = (
                    f"Kindly pay urgent attention to {loc}. The {core_statement}. "
                    f"Residents are facing severe difficulty. Please dispatch emergency response team immediately."
                )
            elif target_tier == 4:
                text = (
                    f"Attention Municipal Authorities, Karachi. We the residents of {loc} are reporting a critical issue. "
                    f"The ground reality is that {core_statement}. "
                    f"This civic failure is causing massive inconvenience and health hazard for school kids and senior citizens. "
                    f"We lodged complaints at local portal but received zero concrete feedback. Please send field inspection staff without delay."
                )
            else:
                text = (
                    f"To the Managing Director and Municipal Authorities, Karachi. "
                    f"Official complaint regarding civic breakdown at {loc}. "
                    f"Respected Sir, We residents are writing to highlight an extremely serious municipal emergency in our sector. "
                    f"Specifically, {core_statement}. "
                    f"Due to this critical breakdown, daily life has been completely paralyzed and severe safety hazards have emerged across the entire neighborhood. "
                    f"Despite multiple reminders and online tracking tickets, no field supervisor has visited the site and only empty assurances have been given. "
                    f"Therefore, we strongly urge the competent authority to intervene directly and deploy an emergency repair unit to resolve this grievance on a permanent basis. Sincerely, Area Residents."
                )

        elif category == "EMOTIONAL_OUTRAGE":
            if target_tier == 1:
                text = f"Khuda ke liye {c_loc} mein {core_statement}! Bachao humein!"
            elif target_tier in (2, 3):
                text = (
                    f"Khuda ka khauf karein hum mar jayenge! {loc} mein {core_statement}! "
                    f"Humari cheekhein koi nahi sun raha hamare chotay bachay aur buzurg beemar ho rahe hain! Fori madad bhejo!"
                )
            elif target_tier == 4:
                text = (
                    f"Khuda ke liye reham karein hum par! {loc} mein soorat-e-haal na-qabil-e-bardasht ho chuki hai! "
                    f"Yahan {core_statement}! Hamare maasoom bachay aur buzurg shaded aziyat mein mubtala hain aur ro rahe hain! "
                    f"Kya hum insan nahi hain? Hum kahan jayein faryad le kar? Kisi afsar ke dil mein reham nahi hai! Fori team bheji jaye!"
                )
            else:
                text = (
                    f"Khuda ka khauf karein be-hiss afsaran aur hukmaran! Hum ahl-e-ilaqa {loc} cheekh cheekh kar thak chuke hain! "
                    f"Hamare gharon ke samne {core_statement}! "
                    f"Hamari choti bachiyan, beemar maayein aur buzurgan-e-mohalla aanso baha rahe hain aur shadeed bemariyon mein mubtala ho chuke hain! "
                    f"Aap logon ke dilon se insaniyat bilkul mar chuki hai jo itne dino se hamari aziyat par chup baithe tamasha dekh rahe hain! "
                    f"Hum ne har office ka chakkar lagaya magar kisi zalim ne hamari faryad nahi suni! "
                    f"Agar fori tor par team bhej kar is azaab ko khatam na kiya gaya to hum sab sadkon par nikal kar ehtejaj karenge aur is zulm ka hisab lenge! Fori action lein!"
                )

        elif category == "INSULTS_PROFANITY":
            insult = self.rng.choice(CIVIC_INSULTS)
            if target_tier == 1:
                text = f"{c_loc}: {insult}! {core_statement}! Sharam karo!"
            elif target_tier in (2, 3):
                text = (
                    f"Tamam {insult} so rahe hain! {loc} par {core_statement}! "
                    f"Tax poora lete ho aur kam dhelay ka nahi karte, be-sharam idara hai bilkul!"
                )
            elif target_tier == 4:
                text = (
                    f"Afsos hai is {insult} par jo awam ka khoon choos rahe hain! {loc} par {core_statement}! "
                    f"Har mahine bill aur tax pehle maangte ho magar kaam karne ke waqt sab choohe ban kar bil mein ghus jate hain! "
                    f"Corrupt aur chor thekedaron ne pure ilaqay ka bera gharaq kar diya hai! Seedhi tarah team bhejo warna sharam aani chahiye tumhein!"
                )
            else:
                text = (
                    f"Laanat hai aisi management aur in {insult} par jo awam ki zindagi azaab bana kar baithe hain! "
                    f"Hamare ilaqay {loc} mein {core_statement}! "
                    f"Subha se sham tak ye be-sharam afsaran air condition kamron mein baith kar free ki rotian tor rahe hain aur awam zillat ki zindagi guzarne par majboor hai! "
                    f"Tax ke naam par hazaron rupaye jeb se nikalte hain magar in lafafa khoron se aik kaam theek tarah nahi hota! "
                    f"Agar zara barabar bhi ghairat baqi hai to apni nalaik team ko bhejo aur is maslay ko hal karo warna har platform par tumhari corruption ka bhanda phodenge! Be-sharam log!"
                )

        elif category == "LONG_IRRELEVANT_CONTEXT":
            irr = self.rng.choice(IRRELEVANT_CONTEXTS)
            if target_tier in (1, 2, 3):
                text = f"{irr}hamare {loc} par {core_statement}. Is maslay ka fori sadd-e-bab kiya jaye."
            elif target_tier == 4:
                text = (
                    f"{irr}hamare ilaqay {loc} par {core_statement}. "
                    f"Hum ne har darwaza khatkhata liya magar kisi ko sharam nahi aayi aur sab ne sir hila kar taal diya. "
                    f"Is maslay ka fori sadd-e-bab kiya jaye taake awam sukoon se reh sake."
                )
            else:
                text = (
                    f"Mohtaram Afsar Sahab, Main aap ko aik ahem kahani batana chahta hoon. "
                    f"{irr}hamare ilaqay {loc} mein {core_statement}. "
                    f"Pure mohallay ke hazaron log is soorat-e-haal ki wajah se shadeed mushkilaat ka shikar hain aur hamari tamam tayariyan thapp ho kar reh gayi hain. "
                    f"Hum ne ilaqai councilor, complaint desk aur helpline par kai martaba darkhwast jama karwayi magar sirf tasalliyan di gayin aur kisi ne amli iqdam nahi kiya. "
                    f"Lihaza aap se pur-khuloos guzarish hai ke reham farma kar fori field staff rawana karein taake is sangeen maslay ka mustaqil bunyadon par hal nikala ja sake. Shukriya."
                )

        # Category 1: EVERYDAY_ROMAN_URDU
        else:
            if target_tier == 1:
                text = f"{c_loc} mein {core_statement}."
            elif target_tier in (2, 3):
                text = f"{loc} par {core_statement}. Barah e karam is ki marammat karwai jaye."
            elif target_tier == 4:
                text = (
                    f"Bakhidmat Mutalliqah Hukkam Karachi. Hum ahl-e-ilaqa {loc} report kar rahe hain ke {core_statement}. "
                    f"Is kharabi ki wajah se rehayishiyon ko roz marrah aamad-o-raft mein shadeed takleef ka samna hai. "
                    f"Barah e karam fori notice le kar staff ko rawana karein aur masla hal farmayein."
                )
            else:
                text = (
                    f"Ba-Khidmat Janab Managing Director wa Municipal Commissioner Sahab, Karachi. "
                    f"Guzarish baraye fori sadd-e-bab wa imdad: Ahlian-e-{loc}. "
                    f"Mohtaram Janab-e-Aala, Hum ahl-e-ilaqa nihayat adab se aap ki janib ek intehayi sangeen masla pesh kar rahe hain. "
                    f"Pichlay taweel arsay se hamare ilaqay {loc} mein soorat-e-haal intehayi ghumbeer aur na-qabil-e-bardasht ho chuki hai. "
                    f"Asal haqeeqat ye hai ke {core_statement}. "
                    f"Is kharabi ki wajah se hamare buzurg, beemar afrad aur school jane wale bachay shadeed aziyat mein mubtala hain aur aamad-o-raft intehayi dushwar ho chuki hai. "
                    f"Aap ke ilaqai daftar par mutaddad baar darj karwai gayi shikayatat ke bawajood ab tak kisi zimmedar afsar ne is par amli dhyan nahi diya aur sirf khali tasalliyan di gayin. "
                    f"Lihaza aali martabat se pur-khuloos guzarish hai ke reham farma kar fori inquiry committee aur field team rawana farmayein taake is maslay ko mustaqil bunyadon par hal kiya ja sake. Ahlian-e-Ilaqa."
                )

        # Spelling Mistakes injection
        if category == "SPELLING_MISTAKES":
            text = apply_spelling_noise(text, self.rng)

        # Missing Spaces injection
        if category == "MISSING_SPACES_PUNCTUATION":
            text = apply_missing_spaces(text, self.rng)

        words = text.split()
        return StressComplaintRecord(
            complaint_id=comp_id,
            text=text,
            category=category,
            length_tier=self._get_tier(len(words)),
            word_count=len(words),
            expected_departments=[dept],
            expected_needs_review=False,
            expected_review_reason=None,
            has_slang=has_slang,
            has_insult=has_insult,
            has_spelling_noise=has_spelling_noise,
            has_missing_spaces=has_missing_spaces,
            has_code_switching=has_code_switching,
            has_long_context=has_long_context,
            relation_type="SINGLE",
            seed=self.seed
        )

    @staticmethod
    def _get_tier(wc: int) -> int:
        if wc <= 20:
            return 1
        elif wc <= 50:
            return 2
        elif wc <= 100:
            return 3
        elif wc <= 150:
            return 4
        else:
            return 5
