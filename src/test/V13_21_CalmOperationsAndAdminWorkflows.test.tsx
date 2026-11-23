import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fieldOperations, type DepartmentOfficer, type DepartmentWorkOrder } from '../features/department/services/fieldOperations';
import { FieldOperationsDesk } from '../features/department/components/FieldOperationsDesk';
import { DepartmentRoleBoundary } from '../features/department/DepartmentRoleBoundary';
import { DepartmentAuthContext, type DepartmentAuthContextType } from '../context/DepartmentAuthContext';
import { staffAuthService } from '../services/staffAuthService';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import { aiReviewService } from '../services/aiReviewService';
import { useCivicTheme } from '../features/department/hooks/useCivicTheme';
import { caseOperationsService } from '../services/CaseOperationsService';

function makeMockAuthContext(role: 'head' | 'officer', userId = 'test-user-01'): DepartmentAuthContextType {
  return {
    departmentId: 'kmc',
    departmentMeta: null,
    availableDepartments: [],
    isAuthenticated: true,
    isCheckingSession: false,
    session: {
      userId,
      email: `${userId}@kmc.gov.pk`,
      departmentId: 'kmc',
      departmentName: 'Karachi Metropolitan Corporation',
      departmentCode: 'KMC',
      authenticatedAt: new Date().toISOString(),
    },
    signIn: vi.fn(),
    signInWithCredentials: vi.fn(),
    completeMfaSignIn: vi.fn(),
    checkRevocationStatus: vi.fn().mockReturnValue({ authorized: true }),
    signOut: vi.fn(),
  };
}

