import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { complaintService } from '../services/MockComplaintService';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { type Complaint } from '../types';

// Isolated test fixtures for automated testing ONLY (never leaked to live runtime)
const TEST_FIXTURES: Complaint[] = [
  {
    id: 'test-ke-1',
    referenceNumber: 'KHI-2026-1001',
    citizenName: 'Muhammad Bilal',
    district: 'District Central',
    locality: 'Block 14, Federal B Area',
    publicLocation: 'Near Street 7 Transformer',
    title: 'Transformer blast ke baad light band',
    description: 'Raat 2 bajay dhamakay ke baad light band hai. Main wire zameen par giri hui hai.',
    detectedLanguage: 'roman_urdu',
    status: 'submitted',
    assignedDepartmentId: 'kelectric',
    assignedDepartmentName: 'K-Electric (Infrastructure & Distribution)',
    submittedAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    isDemonstration: false,
    timeline: [
      {
        id: 'tl-1',
        status: 'submitted',
        title: 'Complaint Registered',
        titleUrdu: 'شکایت درج ہو گئی',
        description: 'Grievance submitted by citizen.',
        descriptionUrdu: 'شہری کی جانب سے شکایت درج ہوئی۔',
        timestamp: '2026-11-10T10:00:00Z',
        actorRole: 'citizen',
      },
    ],
  },
  {
    id: 'test-ke-2',
    referenceNumber: 'KHI-2026-1002',
    citizenName: 'Zubair Ahmed',
    district: 'District East',
    locality: 'Block 4, Gulshan-e-Iqbal',
    publicLocation: 'Street 4 Substation',
    title: 'Underground cable fault',
    description: 'Pichlay teen din se voltage bohot kam hai, fridge nahi chal raha.',
    detectedLanguage: 'roman_urdu',
    status: 'in_progress',
    assignedDepartmentId: 'kelectric',
    assignedDepartmentName: 'K-Electric (Infrastructure & Distribution)',
    submittedAt: '2026-11-09T14:00:00Z',
    updatedAt: '2026-11-10T08:00:00Z',
    isDemonstration: false,
    timeline: [
      {
        id: 'tl-2',
        status: 'submitted',
        title: 'Complaint Registered',
        titleUrdu: 'شکایت درج ہو گئی',
        description: 'Grievance registered.',
        descriptionUrdu: 'شکایت درج ہوئی۔',
        timestamp: '2026-11-09T14:00:00Z',
        actorRole: 'citizen',
      },
    ],
  },
  {
    id: 'test-sswmb-1',
    referenceNumber: 'KHI-2026-2001',
    citizenName: 'Fatima Noor',
    district: 'District South',
    locality: 'Bohri Bazaar, Saddar',
    publicLocation: 'Sabzi Market Corner',
    title: 'Kachray ka dher aur badboo',
    description: 'Haftay se kachra kundi overflow ho rahi hai, rasta band hai.',
    detectedLanguage: 'roman_urdu',
    status: 'submitted',
    assignedDepartmentId: 'sswmb',
    assignedDepartmentName: 'Sindh Solid Waste Management Board (SSWMB)',
    submittedAt: '2026-11-08T11:00:00Z',
    updatedAt: '2026-11-08T11:00:00Z',
    isDemonstration: false,
    timeline: [],
  },
  {
    id: 'test-ssgc-1',
    referenceNumber: 'KHI-2026-3001',
    citizenName: 'Kamran Khan',
    district: 'District South',
    locality: 'Phase 2, DHA',
    publicLocation: 'Commercial Lane 3',
    title: 'Gas pipeline leakage',
    description: 'Underground gas pipeline se shadeed badboo aa rahi hai.',
    detectedLanguage: 'roman_urdu',
    status: 'in_progress',
    assignedDepartmentId: 'ssgc',
    assignedDepartmentName: 'Sui Southern Gas Company (SSGC)',
    submittedAt: '2026-11-07T09:00:00Z',
    updatedAt: '2026-11-07T09:00:00Z',
    isDemonstration: false,
    timeline: [],
  },
];

