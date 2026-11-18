"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.8 Benchmark Builder.

Constructs an immutable evaluation benchmark of EXACTLY 2,000 diverse Roman Urdu complaints:
- Category distribution:
    300 — Normal everyday complaints
    200 — Angry/aggressive language
    200 — Abusive language and profanity
    200 — Heavy slang and Roman Urdu/English code-switching
    250 — Independent dual-department complaints
    150 — Independent triple-department complaints
    200 — Negation, denial, historical faults, contradictions
    150 — Causal consequences and indirect symptoms
    150 — Severe spelling, punctuation and grammar corruption
    100 — Long complicated narratives and irrelevant backstories
    100 — Out-of-scope, misleading and hard-negative complaints
    TOTAL = EXACTLY 2,000 COMPLAINTS.
- Word count bounds: Strictly 5 to 200 words across all 5 length brackets.
- Department representation: >= 200 gold instances for every department (kmc, kwsc, kelectric, ssgc, sswmb, sbca).
- 100% Zero leakage against all 9,137 historical records.
- Deterministic, bounded, non-recursive generation with progress logging.
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# 80 Karachi Localities (Comprehensive Geographic Distribution)
LOCALITIES = [
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
    "Garden West near shoe market", "Karachi Cantonment station road",
    "Gulshan-e-Iqbal Block 13-D", "Gulshan-e-Iqbal Block 6 near disco bakery",
    "Gulistan-e-Jauhar Block 12", "Gulistan-e-Jauhar Block 1 near pehlwan goth",
    "Safoora Chowrangi main road", "Malir Cantt check post 5",
    "Malir City near railway crossing", "Model Colony sector 2",
    "Shah Faisal Colony number 3", "Landhi Town sector 36-B",
    "Korangi 2.5 number near darul uloom", "Korangi Industrial Area sector 15",
    "Mehran Town near Bilal colony", "Ibrahim Hyderi fish harbour",
    "Keamari Jackson market gali", "Machar Colony D-dock road",
    "Mauripur road near truck stand", "SITE Industrial Area metroville",
    "Sher Shah kabari market", "Pak Colony near marble factory",
    "SITE western avenue near Siemens chowrangi", "SITE labour square",
    "Manghopir road near warm springs", "Qasba Colony hill area",
    "North Karachi sector 5-C", "Shadman Town sector 14-B",
    "Ancholi society Block 20", "Gulzar-e-Hijri scheme 33",
    "Ayub Goth sector 3", "University Road near NED university",
    "DHA Phase 5 Khayaban-e-Shahbaz", "DHA Phase 6 Bukhari commercial",
    "PECHS Block 2 near society office", "Bahadurabad Charminar chowrangi",
    "Tariq Road near Liberty signal", "Lines Area near army public school",
    "Golimar number 1 near chakiwara bridge", "Old Golimar main chowk",
    "Khokhrapar sector 2", "Saudabad near RCD ground",
    "Shah Latif Town sector 17-B", "Gulshan-e-Hadeed phase 1 commercial",
    "Steel Town sector 3", "Pipri railway yard colony",
    "Maripur naval colony gate 4", "Hawksbay road near scheme 42",
    "Sultanabad near PIDC bridge", "Hijrat Colony street 8",
    "Delhi Colony main bazar", "Punjab Colony street 12",
    "Akhtar Colony sector B", "Hazara Colony railway line side",
    "Usmanabad near dhobi ghat", "Moosa Lane street 4 Lyari",
]