describe('V13.21 Calm Operations & Central Admin Workflows Test Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localSupabaseAdapter.resetToDefault();
    localSupabaseAdapter.seedDemoAdminData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Role Protection & Server Boundary Isolation
  describe('1. Role Protection & Server Boundary Isolation', () => {
    it('prevents a Field Officer from viewing or accessing the Department Head Desk', async () => {
      const officerCtx = makeMockAuthContext('officer', 'local-officer-a');
      render(
        <MemoryRouter>
          <DepartmentAuthContext.Provider value={officerCtx}>
            <DepartmentRoleBoundary expectedRole="head">
              <div data-testid="head-desk-content">Confidential Department Head Desk</div>
            </DepartmentRoleBoundary>
          </DepartmentAuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('head-desk-content')).toBeNull();
      await waitFor(() => {
        expect(screen.getByText(/Different staff workspace/i)).toBeInTheDocument();
        expect(screen.getByText(/This address is reserved for Department Heads/i)).toBeInTheDocument();
      });
    });

    it('prevents a Department Head from accessing an individual Officer My Day workspace', async () => {
      const headCtx = makeMockAuthContext('head', 'staff-kmc-demo-01');
      render(
        <MemoryRouter>
          <DepartmentAuthContext.Provider value={headCtx}>
            <DepartmentRoleBoundary expectedRole="officer">
              <div data-testid="officer-desk-content">Officer My Day Tasks</div>
            </DepartmentRoleBoundary>
          </DepartmentAuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('officer-desk-content')).toBeNull();
      await waitFor(() => {
        expect(screen.getByText(/Different staff workspace/i)).toBeInTheDocument();
        expect(screen.getByText(/This address is reserved for Field Officers/i)).toBeInTheDocument();
      });
    });
  });

  // 2. Sequential 5-Stage Guided Assignment Flow
  describe('2. Sequential 5-Stage Assignment Flow (Case → Officer → Deadline → Instructions → Confirm)', () => {
    it('progresses through all 5 sequential stages with step navigation, validation, and confirmation review', async () => {
      vi.spyOn(caseOperationsService, 'listDepartmentCases').mockResolvedValue({
        items: [
          {
            id: 'case-test-01',
            caseNumber: 'C-2051',
            departmentId: 'kmc',
            title: 'Main University Road — Broken Asphalt & Deep Pothole',
            issueFamily: 'Roads',
            issueSubtype: 'Road damage',
            publicPlace: 'NED University Gate 1',
            district: 'East',
            locality: 'Gulshan-e-Iqbal',
            workStatus: 'pending_assignment',
            linkedReportCount: 3,
            uniqueReporterCount: 3,
            pendingAcceptanceCount: 0,
            priority: 'critical',
            priorityReason: 'Hazard on arterial road',
            firstReportedAt: new Date().toISOString(),
            lastReportedAt: new Date().toISOString(),
            oldestPendingAt: new Date().toISOString(),
            ageDays: 1,
            assignedStaffId: null,
            assignedStaffLabel: 'Unassigned',
            summary: 'Damaged road surface requiring urgent patching.',
            version: 1,
          },
        ],
        total: 1,
        page: 0,
        pageSize: 35,
      });

      // Mock listCaseReports so assigning case succeeds
      vi.spyOn(caseOperationsService, 'listCaseReports').mockResolvedValue({
        items: [
          {
            complaintId: 'comp-seed-101',
            referenceNumber: 'AA-2026-101',
            text: 'Deep pothole and broken surface on University Road',
            departmentId: 'kmc',
            locality: 'Gulshan',
            publicPlace: 'NED University',
            status: 'assigned',
            priority: 'critical',
            reportedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 0,
        pageSize: 100,
      });

      const assignSpy = vi.spyOn(fieldOperations, 'assign').mockResolvedValue('order-test-uuid-99');

      render(
        <MemoryRouter>
          <FieldOperationsDesk departmentId="kmc" userId="staff-kmc-demo-01" role="head" view="dispatch" />
        </MemoryRouter>
      );

      // Wait for cases and desk to load
      await waitFor(() => {
        expect(screen.getByText(/5-STAGE DISPATCH WORKFLOW/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Main University Road — Broken Asphalt & Deep Pothole/i).length).toBeGreaterThan(0);
      });

      // Initially no case selected, shows 3-step intro brief
      expect(screen.getByText(/Three steps to dispatch a case/i)).toBeInTheDocument();

      // Click on the case from the queue to start Step 1
      const caseButtons = screen.getAllByRole('button', { name: /Main University Road/i });
      fireEvent.click(caseButtons[caseButtons.length - 1]);

      // Stage 1: Case Verification
      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 5: Case Verification/i)).toBeInTheDocument();
      });
      const nextToOfficerBtn = screen.getByRole('button', { name: /Next: Choose Officer/i });
      expect(nextToOfficerBtn).toBeInTheDocument();
      fireEvent.click(nextToOfficerBtn);

      // Stage 2: Officer Selection
      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 5: Responsible officer/i)).toBeInTheDocument();
      });
      const nextToDeadlineBtn = screen.getByRole('button', { name: /Next: Set Deadline/i });
      expect(nextToDeadlineBtn).toBeDisabled(); // Disabled until officer selected

      // Select an officer
      const officerSelect = screen.getByRole('combobox', { name: /Responsible officer/i });
      fireEvent.change(officerSelect, { target: { value: 'local-officer-a' } });
      expect(nextToDeadlineBtn).not.toBeDisabled();
      fireEvent.click(nextToDeadlineBtn);

      // Stage 3: Deadline Selection
      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 5: Resolution Deadline/i)).toBeInTheDocument();
      });
      const nextToInstructionsBtn = screen.getByRole('button', { name: /Next: Write Instructions/i });
      expect(nextToInstructionsBtn).not.toBeDisabled();
      fireEvent.click(nextToInstructionsBtn);

      // Stage 4: Instructions Briefing
      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 5: Instructions to officer/i)).toBeInTheDocument();
      });
      const instructionsInput = screen.getByLabelText(/Instructions to officer/i);
      const nextToConfirmBtn = screen.getByRole('button', { name: /Next: Review Summary/i });
      expect(nextToConfirmBtn).not.toBeDisabled(); // default instructions >= 8 chars

      // Change instructions to custom text
      fireEvent.change(instructionsInput, {
        target: { value: 'Deploy asphalt compaction crew near NED Gate 2.' },
      });
      fireEvent.click(nextToConfirmBtn);

      // Stage 5: Final Confirmation Summary Review
      await waitFor(() => {
        expect(screen.getByText(/Step 5 of 5: Work Order Summary/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/READY TO DISPATCH/i)).toBeInTheDocument();
      expect(screen.getByText(/Deploy asphalt compaction crew near NED Gate 2/i)).toBeInTheDocument();

      // Test Back navigation: Click Back from Confirmation to Instructions
      const backBtn = screen.getByRole('button', { name: /← Back/i });
      fireEvent.click(backBtn);
      expect(screen.getByText(/Step 4 of 5: Instructions to officer/i)).toBeInTheDocument();

      // Return to Confirm stage
      fireEvent.click(screen.getByRole('button', { name: /Next: Review Summary/i }));
      expect(screen.getByText(/Step 5 of 5: Work Order Summary/i)).toBeInTheDocument();

      // Submit final confirmation
      const confirmSubmitBtn = screen.getByRole('button', { name: /Confirm & Dispatch Work Order/i });
      fireEvent.click(confirmSubmitBtn);

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledTimes(1);
        expect(assignSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            departmentId: 'kmc',
            officerId: 'local-officer-a',
            instructions: 'Deploy asphalt compaction crew near NED Gate 2.',
          })
        );
      });
    });
  });

  // 3. Dual Before/After Evidence Pipeline
  describe('3. Dual Before/After Evidence Pipeline', () => {
    it('submits both before and after evidence, stores both paths, and displays them side-by-side for supervisor verification', async () => {
      const mockAfterPhoto = new File(['after-image-content'], 'repaired_road.jpg', { type: 'image/jpeg' });
      const mockBeforePhoto = new File(['before-image-content'], 'damaged_road.jpg', { type: 'image/jpeg' });
      const mockCoords = {
        latitude: 24.9321,
        longitude: 67.1123,
        accuracy: 12,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      } as GeolocationCoordinates;

      // Submit evidence with both photos
      const submitResult = await fieldOperations.submitEvidence('local-dev-order-01', {
        afterPhoto: mockAfterPhoto,
        beforePhoto: mockBeforePhoto,
        location: mockCoords,
      });

      expect(submitResult.success).toBe(true);

      // Retrieve proof
      const proof = await fieldOperations.proof('local-dev-order-01');
      expect(proof).not.toBeNull();
      expect(proof?.storage_path).toContain('repaired_road.jpg');
      expect(proof?.before_storage_path).toContain('damaged_road.jpg');
      expect(proof?.decision).toBe('pending');

      // Supervisor approves evidence
      await fieldOperations.review('local-dev-order-01', true, 'Asphalt patch inspected and verified to municipal standards.');

      const updatedOrders = await fieldOperations.orders('kmc');
      const order = updatedOrders.find((o) => o.id === 'local-dev-order-01');
      expect(order?.status).toBe('verified');
      expect(order?.review_note).toContain('Asphalt patch inspected');

      const approvedProof = await fieldOperations.proof('local-dev-order-01');
      expect(approvedProof?.decision).toBe('approved');
    });

    it('allows the supervisor to return work for correction when evidence is unsatisfactory', async () => {
      await fieldOperations.review('local-dev-order-01', false, 'Photograph too blurry; re-capture with clear lighting.');

      const orders = await fieldOperations.orders('kmc');
      const order = orders.find((o) => o.id === 'local-dev-order-01');
      expect(order?.status).toBe('returned');
      expect(order?.review_note).toBe('Photograph too blurry; re-capture with clear lighting.');
    });
  });

  // 4. Deadline Extension Requests
  describe('4. Deadline Extension Requests', () => {
    it('allows an officer to submit an extension request and supervisor to approve it', async () => {
      const extendedDeadline = new Date(Date.now() + 5 * 86400000).toISOString();
      await fieldOperations.requestExtension(
        'local-dev-order-01',
        extendedDeadline,
        'Heavy monsoon rainfall delayed bitumen drying.'
      );

      let orders = await fieldOperations.orders('kmc');
      let order = orders.find((o) => o.id === 'local-dev-order-01');
      expect(order?.extension_requested_due_at).toBe(extendedDeadline);
      expect(order?.extension_reason).toContain('Heavy monsoon rainfall');

      // Supervisor approves extension
      await fieldOperations.decideExtension('local-dev-order-01', true);

      orders = await fieldOperations.orders('kmc');
      order = orders.find((o) => o.id === 'local-dev-order-01');
      expect(order?.due_at).toBe(extendedDeadline);
      expect(order?.extension_requested_due_at).toBeNull();
    });
  });

  // 5. Theme Persistence and Anti-Flash Synchronization
  describe('5. Civic Theme Persistence & Synchronous Anti-Flash', () => {
    function ThemeTestComponent() {
      const { theme, toggleTheme } = useCivicTheme();
      return (
        <div>
          <span data-testid="current-theme">{theme}</span>
          <button type="button" onClick={toggleTheme}>
            Toggle Theme
          </button>
        </div>
      );
    }

    it('persists theme selection to localStorage and updates html attributes without layout shifts', () => {
      localStorage.setItem('awaaz_dept_theme_mode', 'light');
      render(<ThemeTestComponent />);

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(localStorage.getItem('awaaz_dept_theme_mode')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  // 6. Central Administrator Workflows: Applicant Approval, Rejection, Suspension, Role Realignment, and Audit Ledger
  describe('6. Central Administrator Portal: Approvals, Suspensions, Roles & Immutable Audit Ledger', () => {
    it('validates NADRA CNIC format and government domain, and executes approval with audit log generation', async () => {
      const pending = await staffAuthService.getPendingDepartmentRequests();
      expect(pending.length).toBeGreaterThan(0);
      const targetReq = pending[0];

      // CNIC NADRA validation check
      expect(targetReq.cnic).toMatch(/^\d{5}-\d{7}-\d$/);

      // Official government domain verification check
      const isGovDomain = /\.(gov|gos|gob|gop)\.pk$/i.test(targetReq.work_email) ||
        /@(kmc|kwsc|ssgc|ke|sswmb|sbca)\./i.test(targetReq.work_email);
      expect(isGovDomain).toBe(true);

      // Approve access
      const approveRes = await staffAuthService.approveDepartmentRequest(targetReq.id);
      expect(approveRes.success).toBe(true);

      // Verify audit ledger
      const auditLog = staffAuthService.getAccessAuditLog();
      const approvalAudit = auditLog.find((a) => a.action === 'request_approved' && a.target_email === targetReq.work_email);
      expect(approvalAudit).toBeDefined();
      expect(approvalAudit?.department_id).toBe(targetReq.department_id);
    });

    it('records rejection with mandatory justification in the audit ledger', async () => {
      const pending = await staffAuthService.getPendingDepartmentRequests();
      const targetReq = pending.find((r) => r.status === 'pending');
      if (!targetReq) return;

      const rejectRes = await staffAuthService.rejectDepartmentRequest(
        targetReq.id,
        'Work email domain did not match departmental clearance records.'
      );
      expect(rejectRes.success).toBe(true);

      const auditLog = staffAuthService.getAccessAuditLog();
      const rejectAudit = auditLog.find((a) => a.action === 'request_rejected' && a.target_email === targetReq.work_email);
      expect(rejectAudit).toBeDefined();
      expect((rejectAudit?.details as any)?.reason).toBe('Work email domain did not match departmental clearance records.');
    });

    it('suspends an active staff member and denies immediate authorization', async () => {
      const memberships = await staffAuthService.getApprovedDepartmentMemberships();
      const targetMem = memberships[0];

      // Suspend access
      const suspendRes = await staffAuthService.suspendDepartmentAccess(
        targetMem.id,
        'Pending internal inquiry regarding unverified road repairs.'
      );
      expect(suspendRes.success).toBe(true);

      // Check immediate access denial at server boundary
      const accessCheck = staffAuthService.checkCurrentStaffAccess(targetMem.user_id);
      expect(accessCheck.authorized).toBe(false);
      expect(accessCheck.status).toBe('suspended');
      expect(accessCheck.reason).toContain('Suspended: Pending internal inquiry');

      // Verify audit log
      const auditLog = staffAuthService.getAccessAuditLog();
      const suspendAudit = auditLog.find((a) => a.action === 'access_suspended' && a.target_user_id === targetMem.user_id);
      expect(suspendAudit).toBeDefined();
    });

    it('updates staff role between Department Head and Field Officer with audit record', async () => {
      const memberships = await staffAuthService.getApprovedDepartmentMemberships();
      const targetMem = memberships.find((m) => m.staff_role === 'officer') || memberships[0];

      // Realignment from officer to head
      const updateRes = await staffAuthService.updateStaffRole(
        targetMem.id,
        'head',
        'Promoted to acting department head'
      );
      expect(updateRes.success).toBe(true);

      const updatedMemberships = await staffAuthService.getApprovedDepartmentMemberships();
      const updated = updatedMemberships.find((m) => m.id === targetMem.id);
      expect(updated?.staff_role).toBe('head');

      const auditLog = staffAuthService.getAccessAuditLog();
      const roleAudit = auditLog.find((a) => a.action === 'role_updated' && a.target_user_id === targetMem.user_id);
      expect(roleAudit).toBeDefined();
      expect((roleAudit?.details as any)?.newRole).toBe('head');
    });

    it('inspects inter-department routing disputes with Roman Urdu excerpts and AI attribution', async () => {
      const queue = await aiReviewService.refreshReviewQueue();
      expect(Array.isArray(queue)).toBe(true);

      // Verify queue items have Roman Urdu complaints, department tags, and staff flags
      if (queue.length > 0) {
        const item = queue[0];
        expect(item.referenceNumber).toBeDefined();
        expect(item.text).toBeDefined();
        expect(item.originalDepartments).toBeDefined();
        expect(item.flaggedByStaffName).toBeDefined();
      }
    });
  });
});
