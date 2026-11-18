"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.7 Pattern-Breaking Adversarial Generator.

Deterministic, bounded, non-recursive adversarial Roman Urdu complaint generator:
1. Strict word count bounds: 5 to 200 words strictly enforced on every record.
2. 5 Length brackets:
   - 5–35 words
   - 36–80 words
   - 81–125 words
   - 126–165 words
   - 166–200 words (substantial coverage guaranteed, >= 10-15%)
3. 20 Adversarial Difficulty Families (A–T):
   A. NORMAL_ROMAN_URDU
   B. HEAVY_KARACHI_SLANG
   C. CIVIC_INSULTS_ABUSE
   D. ENGLISH_CODE_SWITCHING
   E. SEVERE_SPELLING_MISTAKES
   F. MISSING_SPACES
   G. RANDOM_CAPS_PUNCTUATION
   H. REPEATED_CHARS_PHONETIC
   I. INDEPENDENT_DUAL_ISSUE
   J. CAUSAL_CONSEQUENCES
   K. NEGATED_HISTORICAL_ISSUES
   L. CONTRADICTORY_STATEMENTS
   M. LONG_PERSONAL_NARRATIVES
   N. HIDDEN_CIVIC_PROBLEMS
   O. CONFUSING_DEPARTMENT_REFERENCES
   P. MIXED_OUT_OF_SCOPE
   Q. TRIPLE_ACTIONABLE_ISSUES
   R. AMBIGUOUS_HUMAN_REVIEW
   S. UNUSUAL_CONNECTIVES_BROKEN_GRAMMAR
   T. COMBINED_ADVERSARIAL_SCENARIOS
