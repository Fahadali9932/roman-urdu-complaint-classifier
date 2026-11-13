import React from 'react';
import { ThemedDepartmentLoginScreen } from './ThemedDepartmentLoginScreen';

interface RoadsLoginScreenProps {
  onBackToDepartmentSelection: () => void;
  isOnline?: boolean;
}

export const RoadsLoginScreen: React.FC<RoadsLoginScreenProps> = ({
  onBackToDepartmentSelection,
  isOnline = true,
}) => {
  return (
    <ThemedDepartmentLoginScreen
      departmentId="kmc"
      onBackToDepartmentSelection={onBackToDepartmentSelection}
      isOnline={isOnline}
    />
  );
};
