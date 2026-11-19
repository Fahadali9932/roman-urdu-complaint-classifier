#!/usr/bin/env node
/**
 * AWAAZ-E-AWAM — Phase V13.1 Offline Pipeline Evaluator
 * Evaluates the 2,000-complaint adversarial benchmark using the real production V11 engine.
 * Compares Run004 (active runtime model) vs Run006 (unpromoted candidate).
 * Zero budget, local execution only.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  assessComplaintDraft,
  resolveComplaintClarification,
  classifyV11RelationAware,
} from '../../supabase/functions/_shared/v11-engine.ts';

const DEPARTMENTS = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
}

function wilsonCI(k, n, z = 1.95996) {
  if (n === 0) return { center: 0, low: 0, high: 0 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * (n * n)))) / denom;
  return {
    center: Math.round(center * 10000) / 100,
    low: Math.max(0, Math.round((center - margin) * 10000) / 100),
    high: Math.min(100, Math.round((center + margin) * 10000) / 100),
  };
}

function computePercentiles(arr) {
  if (arr.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    p50: Math.round(p50 * 100) / 100,
    p95: Math.round(p99 * 100) / 100, // or p95
    p99: Math.round(p99 * 100) / 100,
  };
}

function evaluateModel(modelName, modelArtifact, records) {
  console.log(`\n===============================================================`);
  console.log(`Evaluating Model: ${modelName} on ${records.length} records`);
  console.log(`===============================================================`);

  const latencies = [];
  const predictions = [];
  const failures = [];

  let fullSetExactMatches = 0;
  let departmentExactMatches = 0;
  let autoRoutedCount = 0;
  let autoRoutedExactMatches = 0;
  let clarificationTriggers = 0;
  let clarificationCorrect = 0;
  let humanReviewCount = 0;
  let falseExtraCount = 0;
  let missedDeptCount = 0;

  // Per-agency confusion accumulators
  const agencyStats = {};
  for (const dept of DEPARTMENTS) {
    agencyStats[dept] = { tp: 0, fp: 0, fn: 0, tn: 0 };
  }

  // Segment accumulators
  const faultCounts = {};
  const familyCounts = {};
  const lengthBracketCounts = {};

  const startTime = performance.now();

  for (let idx = 0; idx < records.length; idx++) {
    const r = records[idx];
    const expectedDepts = [...(r.expected_departments || [])].sort();
    const expectedBehavior = r.expected_behavior || 'route';
    const family = r.difficulty_family || 'UNKNOWN';
    const bracket = r.length_bracket || 'UNKNOWN';
    const faults = r.independent_faults_count !== undefined ? r.independent_faults_count : expectedDepts.length;

    // Track segments totals
    if (!faultCounts[faults]) faultCounts[faults] = { total: 0, exact: 0, autoExact: 0, autoTotal: 0 };
    faultCounts[faults].total++;

    if (!familyCounts[family]) familyCounts[family] = { total: 0, exact: 0, autoExact: 0, autoTotal: 0 };
    familyCounts[family].total++;

    if (!lengthBracketCounts[bracket]) lengthBracketCounts[bracket] = { total: 0, exact: 0, autoExact: 0, autoTotal: 0 };
    lengthBracketCounts[bracket].total++;

    // Measure Inference Latency
    const t0 = performance.now();
    const understanding = assessComplaintDraft(r.text, modelArtifact);
    const elapsed = performance.now() - t0;
    latencies.push(elapsed);

    const predState = understanding.state; // 'ready', 'ask', 'review'
    let predDepts = [];
    let isAutoRouted = false;
    let needsReview = true;
    let reviewReason = null;

    if (predState === 'ready') {
      predDepts = [...understanding.departments].sort();
      isAutoRouted = !understanding.prediction.needsReview;
      needsReview = understanding.prediction.needsReview;
      reviewReason = understanding.prediction.reviewReason ?? null;
    } else if (predState === 'ask') {
      predDepts = [...understanding.prediction.departments].sort();
      needsReview = true;
      reviewReason = 'UNRESOLVED_AMBIGUITY';
      clarificationTriggers++;
      if (expectedBehavior === 'ask') {
        clarificationCorrect++;
      }
    } else {
      // review
      predDepts = [...understanding.prediction.departments].sort();
      needsReview = true;
      reviewReason = understanding.reason || understanding.prediction.reviewReason || 'REQUIRES_ADMIN_REVIEW';
      humanReviewCount++;
    }

    if (isAutoRouted) {
      autoRoutedCount++;
    }

    // Exact match evaluation:
    // 1. Department match: does predDepts exactly match expectedDepts?
    const deptMatch = JSON.stringify(predDepts) === JSON.stringify(expectedDepts);
    if (deptMatch) {
      departmentExactMatches++;
    }

    // 2. Full pipeline exact match:
    // For route: deptMatch AND predState === 'ready'
    // For ask: predState === 'ask' (and if question specified, question matches)
    // For review: (predState === 'review' || predDepts.length === 0)
    let fullExact = false;
    if (expectedBehavior === 'route') {
      fullExact = deptMatch && predState === 'ready';
    } else if (expectedBehavior === 'ask') {
      fullExact = predState === 'ask';
    } else if (expectedBehavior === 'review') {
      fullExact = predState === 'review' || predDepts.length === 0;
    }

    if (fullExact) {
      fullSetExactMatches++;
      faultCounts[faults].exact++;
      familyCounts[family].exact++;
      lengthBracketCounts[bracket].exact++;
    }

    if (isAutoRouted) {
      if (deptMatch) {
        autoRoutedExactMatches++;
        faultCounts[faults].autoExact++;
        familyCounts[family].autoExact++;
        lengthBracketCounts[bracket].autoExact++;
      }
      faultCounts[faults].autoTotal++;
      familyCounts[family].autoTotal++;
      lengthBracketCounts[bracket].autoTotal++;
    }

    // False extra vs missed depts
    const extraDepts = predDepts.filter(d => !expectedDepts.includes(d));
    const missedDepts = expectedDepts.filter(d => !predDepts.includes(d));
    if (extraDepts.length > 0) falseExtraCount++;
    if (missedDepts.length > 0) missedDeptCount++;

    // Agency stats
    for (const dept of DEPARTMENTS) {
      const expHas = expectedDepts.includes(dept);
      const predHas = predDepts.includes(dept);
      if (expHas && predHas) agencyStats[dept].tp++;
      else if (!expHas && predHas) agencyStats[dept].fp++;
      else if (expHas && !predHas) agencyStats[dept].fn++;
      else agencyStats[dept].tn++;
    }

    // Prediction record
    const predRecord = {
      complaint_id: r.complaint_id,
      expected_departments: expectedDepts,
      predicted_departments: predDepts,
      expected_behavior: expectedBehavior,
      predicted_state: predState,
      is_auto_routed: isAutoRouted,
      needs_review: needsReview,
      review_reason: reviewReason,
      full_exact_match: fullExact,
      department_match: deptMatch,
      latency_ms: Math.round(elapsed * 100) / 100,
      difficulty_family: family,
      length_bracket: bracket,
      word_count: r.word_count,
    };
    predictions.push(predRecord);

    if (!fullExact) {
      failures.push({
        ...predRecord,
        text_preview: r.text.slice(0, 150) + '...',
        extra_departments: extraDepts,
        missed_departments: missedDepts,
        provenance: r.provenance,
      });
    }

    if ((idx + 1) % 500 === 0) {
      console.log(`  Processed ${idx + 1} / ${records.length} records...`);
    }
  }

  const totalTime = performance.now() - startTime;
  console.log(`Completed evaluation in ${(totalTime / 1000).toFixed(2)}s`);

  // Compute Agency Metrics
  const agencyMetrics = {};
  let macroP = 0, macroR = 0, macroF1 = 0;
  let totalTP = 0, totalFP = 0, totalFN = 0;

  for (const dept of DEPARTMENTS) {
    const s = agencyStats[dept];
    const p = s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : 0;
    const r = s.tp + s.fn > 0 ? s.tp / (s.tp + s.fn) : 0;
    const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
    agencyMetrics[dept] = {
      tp: s.tp, fp: s.fp, fn: s.fn, tn: s.tn,
      precision: Math.round(p * 10000) / 100,
      recall: Math.round(r * 10000) / 100,
      f1: Math.round(f1 * 10000) / 100,
    };
    macroP += p;
    macroR += r;
    macroF1 += f1;
    totalTP += s.tp;
    totalFP += s.fp;
    totalFN += s.fn;
  }
  macroP = Math.round((macroP / DEPARTMENTS.length) * 10000) / 100;
  macroR = Math.round((macroR / DEPARTMENTS.length) * 10000) / 100;
  macroF1 = Math.round((macroF1 / DEPARTMENTS.length) * 10000) / 100;

  const microP = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const microR = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const microF1 = microP + microR > 0 ? (2 * microP * microR) / (microP + microR) : 0;

  // Latency percentiles
  const latencySummary = computePercentiles(latencies);

  // Overall accuracy
  const n = records.length;
  const fullAccuracy = Math.round((fullSetExactMatches / n) * 10000) / 100;
  const deptAccuracy = Math.round((departmentExactMatches / n) * 10000) / 100;
  const autoRoutingAccuracy = autoRoutedCount > 0 ? Math.round((autoRoutedExactMatches / autoRoutedCount) * 10000) / 100 : 0;
  const autoRoutingCoverage = Math.round((autoRoutedCount / n) * 10000) / 100;
  const humanReviewRate = Math.round((humanReviewCount / n) * 10000) / 100;
  const clarificationRate = Math.round((clarificationTriggers / n) * 10000) / 100;

  const fullAccCI = wilsonCI(fullSetExactMatches, n);
  const autoAccCI = wilsonCI(autoRoutedExactMatches, autoRoutedCount);
  const autoCovCI = wilsonCI(autoRoutedCount, n);

  const summary = {
    model_name: modelName,
    total_eval_samples: n,
    full_set_exact_matches: fullSetExactMatches,
    full_set_exact_accuracy_pct: fullAccuracy,
    full_set_exact_accuracy_ci95: fullAccCI,
    department_exact_matches: departmentExactMatches,
    department_exact_accuracy_pct: deptAccuracy,
    auto_routed_count: autoRoutedCount,
    auto_routing_coverage_pct: autoRoutingCoverage,
    auto_routing_coverage_ci95: autoCovCI,
    auto_routed_exact_matches: autoRoutedExactMatches,
    selective_auto_routing_accuracy_pct: autoRoutingAccuracy,
    selective_auto_routing_accuracy_ci95: autoAccCI,
    clarification_triggers: clarificationTriggers,
    clarification_rate_pct: clarificationRate,
    clarification_correct: clarificationCorrect,
    human_review_count: humanReviewCount,
    human_review_rate_pct: humanReviewRate,
    false_extra_count: falseExtraCount,
    missed_department_count: missedDeptCount,
    macro_precision: macroP,
    macro_recall: macroR,
    macro_f1: macroF1,
    micro_precision: Math.round(microP * 10000) / 100,
    micro_recall: Math.round(microR * 10000) / 100,
    micro_f1: Math.round(microF1 * 10000) / 100,
    agency_metrics: agencyMetrics,
    latency_ms: latencySummary,
    fault_breakdown: faultCounts,
    family_breakdown: familyCounts,
    bracket_breakdown: lengthBracketCounts,
  };

  return { summary, predictions, failures };
}

async function main() {
  const rootDir = process.cwd();
  const benchmarkPath = path.join(rootDir, 'data/v11/eval_v13_1/adversarial_benchmark_2000.jsonl');
  const run004ModelPath = path.join(rootDir, 'supabase/functions/submit-classified-complaint/v11_model.json');
  const run006ModelPath = path.join(rootDir, 'data/v11/curriculum_runs/run_006/candidate_model.json');

  console.log(`[V13.1 Evaluator] Initializing...`);
  console.log(`Benchmark path: ${benchmarkPath}`);
  console.log(`Run004 Model: ${run004ModelPath} (SHA: ${sha256File(run004ModelPath)})`);
  console.log(`Run006 Model: ${run006ModelPath} (SHA: ${sha256File(run006ModelPath)})`);

  const records = fs.readFileSync(benchmarkPath, 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  console.log(`Loaded ${records.length} evaluation complaints.`);

  const run004Artifact = JSON.parse(fs.readFileSync(run004ModelPath, 'utf8'));
  const run006Artifact = JSON.parse(fs.readFileSync(run006ModelPath, 'utf8'));

  // 1. Evaluate Run004 (Active Model)
  const eval004 = evaluateModel('Run004 (Active Runtime Model)', run004Artifact, records);

  // 2. Evaluate Run006 (Candidate Model - Read Only)
  const eval006 = evaluateModel('Run006 (Unpromoted Candidate)', run006Artifact, records);

  // Save Outputs
  const outDir = path.join(rootDir, 'data/v11/eval_v13_1');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'predictions_run_004.jsonl'),
    eval004.predictions.map(p => JSON.stringify(p)).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(outDir, 'failures_run_004.jsonl'),
    eval004.failures.map(p => JSON.stringify(p)).join('\n') + '\n'
  );

  fs.writeFileSync(
    path.join(outDir, 'predictions_run_006.jsonl'),
    eval006.predictions.map(p => JSON.stringify(p)).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(outDir, 'failures_run_006.jsonl'),
    eval006.failures.map(p => JSON.stringify(p)).join('\n') + '\n'
  );

  const fullReport = {
    eval_timestamp: new Date().toISOString(),
    benchmark_size: records.length,
    run004_sha256: sha256File(run004ModelPath),
    run006_sha256: sha256File(run006ModelPath),
    run004_results: eval004.summary,
    run006_results: eval006.summary,
  };

  fs.writeFileSync(
    path.join(outDir, 'v13_1_evaluation_summary.json'),
    JSON.stringify(fullReport, null, 2)
  );

  console.log(`\n===============================================================`);
  console.log(`EVALUATION SUMMARY RESULTS`);
  console.log(`===============================================================`);
  console.log(`\n--- RUN 004 (Active Runtime) ---`);
  console.log(`Full-Set Exact Accuracy: ${eval004.summary.full_set_exact_accuracy_pct}% [95% CI: ${eval004.summary.full_set_exact_accuracy_ci95.low}% - ${eval004.summary.full_set_exact_accuracy_ci95.high}%]`);
  console.log(`Department Exact Accuracy: ${eval004.summary.department_exact_accuracy_pct}%`);
  console.log(`Selective Auto-Routing Accuracy: ${eval004.summary.selective_auto_routing_accuracy_pct}% (Coverage: ${eval004.summary.auto_routing_coverage_pct}%)`);
  console.log(`Clarification Rate: ${eval004.summary.clarification_rate_pct}%`);
  console.log(`Human Review Rate: ${eval004.summary.human_review_rate_pct}%`);
  console.log(`Macro F1: ${eval004.summary.macro_f1}% | Micro F1: ${eval004.summary.micro_f1}%`);
  console.log(`Mean Latency: ${eval004.summary.latency_ms.mean}ms (p95: ${eval004.summary.latency_ms.p95}ms)`);

  console.log(`\n--- RUN 006 (Candidate) ---`);
  console.log(`Full-Set Exact Accuracy: ${eval006.summary.full_set_exact_accuracy_pct}% [95% CI: ${eval006.summary.full_set_exact_accuracy_ci95.low}% - ${eval006.summary.full_set_exact_accuracy_ci95.high}%]`);
  console.log(`Department Exact Accuracy: ${eval006.summary.department_exact_accuracy_pct}%`);
  console.log(`Selective Auto-Routing Accuracy: ${eval006.summary.selective_auto_routing_accuracy_pct}% (Coverage: ${eval006.summary.auto_routing_coverage_pct}%)`);
  console.log(`Clarification Rate: ${eval006.summary.clarification_rate_pct}%`);
  console.log(`Human Review Rate: ${eval006.summary.human_review_rate_pct}%`);
  console.log(`Macro F1: ${eval006.summary.macro_f1}% | Micro F1: ${eval006.summary.micro_f1}%`);
  console.log(`Mean Latency: ${eval006.summary.latency_ms.mean}ms (p95: ${eval006.summary.latency_ms.p95}ms)`);

  console.log(`\nResults written to data/v11/eval_v13_1/`);
}

main().catch(err => {
  console.error('Fatal error during evaluation:', err);
  process.exit(1);
});
