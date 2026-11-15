import {
  calculateComplaintPriority,
  filterPriorityQueueComplaints,
  getPriorityQueueCounts,
  evaluateBaseSeverity,
} from '../src/lib/priority-engine.ts';

// Evaluation base date
const EVAL_NOW = new Date('2026-11-15T18:00:00Z');

/**
 * Meaningful labeled evaluation dataset covering all 6 Karachi municipal authorities
 * with real-world Roman Urdu linguistic phenomena (negation, colloquial phrasing,
 * spelling variants, duration, aging, resolved status).
 */
const EVALUATION_DATASET = [
  // ============================================================================
  // 1. KMC — Municipal Infrastructure
  // ============================================================================
  {
    id: 'KMC-01',
    dept: 'kmc',
    description: 'Main Shahrah-e-Faisal par bohot gehra khadda hai aur bridge ke paas road dhans gayi hai hadsa ho chuka hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 4,
    status: 'assigned',
    category: 'Urgent Road Subsidence / Accident Hazard',
  },
  {
    id: 'KMC-02',
    dept: 'kmc',
    description: 'Road par chota khadda hai gaariyan hilti hain repair karwa dein.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 12,
    status: 'assigned',
    category: 'Routine Road Maintenance',
  },
  {
    id: 'KMC-03',
    dept: 'kmc',
    description: 'Gulshan block 13 me footpath tooti hui hai 4 din se kisi ne nahi dekha.',
    expectedUrgent: false,
    expectedOverdue: true,
    expectedQueue: 'overdue',
    hoursAgo: 96,
    status: 'assigned',
    category: 'Overdue Minor Footpath Repair',
  },
  {
    id: 'KMC-04',
    dept: 'kmc',
    description: 'Sarak tooti hui nahi hai bas chhota sa kachra pada hai.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 6,
    status: 'assigned',
    category: 'Negated Road Damage (Non-Hazard)',
  },
  {
    id: 'KMC-05',
    dept: 'kmc',
    description: 'Main road par open manhole hai khula gutter kisi hadsay ka sabab ban sakta hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 1,
    status: 'assigned',
    category: 'Open Manhole Acute Hazard',
  },

  // ============================================================================
  // 2. KWSC — Water & Sewerage Corporation
  // ============================================================================
  {
    id: 'KWSC-01',
    dept: 'kwsc',
    description: 'Gutter ka ganda pani ghar ke andar ghus gaya hai aur bachay bimar ho rahe hain flooding ho rahi hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 3,
    status: 'assigned',
    category: 'Urgent Sewage Flooding Residences',
  },
  {
    id: 'KWSC-02',
    dept: 'kwsc',
    description: 'Humare ilaqe me 4 din se peene ka pani nahi aa raha line bilkul band hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 10,
    status: 'assigned',
    category: 'Prolonged Drinking Water Outage (>= 3 days)',
  },
  {
    id: 'KWSC-03',
    dept: 'kwsc',
    description: 'Pani ka pressure thoda kam hai subah ke waqt.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 18,
    status: 'assigned',
    category: 'Routine Low Water Pressure',
  },
  {
    id: 'KWSC-04',
    dept: 'kwsc',
    description: 'Main line ka valve leak ho raha hai paani zaya ho raha hai.',
    expectedUrgent: false,
    expectedOverdue: true,
    expectedQueue: 'overdue',
    hoursAgo: 84,
    status: 'in_progress',
    category: 'Overdue Water Line Leak (>72h)',
  },
  {
    id: 'KWSC-05',
    dept: 'kwsc',
    description: 'Pani band nahi hai bas thoda ganda aa raha tha ab saaf hai.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 120,
    status: 'resolved',
    category: 'Resolved Water Quality (No Overdue Escalation)',
  },

  // ============================================================================
  // 3. K-Electric — Power Grid & Electricity
  // ============================================================================
  {
    id: 'KE-01',
    dept: 'kelectric',
    description: 'Khula taar latak raha hai khambay se spark ho raha hai current lag raha hai foran bijli band karein.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 1,
    status: 'assigned',
    category: 'Immediate Electrocution Live Wire Hazard',
  },
  {
    id: 'KE-02',
    dept: 'kelectric',
    description: 'Transformer aag lag gayi hai dhuan nikal raha hai blast ho sakta hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 0.5,
    status: 'assigned',
    category: 'Transformer Fire / Explosion Hazard',
  },
  {
    id: 'KE-03',
    dept: 'kelectric',
    description: 'Humare ghar 5 din se bijli nahi aa rahi pure block ka transformer kharab hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 24,
    status: 'assigned',
    category: 'Prolonged Multi-Day Power Outage (5 days)',
  },
  {
    id: 'KE-04',
    dept: 'kelectric',
    description: 'Ghar me bijli nahi aa rahi 2 ghante se loadshedding chal rahi hai.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 2,
    status: 'assigned',
    category: 'Routine Short Loadshedding (Non-Urgent)',
  },
  {
    id: 'KE-05',
    dept: 'kelectric',
    description: 'Taar toota hua nahi hai bas meter ka display off hai.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 8,
    status: 'assigned',
    category: 'Negated Wire Break / Meter Inquiry',
  },

  // ============================================================================
  // 4. SSGC — Sui Southern Gas Company
  // ============================================================================
  {
    id: 'SSGC-01',
    dept: 'ssgc',
    description: 'Gas pipeline leak ho rahi hai aur bohot shadeed smell aa rahi hai aag lagne ka khatra hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 1,
    status: 'assigned',
    category: 'Acute Gas Leak Explosion Risk',
  },
  {
    id: 'SSGC-02',
    dept: 'ssgc',
    description: 'Ghar me gas nahi aa rahi subah se chulha nahi jal raha.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 5,
    status: 'assigned',
    category: 'Routine Gas Supply Outage (Negated Leak)',
  },
  {
    id: 'SSGC-03',
    dept: 'ssgc',
    description: 'Gas ka pressure bohot low hai roti nahi ban rahi.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 14,
    status: 'assigned',
    category: 'Routine Low Gas Pressure',
  },
  {
    id: 'SSGC-04',
    dept: 'ssgc',
    description: 'Gas meter change karne ki darkhwast di thi 4 din ho gaye hain koi nahi aya.',
    expectedUrgent: false,
    expectedOverdue: true,
    expectedQueue: 'overdue',
    hoursAgo: 98,
    status: 'accepted',
    category: 'Overdue Meter Replacement (>72h)',
  },

  // ============================================================================
  // 5. SBCA — Sindh Building Control Authority
  // ============================================================================
  {
    id: 'SBCA-01',
    dept: 'sbca',
    description: 'Old building ki chhat toot kar gir gayi hai aur deewar girne ka shadeed khatra hai log dhabe ke neeche hain.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 0.8,
    status: 'assigned',
    category: 'Imminent Structural Collapse Hazard',
  },
  {
    id: 'SBCA-02',
    dept: 'sbca',
    description: 'Ghair qanooni 4th floor banaya ja raha hai baghair permission ke.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 20,
    status: 'assigned',
    category: 'Standard Illegal Construction Report',
  },
  {
    id: 'SBCA-03',
    dept: 'sbca',
    description: 'Plaza ke bahar chhota sa shade laga liya hai encroachment inspection karein.',
    expectedUrgent: false,
    expectedOverdue: true,
    expectedQueue: 'overdue',
    hoursAgo: 110,
    status: 'in_progress',
    category: 'Overdue Encroachment Inspection (>72h)',
  },

  // ============================================================================
  // 6. SSWMB — Sindh Solid Waste Management Board
  // ============================================================================
  {
    id: 'SSWMB-01',
    dept: 'sswmb',
    description: 'Gali ke kachre ka dabba bhar gaya hai kachra utha lein.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 16,
    status: 'assigned',
    category: 'Routine Daily Waste Pickup',
  },
  {
    id: 'SSWMB-02',
    dept: 'sswmb',
    description: 'Hospital ke main gate ke samne kachre ka dher laga hai aur shadeed badboo bimari phel rahi hai.',
    expectedUrgent: true,
    expectedOverdue: false,
    expectedQueue: 'urgent',
    hoursAgo: 2,
    status: 'assigned',
    category: 'Severe Toxic Waste Accumulation at Hospital',
  },
  {
    id: 'SSWMB-03',
    dept: 'sswmb',
    description: 'Kachra nahi uthaya gaya 5 din se gali me kude ka pahaad ban gaya hai.',
    expectedUrgent: false,
    expectedOverdue: true,
    expectedQueue: 'overdue',
    hoursAgo: 120,
    status: 'assigned',
    category: 'Overdue Garbage Collection (>72h)',
  },
  {
    id: 'SSWMB-04',
    dept: 'sswmb',
    description: 'Kachra utha liya gaya tha safai mukammal ho chuki hai.',
    expectedUrgent: false,
    expectedOverdue: false,
    expectedQueue: 'routine',
    hoursAgo: 200,
    status: 'resolved',
    category: 'Resolved Waste Complaint (Never Overdue)',
  },
];

