import { describe, it, expect } from 'vitest';
import candidateModelRaw from '../models/v11_candidate_model.json';
import {
  classifyV11RelationAware,
  classifyV11,
  type V11ModelArtifact,
} from '../services/v11InferenceAdapter';
import { analyzeComplaintRelationAware } from '../services/relationEngine';

const candidateModel = candidateModelRaw as unknown as V11ModelArtifact;

describe('Phase V11.4.8 Blind Benchmark TypeScript Parity & Runtime Integrity', () => {
  it('verifies candidate model artifact metadata and threshold integrity', () => {
    expect(candidateModel.version).toBe('v11-candidate-1');
    expect(candidateModel.departments).toEqual(['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca']);
    expect(candidateModel.thresholds).toEqual({
      kmc: 0.25,
      kwsc: 0.38,
      kelectric: 0.25,
      ssgc: 0.28,
      sswmb: 0.25,
      sbca: 0.30,
    });
  });

  it('correctly handles normal everyday road complaint parity', () => {
    const text = 'Mohtaram afsaran, nihayat dukh aur afsos ke sath ye shikayat darj karwa raha hoon ke Soldier Bazaar near garden par service road par deep potholes aur tooti phooti sarak hai. kharab sadak ki wajah se gariyon ko shadeed nuqsan ho raha hai.';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toContain('kmc');
    expect(res.probabilities.kmc).toBeGreaterThanOrEqual(0.25);
  });

  it('correctly handles abusive/profanity electricity complaint without misclassification', () => {
    const text = 'K-Electric ke beghairat aur corrupt afsaron, hamare ilaqa Liaquatabad No 10 mein transformer blast ho gaya hai aur bijli ghayab hai. sharam karo aur bijli foran bahaal karo!';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toContain('kelectric');
    expect(res.probabilities.kelectric).toBeGreaterThanOrEqual(0.25);
  });

  it('correctly protects out-of-scope rental/civil disputes from municipal assignment', () => {
    const text = 'Chanesar Goth main road mein Makan malik ghair qanooni taur par bina notice diye kiraya barha raha hai aur ghar khali karne ki dhamkiyan de raha hai.';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual([]);
    expect(res.needsReview).toBe(true);
  });

  it('correctly distinguishes power failure causing pump shutoff as single kelectric issue', () => {
    const text = 'bijli pichle 24 ghante se band hai jiski wajah se ghar ki water motor nahi chal saki aur pani ka shadeed bohran paida ho gaya hai.';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.departments).not.toContain('kwsc');
  });

  it('correctly routes independent dual department complaints', () => {
    const text = 'Janab-e-wala, arzi guzaar hain ke Golimar number 1 near chakiwara bridge par service road par deep potholes hain aur kachray ke dher lage hue hain.';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toContain('kmc');
    expect(res.departments).toContain('sswmb');
  });
});
