import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AiControlCenterPage } from '../features/admin/ai/AiControlCenterPage';
import { aiTelemetryService, type TelemetryPayload } from '../services/aiTelemetryService';
import { aiReviewService } from '../services/aiReviewService';
import { FlagIncorrectDepartmentModal } from '../features/department/components/FlagIncorrectDepartmentModal';
import { complaintService } from '../services';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import type { DepartmentComplaintView } from '../types';

describe('AWAAZ-E-AWAM — Phase V11.5 AI Control Center & Continuous Learning Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pre-populate mock admin session
    localStorage.setItem(
      'awaaz_admin_session_v6',
      JSON.stringify({
        token: 'mock-admin-token-12345',
        userId: 'admin-001',
        email: 'admin@awaazeawam.pk',
        fullName: 'Fahad Super Admin',
        role: 'main_admin',
        createdAt: new Date().toISOString(),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. PII Scrubbing & AI Human Review Queue Service (Phase 4)', () => {
    it('scrubs phone numbers, CNIC, and email addresses from resident text before queuing', () => {
      const sensitiveText =
        'mera number 0300-1234567 hai aur cnic 42101-1234567-1 hai, bijli ki taar tooti hai email test@domain.com';
      const scrubbed = aiReviewService.scrubPII(sensitiveText);

      expect(scrubbed).not.toContain('0300-1234567');
      expect(scrubbed).not.toContain('42101-1234567-1');
      expect(scrubbed).not.toContain('test@domain.com');
      expect(scrubbed).toContain('[PHONE REDACTED]');
      expect(scrubbed).toContain('[CNIC REDACTED]');
      expect(scrubbed).toContain('[EMAIL REDACTED]');
    });

    it('queues a flagged complaint and persists it in pending state', async () => {
      const item = await aiReviewService.flagComplaintForReview({
        complaintId: 'comp-test-999',
        referenceNumber: 'AA-2026-999999',
        text: 'Sadak par bara khadda hai aur sewage ka pani beh raha hai phone 03211234567',
        originalDepartments: ['kmc'],
        suggestedDepartment: 'kwsc',
        flaggedByStaffId: 'staff-kmc-1',
        flaggedByStaffName: 'Ahmed Road Officer',
        flaggedByDepartment: 'kmc',
        flagReason: 'Sewage water is overflowing from public manhole, primarily belongs to KWSC.',
      });

      expect(item.id).toMatch(/^rev-/);
      expect(item.status).toBe('pending');
      expect(item.text).toContain('[PHONE REDACTED]');
      expect(item.suggestedDepartment).toBe('kwsc');

      const queue = aiReviewService.getReviewQueue('pending');
      expect(queue.some((q) => q.complaintId === 'comp-test-999')).toBe(true);
    });

    it('resolves a human review item and saves it to verified corrections log for retraining', async () => {
      const item = await aiReviewService.flagComplaintForReview({
        complaintId: 'comp-retrain-1',
        referenceNumber: 'AA-2026-112233',
        text: 'bijli band hai aur sewer line bhi phat gai hai',
        originalDepartments: ['kelectric'],
        suggestedDepartment: 'kwsc',
        flaggedByStaffId: 'staff-ke-1',
        flaggedByStaffName: 'KE Officer',
        flaggedByDepartment: 'kelectric',
        flagReason: 'Independent dual fault: power outage and sewer burst.',
      });

      const resolved = await aiReviewService.resolveReviewItem({
        itemId: item.id,
        confirmedDepartments: ['kelectric', 'kwsc'],
        resolutionNotes: 'Confirmed independent dual civic emergency.',
        adminId: 'admin-fahad',
      });

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.confirmedDepartments).toEqual(['kelectric', 'kwsc']);

      const verified = aiReviewService.getVerifiedCorrections();
      expect(verified.some((v) => v.id === 'comp-retrain-1')).toBe(true);
    });
  });

  describe('2. Telemetry Polling, Heartbeat, and Stale Detection (Phase 6)', () => {
    it('detects STALE state when heartbeat timestamp is older than 25 seconds', async () => {
      const nowSec = Date.now() / 1000;
      const staleMock: TelemetryPayload = {
        state: 'LIVE',
        stage: 'Fitting Platt Sigmoid Ensemble',
        progress_current: 20,
        progress_target: 30,
        percent_complete: 66.7,
        active_task: 'Calibrating folds',
        elapsed_seconds: 15.0,
        estimated_remaining_seconds: 10.0,
        resources: {
          'C:': { total_gb: 281.1, used_gb: 234.2, free_gb: 46.88 },
          'D:': { total_gb: 194.5, used_gb: 37.8, free_gb: 156.69 },
        },
        latest_metrics: {
          exact_accuracy: 0.5255,
          macro_f1: 0.7283,
          false_extra_rate: 0.271,
          missed_rate: 0.2771,
        },
        recent_events: [],
        updated_at: nowSec - 30.0, // 30 seconds ago (> 25s threshold)
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => staleMock,
      } as any);

      const data = await aiTelemetryService.fetchTelemetry();
      expect(data.state).toBe('STALE');
    });

    it('subscribes to live telemetry updates and unsubscribes cleanly', async () => {
      vi.useFakeTimers();
      const mockCallback = vi.fn();

      vi.spyOn(aiTelemetryService, 'fetchTelemetry').mockResolvedValue({
        state: 'IDLE',
        stage: 'Standby',
        progress_current: 0,
        progress_target: 0,
        percent_complete: 0,
        active_task: 'Standby',
        elapsed_seconds: 0,
        estimated_remaining_seconds: 0,
        resources: {},
        latest_metrics: { exact_accuracy: 0.5255, macro_f1: 0.7283, false_extra_rate: 0.271, missed_rate: 0.2771 },
        recent_events: [],
      });

      const unsubscribe = aiTelemetryService.subscribe(mockCallback, 5000);

      // Fast-forward 10 seconds (2 intervals)
      await vi.advanceTimersByTimeAsync(10000);
      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
      vi.useRealTimers();
    });
  });

  describe('3. AI Control Center Navigation & Subsections (Phase 5)', () => {
    it('renders the AI Control Center with overview, active model badge, and metrics', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/ai']}>
          <LanguageProvider>
            <AdminAuthProvider>
              <AiControlCenterPage />
            </AdminAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/AI Control Center & Continuous Learning/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTIVE RUNTIME CHAMPION/i)).toBeInTheDocument();
      expect(screen.getByText(/V11.4.4 Champion Hybrid Classifier/i)).toBeInTheDocument();
      expect(screen.getByText(/52.55%/i)).toBeInTheDocument();
      expect(screen.getByText(/0.7283/i)).toBeInTheDocument();
    });

    it('navigates to Live Training Telemetry tab and displays status counters and diagnostic run button', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/ai']}>
          <LanguageProvider>
            <AdminAuthProvider>
              <AiControlCenterPage />
            </AdminAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      const liveTabBtn = screen.getByRole('button', { name: /Live Training Telemetry/i });
      fireEvent.click(liveTabBtn);

      expect(screen.getByText(/Current Operational Stage/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Run 30-Sample Diagnostic/i })).toBeInTheDocument();
      expect(screen.getByText(/C: Drive Storage Safety/i)).toBeInTheDocument();
      expect(screen.getByText(/D: Drive Storage Safety/i)).toBeInTheDocument();
    });

    it('navigates to Model Registry tab and verifies Run 004, Run 005, and Run 006 listings with hashes', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/ai']}>
          <LanguageProvider>
            <AdminAuthProvider>
              <AiControlCenterPage />
            </AdminAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      const registryTabBtn = screen.getByRole('button', { name: /Model Registry/i });
      fireEvent.click(registryTabBtn);

      expect(screen.getByText(/Candidate Model Registry & Verified Checkpoints/i)).toBeInTheDocument();
      expect(screen.getByText(/Run 004 Champion \(Active Website Model\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Run 005 Candidate \(Curriculum Batch\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Run 006 Candidate \(Autonomous Cycle 2 Checkpoint\)/i)).toBeInTheDocument();
      expect(screen.getByText(/e4d04293f9c6d4826b5c3ff3ec327e53f1947b198888e2cb2ad4cfcf7ef98457/i)).toBeInTheDocument();
    });

    it('navigates to 2,000-Case Evaluation tab and displays Wilson 95% confidence intervals', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/ai']}>
          <LanguageProvider>
            <AdminAuthProvider>
              <AiControlCenterPage />
            </AdminAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      const benchTabBtn = screen.getByRole('button', { name: /2,000-Case Evaluation/i });
      fireEvent.click(benchTabBtn);

      expect(screen.getByText(/Phase V11.4.8 Blind Benchmark Evaluation Results/i)).toBeInTheDocument();
      expect(screen.getByText(/\[50.4%, 54.7%\]/i)).toBeInTheDocument();
      expect(screen.getByText(/\[66.1%, 70.2%\]/i)).toBeInTheDocument();
    });
  });

  describe('4. Flag Incorrect Department Modal for Staff (Phase 7)', () => {
    it('allows department staff to flag a misclassified complaint and triggers status transition', async () => {
      const mockComplaint: DepartmentComplaintView = {
        id: 'comp-flag-test-1',
        referenceNumber: 'AA-2026-777888',
        district: 'Karachi Central',
        locality: 'Gulberg',
        status: 'assigned',
        assignedDepartmentId: 'kmc',
        predictedDepartmentId: 'kmc',
        submittedAt: new Date().toISOString(),
        description: 'sewer line burst ho gayi hai aur badboo phail rahi hai',
        sanitizedDescription: 'sewer line burst ho gayi hai aur badboo phail rahi hai',
        citizenName: 'Resident',
        timeline: [],
      };

      const handleFlagged = vi.fn();
      const handleClose = vi.fn();

      vi.spyOn(complaintService, 'updateComplaintStatus').mockResolvedValueOnce({
        ...mockComplaint,
        status: 'under_review',
      });

      render(
        <DepartmentAuthProvider>
          <FlagIncorrectDepartmentModal
            isOpen={true}
            onClose={handleClose}
            complaint={mockComplaint}
            onFlagged={handleFlagged}
          />
        </DepartmentAuthProvider>
      );

      expect(screen.getByText(/Flag Incorrect Department/i)).toBeInTheDocument();
      expect(screen.getByText(/Case #AA-2026-777888/i)).toBeInTheDocument();

      const reasonInput = screen.getByPlaceholderText(/Complaint concerns an open sewer overflow/i);
      fireEvent.change(reasonInput, {
        target: { value: 'This is a sewer burst belonging to KWSC, not KMC road repair.' },
      });

      const submitBtn = screen.getByRole('button', { name: /Confirm & Flag for Review/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleFlagged).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