console.log('==============================================================================');
console.log('AWAAZ-E-AWAM — PHASE 3F.2 PRIORITY & URGENCY EVALUATION REPORT');
console.log('Evaluation Timestamp:', EVAL_NOW.toISOString());
console.log('Total Labeled Test Cases:', EVALUATION_DATASET.length);
console.log('==============================================================================\n');

let totalUrgentExpected = 0;
let correctUrgentDetections = 0;
let falseUrgentDetections = 0;
let missedUrgentCases = 0;

let totalOverdueExpected = 0;
let correctOverdueDetections = 0;
let falseOverdueDetections = 0;

let totalRoutineExpected = 0;
let correctRoutineDetections = 0;

const deptResults = {
  kmc: { total: 0, passed: 0 },
  kwsc: { total: 0, passed: 0 },
  kelectric: { total: 0, passed: 0 },
  ssgc: { total: 0, passed: 0 },
  sbca: { total: 0, passed: 0 },
  sswmb: { total: 0, passed: 0 },
};

console.log('| ID | Dept | Category | Actual Prio | Queue Tabs | Expected Queue | Match? | Factual Reason |');
console.log('|:---|:---|:---|:---|:---|:---|:---:|:---|');

for (const tc of EVALUATION_DATASET) {
  const submitTime = new Date(EVAL_NOW.getTime() - tc.hoursAgo * 3600 * 1000).toISOString();
  const input = {
    id: tc.id,
    description: tc.description,
    status: tc.status,
    submittedAt: submitTime,
    assignedDepartmentId: tc.dept,
  };

  const evalResult = calculateComplaintPriority(input, EVAL_NOW);

  const isUrgent = evalResult.isUrgent;
  const isOverdue = evalResult.isOverdue;
  const isRoutine = evalResult.isRoutine;

  // Track Urgent Metrics
  if (tc.expectedUrgent) {
    totalUrgentExpected++;
    if (isUrgent) {
      correctUrgentDetections++;
    } else {
      missedUrgentCases++;
    }
  } else {
    if (isUrgent) {
      falseUrgentDetections++;
    }
  }

  // Track Overdue Metrics
  if (tc.expectedOverdue) {
    totalOverdueExpected++;
    if (isOverdue) {
      correctOverdueDetections++;
    } else {
      falseOverdueDetections++;
    }
  } else {
    if (isOverdue) {
      falseOverdueDetections++;
    }
  }

  // Track Routine Metrics
  if (tc.expectedQueue === 'routine') {
    totalRoutineExpected++;
    if (isRoutine) {
      correctRoutineDetections++;
    }
  }

  let queueMatch = false;
  if (tc.expectedQueue === 'urgent') {
    queueMatch = evalResult.queueTabs.includes('urgent');
  } else if (tc.expectedQueue === 'overdue') {
    queueMatch = evalResult.queueTabs.includes('overdue');
  } else if (tc.expectedQueue === 'routine') {
    queueMatch = evalResult.isRoutine && !evalResult.qualifiesForPriorityQueue;
  }

  deptResults[tc.dept].total++;
  if (queueMatch) {
    deptResults[tc.dept].passed++;
  }

  const mark = queueMatch ? '✅ PASS' : '❌ FAIL';
  const tabsStr = evalResult.queueTabs.length > 0 ? evalResult.queueTabs.join(',') : 'none (routine)';

  console.log(
    `| ${tc.id} | ${tc.dept.toUpperCase()} | ${tc.category} | ${evalResult.priority.toUpperCase()} | ${tabsStr} | ${tc.expectedQueue} | ${mark} | ${evalResult.priorityReason.slice(0, 50)}... |`
  );
}

