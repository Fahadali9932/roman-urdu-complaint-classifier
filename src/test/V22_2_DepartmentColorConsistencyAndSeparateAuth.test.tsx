import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { HodLoginPage } from '../features/department/auth/HodLoginPage';
import { OfficerLoginPage } from '../features/department/auth/OfficerLoginPage';
import { DesktopRequiredScreen } from '../features/department/device/DesktopRequiredScreen';
import {
  canonicalizeDepartmentKey,
  DEPARTMENT_ATMOSPHERES,
} from '../features/department/services/departmentThemes';
import { syncDocumentDepartment } from '../features/department/hooks/useCivicTheme';
import { fieldOperations } from '../features/department/services/fieldOperations';
import { getLocalDemoCredentials } from '../services/localDemoCredentials';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';

describe('AWAAZ-E-AWAM — Phase V22.2: Final Department Color Consistency & Separate Staff Authentication', () => {
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

  describe('1. Department Color Consistency & Viewport Scoping', () => {
    it('defines distinct atmospheric color palettes for all 7 departments with approved single-hue themes', () => {
      const expectedKeys = ['kmc', 'kelectric', 'kwsc', 'ssgc', 'sswmb', 'sbca', 'admin'] as const;

      for (const key of expectedKeys) {
        const canonical = canonicalizeDepartmentKey(key);
        const atmosphere = DEPARTMENT_ATMOSPHERES[canonical];
        expect(atmosphere).toBeDefined();
        expect(atmosphere.deep).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(atmosphere.highlight).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(atmosphere.spotlightDark).toContain('rgba(');
      }
    });

    it('DesktopRequiredScreen applies correct data-dept and theme attributes preventing grey root fallback', () => {
      const { container } = render(
        <MemoryRouter>
          <DesktopRequiredScreen
            portalType="department"
            departmentCode="SSWMB"
            departmentName="Sindh Solid Waste Management Board"
            role="head"
            themeMode="dark"
          />
        </MemoryRouter>
      );

      const root = container.querySelector('.v20-desktop-restriction-root');
      expect(root).not.toBeNull();
      expect(root).toHaveAttribute('data-dept', 'sswmb');
      expect(root).toHaveAttribute('data-theme', 'dark');
      expect(root).toHaveClass('v20-portal-root');

      // Verify light mode class attachment
      const { container: lightContainer } = render(
        <MemoryRouter>
          <DesktopRequiredScreen
            portalType="department"
            departmentCode="KE"
            departmentName="K-Electric"
            role="head"
            themeMode="light"
          />
        </MemoryRouter>
      );

      const lightRoot = lightContainer.querySelector('.v20-desktop-restriction-root');
      expect(lightRoot).toHaveAttribute('data-dept', 'kelectric');
      expect(lightRoot).toHaveAttribute('data-theme', 'light');
      expect(lightRoot).toHaveClass('v20-light-mode');
    });

    it('syncDocumentDepartment synchronizes root data-dept onto document element', () => {
      syncDocumentDepartment('sswmb');
      expect(document.documentElement.getAttribute('data-dept')).toBe('sswmb');

      syncDocumentDepartment('ke');
      expect(document.documentElement.getAttribute('data-dept')).toBe('kelectric');
    });
  });

  describe('2. Dedicated HOD Sign-In Experience (HodLoginPage)', () => {
    it('renders asymmetric editorial desktop layout with Department Head heading and agency context', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Department Head/i })).toBeInTheDocument();
      expect(screen.getByText(/Executive oversight, incident assignment/i)).toBeInTheDocument();
      expect(screen.getByText(/DEPARTMENT OF SINDH/i)).toBeInTheDocument();
      expect(screen.getByText(/Use the Department Head account \(roads-01\)/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Access key \(local demo\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Officer sign-in/i })).toHaveAttribute(
        'href',
        '/department/officer/login?dept=kmc'
      );
    });

    it('switching department via theme selector updates data-dept and keeps credentials intact', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Enter credentials
      fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
        target: { value: 'water-01' },
      });
      fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/i), {
        target: { value: 'SecretKey123' },
      });

      // Switch department via dropdown
      const trigger = screen.getByTestId('department-theme-selector-trigger');
      fireEvent.click(trigger);
      const kwscOption = screen.getByTestId('department-option-kwsc');
      fireEvent.click(kwscOption);

      // Check that data-dept updated
      const pageRoot = screen.getByTestId('hod-login-page');
      expect(pageRoot).toHaveAttribute('data-dept', 'kwsc');

      // Verify credentials were not wiped out
      expect((screen.getByRole('textbox', { name: 'Username' }) as HTMLInputElement).value).toBe('water-01');
      expect((screen.getByLabelText(/Access key \(local demo\)/i) as HTMLInputElement).value).toBe('SecretKey123');
    });

    it('enforces role separation by rejecting officer credentials at HOD sign-in', async () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
              <Route path="/department/head" element={<h1>Head Workspace Loaded</h1>} />
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

      // Should show role mismatch alert and direct link to officer login
      expect(
        await screen.findByText(/This sign-in is reserved for Department Heads/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Officer sign-in/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Head Workspace Loaded' })).not.toBeInTheDocument();
    });

    it('enforces department boundary by rejecting wrong department accounts', async () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      // Attempt to sign into KMC with KE head account
      fireEvent.change(screen.getByRole('textbox', { name: 'Username' }), {
        target: { value: 'electricity-01' },
      });
      fireEvent.change(screen.getByLabelText(/Access key \(local demo\)/i), {
        target: { value: getLocalDemoCredentials().staffPassword },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      expect(
        await screen.findByText(/This staff account is not authorized for the selected department/i)
      ).toBeInTheDocument();
    });
  });

  describe('3. Dedicated Officer Sign-In Experience (OfficerLoginPage)', () => {
    it('renders centered mobile-friendly layout with Officer access heading and compact form', () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Officer access/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Sign in to your department to access active fieldwork tasks/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Accounts are issued by your department head/i)).toBeInTheDocument();
      expect(screen.getByText(/Use the Field Officer account \(roads-02\)/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Access key \(local demo\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Department Head sign-in/i })).toHaveAttribute(
        'href',
        '/department/head/login?dept=kmc'
      );
    });

    it('enforces role separation by rejecting HOD credentials at Officer sign-in', async () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
              <Route path="/department/officer" element={<h1>Officer Workspace Loaded</h1>} />
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
        await screen.findByText(/Your account belongs to the Department Head workspace/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Department Head sign-in/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Officer Workspace Loaded' })).not.toBeInTheDocument();
    });

    it('successfully signs in officer account and routes to officer workspace', async () => {
      render(
        <MemoryRouter initialEntries={['/department/officer/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/officer/login" element={<OfficerLoginPage />} />
              <Route path="/department/officer" element={<h1>Officer Workspace Loaded</h1>} />
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

      expect(await screen.findByRole('heading', { name: 'Officer Workspace Loaded' })).toBeInTheDocument();
    });
  });

  describe('4. Theme and Atmospheric Switching', () => {
    it('toggles light and dark mode with correct CSS classes and attributes', () => {
      render(
        <MemoryRouter initialEntries={['/department/head/login?dept=kmc']}>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/department/head/login" element={<HodLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </MemoryRouter>
      );

      const pageRoot = screen.getByTestId('hod-login-page');
      const toggleBtn = screen.getByTestId('hod-login-theme-toggle');

      const initialTheme = pageRoot.getAttribute('data-theme');
      fireEvent.click(toggleBtn);

      const nextTheme = pageRoot.getAttribute('data-theme');
      expect(nextTheme).not.toBe(initialTheme);
      if (nextTheme === 'light') {
        expect(pageRoot).toHaveClass('v20-light-mode');
      } else {
        expect(pageRoot).not.toHaveClass('v20-light-mode');
      }
    });
  });
});
