/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V11.4.3
 * Citizen Website Integration & End-to-End Local AI Inference Test Suite
 *
 * Verifies:
 * 1. Model Word-Length Bracket Handling (5–20, 21–50, 51–100, 101–150, 151–200 words)
 * 2. 10 Core Civic Scenario Types (Obvious, Background, Dual, Triple, Causal, Duplicated, Negated, Historical, Landmark, Ambiguous)
 * 3. Local In-Memory Pipeline & Privacy Invariants (Sub-50ms latency, zero database mutation, unforced probabilities)
 * 4. Decoupled Location Alert vs. Needs Review
 * 5. Truthful Factual Summarization (No pothole or injury hallucination)
 * 6. V11AnalysisResultView UI Component Composition
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalV11ComplaintService } from '../services/LocalV11ComplaintService';
import {
  classifyV11RelationAware,
  championV11Model,
} from '../services/v11InferenceAdapter';
import { V11AnalysisResultView } from '../features/citizen/simplified-complaint/V11AnalysisResultView';
import type { ComplaintSubmissionInput } from '../types';

describe('AWAAZ-E-AWAM — Phase V11.4.3 Citizen Website Integration Suite', () => {
  const localService = new LocalV11ComplaintService();

  // =========================================================================
  // 1. WORD-LENGTH BRACKET EVALUATION
  // =========================================================================
  describe('1. Word-Length Bracket Verification (Curriculum Scaling)', () => {
    const BRACKET_CASES = [
      {
        bracket: 'Bracket 1 (5–20 words)',
        min: 5,
        max: 20,
        text: 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae',
        expectedDept: 'kmc',
        expectedRelation: 'SINGLE',
        expectedReview: false,
      },
      {
        bracket: 'Bracket 2 (21–50 words)',
        min: 21,
        max: 50,
        text: 'Gali number chaar mein sewage ka ganda pani raste par beh raha hai aur gutter ka dhakkan toota hua hai jis se shadeed badboo phail rahi hai aur namaziyon ko masjid janay mein dushwari ho rahi hai',
        expectedDept: 'kwsc',
        expectedRelation: 'SINGLE',
        expectedReview: false,
      },
      {
        bracket: 'Bracket 3 (51–100 words)',
        min: 51,
        max: 100,
        text: 'Main Korangi Sector chaar ka rehaishi hoon. Hamari main market ki sarak pichlay do maheene se shadeed toot phoot ka shikar hai jis par deep khadday par chukay hain, aur doosri taraf sarak ke kinare kachray ke dher lagay hue hain aur kachra nahi uthaya ja raha hai jis se bimari phail rahi hai.',
        expectedDepts: ['kmc', 'sswmb'],
        expectedRelation: 'INDEPENDENT',
        expectedReview: false,
      },
      {
        bracket: 'Bracket 4 (101–150 words)',
        min: 101,
        max: 150,
        text: 'Guzarish yeh hai ke hamare ilaqay North Nazimabad Block J mein pichlay teen din se achanak high voltage aane ke baad transformer blast ho gaya jis ke baad se bijli mukammal band hai aur us ki wajah se gharon ki pani ki motor band hai aur tanki nahi bhar rahi. Humne K-Electric helpline par mutadad dafa complaints darj karwayin lekin koi technical team transformer theek karne nahi aayi. Baraye meharbani K-Electric ki emergency maintenance team ko foran bhej kar transformer aur bijli ki supply bahaal karwayi jae kyunke buroog aur bachay shadeed garmi mein bay-haal hain aur bijli bahaal hone par hi motor chal sakegi aur masla hal hoga.',
        expectedDept: 'kelectric',
        expectedRelation: 'CAUSES_CONTEXT_ONLY',
        expectedReview: false,
      },
      {
        bracket: 'Bracket 5 (151–200 words)',
        min: 151,
        max: 200,
        text: 'Ba-khidmat janab aali, nihayat adab se iltemas hai ke hum Liaquatabad Block teen ke mukammi rehaishi hain aur pichlay kafi arsay se shadeed pareshani mein mubtala hain. Hamare mohallay ki residential gali mein commercial plaza banane ke liye bila ijazat SBCA unauthorized multi-storey building ki construction shuru kar di gai hai. Builders ne building codes ki shadeed khilaf warzi ki hai aur koi safety net ya safety measures nahi lagaye jis se aas paas ke gharon ki chhaton par pathar aur building material gir raha hai. Is illegal construction ki wajah se hamari gali ka rasta bhi masdood ho chuka hai aur kisi bhi waqt koi shadeed jani nuqsan ho sakta hai. Humne building control authority ke mutaaliqa officers ko mutadad darkhwastain pesh keen lekin ab tak koi action nahi liya gaya. Ap se purzor appeal hai ke foran SBCA ke building inspectors ko bhej kar is ghair qanooni tameer ko seal kiya jae aur builders ke khilaf strict legal action liya jae taake hum sab shehri sakoon ka saans le sakein.',
        expectedDept: 'sbca',
        expectedRelation: 'SINGLE',
        expectedReview: false,
      },
    ];

    for (const bCase of BRACKET_CASES) {
      it(`evaluates ${bCase.bracket} correctly without dilution or false negatives`, () => {
        const words = bCase.text.trim().split(/\s+/).length;
        expect(words).toBeGreaterThanOrEqual(bCase.min);
        expect(words).toBeLessThanOrEqual(bCase.max);

        const result = classifyV11RelationAware(bCase.text, championV11Model);

        if (bCase.expectedDepts) {
          expect(result.departments.sort()).toEqual(bCase.expectedDepts.sort());
        } else if (bCase.expectedDept) {
          expect(result.departments).toEqual([bCase.expectedDept]);
        }
        expect(result.relation).toBe(bCase.expectedRelation);
        expect(result.needsReview).toBe(bCase.expectedReview);
      });
    }
  });

  // =========================================================================
  // 2. TEN CIVIC SCENARIO TYPES
  // =========================================================================
  describe('2. Ten Comprehensive Civic Scenario Types', () => {
    it('Scenario 1 (Obvious Problem): single KMC road repair without review', () => {
      const text = 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kmc']);
      expect(res.needsReview).toBe(false);
      expect(res.missingPublicLocation).toBe(true);
    });

    it('Scenario 2 (Problem with Extensive Background): routes to KMC despite long preamble', () => {
      const text =
        'Hum pichlay das saal se Keamari Machar Colony mein rehte hain aur rozana bachon ko school chhorne ke liye isi raste se guzarna parta hai. Lekin pichlay kuch maheenon se hamari gali ki main road shadeed tor par toot phoot ka shikar ho chuki hai, sarak par gehray gaddhay par gaye hain aur paidal chalna bhi dushwar hai. KMC ko foran is sarak ki marammat karni chahiye.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kmc']);
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 3 (Two Unrelated Problems): routes to KMC and SSWMB independently', () => {
      const text =
        'Hamari gali ki main sarak toot phoot ka shikar hai aur alag se public kachra kundi se kachra bhi nahi uthaya ja raha.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments.sort()).toEqual(['kmc', 'sswmb'].sort());
      expect(res.relation).toBe('INDEPENDENT');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 4 (Three Independent Problems): routes to KMC, KWSC, and KE', () => {
      const text =
        'Sarak par khadday hain, alag se gutter ka ganda pani beh raha hai aur doosri taraf bijli feeder ka fault hai.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments.sort()).toEqual(['kelectric', 'kmc', 'kwsc'].sort());
      expect(res.relation).toBe('INDEPENDENT');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 5 (Causal Problem): electricity outage making water motor stop routes to KE only', () => {
      const text =
        'Bijli gayi hui hai jis ki wajah se ghar ki pani ki motor band hai aur tanki nahi bhar rahi.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kelectric']);
      expect(res.relation).toBe('CAUSES_CONTEXT_ONLY');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 6 (Multiple Descriptions of Same Defect): routes once to KMC without duplicates', () => {
      const text =
        'Sarak toot phoot ka shikar hai, road par har taraf khadday hain aur rasta bilkul kharab ho chuka hai.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kmc']);
      expect(res.relation).toBe('SINGLE');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 7 (Negated Problem): negated gas with uncollected garbage routes to SSWMB only', () => {
      const text =
        'Gas ka koi masla nahi hai lekin hamari gali se kachra nahi uthaya ja raha.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['sswmb']);
      expect(res.relation).toBe('NEGATED');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 8 (Historical References): past resolved gas issue routes to KWSC active leak only', () => {
      const text =
        'Pichlay saal gas ka masla solve ho gaya tha lekin abhi hamari gali mein public water line leak ho rahi hai.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kwsc']);
      expect(res.relation).toBe('NEGATED');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 9 (Department Mention Without Defect): KMC office landmark routes to KWSC leak only', () => {
      const text =
        'KMC office ke samne public water pipe phat gaya hai aur peenay ka saaf pani zaya ho raha hai.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual(['kwsc']);
      expect(res.departments).not.toContain('kmc');
      expect(res.needsReview).toBe(false);
    });

    it('Scenario 10 (Ambiguous Problem): unroutable vague text triggers Needs Review', () => {
      const text = 'Hamare ilaqay mein ajeeb masla hai, koi dekh le.';
      const res = classifyV11RelationAware(text, championV11Model);
      expect(res.departments).toEqual([]);
      expect(res.needsReview).toBe(true);
      expect(res.reviewReason).toBe('UNCERTAIN_DEFECT');
    });
  });

  // =========================================================================
  // 3. IN-MEMORY PIPELINE & PRIVACY INVARIANTS
  // =========================================================================
  describe('3. Local In-Memory Pipeline & Privacy Invariants', () => {
    const input: ComplaintSubmissionInput = {
      citizenName: 'Tariq Mansoor',
      citizenPhone: '03001234567',
      district: 'Keamari',
      locality: 'Machar Colony',
      publicLocation: '',
      residentialAddress: 'House 42, Gali 3, Keamari',
      description: 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae',
    };

    it('submits complaint locally in < 50ms with isolated in-memory reference code', async () => {
      const result = await localService.submitComplaint(input);

      expect(result.referenceNumber).toMatch(/^TEST-2026-V11-[A-Z0-9]{4}$/);
      expect(result.departments).toEqual(['kmc']);
      expect(result.isLocalTestMode).toBe(true);
      expect(result.v11Analysis).toBeDefined();

      const analysis = result.v11Analysis!;
      expect(analysis.latencyMs).toBeLessThan(50);
      expect(analysis.modelVersion).toBe('v11.4.2-champion-run_003');
      expect(analysis.wordCount).toBe(15);
    });

    it('preserves genuine calibrated model probabilities without artificial 0.85 override', async () => {
      const result = await localService.submitComplaint(input);
      const analysis = result.v11Analysis!;

      // Probability should be true model score (~0.8104 for KMC), not locked 0.85
      expect(analysis.probabilities.kmc).toBeGreaterThan(0.70);
      expect(analysis.probabilities.kmc).toBeLessThan(0.95);
      expect(analysis.probabilities.kmc).not.toBe(0.85);
    });

    it('decouples missing_public_location from needsReview (allows automatic routing)', async () => {
      const result = await localService.submitComplaint(input);
      const analysis = result.v11Analysis!;

      // Complaint lacks specific gali/street in description
      expect(analysis.missingPublicLocation).toBe(true);
      // But actionable defect and department are clear -> auto-routed to KMC
      expect(analysis.needsReview).toBe(false);
      expect(analysis.departments).toEqual(['kmc']);
    });

    it('generates truthful summary without hallucinating potholes or reckless driving', async () => {
      const result = await localService.submitComplaint(input);
      const analysis = result.v11Analysis!;

      // Original text mentions 'road kharab hai', not 'khadday' or 'potholes'
      expect(analysis.heading).toBe('Damaged Road in Machar Colony');
      expect(analysis.heading).not.toContain('Potholes');
      expect(analysis.factualSummary).toContain('damaged road conditions requiring municipal repair in Machar Colony');
      expect(analysis.factualSummary).not.toContain('potholes');
      expect(analysis.factualSummary).not.toContain('hazardous');
    });
  });

  // =========================================================================
  // 4. UI COMPONENT RENDERING (V11AnalysisResultView)
  // =========================================================================
  describe('4. V11AnalysisResultView Component Tests', () => {
    it('renders analysis modal with model version, badges, probabilities, and truthful summary', async () => {
      const input: ComplaintSubmissionInput = {
        citizenName: 'Muhammad Ali',
        citizenPhone: '03219876543',
        district: 'Keamari',
        locality: 'Machar Colony',
        publicLocation: '',
        residentialAddress: 'House 10, Sector 2',
        description: 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae',
      };

      const submission = await localService.submitComplaint(input);
      const analysis = submission.v11Analysis!;
      const handleClose = vi.fn();
      const handleReset = vi.fn();

      render(
        <V11AnalysisResultView
          submission={submission}
          analysis={analysis}
          ur={false}
          onClose={handleClose}
          onReset={handleReset}
        />
      );

      // Verify Test Mode Banner & Badges
      expect(screen.getByText('LOCAL AI TEST MODE')).toBeInTheDocument();
      expect(screen.getByText('v11.4.2-champion-run_003')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(submission.referenceNumber))).toBeInTheDocument();

      // Verify Assigned Department Badge
      expect(screen.getByText(/karachi metropolitan corporation/i)).toBeInTheDocument();

      // Verify Decoupled Location Alert
      expect(screen.getAllByText(/INCOMPLETE_PUBLIC_LOCATION/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/lacks specific public street, sector, or landmark details/i)).toBeInTheDocument();

      // Verify Model Probabilities Grid
      expect(screen.getByText(/Calibrated Department Probabilities vs Decision Thresholds/i)).toBeInTheDocument();
      expect(screen.getByText('✓ PASS')).toBeInTheDocument();

      // Verify Truthful Summary
      expect(screen.getByText(analysis.heading)).toBeInTheDocument();

      // Verify Action Buttons
      const closeBtn = screen.getByRole('button', { name: /close analysis/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const resetBtn = screen.getByRole('button', { name: /test another complaint/i });
      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });
});
