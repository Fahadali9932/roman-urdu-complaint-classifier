import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfficerWorkDetail } from '../features/department/components/v19/work/OfficerWorkDetail';
import { OfficerWorkList } from '../features/department/components/v19/work/OfficerWorkList';
import { WorkResolutionForm } from '../features/department/components/v19/work/WorkResolutionForm';
import { type DepartmentWorkOrder } from '../features/department/services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../services/CaseOperationsService';

describe('V21.9 Officer Fieldwork Layout & Alignment Refinement', () => {
  const mockOrder: DepartmentWorkOrder = {
    id: 'order-kmc-101',
    department_id: 'kmc',
    anchor_complaint_id: 'CMP-2026-001',
    case_label: 'Main University Road — Damaged Storm Drain Grating',
    officer_id: 'officer-1',
    assigned_by: 'hod-1',
    instructions: 'Ensure safety cordon before repairing main collar.',
    assigned_at: '2026-11-27T08:00:00Z',
    due_at: '2026-11-30T08:00:00Z',
    original_due_at: '2026-11-30T08:00:00Z',
    started_at: '2026-11-27T09:00:00Z',
    status: 'in_progress',
    assigned_duration_hours: 72,
    extension_requested_due_at: null,
    extension_reason: null,
    reviewed_at: null,
    review_note: null,
    citizen_dispute_pending: false,
  };

  const mockComplaint: HeadIndependentComplaintRow = {
    id: 'CMP-2026-001',
    referenceNumber: 'REF-KMC-001',
    heading: 'Damaged Storm Drain Grating',
    sanitizedText: 'Damaged storm drain grating posing severe danger to vehicular traffic.',
    rawText: 'Main road pe drain cover toota hua hai.',
    factualSummary: 'Damaged storm drain grating on Main University Road.',
    submittedAt: '2026-11-27T07:00:00Z',
    department: 'kmc',
    departmentName: 'Karachi Municipal Corporation',
    priority: 'HIGH',
    status: 'assigned',
    publicPlace: 'Main University Road',
    locality: 'Gulshan-e-Iqbal',
    district: 'Karachi East',
    latitude: 24.9180,
    longitude: 67.0971,
    photoUrl: 'https://example.com/citizen-evidence.jpg',
  };

  describe('OfficerWorkDetail Component Layout Architecture', () => {
    it('renders dedicated back row above the document card without colliding with metadata', () => {
      const handleBack = vi.fn();
      render(
        <OfficerWorkDetail
          order={mockOrder}
          complaint={mockComplaint}
          onBack={handleBack}
          onOpenResolution={vi.fn()}
          onOpenExtension={vi.fn()}
          onOpenLightbox={vi.fn()}
        />
      );

      const backBtn = screen.getByTestId('v21-8-back-to-work-list');
      expect(backBtn).toHaveClass('v20-back-btn');
      expect(backBtn).not.toHaveClass('v20-round-btn');

      // Verify click
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);

      // Verify reference number is present in neutral typography
      const refEl = screen.getByText('REF #REF-KMC-001');
      expect(refEl).toBeInTheDocument();
      // Ensure it does not have the old yellow background
      expect(refEl.style.color).not.toBe('rgb(226, 162, 77)');
    });

    it('ensures navigation action buttons use .v20-field-btn without circular clipping', () => {
      render(
        <OfficerWorkDetail
          order={mockOrder}
          complaint={mockComplaint}
          onBack={vi.fn()}
          onOpenResolution={vi.fn()}
          onOpenExtension={vi.fn()}
          onOpenLightbox={vi.fn()}
        />
      );

      const viewLocationBtn = screen.getByTestId('view-location-btn');
      const getDirectionsBtn = screen.getByTestId('get-directions-btn');

      expect(viewLocationBtn).toHaveClass('v20-field-btn');
      expect(viewLocationBtn).not.toHaveClass('v20-round-btn');
      expect(getDirectionsBtn).toHaveClass('v20-field-btn');
      expect(getDirectionsBtn).not.toHaveClass('v20-round-btn');
    });

    it('ensures in-progress work action buttons use .v20-field-btn', () => {
      render(
        <OfficerWorkDetail
          order={mockOrder}
          complaint={mockComplaint}
          onBack={vi.fn()}
          onOpenResolution={vi.fn()}
          onOpenExtension={vi.fn()}
          onOpenLightbox={vi.fn()}
        />
      );

      const reqMoreTimeBtn = screen.getByTestId('request-more-time-btn');
      const submitWorkBtn = screen.getByTestId('submit-completed-work-btn');

      expect(reqMoreTimeBtn).toHaveClass('v20-field-btn');
      expect(reqMoreTimeBtn).not.toHaveClass('v20-round-btn');
      expect(submitWorkBtn).toHaveClass('v20-field-btn');
      expect(submitWorkBtn).not.toHaveClass('v20-round-btn');
    });

    it('ensures unstarted orders render Start Working with .v20-field-btn.primary', () => {
      const unstartedOrder = { ...mockOrder, started_at: null, status: 'assigned' as const };
      const handleStart = vi.fn();

      render(
        <OfficerWorkDetail
          order={unstartedOrder}
          complaint={mockComplaint}
          onBack={vi.fn()}
          onStartWork={handleStart}
          onOpenResolution={vi.fn()}
          onOpenExtension={vi.fn()}
          onOpenLightbox={vi.fn()}
        />
      );

      const startBtn = screen.getByTestId('start-working-btn');
      expect(startBtn).toHaveClass('v20-field-btn', 'primary');
      fireEvent.click(startBtn);
      expect(handleStart).toHaveBeenCalledWith('order-kmc-101');
    });
  });

  describe('OfficerWorkList Component Concise Composition', () => {
    it('renders concise cards without dense supervisor note blocks in the list', () => {
      render(
        <OfficerWorkList
          orders={[mockOrder]}
          complaints={[mockComplaint]}
          onSelectOrder={vi.fn()}
        />
      );

      // Verify prominent title
      expect(screen.getByText('Main University Road — Damaged Storm Drain Grating')).toBeInTheDocument();
      // Verify supervisor note block was removed from card list
      expect(screen.queryByText(/Supervisor Note:/i)).not.toBeInTheDocument();

      // Verify Open complaint button uses .v20-field-btn.primary
      const openBtn = screen.getByTestId('open-complaint-btn-order-kmc-101');
      expect(openBtn).toHaveClass('v20-field-btn', 'primary');
    });

    it('filter tabs accurately filter and display task counts', () => {
      const orders = [
        mockOrder,
        {
          ...mockOrder,
          id: 'order-kmc-102',
          started_at: null,
          status: 'assigned' as const,
        },
      ];

      render(
        <OfficerWorkList
          orders={orders}
          complaints={[mockComplaint]}
          onSelectOrder={vi.fn()}
        />
      );

      expect(screen.getByText('All tasks (2)')).toBeInTheDocument();
      expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Start (1)')).toBeInTheDocument();

      // Click In Progress filter
      fireEvent.click(screen.getByText('In Progress (1)'));
      expect(screen.getByTestId('officer-work-card-order-kmc-101')).toBeInTheDocument();
      expect(screen.queryByTestId('officer-work-card-order-kmc-102')).not.toBeInTheDocument();

      // Click Awaiting Start filter
      fireEvent.click(screen.getByText('Awaiting Start (1)'));
      expect(screen.queryByTestId('officer-work-card-order-kmc-101')).not.toBeInTheDocument();
      expect(screen.getByTestId('officer-work-card-order-kmc-102')).toBeInTheDocument();
    });
  });

  describe('WorkResolutionForm Component Polish', () => {
    it('renders dedicated back row and buttons without .v20-round-btn', async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleBack = vi.fn();

      render(
        <WorkResolutionForm
          order={mockOrder}
          complaint={mockComplaint}
          onBack={handleBack}
          onSubmit={handleSubmit}
          onOpenLightbox={vi.fn()}
        />
      );

      const backBtn = screen.getByTestId('resolution-back-btn');
      expect(backBtn).toHaveClass('v20-back-btn');
      expect(backBtn).not.toHaveClass('v20-round-btn');
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);

      const verifyLocationBtn = screen.getByTestId('verify-location-btn');
      expect(verifyLocationBtn).toHaveClass('v20-field-btn', 'secondary');
      expect(verifyLocationBtn).not.toHaveClass('v20-round-btn');

      const submitBtn = screen.getByTestId('submit-for-verification-btn');
      expect(submitBtn).toHaveClass('v20-field-btn', 'success');

      // Test submission
      const fileInput = screen.getByTestId('evidence-file-input');
      const file = new File(['evidence'], 'repaired.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });
  });
});
