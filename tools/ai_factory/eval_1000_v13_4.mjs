import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const run004Path = path.join(rootDir, 'data/v11/curriculum_runs/run_004/candidate_model.json');
const run004Model = JSON.parse(fs.readFileSync(run004Path, 'utf8'));

const run006Path = path.join(rootDir, 'data/v11/curriculum_runs/run_006/candidate_model.json');
const run006Model = JSON.parse(fs.readFileSync(run006Path, 'utf8'));

const engineUrl = pathToFileURL(path.join(rootDir, 'src/services/v13_4/v13_4_engine.ts')).href;
const { classifyV13_4 } = await import(engineUrl);

const holdoutPath = path.join(rootDir, 'data/v11/eval_v13_3/v13_3_holdout_1000.jsonl');
const lines = fs.readFileSync(holdoutPath, 'utf8').trim().split('\n');
const cases = lines.map(l => JSON.parse(l));

function evalSystem(name, model) {
  let exact = 0;
  let totalExtra = 0;
  let totalMissed = 0;
  const byComp = {};
  const perDept = {};
  const DEPARTMENTS = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];
  for (const d of DEPARTMENTS) perDept[d] = { tp: 0, fp: 0, fn: 0 };

  const start = performance.now();
  for (const c of cases) {
    const res = classifyV13_4(c.text, model);
    const pred = [...(res.departments || [])].sort();
    const exp = [...c.expected].sort();
    const isMatch = pred.length === exp.length && pred.every((v, i) => v === exp[i]);

    if (isMatch) exact++;
    const comp = c.complexity || 'single_department';
    if (!byComp[comp]) byComp[comp] = { total: 0, correct: 0 };
    byComp[comp].total++;
    if (isMatch) byComp[comp].correct++;

    for (const d of DEPARTMENTS) {
      const hasExp = exp.includes(d);
      const hasPred = pred.includes(d);
      if (hasExp && hasPred) perDept[d].tp++;
      else if (!hasExp && hasPred) {
        perDept[d].fp++;
        totalExtra++;
      } else if (hasExp && !hasPred) {
        perDept[d].fn++;
        totalMissed++;
      }
    }
  }
  const latency = (performance.now() - start) / cases.length;

  let sumF1 = 0;
  for (const d of DEPARTMENTS) {
    const { tp, fp, fn } = perDept[d];
    const prec = tp + fp > 0 ? tp / (tp + fp) : 1;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 1;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    sumF1 += f1;
  }
  const macroF1 = (sumF1 / 6) * 100;
  const exactAcc = (exact / cases.length) * 100;

  console.log(`\n=== SYSTEM: ${name} ===`);
  console.log(`Exact Set Accuracy: ${exact}/${cases.length} (${exactAcc.toFixed(2)}%)`);
  console.log(`Macro F1: ${macroF1.toFixed(2)}%`);
  console.log(`False Extra Rate: ${(totalExtra / cases.length * 100).toFixed(2)}%`);
  console.log(`Missed Dept Rate: ${(totalMissed / cases.length * 100).toFixed(2)}%`);
  console.log(`Mean Latency: ${latency.toFixed(2)} ms`);
  console.log('Complexity Breakdown:');
  for (const [k, v] of Object.entries(byComp)) {
    console.log(`  ${k}: ${v.correct}/${v.total} (${(v.correct/v.total*100).toFixed(2)}%)`);
  }
}

evalSystem('Run004 + V13.4 Engine', run004Model);
evalSystem('Run006 + V13.4 Engine', run006Model);
