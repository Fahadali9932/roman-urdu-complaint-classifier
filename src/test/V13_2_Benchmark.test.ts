import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import Models
import run004Model from '../models/v11_candidate_model.json';
import { classifyV11RelationAware } from '../services/v11InferenceAdapter';
import { classifyV13_2 } from '../services/v13_2/v13_2_engine';

const DEPARTMENTS = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

function loadJsonl(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  return content.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function evaluateSystem(dataset: any[], name: string, classifyFn: (text: string) => any) {
  let exactMatches = 0;
  const totalCases = dataset.length;

  const perDept: Record<string, { tp: number; fp: number; fn: number }> = {};
  for (const dept of DEPARTMENTS) {
    perDept[dept] = { tp: 0, fp: 0, fn: 0 };
  }

  const byComplexity: Record<string, { total: number; correct: number }> = {
    '1_dept': { total: 0, correct: 0 },
    '2_dept': { total: 0, correct: 0 },
    '3_dept': { total: 0, correct: 0 },
    'causal': { total: 0, correct: 0 },
    'negation': { total: 0, correct: 0 },
    'ambiguous': { total: 0, correct: 0 },
  };

  let totalExtraDepts = 0;
  let totalMissedDepts = 0;
  let totalExpectedDepts = 0;

  const latencies: number[] = [];
  const failures: any[] = [];

  for (const item of dataset) {
    const text = item.text;
    const expected = [...item.expected].sort();
    totalExpectedDepts += expected.length;

    const start = performance.now();
    const result = classifyFn(text);
    const duration = performance.now() - start;
    latencies.push(duration);

    const predicted = [...(result.departments || [])].sort();

    const isExact =
      expected.length === predicted.length &&
      expected.every((d: string, idx: number) => d === predicted[idx]);

    if (isExact) {
      exactMatches++;
    } else {
      failures.push({
        id: item.id,
        category: item.category,
        text: item.text,
        expected,
        predicted,
      });
    }

    let compKey = '1_dept';
    if (item.category?.includes('causal') || item.complexity?.includes('causal')) {
      compKey = 'causal';
    } else if (item.category?.includes('negation') || item.complexity?.includes('negation')) {
      compKey = 'negation';
    } else if (item.category?.includes('ambiguous') || expected.length === 0) {
      compKey = 'ambiguous';
    } else if (expected.length === 2) {
      compKey = '2_dept';
    } else if (expected.length >= 3) {
      compKey = '3_dept';
    } else if (expected.length === 1) {
      compKey = '1_dept';
    }

    if (byComplexity[compKey]) {
      byComplexity[compKey].total++;
      if (isExact) byComplexity[compKey].correct++;
    }

    for (const dept of DEPARTMENTS) {
      const expHas = expected.includes(dept);
      const predHas = predicted.includes(dept);
      if (expHas && predHas) perDept[dept].tp++;
      else if (!expHas && predHas) {
        perDept[dept].fp++;
        totalExtraDepts++;
      } else if (expHas && !predHas) {
        perDept[dept].fn++;
        totalMissedDepts++;
      }
    }
  }

  let sumF1 = 0;
  const deptMetrics: Record<string, any> = {};
  for (const dept of DEPARTMENTS) {
    const { tp, fp, fn } = perDept[dept];
    const prec = tp + fp > 0 ? tp / (tp + fp) : 1.0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 1.0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0.0;
    sumF1 += f1;
    deptMetrics[dept] = {
      precision: +(prec * 100).toFixed(2),
      recall: +(rec * 100).toFixed(2),
      f1: +(f1 * 100).toFixed(2),
    };
  }
  const macroF1 = +((sumF1 / DEPARTMENTS.length) * 100).toFixed(2);
  const exactAccuracy = +((exactMatches / totalCases) * 100).toFixed(2);

  latencies.sort((a, b) => a - b);
  const meanLatency = +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const p95Latency = +latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

  const complexityAccuracy: Record<string, any> = {};
  for (const [k, v] of Object.entries(byComplexity)) {
    complexityAccuracy[k] = {
      total: v.total,
      correct: v.correct,
      accuracy: v.total > 0 ? +((v.correct / v.total) * 100).toFixed(2) : 0,
    };
  }

  return {
    systemName: name,
    totalCases,
    exactMatches,
    exactAccuracy,
    macroF1,
    deptMetrics,
    complexityAccuracy,
    falseExtraRate: +((totalExtraDepts / totalCases) * 100).toFixed(2),
    missedDeptRate: +((totalMissedDepts / (totalExpectedDepts || 1)) * 100).toFixed(2),
    meanLatencyMs: meanLatency,
    p95LatencyMs: p95Latency,
    failureCount: failures.length,
    failuresSample: failures.slice(0, 10),
  };
}

describe('V13.2 Comparative Benchmark Evaluation Suite', () => {
  const devPath = path.resolve('data/v11/eval_v13_2/v13_2_dev_suite_200.jsonl');
  const holdoutPath = path.resolve('data/v11/eval_v13_2/v13_2_holdout_500.jsonl');
  const run006Path = path.resolve('data/v11/curriculum_runs/run_006/candidate_model.json');

  const devData = loadJsonl(devPath);
  const holdoutData = loadJsonl(holdoutPath);
  const run006Model = fs.existsSync(run006Path) ? JSON.parse(fs.readFileSync(run006Path, 'utf8')) : null;

  it('runs comparative benchmark on 200-case dev suite and validates V13.2 superiority', () => {
    const run004Baseline = evaluateSystem(devData, 'Run004 Baseline (V11)', (text) =>
      classifyV11RelationAware(text, run004Model as any)
    );
    const run004Candidate = evaluateSystem(devData, 'Run004 + V13.2 Candidate', (text) =>
      classifyV13_2(text, run004Model as any)
    );

    console.log('\n--- 200-CASE DEV SUITE RESULTS ---');
    console.log(`Run004 Baseline:  Exact Acc = ${run004Baseline.exactAccuracy}%, Macro F1 = ${run004Baseline.macroF1}%`);
    console.log(`Run004 Candidate: Exact Acc = ${run004Candidate.exactAccuracy}%, Macro F1 = ${run004Candidate.macroF1}%`);

    if (run006Model) {
      const run006Baseline = evaluateSystem(devData, 'Run006 Baseline (V11)', (text) =>
        classifyV11RelationAware(text, run006Model)
      );
      const run006Candidate = evaluateSystem(devData, 'Run006 + V13.2 Candidate', (text) =>
        classifyV13_2(text, run006Model)
      );
      console.log(`Run006 Baseline:  Exact Acc = ${run006Baseline.exactAccuracy}%, Macro F1 = ${run006Baseline.macroF1}%`);
      console.log(`Run006 Candidate: Exact Acc = ${run006Candidate.exactAccuracy}%, Macro F1 = ${run006Candidate.macroF1}%`);
    }

    expect(run004Candidate.exactAccuracy).toBeGreaterThanOrEqual(run004Baseline.exactAccuracy);
    expect(run004Candidate.macroF1).toBeGreaterThan(85.0);
  }, 60000);

  it('runs comparative benchmark on 500-case untouched holdout suite', () => {
    const run004Baseline = evaluateSystem(holdoutData, 'Run004 Baseline (V11)', (text) =>
      classifyV11RelationAware(text, run004Model as any)
    );
    const run004Candidate = evaluateSystem(holdoutData, 'Run004 + V13.2 Candidate', (text) =>
      classifyV13_2(text, run004Model as any)
    );

    console.log('\n--- 500-CASE UNTOUCHED HOLDOUT SUITE RESULTS ---');
    console.log(`Run004 Baseline:  Exact Acc = ${run004Baseline.exactAccuracy}%, Macro F1 = ${run004Baseline.macroF1}%`);
    console.log(`Run004 Candidate: Exact Acc = ${run004Candidate.exactAccuracy}%, Macro F1 = ${run004Candidate.macroF1}%`);

    let run006Baseline = null;
    let run006Candidate = null;
    if (run006Model) {
      run006Baseline = evaluateSystem(holdoutData, 'Run006 Baseline (V11)', (text) =>
        classifyV11RelationAware(text, run006Model)
      );
      run006Candidate = evaluateSystem(holdoutData, 'Run006 + V13.2 Candidate', (text) =>
        classifyV13_2(text, run006Model)
      );
      console.log(`Run006 Baseline:  Exact Acc = ${run006Baseline.exactAccuracy}%, Macro F1 = ${run006Baseline.macroF1}%`);
      console.log(`Run006 Candidate: Exact Acc = ${run006Candidate.exactAccuracy}%, Macro F1 = ${run006Candidate.macroF1}%`);
    }

    // Save full JSON report
    const reportPath = path.resolve('data/v11/eval_v13_2/v13_2_evaluation_report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          holdoutRun004Baseline: run004Baseline,
          holdoutRun004Candidate: run004Candidate,
          holdoutRun006Baseline: run006Baseline,
          holdoutRun006Candidate: run006Candidate,
        },
        null,
        2
      )
    );

    expect(run004Candidate.exactAccuracy).toBeGreaterThanOrEqual(run004Baseline.exactAccuracy);
    expect(run004Candidate.meanLatencyMs).toBeLessThan(50);
  }, 60000);
});
