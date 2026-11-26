import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DepartmentAuthProvider } from '../context/DepartmentAuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { DepartmentDashboardPage } from '../features/department/DepartmentDashboardPage';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import { complaintService as mockService } from '../services/MockComplaintService';

const SESSION_STORAGE_KEY = 'awaaz_department_auth_session_v1';

describe('AWAAZ-E-AWAM — Staff Classification Review Queue & Routing', () => {
  beforeEach(() => {
    localSupabaseAdapter.resetToDefault();
    mockService.clearComplaints();
    sessionStorage.clear();
  });

  it('renders the Review Queue sub-item in sidebar with accurate count', async () => {
    // Seed an under_review complaint in mock service
    const sub = await mockService.submitComplaint({
      citizenName: 'Farhan Zaidi',
      citizenPhone: '03001234567',
      citizenEmail: 'farhan@example.com',
      residentialAddress: 'House 12, Block 4, Clifton',
      district: 'South',
      locality: 'Clifton',
      publicLocation: 'Near Boat Basin',
      incidentLatitude: 24.8138,
      incidentLongitude: 67.0299,
      title: 'Ambiguous issue',
      description: 'Masla hai pareshani hai help chahiye jaldi',
      isDemonstration: false,
    });

    const all = await mockService.getComplaints();
    const target = all.find((c) => c.referenceNumber === sub.referenceNumber);
    if (target) {
      target.status = 'under_review';
      target.assignedDepartmentId = undefined;
      target.assignedDepartmentIds = [];
    }

    // Sign in as roads-01
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        userId: 'staff-roads-01',
        username: 'roads-01',
        departmentId: 'kmc',
        departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
        departmentCode: 'KMC',
        authenticatedAt: new Date().toISOString(),
      })
    );

    render(
      <BrowserRouter>
        <LanguageProvider>
          <DepartmentAuthProvider>
            <DepartmentDashboardPage />
          </DepartmentAuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    );

    // Open workspace menu and verify Review Queue navigation item appears with role isolation
    const menuBtn = await screen.findByRole('button', { name: /Open workspace menu/i });
    fireEvent.click(menuBtn);
    await waitFor(() => {
      expect(screen.getByText(/Review queue/i)).toBeInTheDocument();
    });
  });

  it('keeps unassigned review cases out of the KMC dashboard and denies assignment', async () => {
    // Seed an under_review complaint
    const submission = await mockService.submitComplaint({
      citizenName: 'Tariq Mehmood',
      citizenPhone: '03009876543',
      citizenEmail: 'tariq@example.com',
      residentialAddress: 'House 99, Gulshan',
      district: 'East',
      locality: 'Gulshan-e-Iqbal',
      publicLocation: 'Near Disco Bakery',
      incidentLatitude: 24.9182,
      incidentLongitude: 67.0971,
      title: 'Road repair query',
      description: 'Sadak par gaddha hai repair kar dein',
      isDemonstration: false,
    });

    // Manually force to under_review for test
    const all = await mockService.getComplaints();
    const target = all.find((c) => c.referenceNumber === submission.referenceNumber);
    if (target) {
      target.status = 'under_review';
      target.assignedDepartmentId = undefined;
      target.assignedDepartmentIds = [];
    }

    // Sign in as roads-01
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        userId: 'staff-roads-01',
        username: 'roads-01',
        departmentId: 'kmc',
        departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
        departmentCode: 'KMC',
        authenticatedAt: new Date().toISOString(),
      })
    );

    render(
      <BrowserRouter>
        <LanguageProvider>
          <DepartmentAuthProvider>
            <DepartmentDashboardPage />
          </DepartmentAuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    );

    // Open workspace menu and switch to Review Queue
    const menuBtn = await screen.findByRole('button', { name: /Open workspace menu/i });
    fireEvent.click(menuBtn);
    await waitFor(() => {
      const reviewQueueBtn = screen.getByText(/Review queue/i);
      fireEvent.click(reviewQueueBtn);
    });

    expect(await mockService.getReviewQueueComplaints()).toEqual([]);
    expect(await mockService.getDepartmentComplaintByReference('kmc', submission.referenceNumber)).toBeNull();
    expect((await mockService.reviewAndAssignComplaint(submission.referenceNumber, 'kmc')).success).toBe(false);
    expect(screen.queryByText(submission.referenceNumber)).toBeNull();
    expect(screen.queryByRole('button', { name: /Assign Department/i })).toBeNull();
  });

  it('verifies LocalSupabaseAdapter staffReviewAndAssignComplaint RPC behavior', () => {
    // Create an under_review complaint in adapter state
    const compRes = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-TEST9999',
        citizen_id: 'c1',
        title: 'Low confidence issue',
        description: 'Kuch samajh nahi aa raha help',
        incident_district: 'South',
        incident_locality: 'Saddar',
        incident_public_location: 'Empress Market',
        assigned_department_id: '',
        status: 'under_review',
        predicted_department_id: 'kelectric',
        prediction_confidence: 0.32,
        is_demonstration: false,
      },
      'c1'
    );

    expect(compRes.success).toBe(true);
    const complaintId = compRes.complaint!.id;

    // Attempt assignment by non-staff (fails)
    const unauthorized = localSupabaseAdapter.staffReviewAndAssignComplaint(
      complaintId,
      'kmc',
      'Assigned to KMC',
      'unauthorized-random-user-id'
    );
    expect(unauthorized.success).toBe(false);
    expect(unauthorized.error).toContain('Unauthorized');

    // Ensure demonstration account exists in local adapter
    localSupabaseAdapter.ensureDemonstrationAccount('roads-01');
    const staffMember = localSupabaseAdapter
      .getAllMemberships()
      .find((m) => m.profile.email.toLowerCase().includes('+roads@'));
    expect(staffMember).toBeDefined();
    const staffUserId = staffMember!.user_id;

    expect(localSupabaseAdapter.selectComplaints(staffUserId).some((row) => row.id === complaintId)).toBe(false);
    expect(localSupabaseAdapter.selectReviewQueueComplaints(staffUserId)).toEqual([]);
    expect(localSupabaseAdapter.staffReviewAndAssignComplaint(complaintId, 'kmc', '', staffUserId).success).toBe(false);
    const admin = localSupabaseAdapter.getState().profiles.find((profile) => profile.role === 'main_admin')!;
    const successRes = localSupabaseAdapter.staffReviewAndAssignComplaint(
      complaintId,
      'kmc',
      'Confirmed road damage jurisdiction',
      admin.id
    );
    expect(successRes.success).toBe(true);

    // Verify complaint is now assigned to kmc
    const updated = localSupabaseAdapter.getState().complaints.find((c) => c.id === complaintId);
    expect(updated?.status).toBe('assigned');
    expect(updated?.assigned_department_id).toBe('kmc');
    expect(updated?.is_reviewed_by_admin).toBe(true);

    // Verify timeline milestone
    const timeline = localSupabaseAdapter.getState().timelineEvents.filter((e) => e.complaint_id === complaintId);
    const lastEvent = timeline[timeline.length - 1];
    expect(lastEvent.status).toBe('assigned');
    expect(lastEvent.actor_role).toBe('main_admin');
    expect(localSupabaseAdapter.selectComplaints(staffUserId).some((row) => row.id === complaintId)).toBe(true);
    expect(localSupabaseAdapter.adminReassignComplaint(complaintId, 'kwsc', 'Transfer', admin.id).success).toBe(true);
    expect(localSupabaseAdapter.selectComplaints(staffUserId).some((row) => row.id === complaintId)).toBe(false);
  });
});
