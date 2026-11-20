/**
 * Explicitly opt-in development diagnostic. The V13.5 examples have been
 * inspected during V13.6 development and are NOT a fresh independent holdout.
 * RUN_V13_6_DEV_PROBE=1 npx vitest run src/test/V13_6_DevelopmentProbe.test.ts
 */
import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { championV11Model } from '../services/v11InferenceAdapter';
import { classifyV13_5 } from '../services/v13_5/v13_5_engine';
import { classifyV13_6 } from '../services/v13_6/v13_6_engine';

interface Example {
  text: string;
  expected: string[];
  category: string;
}

const load = (file: string): Example[] =>
  readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

const model = championV11Model as any;

describe('V13.6 dev-only, previously-seen benchmark probe', () => {
  it.skipIf(process.env.RUN_V13_6_DEV_PROBE !== '1')('compares Run004 candidate against existing development diagnostics', () => {
    const cases = load('data/v11/eval_v13_5/v13_5_holdout_2000.jsonl');
    const results = [
      ['v13.5-run004', classifyV13_5],
      ['v13.6-run004', classifyV13_6],
    ] as const;
    for (const [name, fn] of results) {
      let correct = 0;
      let extra = 0;
      let missed = 0;
      let escalated = 0;
      const category: Record<string, { total: number; correct: number }> = {};
      for (const item of cases) {
        const predicted = fn(item.text, model);
        const actual = predicted.departments;
        const expected = item.expected;
        const stat = category[item.category] ??= { total: 0, correct: 0 };
        stat.total++;
        if (expected.length === actual.length && expected.every((dept) => actual.includes(dept as any))) {
          correct++;
          stat.correct++;
        }
        if (actual.some((dept) => !expected.includes(dept))) extra++;
        if (expected.some((dept) => !actual.includes(dept))) missed++;
        if (predicted.twoDeptPolicyTriggered) escalated++;
      }
      console.log(`DEVELOPMENT_ONLY ${name}`, JSON.stringify({ exact: correct, total: cases.length, extra, missed, escalated, category }));
    }

    const examples: Record<string, string[]> = { causal_dependent: [], genuinely_ambiguous: [], negation_historical: [] };
    const refusalReasons: Record<string, number> = {};
    for (const item of cases) {
      if (!(item.category in examples)) continue;
      const predicted = classifyV13_6(item.text, model);
      const baseline = classifyV13_5(item.text, model);
      if (item.category === 'genuinely_ambiguous') {
        const key = `${baseline.reviewReason}:${baseline.departments.join(',')}`;
        refusalReasons[key] = (refusalReasons[key] ?? 0) + 1;
      }
      if (predicted.departments.length === item.expected.length && item.expected.every((d) => predicted.departments.includes(d as any))) continue;
      if (examples[item.category].length >= 5) continue;
      examples[item.category].push(JSON.stringify({ text: item.text.slice(0, 140), expected: item.expected, actual: predicted.departments, base: baseline.departments, baseReason: baseline.reviewReason, baseGraph: baseline.graph.suppressedDepartments, evidence: predicted.recoveredIndependentEvidence.map((x) => `${x.department}:${x.asset}/${x.defect}`) }));
    }
    console.log('DEVELOPMENT_ONLY sample_errors', JSON.stringify({ examples, refusalReasons }));

    const three = load('data/v11/eval_v13_5/v13_5_three_dept_safety_50.jsonl');
    let escalated = 0;
    let preserved = 0;
    let falseRouted = 0;
    for (const item of three) {
      const prediction = classifyV13_6(item.text, model);
      if (prediction.twoDeptPolicyTriggered) escalated++;
      if (item.expected.every((dept) => prediction.allDetectedDepartments.includes(dept as any))) preserved++;
      if (prediction.departments.length > 0) falseRouted++;
    }
    console.log('DEVELOPMENT_ONLY v13.6-three-dept-run004', JSON.stringify({ total: three.length, escalated, preserved, falseRouted }));
  }, 120000);
});
