/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V11.4 Relation Engine Regression Test Suite
 *
 * Verifies that the TypeScript relation engine achieves 100% parity with Python
 * across all 31 developer-authored behavioral regression cases.
 */

import { describe, it, expect } from 'vitest';
import { analyzeComplaintRelationAware, type RelationType } from '../services/relationEngine';
import type { DepartmentId } from '../types';

interface RegressionCase {
  id: string;
  text: string;
  expected_departments: DepartmentId[];
  relation: RelationType;
  review: boolean;
}

const REGRESSION_CASES: RegressionCase[] = [
  { id: 'R01', text: 'hamari gali ki sarak toot gai hai, isko repair karo', expected_departments: ['kmc'], relation: 'SINGLE', review: false },
  { id: 'R02', text: 'public pani ki pipeline se leakage ho rahi hai', expected_departments: ['kwsc'], relation: 'SINGLE', review: false },
  { id: 'R03', text: 'feeder se bijli nahi aa rahi, roz load shedding hai', expected_departments: ['kelectric'], relation: 'SINGLE', review: false },
  { id: 'R04', text: 'gas pipe se leak ki boo aa rahi hai public line par', expected_departments: ['ssgc'], relation: 'SINGLE', review: false },
  { id: 'R05', text: 'garbage truck kachra nahi utha raha public street se', expected_departments: ['sswmb'], relation: 'SINGLE', review: false },
  { id: 'R06', text: 'bina permit building mein illegal floor ban raha hai', expected_departments: ['sbca'], relation: 'SINGLE', review: false },
  { id: 'R07', text: 'bijli gayi hui hai jis ki wajah se ghar ki pani ki motor band hai', expected_departments: ['kelectric'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R08', text: 'public water main leak hone se road par pani jama hai magar road tooti nahi', expected_departments: ['kwsc'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R09', text: 'gas ka pressure bilkul nahi aur is liye chulha nahi jal raha', expected_departments: ['ssgc'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R10', text: 'kachra uthta nahi, uski wajah se badbu aur machar ho gaye', expected_departments: ['sswmb'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R11', text: 'road mein gaddha hai aur uski wajah se traffic ruk raha hai', expected_departments: ['kmc'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R12', text: 'illegal construction ne pedestrian access block kiya hai, footpath kharab nahi hua', expected_departments: ['sbca'], relation: 'CAUSES_CONTEXT_ONLY', review: false },
  { id: 'R13', text: 'sarak mein gaddha hai aur alag se public water pipeline phati hui hai', expected_departments: ['kmc', 'kwsc'], relation: 'INDEPENDENT', review: false },
  { id: 'R14', text: 'gas ki boo aa rahi aur alag electric pole par taar bhi spark kar rahi hai', expected_departments: ['kelectric', 'ssgc'], relation: 'INDEPENDENT', review: false },
  { id: 'R15', text: 'illegal extra floor ban raha aur market mein kachra bhi nahi uth raha', expected_departments: ['sbca', 'sswmb'], relation: 'INDEPENDENT', review: false },
  { id: 'R16', text: 'sewer overflow hai, aur doosri taraf bijli transformer ka fault hai', expected_departments: ['kelectric', 'kwsc'], relation: 'INDEPENDENT', review: false },
  { id: 'R17', text: 'gali ka footpath toot gaya aur public bin se kachra bhi gir raha hai', expected_departments: ['kmc', 'sswmb'], relation: 'INDEPENDENT', review: false },
  { id: 'R18', text: 'gas line leak hai aur public water supply band hai, dono alag issues hain', expected_departments: ['kwsc', 'ssgc'], relation: 'INDEPENDENT', review: false },
  { id: 'R19', text: 'public water main phatne se road surface bhi dhans gai, pipe replace karo aur road bhi dubara banao', expected_departments: ['kmc', 'kwsc'], relation: 'SAME_INCIDENT_DIFFERENT_REPAIRS', review: false },
  { id: 'R20', text: 'gas ka koi issue nahi, asal mein kachra nahi uth raha', expected_departments: ['sswmb'], relation: 'NEGATED', review: false },
  { id: 'R21', text: 'sarak bilkul theek hai, problem public pipe leak ki hai', expected_departments: ['kwsc'], relation: 'NEGATED', review: false },
  { id: 'R22', text: 'K-Electric ko bhi bataya tha lekin hamari complaint road ke gaddhe ki hai', expected_departments: ['kmc'], relation: 'RECIPIENT_ONLY', review: false },
  { id: 'R23', text: 'electric pole ke paas kachra para hai, pole kharab nahi', expected_departments: ['sswmb'], relation: 'SPATIAL_PROXIMITY_ONLY', review: false },
  { id: 'R24', text: 'ye pani ka masla nhi hy, feeder ki light bar bar ja rhi hy', expected_departments: ['kelectric'], relation: 'NEGATED', review: false },
  { id: 'R25', text: 'humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae', expected_departments: ['kmc'], relation: 'SINGLE', review: false },
  { id: 'R26', text: 'KMC ko letter likha tha, par asal issue gas mains ke pressure ka hai', expected_departments: ['ssgc'], relation: 'RECIPIENT_ONLY', review: false },
  { id: 'R27', text: 'hamare ilaqay mein ajeeb masla hai, koi dekh le', expected_departments: [], relation: 'UNCERTAIN', review: true },
  { id: 'R28', text: 'mera padosi ghar ke andar mujhe pareshan kar raha hai', expected_departments: [], relation: 'UNCERTAIN', review: true },
  { id: 'R29', text: 'kachra theek se uth gaya hai magar public gas pipe abhi leak ho rahi', expected_departments: ['ssgc'], relation: 'NEGATED', review: false },
  { id: 'R30', text: 'illegal construction chal rahi aur bilkul alag block mein footpath ki tiles bhi toot gai', expected_departments: ['kmc', 'sbca'], relation: 'INDEPENDENT', review: false },
  { id: 'R31', text: 'pani main leak hai, alag se feeder band hai aur market ki road bhi toot gai', expected_departments: ['kelectric', 'kmc', 'kwsc'], relation: 'INDEPENDENT', review: false },
];

describe('AWAAZ-E-AWAM — Phase V11.4 Relation Engine Regression Suite', () => {
  it('Evaluates all 31 developer-authored behavioral regression cases with 100% parity', () => {
    let deptPass = 0;
    let relPass = 0;
    let revPass = 0;

    for (const testCase of REGRESSION_CASES) {
      const result = analyzeComplaintRelationAware(testCase.text, testCase.id);

      const expectedDepts = [...testCase.expected_departments].sort();
      const actualDepts = [...result.proposed_departments].sort();

      expect(actualDepts).toEqual(expectedDepts);
      expect(result.relation_summary).toBe(testCase.relation);
      expect(result.needs_review).toBe(testCase.review);

      deptPass++;
      relPass++;
      revPass++;
    }

    expect(deptPass).toBe(31);
    expect(relPass).toBe(31);
    expect(revPass).toBe(31);
  });

  describe('The 10 Critical Behavioral Expectations from Section 5', () => {
    it('1. road defect with missing location details flags INCOMPLETE_PUBLIC_LOCATION', () => {
      const res = analyzeComplaintRelationAware(
        'humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae'
      );
      expect(res.proposed_departments).toEqual(['kmc']);
      expect(res.missing_public_location).toBe(true);
      expect(res.needs_review).toBe(false);
    });

    it('2. electricity outage causing private water motor failure routes to K-Electric only', () => {
      const res = analyzeComplaintRelationAware(
        'bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi'
      );
      expect(res.proposed_departments).toEqual(['kelectric']);
      expect(res.proposed_departments).not.toContain('kwsc');
      expect(res.relation_summary).toBe('CAUSES_CONTEXT_ONLY');
    });

    it('3. broken road AND public water pipeline leak routes to both KMC and KWSC', () => {
      const res = analyzeComplaintRelationAware(
        'sarak mein gaddha hai aur alag se public water pipeline phati hai'
      );
      expect(res.proposed_departments).toEqual(['kmc', 'kwsc']);
      expect(res.relation_summary).toBe('INDEPENDENT');
    });

    it('4. negated gas with uncollected garbage routes to SSWMB only', () => {
      const res = analyzeComplaintRelationAware(
        'ye gas ka masla nahi, kachra nahi uth raha'
      );
      expect(res.proposed_departments).toEqual(['sswmb']);
      expect(res.relation_summary).toBe('NEGATED');
    });

    it('5. gas odor AND sparking electric wire routes to SSGC and K-Electric', () => {
      const res = analyzeComplaintRelationAware(
        'gas ki boo aa rahi aur electric wire bhi spark kar rahi'
      );
      expect(res.proposed_departments).toEqual(['kelectric', 'ssgc']);
      expect(res.relation_summary).toBe('INDEPENDENT');
    });

    it('6. K-Electric addressed as recipient routes to KMC only', () => {
      const res = analyzeComplaintRelationAware(
        'K-Electric ko bataya tha magar complaint road gaddhe ki hai'
      );
      expect(res.proposed_departments).toEqual(['kmc']);
      expect(res.proposed_departments).not.toContain('kelectric');
    });

    it('7. electric pole as spatial proximity landmark without wire fault routes to SSWMB only', () => {
      const res = analyzeComplaintRelationAware(
        'electric pole ke paas kachra jama hai'
      );
      expect(res.proposed_departments).toEqual(['sswmb']);
      expect(res.proposed_departments).not.toContain('kelectric');
      expect(res.relation_summary).toBe('SPATIAL_PROXIMITY_ONLY');
    });

    it('8. burst water main damaging road requiring both repairs routes to KWSC and KMC', () => {
      const res = analyzeComplaintRelationAware(
        'pani main phat gaya aur road dhans gayi; dono pipe aur road repair karna hai'
      );
      expect(res.proposed_departments).toEqual(['kmc', 'kwsc']);
      expect(res.relation_summary).toBe('SAME_INCIDENT_DIFFERENT_REPAIRS');
    });

    it('9. vague complaint triggers review with UNCERTAIN_DEFECT reason and zero guessed departments', () => {
      const res = analyzeComplaintRelationAware('yahan koi masla hai');
      expect(res.proposed_departments).toEqual([]);
      expect(res.needs_review).toBe(true);
      expect(res.review_reason).toBe('UNCERTAIN_DEFECT');
    });

    it('10. three independent faults (water, electricity, road) route to all 3 departments', () => {
      const res = analyzeComplaintRelationAware(
        'pani main leak hai, alag se feeder band hai aur market ki road bhi toot gai'
      );
      expect(res.proposed_departments).toEqual(['kelectric', 'kmc', 'kwsc']);
      expect(res.relation_summary).toBe('INDEPENDENT');
      expect(res.needs_review).toBe(false);
    });
  });
});
