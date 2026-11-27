import React from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OfficerHomePage } from '../features/department/components/v19/OfficerHomePage';
import { OfficerComplaintsView } from '../features/department/components/v19/OfficerComplaintsView';
import { OfficerWorkView } from '../features/department/components/v19/OfficerWorkView';
import { OfficerPerformanceView } from '../features/department/components/v19/OfficerPerformanceView';
import { OfficerMobileGate } from '../features/department/components/v19/OfficerMobileGate';
import { V19OfficerPortalView } from '../features/department/components/v19/V19OfficerPortalView';
import type { DepartmentWorkOrder, DepartmentOfficer } from '../features/department/services/fieldOperations';
import type { HeadIndependentComplaintRow } from '../services/CaseOperationsService';

const MOCK_OFFICER: DepartmentOfficer = {
  user_id: 'off-101',
  display_name: 'Tariq Mehmood',
  staff_role: 'officer',
  active_cases: 2,
  verified_cases: 14,
  on_time_cases: 13,
  overdue_cases: 1,
  disputed_cases: 0,
  employee_id: 'kmc-701',
  staff_username: 'kmc-officer-701',
  membership_status: 'active',
};

const MOCK_ORDERS: DepartmentWorkOrder[] = [
  {
    id: 'ord-pending-1',
    department_id: 'kmc',
    officer_id: 'off-101',
    anchor_complaint_id: 'c-101',
    case_label: 'Main Road Asphalt Restoration',
    status: 'assigned',
    due_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: null,
    instructions: 'Repair asphalt potholes before peak traffic hours.',
  },
  {
    id: 'ord-active-2',
    department_id: 'kmc',
    officer_id: 'off-101',
    anchor_complaint_id: 'c-102',
    case_label: 'Stormwater Culvert Clearing',
    status: 'in_progress',
    due_at: new Date(Date.now() + 43200000).toISOString(),
    started_at: new Date(Date.now() - 7200000).toISOString(),
    instructions: 'Clear choked culvert and photograph water clearance.',
  },
  {
    id: 'ord-verified-3',
    department_id: 'kmc',
    officer_id: 'off-101',
    anchor_complaint_id: 'c-103',
    case_label: 'Sewer Line Debris Extraction',
    status: 'verified',
    due_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_COMPLAINTS: HeadIndependentComplaintRow[] = [
  {
    id: 'c-101',
    referenceNumber: 'KHI-2026-9101',
    heading: 'Deep Road Cavity on Main Crossing',
    sanitizedText: 'Severe asphalt disruption causing traffic bottleneck.',
    factualSummary: 'Road cavity near traffic signal',
    locality: 'Gulshan-e-Iqbal',
    publicPlace: 'University Road near NED',
    district: 'East',
    issueTypes: ['Road cavity'],
    status: 'assigned',
    workOrderStatus: 'assigned',
    submittedAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'critical',
    latitude: 24.9312,
    longitude: 67.1123,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
  },
  {
    id: 'c-102',
    referenceNumber: 'KHI-2026-9102',
    heading: 'Stormwater Choke on North Footpath',
    sanitizedText: 'Stagnant water flooding sidewalk.',
    factualSummary: 'Choked stormwater drain',
    locality: 'Clifton',
    publicPlace: 'Block 4 Main Footpath',
    district: 'South',
    issueTypes: ['Drain choke'],
    status: 'in_progress',
    workOrderStatus: 'in_progress',
    submittedAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'high',
    latitude: 24.8145,
    longitude: 67.0321,
  },
];

describe('V19 Field Officer Portal & Mobile Work Hub', () => {
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
  describe('1. Officer Home View (OfficerHomePage)', () => {
    it('renders personal case statistics, Donut chart, and greeting with authenticated officer name', () => {
      render(
        <OfficerHomePage
          departmentName="Roads & Infrastructure"
          officerName="Tariq Mehmood"
          employeeId="kmc-701"
          orders={MOCK_ORDERS}
          onNavigateToSection={vi.fn()}
        />
      );

      // Personalized greeting
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tariq Mehmood/);
      expect(screen.getByText(/Field Officer Desk · ID: kmc-701/)).toBeInTheDocument();

      // Stats
      expect(screen.getByText('Active Field Tasks')).toBeInTheDocument();
      expect(screen.getByText('Verified Completions')).toBeInTheDocument();
      expect(screen.getByTestId('v19-donut-chart')).toBeInTheDocument();
    });
  });

  describe('2. Officer Assigned Complaints (OfficerComplaintsView)', () => {
    it('displays only unstarted tasks and triggers Start Working with commencement countdown', async () => {
      const onStart = vi.fn().mockResolvedValue(undefined);

      render(
        <OfficerComplaintsView
          departmentCode="KMC"
          orders={MOCK_ORDERS}
          complaints={MOCK_COMPLAINTS}
          onStartWork={onStart}
        />
      );

      // Only unstarted order appears (ord-pending-1)
      expect(screen.getByText('Main Road Asphalt Restoration')).toBeInTheDocument();
      expect(screen.queryByText('Stormwater Culvert Clearing')).not.toBeInTheDocument();

      // Open detail panel
      fireEvent.click(screen.getByText('Main Road Asphalt Restoration'));

      await waitFor(() => {
        expect(screen.getByText(/Repair asphalt potholes before peak traffic hours/)).toBeInTheDocument();
      });

      // Click Start Working
      const startBtn = screen.getByRole('button', { name: /Start Working/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(onStart).toHaveBeenCalledWith('ord-pending-1');
      });
    });
  });

  describe('3. Active Work Console & 30m GPS Submission (OfficerWorkView)', () => {
    it('displays live countdown timer, directions link, extension request modal, and completion submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onExt = vi.fn().mockResolvedValue(undefined);

      render(
        <OfficerWorkView
          departmentCode="KMC"
          orders={MOCK_ORDERS}
          complaints={MOCK_COMPLAINTS}
          onSubmitCompletion={onSubmit}
          onRequestMoreTime={onExt}
        />
      );

      // Displays active in-progress task (ord-active-2)
      expect(screen.getByText('Stormwater Culvert Clearing')).toBeInTheDocument();

      // Open the complaint detail document
      fireEvent.click(screen.getByTestId('open-complaint-btn-ord-active-2'));

      // Countdown / Remaining time rendered in document
      expect(screen.getByText(/Remaining Time/i)).toBeInTheDocument();

      // Directions link rendered
      expect(screen.getByTestId('get-directions-btn')).toBeInTheDocument();

      // Request More Time modal flow
      fireEvent.click(screen.getByTestId('request-more-time-btn'));
      expect(screen.getByRole('dialog', { name: 'Request deadline extension' })).toBeInTheDocument();

      const reasonInput = screen.getByPlaceholderText(/Specify why more time is needed/i);
      fireEvent.change(reasonInput, { target: { value: 'Excavation machinery delayed in traffic.' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit Extension Request/i }));

      await waitFor(() => {
        expect(onExt).toHaveBeenCalledWith('ord-active-2', 24, 'Excavation machinery delayed in traffic.');
      });

      // Submit completed work flow
      fireEvent.click(screen.getByTestId('submit-completed-work-btn'));
      expect(screen.getByTestId('work-resolution-form')).toBeInTheDocument();

      // Simulate capturing photo file
      const file = new File(['fake-evidence'], 'evidence.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: true,
      });
      fireEvent.change(fileInput);

      // Wait for photo preview and submit button to be enabled
      const submitBtn = screen.getByTestId('submit-for-verification-btn');
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('4. Officer Performance Scorecard (OfficerPerformanceView)', () => {
    it('presents on-time rate, supervisor warnings, and historical ledger', () => {
      const mockWarnings = [
        {
          id: 'warn-1',
          reason: 'Late arrival to urgent water pipe burst site.',
          issuedAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

      render(
        <OfficerPerformanceView
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          officer={MOCK_OFFICER}
          orders={MOCK_ORDERS}
          warnings={mockWarnings}
        />
      );

      // Scorecard metrics
      expect(screen.getByText('On-Time Completion Rate')).toBeInTheDocument();
      expect(screen.getByText(/Supervisor-Verified/)).toBeInTheDocument();

      // Formal supervisory warning
      expect(screen.getByText(/Supervisory Operational Notices \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Late arrival to urgent water pipe burst site.')).toBeInTheDocument();

      // Historical ledger
      expect(screen.getByText(/Historical Field Order Ledger/)).toBeInTheDocument();
      expect(screen.getByText('Sewer Line Debris Extraction')).toBeInTheDocument();
    });
  });

  describe('5. Mobile Fieldwork Boundary (OfficerMobileGate)', () => {
    it('permits Work tab directly and wraps non-work tabs in desktop-required boundary', () => {
      const onNavigateWork = vi.fn();

      // Test Work tab (allowed directly)
      const { rerender } = render(
        <OfficerMobileGate activeTab="work" onNavigateToWork={onNavigateWork}>
          <div data-testid="work-content">Active Work Console</div>
        </OfficerMobileGate>
      );
      expect(screen.getByTestId('work-content')).toBeInTheDocument();
      expect(screen.queryByTestId('v19-mobile-restriction-gate')).not.toBeInTheDocument();

      // Test Non-Work tab (e.g. home) - contains desktop content AND restriction gate
      rerender(
        <OfficerMobileGate activeTab="home" onNavigateToWork={onNavigateWork}>
          <div data-testid="home-content">Home Dashboard</div>
        </OfficerMobileGate>
      );
      expect(screen.getByTestId('v19-mobile-restriction-gate')).toBeInTheDocument();
      expect(screen.getByText(/Desktop Workstation Required/i)).toBeInTheDocument();

      // Clicking CTA switches to work tab
      fireEvent.click(screen.getByRole('button', { name: /Switch to Active Work Tab/i }));
      expect(onNavigateWork).toHaveBeenCalled();
    });
  });

  describe('6. Unified Officer Portal Integration (V19OfficerPortalView)', () => {
    it('switches between Officer tabs and displays Asia/Karachi clock', async () => {
      render(
        <V19OfficerPortalView
          departmentId="kmc"
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          username="kmc-officer-701"
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          onOpenPasswordModal={vi.fn()}
        />
      );

      // Navigation tabs for Officer
      expect(screen.getByRole('tab', { name: /Home/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Assigned/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Work/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Scorecard/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Notices/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Profile/i })).toBeInTheDocument();

      // Trusted clock
      expect(screen.getByTestId('v19-trusted-clock')).toBeInTheDocument();

      // Navigate to Work tab
      fireEvent.click(screen.getByRole('tab', { name: /Work/i }));
      await waitFor(() => {
        expect(screen.getByTestId('v19-officer-work')).toBeInTheDocument();
      });

      // Navigate to Profile tab
      fireEvent.click(screen.getByRole('tab', { name: /Profile/i }));
      await waitFor(() => {
        expect(screen.getByTestId('v19-officer-profile')).toBeInTheDocument();
      });
    });
  });
});
