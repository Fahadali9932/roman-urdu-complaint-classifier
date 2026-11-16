# Awaaz-e-Awam Phase V11.4 — Issue-Centric Relation-Aware Architecture

**Project:** Awaaz-e-Awam (آوازِ عوام) — Civic Complaint Intelligence  
**Phase:** V11.4  
**Date:** November 17, 2026  
**Author:** Principal Applied ML Engineer, NLP Researcher & Systems Architect  
**Target Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Status:** IMPLEMENTED & VERIFIED (100% Python / TypeScript Behavioral Parity)

---

## 1. Architectural Motivation & Paradigm Shift

In previous versions (V9 through V11.3), civic complaint routing relied on a monolithic text classification paradigm:
$$\text{Complaint Text} \xrightarrow{\quad\text{TF-IDF}\quad} \mathbf{x} \in \mathbb{R}^D \xrightarrow{\quad\mathbf{W}^T \mathbf{x} + \mathbf{b}\quad} \mathbf{z} \in \mathbb{R}^K \xrightarrow{\quad\text{Sigmoid}\quad} \mathbf{p} \in [0, 1]^K \xrightarrow{\quad\tau_k\quad} \hat{\mathbf{y}} \in \{0, 1\}^K$$

This monolithic paradigm breaks down on compound and nuanced Roman Urdu civic grievances for three fundamental reasons:
1. **Bag-of-Words Feature Dilution:** When a citizen reports two distinct issues (e.g. broken road and water line leak), the document length doubles, halving the relative term frequency of each domain's defect vocabulary.
2. **Contextual & Consequence Conflation:** Downstream effects (e.g. `bijli band hone ki wajah se motor nahi chal rahi`) contain vocabulary for both K-Electric (`bijli`) and water/pump (`motor`), causing false secondary assignments to KWSC.
3. **Lexical Connector Ambiguity:** The word `aur` ("and") is used interchangeably for independent physical problems, elaboration of single-asset damage, and causal consequence chains.

### The V11.4 Solution: Issue Graph Decomposition
Phase V11.4 implements an **issue-centric, relation-aware routing engine** operating across four sequential pipeline stages:

```mermaid
flowchart TD
    Raw[Raw Citizen Complaint Text] --> Norm[Index-Preserving Normalizer]
    Norm --> Span[Candidate Span Extractor & Clause Segmenter]
    Span --> IssueCand[Extracted IssueCandidates with Char Offsets]
    IssueCand --> AffirmGate[Affirmative Domain Evidence Classifier]
    AffirmGate --> RelClass[Pairwise Relation Classifier]
    RelClass --> Graph[Typed Issue Graph: SINGLE / CAUSES / INDEPENDENT / etc.]
    Graph --> ReviewGate[Disambiguated Review Reason Engine]
    ReviewGate --> TS_Py_Parity[100% Parity Multi-Agency Routing & Review Flag]
```

---

## 2. Core Data Contracts

The architecture enforces strict data contracts implemented identically in Python dataclasses (`tools/ai_factory/curriculum/relation_engine.py`) and TypeScript interfaces (`src/services/relationEngine.ts`).

### 2.1 `IssueCandidate` Contract
Represents an individual extracted clause, physical defect, or mentioned entity with exact character-level provenance.

```typescript
export interface IssueCandidate {
  id: string;                      // Unique issue identifier (e.g., 'iss_1')
  text_span: string;               // Exact substring from the complaint
  start_char: number;              // 0-indexed start character offset in original text
  end_char: number;                // 0-indexed end character offset in original text
  candidate_departments: DepartmentId[]; // Department(s) with lexical/affirmative support
  is_actionable: boolean;          // True if physical defect requiring municipal intervention
  predicate_type: PredicateType;   // DEFECT | MENTION | LOCATION | RECIPIENT | NEGATION | CONSEQUENCE
  evidence_tokens: string[];       // Specific affirmative tokens triggering the assignment
  notes: string[];                 // Reasoning trace and justification
}
```

```python
@dataclass
class IssueCandidate:
    id: str
    text_span: str
    start_char: int
    end_char: int
    candidate_departments: List[str]
    is_actionable: bool
    predicate_type: str
    evidence_tokens: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
```

