import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { ComplaintTracker } from '../features/citizen/ComplaintTracker';
import { ComplaintDetailModal } from '../components/citizen/ComplaintDetailModal';
import { complaintService } from '../services';
import type { Complaint } from '../types';

describe('V13.7 Citizen Portal Redesign & Secure Tracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('My Complaints Dashboard Redesign', () => {
    const mockComplaints: Complaint[] = [
      {
        id: 'c-1',
        referenceNumber: 'KHI-2026-CIT-101',
        title: 'Sewerage overflow outside school',
        description: 'Gutter ka pani bahar beh raha hai aur rasta band ho gaya hai.',
        detectedLanguage: 'roman_urdu',
        status: 'under_review',
        assignedDepartmentId: 'kwsc',
        assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
        district: 'District Central',
        locality: 'North Nazimabad',
        publicLocation: 'Block B near school',
        submittedAt: '2026-11-19T08:00:00Z',
        updatedAt: '2026-11-19T08:00:00Z',
        timeline: [
          {
            id: 't-1',
            status: 'submitted',
            title: 'Submitted',
            description: 'Complaint submitted by citizen',
            timestamp: '2026-11-19T08:00:00Z',
            actorRole: 'citizen',
          },
        ],
        isDemonstration: false,
      },
      {
        id: 'c-2',
        referenceNumber: 'KHI-2026-CIT-102',
        title: 'Broken street light and transformer sparking',
        description: 'Street light kharab hai aur transformer se chingariyan nikal rahi hain.',
        detectedLanguage: 'roman_urdu',
        status: 'in_progress',
        assignedDepartmentId: 'ke',
        assignedDepartmentIds: ['ke', 'kmc'],
        assignedDepartmentName: 'K-Electric',
        district: 'District East',
        locality: 'Gulshan-e-Iqbal',
        publicLocation: 'Block 6',
        submittedAt: '2026-11-18T14:00:00Z',
        updatedAt: '2026-11-19T09:00:00Z',
        timeline: [],
        isDemonstration: false,
      },
      {
        id: 'c-3',
        referenceNumber: 'KHI-2026-CIT-103',
        title: 'Garbage dump cleared',
        description: 'Kachray ka dher saaf kar diya gaya.',
        detectedLanguage: 'roman_urdu',
        status: 'resolved',
        assignedDepartmentId: 'sswmb',
        assignedDepartmentName: 'Sindh Solid Waste Management Board',
        district: 'District South',
        locality: 'Saddar',
        publicLocation: 'Preedy Street',
        submittedAt: '2026-11-17T10:00:00Z',
        updatedAt: '2026-11-19T10:00:00Z',
        timeline: [],
        isDemonstration: false,
      },
    ];

    it('renders clean header, actions, metrics bar, and filter pills', async () => {
      vi.spyOn(complaintService, 'getCitizenComplaints').mockResolvedValue(mockComplaints);

      render(
        <MemoryRouter>
          <LanguageProvider>
            <CitizenDashboard />
          </LanguageProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Clean heading "My Complaints"
        expect(screen.getByRole('heading', { name: /my complaints/i })).toBeInTheDocument();
        // Action buttons
        expect(screen.getAllByRole('button', { name: /track complaint/i }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /claim guest complaint/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /new complaint/i })).toBeInTheDocument();
      });

      // Metrics bar
      expect(screen.getByText('Total Complaints')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThanOrEqual(1);

      // Verify all 3 cards exist
      expect(screen.getByText('#KHI-2026-CIT-101')).toBeInTheDocument();
      expect(screen.getByText('#KHI-2026-CIT-102')).toBeInTheDocument();
      expect(screen.getByText('#KHI-2026-CIT-103')).toBeInTheDocument();
    });

    it('filters complaints by status and searches by text', async () => {
      vi.spyOn(complaintService, 'getCitizenComplaints').mockResolvedValue(mockComplaints);

      render(
        <MemoryRouter>
          <LanguageProvider>
            <CitizenDashboard />
          </LanguageProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('#KHI-2026-CIT-101')).toBeInTheDocument();
      });

      // Filter by "Resolved"
      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      fireEvent.click(resolvedBtn);

      await waitFor(() => {
        expect(screen.getByText('#KHI-2026-CIT-103')).toBeInTheDocument();
        expect(screen.queryByText('#KHI-2026-CIT-101')).not.toBeInTheDocument();
        expect(screen.queryByText('#KHI-2026-CIT-102')).not.toBeInTheDocument();
      });

      // Search filter
      const searchInput = screen.getByPlaceholderText(/search by reference or title/i);
      fireEvent.change(searchInput, { target: { value: 'Sewerage' } });

      // Click "All" tab to test search with all complaints
      const allBtn = screen.getByRole('button', { name: /^all$/i });
      fireEvent.click(allBtn);

      await waitFor(() => {
        expect(screen.getByText('#KHI-2026-CIT-101')).toBeInTheDocument();
        expect(screen.queryByText('#KHI-2026-CIT-102')).not.toBeInTheDocument();
        expect(screen.queryByText('#KHI-2026-CIT-103')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complaint Detail Modal', () => {
    it('displays single department and verified complaint details without technical jargon', () => {
      const complaint: Complaint = {
        id: 'c-99',
        referenceNumber: 'KHI-2026-TEST-99',
        title: 'Open manhole cover on main road',
        description: 'Main road par gutter ka dhakkan gayab hai.',
        status: 'under_review',
        assignedDepartmentId: 'kwsc',
        assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
        district: 'District Central',
        locality: 'Gulberg',
        submittedAt: '2026-11-19T12:00:00Z',
        updatedAt: '2026-11-19T12:00:00Z',
        timeline: [
          {
            id: 't-1',
            status: 'submitted',
            title: 'Complaint Registered',
            description: 'Your complaint has been safely recorded in the civic registry.',
            timestamp: '2026-11-19T12:00:00Z',
            actorRole: 'citizen',
          },
        ],
        isDemonstration: false,
      };

      const onClose = vi.fn();

      render(
        <LanguageProvider>
          <ComplaintDetailModal complaint={complaint} isOpen={true} onClose={onClose} />
        </LanguageProvider>
      );

      // Verify header
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Open manhole cover on main road')).toBeInTheDocument();
      expect(screen.getByText('KHI-2026-TEST-99')).toBeInTheDocument();

      // Verify no technical jargon
      expect(screen.queryByText(/row-level security protected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/municipal triage/i)).not.toBeInTheDocument();

      // Complaint information
      expect(screen.getByText(/gulberg, district central/i)).toBeInTheDocument();
      expect(screen.getByText('Karachi Water & Sewerage Corporation')).toBeInTheDocument();

      // Statement
      expect(screen.getByText('Main road par gutter ka dhakkan gayab hai.')).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByLabelText(/close case file|close/i);
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('shows reassuring message when complaint is awaiting department confirmation', () => {
      const unassignedComplaint: Complaint = {
        id: 'c-100',
        referenceNumber: 'KHI-2026-TEST-100',
        title: 'General civic issue',
        description: 'Masla hal nahi ho raha.',
        status: 'under_review',
        assignedDepartmentId: 'unassigned',
        assignedDepartmentName: '',
        district: 'District West',
        locality: 'Orangi',
        submittedAt: '2026-11-19T12:00:00Z',
        updatedAt: '2026-11-19T12:00:00Z',
        timeline: [],
        isDemonstration: false,
      };

      render(
        <LanguageProvider>
          <ComplaintDetailModal complaint={unassignedComplaint} isOpen={true} onClose={() => {}} />
        </LanguageProvider>
      );

      expect(
        screen.getByText(/your complaint is being reviewed. the responsible department will appear here once confirmed/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/municipal triage/i)).not.toBeInTheDocument();
    });
  });

  describe('Guest Complaint Tracking & URL Sanitization', () => {
    it('formats 24 digits and enforces 10-attempt rate limiting', async () => {
      vi.spyOn(complaintService, 'trackGuestComplaint').mockImplementation(async () => {
        return { found: false, error: 'Not found' };
      });

      render(
        <MemoryRouter initialEntries={['/track']}>
          <LanguageProvider>
            <ComplaintTracker />
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /track your complaint/i })).toBeInTheDocument();

      const input = screen.getByPlaceholderText('0000 0000 0000 0000 0000 0000');
      fireEvent.change(input, { target: { value: '804172639150284603716628' } });

      // Check auto-grouping by 4
      expect(input).toHaveValue('8041 7263 9150 2846 0371 6628');

      const form = input.closest('form')!;

      // Trigger 10 attempts
      for (let i = 0; i < 10; i++) {
        fireEvent.submit(form);
        await waitFor(() => {
          expect(complaintService.trackGuestComplaint).toHaveBeenCalledTimes(i + 1);
        });
      }

      // 11th attempt triggers rate limit
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/too many tries. please wait a moment/i)).toBeInTheDocument();
      });
    });

    it('renders minimal public projection with zero PII when complaint is found', async () => {
      vi.spyOn(complaintService, 'trackGuestComplaint').mockResolvedValue({
        found: true,
        public_category: 'Water & Sewerage',
        display_status: 'Under review',
        submitted_at: '2026-11-18T10:00:00Z',
        updated_at: '2026-11-19T10:00:00Z',
        is_multilabel: false,
        public_issues: [
          {
            department_name: 'Karachi Water & Sewerage Corporation',
            department_id: 'kwsc',
            status: 'under_review',
            display_status: 'Under review',
          },
        ],
        public_updates: [
          {
            status: 'submitted',
            at: '2026-11-18T10:00:00Z',
            message: 'Complaint recorded in public registry.',
          },
        ],
      });

      render(
        <MemoryRouter initialEntries={['/track']}>
          <LanguageProvider>
            <ComplaintTracker />
          </LanguageProvider>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText('0000 0000 0000 0000 0000 0000');
      fireEvent.change(input, { target: { value: '804172639150284603716628' } });

      const form = input.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Under review/i })).toBeInTheDocument();
        expect(screen.queryByText('Water & Sewerage')).not.toBeInTheDocument();
        expect(screen.getByText(/View official updates/i)).toBeInTheDocument();
        // Verify ZERO PII exposed
        expect(screen.queryByText(/0300/)).not.toBeInTheDocument();
        expect(screen.queryByText(/cnic/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/phone/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/applicant/i)).not.toBeInTheDocument();
      });
    });

    it('sanitizes legacy query parameter from URL on mount', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      vi.spyOn(complaintService, 'trackGuestComplaint').mockResolvedValue({
        found: true,
        public_category: 'Electricity',
        display_status: 'In progress',
      });

      render(
        <MemoryRouter initialEntries={['/track?code=804172639150284603716628']}>
          <LanguageProvider>
            <ComplaintTracker />
          </LanguageProvider>
        </MemoryRouter>
      );

      // Verify window.history.replaceState was called to strip the query parameter from address bar
      expect(replaceStateSpy).toHaveBeenCalledWith({}, '', window.location.pathname);
    });
  });
});
