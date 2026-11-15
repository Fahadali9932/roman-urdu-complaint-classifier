/**
 * Roman Urdu Complaint Priority, Selective Triage & Queue Urgency Engine
 * Greenwich University, Karachi, Pakistan
 *
 * Deterministic civic triage separating:
 * 1. Department classification (handled by existing classifier).
 * 2. Intrinsic severity of municipal grievance (Roman Urdu & English analysis).
 * 3. Queue urgency (Urgent, Overdue, Needs Assessment, or Routine).
 *
 * PRIVACY GUARANTEE: Never logs or exposes citizen PII.
 */

export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low';
export type QueueTabType = 'urgent' | 'overdue' | 'needs_assessment';
export type QueueCategory = 'urgent' | 'overdue' | 'needs_assessment' | 'routine';

export interface PriorityEvaluation {
  priority: PriorityLevel;
  baseSeverity: PriorityLevel;
  agingHours: number;
  timeWaitingFormatted: string;
  escalatedByAging: boolean;
  isManualOverride: boolean;
  isUrgent: boolean;
  isOverdue: boolean;
  needsAssessment: boolean;
  isRoutine: boolean;
  qualifiesForPriorityQueue: boolean;
  queueTabs: QueueTabType[];
  primaryQueueTab?: QueueTabType;
  severityReason: string;
  explanation: string;
  priorityReason: string;
  overriddenBy?: string;
  overriddenAt?: string;
  overrideReason?: string;
}

export interface ComplaintPriorityInput {
  id?: string;
  referenceNumber?: string;
  description: string;
  sanitizedDescription?: string | null;
  generatedHeading?: string | null;
  factualSummary?: string | null;
  status: string;
  submittedAt?: string;
  created_at?: string;
  redactionNeedsReview?: boolean;
  predictionConfidence?: number;
  assignedDepartmentId?: string;
  manualPriority?: PriorityLevel | null;
  manualPriorityReason?: string | null;
  manualPriorityBy?: string | null;
  manualPriorityAt?: string | null;
}

const PRIORITY_RANKS: Record<PriorityLevel, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Normalizes Roman Urdu text for robust regex and keyword matching.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a specific pattern in the text is preceded or succeeded by a negation token.
 * Negation tokens in Roman Urdu/English: nahi, nhi, na, mat, no, not, without, koi ... nahi
 */
function isNegated(text: string, matchIndex: number, matchLength: number): boolean {
  // Check 35 characters before the match
  const before = text.slice(Math.max(0, matchIndex - 35), matchIndex);
  // Check 30 characters after the match
  const after = text.slice(matchIndex + matchLength, Math.min(text.length, matchIndex + matchLength + 30));

  const negationRegexBefore = /\b(nahi|nhi|na|mat|no|not|without|koi)\b/i;
  const negationRegexAfter = /\b(nahi|nhi|na|mat)\b/i;

  return negationRegexBefore.test(before) || negationRegexAfter.test(after);
}

/**
 * Searches for a pattern while ensuring it is not negated.
 */
function findNonNegatedMatch(text: string, regex: RegExp): RegExpExecArray | null {
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let match: RegExpExecArray | null;
  while ((match = globalRegex.exec(text)) !== null) {
    if (!isNegated(text, match.index, match[0].length)) {
      return match;
    }
  }
  return null;
}

/**
 * Evaluates the intrinsic severity of the complaint narrative.
 */
