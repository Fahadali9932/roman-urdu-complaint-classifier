"""AWAAZ-E-AWAM (آوازِ عوام) — Phase V11.4 Issue-Centric Relation Engine.

Implements:
- Clause & Span Candidate Extraction preserving original text and character offsets.
- IssueCandidate schema with Asset, Defect Predicate, Actionability, and Negation Scope.
- Pairwise Relation Graph (SINGLE, CAUSES_CONTEXT_ONLY, INDEPENDENT, SAME_INCIDENT_DIFFERENT_REPAIRS,
  MENTION_ONLY, RECIPIENT_ONLY, SPATIAL_PROXIMITY_ONLY, NEGATED, UNCERTAIN).
- Affirmative Domain Defect Evidence Gating for all six municipal agencies.
- Distinct Review Reason Separation (UNCERTAIN_DEFECT, INCOMPLETE_PUBLIC_LOCATION, OUT_OF_SCOPE).
"""

from dataclasses import dataclass, field
import re
from typing import Any, Dict, List, Optional, Set, Tuple

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

RELATION_TYPES = {
    "SINGLE",
    "CAUSES_CONTEXT_ONLY",
    "INDEPENDENT",
    "SAME_INCIDENT_DIFFERENT_REPAIRS",
    "MENTION_ONLY",
    "RECIPIENT_ONLY",
    "SPATIAL_PROXIMITY_ONLY",
    "NEGATED",
    "UNCERTAIN",
}

# ---------------------------------------------------------------------------
# Affirmative Domain Lexicons (Normalized)
# ---------------------------------------------------------------------------

