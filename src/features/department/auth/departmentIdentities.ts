import { type DepartmentId } from '../../../types';

export interface DepartmentStaffIdentity {
  username: string;
  departmentId: DepartmentId;
  departmentCode: string;
  departmentName: string;
  authEmail: string;
  defaultTitle: string;
  /** Local-only role and identity for offline presentations; never used for live authorization. */
  demoRole?: 'head' | 'officer';
  demoUserId?: string;
}

export const VERIFICATION_RECOVERY_EMAIL = 'fahadmalik030121@gmail.com';

export const DEPARTMENT_STAFF_IDENTITIES: Record<string, DepartmentStaffIdentity> = {
  'roads-01': {
    username: 'roads-01',
    departmentId: 'kmc',
    departmentCode: 'KMC',
    departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
    authEmail: 'fahadmalik030121+roads@gmail.com',
    defaultTitle: 'Executive Engineer — Roads & Infrastructure',
    demoRole: 'head',
    demoUserId: 'staff-kmc-demo-head-01',
  },
  'roads-02': {
    username: 'roads-02',
    departmentId: 'kmc',
    departmentCode: 'KMC',
    departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
    authEmail: 'fahadmalik030121+roads-officer@gmail.com',
    defaultTitle: 'Field Officer — Roads & Infrastructure',
    demoRole: 'officer',
    demoUserId: 'local-officer-a',
  },
  'electricity-01': {
    username: 'electricity-01',
    departmentId: 'kelectric',
    departmentCode: 'KE',
    departmentName: 'K-Electric (Infrastructure & Distribution)',
    authEmail: 'fahadmalik030121+electricity@gmail.com',
    defaultTitle: 'Operations Superintendent — Power Distribution',
    demoRole: 'head',
    demoUserId: 'staff-kelectric-demo-head-01',
  },
  'water-01': {
    username: 'water-01',
    departmentId: 'kwsc',
    departmentCode: 'KWSC',
    departmentName: 'Karachi Water & Sewerage Corporation (KW&SC)',
    authEmail: 'fahadmalik030121+water@gmail.com',
    defaultTitle: 'Sub-Divisional Officer — Water & Sewerage',
    demoRole: 'head',
    demoUserId: 'staff-kwsc-demo-head-01',
  },
  'gas-01': {
    username: 'gas-01',
    departmentId: 'ssgc',
    departmentCode: 'SSGC',
    departmentName: 'Sui Southern Gas Company (SSGC)',
    authEmail: 'fahadmalik030121+gas@gmail.com',
    defaultTitle: 'Field Engineer — Gas Transmission & Leakage',
    demoRole: 'head',
    demoUserId: 'staff-ssgc-demo-head-01',
  },
  'sanitation-01': {
    username: 'sanitation-01',
    departmentId: 'sswmb',
    departmentCode: 'SSWMB',
    departmentName: 'Sindh Solid Waste Management Board (SSWMB)',
    authEmail: 'fahadmalik030121+sanitation@gmail.com',
    defaultTitle: 'Zonal Inspector — Solid Waste Management',
    demoRole: 'head',
    demoUserId: 'staff-sswmb-demo-head-01',
  },
  'building-01': {
    username: 'building-01',
    departmentId: 'sbca',
    departmentCode: 'SBCA',
    departmentName: 'Sindh Building Control Authority (SBCA)',
    authEmail: 'fahadmalik030121+building@gmail.com',
    defaultTitle: 'Assistant Director — Building Control & Demolition',
    demoRole: 'head',
    demoUserId: 'staff-sbca-demo-head-01',
  },
};

