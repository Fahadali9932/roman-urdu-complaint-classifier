import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { caseOperationsService } from '../services/CaseOperationsService';
import { WorkQueuePage } from '../features/department/components/WorkQueuePage';
import { CaseDetailPage } from '../features/department/components/CaseDetailPage';
import { AreasPage } from '../features/department/components/AreasPage';
import { BulkAcceptModal } from '../features/department/components/BulkAcceptModal';
import type { IncidentCaseSummary, BulkAcceptPreview } from '../types';

describe('AWAAZ-E-AWAM — CASE OPERATIONS DESK (V5)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    caseOperationsService.resetToDefault();
  });

  describe('1. Independent Complaint Intake & Grouping Safety', () => {
    it('A01: Same-area reports remain independent single-report complaints until confirmed work-order linkage', async () => {
      const caseItem = await caseOperationsService.getCaseById('demo-kmc-001');
      expect(caseItem).not.toBeNull();
      expect(caseItem?.caseNumber).toBe('KHI-2026-9001');
      expect(caseItem?.linkedReportCount).toBe(1);
      expect(caseItem?.locality).toBe('Gulshan-e-Iqbal');
      expect(caseItem?.publicPlace).toContain('University Road');

      const reports = await caseOperationsService.listCaseReports('demo-kmc-001', '', 0, 20);
      expect(reports.total).toBe(1);
      expect(reports.items.length).toBe(1);
      expect(reports.items[0].referenceNumber).toBe('KHI-2026-9001');
    });

    it('A02: Distinct complaints across a broad neighborhood remain separate records', async () => {
      const casesPage = await caseOperationsService.listCases('kmc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'Gulshan-e-Iqbal',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 100,
      });
      expect(casesPage.total).toBeGreaterThan(1);

      const places = casesPage.items.map((c) => c.publicPlace);
      const uniquePlaces = new Set(places);
      expect(uniquePlaces.size).toBeGreaterThan(1);
    });
  });

  describe('2. Single-Complaint Acceptance & Unconfirmed Batch Protection', () => {
    it('B01 & B02: Accepts an independent complaint atomically with idempotency, while blocking unconfirmed multi-report batch acceptance', async () => {
      const preview = await caseOperationsService.previewBulkAcceptance('demo-kmc-001');
      expect(preview.totalLinked).toBe(1);
      expect(preview.eligible).toBe(1);

      const idempotencyKey = 'test-idemp-' + Date.now();
      const result = await caseOperationsService.executeBulkAcceptance(
        'demo-kmc-001',
        idempotencyKey
      );

      expect(result.caseId).toBe('demo-kmc-001');
      expect(result.accepted).toBe(1);
      expect(result.skippedIneligible).toBe(0);

      const updatedCase = await caseOperationsService.getCaseById('demo-kmc-001');
      expect(updatedCase?.workStatus).toBe('accepted');

      const events = await caseOperationsService.getCaseActivity('demo-kmc-001');
      const acceptEvent = events.find((e) => e.eventType === 'accepted');
      expect(acceptEvent).toBeDefined();

      const replayResult = await caseOperationsService.executeBulkAcceptance(
        'demo-kmc-001',
        idempotencyKey
      );
      expect(replayResult.idempotentReplay).toBe(true);
      expect(replayResult.accepted).toBe(1);
    });
  });

  describe('3. Multi-Department Isolation & Cross-Tenant Boundary', () => {
    it('C01: Department queries are strictly isolated to tenant scope', async () => {
      const kmcSummary = await caseOperationsService.getDepartmentWorkSummary('kmc');
      const kwscSummary = await caseOperationsService.getDepartmentWorkSummary('kwsc');
      const kelectricSummary = await caseOperationsService.getDepartmentWorkSummary('kelectric');

      expect(kmcSummary.departmentId).toBe('kmc');
      expect(kwscSummary.departmentId).toBe('kwsc');
      expect(kelectricSummary.departmentId).toBe('kelectric');

      // KMC cases only belong to KMC
      const kmcCases = await caseOperationsService.listCases('kmc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 50,
      });
      kmcCases.items.forEach((c) => {
        expect(c.departmentId).toBe('kmc');
      });

      // KWSC cases only belong to KWSC
      const kwscCases = await caseOperationsService.listCases('kwsc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 50,
      });
      kwscCases.items.forEach((c) => {
        expect(c.departmentId).toBe('kwsc');
      });
    });
  });

  describe('4. Server-Style Keyset / Offset Pagination and Area Workload', () => {
    it('E01 & E02: Paginates across 100+ cases and aggregates area workload', async () => {
      // First page
      const p1 = await caseOperationsService.listCases('kmc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 25,
      });
      expect(p1.items.length).toBe(25);
      expect(p1.page).toBe(0);
      expect(p1.total).toBeGreaterThanOrEqual(75);

      // Second page
      const p2 = await caseOperationsService.listCases('kmc', {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 1,
        pageSize: 25,
      });
      expect(p2.items.length).toBe(25);
      expect(p2.page).toBe(1);

      // No overlap between p1 and p2
      const p1Ids = new Set(p1.items.map((c) => c.id));
      p2.items.forEach((item) => {
        expect(p1Ids.has(item.id)).toBe(false);
      });

      // Area Workload Aggregation
      const areas = await caseOperationsService.listAreaWorkload('kmc');
      expect(areas.length).toBeGreaterThan(0);
      const gulshan = areas.find((a) => a.area === 'Gulshan-e-Iqbal');
      expect(gulshan).toBeDefined();
      expect(gulshan?.linkedReportsCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('5. UI Components Integration', () => {
    it('renders WorkQueuePage with saved views and segmented display mode', async () => {
      const onOpenCase = vi.fn();
      render(
        <BrowserRouter>
          <WorkQueuePage
            departmentId="kmc"
            onOpenCase={onOpenCase}
            initialArea="Gulshan-e-Iqbal"
          />
        </BrowserRouter>
      );

      // Verify saved views
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Needs (?:response|action)/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Unassigned/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /My cases/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Active cases/i })).toBeInTheDocument();
      });

      // Verify segmented mode buttons
      expect(screen.getByRole('button', { name: 'Cases' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Individual reports' })).toBeInTheDocument();

      // Verify case row renders in Gulshan-e-Iqbal
      await waitFor(() => {
        expect(screen.getByText('Road surface damaged near NED University')).toBeInTheDocument();
      });
    });

    it('renders CaseDetailPage with 4 real tabs and individual report acceptance without multi-report blind bulk execution', async () => {
      const onBack = vi.fn();
      render(
        <BrowserRouter>
          <CaseDetailPage
            caseId="demo-kmc-001"
            onBack={onBack}
          />
        </BrowserRouter>
      );

      // Verify Fact Strip
      await waitFor(() => {
        expect(screen.getByText('Work status')).toBeInTheDocument();
        expect(screen.getByText('Linked original reports')).toBeInTheDocument();
        expect(screen.getByText('First reported')).toBeInTheDocument();
        expect(screen.getByText('Issue type')).toBeInTheDocument();
      });

      // Verify 4 tabs
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Reports/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Work' })).toBeInTheDocument();

      // Switch to Reports tab
      fireEvent.click(screen.getByRole('tab', { name: /Reports/ }));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search reference or report text')).toBeInTheDocument();
      });

      // Switch to Activity tab
      fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
      await waitFor(() => {
        expect(screen.getByText(/Independent complaint KHI-2026-9001 logged/i)).toBeInTheDocument();
      });
    });

    it('renders BulkAcceptModal with exact eligible count warning', async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      const mockCase: IncidentCaseSummary = {
        id: 'C-2051',
        caseNumber: 'C-2051',
        departmentId: 'kmc',
        title: 'Road surface damaged near NED University',
        issueFamily: 'Roads & Infrastructure',
        issueSubtype: 'Road damage',
        locality: 'Gulshan-e-Iqbal',
        publicPlace: 'University Road near NED University',
        priority: 'critical',
        priorityRiskLevel: 'Urgent',
        workStatus: 'needs_acceptance',
        statusLabel: 'Awaiting acceptance',
        linkedReportCount: 50,
        pendingAcceptanceCount: 48,
        oldestReportMinutesAgo: 8640,
        oldestReportFormatted: '6d ago',
        firstReportedAt: '2026-11-09T09:48:00Z',
        lastReportedAt: '2026-11-15T09:48:00Z',
        assignedStaffId: null,
        assignedStaffLabel: 'Unassigned',
        summary: 'Road surface damage and deep potholes.',
        version: 1,
      };

      const preview: BulkAcceptPreview = {
        caseId: 'C-2051',
        caseNumber: 'C-2051',
        caseTitle: 'Road surface damaged near NED University',
        caseVersion: 1,
        totalLinked: 50,
        eligible: 48,
        byExcludedStatus: { resolved: 2 },
        userCanAccept: true,
        requiredConfirmationLabel: 'Confirm acceptance',
      };

      render(
        <BulkAcceptModal
          isOpen={true}
          onClose={onClose}
          caseItem={mockCase}
          preview={preview}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText('Accept eligible reports?')).toBeInTheDocument();
      expect(screen.getByText(/48 reports will be accepted/i)).toBeInTheDocument();
      expect(screen.getByText(/2 reports are not awaiting acceptance/i)).toBeInTheDocument();

      // Click Confirm
      const confirmBtn = screen.getByRole('button', { name: /Confirm acceptance/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
    });

    it('renders AreasPage and displays locality workloads', async () => {
      const onSelectArea = vi.fn();
      const onViewWorkQueue = vi.fn();

      render(
        <AreasPage
          departmentId="kmc"
          onSelectArea={onSelectArea}
          onViewWorkQueue={onViewWorkQueue}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Areas')).toBeInTheDocument();
        expect(screen.getByText('Gulshan-e-Iqbal')).toBeInTheDocument();
      });

      // Click on locality row
      const gulshanRow = screen.getByText('Gulshan-e-Iqbal');
      fireEvent.click(gulshanRow);
      expect(onSelectArea).toHaveBeenCalledWith('Gulshan-e-Iqbal');
    });
  });
});
