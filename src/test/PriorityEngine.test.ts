import { describe, it, expect } from 'vitest';
import {
  evaluateBaseSeverity,
  calculateComplaintPriority,
  formatPakistanDateTime,
  sortComplaints,
  type ComplaintPriorityInput,
} from '../lib/priority-engine';

describe('AWAAZ-E-AWAM — Priority Engine & Civic Triage (Phase 3F.1)', () => {
  const baseDate = new Date('2026-11-15T12:00:00Z');

  // 1. Gas leakage with immediate danger -> Critical
  it('1. classifies gas leakage with immediate danger as Critical', () => {
    const input: ComplaintPriorityInput = {
      description: 'Humare ilaqe me gas pipeline phat gayi hai aur gas leak ho rahi hai bohot shadeed boo hai aag lagne ka khatra hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('critical');
    expect(res.baseSeverity).toBe('critical');
    expect(res.severityReason).toMatch(/gas leak/i);
  });

  // 2. Gas service unavailable without leakage -> Not automatically Critical
  it('2. classifies gas service unavailable without leakage as Normal (not Critical)', () => {
    const input: ComplaintPriorityInput = {
      description: 'Humare ghar gas nahi aa rahi subah se chulha nahi jal raha.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).not.toBe('critical');
    expect(res.priority).toBe('normal');
  });

  // 3. Five-day electricity outage and no drinking water -> High
  it('3. classifies five-day electricity outage and lack of drinking water as High', () => {
    const input: ComplaintPriorityInput = {
      description: 'humare ghar 5 din se bijli nahi aa rahi aur peene ke liye pani bhi nahi hai shadeed pareshani hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('high');
    expect(res.baseSeverity).toBe('high');
    expect(res.severityReason).toMatch(/prolonged/i);
  });

  // 4. Routine road damage -> Normal unless explicit hazard justifies escalation
  it('4. classifies routine road damage as Normal', () => {
    const input: ComplaintPriorityInput = {
      description: 'Main road tooti hui hai chote chote khadday hain gaari chalane me dushwari hoti hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('normal');
    expect(res.baseSeverity).toBe('normal');
  });

  // 5. Explicitly dangerous road condition -> Appropriately elevated priority
  it('5. elevates priority for explicitly dangerous road conditions with accident risk', () => {
    const input: ComplaintPriorityInput = {
      description: 'Road par bohot khatarnak aur gehra khadda hai kal raat ek bike wala gir gaya hadsa ho chuka hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('high');
    expect(res.severityReason).toMatch(/accident/i);
  });

  // 6. Minor maintenance complaint -> Low based on defined rules
  it('6. classifies minor cosmetic maintenance as Low', () => {
    const input: ComplaintPriorityInput = {
      description: 'Park ke paas footpath par deewar ka rang kharab ho gaya hai cosmetic paint karwa dein.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('low');
    expect(res.baseSeverity).toBe('low');
  });

  // 7. Unresolved complaint older than 72 hours -> Correct aging escalation (Normal -> High)
  it('7. escalates an unresolved complaint waiting > 72 hours by 1 level (Normal to High)', () => {
    const submitTime = new Date('2026-11-12T08:00:00Z'); // 76 hours before baseDate
    const input: ComplaintPriorityInput = {
      description: 'Road par khadday hain repair karwa dein.',
      status: 'assigned',
      submittedAt: submitTime.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.baseSeverity).toBe('normal');
    expect(res.priority).toBe('high');
    expect(res.escalatedByAging).toBe(true);
    expect(res.agingHours).toBeGreaterThanOrEqual(72);
  });

  // 8. Unresolved complaint older than seven days -> Further escalation (Normal -> Critical)
  it('8. escalates an unresolved complaint waiting > 7 days to Critical', () => {
    const submitTime = new Date('2026-11-07T08:00:00Z'); // 8 days before baseDate
    const input: ComplaintPriorityInput = {
      description: 'Road par khadday hain repair karwa dein.',
      status: 'assigned',
      submittedAt: submitTime.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.baseSeverity).toBe('normal');
    expect(res.priority).toBe('critical');
    expect(res.escalatedByAging).toBe(true);
    expect(res.agingHours).toBeGreaterThanOrEqual(168);
  });

  // 9. Work Done complaint -> No ongoing aging escalation
  it('9. ensures resolved (Work Done) complaints do NOT undergo aging escalation', () => {
    const submitTime = new Date('2026-10-01T08:00:00Z'); // 45 days ago
    const input: ComplaintPriorityInput = {
      description: 'Road par khadday hain repair karwa dein.',
      status: 'resolved',
      submittedAt: submitTime.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('normal');
    expect(res.escalatedByAging).toBe(false);
  });

  // 10. Rejected complaint -> No ongoing aging escalation
  it('10. ensures rejected complaints do NOT undergo aging escalation', () => {
    const submitTime = new Date('2026-10-01T08:00:00Z'); // 45 days ago
    const input: ComplaintPriorityInput = {
      description: 'Road par khadday hain repair karwa dein.',
      status: 'rejected',
      submittedAt: submitTime.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('normal');
    expect(res.escalatedByAging).toBe(false);
  });

  // 11. Missing or ambiguous severity -> Safe default (Normal)
  it('11. assigns safe default (Normal) for ambiguous civic inquiries', () => {
    const input: ComplaintPriorityInput = {
      description: 'Information regarding municipal timings for office.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('normal');
    expect(res.explanation).toContain('Standard municipal inquiry');
  });

  // 12. Roman Urdu spelling variations -> Consistent interpretation
  it('12. handles Roman Urdu spelling variations consistently (paani/pani, bijlee/bijli)', () => {
    const v1: ComplaintPriorityInput = {
      description: '4 din se paani nahi aa raha.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const v2: ComplaintPriorityInput = {
      description: '4 dino se pani band hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    expect(calculateComplaintPriority(v1, baseDate).priority).toBe('high');
    expect(calculateComplaintPriority(v2, baseDate).priority).toBe('high');
  });

  // 13. Negated hazards -> No false Critical classification
  it('13. prevents false Critical classification when hazardous keywords are negated', () => {
    const input1: ComplaintPriorityInput = {
      description: 'Meter me current nahi aa raha hai light chali gayi hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const input2: ComplaintPriorityInput = {
      description: 'Gas ki koi leakage nahi hai bas pressure bohot kam hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    expect(calculateComplaintPriority(input1, baseDate).priority).not.toBe('critical');
    expect(calculateComplaintPriority(input2, baseDate).priority).not.toBe('critical');
  });

  // 14. Manual override -> Authorized and audited
  it('14. applies manual priority override and audit notes over automated calculations', () => {
    const submitTime = new Date('2026-11-01T08:00:00Z'); // 14 days ago (would normally be Critical by aging)
    const input: ComplaintPriorityInput = {
      description: 'Road par khadday hain.',
      status: 'assigned',
      submittedAt: submitTime.toISOString(),
      manualPriority: 'low',
      manualPriorityBy: 'roads-01 (KMC)',
      manualPriorityReason: 'Inspected on site: minor shoulder wear, not on traffic lane.',
      manualPriorityAt: '2026-11-14T10:00:00Z',
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.priority).toBe('low');
    expect(res.isManualOverride).toBe(true);
    expect(res.overriddenBy).toBe('roads-01 (KMC)');
    expect(res.explanation).toContain('Inspected on site');
  });

  // 15. Priority reasons -> No private citizen information leaks
  it('15. ensures priority explanations contain sanitized and factual details only', () => {
    const input: ComplaintPriorityInput = {
      description: '5 din se bijli nahi aa rahi.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(input, baseDate);
    expect(res.explanation).not.toMatch(/(\+92|03\d{9}|\d{5}-\d{7}-\d)/);
  });

  // 16. Sorting -> Correct priority order (Critical > High > Normal > Low with oldest tiebreak)
  it('16. sorts complaints with Highest Priority First and oldest tiebreak', () => {
    const cLow: ComplaintPriorityInput = {
      id: '1',
      description: 'Park deewar paint',
      status: 'assigned',
      submittedAt: '2026-11-14T10:00:00Z',
    };
    const cNormalOld: ComplaintPriorityInput = {
      id: '2',
      description: 'Road kharab hai',
      status: 'assigned',
      submittedAt: '2026-11-14T08:00:00Z',
    };
    const cNormalNew: ComplaintPriorityInput = {
      id: '3',
      description: 'Road kharab hai',
      status: 'assigned',
      submittedAt: '2026-11-14T12:00:00Z',
    };
    const cCritical: ComplaintPriorityInput = {
      id: '4',
      description: 'Gas leak phat gaya',
      status: 'assigned',
      submittedAt: '2026-11-14T09:00:00Z',
    };

    const sorted = sortComplaints([cLow, cNormalNew, cNormalOld, cCritical], 'priority_high', baseDate);
    expect(sorted.map((x) => x.id)).toEqual(['4', '2', '3', '1']);
  });

  // 17. Filtering -> Correct subsets
  it('17. accurately identifies and separates complaints by priority level', () => {
    const cCritical: ComplaintPriorityInput = {
      description: 'Gas pipeline leak blast risk',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const cHigh: ComplaintPriorityInput = {
      description: '5 din se bijli nahi aa rahi aur pani bhi nahi hai',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const cNormal: ComplaintPriorityInput = {
      description: 'Road kharab hai',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };

    expect(calculateComplaintPriority(cCritical, baseDate).priority).toBe('critical');
    expect(calculateComplaintPriority(cHigh, baseDate).priority).toBe('high');
    expect(calculateComplaintPriority(cNormal, baseDate).priority).toBe('normal');
  });

  // 18. Timestamps -> Correct Pakistan timezone (Asia/Karachi)
  it('18. formats timestamps in Asia/Karachi (PKT) timezone', () => {
    // 2026-11-15 06:42 UTC is 11:42 AM PKT (UTC+5)
    const formatted = formatPakistanDateTime('2026-11-15T06:42:00Z');
    expect(formatted).toBe('15 Nov 2026 · 11:42 AM PKT');
  });

  // 19. Timestamps -> Graceful honest fallback when timestamp unavailable
  it('19. returns honest "Time unavailable" fallback when timestamp is null or invalid', () => {
    expect(formatPakistanDateTime(null)).toBe('Time unavailable');
    expect(formatPakistanDateTime(undefined)).toBe('Time unavailable');
    expect(formatPakistanDateTime('invalid-date')).toBe('Time unavailable');
  });

  // 20. Routine complaints stay completely OUT of Priority Queue (Phase 3F.2)
  it('20. marks standard complaints as routine and excludes them from Priority Queue', () => {
    const routineComplaint: ComplaintPriorityInput = {
      description: 'Gali me sadak par chota khadda hai repair karwa dein.',
      status: 'assigned',
      submittedAt: new Date(baseDate.getTime() - 10 * 3600 * 1000).toISOString(), // 10h ago
    };
    const res = calculateComplaintPriority(routineComplaint, baseDate);
    expect(res.isRoutine).toBe(true);
    expect(res.qualifiesForPriorityQueue).toBe(false);
    expect(res.queueTabs).toHaveLength(0);
    expect(res.isUrgent).toBe(false);
    expect(res.isOverdue).toBe(false);
  });

  // 21. Urgent hazard qualifies for Priority Queue under Urgent tab
  it('21. places active emergency hazard into Priority Queue Urgent tab', () => {
    const hazardComplaint: ComplaintPriorityInput = {
      description: 'Khula taar latak raha hai khambay se current aa raha hai log bach ke guzar rahe hain.',
      status: 'assigned',
      submittedAt: new Date(baseDate.getTime() - 2 * 3600 * 1000).toISOString(), // 2h ago
    };
    const res = calculateComplaintPriority(hazardComplaint, baseDate);
    expect(res.isUrgent).toBe(true);
    expect(res.qualifiesForPriorityQueue).toBe(true);
    expect(res.queueTabs).toContain('urgent');
    expect(res.priorityReason).toMatch(/electrocution|hazard/i);
  });

  // 22. Unresolved complaint waiting >= 72h qualifies for Overdue tab
  it('22. places unresolved complaint waiting >= 72h into Priority Queue Overdue tab', () => {
    const overdueComplaint: ComplaintPriorityInput = {
      description: 'Street light kharab hai gali me andhera hai.',
      status: 'assigned',
      submittedAt: new Date(baseDate.getTime() - 80 * 3600 * 1000).toISOString(), // 80h ago
    };
    const res = calculateComplaintPriority(overdueComplaint, baseDate);
    expect(res.isOverdue).toBe(true);
    expect(res.qualifiesForPriorityQueue).toBe(true);
    expect(res.queueTabs).toContain('overdue');
    expect(res.priorityReason).toMatch(/overdue/i);
  });

  // 23. Resolved or rejected complaints do NOT enter Overdue tab
  it('23. ensures resolved or rejected complaints never enter the Overdue tab even after 100h', () => {
    const resolvedComplaint: ComplaintPriorityInput = {
      description: 'Pothole repair request',
      status: 'resolved',
      submittedAt: new Date(baseDate.getTime() - 120 * 3600 * 1000).toISOString(), // 120h ago
    };
    const res = calculateComplaintPriority(resolvedComplaint, baseDate);
    expect(res.isOverdue).toBe(false);
    expect(res.queueTabs).not.toContain('overdue');
  });

  // 24. Flagged or ambiguous complaint qualifies for Needs Assessment tab
  it('24. routes ambiguous or flagged complaints to Needs Assessment tab', () => {
    const flaggedComplaint: ComplaintPriorityInput = {
      description: 'Municipal issue in area',
      status: 'assigned',
      redactionNeedsReview: true,
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(flaggedComplaint, baseDate);
    expect(res.needsAssessment).toBe(true);
    expect(res.queueTabs).toContain('needs_assessment');
  });

  // 25. Open manhole on street triggers immediate danger
  it('25. classifies open manhole or uncovered drain as Critical hazard', () => {
    const manholeComplaint: ComplaintPriorityInput = {
      description: 'Main road par open manhole hai khula gutter kisi hadsay ka sabab ban sakta hai.',
      status: 'assigned',
      submittedAt: baseDate.toISOString(),
    };
    const res = calculateComplaintPriority(manholeComplaint, baseDate);
    expect(res.priority).toBe('critical');
    expect(res.isUrgent).toBe(true);
    expect(res.queueTabs).toContain('urgent');
  });
});
