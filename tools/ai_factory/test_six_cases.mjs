import { buildIssueRelationGraph } from '../../src/services/v13_4/issueRelationGraph.ts';
import { classifyV13_4 } from '../../src/services/v13_4/v13_4_engine.ts';
import fs from 'fs';

const model = JSON.parse(fs.readFileSync('data/v11/curriculum_runs/run_004/candidate_model.json', 'utf8'));

const cases = [
  'Do din se bijli nahi aa rahi aur hamari gali ki road bhi toot gayi hai.',
  'Do din se bijli nahi aa rahi is wajah se pani ki motor nahi chal rahi.',
  'Water board ki main line phat gayi hai jis ke paani se pori road toot kar beh gayi.',
  'Sui gas walon ne pipeline dalne k liye sarak khodi aur khadda chor kar chale gaye.',
  'Kachray ka dher para hai jis ki wajah se gutter choke ho kar ubal raha hai.',
  'Road par bijli ka khamba gir gaya hai aur taar latak rahi hain.'
];

cases.forEach((c, idx) => {
  const g = buildIssueRelationGraph(c);
  const res = classifyV13_4(c, model);
  console.log(`\nCase ${idx + 1}: "${c}"`);
  if (idx === 3) {
    console.log('Issues:', JSON.stringify(g.issues, null, 2));
  }
  console.log('Graph Actionable:', g.actionableDepartments);
  console.log('Graph Suppressed:', g.suppressedDepartments);
  console.log('Graph Causal Chains:', g.causalChains);
  console.log('Engine Final Depts:', res.departments);
  console.log('Engine Decision Records:');
  res.decisionRecords.filter(d => d.status !== 'REJECTED').forEach(d => {
    console.log(`  - [${d.status}] ${d.department}: ${d.reason} (${d.decisionSource})`);
  });
});
