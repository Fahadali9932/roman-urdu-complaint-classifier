/**
 * AWAAZ-E-AWAM — Official Department Atmosphere & Theme Registry (V22.1)
 *
 * Single authoritative source of truth for departmental visual identity,
 * ensuring strict single-hue atmospheric gradients without cross-department leakage.
 */

export type AuthorizedDepartmentKey =
  | 'kmc'
  | 'kelectric'
  | 'kwsc'
  | 'sswmb'
  | 'gas'
  | 'sbca'
  | 'admin';

export interface DepartmentAtmosphere {
  key: AuthorizedDepartmentKey;
  label: string;
  category: string;
  deep: string;
  mid: string;
  highlight: string;
  lightBase: string;
  lightMid: string;
  lightDeep: string;
  spotlightDark: string;
}

export const DEPARTMENT_ATMOSPHERES: Record<AuthorizedDepartmentKey, DepartmentAtmosphere> = {
  kmc: {
    key: 'kmc',
    label: 'KMC',
    category: 'Roads & Infrastructure',
    deep: '#1B120C',
    mid: '#79400F',
    highlight: '#E5A044',
    lightBase: '#FAF7F0',
    lightMid: '#F5EFE0',
    lightDeep: '#EDE2CE',
    spotlightDark: 'rgba(229, 160, 68, 0.10)',
  },
  kelectric: {
    key: 'kelectric',
    label: 'K-Electric',
    category: 'Power & Electricity',
    deep: '#0C1220',
    mid: '#193F91',
    highlight: '#548EFF',
    lightBase: '#F4F7FC',
    lightMid: '#E8EFF9',
    lightDeep: '#D7E3F4',
    spotlightDark: 'rgba(84, 142, 255, 0.10)',
  },
  kwsc: {
    key: 'kwsc',
    label: 'KW&SC',
    category: 'Water & Sewerage',
    deep: '#081B1E',
    mid: '#11666E',
    highlight: '#42C6C9',
    lightBase: '#F3F9FA',
    lightMid: '#E5F3F5',
    lightDeep: '#D1E9ED',
    spotlightDark: 'rgba(66, 198, 201, 0.10)',
  },
  sswmb: {
    key: 'sswmb',
    label: 'SSWMB',
    category: 'Solid Waste Management',
    deep: '#0C1B14',
    mid: '#20643D',
    highlight: '#58C78C',
    lightBase: '#F4F9F5',
    lightMid: '#E6F3E9',
    lightDeep: '#D3E9D9',
    spotlightDark: 'rgba(88, 199, 140, 0.10)',
  },
  gas: {
    key: 'gas',
    label: 'SSGC',
    category: 'Gas & Transmission',
    deep: '#210D13',
    mid: '#8C243D',
    highlight: '#EC667B',
    lightBase: '#FAF4F5',
    lightMid: '#F5E7EA',
    lightDeep: '#EED2D8',
    spotlightDark: 'rgba(236, 102, 123, 0.10)',
  },
  sbca: {
    key: 'sbca',
    label: 'SBCA',
    category: 'Building Control',
    deep: '#170F24',
    mid: '#57328B',
    highlight: '#AA80E8',
    lightBase: '#F8F5FA',
    lightMid: '#F0EAF5',
    lightDeep: '#E2D7EB',
    spotlightDark: 'rgba(170, 128, 232, 0.10)',
  },
  admin: {
    key: 'admin',
    label: 'Central Admin',
    category: 'Municipal Oversight',
    deep: '#101318',
    mid: '#414B5A',
    highlight: '#A4B2C5',
    lightBase: '#F4F5F7',
    lightMid: '#E7E9ED',
    lightDeep: '#D5D9E0',
    spotlightDark: 'rgba(164, 178, 197, 0.10)',
  },
};

/**
 * Normalizes any department ID, code, or alias to an authorized department key.
 * Unknown codes fallback safely to neutral 'admin' rather than KMC orange.
 */
export function canonicalizeDepartmentKey(raw?: string | null): AuthorizedDepartmentKey {
  if (!raw) return 'admin';
  const norm = raw.trim().toLowerCase().replace(/^dept-/, '');

  if (norm === 'kmc' || norm === 'roads' || norm === 'infrastructure') return 'kmc';
  if (norm === 'kelectric' || norm === 'ke' || norm === 'electric' || norm === 'electricity') return 'kelectric';
  if (norm === 'kwsc' || norm === 'kwsb' || norm === 'water' || norm === 'sewerage') return 'kwsc';
  if (norm === 'sswmb' || norm === 'sanitation' || norm === 'waste') return 'sswmb';
  if (norm === 'gas' || norm === 'ssgc' || norm === 'sngpl' || norm === 'sui_gas') return 'gas';
  if (norm === 'sbca' || norm === 'building' || norm === 'demolition') return 'sbca';
  if (norm === 'admin' || norm === 'central' || norm === 'superadmin') return 'admin';

  return 'admin';
}

export function getDepartmentAtmosphere(raw?: string | null): DepartmentAtmosphere {
  const key = canonicalizeDepartmentKey(raw);
  return DEPARTMENT_ATMOSPHERES[key] || DEPARTMENT_ATMOSPHERES.admin;
}
