import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { HodOfficersView } from '../features/department/components/v19/HodOfficersView';
import { HodProfileView } from '../features/department/components/v19/HodProfileView';
import { OfficerProfileView } from '../features/department/components/v19/OfficerProfileView';
import { StaffNotificationsView, type StaffNotificationItem } from '../features/department/components/v19/StaffNotificationsView';
import { TopEdgeMorphingNav } from '../features/department/components/v20/TopEdgeMorphingNav';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import type { DepartmentOfficer, DepartmentWorkOrder } from '../features/department/types/department';

describe('AWAAZ-E-AWAM V21.3 Final Personnel & Interaction Corrections', () => {
  const mockOfficers: DepartmentOfficer[] = [
    {
      user_id: 'off-101',
      employee_id: 'kmc-off-101',
      display_name: 'Farhan Zaidi',
      status: 'active',
      active_tasks_count: 3,
      resolved_30d_count: 14,
      on_time_rate_30d: 94.5,
      rating_avg: 4.8,
      last_active_at: new Date().toISOString(),
    },
    {
      user_id: 'off-102',
      employee_id: 'kmc-off-102',
      display_name: 'Zeeshan Qureshi',
      status: 'active',
      active_tasks_count: 1,
      resolved_30d_count: 9,
      on_time_rate_30d: 88.0,
      rating_avg: 4.5,
      last_active_at: new Date().toISOString(),
    },
  ];

  const mockOrders: DepartmentWorkOrder[] = [
    {
      id: 'ord-1001-abcdef12',
      complaint_id: 'comp-101',
      officer_id: 'off-101',
      case_label: 'Severe Water Pipe Burst on Main Blvd',
      status: 'in_progress',
      supervisor_instructions: 'Deploy excavation crew and isolate feeder valve immediately.',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      due_at: new Date(Date.now() + 7200000).toISOString(),
      effective_deadline_at: new Date(Date.now() + 7200000).toISOString(),
      extension_requested_due_at: null,
      extension_reason: null,
      warnings_count: 0,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'ord-1002-fedcba98',
      complaint_id: 'comp-102',
      officer_id: 'off-101',
      case_label: 'Sewage Overflow near Primary School',
      status: 'verified',
      supervisor_instructions: 'Clear blocked mainline junction.',
      started_at: new Date(Date.now() - 86400000).toISOString(),
      due_at: new Date(Date.now() - 43200000).toISOString(),
      effective_deadline_at: new Date(Date.now() - 43200000).toISOString(),
      extension_requested_due_at: null,
      extension_reason: null,
      warnings_count: 0,
      created_at: new Date(Date.now() - 90000000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVES 1 & 2: Enlarged Cards & Parallax Scroll Motion                   */
  /* -------------------------------------------------------------------------- */
  describe('Objective 1 & 2: Enlarged Officer Cards and Scroll-Motion Depth', () => {
    it('renders enlarged officer cards with standalone prominent metrics and neutral styling', () => {
      render(
        <HodOfficersView
          departmentId="dept-1"
          departmentCode="KW&SC"
          officers={mockOfficers}
          orders={mockOrders}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
          onExtendDeadline={vi.fn()}
        />
      );

      // Verify officer directory cards rendered
      expect(screen.getByText('Farhan Zaidi')).toBeInTheDocument();
      expect(screen.getByText('Zeeshan Qureshi')).toBeInTheDocument();

      // Check enlarged card wrappers exist
      const cardWrappers = screen.getAllByTestId(/v20-officer-card-/i);
      expect(cardWrappers.length).toBe(2);

      // Check standalone metrics exist (Assigned, Resolved, Overdue)
      expect(screen.getAllByText('Assigned').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);

      // Verify neutral styling: check avatar is present
      const firstCard = cardWrappers[0];
      expect(firstCard.classList.contains('v20-officer-card')).toBe(true);
      expect(firstCard.textContent).toContain('Farhan Zaidi');
    });

    it('wraps cards in perspective containers for scroll-motion depth', () => {
      render(
        <HodOfficersView
          departmentId="dept-1"
          departmentCode="KW&SC"
          officers={mockOfficers}
          orders={mockOrders}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
          onExtendDeadline={vi.fn()}
        />
      );

      const listContainer = screen.getByTestId('v20-officers-parallax-list');
      expect(listContainer).toBeInTheDocument();
      expect(listContainer.style.perspective).toBe('800px');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 3: Comprehensive Individual Officer Personnel File               */
  /* -------------------------------------------------------------------------- */
  describe('Objective 3: Comprehensive Individual Officer Personnel File', () => {
    it('opens comprehensive officer details file with identity, assignments, and admin controls', () => {
      const onToggleSuspension = vi.fn();
      const onIssueWarning = vi.fn();
      const onExtendDeadline = vi.fn();

      render(
        <HodOfficersView
          departmentId="dept-1"
          departmentCode="KW&SC"
          officers={mockOfficers}
          orders={mockOrders}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={onToggleSuspension}
          onIssueWarning={onIssueWarning}
          onExtendDeadline={onExtendDeadline}
        />
      );

      // Click Farhan Zaidi card
      fireEvent.click(screen.getByText('Farhan Zaidi'));

      // Check Back button is present
      expect(screen.getByTestId('v20-officer-back-btn')).toBeInTheDocument();
      expect(screen.getByText(/Back to officers/i)).toBeInTheDocument();

      // Check identity header & personnel details
      expect(screen.getByText(/Officer ID:/i)).toBeInTheDocument();
      expect(screen.getAllByText('kmc-off-101').length).toBeGreaterThanOrEqual(1);

      // Check Performance metrics overview
      expect(screen.getByText('Performance Rating')).toBeInTheDocument();
      expect(screen.getByText('On-Time Completion')).toBeInTheDocument();

      // Check Current Assignments section
      expect(screen.getByText(/Current Assignments/i)).toBeInTheDocument();
      expect(screen.getByText('Severe Water Pipe Burst on Main Blvd')).toBeInTheDocument();
      expect(screen.getByText(/Deploy excavation crew/i)).toBeInTheDocument();

      // Check Work History section
      expect(screen.getByText(/Work History/i)).toBeInTheDocument();
      expect(screen.getByText('Sewage Overflow near Primary School')).toBeInTheDocument();

      // Check Administrative Controls
      expect(screen.getByText('Administrative Controls')).toBeInTheDocument();
      expect(screen.getByTestId('officer-action-warning-btn')).toBeInTheDocument();
      expect(screen.getByTestId('officer-action-suspend-btn')).toBeInTheDocument();

      // Back navigation restores directory
      fireEvent.click(screen.getByTestId('v20-officer-back-btn'));
      expect(screen.getByText('Farhan Zaidi')).toBeInTheDocument();
      expect(screen.getByText('Zeeshan Qureshi')).toBeInTheDocument();
    });

    it('opens and confirms administrative warning modal', async () => {
      const onIssueWarning = vi.fn();

      render(
        <HodOfficersView
          departmentId="dept-1"
          departmentCode="KW&SC"
          officers={mockOfficers}
          orders={mockOrders}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={onIssueWarning}
          onExtendDeadline={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Farhan Zaidi'));

      // Click Issue Notice
      fireEvent.click(screen.getByTestId('officer-action-warning-btn'));

      // Modal appears
      expect(screen.getByText('Issue Formal Notice to Officer')).toBeInTheDocument();

      // Fill reason
      const input = screen.getByPlaceholderText(/Specify the operational reason/i);
      fireEvent.change(input, { target: { value: 'Failure to submit progress photo on time' } });

      // Transmit notice
      fireEvent.click(screen.getByRole('button', { name: /Issue Notice/i }));

      await waitFor(() => {
        expect(onIssueWarning).toHaveBeenCalledWith(
          'off-101',
          'Failure to submit progress photo on time'
        );
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 4: Simplified Profile Settings & Coming Soon Modal               */
  /* -------------------------------------------------------------------------- */
  describe('Objective 4: Simplified Profile Settings & Coming Soon Modal', () => {
    it('renders HOD profile with exactly two account settings and triggers Coming Soon modal', async () => {
      const onSignOut = vi.fn();

      render(
        <DepartmentAuthProvider>
          <HodProfileView
            departmentCode="KW&SC"
            departmentName="Water & Sewerage Corporation"
            username="kwsc-head"
            onSignOut={onSignOut}
          />
        </DepartmentAuthProvider>
      );

      // Verify headings
      expect(screen.getByText('My profile')).toBeInTheDocument();
      expect(screen.getByText('Display name')).toBeInTheDocument();
      expect(screen.getByText('Account settings')).toBeInTheDocument();

      // Verify options
      expect(screen.getByText('Change username')).toBeInTheDocument();
      expect(screen.getByText('Change password')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();

      // Click "Change username"
      fireEvent.click(screen.getByTestId('hod-change-username-btn'));

      // Check Coming soon modal
      expect(screen.getByText('Coming soon')).toBeInTheDocument();
      expect(screen.getByText('This feature will be added soon.')).toBeInTheDocument();
      expect(screen.getByTestId('coming-soon-okay-btn')).toBeInTheDocument();

      // Click "Okay" dismisses modal
      fireEvent.click(screen.getByTestId('coming-soon-okay-btn'));
      await waitFor(() => {
        expect(screen.queryByText('This feature will be added soon.')).not.toBeInTheDocument();
      });

      // Click "Change password" and dismiss via Escape key
      fireEvent.click(screen.getByTestId('hod-change-password-btn'));
      expect(screen.getByText('Coming soon')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('This feature will be added soon.')).not.toBeInTheDocument();
      });

      // Sign out
      fireEvent.click(screen.getByTestId('hod-signout-btn'));
      expect(onSignOut).toHaveBeenCalled();
    });

    it('renders Officer profile with simplified settings and Coming Soon modal', async () => {
      const onSignOut = vi.fn();

      render(
        <DepartmentAuthProvider>
          <OfficerProfileView
            departmentCode="KW&SC"
            departmentName="Water & Sewerage Corporation"
            officerName="Farhan Zaidi"
            employeeId="kmc-off-101"
            staffUsername="kwsc-off-101"
            onSignOut={onSignOut}
          />
        </DepartmentAuthProvider>
      );

      expect(screen.getByText('My profile')).toBeInTheDocument();
      expect(screen.getByText('Account settings')).toBeInTheDocument();
      expect(screen.getByText('Change username')).toBeInTheDocument();
      expect(screen.getByText('Change password')).toBeInTheDocument();

      // Click Change password
      fireEvent.click(screen.getByTestId('officer-change-password-btn'));
      expect(screen.getByText('Coming soon')).toBeInTheDocument();

      // Dismiss via Enter key
      fireEvent.keyDown(window, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.queryByText('This feature will be added soon.')).not.toBeInTheDocument();
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 5: Mark all as read Malfunction & Lag Fix                        */
  /* -------------------------------------------------------------------------- */
  describe('Objective 5: Mark All as Read Optimistic Update and Zero Lag', () => {
    it('disables mark all read button when all notifications are read and updates optimistically', async () => {
      const mockNotifications: StaffNotificationItem[] = [
        {
          id: 'notif-1',
          title: 'Field Assignment Dispatched',
          message: 'Case #comp-101 assigned to your operational queue.',
          type: 'assignment',
          createdAt: new Date().toISOString(),
          read: false,
        },
        {
          id: 'notif-2',
          title: 'Deadline Approaching',
          message: 'Work order #ord-1001 due in 2 hours.',
          type: 'deadline',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ];

      const onMarkAllAsRead = vi.fn().mockImplementation(() => new Promise((res) => setTimeout(res, 50)));

      render(
        <StaffNotificationsView
          notifications={mockNotifications}
          onMarkAsRead={vi.fn()}
          onMarkAllAsRead={onMarkAllAsRead}
        />
      );

      // Unread count is initially 2
      expect(screen.getByText('Unread (2)')).toBeInTheDocument();
      const markAllBtn = screen.getByTestId('v20-mark-all-read-btn');
      expect(markAllBtn).not.toBeDisabled();

      // Click Mark all as read
      fireEvent.click(markAllBtn);

      // Optimistic update: unread count immediately drops to 0
      expect(screen.getByText('Unread (0)')).toBeInTheDocument();

      // Await completion
      await waitFor(() => {
        expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
      });

      // Now button is disabled since unread count is 0
      expect(markAllBtn).toBeDisabled();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* OBJECTIVE 6: Morphing Navbar State Machine and Stuck-State Immunity        */
  /* -------------------------------------------------------------------------- */
  describe('Objective 6: TopEdgeMorphingNav Deterministic Controller', () => {
    it('initializes in collapsed state and transitions smoothly', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="KW&SC"
          departmentName="Water & Sewerage Corporation"
          role="head"
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const navHeader = screen.getByTestId('v20-top-edge-nav');
      expect(navHeader).toBeInTheDocument();
      expect(navHeader.getAttribute('data-nav-state')).toBe('collapsed');
      expect(navHeader.classList.contains('open')).toBe(false);
    });

    it('toggles open and closed via manual toggle button without getting stuck', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="KW&SC"
          departmentName="Water & Sewerage Corporation"
          role="head"
          activeTab="dashboard"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const navHeader = screen.getByTestId('v20-top-edge-nav');
      const toggleBtn = screen.getByTestId('v20-nav-toggle');

      // Click to open
      fireEvent.click(toggleBtn);
      expect(navHeader.classList.contains('open')).toBe(true);

      // Click to close
      fireEvent.click(toggleBtn);
      expect(navHeader.classList.contains('open')).toBe(false);
      expect(navHeader.getAttribute('data-nav-state')).toBe('closing');
    });

    it('closes on tab selection and calls onSelectTab', () => {
      const onSelectTab = vi.fn();

      render(
        <TopEdgeMorphingNav
          departmentCode="KW&SC"
          departmentName="Water & Sewerage Corporation"
          role="head"
          activeTab="home"
          onSelectTab={onSelectTab}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const navHeader = screen.getByTestId('v20-top-edge-nav');
      const toggleBtn = screen.getByTestId('v20-nav-toggle');

      // Open
      fireEvent.click(toggleBtn);
      expect(navHeader.classList.contains('open')).toBe(true);

      // Select Complaints tab
      const complaintsBtn = screen.getByTestId('v20-nav-btn-complaints');
      fireEvent.click(complaintsBtn);

      expect(onSelectTab).toHaveBeenCalledWith('complaints');
      expect(navHeader.classList.contains('open')).toBe(false);
    });

    it('completes 30 consecutive open/close cycles with zero stuck states', () => {
      render(
        <TopEdgeMorphingNav
          departmentCode="KW&SC"
          departmentName="Water & Sewerage Corporation"
          role="head"
          activeTab="home"
          onSelectTab={vi.fn()}
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
        />
      );

      const navHeader = screen.getByTestId('v20-top-edge-nav');
      const toggleBtn = screen.getByTestId('v20-nav-toggle');

      for (let i = 0; i < 30; i++) {
        // Open
        fireEvent.click(toggleBtn);
        expect(navHeader.classList.contains('open')).toBe(true);

        // Close
        fireEvent.click(toggleBtn);
        expect(navHeader.classList.contains('open')).toBe(false);
      }

      // After 30 cycles, verify it is cleanly closed and NOT stuck
      expect(navHeader.classList.contains('open')).toBe(false);
    });
  });
});
