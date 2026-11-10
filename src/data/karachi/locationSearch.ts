import Fuse, { type IFuseOptions } from 'fuse.js';
import { KarachiDistrict } from '../../types';
import { KARACHI_LOCALITIES_DATA, LocalityRecord } from './localities';

export interface SearchLocalityResult {
  id: string;
  name: string;
  nameUrdu?: string;
  district: KarachiDistrict | 'Unresolved';
  parentLocality?: string;
  category: string;
  isManual?: boolean;
}

export const MANUAL_AREA_ID = 'manual-area';

/**
 * Text normalizer for Karachi place names.
 * Strips punctuation, hyphens, periods, and collapses whitespace.
 */
export function normalizeSearchQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.\-_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuse.js configuration for typo-tolerant fuzzy matching across Karachi localities.
 */
const fuseOptions: IFuseOptions<LocalityRecord> = {
  includeScore: true,
  threshold: 0.38,
  distance: 100,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'aliases', weight: 0.35 },
    { name: 'nameUrdu', weight: 0.2 },
    { name: 'parentLocality', weight: 0.2 },
    { name: 'subdivision', weight: 0.15 },
    { name: 'town', weight: 0.15 },
  ],
};

const fuseIndex = new Fuse(KARACHI_LOCALITIES_DATA, fuseOptions);

/**
 * Common abbreviations and roman urdu transliteration expansions for Karachi place names.
 */
const COMMON_REPLACEMENTS: Record<string, string> = {
  'fb area': 'federal b area',
  'f b area': 'federal b area',
  'fed b area': 'federal b area',
  dha: 'defence',
  johar: 'jauhar',
  sadar: 'saddar',
  kemari: 'keamari',
  kimari: 'keamari',
  korngi: 'korangi',
  gulshn: 'gulshan',
  nazmabad: 'nazimabad',
  'shara e quaideen': 'shahrah e quaideen',
  'shahra e qaidin': 'shahrah e quaideen',
  'shara e faisal': 'shahrah e faisal',
};

export function searchKarachiLocalities(
  query: string,
  districtFilter?: KarachiDistrict | ''
): SearchLocalityResult[] {
  const trimmed = query.trim();
  const normalized = normalizeSearchQuery(trimmed);

  // Filter pool by district if selected
  let pool = KARACHI_LOCALITIES_DATA;
  if (districtFilter) {
    pool = pool.filter((loc) => loc.district === districtFilter);
  }

  if (!trimmed) {
    // If no query, return top recognized neighbourhoods in that district or citywide
    const defaultList = pool.slice(0, 20).map((loc) => ({
      id: loc.id,
      name: loc.name,
      nameUrdu: loc.nameUrdu,
      district: loc.district,
      parentLocality: loc.parentLocality,
      category: loc.category,
    }));

    return [
      ...defaultList,
      {
        id: MANUAL_AREA_ID,
        name: 'My area is not listed (Enter manually)',
        nameUrdu: 'میرا علاقہ فہرست میں موجود نہیں ہے (خود درج کریں)',
        district: 'Unresolved',
        category: 'manual',
        isManual: true,
      },
    ];
  }

  // Map to store scored results: id -> { item, score }
  const resultMap = new Map<string, { item: LocalityRecord; score: number }>();

  // 1. Direct canonical / exact alias & prefix match on pool
  for (const loc of pool) {
    const locNameNorm = normalizeSearchQuery(loc.name);
    const aliasesNorm = (loc.aliases || []).map(normalizeSearchQuery);
    const parentNorm = loc.parentLocality ? normalizeSearchQuery(loc.parentLocality) : '';

    let directScore = 0;

    // Exact canonical name match
    if (locNameNorm === normalized) {
      directScore = 100;
    }
    // Starts with normalized query
    else if (locNameNorm.startsWith(normalized)) {
      directScore = 85;
    }
    // Exact alias match
    else if (aliasesNorm.some((a) => a === normalized)) {
      directScore = 90;
    }
    // Alias starts with query
    else if (aliasesNorm.some((a) => a.startsWith(normalized))) {
      directScore = 80;
    }
    // Word boundary match in canonical name
    else if (locNameNorm.includes(` ${normalized}`)) {
      directScore = 70;
    }
    // Word boundary match in alias
    else if (aliasesNorm.some((a) => a.includes(` ${normalized}`))) {
      directScore = 65;
    }
    // Substring match in canonical name or aliases
    else if (locNameNorm.includes(normalized) || aliasesNorm.some((a) => a.includes(normalized))) {
      directScore = 55;
    }
    // Parent locality match (e.g. searching "Gulshan" matches "Gulshan-e-Iqbal Block 5")
    else if (parentNorm && (parentNorm === normalized || parentNorm.includes(normalized))) {
      directScore = 45;
    }
    // Urdu script direct match
    else if (loc.nameUrdu && loc.nameUrdu.includes(trimmed)) {
      directScore = 60;
    }

    if (directScore > 0) {
      resultMap.set(loc.id, { item: loc, score: directScore });
    }
  }

  // 2. Expand common abbreviations / transliterations
  let expandedQuery = normalized;
  for (const [abbr, expansion] of Object.entries(COMMON_REPLACEMENTS)) {
    if (normalized.includes(abbr)) {
      expandedQuery = normalized.replace(abbr, expansion);
      break;
    }
  }

  // 3. Fuzzy search with Fuse.js (catches typos like 'Gulshn', 'Korngi', 'North Nazmabad', 'Shahra e Qaidin')
  const fuseResults = fuseIndex.search(expandedQuery.length > 0 ? expandedQuery : normalized);

  for (const res of fuseResults) {
    const loc = res.item;
    // Apply district filter if active
    if (districtFilter && loc.district !== districtFilter) continue;

    // Fuse score is 0 (best) to 1 (worst)
    // Map to 10 - 50 range so exact/prefix matches remain at the top
    const fuseScore = Math.max(10, Math.round((1 - (res.score || 0)) * 50));

    if (!resultMap.has(loc.id)) {
      resultMap.set(loc.id, { item: loc, score: fuseScore });
    } else {
      // If already present, slightly boost score
      const existing = resultMap.get(loc.id)!;
      existing.score = Math.max(existing.score, existing.score + 5);
    }
  }

  // Sort results descending by score, then alphabetically
  const sorted = Array.from(resultMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  const results: SearchLocalityResult[] = sorted.slice(0, 20).map(({ item }) => ({
    id: item.id,
    name: item.name,
    nameUrdu: item.nameUrdu,
    district: item.district,
    parentLocality: item.parentLocality,
    category: item.category,
  }));

  // Always append the manual entry fallback
  results.push({
    id: MANUAL_AREA_ID,
    name: `Can't find your area? Enter manually`,
    nameUrdu: 'میرا علاقہ فہرست میں موجود نہیں ہے (خود درج کریں)',
    district: 'Unresolved',
    category: 'manual',
    isManual: true,
  });

  return results;
}

export function findLocalityByNameOrId(nameOrId: string): LocalityRecord | undefined {
  const normalized = normalizeSearchQuery(nameOrId);
  return KARACHI_LOCALITIES_DATA.find((loc) => {
    if (loc.id.toLowerCase() === nameOrId.trim().toLowerCase()) return true;
    if (normalizeSearchQuery(loc.name) === normalized) return true;
    if (loc.aliases && loc.aliases.some((a) => normalizeSearchQuery(a) === normalized)) return true;
    return false;
  });
}
