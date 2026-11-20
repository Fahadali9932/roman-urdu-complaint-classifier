import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { complaintService } from '../services';
import { CitizenDashboard } from '../features/citizen/CitizenDashboard';
import DevCitizenDashboard from '../features/citizen/dev/DevCitizenDashboard';
import type { Complaint } from '../types';

describe('V13.8.2 fictional-only demonstration boundary', () => {
  it('renders only compiled fictional fixtures without calling the real complaint service', async () => {
    const load = vi.spyOn(complaintService, 'getCitizenComplaints').mockRejectedValue(new Error('Live data must not be loaded'));
    const claim = vi.spyOn(complaintService, 'claimComplaint');
    localStorage.setItem('awaaz_complaints_store_v1', JSON.stringify([{
      id: 'private-1', referenceNumber: 'PRIVATE-CITIZEN-999', title: 'Private complaint', citizenId: 'another-citizen',
    }]));

    render(<MemoryRouter><LanguageProvider><DevCitizenDashboard /></LanguageProvider></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('#DEMO-KHI-0001')).toBeInTheDocument());
    expect(screen.getByText('#DEMO-KHI-0002')).toBeInTheDocument();
    expect(screen.getByText(/Fictional \/ Test Data Only/)).toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE-CITIZEN-999/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /claim guest complaint/i })).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    localStorage.removeItem('awaaz_complaints_store_v1');
  });

  it('refuses to display a record lacking the fictional-demonstration marker', async () => {
    const realLooking: Complaint = {
      id: 'real-looking-1', citizenId: 'another-citizen', citizenName: 'Private Person',
      referenceNumber: 'PRIVATE-CITIZEN-999', district: 'District Central', locality: 'Private home',
      title: 'Private record', description: 'Not a demonstration', detectedLanguage: 'roman_urdu',
      status: 'submitted', assignedDepartmentId: 'kmc', submittedAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z', timeline: [], isDemonstration: false,
    };
    const load = vi.spyOn(complaintService, 'getCitizenComplaints');
    render(
      <MemoryRouter><LanguageProvider>
        <CitizenDashboard isDevHarness demoComplaints={[realLooking]} />
      </LanguageProvider></MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/no complaints yet/i)).toBeInTheDocument());
    expect(screen.queryByText(/PRIVATE-CITIZEN-999/)).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
