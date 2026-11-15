import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { LoginPage } from '../features/auth/LoginPage';
import { staffAuthService } from '../services/staffAuthService';
import { SimplifiedComplaintContainer } from '../features/citizen/simplified-complaint/SimplifiedComplaintContainer';
import * as supabaseModule from '../lib/supabase';

vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  };

  return {
    supabase: {
      from: mockFrom,
      auth: mockAuth,
    },
    isSupabaseConfigured: () => true,
  };
});

describe('AWAAZ-E-AWAM — Gate B: Role Separation & Draft Privacy (V6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('AUTH-01: rejects department staff credentials at citizen login', async () => {
    const mockAuth = supabaseModule.supabase?.auth as any;
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'staff-user-123', email: 'staff@kmc.gov.pk' },
        session: { access_token: 'fake-token' },
      },
      error: null,
    });

    const mockFrom = supabaseModule.supabase?.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'department_staff' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <LanguageProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'staff@kmc.gov.pk' } });
    fireEvent.change(passwordInput, { target: { value: 'validPassword123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(
        screen.getByText(/This is a department account\. Please use the department sign-in page\./i)
      ).toBeInTheDocument();
    });
  });

  it('AUTH-02: rejects citizen credentials at department staff login', async () => {
    const mockAuth = supabaseModule.supabase?.auth as any;
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'citizen-user-456', email: 'citizen@example.com' },
        session: { access_token: 'fake-token' },
      },
      error: null,
    });

    const mockFrom = supabaseModule.supabase?.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'department_memberships') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'citizen' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const result = await staffAuthService.signInDepartmentStaff(
      'citizen@example.com',
      'password123'
    );

    expect(result.success).toBe(false);
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(result.error).toMatch(/This is a citizen account\. Please use the citizen sign-in page\./i);
  });

  it('DRAFT-02 & DRAFT-06: purges legacy unnamespaced draft key and ensures PII is never stored in storage', () => {
    sessionStorage.setItem('awaaz_complaint_draft_v1', JSON.stringify({
      fullName: 'Sensitive Citizen',
      phone: '03001234567',
      description: 'Leaked private complaint',
    }));

    expect(sessionStorage.getItem('awaaz_complaint_draft_v1')).toBeTruthy();

    render(
      <MemoryRouter>
        <LanguageProvider>
          <SimplifiedComplaintContainer />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(sessionStorage.getItem('awaaz_complaint_draft_v1')).toBeNull();

    // Verify all keys currently in sessionStorage: none contain PII
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const val = sessionStorage.getItem(key) || '';
        expect(val).not.toContain('Sensitive Citizen');
        expect(val).not.toContain('03001234567');
      }
    }
  });

  it('PRIV-01: Displays explicit privacy disclosure matching backend storage', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <SimplifiedComplaintContainer />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/We use your contact details to manage your complaint\. They are kept private and never shown to department staff\./i)
    ).toBeInTheDocument();
  });
});
