import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type DepartmentId, type Department } from '../types';
import { KARACHI_DEPARTMENTS } from '../mocks/complaints';

export interface DepartmentOfficerProfile {
  id: string;
  name: string;
  nameUrdu: string;
  badgeNumber: string;
  role: string;
  roleUrdu: string;
}

export interface DepartmentAuthContextType {
  departmentId: DepartmentId;
  departmentMeta: Department;
  availableDepartments: Department[];
  officer: DepartmentOfficerProfile;
  setDepartment: (id: DepartmentId) => void;
  isAuthenticated: boolean;
  signIn: (deptId: DepartmentId) => void;
  signOut: () => void;
}

const DEFAULT_OFFICERS: Record<DepartmentId, DepartmentOfficerProfile> = {
  kelectric: {
    id: 'off-ke-4109',
    name: 'Engr. Tariq Aziz',
    nameUrdu: 'انجینئر طارق عزیز',
    badgeNumber: 'KE-OPS-4109',
    role: 'Senior Distribution Engineer',
    roleUrdu: 'سینئر ڈسٹری بیوشن انجینئر',
  },
  sswmb: {
    id: 'off-sswmb-2041',
    name: 'Inspector Farhan Ali',
    nameUrdu: 'انسپکٹر فرحان علی',
    badgeNumber: 'SSWMB-INS-2041',
    role: 'Zonal Sanitation Inspector',
    roleUrdu: 'زونل سینی ٹیشن انسپکٹر',
  },
  ssgc: {
    id: 'off-ssgc-8820',
    name: 'Engr. Asim Mansoor',
    nameUrdu: 'انجینئر عاصم منصور',
    badgeNumber: 'SSGC-TECH-8820',
    role: 'Gas Operations Officer',
    roleUrdu: 'گیس آپریشنز افسر',
  },
  kwsc: {
    id: 'off-kwsc-1104',
    name: 'Rashid Minhas',
    nameUrdu: 'راشد منہاس',
    badgeNumber: 'KWSC-OPS-1104',
    role: 'Executive Water Engineer',
    roleUrdu: 'ایگزیکٹو واٹر انجینئر',
  },
  kmc: {
    id: 'off-kmc-3329',
    name: 'Khalid Mehmood',
    nameUrdu: 'خالد محمود',
    badgeNumber: 'KMC-CIV-3329',
    role: 'Municipal Works Inspector',
    roleUrdu: 'میونسپل ورکس انسپکٹر',
  },
  sbca: {
    id: 'off-sbca-7701',
    name: 'S. N. Rizvi',
    nameUrdu: 'ایس این رضوی',
    badgeNumber: 'SBCA-REG-7701',
    role: 'Building Regulation Officer',
    roleUrdu: 'بلڈنگ ریگولیشن آفیسر',
  },
  unassigned: {
    id: 'off-gen-0000',
    name: 'Desk Officer',
    nameUrdu: 'ڈیسک افسر',
    badgeNumber: 'TRIAGE-0000',
    role: 'General Triage Officer',
    roleUrdu: 'جنرل ٹرائج افسر',
  },
};

const VALID_DEPARTMENT_IDS: DepartmentId[] = [
  'kelectric',
  'sswmb',
  'ssgc',
  'kwsc',
  'kmc',
  'sbca',
];

export const DepartmentAuthContext = createContext<DepartmentAuthContextType | undefined>(
  undefined
);

export const DepartmentAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [departmentId, setDepartmentIdState] = useState<DepartmentId>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('awaaz_department_id') as DepartmentId;
        if (stored && VALID_DEPARTMENT_IDS.includes(stored)) {
          return stored;
        }
      }
    } catch {
      // Fallback to default
    }
    return 'kelectric';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('awaaz_department_auth');
        if (storedAuth === 'false') return false;
      }
    } catch {
      // Fallback
    }
    return true; // authenticated by default for quick civic access
  });

  const availableDepartments: Department[] = VALID_DEPARTMENT_IDS.map(
    (id) => KARACHI_DEPARTMENTS[id]
  ).filter(Boolean);

  const departmentMeta: Department =
    KARACHI_DEPARTMENTS[departmentId] || KARACHI_DEPARTMENTS.kelectric;

  const officer: DepartmentOfficerProfile =
    DEFAULT_OFFICERS[departmentId] || DEFAULT_OFFICERS.kelectric;

  const setDepartment = (newId: DepartmentId) => {
    if (!VALID_DEPARTMENT_IDS.includes(newId)) return;
    setDepartmentIdState(newId);
    try {
      localStorage.setItem('awaaz_department_id', newId);
    } catch {
      // Ignore
    }
  };

  const signIn = (deptId: DepartmentId) => {
    setDepartment(deptId);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('awaaz_department_auth', 'true');
    } catch {
      // Ignore
    }
  };

  const signOut = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem('awaaz_department_auth', 'false');
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('awaaz_department_id', departmentId);
    } catch {
      // Ignore
    }
  }, [departmentId]);

  return (
    <DepartmentAuthContext.Provider
      value={{
        departmentId,
        departmentMeta,
        availableDepartments,
        officer,
        setDepartment,
        isAuthenticated,
        signIn,
        signOut,
      }}
    >
      {children}
    </DepartmentAuthContext.Provider>
  );
};

export const useDepartmentAuth = (): DepartmentAuthContextType => {
  const context = useContext(DepartmentAuthContext);
  if (!context) {
    throw new Error('useDepartmentAuth must be used within a DepartmentAuthProvider');
  }
  return context;
};