# Municipal Issue Lexicon (Rich Variational Diversity)
DEPT_CORE_PHRASES = {
    "kmc": [
        "sarak par gehre khadday par chukay hain aur gaariyon ka chalna azab hogaya hai",
        "main road poori tarah toot phoot ka shikar hai darmian mein bara gaddha hai",
        "footpath toota hua hai aur manhole ka cement ka dhakkan gayab hai",
        "road ki carpeting ukhar chuki hai aur pathar urr kar pedistrians ko lagte hain",
        "service road par do foot gehra khadda hai bike walay girte hain",
        "traffic signal kharab hai aur chowrangi par road ki halat nihayat zaleel hai",
        "street lights ka pole toota hua hai aur andhera rehta hai raste par",
        "gali ki pukhta sadak toot kar kacha rasta ban chuki hai",
        "manhole cover toot gaya hai aur open hole mein accident hone ka shadeed khatra hai",
        "flyover ke expansion joints kharab hain aur darmian mein daraar par chuki hai",
        "pedestrian bridge ki serhiyan toot gayi hain aur loha zang alood hai",
    ],
    "kwsc": [
        "drinking water line pichle chaar haftay se band hai meetha pani bilkul nahi araha",
        "public water supply pipe burst hogaya hai aur hazaaron gallon meetha pani beh raha hai",
        "main gutter ubal raha hai aur gali mein badboodar sewerage ka pani jama hai",
        "sewerage line choke ho chuki hai ganda pani logon ke gharon mein dakhil ho raha hai",
        "line phatne ki wajah se drinking water mein gutter ka ganda paani mix hokar araha hai",
        "manhole overflow ho raha hai aur pura mohalla nala ban chuka hai",
        "tanker mafia ko rokein aur line ka official pani foran supply karein",
        "underground distribution line leak hai aur road par pani ka talaab ban gaya hai",
        "gutter ki dhalan ulti hai aur ganda pani reverse hokar gharon ke sehan mein araha hai",
        "water pump station band hone se poora sector paani se mehroom hai",
        "sewerage nala kachray se block hai aur ganda pani overtopping kar raha hai",
    ],
    "kelectric": [
        "transformer blast hogaya hai aur pichle 24 ghante se poora mohalla andhere mein hai",
        "bijli ki 11kv high tension wire toot kar beech raste gir gayi hai sparks nikal rahe hain",
        "shadeed low voltage ka masla hai 120 volt arahe hain appliances jal rahe hain",
        "pole par cable wire mein aag lag gayi hai dhamakay ho rahe hain",
        "unannounced load shedding 14 ghante tak pohnch gayi hai emergency halat hain",
        "electric meter box mein short circuit ho raha hai current dharne ka khatra hai",
        "phase urr gaya hai aur adhe gharon mein light nahi hai K-Electric 118 nahi utha raha",
        "transformer se oil tapak raha hai aur sparks nikalne se log khofzada hain",
        "khamba jhuk gaya hai aur taaren logon ki chatton ko chhu rahi hain",
        "neutral wire break hone se high voltage aya hai aur ghar ke AC aur TV phat gaye",
        "pole par kundas ka jhanjat hai aur short circuit se taar zameen par gir gayi hai",
    ],
    "ssgc": [
        "sui gas ka pressure bilkul zero hai chulhay nahi jal rahe aur bache bhookay hain",
        "underground gas pipeline mein severe gas leak hai poori gali mein smell phail gayi hai",
        "gas bilkul band hai sirf hawa arahi hai khana pakana namumkin hogaya hai",
        "pipeline crack hone ki wajah se gas ka bara leekage hai dhmaka hone ka andeesha hai",
        "gas ki boo itni shadeed hai ke saans lena mushkil hogaya hai emergency van bhejein",
        "subah se raat tak gas gayab rehti hai commercial cylinder afford nahi kar sakte",
        "gas meter se hissing sound arahi hai aur teez badboo se dam ghut raha hai",
        "gas distribution line mein paani dakhil hogaya hai pressure zero hai",
        "main valve kharab hone se poori residential line mein gas supply suspend hai",
        "gali ke corner par gas pipeline fracture ho chuki hai emergency squad bhejain",
    ],
    "sswmb": [
        "gali ke konay par kachray ka pahar ban chuka hai char din se koi dumper nahi aya",
        "safai staff do haftay se gayab hai kura karkat sarak par bikhar raha hai",
        "kachra kundi overflow ho rahi hai aaspas kuttay aur makhiyan jama ho gayi hain",
        "sweepers kachra uthane ki bajae wahin aag laga dete hain shadeed dhuwan phailta hai",
        "commercial area mein waste management walon ne safai karna band kar di hai",
        "solid waste walon ki la-parwahi se bimariyan phailne ka shadeed andesha hai",
        "kura dan toot chuka hai aur kachra poori sarak par phaila hua hai",
        "dumper driver kachra uthaye baghair chakkar laga kar nikal jate hain",
        "hospital waste aur aam kura sarak ke kinare phenk diya gaya hai badboo hai",
        "galiyon mein jharoo nahi lagti aur safai nizam bilkul tabah ho chuka hai",
    ],
    "sbca": [
        "residential plot par ghair qanooni taur par 5th floor ki construction ki ja rahi hai",
        "building ki deewar mein khatarnak daraarein par gayi hain imarat girne ka khatra hai",
        "without SBCA NOC commercial plazas banaye ja rahe hain set-back rules violate hain",
        "purani imarat ka chhajja gir gaya hai aur structural stability report missing hai",
        "illegal construction ki wajah se aaspas ke makanat ki bunyadon ko nuqsan pohnch raha hai",
        "ghair qanooni godam aur shops banayi ja rahi hain residential gali mein",
        "residential plot par plaza banakar columns mein cracks shuru ho chuke hain",
        "chhat par ghair qanooni rooms banaye ja rahe hain load bearing capacity khatam hai",
        "building inspectors rishwat le kar illegal portion pass kar rahe hain",
        "water tanki ke wazan se building ki chath mein jhukao aur dararein agayi hain",
    ],
}

