import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionScreen } from './DepartmentSelectionScreen';
import { ThemedDepartmentLoginScreen } from './ThemedDepartmentLoginScreen';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';

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

export const DepartmentLoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deptParam = searchParams.get('dept')?.toLowerCase() || null;

  // Derive active department view directly from URL search params
  const selectedDept: DepartmentId | null = deptParam ? VALID_DEPARTMENT_IDS[deptParam] || null : null;

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Track online/offline network status for PWA
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

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  if (selectedDept) {
    return (
      <>
        <ThemedDepartmentLoginScreen
          departmentId={selectedDept}
          onBackToDepartmentSelection={handleOpenModal}
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
