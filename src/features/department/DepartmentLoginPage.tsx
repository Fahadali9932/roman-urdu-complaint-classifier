import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionScreen } from './DepartmentSelectionScreen';
import { RoadsLoginScreen } from './RoadsLoginScreen';

export const DepartmentLoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deptParam = searchParams.get('dept');

  // Derive active department view directly from URL search params
  const selectedDept: DepartmentId | null =
    deptParam === 'kmc' || deptParam === 'roads' ? 'kmc' : null;

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
    if (deptId === 'kmc') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('dept', 'kmc');
        return next;
      });
    }
  };

  const handleBackToSelection = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('dept');
      return next;
    });
  };

  if (selectedDept === 'kmc') {
    return (
      <RoadsLoginScreen
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
