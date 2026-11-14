import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StatusUpdateModal, getAllowedTransitions } from '../features/department/components/StatusUpdateModal';
import { ComplaintDetailView } from '../features/department/components/ComplaintDetailView';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { complaintService } from '../services';
import type { DepartmentComplaintView } from '../types';

const mockComplaintAssigned: DepartmentComplaintView = {
  id: '5bb13cd7-05f8-4575-922e-36487294d433',
  referenceNumber: 'KHI-2026-42DEA6C7',
  citizenId: '811b3236-2f93-4554-95ed-1daf94ffe200',
  title: 'Road crack and cave-in on main artery',
  description: 'University Road par gehra garha ban gaya hai gaari phans sakti hai',
  detectedLanguage: 'roman_urdu',
  status: 'assigned',
  assignedDepartmentId: 'kmc',
  predictedDepartmentId: 'kmc',
  incidentDistrict: 'District East',
  incidentLocality: 'Gulshan-e-Iqbal',
  incidentPublicLocation: 'Near Civic Centre, Main University Road',
  submittedAt: '2026-11-14T08:00:00Z',
  updatedAt: '2026-11-14T08:00:00Z',
  timeline: [
    {
      id: 'tl-1',
      status: 'submitted',
      title: 'Complaint Registered',
      titleUrdu: 'شکایت درج ہو گئی',
      description: 'Complaint registered',
      descriptionUrdu: 'شکایت موصول ہو گئی',
      timestamp: '2026-11-14T08:00:00Z',
      actorRole: 'citizen',
    },
    {
      id: 'tl-2',
      status: 'assigned',
      title: 'Department Assigned',
      titleUrdu: 'محکمہ تفویض',
      description: 'Routed to KMC operational queue',
      descriptionUrdu: 'کے ایم سی کو تفویض',
      timestamp: '2026-11-14T08:05:00Z',
      actorRole: 'system',
    },
  ],
  isDemonstration: true,
};

