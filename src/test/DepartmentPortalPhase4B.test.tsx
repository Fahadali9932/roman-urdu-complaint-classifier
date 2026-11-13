import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';
import { DepartmentPortalLayout } from '../features/department/DepartmentPortalLayout';
import { LandingPage } from '../features/landing/LandingPage';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import fs from 'fs';
import path from 'path';

describe('AWAAZ-E-AWAM — Phase 4B: Department Portal Design System & PWA Foundation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localSupabaseAdapter.resetToDefault();

    // Seed test profiles and memberships in local adapter
    // 1. Authorized Roads Staff
    localSupabaseAdapter.createTestProfile(
      'roads-officer-uuid-001',
      'Engr. Farhan Rizvi',
      'farhan.rizvi@kmc.gos.pk',
      'department_staff'
    );
    localSupabaseAdapter.createTestMembership(
      'roads-officer-uuid-001',
      'kmc',
      'active',
      'Executive Engineer - Roads'
    );
    localSupabaseAdapter.createTestCredentials(
      'roads-officer-uuid-001',
      'farhan.rizvi@kmc.gos.pk',
      'RoadsChiefPass123!'
    );

    // 2. Water Department Staff (Assigned to KWSC, NOT Roads)
    localSupabaseAdapter.createTestProfile(
      'water-officer-uuid-002',
      'Asim Jameel',
      'asim.jameel@kwsc.gos.pk',
      'department_staff'
    );
    localSupabaseAdapter.createTestMembership(
      'water-officer-uuid-002',
      'kwsc',
      'active',
      'Water Distribution Officer'
    );
    localSupabaseAdapter.createTestCredentials(
      'water-officer-uuid-002',
      'asim.jameel@kwsc.gos.pk',
      'ValidWaterPass123!'
    );

    // 3. Revoked Roads Staff
    localSupabaseAdapter.createTestProfile(
      'revoked-roads-uuid-003',
      'Tariq Malik',
      'tariq.malik@kmc.gos.pk',
      'department_staff'
    );
    localSupabaseAdapter.createTestMembership(
      'revoked-roads-uuid-003',
      'kmc',
      'revoked',
      'Former Road Inspector'
    );
    localSupabaseAdapter.createTestCredentials(
      'revoked-roads-uuid-003',
      'tariq.malik@kmc.gos.pk',
      'RevokedPass123!'
    );
  });

  const renderDepartmentPortal = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <LanguageProvider>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route element={<DepartmentPortalLayout />}>
                <Route path="/department/login" element={<DepartmentLoginPage />} />
                <Route
                  path="/department"
                  element={<div data-testid="department-workspace">Roads Workspace Active</div>}
                />
              </Route>
            </Routes>
          </DepartmentAuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  describe('1. First Screen — Department Selection Composition', () => {
    it('renders the dominant DEPARTMENT. monumental heading and trigger card', () => {
      renderDepartmentPortal('/department/login');

      // Monumental Primary Heading
      const dominantHeading = screen.getByRole('heading', { level: 1 });
      expect(dominantHeading).toHaveTextContent('DEPARTMENT.');

      // Header branding
      expect(screen.getByText('Awaaz-e-Awam')).toBeInTheDocument();

      // Prominent Department Selector Card
      expect(screen.getByText(/Select Department/i)).toBeInTheDocument();
    });

    it('opens full-screen selection menu listing all 6 municipal authorities and closes with Escape key', async () => {
      renderDepartmentPortal('/department/login');

      // Click to open selection menu
      const triggerBtn = screen.getByText(/Select Department/i).closest('button');
      expect(triggerBtn).toBeInTheDocument();
      fireEvent.click(triggerBtn!);

      // Verify Modal Dialog is open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Select Municipal Department Console')).toBeInTheDocument();

      // Verify all 6 authoritative authorities are present
      expect(screen.getAllByText('KMC').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('KE')).toBeInTheDocument();
      expect(screen.getByText('KWSC')).toBeInTheDocument();
      expect(screen.getByText('SSGC')).toBeInTheDocument();
      expect(screen.getByText('SSWMB')).toBeInTheDocument();
      expect(screen.getByText('SBCA')).toBeInTheDocument();

      // Verify Roads has ACTIVE CONSOLE status
      expect(screen.getByText('ACTIVE CONSOLE')).toBeInTheDocument();

      // Close via Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('navigates to Roads Login when Roads & Infrastructure is selected from modal', async () => {
      renderDepartmentPortal('/department/login');

      // Open modal
      const triggerBtn = screen.getByText(/Select Department/i).closest('button');
      fireEvent.click(triggerBtn!);

      // Click Roads card
      const roadsCard = screen.getByText('Roads & Infrastructure').closest('button');
      expect(roadsCard).toBeInTheDocument();
      fireEvent.click(roadsCard!);

      // Modal closes and Roads login renders
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('ROADS & INFRASTRUCTURE')).toBeInTheDocument();
        expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Access Key/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. Second Screen — Roads Department Login Experience', () => {
    it('renders the complete responsive Roads login experience with glassmorphism controls', () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      // Roads Department Title & Badging
      expect(screen.getByText('ROADS & INFRASTRUCTURE')).toBeInTheDocument();
      expect(screen.getByText('KMC • ROADS')).toBeInTheDocument();
      expect(
        screen.getByText(/Karachi Metropolitan Corporation • Department Staff Sign-In/i)
      ).toBeInTheDocument();

      // Controls
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Access Key/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Sign In$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Back to Department Selection/i })
      ).toBeInTheDocument();
    });

    it('navigates back to Department Selection when back button is clicked', async () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      expect(screen.getByText('ROADS & INFRASTRUCTURE')).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /Back to Department Selection/i });
      fireEvent.click(backBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DEPARTMENT.');
      });
    });

    it('toggles password visibility with show/hide button', () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      const passwordInput = screen.getByLabelText(/Access Key/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /Show password/i });
      fireEvent.click(toggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideBtn = screen.getByRole('button', { name: /Hide password/i });
      fireEvent.click(hideBtn);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('never exposes public Request Access, registration, or pending approval controls', () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      expect(screen.queryByText(/Request Access/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Awaiting administrator approval/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Register/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Full name/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Security & Department Isolation Verification', () => {
    it('validates empty inputs and prevents empty submission', async () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Please enter your assigned department username/i)).toBeInTheDocument();
      });
    });

    it('denies access when a staff member from another department (KWSC) attempts to log into Roads (KMC)', async () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      fireEvent.change(screen.getByLabelText(/Username/i), {
        target: { value: 'asim.jameel@kwsc.gos.pk' },
      });
      fireEvent.change(screen.getByLabelText(/Access Key/i), {
        target: { value: 'ValidWaterPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      // Strict Department Isolation Assertion
      await waitFor(() => {
        expect(
          screen.getByText(/Access Denied: Your staff account is authorized for/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/You cannot access the Roads & Infrastructure console/i)).toBeInTheDocument();
      });

      // Confirm session was NOT stored for Roads
      expect(sessionStorage.getItem('awaaz_department_auth_session_v1')).toBeNull();
    });

    it('authenticates authorized Roads staff member and navigates to department workspace', async () => {
      renderDepartmentPortal('/department/login?dept=kmc');

      fireEvent.change(screen.getByLabelText(/Username/i), {
        target: { value: 'farhan.rizvi@kmc.gos.pk' },
      });
      fireEvent.change(screen.getByLabelText(/Access Key/i), {
        target: { value: 'RoadsChiefPass123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('department-workspace')).toBeInTheDocument();
      });
    });

    it('displays persistent revocation notice for revoked accounts', async () => {
      renderDepartmentPortal('/department/login?dept=kmc&revoked=true&reason=Administrative+review');

      expect(screen.getByText(/Account Access Revoked/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Your departmental access has been revoked: Administrative review/i)
      ).toBeInTheDocument();
    });
  });

  describe('4. PWA Foundation & Strict Privacy Security', () => {
    it('provides a valid standards-compliant web app manifest scoped strictly to /department', () => {
      const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifestContent.name).toBe('Awaaz-e-Awam — Department Portal');
      expect(manifestContent.short_name).toBe('Dept Portal');
      expect(manifestContent.start_url).toBe('/department');
      expect(manifestContent.scope).toBe('/department');
      expect(manifestContent.display).toBe('standalone');
      expect(manifestContent.theme_color).toBe('#0A0D12');
      expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);
    });

    it('ensures service worker code strictly bypasses auth, Supabase APIs, and complaints data', () => {
      const swPath = path.resolve(process.cwd(), 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf8');

      // Verify strict exclusion patterns
      expect(swContent).toContain('/supabase\\.co/');
      expect(swContent).toContain('/\\/auth\\/v1\\//');
      expect(swContent).toContain('/\\/rest\\/v1\\//');
      expect(swContent).toContain('STRICT PRIVACY GUARD');
      expect(swContent).toContain('CITIZEN WEBSITE PROTECTION');
    });

    it('preserves Citizen Website routing without interference', () => {
      renderDepartmentPortal('/');

      // Citizen Landing Page elements render cleanly
      expect(screen.getAllByText(/YOUR VOICE/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/SERVICE \/ RESPONSIBILITY \/ ACCOUNTABILITY/i)).toBeInTheDocument();
    });
  });
});