KARACHI_SLANGS = [
    "bhai scene check karo", "level ki khwari chal rahi hai", "chuss program bana dia hai",
    "topi drama chal raha hai inka", "meter ghoom gaya hai awam ka", "ghanta koi action leta hai",
    "full tapori style mein time pass kar rahe hain", "chikna kaam karne ke bajae so rahe hain",
    "dhanda bana rakha hai", "dimagh ki dahi kar di hai", "seedha phadda hojayega",
    "lafda barh gaya hai", "awaam ko pagal samjha hua hai", "mama banaya hua hai",
    "awaam ki jaan nikaal di hai", "chakar pe chakar de rahe hain",
]

CIVIC_INSULTS = [
    "nihayat nikamay aur nalaiq afsaran baithe hain", "haramkhor administration bilkul andhi ho chuki hai",
    "besharm staff tankhuwah muft ki le raha hai", "in jahilon ko koi aqal nahi hai",
    "kutton ki tarah zaleel kar ke rakh diya hai awam ko", "laanat aisi service par jo kisi kaam ki nahi",
    "andha kanoon aur soye hue idaray hain", "koi sharam haya nahi bachi in afsaron mein",
    "ghamand aur rishwat khori mein andhe hain", "awam ke tax ke paison par ayashi kar rahe hain",
    "be-hiss aur corrupt afsaron ne shehar ko tabah kar diya", "muft-khoron ka tola kursi par baitha hai",
]

ENGLISH_CODE_SWITCHING_PHRASES = [
    "Severe infrastructure breakdown has been reported in our locality.",
    "The competent authorities are requested to take urgent cognizance of this civic hazard.",
    "Multiple complaints lodged on the official helpline but zero response from the ground team.",
    "Public health hazard and dangerous road safety situation escalating rapidly.",
    "Citizens are enduring extreme mental and physical agony due to administrative negligence.",
    "Official grievance ticket has been pending for weeks without physical inspection.",
]

OUT_OF_SCOPE_SCENARIOS = [
    ("Gali mein mobile cheen ne ki wardatein barh gayi hain kal dacoits ne firing ki police patrolling barhayein", "POLICE_CRIME"),
    ("Makan malik ghair qanooni taur par bina notice rent barha raha hai aur deposit wapas nahi kar raha court ka mamla hai", "CIVIL_RENT_DISPUTE"),
    ("HBL ATM se paise nikalwaye thay 20 hazaar deduct ho gaye cash nahi nikla bank helpline response nahi de rahi", "BANKING_FRAUD"),
    ("FIA cyber crime cell mein fraud caller ki complaint darj karwani hai jo lottery ke naam par scam kar raha hai", "CYBER_CRIME"),
    ("Traffic police wale be-wajah 2000 ka challan kaat rahe hain bina kisi violation ke rishwat mangte hain", "TRAFFIC_POLICE_EXTORTION"),
    ("Padosi ke kuttay ne bache ko kaat lia hai aur wo usko bandhta nahi hai legal action chahiye", "PRIVATE_CIVIL_TORT"),
    ("School management be-wajah fees barha rahi hai aur private schools regulatory authority so rahi hai", "EDUCATION_REGULATION"),
]


def count_words(text: str) -> int:
    return len(text.strip().split())


def clamp_words(text: str, min_w: int = 5, max_w: int = 200) -> str:
    words = text.strip().split()
    if len(words) > max_w:
        words = words[:max_w]
        text = " ".join(words)
        if not text.endswith((".", "!", "?")):
            text += "."
    return text


def corrupt_spelling(text: str, rng: random.Random) -> str:
    replacements = [
        (r"\bbijli\b", "bjli"), (r"\bbijli\b", "bjl"), (r"\bbijlee\b", "bjl"),
        (r"\btransformer\b", "transfamer"), (r"\btransformer\b", "trnsfrmr"),
        (r"\bpani\b", "pni"), (r"\bpaani\b", "pany"), (r"\bsewerage\b", "sewrg"),
        (r"\bgutter\b", "gatar"), (r"\bgutter\b", "guttar"), (r"\bsarak\b", "srk"),
        (r"\bsarak\b", "sadak"), (r"\bkhadda\b", "gdha"), (r"\bkhadday\b", "khady"),
        (r"\bkachra\b", "kchra"), (r"\bkachray\b", "kchra"), (r"\bsafai\b", "sfaye"),
        (r"\bbuilding\b", "bldng"), (r"\bdeewar\b", "dewar"), (r"\bchath\b", "chat"),
        (r"\bgas\b", "gass"), (r"\bline\b", "lyne"), (r"\bleak\b", "leek"),
        (r"\bbohot\b", "bht"), (r"\bkharab\b", "khrb"), (r"\btheek\b", "thk"),
        (r"\bhogaya\b", "hgya"), (r"\braha\b", "rha"), (r"\bnahi\b", "nhi"),
    ]
    words = text.split()
    corrupted_words = []
    for w in words:
        clean_w = w.lower()
        replaced = False
        if rng.random() < 0.4:
            for pat, rep in replacements:
                if re.fullmatch(pat.strip(r"\b"), clean_w):
                    corrupted_words.append(rep)
                    replaced = True
                    break
        if not replaced:
            corrupted_words.append(w)
    return " ".join(corrupted_words)