export function evaluateBaseSeverity(text: string): { baseSeverity: PriorityLevel; reason: string } {
  const norm = normalizeText(text);

  // 1. CRITICAL: Immediate danger to human life or physical safety
  // A. Gas leak or cylinder explosion risk (SSGC)
  // Ensure "gas nahi aa rahi" is NOT detected as leak
  const gasLeakPattern = /\b(gas(\s+(pipe|pipeline|line))?(\s+ki)?\s*(leak|leakage|boo|badboo|smell)|(gas\s*)?pipeline\s*(phat|blast|leak|burst)|cylinder\s*(phat|blast|leek))\b/i;
  if (findNonNegatedMatch(norm, gasLeakPattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Reported gas leakage with immediate fire or explosion hazard.',
    };
  }

  // B. Exposed live electrical wires / electrocution hazard (K-Electric)
  // Note: "current nahi aa raha" is outage, not shock hazard.
  const liveWirePattern = /\b(live\s*wire|khula\s*taar|khulay\s*taar|taar\s*toot|khamb(a|e|ay)\s*se\s*current|current\s*lag\s*raha|current\s*aa\s*raha|transformer\s*(blast|aag|sparking)|bijli\s*ka\s*shola)\b/i;
  if (findNonNegatedMatch(norm, liveWirePattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Exposed electrical wiring or active electrocution hazard.',
    };
  }

  // C. Structural collapse or deep collapse on active transit routes (SBCA / KMC)
  const collapsePattern = /\b(bridge\s*toot|pul\s*toot|road\s*dhans|building\s*gir|chhat\s*(gir|toot)|deewar\s*girne|deep\s*sinkhole|gehra\s*gaddha\s*hadsa)\b/i;
  if (findNonNegatedMatch(norm, collapsePattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Imminent structural collapse or severe road subsidence creating active life hazard.',
    };
  }

  // D. Dangerous open manhole on active roadways / pedestrian routes (KWSC / KMC)
  const openManholeHazard = /\b(open\s*manhole|khula\s*gutter|gutter\s*ka\s*dhakkan\s*(nahi|gayab|toot)|drain\s*me\s*(bachha|bacha|koi)\s*gir)\b/i;
  if (findNonNegatedMatch(norm, openManholeHazard)) {
    return {
      baseSeverity: 'critical',
      reason: 'Dangerous uncovered manhole or storm drain posing acute fall hazard.',
    };
  }

  // 2. HIGH: Severe prolonged service outage or significant health/accident hazard
  // A. Multi-day essential service outage (electricity, water, sanitation, gas)
  const multiDayPattern = /\b(\d+|ek|do|teen|char|chaar|paanch|panch|che|chhay|saat|aath|das|kayi|kafi|chand)\s*(din|dino|days|hafte|hafton|weeks)\s*(se)?\b/i;
  const hasMultiDay = multiDayPattern.test(norm);

  const hasNoPower = /\b(bijli|light|electricity|power|current)\s*(bhi\s*)?(nahi|nhi|band|ghayab|chali)\b/i.test(norm) ||
                     /\b(no|without)\s*(power|electricity|light)\b/i.test(norm);

  const hasNoWater = /\b(pani|paani|water)\s*(bhi\s*)?(nahi|nhi|band|khatam|killat|naddarat)\b/i.test(norm) ||
                     /\b(peene|peenay)\s*(ka|ke|keliye)?\s*pani\s*(bhi\s*)?(nahi|nhi)\b/i.test(norm) ||
                     /\bno\s*(drinking\s*)?water\b/i.test(norm);

  if (hasMultiDay && hasNoPower && hasNoWater) {
    return {
      baseSeverity: 'high',
      reason: 'Prolonged multi-day outage of both electricity and drinking water.',
    };
  }

  if (hasMultiDay && (hasNoPower || hasNoWater)) {
    return {
      baseSeverity: 'high',
      reason: hasNoWater
        ? 'Prolonged deprivation of essential drinking water supply.'
        : 'Prolonged electricity outage continuing over multiple days.',
    };
  }

  // B. Major sewage overflow creating severe health hazard / entering homes (KWSC)
  const sewageHealthPattern = /\b(sewage|gutter|ganda\s*pani)\s*(ghar|gharon|dakhil|ghus|flooding|bimari|infection|overflow)\b/i;
  if (findNonNegatedMatch(norm, sewageHealthPattern)) {
    return {
      baseSeverity: 'high',
      reason: 'Major sewage overflow entering residential properties or causing health risk.',
    };
  }

  // C. Dangerous road damage with high accident risk (KMC)
  const dangerousRoadPattern = /\b(dangerous|khatarnak|shadeed\s*khadday|hadsa|accident|gaari\s*gir)\b/i;
  const isRoadIssue = /\b(road|sarak|sadak|pothole|khadda|khadday|pathor)\b/i.test(norm);
  if (isRoadIssue && findNonNegatedMatch(norm, dangerousRoadPattern)) {
    return {
      baseSeverity: 'high',
      reason: 'Dangerous road condition posing immediate vehicular or pedestrian accident hazard.',
    };
  }

  // D. Severe solid waste accumulation creating acute disease or contamination risk (SSWMB)
  const isWasteIssue = /\b(kachr(a|e)|garbage|waste|trash|kuda|kuday)\b/i.test(norm);
  const wasteHazardPattern = /\b(hospital|clinic|school|bimari|infection|toxic|shadeed\s*badboo|dead\s*animal)\b/i;
  if (isWasteIssue && findNonNegatedMatch(norm, wasteHazardPattern)) {
    return {
      baseSeverity: 'high',
      reason: 'Severe solid waste accumulation creating acute public health or contamination risk.',
    };
  }

  // 3. LOW: Minor maintenance or non-urgent cosmetic complaints
  const lowPattern = /\b(rang|paint|chhoti\s*si|safai\s*kar\s*dein|park\s*bench|kachre\s*ka\s*dabba\s*door|aesthetic|cosmetic|tree\s*trimming|shakhen\s*kaat)\b/i;
  if (findNonNegatedMatch(norm, lowPattern) && !hasMultiDay && !findNonNegatedMatch(norm, /(khatra|hadsa|danger|broken|phat)/i)) {
    return {
      baseSeverity: 'low',
      reason: 'Minor municipal maintenance or non-urgent cosmetic repair.',
    };
  }

  // 4. NORMAL: Standard civic maintenance (Routine)
  if (isRoadIssue) {
    return {
      baseSeverity: 'normal',
      reason: 'Standard road repair and resurfacing requirement.',
    };
  }

  if (/\b(gas\s*(nahi|nhi|band|pressure\s*kam|low\s*pressure))\b/i.test(norm)) {
    return {
      baseSeverity: 'normal',
      reason: 'Routine gas supply interruption or low pressure (no active leak reported).',
    };
  }

  if (hasNoWater) {
    return {
      baseSeverity: 'normal',
      reason: 'Standard municipal water supply disruption requiring investigation.',
    };
  }

  if (hasNoPower) {
    return {
      baseSeverity: 'normal',
      reason: 'Standard power supply interruption under municipal assessment.',
    };
  }

  if (/\b(kachra|garbage|trash|safai|kunda)\b/i.test(norm)) {
    return {
      baseSeverity: 'normal',
      reason: 'Routine municipal solid waste collection and street sanitation.',
    };
  }

  // Default fallback
  return {
    baseSeverity: 'normal',
    reason: 'Standard municipal inquiry or civic service requirement.',
  };
}

