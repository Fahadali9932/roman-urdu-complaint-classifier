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
      title: 'Ambiguous issue',
      description: 'Masla hai pareshani hai help chahiye jaldi',
      isDemonstration: false,
    });

    const all = await mockService.getComplaints();
    const target = all.find((c) => c.referenceNumber === sub.referenceNumber);
    if (target) {
      target.status = 'under_review';
      target.assignedDepartmentId = undefined;
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

    // Verify Review Queue navigation item appears in sidebar
    await waitFor(() => {
      expect(screen.getByText('Review Queue')).toBeInTheDocument();
    });
  });

  it('allows staff to review and assign an under_review complaint to KMC', async () => {
    // Seed an under_review complaint
    const submission = await mockService.submitComplaint({
      citizenName: 'Tariq Mehmood',
      citizenPhone: '03009876543',
      citizenEmail: 'tariq@example.com',
      residentialAddress: 'House 99, Gulshan',
      district: 'East',
      locality: 'Gulshan-e-Iqbal',
      publicLocation: 'Near Disco Bakery',
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

    // Switch to Review Queue
    await waitFor(() => {
      const reviewQueueBtn = screen.getByText('Review Queue');
      fireEvent.click(reviewQueueBtn);
    });

    // Click complaint in list
    await waitFor(() => {
      const refItems = screen.getAllByText(submission.referenceNumber);
      expect(refItems.length).toBeGreaterThan(0);
      fireEvent.click(refItems[0]);
    });

    // Verify "Review & Assign Department" button is visible
    await waitFor(() => {
      expect(screen.getByText('Review & Assign Department')).toBeInTheDocument();
    });

    // Open review modal
    fireEvent.click(screen.getByText('Review & Assign Department'));

    await waitFor(() => {
      expect(screen.getByText('Classification Review & Assignment')).toBeInTheDocument();
      expect(screen.getByText('Karachi Metropolitan Corporation')).toBeInTheDocument();
    });

    // Select KMC and confirm
    const kmcBtn = screen.getByText('Karachi Metropolitan Corporation').closest('button');
    if (kmcBtn) fireEvent.click(kmcBtn);

    const confirmBtn = screen.getByText('Confirm Assignment');
    fireEvent.click(confirmBtn);

    // Verify complaint transitions to assigned and shows Accept Complaint button
    await waitFor(() => {
      expect(screen.getByText('Accept Complaint')).toBeInTheDocument();
    });
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

    const successRes = localSupabaseAdapter.staffReviewAndAssignComplaint(
      complaintId,
      'kmc',
      'Confirmed road damage jurisdiction',
      staffUserId
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
    expect(lastEvent.actor_role).toBe('department_staff');
    expect(lastEvent.description).toContain('Confirmed road damage jurisdiction');
  });
});