const urgentPrecision =
  correctUrgentDetections + falseUrgentDetections > 0
    ? ((correctUrgentDetections / (correctUrgentDetections + falseUrgentDetections)) * 100).toFixed(1)
    : '100.0';

const urgentRecall =
  totalUrgentExpected > 0
    ? ((correctUrgentDetections / totalUrgentExpected) * 100).toFixed(1)
    : '100.0';

const overdueAccuracy =
  totalOverdueExpected > 0
    ? ((correctOverdueDetections / totalOverdueExpected) * 100).toFixed(1)
    : '100.0';

const routineExclusionRate =
  totalRoutineExpected > 0
    ? ((correctRoutineDetections / totalRoutineExpected) * 100).toFixed(1)
    : '100.0';

console.log('\n==============================================================================');
console.log('SUMMARY METRICS:');
console.log('------------------------------------------------------------------------------');
console.log(`Urgent Cases Evaluated: ${totalUrgentExpected}`);
console.log(`Correct Urgent Detections: ${correctUrgentDetections} / ${totalUrgentExpected}`);
console.log(`Missed Urgent Emergencies: ${missedUrgentCases} (Zero toleration target: 0)`);
console.log(`False Urgent Alerts: ${falseUrgentDetections}`);
console.log(`Urgent Detection Precision: ${urgentPrecision}%`);
console.log(`Urgent Detection Recall: ${urgentRecall}%`);
console.log(`Overdue Decisions Correct: ${correctOverdueDetections} / ${totalOverdueExpected} (${overdueAccuracy}%)`);
console.log(`Routine Complaints Kept OUT of Priority Queue: ${correctRoutineDetections} / ${totalRoutineExpected} (${routineExclusionRate}%)`);
console.log('------------------------------------------------------------------------------');
console.log('RESULTS BY DEPARTMENT:');
for (const [dept, res] of Object.entries(deptResults)) {
  const rate = ((res.passed / res.total) * 100).toFixed(1);
  console.log(`  - ${dept.toUpperCase()}: ${res.passed} / ${res.total} (${rate}%)`);
}
console.log('==============================================================================\n');
