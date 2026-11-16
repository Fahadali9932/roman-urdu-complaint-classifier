# AWAAZ-E-AWAM (آوازِ عوام) — MUNICIPAL COMPLAINT TAXONOMY
**Document ID:** `docs/ml/01_LABEL_TAXONOMY.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Approved Formal Specification  

---

## 1. Overview & Architectural Principles

Awaaz-e-Awam routes civic complaints across Karachi's metropolitan jurisdiction. To guarantee legal compliance, jurisdictional integrity, and administrative efficiency, classification operates on a strict **three-tier semantic model**:

```
[ Citizen Complaint ] (1 Public Reference: KHI-2026-XXXXXXXX)
        │
        ├── [ Actionable Issue 1 ] ──► Assigned to Department A (e.g., KMC)
        │                                  └── Lifecycle: Assigned ➔ Accepted ➔ In Progress ➔ Completed
        │
        └── [ Actionable Issue 2 ] ──► Assigned to Department B (e.g., KWSC)
                                           └── Lifecycle: Assigned ➔ Accepted ➔ In Progress ➔ Completed
```

### Invariants:
1. **One Complaint = One Reference Number:** Submitting multiple issues never generates disjoint, orphaned citizen tickets.
2. **Actionable Issue vs. Causal Mention:** A complaint that mentions an agency solely as a downstream consequence or in an administrative context (e.g., *"Bijli band honay se pani ki motor nahi chal saki"*) represents an issue for K-Electric only, not an actionable plumbing defect for KW&SC.
3. **Disjoint Responsibility:** Each municipal department receives authorized access only to its assigned actionable issues. Cross-department modifications or status mutations are strictly barred by Row-Level Security (RLS).
4. **Independent Hazard Escalation:** Hazard detection (e.g. sparking high-voltage lines, combustible gas leaks) flags emergency triage protocols independently of department routing confidence.

---

## 2. Department Taxonomy

The platform officially recognizes six (6) active municipal and provincial agencies:

| Department ID | Official Name (English) | Official Name (Urdu) | Code | Primary Jurisdiction & Scope |
|:---|:---|:---|:---|:---|
| `kmc` | Karachi Metropolitan Corporation / DMCs | کراچی میٹروپولیٹن کارپوریشن | `KMC` | Major roads, arterials, flyovers, bridges, potholes, footpaths, street lighting, public parks, storm-water drains (nallahs), encroachment removal. |
| `kwsc` | Karachi Water & Sewerage Corporation | کراچی واٹر اینڈ سیوریج کارپوریشن | `KWSC` | Water supply pipelines, tankers, bulk water distribution, sewer lines, manholes, gutter overflows, wastewater treatment. |
| `kelectric` | K-Electric (Infrastructure & Distribution) | کے الیکٹرک | `KE` | Power generation, grid stations, distribution transformers (PMTs), fallen cables, sparking wires, electric poles, feeder trips, load shedding. |
| `ssgc` | Sui Southern Gas Company | سوئی سدرن گیس کمپنی | `SSGC` | Natural gas transmission, distribution mains, low gas pressure, gas pipeline ruptures, gas smell/leak hazards, illegal suction compressors. |
| `sswmb` | Sindh Solid Waste Management Board | سندھ سالڈ ویسٹ مینجمنٹ بورڈ | `SSWMB` | Garbage collection (GTS), garbage dumps (kuchra kundi), municipal waste cleanup, dead animal carcass removal, door-to-door sanitation. |
| `sbca` | Sindh Building Control Authority | سندھ بلڈنگ کنٹرول اتھارٹی | `SBCA` | Building construction permits, unauthorized structural additions, hazardous crumbling buildings, illegal commercialization, demolition safety. |

---

## 3. Sub-Issue Families & Defect Types

Each department is further mapped to concrete actionable defect families:

### 3.1 KMC / DMCs (`kmc`)
* `kmc.road_damage`: Potholes (*khadday*, *crater*), broken road surface (*sadak toot phoot*, *asphalt ukhar gaya*), road caving in (*sadak dhas jana*).
* `kmc.footpath_obstruction`: Broken sidewalk tiles, illegal kiosks on walkways (*footpath encroachment*), debris blocking pedestrian path.
* `kmc.street_lighting`: Non-functional street lights (*street lights band hain*), broken light poles (*khamba toota hua hai*), dark corridors.
* `kmc.bridge_flyover`: Expansion joint damage (*flyover ke expansion joint khulay hain*), guardrail damage, pedestrian bridge stairs broken.
* `kmc.storm_drain`: Major storm nallah blockage (*nallay ki safai*), rain drain silt accumulation before monsoons.

### 3.2 KW&SC (`kwsc`)
* `kwsc.water_shortage`: No water supply (*pani nahi aa raha*, *supply bandish*), dry taps for weeks (*do haftay se pani band hai*).
* `kwsc.water_leak`: Main water supply pipeline burst (*pani ki main line phat gai hai*), clean drinking water wastage on roads.
* `kwsc.sewage_overflow`: Gutter overflowing (*gutter ubal raha hai*), sewage water entering homes (*sewerage ka ganda pani*), broken manhole covers (*gutter ka dhakkan ghayab hai*).
* `kwsc.water_contamination`: Drinking water mixed with sewage (*pani se badboo aa rahi hai*, *ganda peenay ka pani*).

### 3.3 K-Electric (`kelectric`)
* `kelectric.power_outage`: Area blackout (*bijli band hai*, *load shedding*, *feeder trip*), phase missing (*ek phase nahi aa raha*), voltage fluctuation (*voltage bohat low hai*).
* `kelectric.sparking_wire`: High voltage wires sparking (*taaron se chingariyan nikal rahi hain*), transformer explosion (*PMT blast* / *dhamaka*).
* `kelectric.fallen_wire_hazard`: Live wire fallen on public road (*bijli ki taar zameen par giri hai*), leaning electric pole (*khamba tedha ho gaya hai*).
* `kelectric.meter_fault`: Meter burning, sparking service wire entering residential building.

### 3.4 SSGC (`ssgc`)
* `ssgc.low_pressure`: Low gas pressure (*gas ka pressure intehai kam hai*), zero gas in stoves (*chulha nahi jal raha*).
* `ssgc.gas_leak_hazard`: Gas pipeline leak (*gas ki badboo/smell aa rahi hai*), hiss sound from underground gas pipe (*underground gas pipeline leak*).
* `ssgc.pipeline_damage`: Excavation broke gas line (*road digging mein gas pipe kat gaya*).

### 3.5 SSWMB (`sswmb`)
* `sswmb.garbage_dump`: Piles of trash on public street (*kachray ka dher*, *kuchra jama hai*), overflowing municipal dumpster.
* `sswmb.sweeping_neglect`: Gali sanitation neglected for days, waste not picked up from designated collection point.
* `sswmb.carcass_removal`: Dead animal carcass on road creating disease and foul odor.

### 3.6 SBCA (`sbca`)
* `sbca.illegal_construction`: Unauthorized floor construction (*ghair qanooni manzil tameer ho rahi hai*), building without SBCA approved plan.
* `sbca.structural_hazard`: Deep structural cracks in multistory residential building (*building mein daraar par gai hai*), building tilting (*imarat jhuk rahi hai*), collapsing balcony.

---

## 4. Multi-Department Co-Occurrence & Cross-Agency Routing Rules

Real urban breakdowns in Karachi frequently span multiple agency domains. The classifier must route multi-label defects according to the following jurisdictional protocols:

| Co-occurring Symptoms in Text | Assigned Departments | Classification Protocol & Jurisdictional Split |
|:---|:---|:---|
| **Road pothole AND gutter sewage overflow** (*"Sadak par gehra khadda hai aur sath hi gutter ka pani behta rehta hai"*) | `kmc`, `kwsc` | **Dual Assignment:** KMC receives road repair task; KWSC receives gutter unclogging task. KWSC must clear water before KMC asphalt can be laid. |
| **Fallen electric wire AND flooded water/sewage on road** (*"Bijli ka taar toota hua hai aur sadak par pani bhara hai"*) | `kelectric`, `kwsc` *(High Hazard)* | **Dual Assignment with Critical Escalation:** K-Electric receives immediate emergency dispatch for power shutoff; KWSC receives de-watering task. |
| **Garbage dump blocking stormwater drain or road** (*"Kachray ka dher naali mein phasa hai jis se sadak block hai"*) | `sswmb`, `kmc` | **Dual Assignment:** SSWMB receives garbage clearing task; KMC receives drain clearance and road flow task. |
| **Water pipeline burst damaged the road asphalt** (*"Water board ki line leak hone se road beh gaya hai"*) | `kwsc`, `kmc` | **Dual Assignment:** KWSC repairs pipeline first; KMC repaves damaged corridor upon pipeline closure. |
| **Gas pipeline leakage during road excavation** (*"Sadak ki khodai ke doran gas pipe phat gaya aur smell aa rahi hai"*) | `ssgc`, `kmc` *(High Hazard)* | **Dual Assignment:** SSGC immediately isolated for combustible leak repair; KMC notified of excavation damage. |
| **Illegal building construction blocking public footpath** (*"Plaza walay ghair qanooni tameer kar ke footpath par qabza kar chukay hain"*) | `sbca`, `kmc` | **Dual Assignment:** SBCA checks building plan violations; KMC removes encroachment on public right-of-way. |

### Causal Downstream Non-Splitting Rules (Anti-Patterns)
1. **Power failure causing water pump inoperability:**
   - Text: *"Bijli teen ghantay se band hai is liye pani ki motor nahi chali aur tanki khali hai."*
   - **Correct Label:** `kelectric` ONLY.
   - **Incorrect:** `kwsc` + `kelectric`. (KWSC water supply is not proven defective; the resident's electric motor simply lacked power).
2. **Sewage water overflowing into private house:**
   - Text: *"Gutter ka pani hamaray ghar ke andar aa gaya hai aur kachra bhi behta hua aa raha hai."*
   - **Correct Label:** `kwsc` ONLY. (Trash is carried by the sewage flood, not an SSWMB municipal dump).
3. **Negative Hazard Disclaimer:**
   - Text: *"Bijli ka khamba tedha ho gaya hai lekin shukar hai koi taar nahi tooti aur current nahi hai."*
   - **Correct Label:** `kelectric` (Routine infrastructure replacement, NOT an active emergency wire hazard).
4. **Administrative / Billing Inquiries:**
   - Text: *"K-Electric walay bolte hain meter check karwao, bijli ka bill bohat zyada aya hai."*
   - **Correct Label:** `needs_review` / Unsupported billing dispute (Awaaz-e-Awam is an infrastructure defect platform, not a billing arbitration agency).

---
*End of Label Taxonomy.*
