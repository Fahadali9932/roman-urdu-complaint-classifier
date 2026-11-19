#!/usr/bin/env node
/**
 * AWAAZ-E-AWAM — Phase V13.3 Independent 1,000-Complaint Evaluator
 * Academic Stakeholder: Fahad (Greenwich University)
 * Zero budget, zero paid APIs, deterministic cryptographic provenance.
 *
 * Runs comprehensive evaluation comparing:
 * 1. Run004 Baseline (V11 Relation-Aware)
 * 2. Run004 + V13.3 Enhanced Policy
 * 3. Run006 Baseline (V11 Relation-Aware)
 * 4. Run006 + V13.3 Enhanced Policy
 *
 * Evaluates on the 1,000-case Untouched Holdout Suite (data/v11/eval_v13_3/v13_3_holdout_1000.jsonl)
 * Outputs results to data/v11/eval_v13_3/v13_3_evaluation_report.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

// Load Model Artifacts
const run004Path = path.join(REPO_ROOT, 'src/models/v11_candidate_model.json');
const run006Path = path.join(REPO_ROOT, 'data/v11/curriculum_runs/run_006/candidate_model.json');

const run004Model = JSON.parse(fs.readFileSync(run004Path, 'utf8'));
const run006Model = fs.existsSync(run006Path) ? JSON.parse(fs.readFileSync(run006Path, 'utf8')) : null;

// Import Engines
import { classifyV11RelationAware } from '../../src/services/v11InferenceAdapter.ts';
import { classifyV13_2 } from '../../src/services/v13_2/v13_2_engine.ts';

const DEPARTMENTS = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

function loadJsonl(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  return lines.filter(Boolean).map((l) => JSON.parse(l));
}

function evaluateSystem(dataset, name, classifyFn) {
  let exactMatches = 0;
  const totalCases = dataset.length;

  const perDept = {};
  for (const dept of DEPARTMENTS) {
    perDept[dept] = { tp: 0, fp: 0, fn: 0 };
  }

  const byComplexity = {
    single_department: { total: 0, correct: 0 },
    dual_department: { total: 0, correct: 0 },
    triple_department: { total: 0, correct: 0 },
    causal_consequence: { total: 0, correct: 0 },
    negation_suppressed: { total: 0, correct: 0 },
    out_of_scope: { total: 0, correct: 0 },
    ambiguous: { total: 0, correct: 0 },
  };

  let totalExtraDepts = 0;
  let totalMissedDepts = 0;
  let totalExpectedDepts = 0;

  const latencies = [];
  const failures = [];

  for (const item of dataset) {
    const text = item.text;
    const expected = [...item.expected].sort();
    totalExpectedDepts += expected.length;

    const start = performance.now();
    const result = classifyFn(text);
    const duration = performance.now() - start;
    latencies.push(duration);

    // If result needsReview and expected is empty (e.g. out of scope or ambiguous),
    // then empty predicted department set matches expected!
    const predicted = [...(result.departments || [])].sort();

    // Exact Match check
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
        needsReview: result.needsReview,
        reviewReason: result.reviewReason,
        notes: result.notes || [],
      });
    }

    // Complexity Breakdown
    const compKey = item.complexity || 'single_department';
    if (byComplexity[compKey]) {
      byComplexity[compKey].total++;
      if (isExact) byComplexity[compKey].correct++;
    }

    // Per Department TP / FP / FN
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

  // Calculate Macro F1, Precision, Recall
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
  const exactAccuracy = +(exactMatches / totalCases * 100).toFixed(2);

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

  return {
    systemName: name,
    totalCases,
    exactMatches,
    exactAccuracy,
    macroF1,
    deptMetrics,
    complexityAccuracy,
    falseExtraRate: +(totalExtraDepts / totalCases * 100).toFixed(2),
    missedDeptRate: +(totalMissedDepts / (totalExpectedDepts || 1) * 100).toFixed(2),
    meanLatencyMs: meanLatency,
    p95LatencyMs: p95Latency,
    failureCount: failures.length,
    failuresSample: failures.slice(0, 15),
  };
}

function run1000Evaluation() {
  const holdoutPath = path.join(REPO_ROOT, 'data/v11/eval_v13_3/v13_3_holdout_1000.jsonl');
  const holdoutData = loadJsonl(holdoutPath);

  console.log('=================================================================================');
  console.log('AWAAZ-E-AWAM — PHASE V13.3 INDEPENDENT 1,000-COMPLAINT BENCHMARK EVALUATION');
  console.log('=================================================================================\n');
  console.log(`Holdout Benchmark Dataset: ${holdoutData.length} cases`);
  console.log(`Path: ${holdoutPath}\n`);

  console.log('Evaluating Run004 Baseline (V11)...');
  const run004Baseline = evaluateSystem(holdoutData, 'Run004 Baseline (V11)', (text) =>
    classifyV11RelationAware(text, run004Model)
  );

  console.log('Evaluating Run004 + V13.3 Candidate...');
  const run004Candidate = evaluateSystem(holdoutData, 'Run004 + V13.3 Policy', (text) =>
    classifyV13_2(text, run004Model)
  );

  let run006Baseline = null;
  let run006Candidate = null;
  if (run006Model) {
    console.log('Evaluating Run006 Baseline (V11)...');
    run006Baseline = evaluateSystem(holdoutData, 'Run006 Baseline (V11)', (text) =>
      classifyV11RelationAware(text, run006Model)
    );

    console.log('Evaluating Run006 + V13.3 Candidate...');
    run006Candidate = evaluateSystem(holdoutData, 'Run006 + V13.3 Policy', (text) =>
      classifyV13_2(text, run006Model)
    );
  }

  const systems = [run004Baseline, run004Candidate, run006Baseline, run006Candidate].filter(Boolean);
  printSummaryTable(systems);

  // Write full evaluation report
  const reportPath = path.join(REPO_ROOT, 'data/v11/eval_v13_3/v13_3_evaluation_report.json');
  const fullReport = {
    benchmark_name: 'v13_3_holdout_1000',
    timestamp: new Date().toISOString(),
    totalCases: holdoutData.length,
    systems: {
      run004Baseline,
      run004Candidate,
      run006Baseline,
      run006Candidate,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`\nComplete JSON evaluation report written to:\n${reportPath}`);
}

function printSummaryTable(systems) {
  console.log('\n----------------------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'System Configuration'.padEnd(26) +
      'Exact Acc'.padEnd(12) +
      'Macro F1'.padEnd(12) +
      '1-Dept'.padEnd(10) +
      '2-Dept'.padEnd(10) +
      '3-Dept'.padEnd(10) +
      'Causal'.padEnd(10) +
      'Negation'.padEnd(10) +
      'OOS/Amb'.padEnd(10) +
      'Latency'
  );
  console.log('----------------------------------------------------------------------------------------------------------------------------------------');
  for (const s of systems) {
    const oosAcc = s.complexityAccuracy['out_of_scope']?.accuracy ?? 0;
    const ambAcc = s.complexityAccuracy['ambiguous']?.accuracy ?? 0;
    const avgOosAmb = ((oosAcc + ambAcc) / 2).toFixed(1);

    console.log(
      s.systemName.padEnd(26) +
        `${s.exactAccuracy}%`.padEnd(12) +
        `${s.macroF1}%`.padEnd(12) +
        `${s.complexityAccuracy['single_department']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['dual_department']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['triple_department']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['causal_consequence']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['negation_suppressed']?.accuracy}%`.padEnd(10) +
        `${avgOosAmb}%`.padEnd(10) +
        `${s.meanLatencyMs}ms`
    );
  }
  console.log('----------------------------------------------------------------------------------------------------------------------------------------');
}

run1000Evaluation();