describe('Department Status Update Workflow & Lifecycle', () => {
  beforeEach(() => {
    sessionStorage.setItem(
      'awaaz_department_auth_session_v1',
      JSON.stringify({
        departmentId: 'kmc',
        departmentName: 'Karachi Metropolitan Corporation',
        departmentCode: 'KMC',
        authenticatedAt: new Date().toISOString(),
      })
    );
  });

  describe('1. Transition Matrix (getAllowedTransitions)', () => {
    it('allows valid transitions from "submitted"', () => {
      expect(getAllowedTransitions('submitted')).toEqual(['under_review', 'assigned', 'rejected']);
    });

    it('allows valid transitions from "under_review"', () => {
      expect(getAllowedTransitions('under_review')).toEqual(['assigned', 'in_progress', 'rejected']);
    });

    it('enforces manual acceptance from "assigned" (only accepted or rejected)', () => {
      expect(getAllowedTransitions('assigned')).toEqual(['accepted', 'rejected']);
    });

    it('allows starting work from "accepted" (only in_progress or rejected)', () => {
      expect(getAllowedTransitions('accepted')).toEqual(['in_progress', 'rejected']);
    });

    it('allows completing work from "in_progress" (only resolved or rejected)', () => {
      expect(getAllowedTransitions('in_progress')).toEqual(['resolved', 'rejected']);
    });

    it('strictly blocks transitions from terminal statuses "resolved" and "rejected"', () => {
      expect(getAllowedTransitions('resolved')).toEqual([]);
      expect(getAllowedTransitions('rejected')).toEqual([]);
    });
  });

  describe('2. StatusUpdateModal Component', () => {
    it('renders modal with only "accepted" and "rejected" for an "assigned" complaint', () => {
      render(
        <LanguageProvider>
          <DepartmentAuthProvider>
            <StatusUpdateModal
              isOpen={true}
              onClose={vi.fn()}
              complaint={mockComplaintAssigned}
              onUpdated={vi.fn()}
            />
          </DepartmentAuthProvider>
        </LanguageProvider>
      );

      // Verify reference number is displayed
      expect(screen.getByText('KHI-2026-42DEA6C7')).toBeInTheDocument();

      // Only "Accept Complaint" and "Reject Complaint" must be visible
      expect(screen.getByText('Accept Complaint')).toBeInTheDocument();
      expect(screen.getByText('Reject Complaint / Not Actionable')).toBeInTheDocument();

      // "In Progress" and "Work Done" must NOT be options for "assigned"
      expect(screen.queryByText(/In Progress \(Start Work\)/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Work Done \/ Resolved/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Under Review/i)).not.toBeInTheDocument();
    });

    it('submits manual acceptance through complaintService and notifies onUpdated', async () => {
      const onUpdatedMock = vi.fn();
      const onCloseMock = vi.fn();

      const updateSpy = vi.spyOn(complaintService, 'updateComplaintStatus').mockResolvedValueOnce({
        success: true,
        complaint: {
          ...mockComplaintAssigned,
          status: 'accepted',
        },
      });

      render(
        <LanguageProvider>
          <DepartmentAuthProvider>
            <StatusUpdateModal
              isOpen={true}
              onClose={onCloseMock}
              complaint={mockComplaintAssigned}
              onUpdated={onUpdatedMock}
            />
          </DepartmentAuthProvider>
        </LanguageProvider>
      );

      const submitButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          'kmc',
          'KHI-2026-42DEA6C7',
          'accepted',
          undefined
        );
        expect(onUpdatedMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'accepted',
          })
        );
        expect(onCloseMock).toHaveBeenCalled();
      });

      updateSpy.mockRestore();
    });

    it('requires resolution notes when marking as resolved from in_progress', async () => {
      const mockInProgress: DepartmentComplaintView = {
        ...mockComplaintAssigned,
        status: 'in_progress',
      };

      render(
        <LanguageProvider>
          <DepartmentAuthProvider>
            <StatusUpdateModal
              isOpen={true}
              onClose={vi.fn()}
              complaint={mockInProgress}
              onUpdated={vi.fn()}
            />
          </DepartmentAuthProvider>
        </LanguageProvider>
      );

      // Verify "Work Done / Resolved" is available
      expect(screen.getByText(/Work Done \/ Resolved/i)).toBeInTheDocument();

      // Click save without notes
      const submitButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Resolution notes are required when marking a complaint as resolved/i)
        ).toBeInTheDocument();
      });
    });

    it('requires rejection notes when rejecting a complaint', async () => {
      render(
        <LanguageProvider>
          <DepartmentAuthProvider>
            <StatusUpdateModal
              isOpen={true}
              onClose={vi.fn()}
              complaint={mockComplaintAssigned}
              onUpdated={vi.fn()}
              initialStatus="rejected"
            />
          </DepartmentAuthProvider>
        </LanguageProvider>
      );

      // Click save without reason
      const submitButton = screen.getByRole('button', { name: /Save Update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/A rejection reason is required when rejecting or closing a complaint/i)
        ).toBeInTheDocument();
      });
    });

    it('displays terminal status state when complaint is already resolved', () => {
      const mockResolved: DepartmentComplaintView = {
        ...mockComplaintAssigned,
        status: 'resolved',
      };

      render(
        <LanguageProvider>
          <DepartmentAuthProvider>
            <StatusUpdateModal
              isOpen={true}
              onClose={vi.fn()}
              complaint={mockResolved}
              onUpdated={vi.fn()}
            />
          </DepartmentAuthProvider>
        </LanguageProvider>
      );

      expect(screen.getByText(/Complaint Closed \(RESOLVED\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/This complaint has concluded its municipal workflow/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Save Update/i })).not.toBeInTheDocument();
    });
  });

  describe('3. ComplaintDetailView Dynamic Actions & Stepper', () => {
    it('shows "Accept Complaint" and "Reject Complaint" buttons for pending acceptance complaints', () => {
      const onOpenMock = vi.fn();
      render(
        <LanguageProvider>
          <ComplaintDetailView
            complaint={mockComplaintAssigned}
            onOpenStatusModal={onOpenMock}
          />
        </LanguageProvider>
      );

      const acceptBtn = screen.getByRole('button', { name: /Accept Complaint/i });
      const rejectBtn = screen.getByRole('button', { name: /Reject Complaint/i });
      expect(acceptBtn).toBeInTheDocument();
      expect(rejectBtn).toBeInTheDocument();

      fireEvent.click(acceptBtn);
      expect(onOpenMock).toHaveBeenCalledWith('accepted');

      fireEvent.click(rejectBtn);
      expect(onOpenMock).toHaveBeenCalledWith('rejected');
    });

    it('shows "Start Work" button for accepted complaints', () => {
      const onOpenMock = vi.fn();
      const mockAccepted: DepartmentComplaintView = {
        ...mockComplaintAssigned,
        status: 'accepted',
      };

      render(
        <LanguageProvider>
          <ComplaintDetailView
            complaint={mockAccepted}
            onOpenStatusModal={onOpenMock}
          />
        </LanguageProvider>
      );

      const startBtn = screen.getByRole('button', { name: /Start Work/i });
      expect(startBtn).toBeInTheDocument();

      fireEvent.click(startBtn);
      expect(onOpenMock).toHaveBeenCalledWith('in_progress');
    });

    it('shows "Mark Work Done" button for in_progress complaints', () => {
      const onOpenMock = vi.fn();
      const mockInProgress: DepartmentComplaintView = {
        ...mockComplaintAssigned,
        status: 'in_progress',
      };

      render(
        <LanguageProvider>
          <ComplaintDetailView
            complaint={mockInProgress}
            onOpenStatusModal={onOpenMock}
          />
        </LanguageProvider>
      );

      const workDoneBtn = screen.getByRole('button', { name: /Mark Work Done/i });
      expect(workDoneBtn).toBeInTheDocument();

      fireEvent.click(workDoneBtn);
      expect(onOpenMock).toHaveBeenCalledWith('resolved');
    });

    it('renders clean read-only status banner without action buttons for resolved complaints', () => {
      const mockResolved: DepartmentComplaintView = {
        ...mockComplaintAssigned,
        status: 'resolved',
        timeline: [
          ...mockComplaintAssigned.timeline,
          {
            id: 'tl-3',
            status: 'resolved',
            title: 'Issue Resolved',
            titleUrdu: 'مسئلہ حل ہو گیا',
            description: 'Road asphalt patched and leveled by KMC crew.',
            descriptionUrdu: 'سڑک کی مرمت مکمل۔',
            timestamp: '2026-11-14T10:00:00Z',
            actorRole: 'department_officer',
          },
        ],
      };

      render(
        <LanguageProvider>
          <ComplaintDetailView
            complaint={mockResolved}
            onOpenStatusModal={vi.fn()}
          />
        </LanguageProvider>
      );

      expect(screen.getByText(/Work Completed & Verified on Ground/i)).toBeInTheDocument();
      expect(screen.getByText(/Road asphalt patched and leveled by KMC crew/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Accept Complaint/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Start Work/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Mark Work Done/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reject Complaint/i })).not.toBeInTheDocument();
    });
  });
});
