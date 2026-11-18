import { describe, it, expect } from 'vitest';
import candidateModelRaw from '../models/v11_candidate_model.json';
import {
  classifyV11RelationAware,
  type V11ModelArtifact,
} from '../services/v11InferenceAdapter';
import { analyzeComplaintRelationAware } from '../services/relationEngine';

const candidateModel = candidateModelRaw as unknown as V11ModelArtifact;

describe('V11.4.4 Champion Model & Relation Engine Verification', () => {
  it('correctly routes power outage causing domestic pump failure to K-Electric only', () => {
    const text = 'light nahi aa rahi jis ki wajah se pani ki motor band hai';
    const analysis = analyzeComplaintRelationAware(text);
    expect(analysis.proposed_departments).toEqual(['kelectric']);
    expect(analysis.needs_review).toBe(false);

    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.needsReview).toBe(false);
  });

  it('correctly handles classic bijli nahi aa rahi symptom', () => {
    const text = 'bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi';
    const analysis = analyzeComplaintRelationAware(text);
    expect(analysis.proposed_departments).toEqual(['kelectric']);
    expect(analysis.needs_review).toBe(false);

    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['kelectric']);
    expect(res.needsReview).toBe(false);
  });

  it('correctly handles informal spelling: bijli nhi aarhi waja se motor h band', () => {
    const text = 'bijli nhi aarhi waja se motor h band';
    const analysis = analyzeComplaintRelationAware(text);
    expect(analysis.proposed_departments).toEqual(['kelectric']);

    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['kelectric']);
  });

  it('correctly routes obvious road complaint to KMC only', () => {
    const text = 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['kmc']);
    expect(res.needsReview).toBe(false);
  });

  it('correctly routes dual independent hazard: gas odor and electric wire spark', () => {
    const text = 'gas ki boo aa rahi aur electric wire bhi spark kar rahi';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toContain('ssgc');
    expect(res.departments).toContain('kelectric');
    expect(res.needsReview).toBe(false);
  });

  it('correctly routes independent road defect and public water pipeline burst', () => {
    const text = 'sarak mein gaddha hai aur alag se public water pipeline phati hai';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toContain('kmc');
    expect(res.departments).toContain('kwsc');
    expect(res.needsReview).toBe(false);
  });

  it('correctly handles explicit negation: ye gas ka masla nahi, kachra nahi uth raha', () => {
    const text = 'ye gas ka masla nahi, kachra nahi uth raha';
    const res = classifyV11RelationAware(text, candidateModel);
    expect(res.departments).toEqual(['sswmb']);
    expect(res.needsReview).toBe(false);
  });
});
