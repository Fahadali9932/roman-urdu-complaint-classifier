/** Known V13.5 development fixtures: regression gate, not an untouched holdout. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { championV11Model } from '../services/v11InferenceAdapter';
import { classifyV13_6 } from '../services/v13_6/v13_6_engine';

const samples: Array<{ id: string; text: string; expected: string[] }> =
  readFileSync('data/v11/eval_v13_5/v13_5_three_dept_safety_50.jsonl', 'utf8')
    .trim().split('\n').map((line) => JSON.parse(line));

describe('V13.6 — three-department safety regression', () => {
  it('never automatically routes or loses the known triple-issue evidence', () => {
    const failures: Array<{ id: string; text: string; found: string[]; evidence: string[] }> = [];
    for (const sample of samples) {
      const result = classifyV13_6(sample.text, championV11Model as any);
      const allFound = sample.expected.every((dept) => result.allDetectedDepartments.includes(dept as any));
      if (!result.twoDeptPolicyTriggered || result.departments.length > 0 || !allFound) {
        failures.push({
          id: sample.id,
          text: sample.text.slice(0, 270),
          found: result.allDetectedDepartments,
          evidence: result.recoveredIndependentEvidence.map((item) => `${item.department}:${item.asset}/${item.defect}`),
        });
      }
    }
    if (failures.length) console.log('THREE_DEPT_MISSES', JSON.stringify(failures));
    expect(failures).toEqual([]);
  }, 20000);
});