/** Additional field officer demo accounts across departments for offline demonstrations */
export const ADDITIONAL_OFFICER_IDENTITIES: Record<string, DepartmentStaffIdentity> = {
  'electricity-02': {
    username: 'electricity-02',
    departmentId: 'kelectric',
    departmentCode: 'KE',
    departmentName: 'K-Electric (Infrastructure & Distribution)',
    authEmail: 'fahadmalik030121+electricity-officer@gmail.com',
    defaultTitle: 'Field Officer — Power Distribution',
    demoRole: 'officer',
    demoUserId: 'local-officer-ke',
  },
  'water-02': {
    username: 'water-02',
    departmentId: 'kwsc',
    departmentCode: 'KWSC',
    departmentName: 'Karachi Water & Sewerage Corporation (KW&SC)',
    authEmail: 'fahadmalik030121+water-officer@gmail.com',
    defaultTitle: 'Field Officer — Water & Sewerage',
    demoRole: 'officer',
    demoUserId: 'local-officer-kwsc',
  },
  'gas-02': {
    username: 'gas-02',
    departmentId: 'ssgc',
    departmentCode: 'SSGC',
    departmentName: 'Sui Southern Gas Company (SSGC)',
    authEmail: 'fahadmalik030121+gas-officer@gmail.com',
    defaultTitle: 'Field Officer — Gas Transmission & Leakage',
    demoRole: 'officer',
    demoUserId: 'local-officer-gas',
  },
  'sanitation-02': {
    username: 'sanitation-02',
    departmentId: 'sswmb',
    departmentCode: 'SSWMB',
    departmentName: 'Sindh Solid Waste Management Board (SSWMB)',
    authEmail: 'fahadmalik030121+sanitation-officer@gmail.com',
    defaultTitle: 'Field Officer — Solid Waste Management',
    demoRole: 'officer',
    demoUserId: 'local-officer-sswmb',
  },
  'building-02': {
    username: 'building-02',
    departmentId: 'sbca',
    departmentCode: 'SBCA',
    departmentName: 'Sindh Building Control Authority (SBCA)',
    authEmail: 'fahadmalik030121+building-officer@gmail.com',
    defaultTitle: 'Field Officer — Building Control & Demolition',
    demoRole: 'officer',
    demoUserId: 'local-officer-sbca',
  },
};

/**
 * Resolves a case-insensitive username to its official DepartmentStaffIdentity.
 * Never throws; returns null if the username is unassigned.
 */
export const resolveDepartmentIdentity = (
  rawUsername: string
): DepartmentStaffIdentity | null => {
  if (!rawUsername || typeof rawUsername !== 'string') return null;
  const normalized = rawUsername.trim().toLowerCase();
  return DEPARTMENT_STAFF_IDENTITIES[normalized] || ADDITIONAL_OFFICER_IDENTITIES[normalized] || null;
};

/**
 * Retrieves the identity configured for a given department ID.
 */
export const getIdentityByDepartmentId = (
  deptId: DepartmentId
): DepartmentStaffIdentity | null => {
  return (
    Object.values(DEPARTMENT_STAFF_IDENTITIES).find(
      (item) => item.departmentId === deptId
    ) || null
  );
};

/**
 * Returns all active baseline demonstration identities (6 heads + 1 KMC officer).
 */
export const getAllDepartmentIdentities = (): DepartmentStaffIdentity[] => {
  return Object.values(DEPARTMENT_STAFF_IDENTITIES);
};

/** Demo-only mapping. Production roles always come from Supabase memberships. */
export const getLocalDemoStaffRole = (
  departmentId: string,
  userId: string,
): 'head' | 'officer' | null => {
  const normUserId = userId.toLowerCase();
  const allIdentities = [
    ...Object.values(DEPARTMENT_STAFF_IDENTITIES),
    ...Object.values(ADDITIONAL_OFFICER_IDENTITIES),
  ];
  const identity = allIdentities.find((item) => {
    if (item.departmentId !== departmentId) return false;
    if (item.demoUserId && item.demoUserId.toLowerCase() === normUserId) return true;
    if (item.username.toLowerCase() === normUserId) return true;
    if (item.demoRole === 'head' && normUserId === `staff-${item.departmentId}-demo-01`) return true;
    return false;
  });
  return identity ? identity.demoRole ?? 'head' : null;
};

