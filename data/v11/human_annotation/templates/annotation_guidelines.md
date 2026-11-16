# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.2B
## HUMAN DATA ANNOTATION GUIDELINES & PROTOCOL SPECIFICATION

**Document Version:** 1.0.0  
**Phase:** V11.2B — Human-Data Training and Independent Evaluation  
**Audience:** Citizen Data Collectors, Roman Urdu Annotators, and Senior Adjudicators  

---

### 1. Objective and Core Principles

Our mission is to establish a truthful, verified, and privacy-protected dataset of **300–500 genuine human-written Roman Urdu civic complaints** from Karachi residents. 

#### Golden Rules of Annotation:
1. **Physical Actionability Rule:** Only assign a department if the complaint describes a physical public infrastructure defect that the department is legally mandated to repair.
2. **Symptom Non-Actionability Rule:** Downstream consequences (e.g. domestic water motor failure during a power cut) must **NOT** generate tasks for secondary utility agencies.
3. **Addressee Mention Rule:** Mentioning an agency name as a conversational recipient (*"K-Electric wale please note karen..."*) does **NOT** make that agency an issue owner.
4. **Negation Protection:** If a citizen explicitly states that a service or infrastructure component is intact (*"sarak theek hai"*, *"gas leak nahi hai"*), the denied department must **NOT** be assigned.
5. **Blinded Independence:** Annotator 1 and Annotator 2 must annotate all complaints independently without viewing each other's labels.

---

### 2. Department Boundary Reference Guide

| Agency Key | Authority | Mandated Physical Scope | What is NOT Mandated (Common False Assigns) |
|---|---|---|---|
| `kmc` | **Karachi Metropolitan Corporation** | Main roads, asphalt damage, potholes, sinkholes, arterial footpaths, bridges, flyovers, stormwater drains, municipal street lighting. | Bare electrical wires on footpaths without road damage (this is `kelectric`); sewage puddles making road wet without pavement collapse (this is `kwsc`). |
| `kwsc` | **Karachi Water & Sewerage Corporation** | Piped public water mains, total water cutoffs, dirty tap water, overflowing public manholes, blocked public sewers. | Private domestic suction pump failures caused by power outages (this is `kelectric`). Domestic plumbing inside private homes is out of scope. |
| `kelectric` | **K-Electric** | Power blackouts, frequent feeder trips, low voltage/brownouts, transformer explosions/fires, loose or fallen live high-voltage wires, sparking poles. | Municipal streetlights that are turned off when residential power is intact (this is `kmc`). |
| `ssgc` | **Sui Southern Gas Company** | Natural gas pipeline supply cutoffs, critically low gas pressure, public gas distribution leaks, gas odor/hissing. | Low water pressure (this is `kwsc`); domestic LPG gas cylinder issues (private/emergency). |
| `sswmb` | **Sindh Solid Waste Management Board** | Public street sweeping neglect, overflowing neighborhood dumpsters, roadside trash heaps, dead animal carcass removal, illegal dumping. | Clean streets where only road asphalt is broken (this is `kmc`). |
| `sbca` | **Sindh Building Control Authority** | Deep structural building cracks, illegal extra floors, illegal basement excavations destabilizing neighbors, hazardous leaning structures, falling concrete debris. | Roadside vendor thelas/kiosks (this is `kmc` anti-encroachment). |

---

### 3. Issue Spans and Character Offsets

For every identified actionable issue:
- Identify the exact continuous clause in `complaint_text` describing the defect.
- Record `start_char` (0-indexed start) and `end_char` (exclusive end).
- Copy the exact substring into `span_text`.

*Example:*
```json
{
  "complaint_text": "Disco bakery ke samne main road par bara khadda hai",
  "issues": [
    {
      "issue_id": "sub_01_iss1",
      "department_key": "kmc",
      "issue_type": "road_damage",
      "span_text": "main road par bara khadda hai",
      "start_char": 22,
      "end_char": 51,
      "severity": "medium"
    }
  ]
}
```

---

### 4. Causal & Relational Taxonomy

When more than one issue or symptom is present, assign an explicit relation:

| Relation Type | Definition | Operational Routing Behavior |
|---|---|---|
| `INDEPENDENT` | Two separate, unrelated defects co-occurring in the area (e.g. road pothole + power blackout). | Route to **both** agencies as separate actionable work orders. |
| `CAUSES` | Source issue induces target symptom (e.g. power blackout induces domestic water motor stoppage). | Route **only** to source agency (`kelectric`). Target (`kwsc`) is suppressed as non-actionable. |
| `EFFECT_OF` | Inverse of `CAUSES`. | Downstream effect is suppressed. |
| `SAME_INCIDENT_DIFFERENT_REPAIRS` | A single physical event damages multiple agencies' assets (e.g. burst water trunk main erodes road pavement). | Route to **both** agencies as linked dual work orders. |
| `MENTION_ONLY` | Agency named as addressee (*"KMC please dekhein, sewer ubal raha hai"*). | Suppress named addressee; route only to aggrieved asset owner (`kwsc`). |
| `UNCERTAIN` | Citizen expresses speculation or causal conjecture (*"shayad bijli ki wajah se pani nahi"*). | Hold for human staff triage (`needs_review: true`). |

---

### 5. Negation and Contextual Indicators

- **Outage Affirmations vs. Defect Negations:**
  - *"pani nahi hai"* = Outage affirmation $\to$ assign `kwsc`.
  - *"sarak kharab nahi hai"* = Defect negation $\to$ record in `context.negated_departments: ["kmc"]`, do NOT assign `kmc`.
- **Life-Safety Hazards:**
  - If bare sparking wires, live wires in standing water, strong gas hissing/odor, or imminent building collapse are mentioned, set `context.has_hazard: true` and specify `context.hazard_type`.

---

### 6. Review Necessity Gate (`needs_review`)

Set `needs_review: true` if and only if the complaint cannot be safely auto-routed:
- `UNCERTAIN_DEFECT`: Unclear which agency owns the defect.
- `VAGUE_UNSPECIFIED`: Vague claim with zero physical service detail (*"har taraf maslay hain koi sunwai nahi"*).
- `INSUFFICIENT_DETAIL`: Too short or missing critical description to identify any department.
- `CONTRADICTORY_CLAIMS`: Contradictory statements that cannot be resolved textually.
- `OUT_OF_MUNICIPAL_JURISDICTION`: Federal, provincial, or private matter (e.g. mobile SIM network, private landlord dispute).
- `PRIVATE_DISPUTE`: Civil neighborhood dispute without public infrastructure defect.

---

### 7. Citizen Privacy, PII Scrubbing, and Consent

- **Mandatory Consent:** Every human complaint must originate from a citizen who consented to public grievance tracking (`consent_confirmed: true`).
- **Zero Real PII in Training or Evaluation:**
  - Phone numbers must be redacted or scrubbed.
  - CNICs must be redacted or scrubbed.
  - Email addresses must be redacted.
  - Specific private residences with unit numbers (*"House 14-B"*, *"Flat 502"*) must be generalized to the public street or landmark (*"Near Disco Bakery, Street 4"*).
  - General words like *makanon*, *flaton*, *ploton* are permitted.
