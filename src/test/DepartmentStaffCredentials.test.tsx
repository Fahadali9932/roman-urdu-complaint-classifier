import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { DepartmentPortalLayout } from '../features/department/DepartmentPortalLayout';
import { DepartmentHeader } from '../features/department/components/DepartmentHeader';
import { staffAuthService } from '../services/staffAuthService';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import {
  resolveDepartmentIdentity,
  getAllDepartmentIdentities,
  VERIFICATION_RECOVERY_EMAIL,
} from '../features/department/auth/departmentIdentities';
import { type DepartmentId } from '../types';

describe('AWAAZ-E-AWAM — Department Staff Credentials & Municipal Boundaries', () => {
  const TEST_ACCESS_KEY = 'DemoAccessKey2026!Secure';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localSupabaseAdapter.resetToDefault();
  });

  const renderDepartmentPortal = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <LanguageProvider>
          <DepartmentAuthProvider>
            <Routes>
              <Route element={<DepartmentPortalLayout />}>
                <Route path="/department/login" element={<DepartmentLoginPage />} />
                <Route
                  path="/department"
                  element={<div data-testid="department-workspace">Department Workspace</div>}
                />
              </Route>
            </Routes>
          </DepartmentAuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  describe('1. Department Identities & Recovery Email Configuration', () => {
    it('configures exactly six demonstration identities with correct departments and usernames', () => {
      const identities = getAllDepartmentIdentities();
      expect(identities).toHaveLength(6);

      const expectedMap: Record<string, { deptId: DepartmentId; code: string }> = {
        'roads-01': { deptId: 'kmc', code: 'KMC' },
        'electricity-01': { deptId: 'kelectric', code: 'KE' },
        'water-01': { deptId: 'kwsc', code: 'KWSC' },
        'gas-01': { deptId: 'ssgc', code: 'SSGC' },
        'sanitation-01': { deptId: 'sswmb', code: 'SSWMB' },
        'building-01': { deptId: 'sbca', code: 'SBCA' },
      };

      for (const identity of identities) {
        const expected = expectedMap[identity.username];
        expect(expected).toBeDefined();
        expect(identity.departmentId).toBe(expected.deptId);
        expect(identity.departmentCode).toBe(expected.code);
        expect(identity.authEmail).toBe(
          `${VERIFICATION_RECOVERY_EMAIL.replace('@gmail.com', '')}+${
            identity.departmentId === 'kelectric'
              ? 'electricity'
              : identity.departmentId === 'kwsc'
              ? 'water'
              : identity.departmentId === 'ssgc'
              ? 'gas'
              : identity.departmentId === 'sswmb'
              ? 'sanitation'
              : identity.departmentId === 'sbca'
              ? 'building'
              : 'roads'
          }@gmail.com`
        );
      }
    });

    it('resolves usernames case-insensitively and returns null for unrecognized inputs', () => {
      expect(resolveDepartmentIdentity('ROADS-01')?.departmentId).toBe('kmc');
      expect(resolveDepartmentIdentity('  electricity-01  ')?.departmentId).toBe('kelectric');
      expect(resolveDepartmentIdentity('unknown-admin')).toBeNull();
      expect(resolveDepartmentIdentity('')).toBeNull();
    });
  });

  describe('2. Comprehensive Department Authentication (All 6 Agencies)', () => {
    const departmentCases: Array<{
      username: string;
      departmentId: DepartmentId;
      expectedCode: string;
    }> = [
      { username: 'roads-01', departmentId: 'kmc', expectedCode: 'KMC' },
      { username: 'electricity-01', departmentId: 'kelectric', expectedCode: 'KE' },
      { username: 'water-01', departmentId: 'kwsc', expectedCode: 'KWSC' },
      { username: 'gas-01', departmentId: 'ssgc', expectedCode: 'SSGC' },
      { username: 'sanitation-01', departmentId: 'sswmb', expectedCode: 'SSWMB' },
      { username: 'building-01', departmentId: 'sbca', expectedCode: 'SBCA' },
    ];

    departmentCases.forEach(({ username, departmentId, expectedCode }) => {
      it(`authenticates ${username} into ${expectedCode} console with valid access key`, async () => {
        const res = await staffAuthService.signInDepartmentStaffWithUsername(
          username,
          TEST_ACCESS_KEY,
          departmentId
        );

        expect(res.success).toBe(true);
        expect(res.status).toBe('approved');
        expect(res.session).toBeDefined();
        expect(res.session?.username).toBe(username);
        expect(res.session?.departmentId).toBe(departmentId);
        expect(res.session?.departmentCode).toBe(expectedCode);
        expect(res.session?.role).toBe('department_staff');
      });
    });
  });

  describe('3. Credential Security & Anti-Enumeration Protection', () => {
    it('rejects invalid access key with generic error message', async () => {
      const res = await staffAuthService.signInDepartmentStaffWithUsername(
        'roads-01',
        'WrongPassword999!',
        'kmc'
      );

      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_password');
      expect(res.error).toBe('Invalid username or access key.');
      expect(res.session).toBeUndefined();
    });

    it('rejects unknown username with identical generic error to prevent user enumeration', async () => {
      const res = await staffAuthService.signInDepartmentStaffWithUsername(
        'nonexistent-user',
        TEST_ACCESS_KEY,
        'kmc'
      );

      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_password');
      expect(res.error).toBe('Invalid username or access key.');
      expect(res.session).toBeUndefined();
    });
  });

  describe('4. Strict Cross-Department Boundary Enforcement', () => {
    it('blocks roads-01 from signing into the electricity console', async () => {
      const res = await staffAuthService.signInDepartmentStaffWithUsername(
        'roads-01',
        TEST_ACCESS_KEY,
        'kelectric'
      );

      expect(res.success).toBe(false);
      expect(res.status).toBe('wrong_department');
      expect(res.error).toContain('Access Denied');
      expect(res.error).toContain('authorized for');
      expect(res.session).toBeUndefined();
    });

    it('blocks water-01 from signing into the gas console via the UI form', async () => {
      renderDepartmentPortal('/department/login?dept=ssgc');

      fireEvent.change(screen.getByLabelText(/Username/i), {
        target: { value: 'water-01' },
      });
      fireEvent.change(screen.getByLabelText(/Access Key/i), {
        target: { value: TEST_ACCESS_KEY },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(/Access Denied: Your staff account is authorized for/i)
        ).toBeInTheDocument();
      });

      // Confirm session is not stored
      expect(sessionStorage.getItem('awaaz_department_auth_session_v1')).toBeNull();
    });
  });

  describe('5. Access Revocation Workflow', () => {
    it('blocks revoked department accounts from authenticating', async () => {
      // 1. First ensure the demonstration account is in state
      localSupabaseAdapter.ensureDemonstrationAccount('roads-01');
      const identity = resolveDepartmentIdentity('roads-01')!;

      // 2. Find membership
      const memberships = localSupabaseAdapter.getAllMemberships();
      const membership = memberships.find(
        (m) => m.profile.email.toLowerCase() === identity.authEmail.toLowerCase()
      );
      expect(membership).toBeDefined();

      const revoked = localSupabaseAdapter.revokeStaffAccess(
        membership!.id,
        'Security re-audit in progress'
      );
      expect(revoked.success).toBe(true);

      // 3. Attempt to sign in with valid access key
      const res = await staffAuthService.signInDepartmentStaffWithUsername(
        'roads-01',
        TEST_ACCESS_KEY,
        'kmc'
      );

      expect(res.success).toBe(false);
      expect(res.status).toBe('revoked');
      expect(res.rejectionReason).toBe('Security re-audit in progress');
      expect(res.error).toContain('revoked');
    });
  });

  describe('6. Zero Citizen PII Exposure & Username Header Badging', () => {
    it('renders the active staff username badge in the department header without leaking auth email', () => {
      // Seed active department session with username badge
      sessionStorage.setItem(
        'awaaz_department_auth_session_v1',
        JSON.stringify({
          userId: 'test-staff-roads',
          email: 'fahadmalik030121+roads@gmail.com',
          username: 'roads-01',
          departmentId: 'kmc',
          fullName: 'Roads Officer',
          role: 'department_staff',
          authenticatedAt: new Date().toISOString(),
        })
      );

      render(
        <MemoryRouter>
          <LanguageProvider>
            <DepartmentAuthProvider>
              <DepartmentHeader />
            </DepartmentAuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      );

      // Verified username badge and department code
      expect(screen.getByText('roads-01')).toBeInTheDocument();
      expect(screen.getByText('KMC')).toBeInTheDocument();

      // Ensure recovery email / auth email is NEVER rendered
      expect(screen.queryByText(/fahadmalik030121/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/@gmail\.com/i)).not.toBeInTheDocument();
    });

    it('verifies department complaints do not leak citizen personal identity to staff', () => {
      // 1. Ensure staff demonstration account exists
      localSupabaseAdapter.ensureDemonstrationAccount('roads-01');
      const identity = resolveDepartmentIdentity('roads-01')!;
      const staffMember = localSupabaseAdapter
        .getAllMemberships()
        .find((m) => m.profile.email.toLowerCase() === identity.authEmail.toLowerCase());
      expect(staffMember).toBeDefined();
      const staffUserId = staffMember!.user_id;

      // 2. Seed a complaint with citizen private data in local adapter
      const citizenUserId = 'citizen-private-uuid-001';
      const insertRes = localSupabaseAdapter.insertComplaint(
        {
          reference_number: 'KMC-2026-TEST',
          citizen_id: citizenUserId,
          description: 'Road cave-in near inquiry office',
          detected_language: 'roman_urdu',
          incident_district: 'District Central',
          incident_locality: 'Nazimabad Block 2',
          incident_public_location: 'Near Post Office',
          status: 'assigned',
          assigned_department_id: 'kmc',
          is_demonstration: false,
        },
        citizenUserId
      );
      expect(insertRes.success).toBe(true);
      const complaintId = insertRes.complaint!.id;

      localSupabaseAdapter.insertCitizenPrivateDetails(
        {
          complaint_id: complaintId,
          citizen_name: 'Muhammad Ali',
          citizen_phone: '+923001234567',
          citizen_email: 'ali.citizen@example.com',
          residential_address: 'House 123, Street 4, Block 2, Nazimabad',
        },
        citizenUserId
      );

      // 3. Department staff queries assigned complaints
      const staffComplaints = localSupabaseAdapter.selectComplaints(staffUserId);
      const found = staffComplaints.find((c) => c.id === complaintId);
      expect(found).toBeDefined();
      expect(found?.incident_locality).toBe('Nazimabad Block 2');
      expect(found?.incident_public_location).toBe('Near Post Office');

      // 4. Department staff attempts to query citizen private details -> RLS returns NULL
      const privateDetails = localSupabaseAdapter.selectCitizenPrivateDetails(complaintId, staffUserId);
      expect(privateDetails).toBeNull();
    });
  });
});
