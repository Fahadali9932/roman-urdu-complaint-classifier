import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  checkDeviceSupport,
  useDeviceSupport,
  DesktopRequiredScreen,
  DesktopAccessGate,
} from '../features/department/device';
import { V19HodPortalView } from '../features/department/components/v19/V19HodPortalView';
import { V19OfficerPortalView } from '../features/department/components/v19/V19OfficerPortalView';
import { OfficerWorkView } from '../features/department/components/v19/OfficerWorkView';
import { AdminDesktopGate } from '../features/admin/AdminDesktopGate';
import type { DepartmentWorkOrder } from '../features/department/services/fieldOperations';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fieldOperations and CaseOperationsService
vi.mock('../features/department/services/fieldOperations', () => ({
  fieldOperations: {
    orders: vi.fn().mockResolvedValue([]),
    officersDirectory: vi.fn().mockResolvedValue([]),
    orderLinksMap: vi.fn().mockResolvedValue(new Map()),
    fetchNotifications: vi.fn().mockResolvedValue([]),
    fetchDepartmentNotifications: vi.fn().mockResolvedValue([]),
    startWorkOrder: vi.fn().mockResolvedValue({ success: true }),
    submitWorkCompletion: vi.fn().mockResolvedValue({ success: true, gpsVerified: true, distanceMeters: 12 }),
    requestExtension: vi.fn().mockResolvedValue({ success: true }),
    markNotificationRead: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../services/CaseOperationsService', () => ({
  caseOperationsService: {
    listIndependentComplaintsForHead: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/trustedTimeService', () => ({
  trustedTimeService: {
    now: () => new Date('2026-11-27T14:30:00.000Z'),
    formatPkt: () => ({
      timeStr: '14:30:00',
      dateStr: '27 Nov 2026',
      fullStr: '27 Nov 2026 · 14:30:00 PKT',
      cleanTimeStr: '14:30',
      cleanDateStr: 'Fri, 27 Nov 2026',
    }),
    isSynced: () => true,
    isSynchronized: () => true,
    subscribe: () => () => {},
  },
}));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    isAuthenticated: true,
    user: { email: 'admin@awaaz.gov.pk', role: 'admin' },
    signOut: vi.fn(),
    login: vi.fn(),
  }),
}));

