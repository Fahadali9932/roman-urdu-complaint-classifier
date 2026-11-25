import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';
import { LimeRibbonArtwork } from './design-system/DepartmentArtwork';
import { useCivicTheme } from './hooks/useCivicTheme';
import { V3AuthShell, V3PrimaryButton } from '../../components/v3';

interface DepartmentSelectionScreenProps {
  onSelectDepartment: (deptId: DepartmentId) => void;
  isOnline?: boolean;
}

export const DepartmentSelectionScreen: React.FC<DepartmentSelectionScreenProps> = ({
  onSelectDepartment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const { theme, toggleTheme } = useCivicTheme();
  const navigate = useNavigate();

  const handleDepartmentChosen = (deptId: DepartmentId) => {
    setIsModalOpen(false);
    onSelectDepartment(deptId);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    navigate('/');
  };

  return (
    <div className="relative">
      <V3AuthShell
        portalTitle="Municipal Operations"
        titleAsHeading={false}
        eyebrow="Authorized Agency Gateway"
        subtitle="Select your municipal agency to access the Department Head or Field Officer workspace."
        artwork={<LimeRibbonArtwork />}
        theme={theme}
        onToggleTheme={toggleTheme}
        backTo="/"
        backLabel="Citizen Portal"
      >
        <div className="space-y-4">
          <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'var(--v3-accent)' }}>
            Department Gateway
          </div>
          <h2 className="text-[26px] font-medium leading-tight" style={{ color: 'var(--v3-ink)' }}>
            Municipal Operations Gateway
          </h2>
          <p className="text-[14px]" style={{ color: 'var(--v3-muted)' }}>
            Select an authorized Karachi municipal agency console using your issued department credentials.
          </p>
          <V3PrimaryButton onClick={() => setIsModalOpen(true)} className="w-full">
            Choose department console
          </V3PrimaryButton>
        </div>
      </V3AuthShell>

      <DepartmentSelectionModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSelectDepartment={handleDepartmentChosen}
      />
    </div>
  );
};
