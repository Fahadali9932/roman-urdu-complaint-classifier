/**
 * V13.6 — pre-routing evidence recovery.
 *
 * This deliberately runs before department selection/threshold filtering. It does
 * not treat a department name or a civic asset alone as an actionable defect.
 * Results are advisory: policy must still account for causality and negation.
 */
import { normalizeRomanUrduV13_2 } from '../v13_2/romanUrduNormalizer';
import {
  DepartmentId,
  segmentDiscourseClausesV13_4,
} from '../v13_4/issueRelationGraph';

export interface IndependentIssueEvidence {
  department: DepartmentId;
  span: string;
  asset: string;
  defect: string;
}

const ASSETS: Record<DepartmentId, RegExp> = {
  kmc: /\b(?:road|sarak|sadak|gali|footpath|flyover|bridge|underpass|divider|traffic\s*signal|street\s*lights?|batti|barsati\s*nala|nala|carpeting|asphalt|railing)\b/gi,
  kwsc: /\b(?:pani|water|water\s*supply|water\s*board|sewerage|sewer|sewr|gutter|manhole|dhakkan|drainage|pipeline|main\s*line|pipe)\b/gi,
  kelectric: /\b(?:bijli|light|transformer|feeder|taar|wire|pole|khamba|meter\s*box|voltage|load\s*shedding|phase\s*drop|short\s*circuit)\b/gi,
  ssgc: /\b(?:gas|sui\s*gas|chulha|gas\s*line|gas\s*connection|gas\s*pipeline|ssgc)\b/gi,
  sswmb: /\b(?:kachra|kooda|safai|dustbin|garbage|trash|solid\s*waste|sweeper|dumper|kundi)\b/gi,
  sbca: /\b(?:building|imarat|plaza|construction|tameer|plot|manzil|floor|chhat|deewar|pillar|commercial\s*plaza|basement|foundation|excavation)\b/gi,
};

const DEFECTS: Record<DepartmentId, RegExp> = {
  kmc: /\b(?:toot\w*|tut\w*|khadd\w*|khad\w*|gadd\w*|potholes?|crater|dhas\w*|kharab|damaged|fuse|andhera|choke|block|jam|ghayab|missing|daraar|railing\s*nahi|traffic\s*signal\s+.{0,35}\s+band)\b/gi,
  kwsc: /\b(?:nahi|band|sookh\w*|qillat|shortage|leak\w*|burst|phat\w*|toot\w*|overflow|ubal\w*|choke|block|ganda|mix|badboo|khula|gayab|ghayab|cut|reverse)\b/gi,
  kelectric: /\b(?:nahi|band|trip\w*|load\s*shedding|sparks?|sparking|dhamaka|blast|phat\w*|jal\w*|latak\w*|toot\w*|tut\w*|gir\w*|low|drop|shock|short\s*circuit|fluctuat\w*|phase)\b/gi,
  ssgc: /\b(?:nahi|band|low|zero|pressure|leak\w*|smell|badboo|boo|dhamaka|phat\w*|kharab|dead|hawa|daraar|crack\w*|dhas\w*|nikal\w*|khod\w*|khudai)\b/gi,
  sswmb: /\b(?:dher|nahi|uth\w*|bikhr\w*|gandagi|badboo|sad\w*|para|parha|jama|phail\w*|overflow|toot\w*|ghalazat|chor\w*|nikal\w*)\b/gi,
  sbca: /\b(?:illegal|ghair\s*qanooni|najaiz|baghair|bina|noc|permit|naqsha|map|crack\w*|daraar\w*|gir\w*|jhuk\w*|collapse|extra\s*floor|commercial\s*plaza|qanoon\s*shikan)\b/gi,
};

const DEPARTMENTS: DepartmentId[] = ['kmc', 'kwsc', 'kelectric', 'ssgc', 'sswmb', 'sbca'];

function matches(regex: RegExp, text: string): Array<{ value: string; index: number }> {
  return Array.from(text.matchAll(regex), (m) => ({ value: m[0], index: m.index ?? 0 }));
}

function closestPair(
  clause: string,
  assetRegex: RegExp,
  defectRegex: RegExp,
  maxWords = 11
): { asset: string; defect: string } | null {
  const assets = matches(assetRegex, clause);
  const defects = matches(defectRegex, clause);
  for (const asset of assets) {
    for (const defect of defects) {
      const start = Math.min(asset.index + asset.value.length, defect.index + defect.value.length);
      const end = Math.max(asset.index, defect.index);
      const gap = end > start ? clause.slice(start, end).trim().split(/\s+/).filter(Boolean).length : 0;
      if (gap <= maxWords) return { asset: asset.value, defect: defect.value };
    }
  }
  return null;
}

