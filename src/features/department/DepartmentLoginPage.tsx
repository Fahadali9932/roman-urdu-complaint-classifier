import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionScreen } from './DepartmentSelectionScreen';
import { ThemedDepartmentLoginScreen } from './ThemedDepartmentLoginScreen';

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('dept', deptId);
      return next;
    });
  };

  const handleBackToSelection = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('dept');
      return next;
    });
  };

  if (selectedDept) {
    return (
      <ThemedDepartmentLoginScreen
        departmentId={selectedDept}
        onBackToDepartmentSelection={handleBackToSelection}
        isOnline={isOnline}
      />
    );
  }

  return (
    <DepartmentSelectionScreen
      onSelectDepartment={handleSelectDepartment}
      isOnline={isOnline}
    />
  );
};
