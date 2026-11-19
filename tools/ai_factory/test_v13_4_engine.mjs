import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Load run006 model
const run006Path = path.join(rootDir, 'data/v11/curriculum_runs/run_006/candidate_model.json');
const run006Model = JSON.parse(fs.readFileSync(run006Path, 'utf8'));

// Import v13_4_engine
const engineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_4/v13_4_engine.ts')).href;
const { classifyV13_4 } = await import(engineUrl);

// Load holdout cases
const holdoutPath = path.join(rootDir, 'data/v11/eval_v13_3/v13_3_holdout_1000.jsonl');
const lines = fs.readFileSync(holdoutPath, 'utf8').trim().split('\n');
const cases = lines.map(l => JSON.parse(l));
const causalCases = cases.filter(c => c.complexity === 'causal_consequence');

console.log(`Auditing ${causalCases.length} causal consequence cases with Run006 + V13.4 engine...`);

let correct = 0;
const failures = [];

for (const c of causalCases) {
  const result = classifyV13_4(c.text, run006Model);
  const pred = [...(result.departments || [])].sort();
  const exp = [...c.expected].sort();
  const isMatch = pred.length === exp.length && pred.every((v, i) => v === exp[i]);

  if (isMatch) {
    correct++;
  } else {
    failures.push({
      id: c.id,
      text: c.text,
      exp,
      pred,
      notes: result.notes,
      records: result.decisionRecords.filter(r => r.status === 'SELECTED' || r.status === 'SUPPRESSED'),
    });
  }
}

console.log(`\n=== V13.4 CAUSAL ACCURACY ON V13.3 HOLDOUT ===`);
console.log(`Accuracy: ${correct}/${causalCases.length} (${(correct/causalCases.length*100).toFixed(2)}%)`);
console.log(`(Previous V13.3 was 11/50 = 22.00%)\n`);

if (failures.length > 0) {
  console.log(`Remaining Failures: ${failures.length}`);
  for (const f of failures.slice(0, 8)) {
    console.log(`- [${f.id}] Exp: [${f.exp.join(',')}] | Pred: [${f.pred.join(',')}]`);
    console.log(`  Text: "${f.text}"`);
    console.log(`  Records:`, f.records.map(r => `${r.department}: ${r.status} (${r.reason})`));
  }
}
