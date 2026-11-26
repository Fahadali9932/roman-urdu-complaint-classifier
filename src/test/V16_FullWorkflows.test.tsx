import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  findAdvisoryIncidentMatches,
  type ActiveIncident,
  type IncidentIdentity,
} from '../features/department/services/incidentMatching';
import { caseOperationsService, getPktPeriodBounds } from '../services/CaseOperationsService';
import { fieldOperations } from '../features/department/services/fieldOperations';
import { HeadComplaintsPage } from '../features/department/components/HeadComplaintsPage';
import { HeadComplaintDetailView } from '../features/department/components/HeadComplaintDetailView';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentAuthContext, type DepartmentAuthContextType } from '../context/DepartmentAuthContext';

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

describe('V16 Comprehensive Workflows: Independent Intake, Advisory Linking, Staff Lifecycle & Flat Head UI', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    caseOperationsService.resetToDefault();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Duplicate Advisory & Candidate Edge Cases', () => {
    const baseSource: IncidentIdentity = {
      complaintId: 'comp-new',
      departmentId: 'kmc',
      issueTypes: ['road_damage'],
      pin: { latitude: 24.9001, longitude: 67.1001 },
    };

    const baseCandidate: ActiveIncident = {
      complaintId: 'comp-old',
      orderId: 'wo-1',
      departmentId: 'kmc',
      issueTypes: ['road_damage'],
      pin: { latitude: 24.90015, longitude: 67.10015 },
      status: 'in_progress',
    };

    it('sorts multiple within-30m matches nearest first and marks pending_review as cannot direct attach', () => {
      const results = findAdvisoryIncidentMatches(baseSource, [
        { ...baseCandidate, orderId: 'wo-farther', complaintId: 'c-2', pin: { latitude: 24.90025, longitude: 67.1001 } },
        { ...baseCandidate, orderId: 'wo-nearest', complaintId: 'c-1', pin: { latitude: 24.90011, longitude: 67.1001 } },
        { ...baseCandidate, orderId: 'wo-review', complaintId: 'c-3', status: 'pending_review', pin: { latitude: 24.90013, longitude: 67.1001 } },
      ]);

      expect(results.map((r) => r.incident.orderId)).toEqual(['wo-nearest', 'wo-review', 'wo-farther']);
      expect(results[0].canDirectAttach).toBe(true);
      expect(results[1].canDirectAttach).toBe(false);
      expect(results[1].blockReason).toMatch(/Proof review/i);
    });

    it('excludes generic/unknown subtypes unless includeUncertain is toggled on, and blocks mixed multi-issue sets', () => {
      const unknownIncoming: IncidentIdentity = { ...baseSource, issueTypes: ['general'] };
      expect(findAdvisoryIncidentMatches(unknownIncoming, [baseCandidate])).toEqual([]);

      const uncertainIncluded = findAdvisoryIncidentMatches(unknownIncoming, [baseCandidate], {
        includeUncertain: true,
      });
      expect(uncertainIncluded).toHaveLength(1);
      expect(uncertainIncluded[0].matchConfidence).toBe('uncertain_subtype_pin');

      const mixedIncoming: IncidentIdentity = { ...baseSource, issueTypes: ['road_damage', 'unknown'] };
      expect(
        findAdvisoryIncidentMatches(mixedIncoming, [baseCandidate], { includeUncertain: true })
      ).toEqual([]);
    });

    it('rejects unconfirmed multi-report batch acceptance while keeping single-report acceptance atomic', async () => {
      const single = await caseOperationsService.executeBulkAcceptance('demo-kmc-001', 'idemp-single-1');
      expect(single.accepted).toBe(1);

      // Simulate multi-report case that has not been manually consolidated: blocked in V16
      const kmcCases = await caseOperationsService.listDepartmentCases('kmc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 5,
      });
      const firstCase = kmcCases.items[0];
      expect(firstCase.linkedReportCount).toBe(1);
      expect(firstCase.reports).toHaveLength(1);

      // Push an unconfirmed synthetic second report and ensure bulk execution refuses blindly accepting it
      firstCase.reports.push({
        ...firstCase.reports[0],
        complaintId: 'unconfirmed-second',
        referenceNumber: 'KHI-2026-UNCONFIRMED',
        status: 'assigned',
      });
      await expect(
        caseOperationsService.executeBulkAcceptance(firstCase.id, 'idemp-multi-blocked')
      ).rejects.toThrow(/Unconfirmed multi-report batch acceptance is disabled/i);
    });
  });

  describe('2. PKT Window Boundaries & Independent Overview', () => {
    it('computes strict Asia/Karachi (+05:00) calendar bounds for Today, Yesterday, This month, This year', () => {
      const refNow = new Date('2026-11-26T20:15:00.000Z'); // 2026-11-27 01:15 PKT
      const today = getPktPeriodBounds('today', refNow.getTime());
      const yesterday = getPktPeriodBounds('yesterday', refNow.getTime());
      const month = getPktPeriodBounds('month', refNow.getTime());
      const year = getPktPeriodBounds('year', refNow.getTime());

      expect(new Date(today.startMs).toISOString()).toBe('2026-11-26T19:00:00.000Z');
      expect(yesterday.endMs).toBe(today.startMs - 1);
      expect(new Date(month.startMs).toISOString()).toBe('2026-10-31T19:00:00.000Z');
      expect(new Date(year.startMs).toISOString()).toBe('2025-12-31T19:00:00.000Z');
    });

    it('produces distinct active totals matching sum of 4 exact status buckets', async () => {
      const overview = await caseOperationsService.getHeadPeriodOverview('kmc', 'month');
      expect(overview.totalActive).toBe(
        overview.newComplaints + overview.underReview + overview.inProgress + overview.awaitingVerification
      );
      expect(overview.totalActive).toBeGreaterThan(0);
    });
  });

  describe('3. Staff Officer Provisioning, First-Login Gate & Suspension Protection', () => {
    it('generates a one-time temporary key without persisting it in localStorage/sessionStorage and keeps suspended officer open orders intact', async () => {
      const empId = `t${Date.now()}`;
      const created = await fieldOperations.provisionOfficer({
        departmentId: 'kmc',
        fullName: 'Tariq Mahmood',
        employeeId: empId,
      });

      expect(created.staffUsername).toBe(`kmc-${empId}`);
      expect(created.mustChangePassword).toBe(true);
      expect(created.temporaryAccessKey).toMatch(/^TMP-/);

      const allStorage = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
      expect(allStorage).not.toContain(created.temporaryAccessKey);

      await expect(
        fieldOperations.provisionOfficer({
          departmentId: 'kmc',
          fullName: 'Duplicate Tariq',
          employeeId: empId,
        })
      ).rejects.toThrow(/already registered/i);

      const reset = await fieldOperations.resetOfficerCredentials({
        departmentId: 'kmc',
        targetUserId: created.officerUserId,
      });
      expect(reset.temporaryAccessKey).toMatch(/^RST-/);
      expect(reset.mustChangePassword).toBe(true);

      await fieldOperations.suspendOfficer({
        departmentId: 'kmc',
        targetUserId: 'local-officer-b',
        reason: 'Medical leave',
      });
      const activeTeamAfterSuspend = await fieldOperations.team('kmc');
      expect(activeTeamAfterSuspend.some((m) => m.user_id === 'local-officer-b')).toBe(false);

      const existingOrders = await fieldOperations.orders('kmc');
      expect(existingOrders.some((o) => o.officer_id === 'local-officer-b')).toBe(true);

      await fieldOperations.reassignWorkOrderOfficer({
        departmentId: 'kmc',
        orderId: 'local-dev-order-03',
        newOfficerId: 'local-officer-a',
        reason: 'Officer suspended; transferred to active teammate',
      });
      const updatedOrders = await fieldOperations.orders('kmc');
      expect(updatedOrders.find((o) => o.id === 'local-dev-order-03')?.officer_id).toBe('local-officer-a');

      await fieldOperations.reactivateOfficer({ departmentId: 'kmc', targetUserId: 'local-officer-b' });
      const teamAfterReactivate = await fieldOperations.team('kmc');
      expect(teamAfterReactivate.some((m) => m.user_id === 'local-officer-b')).toBe(true);
    });

    it('enforces mandatory first-login passphrase update before mounting operational workspace', async () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
      vi.spyOn(fieldOperations, 'getMyRole').mockResolvedValue('officer');
      const completeSpy = vi.spyOn(fieldOperations, 'completeFirstLoginPassword').mockResolvedValue();

      const clearMustChangePassword = vi.fn();
      const auth = createAuthValue({
        session: {
          userId: 'new-officer-1',
          username: 'kmc-900',
          departmentId: 'kmc',
          loggedInAt: '2026-11-26T06:00:00.000Z',
          mustChangePassword: true,
        },
        clearMustChangePassword,
      });

      render(
        <MemoryRouter initialEntries={['/department/officer']}>
          <DepartmentAuthContext.Provider value={auth}>
            <Routes>
              <Route path="/department/officer" element={<DepartmentDashboardPage />} />
            </Routes>
          </DepartmentAuthContext.Provider>
        </MemoryRouter>
      );

      const gate = await screen.findByTestId('forced-password-change-gate');
      expect(within(gate).getByRole('heading', { name: /Update temporary access key/i })).toBeInTheDocument();

      fireEvent.change(within(gate).getByLabelText(/New passphrase/i), { target: { value: 'KarachiField#2026_Secure' } });
      fireEvent.change(within(gate).getByLabelText(/Confirm passphrase/i), { target: { value: 'KarachiField#2026_Secure' } });
      fireEvent.click(within(gate).getByRole('button', { name: /Set personal passphrase/i }));

      await waitFor(() => {
        expect(completeSpy).toHaveBeenCalledWith('KarachiField#2026_Secure');
        expect(clearMustChangePassword).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('4. Head Flat Complaints List & Detail Review + Advisory Assignment', () => {
    it('defaults HeadComplaintsPage to Today with area filter, renders flat rows without bundle counts, and preserves filter on Back', async () => {
      render(<HeadComplaintsPage departmentId="kmc" />);

      await waitFor(() => {
        expect(screen.getByTestId('v16-complaints-list')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
      const rows = screen.getAllByTestId('v16-complaint-row');
      expect(rows.length).toBeGreaterThan(0);

      // Rows must only expose heading + location with no synthetic bundle count pills
      expect(rows[0].textContent).not.toMatch(/reports linked/i);

      // Filter by Yesterday and open first complaint
      fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute('aria-pressed', 'true');
      });

      const firstYesterdayRow = screen.getAllByTestId('v16-complaint-row')[0];
      const expectedHeading = firstYesterdayRow.querySelector('.v16-flat-row-heading')?.textContent || '';
      fireEvent.click(firstYesterdayRow);

      const detail = await screen.findByTestId('v16-complaint-detail');
      expect(within(detail).getByRole('heading', { level: 1 })).toHaveTextContent(expectedHeading);
      expect(within(detail).getByRole('button', { name: /Assign/i })).toBeInTheDocument();

      // Traverse Next & Previous, then Back preserves Yesterday filter
      const nextBtn = within(detail).getByRole('button', { name: /Next/i });
      if (!nextBtn.hasAttribute('disabled')) {
        fireEvent.click(nextBtn);
        expect(within(detail).getByRole('button', { name: /Previous/i })).not.toBeDisabled();
      }
      fireEvent.click(within(detail).getByRole('button', { name: /Back/i }));

      await waitFor(() => {
        expect(screen.getByTestId('v16-complaints-list')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('surfaces within-30m candidate order warning when clicking Assign and allows append-only attach without overwriting existing order', async () => {
      const sampleComplaint = {
        id: 'demo-kmc-001',
        referenceNumber: 'KHI-2026-9001',
        heading: 'Road surface damaged near NED University',
        sanitizedText: 'Road broken near NED gate; deep potholes reported.',
        factualSummary: 'Damaged road near NED',
        locality: 'Gulshan-e-Iqbal',
        publicPlace: 'University Road',
        district: 'Karachi East',
        issueTypes: ['road_damage'],
        status: 'assigned' as const,
        workOrderStatus: null,
        workOrderId: null,
        assignedOfficerId: null,
        assignedOfficerName: null,
        submittedAt: '2026-11-26T08:00:00.000Z',
        updatedAt: '2026-11-26T08:00:00.000Z',
        priority: 'high' as const,
      };

      vi.spyOn(fieldOperations, 'findCandidateOrders').mockResolvedValue([
        {
          order_id: 'local-dev-order-01',
          case_label: 'University Road pothole crew',
          officer_id: 'local-officer-a',
          officer_name: 'Field Officer A',
          status: 'in_progress',
          due_at: '2026-11-29T12:00:00.000Z',
          distance_m: 14,
          anchor_reference: 'KHI-2026-8801',
          public_location: 'University Road',
          can_direct_attach: true,
          match_confidence: 'exact_issue_and_pin',
        },
      ]);
      vi.spyOn(fieldOperations, 'officersDirectory').mockResolvedValue([
        {
          user_id: 'local-officer-a',
          display_name: 'Field Officer A',
          staff_role: 'officer',
          active_cases: 2,
          verified_cases: 12,
          on_time_cases: 11,
          overdue_cases: 0,
          disputed_cases: 0,
          membership_status: 'active',
        },
      ]);
      const attachSpy = vi.spyOn(fieldOperations, 'attachReportToWorkOrder').mockResolvedValue({
        orderId: 'local-dev-order-01',
        complaintId: 'demo-kmc-001',
        mode: 'attached',
        idempotentReplay: false,
      });
      const onAssigned = vi.fn();

      render(
        <HeadComplaintDetailView
          departmentId="kmc"
          complaint={sampleComplaint}
          hasPrev={false}
          hasNext={false}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onBack={vi.fn()}
          onAssigned={onAssigned}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Assign/i }));

      const warningStrip = await screen.findByText(/Nearby active work order detected within 30 m/i);
      expect(warningStrip).toBeInTheDocument();
      expect(screen.getByText(/University Road pothole crew/i)).toBeInTheDocument();
      expect(screen.getByText(/14 m away/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Same issue — link to order/i }));

      await waitFor(() => {
        expect(attachSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            departmentId: 'kmc',
            orderId: 'local-dev-order-01',
            complaintId: 'demo-kmc-001',
          })
        );
        expect(onAssigned).toHaveBeenCalledTimes(1);
      });
    });

    it('recovers cleanly on concurrent STALE_CANDIDATES when creating a separate work order', async () => {
      const sampleComplaint = {
        id: 'demo-kmc-002',
        referenceNumber: 'KHI-2026-9002',
        heading: 'Open manhole beside playground',
        sanitizedText: 'Uncovered manhole beside children playground.',
        factualSummary: 'Uncovered manhole',
        locality: 'Gulshan-e-Iqbal',
        publicPlace: 'Maskan Chowrangi',
        district: 'Karachi East',
        issueTypes: ['road_safety'],
        status: 'assigned' as const,
        workOrderStatus: null,
        workOrderId: null,
        assignedOfficerId: null,
        assignedOfficerName: null,
        submittedAt: '2026-11-26T08:00:00.000Z',
        updatedAt: '2026-11-26T08:00:00.000Z',
        priority: 'critical' as const,
      };

      const findSpy = vi
        .spyOn(fieldOperations, 'findCandidateOrders')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            order_id: 'wo-concurrent-99',
            case_label: 'Maskan emergency barricade',
            officer_id: 'local-officer-a',
            officer_name: 'Field Officer A',
            status: 'assigned',
            due_at: '2026-11-29T12:00:00.000Z',
            distance_m: 9.5,
            anchor_reference: 'KHI-2026-8802',
            public_location: 'Maskan Chowrangi',
            can_direct_attach: true,
            match_confidence: 'exact_issue_and_pin',
          },
        ]);

      vi.spyOn(fieldOperations, 'officersDirectory').mockResolvedValue([
        {
          user_id: 'local-officer-a',
          display_name: 'Field Officer A',
          staff_role: 'officer',
          active_cases: 2,
          verified_cases: 12,
          on_time_cases: 11,
          overdue_cases: 0,
          disputed_cases: 0,
          membership_status: 'active',
        },
      ]);

      vi.spyOn(fieldOperations, 'createWorkOrderWithAdvisory').mockRejectedValueOnce(
        new Error('STALE_CANDIDATES: Nearby active order created concurrently')
      );

      render(
        <HeadComplaintDetailView
          departmentId="kmc"
          complaint={sampleComplaint}
          hasPrev={false}
          hasNext={false}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onBack={vi.fn()}
          onAssigned={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Assign/i }));
      const selectEl = await screen.findByLabelText(/Field officer/i);
      fireEvent.change(selectEl, { target: { value: 'local-officer-a' } });
      fireEvent.change(screen.getByLabelText(/Instructions/i), {
        target: { value: 'Barricade manhole immediately and install concrete cover.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Confirm assignment/i }));

      await waitFor(() => {
        expect(findSpy).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/Maskan emergency barricade/i)).toBeInTheDocument();
        expect(screen.getByText(/concurrently/i)).toBeInTheDocument();
      });
    });
  });
});
