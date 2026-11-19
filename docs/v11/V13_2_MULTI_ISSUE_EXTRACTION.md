# AWAAZ-E-AWAM — PHASE V13.2 MULTI-ISSUE EXTRACTION SPECIFICATION
## Discourse Segmentation, Civic Defect Grounding & Fahad's Routing Rule

**Phase:** V13.2  
**Date:** 20 November 2026  
**Status:** Implemented & Verified in TypeScript & Python  
**Target Deadline:** 5 December 2026  
**Budget:** Strictly $0

---

## 1. Problem Formulation: Unpunctuated Multi-Issue Paragraphs

A major failure mode in Roman Urdu complaint processing is the "run-on paragraph". Citizens submit lengthy narratives combining multiple civic faults without formal sentence punctuation (periods or semicolons). 

For example, the Basia Bungalows acceptance case:
> `"Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he"`

Conventional bag-of-words or global TF-IDF approaches fail on such paragraphs because:
1. Lexical features are diluted across the entire text length.
2. A single dominant keyword cluster (e.g., location anchor) can overshadow secondary defects.
3. Causal dependencies (e.g., transformer fire causing water pump outage) cannot be distinguished from independent municipal faults.

Phase V13.2 introduces the **Discourse Clause Segmentation & Civic Issue Extraction Engine**:
- TypeScript: `src/services/v13_2/issueExtractor.ts`
- Python: `tools/ai_factory/v13_2_issue_extractor.py`

---

## 2. Discourse Boundary Segmentation

Rather than relying purely on standard punctuation (`.`, `!`, `?`), the V13.2 engine segments narratives using civic discourse boundary connectives while preserving intra-department compound defects:

```regex
\b(aur\s+alag\s+se|aur\s+doosra\s+masla|aur\s+mazeed\s+yeh\s+ke|aur\s+sath\s+hi\s+sath|doosri\s+taraf|doosri\s+gali\s+mein|saath\s+wali|aur\s+pichlay|jis\s+ki\s+wajah\s+se|us\s+ki\s+wajah\s+se|is\s+wajah\s+se|isi\s+liye|ke\s+sabab|ke\s+natijay\s+mein|jis\s+se|lekin\s+ab|magar\s+ab|jabke|halanke|or\s+sth\s+wali)\b
```

Crucially, standard intra-agency conjunctions (e.g., `sadak toot gayi aur khadda ho gaya` or `light chali gayi aur transformer jal gaya`) are **not** split into separate issues because both clauses describe aspects of the same departmental responsibility.

---

## 3. Civic Asset and Defect Lexicon Grounding

For each segmented clause, the extractor evaluates domain lexicons across Karachi's six municipal bodies:

```
                          Segmented Clause
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
    Asset Identified?     Defect Identified?   Standalone Defect?
           │                     │                     │
           └──────────┬──────────┘                     │
                      ▼                                │
            Both Affirmative? ◄────────────────────────┘
                      │
                      ▼
            Issue Candidate Created
```

Each extracted issue is assigned a categorical status:
- `INDEPENDENT_FAULT`: Actionable municipal problem requiring independent agency dispatch.
- `CAUSAL_CONSEQUENCE`: Symptom caused by another root issue; suppressed under Fahad's rule.
- `HISTORICAL_RESOLVED`: Defect was already repaired previously; informational only.
- `NEGATED_MENTION`: Explicitly asserted to be functional/defect-free (`pani theek hai`).
- `LOCATION_ONLY`: Asset mentioned purely as a spatial landmark (`road par kachra para hai`).

---

## 4. Fahad's Causal Routing Rule: Root vs. Consequence

Fahad's municipal routing principle states:
> *"One reported fault plus its stated consequences goes only to the department responsible for the original fault. Two independently reported faults go to both departments."*

The V13.2 engine enforces this cross-clause causal linking across four primary municipal dynamics:

1. **Power Outage -> Domestic Water Motor Failure:**
   - Text: `"Transformer phat gaya jis ki wajah se pani ki motor nahi chal rahi"`
   - Root Dept: `kelectric` (Transformer blast)
   - Consequence Dept: `kwsc` (Motor stopped)
   - Resolution: Demote `kwsc` to `CAUSAL_CONSEQUENCE`. Route **only** to `kelectric`.
2. **Water Main Burst -> Road Surface Erosion:**
   - Text: `"Main water supply line phat chuki hai jis ki wajah se road toot gayi"`
   - Root Dept: `kwsc` (Water supply line burst)
   - Consequence Dept: `kmc` (Road crater)
   - Resolution: Demote `kmc` to `CAUSAL_CONSEQUENCE`. Route **only** to `kwsc`.
3. **Gas Excavation -> Road Trench:**
   - Text: `"Gas pipeline ki khudai ki gayi thi jis se road par khadda ho gaya"`
   - Root Dept: `ssgc` (Pipeline excavation)
   - Consequence Dept: `kmc` (Road trench)
   - Resolution: Demote `kmc` to `CAUSAL_CONSEQUENCE`. Route **only** to `ssgc`.
4. **Garbage Pile -> Drainage Sewer Blockage:**
   - Text: `"Kachray ka dher gir gaya jis ke sabab gutter choke ho gaya"`
   - Root Dept: `sswmb` (Solid waste pile)
   - Consequence Dept: `kwsc` (Sewer blockage)
   - Resolution: Demote `kwsc` to `CAUSAL_CONSEQUENCE`. Route **only** to `sswmb`.

---

## 5. De-biasing KMC Spatial Anchors

In Karachi complaints, words like `road`, `sarak`, or `gali` frequently appear merely as prepositional locations (e.g., `"road par transformer jal gaya"` or `"sarak par kachra para hai"`).

V13.2 evaluates spatial anchor patterns:
```regex
\b(?:road|sarak|gali|footpath|chowrangi)\s+(?:par|pe|mein|me|ke\s+kinare|ke\s+samne)\s+(?:kachra|gutter|pani|taar|gas|wire|dher)\b
```
Unless affirmative road damage keywords (`toot`, `tooti`, `khadda`, `khadday`, `crater`, `asphalt`, `pothole`, `dhans`) are present in the clause, KMC is tagged as `LOCATION_ONLY` and suppressed from the assigned department set.

---

## 6. Basia Bungalows Acceptance Verification

**Input Text:**
> `"Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he"`

**Extraction Trace:**
1. Clause 1: `"salam janab basia banglows block 4 gulshan me bijli ka transformer jal gaya he kal rat se andhera he"`
   - Dept: `kelectric` | Status: `INDEPENDENT_FAULT` (Transformer burnt)
2. Clause 2: `"saath wali road bhi tooti hui he"`
   - Dept: `kmc` | Status: `INDEPENDENT_FAULT` (Broken road)
3. Clause 3: `"kachra bhi para he"`
   - Dept: `sswmb` | Status: `INDEPENDENT_FAULT` (Solid waste accumulation)

**Output Assignment:** `['kelectric', 'kmc', 'sswmb']`  
Zero suppression from spelling errors (`bejli`, `tranforma`, `rod`, `tuti`, `sth`). Exact multi-agency routing verified.
