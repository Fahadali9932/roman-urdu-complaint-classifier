import { describe, it, expect } from 'vitest';
import { buildIssueRelationGraph } from '../services/v13_4/issueRelationGraph';
import { classifyV13_4 } from '../services/v13_4/v13_4_engine';
import { championV11Model } from '../services/v11InferenceAdapter';

describe('AWAAZ-E-AWAM — Phase V13.4 Causal Reasoning & False-Extra Unit Tests', () => {
  it('1. routes independent power and road defects to both kelectric and kmc', () => {
    const text = 'Do din se bijli nahi aa rahi aur hamari gali ki road bhi toot gayi hai.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['kelectric', 'kmc']);
    expect(result.departments).toEqual(['kelectric', 'kmc']);
    expect(result.decisionRecords.find((d) => d.department === 'kelectric')?.status).toBe('SELECTED');
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.status).toBe('SELECTED');
  });

  it('2. demotes water motor consequence when power outage is the root fault (kelectric only)', () => {
    const text = 'Do din se bijli nahi aa rahi is wajah se pani ki motor nahi chal rahi.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['kelectric']);
    expect(graph.suppressedDepartments).toContain('kwsc');
    expect(result.departments).toEqual(['kelectric']);
    expect(result.decisionRecords.find((d) => d.department === 'kwsc')?.status).toBe('SUPPRESSED');
    expect(result.decisionRecords.find((d) => d.department === 'kwsc')?.decisionSource).toBe('CAUSAL_SUPPRESSION');
  });

  it('3. demotes road damage when water main burst causes erosion (kwsc only)', () => {
    const text = 'Water board ki main line phat gayi hai jis ke paani se pori road toot kar beh gayi.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['kwsc']);
    expect(graph.suppressedDepartments).toContain('kmc');
    expect(result.departments).toEqual(['kwsc']);
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.status).toBe('SUPPRESSED');
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.decisionSource).toBe('CAUSAL_SUPPRESSION');
  });

  it('4. demotes road trench when gas pipeline excavation left trench (ssgc only)', () => {
    const text = 'Sui gas walon ne pipeline dalne k liye sarak khodi aur khadda chor kar chale gaye.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['ssgc']);
    expect(graph.suppressedDepartments).toContain('kmc');
    expect(result.departments).toEqual(['ssgc']);
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.status).toBe('SUPPRESSED');
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.decisionSource).toBe('CAUSAL_SUPPRESSION');
  });

  it('5. demotes gutter choke when solid waste dump blocks drainage (sswmb only)', () => {
    const text = 'Kachray ka dher para hai jis ki wajah se gutter choke ho kar ubal raha hai.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['sswmb']);
    expect(graph.suppressedDepartments).toContain('kwsc');
    expect(result.departments).toEqual(['sswmb']);
    expect(result.decisionRecords.find((d) => d.department === 'kwsc')?.status).toBe('SUPPRESSED');
    expect(result.decisionRecords.find((d) => d.department === 'kwsc')?.decisionSource).toBe('CAUSAL_SUPPRESSION');
  });

  it('6. demotes road when road is spatial location anchor for fallen electric pole (kelectric only)', () => {
    const text = 'Road par bijli ka khamba gir gaya hai aur taar latak rahi hain.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['kelectric']);
    expect(graph.actionableDepartments).not.toContain('kmc');
    expect(result.departments).toEqual(['kelectric']);
    expect(result.decisionRecords.find((d) => d.department === 'kmc')?.status).not.toBe('SELECTED');
  });

  it('7. safely handles explicit negations without routing negated department', () => {
    const text = 'Gali mein bijli ka masla bilkul nahi hai sirf kachray ka dher laga hua hai.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['sswmb']);
    expect(graph.suppressedDepartments).toContain('kelectric');
    expect(result.departments).toEqual(['sswmb']);
  });

  it('8. suppresses historical/resolved issues from actionable routing', () => {
    const text = 'Pichle hafte bijli ka masla to hal ho gaya tha ab gutter ubal raha hai.';
    const graph = buildIssueRelationGraph(text);
    const result = classifyV13_4(text, championV11Model as any);

    expect(graph.actionableDepartments).toEqual(['kwsc']);
    expect(graph.suppressedDepartments).toContain('kelectric');
    expect(result.departments).toEqual(['kwsc']);
  });
});
