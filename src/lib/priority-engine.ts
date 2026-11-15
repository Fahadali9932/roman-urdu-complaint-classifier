/**
 * Roman Urdu Complaint Priority & Aging Escalation Engine
 * Greenwich University, Karachi, Pakistan
 *
 * Deterministic civic triage based on:
 * 1. Intrinsic severity of the reported municipal grievance (Roman Urdu & English analysis).
 * 2. Queue waiting duration (aging escalation after 72h and 7 days for unresolved complaints).
 * 3. Authorized staff manual override with auditability.
 *
 * PRIVACY GUARANTEE: Never logs or exposes citizen PII.
 */

export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low';

export interface PriorityEvaluation {
  priority: PriorityLevel;
  baseSeverity: PriorityLevel;
  agingHours: number;
  escalatedByAging: boolean;
  isManualOverride: boolean;
  severityReason: string;
  explanation: string;
  overriddenBy?: string;
  overriddenAt?: string;
  overrideReason?: string;
}

export interface ComplaintPriorityInput {
  id?: string;
  description: string;
  sanitizedDescription?: string | null;
  generatedHeading?: string | null;
  factualSummary?: string | null;
  status: string;
  submittedAt?: string;
  created_at?: string;
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

  // 1. CRITICAL: Immediate danger to human life or safety
  // A. Gas leak or cylinder explosion risk
  // Ensure "gas nahi aa rahi" is NOT detected as leak
  const gasLeakPattern = /\b(gas(\s+(pipe|pipeline|line))?(\s+ki)?\s*(leak|leakage|boo|badboo|smell)|(gas\s*)?pipeline\s*(phat|blast|leak|burst)|cylinder\s*(phat|blast|leek))\b/i;
  if (findNonNegatedMatch(norm, gasLeakPattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Reported gas leakage with immediate fire or explosion hazard.',
    };
  }

  // B. Exposed live electrical wires / electrocution hazard
  // Note: "current nahi aa rahi" is outage, not shock hazard.
  const liveWirePattern = /\b(live\s*wire|khula\s*taar|khulay\s*taar|taar\s*toot|khamb(a|e|ay)\s*se\s*current|current\s*lag\s*raha|current\s*aa\s*raha|transformer\s*(blast|aag|sparking)|bijli\s*ka\s*shola)\b/i;
  if (findNonNegatedMatch(norm, liveWirePattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Exposed electrical wiring or active electrocution hazard.',
    };
  }

  // C. Structural collapse or deep collapse on active transit routes
  const collapsePattern = /\b(bridge\s*toot|pul\s*toot|road\s*dhans|building\s*gir|deewar\s*girne|deep\s*sinkhole|gehra\s*gaddha\s*hadsa)\b/i;
  if (findNonNegatedMatch(norm, collapsePattern)) {
    return {
      baseSeverity: 'critical',
      reason: 'Imminent structural collapse or severe road subsidence creating active life hazard.',
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

  // B. Major sewage overflow creating severe health hazard / entering homes
  const sewageHealthPattern = /\b(sewage|gutter|ganda\s*pani)\s*(ghar|gharon|dakhil|ghus|flooding|bimari|infection|overflow)\b/i;
  if (findNonNegatedMatch(norm, sewageHealthPattern)) {
    return {
      baseSeverity: 'high',
      reason: 'Major sewage overflow entering residential properties or causing health risk.',
    };
  }

  // C. Dangerous road damage with high accident risk
  const dangerousRoadPattern = /\b(dangerous|khatarnak|shadeed\s*khadday|hadsa|accident|gaari\s*gir)\b/i;
  const isRoadIssue = /\b(road|sarak|sadak|pothole|khadda|khadday|pathor)\b/i.test(norm);
  if (isRoadIssue && findNonNegatedMatch(norm, dangerousRoadPattern)) {
    return {
      baseSeverity: 'high',
      reason: 'Dangerous road condition posing immediate vehicular or pedestrian accident hazard.',
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

  // 4. NORMAL: Standard civic maintenance
  // Default routine road damage, standard water pressure issues, routine waste pickup
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
 * Calculates priority with aging escalation and manual overrides.
 *
 * Aging rules:
 * - Unresolved complaints waiting >= 72 hours escalate by 1 level (Low -> Normal, Normal -> High, High -> Critical).
 * - Unresolved complaints waiting >= 168 hours (7 days) escalate by 2 levels (Low -> High, Normal -> Critical, High -> Critical).
 * - Resolved or Rejected complaints NEVER escalate.
 * - Manual overrides take precedence and are not silently overwritten by aging.
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

  // Timestamp calculation
  const rawTimestamp = complaint.submittedAt || complaint.created_at;
  let agingHours = 0;
  if (rawTimestamp) {
    const submitDate = new Date(rawTimestamp);
    if (!isNaN(submitDate.getTime())) {
      const current = evaluationTime || new Date();
      agingHours = Math.max(0, Math.floor((current.getTime() - submitDate.getTime()) / (1000 * 60 * 60)));
    }
  }

  // Check if complaint is closed (no aging for resolved/rejected)
  const isClosed = complaint.status === 'resolved' || complaint.status === 'rejected';

  // Check manual override
  if (complaint.manualPriority) {
    const p = complaint.manualPriority;
    const author = complaint.manualPriorityBy || 'Authorized Officer';
    const reason = complaint.manualPriorityReason || 'Operational staff review';
    return {
      priority: p,
      baseSeverity,
      agingHours,
      escalatedByAging: false,
      isManualOverride: true,
      severityReason,
      explanation: `${p.toUpperCase()} priority — Manually adjusted by ${author}: "${reason}".`,
      overriddenBy: author,
      overriddenAt: complaint.manualPriorityAt || undefined,
      overrideReason: reason,
    };
  }

  // Aging Escalation logic
  let priority = baseSeverity;
  let escalatedByAging = false;
  let agingNote = '';

  if (!isClosed && agingHours >= 72) {
    if (agingHours >= 168) {
      // 7 days or more: bump 2 levels
      if (baseSeverity === 'low') priority = 'high';
      else if (baseSeverity === 'normal' || baseSeverity === 'high') priority = 'critical';
      escalatedByAging = priority !== baseSeverity;
      agingNote = `Escalated to ${priority.toUpperCase()} — Overdue by ${Math.floor(agingHours / 24)} days (${agingHours} hours) without departmental resolution.`;
    } else {
      // 72 hours to 6.99 days: bump 1 level
      if (baseSeverity === 'low') priority = 'normal';
      else if (baseSeverity === 'normal') priority = 'high';
      else if (baseSeverity === 'high') priority = 'critical';
      escalatedByAging = priority !== baseSeverity;
      agingNote = `Escalated to ${priority.toUpperCase()} — Unresolved after ${agingHours} hours waiting for department action.`;
    }
  }

  const explanation = escalatedByAging
    ? `${agingNote} (Initial severity basis: ${severityReason})`
    : `${priority.toUpperCase()} priority — ${severityReason}`;

  return {
    priority,
    baseSeverity,
    agingHours,
    escalatedByAging,
    isManualOverride: false,
    severityReason,
    explanation,
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
        // Oldest unresolved first
        return timeA - timeB;

      case 'priority_high': {
        const rankDiff = PRIORITY_RANKS[evalB.priority] - PRIORITY_RANKS[evalA.priority];
        if (rankDiff !== 0) return rankDiff;
        // Tiebreak: oldest waiting first
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
