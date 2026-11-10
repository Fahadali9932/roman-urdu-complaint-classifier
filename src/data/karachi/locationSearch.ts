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

export function searchKarachiLocalities(
  query: string,
  districtFilter?: KarachiDistrict | ''
): SearchLocalityResult[] {
  const q = query.trim().toLowerCase();

  // Filter pool by district if selected
  let pool = KARACHI_LOCALITIES_DATA;
  if (districtFilter) {
    pool = pool.filter((loc) => loc.district === districtFilter);
  }

  if (!q) {
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

  // Scored matching
  const scored: { item: LocalityRecord; score: number }[] = [];

  for (const loc of pool) {
    const nameLower = loc.name.toLowerCase();
    const urduMatch = loc.nameUrdu ? loc.nameUrdu.includes(q) : false;
    let score = 0;

    // 1. Exact canonical name match
    if (nameLower === q) {
      score = 100;
    }
    // 2. Starts with query
    else if (nameLower.startsWith(q)) {
      score = 80;
    }
    // 3. Exact alias match
    else if (loc.aliases && loc.aliases.some((a) => a.toLowerCase() === q)) {
      score = 75;
    }
    // 4. Alias starts with query
    else if (loc.aliases && loc.aliases.some((a) => a.toLowerCase().startsWith(q))) {
      score = 65;
    }
    // 5. Word boundary match in canonical name
    else if (nameLower.includes(` ${q}`)) {
      score = 50;
    }
    // 6. Substring in canonical name or aliases
    else if (nameLower.includes(q) || (loc.aliases && loc.aliases.some((a) => a.toLowerCase().includes(q)))) {
      score = 40;
    }
    // 7. Urdu script match
    else if (urduMatch) {
      score = 35;
    }
    // 8. Parent locality match (e.g. searching "Gulshan" matches "Gulshan-e-Iqbal Block 5")
    else if (loc.parentLocality && loc.parentLocality.toLowerCase().includes(q)) {
      score = 30;
    }

    if (score > 0) {
      scored.push({ item: loc, score });
    }
  }

  // Sort descending by score, then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  const results: SearchLocalityResult[] = scored.slice(0, 20).map(({ item }) => ({
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
    name: `My area is not listed (${query.trim() || 'Enter manually'})`,
    nameUrdu: 'میرا علاقہ فہرست میں موجود نہیں ہے (خود درج کریں)',
    district: 'Unresolved',
    category: 'manual',
    isManual: true,
  });

  return results;
}

export function findLocalityByNameOrId(nameOrId: string): LocalityRecord | undefined {
  const lower = nameOrId.trim().toLowerCase();
  return KARACHI_LOCALITIES_DATA.find(
    (loc) =>
      loc.id.toLowerCase() === lower ||
      loc.name.toLowerCase() === lower ||
      (loc.aliases && loc.aliases.some((a) => a.toLowerCase() === lower))
  );
}