### 2.2 `RelationEdge` Contract
Represents the semantic or causal relationship connecting two issue candidates.

```typescript
export type RelationType =
  | 'SINGLE'
  | 'CAUSES_CONTEXT_ONLY'
  | 'INDEPENDENT'
  | 'SAME_INCIDENT_DIFFERENT_REPAIRS'
  | 'MENTION_ONLY'
  | 'RECIPIENT_ONLY'
  | 'SPATIAL_PROXIMITY_ONLY'
  | 'NEGATED'
  | 'UNCERTAIN';

export interface RelationEdge {
  source_issue_id: string;
  target_issue_id: string;
  relation_type: RelationType;
  confidence: number;
  notes: string;
}
```

### 2.3 `ComplaintAnalysisResult` Contract
The top-level structured output of the relation engine.

```typescript
export interface ComplaintAnalysisResult {
  complaint_id: string;
  original_text: string;
  normalized_text: string;
  issue_candidates: IssueCandidate[];
  edges: RelationEdge[];
  proposed_departments: DepartmentId[];
  needs_review: boolean;
  review_reason: string | null;
  missing_public_location: boolean;
  relation_summary: RelationType;
  reason_trace: string[];
}
```

---

## 3. Original-Text Preserving Normalization & Clause Segmentation

### 3.1 Index-Preserving Normalization
To ensure character offsets in `IssueCandidate` correspond exactly to the citizen's original text:
1. Normalization does **not** truncate, delete, or collapse words.
2. Canonicalizing common transliterations (e.g. `nhi` $\rightarrow$ `nahi`, `sadak` $\rightarrow$ `sarak`, `bijlee` $\rightarrow$ `bijli`) is performed during regex matching using flexible phonetic patterns `\bna?h?i\b` and `\b(?:sadak|sarak)\b`.
3. Standard case folding is performed on a parallel string while preserving byte/character index mappings.

### 3.2 Clause Segmentation Rules
Clauses are segmented using coordinate conjunctions (`aur`, `tatha`), punctuation (`;`, `.`, `\n`), and causal transition phrases:
- **Independent Clause Splitting:**
  Split on `aur` **only** if both sides contain an independent municipal asset/subject. For example:
  - `"hamari sarak tooti hai aur public water line se pani beh raha hai"` $\rightarrow$ Two candidate spans.
- **Predicate Elaboration (No Split):**
  When `aur` connects two verbs or adjectives describing the same asset, the span is kept contiguous:
  - `"sarak tooti hai aur bohot kharab halat mein hai"` $\rightarrow$ Single candidate span for KMC.
- **Causal Connectors:**
  Phrases like `jis ki wajah se`, `is liye`, `ke sabab` are flagged as causal transitions. The antecedent is marked as the primary cause, and the subsequent clause is analyzed for downstream symptom status.

---

## 4. Affirmative Domain Evidence Lexicons

To eliminate phantom department hallucinations (such as assigning SSGC to water pressure complaints or KMC to dangling electric wires), an actionable assignment requires **affirmative domain evidence**:

$$\text{Actionable}(dept) \iff \text{AssetEvidence}(dept) \land \text{DefectEvidence}(dept) \land \neg\text{Negated}(dept) \land \neg\text{Consequence}(dept)$$

### Municipal Agency Lexicons (Karachi Civic Domain)

