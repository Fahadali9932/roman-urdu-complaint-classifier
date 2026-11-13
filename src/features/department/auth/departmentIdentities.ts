import { type DepartmentId } from '../../../types';

export interface DepartmentStaffIdentity {
  username: string;
  departmentId: DepartmentId;
  departmentCode: string;
  departmentName: string;
  authEmail: string;
  defaultTitle: string;
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
  },
  'electricity-01': {
    username: 'electricity-01',
    departmentId: 'kelectric',
    departmentCode: 'KE',
    departmentName: 'K-Electric (Infrastructure & Distribution)',
    authEmail: 'fahadmalik030121+electricity@gmail.com',
    defaultTitle: 'Operations Superintendent — Power Distribution',
  },
  'water-01': {
    username: 'water-01',
    departmentId: 'kwsc',
    departmentCode: 'KWSC',
    departmentName: 'Karachi Water & Sewerage Corporation (KW&SC)',
    authEmail: 'fahadmalik030121+water@gmail.com',
    defaultTitle: 'Sub-Divisional Officer — Water & Sewerage',
  },
  'gas-01': {
    username: 'gas-01',
    departmentId: 'ssgc',
    departmentCode: 'SSGC',
    departmentName: 'Sui Southern Gas Company (SSGC)',
    authEmail: 'fahadmalik030121+gas@gmail.com',
    defaultTitle: 'Field Engineer — Gas Transmission & Leakage',
  },
  'sanitation-01': {
    username: 'sanitation-01',
    departmentId: 'sswmb',
    departmentCode: 'SSWMB',
    departmentName: 'Sindh Solid Waste Management Board (SSWMB)',
    authEmail: 'fahadmalik030121+sanitation@gmail.com',
    defaultTitle: 'Zonal Inspector — Solid Waste Management',
  },
  'building-01': {
    username: 'building-01',
    departmentId: 'sbca',
    departmentCode: 'SBCA',
    departmentName: 'Sindh Building Control Authority (SBCA)',
    authEmail: 'fahadmalik030121+building@gmail.com',
    defaultTitle: 'Assistant Director — Building Control & Demolition',
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
  return DEPARTMENT_STAFF_IDENTITIES[normalized] || null;
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
 * Returns all active demonstration identities.
 */
export const getAllDepartmentIdentities = (): DepartmentStaffIdentity[] => {
  return Object.values(DEPARTMENT_STAFF_IDENTITIES);
};

