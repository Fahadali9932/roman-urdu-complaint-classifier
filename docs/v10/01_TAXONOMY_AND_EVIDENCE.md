# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 MUNICIPAL TAXONOMY & EVIDENCE LEXICON
**Document ID:** `docs/v10/01_TAXONOMY_AND_EVIDENCE.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Civic Taxonomy & Linguistic Lexicon Specification  

---

## 1. Municipal Authority Taxonomy

Awaaz-e-Awam routes civic defects across six primary municipal and provincial agencies in Karachi:

| Agency | Department ID | Primary Jurisdictional Mandate | Canonical Defect Codes |
| :--- | :--- | :--- | :--- |
| **Karachi Metropolitan Corporation** | `kmc` | Major road infrastructure, asphalt resurfacing, arterial bridges, flyovers, sidewalks/encroachments, stormwater drains | `kmc.road_damage`<br>`kmc.storm_drain`<br>`kmc.footpath_obstruction`<br>`kmc.bridge_flyover`<br>`kmc.street_lighting` |
| **Karachi Water & Sewerage Corporation** | `kwsc` | Drinking water supply, pipeline bursts, water contamination, sewer main lines, gutter overflows, manholes | `kwsc.water_shortage`<br>`kwsc.water_leak`<br>`kwsc.sewage_overflow`<br>`kwsc.water_contamination` |
| **K-Electric** | `kelectric` | Power grid distribution, feeder trippings, high-tension lines, transformers (PMTs), live wire hazards, voltage fluctuations | `kelectric.power_outage`<br>`kelectric.fallen_wire_hazard`<br>`kelectric.sparking_wire`<br>`kelectric.low_voltage` |
| **Sui Southern Gas Company** | `ssgc` | Natural gas transmission, domestic low pressure, line leaks, methane odors, meter union fractures | `ssgc.low_pressure`<br>`ssgc.gas_leak_hazard` |
| **Sindh Solid Waste Management Board** | `sswmb` | Municipal trash bins, secondary garbage collection, unauthorized garbage dumps, animal carcass removal, street sweeping | `sswmb.garbage_dump`<br>`sswmb.carcass_removal`<br>`sswmb.sweeping_neglect` |
| **Sindh Building Control Authority** | `sbca` | Building permits, illegal multi-story construction, structural cracks, hazardous dilapidated buildings | `sbca.illegal_construction`<br>`sbca.structural_hazard` |

---

## 2. Contextual Linguistic Evidence Lexicon

Keywords alone are insufficient for robust routing; they serve as high-recall semantic evidence within clause contexts.

### 2.1 Lexical Cues vs. Confusable Contexts

```
┌───────────────┬──────────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Department ID │ Positive Semantic Evidence Spans         │ Confusable Contexts / Anti-Patterns             │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ kmc           │ sarak, sadak, road, rasta, khadda,       │ "gali" is usually an address/location, not a    │
│               │ gadda, pothole, tooti, dhans gai,        │ structural road defect.                         │
│               │ footpath, asphalt, flyover, barsati nala │ "road par pani" is a symptom of sewer/pipe leak │
│               │                                          │ unless asphalt structural damage is described.  │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ kwsc          │ pani nahi, supply band, pipeline phat,   │ "motor nahi chal rahi" due to power outage is a │
│               │ line burst, gutter ubal, sewage leak,    │ K-Electric symptom, NOT a KWSC supply defect.   │
│               │ ganda pani, manhole khula, badboo        │ "pani" in rain accumulation is not water supply.│
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ kelectric     │ bijli band, light chali gai, current,    │ Quoting agency name ("K-Electric ko bolo") does │
│               │ voltage low, transformer jal, spark,     │ not prove electrical fault if text reports sewer│
│               │ wire toot, live wire, feeder trip, pmt   │ Negated "khatra nahi" must not trigger hazard.  │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ ssgc          │ gas nahi, pressure kam, chulha band,     │ "gas leak nahi, pressure kam" is service fault, │
│               │ gas leak, tez boo, pipeline phat, hiss   │ NOT an emergency explosive hazard.              │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ sswmb         │ kachra para, koora dher, kundi overflow, │ "kachra kundi se nala block" requires dual      │
│               │ garbage dump, safai nahi, dead animal    │ waste + storm drain repair if both needed.      │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────────────────────────┤
│ sbca          │ building girne wali, pillar crack,       │ Mentioning construction site is not violation   │
│               │ daraar, illegal construction, 5 manzila  │ unless unauthorized/dangerous.                  │
└───────────────┴──────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 3. High-Variance Transliteration Normalization

In Roman Urdu, citizens write with vast orthographic freedom. The V10 normalizer standardizes phonetics with strict word boundaries (`\b`):

| Variant Input Forms | Canonical Normalized Form | Linguistic Justification |
| :--- | :--- | :--- |
| `humare`, `hmare`, `hmaray` | `hamare` | First-person plural possessive pronoun |
| `bohat`, `bht`, `bhut`, `bhot` | `bohot` | Universal intensifier ("very") |
| `zada`, `ziada`, `zayada` | `zyada` | Intensifier ("much / more") |
| `hoi v hai`, `hui v hai`, `hoi hui` | `hui hai` | Perfective aspect marker |
| `pass`, `pas` | `paas` | Proximity preposition ("near") |
| `theek`, `thik`, `thek` | `theek` | Adjective / verb ("repair / correct") |
| `kiya jae`, `kya jaye`, `karein` | `kiya jaye` | Passive injunctive verb ("should be done") |
| `nai`, `nhi`, `nhn`, `nay` | `nahi` | Negative particle ("not / no") |
| `hy`, `ha`, `h` | `hai` | Present auxiliary copula ("is") |
| `sadak`, `sarrak`, `sadrak` | `sarak` | Street / Road |
| `tooti`, `tuti`, `toot gayi` | `tooti` | Broken / Damaged |
| `gadda`, `gadday`, `khadday` | `khadda` | Pothole |
| `paani`, `paany` | `pani` | Water |
| `bijlee`, `electrcity` | `bijli` | Electricity |
| `kachraa`, `koora`, `kura` | `kachra` | Garbage / Solid waste |

---

## 4. Syntactic Negation Architecture

In civic Roman Urdu complaints, negative words behave dualistically:
1. **Affirmative Outage Claims:**
   Phrases like `bijli nahi aa rahi`, `pani nahi hai`, `gas nahi aa rahi`, `safai nahi hoti` indicate affirmative municipal service shortages. They must **never** be treated as negative dismissals.
2. **Defect Negations:**
   Phrases like `sarak theek hai tooti nahi`, `naali band nahi hai`, `gas leak nahi hai pressure kam hai`, `khatra nahi hai` explicitly deny the defect or emergency. The V10 preprocessor evaluates clause scopes to suppress false department alarms while capturing the true complaint.
