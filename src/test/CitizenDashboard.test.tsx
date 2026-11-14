import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import { complaintService } from '../services';
import type { Complaint } from '../types';

describe('CitizenDashboard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an honest empty state without example complaint folders', async () => {
    vi.spyOn(complaintService, 'getCitizenComplaints').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CitizenDashboard />
        </LanguageProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /your complaints/i })).toBeInTheDocument();
      expect(screen.getByText(/no complaints yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no complaint is linked to this account yet/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/KHI-2026-/i)).not.toBeInTheDocument();
  });

  it('renders live citizen complaints list, metrics bar, and opens detail modal', async () => {
    const mockComplaints: Complaint[] = [
      {
        id: 'c-101',
        referenceNumber: 'KHI-2026-CIT-001',
        title: 'Water contamination in residential line',
        description: 'Pani se shadeed badboo aa rahi hai block 13-D mein.',
        detectedLanguage: 'roman_urdu',
        status: 'accepted',
        assignedDepartmentId: 'kwsc',
        assignedDepartmentName: 'Karachi Water & Sewerage Corporation',
        district: 'District East',
        locality: 'Gulshan-e-Iqbal',
        publicLocation: 'Block 13-D Street 4',
        submittedAt: '2026-11-14T10:00:00Z',
        updatedAt: '2026-11-14T11:00:00Z',
        timeline: [
          {
            id: 't-1',
            status: 'submitted',
            title: 'Submitted',
            description: 'Complaint received',
            timestamp: '2026-11-14T10:00:00Z',
            actorRole: 'citizen',
          },
          {
            id: 't-2',
            status: 'accepted',
            title: 'Complaint Accepted by Department',
            description: 'KW&SC team has accepted the complaint',
            timestamp: '2026-11-14T11:00:00Z',
            actorRole: 'department_officer',
          },
        ],
        isDemonstration: false,
      },
      {
        id: 'c-102',
        referenceNumber: 'KHI-2026-CIT-002',
        title: 'Road pothole repair',
        description: 'Main road par khadda ban chuka hai.',
        detectedLanguage: 'roman_urdu',
        status: 'resolved',
        assignedDepartmentId: 'kmc',
        assignedDepartmentName: 'Karachi Metropolitan Corporation',
        district: 'District South',
        locality: 'Saddar',
        publicLocation: 'Near Empress Market',
        submittedAt: '2026-11-13T09:00:00Z',
        updatedAt: '2026-11-14T12:00:00Z',
        timeline: [],
        isDemonstration: false,
      },
    ];

    vi.spyOn(complaintService, 'getCitizenComplaints').mockResolvedValue(mockComplaints);

    render(
      <MemoryRouter>
        <LanguageProvider>
          <CitizenDashboard />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Verify complaints are displayed
    await waitFor(() => {
      expect(screen.getByText('#KHI-2026-CIT-001')).toBeInTheDocument();
      expect(screen.getByText('#KHI-2026-CIT-002')).toBeInTheDocument();
    });

    // Verify quick metrics bar
    expect(screen.getByText('Total Complaints')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total count
    expect(screen.getByText('Accepted')).toBeInTheDocument(); // status badge
    expect(screen.getAllByText('Resolved').length).toBeGreaterThanOrEqual(1); // metrics & badge

    // Click to open detail modal
    const openCaseBtn = screen.getAllByText('Open Case')[0];
    fireEvent.click(openCaseBtn);

    // Modal appears with case file header
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Original Grievance Statement (Roman Urdu)')).toBeInTheDocument();
      expect(screen.getAllByText(/Pani se shadeed badboo aa rahi hai/i).length).toBeGreaterThanOrEqual(1);
    });

    // Close modal
    fireEvent.click(screen.getByLabelText('Close case file'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
