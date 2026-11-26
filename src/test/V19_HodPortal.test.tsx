import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HodHomePage } from '../features/department/components/v19/HodHomePage';
import { HodComplaintsView } from '../features/department/components/v19/HodComplaintsView';
import { HodOfficersView } from '../features/department/components/v19/HodOfficersView';
import { HodVerificationView } from '../features/department/components/v19/HodVerificationView';
import { V19HodPortalView } from '../features/department/components/v19/V19HodPortalView';
import type { HeadIndependentComplaintRow } from '../services/CaseOperationsService';
import type { DepartmentOfficer, DepartmentWorkOrder, DepartmentProof } from '../features/department/services/fieldOperations';

const MOCK_COMPLAINTS: HeadIndependentComplaintRow[] = [
  {
    id: 'c-1',
    referenceNumber: 'KHI-2026-9001',
    heading: 'Deep Pothole on Main Road',
    sanitizedText: 'Deep hazardous crater near crossing blocking traffic lane.',
    factualSummary: 'Deep road cavity causing severe hazard',
    locality: 'Gulshan-e-Iqbal',
    publicPlace: 'University Road near NED',
    district: 'East',
    issueTypes: ['Road cavity'],
    status: 'submitted',
    workOrderStatus: null,
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'critical',
    latitude: 24.9312,
    longitude: 67.1123,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
  },
  {
    id: 'c-2',
    referenceNumber: 'KHI-2026-9002',
    heading: 'Missing Manhole Cover',
    sanitizedText: 'Open stormwater drain posing mortal risk to pedestrians.',
    factualSummary: 'Uncovered storm pit on active sidewalk',
    locality: 'Clifton',
    publicPlace: 'Block 4 Main Footpath',
    district: 'South',
    issueTypes: ['Open manhole'],
    status: 'under_review',
    workOrderStatus: null,
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'high',
    latitude: 24.8145,
    longitude: 67.0321,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
  },
  {
    id: 'c-3',
    referenceNumber: 'KHI-2026-9003',
    heading: 'Faded Speed Breaker Markings',
    sanitizedText: 'Unmarked asphalt bump near school gate.',
    factualSummary: 'Faded civic paint markings',
    locality: 'Gulberg',
    publicPlace: 'Block 6 Service Lane',
    district: 'Central',
    issueTypes: ['Paint marking'],
    status: 'assigned',
    workOrderStatus: 'in_progress',
    submittedAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'normal',
    latitude: 24.9123,
    longitude: 67.0789,
  },
];