function isNegatedOrResolved(clause: string): boolean {
  return /\b(?:koi\s+)?(?:masla|issue|problem|shikayat)\s+(?:bilkul\s+)?(?:nahi|ni)\b|\b(?:ab|filhal)\s+(?:sab\s+)?(?:theek|hal|solve)\s+hai\b|\b(?:pehle|pichle)\b.{0,35}\b(?:theek|hal|repair)\s+(?:ho\s+gaya|ho\s+gayi|kar\s+di)\b|\b(?:bilkul\s+theek|sab\s+theek|behtareen|koi\s+(?:gaddha|khadda|gaddhe|khadday)\s+nahi)\b|\b(?:kachra|kooda)\b.{0,30}\b(?:roz|daily)\s+uth\w*\b|\b(?:koi\s+)?(?:ghair\s*qanooni|illegal|najaiz)\b.{0,45}\b(?:nahi|ni)\s+ban\w*\b/i.test(clause);
}

function isNonIndependentMention(dept: DepartmentId, clause: string): boolean {
  if (isNegatedOrResolved(clause)) return true;
  // Mentioning the road as the location of an electrical/garbage problem is
  // not evidence of damaged road infrastructure.
  if (dept === 'kmc' && /\b(?:road|sarak|sadak|gali|footpath)\s+(?:par|pe|mein)\s+(?:bijli|taar|wire|khamba|pole|kachra|gutter|gas)\b/i.test(clause) &&
      !/\b(?:road|sarak|sadak|gali|footpath|bridge)\b.{0,50}\b(?:toot\w*|tut\w*|khadd\w*|dhas\w*|kharab|damaged)\b/i.test(clause)) return true;
  if (dept === 'kwsc' && /\b(?:pani\s+(?:ki|wali)\s+(?:motor|machine)|water\s*pump|motor\s+nahi\s+chal|underground\s+water\s+pump)\b/i.test(clause) &&
      !/\b(?:water\s+board|sewerage|sewer|gutter|main\s+line|water\s+supply)\b/i.test(clause)) return true;
  return false;
}

/** Independent-issue enumeration and informal connectors are split without
 * removing their words, so the evidence remains attributable to source text. */
export function segmentIndependentIssuesV13_6(rawText: string): string[] {
  // Citizens use "or" as frequently as "aur" and often omit punctuation.
  // Only normalize this whole-word connective, preserving other spelling.
  const normalized = normalizeRomanUrduV13_2(rawText)
    .replace(/\bor\b/gi, 'aur')
    .replace(/\bsewr\b/gi, 'sewer');
  const segmented = normalized
    .replace(/\b(?:lekin|magar|but)\b/gi, '. $&')
    .replace(/[,;]\s*(?=(?:doyam|soyam|teesra|dusra|doosra|pehla|awwal|aur\s+soyam)\b)/gi, '. ')
    .replace(/\b(?:doyam|soyam|teesra|dusra|doosra|pehla|awwal)\s+(?:mazeed\s+)?(?:ye\s+)?(?:ke|k)\b/gi, '. $&');
  return segmentDiscourseClausesV13_4(segmented).filter((clause) => clause.trim().length > 5);
}

/** Requires a civic asset and a local affirmative defect, never a keyword alone. */
export function extractIndependentIssuesV13_6(rawText: string): IndependentIssueEvidence[] {
  const evidence: IndependentIssueEvidence[] = [];
  const clauses = segmentIndependentIssuesV13_6(rawText);
  for (const clause of clauses) {
    for (const dept of DEPARTMENTS) {
      const pair = closestPair(clause, ASSETS[dept], DEFECTS[dept]);
      if (!pair || isNonIndependentMention(dept, clause)) continue;
      // Ordinary light/phase words should not create K-Electric complaints if
      // the citizen only reported a municipal street-light defect.
      if (dept === 'kelectric' && /\bstreet\s+lights?\b/i.test(clause) &&
          !/\b(?:bijli|transformer|feeder|taar|wire|meter|voltage|load\s*shedding)\b/i.test(clause)) continue;
      evidence.push({ department: dept, span: clause, ...pair });
    }
  }
  return evidence;
}
