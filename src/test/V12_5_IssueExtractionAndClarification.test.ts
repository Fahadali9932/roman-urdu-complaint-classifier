/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V12.5 Regression Test Suite
 *
 * Verifies:
 * 1. IssueCandidate Schema & Granular Attribute Extraction (offsets, rationale, causality, landmarks)
 * 2. Multi-Department Reasoning (Arbitrary 2, 3, 4+ independent issues, complete pairwise graph edges)
 * 3. Clause-Level Hybrid Classification (Decision policy v11_hybrid_ml_relation_v7, secondary issue recovery)
 * 4. Greeting & Writing-Style Invariance (Formal/informal greetings, profanity, slang, spacing, code-switching)
 * 5. Targeted Intelligent Clarification V2 (4 specific questions, zero friction on clear complaints)
 * 6. Local AI Test Mode Preflight Integrity (Advisory preview, skip handling, no side effects)
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeComplaintRelationAware,
  normalizeRomanUrduText,
  segmentSpansWithOffsets,
  type IssueCandidate,
} from '../services/relationEngine';
import {
  classifyV11RelationAware,
  championV11Model,
} from '../services/v11InferenceAdapter';
import {
  assessComplaintDraft,
  resolveComplaintClarification,
  type ClarificationAnswer,
} from '../services/complaintUnderstanding';
import { LocalV11ComplaintService } from '../services/LocalV11ComplaintService';