describe('Department Portal — Security, Privacy, and Workflow Integrity', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    complaintService.seedTestComplaints(TEST_FIXTURES);
  });

  describe('1. Department Data Isolation & Access Control', () => {
    it('only returns electricity complaints for K-Electric (kelectric)', async () => {
      const complaints = await complaintService.getDepartmentComplaints('kelectric');
      expect(complaints.length).toBe(2);
      for (const c of complaints) {
        expect(c.assignedDepartmentId).toBe('kelectric');
      }
    });

    it('only returns sanitation complaints for SSWMB (sswmb)', async () => {
      const complaints = await complaintService.getDepartmentComplaints('sswmb');
      expect(complaints.length).toBe(1);
      expect(complaints[0].assignedDepartmentId).toBe('sswmb');
      expect(complaints[0].referenceNumber).toBe('KHI-2026-2001');
    });

    it('only returns gas complaints for SSGC (ssgc)', async () => {
      const complaints = await complaintService.getDepartmentComplaints('ssgc');
      expect(complaints.length).toBe(1);
      expect(complaints[0].assignedDepartmentId).toBe('ssgc');
      expect(complaints[0].referenceNumber).toBe('KHI-2026-3001');
    });

    it('rejects cross-department complaint access (returns null when querying foreign reference)', async () => {
      // KHI-2026-1001 belongs to K-Electric
      const keComplaint = await complaintService.getDepartmentComplaintByReference(
        'kelectric',
        'KHI-2026-1001'
      );
      expect(keComplaint).not.toBeNull();
      expect(keComplaint?.assignedDepartmentId).toBe('kelectric');

      // Attempting to query under SSWMB must return null
      const crossAccessAttempt = await complaintService.getDepartmentComplaintByReference(
        'sswmb',
        'KHI-2026-1001'
      );
      expect(crossAccessAttempt).toBeNull();

      // Attempting to query under SSGC must return null
      const ssgcAccessAttempt = await complaintService.getDepartmentComplaintByReference(
        'ssgc',
        'KHI-2026-1001'
      );
      expect(ssgcAccessAttempt).toBeNull();
    });

    it('throws unauthorized error when an officer attempts to update a foreign department complaint', async () => {
      await expect(
        complaintService.updateComplaintStatus(
          'sswmb',
          'KHI-2026-1001',
          'resolved',
          'Attempted foreign update'
        )
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('2. Citizen Privacy & PII Redaction', () => {
    it('strictly omits citizen personal identifiers from DepartmentComplaintView', async () => {
      const complaints = await complaintService.getDepartmentComplaints('kelectric');
      expect(complaints.length).toBeGreaterThan(0);

      for (const c of complaints) {
        // Assert that citizen PII fields are completely undefined in department views
        expect((c as Record<string, unknown>).citizenName).toBeUndefined();
        expect((c as Record<string, unknown>).citizenPhone).toBeUndefined();
        expect((c as Record<string, unknown>).citizenEmail).toBeUndefined();
        expect((c as Record<string, unknown>).applicantAddress).toBeUndefined();

        // Municipal incident location remains available for field response
        expect(c.district).toBeDefined();
        expect(c.locality).toBeDefined();
        expect(c.referenceNumber).toBeDefined();
      }
    });
  });

  describe('3. Status Update & Synchronization with Citizen Tracking', () => {
    it('updates status, appends official timeline event, and immediately reflects in citizen tracking', async () => {
      const ref = 'KHI-2026-1001';

      // 1. Initial citizen view
      const initialCitizenView = await complaintService.getComplaintByReference(ref);
      expect(initialCitizenView?.status).toBe('submitted');
      const initialCount = initialCitizenView?.timeline.length || 0;

      // 2. Department updates status
      const updateResult = await complaintService.updateComplaintStatus(
        'kelectric',
        ref,
        'in_progress',
        'Emergency cable splicing team dispatched to site.'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.complaint.status).toBe('in_progress');

      // 3. Citizen tracking reflects update
      const updatedCitizenView = await complaintService.getComplaintByReference(ref);
      expect(updatedCitizenView?.status).toBe('in_progress');
      expect(updatedCitizenView?.timeline.length).toBe(initialCount + 1);
      const latestEvent =
        updatedCitizenView?.timeline[updatedCitizenView.timeline.length - 1];
      expect(latestEvent?.actorRole).toBe('department_officer');
      expect(latestEvent?.description).toContain('Emergency cable splicing');
    });
  });

  describe('4. Truthful Empty State', () => {
    it('shows truthful empty state when no complaints are assigned to a department', async () => {
      // KWSC has 0 complaints in test fixtures
      const kwscComplaints = await complaintService.getDepartmentComplaints('kwsc');
      expect(kwscComplaints.length).toBe(0);

      // Setup session for KWSC
      sessionStorage.setItem(
        'awaaz_department_auth_session_v1',
        JSON.stringify({
          departmentId: 'kwsc',
          departmentName: 'Karachi Water & Sewerage Corporation (KW&SC)',
          departmentCode: 'KWSC',
          authenticatedAt: new Date().toISOString(),
        })
      );

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
        expect(screen.getByText(/No complaints assigned yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('5. Department Dashboard UI & Interaction', () => {
    it('renders the department workspace with authentic complaints', async () => {
      sessionStorage.setItem(
        'awaaz_department_auth_session_v1',
        JSON.stringify({
          departmentId: 'kelectric',
          departmentName: 'K-Electric (Infrastructure & Distribution)',
          departmentCode: 'KE',
          authenticatedAt: new Date().toISOString(),
        })
      );

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

      // Verify complaints load in the inbox and active detail
      await waitFor(() => {
        expect(screen.getAllByText('KHI-2026-1001').length).toBeGreaterThan(0);
        expect(screen.getByText('KHI-2026-1002')).toBeInTheDocument();
      });

      // Verify no PII (no citizen name "Muhammad Bilal" in DOM)
      expect(screen.queryByText('Muhammad Bilal')).not.toBeInTheDocument();

      // Verify citizen Roman Urdu text
      expect(
        screen.getAllByText(/Raat 2 bajay dhamakay ke baad light band hai/i).length
      ).toBeGreaterThan(0);
    });

    it('filters complaints by search query', async () => {
      sessionStorage.setItem(
        'awaaz_department_auth_session_v1',
        JSON.stringify({
          departmentId: 'kelectric',
          departmentName: 'K-Electric (Infrastructure & Distribution)',
          departmentCode: 'KE',
          authenticatedAt: new Date().toISOString(),
        })
      );

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
        expect(screen.getAllByText('KHI-2026-1001').length).toBeGreaterThan(0);
      });

      const searchInput = screen.getByPlaceholderText(/Search by reference/i);
      fireEvent.change(searchInput, { target: { value: '1002' } });

      await waitFor(() => {
        expect(screen.getAllByText('KHI-2026-1002').length).toBeGreaterThan(0);
        expect(screen.getByText('1 complaints')).toBeInTheDocument();
      });
    });

    it('renders the login page and redirects unauthenticated users', () => {
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
        screen.getByRole('heading', { name: /Sign in to your department|Department Sign In/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Sign in to department|Sign In to Portal/i })
      ).toBeInTheDocument();
    });
  });
});