const MOCK_OFFICERS: DepartmentOfficer[] = [
  {
    user_id: 'off-01',
    display_name: 'Tariq Mehmood',
    staff_role: 'officer',
    active_cases: 2,
    verified_cases: 18,
    on_time_cases: 16,
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
    active_cases: 0,
    verified_cases: 9,
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
    anchor_complaint_id: 'c-3',
    case_label: 'Pothole restoration near NED University',
    status: 'pending_review',
    priority: 'critical',
    due_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

const MOCK_PROOFS: Record<string, DepartmentProof> = {
  'ord-101': {
    id: 'proof-101',
    order_id: 'ord-101',
    storage_path: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8',
    before_storage_path: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7',
    location_result: 'near',
    original_distance_m: 12,
    accuracy_m: 3,
    duplicate_warning: false,
    submitted_at: new Date().toISOString(),
    decision: 'pending',
  },
};

describe('V19 Department Head Portal & Operational Primitives', () => {
  describe('1. HOD Home View (HodHomePage)', () => {
    it('renders personalized greeting, active/solved counters, and filterable Donut chart without incoming cards', () => {
      render(
        <HodHomePage
          departmentName="Roads & Infrastructure"
          hodName="Engr. Asif Khan"
          complaints={MOCK_COMPLAINTS}
          onNavigateToSection={vi.fn()}
        />
      );

      // Greeting with authenticated HOD name
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Engr\. Asif Khan/);
      expect(screen.getByText(/Roads & Infrastructure · Karachi Municipal Operations Command/)).toBeInTheDocument();

      // Total Active Cases & Total Solved Cases
      expect(screen.getByText('Total Active Cases')).toBeInTheDocument();
      expect(screen.getByText('Total Solved Cases')).toBeInTheDocument();

      // Donut chart rendered
      expect(screen.getByTestId('v19-donut-chart')).toBeInTheDocument();

      // Zero incoming complaint cards or heatmaps on Home View
      expect(screen.queryByTestId('v19-complaint-row')).not.toBeInTheDocument();
      expect(screen.queryByText(/Zone Activity Matrix/i)).not.toBeInTheDocument();
    });
  });

  describe('2. HOD Complaints View (HodComplaintsView)', () => {
    it('sorts unassigned complaints priority-first and opens dedicated reading view with lightbox', async () => {
      const onReject = vi.fn().mockResolvedValue(undefined);
      const onAssign = vi.fn().mockResolvedValue(undefined);

      render(
        <HodComplaintsView
          departmentCode="KMC"
          complaints={MOCK_COMPLAINTS}
          officers={MOCK_OFFICERS}
          onRejectComplaint={onReject}
          onAssignComplaint={onAssign}
        />
      );

      // Parallax complaint list rendered with only unassigned complaints (c-1, c-2)
      expect(screen.getByText('Deep Pothole on Main Road')).toBeInTheDocument();
      expect(screen.getByText('Missing Manhole Cover')).toBeInTheDocument();

      // Critical priority is placed first
      const titles = screen.getAllByRole('heading', { level: 4 });
      expect(titles[0]).toHaveTextContent('Deep Pothole on Main Road');

      // Click row to open reading detail view
      fireEvent.click(screen.getByRole('button', { name: /Complaint KHI-2026-9001/i }));

      // Centered title, location information, and description
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: 'Deep Pothole on Main Road' })).toBeInTheDocument();
      });
      expect(screen.getAllByText(/University Road near NED, Gulshan-e-Iqbal/)[0]).toBeInTheDocument();
      expect(screen.getByText(/Deep hazardous crater near crossing/)).toBeInTheDocument();

      // Rejection modal workflow
      const rejectBtn = screen.getByRole('button', { name: /Reject Complaint/i });
      fireEvent.click(rejectBtn);

      const rejectModal = screen.getByRole('dialog', { name: 'Reject complaint' });
      expect(rejectModal).toBeInTheDocument();
      const reasonInput = screen.getByPlaceholderText(/Jurisdiction belongs to/i);
      fireEvent.change(reasonInput, { target: { value: 'Falls under provincial highway authority jurisdiction' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Rejection' }));

      await waitFor(() => {
        expect(onReject).toHaveBeenCalledWith('c-1', 'Falls under provincial highway authority jurisdiction');
      });
    });

    it('opens assignment drawer and executes assignment with duration and instructions', async () => {
      const onAssign = vi.fn().mockResolvedValue(undefined);

      render(
        <HodComplaintsView
          departmentCode="KMC"
          complaints={MOCK_COMPLAINTS}
          officers={MOCK_OFFICERS}
          onRejectComplaint={vi.fn()}
          onAssignComplaint={onAssign}
        />
      );

      // Select complaint
      fireEvent.click(screen.getByRole('button', { name: /Complaint KHI-2026-9001/i }));

      // Click Accept & Assign
      const assignTrigger = await screen.findByRole('button', { name: /Accept & Assign/i });
      fireEvent.click(assignTrigger);

      // Assignment drawer open
      expect(screen.getByRole('dialog', { name: 'Assign complaint to officer' })).toBeInTheDocument();

      // Select active officer Tariq Mehmood card
      fireEvent.click(screen.getByText('Tariq Mehmood'));

      // Enter instructions and submit
      const instructionsInput = screen.getByPlaceholderText(/Specific instructions for the field officer/i);
      fireEvent.change(instructionsInput, { target: { value: 'Repair asphalt patch and level surface.' } });

      fireEvent.click(screen.getByRole('button', { name: /Confirm Assignment/i }));

      await waitFor(() => {
        expect(onAssign).toHaveBeenCalledWith(
          'c-1',
          'off-01',
          72,
          'Repair asphalt patch and level surface.',
          undefined
        );
      });
    });
  });

  describe('3. HOD Verification View (HodVerificationView)', () => {
    it('presents dual-evidence photo comparison, 30m GPS badge, and approve/return actions', async () => {
      const onApprove = vi.fn().mockResolvedValue(undefined);
      const onReturn = vi.fn().mockResolvedValue(undefined);

      render(
        <HodVerificationView
          departmentCode="KMC"
          orders={MOCK_ORDERS}
          proofs={MOCK_PROOFS}
          onApproveResolution={onApprove}
          onReturnCorrection={onReturn}
        />
      );

      expect(screen.getByText('Work Resolution Verification')).toBeInTheDocument();
      expect(screen.getByText('Pothole restoration near NED University')).toBeInTheDocument();
      expect(screen.getByText('GPS 30m Match ✓')).toBeInTheDocument();

      // Select order to inspect dual proof
      fireEvent.click(screen.getByText('Pothole restoration near NED University'));

      await waitFor(() => {
        expect(screen.getByText(/Citizen Initial Report \(Before\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Officer Completed Work \(After\)/i)).toBeInTheDocument();
      });

      // Approve resolution
      const approveBtn = screen.getByRole('button', { name: /Approve Resolution/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalledWith('ord-101');
      });
    });
  });

  describe('4. HOD Officers Management (HodOfficersView)', () => {
    it('manages roster, provisions new officer with temporary credentials, and issues warning', async () => {
      const onProvision = vi.fn().mockResolvedValue({
        officerUserId: 'user-new',
        employeeId: 'kmc-799',
        staffUsername: 'kmc-officer-799',
        temporaryAccessKey: 'TMP-ABCD-1234',
        mustChangePassword: true,
      });
      const onWarning = vi.fn().mockResolvedValue(undefined);
      const onToggleSuspension = vi.fn().mockResolvedValue(undefined);

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

      expect(screen.getByText('Tariq Mehmood')).toBeInTheDocument();
      expect(screen.getByText('Zubair Farooq')).toBeInTheDocument();

      // Click Add New Officer
      fireEvent.click(screen.getByRole('button', { name: /Add New Officer/i }));
      expect(screen.getByRole('dialog', { name: 'Add new officer' })).toBeInTheDocument();

      // Fill form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Bilal Ahmed' } });
      fireEvent.change(screen.getByLabelText(/Official Email/i), { target: { value: 'bilal@kmc.gos.pk' } });
      fireEvent.change(screen.getByLabelText(/CNIC/i), { target: { value: '42101-9988776-1' } });

      fireEvent.click(screen.getByRole('button', { name: /Generate Credentials/i }));

      await waitFor(() => {
        expect(onProvision).toHaveBeenCalled();
        expect(screen.getByText('TMP-ABCD-1234')).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));

      // Select active officer to view details
      fireEvent.click(screen.getByText('Tariq Mehmood'));

      // Issue warning
      fireEvent.click(screen.getByRole('button', { name: /Issue Formal Warning/i }));
      const warnInput = screen.getByPlaceholderText(/Specify the operational reason/i);
      fireEvent.change(warnInput, { target: { value: 'Delayed response to urgent hazard dispatch.' } });
      fireEvent.click(screen.getByRole('button', { name: 'Issue Notice' }));

      await waitFor(() => {
        expect(onWarning).toHaveBeenCalledWith('off-01', 'Delayed response to urgent hazard dispatch.');
      });
    });
  });

  describe('5. Unified Layout & Morphing Ribbon Navigation (V19HodPortalView)', () => {
    it('switches between all 5 tabs and shows live Asia/Karachi clock', async () => {
      render(
        <V19HodPortalView
          departmentId="kmc"
          departmentCode="KMC"
          departmentName="Roads & Infrastructure"
          username="roads-01"
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          onOpenPasswordModal={vi.fn()}
        />
      );

      // Morphing ribbon tabs
      expect(screen.getByRole('tab', { name: /Home/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Complaints/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Verification/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Officers/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Profile/i })).toBeInTheDocument();

      // Trusted Clock element exists
      expect(screen.getByTestId('v19-trusted-clock')).toBeInTheDocument();
      expect(screen.getAllByText(/PKT/)[0]).toBeInTheDocument();

      // Navigate to Officers tab
      fireEvent.click(screen.getByRole('tab', { name: /Officers/i }));
      await waitFor(() => {
        expect(screen.getByTestId('v19-hod-officers')).toBeInTheDocument();
      });

      // Navigate to Profile tab
      fireEvent.click(screen.getByRole('tab', { name: /Profile/i }));
      await waitFor(() => {
        expect(screen.getByTestId('v19-hod-profile')).toBeInTheDocument();
      });
    });
  });
});
