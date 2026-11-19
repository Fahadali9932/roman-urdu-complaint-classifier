"""
AWAAZ-E-AWAM — Phase V13.4 Development Benchmark Generator (400 Cases)

Generates 400 carefully labeled development cases across:
- 100 causal/dependent cases
- 100 independent multi-department cases (dual & triple)
- 100 misleading asset-location cases
- 50 negation & historical cases
- 50 out-of-scope & ambiguous cases
"""

import os
import json
import random
import hashlib

random.seed(13401)

OUTPUT_DIR = "data/v11/eval_v13_4"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "v13_4_dev_400.jsonl")

LOCALITIES = [
  ("Gulshan-e-Iqbal", "District East"),
  ("Clifton Block 5", "District South"),
  ("Orangi Town Sector 11", "District West"),
  ("Korangi Sector 32-B", "District Korangi"),
  ("Buffer Zone Sector 15B", "District Central"),
  ("Surjani Town Sector 4", "District West"),
  ("North Karachi Sector 7D", "District Central"),
  ("Malir Khokhrapar", "District Malir"),
  ("P.E.C.H.S Block 2", "District East"),
  ("Liaquatabad Dak Khana", "District Central"),
  ("Saddar Regal Chowk", "District South"),
  ("Nazimabad No 2", "District Central"),
  ("Federal B Area Block 14", "District Central"),
  ("Baldia Town Saeedabad", "District Keamari"),
  ("Old City Kharadar", "District South")
]

GREETINGS = [
  "Assalam o alaikum",
  "Aoa janab",
  "Salam alaikum",
  "Janab aala",
  "Bhai suno",
  "Sir",
  "Hello authority",
  "Guzarish yeh hai ke",
  "Bohot zaroori masla hai"
]

OUTRO_EMOTIONS = [
  "Hum shikayat kar kar ke thak gaye hain koi nahi sunta.",
  "Tax poora letay ho kaam dhang se nahi hota.",
  "Awam ko pagal bana rakha hai sharam aani chahiye.",
  "Bachon aur buzurgo ka jeena mushkil ho gaya hai.",
  "Barish hoti hai to bohot kichar hota hai zindagi azaab ban chuki hai.",
  "10 din se zalil ho rahe hain koi hal nahi nikal raha.",
  "Authorities se darkhwast hai foran action liya jaye.",
  "Please take immediate action urgent basis pe."
]

