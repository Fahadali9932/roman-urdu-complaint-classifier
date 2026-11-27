import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fieldOperations, type DepartmentWorkOrder } from '../features/department/services/fieldOperations';
import { WorkResolutionForm } from '../features/department/components/v19/work/WorkResolutionForm';
import { OfficerProfileView } from '../features/department/components/v19/OfficerProfileView';
import { ImageLightbox } from '../features/department/components/v19/ImageLightbox';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentAuthContext, type DepartmentAuthSession, type DepartmentAuthContextType } from '../context/DepartmentAuthContext';

describe('AWAAZ-E-AWAM Phase V22.0 — Staff Security, GPS Verification & Officer Onboarding', () => {
  const mockOrder: DepartmentWorkOrder = {
    id: 'test-order-v22-101',
    department_id: 'kmc',
    anchor_complaint_id: 'local-complaint-anchor-01', // baseline lat: 24.9312, lng: 67.1123
    case_label: 'Main University Road — Pothole Repair',
    officer_id: 'local-officer-a',
    assigned_by: 'local-hod',
    status: 'in_progress',
    instructions: 'Repair surface near NED University Gate.',
    assigned_at: new Date().toISOString(),
    due_at: new Date(Date.now() + 86400000).toISOString(),
    original_due_at: new Date(Date.now() + 86400000).toISOString(),
    started_at: new Date().toISOString(),
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Microcopy Refinement & Neutral Styling Across Staff Portals', () => {
    it('renders clean human microcopy and neutral buttons in WorkResolutionForm without AI jargon', () => {
      render(
        <WorkResolutionForm
          order={mockOrder}
          complaint={{
            id: 'local-complaint-anchor-01',
            referenceNumber: 'CMP-KMC-2026-001',
            heading: 'Main University Road Pothole',
            department: 'kmc',
            status: 'in_progress',
            priority: 'HIGH',
            createdAt: new Date().toISOString(),
            latitude: 24.9312,
            longitude: 67.1123,
            locality: 'NED University',
          }}
          onBack={vi.fn()}
          onSubmit={vi.fn()}
          onOpenLightbox={vi.fn()}
        />
      );

      // Verify human labels are present
      expect(screen.getByText(/1\. Citizen evidence/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Completed work/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Verify location/i)).toBeInTheDocument();
      expect(screen.getByText(/4\. Completion notes/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Submit completed work/i).length).toBeGreaterThanOrEqual(1);

      // Verify button uses neutral styling with v20-field-btn success
      const submitBtn = screen.getByTestId('submit-for-verification-btn');
      expect(submitBtn).toHaveClass('v20-field-btn');
      expect(submitBtn).toHaveClass('success');
    });
  });

  describe('2. Server-Authoritative GPS Verification & Anti-Tampering', () => {
    it('verifies location when within 30m radius of authoritative complaint coordinates', async () => {
      // 24.9312, 67.1123 is NED gate baseline. Off by ~10m: 24.93128, 67.1123
      const res = await fieldOperations.verifyLocation({
        orderId: mockOrder.id,
        latitude: 24.93128,
        longitude: 67.1123,
        accuracy: 8,
        deviceTimestamp: Date.now(),
      });

      expect(res.verified).toBe(true);
      expect(res.status).toBe('verified');
      expect(res.distanceMeters).toBeDefined();
      expect(res.distanceMeters!).toBeLessThanOrEqual(30);
      expect(res.verificationId).toMatch(/^loc-verif-/);
      expect(res.consumed).toBe(false);
    });

    it('rejects verification if GPS accuracy is too low (> 50m)', async () => {
      const res = await fieldOperations.verifyLocation({
        orderId: mockOrder.id,
        latitude: 24.9312,
        longitude: 67.1123,
        accuracy: 75, // Too high uncertainty
        deviceTimestamp: Date.now(),
      });

      expect(res.verified).toBe(false);
      expect(res.status).toBe('inconclusive_accuracy');
      expect(res.message).toMatch(/GPS uncertainty is too high/i);
    });

    it('flags outside radius if coordinates are further than 30m', async () => {
      // 24.9350 is ~420m away from 24.9312
      const res = await fieldOperations.verifyLocation({
        orderId: mockOrder.id,
        latitude: 24.9350,
        longitude: 67.1123,
        accuracy: 10,
        deviceTimestamp: Date.now(),
      });

      expect(res.verified).toBe(false);
      expect(res.status).toBe('outside_radius');
      expect(res.distanceMeters!).toBeGreaterThan(30);
    });

    it('rejects stale measurements older than 5 minutes', async () => {
      const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      await expect(
        fieldOperations.verifyLocation({
          orderId: mockOrder.id,
          latitude: 24.9312,
          longitude: 67.1123,
          accuracy: 10,
          deviceTimestamp: staleTimestamp,
        })
      ).rejects.toThrow(/measurement expired/i);
    });

    it('prevents replay attacks: token cannot be consumed twice', async () => {
      const tokenRes = await fieldOperations.verifyLocation({
        orderId: 'local-dev-order-01',
        latitude: 24.9312,
        longitude: 67.1123,
        accuracy: 10,
        deviceTimestamp: Date.now(),
      });

      const fakeFile = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });

      // First submission succeeds
      const sub1 = await fieldOperations.submitWorkCompletion(
        'local-dev-order-01',
        'proofs/kmc/test-1.jpg',
        {
          latitude: 24.9312,
          longitude: 67.1123,
          accuracy: 10,
          verificationId: tokenRes.verificationId,
        },
        fakeFile
      );
      expect(sub1.success).toBe(true);

      // Replay submission with same token must be rejected
      await expect(
        fieldOperations.submitWorkCompletion(
          'local-dev-order-01',
          'proofs/kmc/test-2.jpg',
          {
            latitude: 24.9312,
            longitude: 67.1123,
            accuracy: 10,
            verificationId: tokenRes.verificationId,
          },
          fakeFile
        )
      ).rejects.toThrow(/already been consumed/i);
    });

    it('rejects cross-order token manipulation', async () => {
      const tokenRes = await fieldOperations.verifyLocation({
        orderId: 'local-dev-order-01',
        latitude: 24.9312,
        longitude: 67.1123,
        accuracy: 10,
        deviceTimestamp: Date.now(),
      });

      const fakeFile = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });

      // Attaching token issued for order-01 to order-02 must be rejected
      await expect(
        fieldOperations.submitWorkCompletion(
          'local-dev-order-02',
          'proofs/kmc/cross-order.jpg',
          {
            latitude: 24.8715,
            longitude: 67.0620,
            accuracy: 10,
            verificationId: tokenRes.verificationId,
          },
          fakeFile
        )
      ).rejects.toThrow(/does not match target work order/i);
    });
  });

  describe('3. Screenshot Deterrence & Sensitive-Data Protection', () => {
    it('renders sensitive evidence watermark stamp and conceals view on tab blur', () => {
      const { container } = render(
        <ImageLightbox
          imageUrl="blob:test-evidence-preview"
          caption="Completed asphalt repair"
          onClose={vi.fn()}
          watermarkText="OFFICER-007 · KMC"
        />
      );

      // Watermark is rendered with confidentiality label
      expect(screen.getByText(/CONFIDENTIAL · SENSITIVE EVIDENCE/i)).toBeInTheDocument();
      expect(screen.getByText(/OFFICER-007 · KMC/i)).toBeInTheDocument();

      // Trigger window blur (simulating tab switch or window minimize)
      fireEvent.blur(window);

      // Sensitive Evidence Concealed shield appears
      expect(screen.getByText(/Sensitive Evidence Concealed/i)).toBeInTheDocument();
      expect(screen.getByText(/Application is out of focus/i)).toBeInTheDocument();

      // Trigger window focus (user returns to application)
      fireEvent.focus(window);

      // Concealment shield is removed
      expect(screen.queryByText(/Sensitive Evidence Concealed/i)).not.toBeInTheDocument();
    });
  });

  describe('4. Centralized Officer Provisioning & Profile Synchronization', () => {
    it('provisions officer and synchronizes authoritative profile to officer view', async () => {
      const provisionRes = await fieldOperations.provisionOfficer({
        departmentId: 'kmc',
        fullName: 'Asadullah Khan',
        employeeId: 'emp-v22-99',
        email: 'asadullah@kmc.gos.pk',
        phone: '0300-1234567',
        joiningDate: '2026-11-01T00:00:00.000Z',
      });

      expect(provisionRes.employeeId).toBe('emp-v22-99');
      expect(provisionRes.staffUsername).toBe('kmc-emp-v22-99');
      expect(provisionRes.mustChangePassword).toBe(true);

      // Fetch profile
      const prof = await fieldOperations.fetchOfficerProfile(provisionRes.officerUserId);
      expect(prof).not.toBeNull();
      expect(prof?.full_name).toBe('Asadullah Khan');
      expect(prof?.official_email).toBe('asadullah@kmc.gos.pk');
      expect(prof?.phone_masked).toBe('0300-***-567');
      expect(prof?.department_id).toBe('kmc');

      // Mount OfficerProfileView with provisioned officer
      render(
        <OfficerProfileView
          departmentCode="KMC"
          departmentName="Karachi Metropolitan Corporation"
          officerName="Asadullah Khan"
          employeeId="emp-v22-99"
          staffUsername="kmc-emp-v22-99"
          onSignOut={vi.fn()}
        />
      );

      // Verify official personnel file card
      expect(screen.getByTestId('officer-personnel-file-card')).toBeInTheDocument();
      expect(screen.getByText(/Official personnel file/i)).toBeInTheDocument();
      expect(screen.getByText('Asadullah Khan')).toBeInTheDocument();
      expect(screen.getByText('Change password')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  describe('5. Mandatory First-Login Email OTP Onboarding Gate', () => {
    it('validates 6-digit email OTP and enforces password update before granting access', async () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
      vi.spyOn(fieldOperations, 'getMyRole').mockResolvedValue('officer');
      const clearMustChangePassword = vi.fn();
      const completeSpy = vi.spyOn(fieldOperations, 'completeFirstLoginPassword').mockResolvedValue();
      const otpSpy = vi.spyOn(fieldOperations, 'verifyOnboardingOtp');

      const mockSession: DepartmentAuthSession = {
        userId: 'test-officer-onboarding-1',
        departmentId: 'kmc',
        departmentName: 'Karachi Metropolitan Corporation',
        departmentCode: 'KMC',
        mustChangePassword: true,
        authenticatedAt: new Date().toISOString(),
      };

      const mockAuth: DepartmentAuthContextType = {
        departmentId: 'kmc',
        departmentMeta: null,
        availableDepartments: [],
        isAuthenticated: true,
        isCheckingSession: false,
        session: mockSession,
        clearMustChangePassword,
        signIn: vi.fn(),
        signInWithCredentials: vi.fn(),
        completeMfaSignIn: vi.fn(),
        checkRevocationStatus: () => ({ authorized: true }),
        signOut: vi.fn(),
      };

      render(
        <MemoryRouter initialEntries={['/department/officer']}>
          <DepartmentAuthContext.Provider value={mockAuth}>
            <Routes>
              <Route path="/department/officer" element={<DepartmentDashboardPage />} />
            </Routes>
          </DepartmentAuthContext.Provider>
        </MemoryRouter>
      );

      const gate = await screen.findByTestId('forced-password-change-gate');
      expect(within(gate).getByRole('heading', { name: /Update temporary access key/i })).toBeInTheDocument();

      // Verify 6-digit OTP fields in 2 groups of 3
      const otpGroup1 = within(gate).getByTestId('onboarding-otp-group-1');
      const otpGroup2 = within(gate).getByTestId('onboarding-otp-group-2');
      expect(otpGroup1).toBeInTheDocument();
      expect(otpGroup2).toBeInTheDocument();

      fireEvent.change(otpGroup1, { target: { value: '987' } });
      fireEvent.change(otpGroup2, { target: { value: '654' } });

      // Enter compliant 15+ char password
      fireEvent.change(within(gate).getByLabelText(/New passphrase/i), { target: { value: 'Karachi_FieldSecure#2026' } });
      fireEvent.change(within(gate).getByLabelText(/Confirm passphrase/i), { target: { value: 'Karachi_FieldSecure#2026' } });

      fireEvent.click(within(gate).getByRole('button', { name: /Set personal passphrase/i }));

      await waitFor(() => {
        expect(otpSpy).toHaveBeenCalledWith('987654');
        expect(completeSpy).toHaveBeenCalledWith('Karachi_FieldSecure#2026');
        expect(clearMustChangePassword).toHaveBeenCalledTimes(1);
      });
    });
  });
});
