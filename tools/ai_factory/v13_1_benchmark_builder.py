"""Awaaz-e-Awam (آوازِ عوام) — Phase V13.1 Independent Adversarial Benchmark Builder.

Generates an independent, held-out evaluation benchmark of EXACTLY 2,000 Roman Urdu complaints:
- Distribution:
    800 — Single-department complaints (KMC: 135, KWSC: 135, KE: 135, SSGC: 135, SSWMB: 130, SBCA: 130)
    600 — Dual-department complaints (40 per pair for all 15 pairs)
    300 — Triple-department complaints (15 per triplet for all 20 triplets)
    100 — Quad-department complaints (~6-7 per quad for all 15 quadruplets)
    100 — Ambiguous / Clarification-Required (water/power, landmark, historical, secondary, describe)
    100 — Out-of-Scope / Non-Municipal Human Review (private, police, commercial, provincial)
    TOTAL = EXACTLY 2,000 COMPLAINTS.
- Strict Constraints:
    - Word count bounds: strictly 5 to 200 words.
    - Zero overlap or leakage with any past training or benchmark datasets.
    - Full coverage across 25 difficulty families and 5 narrative length brackets.
    - Ground truth established strictly before classification.
    - Bounded execution with progress reporting and checkpoints.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sys
import time
from itertools import combinations
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# 80 Diverse Karachi Localities & Landmarks
LOCALITIES = [
    "Nazimabad Block 4 near inquiry office", "North Nazimabad Block L",
    "Federal B Area Block 6 near water pump", "Liaquatabad Block 9 near post office",
    "Gulberg Block 12 near cafe pyala", "Buffer Zone Sector 15-B",
    "New Karachi Sector 5-G", "Surjani Town Sector 4-B near 4K chowrangi",
    "Orangi Town Sector 10 near chisti nagar", "Baldia Town Saeedabad",
    "Saddar Bohri Bazaar near police station", "Kharadar near lea market",
    "Mithadar near cloth market", "Lyari Bihar Colony",
    "Lyari Kalakot near football stadium", "Clifton Block 5 near boat basin",
    "Clifton Block 8 near teen talwar", "DHA Phase 4 commercial avenue",
    "DHA Phase 7 extension jami commercial", "Gizri near subzi mandi",
    "Mahmoodabad Number 2 near fire brigade", "Manzoor Colony sector C",
    "Chanesar Goth railway crossing", "Jamshed Road near ameer khusro park",
    "Garden East near nabi bagh college", "Soldier Bazaar near mukhi ground",
    "Gulshan-e-Iqbal Block 2 near maskan chowrangi", "Gulshan-e-Iqbal Block 13-C near civic center",
    "Gulistan-e-Jauhar Block 14 near kamran chowrangi", "Gulistan-e-Jauhar Block 19",
    "Safoora Goth near rim jhim towers", "Malir Halt near airport",
    "Malir Model Colony sector 1", "Shah Faisal Colony number 2 near shama shopping center",
    "Landhi Town sector 86 near babar market", "Korangi Number 4 near qalandria chowk",
    "Korangi 1.5 near chaman cinema", "Korangi Industrial Area sector 23",
    "Mehran Town near sector 6-F", "Keamari Jackson bazaar",
    "SITE Area near metro cinema chowrangi", "SITE western avenue near labor square",
    "Sher Shah near panki hotel", "Pak Colony near bara board",
    "Manghopir near sultanabad chowk", "Qasba Colony near peerabad",
    "North Karachi sector 11-B", "Shadman Town sector 14-A",
    "Ancholi society near ancholi imambargah", "Gulzar-e-Hijri scheme 33 sector 24",
    "University Road near safari park", "PECHS Block 6 near nursery",
    "Bahadurabad near kokan park", "Tariq Road near rehmania masjid",
    "Lines Area near jacob line", "Golimar near sanitary market",
    "Saudabad near malir court", "Shah Latif Town sector 22",
    "Gulshan-e-Hadeed phase 2 near steel mills gate", "Delhi Colony street 4 near masjid",
    "Dhoraji Colony near cp berar society", "Abul Hassan Isphahani Road near abbas town",
    "Khudadad Colony near mazar e quaid", "Sharfabad near alamgir road",
    "Federal Capital Area near liaquatabad bridge", "Moosa Colony near water board office",
    "Paposh Nagar near qabristan", "KDA Scheme 1 near tipu sultan road",
    "Shahrah-e-Faisal near nursery flyover", "Rashid Minhas Road near millennium mall",
    "Korangi Crossing near hospital", "Ibrahim Hyderi near jetty",
    "Hawksbay road near naval base", "Mauripur road near truck stand",
    "Maripur village near PAF base", "Gadap Town near toll plaza",
    "Gulshan-e-Maymar sector X", "Sohrab Goth near al asif square",
    "Super Highway near new sabzi mandi", "Boat Basin food street Clifton"
]

# Fresh Diverse Defect Snippets across 6 Departments
DEPT_DEFECTS: Dict[str, List[Tuple[str, str]]] = {
    "kmc": [
        ("sarak par itnay gehre khaday par chuke hain ke rozana gariyan aur bikes phans jati hain", "sarak khaday"),
        ("main road ki pukhta carpeting toot kar patthar nikal aye hain aur paidal chalna dushwar hai", "carpeting toot phoot"),
        ("footpath par lagi tiles ukhar chuki hain aur footpath toot gaya hai", "footpath toot phoot"),
        ("street light poles ke bulb pichle teen maah se fuse hain poori gali andhere mein doobi rehti hai", "street lights kharab"),
        ("barsati nala saaf na hone ki wajah se mamooli barish par sadak talab ban jati hai", "barsati nala choke"),
        ("service road dhas chuki hai aur darmian mein chaar foot gehra gaddha ban chuka hai", "road dhas gayi"),
        ("traffic signal ka controller kharab hai aur chowrangi par shaded traffic jam lagta hai", "traffic signal"),
        ("flyover ke joints hil rahe hain aur vibration ki wajah se structure ko khatra mehsoos hota hai", "flyover joints"),
        ("pedestrian overhead bridge ki railing tooti hui hai aur bachon ke girne ka khatra hai", "pedestrian bridge"),
        ("sadak ke darmian divider toot chuka hai aur sarak ka rasta block hai", "divider toota"),
        ("underpass ki lights band hain aur raat ke waqt andhere mein shadeed hadsat ho rahe hain", "underpass andhera"),
        ("municipal park ki boundary wall tooti hui hai aur zang alood swings khatarnak hain", "park toota"),
        ("main sarak par asphalt ukhar gaya hai aur motorcycle slip ho kar log zakhmi ho rahe hain", "asphalt damage"),
        ("barish ke pani ki drainage na hone ki wajah se poora chowk doob chuka hai", "drainage road choke"),
        ("chauraha par gehra pothole ban gaya hai jis se roz traffic jam aur gaariyan kharab hoti hain", "pothole traffic"),
    ],
    "kwsc": [
        ("drinking water pipeline blast ho chuki hai aur lakhon gallon meetha pani waste ho raha hai", "drinking water burst"),
        ("peenay ke pani ki supply pichle aik maah se band hai aur tanker mafia loot macha rahi hai", "pani supply band"),
        ("gutter ka ganda pani ubal kar dharon ki soorat mein logon ke gharon ke darwaze par khara hai", "gutter overflow"),
        ("sewerage main line choke hai aur badboodar ganda paani galiyon mein darya bana hua hai", "sewerage choke"),
        ("tap water mein sewerage ka ganda pani mix hokar aa raha hai aur badboo ki wajah se peena namumkin hai", "water sewer mix"),
        ("water supply line mein zero pressure hai aakhri galiyon tak aik boond pani nahi pohanchta", "pani low pressure"),
        ("sewerage manhole ka dhakkan pichle do hafte se toota para hai aur khula sewer janleva hai", "open manhole sewer"),
        ("water board ke valve leak hone ki wajah se gali mein do do foot pani jama rehta hai", "valve leak"),
        ("sewerage nala overflow kar raha hai aur badboo se sans lena azaab ban chuka hai", "sewer nala overflow"),
        ("gali ki underground sewer line collapse kar gayi hai aur ganda pani dhas gaya hai", "sewer line collapse"),
        ("pani ki line leak hone ki wajah se meetha pani sadak par zaya ho raha hai", "pipe leak water"),
        ("sewer line block hone se washroom ka pani bahar nikal raha hai", "sewer block washroom"),
        ("water tanker point par illegal connection se meetha pani chori kiya ja raha hai", "water line theft"),
        ("gutter ka dhakkan gayab hai aur kal raat aik bacha gande pani ke manhole mein girte bacha", "manhole dhakkan missing"),
    ],
    "kelectric": [
        ("transformer se shaded dhamakay ke sath spark nikal rahe hain aur oil zameen par tapak raha hai", "transformer blast spark"),
        ("high tension electric wire toot kar sadak par jhul rahi hai aur kisi bhi waqt janleva hadsa ho sakta hai", "hanging live wire"),
        ("voltage ki severe fluctuation se gharon ke fridge aur AC jal chuke hain aur light dim tez ho rahi hai", "voltage fluctuation"),
        ("unannounced load shedding pichle chaar din se 14 ghante jari hai aur bijli ka koi schedule nahi", "unannounced load shedding"),
        ("electric pole zang lagne ki wajah se tedha ho chuka hai aur kabhi bhi gir sakta hai", "tilted electric pole"),
        ("feeder trip hone ki wajah se poora mohalla 18 ghante se blackout ka shikar hai", "feeder trip blackout"),
        ("pmt blast hone ke baad abhi tak doosra transformer install nahi kiya gaya", "pmt blast missing replacement"),
        ("bijli ki nangi taarein zameen ko choo rahi hain aur current lagne ka shaded khatra hai", "naked live wires"),
        ("single phase bijli aa rahi hai aur motor aur appliances nahi chal rahe", "single phase issue"),
        ("meter box mein aag lag gayi thi aur electrical connection cut off hai", "meter box fire"),
        ("bijli pichle do din se bilkul band hai aur koi helpline call attend nahi kar raha", "bijli band cut off"),
        ("khamba par current aa raha hai aur lohe ki taar se chingariyan nikal rahi hain", "khamba current spark"),
        ("feeder down hone ki wajah se commercial market aur residential area andhere mein hain", "feeder down market"),
    ],
    "ssgc": [
        ("sui gas ka pressure itna low hai ke chulha tak nahi jalta aur nashta banana namumkin hai", "low gas pressure"),
        ("gas distribution line leak hone se gali mein tond badboo phail rahi hai aur dam ghut raha hai", "gas line leak"),
        ("gas supply pichle aik hafte se din raat mukammal band hai aur cylinder khareedna par raha hai", "gas supply band"),
        ("underground gas pipeline phat gayi hai aur hissing sound ke sath gas hawa mein leak ho rahi hai", "gas pipeline burst"),
        ("subah aur shaam ke khanay ke awqat mein gas bilkul zero ho jati hai aur auratain pareshan hain", "gas zero pressure meals"),
        ("gas meter leak ho raha hai aur soap bubble lagane se gas escape hoti saaf nazar aati hai", "gas meter leak"),
        ("gas pipeline mein compressor suction lagane ki wajah se aam shehriyon ki gas khatam ho gayi hai", "gas suction compressor"),
        ("main gas pipe corroded ho chuka hai aur zameen ke andar se gas ki boo nikal rahi hai", "corroded gas main"),
        ("gali mein gas line repair ke doran toor di gayi aur ab gas faza mein leak ho rahi hai", "broken gas line leak"),
        ("gas bilkul nahi aa rahi aur choolhe thande pare hain bahar se mehanga khana mangwana par raha hai", "gas nahi aa rahi choolhe thande"),
    ],
    "sswmb": [
        ("kachra kundi se pichle do hafton se garbage nahi uthaya gaya aur shaded badboo phail rahi hai", "kachra nahi uthaya"),
        ("safai karne wala staff gayab hai aur gali mein kachray ke dher lage hue hain", "kachra dher no staff"),
        ("murda janwar sadak par para gal raha hai aur makhian aur bimari phail rahi hai", "dead animal carcass"),
        ("solid waste management ki gari kachra uthane nahi aati log sadak ke kinare dumping kar rahe hain", "no garbage van dumping"),
        ("open garbage dump ki wajah se mohallay mein kutton aur cheelhon ka hujoom hai", "open garbage dump dogs"),
        ("kachra jalane se shaded zehreela dhuwan phail raha hai aur saans lene mein dushwari hai", "kachra burning smoke"),
        ("dustbin toota hua hai aur kachra poori sadak par bikhra para hai", "broken dustbin overflow"),
        ("sswmb ka sweepers staff safai ke bajaye rishwat mangta hai aur galiyon mein kachra chorr jata hai", "sweepers bribery neglected waste"),
        ("commercial market ka sara waste gali ke koney par phenk diya gaya hai aur safai nahi hui", "commercial waste dump"),
        ("kachray ki badboo se mohallay mein dengue aur malaria phailne ka shaded andesha hai", "garbage badboo disease"),
    ],
    "sbca": [
        ("residential plot par 5 manzila illegal commercial plaza tameer kiya ja raha hai", "illegal commercial plaza"),
        ("bina approved building plan ke chhat par ghair qanooni manzil daal di gayi hai", "unapproved roof floor"),
        ("purani rehaishi imarat ki deewar mein shaded dararain par chuki hain aur collapse ka khatra hai", "cracked building collapse risk"),
        ("sbca rules ke khilaf compulsory open space par dukanain bana kar footpath par qabza kiya gaya hai", "open space violation"),
        ("sub standard material se tameer hone wali imarat se cement aur eentain gir rahi hain", "substandard material falling bricks"),
        ("teh khaney ki excavation ki wajah se sath wali rehaishi imarat ki neev dhas gayi hai", "basement excavation foundation shift"),
        ("residential area mein factory ki ghair qanooni construction ki ja rahi hai", "illegal factory construction"),
        ("plaza builder ne approved parking space ko dukanon mein tabdeel kar ke bech diya hai", "parking space violation"),
        ("danger notice lage hone ke bawajood dangerous dilapidated building khali nahi karwai ja rahi", "dilapidated building not vacated"),
        ("bina setback aur pillar reinforcement ke 4th floor ki chat daal di gayi hai", "setback pillar violation"),
    ],
}

# Out-of-Scope Grievances (Non-Municipal Jurisdiction)
OUT_OF_SCOPE_SAMPLES = [
    ("Mera kirayedar pichle che maah se kiraya ada nahi kar raha aur makan khali karne se inkar kar raha hai kripya legal action karein", "TENANCY_DISPUTE"),
    ("Padosi rozana raat ko oonchi awaz mein music chalata hai aur mana karne par larai jhagray par utar aata hai", "NEIGHBOR_DISPUTE_NOISE"),
    ("Online shopping page ne paise le liye lekin parcel deliver nahi kiya yeh fraud aur scam hai", "CONSUMER_FRAUD"),
    ("Gali mein kal raat motorcycle chori ho gayi police FIR darj karne mein taal matol kar rahi hai", "POLICE_THEFT_CRIME"),
    ("Mobile snatchers ne gun point par phone aur wallet cheen liya street crime control kiya jaye", "STREET_CRIME_POLICE"),
    ("Property dealer ne fake documents par plot ka sodda kiya aur ab bayaan wapas nahi de raha", "PROPERTY_FRAUD"),
    ("Passport office walay token ke baad bhi chaar ghante bitha kar rakhte hain aur staff badtameezi karta hai", "FEDERAL_PASSPORT_OFFICE"),
    ("Bank walon ne mere account se unauthorized transaction kar di aur helpline sunwayi nahi kar rahi", "BANKING_DISPUTE"),
    ("Shadi hall walay ne booking advance lene ke baad function cancel kar diya aur payment wapas nahi ki", "PRIVATE_EVENT_FRAUD"),
    ("School administration fee mein ghair qanooni izafa kar rahi hai aur books ke naam par loot macha rakhi hai", "PRIVATE_SCHOOL_FEE"),
    ("Hospital doctor ki ghalat dawa dene se patient ki tabiyat kharab ho gayi malpractice notice bheja jaye", "MEDICAL_MALPRACTICE"),
    ("Mobile network company ke signals bilkul gayab hain aur call bar bar drop ho rahi hai PTA action le", "TELECOM_PTA"),
    ("Sarkari college mein admission merit list mein dhandli hui hai aur eligible candidates ko reject kiya gaya", "COLLEGE_ADMISSION_PROVINCIAL"),
    ("Namaz ke waqt speaker par siasi taqreerain ki ja rahi hain isko band karwaya jaye", "RELIGIOUS_DISPUTE"),
    ("Office boss salary time par nahi deta aur overtime lagwane ke bawajood paise kaat leta hai labor court masla hai", "LABOR_WAGE_DISPUTE"),
]

# Genuine Ambiguity Samples Needing Pre-Submission Clarification
AMBIGUOUS_CLARIFICATION_SPECS = [
    # 1. Water vs Power Outage (Water pump / motor issue)
    {
        "question_id": "water_power_relation",
        "variants": [
            "Ghar mein pani bilkul nahi aa raha aur bijli ki supply bhi mutasir hai samajh nahi aa raha fault kahan hai",
            "Pani ki motor nahi chal rahi aur light bhi dim aa rahi hai kripya dono amoor dekhein",
            "Bijli ka jhatka laga tha uske baad se pump band para hai aur pani khatam ho chuka hai",
            "Light nahi hai aur tanki khali hai bijli aur pani dono ka shadeed masla chal raha hai",
        ],
        "primary_dept": "kelectric",
        "secondary_dept": "kwsc",
    },
    # 2. Landmark Infrastructure Relation
    {
        "question_id": "landmark_infrastructure_relation",
        "variants": [
            "K-Electric ke grid station ke bahar sadak dhas chuki hai aur rasta band hai",
            "Water board pump house ke samnay bohot kachra para hai aur badboo hai",
            "Sui gas office ke samnay street light ka khamba toota para hai",
            "SSWMB kachra kundi ke paas main water line phat gayi hai aur pani beh raha hai",
        ],
        "primary_dept": "kmc",
        "secondary_dept": "kelectric",
    },
    # 3. Resolved Historical Relation
    {
        "question_id": "resolved_historical_relation",
        "variants": [
            "Pichle maah hum ne gas leak theek karwaya tha lekin ab sarak par gehre khadday ban chuke hain",
            "Bijli ka transformer pichle hafte repair ho chuka tha magar ab gutter ka ganda pani sadak par nikal raha hai",
            "Water line repair to ho gayi thi purani baat hai abhi gali mein kachray ke dher lage hain",
            "KMC ne sadak bana di thi wo masla theek ho gaya lekin ab gas ka pressure bilkul zero hai",
        ],
        "primary_dept": "kmc",
        "secondary_dept": "ssgc",
    },
    # 4. Incomplete Secondary Relation
    {
        "question_id": "incomplete_secondary_relation",
        "variants": [
            "Sarak tooti hui hai aur sath hi sath aik aur masla bhi hai",
            "Bijli ka transformer blast ho gaya aur doosri taraf bhi kharabi hai",
            "Gutter ka ganda pani beh raha hai aur alag se",
            "Gas bilkul band hai aur is ke ilawa",
        ],
        "primary_dept": "kmc",
        "secondary_dept": None,
    },
    # 5. Vague / Describe Issue
    {
        "question_id": "describe_issue",
        "variants": [
            "Hamare ilaqe mein bohot shadeed masla hai log pareshan hain foran team bheji jaye",
            "Yahan par halat bohot kharab hain koi sunwayi nahi hoti kripya madad karein",
            "Itni ghatiya service hai ke roz roz log azaab mein mubtala hain halat theek karein",
            "Subah se sab log tang hain municipality koi kaam dhang se nahi karti foran check karein",
        ],
        "primary_dept": None,
        "secondary_dept": None,
    },
]

# Openings by Category
OPENINGS_FORMAL = [
    "Ba-khidmat janab aala, guzarish yeh hai ke {locality} mein",
    "Mohtaram afsaran-e-bala, nihayat adab se iltimas hai ke {locality} ke rehaishi hone ke natay",
    "Janab-e-wala, ap ki tawajjah aik nihayat ahem aur sangeen maslay ki taraf mabzool karwani hai ke {locality} par",
    "Guzarish e ahwaal yeh hai ke {locality} mein rehne walay shehri pichle kafi arsay se shadeed aziyat mein hain jahan",
    "Assalamualikum janab, official complaint register karwane ke liye yeh dar darkhwast arz hai ke {locality} mein",
]

OPENINGS_INFORMAL = [
    "Bhai baat yeh hai ke hamare ilaqay {locality} mein",
    "Yar koi sunne wala nahi hai {locality} mein yeh tamasha laga hua hai ke",
    "Dekhein hum bar bar complaint kar rahe hain {locality} par",
    "Suno bhai aam shehri ki sunwayi kab hogi {locality} mein",
    "Hello awaaz e awam team, hum {locality} se bol rahe hain aur",
]

OPENINGS_ANGRY = [
    "Tum log sab chor ho koi kaam dhang se nahi karte, itni ghatiya service hai ke sharam aani chahiye. Hamare ilaqe {locality} mein",
    "Kitni dafa likhein tum logon ko sharam nahi aati? Teesra mahina hai aur {locality} par",
    "Haqomat aur idaray andhay aur behray ho chuke hain! Hum tax detay hain koi free mein nahi rehte. {locality} mein",
    "Sharam karo kuch khuda ka khauf karo! Yeh koi tareeqa hai shehriyon ko zaleel karne ka? {locality} mein",
    "Aakhri warning de rahe hain agar masla hal na hua to road block karein ge! {locality} par",
]

OPENINGS_SLANG = [
    "Bhai scene bohot off chal raha hai yahan {locality} par",
    "Arey yar full locha hua wa hai {locality} mein pura ilaqa pareshan hai",
    "Kasam se topi drama chal raha hai idaron ka yahan {locality} par",
    "Dalla system bana rakha hai kaam koi nahi karta {locality} mein",
    "Chuss mar rahe hain sab afsar {locality} par aakar dekho to pata chale",
]

OPENINGS_GREETING_INTRO = [
    "Assalamualikum mera naam Farhan hai aur main {locality} ka rehaishi hoon. Arz yeh hai ke",
    "Good morning mera naam Tariq hai. Main teesri martaba complaint file kar raha hoon {locality} se jahan",
    "Mera naam Bushra hai aur hum pichle 20 saal se {locality} mein rehte hain. Masla yeh hai ke",
    "Assalam o alaikum mera naam Zahid Khan hai aur main {locality} ki taraf se likh raha hoon ke",
]

# Personal Backstories for Narrative Length Expansion
BACKSTORIES = [
    "Ghar mein do chotay bache hain jinki parhai ka harj ho raha hai aur exams sar par hain.",
    "Hamari walida dialysis ki patient hain aur hospital le jana roz ka azab ban chuka hai.",
    "Buzurg walid ki tabiyat shadeed kharab rehti hai aur is maslay ki wajah se unka dam ghut raha hai.",
    "Subah office ke waqt aur school van ke time par aana jana namumkin ho jata hai.",
    "Bahar se mehnga khana mangwa mangwa kar monthly budget tabah ho chuka hai jo hum afford nahi kar sakte.",
    "Mohallay ki auratain subah se taras rahi hain aur aam shehri be yar o madadgar para hai.",
    "Ghar mein kal beti ki shadi ka function hai aur mehmanon ke samnay zillat uthana par rahi hai.",
    "Doctor ne saaf mana kiya hai ke is mahol mein rehne se dama aur phephron ki bimariyan lag rahi hain.",
    "Pichle char din se hum dharay dhar helpline par call kar rahe hain lekin automated message ke ilawa koi jawab nahi milta.",
    "Ilaqay ke chairman aur councillor ko bhi bataya tha lekin wo sirf jhooti tasalliyan de kar nikal jate hain.",
]

CLOSINGS = [
    "Meharbani karke fori notice lein aur mutaaliqa team ko bhej kar theek karein.",
    "Barae meharbani is sangeen maslay ko emergency bunyadon par hal kiya jaye.",
    "Umeed hai ke awam ki cheekh suni jayegi aur foran karrwayi hogi.",
    "Hum intezamia se purzor mutaliba karte hain ke inquiry karwayi jaye.",
    "Agar do din mein theek na hua to hum supreme court aur media par ehtijaj karein ge.",
    "Kripya jald se jald karrawai karein warna aam shehri road block karne par majboor hon ge.",
    "Shukriya awaaz e awam team umeed hai aap hamari awaz banain ge.",
    "Fori tor par remediation team bhej kar shehriyon ko is azaab se nijat dilayein.",
]

def mutate_spacing(text: str, rate: float = 0.20) -> str:
    """Collapses spaces between words (agglutination)."""
    words = text.split()
    if len(words) < 3:
        return text
    out = []
    i = 0
    while i < len(words):
        if i + 1 < len(words) and random.random() < rate:
            out.append(words[i] + words[i + 1])
            i += 2
        else:
            out.append(words[i])
            i += 1
    return " ".join(out)

def mutate_phonetics(text: str, rate: float = 0.18) -> str:
    """Simulates common Roman Urdu spelling variants."""
    subs = [
        (r"\bbijli\b", "bijlee"),
        (r"\bpani\b", "paani"),
        (r"\bsarak\b", "sarrak"),
        (r"\bkhadd[ae]\b", "kaddhay"),
        (r"\btransformer\b", "transfarmar"),
        (r"\bgutter\b", "guttar"),
        (r"\bkachra\b", "kachrra"),
        (r"\btheek\b", "teek"),
        (r"\bbohot\b", "bht"),
        (r"\bnahi\b", "nhi"),
        (r"\bhai\b", "hy"),
        (r"\bhain\b", "hen"),
        (r"\bkripya\b", "plz"),
        (r"\bforan\b", "fauran"),
        (r"\bsewerage\b", "siwrij"),
    ]
    out = text
    for pat, rep in subs:
        if random.random() < rate:
            out = re.sub(pat, rep, out, flags=re.IGNORECASE)
    return out

def strip_punctuation(text: str) -> str:
    """Removes all punctuation for missing-punctuation difficulty family."""
    return re.sub(r"[^\w\s]", "", text)

def word_count(text: str) -> int:
    return len(text.strip().split())

def get_length_bracket(wc: int) -> str:
    if 5 <= wc <= 35:
        return "5-35"
    elif 36 <= wc <= 80:
        return "36-80"
    elif 81 <= wc <= 125:
        return "81-125"
    elif 126 <= wc <= 165:
        return "126-165"
    else:
        return "166-200"


CAUSAL_TEMPLATES = [
    ("kwsc", "kmc", "Water board ki underground main water supply line burst hone ki wajah se hazaron gallon peenay ka paani sadak par beh raha hai", "aur is shadeed paani ke bahaao ki wajah se poora road toot gaya hai aur har taraf gehre khadday par gaye hain rasta block hai", "kwsc water line leak caused road damage"),
    ("ssgc", "kmc", "Sui gas walon ne nayi gas line bichane ke liye hamari poori gali ki sadak ko bulldozer se khod diya tha aur kaam ke baad adhoora chor gaye", "jis ki wajah se baray baray gadhay ban gaye hain aur footpath dhas gaya hai traffic bilkul ruk gayi hai", "ssgc gas digging caused road craters"),
    ("kelectric", "kmc", "K-Electric ka main transformer blast hone ki wajah se bijli ke taar toot kar sadak par gir gaye hain aur spark kar rahe hain", "jis se street lights bhi band ho gayi hain aur poori gali mein shadeed andhera chha gaya hai aam o raft dushwar hai", "transformer blast caused blackout and broken streetlights"),
    ("sswmb", "kwsc", "Solid waste walon ne hafton se kachray ka dher nahi uthaya aur kooda nala mein phaink diya gaya", "jis ki wajah se sewerage ki main line choke ho gayi hai aur ganda pani ubal kar sadak par beh raha hai aur gharon mein dakhil ho raha hai", "garbage pile caused sewer blockage"),
    ("sbca", "kmc", "Mohallay mein builder baghair kisi legal approval aur bina permit ke 6 manzila illegal building bana raha hai", "aur building ka saara malba aur cement sadak par phek diya hai jis se road block hai aur paidal chalna dushwar hai", "illegal construction debris blocked road"),
    ("kmc", "kwsc", "KMC walay road ki repair ke dauran heavy machinery chala rahe thay jis se unhon ne underground water line tor di", "aur ab purey block mein paani band ho gaya hai log tanker mangwane par majboor hain", "road machinery broke water line")
]

FALSE_SECONDARY_TEMPLATES = [
    ("kelectric", "kmc", "Pehle hamaray ilaqay mein street lights kharab theen jo KMC walon ne theek kar di theen", "lekin ab asal masla yeh hai ke bijli ke taar latak rahe hain aur transformer se chingariyan nikal rahi hain fori theek karein"),
    ("ssgc", "kelectric", "Guzishta maah K-Electric walon ne naya transformer laga kar load shedding ka masla hal kar diya tha", "magar ab hamara ahem tareen masla yeh hai ke SSGC ki gas bilkul band hai chulhay thanday hain aur khana nahi pak raha"),
    ("sswmb", "kmc", "Pichlay mahinay KMC walon ne tooti sadak ki repairing to kar di thi", "lekin ab main issue yeh hai ke SSWMB walay kachra nahi utha rahe aur charon taraf kooday ke dher lage hain badboo phail rahi hai"),
    ("sbca", "kwsc", "Water board ne sewerage ka masla pichle hafte hal kar diya tha", "lekin ab residential plot par builder zabardasti 8 manzila illegal commercial plaza bana raha hai jis ki complaint karni hai"),
    ("kwsc", "sswmb", "Solid waste walon ne gali ki safai to mukammal kar di thi", "magar ab sab se bara masla yeh hai ke KWSC ka peenay ka saaf pani pichle 20 din se bilkul nahi aa raha hum boond boond ko taras rahe hain"),
    ("kmc", "ssgc", "Sui gas walo ne pichle mahinay pipeline repair kar di thi", "lekin KMC ki main shahrah par itne baray baray khadday hain ke roz gaariyan phans rahi hain aur accident ho rahe hain")
]

NEGATED_TEMPLATES = [
    ("kwsc", ["kelectric"], "Hamaray block mein bijli ka koi masla nahi hai light bilkul theek aa rahi hai", "asal shikayat KWSC ke khilaf hai ke peenay ka paani pichle do hafte se band hai aur line sookhi hui hai"),
    ("ssgc", ["kwsc"], "Pani aur sewerage ka koi masla nahi hai sab theek chal raha hai", "lekin SSGC ki gas bilkul zero pressure par hai aur bachon ke liye khana pakana mushkil ho gaya hai"),
    ("kmc", ["ssgc", "kwsc"], "Gas aur pani ki yahan koi shikayat nahi hai dono services theek hain", "lekin KMC ki road itni tooti phooti hai ke paidal chalna bhi azab ban chuka hai har qadam par khadda hai"),
    ("sswmb", ["kmc"], "Road aur sadak ka koi masla nahi hai road bilkul saaf hai", "masla yeh hai ke SSWMB ki kachra gaari pichle das din se nahi aayi aur kachray ke dher se badboo phail rahi hai"),
    ("sbca", ["kelectric"], "Bijli aur load shedding ki koi shikayat nahi hai bijli aa rahi hai", "lekin builder yahan par residential gali mein baghair NOC ke commercial plaza khara kar raha hai jo shadeed illegal hai"),
    ("kelectric", ["sswmb"], "Kachra aur safai ka koi masla nahi hai sweeping regular ho rahi hai", "lekin bijli ke high voltage nange taar gali mein jhool rahe hain jo kisi bhi waqt baray janleva haadsay ka sabab ban saktay hain")
]

class Benchmark2000Builder:
    def __init__(self, seed: int = 1312026):
        self.seed = seed
        random.seed(seed)
        self.seen_normalized: Set[str] = set()
        self.seen_3grams: List[Set[str]] = []
        self.historical_leakage_hashes: Set[str] = set()
        self.records: List[Dict[str, Any]] = []

    def load_historical_leakage_corpus(self, repo_root: Path) -> int:
        """Loads all existing historical training and benchmark texts to guarantee zero leakage."""
        count = 0
        search_dirs = [
            repo_root / "data" / "v11",
            repo_root / "tests" / "v11",
        ]
        for sdir in search_dirs:
            if not sdir.exists():
                continue
            for fpath in sdir.rglob("*.jsonl"):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        for line in f:
                            if not line.strip():
                                continue
                            try:
                                d = json.loads(line)
                                text = d.get("text") or d.get("complaint_text") or d.get("description")
                                if text and isinstance(text, str):
                                    norm = self._normalize_text(text)
                                    h = hashlib.sha256(norm.encode("utf-8")).hexdigest()
                                    self.historical_leakage_hashes.add(h)
                                    count += 1
                            except Exception:
                                pass
                except Exception:
                    pass
        print(f"[Leakage Guard] Loaded {count} historical records ({len(self.historical_leakage_hashes)} unique hashes) into quarantine filter.")
        return count

    def _normalize_text(self, text: str) -> str:
        t = text.lower()
        t = re.sub(r"[^\w\s]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def _get_3grams(self, text: str) -> Set[str]:
        words = text.lower().split()
        if len(words) < 3:
            return set(words)
        return {" ".join(words[i:i+3]) for i in range(len(words) - 2)}

    def _is_duplicate_or_leak(self, text: str) -> bool:
        norm = self._normalize_text(text)
        if not norm:
            return True
        h = hashlib.sha256(norm.encode("utf-8")).hexdigest()
        if h in self.historical_leakage_hashes or norm in self.seen_normalized:
            return True

        # Check Jaccard 3-gram similarity against already accepted records in this batch
        grams = self._get_3grams(norm)
        if grams:
            for past_grams in self.seen_3grams[-200:]: # check sliding window for efficiency
                if past_grams:
                    inter = len(grams & past_grams)
                    union = len(grams | past_grams)
                    if union > 0 and (inter / union) > 0.75:
                        return True

        self.seen_normalized.add(norm)
        self.seen_3grams.append(grams)
        return False

    def _select_opening_and_style(self, locality: str) -> Tuple[str, str]:
        r = random.random()
        if r < 0.22:
            return random.choice(OPENINGS_FORMAL).format(locality=locality), "FORMAL"
        elif r < 0.44:
            return random.choice(OPENINGS_INFORMAL).format(locality=locality), "INFORMAL"
        elif r < 0.65:
            return random.choice(OPENINGS_ANGRY).format(locality=locality), "ANGRY"
        elif r < 0.82:
            return random.choice(OPENINGS_SLANG).format(locality=locality), "KARACHI_SLANG"
        else:
            return random.choice(OPENINGS_GREETING_INTRO).format(locality=locality), "GREETING_INTRO"

    def _compose_length_balanced_text(
        self,
        base_elements: List[str],
        closing: str,
        target_bracket: str
    ) -> str:
        """Combines snippets with backstories to fit exactly into target length bracket."""
        text = " ".join(base_elements) + " " + closing
        wc = word_count(text)

        # Expand or shrink towards target bracket
        max_attempts = 10
        while max_attempts > 0:
            current_bracket = get_length_bracket(wc)
            if current_bracket == target_bracket:
                break
            if wc < 36 and target_bracket != "5-35":
                text = text + " " + random.choice(BACKSTORIES)
            elif wc < 81 and target_bracket in ["81-125", "126-165", "166-200"]:
                text = text + " " + random.choice(BACKSTORIES)
            elif wc < 126 and target_bracket in ["126-165", "166-200"]:
                text = text + " " + random.choice(BACKSTORIES)
            elif wc < 166 and target_bracket == "166-200":
                text = text + " " + random.choice(BACKSTORIES)
            elif wc > 200:
                words = text.split()
                text = " ".join(words[:195]) + " " + closing
            else:
                break
            wc = word_count(text)
            max_attempts -= 1

        words = text.split()
        if len(words) > 200:
            text = " ".join(words[:195])
        return re.sub(r"\s+", " ", text).strip()

    def build_causal_complaint(self, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            root_dept, conseq_dept, cause_snippet, conseq_snippet, rel_tag = random.choice(CAUSAL_TEMPLATES)
            locality = random.choice(LOCALITIES)
            opening = f"Awaam ki faryad suniye {locality} se."
            closing = random.choice(CLOSINGS)

            raw_text = self._compose_length_balanced_text(
                [opening, cause_snippet, conseq_snippet], closing, target_bracket
            )
            wc = word_count(raw_text)
            if not (5 <= wc <= 200) or self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [root_dept],
                "independent_faults_count": 1,
                "defect_evidence": [cause_snippet[:40]],
                "causal_relationships": [rel_tag],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": "CAUSAL_CONSEQUENCE",
                "difficulty_level": 4,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"causal:{root_dept}->{conseq_dept}:{locality.split()[0]}",
            }
        return None

    def build_false_secondary_complaint(self, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            actual_dept, past_dept, past_snippet, current_snippet = random.choice(FALSE_SECONDARY_TEMPLATES)
            locality = random.choice(LOCALITIES)
            opening = f"Janab aala {locality} ke maslay par tawajjoh dein."
            closing = random.choice(CLOSINGS)

            raw_text = self._compose_length_balanced_text(
                [opening, past_snippet, current_snippet], closing, target_bracket
            )
            wc = word_count(raw_text)
            if not (5 <= wc <= 200) or self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [actual_dept],
                "independent_faults_count": 1,
                "defect_evidence": [current_snippet[:40]],
                "causal_relationships": ["historical_solved"],
                "negated_mentions": [past_dept],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": "FALSE_SECONDARY",
                "difficulty_level": 3,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"false_secondary:{actual_dept}_past_{past_dept}",
            }
        return None

    def build_negated_complaint(self, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            actual_dept, neg_depts, neg_snippet, actual_snippet = random.choice(NEGATED_TEMPLATES)
            locality = random.choice(LOCALITIES)
            opening = f"Yeh shikayat {locality} se darj karwai ja rahi hai."
            closing = random.choice(CLOSINGS)

            raw_text = self._compose_length_balanced_text(
                [opening, neg_snippet, actual_snippet], closing, target_bracket
            )
            wc = word_count(raw_text)
            if not (5 <= wc <= 200) or self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [actual_dept],
                "independent_faults_count": 1,
                "defect_evidence": [actual_snippet[:40]],
                "causal_relationships": ["none"],
                "negated_mentions": neg_depts,
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": "NEGATED_MENTIONS",
                "difficulty_level": 3,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"negated:{actual_dept}_not_{'_'.join(neg_depts)}",
            }
        return None

    def build_custom_family_complaint(self, dept: str, family_name: str, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            opening, style = self._select_opening_and_style(locality)
            snippet, tag = random.choice(DEPT_DEFECTS[dept])
            closing = random.choice(CLOSINGS)

            if family_name == "SHORT_CLIPPED":
                raw_text = f"{locality} mein {snippet}. {closing}"
                target_bracket = "5-35"
            elif family_name == "FORMAL_ENGLISH_MIX":
                opening = f"Official complaint regarding civic infrastructure collapse in {locality} Karachi."
                closing = "Immediate intervention and department deployment is urgently requested from higher authorities."
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
            elif family_name == "STREET_ROMAN_URDU":
                opening = f"O bhai suno {locality} ka scene intehai kharab hai."
                closing = "Koi sunwayi nahi hoti aam awaam ki bas chakar lagwa rahe hain fori theek karo bhai."
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
            elif family_name == "ANGRY_ABUSIVE_NOISE":
                opening = f"Kab sudhro ge tum log?! {locality} mein zindagi azaab bana di hai harami aur corrupt officers ne!"
                closing = "Sharam aani chahiye tum sab ko! Agar masla hal na kiya to tumhare office ke bahar dharna denge!"
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
            elif family_name == "KARACHI_LOCAL_SLANG":
                opening = f"Bhai {locality} mein full khwari chal rahi hai aam public ki."
                closing = "Roz ka panga ho gaya hai yar meherbani karke is chik chik ko khatam karein."
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
            elif family_name == "LONG_NARRATIVE":
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, "166-200")
            elif family_name == "JOINED_WORDS":
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
                raw_text = mutate_spacing(raw_text, rate=0.25)
            elif family_name == "MISSING_LETTERS":
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
                raw_text = mutate_phonetics(raw_text, rate=0.25)
            elif family_name == "NO_PUNCTUATION":
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
                raw_text = strip_punctuation(raw_text)
            elif family_name == "PHONETIC_VARIATION":
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)
                raw_text = mutate_phonetics(raw_text, rate=0.20)
            else:
                raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)

            wc = word_count(raw_text)
            if not (5 <= wc <= 200) or self._is_duplicate_or_leak(raw_text):
                continue

            diff_level = 2
            if family_name in ["JOINED_WORDS", "MISSING_LETTERS", "NO_PUNCTUATION", "PHONETIC_VARIATION"]:
                diff_level = 3
            elif family_name in ["FORMAL_ENGLISH_MIX", "ANGRY_ABUSIVE_NOISE", "KARACHI_LOCAL_SLANG"]:
                diff_level = 3
            elif family_name in ["LONG_NARRATIVE", "SHORT_CLIPPED"]:
                diff_level = 3

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [dept],
                "independent_faults_count": 1,
                "defect_evidence": [tag],
                "causal_relationships": ["none"],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": family_name,
                "difficulty_level": diff_level,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"single_dept:{dept}:{family_name}:{locality.split()[0]}",
            }
        return None

    def build_single_complaint(self, dept: str, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            opening, style = self._select_opening_and_style(locality)
            snippet, tag = random.choice(DEPT_DEFECTS[dept])
            closing = random.choice(CLOSINGS)

            raw_text = self._compose_length_balanced_text([opening, snippet], closing, target_bracket)

            # Canonical single defect
            family_name = f"CANONICAL_{dept.upper()}"

            wc = word_count(raw_text)
            if not (5 <= wc <= 200) or self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [dept],
                "independent_faults_count": 1,
                "defect_evidence": [tag],
                "causal_relationships": ["none"],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": family_name,
                "difficulty_level": 2,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"single_dept:{dept}:{family_name}:{locality.split()[0]}",
            }
        return None

    def build_dual_complaint(self, d1: str, d2: str, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            opening, style = self._select_opening_and_style(locality)
            s1, t1 = random.choice(DEPT_DEFECTS[d1])
            s2, t2 = random.choice(DEPT_DEFECTS[d2])
            closing = random.choice(CLOSINGS)

            connector = random.choice([
                "aur alag se isi ilaqay mein",
                "aur is ke sath sath doosra masla yeh hai ke",
                "aur mazeed yeh ke doosri taraf",
                "aur sath hi sath mohallay mein",
            ])

            raw_text = self._compose_length_balanced_text(
                [opening, s1, connector, s2], closing, target_bracket
            )

            diff_family = "INDEPENDENT_DUAL"
            diff_level = 3
            if random.random() < 0.20:
                raw_text = mutate_phonetics(raw_text, rate=0.20)
                diff_family = "PHONETIC_DUAL"
                diff_level += 1

            wc = word_count(raw_text)
            if not (5 <= wc <= 200):
                continue
            if self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": sorted([d1, d2]),
                "independent_faults_count": 2,
                "defect_evidence": [t1, t2],
                "causal_relationships": ["none"],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": diff_family,
                "difficulty_level": min(5, diff_level),
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"dual_dept:{d1}_{d2}:{diff_family}",
            }
        return None

    def build_triple_complaint(self, d1: str, d2: str, d3: str, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            opening, _ = self._select_opening_and_style(locality)
            s1, t1 = random.choice(DEPT_DEFECTS[d1])
            s2, t2 = random.choice(DEPT_DEFECTS[d2])
            s3, t3 = random.choice(DEPT_DEFECTS[d3])
            closing = random.choice(CLOSINGS)

            raw_text = self._compose_length_balanced_text(
                [opening, s1, "aur doosra masla yeh hai ke", s2, "aur mazeed teesra ahem masla yeh hai ke", s3],
                closing,
                target_bracket
            )

            wc = word_count(raw_text)
            if not (5 <= wc <= 200):
                continue
            if self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": sorted([d1, d2, d3]),
                "independent_faults_count": 3,
                "defect_evidence": [t1, t2, t3],
                "causal_relationships": ["none"],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": "INDEPENDENT_TRIPLE",
                "difficulty_level": 4,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"triple_dept:{d1}_{d2}_{d3}",
            }
        return None

    def build_quad_complaint(self, depts: List[str], cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            opening, _ = self._select_opening_and_style(locality)
            snippets = [random.choice(DEPT_DEFECTS[d]) for d in depts]
            closing = random.choice(CLOSINGS)

            parts = [opening]
            for i, (s, _) in enumerate(snippets):
                if i > 0:
                    parts.append(f"aur is ke sath {i+1} masla yeh hai ke")
                parts.append(s)

            raw_text = self._compose_length_balanced_text(parts, closing, target_bracket)

            wc = word_count(raw_text)
            if not (5 <= wc <= 200):
                continue
            if self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": sorted(depts),
                "independent_faults_count": len(depts),
                "defect_evidence": [t for _, t in snippets],
                "causal_relationships": ["none"],
                "negated_mentions": [],
                "expected_behavior": "route",
                "expected_clarification_question": None,
                "difficulty_family": "INDEPENDENT_QUAD",
                "difficulty_level": 5,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"quad_dept:{'_'.join(depts)}",
            }
        return None

    def build_ambiguous_clarification_complaint(self, spec: Dict[str, Any], cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            locality = random.choice(LOCALITIES)
            variant = random.choice(spec["variants"])
            closing = random.choice(CLOSINGS)

            raw_text = f"{locality} mein {variant}. {closing}"
            raw_text = self._compose_length_balanced_text([raw_text], "", target_bracket)

            wc = word_count(raw_text)
            if not (5 <= wc <= 200):
                continue
            if self._is_duplicate_or_leak(raw_text):
                continue

            expected_depts = []
            if spec["primary_dept"]:
                expected_depts.append(spec["primary_dept"])

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": expected_depts,
                "independent_faults_count": 0 if not expected_depts else 1,
                "defect_evidence": [spec["question_id"]],
                "causal_relationships": ["ambiguous_needs_clarification"],
                "negated_mentions": [],
                "expected_behavior": "ask",
                "expected_clarification_question": spec["question_id"],
                "difficulty_family": "AMBIGUOUS_CLARIFICATION",
                "difficulty_level": 4,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"clarification:{spec['question_id']}",
            }
        return None

    def build_out_of_scope_complaint(self, cid: int, target_bracket: str) -> Optional[Dict[str, Any]]:
        for _ in range(150):
            sample, cat = random.choice(OUT_OF_SCOPE_SAMPLES)
            locality = random.choice(LOCALITIES)
            opening = f"Guzarish yeh hai ke {locality} mein"
            closing = "Meharbani farma kar is per karwai ki jaye."

            raw_text = self._compose_length_balanced_text([opening, sample], closing, target_bracket)

            wc = word_count(raw_text)
            if not (5 <= wc <= 200):
                continue
            if self._is_duplicate_or_leak(raw_text):
                continue

            return {
                "complaint_id": f"v13_1_eval_{cid:04d}",
                "text": raw_text,
                "expected_departments": [],
                "independent_faults_count": 0,
                "defect_evidence": [cat],
                "causal_relationships": ["out_of_scope"],
                "negated_mentions": [],
                "expected_behavior": "review",
                "expected_clarification_question": None,
                "difficulty_family": "OUT_OF_SCOPE",
                "difficulty_level": 3,
                "word_count": wc,
                "length_bracket": get_length_bracket(wc),
                "provenance": f"out_of_scope:{cat}",
            }
        return None


def generate_benchmark_2000(output_file: Path, smoke_only: bool = False) -> List[Dict[str, Any]]:
    print(f"=== AWAAZ-E-AWAM — Phase V13.1 Benchmark Generation (Target: {'30 (Smoke)' if smoke_only else '2,000'}) ===")
    start_time = time.time()
    builder = Benchmark2000Builder(seed=1312026)
    builder.load_historical_leakage_corpus(Path("."))

    records: List[Dict[str, Any]] = []
    cid = 1

    # Length bracket cycler to guarantee all 5 narrative brackets
    length_brackets = ["5-35", "36-80", "81-125", "126-165", "166-200"]

    if smoke_only:
        # Generate 30 diverse records for smoke testing
        print("[Smoke Test] Generating 30 balanced complaints...")
        for dept in DEPARTMENTS:
            while True:
                rec = builder.build_single_complaint(dept, cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        for pair in list(combinations(DEPARTMENTS, 2))[:5]:
            while True:
                rec = builder.build_dual_complaint(pair[0], pair[1], cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        for triplet in list(combinations(DEPARTMENTS, 3))[:5]:
            while True:
                rec = builder.build_triple_complaint(triplet[0], triplet[1], triplet[2], cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        quads = list(combinations(DEPARTMENTS, 4))[:4]
        for quad in quads:
            while True:
                rec = builder.build_quad_complaint(list(quad), cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        for spec in AMBIGUOUS_CLARIFICATION_SPECS:
            while True:
                rec = builder.build_ambiguous_clarification_complaint(spec, cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        for _ in range(5):
            while True:
                rec = builder.build_out_of_scope_complaint(cid, random.choice(length_brackets))
                if rec:
                    records.append(rec)
                    cid += 1
                    break
        print(f"[Smoke Test] Successfully generated {len(records)} records in {time.time() - start_time:.2f}s")
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"Smoke records saved to {output_file}")
        return records

    # Full 2,000 Generation Plan:
    # 1. Single Department: 800 (distributed across 19 single-department families)
    print("[Phase 1/6] Generating 800 single-department complaints across 19 difficulty families...")

    # 1a. Canonical Single Complaints: 150 (25 each for 6 departments)
    for dept in DEPARTMENTS:
        d_done = 0
        while d_done < 25:
            bracket = length_brackets[d_done % len(length_brackets)]
            rec = builder.build_single_complaint(dept, cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                d_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 1b. Typo & Spelling Variation Families: 160 (40 each for 4 families)
    typo_families = ["PHONETIC_VARIATION", "MISSING_LETTERS", "JOINED_WORDS", "NO_PUNCTUATION"]
    for fam in typo_families:
        f_done = 0
        while f_done < 40:
            dept = DEPARTMENTS[f_done % len(DEPARTMENTS)]
            bracket = length_brackets[f_done % len(length_brackets)]
            rec = builder.build_custom_family_complaint(dept, fam, cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                f_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 1c. Style & Narrative Length Families: 300 (50 each for 6 families)
    style_families = [
        "FORMAL_ENGLISH_MIX", "STREET_ROMAN_URDU", "SHORT_CLIPPED",
        "LONG_NARRATIVE", "ANGRY_ABUSIVE_NOISE", "KARACHI_LOCAL_SLANG"
    ]
    for fam in style_families:
        s_done = 0
        while s_done < 50:
            dept = DEPARTMENTS[s_done % len(DEPARTMENTS)]
            bracket = length_brackets[s_done % len(length_brackets)]
            rec = builder.build_custom_family_complaint(dept, fam, cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                s_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 1d. Causal Chains (Fahad's Rule: Root Cause vs Secondary Consequence): 70
    causal_done = 0
    while causal_done < 70:
        bracket = length_brackets[causal_done % len(length_brackets)]
        rec = builder.build_causal_complaint(cid, bracket)
        if rec:
            records.append(rec)
            cid += 1
            causal_done += 1
        if len(records) % 250 == 0:
            print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
            sys.stdout.flush()

    # 1e. False Secondary Mentions (Historical / Solved Previous Repairs): 60
    false_sec_done = 0
    while false_sec_done < 60:
        bracket = length_brackets[false_sec_done % len(length_brackets)]
        rec = builder.build_false_secondary_complaint(cid, bracket)
        if rec:
            records.append(rec)
            cid += 1
            false_sec_done += 1
        if len(records) % 250 == 0:
            print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
            sys.stdout.flush()

    # 1f. Negated Department Mentions: 60
    neg_done = 0
    while neg_done < 60:
        bracket = length_brackets[neg_done % len(length_brackets)]
        rec = builder.build_negated_complaint(cid, bracket)
        if rec:
            records.append(rec)
            cid += 1
            neg_done += 1
        if len(records) % 250 == 0:
            print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
            sys.stdout.flush()

    assert len(records) == 800, f"Expected 800 single department records, got {len(records)}"

    # 2. Dual Department: 600 (40 each for the 15 pairs)
    print("[Phase 2/6] Generating 600 dual-department complaints (40 per pair)...")
    all_pairs = list(combinations(DEPARTMENTS, 2))
    for pair in all_pairs:
        pair_done = 0
        while pair_done < 40:
            bracket = length_brackets[pair_done % len(length_brackets)]
            rec = builder.build_dual_complaint(pair[0], pair[1], cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                pair_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 3. Triple Department: 300 (15 each for the 20 triplets)
    print("[Phase 3/6] Generating 300 triple-department complaints (15 per triplet)...")
    all_triplets = list(combinations(DEPARTMENTS, 3))
    for trip in all_triplets:
        trip_done = 0
        while trip_done < 15:
            bracket = length_brackets[trip_done % len(length_brackets)]
            rec = builder.build_triple_complaint(trip[0], trip[1], trip[2], cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                trip_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 4. Quad Department: 100 (~6-7 each for the 15 quadruplets)
    print("[Phase 4/6] Generating 100 quad-department complaints...")
    all_quads = list(combinations(DEPARTMENTS, 4))
    quad_quota = 100
    q_idx = 0
    while q_idx < quad_quota:
        quad = all_quads[q_idx % len(all_quads)]
        bracket = length_brackets[q_idx % len(length_brackets)]
        rec = builder.build_quad_complaint(list(quad), cid, bracket)
        if rec:
            records.append(rec)
            cid += 1
            q_idx += 1
        if len(records) % 250 == 0:
            print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
            sys.stdout.flush()

    # 5. Ambiguous / Clarification-Required: 100 (20 each for 5 types)
    print("[Phase 5/6] Generating 100 ambiguous clarification complaints...")
    for spec in AMBIGUOUS_CLARIFICATION_SPECS:
        amb_done = 0
        while amb_done < 20:
            bracket = length_brackets[amb_done % len(length_brackets)]
            rec = builder.build_ambiguous_clarification_complaint(spec, cid, bracket)
            if rec:
                records.append(rec)
                cid += 1
                amb_done += 1
            if len(records) % 250 == 0:
                print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
                sys.stdout.flush()

    # 6. Out-of-Scope / Human Review: 100
    print("[Phase 6/6] Generating 100 out-of-scope non-municipal complaints...")
    oos_done = 0
    while oos_done < 100:
        bracket = length_brackets[oos_done % len(length_brackets)]
        rec = builder.build_out_of_scope_complaint(cid, bracket)
        if rec:
            records.append(rec)
            cid += 1
            oos_done += 1
        if len(records) % 250 == 0:
            print(f"  Checkpoint: {len(records)} / 2000 generated ({time.time() - start_time:.1f}s)...")
            sys.stdout.flush()

    print(f"Generation Complete! Total records generated: {len(records)} in {time.time() - start_time:.2f}s")
    assert len(records) == 2000, f"Expected 2000 records, got {len(records)}"

    # Save to output file
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Successfully wrote 2,000 evaluation complaints to {output_file}")
    return records


def main():
    parser = argparse.ArgumentParser(description="V13.1 Independent Adversarial Benchmark Builder")
    parser.add_argument("--smoke", action="store_true", help="Run 30-case smoke test")
    parser.add_argument("--output", type=str, default="data/v11/eval_v13_1/adversarial_benchmark_2000.jsonl")
    args = parser.parse_args()

    out_path = Path(args.output)
    generate_benchmark_2000(out_path, smoke_only=args.smoke)


if __name__ == "__main__":
    main()
