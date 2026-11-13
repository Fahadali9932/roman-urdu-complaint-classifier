import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { AdminLoginPage } from '../features/auth/pages/AdminLoginPage';
import { DepartmentLoginPage } from '../features/department/DepartmentLoginPage';

describe('Staff & Administrator Access Screens (Figma 35:1282, 35:1332, 35:1363, 35:1390)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  const renderWithProviders = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <LanguageProvider>
          <DepartmentAuthProvider>
            <Routes>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/department/login" element={<DepartmentLoginPage />} />
            </Routes>
          </DepartmentAuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  describe('1. Main Administrator Sign-In (Frame 35:1282)', () => {
    it('renders the sculptural layout, monogram, and administrator form fields', () => {
      renderWithProviders('/admin/login');

      // Monogram & Title
      expect(screen.getAllByText('a.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Awaaz-e-Awam').length).toBeGreaterThan(0);
      expect(screen.getByText(/ADMINISTRATOR & DEPARTMENT PORTAL/i)).toBeInTheDocument();
      expect(screen.getByText(/Responsibility,/i)).toBeInTheDocument();
      expect(screen.getByText(/with room to act./i)).toBeInTheDocument();

      // Main Admin Header & Badge
      expect(screen.getByText('Main Administrator')).toBeInTheDocument();
      expect(screen.getByText('Welcome back.')).toBeInTheDocument();
      expect(
        screen.getByText(/Separate sign-in for authorized Main Administrators/i)
      ).toBeInTheDocument();

      // Form inputs
      expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();

      // Separate Role Entry (Figma 35:1384)
      expect(screen.getByText(/Working with a department\?/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Department Portal sign in/i })
      ).toBeInTheDocument();
    });

    it('validates required fields on submission', () => {
      renderWithProviders('/admin/login');

      const submitBtn = screen.getByRole('button', { name: /^Sign in/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Please enter your work email/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/Work email/i);
      fireEvent.change(emailInput, { target: { value: 'admin@example.org' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Please enter your password/i)).toBeInTheDocument();
    });

    it('shows honest prototype feedback without saving password', () => {
      renderWithProviders('/admin/login');

      fireEvent.change(screen.getByLabelText(/Work email/i), {
        target: { value: 'admin@example.org' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'SecretAdminPass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /^Sign in/i }));

      // Honest prototype feedback
      expect(
        screen.getByText(/Prototype Preview: Live backend authentication for Main Administrators/i)
      ).toBeInTheDocument();

      // Verify ZERO passwords in storage
      expect(localStorage.getItem('password')).toBeNull();
      expect(sessionStorage.getItem('password')).toBeNull();
    });
  });

  describe('2. Department Sign-In (Frame 35:1332)', () => {
    it('renders department sign-in with work email and password', () => {
      renderWithProviders('/department/login');

      expect(screen.getAllByText('Department Portal').length).toBeGreaterThan(0);
      expect(screen.getByRole('heading', { name: /^Sign in$/i })).toBeInTheDocument();
      expect(screen.getByText(/Welcome back\./i)).toBeInTheDocument();
      expect(
        screen.getByText(/Sign in with your approved departmental account/i)
      ).toBeInTheDocument();

      // Navigation link to Main Admin
      expect(
        screen.getByRole('button', { name: /Main Administrator sign in →/i })
      ).toBeInTheDocument();
    });
  });

  describe('3. Staff Request Access & Pending Approval (Frames 35:1363 & 35:1390)', () => {
    it('renders request access fields and validates required inputs', () => {
      renderWithProviders('/department/login');

      expect(screen.getByText(/Request access • Approval required before sign-in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Work email/i).length).toBe(2); // One in signin, one in request

      const requestBtn = screen.getByRole('button', { name: /Request Access/i });
      fireEvent.click(requestBtn);

      expect(screen.getByText(/Please enter your full name/i)).toBeInTheDocument();
    });

    it('transitions to Pending Approval state (Frame 35:1390) upon valid request', () => {
      renderWithProviders('/department/login');

      // Fill in Request Access form
      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: 'Tariq Mansoor' },
      });
      fireEvent.change(screen.getAllByLabelText(/Work email/i)[1], {
        target: { value: 'tariq.mansoor@ke.com.pk' },
      });
      fireEvent.change(screen.getAllByLabelText(/Password/i)[1], {
        target: { value: 'SecureStaff123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Request Access/i }));

      // Pending Approval State (Figma Frame 35:1390)
      expect(
        screen.getByRole('heading', { name: /Awaiting administrator approval/i })
      ).toBeInTheDocument();
      expect(screen.getByText('PENDING REVIEW')).toBeInTheDocument();
      expect(
        screen.getByText(/This sample request is pending review\. You can sign in once an administrator approves your access\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Design example • No account is created/i)
      ).toBeInTheDocument();

      // Reset action restores form
      const resetBtn = screen.getByRole('button', { name: /Submit another request/i });
      fireEvent.click(resetBtn);
      expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    });
  });

  describe('4. Department Selector Interaction', () => {
    it('opens popover and allows selecting a municipal agency', async () => {
      renderWithProviders('/department/login');

      // The button is associated with the label "Department"
      const selectorBtn = screen.getByLabelText(/^Department$/i);
      fireEvent.click(selectorBtn);

      // Verify agency options are listed
      expect(screen.getByText('Karachi Water & Sewerage Corporation (KW&SC)')).toBeInTheDocument();
      expect(screen.getByText('Sui Southern Gas Company (SSGC)')).toBeInTheDocument();

      // Select KWSC
      const kwscOption = screen.getByText('Karachi Water & Sewerage Corporation (KW&SC)');
      fireEvent.click(kwscOption);

      // Verify selection updated
      await waitFor(() => {
        expect(screen.getAllByText('Karachi Water & Sewerage Corporation (KW&SC)').length).toBeGreaterThan(0);
      });
    });
  });
});
