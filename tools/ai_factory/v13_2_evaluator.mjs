#!/usr/bin/env node
/**
 * AWAAZ-E-AWAM — Phase V13.2 Comparative Benchmark Evaluator
 * Runs comprehensive evaluation comparing:
 * - Run004 Frozen Baseline (V11)
 * - Run004 + V13.2 Candidate Engine
 * - Run006 + V13.2 Candidate Engine
 *
 * Evaluates both:
 * 1. 200-case Development Suite
 * 2. 500-case Untouched Holdout Suite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

// Load Model Artifacts
const run004Path = path.join(REPO_ROOT, 'src/models/v11_candidate_model.json');
const run006Path = path.join(REPO_ROOT, 'data/v11/curriculum_runs/run_006/model_artifact.json');

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
  let totalCases = dataset.length;

  const perDept = {};
  for (const dept of DEPARTMENTS) {
    perDept[dept] = { tp: 0, fp: 0, fn: 0 };
  }

  const byComplexity = {
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
        category: item.category,
        text: item.text,
        expected,
        predicted,
        notes: result.notes || [],
      });
    }

    // Complexity Breakdown
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

    // Per Department TP / FP / FN
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

  // Calculate Macro F1
  let sumF1 = 0;
  const deptMetrics = {};
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
    failuresSample: failures.slice(0, 10),
  };
}

function runEvaluation() {
  const devPath = path.join(REPO_ROOT, 'data/v11/eval_v13_2/v13_2_dev_suite_200.jsonl');
  const holdoutPath = path.join(REPO_ROOT, 'data/v11/eval_v13_2/v13_2_holdout_500.jsonl');

  const devData = loadJsonl(devPath);
  const holdoutData = loadJsonl(holdoutPath);

  console.log('================================================================');
  console.log('AWAAZ-E-AWAM — PHASE V13.2 COMPREHENSIVE BENCHMARK EVALUATION');
  console.log('================================================================\n');

  console.log(`Development Suite: ${devData.length} cases`);
  console.log(`Holdout Suite:     ${holdoutData.length} cases\n`);

  // Evaluation on Dev Suite
  console.log('>>> EVALUATING ON 200-CASE DEVELOPMENT SUITE <<<');
  const devRun004Baseline = evaluateSystem(devData, 'Run004 Baseline (V11)', (text) =>
    classifyV11RelationAware(text, run004Model)
  );
  const devRun004Candidate = evaluateSystem(devData, 'Run004 + V13.2 Candidate', (text) =>
    classifyV13_2(text, run004Model)
  );

  let devRun006Candidate = null;
  if (run006Model) {
    devRun006Candidate = evaluateSystem(devData, 'Run006 + V13.2 Candidate', (text) =>
      classifyV13_2(text, run006Model)
    );
  }

  printSummaryTable([devRun004Baseline, devRun004Candidate, devRun006Candidate].filter(Boolean));

  // Evaluation on Holdout Suite
  console.log('\n>>> EVALUATING ON 500-CASE UNTOUCHED HOLDOUT SUITE <<<');
  const holdoutRun004Baseline = evaluateSystem(holdoutData, 'Run004 Baseline (V11)', (text) =>
    classifyV11RelationAware(text, run004Model)
  );
  const holdoutRun004Candidate = evaluateSystem(holdoutData, 'Run004 + V13.2 Candidate', (text) =>
    classifyV13_2(text, run004Model)
  );

  let holdoutRun006Candidate = null;
  if (run006Model) {
    holdoutRun006Candidate = evaluateSystem(holdoutData, 'Run006 + V13.2 Candidate', (text) =>
      classifyV13_2(text, run006Model)
    );
  }

  printSummaryTable([holdoutRun004Baseline, holdoutRun004Candidate, holdoutRun006Candidate].filter(Boolean));

  // Save report JSON
  const reportPath = path.join(REPO_ROOT, 'data/v11/eval_v13_2/v13_2_evaluation_report.json');
  const fullReport = {
    timestamp: new Date().toISOString(),
    devEvaluation: {
      run004Baseline: devRun004Baseline,
      run004Candidate: devRun004Candidate,
      run006Candidate: devRun006Candidate,
    },
    holdoutEvaluation: {
      run004Baseline: holdoutRun004Baseline,
      run004Candidate: holdoutRun004Candidate,
      run006Candidate: holdoutRun006Candidate,
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`\nDetailed report written to: ${reportPath}`);
}

function printSummaryTable(systems) {
  console.log('-------------------------------------------------------------------------------------------------------');
  console.log(
    'System Name'.padEnd(28) +
      'Exact Acc'.padEnd(12) +
      'Macro F1'.padEnd(12) +
      '1-Dept'.padEnd(10) +
      '2-Dept'.padEnd(10) +
      '3-Dept'.padEnd(10) +
      'Causal'.padEnd(10) +
      'Latency'
  );
  console.log('-------------------------------------------------------------------------------------------------------');
  for (const s of systems) {
    console.log(
      s.systemName.padEnd(28) +
        `${s.exactAccuracy}%`.padEnd(12) +
        `${s.macroF1}%`.padEnd(12) +
        `${s.complexityAccuracy['1_dept']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['2_dept']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['3_dept']?.accuracy}%`.padEnd(10) +
        `${s.complexityAccuracy['causal']?.accuracy}%`.padEnd(10) +
        `${s.meanLatencyMs}ms`
    );
  }
  console.log('-------------------------------------------------------------------------------------------------------');
}

runEvaluation();
