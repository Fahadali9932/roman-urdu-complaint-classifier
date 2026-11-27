import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { HodLoginPage } from '../features/department/auth/HodLoginPage';
import { OfficerLoginPage } from '../features/department/auth/OfficerLoginPage';
import { StaffDepartmentSelection } from '../features/department/auth/StaffDepartmentSelection';
import { AppRoutes } from '../routes/AppRoutes';
import {
  STAFF_DEPARTMENTS,
  SELECTION_ATMOSPHERE,
  DEPARTMENT_ATMOSPHERES,
} from '../features/department/services/departmentThemes';
import { getLocalDemoCredentials } from '../services/localDemoCredentials';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';

describe('AWAAZ-E-AWAM — V22.3.1: Final Authentication Design Refinement & Role Separation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localSupabaseAdapter.resetToDefault();
    document.documentElement.removeAttribute('data-dept');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Objective 1 & 2: Editorial Typography & Restrained Design System
  // =========================================================================
  describe('1. Editorial Typography & Restrained Design System', () => {
    it('verifies exact 6 department codes and categories in STAFF_DEPARTMENTS', () => {
      expect(STAFF_DEPARTMENTS).toHaveLength(6);
      expect(STAFF_DEPARTMENTS[0]).toMatchObject({ code: 'KMC', category: 'Roads & Infrastructure' });
      expect(STAFF_DEPARTMENTS[1]).toMatchObject({ code: 'K-Electric', category: 'Electricity' });
      expect(STAFF_DEPARTMENTS[2]).toMatchObject({ code: 'KW&SC', category: 'Water & Sewerage' });
      expect(STAFF_DEPARTMENTS[3]).toMatchObject({ code: 'SSWMB', category: 'Solid Waste Management' });
      expect(STAFF_DEPARTMENTS[4]).toMatchObject({ code: 'SSGC', category: 'Gas' });
      expect(STAFF_DEPARTMENTS[5]).toMatchObject({ code: 'SBCA', category: 'Building Control' });
    });

    it('verifies SELECTION_ATMOSPHERE has zero departmental color leakage', () => {
      expect(SELECTION_ATMOSPHERE.deep).toBe('#101215');
      expect(SELECTION_ATMOSPHERE.mid).toBe('#303741');
      expect(SELECTION_ATMOSPHERE.highlight).toBe('#65717F');
      expect(DEPARTMENT_ATMOSPHERES.selection.deep).toBe('#101215');
    });
  });

  // =========================================================================
  // 2. Objective 3: HOD Department Selection (Asymmetric 2-Column Desktop Grid)
  // =========================================================================
  describe('2. Objective 3: HOD Department Selection (Asymmetric 2-Column Composition)', () => {
    it('renders asymmetric 2-column layout with editorial typography and 6 vertical rows', () => {
      render(
        <MemoryRouter>
          <StaffDepartmentSelection
            role="head"
            onSelectDepartment={vi.fn()}
            themeMode="dark"
          />
        </MemoryRouter>
      );

      // Left column: small role identifier, bold headline, concise instruction
      expect(screen.getByText('Department Head.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.getByText('Choose your department to sign in.')).toBeInTheDocument();

      // Right column: 6 clean vertical rows (.v20-dept-row)
      const rows = screen.getAllByRole('button', { name: /^Select /i });
      expect(rows).toHaveLength(6);

      // Check all 6 department rows
      expect(screen.getByLabelText('Select KMC — Roads & Infrastructure')).toBeInTheDocument();
      expect(screen.getByLabelText('Select K-Electric — Electricity')).toBeInTheDocument();
      expect(screen.getByLabelText('Select KW&SC — Water & Sewerage')).toBeInTheDocument();
      expect(screen.getByLabelText('Select SSWMB — Solid Waste Management')).toBeInTheDocument();
      expect(screen.getByLabelText('Select SSGC — Gas')).toBeInTheDocument();
      expect(screen.getByLabelText('Select SBCA — Building Control')).toBeInTheDocument();

      // Strictly NO generic copy
      expect(screen.queryByText(/MUNICIPAL OPERATIONS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/AGENCY COMMAND & OVERSIGHT/i)).not.toBeInTheDocument();

      // Strictly NO role-switching links
      expect(screen.queryByRole('link', { name: /Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Operating in the field\?/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Objective 4: Officer Department Selection (Centered Composition)
  // =========================================================================
  describe('3. Objective 4: Officer Department Selection (Centered Composition)', () => {
    it('renders independent centered layout with 6 department rows', () => {
      render(
        <MemoryRouter>
          <StaffDepartmentSelection
            role="officer"
            onSelectDepartment={vi.fn()}
            themeMode="dark"
          />
        </MemoryRouter>
      );

      // Center header
      expect(screen.getByText('Field Officer.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.getByText('Choose your department to sign in.')).toBeInTheDocument();

      // 6 clean department selection rows
      const rows = screen.getAllByRole('button', { name: /^Select /i });
      expect(rows).toHaveLength(6);

      // Strictly NO role-switching links
      expect(screen.queryByRole('link', { name: /Department Head sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Assigned to departmental leadership\?/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Objective 6, 7 & 8: Complete Role Separation & Credential Pages
  // =========================================================================
  describe('4. Complete Role Separation & Credential Pages', () => {
    it('HOD credential screen has zero Officer sign-in links and preserves editorial two-column layout', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Preserves approved monumental headline
      expect(screen.getByRole('heading', { name: /Department Head\./i })).toBeInTheDocument();

      // Preserves clean inputs
      expect(screen.getByRole('textbox', { name: 'Username' })).toHaveClass('v20-auth-input');

      // Zero Officer sign-in links
      expect(screen.queryByRole('link', { name: /Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Operating in the field\?/i)).not.toBeInTheDocument();

      // Change department controls exist
      expect(screen.getByTestId('hod-change-dept-header-btn')).toBeInTheDocument();
      expect(screen.getByTestId('hod-change-dept-action-btn')).toBeInTheDocument();
      expect(screen.getByTestId('hod-change-dept-footer-btn')).toBeInTheDocument();
    });

    it('Officer credential screen has zero Department Head sign-in links', () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kwsc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Preserves headline
      expect(screen.getByRole('heading', { name: /Field Officer\./i })).toBeInTheDocument();

      // Preserves clean inputs
      expect(screen.getByRole('textbox', { name: 'Username' })).toHaveClass('v20-auth-input');

      // Zero Department Head sign-in links
      expect(screen.queryByRole('link', { name: /Department Head sign-in/i })).not.toBeInTheDocument();

      // Change department controls exist
      expect(screen.getByTestId('officer-change-dept-header-btn')).toBeInTheDocument();
      expect(screen.getByTestId('officer-change-dept-link')).toBeInTheDocument();
    });

    it('HOD role mismatch strictly rejects Officer credentials without providing an Officer sign-in link', async () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
        target: { value: 'roads-02' },
      });
      fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/i), {
        target: { value: getLocalDemoCredentials().staffPassword },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      // Strict rejection message displayed
      expect(
        await screen.findByText(/This sign-in is reserved for Department Heads/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/not authorized for the Department Head workspace/i)).toBeInTheDocument();

      // Zero cross-portal link
      expect(screen.queryByRole('link', { name: /Open Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Officer sign-in/i })).not.toBeInTheDocument();
    });

    it('Officer role mismatch strictly rejects HOD credentials without providing a Head sign-in link', async () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
        target: { value: 'roads-01' },
      });
      fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/i), {
        target: { value: getLocalDemoCredentials().staffPassword },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      // Strict rejection message displayed
      expect(
        await screen.findByText(/This sign-in is for Field Officers/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/not authorized for the Field Officer workspace/i)).toBeInTheDocument();

      // Zero cross-portal link
      expect(screen.queryByRole('link', { name: /Open Department Head sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Department Head sign-in/i })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Objective 12: Route Separation & Legacy Redirection
  // =========================================================================
  describe('5. Objective 12: Route Separation & Legacy Redirection', () => {
    it('redirects /department/login without role to Homepage /', async () => {
      render(
        <MemoryRouter initialEntries={['/department/login']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: /Awaaz-e-Awam Home/i })).toBeInTheDocument();
    });

    it('redirects /department/login?role=head to /department/head/login', async () => {
      render(
        <MemoryRouter initialEntries={['/department/login?role=head&dept=sbca']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('hod-login-page')).toBeInTheDocument();
      expect(screen.getAllByText(/SBCA/i).length).toBeGreaterThanOrEqual(1);
    });

    it('redirects /department/login?role=officer to /department/officer/login', async () => {
      render(
        <MemoryRouter initialEntries={['/department/login?role=officer&dept=gas']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('officer-login-page')).toBeInTheDocument();
      expect(screen.getByText(/SSGC/i)).toBeInTheDocument();
    });
  });
});
