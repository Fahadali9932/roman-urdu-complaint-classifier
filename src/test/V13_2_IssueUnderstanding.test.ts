import { describe, expect, it } from 'vitest';
import {
  normalizeRomanUrduV13_2,
  normalizeElongations,
  splitFusedWords,
  correctTypos,
} from '../services/v13_2/romanUrduNormalizer';
import { extractMunicipalIssuesV13_2 } from '../services/v13_2/issueExtractor';
import { classifyV13_2, assessComplaintDraftV13_2 } from '../services/v13_2/v13_2_engine';
import modelData from '../models/v11_candidate_model.json';

describe('V13.2 Roman Urdu Normalization Unit Tests', () => {
  it('corrects character elongations while preserving valid Urdu double vowels', () => {
    expect(normalizeElongations('paaaani')).toBe('paani');
    expect(normalizeElongations('biiiijli')).toBe('bijli');
    expect(normalizeElongations('toooooota')).toBe('toota');
    expect(normalizeElongations('garrrha')).toBe('garha');
  });

  it('splits fused missing spaces for common Roman Urdu compounds', () => {
    expect(splitFusedWords('paninahi araha')).toBe('pani nahi araha');
    expect(splitFusedWords('bijlinahi he')).toBe('bijli nahi he');
    expect(splitFusedWords('gasnahi aarahe')).toBe('gas nahi aarahe');
    expect(splitFusedWords('lightchali gai')).toBe('light chali gai');
  });

  it('corrects common phonetic typos without altering unrelated words', () => {
    expect(correctTypos('bejli')).toBe('bijli');
    expect(correctTypos('tranforma')).toBe('transformer');
    expect(correctTypos('rod')).toBe('road');
    expect(correctTypos('tut')).toBe('toot');
    expect(correctTypos('tuti')).toBe('toot');
    expect(correctTypos('chula')).toBe('chulha');
    expect(correctTypos('kachra')).toBe('kachra');
  });

  it('preserves proper nouns and address tokens intact in normalized output', () => {
    const text = 'Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya';
    const norm = normalizeRomanUrduV13_2(text);
    expect(norm).toContain('basia');
    expect(norm).toContain('banglows');
    expect(norm).toContain('gulshan');
    expect(norm).toContain('transformer');
    expect(norm).toContain('bijli');
  });

  it('preserves negation particles and polarity', () => {
    const text = 'pani nahi araha lekin bijli theek hai';
    const norm = normalizeRomanUrduV13_2(text);
    expect(norm).toContain('pani nahi');
    expect(norm).toContain('bijli theek hai');
  });
});

describe('V13.2 Multi-Issue Extraction and Causal Suppression Tests', () => {
  it('extracts independent issues for Basia Bungalows (KE, KMC, SSWMB)', () => {
    const text = 'Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he';
    const res = extractMunicipalIssuesV13_2(text);
    expect(res.actionableDepartments).toContain('kelectric');
    expect(res.actionableDepartments).toContain('kmc');
    expect(res.actionableDepartments).toContain('sswmb');
  });

  it('correctly suppresses water motor issue when caused by power failure (Fahads Rule)', () => {
    const text = 'Light chali gayi subah se transformer phat gaya hai jis ki wajah se pani ki motor nahi chal rahi pani nahi araha';
    const res = extractMunicipalIssuesV13_2(text);
    expect(res.actionableDepartments).toContain('kelectric');
    expect(res.suppressedDepartments).toContain('kwsc');
    expect(res.actionableDepartments).not.toContain('kwsc');
  });

  it('correctly suppresses road damage when caused by burst water pipeline', () => {
    const text = 'Water supply line phat chuki hai pani beh raha hai jis ki wajah se sadak toot chuki hai khadda ban gaya hai';
    const res = extractMunicipalIssuesV13_2(text);
    expect(res.actionableDepartments).toContain('kwsc');
    expect(res.suppressedDepartments).toContain('kmc');
    expect(res.actionableDepartments).not.toContain('kmc');
  });

  it('extracts two independent issues across different locations/streets', () => {
    const text = 'Main water supply line phat chuki hai gali doob gayi hai aur saath doosri gali mein pole ka taar toota hua hai current araha hai';
    const res = extractMunicipalIssuesV13_2(text);
    expect(res.actionableDepartments).toContain('kwsc');
    expect(res.actionableDepartments).toContain('kelectric');
  });

  it('respects negation and does not assign negated departments', () => {
    const text = 'Pani ka koi masla nahi hai bijli bilkul theek hai lekin sadak par bohat bara garha hai road tooti hui hai';
    const res = extractMunicipalIssuesV13_2(text);
    expect(res.actionableDepartments).toEqual(['kmc']);
  });
});

describe('V13.2 End-to-End Decision Engine Acceptance Tests', () => {
  it('Acceptance Case 1: Basia Bungalows routes to KE, KMC, and SSWMB without being suppressed by typos', () => {
    const text = 'Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toContain('kelectric');
    expect(res.departments).toContain('kmc');
    expect(res.departments).toContain('sswmb');
    expect(res.needsReview).toBe(false);
  });

  it('Acceptance Case 2: Causal power failure -> water motor routes ONLY to K-Electric', () => {
    const text = 'Light chali gayi subah se transformer phat gaya hai jis ki wajah se pani ki motor nahi chal rahi pani nahi araha';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.extraction.suppressedDepartments).toContain('kwsc');
    expect(res.needsReview).toBe(false);
  });

  it('Acceptance Case 3: Independent water main burst + electric wire routes to KWSC and K-Electric', () => {
    const text = 'Main water supply line phat chuki hai gali doob gayi hai aur saath doosri gali mein pole ka taar toota hua hai current araha hai';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toEqual(expect.arrayContaining(['kwsc', 'kelectric']));
    expect(res.needsReview).toBe(false);
  });

  it('Acceptance Case 4: Negated water/power with road defect routes ONLY to KMC', () => {
    const text = 'Pani ka koi masla nahi hai bijli bilkul theek hai lekin sadak par bohat bara garha hai road tooti hui hai';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toEqual(['kmc']);
    expect(res.needsReview).toBe(false);
  });

  it('Acceptance Case 5: Independent gas outage + solid waste routes to SSGC and SSWMB', () => {
    const text = 'Gas bilkul nahi arahi hai chulha nahi jal raha aur bahar kachray ka dher laga hua hai badboo phail rahi hai';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toEqual(expect.arrayContaining(['ssgc', 'sswmb']));
    expect(res.needsReview).toBe(false);
  });

  it('Acceptance Case 6: Purely vague text asks clarification or triggers review', () => {
    const text = 'Bhai mera masla hal karo koi sun nahi raha bohat pareshani hai jaldi aao';
    const draft = assessComplaintDraftV13_2(text, modelData as any);
    expect(draft.state === 'ask' || draft.state === 'review').toBe(true);
  });

  it('Acceptance Case 7: Fahad anger/profanity complaint routes to SSGC without admin hold', () => {
    const text = 'Lanat ho tum sab pe gas nahi arahi subah se chulha nahi chala bache bhooke hain pagal samjha hai kya hume gas ka pressure bilkul zero hai';
    const res = classifyV13_2(text, modelData as any);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);
  });

  it('Verifies inference latency is under 50ms', () => {
    const text = 'Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he';
    const start = performance.now();
    const res = classifyV13_2(text, modelData as any);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
    expect(res.departments.length).toBeGreaterThan(0);
  });
});
