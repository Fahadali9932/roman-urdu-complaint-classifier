import { describe, expect, it } from 'vitest';
import fixtures from '../../tests/v11/v12_9_routing_cases.json';
import { analyzeComplaintRelationAware } from '../services/relationEngine';
import { championV11Model, classifyV11RelationAware, extractV11Features, predictV11RawProbabilities } from '../services/v11InferenceAdapter';

describe('V12.9 scoped asset and actionable fault regressions', () => {
  it.each(fixtures)('$id rule', ({text, expected}) => {
    expect([...analyzeComplaintRelationAware(text).proposed_departments].sort()).toEqual(expected);
  });
  it.each(fixtures)('$id hybrid', ({text, expected}) => {
    expect([...classifyV11RelationAware(text).departments].sort()).toEqual(expected);
  });
});

describe('V12.9 Road address precision and defect routing verification', () => {
  it('suppresses false KMC on gas outage reported at footpath address', () => {
    const text = 'Footpath par kal se Gulberg mein sui gas bilkul gayab hai chulha nahi jal raha';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);
  });

  it('suppresses false KMC on electricity fault reported at chowk address', () => {
    const text = 'Nazimabad number 7 chowk par bijli ka taar toot gaya hai transformer se spark nikal raha hai';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.needsReview).toBe(false);
  });

  it('defers vague complaint with road address to human review with UNCERTAIN_DEFECT', () => {
    const text = 'Keamari dock yard road par bohot masla hai awam pareshan hai koi sunwai nahi ho rahi';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual([]);
    expect(res.needsReview).toBe(true);
    expect(res.reviewReason).toBe('UNCERTAIN_DEFECT');
  });

  it('routes genuine road damage to KMC without review', () => {
    const text = 'Main road par baray baray khadday par gaye hain sarak toot chuki hai gaariyan phans rahi hain';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kmc']);
    expect(res.needsReview).toBe(false);
  });

  it('routes genuine road damage and independent gas leak to both KMC and SSGC', () => {
    const text = 'Main road par sarak toot gayi hai khadday hain aur gas ki line bhi leak ho rahi hai boo phail rahi hai';
    const res = classifyV11RelationAware(text);
    expect([...res.departments].sort()).toEqual(['kmc', 'ssgc']);
    expect(res.needsReview).toBe(false);
  });
});

describe('V12.9 SSGC burst pipeline defect repair and controls', () => {
  it('correctly routes gas pipeline burst (phat) to SSGC', () => {
    const text = 'Gali mein gas ki pipeline phat gai hai fori emergency team bheji jaye';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);
  });

  it('correctly routes compound drainage issue and gas pipeline burst to KMC and SSGC', () => {
    const text = 'pichlay haftay se barish ke baad Orangi Town public school ke paas do foot paani khara hai drainage nala kaam nahi kar raha, aur is ke sath sath alag se is ke qareeb par kisi ne khudai ki aur gas ki pipeline phat gai hai';
    const res = classifyV11RelationAware(text);
    expect([...res.departments].sort()).toEqual(['kmc', 'ssgc']);
    expect(res.needsReview).toBe(false);
  });

  it('control: water supply line burst routes to KWSC and does not touch SSGC', () => {
    const text = 'Gali number 4 mein water supply line phat gai hai har taraf paani beh raha hai';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kwsc']);
    expect(res.departments).not.toContain('ssgc');
    expect(res.needsReview).toBe(false);
  });

  it('control: car tyre burst on road pothole routes to KMC and does not touch SSGC or KWSC', () => {
    const text = 'Sarak par baray khadday hain jis ki wajah se gari ka tyre phat gaya';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kmc']);
    expect(res.departments).not.toContain('ssgc');
    expect(res.departments).not.toContain('kwsc');
    expect(res.needsReview).toBe(false);
  });
});

// Independently calculated using the frozen Run004 vocabulary/IDFs and sklearn
// TfidfVectorizer.transform (no fit), followed by exported Platt/linear weights.
describe('V12.9 Unicode inference parity with the frozen sklearn artifact', () => {
  it.each([
    ['Gás pressure kām hai', [0.025762859957, 0.013756871199, 0.015387332633, 0.997999234972, 0.013640657774, 0.012299556296]],
    ['Bíjli nahi aa rahi, paani bhi nahi hai', [0.104347436823, 0.623191856467, 0.461719344693, 0.046696637799, 0.019836705200, 0.016896752481]],
    ['Gutter overflow hai, šukriya', [0.131266538375, 0.821018955178, 0.060307326853, 0.030269342087, 0.033387619280, 0.037633250107]],
    ['gas constructor issue', [0.025109516194, 0.015371639704, 0.013524703832, 0.996506078373, 0.016261140385, 0.023485650668]],
    ['Power cut — پانی نہیں آ رہا', [0.418525646026, 0.176525469343, 0.094696254785, 0.045797404375, 0.046513487699, 0.047976183050]],
  ] as const)('matches raw probabilities for %s', (text, expected) => {
    const scores = predictV11RawProbabilities(extractV11Features(text, championV11Model), championV11Model);
    championV11Model.departments.forEach((dept, index) => expect(scores[dept]).toBeCloseTo(expected[index], 7));
  });
});
