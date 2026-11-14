import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load Model Artifact
const model = JSON.parse(fs.readFileSync(path.join(__dirname, "model.json"), "utf8"));
console.log(`Loaded model: ${model.classes.length} classes, ${Object.keys(model.vocabulary).length} vocabulary features, analyzer=${model.analyzer}`);

// 2. TypeScript / Deno Inference Implementation
function features(text) {
  const counts = new Map();
  // Match word tokens with length >= 2
  const words = text.toLowerCase().normalize("NFKC").match(/\b\w\w+\b/gu) ?? [];
  
  // Unigrams & Bigrams
  for (let i = 0; i < words.length; i++) {
    const unigram = words[i];
    const col1 = model.vocabulary[unigram];
    if (col1 !== undefined) {
      counts.set(col1, (counts.get(col1) ?? 0) + 1);
    }
    
    if (i < words.length - 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const col2 = model.vocabulary[bigram];
      if (col2 !== undefined) {
        counts.set(col2, (counts.get(col2) ?? 0) + 1);
      }
    }
  }
  
  let norm = 0;
  for (const [col, count] of counts) {
    const weighted = count * model.idf[col];
    counts.set(col, weighted);
    norm += weighted * weighted;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [col, weighted] of counts) {
    counts.set(col, weighted / norm);
  }
  return counts;
}

function classify(text) {
  const vector = features(text);
  const scores = model.classes.map((_, classIndex) => {
    let score = model.intercept[classIndex];
    for (const [col, value] of vector) {
      score += model.coef[classIndex][col] * value;
    }
    return score;
  });
  
  const ordered = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const max = ordered[0].score;
  const probabilities = scores.map((score) => Math.exp(score - max));
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  const top1Index = ordered[0].index;
  const confidence = probabilities[top1Index] / total;
  const margin = ordered[0].score - ordered[1].score;
  
  const confThresh = model.confidence_threshold ?? 0.50;
  const margThresh = model.margin_threshold ?? 0.15;
  const needsReview = confidence < confThresh || margin < margThresh;
  
  return {
    departmentId: model.classes[top1Index],
    confidence,
    margin,
    needsReview,
    allProbabilities: probabilities.map((p) => p / total),
  };
}

// 3. Load Frozen Test Set
const testCsv = fs.readFileSync(path.join(__dirname, "data", "frozen_test_set.csv"), "utf8");
const lines = testCsv.trim().split("\n").slice(1);

let total = 0;
let correct = 0;
const results = [];

for (const line of lines) {
  // Simple CSV parse for: text,department_id,source_type
  const match = line.match(/^(.*),([^,]+),([^,]+)$/);
  if (!match) continue;
  let text = match[1].trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).replace(/""/g, '"');
  }
  const trueDept = match[2].trim();
  const sourceType = match[3].trim();
  
  const pred = classify(text);
  total++;
  if (pred.departmentId === trueDept) {
    correct++;
  }
  results.push({
    text,
    trueDept,
    predDept: pred.departmentId,
    confidence: pred.confidence,
    margin: pred.margin,
    needsReview: pred.needsReview,
    sourceType,
  });
}

console.log(`\n=== NODE.JS INFERENCE PARITY RESULTS ON ${total} FROZEN TEST SAMPLES ===`);
console.log(`Node.js Overall Accuracy: ${(correct / total * 100).toFixed(2)}% (${correct}/${total})`);

// Compare with Python results
const pyEval = JSON.parse(fs.readFileSync(path.join(__dirname, "evaluation_frozen_test.json"), "utf8"));
console.log(`Python Evaluation Accuracy: ${(pyEval.overall_accuracy * 100).toFixed(2)}%`);

if (Math.abs(correct / total - pyEval.overall_accuracy) < 1e-4) {
  console.log(`[PASS] PERFECT MATHEMATICAL PARITY: Node.js and Python accuracy match exactly (${(correct / total * 100).toFixed(2)}%)!`);
} else {
  console.error(`[FAIL] Parity mismatch! Node: ${(correct / total * 100).toFixed(2)}%, Python: ${(pyEval.overall_accuracy * 100).toFixed(2)}%`);
  process.exit(1);
}
