import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  describe('2. Department Entry & Selection Screen', () => {
    it('renders department selection entry with monumental DEPARTMENT. heading', () => {
      renderWithProviders('/department/login');

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DEPARTMENT.');
      expect(screen.getByText('Roads & Infrastructure')).toBeInTheDocument();
      expect(screen.getByText(/CLICK TO SELECT CONSOLE/i)).toBeInTheDocument();
    });

    it('renders Roads login screen when dept=kmc is present', () => {
      renderWithProviders('/department/login?dept=kmc');

      expect(screen.getByText('ROADS & INFRASTRUCTURE')).toBeInTheDocument();
      expect(screen.getByLabelText(/Assigned Work Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Access Key \/ Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Roads Console/i })).toBeInTheDocument();
    });
  });

  describe('3. Staff Security Guard: Public Request Access Controls Retired', () => {
    it('confirms public request access fields and pending approval states are removed', () => {
      renderWithProviders('/department/login?dept=kmc');

      // Obsolete controls must not exist
      expect(screen.queryByText(/Request access • Approval required before sign-in/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Request Access/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Awaiting administrator approval/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Design example • No account is created/i)).not.toBeInTheDocument();
    });
  });

  describe('4. Department Selector Modal Interaction', () => {
    it('opens full-screen modal and lists municipal agencies', async () => {
      renderWithProviders('/department/login');

      const triggerBtn = screen.getByText(/CLICK TO SELECT CONSOLE/i).closest('button');
      fireEvent.click(triggerBtn!);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Select Municipal Department Console')).toBeInTheDocument();
      expect(screen.getAllByText('KMC').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('KWSC')).toBeInTheDocument();
      expect(screen.getByText('SSGC')).toBeInTheDocument();
    });
  });
});