/**
 * Formats waiting duration into human-readable string.
 */
export function formatTimeWaiting(hours: number): string {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days === 1) return remHours > 0 ? `1 day, ${remHours}h` : '1 day waiting';
  return `${days} days waiting (${hours}h)`;
}

/**
 * Calculates priority, aging escalation, queue urgency, and explainable reasons.
 *
 * Urgent criteria:
 * - Base severity is Critical (hazard) or High (multi-day outage/overflow), OR
 * - Manually overridden to Critical or High.
 *
 * Overdue criteria:
 * - Unresolved complaint waiting >= 72 hours.
 * - Resolved / rejected complaints NEVER enter Overdue.
 *
 * Needs Assessment criteria:
 * - redactionNeedsReview === true, or status === 'under_review', or low confidence.
 *
 * Routine criteria:
 * - Not Urgent, Not Overdue, Not Needs Assessment.
 * - Routine complaints do NOT qualify for the Priority Queue.
 */
export function calculateComplaintPriority(
  complaint: ComplaintPriorityInput,
  evaluationTime?: Date
): PriorityEvaluation {
  const narrative = [
    complaint.generatedHeading,
    complaint.factualSummary,
    complaint.sanitizedDescription,
    complaint.description,
  ]
    .filter(Boolean)
    .join(' ');

  const { baseSeverity, reason: severityReason } = evaluateBaseSeverity(narrative);

  // Timestamp & aging calculation
  const rawTimestamp = complaint.submittedAt || complaint.created_at;
  let agingHours = 0;
  if (rawTimestamp) {
    const submitDate = new Date(rawTimestamp);
    if (!isNaN(submitDate.getTime())) {
      const current = evaluationTime || new Date();
      agingHours = Math.max(0, Math.floor((current.getTime() - submitDate.getTime()) / (1000 * 60 * 60)));
    }
  }

  const timeWaitingFormatted = formatTimeWaiting(agingHours);
  const isClosed = complaint.status === 'resolved' || complaint.status === 'rejected' || complaint.status === 'closed';

  // Manual override resolution
  if (complaint.manualPriority) {
    const p = complaint.manualPriority;
    const author = complaint.manualPriorityBy || 'Authorized Officer';
    const reason = complaint.manualPriorityReason || 'Operational staff review';

    const isUrgent = p === 'critical' || p === 'high';
    const isOverdue = !isClosed && agingHours >= 72;
    const needsAssessment = complaint.status === 'under_review' || !!complaint.redactionNeedsReview;
    const isRoutine = !isUrgent && !isOverdue && !needsAssessment;
    const qualifiesForPriorityQueue = !isRoutine;

    const queueTabs: QueueTabType[] = [];
    if (isUrgent) queueTabs.push('urgent');
    if (isOverdue) queueTabs.push('overdue');
    if (needsAssessment) queueTabs.push('needs_assessment');

    const primaryQueueTab = isUrgent ? 'urgent' : isOverdue ? 'overdue' : needsAssessment ? 'needs_assessment' : undefined;

    return {
      priority: p,
      baseSeverity,
      agingHours,
      timeWaitingFormatted,
      escalatedByAging: false,
      isManualOverride: true,
      isUrgent,
      isOverdue,
      needsAssessment,
      isRoutine,
      qualifiesForPriorityQueue,
      queueTabs,
      primaryQueueTab,
      severityReason,
      explanation: `${p.toUpperCase()} priority — Manually adjusted by ${author}: "${reason}".`,
      priorityReason: `Staff Escalation: ${reason}`,
      overriddenBy: author,
      overriddenAt: complaint.manualPriorityAt || undefined,
      overrideReason: reason,
    };
  }

  // Aging calculation & priority determination
  let priority = baseSeverity;
  let escalatedByAging = false;
  let agingNote = '';

  if (!isClosed && agingHours >= 72) {
    if (agingHours >= 168) {
      if (baseSeverity === 'low') priority = 'high';
      else if (baseSeverity === 'normal' || baseSeverity === 'high') priority = 'critical';
      escalatedByAging = priority !== baseSeverity;
      agingNote = `Overdue by ${Math.floor(agingHours / 24)} days (${agingHours} hours) without resolution`;
    } else {
      if (baseSeverity === 'low') priority = 'normal';
      else if (baseSeverity === 'normal') priority = 'high';
      else if (baseSeverity === 'high') priority = 'critical';
      escalatedByAging = priority !== baseSeverity;
      agingNote = `Unresolved after ${agingHours} hours waiting`;
    }
  }

  // Queue Urgency Classification (Part 3 & 4)
  const isUrgent = baseSeverity === 'critical' || baseSeverity === 'high';
  const isOverdue = !isClosed && agingHours >= 72;
  const needsAssessment =
    complaint.status === 'under_review' ||
    complaint.redactionNeedsReview === true ||
    (complaint.predictionConfidence !== undefined && complaint.predictionConfidence < 0.50);

  const isRoutine = !isUrgent && !isOverdue && !needsAssessment;
  const qualifiesForPriorityQueue = !isRoutine;

  const queueTabs: QueueTabType[] = [];
  if (isUrgent) queueTabs.push('urgent');
  if (isOverdue) queueTabs.push('overdue');
  if (needsAssessment) queueTabs.push('needs_assessment');

  const primaryQueueTab = isUrgent ? 'urgent' : isOverdue ? 'overdue' : needsAssessment ? 'needs_assessment' : undefined;

  let priorityReason = severityReason;
  if (isUrgent) {
    priorityReason = baseSeverity === 'critical' ? `Urgent Hazard: ${severityReason}` : `Service Disruption: ${severityReason}`;
  } else if (isOverdue) {
    priorityReason = `Overdue: Unresolved for ${agingHours}h (${Math.floor(agingHours / 24)}d) · ${severityReason}`;
  } else if (needsAssessment) {
    priorityReason = 'Needs Assessment: Verification required by municipal staff.';
  } else {
    priorityReason = 'Routine: Handled under standard municipal service schedule.';
  }

  const explanation = escalatedByAging
    ? `${priority.toUpperCase()} priority — ${agingNote}. (Initial severity basis: ${severityReason})`
    : `${priority.toUpperCase()} priority — ${severityReason}`;

  return {
    priority,
    baseSeverity,
    agingHours,
    timeWaitingFormatted,
    escalatedByAging,
    isManualOverride: false,
    isUrgent,
    isOverdue,
    needsAssessment,
    isRoutine,
    qualifiesForPriorityQueue,
    queueTabs,
    primaryQueueTab,
    severityReason,
    explanation,
    priorityReason,
  };
}

