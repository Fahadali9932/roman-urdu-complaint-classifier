"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Typed Civic Scenarios Taxonomy.

Human-maintained scenario catalog defining:
- Defect families across all 6 Karachi municipal authorities (KMC, KWSC, K-Electric, SSGC, SSWMB, SBCA).
- Exact actionable issue types and owning department keys.
- Semantic relations: INDEPENDENT, CAUSES, EFFECT_OF, SAME_INCIDENT_DIFFERENT_REPAIRS, MENTION_ONLY, UNCERTAIN.
- Consequence symptoms vs independent faults.
- Syntactic negations and boundary contrast cases.
"""
from __future__ import annotations

from typing import List, Dict, Any, Tuple, Optional

DEPARTMENTS = {"kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"}
RELATIONS = {
    "INDEPENDENT",
    "CAUSES",
    "EFFECT_OF",
    "SAME_INCIDENT_DIFFERENT_REPAIRS",
    "MENTION_ONLY",
    "UNCERTAIN",
}

PUBLIC_PLACES = (
    "Gulshan-e-Iqbal Block 13-D ki market ke samne",
    "Korangi Industrial Area road number 5 ke qareeb",
    "North Nazimabad Block H bus stop par",
    "Clifton Block 2 public park ke paas",
    "Saddar Preedy Street commercial area mein",
    "Orangi Town Sector 11-L public school ke paas",
    "Lyari Cheel Chowk ke qareeb",
    "Malir City railway crossing par",
    "Federal B Area Block 14 water pump chowrangi ke paas",
    "PECHS Block 6 main road par",
    "Landhi Babar Market ke samne",
    "Nazimabad number 7 chowk par",
    "Keamari dock yard road par",
    "Shah Faisal Colony number 3 bridge ke paas",
    "Baldia Town Chandni Chowk ke qareeb",
    "Gulberg Block 8 main road par",
    "Defence Phase 2 commercial street mein",
    "Liaquatabad super market ke bahar",
    "SITE Area metroville road par",
    "Gulistan-e-Jauhar Block 15 chowrangi par",
)

TIMES = (
    "kal se",
    "do din se",
    "aaj subha se",
    "pichlay haftay se",
    "kai din se",
    "pichle teen din se",
    "subha 10 baje se",
    "kal raat se",
)

REQUESTS = (
    "please check karen",
    "is maslay ko theek kar den",
    "barah e karam action len",
    "iski marammat zaroori hai",
    "jaldi team bheji jaye",
    "is par fori tawajjo den",
    "awam bohot pareshan hai masla hal karein",
)

PREFIXES = (
    "",
    "assalam o alaikum, ",
    "salam, ",
    "meri aik complaint hai: ",
    "janaab aali, ",
    "arz yeh hai ke ",
    "humare area mein bohot masla hai: ",
)

SUFFIXES = (
    "",
    " log pareshaan hain",
    " raasta istemal karna mushkil ho raha hai",
    " is par jaldi tawajjo den",
    " accidents ka khatra barh gaya hai",
    " rehayishiyon ka jeena azab ho gaya hai",
)


def scenario(
    key: str,
    issues: List[Tuple[str, str]],
    variants: Tuple[str, ...],
    relation: Optional[str] = None,
    flags: Tuple[str, ...] = (),
) -> Dict[str, Any]:
    return {
        "family_id": key,
        "issues": [
            {"issue_id": f"i{i+1}", "issue_type": t, "department_key": d}
            for i, (t, d) in enumerate(issues)
        ],
        "variants": variants,
        "relation": relation,
        "flags": list(flags),
    }


# ==============================================================================
# Comprehensive Scenario Taxonomy (65+ Distinct Physical Fault Families)
# ==============================================================================

SCENARIOS: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. KMC (Roads & Municipal Infrastructure) — 10 Families
    # --------------------------------------------------------------------------
    scenario("kmc_potholes_asphalt", [("road_damage", "kmc")], (
        "{time} {place} par road bohot zada kharab hoi v hai aur gehre khadday hain",
        "{place} par sarak toot kar khandar ban gai hai asphalt nikal gaya",
        "{time} {place} mein tooti hui road ki marammat chahiye potholes hain",
        "{place} par road bohot kharab hai gaarian phans rahi hain theek kiya jaye",
    )),
    scenario("kmc_sinkhole_collapse", [("road_damage", "kmc")], (
        "{place} par sarak achanak beech mein se dhans gai hai gehra crater hai",
        "{time} {place} ka road baith gaya hai gari girne ka shadeed khatra hai",
        "{place} par road collapse ho chuki hai rasta band ho gaya",
    )),
    scenario("kmc_footpath_encroachment", [("footpath_obstruction", "kmc")], (
        "{place} par public footpath par dukaandaron ne patharay laga kar qabza kar liya",
        "{place} mein footpath toota hua hai aur illegal stalls ne paidal rasta block kiya",
        "{time} {place} ke footpath par encroachment ki wajah se paidal chalna band hai",
    )),
    scenario("kmc_storm_drain_clogged", [("storm_drain", "kmc")], (
        "{place} ka barsati nala kachray se block para hai barish mein road doob jati hai",
        "{time} {place} mein kmc ka storm water drain choke hai safai ki jaye",
        "{place} par barsati nalah band hone se paani road par jama ho jata hai",
    )),
    scenario("kmc_bridge_expansion_joint", [("bridge_flyover", "kmc")], (
        "{place} ke flyover ka expansion joint toot gaya hai gaariyon ko shadeed jhatkay lagte hain",
        "{place} ke pull par darrar aa gai hai lohay ka sariya bahar nikal aya hai",
    )),
    scenario("kmc_divider_damaged", [("road_damage", "kmc")], (
        "{place} par sarak ka central divider toot gaya hai log ghalat cut maar rahe hain",
        "{place} par road divider tootne ki wajah se rozana accident ho rahe hain",
    )),
    scenario("kmc_manhole_cover_missing", [("open_manhole", "kmc")], (
        "{place} ke footpath par drain manhole ka dhakkan gayab hai jaan leva khatra hai",
        "{place} mein khula manhole bina kisi warning sign ke hai bache gir sakte hain",
    ), flags=("hazard_reported",)),
    scenario("kmc_street_lights_out", [("street_lighting", "kmc")], (
        "{time} {place} ki tamam municipal street lights band pari hain andhera rehta hai",
        "{place} par sarak ki battiyan kharab hain raat ko dakaitiyon ka khatra hai",
    )),
    scenario("kmc_speed_breaker_unauthorized", [("road_damage", "kmc")], (
        "{place} par ghair qanooni cement ke unche speed breakers bana diye hain gaariyon ke chamber toot rahe hain",
        "{place} mein bina kisi nishan ke dangerous speed breaker hai accident ho rahe hain",
    )),
    scenario("kmc_road_flooded_monsoon", [("storm_drain", "kmc")], (
        "{time} barish ke baad {place} par do foot paani khara hai drainage nala kaam nahi kar raha",
        "{place} par stormwater naali ubal kar road darya ban chuki hai",
    )),

    # --------------------------------------------------------------------------
    # 2. KWSC (Water Supply & Sewerage) — 10 Families
    # --------------------------------------------------------------------------
    scenario("kwsc_water_supply_shortage", [("water_supply_loss", "kwsc")], (
        "{time} {place} mein sarkari pani ki supply bilkul band hai awam taras rahi hai",
        "{place} ki public water line mein paani nahi aa raha tanker se guzara karna parh raha",
        "{time} {place} ke log mehenge tanker khareedne par majboor hain line sookhi hai",
    )),
    scenario("kwsc_pipe_burst_leak", [("public_water_pipe_leak", "kwsc")], (
        "{place} par main peene ke paani ki pipe phat gai hai lakhon gallon paani zaya ho raha",
        "{place} ke qareeb sarkari underground pipeline burst ho gai hai sadak par paani beh raha",
        "{time} {place} mein water board ki main line phatne se paani ka fawwara chal raha hai",
    )),
    scenario("kwsc_low_water_pressure", [("water_low_pressure", "kwsc")], (
        "{time} {place} mein paani ka pressure bohot kam hai tanki nahi bhar paati",
        "{place} ki water supply line mein sirf hawa aa rahi hai pressure na hone ke barabar hai",
    )),
    scenario("kwsc_sewer_overflow_foul", [("sewer_overflow", "kwsc")], (
        "{place} ka gutter ubal raha hai aur ganda pani sarak par beh raha hai shadeed badboo hai",
        "{place} mein sewer line choke ho gai hai ganda pani gharon ke darwazon tak aa gaya",
        "{time} {place} par sewerage ka ganda pani jama hai namaziyon ka masjid jana mushkil hai",
    )),
    scenario("kwsc_water_contamination_mix", [("water_contamination", "kwsc")], (
        "{place} mein peene ke paani mein gutter ka badboodar pani mix ho kar aa raha hai",
        "{place} par tap water se shadeed ganda badboo wala pani nikal raha hai bache beemar ho rahe hain",
        "{time} {place} ki supply line mein sewerage mix hone se paani peene ke qabil nahi",
    ), flags=("hazard_reported",)),
    scenario("kwsc_missing_sewer_lid", [("open_manhole", "kwsc")], (
        "{place} par sewer manhole ka cover toota hua hai andheray mein koi bhi gir sakta hai",
        "{place} mein khula gutter ka dhakkan nahi hai fori naya dhakkan lagaya jaye",
    ), flags=("hazard_reported",)),
    scenario("kwsc_tanker_mafia_suction", [("illegal_water_suction", "kwsc")], (
        "{place} par commercial hydrants aur illegal booster laga kar hamara paani kheench rahe hain",
        "{place} mein illegal water connection se sarkari pani chori kiya ja raha hai",
    )),
    scenario("kwsc_submerged_road_sewer", [("sewer_overflow", "kwsc")], (
        "{place} mein gutter ka ubalta pani poori gali mein talaab ban chuka hai",
        "{time} {place} par sewage line block hone se road doob chuki hai",
    )),
    scenario("kwsc_valve_broken", [("public_water_pipe_leak", "kwsc")], (
        "{place} ke konay par sarkari water valve toot chuka hai aur pani zaya ho raha hai",
    )),
    scenario("kwsc_clogged_drainage_manhole", [("sewer_overflow", "kwsc")], (
        "{place} par main line choke hai aur chaaron manholes se ganda paani ubal raha hai",
    )),

    # --------------------------------------------------------------------------
    # 3. K-Electric (Power & Electricity) — 10 Families
    # --------------------------------------------------------------------------
    scenario("ke_power_outage_blackout", [("power_outage", "kelectric")], (
        "{time} {place} mein bijli bilkul nahi aa rahi bina kisi notice ke blackout hai",
        "{place} mein electric supply subha se band hai feeder trip ho gaya hai",
        "{time} {place} mein 10 ghantay se light nahi aai garmi se bura haal hai",
    )),
    scenario("ke_transformer_burn_spark", [("transformer_fault", "kelectric")], (
        "{place} par PMT transformer se dhuwan nikal raha hai aur sparks ho rahe hain",
        "{time} {place} ke qareeb electric transformer blast ho gaya hai poora block andheray mein hai",
        "{place} mein transformer jal chuka hai fori replacement ki zaroorat hai",
    ), flags=("hazard_reported",)),
    scenario("ke_live_wire_fallen_hazard", [("exposed_wire", "kelectric")], (
        "{place} par bijli ki nangi taar toot kar zameen par gir pari hai current chal raha hai",
        "{place} mein live electric wire road par latak rahi hai bache khel rahe hain fori power kaato",
        "{time} {place} par high tension wire spark maar rahi hai shadeed jaan leva khatra hai",
    ), flags=("hazard_reported",)),
    scenario("ke_low_voltage_fluctuation", [("voltage_issue", "kelectric")], (
        "{place} mein voltage bohat zyada low hai fan nahi chal rahe aur appliances jalne ka khatra hai",
        "{time} {place} mein voltage up down ho raha hai AC aur fridge trip kar rahe hain",
    )),
    scenario("ke_pole_leaning_dangerous", [("dangerous_pole", "kelectric")], (
        "{place} par bijli ka khamba ek taraf tedha ho chuka hai kisi bhi waqt gir sakta hai",
        "{place} ke road side par electric pole toot kar taaron ke sahare latak raha hai",
    ), flags=("hazard_reported",)),
    scenario("ke_loose_service_cable", [("exposed_wire", "kelectric")], (
        "{place} mein residential building ke bahar bijli ke taaron ka janjal latak raha hai",
        "{place} par loose electric cables sar se takra rahi hain",
    )),
    scenario("ke_meter_sparking", [("meter_spark", "kelectric")], (
        "{place} par digital electricity meter se aag nikal rahi hai short circuit ho gaya",
    ), flags=("hazard_reported",)),
    scenario("ke_feeder_tripping_frequent", [("power_outage", "kelectric")], (
        "{place} par har aadhe ghantay baad feeder trip kar jata hai bar bar bijli band ho rahi",
    )),
    scenario("ke_phase_missing", [("voltage_issue", "kelectric")], (
        "{place} mein 2 phase gayab hain sirf ek phase par dim light chal rahi hai",
    )),
    scenario("ke_underground_cable_fault", [("power_outage", "kelectric")], (
        "{place} mein underground cable blast ho gai hai road ke neeche se dhuwan nikal raha",
    ), flags=("hazard_reported",)),

    # --------------------------------------------------------------------------
    # 4. SSGC (Sui Southern Gas Company) — 8 Families
    # --------------------------------------------------------------------------
    scenario("ssgc_gas_supply_loss", [("gas_supply_loss", "ssgc")], (
        "{time} {place} mein sui gas bilkul gayab hai chulha nahi jal raha khana nahi pak raha",
        "{place} mein natural gas supply mukammal band hai cylinder lana parh raha hai",
    )),
    scenario("ssgc_low_gas_pressure", [("gas_low_pressure", "ssgc")], (
        "{time} {place} mein gas ka pressure intehai kam hai tea aur khana banana namumkin hai",
        "{place} par gas itni halki hai ke match jalane par bhi chulha nahi pakadta",
    )),
    scenario("ssgc_pipeline_leak_odor_hazard", [("gas_leak", "ssgc")], (
        "{place} ki public gas pipeline se shadeed gas ki boo aa rahi hai leak hai dhamaka na ho jaye",
        "{place} par underground gas pipe se hiss ki awaz ke saath gas leak ho rahi hai",
        "{time} {place} mein gali mein gas leak ho kar hawa mein phail rahi hai aag lagne ka khatra",
    ), flags=("hazard_reported",)),
    scenario("ssgc_meter_joint_leak", [("gas_leak", "ssgc")], (
        "{place} ke bahar main gas meter ke union joint se gas leak ho rahi hai",
    ), flags=("hazard_reported",)),
    scenario("ssgc_compressor_theft", [("illegal_gas_compressor", "ssgc")], (
        "{place} par paros wale illegal gas compressor booster chala kar poori line ki gas kheench lete hain",
    )),
    scenario("ssgc_pipeline_fracture_excavation", [("gas_leak", "ssgc")], (
        "{place} par kisi ne khudai ki aur gas ki pipeline phat gai hai tez boo phail rahi hai",
    ), flags=("hazard_reported",)),
    scenario("ssgc_gas_valve_broken", [("gas_leak", "ssgc")], (
        "{place} par roadside gas control valve leak ho raha hai fori SSGC team bheji jaye",
    ), flags=("hazard_reported",)),
    scenario("ssgc_timing_shortage", [("gas_low_pressure", "ssgc")], (
        "{place} mein sirf raat ko 12 baje gas aati hai din bhar gas band rehti hai",
    )),

    # --------------------------------------------------------------------------
    # 5. SSWMB (Solid Waste Management Board) — 8 Families
    # --------------------------------------------------------------------------
    scenario("sswmb_garbage_overflow_dump", [("waste_overflow", "sswmb")], (
        "{place} par kachray ke dhabay overflow ho chuke hain aur kura sarak par bikhra para hai",
        "{place} mein illegal garbage dump ban chuka hai hafte se sswmb ki gari nahi aai",
        "{time} {place} par kachray ka pahar laga hua hai bimariyan phailne ka shadeed andesha hai",
    )),
    scenario("sswmb_missed_collection", [("missed_waste_collection", "sswmb")], (
        "{time} {place} se kachra uthane wali municipal gari nahi aai gali mein dher laga hai",
        "{place} par door to door waste collection staff pichle 5 din se gayab hai",
    )),
    scenario("sswmb_animal_carcass_urgent", [("carcass_removal", "sswmb")], (
        "{place} par sarak ke kinaray murda janwar ki laash pari hai kutte nooch rahe hain aur shadeed badboo hai",
        "{place} mein dead animal pada hai saans lena mushkil ho gaya hai fori uthwa kar disinfect karein",
    ), flags=("hazard_reported",)),
    scenario("sswmb_sweeping_neglect", [("sweeping_neglect", "sswmb")], (
        "{place} par road sweeping staff mahinon se nahi aya har taraf matti aur kachra urr raha hai",
    )),
    scenario("sswmb_hospital_waste_dumped", [("waste_overflow", "sswmb")], (
        "{place} par khulay aam syringes aur hazardous hospital waste phenka gaya hai bache khel rahe hain",
    ), flags=("hazard_reported",)),
    scenario("sswmb_drain_bank_dumping", [("illegal_waste_dump", "sswmb")], (
        "{place} par log nala ke kinaray kachra phenk rahe hain kachra kundi ban chuki hai",
    )),
    scenario("sswmb_commercial_market_waste", [("waste_overflow", "sswmb")], (
        "{place} par commercial market ka sabzi kachra sadak par phenk kar gandagi phaila di hai",
    )),
    scenario("sswmb_burning_garbage_smoke", [("waste_overflow", "sswmb")], (
        "{place} par kachray ke dher ko kisi ne aag laga di hai zehreela dhuwan phail raha hai",
    ), flags=("hazard_reported",)),

    # --------------------------------------------------------------------------
    # 6. SBCA (Sindh Building Control Authority) — 8 Families
    # --------------------------------------------------------------------------
    scenario("sbca_illegal_extra_floors", [("unauthorized_construction", "sbca")], (
        "{place} par residential plot par 5 manzila illegal building banai ja rahi hai bina SBCA NOC ke",
        "{place} ke qareeb bila ijazat extra floors ki tameer ho rahi hai building code violation hai",
    )),
    scenario("sbca_dangerous_cracked_building", [("unsafe_building", "sbca")], (
        "{place} par purani imarat ke pillars mein gehri daraarein par gai hain building girne wali hai",
        "{place} ke qareeb multistory building dangerous condition mein jhuk chuki hai haadsa ho sakta hai",
    ), flags=("hazard_reported",)),
    scenario("sbca_illegal_commercial_conversion", [("unauthorized_construction", "sbca")], (
        "{place} par residential banglay ko tod kar illegal shopping plaza khara kiya ja raha hai",
    )),
    scenario("sbca_hazardous_balcony_overhang", [("unsafe_building", "sbca")], (
        "{place} par building ka chhajja toat kar road par latak raha hai neeche se log guzar rahe hain",
    ), flags=("hazard_reported",)),
    scenario("sbca_illegal_basement_excavation", [("unsafe_building", "sbca")], (
        "{place} par gehre basement ki illegal khudai se saath wale makanon ki deewaron mein crack aa gaye hain",
    ), flags=("hazard_reported",)),
    scenario("sbca_unauthorized_extension_street", [("unauthorized_construction", "sbca")], (
        "{place} par builder ne building ko aagay barha kar public street par boundary bana li hai",
    )),
    scenario("sbca_sealing_order_violation", [("unauthorized_construction", "sbca")], (
        "{place} par SBCA ki taraf se seal shuda building par raat ke andheray mein dobara illegal kaam shuru kar diya",
    )),
    scenario("sbca_falling_concrete_debris", [("unsafe_building", "sbca")], (
        "{place} par zawaal pazeer imarat se plaster aur concrete ke tukray road par gir rahe hain",
    ), flags=("hazard_reported",)),

    # --------------------------------------------------------------------------
    # 7. CAUSAL CONSEQUENCES (One owning authority; secondary symptom suppressed)
    # --------------------------------------------------------------------------
    scenario("causal_power_motor_kwsc_suppressed", [("power_outage", "kelectric")], (
        "{time} {place} mein bijli nahi aa rahi is wajah se ghar ki pani wali motor nahi chal rahi",
        "{place} mein power outage ki wajah se domestic water motor band hai bijli bahal ki jaye",
        "{time} {place} par bijli band hone ki wajah se pani ki motor nahi chal saki aur tanki khali hai",
    ), flags=("nonactionable_consequence:water_motor",)),

    scenario("causal_sewage_traffic_kmc_suppressed", [("sewer_overflow", "kwsc")], (
        "{place} mein gutter ka ganda pani ubal raha hai jis se road par traffic ruk gaya hai",
        "{place} par sewer line leak hone ki wajah se sarak par pani beh raha hai aur traffic jam hai",
        "{place} par manhole overflow ki wajah se raste mein ganda paani hai gariyan slow hain",
    ), flags=("nonactionable_consequence:traffic",)),

    scenario("causal_low_gas_cooking_symptom", [("gas_low_pressure", "ssgc")], (
        "{place} mein gas ka pressure nahi hai is liye chulha nahi jal raha aur breakfast nahi ban saka",
    ), flags=("nonactionable_consequence:cooking",)),

    scenario("causal_water_outage_tanker_reliance", [("water_supply_loss", "kwsc")], (
        "{place} mein sarkari pani nahi aaya is wajah se hum private tanker mangwane par majboor hain",
    ), flags=("nonactionable_consequence:tanker",)),

    # --------------------------------------------------------------------------
    # 8. SAME INCIDENT WITH TWO DISTINCT REPAIRS (Both agencies actionable)
    # --------------------------------------------------------------------------
    scenario("dual_water_burst_erodes_road", [("public_water_pipe_leak", "kwsc"), ("road_damage", "kmc")], (
        "{place} par main water pipeline phatne se sarak ka asphalt toot gaya aur gehra khadda par gaya",
        "{place} mein underground water pipe burst hui jis se sarak dhans gai dono repairs ki zaroorat hai",
        "{place} par water board ki line phatne ki wajah se road bilkul baith chuki hai dono departments team bhejein",
    ), relation="SAME_INCIDENT_DIFFERENT_REPAIRS"),

    scenario("dual_road_excavation_fractures_gas", [("road_damage", "kmc"), ("gas_leak", "ssgc")], (
        "{place} par sarak ki khudai ke doran contractor ne gas pipeline tod di aur tez boo phail rahi hai",
        "{place} par road work excavation se sui gas main line fracture ho gai sarak aur gas dono ka masla hai",
    ), relation="SAME_INCIDENT_DIFFERENT_REPAIRS", flags=("hazard_reported",)),

    scenario("dual_garbage_clogs_storm_drain", [("waste_overflow", "sswmb"), ("storm_drain", "kmc")], (
        "{place} par kachra kundi overflow ho kar storm drain mein gir rahi hai kachra aur nala dono saaf hon",
        "{place} mein dumped solid waste ki wajah se municipal barsati nallah band ho gaya hai dono agencies action len",
    ), relation="SAME_INCIDENT_DIFFERENT_REPAIRS"),

    scenario("dual_wire_in_sewage_water_hazard", [("exposed_wire", "kelectric"), ("sewer_overflow", "kwsc")], (
        "{place} par bijli ki nangi live wire toat kar sewer ke kharay paani mein giri hai current chal raha hai",
        "{place} mein transformer se taar gir kar gutter ke paani mein doobi hai log electrocute ho sakte hain",
    ), relation="SAME_INCIDENT_DIFFERENT_REPAIRS", flags=("hazard_reported",)),

    # --------------------------------------------------------------------------
    # 9. INDEPENDENT DUAL ISSUES (Covering diverse agency pairs)
    # --------------------------------------------------------------------------
    scenario("pair_road_and_power", [("road_damage", "kmc"), ("power_outage", "kelectric")], (
        "{place} mein sarak toot phoot ka shikar hai aur alag se bijli bhi band hai",
        "{place} par road mein gehre khadday hain aur doosra masla bijli ki load shedding ka hai",
    ), relation="INDEPENDENT"),

    scenario("pair_water_and_power", [("water_supply_loss", "kwsc"), ("power_outage", "kelectric")], (
        "{place} mein sarkari pani nahi aa raha aur alag se bijli ki supply bhi mukammal band hai",
        "{place} mein do alag maslay hain: water line sookhi hai aur transformer kharab hai",
    ), relation="INDEPENDENT"),

    scenario("pair_gas_and_wire", [("gas_leak", "ssgc"), ("exposed_wire", "kelectric")], (
        "{place} par gas line leak ho rahi hai aur alag se bijli ka nanga taar sparks maar raha hai",
        "{place} mein gas ki boo hai aur saath ek live electric wire bhi latak rahi hai",
    ), relation="INDEPENDENT", flags=("hazard_reported",)),

    scenario("pair_waste_and_building", [("illegal_waste_dump", "sswmb"), ("unsafe_building", "sbca")], (
        "{place} par kachray ka bara dher para hai aur saath wali building ke pillar mein khatarnak daraar hai",
        "{place} mein illegal garbage dump aur unsafe building dono alag alag maslay hain",
    ), relation="INDEPENDENT", flags=("hazard_reported",)),

    scenario("pair_water_and_gas", [("water_supply_loss", "kwsc"), ("gas_low_pressure", "ssgc")], (
        "{place} mein sarkari pani bhi band hai aur gas ka pressure bhi zero hai dono utilities kharab hain",
    ), relation="INDEPENDENT"),

    scenario("pair_waste_and_road", [("waste_overflow", "sswmb"), ("road_damage", "kmc")], (
        "{place} par kachray ka dabba road par ulta para hai aur sarak par gehre khadday hain",
    ), relation="INDEPENDENT"),

    # --------------------------------------------------------------------------
    # 10. NEGATION & BOUNDARY CONTRAST CASES (Denies defect or emergency)
    # --------------------------------------------------------------------------
    scenario("negation_road_fine_sewer_broken", [("sewer_overflow", "kwsc")], (
        "{place} par sarak bilkul theek hai magar gutter ka ganda pani ubal raha hai sewer line theek karo",
        "{place} mein road tooti hui nahi hai masla sewer line choke hone ka hai",
    ), flags=("negative_evidence:road_damage",)),

    scenario("negation_gas_leak_denied_low_pressure", [("gas_low_pressure", "ssgc")], (
        "{place} mein gas leak nahi hai aur na boo hai sirf gas ka pressure bohot kam hai",
        "{place} par koi pipeline leak nahi hai bas sui gas ka pressure halka hai",
    ), flags=("negative_evidence:gas_leak",)),

    scenario("negation_wire_safe_pothole_reported", [("road_damage", "kmc")], (
        "{place} par bijli ki taar bilkul theek hai koi khatra nahi lekin road par bohot gehra khadda hai",
        "{place} mein electric wire toota nahi hai pole theek hai road toot kar kharab hoi v hai",
    ), flags=("negative_evidence:exposed_wire",)),

    scenario("negation_waste_drain_clean", [("waste_overflow", "sswmb")], (
        "{place} par kachra bohot para hai lekin storm drainage naali bilkul saaf hai kachra uthao",
    ), flags=("negative_evidence:storm_drain",)),

    scenario("negation_building_solid_illegal_floor", [("unauthorized_construction", "sbca")], (
        "{place} par building mein koi crack ya khatra nahi hai magar bina ijazat 5th floor banaya ja raha hai",
    ), flags=("negative_evidence:unsafe_building",)),

    # --------------------------------------------------------------------------
    # 11. UNCERTAIN & INCOMPLETE CONTEXT CASES (Routes to Review)
    # --------------------------------------------------------------------------
    scenario("uncertain_cause_speculation", [], (
        "{place} mein pani nahi aa raha shayad bijli ki wajah se hai pata nahi samajh nahi aa raha",
        "{place} par service band hai magar asal wajah maloom nahi hai check karein",
    ), flags=("needs_review:uncertain_cause",)),

    scenario("vague_complaint_no_service_detail", [], (
        "{place} par bohot masla hai awam pareshan hai koi sunwai nahi ho rahi",
        "{place} mein halaat bohot kharab hain barah e karam koi to tawajjo de",
    ), flags=("needs_review:vague_description",)),
]
