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
            r"\bbarish\s*ka\s*paani\b", r"\bflyover\b", r"\bdivider\b",
            r"\bpedestrian\s*bridge\b", r"\bfootbridge\b", r"\bbarsati\s*nala\b", r"\bbarasati\s*nala\b"
        ],
        "defects": [
            r"\btoot\b", r"\btooti\b", r"\btoota\b", r"\bgaddha\b", r"\bgaddhay\b",
            r"\bgaddhe\b", r"\bgaddhon\b", r"\bkhadda\b", r"\bkhadday\b",
            r"\bkhaddhon\b", r"\bpothole\b", r"\bpotholes\b", r"\bdhans\b",
            r"\bkharab\b", r"\bdamage\b", r"\bdamaged\b", r"\brepair\b",
            r"\brebuild\b", r"\bbana(?:o|ein)\b", r"\bandhera\b",
            r"\bencroachment\b", r"\bqabza\b", r"\bpatharay\b", r"\bgaariyan\s*lagti\b", r"\bgehra\b",
            r"\bdarya\b", r"\bubal\s*kar\s*road\b", r"\bandhera\s*rehta\b",
            r"\bbattiyan\s*kharab\b", r"\bband\s*pari\b", r"\bband\s*hain\b",
            r"\bpaani\s*khara\b", r"\bdo\s*foot\s*paani\b",
            r"\bdrainage\s*nala\s*kaam\s*nahi\s*kar\s*raha\b",
            r"\bkaam\s*nahi\s*kar\s*raha\b", r"\bdhakkan\s*(?:gayab|chori|missing)?\b",
            r"\bexpansion\s*joint\b", r"\bspeed\s*breaker\b", r"\bdivider\b", r"\bblock\s*para\b",
            r"\bbarsati\s*nala\b", r"\bnala\s*(?:choke|kachray)\b", r"\bsariya\s*nikal\b",
            r"\bbarish\b[^.!?;]{0,100}\bpani\s*khara\b"
        ],
        "denials": [
            r"\bsarak\s+(?:bilkul\s+)?theek\b",
            r"\broad\s+(?:toot|tooti)\s+(?:hui\s+)?na?h?i\b",
            r"\bsarak\s+(?:toot|tooti)\s+(?:hui\s+)?na?h?i\b",
            r"\bfootpath\s+kharab\s+(?:hua\s+)?na?h?i\b",
            r"\b(?:road|sadak|sarak|street|gali|pothole|street\s*lights?)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b",
            r"\broad\s*(?:theek|sahi)\s*hai\b",
            r"\b(?:sarak|road)\s+(?:ka\s+masla\s+)?(?:theek|hal|solve)\s+ho\s+gay[ai]\b",
            r"\broad\s+repair\s+ho\s+chuki\s+hai\b"
        ]
    },
    "kwsc": {
        "assets": [
            r"\bpani\b", r"\bpaani\b", r"\bwater\b", r"\bsewer\b", r"\bsewerage\b",
            r"\bgutter\b", r"\bmanhole\b", r"\bwater\s*main\b", r"\bwater\s*(?:pipe|pipeline|supply)\b",
            r"\bsarkari\s*pani\b", r"\bpublic\s*(?:water|pani|pipe|pipeline)\b",
            r"\bpipe\b", r"\bpipeline\b", r"\bwater\s*board\b", r"\bkwsc\b", r"\bkw&sc\b",
            r"\bdrinking\s*water\b", r"\btap\b", r"\bsewage\b", r"\btanki\b", r"\btankee\b",
            r"\bsewer\s*line\b", r"\bwater\s*supply\s*line\b", r"\bwater\s*pipeline\b",
            r"\bdrinking\s*water\s*line\b", r"\bseptic\s*tank\b"
        ],
        "defects": [
            r"\bleak\b", r"\bleakage\b", r"\bphat\b", r"\bphati\b", r"\bphatne\b",
            r"\bburst\b", r"\boverflow\b", r"\bubalta\b", r"\bubal\b", r"\btalaab\b",
            r"\bcover\s*missing\b", r"\blid\b", r"\bsookhi\b", r"\bpressure\s*(?:intihai|bohot|bht|nihayat|bohat)?\s*kam\b",
            r"\bpressure\s*(?:na\s*hone|zero)\b", r"\bpani\s*(?:bilkul\s*|bhi\s*)?na?h?i\b", r"\bpani\s*nahi\s*aa\s*raha\b", r"\bwater\s*nahi\s*aa\s*raha\b",
            r"\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b", r"\bshortage\b", r"\bchori\b", r"\bband\s*hai\b",
            r"\breplace\s*lid\b", r"\bcovers?\s*missing\b", r"\bcontaminated\b", r"\btoxic\s*smell\b",
            r"\btanki\s*nahi\s*bhar\b", r"\bsewer\s*line\s*choke\b", r"\bchoke\b",
            r"\bsirf\s*hawa\s*aa\s*rahi\b", r"\bganda\s*pani\b", r"\bsewage\s*mix\b",
            r"\bgutter\s+(?:ka\s+)?(?:ganda\s+)?pani\s+beh\s+raha\b",
            r"\bdhakkan\s*(?:gayab|chori|missing)?\b", r"\bmanhole\s*ka\s*dhakkan\b",
            r"\bganda\s*(?:black\s*|kala\s*)?pa?ni\b",
            r"\b(?:sewer|sewage)\s*(?:ka\s*.*?)?mix\b",
            r"\bmix\s*(?:ho\s*kar\s*)?aa\s*raha\b",
            r"\bbadboo(?:dar)?\s*pa?ni\b",
            r"\bbadboo\s*phail\b",
            r"\bsewerage\s*line\s*collapse\b",
            r"\bline\s*collapse\b",
            r"\bback\s*maar\b",
            r"\bback\s*flow\b"
        ],
        "denials": [
            r"\bye\s+pani\s+ka\s+masla\s+na?h?i\b",
            r"\bpani\s+ka\s+koi\s+masla\s+nahi\b",
            r"\bwater\s+ka\s+masla\s+nahi\b",
            r"\bpani\s+ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya\b",
            r"\b(?:pani|water|sewer|sewage|gut?tar)\s*(?:ka|ki|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b",
            r"\bpehle\s*(?:pani|water)\s*(?:ka\s+)?(?:masla|issue)\s*tha\s*lekin\s*ab\s*(?:theek|hal)\b",
            r"\bpani\s*(?:ka\s*)?(?:koi\s*)?issue\s*nahi\b",
            r"\bpani\s*theek\s*hai\b",
            r"\bpani\s*(?:theek|saaf|sahi)\s*hai\b"
        ]
    },
    "kelectric": {
        "assets": [
            r"\bbijli\b", r"\blight\b", r"\bcurrent\b", r"\bfeeder\b", r"\btransformer\b",
            r"\btaar\b", r"\bwire\b", r"\bpole\b", r"\bkhamba\b", r"\bvoltage\b", r"\bpower\b",
            r"\bk-?electric\b", r"\b11kv\b", r"\bjumper\b", r"\bcutout\b", r"\bfuse\b",
            r"\belectricity\s*pole\b", r"\bphase\b", r"\bphases\b", r"\bload\s*shedding\b"
        ],
        "defects": [
            r"\bload\s*shedding\b", r"\bspark\b", r"\bsparking\b", r"\bblast\b",
            r"\bshort\s*circuit\b", r"\btrip\b", r"\blatak\b", r"\bhanging\b",
            r"\bjhatkay\b", r"\bbijli\s*nahi\s*aa\s*rahi\b", r"\blight\s*nahi\s*aa\s*rahi\b",
            r"\bbijli\s*nahi\b", r"\blight\s*nahi\b", r"\bcurrent\s*nahi\s*(?:aa\s*raha|hai)?\b",
            r"\blight\s*gayi\b", r"\blight\s*chali\s*gayi\b", r"\bbijli\s*chali\s*gayi\b",
            r"\bbijli\s*gayi\b", r"\blight\s*band\b", r"\bbijli\s*band\b", r"\bbijli\s*gayab\b", r"\blight\s*gayab\b",
            r"\bfeeder\s*band\b", r"\bfeeder\s*fault\b",
            r"\bfeeder\s*down\b", r"\bbar\s*bar\s*(?:light|bijli)?\s*ja\s*ra?h?i\b",
            r"\btransformer\s*(?:ka\s*)?(?:blast|jal\s*gaya|phat\s*gaya|kharab|fault)\b",
            r"\bfeeder\s*(?:ka\s*)?(?:fault|band)\b",
            r"\bpower\s*outage\b", r"\bpower\s*cut\b", r"\bband\s*hai\b", r"\bpower\s*supply\s*cut\s*off\b",
            r"\bzero\s*voltage\b", r"\blow\s*voltage\b", r"\bsingle\s*phase\b", r"\bburnt\b", r"\bsnapping\b",
            r"\bphase\s+\d+\s+(?:gayab|band|missing|down|trip|fault)\b",
            r"\bcorroded\b", r"\bmight\s*collapse\b", r"\b(?:2|do)?\s*phase\s*gayab\b",
            r"\bdim\s*light\b", r"\bvoltage\s*(?:drop|fluctuation|low|kam|up\s*down|bohat\s*zyada\s*low|nahi\s*aa\s*raha|nahi\s*hai|ka\s*masla)\b",
            r"\bfeeder\s*trip\b", r"\btoot\s*(?:kar\s*)?(?:zameen\s*par\s*)?(?:gir|giri)\b",
            r"\b(?:pole|khamb[ae]|transformer|taar|wire)\s+(?:gir|tedha|jhuk|tilted|girne)\b",
            r"\bgir\s*raha\b",
            r"\bnangi\s*taar\b", r"\bappliances\s*jalne\b", r"\bbijli\s*ki\s*wajah\s*se\b", r"\blight\s*ki\s*wajah\s*se\b"
        ],
        "denials": [
            r"\bpole\s+kharab\s+nahi\b",
            r"\bbijli\s+ka\s+masla\s+nahi\b",
            r"\blight\s+theek\s+hai\b",
            r"\bbijli\s+ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya\b",
            r"\b(?:bijli|light|current|electricity|voltage|load\s*shedding|transformer|wire|taar)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b",
            r"\bbijli\s*(?:theek|aa\s*rahi)\s*hai\b"
        ]
    },
    "ssgc": {
        "assets": [
            r"\bgas\b", r"\bsui\s*gas\b", r"\bgas\s*pipe\b", r"\bgas\s*pipeline\b",
            r"\bgas\s*line\b", r"\bgas\s*mains\b", r"\bgas\s*meter\b", r"\bchulha\b",
            r"\bssgc\b", r"\bregulator\b", r"\bdiaphragm\b", r"\bnatural\s*gas\b", r"\bflame\b"
        ],
        "defects": [
            r"\bboo\b", r"\bsmell\b", r"\bhiss\b", r"\bleak\b", r"\bleakage\b",
            r"\bphat\b", r"\bphati\b", r"\bphatne\b",
            r"\bgas\s*(?:bilkul\s*|bhi\s*)?na?h?i\b", r"\bgas\s*band\b", r"\bgas\s*gayab\b",
            r"\bpressure\b", r"\bchulha\s*nahi\s*jal\b", r"\bflame\s*nahi\b",
            r"\baag\s*lagne\b", r"\bdhamaka\b", r"\bburst\b", r"\bkam\s*aa\s*raha\b",
            r"\bruptured\b", r"\bwhistling\b", r"\bblowing\s*out\b", r"\bchulha\s*band\b",
            r"\bnahi\s*aa\s*rahi\b", r"\bsupply\s*(?:mukammal|bilkul|poori)?\s*band\b",
            r"\bgas\s*(?:na\s*hone|gayab)\b", r"\bkhana\s*banana\s*namumkin\b",
            r"\btez\s*boo\b", r"\bcylinder\s*lana\s*parh\b",
            r"\bescape\b", r"\bgas\s*escape\b", r"\bmachis\b",
            r"\bflame\s+(?:bilkul\s+)?(?:peel[ae]y?|yellow|low|kam|weak)\b"
        ],
        "denials": [
            r"\bgas\s+ka\s+koi\s+issue\s+nahi\b",
            r"\bye\s+gas\s+ka\s+masla\s+na?h?i\b",
            r"\bgas\s+leak\s+nahi\s+hai\b",
            r"\bgas\s+theek\s+hai\b",
            r"\bgas\s+(?:theek\s+ho\s+gayi|ka\s+masla\s+(?:solve|hal|theek)\s*ho\s*gaya)\b",
            r"\b(?:gas|suigas|cylinder|pipeline)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b",
            r"\bgas\s*(?:theek|aa\s*rahi)\s*hai\b",
            r"\bgas\s+(?:ki\s+)?supply\s+(?:bilkul\s+)?(?:theek|sahi)\s+hai\b"
        ]
    },
    "sswmb": {
        "assets": [
            r"\bkachra\b", r"\bkachray\b", r"\bkura\b", r"\btrash\b", r"\bgarbage\b",
            r"\bdustbin\b", r"\bdustbins\b", r"\bbin\b", r"\bbins\b", r"\bdhabay\b",
            r"\bdead\s*animal\b", r"\bkachra\s*kundi\b", r"\bsswmb\b",
            r"\bwaste\b", r"\bdumpster\b", r"\bmurda\s*janwar\b", r"\blaash\b",
            r"\bcarcass\b", r"\billegal\s*(?:garbage\s*)?dump\b", r"\bdump\b",
            r"\bgarbage\s*dump\b", r"\bdumping\s*site\b"
        ],
        "defects": [
            r"\bnahi\s*uth(?:a|aya|ti|te)?\b", r"\bnahi\s*uthta\b",
            r"\buthta\s*nahi\b", r"\buthaya\s*nahi\b", r"\bpara\s*hai\b", r"\bpara\s*hua\b",
            r"\bpari\s*hai\b", r"\bparay\s*hain\b", r"\bpare\s*hain\b", r"\bparha\s*hai\b",
            r"\bparhi\s*hai\b", r"\bdher\b", r"\boverflow\b", r"\bbikhra\b", r"\bgir\s*raha\b",
            r"\bbadbu\b", r"\bbadboo\b", r"\bbad-?boo\b", r"\bmachar\b", r"\bstolen\b", r"\bmissing\b",
            r"\bdisinfect\b", r"\baccumulation\b", r"\bjama\b",
            r"\brefusing\s*to\s*enter\b", r"\bclogging\b", r"\brotting\s*odor\b",
            r"\bclean\s*bin\b", r"\bgari\s*nahi\s*aa?i\b", r"\bgaari\s*nahi\s*aa?i\b",
            r"\bdump\s*ban\s*chuka\b", r"\bkutte\s*nooch\b", r"\bsaans\s*lena\s*mushkil\b",
            r"\baag\s*laga\b", r"\bdhuwan\b", r"\btaffun\b", r"\bsafai\s*(?:bilkul\s*|bhi\s*)?na?h?i\b",
            r"\billegal\s+(?:(?:garbage|waste|trash)\s+)?dump(?:ing)?\b",
            r"\b(?:garbage|waste|trash)\s+dump(?:ing)?\s+(?:is\s+)?illegal\b"
        ],
        "denials": [
            r"\bkachra\s+(?:bilkul\s+)?theek\s+se\s+uth\s+gaya\b",
            r"\bkachray\s+ka\s+masla\s+nahi\b",
            r"\b(?:kachra|garbage|safai|waste|trash|kunda)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b",
            r"\bsafai\s*(?:theek|ho\s*chuki)\s*hai\b"
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
            r"\bunsafe\s*building\b", r"\b(?:chhat|chhajja|godam|warehouse|shops?|rooms?|lanter|plazas?|manzil)\b"
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
            r"\bkhatarnak\s*dara?ar\b", r"\bunsafe\b", r"\bghair\s*qanooni\b", r"\bbaghair\s+shoring\b",
            r"\bset[- ]back\s+(?:rules\s+)?violat\w*\b"
        ],
        "denials": [
            r"\bbuilding\s+theek\s+hai\b",
            r"\billegal\s+kaam\s+nahi\b",
            r"\b(?:illegal\s*construction|builder|manzila|dhamaka|demolition)\s*(?:ka|ki|ke|mein)?\s*(?:koi\s+)?(?:masla|issue|problem|kharabi)\s*na?h?i\b"
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
    r"(?i)\b(?:makan\s*malik|kiraya|rent\s*barha|ghar\s*khali|tenant|landlord|bina\s*notice\s*rent)\b",
    r"(?i)\b(?:cyber\s*crime|fraud\s*caller|atm\s*se\s*paise|paise\s*deduct|bank\s*account)\b",
    r"(?i)\b(?:traffic\s*police|challan\s*kaat|mobile\s*cheen|snatching|dacoity|wardatein)\b",
    r"(?i)\b(?:mobile|phone|wallet|bike|motorcycle|gaari|car|paise|paisa)\s+(?:ki\s+|ka\s+)?chori\b",
    r"(?i)\b(?:school\s*management|fees\s*barha|private\s*school\s*fees)\b",
    r"(?i)\b(?:padosi\s*ke\s*kuttay|kutte\s*ne\s*kaat)\b",
]

# Location completeness indicators (Karachi specific)
LOCATION_INDICATORS = [
    r"(?i)\b(gali\s*(?:number|no)?\s*\d+|block\s*\d+|sector\s*\d+|phase\s*\d+|street\s*\d+)\b",
    r"(?i)\b(clifton|saddar|nazimabad|korangi|baldia|jauhar|gulshan|north\s*karachi|site|lyari|malir|fb\s*area|liaquatabad)\b",
    r"(?i)\b(chowrangi|chowk|road\s*number|market|bridge|mor|stop|plaza)\b",
]

HISTORICAL_RESOLVED_PATTERNS = [
    r"(?i)\b(?:theek|hal|solve)\s*(?:ho\s*gay[ai]|ho\s*chuki|ho\s*chuka)\b",
    r"(?i)\bpehle\s+.*?\s+(?:tha|thi)\s+lekin\s+ab\s+theek\b",
    r"(?i)\bpehle\b[^.?!;]{0,50}\b(?:tha|thi)\b",
    r"(?i)\bpehle\s+toot\w*\s+(?:hui\s+)?thi\b",
    r"(?i)\brepair\s+ho\s+chuki\b",
    r"(?i)\bsafai\s+ho\s+chuki\b",
    r"(?i)\buth\s+gaya\b",
    r"(?i)\bmasla\s+theek\s+ho\s+gaya\b",
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
    is_historical_or_resolved: bool = False
    is_contextual_landmark: bool = False
    causal_relationship: Optional[str] = None  # "root_cause", "consequence_of_root", "independent", None
    causal_target_dept: Optional[str] = None
    decision_rationale: Optional[str] = None
    responsible_department_candidate: Optional[str] = None


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


LANDMARK_NOUNS = {
    'kelectric': 'transformer|transfamer|khamb(?:a|ay|e)|pole|feeder|electricity pole',
    'kwsc': 'water pump|water tank|water pipe|water board|pani ki tanki|sewer|gutter|manhole',
    'ssgc': 'gas meter|gas pipeline|gas pipe|gas line|gas regulator',
    'kmc': 'road|sarak|bridge|pul|flyover|footpath',
    'sswmb': 'garbage dump|dustbin|kachra kundi|dumpster',
    'sbca': 'building|imarat|construction site|plaza',
}
SPATIAL_TAIL = r'ke\s+(?:bilkul\s+)?(?:paas|qareeb|samne|samnay|barabar|peeche|peechay|kinare|kinaray|agay|ooper|neechay)(?:\s+(?:mein|me|par))?'
LANDMARK_MASKS = {dept: re.compile(rf'\b(?:(?:k-?electric|kwsc|ssgc|sswmb|sbca|kmc)\s+ke\s+)?(?:{asset})(?:\s+aur\s+(?:{asset}))*\s+{SPATIAL_TAIL}\b') for dept, asset in LANDMARK_NOUNS.items()}
COORDINATED_LANDMARK_TAIL = re.compile(rf'^(?:{"|".join(LANDMARK_NOUNS.values())})\s+{SPATIAL_TAIL}\b', re.I)


def domain_evidence_text(normalized: str, dept: str) -> str:
    """Evidence-only projection, mirrored in TypeScript; offsets stay original."""
    evidence = re.sub(
        r"\b(?:k-?electric|kmc|kw&?sc|water\s*board|ssgc|sswmb|sbca)\s+(?:(?:walon|staff|team|ko)\s+)*(?:bhi\s+)?(?:dekhein|dekhen|dekhain|sunein|sunain|bataya|kaha|ittila|letter\s+likha)\b",
        " ", normalized,
    )
    evidence = LANDMARK_MASKS[dept].sub(lambda match: match.group() if re.match(
        r'^(?:sparks?|sparking|leak|leakage|phat|burst|toot|gaddh[ae]|potholes?|blast|current|aag\s+laga)\b',
        match.string[match.end():].lstrip(), re.I) else ' ', evidence)
    if dept == "kelectric":
        evidence = re.sub(r"\bphase\s+\d+\b(?!\s*(?:gayab|band|missing|down|trip|fault|nahi\s+aa))", " ", evidence)
    elif dept == "kwsc":
        evidence = re.sub(r"\bwater\s+pump\s+chowrangi\b", " ", evidence)
        # Water inside a gas-owned conduit is not a second water-network fault.
        evidence = re.sub(r"\bgas\s+(?:(?:ka|ki|ke)\s+)?(?:distribution\s+)?(?:pipeline|pipe|line|mains?)\s+(?:mein|me|main)\s+(?:pani|water)\b", " ", evidence)
        evidence = re.sub(r"\bgas\s+(?:(?:ka|ki|ke)\s+)?(?:distribution\s+)?(?:pipeline|pipe|line|mains?)\b", " ", evidence)
        if re.search(r"\bbarish\b", evidence) and re.search(r"\b(?:road|sarak|drainage|naali|naala|nala)\b", evidence):
            evidence = re.sub(r"\bpani\s+khara\b", " ", evidence)
    elif dept == "kmc":
        evidence = re.sub(r"\b(?:main\s+)?(?:road|sarak|bridge|pul|footpath)(?:\s+(?:number|no\.?|#)\s*\d+)?\s+(?:ke\s+(?:paas|qareeb)|par|mein|me)(?:\s+(?:par|mein|me))*\s+(?=(?:bijli|taar|wire|transformer|feeder|gas|(?:pani|water)\s+(?:ki\s+)?(?:pipe|pipeline|line|main|supply)|sewer|gutter|kachra|kachray|garbage|waste|building|imarat)\b)", " ", evidence)
        if re.search(r"\b(?:sewer|gutter|sewerage)\b", normalized) and not re.search(r"\b(?:gaddh[ae]|khadd[ae]|toot|dhans|pothole)\b", normalized):
            evidence = re.sub(r"\bdarya\b", " ", evidence)
    return evidence


def _has_independent_water_fault(text: str) -> bool:
    """A public network fault must survive unrelated private motor symptoms."""
    return bool(re.search(r"\b(sewer|gutter|sookhi|supply\s*band)\b", text) or (
        re.search(r"\b(?:pipe|pipeline|water\s*main|water\s*line|pani\s*ki\s*line)\b", text)
        and re.search(r"\b(?:leak|leakage|phat|phati|burst|choke|contaminated)\b", text)
    ))


class RelationAwareComplaintAnalyzer:
    """Production-grade relation-aware civic complaint analyzer."""

    @staticmethod
    def normalize_text(text: str) -> str:
        """Lightweight phonetic normalizer for Roman Urdu without losing spans."""
        t = (text or "").lower()
        t = re.sub(r"\b(bijli|bijlee|bjl|gas|gass|pani|paani|pni)(nahi|nhi|nai)(a{1,2}(?:rahi|rhi|raha|rha))\b", r"\1 nahi \3", t)
        t = re.sub(r"\b(pani|paani|pni|bijli|gas)(aaraha|aarahi|aarha|aarhi)\b", r"\1 \2", t)
        t = re.sub(r"\b(road|sarak|sadak|gutter|pipeline|transformer|building|imarat)(kharab|khrab|toot|choke|leak)\b", r"\1 \2", t)
        t = re.sub(r"\bdistributionline\b", "distribution line", t)
        t = re.sub(r"\b(bijli|gas|pani|paani|kachra)(nahi|nhi|nai)(?:\b)", r"\1 nahi", t)
        t = re.sub(r"\bgas{3,}\b", "gas", t)
        t = re.sub(r"\bpa{2,}ni{2,}\b", "pani", t)
        t = re.sub(r"\bbi{2,}jli{1,}\b", "bijli", t)
        t = re.sub(r"\bkachra{3,}\b", "kachra", t)
        t = re.sub(r"\b(se|ke|ki|ka|aur|yahan|mein)(gas|gass|pani|paani|bijli|road|sarak|gutter|kachra|transformer|basement|building|imarat|supply|barsati|waste)\b", r"\1 \2", t)
        t = re.sub(r"\b(gas|gass|pani|paani|bijli|road|sarak|gutter|kachra|transformer|basement|building|imarat|supply|flame)(par|ke|ki|ka|mein|band|gayab)\b", r"\1 \2", t)
        t = re.sub(r"\b(hai|hain|tha|thi)(aur|lekin|magar)\b", r"\1 \2", t)
        t = re.sub(r"\b(ho|nahi)(rahi|raha|rahe|chal|jal)\b", r"\1 \2", t)
        t = re.sub(r"\b(theek|kharab|gayab|missing|gaya|gayi|gaddha|khadda|toot|toota|tooti|choke|burst|leak)(hai|hain|tha|thi)\b", r"\1 \2", t)
        t = re.sub(r"\bubhal\b", "ubal", t)
        t = re.sub(r"\bubhalta\b", "ubalta", t)
        t = re.sub(r"\bgass\b", "gas", t)
        t = re.sub(r"\b(?:transfamer|trnsfrmr)\b", "transformer", t)
        t = re.sub(r"\bsadak\b", "sarak", t)
        t = re.sub(r"\b(nhi|nai|naheen|nhn)\b", "nahi", t)
        t = re.sub(r"\b(aarhi|arhi|aarahi|arahi)\b", "aa rahi", t)
        t = re.sub(r"\b(aarha|arha|aaraha|araha)\b", "aa raha", t)
        t = re.sub(r"\b(waja|vajha|vaja)\b", "wajah", t)
        t = re.sub(r"\b(boht|bht|bohat|bhat)\b", "bohot", t)
        t = re.sub(r"\b(choolha|chula)\b", "chulha", t)
        t = re.sub(r"\b(gadda|gadha)\b", "gaddha", t)
        t = re.sub(r"\b(khrab|xrab)\b", "kharab", t)
        t = re.sub(r"\b(hy|\bh\b)\b", "hai", t)
        t = re.sub(r"\b(rhi|rhin)\b", "rahi", t)
        t = re.sub(r"\b(rha|rhe|rhay)\b", "rahe", t)
        t = re.sub(r"\b(zada|zyadh)\b", "zyada", t)
        t = re.sub(r"\b(hoi\s*v|hoi\s*hai|ho\s*gae|ho\s*gai)\b", "hui hai", t)
        t = re.sub(r"\b(gy|gai)\b", "gayi", t)
        t = re.sub(r"\bkrdo\b", "karo", t)
        t = re.sub(r"\b(badbu|bad-?boo)\b", "badboo", t)
        t = re.sub(r"\bbhee\b", "bhi", t)
        t = re.sub(r"\bpaani\b", "pani", t)
        t = re.sub(r"\b(pni|paney)\b", "pani", t)
        t = re.sub(r"\b(bjl|bijlee)\b", "bijli", t)
        t = re.sub(r"\b(srk|sark)\b", "sarak", t)
        return t

    @classmethod
    def segment_spans(cls, text: str) -> List[Tuple[int, int, str]]:
        """Extract clause spans while preserving exact start/end offsets in original text."""
        raw = text
        if not raw.strip():
            return []

        splitter_regex = re.compile(
            r"(?:,\s*(?:aur\s+(?:is\s+ke\s+)?sath\s+sath|sath\s+sath\s+(?:doosri\s+taraf|mazeed)?|mazeed\s+(?:yeh\s+ke|teesra|chotha)?|doosra\s+(?:bara\s+)?masla|teesra\s+(?:bara\s+)?(?:masla|nuqs|issue)|chotha\s+(?:bara\s+)?(?:masla|nuqs|azaab|issue)|aakhri\s+(?:masla|chotha\s+azaab|nuqs)|pados\s+wali\s+gali\s+mein|doosri\s+taraf|aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein)\b|"
            r"\b(?:aur\s+(?:is\s+ke\s+)?sath\s+sath|sath\s+sath\s+(?:doosri\s+taraf|mazeed)?|mazeed\s+(?:yeh\s+ke|teesra|chotha)?|doosra\s+(?:bara\s+)?masla|teesra\s+(?:bara\s+)?(?:masla|nuqs|issue)|chotha\s+(?:bara\s+)?(?:masla|nuqs|azaab|issue)|aakhri\s+(?:masla|chotha\s+azaab|nuqs)|pados\s+wali\s+gali\s+mein|doosri\s+taraf|aur\s+alag\s+se|alag\s+se|is\s+ke\s+ilawa|is\s+ke\s+sath\s+sath|saath\s+mein|aur\s+saath\s+wali|lekin|magar|but|however|balke|balkay)\b|"
            r"(?<!\d)\.(?!\d)\s*|[?!;]+\s*|\n+)"
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
                if COORDINATED_LANDMARK_TAIL.search(right_part.strip()):
                    continue

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
            evidence_text = domain_evidence_text(c_norm, dept)
            for pat in lex["assets"]:
                if re.search(pat, evidence_text):
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
                    is_historical_or_resolved=False,
                    is_contextual_landmark=False,
                    causal_relationship=None,
                    decision_rationale="Citizen complaint concerns private dispute outside civic municipal jurisdiction",
                    responsible_department_candidate=None,
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
                is_historical_or_resolved=False,
                is_contextual_landmark=False,
                causal_relationship=None,
                decision_rationale="Input lacks actionable defect predicate or asset mention",
                responsible_department_candidate=None,
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
        has_electric_evidence = any(re.search(pat, domain_evidence_text(norm_full, "kelectric")) for pat in DOMAIN_EVIDENCE["kelectric"]["assets"])
        has_water_motor_symptom = has_electric_evidence and bool(
            re.search(r"\b(?:pani\s+ki\s+)?motor\s+(?:band|nahi\s*chal|ruk\s*gayi|kharab)\b|\bwater\s*pump\s*band\b", norm_full)
        )

        # 8. Segment into spans and classify issues
        edges: List[RelationEdge] = []
        span_tuples = cls.segment_spans(sanitized)
        candidates: List[IssueCandidate] = []

        for idx, (s_start, s_end, s_raw) in enumerate(span_tuples):
            s_norm = cls.normalize_text(s_raw)

            for dept, lex in DOMAIN_EVIDENCE.items():
                evidence_text = domain_evidence_text(s_norm, dept)
                # Scope denials and historical/resolved mentions to the clause containing them.
                is_hist_match = any(re.search(hp, s_norm) for hp in HISTORICAL_RESOLVED_PATTERNS)
                is_denial_match = any(re.search(den, s_norm) for den in lex["denials"])
                has_dept_asset_in_clause = any(re.search(p, s_norm) for p in lex["assets"])

                if is_denial_match or (is_hist_match and has_dept_asset_in_clause):
                    is_hist = is_hist_match
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset=dept,
                        defect_evidence=["historical_or_resolved"] if is_hist else ["explicitly_negated"],
                        is_actionable=False,
                        negation_scope=True,
                        mention_type="negated_mention",
                        department=dept,
                        reason_codes=[f"HISTORICAL_RESOLVED_{dept.upper()}" if is_hist else f"EXPLICIT_DENIAL_{dept.upper()}"],
                        is_historical_or_resolved=is_hist,
                        is_contextual_landmark=False,
                        causal_relationship=None,
                        decision_rationale=f"Past issue for {dept.upper()} reported resolved/repaired; not currently actionable" if is_hist else f"Explicit denial of active defect for {dept.upper()}",
                        responsible_department_candidate=dept,
                    ))
                    continue

                # Recipient override
                if has_recipient_preamble and recipient_dept == dept and not any(re.search(pat, s_norm) for pat in lex["defects"]):
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
                        reason_codes=[f"RECIPIENT_ONLY_{dept.upper()}"],
                        is_historical_or_resolved=False,
                        is_contextual_landmark=False,
                        causal_relationship=None,
                        decision_rationale=f"Agency {dept.upper()} mentioned as recipient/addressee only, not an active defect",
                        responsible_department_candidate=dept,
                    ))
                    continue

                # Spatial landmark override
                is_landmark_candidate = bool(
                    (is_spatial_proximity_only and dept == "kelectric")
                    or (dept in LANDMARK_MASKS and LANDMARK_MASKS[dept].search(s_norm) and not any(re.search(pat, s_norm) for pat in lex["defects"]))
                )
                if is_landmark_candidate:
                    candidates.append(IssueCandidate(
                        span_id=f"iss_{idx}_{dept}",
                        span_start=s_start,
                        span_end=s_end,
                        span_text=s_raw.strip(),
                        normalized_text=s_norm,
                        asset="pole" if dept == "kelectric" else dept,
                        defect_evidence=["spatial_landmark_only"],
                        is_actionable=False,
                        negation_scope=False,
                        mention_type="spatial_landmark",
                        department=dept,
                        reason_codes=["SPATIAL_LANDMARK_WITHOUT_DEFECT"],
                        is_historical_or_resolved=False,
                        is_contextual_landmark=True,
                        causal_relationship=None,
                        decision_rationale=f"Asset for {dept.upper()} mentioned solely as spatial reference/landmark; no active physical defect",
                        responsible_department_candidate=dept,
                    ))
                    continue

                # Consequence suppression: water motor symptom from power outage
                if dept == "kwsc" and has_water_motor_symptom and not _has_independent_water_fault(s_norm):
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
                        reason_codes=["CONSEQUENCE_WATER_MOTOR_SYMPTOM"],
                        is_historical_or_resolved=False,
                        is_contextual_landmark=False,
                        causal_relationship="consequence_of_root",
                        causal_target_dept="kelectric",
                        decision_rationale="Private water pump/motor non-operation caused by electric power outage; root cause is electric",
                        responsible_department_candidate=dept,
                    ))
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
                if dept == "ssgc" and not re.search(r"\b(gas|chulha|flame|sui\s*gas|natural\s*gas)\b", norm_full):
                    continue

                # If taar/wire is present in K-Electric, don't confuse KMC road toot with taar toot
                if dept == "kmc" and re.search(r"\b(taar|wire|bijli)\b", s_norm) and not re.search(r"\b(sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b", s_norm):
                    continue

                # Check asset and defect match in this span
                asset_hits = [pat for pat in lex["assets"] if re.search(pat, evidence_text)]
                defect_hits = [pat for pat in lex["defects"] if re.search(pat, evidence_text)]

                if asset_hits and defect_hits:
                    is_causal_root = has_causal_consequence and (dept in ("kelectric", "kwsc"))
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
                        reason_codes=[f"AFFIRMATIVE_DEFECT_{dept.upper()}"],
                        is_historical_or_resolved=False,
                        is_contextual_landmark=False,
                        causal_relationship="root_cause" if is_causal_root else "independent",
                        decision_rationale=f"Affirmative active municipal defect identified for {dept.upper()}",
                        responsible_department_candidate=dept,
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
                if dept == "kwsc" and has_water_motor_symptom and not _has_independent_water_fault(norm_full):
                    continue
                if dept == "kmc" and any(re.search(den, norm_full) for den in DOMAIN_EVIDENCE["kmc"]["denials"]):
                    if not re.search(r"\b(drainage\s*nala|drainage|street\s*lights?|naali|naala|nullah)\b", norm_full):
                        continue
                if dept == "kmc" and re.search(r"\b(wire|taar)\b", norm_full) and not re.search(r"\b(gaddha|khadda|toot|dhans|pothole|sarak|sadak|road|footpath|street\s*lights?|naali|naala|drainage)\b", norm_full):
                    continue
                if dept == "kwsc" and re.search(r"\bwater\s*pump\s*chowrangi\b", norm_full) and not re.search(r"\b(pani|paani|sewer|gutter|supply|manhole|leak|leakage|burst|choke)\b", norm_full):
                    continue
                if dept == "ssgc" and not re.search(r"\b(gas|chulha|flame|sui\s*gas|natural\s*gas)\b", norm_full):
                    continue

                evidence_text = domain_evidence_text(norm_full, dept)
                a_hits = [pat for pat in lex["assets"] if re.search(pat, evidence_text)]
                d_hits = [pat for pat in lex["defects"] if re.search(pat, evidence_text)]
                if dept == "kelectric" and has_water_motor_symptom and a_hits and not d_hits:
                    d_hits = ["power_outage_causing_water_motor_failure"]
                if a_hits and d_hits:
                    is_causal_root = has_causal_consequence and (dept in ("kelectric", "kwsc"))
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
                        reason_codes=[f"FULL_TEXT_AFFIRMATIVE_DEFECT_{dept.upper()}"],
                        is_historical_or_resolved=False,
                        is_contextual_landmark=False,
                        causal_relationship="root_cause" if is_causal_root else "independent",
                        decision_rationale=f"Affirmative municipal defect identified from full complaint text for {dept.upper()}",
                        responsible_department_candidate=dept,
                    ))

        actionable_depts = sorted(list(set(actionable_depts)))

        # Causal consequence between distinct departments linked by explicit causal connectors
        causal_connector_regex = r"\b(?:jis\s*(?:ki\s*)?wajah\s*se|us\s*(?:ki\s*)?wajah\s*se|is\s*(?:wajah\s*se|i?s?\s*liye)|isi\s*liye|ke\s*sabab|ke\s*natijay\s*mein)\b"
        causal_match = re.search(causal_connector_regex, norm_full, re.I)
        if causal_match and not is_shared_incident:
            pre_text = norm_full[:causal_match.start()]
            post_raw = norm_full[causal_match.end():]
            consequence_clause = re.split(r"[.\n;]|\b(?:lekin|magar|aur\s+alag\s+se|alag\s+se)\b", post_raw, flags=re.I)[0]
            consequence_end = causal_match.start() + len(causal_match.group(0)) + len(consequence_clause)

            depts_in_pre = set()
            depts_in_consequence = set()
            for d, lex in DOMAIN_EVIDENCE.items():
                pre_ev = domain_evidence_text(pre_text, d)
                if any(re.search(p, pre_ev) for p in lex["assets"]) and any(re.search(p, pre_ev) for p in lex["defects"]):
                    depts_in_pre.add(d)
                cons_ev = domain_evidence_text(consequence_clause, d)
                if any(re.search(p, cons_ev) for p in lex["assets"]) and any(re.search(p, cons_ev) for p in lex["defects"]):
                    depts_in_consequence.add(d)

            for post_dept in depts_in_consequence:
                if post_dept not in depts_in_pre:
                    for pre_dept in depts_in_pre:
                        for cand in candidates:
                            if cand.department == post_dept and cand.is_actionable and cand.span_start < consequence_end:
                                cand.is_actionable = False
                                cand.mention_type = "consequence"
                                cand.causal_relationship = "consequence_of_root"
                                cand.causal_target_dept = pre_dept
                                cand.decision_rationale = f"Defect for {post_dept.upper()} is a stated consequence of {pre_dept.upper()} root fault"
                        edges.append(RelationEdge(
                            pre_dept, post_dept, "CAUSES_CONTEXT_ONLY",
                            f"{post_dept.upper()} is a stated consequence caused by {pre_dept.upper()}"
                        ))

            actionable_depts = sorted(list(set(
                c.department for c in candidates
                if c.is_actionable and c.department is not None
            )))

        # 10. Relational Summary and Edge Building
        if is_shared_incident and len(actionable_depts) >= 2:
            relation_summary = "SAME_INCIDENT_DIFFERENT_REPAIRS"
            for i in range(len(actionable_depts)):
                for j in range(i + 1, len(actionable_depts)):
                    edges.append(RelationEdge(
                        actionable_depts[i],
                        actionable_depts[j],
                        "SAME_INCIDENT_DIFFERENT_REPAIRS",
                        "Shared physical incident requires separate distinct repairs"
                    ))
        elif len(actionable_depts) > 1:
            relation_summary = "INDEPENDENT"
            for i in range(len(actionable_depts)):
                for j in range(i + 1, len(actionable_depts)):
                    edges.append(RelationEdge(
                        actionable_depts[i],
                        actionable_depts[j],
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
            elif has_causal_consequence or any(e.relation_type == "CAUSES_CONTEXT_ONLY" for e in edges):
                relation_summary = "CAUSES_CONTEXT_ONLY"
                if not any(e.relation_type == "CAUSES_CONTEXT_ONLY" for e in edges):
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
                        preceding_separator = sanitized[span_tuples[s_idx - 1][1]:st_start] if s_idx > 0 else ""
                        if re.search(r"\b(?:alag\s+se|doosra\s+masla|is\s+ke\s+ilawa)\b", preceding_separator, re.I):
                            needs_review = True
                            review_reason = "INCOMPLETE_SECONDARY_ISSUE"
                            reason_trace.append("An explicitly declared secondary issue lacks a grounded municipal fault.")
                            break
                        unrouted_depts_in_span = set()
                        for other_dept, o_lex in DOMAIN_EVIDENCE.items():
                            if other_dept not in actionable_depts and not any(re.search(den, st_norm) for den in o_lex["denials"]):
                                evidence_text = domain_evidence_text(st_norm, other_dept)
                                has_asset = any(re.search(a_pat, evidence_text) for a_pat in o_lex["assets"])
                                has_defect = any(re.search(d_pat, evidence_text) for d_pat in o_lex["defects"])
                                if has_asset and has_defect:
                                    unrouted_depts_in_span.add(other_dept)
                        if unrouted_depts_in_span:
                            needs_review = True
                            review_reason = "POSSIBLE_UNROUTED_SECONDARY_ISSUE"
                            reason_trace.append(f"Secondary clause contains unrouted civic defect indicators for {sorted(list(unrouted_depts_in_span))}; flagged for human triage (POSSIBLE_UNROUTED_SECONDARY_ISSUE)")
                            break

        if re.search(r"\b(?:aur\s+alag(?:\s+se)?|alag\s+se|doosra\s+masla(?:\s+ye\s+hai\s+ke)?|is\s+ke\s+ilawa|lekin|magar)\W*$", norm_full):
            needs_review = True
            review_reason = "INCOMPLETE_SECONDARY_ISSUE"
            reason_trace.append("Complaint ends at an unfinished issue connector; a missing fault cannot be inferred.")

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