describe('V21.7 Desktop-First Access & Mobile Fieldwork Policy', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
    window.matchMedia = originalMatchMedia;
  });

  const setViewport = (width: number, height = 900, isTouch = false) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query.includes('pointer: coarse') && query.includes('hover: none')) {
        return { matches: isTouch, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    });
  };

  describe('1. Device Support Classifier (checkDeviceSupport)', () => {
    it('identifies desktop workstations (>= 1024px)', () => {
      setViewport(1440, 900, false);
      const res1 = checkDeviceSupport();
      expect(res1.isDesktop).toBe(true);
      expect(res1.isMobileOrTablet).toBe(false);

      setViewport(1024, 768, false);
      const res2 = checkDeviceSupport();
      expect(res2.isDesktop).toBe(true);
      expect(res2.isMobileOrTablet).toBe(false);
    });

    it('identifies tablets and mobile viewports (< 1024px) as restricted for management', () => {
      setViewport(768, 1024, true); // iPad portrait
      const resTablet = checkDeviceSupport();
      expect(resTablet.isDesktop).toBe(false);
      expect(resTablet.isMobileOrTablet).toBe(true);

      setViewport(390, 844, true); // iPhone 14
      const resPhone = checkDeviceSupport();
      expect(resPhone.isDesktop).toBe(false);
      expect(resPhone.isMobileOrTablet).toBe(true);

      setViewport(320, 568, true); // iPhone SE
      const resSmall = checkDeviceSupport();
      expect(resSmall.isDesktop).toBe(false);
      expect(resSmall.isMobileOrTablet).toBe(true);
    });

    it('prevents phones in landscape orientation (< 550px height + touch-only) from bypassing restriction', () => {
      setViewport(1024, 420, true); // Phone rotated to landscape
      const res = checkDeviceSupport();
      expect(res.isDesktop).toBe(false);
      expect(res.isMobileOrTablet).toBe(true);
    });
  });

  describe('2. Desktop Restriction Presentation (DesktopRequiredScreen)', () => {
    it('renders exact heading, supporting copy and brand context for department head', () => {
      const onSignOut = vi.fn();
      render(
        <MemoryRouter>
          <DesktopRequiredScreen
            portalType="department"
            departmentCode="KMC"
            departmentName="Karachi Metropolitan Corporation"
            role="head"
            isAuthenticated={true}
            onSignOut={onSignOut}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('v20-desktop-required-screen')).toBeInTheDocument();
      expect(screen.getByText('AWAAZ-E-AWAM')).toBeInTheDocument();
      expect(screen.getByText('KMC / OPERATIONAL DESK')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Desktop access required.');
      expect(screen.getByText('Please open this portal on a desktop or laptop to continue.')).toBeInTheDocument();

      // Actions
      const homeBtn = screen.getByTestId('v20-restriction-home-btn');
      expect(homeBtn).toHaveTextContent('Return to homepage');
      fireEvent.click(homeBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/');

      const signOutBtn = screen.getByTestId('v20-restriction-signout-btn');
      expect(signOutBtn).toHaveTextContent('Sign out');
      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalled();
    });

    it('renders Central Admin styling and brand when portalType is admin', () => {
      render(
        <MemoryRouter>
          <DesktopRequiredScreen portalType="admin" role="admin" isAuthenticated={true} />
        </MemoryRouter>
      );

      const screenRoot = screen.getByTestId('v20-desktop-required-screen');
      expect(screenRoot).toHaveClass('v20-admin-restriction');
      expect(screen.getByText('CENTRAL ADMINISTRATOR WORKSPACE')).toBeInTheDocument();
    });

    it('provides "Open fieldwork" CTA for authenticated officers on restricted tabs', () => {
      const onNavigateWork = vi.fn();
      render(
        <MemoryRouter>
          <DesktopRequiredScreen
            portalType="department"
            departmentCode="KWSC"
            role="officer"
            isAuthenticated={true}
            onNavigateToWork={onNavigateWork}
          />
        </MemoryRouter>
      );

      const fieldworkBtn = screen.getByTestId('v20-restriction-fieldwork-btn');
      expect(fieldworkBtn).toBeInTheDocument();
      expect(fieldworkBtn).toHaveTextContent('Open fieldwork');

      fireEvent.click(fieldworkBtn);
      expect(onNavigateWork).toHaveBeenCalled();
    });
  });

  describe('3. HOD Portal Desktop Gate (V19HodPortalView)', () => {
    it('renders full operational workstation with morphing navbar on desktop (>= 1024px)', async () => {
      setViewport(1440, 900, false);
      render(
        <MemoryRouter>
          <V19HodPortalView
            departmentId="kmc"
            departmentCode="KMC"
            departmentName="Roads & Infrastructure"
            username="kmc-head"
            themeMode="dark"
            onToggleTheme={vi.fn()}
            onSignOut={vi.fn()}
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('v20-top-edge-nav')).toBeInTheDocument();
        expect(screen.queryByTestId('v20-desktop-required-screen')).not.toBeInTheDocument();
      });
    });

    it('replaces HOD portal with DesktopRequiredScreen on mobile (< 1024px) without mounting desktop navbar', async () => {
      setViewport(390, 844, true);
      render(
        <MemoryRouter>
          <V19HodPortalView
            departmentId="kmc"
            departmentCode="KMC"
            departmentName="Roads & Infrastructure"
            username="kmc-head"
            themeMode="dark"
            onToggleTheme={vi.fn()}
            onSignOut={vi.fn()}
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('v20-desktop-required-screen')).toBeInTheDocument();
        expect(screen.queryByTestId('v20-top-edge-nav')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Desktop access required.');
      });
    });
  });

  describe('4. Central Admin Desktop Gate (AdminDesktopGate)', () => {
    it('passes through admin children on desktop (>= 1024px)', () => {
      setViewport(1280, 800, false);
      render(
        <MemoryRouter>
          <AdminDesktopGate>
            <div data-testid="admin-child">Admin Access Queue</div>
          </AdminDesktopGate>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-child')).toBeInTheDocument();
      expect(screen.queryByTestId('v20-desktop-required-screen')).not.toBeInTheDocument();
    });

    it('intercepts admin pages on mobile (< 1024px) and renders DesktopRequiredScreen', () => {
      setViewport(768, 1024, true);
      render(
        <MemoryRouter>
          <AdminDesktopGate>
            <div data-testid="admin-child">Admin Access Queue</div>
          </AdminDesktopGate>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument();
      expect(screen.getByTestId('v20-desktop-required-screen')).toBeInTheDocument();
      expect(screen.getByText('CENTRAL ADMINISTRATOR WORKSPACE')).toBeInTheDocument();
    });
  });

  describe('5. Officer Mobile Fieldwork & Desktop Gate (V19OfficerPortalView)', () => {
    it('renders focused mobile fieldwork console on mobile when on work tab without desktop navbar', async () => {
      setViewport(390, 844, true);
      render(
        <MemoryRouter>
          <V19OfficerPortalView
            departmentId="kmc"
            departmentCode="KMC"
            departmentName="Roads & Infrastructure"
            username="kmc-officer-701"
            themeMode="dark"
            onToggleTheme={vi.fn()}
            onSignOut={vi.fn()}
            onOpenPasswordModal={vi.fn()}
            initialTab="work"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('v20-mobile-officer-work-root')).toBeInTheDocument();
        expect(screen.getAllByText(/Fieldwork Console/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTestId('v19-officer-work')).toBeInTheDocument();
        // Morphing navbar must NOT mount
        expect(screen.queryByTestId('v20-top-edge-nav')).not.toBeInTheDocument();
        expect(screen.queryByTestId('v20-desktop-required-screen')).not.toBeInTheDocument();
      });
    });

    it('renders DesktopRequiredScreen on mobile when on non-work tab, and allows switching to fieldwork', async () => {
      setViewport(390, 844, true);
      render(
        <MemoryRouter>
          <V19OfficerPortalView
            departmentId="kmc"
            departmentCode="KMC"
            departmentName="Roads & Infrastructure"
            username="kmc-officer-701"
            themeMode="dark"
            onToggleTheme={vi.fn()}
            onSignOut={vi.fn()}
            onOpenPasswordModal={vi.fn()}
            initialTab="dashboard"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('v20-desktop-required-screen')).toBeInTheDocument();
        expect(screen.queryByTestId('v20-top-edge-nav')).not.toBeInTheDocument();
      });

      // Click "Open fieldwork" CTA
      const fieldworkBtn = screen.getByTestId('v20-restriction-fieldwork-btn');
      fireEvent.click(fieldworkBtn);

      // Transitions to mobile fieldwork console
      await waitFor(() => {
        expect(screen.getByTestId('v20-mobile-officer-work-root')).toBeInTheDocument();
        expect(screen.getByTestId('v19-officer-work')).toBeInTheDocument();
      });
    });
  });

  describe('6. Officer Work View Mobile Assigned Orders Commencement', () => {
    it('displays assigned orders queue and allows starting work directly from mobile Work console', async () => {
      const mockOrders: DepartmentWorkOrder[] = [
        {
          id: 'ord-assigned-99',
          department_id: 'kmc',
          officer_id: 'off-101',
          anchor_complaint_id: 'comp-99',
          case_label: 'Urgent Asphalt Pothole Restoration',
          status: 'assigned',
          due_at: new Date(Date.now() + 86400000).toISOString(),
          started_at: null,
          instructions: 'Fill pothole on main artery before morning rush.',
        },
      ];

      const onStartWork = vi.fn();

      render(
        <OfficerWorkView
          departmentCode="KMC"
          orders={mockOrders}
          complaints={[]}
          onSubmitCompletion={vi.fn()}
          onRequestMoreTime={vi.fn()}
          onStartWork={onStartWork}
        />
      );

      // Verify the assigned order card is displayed with instructions
      expect(screen.getByText('Urgent Asphalt Pothole Restoration')).toBeInTheDocument();
      expect(screen.getByText(/Fill pothole on main artery/)).toBeInTheDocument();

      // Verify "Start Working" button is present and clickable
      const startBtn = screen.getByRole('button', { name: /Start Working/i });
      expect(startBtn).toBeInTheDocument();

      fireEvent.click(startBtn);
      expect(onStartWork).toHaveBeenCalledWith('ord-assigned-99');
    });
  });
});