def generate_dev_suite():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cases = []
    c_id = 1

    # 1. 100 Causal / Dependent Cases
    # Patterns:
    # A. Power outage -> domestic water pump stopped (kelectric only)
    # B. Water line burst / gutter overflow -> road surface eroded (kwsc only)
    # C. Utility gas excavation -> road trench / pothole left (ssgc only)
    # D. Garbage dump -> drain choke (sswmb only)
    # E. Broken road -> rain mud (kmc only)
    causal_templates = [
        # KE outage -> domestic water pump
        ("Subah se transformer phat gaya hai bijli nahi arahi jis ki wajah se pani ki motor nahi chal rahi pani band hai.", ["kelectric"], "ke_causes_water_motor"),
        ("K-Electric ki supply line trip hone se light band ho gayi isi liye water pump nahi chala pani nahi bhara.", ["kelectric"], "ke_causes_water_motor"),
        ("10 din se bejli ni arhi tranforma khrab hai is wajah se pani ki motor band hai.", ["kelectric"], "ke_causes_water_motor"),
        ("Voltage bohot kam araha hai 110 volt jis ke sabab pani ki motor nahi chal pa rahi.", ["kelectric"], "ke_causes_water_motor"),
        ("Pichle 3 din se load shedding ka azaab hai aur bijli band hone ki wajah se ghar ka water pump band para hai.", ["kelectric"], "ke_causes_water_motor"),
        
        # KWSC burst -> road damage
        ("Water board ki main line phat gayi jis ke paani se sadak toot gayi aur asphalt beh gaya.", ["kwsc"], "kwsc_causes_road_damage"),
        ("Gutter ka pani ubalne ki wajah se sadak ka asphalt beh gaya aur road kharab ho gayi.", ["kwsc"], "kwsc_causes_road_damage"),
        ("Drainage block hone se gali mein paani jama hai jis se sarak par kichar aur khadday ho gaye.", ["kwsc"], "kwsc_causes_road_damage"),
        ("Sewer line leak hone ke bais poori road dhans chuki hai gehra gaddha ban gaya hai.", ["kwsc"], "kwsc_causes_road_damage"),
        ("Main water pipeline burst hone se paani beh raha hai jis ke sabab sarak tooti pari hai.", ["kwsc"], "kwsc_causes_road_damage"),

        # SSGC excavation -> road trench
        ("Gas pipeline ki excavation khudai ki gayi thi jis ki wajah se road par khadda ho gaya hai sarak tooti pari hai.", ["ssgc"], "ssgc_causes_road_trench"),
        ("Sui gas walon ne pipeline repair ke liye gali khodi thi ab poori road tooti pari hai khadda chor gaye.", ["ssgc"], "ssgc_causes_road_trench"),
        ("Gas pipe line dalne ke liye sarak khodi gayi thi tab se khadday pare hue hain koi repair nahi kar raha.", ["ssgc"], "ssgc_causes_road_trench"),
        ("SSGC walo ne new gas connection ke liye road khoda tha jis ke bais khadda chor kar chale gaye.", ["ssgc"], "ssgc_causes_road_trench"),

        # SSWMB garbage -> drain choke
        ("Kachray ka bada dher drain ke uper gir gaya jis ke sabab gutter choke ho gaya pani ruk gaya.", ["sswmb"], "sswmb_causes_drain_choke"),
        ("Solid waste kachra kundi se nikal kar sewer line mein chala gaya jis se manhole band ho gaya.", ["sswmb"], "sswmb_causes_drain_choke"),
        ("Kachra na uthne ki wajah se kachra nallay mein gir gaya aur drainage block ho gayi.", ["sswmb"], "sswmb_causes_drain_choke"),

        # KMC road damage -> rain mud
        ("Gali ki road toot chuki hai khadday hain barish mein bohot kichar jama ho jata hai.", ["kmc"], "kmc_causes_mud"),
        ("Sarak tooti phooti hai asphalt ukhad chuka hai jis se barish ke baad kichar hi kichar ho jata hai.", ["kmc"], "kmc_causes_mud"),
    ]

    for i in range(100):
        t_text, expected, cat = causal_templates[i % len(causal_templates)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        outro = random.choice(OUTRO_EMOTIONS)
        text = f"{greet} hamare area {loc} mein {t_text} {outro}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "causal_consequence",
            "category": cat,
            "district": dist,
            "locality": loc,
            "metadata": {"type": "causal", "cause_dept": expected[0]}
        })
        c_id += 1

    # 2. 100 Independent Multi-Department Cases (Dual & Triple)
    independent_dual_pairs = [
        # KE + KMC
        ("10 din se bejli ni arhi tranforma khrab hai aur hamari gali ki rod bhi tut gai hai.", ["kelectric", "kmc"]),
        ("Khambay se taar toot kar zameen par gir gaya hai current araha hai aur sarak par gehre potholes ban chuke hain.", ["kelectric", "kmc"]),
        # KE + KWSC
        ("Bijli ke feeder tripping ki wajah se andhera hai aur alag se water supply line phat chuki hai peenay ka pani nahi araha.", ["kelectric", "kwsc"]),
        ("Transformer blast ho chuka hai bijli band hai aur doosra masla yeh hai ke gutter ka ganda pani ubal raha hai.", ["kelectric", "kwsc"]),
        # KE + SSGC
        ("Bijli teen din se band hai aur saath hamari gali ki sui gas ka pressure bilkul zero hai chulha nahi jal raha.", ["kelectric", "ssgc"]),
        ("High voltage se appliances jal gayi hain aur doosri taraf gas ki line leak ho rahi hai boo phail rahi hai.", ["kelectric", "ssgc"]),
        # KWSC + KMC
        ("Sewerage line block ho chuki hai badboodar pani jama hai aur footpath par malba para hai pedestrians ke liye rasta band hai.", ["kmc", "kwsc"]),
        ("Water supply line burst ho chuki hai aur gali ki road toot chuki hai asphalt ukhad gaya hai.", ["kmc", "kwsc"]),
        # KWSC + SSWMB
        ("Peenay ka saaf pani do hafton se band hai pipeline dead hai aur gali ke konay par kachray ka dher para hai safai nahi hui.", ["kwsc", "sswmb"]),
        ("Gutter ka dhakkan ghayab hai khula manhole hai aur kachra kundi se badboo dar kachra sadak par bikhra rehta hai.", ["kwsc", "sswmb"]),
        # KMC + SSGC
        ("Sarak par gehra khadda hai asphalt ukhad chuka hai aur gas pipeline se smell arahi hai leak ho rahi hai.", ["kmc", "ssgc"]),
        ("Street light fuses hain andhera rehta hai aur sui gas ka pressure kam hai khana nahi ban raha.", ["kmc", "ssgc"]),
        # KMC + SSWMB
        ("Road toot chuki hai khadday hain aur kachra teen hafton se nahi uthaya gaya gandagi phaili hai.", ["kmc", "sswmb"]),
        ("Footpath toota hua hai aur kachray ka ambar laga hua hai dumper nahi ata.", ["kmc", "sswmb"]),
        # SBCA + KE
        ("Baghair noc aur permit ke extra chhati manzil banayi ja rahi hai aur gali mein transformer se sparks nikal rahe hain.", ["kelectric", "sbca"]),
        # SBCA + KWSC
        ("Commercial plaza illegal tameer ho raha hai residential plot par aur sewerage main line burst ho chuki hai.", ["kwsc", "sbca"]),
        # SBCA + KMC
        ("Building ke pillars mein dangerous cracks hain girne wali hai aur gali ki sarak tooti pari hai.", ["kmc", "sbca"]),
        # SBCA + SSGC
        ("Unauthorized building construction ho rahi hai aur gali mein sui gas ki underground pipeline leak ho rahi hai.", ["sbca", "ssgc"]),
    ]

    # Triple department triples
    independent_triple_triples = [
        ("Bijli 4 din se band hai aur water supply bilkul nahi arahi peenay ka pani band hai aur gali ki road bhi toot chuki hai.", ["kelectric", "kmc", "kwsc"]),
        ("Transformer blast ho chuka hai aur gas bilkul zero pressure hai chulha thanda hai aur kachray ka dher para hai gali mein.", ["kelectric", "ssgc", "sswmb"]),
        ("Road par gehre potholes hain aur sewerage line choke ho chuki hai aur baghair noc ke 5th floor banaya ja raha hai.", ["kmc", "kwsc", "sbca"]),
        ("Street light fuses hain andhera rehta hai aur peenay ka pani nahi araha aur gas pipeline leak ho rahi hai.", ["kelectric", "kmc", "ssgc"]),
        ("Sui gas nahi arahi aur gutter ka pani gali mein beh raha hai aur kachra kundi overflow ho chuki hai.", ["kwsc", "ssgc", "sswmb"]),
    ]

    for i in range(70):
        t_text, expected = independent_dual_pairs[i % len(independent_dual_pairs)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        outro = random.choice(OUTRO_EMOTIONS)
        text = f"{greet} hamare area {loc} mein {t_text} {outro}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "dual_department",
            "category": f"dual_{expected[0]}_{expected[1]}",
            "district": dist,
            "locality": loc,
            "metadata": {"type": "independent_dual"}
        })
        c_id += 1

    for i in range(30):
        t_text, expected = independent_triple_triples[i % len(independent_triple_triples)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        outro = random.choice(OUTRO_EMOTIONS)
        text = f"{greet} hamare area {loc} mein {t_text} {outro}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "triple_department",
            "category": f"triple_{expected[0]}_{expected[1]}_{expected[2]}",
            "district": dist,
            "locality": loc,
            "metadata": {"type": "independent_triple"}
        })
        c_id += 1

    # 3. 100 Misleading Asset-Location Cases
    # Road / street mentioned as spatial location of power wire, gas leak, gutter, garbage, building
    # Should NOT route KMC!
    location_templates = [
        ("Road par bijli ka khamba gir gaya hai aur taar latak rahi hain current lagne ka khatra hai.", ["kelectric"], "road_loc_ke"),
        ("Main sarak ke kinare transformer blast ho gaya hai aag lag gayi hai bijli band hai.", ["kelectric"], "road_loc_ke"),
        ("Chowrangi par bijli ke pole se sparks nikal rahe hain aag lag sakti hai.", ["kelectric"], "road_loc_ke"),
        ("Gali mein high tension taar toot kar latak raha hai.", ["kelectric"], "road_loc_ke"),
        ("Main road ke darmiyan gutter ka dhakkan ghayab hai khula manhole hai.", ["kwsc"], "road_loc_kwsc"),
        ("Sarak par gutter ka ganda pani ubal raha hai poori gali mein badboo phail gayi hai.", ["kwsc"], "road_loc_kwsc"),
        ("Footpath ke samne sewer line choke ho chuki hai paani bahar araha hai.", ["kwsc"], "road_loc_kwsc"),
        ("Chowk par gas pipeline leak ho rahi hai shadeed boo arahi hai dhamaka ho sakta hai.", ["ssgc"], "road_loc_ssgc"),
        ("Road ke kinare sui gas ka meter blast ho gaya gas hiss hiss karke nikal rahi hai.", ["ssgc"], "road_loc_ssgc"),
        ("Gali ke samne gas ki boo phail rahi hai underground leakage hai.", ["ssgc"], "road_loc_ssgc"),
        ("Main road par kachray ka dher para hua hai kachra gaari do hafton se nahi aayi.", ["sswmb"], "road_loc_sswmb"),
        ("Footpath par kachra bikhra rehta hai sweeper nahi ata gandagi phail rahi hai.", ["sswmb"], "road_loc_sswmb"),
        ("Chowrangi ke pas dustbin overflow ho chuka hai kachra kundi se badboo arahi hai.", ["sswmb"], "road_loc_sswmb"),
        ("Main road par ghair qanooni commercial building banayi ja rahi hai baghair noc ke.", ["sbca"], "road_loc_sbca"),
        ("Gali ke corner plot par extra chhati manzil illegal tameer ki ja rahi hai.", ["sbca"], "road_loc_sbca"),
    ]

    for i in range(100):
        t_text, expected, cat = location_templates[i % len(location_templates)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        outro = random.choice(OUTRO_EMOTIONS)
        text = f"{greet} hamare area {loc} mein {t_text} {outro}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "single_department",
            "category": cat,
            "district": dist,
            "locality": loc,
            "metadata": {"type": "asset_location_only", "suppressed": "kmc"}
        })
        c_id += 1

    # 4. 50 Negation and Historical Cases
    negation_templates = [
        # Explicit negation
        ("Bijli ka koi masla nahi hai light bilkul theek arahi hai lekin peenay ka pani nahi araha pipeline band hai.", ["kwsc"], "negation_ke_active_kwsc"),
        ("Pani bilkul theek araha hai water supply ka koi issue nahi lekin gali ki road tooti pari hai khadday hain.", ["kmc"], "negation_kwsc_active_kmc"),
        ("Sarak bilkul theek hai road ka koi masla nahi lekin sui gas ka pressure zero hai chulha nahi jal raha.", ["ssgc"], "negation_kmc_active_ssgc"),
        ("Gas theek aa rahi hai lekin kachra teen hafton se gali mein para hai safai nahi ho rahi.", ["sswmb"], "negation_ssgc_active_sswmb"),
        ("Safai ka koi masla nahi kachra uth chuka hai lekin rihaishi plot par illegal plaza tameer ho raha hai baghair noc ke.", ["sbca"], "negation_sswmb_active_sbca"),
        ("Building ka koi masla nahi hai lekin 10 din se bejli ni arhi transformer khrab hai.", ["kelectric"], "negation_sbca_active_ke"),

        # Historical repairs
        ("Pehle bijli ka masla tha transformer jal gaya tha jo K-Electric walon ne theek kar diya tha ab pani nahi araha.", ["kwsc"], "historical_ke_active_kwsc"),
        ("Gali ki road to pichle hafte theek kar di thi sarak ban gayi thi ab sewer line block ho chuki hai.", ["kwsc"], "historical_kmc_active_kwsc"),
        ("Pani ka masla pehle tha ab theek hai lekin sui gas bilkul band hai.", ["ssgc"], "historical_kwsc_active_ssgc"),
        ("Gas ki leakage to pichle maah repair ho chuki thi ab kachray ka dher para hua hai.", ["sswmb"], "historical_ssgc_active_sswmb"),
    ]

    for i in range(50):
        t_text, expected, cat = negation_templates[i % len(negation_templates)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        outro = random.choice(OUTRO_EMOTIONS)
        text = f"{greet} hamare area {loc} mein {t_text} {outro}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "negation_suppressed",
            "category": cat,
            "district": dist,
            "locality": loc,
            "metadata": {"type": "negation_or_historical"}
        })
        c_id += 1

    # 5. 50 Out-of-Scope or Ambiguous Cases
    out_of_scope_texts = [
        ("Hamare parosi roz raat ko uchi awaz mein music chalate hain police ko call ki koi sunwai nahi hui baraye meherbani police bhejen.", [], "police_dispute"),
        ("Saddar market mein dukaandar bohot mehanga ration bech rahe hain price control committee check kare munafa khori band karwayen.", [], "price_control"),
        ("Government hospital mein doctors dhang se checkup nahi kar rahe dawaiyan bahar se khareedne ko kehte hain health ministry action le.", [], "hospital_health"),
        ("Private school walon ne fees double kar di hai education department ko notice lena chahiye ghareeb kahan jayein.", [], "school_fees"),
        ("National Highway par traffic police walay na haq challan kaat rahe hain rishwat mangte hain IG Sindh notice lein.", [], "traffic_police"),
        ("Hamari property par qabza mafia ne qabza kar liya hai civil court mein case chal raha hai magistrate case hal karwayen.", [], "property_dispute"),
        ("Mohallay mein awara larke kharay ho kar aurton ko tang karte hain police chowki walay koi petroling nahi karte.", [], "harassment_police"),
        ("NADRA office mein CNIC banwane ke liye 8 ghante line mein lagna parta hai staff badtameezi karta hai.", [], "nadra_federal"),
        ("Passport office mein agent mafia active hai baghair rishwat ke passport nahi banta DG passport notice lein.", [], "passport_federal"),
        ("K-Electric aur Sui Gas walon ne bill bohot zyada bhej diya hai itna unit use nahi kiya tax wapis karwayen consumer court.", [], "billing_dispute"),
    ]

    ambiguous_texts = [
        ("Bohot bura haal hai hamare area mein koi nahi sunta sab barbaad ho gaya hai.", [], "ambiguous_vague"),
        ("Zindagi azaab ban chuki hai 10 din se zalil ho rahe hain koi administrative hal nahi nikal raha.", [], "ambiguous_vague"),
        ("Awam ko pagal bana rakha hai tax letay hain aur kaam kuch nahi karte.", [], "ambiguous_vague"),
        ("Hum pareshan hain har taraf azaab hai authorities se darkhwast hai foran team bhejen.", [], "ambiguous_vague"),
        ("Hamara masla hal karwayen urgent basis par kal tak team bhej dain shukriya.", [], "ambiguous_vague"),
    ]

    for i in range(30):
        t_text, expected, cat = out_of_scope_texts[i % len(out_of_scope_texts)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        text = f"{greet} hamare area {loc} mein {t_text}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "out_of_scope",
            "category": cat,
            "district": dist,
            "locality": loc,
            "metadata": {"type": "out_of_scope"}
        })
        c_id += 1

    for i in range(20):
        t_text, expected, cat = ambiguous_texts[i % len(ambiguous_texts)]
        greet = random.choice(GREETINGS)
        loc, dist = random.choice(LOCALITIES)
        text = f"{greet} hamare area {loc} mein {t_text}"
        cases.append({
            "id": f"v13_4_dev_{c_id:04d}",
            "text": text,
            "expected": expected,
            "complexity": "ambiguous",
            "category": cat,
            "district": dist,
            "locality": loc,
            "metadata": {"type": "ambiguous"}
        })
        c_id += 1

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')

    # Hash calculation
    with open(OUTPUT_FILE, 'rb') as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    print(f"Generated {len(cases)} development cases at: {OUTPUT_FILE}")
    print(f"SHA-256 Digest: {sha256}")

if __name__ == '__main__':
    generate_dev_suite()
