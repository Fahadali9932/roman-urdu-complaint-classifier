import { KarachiDistrict } from '../../types';
import { KARACHI_LOCALITIES_DATA, LocalityRecord } from './localities';
import { searchKarachiLocalities, SearchLocalityResult, normalizeSearchQuery } from './locationSearch';

export interface LocationResolutionResult {
  status: 'verified' | 'ambiguous' | 'unlisted';
  matchedLocality?: LocalityRecord;
  district?: KarachiDistrict;
  isAutoResolved: boolean;
  needsDistrictConfirmation: boolean;
  message?: string;
}

export interface LocationResolver {
  resolve(localityInput: string): LocationResolutionResult;
  search(query: string, districtFilter?: KarachiDistrict | ''): SearchLocalityResult[];
}

/**
 * Local verified Karachi Locality Resolver.
 * Uses Commissioner Karachi administrative boundaries, CLICK directory, and KDA town schemes.
 * Works 100% client-side with zero external API calls or billing requirements.
 */
export class KarachiLocalityResolver implements LocationResolver {
  search(query: string, districtFilter?: KarachiDistrict | ''): SearchLocalityResult[] {
    return searchKarachiLocalities(query, districtFilter);
  }

  resolve(localityInput: string): LocationResolutionResult {
    const trimmed = localityInput.trim();
    if (!trimmed) {
      return {
        status: 'unlisted',
        isAutoResolved: false,
        needsDistrictConfirmation: false,
      };
    }

    const normalized = normalizeSearchQuery(trimmed);

    // 1. Direct match by canonical name
    const exact = KARACHI_LOCALITIES_DATA.find(
      (loc) => normalizeSearchQuery(loc.name) === normalized
    );
    if (exact && exact.district && exact.district !== ('Unresolved' as any)) {
      return {
        status: 'verified',
        matchedLocality: exact,
        district: exact.district,
        isAutoResolved: true,
        needsDistrictConfirmation: false,
      };
    }

    // 2. Direct match by search alias (e.g., 'dha phase 6', 'johar', 'fb area')
    const aliasMatch = KARACHI_LOCALITIES_DATA.find(
      (loc) =>
        loc.aliases &&
        loc.aliases.some((alias) => normalizeSearchQuery(alias) === normalized)
    );
    if (aliasMatch && aliasMatch.district) {
      return {
        status: 'verified',
        matchedLocality: aliasMatch,
        district: aliasMatch.district,
        isAutoResolved: true,
        needsDistrictConfirmation: false,
      };
    }

    // 3. Substring match if unambiguous
    const candidates = KARACHI_LOCALITIES_DATA.filter(
      (loc) =>
        normalizeSearchQuery(loc.name).includes(normalized) ||
        (loc.aliases && loc.aliases.some((a) => normalizeSearchQuery(a).includes(normalized)))
    );

    if (candidates.length > 0) {
      // Check if all candidates belong to the same single district
      const districts = Array.from(new Set(candidates.map((c) => c.district)));
      if (districts.length === 1 && districts[0]) {
        return {
          status: 'verified',
          matchedLocality: candidates[0],
          district: districts[0],
          isAutoResolved: true,
          needsDistrictConfirmation: false,
        };
      } else {
        // Multi-district candidates (e.g. multiple "Gulshan" in different areas)
        return {
          status: 'ambiguous',
          isAutoResolved: false,
          needsDistrictConfirmation: true,
          message: 'Multiple areas match. Please confirm district.',
        };
      }
    }

    // 4. Custom / Unlisted locality
    return {
      status: 'unlisted',
      isAutoResolved: false,
      needsDistrictConfirmation: true,
      message: 'Unlisted locality. Please confirm district manually.',
    };
  }
}

/**
 * Default singleton instance of the Karachi Locality Resolver
 */
export const defaultLocalityResolver = new KarachiLocalityResolver();

/**
 * Future Google Maps Platform Resolver Placeholder.
 * Kept disabled in accordance with zero-spending and no-card constraints.
 */
export class GoogleMapsLocationResolver implements LocationResolver {
  search(): SearchLocalityResult[] {
    throw new Error('Google Maps autocomplete is disabled under project zero-spending constraints.');
  }

  resolve(): LocationResolutionResult {
    throw new Error('Google Maps geocoding is disabled under project zero-spending constraints.');
  }
}
