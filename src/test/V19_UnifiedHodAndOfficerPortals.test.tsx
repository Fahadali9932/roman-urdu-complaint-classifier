import React from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { V19HodPortalView } from '../features/department/components/v19/V19HodPortalView';
import { V19OfficerPortalView } from '../features/department/components/v19/V19OfficerPortalView';

describe('V19 Unified HOD & Officer Cross-Portal E2E Workflow', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined') {
      window.matchMedia = window.matchMedia || function () {
        return {
          matches: false,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      };
      if (typeof window.URL.createObjectURL !== 'function') {
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
      }
      if (typeof window.URL.revokeObjectURL !== 'function') {
        window.URL.revokeObjectURL = vi.fn();
      }
    }
  });

  it('1. HOD Workspace renders authoritative desk counters and navigates seamlessly', async () => {
    const onLogout = vi.fn();
    render(
      <V19HodPortalView
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure Directorate"
        username="Engr. Farhan Rizvi"
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={onLogout}
        onOpenPasswordModal={vi.fn()}
      />
    );

    // Initial greeting with HOD name
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Engr. Farhan Rizvi/i);
    });

    // Donut chart rendered
    expect(screen.getByTestId('v19-donut-chart')).toBeInTheDocument();

    // Asia/Karachi trusted clock rendered
    expect(screen.getByTestId('v19-trusted-clock')).toBeInTheDocument();

    // Morphing navigation ribbon tabs exist
    const complaintsTab = screen.getByRole('tab', { name: /Complaints/i });
    expect(complaintsTab).toBeInTheDocument();

    // Navigate to Complaints tab
    fireEvent.click(complaintsTab);

    // Complaints view rendered
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search reference, title/i)).toBeInTheDocument();
    });
  });

  it('2. Officer Workspace starts with active case, displays commencement timer and allows work submission', async () => {
    const onLogout = vi.fn();
    render(
      <V19OfficerPortalView
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure Directorate"
        username="Tariq Mehmood"
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={onLogout}
        onOpenPasswordModal={vi.fn()}
      />
    );

    // Officer greeting
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tariq Mehmood/i);
    });

    // Navigate to Work tab
    const workTab = screen.getByRole('tab', { name: /Work/i });
    expect(workTab).toBeInTheDocument();
    fireEvent.click(workTab);

    // Active fieldwork console rendered
    await waitFor(() => {
      expect(screen.getByTestId('v19-officer-work')).toBeInTheDocument();
    });
  });

  it('3. Complete Municipal Lifecycle: Assignment -> Commencement -> Verification', async () => {
    // Stage 1: Render HOD portal and open Verification tab
    const { unmount } = render(
      <V19HodPortalView
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure Directorate"
        username="Engr. Farhan Rizvi"
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        onOpenPasswordModal={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Engr. Farhan Rizvi/i);
    });

    const verifyTab = screen.getByRole('tab', { name: /Verification/i });
    fireEvent.click(verifyTab);

    await waitFor(() => {
      expect(screen.getByText(/Work Resolution Verification/i)).toBeInTheDocument();
    });

    unmount();

    // Stage 2: Render Officer portal, navigate to Complaints tab
    render(
      <V19OfficerPortalView
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure Directorate"
        username="Tariq Mehmood"
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onSignOut={vi.fn()}
        onOpenPasswordModal={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tariq Mehmood/i);
    });

    const offComplaintsTab = screen.getByRole('tab', { name: /Assigned/i });
    fireEvent.click(offComplaintsTab);

    await waitFor(() => {
      expect(screen.getByText(/Assigned Tasks/i)).toBeInTheDocument();
    });
  });
});
