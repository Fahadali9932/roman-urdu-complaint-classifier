import { describe, expect, it } from 'vitest';
import { championV11Model } from '../services/v11InferenceAdapter';
import { classifyV13_4 } from '../services/v13_4/v13_4_engine';
import { assessComplaintDraftV13_6, classifyV13_6 } from '../services/v13_6/v13_6_engine';
import { extractIndependentIssuesV13_6 } from '../services/v13_6/issueEvidence';

const model = championV11Model as any;

describe('V13.6 — pre-routing independent evidence and safe triage', () => {
  it('recovers two differently worded independent physical faults', () => {
    const text = 'Bhai footpath pura tut chuka h, chalne ki jagah ni bachi or dusra msla ye h k sewr line block ho chuki h.';
    const result = classifyV13_6(text, model);
    expect(result.departments).toContain('kmc');
    expect(result.departments).toContain('kwsc');
    expect(result.twoDeptPolicyTriggered).toBe(false);
  });

  it('detects three separate faults before the final model drops a department', () => {
    const text = 'Pehla ye ke road par khaday hain, doyam ye ke sewerage line ubal rahi hai, aur soyam ye ke feeder trip hone se bijli band hai.';
    const result = classifyV13_6(text, model);
    expect(result.twoDeptPolicyTriggered).toBe(true);
    expect(result.departments).toEqual([]);
    expect(result.needsReview).toBe(true);
    expect(result.reviewReason).toBe('EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED');
    expect(result.allDetectedDepartments).toEqual(['kelectric', 'kmc', 'kwsc']);
  });

  it('does not mistake a road location for a damaged road', () => {
    const text = 'Road par bijli ka khamba gir gaya hai aur taar latak rahi hain.';
    const result = classifyV13_6(text, model);
    expect(result.departments).toEqual(['kelectric']);
  });

  it('does not create KWSC ticket for a domestic pump stopped by power outage', () => {
    const text = 'Do din se bijli nahi aa rahi is wajah se pani ki motor nahi chal rahi.';
    const result = classifyV13_6(text, model);
    expect(result.departments).toEqual(['kelectric']);
  });

  it('does not misread a lane name as an independent road defect during a feeder outage', () => {
    const text = 'Gali mein feeder trip hone se bijli band hai tab se underground water pump nahi chal saka.';
    const result = classifyV13_6(text, model);
    expect(result.departments).toEqual(['kelectric']);
  });

  it('keeps negated electricity out of a separate garbage grievance', () => {
    const text = 'Bijli ka koi masla nahi hai, sirf kachray ka dher para hai.';
    const result = classifyV13_6(text, model);
    expect(result.departments).toEqual(['sswmb']);
  });

  it('does not newly route vague text without two independent grounded defects', () => {
    const text = 'Mohtaram afsaran hamare ilake mein halat kharab hain sab pareshan hain aur koi kaam theek nahi.';
    const result = classifyV13_6(text, model);
    const previous = classifyV13_4(text, model);
    expect(result.departments).toEqual(previous.departments);
    expect(result.needsReview).toBe(previous.needsReview);
  });

  it('does not invent a third department from civic keywords alone', () => {
    const text = 'Hamari gali ki road toot gayi aur pani ki main line phat gayi hai, isko foran theek karo.';
    const result = classifyV13_6(text, model);
    expect(result.twoDeptPolicyTriggered).toBe(false);
    expect(result.departments).toEqual(['kmc', 'kwsc']);
  });

  it('records source spans for independently grounded issues', () => {
    const evidence = extractIndependentIssuesV13_6('Sui gas ka pressure low hai aur kachra uthaya nahi ja raha.');
    expect(evidence.some((issue) => issue.department === 'ssgc' && issue.span.includes('gas'))).toBe(true);
    expect(evidence.some((issue) => issue.department === 'sswmb')).toBe(true);
  });

  it('enforces 200-word maximum before local preview and escalates three faults', () => {
    expect(assessComplaintDraftV13_6(' ', model)).toEqual({ state: 'invalid', reason: 'EMPTY' });
    expect(assessComplaintDraftV13_6(Array(201).fill('bijli').join(' '), model))
      .toEqual({ state: 'invalid', reason: 'WORD_LIMIT' });
    const triple = assessComplaintDraftV13_6(
      'Road toot chuki hai, sewerage line ubal rahi hai aur bijli ka transformer blast ho gaya hai.', model
    );
    expect(triple.state).toBe('review');
    if (triple.state === 'review') {
      expect(triple.reason).toBe('EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED');
      expect(triple.prediction.allDetectedDepartments).toHaveLength(3);
    }
  });
});
