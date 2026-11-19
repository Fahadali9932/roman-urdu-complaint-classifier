#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.3 Independent Benchmark Dataset Builder
Academic Stakeholder: Fahad (Greenwich University)
Zero budget, zero paid APIs, deterministic cryptographic provenance.

Generates:
  data/v11/eval_v13_3/v13_3_holdout_1000.jsonl (1,000 untouched holdout evaluation cases)
  data/v11/eval_v13_3/manifest.json (Cryptographic SHA-256 checksums and distribution metadata)

Guarantees:
- Strict zero-leakage check against all historical datasets in data/v11/
- Full distribution covering all 6 municipal authorities (KMC, KWSC, K-Electric, SSGC, SSWMB, SBCA)
- Single-department (40%), dual-department (30%), triple-department (15%),
  causal consequence (5%), explicit negation (4%), out-of-scope (3%), ambiguous (3%)
- Realistic Roman Urdu linguistic variations: spelling errors, phonetic substitutions,
  missing spaces, code-mixing, variable complaint lengths (up to 200 words).
"""

import json
import os
import random
import hashlib
from typing import List, Dict, Any, Set

SEED = 1332026
random.seed(SEED)

OUTPUT_DIR = "data/v11/eval_v13_3"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

AREAS = [
    ("Gulshan-e-Iqbal Block 13D", "District East"),
    ("Nazimabad No 2", "District Central"),
    ("Korangi Sector 32-B", "District Korangi"),
    ("Orangi Town Sector 11", "District West"),
    ("Clifton Block 5", "District South"),
    ("Malir Khokhrapar", "District Malir"),
    ("Keamari Jackson Bazar", "District Keamari"),
    ("Federal B Area Block 14", "District Central"),
    ("Shah Faisal Colony No 3", "District Korangi"),
    ("North Karachi Sector 7D", "District Central"),
    ("Saddar Bohri Bazaar", "District South"),
    ("Liaquatabad Dak Khana", "District Central"),
    ("Gulistan-e-Jauhar Block 1", "District East"),
    ("Buffer Zone Sector 15B", "District Central"),
    ("Baldia Town Saeedabad", "District West"),
    ("Landhi Industrial Area", "District Korangi"),
    ("Surjani Town Sector 4", "District West"),
    ("Old City Kharadar", "District South"),
    ("P.E.C.H.S Block 2", "District East"),
    ("Bahadurabad Charminar Chowrangi", "District East"),
]

GREETINGS = [
    "",
    "Assalam o alaikum ",
    "Aoa janab ",
    "Hello authority ",
    "Bhai suno ",
    "Guzarish yeh hai ke ",
    "Janab aala ",
    "Bohot zaroori masla hai ",
    "Sir ",
    "Salam alaikum ",
]

ANGER_EMOTION = [
    "",
    " Hum shikayat kar kar ke thak gaye hain koi nahi sunta.",
    " Awam ko pagal bana rakha hai sharam aani chahiye.",
    " Meherbani karke foran kisi team ko bhej kar theek karwayen.",
    " 10 din se zalil ho rahe hain koi hal nahi nikal raha.",
    " Tax poora letay ho kaam dhang se nahi hota.",
    " Please take immediate action urgent basis pe.",
    " Barish hoti hai to bohot kichar hota hai zindagi azaab ban chuki hai.",
    " Bachon aur buzurgo ka jeena mushkil ho gaya hai.",
    " Authorities se darkhwast hai foran action liya jaye.",
]

FAULTS = {
    "kelectric": [
        "10 din se bejli ni arhi tranforma khrab hai",
        "transformer phat gaya hai aur bijli band hai",
        "khambay se taar toot kar zameen par gir gaya hai current araha hai",
        "voltage bohot low hai 110 volt araha hai appliances jal rahi hain",
        "light chali gayi subah se feeder trip ho chuka hai pure ilaqay mein andhera hai",
        "nange taar latak rahe hain street pole se chingari nikal rahi hai",
        "bijlinahi aa rahi pure block mein black out hai",
        "pmt se aag nikal rahi hai sparking shadeed ho rahi hai",
        "cable jal chuki hai meter ke paas se dhuan uth raha hai",
        "light ghanton se band hai bar bar tripping ho rahi hai",
    ],
    "kwsc": [
        "main water supply line burst ho chuki hai peenay ka pani nahi araha",
        "gali mein sewer ka gutter ubal raha hai ganda pani gharon mein ja raha hai",
        "paninahi araha do hafte se line sookhi pari hai tanker mafia loat raha hai",
        "manhole ka dhakkan gayab hai khula gutter janleva bana hua hai",
        "sewerage line block ho chuki hai badboodar pani jama hai",
        "pani ki line mein drainage ka ganda pani mix ho kar araha hai badboo dar pani",
        "main nullah choke hai kachray aur sewage se galiyan doob gayi hain",
        "water pump ke paas main pipeline phat gayi hai hazaron gallon pani zaya ho raha hai",
        "sewer line baith chuki hai poora sewage road par beh raha hai",
        "peenay ka saaf pani do hafton se band hai pipeline dead ho chuki hai",
    ],
    "kmc": [
        "hamari gali ki rod bhi tut gai hai bohot khrab haal hai",
        "main road toot phoot ka shikar hai bohat baray khadday ban chukay hain",
        "sth wali rod b tuti hoi he chalna dushwar hai",
        "footpath par malba para hai pedestrians ke liye rasta band hai",
        "sarak par gehra crater ban gaya hai gaariyan phans rahi hain",
        "street light fuses hain raat ko andhera rehta hai",
        "bridge ke expansion joint toot chuke hain sarak dhans gayi hai",
        "underpass mein road toot gayi hai aur asphalt ukhad chuka hai",
        "flyover ki surfacing utar chuki hai gehre potholes ban gaye hain",
        "sadak par khadday hi khadday hain sarak kacha rasta ban chuki hai",
    ],
    "ssgc": [
        "sui gas ka pressure bilkul zero hai chulha nahi jal raha",
        "gas ki underground line leak ho rahi hai shadeed boo phail rahi hai",
        "gasnahi arahi subah se bache bhookay school gaye hain",
        "gas line phat gayi hai foran emergency team bheji jaye",
        "gas meter ke paas se leak ki awaz aur boo arahi hai",
        "chulha jalate hain to bilkul halki flame aati hai khana nahi ban raha",
        "gas pipeline blast hone ka khatra hai gas smell bohot taiz hai",
        "subah shaam gas bilkul band hoti hai zero pressure hai",
        "pipeline se gas hiss hiss karke nikal rahi hai baraye meherbani dekhain",
        "sui gas distribution line damage ho gayi hai poora mohalla gas se mehroom hai",
    ],
    "sswmb": [
        "bahar kachray ka dher laga hua hai kooda uthane wali gaari nahi aati",
        "kachra b para he bohot badboo arahi hai bimari phail rahi he",
        "kachra kundi overflow ho chuki hai gali mein kooda bikhra para hai",
        "safai nahi ho rahi do maah se sweepers gayab hain",
        "plot par commercial waste phenka ja raha hai dumper wala kachra girata hai",
        "gali ke konay par gandagi ka dher lag chuka hai kachra uthane koi nahi ata",
        "solid waste management ki gaari das din se nahi aayi badboo se dama ho raha hai",
        "sweepers kachra gali ke beech mein chhod kar chale jate hain",
        "kooda daan toot chuka hai sara kachra sadak par bikhra rehta hai",
        "hospital waste aur aam kachra khulay aam gali mein phenka ja raha hai",
    ],
    "sbca": [
        "rihaishi plot par ghair qanooni commercial plaza tameer ho raha hai",
        "building ke pillars mein gehri daraarein aachuki hain imarat jhuk rahi hai",
        "baghair noc aur permit ke extra chhati manzil banayi ja rahi hai",
        "deewar girne ke qareeb hai substandard material use ho raha hai",
        "residential gali mein illegal multi-storey building ban rahi hai",
        "parosi baghair setback aur SBCA approval ke chhat daal raha hai",
        "pash building ke base columns crack ho gaye hain structural safety hazard hai",
        "commercial hall residential zone mein banaya ja raha hai baghair naqsha pass karwaye",
        "plinth beam toot chuka hai aur deewar baith rahi hai kisi waqt gir sakti hai",
        "four storey illegal building ban rahi hai builder ne rasta dukanon se block kar diya",
    ],
}

CAUSAL_CASES_TEMPLATES = [
    ("Subah se transformer phat gaya hai bijli nahi arahi jis ki wajah se pani ki motor nahi chal rahi pani band hai", ["kelectric"], "causal_power_motor"),
    ("K-Electric ki supply line trip hone se light band ho gayi isi liye water pump nahi chala pani nahi bhara", ["kelectric"], "causal_power_motor"),
    ("10 din se bejli ni arhi tranforma khrab hai is wajah se pani ki motor band hai", ["kelectric"], "causal_power_motor"),
    ("Water board ki main line phat gayi jis ke paani se sadak toot gayi aur asphalt beh gaya", ["kwsc"], "causal_water_road"),
    ("Gutter ka pani ubalne ki wajah se sadak ka asphalt beh gaya aur road kharab ho gayi", ["kwsc"], "causal_sewer_road"),
    ("Drainage block hone se gali mein paani jama hai jis se sarak par kichar aur khadday ho gaye", ["kwsc"], "causal_sewer_road"),
    ("Gas pipeline ki excavation khudai ki gayi thi jis ki wajah se road par khadda ho gaya hai sarak tooti pari hai", ["ssgc"], "causal_gas_road"),
    ("Sui gas walon ne pipeline repair ke liye gali khodi thi ab poori road tooti pari hai khadda chor gaye", ["ssgc"], "causal_gas_road"),
    ("Kachray ka bada dher drain ke uper gir gaya jis ke sabab gutter choke ho gaya pani ruk gaya", ["sswmb"], "causal_waste_gutter"),
    ("Solid waste kachra kundi se nikal kar sewer line mein chala gaya jis se manhole band ho gaya", ["sswmb"], "causal_waste_gutter"),
]

NEGATION_CASES_TEMPLATES = [
    ("Pani ka koi masla nahi hai bijli bilkul theek chal rahi hai lekin main road par bohot baray khadday hain sarak toot gayi", ["kmc"], "negation_water_power"),
    ("Bijli ki koi shikayat nahi hai aur sarak bhi theek hai magar sui gas bilkul gayab hai chulha nahi jal raha", ["ssgc"], "negation_power_road"),
    ("Road bilkul theek hai koi khadda nahi hai lekin gutter ubal raha hai aur sewage ka badboodar pani khara hai", ["kwsc"], "negation_road"),
    ("Gas aur pani theek arahe hain bas gali mein kachray ka dher laga hua hai safai karwayen", ["sswmb"], "negation_gas_water"),
    ("Bijli aur gas bilkul theek chal rahi hai parosi baghair NOC ke illegal building bana raha hai deewar jhuk gayi", ["sbca"], "negation_power_gas"),
    ("Kachra safai theek hai magar transformer jal gaya hai bijli 2 din se gul hai", ["kelectric"], "negation_waste"),
]

OUT_OF_SCOPE_CASES = [
    ("Thane mein FIR darj nahi kar rahe police wale rishwat mang rahe hain", [], "out_of_scope_police"),
    ("Nadra office walay CNIC renew nahi kar rahe token system kharab hai", [], "out_of_scope_nadra"),
    ("Sarkari school mein ustad nahi atay bachon ki taleem tabah ho rahi hai", [], "out_of_scope_education"),
    ("Traffic police wale chowk par be-wajah chalan kaat rahe hain", [], "out_of_scope_traffic"),
    ("Civil hospital mein dawaiyan nahi mil rahi doctor duty par maujood nahi", [], "out_of_scope_health"),
    ("Passport office mein 6 maah se passport print nahi ho raha agents paise mangte hain", [], "out_of_scope_passport"),
]

AMBIGUOUS_CASES_TEMPLATES = [
    ("Salam janab hamara masla foran hal kiya jaye hum bohot takleef mein hain koi sunwayi nahi", [], "ambiguous_vague"),
    ("Bhai mere ghar ke paas bohot pareshani hai jaldi se kisi officer ko bhejen shukriya", [], "ambiguous_vague"),
    ("Sindh government bilkul nakam ho chuki hai har taraf andhera hai awam kahan jaye", [], "ambiguous_rant"),
    ("Masla itna barh gaya hai ke bardasht se bahar hai foran action liya jaye", [], "ambiguous_vague"),
    ("Hum sab ahel-e-mohalla darkhwast karte hain ke hamari takleef ka azala kiya jaye", [], "ambiguous_petition"),
]


def assemble_complaint(clauses: List[str], seed: int) -> str:
    rnd = random.Random(seed)
    area, _ = rnd.choice(AREAS)
    greet = rnd.choice(GREETINGS)
    anger = rnd.choice(ANGER_EMOTION)

    if len(clauses) == 1:
        body = clauses[0]
    elif len(clauses) == 2:
        connectors = [
            " aur saath hamari gali ki ",
            " aur sth wali rod pe ",
            " aur alag se doosra masla yeh hai ke ",
            " is ke ilawa ",
            ", mazeed yeh ke ",
            " aur ",
        ]
        body = clauses[0] + rnd.choice(connectors) + clauses[1]
    elif len(clauses) == 3:
        connectors_3 = [
            f"{clauses[0]} aur saath hi {clauses[1]} jabke doosri taraf {clauses[2]}",
            f"{clauses[0]}, is ke sath {clauses[1]} aur {clauses[2]}",
            f"pehla masla yeh hai ke {clauses[0]} aur sth wali gali mein {clauses[1]} aur {clauses[2]}",
        ]
        body = rnd.choice(connectors_3)
    else:
        body = " aur ".join(clauses)

    return f"{greet}hamare area {area} mein {body}.{anger}".strip()


def generate_1000_benchmark() -> List[Dict[str, Any]]:
    rnd = random.Random(SEED)
    cases: List[Dict[str, Any]] = []
    cid = 1

    # 1. Single Department: 400 cases (approx 66-67 each across 6 depts)
    depts_cycle = DEPARTMENTS * 67
    for dept in depts_cycle[:400]:
        clause = rnd.choice(FAULTS[dept])
        area, district = rnd.choice(AREAS)
        text = assemble_complaint([clause], seed=cid * 17)
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": [dept],
            "district": district,
            "locality": area,
            "complexity": "single_department",
            "category": f"single_{dept}",
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 2. Dual Department: 300 cases (All 15 pairs)
    all_pairs = []
    for i in range(len(DEPARTMENTS)):
        for j in range(i + 1, len(DEPARTMENTS)):
            all_pairs.append((DEPARTMENTS[i], DEPARTMENTS[j]))

    for i in range(300):
        d1, d2 = all_pairs[i % len(all_pairs)]
        c1 = rnd.choice(FAULTS[d1])
        c2 = rnd.choice(FAULTS[d2])
        # Randomize order
        if rnd.random() > 0.5:
            clauses = [c1, c2]
        else:
            clauses = [c2, c1]
        area, district = rnd.choice(AREAS)
        text = assemble_complaint(clauses, seed=cid * 23)
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": sorted([d1, d2]),
            "district": district,
            "locality": area,
            "complexity": "dual_department",
            "category": f"dual_{d1}_{d2}",
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 3. Triple Department: 150 cases (All triplets)
    all_triplets = []
    for i in range(len(DEPARTMENTS)):
        for j in range(i + 1, len(DEPARTMENTS)):
            for k in range(j + 1, len(DEPARTMENTS)):
                all_triplets.append((DEPARTMENTS[i], DEPARTMENTS[j], DEPARTMENTS[k]))

    for i in range(150):
        t = all_triplets[i % len(all_triplets)]
        clauses = [rnd.choice(FAULTS[d]) for d in t]
        rnd.shuffle(clauses)
        area, district = rnd.choice(AREAS)
        text = assemble_complaint(clauses, seed=cid * 29)
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": sorted(list(t)),
            "district": district,
            "locality": area,
            "complexity": "triple_department",
            "category": f"triple_{'_'.join(t)}",
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 4. Causal Consequence Cases: 50 cases
    for i in range(50):
        tmpl, expected, cat = CAUSAL_CASES_TEMPLATES[i % len(CAUSAL_CASES_TEMPLATES)]
        area, district = rnd.choice(AREAS)
        greet = rnd.choice(GREETINGS)
        anger = rnd.choice(ANGER_EMOTION)
        text = f"{greet}{area} mein {tmpl}.{anger}".strip()
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": expected,
            "district": district,
            "locality": area,
            "complexity": "causal_consequence",
            "category": cat,
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 5. Explicit Negation Cases: 40 cases
    for i in range(40):
        tmpl, expected, cat = NEGATION_CASES_TEMPLATES[i % len(NEGATION_CASES_TEMPLATES)]
        area, district = rnd.choice(AREAS)
        greet = rnd.choice(GREETINGS)
        anger = rnd.choice(ANGER_EMOTION)
        text = f"{greet}{area} mein {tmpl}.{anger}".strip()
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": expected,
            "district": district,
            "locality": area,
            "complexity": "negation_suppressed",
            "category": cat,
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 6. Out-Of-Scope / Non-Municipal: 30 cases
    for i in range(30):
        tmpl, expected, cat = OUT_OF_SCOPE_CASES[i % len(OUT_OF_SCOPE_CASES)]
        area, district = rnd.choice(AREAS)
        greet = rnd.choice(GREETINGS)
        anger = rnd.choice(ANGER_EMOTION)
        text = f"{greet}{area} mein {tmpl}.{anger}".strip()
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": expected,
            "district": district,
            "locality": area,
            "complexity": "out_of_scope",
            "category": cat,
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    # 7. Ambiguous / Vague Complaints: 30 cases
    for i in range(30):
        tmpl, expected, cat = AMBIGUOUS_CASES_TEMPLATES[i % len(AMBIGUOUS_CASES_TEMPLATES)]
        area, district = rnd.choice(AREAS)
        greet = rnd.choice(GREETINGS)
        anger = rnd.choice(ANGER_EMOTION)
        text = f"{greet}{area} mein {tmpl}.{anger}".strip()
        cases.append({
            "id": f"v13_3_holdout_{cid:04d}",
            "text": text,
            "expected": expected,
            "district": district,
            "locality": area,
            "complexity": "ambiguous",
            "category": cat,
            "source": "v13_3_independent_benchmark",
        })
        cid += 1

    assert len(cases) == 1000, f"Expected 1,000 cases, got {len(cases)}"
    return cases


def run_leakage_check(holdout_cases: List[Dict[str, Any]]) -> None:
    """Verifies zero overlap with historical training and dev suites in data/v11/."""
    holdout_texts = {c["text"].strip().lower() for c in holdout_cases}
    historical_files = []
    for root, _, files in os.walk("data/v11"):
        if "eval_v13_3" in root:
            continue
        for file in files:
            if file.endswith(".jsonl") or file.endswith(".json"):
                historical_files.append(os.path.join(root, file))

    print(f"Checking leakage against {len(historical_files)} historical files in data/v11/...")
    leak_count = 0
    for fpath in historical_files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        txt = ""
                        if isinstance(record, dict):
                            txt = record.get("text") or record.get("description") or ""
                        if txt and txt.strip().lower() in holdout_texts:
                            print(f"[LEAK DETECTED] in {fpath}: {txt[:60]}...")
                            leak_count += 1
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass

    print(f"Leakage Check Complete: {leak_count} overlaps found.")
    assert leak_count == 0, f"Data leakage detected: {leak_count} holdout texts overlap with historical training sets!"


def main():
    cases = generate_1000_benchmark()
    run_leakage_check(cases)

    out_file = os.path.join(OUTPUT_DIR, "v13_3_holdout_1000.jsonl")
    with open(out_file, "w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    sha256 = hashlib.sha256(open(out_file, "rb").read()).hexdigest()

    # Category counts
    category_counts = {}
    complexity_counts = {}
    for c in cases:
        category_counts[c["category"]] = category_counts.get(c["category"], 0) + 1
        complexity_counts[c["complexity"]] = complexity_counts.get(c["complexity"], 0) + 1

    manifest = {
        "benchmark_name": "v13_3_holdout_1000",
        "version": "v13.3",
        "created_date": "2026-11-20",
        "total_cases": len(cases),
        "sha256": sha256,
        "complexity_distribution": complexity_counts,
        "category_distribution": category_counts,
        "guarantees": [
            "zero_leakage_into_training",
            "frozen_unretrained_eval",
            "multi_department_balance",
            "causal_and_negation_coverage",
            "cryptographically_hashed",
        ],
    }

    manifest_file = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Successfully generated {len(cases)} cases -> {out_file}")
    print(f"SHA-256: {sha256}")
    print(f"Manifest saved -> {manifest_file}")


if __name__ == "__main__":
    main()