DOMAIN_EVIDENCE = {
    "kmc": {
        "assets": [
            r"\bsarak\b", r"\bsadak\b", r"\broad\b", r"\bfootpath\b", r"\bfoot\s*path\b",
            r"\bstreet\s*lights?\b", r"\bbatti\b", r"\bbattiyan\b", r"\bchauraha\b",
            r"\bchowk\b", r"\bbridge\b", r"\bpul\b", r"\bunderpass\b", r"\btiles\b",
            r"\basphalt\b", r"\bpavement\b", r"\bnaali\b", r"\bnaala\b", r"\bnullah\b",
            r"\bstormwater(?:\s*drain)?\b", r"\bdrainage\s*nala\b", r"\bdrainage\b",
            r"\bbarish\s*ka\s*paani\b"
        ],
        "defects": [
            r"\btoot\b", r"\btooti\b", r"\btoota\b", r"\bgaddha\b", r"\bgaddhay\b",
            r"\bgaddhe\b", r"\bgaddhon\b", r"\bkhadda\b", r"\bkhadday\b",
            r"\bkhaddhon\b", r"\bpothole\b", r"\bpotholes\b", r"\bdhans\b",
            r"\bkharab\b", r"\bdamage\b", r"\bdamaged\b", r"\brepair\b",
            r"\brebuild\b", r"\bbana(?:o|ein)\b", r"\bandhera\b",
            r"\bencroachment\b", r"\bgaariyan\s*lagti\b", r"\bgehra\b",
            r"\bdarya\b", r"\bubal\s*kar\s*road\b", r"\bandhera\s*rehta\b",
            r"\bbattiyan\s*kharab\b", r"\bband\s*pari\b", r"\bband\s*hain\b",
            r"\bpaani\s*khara\b", r"\bdo\s*foot\s*paani\b",
            r"\bdrainage\s*nala\s*kaam\s*n[ah]?[iy]\s*kar\s*raha\b",
            r"\bkaam\s*n[ah]?[iy]\s*kar\s*raha\b"
        ],
        "denials": [
            r"\bsarak\s+(?:bilkul\s+)?theek\b",
            r"\broad\s+tooti\s+(?:hui\s+)?na?h?i\b",
            r"\bsarak\s+tooti\s+(?:hui\s+)?na?h?i\b",
            r"\bfootpath\s+kharab\s+(?:hua\s+)?na?h?i\b"
        ]
    },
    "kwsc": {
        "assets": [
            r"\bpani\b", r"\bpaani\b", r"\bwater\b", r"\bsewer\b", r"\bsewerage\b",
            r"\bgutter\b", r"\bmanhole\b", r"\bwater\s*main\b", r"\bwater\s*(?:pipe|pipeline|supply)\b",
            r"\bsarkari\s*pani\b", r"\bpublic\s*(?:water|pani|pipe|pipeline)\b",
            r"\bpipe\b", r"\bpipeline\b", r"\bwater\s*board\b", r"\bkwsc\b", r"\bkw&sc\b",
            r"\bdrinking\s*water\b", r"\btap\b", r"\bsewage\b", r"\btanki\b", r"\btankee\b",
            r"\bsewer\s*line\b", r"\bwater\s*supply\s*line\b"
        ],
        "defects": [
            r"\bleak\b", r"\bleakage\b", r"\bphat\b", r"\bphati\b", r"\bphatne\b",
            r"\bburst\b", r"\boverflow\b", r"\bubalta\b", r"\bubal\b", r"\btalaab\b",
            r"\bcover\s*missing\b", r"\blid\b", r"\bsookhi\b", r"\bpressure\s*(?:intihai|bohot|bht|nihayat|bohat)?\s*kam\b",
            r"\bpressure\s*(?:na\s*hone|zero)\b", r"\bpaani\s*nahi\s*aa\s*raha\b", r"\bwater\s*nahi\s*aa\s*raha\b",
            r"\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b", r"\bshortage\b", r"\bchori\b", r"\bband\s*hai\b",
            r"\breplace\s*lid\b", r"\bcovers?\s*missing\b", r"\bcontaminated\b", r"\btoxic\s*smell\b",
            r"\btanki\s*nahi\s*bhar\b", r"\bsewer\s*line\s*choke\b", r"\bchoke\b",
            r"\bsirf\s*hawa\s*aa\s*rahi\b", r"\bganda\s*pani\b", r"\bsewage\s*mix\b"
        ],
        "denials": [
            r"\bye\s+pani\s+ka\s+masla\s+na?h?i\b",
            r"\bpani\s+ka\s+koi\s+masla\s+nahi\b",
            r"\bwater\s+ka\s+masla\s+nahi\b"
        ]
    },
    "kelectric": {
        "assets": [
            r"\bbijli\b", r"\blight\b", r"\bcurrent\b", r"\bfeeder\b", r"\btransformer\b",
            r"\btaar\b", r"\bwire\b", r"\bpole\b", r"\bkhamba\b", r"\bvoltage\b", r"\bpower\b",
            r"\bk-?electric\b", r"\b11kv\b", r"\bjumper\b", r"\bcutout\b", r"\bfuse\b",
            r"\belectricity\s*pole\b", r"\bphase\b", r"\bphases\b"
        ],
        "defects": [
            r"\bload\s*shedding\b", r"\bspark\b", r"\bsparking\b", r"\bblast\b",
            r"\bshort\s*circuit\b", r"\btrip\b", r"\blatak\b", r"\bhanging\b",
            r"\bjhatkay\b", r"\bbijli\s*nahi\s*aa\s*rahi\b", r"\blight\s*gayi\b",
            r"\bbijli\s*gayi\b", r"\bfeeder\s*band\b", r"\bfeeder\s*fault\b",
            r"\bfeeder\s*down\b", r"\bbar\s*bar\s*(?:light|bijli)?\s*ja\s*ra?h?i\b",
            r"\btransformer\s*(?:ka\s*)?(?:blast|jal\s*gaya|phat\s*gaya|kharab|fault)\b",
            r"\bfeeder\s*(?:ka\s*)?(?:fault|band)\b",
            r"\bpower\s*outage\b", r"\bband\s*hai\b", r"\bpower\s*supply\s*cut\s*off\b",
            r"\bzero\s*voltage\b", r"\bsingle\s*phase\b", r"\bburnt\b", r"\bsnapping\b",
            r"\bcorroded\b", r"\bmight\s*collapse\b", r"\b(?:2|do)?\s*phase\s*gayab\b",
            r"\bdim\s*light\b", r"\bvoltage\s*(?:drop|fluctuation|low|kam|up\s*down|bohat\s*zyada\s*low)\b",
            r"\bfeeder\s*trip\b", r"\btoot\s*(?:kar\s*)?(?:zameen\s*par\s*)?(?:gir|giri)\b",
            r"\bnangi\s*taar\b", r"\bappliances\s*jalne\b"
        ],
        "denials": [
            r"\bpole\s+kharab\s+nahi\b",
            r"\bbijli\s+ka\s+masla\s+nahi\b",
            r"\blight\s+theek\s+hai\b"
        ]
    },
    "ssgc": {
        "assets": [
            r"\bgas\b", r"\bsui\s*gas\b", r"\bgas\s*pipe\b", r"\bgas\s*pipeline\b",
            r"\bgas\s*line\b", r"\bgas\s*mains\b", r"\bgas\s*meter\b", r"\bchulha\b",
            r"\bssgc\b", r"\bregulator\b", r"\bdiaphragm\b", r"\bnatural\s*gas\b"
        ],
        "defects": [
            r"\bboo\b", r"\bsmell\b", r"\bhiss\b", r"\bleak\b", r"\bleakage\b",
            r"\bpressure\b", r"\bchulha\s*nahi\s*jal\b", r"\bflame\s*nahi\b",
            r"\baag\s*lagne\b", r"\bdhamaka\b", r"\bburst\b", r"\bkam\s*aa\s*raha\b",
            r"\bruptured\b", r"\bwhistling\b", r"\bblowing\s*out\b", r"\bchulha\s*band\b",
            r"\bnahi\s*aa\s*rahi\b", r"\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b",
            r"\bgas\s*(?:na\s*hone|gayab)\b", r"\bkhana\s*banana\s*namumkin\b",
            r"\btez\s*boo\b", r"\bcylinder\s*lana\s*parh\b"
        ],
        "denials": [
            r"\bgas\s+ka\s+koi\s+issue\s+nahi\b",
            r"\bye\s+gas\s+ka\s+masla\s+na?h?i\b",
            r"\bgas\s+leak\s+nahi\s+hai\b",
            r"\bgas\s+theek\s+hai\b"
        ]
    },
    "sswmb": {
        "assets": [
            r"\bkachra\b", r"\bkachray\b", r"\bkura\b", r"\btrash\b", r"\bgarbage\b",
            r"\bdustbin\b", r"\bdustbins\b", r"\bbin\b", r"\bbins\b", r"\bdhabay\b",
            r"\bdead\s*animal\b", r"\bkachra\s*kundi\b", r"\bsswmb\b",
            r"\bwaste\b", r"\bdumpster\b", r"\bmurda\s*janwar\b", r"\blaash\b",
            r"\bcarcass\b", r"\billegal\s*(?:garbage\s*)?dump\b", r"\bdump\b"
        ],
        "defects": [
            r"\bnahi\s*utha\b", r"\bnahi\s*uth\b", r"\bnahi\s*uthta\b",
            r"\buthta\s*nahi\b", r"\buthaya\s*nahi\b", r"\bpara\s*hai\b", r"\bpara\s*hua\b",
            r"\bpari\s*hai\b", r"\bparay\s*hain\b", r"\bpare\s*hain\b", r"\bparha\s*hai\b",
            r"\bparhi\s*hai\b", r"\bdher\b", r"\boverflow\b", r"\bbikhra\b", r"\bgir\s*raha\b",
            r"\bbadbu\b", r"\bbadboo\b", r"\bbad-?boo\b", r"\bmachar\b", r"\bstolen\b", r"\bmissing\b",
            r"\bdisinfect\b", r"\baccumulation\b", r"\bjama\b",
            r"\brefusing\s*to\s*enter\b", r"\bclogging\b", r"\brotting\s*odor\b",
            r"\bclean\s*bin\b", r"\bgari\s*nahi\s*aa?i\b", r"\bgaari\s*nahi\s*aa?i\b",
            r"\bdump\s*ban\s*chuka\b", r"\bkutte\s*nooch\b", r"\bsaans\s*lena\s*mushkil\b",
            r"\baag\s*laga\b", r"\bdhuwan\b", r"\btaffun\b"
        ],
        "denials": [
            r"\bkachra\s+(?:bilkul\s+)?theek\s+se\s+uth\s+gaya\b",
            r"\bkachray\s+ka\s+masla\s+nahi\b"
        ]
    },
    "sbca": {
        "assets": [
            r"\bbuilding\b", r"\bimarat\b", r"\bfloor\b", r"\bfloors\b", r"\bchajja\b",
            r"\bbalcony\b", r"\bpillar\b", r"\bpillars\b", r"\bwall\b", r"\bdeewar\b",
            r"\bfoundation\b", r"\bfoundations\b", r"\bbasement\b", r"\bexcavation\b",
            r"\bplot\b", r"\bdukan\b", r"\bcommercial\b", r"\bcos\b",
            r"\bcompulsory\s*open\s*space\b", r"\bsbca\b", r"\bconstruction\b",
            r"\bpremises\b", r"\bbungalow\b", r"\bopen\s*space\b", r"\bcos\s*par\b",
            r"\bunsafe\s*building\b"
        ],
        "defects": [
            r"\billegal\b", r"\bgheir\s*qanooni\b", r"\bbina\s*permit\b", r"\bbina\s*noc\b",
            r"\bextra\s*floor\b", r"\bcrack\b", r"\bcracks\b", r"\bdarar\b", r"\bdaraar\b",
            r"\bcollapse\b", r"\bgirne\s*ka\s*khatra\b", r"\bbowing\b", r"\bdilapidated\b",
            r"\bwithout\s*shoring\b", r"\bseal\s*shuda\b", r"\bcode\s*violation\b",
            r"\bviolation\b", r"\bevacuation\b", r"\baccess\s*block\b",
            r"\bstop-work\b", r"\bseal\s*the\s*premises\b", r"\bschool\b", r"\bhospital\b",
            r"\bkhasta\s*haal\b", r"\bgirne\s*wali\b", r"\bsealing\s*order\b",
            r"\bdobara\s*illegal\s*kaam\b", r"\bdemolition\s*vibration\b",
            r"\bkhatarnak\s*dara?ar\b", r"\bunsafe\b"
        ],
        "denials": [
            r"\bbuilding\s+theek\s+hai\b",
            r"\billegal\s+kaam\s+nahi\b"
        ]
    }
}