def introduce_missing_spaces(text: str, rng: random.Random) -> str:
    words = text.split()
    if len(words) < 6:
        return text
    new_words = []
    i = 0
    while i < len(words):
        if i < len(words) - 1 and rng.random() < 0.25:
            new_words.append(words[i] + words[i+1])
            i += 2
        else:
            new_words.append(words[i])
            i += 1
    return " ".join(new_words)


def introduce_random_caps_punct(text: str, rng: random.Random) -> str:
    words = text.split()
    res = []
    for w in words:
        r = rng.random()
        if r < 0.15:
            res.append(w.upper())
        elif r < 0.25:
            res.append("".join(c.upper() if idx % 2 == 0 else c.lower() for idx, c in enumerate(w)))
        else:
            res.append(w)
    s = " ".join(res)
    punct = rng.choice(["!!!!", "???!!!", "...", "..!!??", "??"])
    return s.rstrip(".!? ") + punct


def introduce_repeated_chars(text: str, rng: random.Random) -> str:
    words = text.split()
    res = []
    for w in words:
        if rng.random() < 0.25 and len(w) > 3:
            for v in ["o", "a", "e", "i", "u"]:
                if v in w.lower():
                    w = re.sub(v, v * rng.randint(3, 5), w, count=1, flags=re.IGNORECASE)
                    break
        res.append(w)
    return " ".join(res)


