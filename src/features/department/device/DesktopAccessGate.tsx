import React from 'react';
import { useDeviceSupport } from './useDeviceSupport';
import { DesktopRequiredScreen, type DesktopRequiredScreenProps } from './DesktopRequiredScreen';

export interface DesktopAccessGateProps extends Omit<DesktopRequiredScreenProps, 'portalType'> {
  portalType?: 'department' | 'admin';
  children: React.ReactNode;
}

/**
 * AWAAZ-E-AWAM — Centralized Desktop Access Gate
 *
 * Enforces the approved device-support policy across staff management portals:
 * - If on genuine desktop (>= 1024px & mouse/trackpad pointer): mounts and renders children normally.
 * - If on mobile or tablet (< 1024px or phone in landscape): replaces presentation with DesktopRequiredScreen.
 * - Guarantees that heavy desktop components (morphing navbar, cursor spotlight, observers) never mount on unsupported viewports.
 * - Preserves authenticated sessions during viewport resize.
 */
export const DesktopAccessGate: React.FC<DesktopAccessGateProps> = ({
  portalType = 'department',
  departmentCode = 'KMC',
  departmentName = 'Karachi Metropolitan Corporation',
  role = 'head',
  themeMode,
  isAuthenticated = false,
  onSignOut,
  onNavigateToWork,
  children,
}) => {
  const { isDesktop } = useDeviceSupport();

  if (!isDesktop) {
    return (
      <DesktopRequiredScreen
        portalType={portalType}
        departmentCode={departmentCode}
        departmentName={departmentName}
        role={role}
        themeMode={themeMode}
        isAuthenticated={isAuthenticated}
        onSignOut={onSignOut}
        onNavigateToWork={onNavigateToWork}
      />
    );
  }

  return <>{children}</>;
};
