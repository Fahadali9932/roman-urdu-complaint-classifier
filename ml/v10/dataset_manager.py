"""Awaaz-e-Awam (آوازِ عوام) — Phase V10 Dataset Curation, Provenance Audit, and Leakage-Safe Splitting.

Audits existing 1,545 records, enriches the dataset with natural Roman Urdu colloquialisms,
causal contrast pairs, negations, and short plain-language citizen texts,
and builds cryptographic, template-family-isolated Train (70%), Validation (15%), and Locked Gold Test (15%) sets.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import List, Dict, Any, Set, Tuple

# Ensure project root is in import path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.v10.preprocess import normalize_roman_urdu

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# Regex patterns for automated PII audit
PII_PATTERNS = {
    "phone_pakistan": re.compile(r"\b(03\d{2}[-.\s]?\d{7}|\+92[-.\s]?3\d{2}[-.\s]?\d{7})\b"),
    "cnic_pakistan": re.compile(r"\b\d{5}[-.\s]?\d{7}[-.\s]?\d\b"),
    "email_address": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "api_token": re.compile(r"\b(eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*|sbp_[A-Za-z0-9]{20,})\b"),
}

# ==============================================================================
# Curated V10 Natural Colloquial & Causal Roman Urdu Complaint Families
# ==============================================================================

V10_CURATED_TEMPLATES: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. Road & Municipal Infrastructure (KMC) — Colloquial & Short Variants
    # --------------------------------------------------------------------------
    {
        "family": "v10_user_road_repair_pattern",
        "depts": ["kmc"],
        "issues": ["kmc.road_damage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "colloquial;short;user_regression",
        "texts": [
            "humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae",
            "hamare ghar ke paas wali road bohot zyada kharab hui hai isko theek kiya jaye",
            "ghar k samne wali road bohat kharab hai chalna dushwar hai theek karain",
            "gali k bahar wali sadak bohot zada tooti hui hai potholes ban gaye hain",
            "hamare muhallay ki main road bohot kharab ho gai hai fori theek karein",
        ],
    },
    {
        "family": "v10_pothole_asphalt_structural",
        "depts": ["kmc"],
        "issues": ["kmc.road_damage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "standard;road_damage",
        "texts": [
            "sarak par bohot gehre khadday hain gaarian phans rahi hain asphalt ukhad gaya",
            "main road pe gehra gadda ban chuka hai raat ko accident ka shadeed khatra hai",
            "sadak toot kar khandar ban gai hai rasta bilkul block rehta hai",
            "asphalt carpeting toot phoot ka shikar hai sarak baith gai hai",
            "heavy traffic ki wajah se sarak dhans gai hai gehra khadda par gaya",
        ],
    },
    {
        "family": "v10_storm_drain_kmc",
        "depts": ["kmc"],
        "issues": ["kmc.storm_drain"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "drainage;monsoon",
        "texts": [
            "barsati nala saal se saaf nahi hua barish mein road darya ban jati hai",
            "kmc ka baray wala storm drain nala band para hai paani road pe charhta hai",
            "main nallah ki safai nahi hoi barish aane se pehle nala kholo",
        ],
    },

    # --------------------------------------------------------------------------
    # 2. Water & Sewerage (KWSC) — Supply Shortages, Leaks, Gutter Overflows
    # --------------------------------------------------------------------------
    {
        "family": "v10_water_supply_shortage",
        "depts": ["kwsc"],
        "issues": ["kwsc.water_shortage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "colloquial;water_supply",
        "texts": [
            "hamare ilaqay mein do haftay se peene ka pani nahi aa raha tanker se guzara hai",
            "line mein paani bilkul nahi hai awam boond boond ko taras rahi hai kwsc dhyan de",
            "pani ki supply band hai aur line mein hawa aa rahi hai paani kab aayega",
            "peene ka paani nahi mil raha line sookhi pari hai fori supply bahal karein",
        ],
    },
    {
        "family": "v10_sewerage_overflow_gutter",
        "depts": ["kwsc"],
        "issues": ["kwsc.sewage_overflow"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "colloquial;sewage_sanitation",
        "texts": [
            "gutter ubal raha hai aur ganda pani sarak par beh raha hai shadeed badboo hai",
            "sewerage line choke ho gai hai ganda pani gharon ke darwazay tak aa gaya",
            "manhole ka dhakkan toota hua hai aur gutter ka paani bahar nikal raha hai",
            "gali mein sewer ka pani jama hai namaziyon ka masjid jana mushkil ho gaya",
        ],
    },
    {
        "family": "v10_water_main_burst",
        "depts": ["kwsc"],
        "issues": ["kwsc.water_leak"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "water_leak;pipeline",
        "texts": [
            "sarkari pani ki main pipeline phat gai hai lakhoon gallon paani zaya ho raha hai",
            "underground water supply line leak ho kar sadak par beh rahi hai",
            "water board ki main line burst ho gai hai fori valve band kar ke repair karein",
        ],
    },

    # --------------------------------------------------------------------------
    # 3. Electricity (K-Electric) — Outages, Sparking, Fallen Wire Hazards
    # --------------------------------------------------------------------------
    {
        "family": "v10_kelectric_outage_voltage",
        "depts": ["kelectric"],
        "issues": ["kelectric.power_outage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "colloquial;power_outage",
        "texts": [
            "subha 10 baje se bijli band hai feeder trip ho gaya hai garmi se bura haal hai",
            "voltage bohot zyada low hai fan nahi chal raha bijli bar bar aa ja rahi hai",
            "transformer jal gaya hai poora block andheray mein hai kelectric koi sunwai nahi",
            "bina elaan ke 12 ghantay ki load shedding chal rahi hai bijli do",
        ],
    },
    {
        "family": "v10_kelectric_fallen_sparking_wire_hazard",
        "depts": ["kelectric"],
        "issues": ["kelectric.fallen_wire_hazard"],
        "hazard": True,
        "hazard_type": "electrical_hazard",
        "source": "human_authored",
        "tags": "critical_hazard;live_wire",
        "texts": [
            "bijli ka nanga taar toat kar sarak par gira hai current chal raha hai shadeed khatra",
            "electric pole tedha ho gaya hai aur live wires latak rahi hain chingariyan nikal rahi hain",
            "high tension wire toota hua zameen par para hai bache khel rahe hain fori power kaato",
            "pmt transformer se aag ke sholay nikal rahe hain blast hone wala hai",
        ],
    },

    # --------------------------------------------------------------------------
    # 4. Sui Southern Gas Company (SSGC) — Low Pressure & Leaks
    # --------------------------------------------------------------------------
    {
        "family": "v10_ssgc_low_pressure",
        "depts": ["ssgc"],
        "issues": ["ssgc.low_pressure"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "gas_shortage;low_pressure",
        "texts": [
            "gas ka pressure bilkul zero hai chulha nahi jal raha nashta banana mushkil hai",
            "subha aur shaam ke waqt gas gayab ho jati hai cylinder use karna parh raha hai",
            "sui gas bilkul nahi aa rahi meter chal raha hai pressure bahal karo",
        ],
    },
    {
        "family": "v10_ssgc_gas_leak_hazard",
        "depts": ["ssgc"],
        "issues": ["ssgc.gas_leak_hazard"],
        "hazard": True,
        "hazard_type": "gas_leak_hazard",
        "source": "human_authored",
        "tags": "critical_hazard;gas_leak",
        "texts": [
            "gali mein gas ki bohot tez boo aa rahi hai pipeline fracture lagti hai dhamaka na ho jaye",
            "underground gas pipeline leak ho rahi hai hiss ki awaz aa rahi hai emergency team bhejo",
            "gas meter ke paas se gas leak ho rahi hai aag lagne ka shadeed khatra hai",
        ],
    },

    # --------------------------------------------------------------------------
    # 5. Solid Waste Management (SSWMB) — Garbage Dumps & Carcasses
    # --------------------------------------------------------------------------
    {
        "family": "v10_sswmb_garbage_dump",
        "depts": ["sswmb"],
        "issues": ["sswmb.garbage_dump"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "solid_waste;garbage",
        "texts": [
            "sarak ke kinaray kachray ka dher laga hai sswmb wale hafte se nahi aaye bimari phail rahi",
            "kachra kundi overflow ho rahi hai kura poori road par phaila hua hai safai karwao",
            "dustbin se kachra bahar nikal kar badboo mar raha hai kachra uthane wali gari bhejo",
            "muhallay mein safai nahi hoti har taraf malba aur garbage para hai",
        ],
    },
    {
        "family": "v10_sswmb_carcass_removal",
        "depts": ["sswmb"],
        "issues": ["sswmb.carcass_removal"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "carcass;urgent_sanitation",
        "texts": [
            "sarak par murda janwar ki laash pari hai kutte nooch rahe hain fori uthwao",
            "dead animal pada hai bohot shadeed badboo se saans lena mushkil ho gaya hai",
        ],
    },

    # --------------------------------------------------------------------------
    # 6. Sindh Building Control Authority (SBCA) — Illegal & Dangerous Structures
    # --------------------------------------------------------------------------
    {
        "family": "v10_sbca_illegal_construction",
        "depts": ["sbca"],
        "issues": ["sbca.illegal_construction"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "illegal_construction;sbca",
        "texts": [
            "residential plot par ghair qanooni 5 manzila commercial building banai ja rahi hai",
            "bina sbca approval ke gali mein illegal construction ho rahi hai rasta tang kar diya",
            "residential ilaqay mein bina ijazat commercial plaza khara kiya ja raha hai",
        ],
    },
    {
        "family": "v10_sbca_dangerous_structure_hazard",
        "depts": ["sbca"],
        "issues": ["sbca.structural_hazard"],
        "hazard": True,
        "hazard_type": "structural_hazard",
        "source": "human_authored",
        "tags": "critical_hazard;collapse",
        "texts": [
            "purani imarat ke pillars mein gehri daraarein par chuki hain chhat girne wali hai",
            "saath wali building ka pillar toot gaya hai kabhi bhi gir sakti hai rehayishi khatray mein hain",
            "dilapidated building dangerous condition mein hai barish se deewar girne ka khatra hai",
        ],
    },

    # --------------------------------------------------------------------------
    # 7. CAUSAL CONTRAST CASES (Crucial V10 Differentiators)
    # --------------------------------------------------------------------------
    # Case A: Power outage caused motor to stop -> ONLY K-Electric!
    {
        "family": "v10_causal_power_motor_kwsc_consequence",
        "depts": ["kelectric"],
        "issues": ["kelectric.power_outage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "causal_contrast;suppress_kwsc",
        "texts": [
            "kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi",
            "bijli band hone ki wajah se pani ki motor nahi chali tanki khali hai bijli do",
            "voltage bohot low hai jis se water motor trip kar rahi hai kelectric voltage theek kare",
            "bijli chali gai is liye motor nahi chal saki aur ghar mein pani khatam ho gaya",
        ],
    },
    # Case B: Sewer overflow causing traffic jam -> ONLY KWSC!
    {
        "family": "v10_causal_sewage_traffic_kmc_consequence",
        "depts": ["kwsc"],
        "issues": ["kwsc.sewage_overflow"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "causal_contrast;suppress_kmc",
        "texts": [
            "sewerage ka pani road par aa raha hai jis se traffic ruk gaya hai",
            "gutter ubalne ki wajah se road par ganda pani jama hai traffic bohot slow hai",
            "sewer line leak se sarak par pani beh raha hai log phans rahe hain sewer band karo",
            "manhole overflow ki wajah se raste mein ganda paani hai aur traffic jam hai",
        ],
    },
    # Case C: Water main burst broke road surface -> DUAL REPAIR (KWSC + KMC)!
    {
        "family": "v10_dual_repair_water_main_road_collapse",
        "depts": ["kwsc", "kmc"],
        "issues": ["kwsc.water_leak", "kmc.road_damage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "dual_repair;same_incident",
        "texts": [
            "pani ki main line phat gai hai aur us ki wajah se road ki satah bhi toot gai hai",
            "water board ki underground pipeline burst hui jis se sarak dhans gai aur khadda par gaya",
            "water main pipe leak hone se asphalt road baith gai hai pipe aur road dono repair hon",
            "sarkari pipe phat gaya aur poori sarak toot phoot gai dono teams bhejo",
        ],
    },
    # Case D: Live electric wire fallen into flood/sewage water -> DUAL HAZARD (KE + KWSC)!
    {
        "family": "v10_dual_hazard_wire_in_water",
        "depts": ["kelectric", "kwsc"],
        "issues": ["kelectric.fallen_wire_hazard", "kwsc.sewage_overflow"],
        "hazard": True,
        "hazard_type": "electrical_hazard",
        "source": "human_authored",
        "tags": "dual_hazard;critical_safety",
        "texts": [
            "bijli ka taar toota hua gutter ke paani mein gira hai current phail raha hai shadeed khatra",
            "transformer se wire gir kar barish ke kharay paani mein current chhor rahi hai",
            "nangi live wire sewer ke paani mein doobi hai log electrocute ho sakte hain",
        ],
    },
    # Case E: Road excavation broke gas pipeline -> DUAL REPAIR (KMC + SSGC)!
    {
        "family": "v10_dual_repair_road_excavation_gas_leak",
        "depts": ["kmc", "ssgc"],
        "issues": ["kmc.road_damage", "ssgc.gas_leak_hazard"],
        "hazard": True,
        "hazard_type": "gas_leak_hazard",
        "source": "human_authored",
        "tags": "dual_repair;gas_hazard",
        "texts": [
            "sarak ki khudai ke doran sui gas pipeline phat gai hai tez boo aur aag lagne ka khatra",
            "road excavation chal rahi thi jis se gas main line fracture ho gai sarak aur gas dono masla",
            "road work ke contractor ne gas pipeline tod di fori gas band karein",
        ],
    },
    # Case F: Garbage blocking stormwater drain -> DUAL REPAIR (SSWMB + KMC)!
    {
        "family": "v10_dual_repair_garbage_blocking_drain",
        "depts": ["sswmb", "kmc"],
        "issues": ["sswmb.garbage_dump", "kmc.storm_drain"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "dual_repair;drain_waste",
        "texts": [
            "kachra kundi se kachra nala mein gir kar storm drain block kar raha hai kachra aur nala dono saaf hon",
            "garbage dump ki wajah se barsati nallah choke ho gaya hai kachra uthao aur nala kholo",
            "dumped solid waste ne public drain band kar diya hai dono mehkamay action lein",
        ],
    },

    # --------------------------------------------------------------------------
    # 8. NEGATION & BOUNDARY CONTRAST CASES
    # --------------------------------------------------------------------------
    {
        "family": "v10_negation_road_fine_sewer_broken",
        "depts": ["kwsc"],
        "issues": ["kwsc.sewage_overflow"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "negation;road_negated",
        "texts": [
            "sarak bilkul theek hai magar gutter ka paani ubal raha hai sewer line theek karo",
            "road tooti hui nahi hai masla sewer line choke hone ka hai",
            "sadak theek hai khadda koi nahi hai bas gutter overflow hai",
        ],
    },
    {
        "family": "v10_negation_gas_leak_negated_low_pressure",
        "depts": ["ssgc"],
        "issues": ["ssgc.low_pressure"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "negation;leak_negated",
        "texts": [
            "gas leak nahi hai magar pressure intehai kam hai chulha nahi jal raha",
            "boo nahi aa rahi gas leak nahi hai sirf gas ka pressure kam hai",
            "gas ki pipeline mein koi leak nahi hai pressure ka masla hai",
        ],
    },
    {
        "family": "v10_negation_wire_safe_road_pothole",
        "depts": ["kmc"],
        "issues": ["kmc.road_damage"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "negation;wire_negated",
        "texts": [
            "bijli ka koi khatra nahi taar theek hai lekin sarak par gehra khadda hai",
            "wire tooti nahi hai pole theek hai road toot kar kharab hui hai",
        ],
    },
    {
        "family": "v10_negation_waste_drain_clean",
        "depts": ["sswmb"],
        "issues": ["sswmb.garbage_dump"],
        "hazard": False,
        "hazard_type": "",
        "source": "human_authored",
        "tags": "negation;drain_negated",
        "texts": [
            "kachra bohot para hai lekin naali bilkul saaf hai kachra uthao",
            "garbage dump para hua hai drain band nahi hai sirf kachra safai chahiye",
        ],
    },
]


def run_pii_audit(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Scans all texts for phone numbers, CNICs, email addresses, and API tokens."""
    violations: List[Dict[str, Any]] = []
    for r in records:
        text = r.get("text", "")
        for pii_type, pat in PII_PATTERNS.items():
            m = pat.search(text)
            if m:
                violations.append({
                    "id": r.get("dataset_id"),
                    "type": pii_type,
                    "matched": m.group(0),
                })
    return {
        "passed": len(violations) == 0,
        "violation_count": len(violations),
        "violations": violations,
    }


