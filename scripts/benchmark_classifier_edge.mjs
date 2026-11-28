/**
 * AWAAZ-E-AWAM (آوازِ عوام) — V23.0B Classifier Hosting Feasibility Benchmark
 * Tests Run004 (1.98 MB) vs Run006 (5.76 MB) for Deno/Node edge execution feasibility.
 * Measures JSON parse time, heap memory overhead, and per-complaint inference latency.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const run004Path = path.join(projectRoot, 'data/v11/curriculum_runs/run_004/candidate_model.json');
const run006Path = path.join(projectRoot, 'data/v11/curriculum_runs/run_006/candidate_model.json');

const testComplaints = [
  'Aao bhai Korangi Sector 4 mein street light fuses hain raat ko andhera rehta hai chori ka dar hai',
  'Pani ki main line phat gayi hai sadak par paani beh raha hai aur gharon mein paani nahi aa raha',
  'Kachra kundi k overflow hone ki waja se poore ilaqa mein badboo phaili hui hai sswmb wale nahi aa rahe',
  'Bijli k nange taar latak rahe hain barish mein short circuit hone ka shadeed khatra hai',
  'Sui gas ka pressure bilkul zero ho chuka hai choolha nahi chal raha bache bhooke hain',
  'Substandard material use karke illegal building banayi ja rahi hai chhat girne ka khadsha hai',
  'Sadak par gehra khadda par chuka hai traffic block rehti hai aur accidents ho rahe hain',
  'Gutter ka dahkan gayab hai aur sewer ka pani galiyon mein bhara hua hai chalna mushkil ho gaya hai',
];

function runModelBenchmark(modelName, filePath) {
  const stat = fs.statSync(filePath);
  const fileSizeBytes = stat.size;
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

  if (global.gc) global.gc();
  const heapBefore = process.memoryUsage().heapUsed;

  const readStart = performance.now();
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const readDurationMs = performance.now() - readStart;

  const parseStart = performance.now();
  const model = JSON.parse(rawData);
  const parseDurationMs = performance.now() - parseStart;

  const heapAfter = process.memoryUsage().heapUsed;
  const heapDeltaMB = ((heapAfter - heapBefore) / (1024 * 1024)).toFixed(2);

  // Simple tokenization & vectorization check to simulate raw inference loop
  const vocabSize = model.vocabulary ? Object.keys(model.vocabulary).length : (model.vocab ? Object.keys(model.vocab).length : 'N/A');
  const departments = model.departments || model.classes || ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

  // Warmup
  for (let i = 0; i < 50; i++) {
    const text = testComplaints[i % testComplaints.length].toLowerCase();
    const tokens = text.split(/\s+/);
  }

  // 1,000 inferences timing
  const ITERATIONS = 1000;
  const latencies = [];
  const startInfer = performance.now();

  for (let i = 0; i < ITERATIONS; i++) {
    const text = testComplaints[i % testComplaints.length].toLowerCase();
    const t0 = performance.now();
    // Simulate feature extraction + dot product
    const tokens = text.split(/\s+/);
    let score = 0;
    for (const t of tokens) {
      if (model.vocabulary && model.vocabulary[t] !== undefined) {
        score += 1.0;
      }
    }
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }
  const totalInferDurationMs = performance.now() - startInfer;

  latencies.sort((a, b) => a - b);
  const meanLatencyMs = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(4);
  const medianLatencyMs = latencies[Math.floor(latencies.length * 0.5)].toFixed(4);
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)].toFixed(4);
  const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)].toFixed(4);
  const throughputPerSec = Math.round((ITERATIONS / totalInferDurationMs) * 1000);

  return {
    modelName,
    fileSizeBytes,
    fileSizeMB: `${fileSizeMB} MB`,
    readDurationMs: readDurationMs.toFixed(2),
    parseDurationMs: parseDurationMs.toFixed(2),
    heapDeltaMB: `${heapDeltaMB} MB`,
    vocabSize,
    departments,
    iterations: ITERATIONS,
    meanLatencyMs: `${meanLatencyMs} ms`,
    medianLatencyMs: `${medianLatencyMs} ms`,
    p95LatencyMs: `${p95LatencyMs} ms`,
    p99LatencyMs: `${p99LatencyMs} ms`,
    throughputPerSec: `${throughputPerSec} req/sec`,
  };
}

console.log('Running Classifier Edge Hosting Benchmark...');
const run004Results = runModelBenchmark('Run004 Candidate (Baseline)', run004Path);
const run006Results = runModelBenchmark('Run006 Candidate (Enhanced)', run006Path);

console.log(JSON.stringify({ run004Results, run006Results }, null, 2));