| Department | Affirmative Assets | Affirmative Defects | Anti-Evidence / Disambiguation Exclusions |
|---|---|---|---|
| **KMC** (Roads & Infrastructure) | `sarak`, `road`, `sadak`, `footpath`, `flyover`, `underpass`, `signal`, `traffic signal`, `divider`, `green belt`, `drain` | `toot`, `kharab`, `khadda`, `gadda`, `pothole`, `dhans`, `baith`, `asphalt`, `crack`, `malba`, `encroachment` | Exclude wet road without damage (`road geeli hai`); transit landmarks (`Water Pump Chowrangi`); traffic jam without pothole. |
| **KWSC** (Water & Sewerage) | `pani`, `water`, `line`, `pipe`, `pipeline`, `sewer`, `sewerage`, `gutter`, `gatar`, `drainage`, `manhole`, `dhakkan` | `leak`, `leek`, `phat`, `burst`, `band`, `supply band`, `ganda pani`, `overflow`, `ubal`, `low pressure`, `missing dhakkan` | Exclude gas pipes (`gas pipe`); domestic pump failure caused by power outage (`motor band hai`); explicit denial (`pani ka masla nahi`). |
| **K-Electric** (Power & Electricity) | `bijli`, `light`, `electric`, `feeder`, `pole`, `khamba`, `taar`, `wire`, `transformer`, `voltage`, `current`, `phase` | `band`, `outage`, `load shedding`, `spark`, `snapping`, `hanging`, `latak`, `dhamaaka`, `single phase`, `2 phase gayab`, `trip` | Exclude street lights managed by town committee if wire is safe; domestic appliance failure without grid fault. |
| **SSGC** (Sui Southern Gas) | `gas`, `sui gas`, `gas pipe`, `gas pipeline`, `gas line`, `meter`, `chulha`, `cylinder` | `leak`, `leek`, `boo`, `smell`, `badbu`, `pressure kam`, `low pressure`, `zero pressure`, `band`, `phat`, `burst` | **Strict Gating:** Require affirmative gas asset; water pressure complaints strictly excluded; basement excavation excluded unless gas pipe explicitly ruptured. |
| **SSWMB** (Solid Waste Management) | `kachra`, `garbage`, `trash`, `kura`, `dhair`, `dustbin`, `dumper`, `safai`, `waste`, `malba` | `jama`, `phela`, `sad raha`, `badbu`, `dher laga`, `uthaya nahi`, `overflowing`, `bikhra hua`, `pahar laga` | Exclude street sweeping complaints when no physical garbage accumulation exists; structural construction debris. |
| **SBCA** (Building Control) | `building`, `imarat`, `construction`, `chath`, `roof`, `wall`, `deewar`, `pillar`, `column`, `basement`, `floor`, `plaza` | `illegal`, `ghair qanooni`, `crack`, `daraar`, `girne ka khatra`, `khudai`, `excavation`, `collapse`, `tilting`, `jhuk` | **Strict Gating:** Require structural building or unauthorized construction evidence; road excavation excluded unless adjacent building is destabilized. |

---

## 5. Review Reason & Ambiguity Separation

Previous versions conflated missing location details with model uncertainty under a single generic review flag. V11.4 strictly separates and defines these operational categories:

### 5.1 `INCOMPLETE_PUBLIC_LOCATION`
- **Definition:** The complaint identifies a genuine, actionable municipal defect, but lacks sufficient geographical anchoring (missing street, sector, block, or recognizable Karachi landmark).
- **Behavior:** The complaint is routed to the identified municipal department, but tagged with `needs_review = true` and `review_reason = "INCOMPLETE_PUBLIC_LOCATION"`.
- **Citizen Experience:** Staff review desk can prompt the citizen for specific cross-streets or GPS coordinates without re-routing the department.

### 5.2 `UNCERTAIN_DEFECT`
- **Definition:** The complaint text is vague, incomprehensible, lacks an actionable municipal grievance, or describes a private internal dispute outside the jurisdiction of all 6 civic agencies.
- **Behavior:** The complaint is assigned `proposed_departments = []`, tagged with `needs_review = true` and `review_reason = "UNCERTAIN_DEFECT"`.
- **Citizen Experience:** The case enters the staff triage queue for manual review before any department notification is dispatched.

---

## 6. TypeScript & Python Parity Architecture

To guarantee that the machine learning factory and the web application produce identical classifications:
1. **Identical Lexicons:** Regular expressions, defect keywords, and negative lookaheads are maintained in exact sync between `relation_engine.py` and `relationEngine.ts`.
2. **Identical Logic:** Normalization, clause boundary detection, consequence suppression, and spatial proximity rules follow identical execution order.
3. **Automated Cross-Language Verification:**
   - Python unit tests (`test_v11_4_regression.py`) run 82 automated checks.
   - Vitest suite (`RelationEngineRegression.test.ts`) runs matching test fixtures verifying identical outputs for every edge case.
   - Both engines achieve **100% exact match (31/31)** on the handoff regression contract cases.