/**
 * Filters complaints for the dedicated Priority Queue tabs.
 * Tab options:
 * - 'urgent': Complaints with elevated priority / active hazards.
 * - 'overdue': Unresolved complaints waiting >= 72 hours.
 * - 'needs_assessment': Complaints requiring staff review or ambiguity check.
 */
export function filterPriorityQueueComplaints<T extends ComplaintPriorityInput>(
  complaints: T[],
  tab: QueueTabType,
  evaluationTime?: Date
): T[] {
  return complaints.filter((c) => {
    const evaluation = calculateComplaintPriority(c, evaluationTime);
    return evaluation.queueTabs.includes(tab);
  });
}

/**
 * Computes counts for each Priority Queue tab and total qualifying priority items.
 */
export function getPriorityQueueCounts<T extends ComplaintPriorityInput>(
  complaints: T[],
  evaluationTime?: Date
): { urgent: number; overdue: number; needsAssessment: number; total: number } {
  let urgent = 0;
  let overdue = 0;
  let needsAssessment = 0;
  let totalQualifying = 0;

  for (const c of complaints) {
    const evaluation = calculateComplaintPriority(c, evaluationTime);
    if (evaluation.qualifiesForPriorityQueue) {
      totalQualifying++;
    }
    if (evaluation.isUrgent) urgent++;
    if (evaluation.isOverdue) overdue++;
    if (evaluation.needsAssessment) needsAssessment++;
  }

  return {
    urgent,
    overdue,
    needsAssessment,
    total: totalQualifying,
  };
}

