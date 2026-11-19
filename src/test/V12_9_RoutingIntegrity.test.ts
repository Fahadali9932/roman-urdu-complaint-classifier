import { describe, expect, it } from 'vitest';
import fixtures from '../../tests/v11/v12_9_routing_cases.json';
import { analyzeComplaintRelationAware } from '../services/relationEngine';
import { championV11Model, classifyV11RelationAware, extractV11Features, predictV11RawProbabilities } from '../services/v11InferenceAdapter';
import { assessComplaintDraft } from '../services/complaintUnderstanding';

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

describe("Fahad's Acceptance Cases & Citizen Submission/Clarification Flow", () => {
  it('Case A (exact): routes directly to SSGC and citizen draft is ready without asking questions', () => {
    const text = 'Assalamualikum do din se masla hai koyi sunta hi nhi kab se bol rahe hain gas nhi hai humare elaqe mein lekin koyi sunne wala hi nhi hai yeh haqomat sunti hi nhi hai madarchod ho tum sare tum sub ki maa ki chut';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['ssgc']);
    }
  });

  it('Case A.1 (clean): routes directly to SSGC and citizen draft is ready', () => {
    const text = 'Do din se masla hai koi sunta hi nahi kab se bol rahe hain gas nahi hai humare elaqe mein lekin koi sunne wala hi nahi hai yeh haqomat sunti hi nahi hai';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['ssgc']);
    }
  });

  it('Case A.2 (gas outage at end): routes directly to SSGC and citizen draft is ready', () => {
    const text = 'Assalamualikum do din se masla hai koyi sunta hi nhi kab se bol rahe hain lekin koyi sunne wala hi nhi hai yeh haqomat sunti hi nhi hai gas nhi hai humare elaqe mein';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['ssgc']);
    }
  });

  it('Case B (listen uncertainty): routes to SSGC and citizen draft is ready', () => {
    const text = 'Pata nahi koi sunta kyun nahi hum teen baar bata chuke hain do din se gas nhi hai ghar mein chulha nahi jal raha';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['ssgc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['ssgc']);
    }
  });

  it('Case C.1 (cur_567e1bbfff36089f): vague defect defers to human review and asks citizen for details', () => {
    const text = 'pichlay teen din se hamare area mein pata nahi bijli ka masla hai ya water supply ka kuch samajh nahi aa raha';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual([]);
    expect(res.needsReview).toBe(true);
    expect(res.reviewReason).toBe('UNCERTAIN_DEFECT');

    const draft = assessComplaintDraft(text);
    expect(draft.state === 'ask' || draft.state === 'review').toBe(true);
  });

  it('Case C.2 (control: affirmative water defect): routes to KWSC and citizen draft is ready', () => {
    const text = 'Pata nahi wajah kya hai lekin do din se nal mein pani nahi aa raha';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kwsc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['kwsc']);
    }
  });

  it('Case D.1 (motor consequence of power cut): routes only to K-Electric and citizen draft is ready', () => {
    const text = 'Bijli nahi hai isi liye motor nahi chal rahi aur ghar ki tanki khaali hai';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['kelectric']);
    }
  });

  it('Case D.2 (independent power and water main burst): routes to both K-Electric and KWSC', () => {
    const text = 'Bijli nahi hai aur doosri gali mein pani ki main line bhi phat gayi hai';
    const res = classifyV11RelationAware(text);
    expect([...res.departments].sort()).toEqual(['kelectric', 'kwsc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect([...draft.departments].sort()).toEqual(['kelectric', 'kwsc']);
    }
  });

  it('Case E.1 (road sink is consequence of water main burst): routes only to KWSC and citizen draft is ready', () => {
    const text = 'Pani ki main line phat gayi jis ki wajah se sarak dhans gayi';
    const res = classifyV11RelationAware(text);
    expect(res.departments).toEqual(['kwsc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect(draft.departments).toEqual(['kwsc']);
    }
  });

  it('Case E.2 (water main burst and independent old road damage): routes to both KMC and KWSC', () => {
    const text = 'Pani ki main line aaj phati hai aur doosre block ki sarak do hafton se tooti pari hai';
    const res = classifyV11RelationAware(text);
    expect([...res.departments].sort()).toEqual(['kmc', 'kwsc']);
    expect(res.needsReview).toBe(false);

    const draft = assessComplaintDraft(text);
    expect(draft.state).toBe('ready');
    if (draft.state === 'ready') {
      expect([...draft.departments].sort()).toEqual(['kmc', 'kwsc']);
    }
  });
});
