import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { DesktopAccessGate } from '../department/device/DesktopAccessGate';

/**
 * AWAAZ-E-AWAM — Central Admin Desktop Access Boundary
 *
 * Enforces the approved device-support policy for Central Administrator routes:
 * - Desktop (>= 1024px): Full access to requests, user access permissions, and AI control center.
 * - Mobile / Tablet (< 1024px): Renders DesktopRequiredScreen with platinum/slate theme.
 *   Management layouts are not mounted.
 */
export const AdminDesktopGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, signOut } = useAdminAuth();

  return (
    <DesktopAccessGate
      portalType="admin"
      role="admin"
      isAuthenticated={isAuthenticated}
      onSignOut={signOut}
    >
      {children || <Outlet />}
    </DesktopAccessGate>
  );
};