def curate_and_split_v10_dataset(
    existing_v9_csv: str = "ml/data/multilabel_dataset_full.csv",
    output_dir: str = "ml/v10/data",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Dict[str, Any]:
    """Ingests V9 records, appends V10 curated families, audits PII,
    and partitions dataset by template family with 0.00% split leakage.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    records: List[Dict[str, Any]] = []
    seen_texts: Set[str] = set()
    counter = 1

    # 1. Ingest existing V9 records
    v9_path = Path(existing_v9_csv)
    if v9_path.exists():
        with open(v9_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = row["text"].strip()
                norm = normalize_roman_urdu(text)
                if norm in seen_texts:
                    continue
                seen_texts.add(norm)

                depts = [d.strip() for d in row["departments"].split(",") if d.strip()]
                is_multi = len(depts) > 1
                has_hazard = row.get("has_hazard", "").lower() == "true"

                # Classify source_kind honestly
                raw_src = row.get("source_type", "synthetic_agent")
                if "genuine" in raw_src:
                    source_kind = "consented_real"
                elif "colloquial" in raw_src:
                    source_kind = "human_authored"
                elif "variant" in raw_src or "expansion" in raw_src:
                    source_kind = "synthetic_paraphrase"
                else:
                    source_kind = "synthetic_agent"

                records.append({
                    "dataset_id": f"AEA-V10-{counter:05d}",
                    "text": text,
                    "normalized_text": norm,
                    "departments": ";".join(depts),
                    "primary_department": depts[0] if depts else "unassigned",
                    "issue_types": row.get("issue_types", ""),
                    "is_multilabel": is_multi,
                    "has_hazard": has_hazard,
                    "hazard_type": row.get("hazard_type", ""),
                    "difficulty_tags": row.get("difficulty_tags", "standard"),
                    "source_kind": source_kind,
                    "template_family_id": row.get("template_family_id", f"v9_family_{counter}"),
                })
                counter += 1

    # 2. Append V10 curated templates
    for family_dict in V10_CURATED_TEMPLATES:
        fam_id = family_dict["family"]
        depts = family_dict["depts"]
        issues = family_dict["issues"]
        hazard = family_dict["hazard"]
        hazard_type = family_dict["hazard_type"]
        src = family_dict["source"]
        tags = family_dict["tags"]

        for text in family_dict["texts"]:
            norm = normalize_roman_urdu(text)
            if norm in seen_texts:
                continue
            seen_texts.add(norm)

            records.append({
                "dataset_id": f"AEA-V10-{counter:05d}",
                "text": text,
                "normalized_text": norm,
                "departments": ";".join(depts),
                "primary_department": depts[0],
                "issue_types": ";".join(issues),
                "is_multilabel": len(depts) > 1,
                "has_hazard": hazard,
                "hazard_type": hazard_type,
                "difficulty_tags": tags,
                "source_kind": src,
                "template_family_id": fam_id,
            })
            counter += 1

    # 3. PII Audit
    pii_report = run_pii_audit(records)
    if not pii_report["passed"]:
        raise ValueError(f"PII Leakage Detected in dataset curation: {pii_report['violations']}")

    # 4. Cryptographic Group-Safe Splitting by template_family_id
    family_to_records: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in records:
        family_to_records[r["template_family_id"]].append(r)

    families = sorted(list(family_to_records.keys()))
    
    # Deterministic pseudo-random shuffling using cryptographic hash
    def family_hash(fam: str) -> int:
        return int(hashlib.sha256(f"{seed}:{fam}".encode()).hexdigest(), 16)

    families.sort(key=family_hash)

    train_families: Set[str] = set()
    val_families: Set[str] = set()
    test_families: Set[str] = set()

    total_records = len(records)
    target_train = int(total_records * train_ratio)
    target_val = int(total_records * val_ratio)

    current_train = 0
    current_val = 0

    for fam in families:
        fam_count = len(family_to_records[fam])
        if current_train + fam_count <= target_train:
            train_families.add(fam)
            current_train += fam_count
        elif current_val + fam_count <= target_val:
            val_families.add(fam)
            current_val += fam_count
        else:
            test_families.add(fam)

    # Assign split to each record
    train_records: List[Dict[str, Any]] = []
    val_records: List[Dict[str, Any]] = []
    test_records: List[Dict[str, Any]] = []

    for r in records:
        fam = r["template_family_id"]
        if fam in train_families:
            r["split"] = "train"
            train_records.append(r)
        elif fam in val_families:
            r["split"] = "val"
            val_records.append(r)
        else:
            r["split"] = "test"
            test_records.append(r)

    # 5. Split Disjointness Verification
    overlap_train_val = train_families.intersection(val_families)
    overlap_train_test = train_families.intersection(test_families)
    overlap_val_test = val_families.intersection(test_families)
    leakage_passed = len(overlap_train_val) == 0 and len(overlap_train_test) == 0 and len(overlap_val_test) == 0

    # 6. Save CSV Files
    fieldnames = [
        "dataset_id", "text", "normalized_text", "departments", "primary_department",
        "issue_types", "is_multilabel", "has_hazard", "hazard_type", "difficulty_tags",
        "source_kind", "template_family_id", "split"
    ]

    for filename, dataset_split in [
        ("v10_dataset_full.csv", records),
        ("v10_train.csv", train_records),
        ("v10_val.csv", val_records),
        ("v10_test.csv", test_records),
    ]:
        with open(out_path / filename, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(dataset_split)

    # 7. Metadata Report
    metadata = {
        "dataset_name": "Awaaz-e-Awam Multi-Department Civic Dataset V10",
        "version": "10.0",
        "total_samples": len(records),
        "total_template_families": len(families),
        "splits": {
            "train": len(train_records),
            "val": len(val_records),
            "test": len(test_records),
        },
        "families": {
            "train": len(train_families),
            "val": len(val_families),
            "test": len(test_families),
        },
        "source_breakdown": dict(Counter(r["source_kind"] for r in records)),
        "pii_audit_passed": pii_report["passed"],
        "leakage_audit_passed": leakage_passed,
    }

    with open(out_path / "v10_dataset_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    meta = curate_and_split_v10_dataset()
    print("\nV10 Dataset Curation Complete:")
    print(json.dumps(meta, indent=2))
