/**
 * AWAAZ-E-AWAM — Phase V13.3 AI Reasoning Integrity & Factual Explanations Regression Suite
 *
 * Verifies:
 * 1. Exact reproduction complaint routing: routes to KELECTRIC and KMC without contradiction.
 * 2. Zero contradictory audit notes: never emits a suppression note for a selected department.
 * 3. Dynamic model thresholds: reports actual model threshold (25% for Run004 KE) rather than hardcoded constants.
 * 4. Strict location source attribution: distinguishes narrative text from form metadata and unprovided locations.
 * 5. Grounded multi-issue factual summary: accurately captures power outage duration (10 days) and broken road without hallucinations.
 * 6. Evidence rendering clean text: prevents duplicate label string concatenation.
 * 7. Decision records integrity: 6-authority audit table contract.
 */

import { describe, it, expect } from 'vitest';
import { LocalV11ComplaintService } from '../services/LocalV11ComplaintService';
import { classifyV13_2 } from '../services/v13_2/v13_2_engine';
import { championV11Model } from '../services/v11InferenceAdapter';
import {
  detectLocationAttribution,
  extractDurationText,
  generateGroundedFactualSummary,
} from '../services/v13_3/factualSummaryEngine';
import type { ComplaintSubmissionInput } from '../types';

