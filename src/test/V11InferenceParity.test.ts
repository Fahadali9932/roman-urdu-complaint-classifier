import { describe, it, expect } from 'vitest';
import candidateModelRaw from '../../tools/ai_factory/registry/candidate_model.json';
import referenceCasesRaw from '../../tools/ai_factory/registry/v11_reference_cases.json';
import {
  classifyV11,
  extractV11Features,
  predictV11RawProbabilities,
  resolveV11CivicRelations,
  convertV11ToMultiLabelModelArtifact,
  type V11ModelArtifact,
} from '../services/v11InferenceAdapter';
import type { DepartmentId } from '../types';

const candidateModel = candidateModelRaw as unknown as V11ModelArtifact;
const referenceData = referenceCasesRaw as {
  model_version: string;
  thresholds: Record<DepartmentId, number>;
  departments: DepartmentId[];
  cases: Array<{
    id: string;
    category: string;
    text: string;
    raw_probabilities: Record<DepartmentId, number>;
    resolved_probabilities: Record<DepartmentId, number>;
    selected_departments: DepartmentId[];
    notes: string[];
  }>;
};

describe('AWAAZ-E-AWAM — Phase V11 Python-to-TypeScript Inference Parity Suite', () => {
  it('P01: candidate_model.json conforms to V11 contract and contains non-null Platt parameters', () => {
    expect(candidateModel.version).toBe('v11-candidate-1');
    expect(candidateModel.departments).toEqual([
      'kmc',
      'kwsc',
      'kelectric',
      'ssgc',
      'sswmb',
      'sbca',
    ]);
    expect(candidateModel.classifiers).toHaveLength(6);

    for (const deptClf of candidateModel.classifiers) {
      expect(deptClf.calibrated).toHaveLength(3);
      for (const fold of deptClf.calibrated) {
        expect(fold.coef).toBeDefined();
        expect(fold.coef.length).toBeGreaterThan(5000);
        expect(fold.intercept).toBeDefined();
        expect(fold.intercept.length).toBe(1);
        expect(typeof fold.a).toBe('number');
        expect(typeof fold.b).toBe('number');
        expect(Number.isFinite(fold.a)).toBe(true);
        expect(Number.isFinite(fold.b)).toBe(true);
        expect(fold.a).not.toBeNull();
        expect(fold.b).not.toBeNull();
      }
    }
  });

  it('P02: feature dimensions match scikit-learn FeatureUnion (word + char_wb)', () => {
    const wordCount = Object.keys(candidateModel.word_vocab).length;
    const charCount = Object.keys(candidateModel.char_vocab).length;
    expect(wordCount + charCount).toBe(7106);

    const sampleFeatures = extractV11Features('sadak par bara khadda hai', candidateModel);
    expect(sampleFeatures.length).toBe(7106);
  });

  describe('P03: End-to-end Python vs TypeScript parity across all 16 reference cases', () => {
    const cases = referenceData.cases;

    for (const tc of cases) {
      it(`Case [${tc.category}] ${tc.id}: exact matching departments and probability tolerance < 1e-4`, () => {
        const result = classifyV11(tc.text, candidateModel);

        // 1. Exact department match
        const tsDepts = [...result.departments].sort();
        const pyDepts = [...tc.selected_departments].sort();
        expect(tsDepts).toEqual(pyDepts);

        // 2. Numerical probability tolerances
        for (const dept of candidateModel.departments) {
          const pyRaw = tc.raw_probabilities[dept];
          const tsRaw = result.rawProbabilities[dept];
          expect(Math.abs(tsRaw - pyRaw)).toBeLessThan(1e-4);

          const pyRes = tc.resolved_probabilities[dept];
          const tsRes = result.probabilities[dept];
          expect(Math.abs(tsRes - pyRes)).toBeLessThan(1e-4);
        }
      });
    }
  });

  describe('P04: Categorical contextual validation (Audited V11.1 failure modes)', () => {
    it('Water pressure low does NOT trigger SSGC without gas evidence', () => {
      const tc = referenceData.cases.find((c) => c.id === 'disambig_water_pressure')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('kwsc');
      expect(result.departments).not.toContain('ssgc');
      expect(result.probabilities.ssgc).toBeLessThanOrEqual(0.05);
      expect(result.notes).toContain("Suppressed SSGC: 'pressure' refers to water supply, not gas");
    });

    it('Illegal building basement excavation does NOT trigger SSGC without gas evidence', () => {
      const tc = referenceData.cases.find((c) => c.id === 'disambig_basement_excavation')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('sbca');
      expect(result.departments).not.toContain('ssgc');
      expect(result.probabilities.ssgc).toBeLessThanOrEqual(0.05);
      expect(result.notes).toContain(
        'Suppressed SSGC: Excavation relates to building construction, no gas pipeline mentioned'
      );
    });

    it('Electrical live wire on footpath does NOT trigger KMC road damage', () => {
      const tc = referenceData.cases.find((c) => c.id === 'disambig_wire_on_footpath')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('kelectric');
      expect(result.departments).not.toContain('kmc');
      expect(result.probabilities.kmc).toBeLessThanOrEqual(0.05);
      expect(result.notes).toContain(
        'Suppressed KMC: Road/footpath is location of electrical hazard without structural road defect'
      );
    });

    it('Recipient mention (KMC addressed for sewage) does NOT trigger KMC', () => {
      const tc = referenceData.cases.find((c) => c.id === 'recipient_kmc_water_defect')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('kwsc');
      expect(result.departments).not.toContain('kmc');
      expect(result.probabilities.kmc).toBeLessThanOrEqual(0.05);
    });

    it('Power outage causing domestic motor stop suppresses KWSC', () => {
      const tc = referenceData.cases.find((c) => c.id === 'causal_power_motor')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('kelectric');
      expect(result.departments).not.toContain('kwsc');
      expect(result.probabilities.kwsc).toBeLessThanOrEqual(0.15);
    });

    it('Negated road damage preserves power/hazard and suppresses KMC', () => {
      const tc = referenceData.cases.find((c) => c.id === 'negated_road')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).not.toContain('kmc');
      expect(result.probabilities.kmc).toBeLessThanOrEqual(0.05);
    });

    it('Legitimate independent multi-issue complaint preserves all valid departments', () => {
      const tc = referenceData.cases.find((c) => c.id === 'multi_water_power')!;
      const result = classifyV11(tc.text, candidateModel);
      expect(result.departments).toContain('kelectric');
      expect(result.departments).toContain('kwsc');
    });
  });

  it('P05: convertV11ToMultiLabelModelArtifact produces valid backward-compatible V10 contract', () => {
    const v10Adapted = convertV11ToMultiLabelModelArtifact(candidateModel);
    expect(v10Adapted.model_version).toContain('linear-adapted');
    expect(v10Adapted.classes).toEqual(candidateModel.departments);
    expect(Object.keys(v10Adapted.vocabulary).length).toBe(7106);
    expect(v10Adapted.idf.length).toBe(7106);
    expect(v10Adapted.coef).toHaveLength(6);
    expect(v10Adapted.coef[0]).toHaveLength(7106);
    expect(v10Adapted.intercept).toHaveLength(6);

    for (let c = 0; c < 6; c++) {
      expect(Number.isFinite(v10Adapted.intercept[c])).toBe(true);
      for (let i = 0; i < 100; i++) {
        expect(Number.isFinite(v10Adapted.coef[c][i])).toBe(true);
      }
    }
  });
});
