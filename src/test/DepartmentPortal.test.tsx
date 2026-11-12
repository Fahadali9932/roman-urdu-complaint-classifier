import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import {
  DepartmentAuthProvider,
} from '../context/DepartmentAuthContext';
import { MockComplaintService } from '../services/MockComplaintService';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';

describe('Department Portal — Security, Privacy, and Workflow Integrity', () => {
  let service: MockComplaintService;

  beforeEach(() => {
    service = new MockComplaintService();
    localStorage.clear();
  });

  describe('1. Department Data Isolation & Access Control', () => {
    it('only returns electricity complaints for K-Electric (kelectric)', async () => {
      const complaints = await service.getDepartmentComplaints('kelectric');
      expect(complaints.length).toBeGreaterThan(0);
      for (const c of complaints) {
        expect(c.assignedDepartmentId).toBe('kelectric');
      }
    });

    it('only returns sanitation complaints for SSWMB (sswmb)', async () => {
      const complaints = await service.getDepartmentComplaints('sswmb');
      expect(complaints.length).toBeGreaterThan(0);
      for (const c of complaints) {
        expect(c.assignedDepartmentId).toBe('sswmb');
      }
    });

    it('only returns gas complaints for SSGC (ssgc)', async () => {
      const complaints = await service.getDepartmentComplaints('ssgc');
      expect(complaints.length).toBeGreaterThan(0);
      for (const c of complaints) {
        expect(c.assignedDepartmentId).toBe('ssgc');
      }
    });

    it('rejects cross-department complaint access (returns null when querying foreign reference)', async () => {
      // KHI-2026-2184 belongs to K-Electric
      const keComplaint = await service.getDepartmentComplaintByReference(
        'kelectric',
        'KHI-2026-2184'
      );
      expect(keComplaint).not.toBeNull();
      expect(keComplaint?.assignedDepartmentId).toBe('kelectric');

      // Attempting to query the same reference under SSWMB must return null
      const crossAccessAttempt = await service.getDepartmentComplaintByReference(
        'sswmb',
        'KHI-2026-2184'
      );
      expect(crossAccessAttempt).toBeNull();

      // Attempting to query under SSGC must return null
      const ssgcAccessAttempt = await service.getDepartmentComplaintByReference(
        'ssgc',
        'KHI-2026-2184'
      );
      expect(ssgcAccessAttempt).toBeNull();
    });

    it('throws unauthorized error when an officer attempts to update a foreign department complaint', async () => {
      // KHI-2026-2184 belongs to K-Electric. SSWMB officer tries to resolve it.
      await expect(
        service.updateComplaintStatus(
          'sswmb',
          'KHI-2026-2184',
          'resolved',
          'Attempted foreign update'
        )
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('2. Citizen Privacy & PII Redaction', () => {
    it('strictly omits citizen personal identifiers from DepartmentComplaintView', async () => {
      const complaints = await service.getDepartmentComplaints('kelectric');
      expect(complaints.length).toBeGreaterThan(0);

      for (const c of complaints) {
        // Assert that citizen PII fields are never exposed in the department view
        expect((c as Record<string, unknown>).citizenName).toBeUndefined();
        expect((c as Record<string, unknown>).citizenPhone).toBeUndefined();
        expect((c as Record<string, unknown>).citizenEmail).toBeUndefined();
        expect((c as Record<string, unknown>).applicantAddress).toBeUndefined();

        // Municipal incident location remains present for routing
        expect(c.district).toBeDefined();
        expect(c.locality).toBeDefined();
        expect(c.referenceNumber).toBeDefined();
      }
    });
  });

  describe('3. Status Update & Synchronization with Citizen Tracking', () => {
    it('updates status, appends official timeline event, and immediately reflects in citizen tracking', async () => {
      const ref = 'KHI-2026-9042';

      // 1. Initial citizen view
      const initialCitizenView = await service.getComplaintByReference(ref);
      expect(initialCitizenView?.status).toBe('submitted');
      const initialTimelineCount = initialCitizenView?.timeline.length || 0;

      // 2. Department officer updates status to in_progress with note
      const updateResult = await service.updateComplaintStatus(
        'kelectric',
        ref,
        'in_progress',
        'Field cable splicing crew dispatched to Gulshan Block 4 substation.',
        'فیلڈ ٹیم سب اسٹیشن پر روانہ کر دی گئی ہے۔'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.complaint.status).toBe('in_progress');

      // 3. Verify timeline event was appended with officer role
      const latestEvent =
        updateResult.complaint.timeline[updateResult.complaint.timeline.length - 1];
      expect(latestEvent.status).toBe('in_progress');
      expect(latestEvent.actorRole).toBe('department_officer');
      expect(latestEvent.departmentCode).toBe('KE');
      expect(latestEvent.description).toContain('Gulshan Block 4');

      // 4. Query from Citizen perspective — verify immediate synchronization
      const updatedCitizenView = await service.getComplaintByReference(ref);
      expect(updatedCitizenView?.status).toBe('in_progress');
      expect(updatedCitizenView?.timeline.length).toBe(initialTimelineCount + 1);
      const citizenLatestEvent =
        updatedCitizenView?.timeline[updatedCitizenView.timeline.length - 1];
      expect(citizenLatestEvent?.actorRole).toBe('department_officer');
    });
  });

  describe('4. Department Dashboard UI Integration', () => {
    it('renders the department workspace with header, active department, and privacy shield', async () => {
      localStorage.setItem('awaaz_department_id', 'kelectric');
      localStorage.setItem('awaaz_department_auth', 'true');

      render(
        <MemoryRouter initialEntries={['/department']}>
          <LanguageProvider>
            <DepartmentAuthProvider>
              <Routes>
                <Route path="/department" element={<DepartmentDashboardPage />} />
              </Routes>
            </DepartmentAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      // Loading state finishes and renders workspace
      await waitFor(() => {
        expect(screen.getByText('KHI-2026-2184')).toBeInTheDocument();
      });

      // Verify privacy shield banner is displayed
      expect(screen.getAllByText(/Citizen PII Protected/i).length).toBeGreaterThan(0);

      // Verify Roman Urdu citizen text is rendered prominently
      expect(
        screen.getByText(/FB Area Block 14 main transformer/i)
      ).toBeInTheDocument();
    });

    it('filters complaints by search query', async () => {
      localStorage.setItem('awaaz_department_id', 'kelectric');
      localStorage.setItem('awaaz_department_auth', 'true');

      render(
        <MemoryRouter initialEntries={['/department']}>
          <LanguageProvider>
            <DepartmentAuthProvider>
              <Routes>
                <Route path="/department" element={<DepartmentDashboardPage />} />
              </Routes>
            </DepartmentAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('KHI-2026-2184')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        /Search by reference number, locality, or keyword/i
      );

      // Search for specific reference
      fireEvent.change(searchInput, { target: { value: '9042' } });

      await waitFor(() => {
        expect(screen.getByText('KHI-2026-9042')).toBeInTheDocument();
        expect(screen.queryByText('KHI-2026-2184')).not.toBeInTheDocument();
      });
    });

    it('renders the login page with all municipal agencies and privacy guarantee', () => {
      render(
        <MemoryRouter initialEntries={['/department/login']}>
          <LanguageProvider>
            <DepartmentAuthProvider>
              <Routes>
                <Route path="/department/login" element={<DepartmentLoginPage />} />
              </Routes>
            </DepartmentAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', { name: /Department Workspace Sign In/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/K-Electric/i)).toBeInTheDocument();
      expect(screen.getByText(/Sindh Solid Waste Management Board/i)).toBeInTheDocument();
      expect(screen.getByText(/Sui Southern Gas Company/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Enter Department Workspace/i })
      ).toBeInTheDocument();
    });
  });
});
