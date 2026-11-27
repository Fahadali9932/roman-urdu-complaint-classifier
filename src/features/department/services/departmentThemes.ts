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
  | 'admin'
  | 'selection';

export type StaffDepartmentKey =
  | 'kmc'
  | 'kelectric'
  | 'kwsc'
  | 'sswmb'
  | 'gas'
  | 'sbca';

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

export interface StaffDepartmentCard {
  key: StaffDepartmentKey;
  code: string;
  name: string;
  category: string;
  baseBg: string;
  midBg: string;
  accent: string;
  glow: string;
}

/** The 6 authorized municipal service departments for staff management (Central Admin excluded) */
export const STAFF_DEPARTMENTS: StaffDepartmentCard[] = [
  {
    key: 'kmc',
    code: 'KMC',
    name: 'Karachi Metropolitan Corporation',
    category: 'Roads & Infrastructure',
    baseBg: '#1B120C',
    midBg: '#79400F',
    accent: '#E5A044',
    glow: 'rgba(229, 160, 68, 0.35)',
  },
  {
    key: 'kelectric',
    code: 'K-Electric',
    name: 'K-Electric (Infrastructure & Distribution)',
    category: 'Power & Electricity',
    baseBg: '#0C1220',
    midBg: '#193F91',
    accent: '#548EFF',
    glow: 'rgba(84, 142, 255, 0.35)',
  },
  {
    key: 'kwsc',
    code: 'KW&SC',
    name: 'Karachi Water & Sewerage Corporation',
    category: 'Water & Sewerage',
    baseBg: '#081B1E',
    midBg: '#11666E',
    accent: '#42C6C9',
    glow: 'rgba(66, 198, 201, 0.35)',
  },
  {
    key: 'sswmb',
    code: 'SSWMB',
    name: 'Sindh Solid Waste Management Board',
    category: 'Solid Waste Management',
    baseBg: '#0C1B14',
    midBg: '#20643D',
    accent: '#58C78C',
    glow: 'rgba(88, 199, 140, 0.35)',
  },
  {
    key: 'gas',
    code: 'SSGC',
    name: 'Sui Southern Gas Company',
    category: 'Gas & Transmission',
    baseBg: '#210D13',
    midBg: '#8C243D',
    accent: '#EC667B',
    glow: 'rgba(236, 102, 123, 0.35)',
  },
  {
    key: 'sbca',
    code: 'SBCA',
    name: 'Sindh Building Control Authority',
    category: 'Building Control',
    baseBg: '#170F24',
    midBg: '#57328B',
    accent: '#AA80E8',
    glow: 'rgba(170, 128, 232, 0.35)',
  },
];

export const SELECTION_ATMOSPHERE: DepartmentAtmosphere = {
  key: 'selection',
  label: 'Department Selection',
  category: 'Staff Authentication',
  deep: '#101215',
  mid: '#303741',
  highlight: '#65717F',
  lightBase: '#F6F7F9',
  lightMid: '#E8EBEF',
  lightDeep: '#D5DAE2',
  spotlightDark: 'rgba(101, 113, 127, 0.10)',
};

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
  selection: SELECTION_ATMOSPHERE,
};

/**
 * Normalizes any department ID, code, or alias to an authorized department key.
 * Unknown codes fallback safely to neutral 'selection' or 'admin'.
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
  if (norm === 'selection' || norm === 'none') return 'selection';

  return 'admin';
}

export function getDepartmentAtmosphere(raw?: string | null): DepartmentAtmosphere {
  const key = canonicalizeDepartmentKey(raw);
  return DEPARTMENT_ATMOSPHERES[key] || DEPARTMENT_ATMOSPHERES.selection;
}