describe('PHASE V13.3 — AI Reasoning Integrity & Explanation Verification', () => {
  const service = new LocalV11ComplaintService();
  service.setEngineMode('v13_2_candidate');

  const REPRODUCTION_COMPLAINT =
    'Assalamualaikum hamare area mein 10 din se bejli ni arhi. Tranforma khrab hai aur hamari gali ki rod bhi tut gai hai. Barish hoti hai to bohot kichar hota hai. Hum shikayat kar kar ke thak gaye hain.';

  it('1. routes reproduction complaint to KELECTRIC and KMC without review or false suppression', async () => {
    const input: ComplaintSubmissionInput = {
      citizenName: 'Fahad Ali',
      district: 'District East',
      locality: 'Gulshan-e-Iqbal',
      description: REPRODUCTION_COMPLAINT,
    };

    const submission = await service.submitComplaint(input);
    const analysis = submission.v11Analysis!;

    // Expected: K-Electric and KMC both assigned
    expect(analysis.departments).toContain('kelectric');
    expect(analysis.departments).toContain('kmc');
    expect(analysis.needsReview).toBe(false);

    // K-Electric & KMC in assigned departments
    expect(submission.departments).toContain('kelectric');
    expect(submission.departments).toContain('kmc');

    // SSWMB should NOT be selected for rainwater mud
    expect(analysis.departments).not.toContain('sswmb');
  });

  it('2. guarantees single authoritative audit notes without contradictory suppression traces', async () => {
    const input: ComplaintSubmissionInput = {
      citizenName: 'Fahad Ali',
      district: 'District East',
      locality: 'Gulshan-e-Iqbal',
      description: REPRODUCTION_COMPLAINT,
    };

    const submission = await service.submitComplaint(input);
    const analysis = submission.v11Analysis!;

    // Audit notes must state KMC is SELECTED
    const kmcSelectedNote = analysis.notes.some((n) => n.includes('[SELECTED] KMC'));
    expect(kmcSelectedNote).toBe(true);

    // Audit notes must NEVER state KMC is SUPPRESSED when it was selected!
    const kmcSuppressedNote = analysis.notes.some((n) =>
      n.toLowerCase().includes('suppressed kmc')
    );
    expect(kmcSuppressedNote).toBe(false);

    // Decision records must have KMC status as SELECTED
    const kmcRecord = analysis.decisionRecords?.find((r) => r.department === 'kmc');
    expect(kmcRecord).toBeDefined();
    expect(kmcRecord?.status).toBe('SELECTED');
  });

  it('3. reports dynamic model thresholds matching active model weights', async () => {
    const res = classifyV13_2(REPRODUCTION_COMPLAINT, championV11Model as any);

    // Run004 threshold for kelectric is 0.25 (not 0.32)
    expect(res.thresholds['kelectric']).toBe(0.25);
    expect(res.thresholds['kmc']).toBe(0.25);

    const keRecord = res.decisionRecords.find((r) => r.department === 'kelectric');
    expect(keRecord?.threshold).toBe(0.25);
  });

  it('4. strictly attributes location sources between narrative text and form metadata', () => {
    // A. Location in text
    const attrText = detectLocationAttribution(
      'Humare Nazimabad No 2 mein transformer phat gaya hai',
      'Gulshan',
      ''
    );
    expect(attrText.source).toBe('COMPLAINT_TEXT');
    expect(attrText.localityName).toBe('Nazimabad');
    expect(attrText.isTextGrounded).toBe(true);

    // B. Location only in form metadata
    const attrForm = detectLocationAttribution(
      'Gali ki sarak toot gayi hai aur transformer kharab hai',
      'Liaquatabad',
      'Near Super Market'
    );
    expect(attrForm.source).toBe('FORM_METADATA');
    expect(attrForm.localityName).toBe('Liaquatabad');
    expect(attrForm.isTextGrounded).toBe(false);
    expect(attrForm.attributionNotice).toContain('Supplied in applicant form details');

    // C. Location not provided
    const attrNone = detectLocationAttribution(
      'Pani nahi araha aur bijli band hai',
      '',
      ''
    );
    expect(attrNone.source).toBe('NOT_PROVIDED');
    expect(attrNone.isTextGrounded).toBe(false);
  });

  it('5. generates grounded multi-issue factual summary with duration extraction without paid LLMs', () => {
    const duration = extractDurationText(REPRODUCTION_COMPLAINT);
    expect(duration).toBeDefined();
    expect(duration?.plain).toBe('ten days');

    const attr = detectLocationAttribution(REPRODUCTION_COMPLAINT, 'Gulshan-e-Iqbal', null);
    const summary = generateGroundedFactualSummary({
      rawText: REPRODUCTION_COMPLAINT,
      normalizedText: REPRODUCTION_COMPLAINT.toLowerCase(),
      departments: ['kelectric', 'kmc'],
      issues: [
        { department: 'kelectric', evidenceSpan: 'bejli ni arhi. Tranforma khrab hai', status: 'actionable' },
        { department: 'kmc', evidenceSpan: 'gali ki rod bhi tut gai hai', status: 'actionable' },
      ],
      locationInfo: attr,
    });

    // Heading must reflect both authorities
    expect(summary.heading).toContain('Electricity Outage');
    expect(summary.heading).toContain('Damaged Road');

    // Summary must describe both issues and duration
    expect(summary.factualSummary).toContain('electricity has been unavailable for ten days');
    expect(summary.factualSummary).toContain('damaged road conditions requiring municipal repair');
    expect(summary.factualSummary).toContain('becomes muddy during rainfall');
    expect(summary.factualSummary).toContain('K-Electric');
    expect(summary.factualSummary).toContain('KMC');
  });

  it('6. avoids duplicate evidence string concatenation in issue candidates', () => {
    const res = classifyV13_2(REPRODUCTION_COMPLAINT, championV11Model as any);

    for (const cand of res.issueCandidates) {
      expect(cand.mention_type).not.toBe('direct_asset_defectdirect_asset_defect');
      expect(cand.defect_evidence).toBeDefined();
      expect(Array.isArray(cand.defect_evidence)).toBe(true);
      expect(cand.defect_evidence.length).toBeGreaterThan(0);
      expect(cand.defect_evidence[0]).not.toContain('direct_asset_defect');
    }
  });

  it('7. produces structured 6-authority decision records for audit UI', () => {
    const res = classifyV13_2(REPRODUCTION_COMPLAINT, championV11Model as any);

    expect(res.decisionRecords).toBeDefined();
    expect(res.decisionRecords.length).toBe(6);

    const depts = res.decisionRecords.map((r) => r.department);
    expect(depts).toContain('kmc');
    expect(depts).toContain('kwsc');
    expect(depts).toContain('kelectric');
    expect(depts).toContain('ssgc');
    expect(depts).toContain('sswmb');
    expect(depts).toContain('sbca');

    for (const rec of res.decisionRecords) {
      expect(['SELECTED', 'SUPPRESSED', 'REJECTED']).toContain(rec.status);
      expect(typeof rec.probability).toBe('number');
      expect(typeof rec.threshold).toBe('number');
      expect(typeof rec.reason).toBe('string');
      expect(rec.reason.length).toBeGreaterThan(5);
    }
  });
});
