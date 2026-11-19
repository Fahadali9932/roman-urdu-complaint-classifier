import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const rootDir = process.cwd();
const run006Path = path.join(rootDir, 'data/v11/curriculum_runs/run_006/candidate_model.json');
const run006Model = JSON.parse(fs.readFileSync(run006Path, 'utf8'));

const engineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_4/v13_4_engine.ts')).href;
const { classifyV13_4 } = await import(engineUrl);

const devPath = path.join(rootDir, 'data/v11/eval_v13_4/v13_4_dev_400.jsonl');
const lines = fs.readFileSync(devPath, 'utf8').trim().split('\n');
const cases = lines.map(l => JSON.parse(l));

let exact = 0;
const byComp = {};
for (const c of cases) {
  const res = classifyV13_4(c.text, run006Model);
  const pred = [...(res.departments || [])].sort();
  const exp = [...c.expected].sort();
  const isMatch = pred.length === exp.length && pred.every((v, i) => v === exp[i]);
  if (isMatch) exact++;
  const comp = c.complexity || 'single_department';
  if (!byComp[comp]) byComp[comp] = { total: 0, correct: 0 };
  byComp[comp].total++;
  if (isMatch) byComp[comp].correct++;
}

console.log('=== V13.4 DEV 400 RESULTS (Run006) ===');
console.log(`Exact Set Accuracy: ${exact}/${cases.length} (${(exact/cases.length*100).toFixed(2)}%)`);
for (const [k, v] of Object.entries(byComp)) {
  console.log(`  ${k}: ${v.correct}/${v.total} (${(v.correct/v.total*100).toFixed(2)}%)`);
}