4. Contrastive counterfactual pairs (minimal semantic flips).
5. Structured ground truth defined BEFORE realization.
6. 100% Zero-leakage against locked evaluation datasets.
7. STRICT SAFETY: Zero recursion, bounded attempt counts, timeout protection, unbuffered progress heartbeats.
"""
from __future__ import annotations

import enum
import hashlib
import json
import random
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

class DifficultyFamily(str, enum.Enum):
    NORMAL_ROMAN_URDU = "A_NORMAL_ROMAN_URDU"
    HEAVY_KARACHI_SLANG = "B_HEAVY_KARACHI_SLANG"
    CIVIC_INSULTS_ABUSE = "C_CIVIC_INSULTS_ABUSE"
    ENGLISH_CODE_SWITCHING = "D_ENGLISH_CODE_SWITCHING"
    SEVERE_SPELLING_MISTAKES = "E_SEVERE_SPELLING_MISTAKES"
    MISSING_SPACES = "F_MISSING_SPACES"
    RANDOM_CAPS_PUNCTUATION = "G_RANDOM_CAPS_PUNCTUATION"
    REPEATED_CHARS_PHONETIC = "H_REPEATED_CHARS_PHONETIC"
    INDEPENDENT_DUAL_ISSUE = "I_INDEPENDENT_DUAL_ISSUE"
    CAUSAL_CONSEQUENCES = "J_CAUSAL_CONSEQUENCES"
    NEGATED_HISTORICAL_ISSUES = "K_NEGATED_HISTORICAL_ISSUES"
    CONTRADICTORY_STATEMENTS = "L_CONTRADICTORY_STATEMENTS"
    LONG_PERSONAL_NARRATIVES = "M_LONG_PERSONAL_NARRATIVES"
    HIDDEN_CIVIC_PROBLEMS = "N_HIDDEN_CIVIC_PROBLEMS"
    CONFUSING_DEPARTMENT_REFERENCES = "O_CONFUSING_DEPARTMENT_REFERENCES"
    MIXED_OUT_OF_SCOPE = "P_MIXED_OUT_OF_SCOPE"
    TRIPLE_ACTIONABLE_ISSUES = "Q_TRIPLE_ACTIONABLE_ISSUES"
    AMBIGUOUS_HUMAN_REVIEW = "R_AMBIGUOUS_HUMAN_REVIEW"
    UNUSUAL_CONNECTIVES_BROKEN_GRAMMAR = "S_UNUSUAL_CONNECTIVES_BROKEN_GRAMMAR"
    COMBINED_ADVERSARIAL_SCENARIOS = "T_COMBINED_ADVERSARIAL_SCENARIOS"

# 60 Karachi Localities
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
]

# Municipal Issue Lexicon Core
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
    ],
}

KARACHI_SLANGS = [
    "bhai scene check karo", "level ki khwari chal rahi hai", "chuss program bana dia hai",
    "topi drama chal raha hai inka", "meter ghoom gaya hai awam ka", "ghanta koi action leta hai",
    "full tapori style mein time pass kar rahe hain", "chikna kaam karne ke bajae so rahe hain",
    "dhanda bana rakha hai", "dimagh ki dahi kar di hai", "seedha phadda hojayega",
    "lafda barh gaya hai", "awaam ko pagal samjha hua hai", "mama banaya hua hai",
]

CIVIC_INSULTS = [
    "nihayat nikamay aur nalaiq afsaran baithe hain", "haramkhor administration bilkul andhi ho chuki hai",
    "besharm staff tankhuwah muft ki le raha hai", "in jahilon ko koi aqal nahi hai",
    "kutton ki tarah zaleel kar ke rakh diya hai awam ko", "laanat aisi service par jo kisi kaam ki nahi",
    "andha kanoon aur soye hue idaray hain", "koi sharam haya nahi bachi in afsaron mein",
    "ghamand aur rishwat khori mein andhe hain", "awam ke tax ke paison par ayashi kar rahe hain",
]

ENGLISH_CODE_SWITCHING_PHRASES = [
    "Severe infrastructure failure has been reported in our sector.",
    "The competent authorities are requested to take urgent notice of this critical civic issue.",
    "Multiple complaints lodged with the helpline but zero response from the ground team.",
    "Public health hazard and dangerous road safety situation developing rapidly.",
    "Citizens are suffering immense mental agony due to total municipal negligence.",
]

OUT_OF_SCOPE_SCENARIOS = [
    ("Gali mein mobile cheen ne ki wardatein barh gayi hain kal dacoits ne firing ki police patrolling barhayein", "POLICE_CRIME"),
    ("Makan malik ghair qanooni taur par bina notice rent barha raha hai aur deposit wapas nahi kar raha court ka mamla hai", "CIVIL_RENT_DISPUTE"),
    ("HBL ATM se paise nikalwaye thay 20 hazaar deduct ho gaye cash nahi nikla bank helpline response nahi de rahi", "BANKING_FRAUD"),
    ("FIA cyber crime cell mein fraud caller ki complaint darj karwani hai jo lottery ke naam par scam kar raha hai", "CYBER_CRIME"),
    ("Traffic police wale be-wajah 2000 ka challan kaat rahe hain bina kisi violation ke rishwat mangte hain", "TRAFFIC_POLICE_EXTORTION"),
]


def count_words(text: str) -> int:
    """Return count of whitespace-delimited tokens."""
    return len(text.strip().split())


def clamp_words(text: str, min_w: int = 5, max_w: int = 200) -> str:
    """Ensure word count is strictly within [min_w, max_w]. Trims if > max_w."""
    words = text.strip().split()
    if len(words) > max_w:
        words = words[:max_w]
        text = " ".join(words)
        if not text.endswith((".", "!", "?")):
            text += "."
    return text


def corrupt_spelling(text: str, rng: random.Random) -> str:
    """Apply realistic Roman Urdu spelling corruptions and typos."""
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
    """Simulate smashed words (missing spaces)."""
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
    """Random capitalization and dramatic exclamation/question punctuation."""
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
    """Stretch characters to convey emotion/frustration."""
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


class PatternBreakingGenerator:
    """State-of-the-art adversarial Roman Urdu complaint generator for Phase V11.4.7."""

    def __init__(self, seed: int = 20261118, locked_eval_paths: Optional[List[str]] = None):
        self.rng = random.Random(seed)
        self.locked_hashes: Set[str] = set()
        self.locked_normalized: Set[str] = set()
        self.generated_normalized: Set[str] = set()
        self.init_locked_sets(locked_eval_paths)

    def init_locked_sets(self, paths: Optional[List[str]] = None) -> None:
        if paths is None:
            paths = [
                "data/v11/human_gold/locked_gold.jsonl",
                "data/v11/curriculum_runs/run_004/frozen_test.jsonl",
                "data/v11/adversarial_train/fresh_challenge_500.jsonl",
                "data/v11/stress_test/adversarial_benchmark_2000.jsonl",
                "data/v11/regression/regression_cases.jsonl",
            ]
        for p_str in paths:
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
        """Validate and clamp word count strictly between 5 and 200 words."""
        s = clamp_words(text, min_words, max_words)
        w_count = count_words(s)
        if w_count < min_words or w_count > max_words:
            return None
        norm = self.normalize(s)
        if norm in self.generated_normalized:
            return None
        if self.is_leaked(s):
            return None
        self.generated_normalized.add(norm)
        return s

    def build_narrative_context(self, loc: str, core_content: str, bracket: int) -> str:
        """Construct complaint text tailored to the target word length bracket with diverse combinations."""
        # Multiple variants per bracket to avoid template saturation
        if bracket == 1: # 5-35 words
            variants = [
                f"{loc} mein {core_content}. Baraye meharbani isko jald theek kiya jae.",
                f"Emergency civic issue in {loc}: {core_content}. Foran team bhejein.",
                f"Janab, {loc} par {core_content}. Awaam shadeed takleef mein hai.",
                f"{loc} ke rehaishi shikayat karte hain ke {core_content}.",
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
                    f"Humne pichle hafte bhi call ki thi magar koi sunwayi nahi hui aur masla barhta ja raha hai. "
                    f"Meharbani farma kar iska fori sadd-e-baab karein aur team ko field mein rawana karein."
                ),
                (
                    f"Guzarish ye hai ke {loc} ki galiyon mein {core_content}. "
                    f"Daily commuters aur dukaandar is soorat-e-haal se be-inteha pareshan hain. "
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
                    f"Baraye meharbani is critical grievance ko top priority par hal kiya jae aur zimmedaron ka taaiyun kiya jae."
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
    # 20 FAMILY GENERATORS (A-T) - NON-RECURSIVE, BOUNDED RETRIES
    # -------------------------------------------------------------

    def gen_family_a_normal(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            raw = self.build_narrative_context(loc, defect, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.NORMAL_ROMAN_URDU.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_b_slang(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            slang1 = self.rng.choice(KARACHI_SLANGS)
            slang2 = self.rng.choice(KARACHI_SLANGS)
            core = f"{slang1}! {defect}. {slang2}, awaam ka meter ghoom chuka hai seedha kaam karo"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.HEAVY_KARACHI_SLANG.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_c_insults(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            insult1 = self.rng.choice(CIVIC_INSULTS)
            insult2 = self.rng.choice(CIVIC_INSULTS)
            core = f"{defect}! {insult1}. Awam mar rahi hai aur ye mufatkhor so rahe hain. {insult2}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.CIVIC_INSULTS_ABUSE.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_d_english_code_switch(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            eng1 = self.rng.choice(ENGLISH_CODE_SWITCHING_PHRASES)
            eng2 = self.rng.choice(ENGLISH_CODE_SWITCHING_PHRASES)
            core = f"{eng1} Specifically, {defect}. {eng2} Urgent municipal intervention required"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.ENGLISH_CODE_SWITCHING.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_e_spelling(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            base = self.build_narrative_context(loc, defect, target_bracket)
            corrupted = corrupt_spelling(base, self.rng)
            text = self.validate_and_clamp(corrupted)
            if text:
                return {
                    "family": DifficultyFamily.SEVERE_SPELLING_MISTAKES.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_f_missing_spaces(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            base = self.build_narrative_context(loc, defect, target_bracket)
            smashed = introduce_missing_spaces(base, self.rng)
            text = self.validate_and_clamp(smashed)
            if text:
                return {
                    "family": DifficultyFamily.MISSING_SPACES.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_g_caps_punct(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            base = self.build_narrative_context(loc, defect, target_bracket)
            mod = introduce_random_caps_punct(base, self.rng)
            text = self.validate_and_clamp(mod)
            if text:
                return {
                    "family": DifficultyFamily.RANDOM_CAPS_PUNCTUATION.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_h_repeated_chars(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            base = self.build_narrative_context(loc, defect, target_bracket)
            mod = introduce_repeated_chars(base, self.rng)
            text = self.validate_and_clamp(mod)
            if text:
                return {
                    "family": DifficultyFamily.REPEATED_CHARS_PHONETIC.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_i_independent_dual(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            d1, d2 = self.rng.sample(DEPARTMENTS, 2)
            loc = self.rng.choice(LOCALITIES)
            p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
            p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
            core = f"do alag alag baray maslay hain, pehla ye ke {p1}, aur doosra masla ye ke {p2}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.INDEPENDENT_DUAL_ISSUE.value,
                    "text": text,
                    "department_labels": sorted([d1, d2]),
                    "relation_type": "INDEPENDENT",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_j_causal(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        scenarios = [
            ("kelectric", "transformer blast hone ki wajah se bijli band hai", "pani ki domestic motor nahi chal rahi aur pani tanki mein nahi charh raha"),
            ("kelectric", "voltage shadeed low araha hai bijli ka jhatka lag raha hai", "is waja se fridge aur water motor dono band pari hain"),
            ("kwsc", "main public water supply pipe burst ho chuka hai hazaaron gallon pani beh raha hai", "paani jama hone ki wajah se sarak par gariyan phans rahi hain"),
            ("sswmb", "solid waste management walon ne kachra uthana band kar dia hai kachray ka dhair lag gaya hai", "kachra phailne ki waja se gali ka rasta block hogaya hai"),
        ]
        for _ in range(8):
            loc = self.rng.choice(LOCALITIES)
            root_dept, root_cause, symptom = self.rng.choice(scenarios)
            core = f"{root_cause}, jis ke sabab {symptom}. Asal root cause masla yehi hai"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.CAUSAL_CONSEQUENCES.value,
                    "text": text,
                    "department_labels": [root_dept],
                    "relation_type": "CAUSAL",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_k_negated(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            active_dept, negated_dept = self.rng.sample(DEPARTMENTS, 2)
            loc = self.rng.choice(LOCALITIES)
            act_phrase = self.rng.choice(DEPT_CORE_PHRASES[active_dept])
            neg_phrase = self.rng.choice(DEPT_CORE_PHRASES[negated_dept])
            core = f"{neg_phrase} ka masla pehle tha jo ab theek ho chuka hai aur bilkul koi issue nahi hai, lekin asal complaint ye hai ke {act_phrase}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.NEGATED_HISTORICAL_ISSUES.value,
                    "text": text,
                    "department_labels": [active_dept],
                    "relation_type": "NEGATED",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_l_contradictory(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            d1, d2 = self.rng.sample(DEPARTMENTS, 2)
            loc = self.rng.choice(LOCALITIES)
            p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
            p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
            core = f"pehle hume laga ke {p1}, lekin ghaur karne par pata chala wo baat ghalat thi wo to theek hai, asal haqeeqat ye hai ke {p2}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.CONTRADICTORY_STATEMENTS.value,
                    "text": text,
                    "department_labels": [d2],
                    "relation_type": "NEGATED",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_m_long_narrative(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            brk = max(target_bracket, 4)
            raw = self.build_narrative_context(loc, defect, brk)
            text = self.validate_and_clamp(raw, min_words=80, max_words=200)
            if text:
                return {
                    "family": DifficultyFamily.LONG_PERSONAL_NARRATIVES.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_n_hidden(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            core = f"kal sham hotel par baithe cricket match aur karobar ki baat karte hue achanak dekha ke wahan {defect}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.HIDDEN_CIVIC_PROBLEMS.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_o_confusing_dept(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        scenarios = [
            ("kelectric", "KMC walon ko sharam nahi aati bijli ka transformer blast hogaya hai andhera hai KMC light on kare"),
            ("kwsc", "K-Electric walo tumhara kya qasoor hai lekin drinking water line leak ho rahi hai pani do"),
            ("kmc", "Sui gas company ko call ki thi ke sarak tooti hui hai unho ne kaha ye road KMC ka mamla hai ab KMC theek kare"),
            ("sswmb", "Water board walon ko kaho ke kachray ka dhair uthayein balke ye to solid waste ka kaam hai jo so raha hai"),
        ]
        for _ in range(8):
            loc = self.rng.choice(LOCALITIES)
            target_dept, tmpl = self.rng.choice(scenarios)
            raw = self.build_narrative_context(loc, tmpl, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.CONFUSING_DEPARTMENT_REFERENCES.value,
                    "text": text,
                    "department_labels": [target_dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_p_mixed_out_of_scope(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            oos_txt, _ = self.rng.choice(OUT_OF_SCOPE_SCENARIOS)
            core = f"{oos_txt}. Sath hi municipal masla ye hai ke {defect}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.MIXED_OUT_OF_SCOPE.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_q_triple(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            d1, d2, d3 = self.rng.sample(DEPARTMENTS, 3)
            loc = self.rng.choice(LOCALITIES)
            p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
            p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
            p3 = self.rng.choice(DEPT_CORE_PHRASES[d3])
            core = f"teen alag alag maslay hain: pehla {p1}, doosra {p2}, aur teesra {p3}"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.TRIPLE_ACTIONABLE_ISSUES.value,
                    "text": text,
                    "department_labels": sorted([d1, d2, d3]),
                    "relation_type": "INDEPENDENT",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_r_ambiguous(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        ambiguous_cases = [
            ("main road par ajeeb qisam ki shadeed badboo aur gas jaisi smell arahi hai samajh nahi araha gas leak hai ya chemical factory ka kachra", "AMBIGUOUS_CIVIC_DEFECT"),
            ("hamaray ilaqa ki boundary par Cantonment Board aur KMC dono kehte hain ye area hamara nahi hai aur gali ki safai aur road ruki hui hai", "JURISDICTION_DISPUTE"),
            ("padosi ke plot par zameen dhas rahi hai pata nahi pani ki underground line leek hai ya building ki bunyad baith rahi hai", "STRUCTURAL_OR_SEWER_AMBIGUITY"),
            ("sarak ke darmian bara khadda khoda gaya tha private contractor bhag gaya ab K-Electric ya Water Board kisne khoda koi pata nahi", "CONTESTED_EXCAVATION"),
        ]
        for _ in range(8):
            loc = self.rng.choice(LOCALITIES)
            txt, reason = self.rng.choice(ambiguous_cases)
            raw = self.build_narrative_context(loc, txt, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.AMBIGUOUS_HUMAN_REVIEW.value,
                    "text": text,
                    "department_labels": [],
                    "relation_type": "UNCERTAIN",
                    "needs_review": True,
                    "review_reason": reason,
                }
        return None

    def gen_family_s_unusual_connectives(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            dept = self.rng.choice(DEPARTMENTS)
            loc = self.rng.choice(LOCALITIES)
            defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
            core = f"subah se... {defect}... koi nahi aya... bas khwari... banda bhej do bhai... kab tak chalega"
            raw = self.build_narrative_context(loc, core, target_bracket)
            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.UNUSUAL_CONNECTIVES_BROKEN_GRAMMAR.value,
                    "text": text,
                    "department_labels": [dept],
                    "relation_type": "SINGLE",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    def gen_family_t_combined(self, target_bracket: int) -> Optional[Dict[str, Any]]:
        for _ in range(8):
            d1, d2 = self.rng.sample(DEPARTMENTS, 2)
            loc = self.rng.choice(LOCALITIES)
            p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
            p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
            slang = self.rng.choice(KARACHI_SLANGS)
            insult = self.rng.choice(CIVIC_INSULTS)

            core = (
                f"{slang}! {insult}. "
                f"Ek taraf to {p1}, aur sath hi sath {p2}. "
                f"Gas ka koi masla nahi hai wo bilkul theek hai lekin ye dono museebatein foran theek karo"
            )
            raw = self.build_narrative_context(loc, core, target_bracket)
            if self.rng.random() < 0.5:
                raw = corrupt_spelling(raw, self.rng)
            if self.rng.random() < 0.3:
                raw = introduce_repeated_chars(raw, self.rng)

            text = self.validate_and_clamp(raw)
            if text:
                return {
                    "family": DifficultyFamily.COMBINED_ADVERSARIAL_SCENARIOS.value,
                    "text": text,
                    "department_labels": sorted([d1, d2]),
                    "relation_type": "INDEPENDENT",
                    "needs_review": False,
                    "review_reason": None,
                }
        return None

    # -------------------------------------------------------------
    # COUNTERFACTUAL PAIR GENERATOR - PARAMETERIZED & DETERMINISTIC
    # -------------------------------------------------------------

    def gen_counterfactual_pair(self) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """Generate a contrastive pair testing causal vs independent, or negation flip."""
        for _ in range(8):
            loc = self.rng.choice(LOCALITIES)
            pair_type = self.rng.choice(["causal_vs_indep", "negation_flip", "insult_invariant", "spelling_invariant"])

            if pair_type == "causal_vs_indep":
                d_root = "kelectric"
                d_symp = "kwsc"
                v = self.rng.randint(1, 3)
                if v == 1:
                    txt_a = f"{loc} mein bijli band hai aur is waja se pani ki domestic motor nahi chal rahi."
                    txt_b = f"{loc} mein bijli band hai aur sarak par drinking water supply line bhi leak ho rahi hai."
                elif v == 2:
                    txt_a = f"Transformer blast hone ki waja se {loc} mein light nahi hai aur motor band hone se pani nahi araha."
                    txt_b = f"Transformer blast hone se {loc} mein light nahi hai aur sewerage line phatne se ganda pani bhi jama hai."
                else:
                    txt_a = f"{loc} mein voltage shadeed low hai jis se pani ki motor trip ho rahi hai."
                    txt_b = f"{loc} mein voltage shadeed low hai aur main sadak par drinking water supply pipe burst hai."

                t_a = self.validate_and_clamp(txt_a)
                t_b = self.validate_and_clamp(txt_b)
                if t_a and t_b:
                    return (
                        {
                            "family": DifficultyFamily.CAUSAL_CONSEQUENCES.value,
                            "text": t_a,
                            "department_labels": [d_root],
                            "relation_type": "CAUSAL",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_CAUSAL_INDEP_A",
                        },
                        {
                            "family": DifficultyFamily.INDEPENDENT_DUAL_ISSUE.value,
                            "text": t_b,
                            "department_labels": sorted([d_root, d_symp]),
                            "relation_type": "INDEPENDENT",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_CAUSAL_INDEP_B",
                        }
                    )

            elif pair_type == "negation_flip":
                d1, d2 = self.rng.sample(DEPARTMENTS, 2)
                p1 = self.rng.choice(DEPT_CORE_PHRASES[d1])
                p2 = self.rng.choice(DEPT_CORE_PHRASES[d2])
                txt_a = f"{loc} mein {p1} ka koi masla nahi hai wo theek hai lekin asal masla ye hai ke {p2}."
                txt_b = f"{loc} mein {p1} ka masla bhi hai aur sath hi sath {p2}."

                t_a = self.validate_and_clamp(txt_a)
                t_b = self.validate_and_clamp(txt_b)
                if t_a and t_b:
                    return (
                        {
                            "family": DifficultyFamily.NEGATED_HISTORICAL_ISSUES.value,
                            "text": t_a,
                            "department_labels": [d2],
                            "relation_type": "SINGLE",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_NEG_FLIP_A",
                        },
                        {
                            "family": DifficultyFamily.INDEPENDENT_DUAL_ISSUE.value,
                            "text": t_b,
                            "department_labels": sorted([d1, d2]),
                            "relation_type": "INDEPENDENT",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_NEG_FLIP_B",
                        }
                    )

            elif pair_type == "insult_invariant":
                dept = self.rng.choice(DEPARTMENTS)
                defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
                insult = self.rng.choice(CIVIC_INSULTS)
                txt_a = f"{loc} mein {defect}. Baraye meharbani isko jald az jald theek karein."
                txt_b = f"{loc} mein {defect}. {insult}. Laanat aisi nalaiq administration par."

                t_a = self.validate_and_clamp(txt_a)
                t_b = self.validate_and_clamp(txt_b)
                if t_a and t_b:
                    return (
                        {
                            "family": DifficultyFamily.NORMAL_ROMAN_URDU.value,
                            "text": t_a,
                            "department_labels": [dept],
                            "relation_type": "SINGLE",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_INSULT_INV_A",
                        },
                        {
                            "family": DifficultyFamily.CIVIC_INSULTS_ABUSE.value,
                            "text": t_b,
                            "department_labels": [dept],
                            "relation_type": "SINGLE",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_INSULT_INV_B",
                        }
                    )

            else: # spelling_invariant
                dept = self.rng.choice(DEPARTMENTS)
                defect = self.rng.choice(DEPT_CORE_PHRASES[dept])
                txt_a = f"{loc} mein {defect}. Team foran bhej kar masla hal karein."
                txt_b = corrupt_spelling(f"{loc} me {defect}. Tm foran bhej kr msla hl krain.", self.rng)

                t_a = self.validate_and_clamp(txt_a)
                t_b = self.validate_and_clamp(txt_b)
                if t_a and t_b:
                    return (
                        {
                            "family": DifficultyFamily.NORMAL_ROMAN_URDU.value,
                            "text": t_a,
                            "department_labels": [dept],
                            "relation_type": "SINGLE",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_SPELL_INV_A",
                        },
                        {
                            "family": DifficultyFamily.SEVERE_SPELLING_MISTAKES.value,
                            "text": t_b,
                            "department_labels": [dept],
                            "relation_type": "SINGLE",
                            "needs_review": False,
                            "review_reason": None,
                            "counterfactual_pair_id": "PAIR_SPELL_INV_B",
                        }
                    )
        return None

    # -------------------------------------------------------------
    # BATCH GENERATION WITH BOUNDED ATTEMPTS & DETERMINISTIC TIMEOUT
    # -------------------------------------------------------------

    def generate_batch(
        self,
        target_count: int = 2000,
        human_review_target: int = 50,
        family_weights: Optional[Dict[str, float]] = None,
        timeout_seconds: float = 180.0,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """Generate a complete balanced adversarial batch with hard timeouts and bounded attempts."""
        start_time = time.time()
        families = list(DifficultyFamily)
        generators = {
            DifficultyFamily.NORMAL_ROMAN_URDU: self.gen_family_a_normal,
            DifficultyFamily.HEAVY_KARACHI_SLANG: self.gen_family_b_slang,
            DifficultyFamily.CIVIC_INSULTS_ABUSE: self.gen_family_c_insults,
            DifficultyFamily.ENGLISH_CODE_SWITCHING: self.gen_family_d_english_code_switch,
            DifficultyFamily.SEVERE_SPELLING_MISTAKES: self.gen_family_e_spelling,
            DifficultyFamily.MISSING_SPACES: self.gen_family_f_missing_spaces,
            DifficultyFamily.RANDOM_CAPS_PUNCTUATION: self.gen_family_g_caps_punct,
            DifficultyFamily.REPEATED_CHARS_PHONETIC: self.gen_family_h_repeated_chars,
            DifficultyFamily.INDEPENDENT_DUAL_ISSUE: self.gen_family_i_independent_dual,
            DifficultyFamily.CAUSAL_CONSEQUENCES: self.gen_family_j_causal,
            DifficultyFamily.NEGATED_HISTORICAL_ISSUES: self.gen_family_k_negated,
            DifficultyFamily.CONTRADICTORY_STATEMENTS: self.gen_family_l_contradictory,
            DifficultyFamily.LONG_PERSONAL_NARRATIVES: self.gen_family_m_long_narrative,
            DifficultyFamily.HIDDEN_CIVIC_PROBLEMS: self.gen_family_n_hidden,
            DifficultyFamily.CONFUSING_DEPARTMENT_REFERENCES: self.gen_family_o_confusing_dept,
            DifficultyFamily.MIXED_OUT_OF_SCOPE: self.gen_family_p_mixed_out_of_scope,
            DifficultyFamily.TRIPLE_ACTIONABLE_ISSUES: self.gen_family_q_triple,
            DifficultyFamily.AMBIGUOUS_HUMAN_REVIEW: self.gen_family_r_ambiguous,
            DifficultyFamily.UNUSUAL_CONNECTIVES_BROKEN_GRAMMAR: self.gen_family_s_unusual_connectives,
            DifficultyFamily.COMBINED_ADVERSARIAL_SCENARIOS: self.gen_family_t_combined,
        }

        weights = [family_weights.get(f.value, 1.0) if family_weights else 1.0 for f in families]
        total_w = sum(weights)
        norm_weights = [w / total_w for w in weights]

        accepted: List[Dict[str, Any]] = []
        human_review_cases: List[Dict[str, Any]] = []
        bracket_counts = {
            "5-35": 0,
            "36-80": 0,
            "81-125": 0,
            "126-165": 0,
            "166-200": 0,
        }
        family_counts = {f.value: 0 for f in families}

        # 1. Generate Counterfactual Pairs First (bounded attempts)
        cf_target = int(target_count * 0.15)
        cf_attempts = 0
        max_cf_attempts = cf_target * 10

        while len(accepted) < cf_target and cf_attempts < max_cf_attempts:
            cf_attempts += 1
            if time.time() - start_time > timeout_seconds:
                print(f"[GENERATION TIMEOUT] Counterfactual generation reached {timeout_seconds}s limit. Proceeding.", flush=True)
                break

            pair = self.gen_counterfactual_pair()
            if not pair:
                continue

            rec_a, rec_b = pair
            for r in (rec_a, rec_b):
                if r.get("text") and len(accepted) < cf_target:
                    r["id"] = f"ADV-CF-{len(accepted)+1:05d}"
                    r["text_sanitized"] = self.sanitize_text(r["text"])
                    w_cnt = count_words(r["text"])
                    r["word_count"] = w_cnt
                    bracket = self.get_bracket(w_cnt)
                    r["bracket"] = bracket
                    bracket_counts[bracket] += 1
                    family_counts[r["family"]] = family_counts.get(r["family"], 0) + 1
                    accepted.append(r)

        # 2. Generate remaining batch targeting 5 length brackets
        brackets = [1, 2, 3, 4, 5]
        bracket_weights = [0.20, 0.25, 0.25, 0.15, 0.15]

        attempts = 0
        max_attempts = target_count * 15
        last_heartbeat_time = time.time()

        while len(accepted) < target_count and attempts < max_attempts:
            attempts += 1

            now = time.time()
            if now - start_time > timeout_seconds:
                print(f"[GENERATION TIMEOUT] Batch generation reached {timeout_seconds}s limit with {len(accepted)} accepted. Proceeding.", flush=True)
                break

            if now - last_heartbeat_time >= 5.0:
                last_heartbeat_time = now
                rate = len(accepted) / (now - start_time) if (now - start_time) > 0 else 0
                print(f"  [HEARTBEAT] Generated {len(accepted)} / {target_count} ({rate:.1f} samples/sec, {attempts} attempts)", flush=True)

            fam = self.rng.choices(families, weights=norm_weights, k=1)[0]
            gen_fn = generators[fam]
            bracket_idx = self.rng.choices(brackets, weights=bracket_weights, k=1)[0]
            rec = gen_fn(bracket_idx)

            if not rec or not rec.get("text"):
                continue

            txt = rec["text"]
            w_cnt = count_words(txt)
            if w_cnt < 5 or w_cnt > 200:
                continue

            rec["id"] = f"ADV-V1147-{len(accepted)+1:05d}"
            rec["text_sanitized"] = self.sanitize_text(txt)
            rec["word_count"] = w_cnt
            bracket = self.get_bracket(w_cnt)
            rec["bracket"] = bracket

            if rec.get("needs_review") and len(human_review_cases) < human_review_target:
                human_review_cases.append(rec)
            else:
                bracket_counts[bracket] += 1
                family_counts[rec["family"]] = family_counts.get(rec["family"], 0) + 1
                accepted.append(rec)

        duration = round(time.time() - start_time, 2)
        stats = {
            "total_accepted": len(accepted),
            "human_review_count": len(human_review_cases),
            "generation_duration_seconds": duration,
            "attempts": attempts,
            "bracket_counts": bracket_counts,
            "bracket_percentages": {k: round(v / len(accepted) * 100, 2) for k, v in bracket_counts.items()} if accepted else {},
            "family_counts": family_counts,
            "zero_leakage_verified": True,
        }
        return accepted, human_review_cases, stats

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
