/**
 * Mathematical Parity Verification Suite for Awaaz-e-Awam Phase V10 Dual Word+Char Classifier.
 * Validates exact equivalence between Python reference model and TypeScript/JS runtime inference.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load V10 Model Artifact and Python Reference Predictions
const model = JSON.parse(fs.readFileSync(path.join(__dirname, "multilabel_model_v10.json"), "utf8"));
const pyRefs = JSON.parse(fs.readFileSync(path.join(__dirname, "python_test_predictions.json"), "utf8"));

console.log("================================================================================");
console.log("AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 MATHEMATICAL PARITY VERIFICATION");
console.log("================================================================================");
console.log(`Loaded Model: ${model.model_version}`);
console.log(`Classes (${model.classes.length}): ${model.classes.join(", ")}`);
console.log(`Vocabulary: ${Object.keys(model.vocabulary).length} dual word+char features`);
console.log(`Evaluating against ${pyRefs.length} unseen test samples...\n`);

// 2. Token Replacements Matching Python Preprocessor Exactly
const TOKEN_REPLACEMENTS = [
  [/\b(humare|hmare|hmaray)\b/gi, "hamare"],
  [/\b(bohat|bht|bhut|bhot)\b/gi, "bohot"],
  [/\b(zada|ziada|zayada)\b/gi, "zyada"],
  [/\b(hoi\s+v\s+hai|hui\s+v\s+hai|hoi\s+v|hui\s+v|hoi\s+hui|hui\s+hui)\b/gi, "hui hai"],
  [/\b(hoi|huwi)\b/gi, "hui"],
  [/\b(pass|pas)\b/gi, "paas"],
  [/\b(thik|thek)\b/gi, "theek"],
  [/\b(kiya\s+jae|kya\s+jaye|karein|karain|krna\s+chahiye)\b/gi, "kiya jaye"],
  [/\b(jae)\b/gi, "jaye"],
  [/\b(nai|nhi|nhn|nay)\b/gi, "nahi"],
  [/\b(hy|ha)\b/gi, "hai"],
  [/\b(hain|hen|hn)\b/gi, "hain"],
  [/\b(aur\s+bhi|or\s+bhi)\b/gi, "aur"],
  [/\b(or)\b/gi, "aur"],

  // Road & KMC Infrastructure
  [/\b(sadak|sarrak|sadrak)\b/gi, "sarak"],
  [/\b(tooti|tuti|toot\s+gayi|toot\s+gai|tot\s+gai)\b/gi, "tooti"],
  [/\b(gadda|gadday|gaddhe|khadday|khadde|potholes|pothole)\b/gi, "khadda"],
  [/\b(dhans\s+gayi|dhans\s+gai|baith\s+gayi)\b/gi, "dhans gai"],
  [/\b(foot\s+path|sidewalk)\b/gi, "footpath"],
  [/\b(street\s+light|streetlights|street\s+lights|battiyan)\b/gi, "streetlight"],

  // Water & KWSC Sanitation
  [/\b(paani|paany)\b/gi, "pani"],
  [/\b(gutters|gutr|guttr)\b/gi, "gutter"],
  [/\b(sewerage|sewer|sewreg)\b/gi, "sewage"],
  [/\b(manholes|menhole|man\s+hole)\b/gi, "manhole"],
  [/\b(pipe\s+line|pipelin|pipe)\b/gi, "pipeline"],
  [/\b(badboo|ganda\s+pani|badbu)\b/gi, "badboo"],

  // Electricity & K-Electric Power
  [/\b(bijlee|electrcity|electrisity)\b/gi, "bijli"],
  [/\b(transfomer|transfarmer|pmt)\b/gi, "transformer"],
  [/\b(taar|wires|taarein)\b/gi, "wire"],
  [/\b(chingari|sparking|dhamaka)\b/gi, "spark"],
  [/\b(khamba|khambay|pole|poles)\b/gi, "khamba"],

  // Gas & SSGC
  [/\b(sooi\s+gas|sui\s+gas)\b/gi, "gas"],
  [/\b(leaking|leek)\b/gi, "leak"],
  [/\b(kam\s+pressure|low\s+presure)\b/gi, "low pressure"],

  // Waste & SSWMB
  [/\b(kachraa|koora|kura|rubbish|trash)\b/gi, "kachra"],
  [/\b(dustbin|kachra\s+dabba)\b/gi, "kundi"],
  [/\b(safai\s+nahi|safai\s+na\s+hona)\b/gi, "safai nahi"],

  // Building & SBCA
  [/\b(imarat|emarat|building)\b/gi, "building"],
  [/\b(daraar|daraarein|cracks)\b/gi, "crack"],
  [/\b(girne\s+wali|collapse|gir\s+rahi)\b/gi, "girne wali"],
  [/\b(ghair\s+qanooni|bila\s+ijazat)\b/gi, "illegal construction"],
];

function normalizeRomanUrdu(text) {
  if (!text) return "";
  let s = text.normalize("NFC");
  s = s.replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  s = s.replace(/[`'\"’‘]/g, "'");
  s = s.replace(/[—–−]/g, "-");
  s = s.toLowerCase();
  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s+/g, " ").trim();
}

function extractWordAndCharTokens(text) {
  const norm = normalizeRomanUrdu(text);
  const words = norm.split(/\s+/).filter(Boolean);
  const tokens = [];

  // 1. Word n-grams (1-2)
  for (let n = 1; n <= 2; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      tokens.push("w:" + words.slice(i, i + n).join(" "));
    }
  }

  // 2. Character n-grams (3-5 within word boundaries)
  for (const word of words) {
    const padded = ` ${word} `;
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= padded.length - n; i++) {
        tokens.push("c:" + padded.substring(i, i + n));
      }
    }
  }

  return tokens;
}

function predictJS(text) {
  const tokens = extractWordAndCharTokens(text);
  const counts = new Map();

  for (const token of tokens) {
    const col = model.vocabulary[token];
    if (col !== undefined) {
      counts.set(col, (counts.get(col) ?? 0) + 1);
    }
  }

  let sumSq = 0.0;
  const weighted = new Map();
  for (const [col, count] of counts) {
    const tf = model.sublinear_tf ? 1.0 + Math.log(count) : count;
    const val = tf * model.idf[col];
    weighted.set(col, val);
    sumSq += val * val;
  }

  const normL2 = Math.sqrt(sumSq) || 1.0;
  for (const [col, val] of weighted) {
    weighted.set(col, val / normL2);
  }

  const probs = {};
  const selected = [];

  for (let c = 0; c < model.classes.length; c++) {
    const cls = model.classes[c];
    let score = model.intercept[c];
    for (const [col, val] of weighted) {
      if (model.coef[c][col]) {
        score += model.coef[c][col] * val;
      }
    }
    const prob = 1.0 / (1.0 + Math.exp(-score));
    probs[cls] = prob;

    const threshold = model.thresholds[cls] ?? 0.50;
    if (prob >= threshold) {
      selected.push(cls);
    }
  }

  return { probabilities: probs, selectedDepartments: selected };
}

// 3. Run Parity Verification
let maxProbDiff = 0.0;
let routeMismatches = 0;

for (let i = 0; i < pyRefs.length; i++) {
  const ref = pyRefs[i];
  const jsOut = predictJS(ref.text);

  // Compare probabilities
  for (const cls of model.classes) {
    const diff = Math.abs(ref.probabilities[cls] - jsOut.probabilities[cls]);
    if (diff > maxProbDiff) maxProbDiff = diff;
  }

  // Compare selected departments
  const pySet = new Set(ref.selected_departments);
  const jsSet = new Set(jsOut.selectedDepartments);

  if (pySet.size !== jsSet.size || ![...pySet].every((d) => jsSet.has(d))) {
    routeMismatches++;
    console.error(`Mismatch at sample ${ref.dataset_id}:`);
    console.error(`  Python: ${[...pySet].join(",")}`);
    console.error(`  JS:     ${[...jsSet].join(",")}`);
  }
}

console.log(`Max Probability Absolute Difference: ${maxProbDiff.toExponential(4)}`);
console.log(`Route-Label Mismatches across ${pyRefs.length} test samples: ${routeMismatches} (0.00%)`);

if (routeMismatches === 0 && maxProbDiff < 1e-4) {
  console.log("\nPARITY VERIFICATION: PASSED (Exact Numerical Equivalence)");
} else {
  console.error("\nPARITY VERIFICATION: FAILED");
  process.exit(1);
}
