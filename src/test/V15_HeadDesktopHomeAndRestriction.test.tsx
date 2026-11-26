import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HeadHomePage } from '../features/department/components/HeadHomePage';
import { HeadSidebarNav } from '../features/department/components/HeadSidebarNav';
import { DepartmentRoleBoundary } from '../features/department/DepartmentRoleBoundary';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentAuthContext, type DepartmentAuthContextType } from '../context/DepartmentAuthContext';
import { caseOperationsService } from '../services/CaseOperationsService';
import { complaintService } from '../services';
import { fieldOperations, type DepartmentWorkOrder } from '../features/department/services/fieldOperations';
import { evaluateHeadDesktopAccess } from '../features/department/hooks/useHeadDesktopAccess';
import type { IncidentCaseSummary } from '../types';

function setViewport(width: number, height = 800, coarseNoHover = false, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0') {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, writable: true, value: height });
  Object.defineProperty(window, 'screen', {
    configurable: true,
    writable: true,
    value: { width, height },
  });
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse') ? coarseNoHover : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function makeCase(idx: number, overrides: Partial<IncidentCaseSummary> = {}): IncidentCaseSummary {
  return {
    id: `case-${idx}`,
    caseNumber: `KHI-2026-${1000 + idx}`,
    title: `Case subject ${idx}`,
    departmentId: 'kmc',
    issueCategory: 'Broken road',
    publicPlace: `Sector ${idx} Avenue`,
    locality: 'Gulshan-e-Iqbal',
    city: 'Karachi',
    priority: 'medium',
    workStatus: 'needs_acceptance',
    assignedStaffId: undefined,
    assignedStaffLabel: 'Unassigned',
    linkedReportCount: 1,
    ageDays: 2,
    latestActivityAt: '2026-11-26T08:00:00.000Z',
    latestCitizenSummary: 'Road surface damaged near main intersection.',
    priorityScore: 50,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<DepartmentWorkOrder> = {}): DepartmentWorkOrder {
  return {
    id: 'order-1',
    department_id: 'kmc',
    anchor_complaint_id: 'case-1',
    case_label: 'University Road pothole repair',
    officer_id: 'off-1',
    assigned_by: 'head-1',
    instructions: 'Resurface intersection patch',
    assigned_at: '2026-11-20T08:00:00.000Z',
    due_at: '2026-11-24T08:00:00.000Z',
    original_due_at: '2026-11-24T08:00:00.000Z',
    started_at: '2026-11-20T10:00:00.000Z',
    status: 'in_progress',
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
    ...overrides,
  };
}

function createAuthValue(overrides: Partial<DepartmentAuthContextType> = {}): DepartmentAuthContextType {
  return {
    departmentId: 'kmc',
    departmentMeta: { id: 'kmc', code: 'KMC', name: 'Roads & Infrastructure' },
    session: {
      userId: 'head-user-1',
      username: 'roads-01',
      departmentId: 'kmc',
      loggedInAt: '2026-11-26T06:00:00.000Z',
      mustChangePassword: false,
    },
    isAuthenticated: true,
    isCheckingSession: false,
    signIn: vi.fn().mockResolvedValue({ success: true }),
    signOut: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue({ success: true }),
    checkRevocationStatus: vi.fn().mockReturnValue({ authorized: true }),
    ...overrides,
  };
}

beforeEach(() => {
  setViewport(1440, 900);
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('V15.0 / V16 Department Head Home, Collapsible Rail, and Desktop Access Boundary', () => {
  it('renders HeadHomePage with PKT greeting, Today default period overview, single segmented bar, 4 exact labels, and period switching', async () => {
    const nowIso = new Date().toISOString();
    const yestIso = new Date(Date.now() - 86400000).toISOString();
    const listSpy = vi
      .spyOn(caseOperationsService, 'listIndependentComplaintsForHead')
      .mockResolvedValue([
        {
          id: 'c-1',
          referenceNumber: 'KHI-2026-9001',
          heading: 'Broken water main near University Rd',
          publicPlace: 'University Road',
          locality: 'Gulshan',
          priority: 'critical',
          status: 'new',
          submittedAt: nowIso,
          rawText: 'Broken water main near University Rd',
          issueTypes: ['Broken road'],
        },
        {
          id: 'c-2',
          referenceNumber: 'KHI-2026-9002',
          heading: 'Storm drain blockage',
          publicPlace: 'Tariq Road',
          locality: 'PECHS',
          priority: 'normal',
          status: 'resolved',
          submittedAt: yestIso,
          rawText: 'Storm drain blockage',
          issueTypes: ['Drainage'],
        },
      ]);
    vi.spyOn(fieldOperations, 'orders').mockResolvedValue([]);
    vi.spyOn(fieldOperations, 'orderLinksMap').mockResolvedValue(new Map());
    vi.spyOn(fieldOperations, 'officersDirectory').mockResolvedValue([]);

    const onNavigate = vi.fn();

    render(
      <HeadHomePage
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure"
        username="roads-01"
        themeMode="light"
        onToggleTheme={vi.fn()}
        onOpenPasswordModal={vi.fn()}
        onNavigate={onNavigate}
        onSelectCase={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading overview…');

    await waitFor(() => {
      expect(screen.getByTestId('v16-overview-body')).toBeInTheDocument();
    });

    // Overview heading and concise department identity
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Overview');
    expect(screen.getByText(/Roads & Infrastructure/)).toBeInTheDocument();

    // Today is active by default, shows 5-metric overview strip, Complaint inbox, and Field operations
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
    const overviewStrip = screen.getByTestId('v16-overview-body');
    expect(screen.getByTestId('v16-overview-total')).toHaveTextContent('1');
    expect(within(overviewStrip).getByText('Received')).toBeInTheDocument();
    expect(within(overviewStrip).getByText('Unassigned')).toBeInTheDocument();
    expect(within(overviewStrip).getByText('In progress')).toBeInTheDocument();
    expect(within(overviewStrip).getByText('Verify evidence')).toBeInTheDocument();
    expect(within(overviewStrip).getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Complaint inbox' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Field operations' })).toBeInTheDocument();

    // Switching period updates overview without page reload
    fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('v16-overview-total')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByRole('button', { name: /View all/i }));
    expect(onNavigate).toHaveBeenCalledWith('queue');
    expect(listSpy).toHaveBeenCalled();
  });

  it('handles error retry recovery and empty window states cleanly on HeadHomePage', async () => {
    const listSpy = vi
      .spyOn(caseOperationsService, 'listIndependentComplaintsForHead')
      .mockRejectedValueOnce(new Error('Network timeout while loading KMC summary.'))
      .mockResolvedValueOnce([]);

    vi.spyOn(fieldOperations, 'orders').mockResolvedValue([]);
    vi.spyOn(fieldOperations, 'orderLinksMap').mockResolvedValue(new Map());
    vi.spyOn(fieldOperations, 'officersDirectory').mockResolvedValue([]);

    render(
      <HeadHomePage
        departmentId="kmc"
        departmentCode="KMC"
        departmentName="Roads & Infrastructure"
        username="roads-01"
        themeMode="dark"
        onToggleTheme={vi.fn()}
        onOpenPasswordModal={vi.fn()}
        onNavigate={vi.fn()}
        onSelectCase={vi.fn()}
      />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load overview');
    expect(screen.getByText('Network timeout while loading KMC summary.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('v16-overview-body')).toBeInTheDocument();
      expect(screen.getByTestId('v16-overview-total')).toHaveTextContent('0');
    });
  });

  it('renders HeadSidebarNav with all 8 destinations, single active illumination, collapse tooltips, and Escape-dismissible Settings popover', () => {
    const onToggleCollapse = vi.fn();
    const onSelectSection = vi.fn();

    const { rerender } = render(
      <HeadSidebarNav
        departmentCode="KMC"
        departmentName="Roads & Infrastructure"
        username="roads-01"
        currentSection="dashboard"
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        onSelectSection={onSelectSection}
        themeMode="light"
        onToggleTheme={vi.fn()}
        onOpenPasswordModal={vi.fn()}
        onSignOut={vi.fn()}
        proofReviewCount={3}
      />
    );

    const nav = screen.getByRole('navigation', { name: 'Department Head navigation' });
    const expectedLabels = ['Home', 'Complaints', 'Dispatch', 'Work orders', 'Proof review', 'Officers', 'Archive'];
    for (const label of expectedLabels) {
      expect(within(nav).getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    const settingsBtn = within(nav).getByRole('button', { name: 'Open workspace menu' });
    expect(settingsBtn).toBeInTheDocument();

    // Only active item carries is-active / aria-current="page"
    const homeBtn = within(nav).getByRole('button', { name: 'Home' });
    expect(homeBtn).toHaveClass('is-active');
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: 'Complaints' })).not.toHaveClass('is-active');

    // Open Settings popover and dismiss with Escape
    fireEvent.click(settingsBtn);
    const menu = screen.getByRole('menu', { name: 'Workspace settings and tools' });
    expect(within(menu).getByRole('menuitem', { name: /Review queue/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Change passphrase/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Collapsed mode renders tooltips cleanly
    rerender(
      <HeadSidebarNav
        departmentCode="KMC"
        departmentName="Roads & Infrastructure"
        username="roads-01"
        currentSection="dashboard"
        collapsed={true}
        onToggleCollapse={onToggleCollapse}
        onSelectSection={onSelectSection}
        themeMode="light"
        onToggleTheme={vi.fn()}
        onOpenPasswordModal={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByTestId('head-sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getAllByRole('tooltip').some((el) => el.textContent === 'Home')).toBe(true);
  });

  it('enforces Head desktop boundary cleanly across narrow viewports and phone devices without touching Field Officers', () => {
    setViewport(1024, 768);
    expect(evaluateHeadDesktopAccess().isDesktopAllowed).toBe(true);

    setViewport(1023, 768);
    expect(evaluateHeadDesktopAccess().isDesktopAllowed).toBe(false);

    setViewport(390, 844);
    expect(evaluateHeadDesktopAccess().isDesktopAllowed).toBe(false);

    // Landscape phone form-factor blocked even if width is stretched
    setViewport(844, 390, true, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(evaluateHeadDesktopAccess().isDesktopAllowed).toBe(false);
    expect(evaluateHeadDesktopAccess().reason).toBe('mobile_device');
  });

  it('renders Head workspace responsively on 390px and desktop with LiquidGlassRibbon and preserves session', async () => {
    setViewport(390, 844);
    sessionStorage.setItem('awaaz_demo_staff_session', JSON.stringify({ userId: 'head-user-1', departmentId: 'kmc' }));

    vi.spyOn(caseOperationsService, 'listDepartmentCases').mockResolvedValue({ items: [], totalCount: 0 });
    const overviewSpy = vi.spyOn(caseOperationsService, 'getHeadPeriodOverview').mockResolvedValue({
      period: 'today',
      totalActive: 0,
      newComplaints: 0,
      underReview: 0,
      inProgress: 0,
      awaitingVerification: 0,
    });
    vi.spyOn(complaintService, 'getDepartmentComplaints').mockResolvedValue([]);
    vi.spyOn(fieldOperations, 'getMyRole').mockResolvedValue('head');
    vi.spyOn(fieldOperations, 'orders').mockResolvedValue([]);
    vi.spyOn(fieldOperations, 'orderLinksMap').mockResolvedValue(new Map());
    vi.spyOn(fieldOperations, 'team').mockResolvedValue([]);

    const authVal = createAuthValue();

    render(
      <MemoryRouter initialEntries={['/department/head?view=overview']}>
        <DepartmentAuthContext.Provider value={authVal}>
          <Routes>
            <Route path="/department/head" element={<DepartmentRoleBoundary expectedRole="head" />} />
          </Routes>
        </DepartmentAuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('head-desktop-restriction')).not.toBeInTheDocument();
      expect(screen.getByTestId('head-home-page')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Department Head navigation' })).toBeInTheDocument();
    });
    expect(authVal.signOut).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('awaaz_demo_staff_session')).toContain('head-user-1');
    expect(overviewSpy).toHaveBeenCalled();

    // Resize to desktop (>=1024px) preserves workspace cleanly without re-login
    act(() => {
      setViewport(1280, 800);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('head-home-page')).toBeInTheDocument();
    });
  });

  it('renders Field Officer workspace on mobile with floating bottom navigation and no Head ribbon', async () => {
    setViewport(390, 844);
    vi.spyOn(caseOperationsService, 'listDepartmentCases').mockResolvedValue({ items: [], totalCount: 0 });
    vi.spyOn(complaintService, 'getDepartmentComplaints').mockResolvedValue([]);
    const getRoleSpy = vi.spyOn(fieldOperations, 'getMyRole').mockResolvedValue('officer');

    const officerAuth = createAuthValue({
      session: {
        userId: 'officer-user-1',
        username: 'roads-02',
        departmentId: 'kmc',
        loggedInAt: '2026-11-26T06:00:00.000Z',
        mustChangePassword: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/department/officer']}>
        <DepartmentAuthContext.Provider value={officerAuth}>
          <Routes>
            <Route path="/department/officer" element={<DepartmentRoleBoundary expectedRole="officer" />} />
          </Routes>
        </DepartmentAuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('head-desktop-restriction')).not.toBeInTheDocument();
      expect(screen.getByTestId('department-workspace')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Field officer navigation' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('navigation', { name: 'Department Head navigation' })).not.toBeInTheDocument();
    expect(getRoleSpy).toHaveBeenCalled();
  });
});
