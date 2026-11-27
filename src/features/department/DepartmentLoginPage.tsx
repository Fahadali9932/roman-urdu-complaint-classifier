import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionScreen } from './DepartmentSelectionScreen';
import { ThemedDepartmentLoginScreen } from './ThemedDepartmentLoginScreen';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';
import type { StaffPosition } from './services/fieldOperations';
import { HodLoginPage } from './auth/HodLoginPage';
import { OfficerLoginPage } from './auth/OfficerLoginPage';

const VALID_DEPARTMENT_IDS: Record<string, DepartmentId> = {
  kmc: 'kmc',
  roads: 'kmc',
  kelectric: 'kelectric',
  ke: 'kelectric',
  electricity: 'kelectric',
  kwsc: 'kwsc',
  water: 'kwsc',
  ssgc: 'ssgc',
  gas: 'ssgc',
  sswmb: 'sswmb',
  sanitation: 'sswmb',
  sbca: 'sbca',
  building: 'sbca',
};

export const DepartmentLoginPage: React.FC<{ targetRole?: StaffPosition }> = ({ targetRole }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role')?.toLowerCase();
  const effectiveRole = targetRole || (roleParam === 'head' || roleParam === 'officer' ? roleParam : undefined);

  if (effectiveRole === 'head') {
    return <HodLoginPage />;
  }
  if (effectiveRole === 'officer') {
    return <OfficerLoginPage />;
  }

  const deptParam = searchParams.get('dept')?.toLowerCase() || null;
  const selectedDept: DepartmentId | null = deptParam ? VALID_DEPARTMENT_IDS[deptParam] || null : null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectDepartment = (deptId: DepartmentId) => {
    setIsModalOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('dept', deptId);
      return next;
    });
  };

  if (selectedDept) {
    return (
      <>
        <ThemedDepartmentLoginScreen
          key={targetRole ?? 'department'}
          departmentId={selectedDept}
          targetRole={targetRole}
          onBackToDepartmentSelection={() => setIsModalOpen(true)}
          isOnline={isOnline}
        />
        <DepartmentSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectDepartment={handleSelectDepartment}
        />
      </>
    );
  }

  return (
    <DepartmentSelectionScreen
      onSelectDepartment={handleSelectDepartment}
      isOnline={isOnline}
    />
  );
};

export default DepartmentLoginPage;