/**
 * Formats submission timestamp in Pakistan Standard Time (Asia/Karachi).
 * e.g., "15 Nov 2026 · 11:42 AM PKT"
 */
export function formatPakistanDateTime(isoString?: string | null): string {
  if (!isoString) return 'Time unavailable';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Time unavailable';

    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const datePart = dateFormatter.format(date);
    const timePart = timeFormatter.format(date);

    return `${datePart} · ${timePart} PKT`;
  } catch {
    return 'Time unavailable';
  }
}

/**
 * Sorts complaints by selected order with priority awareness and tiebreaks.
 */
export function sortComplaints<T extends ComplaintPriorityInput>(
  complaints: T[],
  sortOrder: 'newest' | 'oldest' | 'priority_high' | 'priority_low' | 'waiting_longest',
  evaluationTime?: Date
): T[] {
  const evaluatedMap = new Map<string | T, PriorityEvaluation>();
  for (const c of complaints) {
    evaluatedMap.set(c, calculateComplaintPriority(c, evaluationTime));
  }

  return [...complaints].sort((a, b) => {
    const evalA = evaluatedMap.get(a)!;
    const evalB = evaluatedMap.get(b)!;

    const timeA = new Date(a.submittedAt || a.created_at || 0).getTime();
    const timeB = new Date(b.submittedAt || b.created_at || 0).getTime();

    switch (sortOrder) {
      case 'newest':
        return timeB - timeA;

      case 'oldest':
        return timeA - timeB;

      case 'waiting_longest':
        return timeA - timeB;

      case 'priority_high': {
        const rankDiff = PRIORITY_RANKS[evalB.priority] - PRIORITY_RANKS[evalA.priority];
        if (rankDiff !== 0) return rankDiff;
        return timeA - timeB;
      }

      case 'priority_low': {
        const rankDiff = PRIORITY_RANKS[evalA.priority] - PRIORITY_RANKS[evalB.priority];
        if (rankDiff !== 0) return rankDiff;
        return timeB - timeA;
      }

      default:
        return timeB - timeA;
    }
  });
}
