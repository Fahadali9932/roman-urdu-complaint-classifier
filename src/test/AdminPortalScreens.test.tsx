import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { AdminRequestsPage } from '../features/auth/pages/AdminRequestsPage';
import { AdminAccessPage } from '../features/auth/pages/AdminAccessPage';
import { staffAuthService } from '../services/staffAuthService';

describe('Main Administrator Management Screens (Figma 35:1041 & 35:1105)', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    staffAuthService.resetLocalDatabase();

    // Authenticate as Main Admin
    await staffAuthService.signInMainAdmin('admin@example.org', 'AdminPass123!');
  });

  const renderWithProviders = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <LanguageProvider>
          <AdminAuthProvider>
            <DepartmentAuthProvider>
              <Routes>
                <Route path="/admin/requests" element={<AdminRequestsPage />} />
                <Route path="/admin/access" element={<AdminAccessPage />} />
                <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
              </Routes>
            </DepartmentAuthProvider>
          </AdminAuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  it('1. Department Requests Page (Frame 35:1041) displays queue and approves access', async () => {
    // Seed a pending request
    await staffAuthService.requestDepartmentAccess({
      departmentId: 'kelectric',
      fullName: 'Tariq Mansoor',
      workEmail: 'tariq.mansoor@ke.com.pk',
      password: 'SecurePassword123!',
    });

    renderWithProviders('/admin/requests');

    // Verify Header and Monogram
    expect(screen.getByText('a.')).toBeInTheDocument();
    expect(screen.getAllByText(/MAIN ADMINISTRATOR/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Department requests/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Review the applicant and department before approving access/i)
    ).toBeInTheDocument();

    // Verify applicant in queue
    await waitFor(() => {
      expect(screen.getAllByText('Tariq Mansoor').length).toBeGreaterThan(0);
      expect(screen.getAllByText('tariq.mansoor@ke.com.pk').length).toBeGreaterThan(0);
    });

    // Verify detail panel fields
    expect(screen.getByRole('heading', { name: /Review request/i })).toBeInTheDocument();
    expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument();
    expect(
      screen.getByText(/Approval permits access only to complaints assigned to this department/i)
    ).toBeInTheDocument();

    // Click Approve access
    const approveBtn = screen.getByRole('button', { name: /Approve access/i });
    fireEvent.click(approveBtn);

    // Verify approval feedback
    await waitFor(() => {
      expect(screen.getByText(/Access approved for Tariq Mansoor/i)).toBeInTheDocument();
    });

    // Queue is now empty
    expect(screen.getByText(/All requests reviewed/i)).toBeInTheDocument();
  });

  it('2. Department Requests Page rejects access with explicit reason', async () => {
    // Seed a pending request
    await staffAuthService.requestDepartmentAccess({
      departmentId: 'kwsc',
      fullName: 'Invalid Candidate',
      workEmail: 'candidate@fake-mail.invalid',
      password: 'SamplePassword123!',
    });

    renderWithProviders('/admin/requests');

    await waitFor(() => {
      expect(screen.getAllByText('Invalid Candidate').length).toBeGreaterThan(0);
    });

    // Click Reject request to open modal
    const rejectBtn = screen.getByRole('button', { name: /Reject request/i });
    fireEvent.click(rejectBtn);

    // Modal appears
    expect(screen.getByRole('heading', { name: /Reject access request\?/i })).toBeInTheDocument();

    // Fill in reason
    const reasonInput = screen.getByLabelText(/Reason for rejection/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Work email domain not recognized' },
    });

    // Confirm rejection
    const confirmBtn = screen.getByRole('button', { name: /Confirm rejection/i });
    fireEvent.click(confirmBtn);

    // Feedback appears
    await waitFor(() => {
      expect(
        screen.getByText(/Access request rejected for Invalid Candidate/i)
      ).toBeInTheDocument();
    });
  });

  it('3. Departments & Access Page (Frame 35:1105 & 35:1154) lists staff and revokes access', async () => {
    // Seed and approve an employee
    const req = await staffAuthService.requestDepartmentAccess({
      departmentId: 'sswmb',
      fullName: 'Kamran Akram',
      workEmail: 'kamran.akram@sswmb.gos.pk',
      password: 'CleanKarachi123!',
    });
    await staffAuthService.approveDepartmentRequest(req.requestId!);

    renderWithProviders('/admin/access');

    // Verify Header and Page Title
    expect(
      screen.getByRole('heading', { name: /Departments & access/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Review approved department access and revoke it when required/i)
    ).toBeInTheDocument();

    // Verify Scope panel (Frame 35:1161)
    expect(screen.getByRole('heading', { name: /Department access scope/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Authorized assigned complaints only\. Citizen names, phone numbers/i)
    ).toBeInTheDocument();

    // Verify approved staff row
    await waitFor(() => {
      expect(screen.getAllByText('kamran.akram@sswmb.gos.pk').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Kamran Akram').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Assigned complaints only/i).length).toBeGreaterThan(0);
    });

    // Click Revoke access -> opens modal (Frame 35:1154)
    const revokeBtn = screen.getByRole('button', { name: /Revoke access →/i });
    fireEvent.click(revokeBtn);

    expect(
      screen.getByRole('heading', { name: /Revoke department access\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Revoking removes this user's ability to view or act on complaints immediately/i)
    ).toBeInTheDocument();

    // Fill optional reason
    const reasonInput = screen.getByLabelText(/Reason for revocation/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Staff transferred out of waste management division' },
    });

    // Confirm revocation
    const confirmRevokeBtn = screen.getByRole('button', { name: /Confirm revoke/i });
    fireEvent.click(confirmRevokeBtn);

    // Verify revocation success feedback
    await waitFor(() => {
      expect(
        screen.getByText(/Department access for kamran\.akram@sswmb\.gos\.pk was immediately revoked/i)
      ).toBeInTheDocument();
    });

    // Active directory is now empty
    expect(screen.getByText(/No active memberships found/i)).toBeInTheDocument();
  });
});
