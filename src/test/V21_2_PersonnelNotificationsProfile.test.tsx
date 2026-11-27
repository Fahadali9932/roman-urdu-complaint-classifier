import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HodOfficersView } from '../features/department/components/v19/HodOfficersView';
import { StaffNotificationsView, type StaffNotificationItem } from '../features/department/components/v19/StaffNotificationsView';
import { HodProfileView } from '../features/department/components/v19/HodProfileView';
import { OfficerProfileView } from '../features/department/components/v19/OfficerProfileView';
import { V20LandingPage } from '../features/department/components/v20/V20LandingPage';
import { DepartmentAuthProvider, useDepartmentAuth } from '../context/DepartmentAuthContext';
import type { DepartmentOfficer, DepartmentWorkOrder } from '../features/department/services/fieldOperations';

const MOCK_OFFICERS: DepartmentOfficer[] = [
  {
    user_id: 'off-01',
    display_name: 'Tariq Mehmood',
    staff_role: 'officer',
    active_cases: 3,
    verified_cases: 12,
    on_time_cases: 11,
    overdue_cases: 1,
    disputed_cases: 0,
    employee_id: 'kmc-701',
    staff_username: 'kmc-officer-701',
    membership_status: 'active',
  },
  {
    user_id: 'off-02',
    display_name: 'Zubair Farooq',
    staff_role: 'officer',
    active_cases: 1,
    verified_cases: 8,
    on_time_cases: 8,
    overdue_cases: 0,
    disputed_cases: 0,
    employee_id: 'kmc-702',
    staff_username: 'kmc-officer-702',
    membership_status: 'suspended',
  },
];

