import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { HodLoginPage } from '../features/department/auth/HodLoginPage';
import { OfficerLoginPage } from '../features/department/auth/OfficerLoginPage';
import { StaffDepartmentSelection } from '../features/department/auth/StaffDepartmentSelection';
import { StaffRoleChoiceGateway } from '../features/department/auth/StaffRoleChoiceGateway';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import {
  canonicalizeDepartmentKey,
  DEPARTMENT_ATMOSPHERES,
  STAFF_DEPARTMENTS,
  SELECTION_ATMOSPHERE,
} from '../features/department/services/departmentThemes';
import { getLocalDemoCredentials } from '../services/localDemoCredentials';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';

describe('AWAAZ-E-AWAM — Phase V22.3: Final Staff Authentication Experience & Legacy Cleanup', () => {
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
  // 1. Department Registry and Central Admin Isolation
  // =========================================================================
  describe('1. Department Registry & Central Admin Isolation', () => {
    it('STAFF_DEPARTMENTS contains strictly 6 municipal service departments', () => {
      expect(STAFF_DEPARTMENTS).toHaveLength(6);
      const keys = STAFF_DEPARTMENTS.map((d) => d.key);
      expect(keys).toEqual(['kmc', 'kelectric', 'kwsc', 'sswmb', 'gas', 'sbca']);
    });

    it('Central Admin is strictly excluded from STAFF_DEPARTMENTS', () => {
      const adminDept = STAFF_DEPARTMENTS.find(
        (d) => d.key === 'admin' || d.code.toLowerCase() === 'admin' || d.name.toLowerCase().includes('admin')
      );
      expect(adminDept).toBeUndefined();
    });

    it('SELECTION_ATMOSPHERE uses neutral graphite, slate charcoal, and silver glow', () => {
      expect(SELECTION_ATMOSPHERE.deep).toBe('#101215');
      expect(SELECTION_ATMOSPHERE.mid).toBe('#303741');
      expect(SELECTION_ATMOSPHERE.highlight).toBe('#65717F');
      expect(SELECTION_ATMOSPHERE.spotlightDark).toBe('rgba(101, 113, 127, 0.10)');
      expect(DEPARTMENT_ATMOSPHERES.selection).toBeDefined();
      expect(DEPARTMENT_ATMOSPHERES.selection.deep).toBe('#101215');
    });

    it('canonicalizeDepartmentKey handles selection', () => {
      expect(canonicalizeDepartmentKey('selection')).toBe('selection');
    });
  });

  // =========================================================================
  // 2. Stage 1: Staff Department Selection (StaffDepartmentSelection)
  // =========================================================================
  describe('2. Stage 1: Department Selection Component (StaffDepartmentSelection)', () => {
    it('renders monumental heading "Select your department." with role badge and 6 department cards', () => {
      const mockSelect = vi.fn();
      render(
        <MemoryRouter>
          <StaffDepartmentSelection
            role="head"
            onSelectDepartment={mockSelect}
            themeMode="dark"
          />
        </MemoryRouter>
      );

      // Monumental heading
      expect(
        screen.getByRole('heading', { name: /Select your department\./i })
      ).toBeInTheDocument();

      // Role badge present
      expect(screen.getAllByText(/Department Head/i).length).toBeGreaterThanOrEqual(1);

      // Homepage link
      expect(screen.getByRole('link', { name: /Homepage/i })).toHaveAttribute('href', '/');

      // 6 substantial cards present
      const cards = screen.getAllByTestId(/^dept-card-/);
      expect(cards).toHaveLength(6);

      // Verify all 6 department codes and exact categories exist
      expect(screen.getByText('KMC')).toBeInTheDocument();
      expect(screen.getByText('Roads & Infrastructure')).toBeInTheDocument();
      expect(screen.getAllByText('K-Electric').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Electricity')).toBeInTheDocument();
      expect(screen.getByText('KW&SC')).toBeInTheDocument();
      expect(screen.getByText('Water & Sewerage')).toBeInTheDocument();
      expect(screen.getByText('SSWMB')).toBeInTheDocument();
      expect(screen.getByText('Solid Waste Management')).toBeInTheDocument();
      expect(screen.getByText('SSGC')).toBeInTheDocument();
      expect(screen.getByText('Gas')).toBeInTheDocument();
      expect(screen.getByText('SBCA')).toBeInTheDocument();
      expect(screen.getByText('Building Control')).toBeInTheDocument();

      // Ensure Central Admin is NOT present among cards
      expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
      expect(screen.queryByText(/Central Administration/i)).not.toBeInTheDocument();

      // Zero role-switching links in Stage 1
      expect(screen.queryByRole('link', { name: /Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Department Head sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Operating in the field\?/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Assigned to departmental leadership\?/i)).not.toBeInTheDocument();

      // Absolutely NO username or password fields in Stage 1
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Sign In$/i })).not.toBeInTheDocument();
    });

    it('clicking a department card triggers onSelectDepartment with correct department key', async () => {
      const mockSelect = vi.fn();
      render(
        <MemoryRouter>
          <StaffDepartmentSelection
            role="officer"
            onSelectDepartment={mockSelect}
            themeMode="dark"
          />
        </MemoryRouter>
      );

      // Verify Officer role badge
      expect(screen.getAllByText(/Field Officer/i).length).toBeGreaterThanOrEqual(1);

      // Click K-Electric card
      const keCard = screen.getByTestId('dept-card-kelectric');
      fireEvent.click(keCard);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledWith('kelectric');
      });
    });

    it('applies neutral selection atmosphere data-dept="selection"', () => {
      const { container } = render(
        <MemoryRouter>
          <StaffDepartmentSelection
            role="head"
            onSelectDepartment={vi.fn()}
            themeMode="dark"
          />
        </MemoryRouter>
      );

      const root = container.querySelector('[data-dept="selection"]');
      expect(root).not.toBeNull();
      expect(root).toHaveAttribute('data-role', 'head');
    });
  });

  // =========================================================================
  // 3. Department Head Sign-In (HodLoginPage) Two-Stage Flow
  // =========================================================================
  describe('3. Dedicated Department Head Sign-In (HodLoginPage)', () => {
    it('fresh visit without ?dept renders Stage 1 department selection', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Should render Stage 1
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Sign In$/i })).not.toBeInTheDocument();
    });

    it('visit with valid ?dept renders Stage 2 with monumental "Department Head." heading and auth card', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kelectric']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Stage 2 monumental heading
      expect(screen.getByRole('heading', { name: /Department Head\./i })).toBeInTheDocument();
      expect(screen.getAllByText(/K-ELECTRIC/i).length).toBeGreaterThanOrEqual(1);

      // Auth card elements
      expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Access key \(local demo\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();

      // Inputs have .v20-auth-input class for autofill styling
      const userInput = screen.getByRole('textbox', { name: 'Username' });
      expect(userInput).toHaveClass('v20-auth-input');

      // Zero cross-role switching links
      expect(screen.queryByRole('link', { name: /Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Operating in the field\?/i)).not.toBeInTheDocument();
    });

    it('"Change department" action returns to Stage 1 department selection', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Click "Change department" button in header
      const changeBtn = screen.getByTestId('hod-change-dept-header-btn');
      fireEvent.click(changeBtn);

      // Should transition to Stage 1
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
    });

    it('enforces role separation by rejecting officer credentials at HOD login', async () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
              <Route path="/department/head" element={<h1>HOD Portal</h1>} />
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

      expect(
        await screen.findByText(/This sign-in is reserved for Department Heads/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Open Officer sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'HOD Portal' })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Field Officer Sign-In (OfficerLoginPage) Two-Stage Flow
  // =========================================================================
  describe('4. Dedicated Field Officer Sign-In (OfficerLoginPage)', () => {
    it('fresh visit without ?dept renders Stage 1 department selection', () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Should render Stage 1
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Sign In$/i })).not.toBeInTheDocument();
    });

    it('visit with valid ?dept renders centered Stage 2 with monumental "Field Officer." heading', () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=sswmb']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Stage 2 monumental heading
      expect(screen.getByRole('heading', { name: /Field Officer\./i })).toBeInTheDocument();
      expect(screen.getAllByText(/SINDH SOLID WASTE MANAGEMENT BOARD/i).length).toBeGreaterThanOrEqual(1);

      // Auth card elements
      expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Access key \(local demo\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();

      // Input styling check
      const userInput = screen.getByRole('textbox', { name: 'Username' });
      expect(userInput).toHaveClass('v20-auth-input');

      // Zero cross-role switching links
      expect(screen.queryByRole('link', { name: /Department Head sign-in/i })).not.toBeInTheDocument();
    });

    it('"Change department" actions in Officer login return to Stage 1', () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Click "Change department" button in header
      const changeBtn = screen.getByTestId('officer-change-dept-header-btn');
      fireEvent.click(changeBtn);

      // Should transition to Stage 1
      expect(screen.getByRole('heading', { name: /Select your department\./i })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
    });

    it('enforces role separation by rejecting HOD credentials at Officer login', async () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
              <Route path="/department/officer" element={<h1>Officer Portal</h1>} />
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

      expect(
        await screen.findByText(/This sign-in is for Field Officers/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Open Department Head sign-in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Officer Portal' })).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Shared Role Choice Gateway & Route Legacy Cleanup
  // =========================================================================
  describe('5. StaffRoleChoiceGateway & Legacy Cleanup', () => {
    it('renders StaffRoleChoiceGateway with role selection cards for Department Head and Field Officer', () => {
      render(
        <MemoryRouter>
          <StaffRoleChoiceGateway />
        </MemoryRouter>
      );

      // Must render StaffRoleChoiceGateway
      expect(screen.getByTestId('staff-role-choice-page')).toBeInTheDocument();
      expect(screen.getByText(/Select your assigned role to proceed to department selection/i)).toBeInTheDocument();
      expect(screen.getByTestId('role-card-head')).toHaveAttribute('href', '/department/head/login');
      expect(screen.getByTestId('role-card-officer')).toHaveAttribute('href', '/department/officer/login');
    });

    it('DepartmentLoginPage routes to HodLoginPage when role=head query param is provided', () => {
      render(
        <MemoryRouter initialEntries={['/department/login?role=head&dept=kmc']}>
          <DepartmentAuthProvider>
            <DepartmentLoginPage />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('hod-login-page')).toBeInTheDocument();
    });

    it('DepartmentLoginPage routes to OfficerLoginPage when role=officer query param is provided', () => {
      render(
        <MemoryRouter initialEntries={['/department/login?role=officer&dept=kmc']}>
          <DepartmentAuthProvider>
            <DepartmentLoginPage />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('officer-login-page')).toBeInTheDocument();
    });

    it('AppRoutes legacy /department/login redirects to homepage / without role', async () => {
      const { AppRoutes } = await import('../routes/AppRoutes');
      render(
        <MemoryRouter initialEntries={['/department/login']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Successfully redirected to Homepage (landing page navigation elements present)
      expect(screen.getByRole('link', { name: /Awaaz-e-Awam Home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Write Your Complaint/i })).toBeInTheDocument();
    });

    it('AppRoutes legacy /department/login?role=head redirects to dedicated HOD login', async () => {
      const { AppRoutes } = await import('../routes/AppRoutes');
      render(
        <MemoryRouter initialEntries={['/department/login?role=head&dept=kmc']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('hod-login-page')).toBeInTheDocument();
    });

    it('AppRoutes legacy /department/login?role=officer redirects to dedicated Officer login', async () => {
      const { AppRoutes } = await import('../routes/AppRoutes');
      render(
        <MemoryRouter initialEntries={['/department/login?role=officer&dept=kmc']}>
          <DepartmentAuthProvider>
            <AppRoutes />
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('officer-login-page')).toBeInTheDocument();
    });
  });
});
