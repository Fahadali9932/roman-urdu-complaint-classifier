/**
 * AWAAZ-E-AWAM — Phase V13.5 Independent 2,000-Complaint Evaluator
 * & Three-Department Safety Suite Evaluator
 *
 * Compares:
 * 1. System 1: Run004 Baseline (V11 Relation Aware)
 * 2. System 2: Run006 Baseline (V11 Relation Aware)
 * 3. System 3: Run006 + V13.4 Engine (Causal Reasoning & False-Extra Reduced)
 * 4. System 4: Run006 + V13.5 Two-Department Policy
 * 5. System 5: Run004 + V13.5 Two-Department Policy
 *
 * Evaluates across all 2,000 untouched holdout complaints and computes:
 * - Exact-set accuracy with Wilson 95% confidence intervals
 * - Macro F1
 * - Per-department precision, recall, F1
 * - False extra department rate & count
 * - Missed department rate & count
 * - Category breakdown (all 8 mutually exclusive categories)
 * - Single-inference latency (mean, median, p95)
 *
 * Separately evaluates the 50-case Three-Department Safety Suite:
 * - Human review escalation rate
 * - Evidence preservation rate
 * - Zero arbitrary truncation verification
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

const v13_4EngineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_4/v13_4_engine.ts')).href;
const { classifyV13_4 } = await import(v13_4EngineUrl);

const v13_5EngineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_5/v13_5_engine.ts')).href;
const { classifyV13_5 } = await import(v13_5EngineUrl);

// Load 2,000-case holdout benchmark
const holdoutPath = path.join(rootDir, 'data/v11/eval_v13_5/v13_5_holdout_2000.jsonl');
const lines = fs.readFileSync(holdoutPath, 'utf8').trim().split('\n');
const cases = lines.map((l) => JSON.parse(l));

// Load 50-case safety suite
const safetyPath = path.join(rootDir, 'data/v11/eval_v13_5/v13_5_three_dept_safety_50.jsonl');
const safetyLines = fs.readFileSync(safetyPath, 'utf8').trim().split('\n');
const safetyCases = safetyLines.map((l) => JSON.parse(l));

console.log(`Loaded ${cases.length} primary benchmark cases.`);
console.log(`Loaded ${safetyCases.length} three-department safety cases.\n`);

function wilsonScoreInterval(k, n, confidence = 0.95) {
  if (n === 0) return [0, 0];
  const z = 1.95996; // 95% confidence
  const p = k / n;
  const denominator = 1 + (z * z) / n;
  const centreAdjustedProbability = p + (z * z) / (2 * n);
  const adjustedStandardDeviation = Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  
  const lower = Math.max(0, (centreAdjustedProbability - z * adjustedStandardDeviation) / denominator);
  const upper = Math.min(1, (centreAdjustedProbability + z * adjustedStandardDeviation) / denominator);
  
  return [+(lower * 100).toFixed(2), +(upper * 100).toFixed(2)];
}

function evaluatePrimaryBenchmark(systemName, predictFn) {
  let exactMatches = 0;
  let totalExtraDepts = 0;
  let totalMissedDepts = 0;
  const latencies = [];

  const byCategory = {
    normal_polite: { total: 0, correct: 0 },
    informal_spelling_variation: { total: 0, correct: 0 },
    angry_aggressive_abusive: { total: 0, correct: 0 },
    two_independent_issues: { total: 0, correct: 0 },
    causal_dependent: { total: 0, correct: 0 },
    negation_historical: { total: 0, correct: 0 },
    out_of_scope: { total: 0, correct: 0 },
    genuinely_ambiguous: { total: 0, correct: 0 },
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
        category: item.category,
        subcategory: item.subcategory,
        text: item.text,
        expected,
        predicted,
        reviewReason: result.reviewReason,
        notes: (result.notes || []).slice(0, 3),
      });
    }

    const catKey = item.category || 'normal_polite';
    if (byCategory[catKey]) {
      byCategory[catKey].total++;
      if (isExact) byCategory[catKey].correct++;
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
  const medianLatency = +latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
  const p95Latency = +latencies[Math.floor(latencies.length * 0.95)].toFixed(2);

  const wilsonCI = wilsonScoreInterval(exactMatches, cases.length);

  const categoryBreakdown = {};
  for (const [k, v] of Object.entries(byCategory)) {
    categoryBreakdown[k] = {
      total: v.total,
      correct: v.correct,
      accuracy: v.total > 0 ? +(v.correct / v.total * 100).toFixed(2) : 0,
    };
  }

  console.log(`=== SYSTEM: ${systemName} ===`);
  console.log(`Exact-Set Accuracy: ${exactMatches}/${cases.length} (${exactAccuracy}%) [95% CI: ${wilsonCI[0]}% - ${wilsonCI[1]}%]`);
  console.log(`Macro F1: ${macroF1}%`);
  console.log(`False Extra Depts: ${totalExtraDepts} (${falseExtraRate}%)`);
  console.log(`Missed Depts: ${totalMissedDepts} (${missedDeptRate}%)`);
  console.log(`Latency: Mean ${meanLatency}ms | Median ${medianLatency}ms | p95 ${p95Latency}ms`);
  console.log('Category Breakdown:');
  for (const [k, v] of Object.entries(categoryBreakdown)) {
    console.log(`  ${k}: ${v.correct}/${v.total} (${v.accuracy}%)`);
  }
  console.log();

  return {
    systemName,
    totalCases: cases.length,
    exactMatches,
    exactAccuracy,
    wilsonCI,
    macroF1,
    deptMetrics,
    categoryBreakdown,
    totalExtraDepts,
    falseExtraRate,
    totalMissedDepts,
    missedDeptRate,
    latency: {
      meanMs: meanLatency,
      medianMs: medianLatency,
      p95Ms: p95Latency,
    },
    failureCount: failures.length,
    failuresSample: failures.slice(0, 10),
  };
}

function evaluateSafetySuite(systemName, predictFn) {
  let flaggedCount = 0;
  let evidencePreservedCount = 0;
  let zeroTruncationVerified = 0;

  for (const item of safetyCases) {
    const res = predictFn(item.text);
    const isFlagged =
      res.needsReview === true &&
      res.reviewReason === 'EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED';
    if (isFlagged) flaggedCount++;

    const allDetected = res.allDetectedDepartments || res.departments || [];
    const expected = [...item.expected].sort();
    const sortedDetected = [...allDetected].sort();
    const hasAllExpected =
      expected.length === sortedDetected.length &&
      expected.every((d, i) => d === sortedDetected[i]);

    if (hasAllExpected) evidencePreservedCount++;

    // Zero truncation: departments auto-assigned is empty array, not truncated to 2
    if (res.departments && res.departments.length === 0) {
      zeroTruncationVerified++;
    }
  }

  const flaggedRate = +(flaggedCount / safetyCases.length * 100).toFixed(2);
  const evidencePreservedRate = +(evidencePreservedCount / safetyCases.length * 100).toFixed(2);
  const zeroTruncationRate = +(zeroTruncationVerified / safetyCases.length * 100).toFixed(2);

  console.log(`=== SAFETY SUITE (50 Cases): ${systemName} ===`);
  console.log(`Human Review Flagged: ${flaggedCount}/${safetyCases.length} (${flaggedRate}%)`);
  console.log(`All 3 Depts Evidence Preserved: ${evidencePreservedCount}/${safetyCases.length} (${evidencePreservedRate}%)`);
  console.log(`Zero Arbitrary Truncation Verified: ${zeroTruncationVerified}/${safetyCases.length} (${zeroTruncationRate}%)\n`);

  return {
    systemName,
    totalCases: safetyCases.length,
    flaggedCount,
    flaggedRate,
    evidencePreservedCount,
    evidencePreservedRate,
    zeroTruncationVerified,
    zeroTruncationRate,
  };
}

console.log('--- EVALUATING PRIMARY BENCHMARK (2,000 CASES) ---\n');

// System 1: Run004 Baseline (V11)
const system1_Run004Baseline = evaluatePrimaryBenchmark(
  'Run004 Baseline (V11 Relation Aware)',
  (text) => classifyV11RelationAware(text, run004Model)
);

// System 2: Run006 Baseline (V11)
const system2_Run006Baseline = evaluatePrimaryBenchmark(
  'Run006 Baseline (V11 Relation Aware)',
  (text) => classifyV11RelationAware(text, run006Model)
);

// System 3: Run006 + V13.4 Engine
const system3_Run006V13_4 = evaluatePrimaryBenchmark(
  'Run006 + V13.4 Engine',
  (text) => classifyV13_4(text, run006Model)
);

// System 4: Run006 + V13.5 Two-Department Policy
const system4_Run006V13_5 = evaluatePrimaryBenchmark(
  'Run006 + V13.5 Two-Department Policy',
  (text) => classifyV13_5(text, run006Model)
);

// System 5: Run004 + V13.5 Two-Department Policy
const system5_Run004V13_5 = evaluatePrimaryBenchmark(
  'Run004 + V13.5 Two-Department Policy',
  (text) => classifyV13_5(text, run004Model)
);

console.log('--- EVALUATING THREE-DEPARTMENT SAFETY SUITE (50 CASES) ---\n');

const safety_System1 = evaluateSafetySuite(
  'Run004 Baseline (V11)',
  (text) => classifyV11RelationAware(text, run004Model)
);

const safety_System3 = evaluateSafetySuite(
  'Run006 + V13.4 Engine',
  (text) => classifyV13_4(text, run006Model)
);

const safety_System4 = evaluateSafetySuite(
  'Run006 + V13.5 Two-Department Policy',
  (text) => classifyV13_5(text, run006Model)
);

const safety_System5 = evaluateSafetySuite(
  'Run004 + V13.5 Two-Department Policy',
  (text) => classifyV13_5(text, run004Model)
);

// Save report
const report = {
  benchmark_name: 'v13_5_holdout_2000',
  timestamp: new Date().toISOString(),
  primary_benchmark: {
    totalCases: cases.length,
    systems: {
      system1_Run004Baseline,
      system2_Run006Baseline,
      system3_Run006V13_4,
      system4_Run006V13_5,
      system5_Run004V13_5,
    },
  },
  safety_suite: {
    totalCases: safetyCases.length,
    systems: {
      safety_System1,
      safety_System3,
      safety_System4,
      safety_System5,
    },
  },
};

const reportPath = path.join(rootDir, 'data/v11/eval_v13_5/v13_5_evaluation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`Comprehensive evaluation report written to: ${reportPath}`);