# Addressee Patterns
RECIPIENT_PATTERNS = [
    (r"(?i)\bk-?electric\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "kelectric"),
    (r"(?i)\bkmc\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "kmc"),
    (r"(?i)\b(?:kw&?sc|water\s*board)\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "kwsc"),
    (r"(?i)\bssgc\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "ssgc"),
    (r"(?i)\bsswmb\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "sswmb"),
    (r"(?i)\bsbca\s*(?:walon|staff|team|ko)?\s*(?:bhi\s*)?(?:bataya|kaha|letter|complaint|ittila)\b", "sbca"),
    (r"(?i)\bletter\s+likha\s+tha\b", "any"),
]

# Pure Consequence Patterns (Symptom resulting from a root defect, not an independent actionable fault)
CONSEQUENCE_INDICATORS = [
    r"(?i)\bjis\s*(?:ki\s*)?wajah\s*se\b",
    r"(?i)\bus\s*(?:ki\s*)?wajah\s*se\b",
    r"(?i)\bis\s*liye\b",
    r"(?i)\bis\s*wajah\s*se\b",
    r"(?i)\bhone\s*se\b",
    r"(?i)\bpedestrian\s*access\s*block\b",
]

# Spatial Proximity Patterns
SPATIAL_PROXIMITY_PATTERNS = [
    r"(?i)\bpole\s*ke\s*paas\s*kachra\b",
    r"(?i)\bkhambay?\s*ke\s*paas\s*kachra\b",
]

# Vague / Out-of-scope Patterns
VAGUE_PATTERNS = [
    r"(?i)\bajeeb\s*masla\s*hai\b",
    r"(?i)\bkoi\s*dekh\s*le\b",
    r"(?i)\byahan\s*koi\s*masla\s*hai\b",
    r"(?i)\bbohot\s*masla\s*hai\b",
    r"(?i)\bhalaat\s*bohot\s*kharab\b",
]

OUT_OF_SCOPE_PATTERNS = [
    r"(?i)\bpadosi\s*ghar\s*ke\s*andar\b",
    r"(?i)\bghar\s*ke\s*andar\s*mujhe\s*pareshan\b",
    r"(?i)\bfamily\s*dispute\b",
    r"(?i)\bshauhar\s*biwi\b",
]

# Location completeness indicators (Karachi specific)
LOCATION_INDICATORS = [
    r"(?i)\b(gali\s*(?:number|no)?\s*\d+|block\s*\d+|sector\s*\d+|phase\s*\d+|street\s*\d+)\b",
    r"(?i)\b(clifton|saddar|nazimabad|korangi|baldia|jauhar|gulshan|north\s*karachi|site|lyari|malir|fb\s*area|liaquatabad)\b",
    r"(?i)\b(chowrangi|chowk|road\s*number|market|bridge|mor|stop|plaza)\b",
]


@dataclass
class IssueCandidate:
    """An individual candidate issue identified within a complaint."""
    span_id: str
    span_start: int
    span_end: int
    span_text: str
    normalized_text: str
    asset: str
    defect_evidence: List[str]
    is_actionable: bool
    negation_scope: bool
    mention_type: str  # "actionable_defect", "consequence", "recipient_mention", "spatial_landmark", "negated_mention", "vague_complaint", "out_of_scope"
    location_evidence: Optional[str] = None
    department: Optional[str] = None
    confidence: float = 0.0
    reason_codes: List[str] = field(default_factory=list)


@dataclass
class RelationEdge:
    """Directed or undirected relational edge between issues or complaint scope."""
    source_id: str
    target_id: str
    relation_type: str  # SINGLE, CAUSES_CONTEXT_ONLY, INDEPENDENT, SAME_INCIDENT_DIFFERENT_REPAIRS, NEGATED, etc.
    description: str


@dataclass
class ComplaintAnalysisResult:
    """Full issue-centric analysis result for an incoming complaint."""
    complaint_id: str
    sanitized_text: str
    issue_candidates: List[IssueCandidate]
    edges: List[RelationEdge]
    proposed_departments: List[str]
    needs_review: bool
    review_reason: Optional[str]
    missing_public_location: bool
    relation_summary: str
    reason_trace: List[str]


class RelationAwareComplaintAnalyzer:
    """Production-grade relation-aware civic complaint analyzer."""

    @staticmethod
    def normalize_text(text: str) -> str:
        """Lightweight phonetic normalizer for Roman Urdu without losing spans."""
        t = (text or "").lower()
        t = re.sub(r"\bsadak\b", "sarak", t)
        t = re.sub(r"\b(nhi|nai|naheen)\b", "nahi", t)
        t = re.sub(r"\b(boht|bht|bohat|bhat)\b", "bohot", t)
        t = re.sub(r"\b(choolha|chula)\b", "chulha", t)
        t = re.sub(r"\b(gadda|gadha)\b", "gaddha", t)
        t = re.sub(r"\b(khrab|xrab)\b", "kharab", t)
        t = re.sub(r"\b(hy)\b", "hai", t)
        t = re.sub(r"\b(rhi|rhin)\b", "rahi", t)
        t = re.sub(r"\b(rha|rhe|rhay)\b", "rahe", t)
        t = re.sub(r"\b(zada|zyadh)\b", "zyada", t)
        t = re.sub(r"\b(hoi\s*v|hoi\s*hai)\b", "hui hai", t)
        t = re.sub(r"\bkrdo\b", "karo", t)
        t = re.sub(r"\b(badbu|bad-?boo)\b", "badboo", t)
        return t

    @classmethod
    def segment_spans(cls, text: str) -> List[Tuple[int, int, str]]:
        """Extract clause spans while preserving exact start/end offsets in original text."""
        raw = text.strip()
        if not raw:
            return []

        splitter_regex = re.compile(
            r"(?:,\s*(?:aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|doosra\s+masla|doosri\s+taraf)\b|"
            r"\b(?:aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|doosra\s+masla|doosri\s+taraf|aur\s+saath\s+wali)\b|"
            r"(?<!\w[A-Za-z])\.\s+|;\s*)"
        )

        spans: List[Tuple[int, int, str]] = []
        last_end = 0

        for match in splitter_regex.finditer(raw):
            start, end = match.span()
            if start > last_end:
                chunk = raw[last_end:start].strip()
                if chunk:
                    spans.append((last_end, start, raw[last_end:start]))
            last_end = end

        if last_end < len(raw):
            chunk = raw[last_end:].strip()
            if chunk:
                spans.append((last_end, len(raw), raw[last_end:]))

        refined_spans: List[Tuple[int, int, str]] = []
        for s_start, s_end, s_text in spans:
            aur_matches = list(re.finditer(r"\s+aur\s+", s_text))
            if not aur_matches:
                refined_spans.append((s_start, s_end, s_text))
                continue

            sub_last = 0
            sub_chunks = []
            for am in aur_matches:
                a_start, a_end = am.span()
                left_part = s_text[sub_last:a_start]
                right_part = s_text[a_end:]

                left_depts = cls._quick_dept_check(left_part)
                right_depts = cls._quick_dept_check(right_part)

                if left_depts and right_depts and (left_depts != right_depts):
                    sub_chunks.append((s_start + sub_last, s_start + a_start, left_part))
                    sub_last = a_end

            if sub_last < len(s_text):
                sub_chunks.append((s_start + sub_last, s_end, s_text[sub_last:]))

            if sub_chunks:
                refined_spans.extend(sub_chunks)
            else:
                refined_spans.append((s_start, s_end, s_text))

        return refined_spans if refined_spans else [(0, len(raw), raw)]

    @classmethod
    def _quick_dept_check(cls, clause: str) -> Set[str]:
        """Quickly check which department assets appear in a clause."""
        found = set()
        c_norm = cls.normalize_text(clause)
        if re.search(r"\b(gas|sui\s*gas|natural\s*gas)\b", c_norm):
            found.add("ssgc")
        for dept, lex in DOMAIN_EVIDENCE.items():
            if dept == "kwsc" and re.search(r"\b(gas|sui\s*gas)\b", c_norm) and not re.search(r"\b(pani|water|sewer|gutter)\b", c_norm):
                continue
            for pat in lex["assets"]:
                if re.search(pat, c_norm):
                    found.add(dept)
                    break
        return found

    @classmethod
    def analyze(cls, text: str, complaint_id: str = "comp_test") -> ComplaintAnalysisResult:
        """Perform end-to-end relation-aware analysis on a Roman Urdu complaint."""
        sanitized = (text or "").strip()
        norm_full = cls.normalize_text(sanitized)
        reason_trace: List[str] = []

        # 1. Out of Scope Check (Private dispute)
        for pat in OUT_OF_SCOPE_PATTERNS:
            if re.search(pat, norm_full):
                candidate = IssueCandidate(
                    span_id="iss_0",
                    span_start=0,
                    span_end=len(sanitized),
                    span_text=sanitized,
                    normalized_text=norm_full,
                    asset="private_dwelling",
                    defect_evidence=["padosi pareshan kar raha hai"],
                    is_actionable=False,
                    negation_scope=False,
                    mention_type="out_of_scope",
                    reason_codes=["OUT_OF_SCOPE_PRIVATE_DISPUTE"],
                )
                return ComplaintAnalysisResult(
                    complaint_id=complaint_id,
                    sanitized_text=sanitized,
                    issue_candidates=[candidate],
                    edges=[RelationEdge("iss_0", "iss_0", "UNCERTAIN", "Out of scope private complaint")],
                    proposed_departments=[],
                    needs_review=True,
                    review_reason="OUT_OF_SCOPE",
                    missing_public_location=False,
                    relation_summary="UNCERTAIN",
                    reason_trace=["Citizen complaint concerns private dispute outside civic municipal jurisdiction"],
                )

        # 2. Vague / Unroutable Check
        is_vague = any(re.search(pat, norm_full) for pat in VAGUE_PATTERNS)
        has_any_asset = any(
            re.search(pat, norm_full)
            for dept in DOMAIN_EVIDENCE.values()
            for pat in dept["assets"]
        )
        if is_vague and not has_any_asset:
            candidate = IssueCandidate(
                span_id="iss_0",
                span_start=0,
                span_end=len(sanitized),
                span_text=sanitized,
                normalized_text=norm_full,
                asset="none",
                defect_evidence=[],
                is_actionable=False,
                negation_scope=False,
                mention_type="vague_complaint",
                reason_codes=["VAGUE_NO_DEFECT_SPECIFIED"],
            )
            return ComplaintAnalysisResult(
                complaint_id=complaint_id,
                sanitized_text=sanitized,
                issue_candidates=[candidate],
                edges=[RelationEdge("iss_0", "iss_0", "UNCERTAIN", "Vague complaint without knowable defect")],
                proposed_departments=[],
                needs_review=True,
                review_reason="UNCERTAIN_DEFECT",
                missing_public_location=True,
                relation_summary="UNCERTAIN",
                reason_trace=["Input lacks actionable defect predicate or asset mention"],
            )

        # 3. Check for Shared Incident with Multiple Distinct Repairs
        is_shared_incident = bool(
            (re.search(r"\bpipe\s*(?:bhi\s*)?replace\b", norm_full) and re.search(r"\broad\s*(?:bhi\s*)?(?:dubara\s*)?banao\b", norm_full))
            or re.search(r"\bdono\s*pipe\s*aur\s*road\s*repair\b", norm_full)
        )

        # 4. Check for Spatial Proximity Only (e.g. pole ke paas kachra para hai, pole kharab nahi)
        is_spatial_proximity_only = bool(
            re.search(r"\bpole\s*ke\s*paas\s*kachra\b", norm_full)
            and (re.search(r"\bpole\s*kharab\s*nahi\b", norm_full) or not re.search(r"\b(spark|taar|wire|current|blast)\b", norm_full))
        )

        # 5. Check for Recipient / Addressee Only
        recipient_dept = None
        for pat, d_target in RECIPIENT_PATTERNS:
            if re.search(pat, norm_full):
                recipient_dept = d_target
                break
        has_recipient_preamble = recipient_dept is not None and bool(
            re.search(r"\blekin\s+hamari\s+complaint\b", norm_full)
            or re.search(r"\bpar\s+asal\s+issue\b", norm_full)
            or re.search(r"\bko\s+bhi\s+bataya\s+tha\b", norm_full)
            or re.search(r"\bko\s+letter\s+likha\s+tha\b", norm_full)
        )

        # 6. Check for Explicit Negation in Text
        negated_depts = set()
        for dept, lex in DOMAIN_EVIDENCE.items():
            if any(re.search(den, norm_full) for den in lex["denials"]):
                negated_depts.add(dept)

        # 7. Check for Causal Consequence Indicators
        has_causal_consequence = any(re.search(c_pat, norm_full) for c_pat in CONSEQUENCE_INDICATORS)

        # Check if electrical outage causes private water motor symptom
        has_electric_evidence = any(re.search(pat, norm_full) for pat in DOMAIN_EVIDENCE["kelectric"]["assets"])
        has_water_motor_symptom = has_electric_evidence and bool(re.search(r"\b(motor\s*band|motor\s*nahi\s*chal)\b", norm_full))

        # 8. Segment into spans and classify issues
        span_tuples = cls.segment_spans(sanitized)
        candidates: List[IssueCandidate] = []

        for idx, (s_start, s_end, s_raw) in enumerate(span_tuples):
            s_norm = cls.normalize_text(s_raw)

            for dept, lex in DOMAIN_EVIDENCE.items():
                # Negation override
                if dept in negated_depts:
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset=dept,
                        defect_evidence=["explicitly_negated"],
                        is_actionable=False,
                        negation_scope=True,
                        mention_type="negated_mention",
                        department=dept,
                        reason_codes=[f"EXPLICIT_DENIAL_{dept.upper()}"]
                    ))
                    continue

                # Recipient override
                if has_recipient_preamble and recipient_dept == dept:
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset=dept,
                        defect_evidence=["recipient_mention_only"],
                        is_actionable=False,
                        negation_scope=False,
                        mention_type="recipient_mention",
                        department=dept,
                        reason_codes=[f"RECIPIENT_ONLY_{dept.upper()}"]
                    ))
                    continue

                # Spatial landmark override
                if is_spatial_proximity_only and dept == "kelectric":
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset="pole",
                        defect_evidence=["spatial_landmark_only"],
                        is_actionable=False,
                        negation_scope=False,
                        mention_type="spatial_landmark",
                        department=dept,
                        reason_codes=["SPATIAL_LANDMARK_WITHOUT_DEFECT"]
                    ))
                    continue

                # Consequence suppression: water motor symptom from power outage
                if dept == "kwsc" and has_water_motor_symptom and not re.search(r"\b(sewer|gutter|sookhi|supply\s*band)\b", s_norm):
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset="water_motor",
                        defect_evidence=["consequence_of_power_outage"],
                        is_actionable=False,
                        negation_scope=False,
                        mention_type="consequence",
                        department=dept,
                        reason_codes=["CONSEQUENCE_WATER_MOTOR_SYMPTOM"]
                    ))
                    continue

                # Road surface water ponding consequence without road damage
                if dept == "kmc" and any(re.search(den, norm_full) for den in DOMAIN_EVIDENCE["kmc"]["denials"]):
                    # Only suppress if this span does NOT contain other municipal assets like drainage nala or street lights
                    if not re.search(r"\b(drainage\s*nala|drainage|street\s*lights?|naali|naala|nullah)\b", s_norm):
                        continue

                # Pedestrian access blocked by construction without footpath broken
                if dept == "kmc" and re.search(r"\bfootpath\s+kharab\s+(?:hua\s+)?na?h?i\b", norm_full):
                    if not re.search(r"\b(drainage\s*nala|drainage|street\s*lights?|naali|naala|nullah)\b", s_norm):
                        continue

                # Spatial preamble for KMC: "footpath aur road par [Location] ... [other dept issue]"
                if dept == "kmc" and re.search(r"^(?:footpath\s+aur\s+road\s+par|sarak\s+par|road\s+par)\b", s_norm):
                    d_hits = [pat for pat in lex["defects"] if re.search(pat, s_norm)]
                    if not d_hits:
                        continue

                # Location: "water pump chowrangi" is location, not kwsc asset
                if dept == "kwsc" and re.search(r"\bwater\s*pump\s*chowrangi\b", s_norm) and not re.search(r"\b(pani|paani|sewer|gutter|supply|manhole|leak|leakage|burst|choke)\b", s_norm):
                    continue

                # Gas pipe check for KWSC: gas line is not KWSC water line
                if dept == "kwsc" and re.search(r"\b(gas|sui\s*gas)\b", s_norm) and not re.search(r"\b(pani|water|sewer|gutter)\b", s_norm):
                    continue

                # SSGC must have gas tokens
                if dept == "ssgc" and not re.search(r"\b(gas|chulha|sui\s*gas|natural\s*gas)\b", norm_full):
                    continue

                # If taar/wire is present in K-Electric, don't confuse KMC road toot with taar toot
                if dept == "kmc" and re.search(r"\b(taar|wire|bijli)\b", s_norm) and not re.search(r"\b(sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b", s_norm):
                    continue

                # Check asset and defect match in this span
                asset_hits = [pat for pat in lex["assets"] if re.search(pat, s_norm)]
                defect_hits = [pat for pat in lex["defects"] if re.search(pat, s_norm)]

                # Special: In SSGC, if gas is mentioned in full text and defect is present
                if dept == "ssgc" and re.search(r"\b(?:gas|natural\s*gas)\b", s_norm):
                    if not defect_hits:
                        defect_hits = [pat for pat in lex["defects"] if re.search(pat, norm_full)]

                if asset_hits and defect_hits:
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset=asset_hits[0],
                        defect_evidence=defect_hits,
                        is_actionable=True,
                        negation_scope=False,
                        mention_type="actionable_defect",
                        department=dept,
                        confidence=0.95,
                        reason_codes=[f"AFFIRMATIVE_DEFECT_{dept.upper()}"]
                    ))
                    reason_trace.append(f"Actionable defect for {dept.upper()} in span '{s_raw.strip()}'")

        # 9. Extract actionable departments
        actionable_depts = sorted(list(set(
            c.department for c in candidates
            if c.is_actionable and c.department is not None
        )))

        # Fallback to full text if spans missed an actionable defect
        if not actionable_depts:
            for dept, lex in DOMAIN_EVIDENCE.items():
                if dept in negated_depts:
                    continue
                if has_recipient_preamble and recipient_dept == dept:
                    continue
                if is_spatial_proximity_only and dept == "kelectric":
                    continue
                if dept == "kwsc" and has_water_motor_symptom and not re.search(r"\b(sewer|gutter|sookhi|supply\s*band)\b", norm_full):
                    continue
                if dept == "kmc" and any(re.search(den, norm_full) for den in DOMAIN_EVIDENCE["kmc"]["denials"]):
                    if not re.search(r"\b(drainage\s*nala|drainage|street\s*lights?|naali|naala|nullah)\b", norm_full):
                        continue
                if dept == "kmc" and re.search(r"\b(wire|taar)\b", norm_full) and not re.search(r"\b(gaddha|khadda|toot|dhans|pothole|sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b", norm_full):
                    continue
                if dept == "kwsc" and re.search(r"\bwater\s*pump\s*chowrangi\b", norm_full) and not re.search(r"\b(pani|paani|sewer|gutter|supply|manhole|leak|leakage|burst|choke)\b", norm_full):
                    continue
                if dept == "ssgc" and not re.search(r"\b(gas|chulha|sui\s*gas|natural\s*gas)\b", norm_full):
                    continue

                a_hits = [pat for pat in lex["assets"] if re.search(pat, norm_full)]
                d_hits = [pat for pat in lex["defects"] if re.search(pat, norm_full)]
                if a_hits and d_hits:
                    actionable_depts.append(dept)
                    candidates.append(IssueCandidate(
                        span_id=f"iss_fb_{dept}",
                        span_start=0,
                        span_end=len(sanitized),
                        span_text=sanitized,
                        normalized_text=norm_full,
                        asset=a_hits[0],
                        defect_evidence=d_hits,
                        is_actionable=True,
                        negation_scope=False,
                        mention_type="actionable_defect",
                        department=dept,
                        confidence=0.90,
                        reason_codes=[f"FULL_TEXT_AFFIRMATIVE_DEFECT_{dept.upper()}"]
                    ))

        actionable_depts = sorted(list(set(actionable_depts)))

        # 10. Relational Summary and Edge Building
        edges: List[RelationEdge] = []
        if is_shared_incident and len(actionable_depts) >= 2:
            relation_summary = "SAME_INCIDENT_DIFFERENT_REPAIRS"
            for i in range(len(actionable_depts) - 1):
                edges.append(RelationEdge(
                    actionable_depts[i],
                    actionable_depts[i+1],
                    "SAME_INCIDENT_DIFFERENT_REPAIRS",
                    "Shared physical incident requires separate distinct repairs"
                ))
        elif len(actionable_depts) > 1:
            relation_summary = "INDEPENDENT"
            for i in range(len(actionable_depts) - 1):
                edges.append(RelationEdge(
                    actionable_depts[i],
                    actionable_depts[i+1],
                    "INDEPENDENT",
                    "Independent civic defects requiring separate municipal teams"
                ))
        elif len(actionable_depts) == 1:
            if is_spatial_proximity_only:
                relation_summary = "SPATIAL_PROXIMITY_ONLY"
                edges.append(RelationEdge(
                    actionable_depts[0], "spatial", "SPATIAL_PROXIMITY_ONLY",
                    "Asset mentioned solely as landmark"
                ))
            elif has_recipient_preamble:
                relation_summary = "RECIPIENT_ONLY"
                edges.append(RelationEdge(
                    actionable_depts[0], "recipient", "RECIPIENT_ONLY",
                    "Other department mentioned as recipient"
                ))
            elif has_causal_consequence:
                relation_summary = "CAUSES_CONTEXT_ONLY"
                edges.append(RelationEdge(
                    actionable_depts[0], "consequence", "CAUSES_CONTEXT_ONLY",
                    "Root civic cause with non-actionable symptom"
                ))
            elif negated_depts:
                relation_summary = "NEGATED"
                edges.append(RelationEdge(
                    actionable_depts[0], "negated", "NEGATED",
                    "Alternative department explicitly negated"
                ))
            else:
                relation_summary = "SINGLE"
                edges.append(RelationEdge(
                    actionable_depts[0], actionable_depts[0], "SINGLE",
                    "Single distinct municipal defect"
                ))
        else:
            relation_summary = "UNCERTAIN"
            edges.append(RelationEdge(
                "none", "none", "UNCERTAIN",
                "No actionable civic defect identified"
            ))

        # 11. Location Completeness
        has_specific_location = any(re.search(pat, norm_full) for pat in LOCATION_INDICATORS)
        missing_location = (not has_specific_location) and (len(actionable_depts) > 0)
        if missing_location:
            reason_trace.append("Complaint contains actionable defect but lacks specific public street/landmark details (INCOMPLETE_PUBLIC_LOCATION)")

        # 12. Review Gate & Secondary Issue Completeness Check
        needs_review = (len(actionable_depts) == 0)
        review_reason = "UNCERTAIN_DEFECT" if needs_review else None

        if len(actionable_depts) >= 1 and len(span_tuples) > 1:
            for s_idx, (st_start, st_end, st_raw) in enumerate(span_tuples):
                st_norm = cls.normalize_text(st_raw)
                span_grounded = any(
                    c.span_id.startswith(f"iss_{s_idx}_") and c.is_actionable and c.department in actionable_depts
                    for c in candidates
                )
                if not span_grounded:
                    is_benign = any(
                        c.span_id.startswith(f"iss_{s_idx}_") and c.mention_type in ["consequence", "recipient_mention", "spatial_landmark", "negated_mention"]
                        for c in candidates
                    )
                    if not is_benign:
                        has_grievance_token = bool(re.search(
                            r"\b(masla|kharab|problem|issue|choke|dara?ar|khatra|khatarnak|dher|kachra|dump|illegal|unsafe|band|toot|current|shikayat|pareshan|dhuwan|aag|gari\s*nahi)\b",
                            st_norm
                        ))
                        if has_grievance_token:
                            needs_review = True
                            review_reason = "POSSIBLE_UNROUTED_SECONDARY_ISSUE"
                            reason_trace.append("Secondary clause contains unrouted civic defect indicators; flagged for human triage (POSSIBLE_UNROUTED_SECONDARY_ISSUE)")
                            break

        return ComplaintAnalysisResult(
            complaint_id=complaint_id,
            sanitized_text=sanitized,
            issue_candidates=candidates,
            edges=edges,
            proposed_departments=actionable_depts,
            needs_review=needs_review,
            review_reason=review_reason,
            missing_public_location=missing_location,
            relation_summary=relation_summary,
            reason_trace=reason_trace,
        )