class BlindBenchmarkBuilder:
    """Rigorous evaluation benchmark builder for exactly 2,000 diverse Roman Urdu complaints."""

    def __init__(self, seed: int = 20261119):
        self.rng = random.Random(seed)
        self.locked_hashes: Set[str] = set()
        self.locked_normalized: Set[str] = set()
        self.benchmark_normalized: Set[str] = set()
        self.init_historical_data()

    def init_historical_data(self) -> None:
        files = [
            "data/v11/human_gold/locked_gold.jsonl",
            "data/v11/curriculum_runs/run_004/frozen_test.jsonl",
            "data/v11/curriculum_runs/run_004/frozen_validation.jsonl",
            "data/v11/adversarial_train/fresh_challenge_500.jsonl",
            "data/v11/adversarial_train/adversarial_train_2000.jsonl",
            "data/v11/stress_test/adversarial_benchmark_2000.jsonl",
            "data/v11/regression/regression_cases.jsonl",
            "data/v11/curriculum_runs/run_006/cycle_01_new_train.jsonl",
            "data/v11/curriculum_runs/run_006/cycle_02_new_train.jsonl",
        ]
        for p_str in files:
            p = Path(p_str)
            if p.exists():
                for line in p.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        try:
                            d = json.loads(line)
                            txt = d.get("text_sanitized") or d.get("text") or ""
                            if txt:
                                norm = self.normalize(txt)
                                self.locked_normalized.add(norm)
                                self.locked_hashes.add(hashlib.md5(norm.encode("utf-8")).hexdigest())
                        except Exception:
                            continue
        print(f"[LEAKAGE FILTER] Loaded {len(self.locked_normalized)} historical texts to guard against data leakage.", flush=True)

    @staticmethod
    def normalize(text: str) -> str:
        s = re.sub(r"[^\w\s]", "", text.lower())
        return re.sub(r"\s+", " ", s).strip()

    def is_leaked(self, text: str) -> bool:
        norm = self.normalize(text)
        if not norm:
            return True
        h = hashlib.md5(norm.encode("utf-8")).hexdigest()
        if h in self.locked_hashes or norm in self.locked_normalized:
            return True
        return False

    def sanitize_text(self, text: str) -> str:
        s = re.sub(r"\b03\d{2}[-\s]?\d{7}\b", "[PHONE]", text)
        s = re.sub(r"\b\d{5}[-\s]?\d{7}[-\s]?\d\b", "[CNIC]", s)
        s = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL]", s)
        return s

    def validate_and_clamp(self, text: str, min_words: int = 5, max_words: int = 200) -> Optional[str]:
        s = clamp_words(text, min_words, max_words)
        w_count = count_words(s)
        if w_count < min_words or w_count > max_words:
            return None
        norm = self.normalize(s)
        if norm in self.benchmark_normalized:
            return None
        if self.is_leaked(s):
            return None
        self.benchmark_normalized.add(norm)
        return s

    def build_narrative_context(self, loc: str, core_content: str, bracket: int) -> str:
        if bracket == 1: # 5-35 words
            variants = [
                f"{loc} mein {core_content}. Baraye meharbani isko jald theek kiya jae.",
                f"Emergency alert from {loc}: {core_content}. Immediate inspection required.",
                f"Janab aala, {loc} par {core_content}. Awaam shadeed takleef mein hai.",
                f"{loc} ke rehaishi shikayat darj karwa rahe hain ke {core_content}.",
                f"Attn Municipal Commissioner: In {loc}, {core_content}.",
            ]
            return self.rng.choice(variants)

        elif bracket == 2: # 36-80 words
            variants = [
                (
                    f"Janab aala, hamare ilaqa {loc} mein pichle teen din se {core_content}. "
                    f"Awam aur chote bachon ko aane jaane mein shadeed mushkilat ka samna hai. "
                    f"Baraye meharbani mutaaliqa staff ko foran bhej kar masla hal karwayein taake log sukoon ka saans le sakein."
                ),
                (
                    f"Assalam o alaikum, nihayat adab se ilteja hai ke {loc} mein {core_content}. "
                    f"Humne pichle hafte bhi helpline par call ki thi magar koi sunwayi nahi hui aur masla barhta ja raha hai. "
                    f"Meharbani farma kar iska fori sadd-e-baab karein aur emergency crew depute karein."
                ),
                (
                    f"Guzarish ye hai ke {loc} ki galiyon mein {core_content}. "
                    f"Daily commuters aur shopkeepers is soorat-e-haal se be-inteha pareshan hain aur traffic muattal hai. "
                    f"Higher authorities se appeal hai ke aam shehriyon ki pareshani par tawajjah dein aur fori relief faraham karein."
                ),
            ]
            return self.rng.choice(variants)

        elif bracket == 3: # 81-125 words
            variants = [
                (
                    f"Assalam o alaikum, hum {loc} ke rehaishi hain aur pichle kafi arsay se shadeed pareshani mein mubtila hain. "
                    f"Hamari gali mein {core_content}. Is maslay ki waja se bache aur buzurg sab shadeed museebat mein hain aur aam guzar-gah band ho chuki hai. "
                    f"Humne pehle bhi multiple times complaint cell par rabta kiya magar koi sunwayi nahi hui sirf aana kani se kaam lia ja raha hai. "
                    f"Aap se darkhwast hai ke fori notice le kar team ko field mein depute karein taake mazeed nuqsan na ho."
                ),
                (
                    f"Mohtaram afsaran, hum {loc} ke tax-paying shehri hain aur nihayat dukh ke sath ye report likhwa rahe hain. "
                    f"Haqeeqat ye hai ke {core_content}. Is waja se local businesses aur schools dono mutasir hain aur bimar afraad hospital nahi ja sakte. "
                    f"Staff ke sust rawayye ki waja se mohallay mein ehtijaj ki faza ban rahi hai jo kisi bhi waqt mazeed barh sakti hai. "
                    f"Baraye meharbani is critical grievance ko top priority par hal kiya jae aur field team rawana ki jae."
                ),
            ]
            return self.rng.choice(variants)

        elif bracket == 4: # 126-165 words
            variants = [
                (
                    f"Mohtaram afsaran, nihayat dukh aur afsos ke sath ye shikayat darj karwa raha hoon ke hamare ilaqa {loc} mein civic facilities ka bohot bura haal hai. "
                    f"Hum tax ada karne wale shehri hain magar badlay mein humein ye khwari milti hai. Asal sangheen masla ye hai ke {core_content}. "
                    f"Is kharab soorat-e-haal ki wajah se gali ke tamam dukaandar aur rehaishi shadeed nuqsan utha rahe hain aur karobar bilkul thapp ho chuka hai. "
                    f"Humne 20 afrad ke dastakhat ke sath formal application bhi submit karwai thi magar registry clerk ne sirf stamp laga kar file dabba di. "
                    f"Awam ka sabar ab jawab de chuka hai aur agar aglay 24 ghanton mein team na ayi to hum ehtijaj karenge. Khuda ke waste is museebat se hamari jaan churayein."
                ),
                (
                    f"Janab-e-wala, arzi guzaar hain ke {loc} mein pichle do hafton se aisi ghair mamooli halat paida ho gayi hai jis ne sab ka jeena haram kar diya hai. "
                    f"Asal kharabi ye hai ke {core_content}. Har roz subah log daftar aur bache taleemi idaron ke liye nikalte hain to raste mein zillat uthate hain. "
                    f"Humne local elected councilor aur assistant commissioner office ke chakar kaatay magar wahan sirf thande kamron mein baten banti hain zameen par koi nahi ata. "
                    f"Hum kisi siyasi jalsay ke khwahish mand nahi hain sirf apne bunyadi shehri haqooq ka mutaliba kar rahe hain. "
                    f"Umeed hai aala hukkam is notice ka jaiza le kar fori tor par action orders jari karenge."
                ),
            ]
            return self.rng.choice(variants)

        else: # bracket 5: 166-200 words
            variants = [
                (
                    f"Janab aala, hum pichle bees saal se {loc} ke mustaqil rehaishi hain aur nihayat dukh aur sadme ke sath ye arzi guzar rahe hain. "
                    f"Hamare ghar mein mere buzurg walid hain jinki tabiyat shadeed kharab rehti hai aur unko 24 ghante medical oxygen machine ki ashad zarurat parti hai. "
                    f"Sath hi mere teen chote bache hain jinke board ke annual imtihanaat sar par hain aur unki parhai shadeed mutasir ho rahi hai. "
                    f"Afsos is baat ka hai ke {core_content}. "
                    f"Humne pichle das roz mein baraha helpline 118 aur local complaint cell par formal shikayat darj karwai hai aur complaint number 84920 bhi mila. "
                    f"Lekin har dafa duty officer sirf jhooti tasalli deta hai ke emergency response van rawana ho chuki hai jo aaj tak nahi pohanchi. "
                    f"Pura mohalla shadeed azab mein mubtila hai aur tamam rehaishi shiddat se mutaliba karte hain ke aala afsaran is sangheen soorat-e-haal ka fori notice lein. "
                    f"Agar aglay 24 ghanton mein staff ne physical visit na kiya to hum tamam rehaishi sarak par aakar pur-aman ehtijaj karenge aur supreme court ke human rights cell mein petition dakhil karenge."
                ),
                (
                    f"Mohtaram high officials, nihayat adab aur afsos ke sath ye complaint darj karwa raha hoon ke hamare pooray ilaqa {loc} mein civic facilities ka janaza nikal chuka hai. "
                    f"Hum middle class aur dihadi daar log hain jo har maah waqt se pehle municipal tax aur utility bills ada karte hain magar badlay mein humein sirf zillat aur khwari milti hai. "
                    f"Asal sangheen masla ye paish aya hai ke {core_content}. "
                    f"Is kharab soorat-e-haal ki wajah se gali ke tamam dukaandar aur karobari hazraat shadeed nuqsan utha rahe hain aur customer ana band ho gaye hain. "
                    f"Humne ilaqay ke 30 moazziz afrad ke dastakhat ke sath written application deputy commissioner aur assistant commissioner office mein jama karwai thi. "
                    f"Magar afsos clerk ne sirf file dabba di aur kisi officer ne mauqa ka muayana tak nahi kiya. "
                    f"Awaam ka sabar ab poori tarah jawab de chuka hai aur agar kal tak emergency relief team na pohnchi to hum traffic block karke dharne par baith jayein ge. "
                    f"Khuda ke waste aam shehriyon ki halat par reham khayein aur foran kaam shuru karwayein."
                ),
            ]
            tmpl = self.rng.choice(variants)
            words = tmpl.split()
            if len(words) > 200:
                words = words[:200]
            return " ".join(words)

    # -------------------------------------------------------------
    # CATEGORY BUILDERS
    # -------------------------------------------------------------

    def build_normal(self, bracket: int, dept_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
        dept = dept_hint or self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        raw = self.build_narrative_context(loc, defect, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "NORMAL_EVERYDAY",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_angry(self, bracket: int, dept_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
        dept = dept_hint or self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        angry_intro = self.rng.choice([
            "Awaam ka sabar aazmana band karo",
            "Had ho chuki hai is bay-hisi ki",
            "Shadeed gham-o-gussa phail raha hai",
            "Kab tak awam ko zaleel karo ge",
        ])
        core = f"{angry_intro}! {defect}. Foran theek karo warna ehtijaj hoga"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "ANGRY_AGGRESSIVE",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_abusive(self, bracket: int, dept_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
        dept = dept_hint or self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        insult = self.rng.choice(CIVIC_INSULTS)
        core = f"{defect}! {insult}. Awam ko pagal banaya hua hai"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "ABUSIVE_PROFANITY",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_slang_code(self, bracket: int, dept_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
        dept = dept_hint or self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        slang = self.rng.choice(KARACHI_SLANGS)
        eng = self.rng.choice(ENGLISH_CODE_SWITCHING_PHRASES)
        core = f"{slang}! {eng} Basically {defect}. Immediate response expected"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "SLANG_CODESWITCH",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_dual(self, bracket: int, depts_hint: Optional[Tuple[str, str]] = None) -> Optional[Dict[str, Any]]:
        d1, d2 = depts_hint or self.rng.sample(DEPARTMENTS, 2)
        loc = self.rng.choice(LOCALITIES)
        p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
        p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
        core = f"do alag alag baray defects hain: pehla masla {p1}, aur doosri taraf {p2}"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "INDEPENDENT_DUAL",
                "text": txt,
                "expected_departments": sorted([d1, d2]),
                "relation_type": "INDEPENDENT",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_triple(self, bracket: int, depts_hint: Optional[Tuple[str, str, str]] = None) -> Optional[Dict[str, Any]]:
        d1, d2, d3 = depts_hint or self.rng.sample(DEPARTMENTS, 3)
        loc = self.rng.choice(LOCALITIES)
        p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
        p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
        p3 = self.rng.choice(DEPT_CORE_PHRASES[d3])
        core = f"emergency civic alert: teen alag alag idaron ki la-parwahi hai. 1: {p1}. 2: {p2}. 3: {p3}"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "INDEPENDENT_TRIPLE",
                "text": txt,
                "expected_departments": sorted([d1, d2, d3]),
                "relation_type": "INDEPENDENT",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_negation(self, bracket: int) -> Optional[Dict[str, Any]]:
        active_dept, negated_dept = self.rng.sample(DEPARTMENTS, 2)
        loc = self.rng.choice(LOCALITIES)
        act_p = self.rng.choice(DEPT_CORE_PHRASES[active_dept])
        neg_p = self.rng.choice(DEPT_CORE_PHRASES[negated_dept])
        core = f"{neg_p} ka issue pichle hafte solve hogaya tha wo ab theek hai, lekin asal current masla ye hai ke {act_p}"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "NEGATION_CONTRADICTION",
                "text": txt,
                "expected_departments": [active_dept],
                "relation_type": "NEGATED",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_causal(self, bracket: int) -> Optional[Dict[str, Any]]:
        loc = self.rng.choice(LOCALITIES)
        scenarios = [
            ("kelectric", "transformer blast hone ki wajah se bijli band hai", "pani ki domestic motor nahi chal rahi aur pani upar tanki mein nahi charh raha"),
            ("kelectric", "voltage shadeed low araha hai bijli ka jhatka lag raha hai", "is waja se fridge aur water motor dono band pari hain"),
            ("kwsc", "main public water supply pipe burst ho chuka hai hazaaron gallon pani beh raha hai", "paani jama hone ki wajah se sarak par gariyan phans rahi hain"),
            ("sswmb", "solid waste management walon ne kachra uthana band kar dia hai kachray ka dhair lag gaya hai", "kachra phailne ki waja se gali ka rasta block hogaya hai"),
        ]
        root_dept, root_cause, symptom = self.rng.choice(scenarios)
        core = f"{root_cause}, jis ke sabab {symptom}. Root problem yehi hai isko hal karein"
        raw = self.build_narrative_context(loc, core, bracket)
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "CAUSAL_CONSEQUENCES",
                "text": txt,
                "expected_departments": [root_dept],
                "relation_type": "CAUSAL",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_corrupted(self, bracket: int) -> Optional[Dict[str, Any]]:
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        raw = self.build_narrative_context(loc, defect, bracket)
        corrupted = corrupt_spelling(raw, self.rng)
        if self.rng.random() < 0.5:
            corrupted = introduce_repeated_chars(corrupted, self.rng)
        if self.rng.random() < 0.3:
            corrupted = introduce_missing_spaces(corrupted, self.rng)
        txt = self.validate_and_clamp(corrupted)
        if txt:
            return {
                "category": "CORRUPTED_SPELLING_GRAMMAR",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_long_narrative(self, bracket: int) -> Optional[Dict[str, Any]]:
        dept = self.rng.choice(DEPARTMENTS)
        loc = self.rng.choice(LOCALITIES)
        defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
        brk = max(bracket, 4) # bracket 4 or 5
        raw = self.build_narrative_context(loc, defect, brk)
        txt = self.validate_and_clamp(raw, min_words=80, max_words=200)
        if txt:
            return {
                "category": "LONG_NARRATIVES",
                "text": txt,
                "expected_departments": [dept],
                "relation_type": "SINGLE",
                "needs_review": False,
                "review_reason": None,
                "is_out_of_scope": False,
            }
        return None

    def build_out_of_scope(self, bracket: int) -> Optional[Dict[str, Any]]:
        loc = self.rng.choice(LOCALITIES)
        oos_txt, reason = self.rng.choice(OUT_OF_SCOPE_SCENARIOS)
        raw = f"{loc} mein {oos_txt}. Baraye meharbani is mamlay mein foran qanooni karwayi ki jae."
        txt = self.validate_and_clamp(raw)
        if txt:
            return {
                "category": "OUT_OF_SCOPE_HARD_NEGATIVES",
                "text": txt,
                "expected_departments": [],
                "relation_type": "UNCERTAIN",
                "needs_review": True,
                "review_reason": reason,
                "is_out_of_scope": True,
            }
        return None

    # -------------------------------------------------------------
    # MASTER BENCHMARK GENERATION (EXACTLY 2,000)
    # -------------------------------------------------------------

    def generate_full_benchmark(self) -> List[Dict[str, Any]]:
        category_targets = {
            "NORMAL_EVERYDAY": 300,
            "ANGRY_AGGRESSIVE": 200,
            "ABUSIVE_PROFANITY": 200,
            "SLANG_CODESWITCH": 200,
            "INDEPENDENT_DUAL": 250,
            "INDEPENDENT_TRIPLE": 150,
            "NEGATION_CONTRADICTION": 200,
            "CAUSAL_CONSEQUENCES": 150,
            "CORRUPTED_SPELLING_GRAMMAR": 150,
            "LONG_NARRATIVES": 100,
            "OUT_OF_SCOPE_HARD_NEGATIVES": 100,
        }

        builders = {
            "NORMAL_EVERYDAY": self.build_normal,
            "ANGRY_AGGRESSIVE": self.build_angry,
            "ABUSIVE_PROFANITY": self.build_abusive,
            "SLANG_CODESWITCH": self.build_slang_code,
            "INDEPENDENT_DUAL": self.build_dual,
            "INDEPENDENT_TRIPLE": self.build_triple,
            "NEGATION_CONTRADICTION": self.build_negation,
            "CAUSAL_CONSEQUENCES": self.build_causal,
            "CORRUPTED_SPELLING_GRAMMAR": self.build_corrupted,
            "LONG_NARRATIVES": self.build_long_narrative,
            "OUT_OF_SCOPE_HARD_NEGATIVES": self.build_out_of_scope,
        }

        benchmark_records: List[Dict[str, Any]] = []
        bracket_dist = [1, 2, 3, 4, 5]
        bracket_weights = [0.20, 0.25, 0.25, 0.15, 0.15]

        print("=== GENERATING EXACTLY 2,000 EVALUATION BENCHMARK COMPLAINTS ===", flush=True)
        start_t = time.time()

        for cat, target_cnt in category_targets.items():
            cat_records = []
            builder = builders[cat]
            attempts = 0
            max_attempts = target_cnt * 30

            # Round-robin department hints to ensure balanced department distribution
            dept_idx = 0

            while len(cat_records) < target_cnt and attempts < max_attempts:
                attempts += 1
                b = self.rng.choices(bracket_dist, weights=bracket_weights, k=1)[0]

                if cat in ("NORMAL_EVERYDAY", "ANGRY_AGGRESSIVE", "ABUSIVE_PROFANITY", "SLANG_CODESWITCH"):
                    hint = DEPARTMENTS[dept_idx % len(DEPARTMENTS)]
                    rec = builder(b, dept_hint=hint)
                    if rec:
                        dept_idx += 1
                else:
                    rec = builder(b)

                if rec and rec.get("text"):
                    rec["id"] = f"EVAL-V1148-{len(benchmark_records) + len(cat_records) + 1:04d}"
                    rec["text_sanitized"] = self.sanitize_text(rec["text"])
                    w_cnt = count_words(rec["text"])
                    rec["word_count"] = w_cnt
                    rec["bracket"] = self.get_bracket(w_cnt)
                    cat_records.append(rec)

            print(f"  [CATEGORY COMPLETE] {cat}: {len(cat_records)} / {target_cnt} in {attempts} attempts", flush=True)
            if len(cat_records) != target_cnt:
                raise RuntimeError(f"Could not generate exact count for {cat}: got {len(cat_records)}, expected {target_cnt}")
            benchmark_records.extend(cat_records)

        dur = time.time() - start_t
        print(f"\n[BENCHMARK READY] Successfully generated EXACTLY {len(benchmark_records)} complaints in {dur:.2f}s!", flush=True)
        return benchmark_records

    @staticmethod
    def get_bracket(word_count: int) -> str:
        if word_count <= 35:
            return "5-35"
        elif word_count <= 80:
            return "36-80"
        elif word_count <= 125:
            return "81-125"
        elif word_count <= 165:
            return "126-165"
        else:
            return "166-200"


if __name__ == "__main__":
    builder = BlindBenchmarkBuilder(seed=20261119)
    records = builder.generate_full_benchmark()
    print(f"Generated total records: {len(records)}")
    
    # Verify exact 2000
    assert len(records) == 2000, f"Expected 2000, got {len(records)}"

    # Check department coverage
    dept_counts: Dict[str, int] = {d: 0 for d in DEPARTMENTS}
    for r in records:
        for d in r["expected_departments"]:
            dept_counts[d] += 1
    print("\nDepartment Gold Support:")
    for d, c in sorted(dept_counts.items()):
        print(f"  {d}: {c} gold instances")
        assert c >= 200, f"Department {d} support {c} is less than required 200!"

    # Check brackets
    bracket_counts = {"5-35": 0, "36-80": 0, "81-125": 0, "126-165": 0, "166-200": 0}
    for r in records:
        bracket_counts[r["bracket"]] += 1
    print("\nLength Bracket Distribution:")
    for b, c in bracket_counts.items():
        print(f"  {b}: {c} ({c / len(records) * 100:.2f}%)")

    # Output directory
    out_dir = Path("data/v11/eval_v11_4_8")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "benchmark_2000.jsonl"
    with open(out_file, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    sha256 = hashlib.sha256(out_file.read_bytes()).hexdigest()
    print(f"\nSaved benchmark to: {out_file}")
    print(f"Benchmark SHA-256: {sha256}")
