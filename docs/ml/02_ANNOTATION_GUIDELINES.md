# AWAAZ-E-AWAM (آوازِ عوام) — ANNOTATION HANDBOOK & GUIDELINES
**Document ID:** `docs/ml/02_ANNOTATION_GUIDELINES.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Canonical Annotation Standard  

---

## 1. Scope & Objective

This handbook defines the criteria for annotating Roman Urdu civic complaint texts for the Awaaz-e-Awam multi-department, multi-label classifier. Annotators must adhere strictly to these guidelines to ensure that gold evaluation datasets and training corpora remain unambiguous, leakage-free, and legally aligned with municipal jurisdictions.

---

## 2. Core Annotation Rules

1. **Multi-Label Cardinality:** A complaint text may receive zero, one, two, or three department labels:
   - $\emptyset$ (`[]`): Out-of-scope, spam, personal dispute, unparseable noise, or purely administrative/billing inquiries requiring human clearinghouse review (`needs_review = true`).
   - Single-label (`[dept]`): All described defects belong exclusively to one municipal authority.
   - Multi-label (`[dept1, dept2, ...]`): Two or more distinct, independently actionable service defects co-occur in the text.
2. **Actionable Defect vs. Causal Mention:**
   - Label ONLY departments with an *independently actionable physical defect*.
   - If Department A's outage is the direct upstream cause of Department B's inability to be utilized on private premises (e.g., *"Bijli band hone se water pump nahi chala"*), label ONLY Department A (`kelectric`).
3. **Independent Life-Safety Hazard Tagging:**
   - Tag `has_hazard = true` if the text describes immediate life-safety peril:
     - Exposed or fallen live electric wires (*tooti hui taar, current aa raha hai*).
     - Combustible natural gas leaks with hissing or strong odor (*gas ki boo, pipeline blast*).
     - Imminent structural collapse of buildings or balconies (*building girne wali hai, deep pillar cracks*).
   - If danger is explicitly negated (*"shukar hai taar nahi toota"*, *"gas leak nahi hai"*), set `has_hazard = false`.

---

## 3. Departmental Exemplars (5 Positive & 5 Negative / Confusing Cases per Department)

### 3.1 KMC / DMCs (`kmc`)

#### Positive Examples (True `kmc`):
1. *"Main Rashid Minhas road par bohat baray khadday ban chukay hain gaariyon ke tyre phat rahay hain."*  
   **Label:** `[kmc]` | **Sub-type:** `kmc.road_damage`
2. *"Hamari gali ki street lights pichlay do haftay se band hain, raat ko andheray mein dakaitiyan ho rahi hain."*  
   **Label:** `[kmc]` | **Sub-type:** `kmc.street_lighting`
3. *"Liaquatabad super market ke bahir footpath par pakki dukanein bana li hain paidal chalnay ki jagah nahi."*  
   **Label:** `[kmc]` | **Sub-type:** `kmc.footpath_obstruction`
4. *"Natha Khan flyover ke darmian expansion joints mein khala aa gaya hai bridge hil raha hai."*  
   **Label:** `[kmc]` | **Sub-type:** `kmc.bridge_flyover`
5. *"Barsati nallay ki safai saalon se nahi hui, kachra aur mitti bhari hui hai barish mein overflow hoga."*  
   **Label:** `[kmc]` | **Sub-type:** `kmc.storm_drain`

#### Negative / Confusing Examples (NOT `kmc` or Multi-Label):
1. *"Road par sewer ka ganda pani behta rehta hai jis se sadak toot gai hai."*  
   **Label:** `[kwsc, kmc]` *(Multi-label: Sewage leak is KWSC, road repair is KMC)*.
2. *"Gali mein street light ke pole par transformer laga hai jo dhmakay se phat gaya."*  
   **Label:** `[kelectric]` *(Transformer failure belongs to K-Electric, not municipal street lighting)*.
3. *"Sadak ke kinare kachray ke badtareen dher lagay hue hain kundi se badboo aa rahi hai."*  
   **Label:** `[sswmb]` *(Solid waste belongs to SSWMB, not KMC)*.
4. *"Plaza walon ne 5th floor ghair qanooni bana liya hai sadak par material girta hai."*  
   **Label:** `[sbca]` *(Building structure violation belongs to SBCA)*.
5. *"KMC office mein clerk ne kaha ke water board se NOC le kar aao."*  
   **Label:** `[]` / `needs_review` *(Administrative procedure query; no actionable municipal defect)*.

---

### 3.2 KW&SC (`kwsc`)

#### Positive Examples (True `kwsc`):
1. *"Sector 11-B mein pichlay 20 din se peenay ka pani bilkul band hai line sookhi pari hai."*  
   **Label:** `[kwsc]` | **Sub-type:** `kwsc.water_shortage`
2. *"Main university road par 48 inch ki water pipeline burst ho gai hai lakhoon gallon pani zaya ho raha hai."*  
   **Label:** `[kwsc]` | **Sub-type:** `kwsc.water_leak`
3. *"Block 4 mein gutter ka ganda pani ubal kar dukanon mein dakhil ho raha hai badboo phail chuki hai."*  
   **Label:** `[kwsc]` | **Sub-type:** `kwsc.sewage_overflow`
4. *"Gali ke main gutter ka cement ka dhakkan toota hua hai bacha girne ka shaded khatra hai."*  
   **Label:** `[kwsc]` | **Sub-type:** `kwsc.sewage_overflow` *(Hazard flagged)*
5. *"Water supply ki line mein sewerage ka pani mix ho kar nalon mein ganda badboodar pani aa raha hai."*  
   **Label:** `[kwsc]` | **Sub-type:** `kwsc.water_contamination`

#### Negative / Confusing Examples (NOT `kwsc` or Multi-Label):
1. *"Bijli 12 ghantay se gayab hai jis ki wajah se pani ki motor nahi chala sakay tanki khali ho gai."*  
   **Label:** `[kelectric]` *(Direct causal result of electricity outage; KWSC supply is not defective)*.
2. *"Barsati nallah kachray se choke ho gaya hai aur pani sadak par jam gaya hai."*  
   **Label:** `[kmc, sswmb]` *(Major storm nallah is KMC; solid waste blockage is SSWMB)*.
3. *"Pani ka tanker private walay 10 hazar ka bech rahay hain dhandli band karo."*  
   **Label:** `[]` / `needs_review` *(Commercial pricing grievance; routing requires manual review)*.
4. *"Gutter ka pani road par jamne se sadak dhas gai hai aur road block ho gaya hai."*  
   **Label:** `[kwsc, kmc]` *(Dual assignment: Sewage fix by KWSC, road subsidence fix by KMC)*.
5. *"Pani ke bills har maheenay double aa rahay hain meter sahi check karein."*  
   **Label:** `[]` / `needs_review` *(Billing dispute; not a physical infrastructure breakdown)*.

---

### 3.3 K-Electric (`kelectric`)

#### Positive Examples (True `kelectric`):
1. *"Gulshan block 7 mein subah 6 bajay se light band hai koi sunwayi nahi ho rahi."*  
   **Label:** `[kelectric]` | **Sub-type:** `kelectric.power_outage`
2. *"Gali ke kohnay par PMT transformer se shadeed chingariyan aur dhuwan nikal raha hai blast ho sakta hai."*  
   **Label:** `[kelectric]` | **Sub-type:** `kelectric.sparking_wire` *(Hazard: true)*
3. *"High tension taar toot kar sadak par gir gai hai current dhor raha hai koi qareeb na jaye."*  
   **Label:** `[kelectric]` | **Sub-type:** `kelectric.fallen_wire_hazard` *(Hazard: true)*
4. *"Bijli ke 3 phases mein se 2 phases gayab hain voltage 110V aa rahi hai AC aur fridge jal gaye."*  
   **Label:** `[kelectric]` | **Sub-type:** `kelectric.power_outage`
5. *"Bijli ka khamba taaron ke wazan se tedha ho gaya hai imarat par girnay ka andesha hai."*  
   **Label:** `[kelectric]` | **Sub-type:** `kelectric.fallen_wire_hazard` *(Hazard: true)*

#### Negative / Confusing Examples (NOT `kelectric` or Multi-Label):
1. *"Khamba tedha ho gaya tha par staff ne kal theek kar diya shukar hai koi current nahi hai."*  
   **Label:** `[]` / `needs_review` *(Issue already resolved / negation of active defect)*.
2. *"Bijli ka taar toot kar paani ke baray talab mein gira hua hai."*  
   **Label:** `[kelectric, kwsc]` *(Dual emergency: Wire repair for KE, de-watering for KWSC)*.
3. *"Street light ka bulb fuse hai poles par andhera rehta hai."*  
   **Label:** `[kmc]` *(Municipal street lights belong to KMC/DMC, not K-Electric distribution)*.
4. *"K-Electric ke bill mein fuel adjustment charges bohat zyada laga kar bhej diye hain."*  
   **Label:** `[]` / `needs_review` *(Tariff/regulatory issue, out of municipal operations desk)*.
5. *"Gas generator chalana par raha hai kyun ke bijli band hai aur gas ka pressure bhi zero hai."*  
   **Label:** `[kelectric, ssgc]` *(Independent concurrent utility outages)*.

---

### 3.4 SSGC (`ssgc`)

#### Positive Examples (True `ssgc`):
1. *"Pichlay aik haftay se gas ka pressure intehai kam hai khana pakanay ka chulha nahi jal raha."*  
   **Label:** `[ssgc]` | **Sub-type:** `ssgc.low_pressure`
2. *"Ghar ke samnay wali underground gas line se shadeed hiss ki aawaz aur gas ki badboo aa rahi hai."*  
   **Label:** `[ssgc]` | **Sub-type:** `ssgc.gas_leak_hazard` *(Hazard: true)*
3. *"Gali mein baaz log illegal gas compressor suction pump laga kar doosron ki gas kheench letay hain."*  
   **Label:** `[ssgc]` | **Sub-type:** `ssgc.low_pressure`
4. *"Excavator machine ne road khodtay waqt gas ka main pipe phaar diya hai gas hawa mein leak ho rahi hai."*  
   **Label:** `[ssgc]` | **Sub-type:** `ssgc.gas_leak_hazard` *(Hazard: true)*
5. *"Winter mein shaam 6 bajay se raat 11 bajay tak gas bilkul zero ho jati hai cylinder use karna parta hai."*  
   **Label:** `[ssgc]` | **Sub-type:** `ssgc.low_pressure`

#### Negative / Confusing Examples (NOT `ssgc` or Multi-Label):
1. *"Gutter se badboo aur methan gas nikal rahi hai dhakkan khula hai."*  
   **Label:** `[kwsc]` *(Sewer gas from manhole belongs to KW&SC wastewater, not SSGC natural gas)*.
2. *"Khana pakanay ke doran cylinder leak ho kar aag lag gai rescue bhejein."*  
   **Label:** `[]` / `needs_review` *(LPG cylinder emergency / Rescue 1122, not SSGC pipeline network)*.
3. *"Sadak khodi gai thi gas line dalnay ke baad mitti daal kar chhor di asphalt nahi dala."*  
   **Label:** `[kmc]` *(Road restoration after trenching belongs to KMC / local DMC)*.
4. *"Gas ka pipe leak hone se aag lagne ka khatra hai aur sath hi bijli ka khamba bhi dhas gaya hai."*  
   **Label:** `[ssgc, kelectric]` *(Critical multi-utility hazard)*.
5. *"Gas meter ka display kharab ho gaya hai reading nazar nahi aati."*  
   **Label:** `[ssgc]` *(Meter maintenance belongs to SSGC)*.

---

### 3.5 SSWMB (`sswmb`)

#### Positive Examples (True `sswmb`):
1. *"Chowrangi ke kohnay par kachray ka pahar ban gaya hai hafton se safai nahi hui kuttay mandla rahay hain."*  
   **Label:** `[sswmb]` | **Sub-type:** `sswmb.garbage_dump`
2. *"Gali mein safai karamchari nahi aate, har taraf plastic thailay aur kura bikhra para hai."*  
   **Label:** `[sswmb]` | **Sub-type:** `sswmb.sweeping_neglect`
3. *"Main road ke green belt par murda janwar ki laash pari hai shaded taaffun phail raha hai."*  
   **Label:** `[sswmb]` | **Sub-type:** `sswmb.carcass_removal`
4. *"Kachra kundi overflow ho kar sari sadak par phail chuki hai badboo se sans lena dushwar hai."*  
   **Label:** `[sswmb]` | **Sub-type:** `sswmb.garbage_dump`
5. *"Solid waste board ki gari pichlay do maheenay se hamaray block mein collection ke liye nahi aayi."*  
   **Label:** `[sswmb]` | **Sub-type:** `sswmb.sweeping_neglect`

#### Negative / Confusing Examples (NOT `sswmb` or Multi-Label):
1. *"Kachray ka dher naali mein phansa hai jis se gutter ka pani sadak par ubal raha hai."*  
   **Label:** `[sswmb, kwsc]` *(Dual issue: Solid waste removal for SSWMB; gutter unclogging for KWSC)*.
2. *"Hospital ka infectious kachra khulay aam sadak par phenka ja raha hai."*  
   **Label:** `[sswmb]` *(Hazardous medical waste dump belongs to SSWMB sanitation enforcement)*.
3. *"Ghar ke andar renovation ka malba jama hai usko uthwana hai."*  
   **Label:** `[]` / `needs_review` *(Private residential debris is private property responsibility)*.
4. *"Kachra uthanay walon ne gali ki sadak ki concrete bori tod di hai."*  
   **Label:** `[kmc]` *(Public street damage belongs to KMC)*.
5. *"Sadak par kachra jalaya ja raha hai jis se dhuwan phail raha hai."*  
   **Label:** `[sswmb]` *(Open burning of municipal municipal waste belongs to SSWMB violation response)*.

---

### 3.6 SBCA (`sbca`)

#### Positive Examples (True `sbca`):
1. *"Residential plot par 8 manzila commercial building ghair qanooni tor par tameer ki ja rahi hai."*  
   **Label:** `[sbca]` | **Sub-type:** `sbca.illegal_construction`
2. *"40 saal purani residential imarat ke pillars mein gehri daraarein par chuki hain chhat girne ka khatra hai."*  
   **Label:** `[sbca]` | **Sub-type:** `sbca.structural_hazard` *(Hazard: true)*
3. *"Bina SBCA approval ke ground floor ki parking tor kar dukanen nikaali ja rahi hain structural base kamzor ho gai."*  
   **Label:** `[sbca]` | **Sub-type:** `sbca.illegal_construction`
4. *"Hamaray barabar walay plot par baghair safety net ke gehri excavation ki ja rahi hai sath wali imarat hil rahi hai."*  
   **Label:** `[sbca]` | **Sub-type:** `sbca.structural_hazard` *(Hazard: true)*
5. *"Purani building ki chajja aur balcony toot kar neechay gir rahi hai kisi waqt bada hadsa ho sakta hai."*  
   **Label:** `[sbca]` | **Sub-type:** `sbca.structural_hazard` *(Hazard: true)*

#### Negative / Confusing Examples (NOT `sbca` or Multi-Label):
1. *"Builder ne footpath par reth aur bajri daal kar poori paidal chalne ki jagah block kar di hai."*  
   **Label:** `[sbca, kmc]` *(Dual issue: Illegal building staging for SBCA, footpath encroachment for KMC)*.
2. *"Ghar ki boundary wall barish ki wajah se gir gai hai private property hai."*  
   **Label:** `[]` / `needs_review` *(Private internal compound wall is outside SBCA municipal jurisdiction)*.
3. *"Building ke andar water line leak ho kar hamari chhat se tapak rahi hai."*  
   **Label:** `[]` / `needs_review` *(Internal neighborly plumbing dispute, not SBCA structural permit)*.
4. *"Ghair qanooni building tameer hotay waqt bijli ki main distribution line kat di gai."*  
   **Label:** `[sbca, kelectric]` *(Dual issue: Unauthorized construction for SBCA, electrical distribution for KE)*.
5. *"SBCA ke inspector ne notice lagaya tha lekin kaam abhi tak nahi ruka."*  
   **Label:** `[sbca]` *(SBCA enforcement non-compliance)*.

---

## 4. Orthographic and Dialectal Variations in Roman Urdu

Annotators must recognize common spelling, phonetic, and transliteration variations:

| Standard Concept | Common Roman Urdu Spelling Variants | English / Code-Switched Loanwords |
|:---|:---|:---|
| **Electricity** | `bijli`, `bijlee`, `bijlii`, `bijly`, `batti` | `light`, `power`, `current`, `voltage`, `feeder`, `pmt` |
| **Water** | `pani`, `paani`, `pany`, `paney` | `water`, `supply`, `line`, `tanker`, `pipeline` |
| **Sewerage** | `gutter`, `gutar`, `gater`, `gatar`, `naali`, `nali` | `sewerage`, `manhole`, `overflow`, `drainage` |
| **Pothole / Road** | `khadda`, `khadday`, `gadda`, `crater`, `sadak`, `sarak`, `sadq` | `road`, `pothole`, `asphalt`, `carpet`, `track` |
| **Garbage** | `kachra`, `kuchra`, `kura`, `koora`, `malba`, `kundi` | `garbage`, `trash`, `waste`, `dump`, `rubbish` |
| **Gas** | `sooi gas`, `sui gas`, `chulha`, `cylinder`, `bhabka` | `gas`, `pressure`, `leakage`, `smell`, `pipeline` |
| **Building** | `imarat`, `tameer`, `manzil`, `chhat`, `daraar` | `building`, `construction`, `crack`, `illegal`, `floor` |

---

## 5. Reviewer Checklist & Disagreement Protocol

When annotating or resolving double-labeled evaluation data:
1. **Clause Decomposition:** Break compound sentences into independent clauses (using separators like *aur*, *sath hi*, *bhi*, *jabke*, commas).
2. **Actionability Test:** Ask: *"Can an inspector from this agency go to the physical location and execute a repair work order today?"*
   - If YES: Add department label.
   - If NO: Discard department label.
3. **Causal Directionality:** Does Defect X directly cause Defect Y on private premises? If yes, attribute only to X.
4. **Disagreement Resolution:** When two reviewers disagree:
   - If one reviewer assigns `[kmc]` and the other assigns `[kmc, kwsc]`, a third senior adjudicator evaluates whether the water defect has distinct physical manifestation or is merely road dampness.
   - If unresolvable within 60 seconds, assign `needs_review = true` with reason `annotator_disagreement`.

---
*End of Annotation Guidelines.*
