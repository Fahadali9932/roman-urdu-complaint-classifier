import { describe, it, expect } from 'vitest';
import { searchKarachiLocalities, findLocalityByNameOrId, MANUAL_AREA_ID } from '../data/karachi/locationSearch';
import { KARACHI_DISTRICTS_DATA } from '../data/karachi/districts';
import { KARACHI_SUBDIVISIONS_DATA } from '../data/karachi/subdivisions';
import { KARACHI_MUNICIPAL_TOWNS } from '../data/karachi/towns';
import { KARACHI_LOCALITIES_DATA } from '../data/karachi/localities';
import { KARACHI_LOCATION_SOURCES } from '../data/karachi/locationSources';

describe('Karachi Location Dataset Integrity & Search Engine', () => {
  it('contains all 7 Commissioner Karachi districts', () => {
    expect(KARACHI_DISTRICTS_DATA).toHaveLength(7);
    const districtNames = KARACHI_DISTRICTS_DATA.map((d) => d.id);
    expect(districtNames).toContain('District Central');
    expect(districtNames).toContain('District East');
    expect(districtNames).toContain('District South');
    expect(districtNames).toContain('District West');
    expect(districtNames).toContain('District Keamari');
    expect(districtNames).toContain('District Korangi');
    expect(districtNames).toContain('District Malir');
  });

  it('contains all 31 verified Commissioner Karachi subdivisions', () => {
    expect(KARACHI_SUBDIVISIONS_DATA).toHaveLength(31);
    const subIds = KARACHI_SUBDIVISIONS_DATA.map((s) => s.id);
    expect(subIds).toContain('gulberg');
    expect(subIds).toContain('gulshan-e-iqbal');
    expect(subIds).toContain('civil-lines');
    expect(subIds).toContain('lyari');
    expect(subIds).toContain('saddar');
    expect(subIds).toContain('baldia');
    expect(subIds).toContain('korangi');
    expect(subIds).toContain('bin-qasim');
  });

  it('contains the 25 verified Sindh LG 2023 municipal towns', () => {
    expect(KARACHI_MUNICIPAL_TOWNS).toHaveLength(25);
    const townIds = KARACHI_MUNICIPAL_TOWNS.map((t) => t.id);
    expect(townIds).toContain('gulshan-iqbal-town');
    expect(townIds).toContain('saddar-town');
    expect(townIds).toContain('lyari-town');
    expect(townIds).toContain('orangi-town');
    expect(townIds).toContain('mauripur-town');
    expect(townIds).toContain('korangi-town');
  });

  it('contains zero duplicate locality IDs and no empty names', () => {
    const ids = new Set<string>();
    for (const loc of KARACHI_LOCALITIES_DATA) {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(loc.district).toBeTruthy();
      expect(ids.has(loc.id)).toBe(false);
      ids.add(loc.id);
    }
    expect(KARACHI_LOCALITIES_DATA.length).toBeGreaterThan(100);
  });

  it('documents authentic provenance sources', () => {
    expect(KARACHI_LOCATION_SOURCES.length).toBeGreaterThanOrEqual(4);
    const urls = KARACHI_LOCATION_SOURCES.map((s) => s.sourceUrl);
    expect(urls).toContain('https://commissionerkarachi.gos.pk/area-map');
    expect(urls).toContain('https://click.gos.pk/karachiuc');
  });

  it('searches by canonical name and returns matching results (e.g. "Clifton", "Gulshan")', () => {
    const cliftonResults = searchKarachiLocalities('Clifton');
    expect(cliftonResults.length).toBeGreaterThan(0);
    expect(cliftonResults.some((r) => r.name.includes('Clifton'))).toBe(true);

    const gulshanResults = searchKarachiLocalities('Gulshan');
    expect(gulshanResults.length).toBeGreaterThan(0);
    expect(gulshanResults.some((r) => r.name.includes('Gulshan-e-Iqbal'))).toBe(true);
  });

  it('matches common colloquial spelling aliases (e.g. "Johar" -> Gulistan-e-Jauhar)', () => {
    const joharResults = searchKarachiLocalities('Johar');
    expect(joharResults.some((r) => r.name.includes('Gulistan-e-Jauhar'))).toBe(true);

    const jauharResults = searchKarachiLocalities('Jauhar');
    expect(jauharResults.some((r) => r.name.includes('Gulistan-e-Jauhar'))).toBe(true);
  });

  it('matches abbreviation aliases (e.g. "FB Area" / "F.B. Area" -> Federal B Area, "DHA" -> DHA Defence)', () => {
    const fbResults = searchKarachiLocalities('FB Area');
    expect(fbResults.some((r) => r.name.includes('Federal B Area'))).toBe(true);

    const dhaResults = searchKarachiLocalities('DHA');
    expect(dhaResults.some((r) => r.name.includes('DHA Defence'))).toBe(true);

    const defenseResults = searchKarachiLocalities('Defence');
    expect(defenseResults.some((r) => r.name.includes('DHA Defence'))).toBe(true);
  });

  it('filters results by district when a district is selected', () => {
    const eastResults = searchKarachiLocalities('', 'District East');
    expect(eastResults.length).toBeGreaterThan(0);
    const nonManual = eastResults.filter((r) => !r.isManual);
    nonManual.forEach((r) => {
      expect(r.district).toBe('District East');
    });
  });

  it('always provides the "My area is not listed" fallback option', () => {
    const results = searchKarachiLocalities('completely-unknown-remote-sector-999');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(MANUAL_AREA_ID);
    expect(results[0].isManual).toBe(true);
  });

  it('finds locality by name or id accurately', () => {
    const loc = findLocalityByNameOrId('dha-defence');
    expect(loc).toBeDefined();
    expect(loc?.name).toBe('DHA Defence');
    expect(loc?.district).toBe('District South');

    const byAlias = findLocalityByNameOrId('jauhar');
    expect(byAlias).toBeDefined();
    expect(byAlias?.id).toBe('gulistan-e-jauhar');
  });
});
