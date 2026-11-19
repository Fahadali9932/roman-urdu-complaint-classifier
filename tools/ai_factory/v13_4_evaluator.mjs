/**
 * AWAAZ-E-AWAM — Phase V13.4 Independent Final Holdout Evaluator
 *
 * Compares:
 * 1. Run004 Baseline (V11 Hybrid Relation Policy)
 * 2. Run004 + V13.4 Causal & False-Extra Reduced Engine
 * 3. Run006 + V13.3 Reasoning Integrity Policy
 * 4. Run006 + V13.4 Causal & False-Extra Reduced Engine
 *
 * Evaluates across all 500 untouched holdout complaints and computes:
 * - Exact-set accuracy
 * - Macro F1
 * - Per-department precision, recall, F1
 * - False extra department rate
 * - Missed department rate
 * - Complexity breakdown (Single, Dual, Triple, Causal, Negation, Out-of-Scope, Ambiguous)
 * - Single-inference latency (mean and p95)
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const DEPARTMENTS = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

// Load frozen model artifacts
const run004Path = path.join(rootDir, 'data/v11/curriculum_runs/run_004/candidate_model.json');
const run004Model = JSON.parse(fs.readFileSync(run004Path, 'utf8'));

const run006Path = path.join(rootDir, 'data/v11/curriculum_runs/run_006/candidate_model.json');
const run006Model = JSON.parse(fs.readFileSync(run006Path, 'utf8'));

// Import inference engines
const v11EngineUrl = pathToFileURL(path.join(rootDir, 'supabase/functions/_shared/v11-engine.ts')).href;
const { classifyV11RelationAware } = await import(v11EngineUrl);

const v13_2EngineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_2/v13_2_engine.ts')).href;
const { classifyV13_2 } = await import(v13_2EngineUrl);

const v13_4EngineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_4/v13_4_engine.ts')).href;
const { classifyV13_4 } = await import(v13_4EngineUrl);

// Load 500-case holdout benchmark
const holdoutPath = path.join(rootDir, 'data/v11/eval_v13_4/v13_4_holdout_500.jsonl');
const lines = fs.readFileSync(holdoutPath, 'utf8').trim().split('\n');
const cases = lines.map((l) => JSON.parse(l));

console.log(`Starting independent final evaluation across ${cases.length} holdout cases...\n`);

function evaluateSystem(systemName, predictFn) {
  let exactMatches = 0;
  let totalExtraDepts = 0;
  let totalMissedDepts = 0;
  const latencies = [];

  const byComplexity = {
    single_department: { total: 0, correct: 0 },
    dual_department: { total: 0, correct: 0 },
    triple_department: { total: 0, correct: 0 },
    causal_consequence: { total: 0, correct: 0 },
    negation_suppressed: { total: 0, correct: 0 },
    out_of_scope: { total: 0, correct: 0 },
    ambiguous: { total: 0, correct: 0 },
  };

  const perDept = {};
  for (const dept of DEPARTMENTS) {
    perDept[dept] = { tp: 0, fp: 0, fn: 0 };
  }

  const failures = [];

  for (const item of cases) {
    const expected = [...item.expected].sort();
    const t0 = performance.now();
    const result = predictFn(item.text);
    const t1 = performance.now();
    latencies.push(t1 - t0);

    const predicted = [...(result.departments || [])].sort();

    const isExact =
      expected.length === predicted.length &&
      expected.every((d, idx) => d === predicted[idx]);

    if (isExact) {
      exactMatches++;
    } else {
      failures.push({
        id: item.id,
        complexity: item.complexity,
        category: item.category,
        text: item.text,
        expected,
        predicted,
        notes: result.notes || [],
      });
    }

    const compKey = item.complexity || 'single_department';
    if (byComplexity[compKey]) {
      byComplexity[compKey].total++;
      if (isExact) byComplexity[compKey].correct++;
    }

    for (const dept of DEPARTMENTS) {
      const expHas = expected.includes(dept);
      const predHas = predicted.includes(dept);
      if (expHas && predHas) {
        perDept[dept].tp++;
      } else if (!expHas && predHas) {
        perDept[dept].fp++;
        totalExtraDepts++;
      } else if (expHas && !predHas) {
        perDept[dept].fn++;
        totalMissedDepts++;
      }
    }
  }

  let sumF1 = 0;
  const deptMetrics = {};
  for (const dept of DEPARTMENTS) {
    const { tp, fp, fn } = perDept[dept];
    const prec = tp + fp > 0 ? tp / (tp + fp) : 1.0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 1.0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0.0;
    sumF1 += f1;
    deptMetrics[dept] = {
      tp,
      fp,
      fn,
      precision: +(prec * 100).toFixed(2),
      recall: +(rec * 100).toFixed(2),
      f1: +(f1 * 100).toFixed(2),
    };
  }

  const macroF1 = +(sumF1 / DEPARTMENTS.length * 100).toFixed(2);
  const exactAccuracy = +(exactMatches / cases.length * 100).toFixed(2);
  const falseExtraRate = +(totalExtraDepts / cases.length * 100).toFixed(2);
  const missedDeptRate = +(totalMissedDepts / cases.length * 100).toFixed(2);

  latencies.sort((a, b) => a - b);
  const meanLatency = +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const p95Latency = +latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

  const complexityAccuracy = {};
  for (const [k, v] of Object.entries(byComplexity)) {
    complexityAccuracy[k] = {
      total: v.total,
      correct: v.correct,
      accuracy: v.total > 0 ? +(v.correct / v.total * 100).toFixed(2) : 0,
    };
  }

  console.log(`=== SYSTEM: ${systemName} ===`);
  console.log(`Exact-Set Accuracy: ${exactMatches}/${cases.length} (${exactAccuracy}%)`);
  console.log(`Macro F1: ${macroF1}%`);
  console.log(`False Extra Rate: ${falseExtraRate}%`);
  console.log(`Missed Dept Rate: ${missedDeptRate}%`);
  console.log(`Mean Latency: ${meanLatency} ms (p95: ${p95Latency} ms)`);
  console.log('Complexity Breakdown:');
  for (const [k, v] of Object.entries(complexityAccuracy)) {
    console.log(`  ${k}: ${v.correct}/${v.total} (${v.accuracy}%)`);
  }
  console.log();

  return {
    systemName,
    totalCases: cases.length,
    exactMatches,
    exactAccuracy,
    macroF1,
    deptMetrics,
    complexityAccuracy,
    falseExtraRate,
    missedDeptRate,
    meanLatencyMs: meanLatency,
    p95LatencyMs: p95Latency,
    failureCount: failures.length,
    failuresSample: failures.slice(0, 15),
  };
}

// 1. Run004 Baseline (V11)
const run004Baseline = evaluateSystem(
  'Run004 Baseline (V11)',
  (text) => classifyV11RelationAware(text, run004Model)
);

// 2. Run004 + V13.4 Engine
const run004Candidate = evaluateSystem(
  'Run004 + V13.4 Engine',
  (text) => classifyV13_4(text, run004Model)
);

// 3. Run006 Baseline (V11)
const run006Baseline = evaluateSystem(
  'Run006 Baseline (V11)',
  (text) => classifyV11RelationAware(text, run006Model)
);

// 4. Run006 + V13.3 Policy
const run006V13_3 = evaluateSystem(
  'Run006 + V13.3 Policy',
  (text) => classifyV13_2(text, run006Model)
);

// 5. Run006 + V13.4 Engine
const run006Candidate = evaluateSystem(
  'Run006 + V13.4 Engine',
  (text) => classifyV13_4(text, run006Model)
);

// Save comprehensive evaluation report
const report = {
  benchmark_name: 'v13_4_holdout_500',
  timestamp: new Date().toISOString(),
  totalCases: cases.length,
  systems: {
    run004Baseline,
    run004Candidate,
    run006Baseline,
    run006V13_3,
    run006Candidate,
  },
};

const reportPath = path.join(rootDir, 'data/v11/eval_v13_4/v13_4_evaluation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`Comprehensive evaluation report saved to: ${reportPath}`);