const MOCK_ORDERS: DepartmentWorkOrder[] = [
  {
    id: 'ord-101',
    department_id: 'kmc',
    officer_id: 'off-01',
    anchor_complaint_id: 'c-1',
    case_label: 'Pothole restoration near NED University',
    status: 'in_progress',
    due_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: new Date(Date.now() - 3600000).toISOString(),
    instructions: 'Repair asphalt patch and level surface.',
  },
  {
    id: 'ord-102',
    department_id: 'kmc',
    officer_id: 'off-01',
    anchor_complaint_id: 'c-2',
    case_label: 'Open stormwater drain containment',
    status: 'verified',
    due_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_NOTIFICATIONS: StaffNotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Emergency Road Cavity Assigned',
    message: 'High-priority asphalt depression assigned to field crew.',
    type: 'assignment',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    orderId: 'ord-101',
  },
  {
    id: 'notif-2',
    title: 'Resolution Approved by HOD',
    message: 'Stormwater culvert repair verified with on-site GPS evidence.',
    type: 'verification',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
  {
    id: 'notif-3',
    title: 'Overdue Assignment Notice',
    message: 'Work order #ord-999 has exceeded the authorized completion window.',
    type: 'warning',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
];

describe('AWAAZ-E-AWAM V21.2 — Personnel, Notifications & Profile Refinement', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  /* -------------------------------------------------------------------------
   * 1. OFFICER DIRECTORY & SEARCH FILTERING
   * ----------------------------------------------------------------------- */
  describe('1. Officer Directory View', () => {
    it('renders clean header, search input, and responsive 3-col officer cards with standalone metrics', () => {
      const onProvision = vi.fn();
      const onToggleSuspension = vi.fn();
      const onWarning = vi.fn();

      render(
        <HodOfficersView
          departmentCode="KMC"
          officers={MOCK_OFFICERS}
          orders={MOCK_ORDERS}
          onProvisionOfficer={onProvision}
          onToggleSuspension={onToggleSuspension}
          onIssueWarning={onWarning}
        />
      );

      // Clean header
      expect(screen.getByRole('heading', { level: 2, name: /Officers/i })).toBeInTheDocument();
      expect(screen.getByText(/2 personnel/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search officer name or ID\.\.\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add New Officer/i })).toBeInTheDocument();

      // Both officers rendered in directory
      expect(screen.getByText('Tariq Mehmood')).toBeInTheDocument();
      expect(screen.getByText('Zubair Farooq')).toBeInTheDocument();
      expect(screen.getByText(/ID: kmc-701/i)).toBeInTheDocument();
      expect(screen.getByText(/ID: kmc-702/i)).toBeInTheDocument();

      // Presence & Status indicators
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Suspended')).toBeInTheDocument();

      // Standalone metrics (Assigned, Resolved, Overdue)
      expect(screen.getAllByText('Assigned').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);

      // Performance ratings
      expect(screen.getAllByText(/Rating:/i).length).toBe(2);
    });

    it('filters officers by name and employee ID in search input', () => {
      render(
        <HodOfficersView
          departmentCode="KMC"
          officers={MOCK_OFFICERS}
          orders={MOCK_ORDERS}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search officer name or ID\.\.\./i);

      // Filter by name
      fireEvent.change(searchInput, { target: { value: 'Zubair' } });
      expect(screen.getByText('Zubair Farooq')).toBeInTheDocument();
      expect(screen.queryByText('Tariq Mehmood')).not.toBeInTheDocument();

      // Filter by employee ID
      fireEvent.change(searchInput, { target: { value: '701' } });
      expect(screen.getByText('Tariq Mehmood')).toBeInTheDocument();
      expect(screen.queryByText('Zubair Farooq')).not.toBeInTheDocument();

      // Empty query shows all
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Tariq Mehmood')).toBeInTheDocument();
      expect(screen.getByText('Zubair Farooq')).toBeInTheDocument();
    });

    it('provisions new officer with temporary credentials modal', async () => {
      const onProvision = vi.fn().mockResolvedValue({
        officerUserId: 'user-new',
        employeeId: 'kmc-799',
        staffUsername: 'kmc-officer-799',
        temporaryAccessKey: 'TMP-KMC-9999',
        mustChangePassword: true,
      });

      render(
        <HodOfficersView
          departmentCode="KMC"
          officers={MOCK_OFFICERS}
          orders={MOCK_ORDERS}
          onProvisionOfficer={onProvision}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
        />
      );

      // Open Add New Officer modal
      fireEvent.click(screen.getByRole('button', { name: /Add New Officer/i }));
      expect(screen.getByRole('dialog', { name: /Add new officer/i })).toBeInTheDocument();

      // Fill in details
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/Official Email/i), { target: { value: 'bilal@kmc.gos.pk' } });
      fireEvent.change(screen.getByLabelText(/CNIC/i), { target: { value: '42101-1234567-1' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Generate Credentials/i }));

      await waitFor(() => {
        expect(onProvision).toHaveBeenCalledWith({
          fullName: 'Bilal Ahmed',
          email: 'bilal@kmc.gos.pk',
          cnic: '42101-1234567-1',
          phoneNumber: '',
        });
        expect(screen.getByText('TMP-KMC-9999')).toBeInTheDocument();
        expect(screen.getByText('kmc-officer-799')).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.queryByRole('dialog', { name: /Add new officer/i })).not.toBeInTheDocument();
    });
  });

  /* -------------------------------------------------------------------------
   * 2. DEDICATED FULL-WIDTH OFFICER DETAIL VIEW (NO SPLIT-PANE)
   * ----------------------------------------------------------------------- */
  describe('2. Dedicated Full-Width Officer Detail View', () => {
    it('switches to dedicated full-width view when an officer is clicked, removing directory compression', () => {
      render(
        <HodOfficersView
          departmentCode="KMC"
          officers={MOCK_OFFICERS}
          orders={MOCK_ORDERS}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
        />
      );

      // Click Tariq Mehmood card
      fireEvent.click(screen.getByText('Tariq Mehmood'));

      // Dedicated detail header is visible
      expect(screen.getByTestId('v20-officer-back-btn')).toBeInTheDocument();
      expect(screen.getByText('Back to officers')).toBeInTheDocument();
      expect(screen.getByText(/Officer Personnel File · KMC/i)).toBeInTheDocument();

      // Directory cards are hidden (full width, no split-pane!)
      expect(screen.queryByText('Zubair Farooq')).not.toBeInTheDocument();

      // Standalone identity & metrics
      expect(screen.getByText('Active Account')).toBeInTheDocument();
      expect(screen.getByText('Online · Operational')).toBeInTheDocument();

      // Operational Tabs
      expect(screen.getByRole('button', { name: /Active Tasks/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Work History/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Supervisory Notices/i })).toBeInTheDocument();

      // Active task content
      expect(screen.getByText('Pothole restoration near NED University')).toBeInTheDocument();

      // Clicking "Back to officers" restores directory view
      fireEvent.click(screen.getByTestId('v20-officer-back-btn'));
      expect(screen.getByText('Zubair Farooq')).toBeInTheDocument();
      expect(screen.queryByTestId('v20-officer-back-btn')).not.toBeInTheDocument();
    });

    it('allows issuing warning, extending deadline, and toggling suspension in detail view', async () => {
      const onWarning = vi.fn().mockResolvedValue(undefined);
      const onExtend = vi.fn().mockResolvedValue(undefined);
      const onToggleSuspension = vi.fn().mockResolvedValue(undefined);

      render(
        <HodOfficersView
          departmentCode="KMC"
          officers={MOCK_OFFICERS}
          orders={MOCK_ORDERS}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={onToggleSuspension}
          onIssueWarning={onWarning}
          onExtendDeadline={onExtend}
        />
      );

      // Open Tariq Mehmood
      fireEvent.click(screen.getByText('Tariq Mehmood'));

      // 1. Issue Warning
      fireEvent.click(screen.getByRole('button', { name: /Issue Formal Warning/i }));
      expect(screen.getByRole('dialog', { name: /Issue Formal Warning/i })).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText(/Specify the operational reason/i), {
        target: { value: 'Delay on NED University hazard site.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Issue Notice/i }));
      await waitFor(() => {
        expect(onWarning).toHaveBeenCalledWith('off-01', 'Delay on NED University hazard site.');
      });

      // 2. Extend Deadline
      fireEvent.click(screen.getByRole('button', { name: /Extend ↗/i }));
      expect(screen.getByRole('dialog', { name: /Extend Task Deadline/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /\+48h/i }));
      fireEvent.click(screen.getByRole('button', { name: /Authorize Extension/i }));
      await waitFor(() => {
        expect(onExtend).toHaveBeenCalledWith('ord-101', 48);
      });

      // 3. Suspend Officer
      fireEvent.click(screen.getByRole('button', { name: /Suspend Officer/i }));
      expect(screen.getByRole('dialog', { name: /Confirm Suspension Status/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Confirm Suspension/i }));
      await waitFor(() => {
        expect(onToggleSuspension).toHaveBeenCalledWith('off-01', 'active', 'Supervisory administrative suspension');
      });
    });
  });

  /* -------------------------------------------------------------------------
   * 3. DEDICATED FULL-PAGE NOTIFICATIONS VIEW
   * ----------------------------------------------------------------------- */
  describe('3. Dedicated Full-Page Notifications View', () => {
    it('renders heading, compact All/Unread filter pills, mark all read, and unread dot indicators', () => {
      const onMarkRead = vi.fn();
      const onMarkAll = vi.fn();
      const onNav = vi.fn();

      render(
        <StaffNotificationsView
          notifications={MOCK_NOTIFICATIONS}
          onMarkAsRead={onMarkRead}
          onMarkAllAsRead={onMarkAll}
          onNavigateToItem={onNav}
        />
      );

      // Header & filter pills
      expect(screen.getByRole('heading', { level: 2, name: /Notifications/i })).toBeInTheDocument();
      expect(screen.getByTestId('v20-filter-all-btn')).toBeInTheDocument();
      expect(screen.getByTestId('v20-filter-unread-btn')).toBeInTheDocument();
      expect(screen.getByTestId('v20-mark-all-read-btn')).toBeInTheDocument();

      // Notifications rendered
      expect(screen.getByText('New Emergency Road Cavity Assigned')).toBeInTheDocument();
      expect(screen.getByText('Resolution Approved by HOD')).toBeInTheDocument();
      expect(screen.getByText('Overdue Assignment Notice')).toBeInTheDocument();

      // Unread dot indicators
      expect(screen.getByTestId('v20-unread-dot-notif-1')).toBeInTheDocument();
      expect(screen.getByTestId('v20-unread-dot-notif-3')).toBeInTheDocument();
      expect(screen.queryByTestId('v20-unread-dot-notif-2')).not.toBeInTheDocument();

      // Filter to unread
      fireEvent.click(screen.getByTestId('v20-filter-unread-btn'));
      expect(screen.getByText('New Emergency Road Cavity Assigned')).toBeInTheDocument();
      expect(screen.getByText('Overdue Assignment Notice')).toBeInTheDocument();
      expect(screen.queryByText('Resolution Approved by HOD')).not.toBeInTheDocument();

      // Mark single read
      fireEvent.click(screen.getByTestId('v20-mark-read-notif-1'));
      expect(onMarkRead).toHaveBeenCalledWith('notif-1');

      // Mark all read
      fireEvent.click(screen.getByTestId('v20-mark-all-read-btn'));
      expect(onMarkAll).toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------------
   * 4. PROFILE & LIVE EDITABLE DISPLAY NAME SYNCHRONIZATION
   * ----------------------------------------------------------------------- */
  describe('4. Profile & Editable Display Name Synchronization', () => {
    it('allows editing display name and persists it across context', async () => {
      let currentSessionState: any = null;

      const TestHarness = () => {
        const { session } = useDepartmentAuth();
        currentSessionState = session;
        return (
          <div>
            <span data-testid="current-session-name">{session?.displayName || 'NONE'}</span>
            <HodProfileView
              departmentCode="KMC"
              departmentName="Roads & Infrastructure"
              username="roads-head-01"
              onSignOut={vi.fn()}
            />
          </div>
        );
      };

      // Set initial session in sessionStorage
      sessionStorage.setItem(
        'awaaz_department_auth_session_v1',
        JSON.stringify({
          userId: 'user-hod-1',
          username: 'roads-head-01',
          departmentId: 'kmc',
          departmentName: 'Roads & Infrastructure',
          departmentCode: 'KMC',
          authenticatedAt: new Date().toISOString(),
        })
      );

      render(
        <DepartmentAuthProvider>
          <TestHarness />
        </DepartmentAuthProvider>
      );

      const nameInput = screen.getByTestId('v20-display-name-input');
      const saveBtn = screen.getByTestId('v20-save-display-name-btn');

      // Edit name to a custom display name
      fireEvent.change(nameInput, { target: { value: 'Engr. Tariq Mahmood' } });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Saved ✓/i)).toBeInTheDocument();
        expect(screen.getByTestId('current-session-name').textContent).toBe('Engr. Tariq Mahmood');
      });

      // Verify localStorage was also updated for persistence
      expect(localStorage.getItem('awaaz_display_name_user-hod-1')).toBe('Engr. Tariq Mahmood');
    });

    it('Landing page immediately displays edited display name, and falls back to Admin if empty', () => {
      // 1. When custom name is supplied
      const { rerender } = render(
        <V20LandingPage
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          role="head"
          staffName="Engr. Tariq Mahmood"
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Engr. Tariq Mahmood');

      // 2. When empty or generic technical name is supplied, falls back to approved "Admin"
      rerender(
        <V20LandingPage
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          role="head"
          staffName=""
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');

      rerender(
        <V20LandingPage
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          role="head"
          staffName="roads-head-01"
        />
      );
      expect(screen.getByTestId('v20-landing-staff-name').textContent).toBe('Admin');
    });

    it('preserves honest account controls in officer profile without fake settings', () => {
      const onOpenPassword = vi.fn();
      const onSignOut = vi.fn();

      render(
        <DepartmentAuthProvider>
          <OfficerProfileView
            departmentCode="KMC"
            departmentName="Roads & Infrastructure"
            officerName="Tariq Mehmood"
            employeeId="kmc-701"
            staffUsername="kmc-officer-701"
            onSignOut={onSignOut}
            onOpenPasswordModal={onOpenPassword}
          />
        </DepartmentAuthProvider>
      );

      expect(screen.getByText('Account & Jurisdiction')).toBeInTheDocument();
      expect(screen.getByText('Officer Passphrase')).toBeInTheDocument();
      expect(screen.getByText('Authorized Department')).toBeInTheDocument();
      expect(screen.getByText(/Roads & Infrastructure \(KMC\)/i)).toBeInTheDocument();

      // Password modal trigger
      fireEvent.click(screen.getByRole('button', { name: /Change ↗/i }));
      expect(onOpenPassword).toHaveBeenCalled();

      // Sign out trigger
      fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));
      expect(onSignOut).toHaveBeenCalled();
    });
  });
});