describe('AWAAZ-E-AWAM — Phase V12.5 Advanced Issue Extraction & Clarification Suite', () => {
  describe('1. IssueCandidate Schema & Offset Parity (Objective 1)', () => {
    it('populates all mandatory candidate fields including offsets, rationale, and actionability', () => {
      const text = 'Sarak par bohot gehra gaddha hai aur public water pipe leak ho raha hai';
      const result = analyzeComplaintRelationAware(text, 'comp_v12_5_01');

      expect(result.issue_candidates.length).toBeGreaterThanOrEqual(2);
      for (const cand of result.issue_candidates) {
        expect(typeof cand.span_id).toBe('string');
        expect(typeof cand.span_start).toBe('number');
        expect(typeof cand.span_end).toBe('number');
        expect(cand.span_end).toBeGreaterThan(cand.span_start);
        expect(cand.span_text).toBeTruthy();
        expect(cand.normalized_text).toBeTruthy();
        expect(typeof cand.is_actionable).toBe('boolean');
        expect(typeof cand.negation_scope).toBe('boolean');
        expect(typeof cand.is_historical_or_resolved).toBe('boolean');
        expect(typeof cand.is_contextual_landmark).toBe('boolean');
        expect(typeof cand.decision_rationale).toBe('string');
        expect(cand.decision_rationale!.length).toBeGreaterThan(5);
      }
    });

    it('identifies historical / resolved issues with explicit non-actionability and rationale', () => {
      const text = 'Pehle road tooti hui thi lekin ab sarak theek ho chuki hai, magar sewer ka ganda pani abhi beh raha hai';
      const result = analyzeComplaintRelationAware(text);

      const kmcCand = result.issue_candidates.find((c) => c.department === 'kmc');
      expect(kmcCand).toBeDefined();
      expect(kmcCand?.is_actionable).toBe(false);
      expect(kmcCand?.is_historical_or_resolved).toBe(true);
      expect(kmcCand?.decision_rationale).toMatch(/resolved|repaired/i);

      const kwscCand = result.issue_candidates.find((c) => c.department === 'kwsc');
      expect(kwscCand).toBeDefined();
      expect(kwscCand?.is_actionable).toBe(true);
      expect(result.proposed_departments).toEqual(['kwsc']);
    });

    it('identifies contextual landmarks without assigning them as active defect departments', () => {
      const text = 'K-Electric transformer ke samne kachray ka dher laga hua hai, transformer bilkul safe hai';
      const result = analyzeComplaintRelationAware(text);

      const keCand = result.issue_candidates.find((c) => c.department === 'kelectric');
      expect(keCand).toBeDefined();
      expect(keCand?.is_actionable).toBe(false);
      expect(keCand?.is_contextual_landmark || keCand?.mention_type === 'negated_mention').toBe(true);

      expect(result.proposed_departments).toEqual(['sswmb']);
    });

    it('records downstream causal consequence relationship for motor outage caused by power failure', () => {
      const text = 'Main feeder trip hone se bijli band hai jis ki wajah se ghar ki pani ki motor ruk gayi hai';
      const result = analyzeComplaintRelationAware(text);

      const motorCand = result.issue_candidates.find((c) => c.mention_type === 'consequence');
      expect(motorCand).toBeDefined();
      expect(motorCand?.causal_relationship).toBe('consequence_of_root');
      expect(motorCand?.causal_target_dept).toBe('kelectric');
      expect(motorCand?.is_actionable).toBe(false);
      expect(result.proposed_departments).toEqual(['kelectric']);
    });
  });

  describe('2. Arbitrary Multi-Department Reasoning & Pairwise Graph (Objective 2)', () => {
    it('constructs complete pairwise independent graph edges for 2 departments', () => {
      const text = 'Main road par khadda hai aur gutter ka pani bhi ubhal raha hai';
      const result = analyzeComplaintRelationAware(text);

      expect(result.proposed_departments).toEqual(['kmc', 'kwsc']);
      expect(result.relation_summary).toBe('INDEPENDENT');
      expect(result.edges.length).toBe(1);
      expect(result.edges[0].source_id).toBe('kmc');
      expect(result.edges[0].target_id).toBe('kwsc');
    });

    it('constructs complete pairwise independent graph edges for 3 departments (3 edges)', () => {
      const text = 'Sarak tooti hui hai, sath mein bijli ka pole gir raha hai aur gali mein kachra bikhra para hai';
      const result = analyzeComplaintRelationAware(text);

      expect(result.proposed_departments).toEqual(['kelectric', 'kmc', 'sswmb']);
      expect(result.relation_summary).toBe('INDEPENDENT');
      // n*(n-1)/2 for n=3 is 3 edges: (kelectric-kmc, kelectric-sswmb, kmc-sswmb)
      expect(result.edges.length).toBe(3);
      const pairs = result.edges.map((e) => `${e.source_id}-${e.target_id}`);
      expect(pairs).toContain('kelectric-kmc');
      expect(pairs).toContain('kelectric-sswmb');
      expect(pairs).toContain('kmc-sswmb');
    });

    it('constructs complete pairwise independent graph edges for 4 departments (6 edges)', () => {
      const text = 'Road par gaddhe hain, gutter choke hai, gas ki pipeline leak hai aur bina permit illegal floor ban raha hai';
      const result = analyzeComplaintRelationAware(text);

      expect(result.proposed_departments).toEqual(['kmc', 'kwsc', 'sbca', 'ssgc']);
      expect(result.relation_summary).toBe('INDEPENDENT');
      // n*(n-1)/2 for n=4 is 6 edges
      expect(result.edges.length).toBe(6);
    });
  });

  describe('3. Clause-Level Hybrid Classification Strategy (Objective 3)', () => {
    it('uses decision policy v11_hybrid_ml_relation_v9', () => {
      const result = classifyV11RelationAware('Sarak tooti hai');
      expect(result.decisionPolicy).toBe('v11_hybrid_ml_relation_v9');
    });

    it('recovers secondary department diluted by long narrative via clause-level inference', () => {
      // Long narrative about electricity transformer issue followed by garbage fault
      const narrative =
        'Janab aali hamare ilaqay mein pichle teen hafton se K-Electric ka 11kv feeder aur transformer intehai shadeed maslay ka shikar hai, rojana char ghante load shedding hoti hai aur achanak high voltage aane se mohallay ke pankhe jal gaye hain, baraye meharbani is bijli ke feeder ko jald az jald theek karwayein. Aur sath wali gali mein do hafte se kachra jama hai koi safai nahi hoti.';

      const result = classifyV11RelationAware(narrative, championV11Model);
      expect(result.departments).toContain('kelectric');
      expect(result.departments).toContain('sswmb');
      expect(result.needsReview).toBe(false);
    });

    it('does not leak false positive departments through clause-level ML when explicitly negated', () => {
      const text = 'Transformer blast hua hai bijli band hai. Gali mein kachra bilkul nahi hai safai theek hai.';
      const result = classifyV11RelationAware(text, championV11Model);

      expect(result.departments).toEqual(['kelectric']);
      expect(result.departments).not.toContain('sswmb');
    });
  });

  describe('4. Greeting & Writing-Style Invariance (Objective 4)', () => {
    it('correctly classifies complaint despite respectful formal greetings', () => {
      const text = 'Assalam o alaikum janab aali muhtaram afsaran, arz yeh hai ke gali number 4 mein gas pipeline leak ho rahi hai';
      const result = classifyV11RelationAware(text, championV11Model);
      expect(result.departments).toEqual(['ssgc']);
      expect(result.needsReview).toBe(false);
    });

    it('correctly classifies complaint despite aggressive or profane expressions without altering civic fault', () => {
      const text = 'Bakwas service hai lanat ho tum logon par, teen din se sewer ka ganda pani road par darya bana hua hai!';
      const result = classifyV11RelationAware(text, championV11Model);
      expect(result.departments).toEqual(['kwsc']);
      expect(result.needsReview).toBe(false);
    });

    it('correctly normalizes missing spaces and joined particles', () => {
      const raw = 'bijlinahiaarahi aur sarakpar gaddhahai';
      const norm = normalizeRomanUrduText(raw);
      expect(norm).toMatch(/bijli nahi aa rahi/);
      expect(norm).toMatch(/sarak par/);
      expect(norm).toMatch(/gaddha hai/);

      const result = classifyV11RelationAware(raw, championV11Model);
      expect(result.departments).toEqual(['kelectric', 'kmc']);
    });
  });

  describe('5. Intelligent Clarification V2 (Objective 5)', () => {
    it('returns ready immediately for clear single-department complaints without clarification friction', () => {
      const clearComplaint = 'Hamari gali ki main road par bohot gehre khadday hain gaariyan phans rahi hain';
      const assess = assessComplaintDraft(clearComplaint);
      expect(assess.state).toBe('ready');
      if (assess.state === 'ready') {
        expect(assess.departments).toEqual(['kmc']);
      }
    });

    it('returns ready immediately for clear multi-department complaints without clarification friction', () => {
      const clearMulti = 'Road tooti hui hai aur sewer ka badboodar pani bhi gali mein khara hai';
      const assess = assessComplaintDraft(clearMulti);
      expect(assess.state).toBe('ready');
      if (assess.state === 'ready') {
        expect(assess.departments).toEqual(['kmc', 'kwsc']);
      }
    });

    it('triggers water_power_relation question when domestic motor failure is ambiguous with public supply', () => {
      const ambiguous = 'Bijli band hai aur pani bhi nahi aa raha';
      const assess = assessComplaintDraft(ambiguous);
      expect(assess.state).toBe('ask');
      if (assess.state === 'ask') {
        expect(assess.question.id).toBe('water_power_relation');
        expect(assess.question.kind).toBe('choice');
        expect(assess.question.prompt.en).toBeTruthy();
        expect(assess.question.prompt.ur).toBeTruthy();
        expect(assess.question.prompt.romanUrdu).toBeTruthy();
      }
    });

    it('triggers incomplete_secondary_relation question when complaint ends in a dangling connector', () => {
      const dangling = 'Gutter ubal raha hai aur is ke ilawa alag se';
      const assess = assessComplaintDraft(dangling);
      expect(assess.state).toBe('ask');
      if (assess.state === 'ask') {
        expect(assess.question.id).toBe('incomplete_secondary_relation');
        expect(assess.question.kind).toBe('details');
      }

      // Supplying clarification resolves it
      const resolved = resolveComplaintClarification(dangling, {
        draftText: dangling,
        questionId: 'incomplete_secondary_relation',
        details: 'Gali ki street lights bhi band hain',
      });
      expect(resolved.state).toBe('ready');
      if (resolved.state === 'ready') {
        expect(resolved.departments).toEqual(['kmc', 'kwsc']);
      }
    });

    it('triggers landmark_infrastructure_relation question when a utility asset is mentioned only as landmark', () => {
      const text = 'Electric pole ke paas kachra para hai';
      const assess = assessComplaintDraft(text);
      expect(assess.state).toBe('ask');
      if (assess.state === 'ask') {
        expect(assess.question.id).toBe('landmark_infrastructure_relation');
        expect('targetDept' in assess.question && assess.question.targetDept).toBe('kelectric');
      }

      // Answering that the landmark asset is ALSO defective adds it
      const resolvedDefective = resolveComplaintClarification(text, {
        draftText: text,
        questionId: 'landmark_infrastructure_relation',
        choice: 'asset_also_defective',
      });
      expect(resolvedDefective.state).toBe('ready');
      if (resolvedDefective.state === 'ready') {
        expect(resolvedDefective.departments).toEqual(['kelectric', 'sswmb']);
      }

      // Answering that it is only a landmark keeps only SSWMB
      const resolvedLandmarkOnly = resolveComplaintClarification(text, {
        draftText: text,
        questionId: 'landmark_infrastructure_relation',
        choice: 'landmark_only',
      });
      expect(resolvedLandmarkOnly.state).toBe('ready');
      if (resolvedLandmarkOnly.state === 'ready') {
        expect(resolvedLandmarkOnly.departments).toEqual(['sswmb']);
      }
    });

    it('triggers resolved_historical_relation question when historical defect is ambiguous', () => {
      const text = 'Pehle gas ka masla theek ho gaya tha lekin kachra nahi uth raha';
      const assess = assessComplaintDraft(text);
      expect(assess.state).toBe('ask');
      if (assess.state === 'ask') {
        expect(assess.question.id).toBe('resolved_historical_relation');
        expect('targetDept' in assess.question && assess.question.targetDept).toBe('ssgc');
      }

      // Answering still unresolved adds SSGC back
      const resolvedUnresolved = resolveComplaintClarification(text, {
        draftText: text,
        questionId: 'resolved_historical_relation',
        choice: 'still_unresolved',
      });
      expect(resolvedUnresolved.state).toBe('ready');
      if (resolvedUnresolved.state === 'ready') {
        expect(resolvedUnresolved.departments).toEqual(['ssgc', 'sswmb']);
      }
    });

    it('safely routes skipped clarification to review without guessing or failing', () => {
      const ambiguous = 'Bijli band hai aur pani bhi nahi aa raha';
      const skipped = resolveComplaintClarification(ambiguous, {
        draftText: ambiguous,
        questionId: 'water_power_relation',
        skip: true,
      });
      expect(skipped.state).toBe('review');
      if (skipped.state === 'review') {
        expect(skipped.reason).toBe('CLARIFICATION_SKIPPED');
      }
    });
  });

  describe('6. Local Service Preflight Integrity (Objective 6)', () => {
    it('executes previewComplaint and resolvePreview via LocalV11ComplaintService without database writes', async () => {
      const service = new LocalV11ComplaintService();
      const text = 'Pole ke paas kachra para hai';

      const preview = service.previewComplaint(text);
      expect(preview.state).toBe('ask');

      const resolved = service.resolvePreview(text, {
        draftText: text,
        questionId: 'landmark_infrastructure_relation',
        choice: 'landmark_only',
      });
      expect(resolved.state).toBe('ready');

      // Zero complaints were created during preflight preview or clarification
      const recorded = await service.getComplaints();
      expect(recorded.length).toBe(0);
    });
  });
});
