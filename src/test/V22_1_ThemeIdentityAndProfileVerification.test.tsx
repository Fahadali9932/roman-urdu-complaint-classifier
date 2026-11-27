import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  canonicalizeDepartmentKey,
  getDepartmentAtmosphere,
  DEPARTMENT_ATMOSPHERES,
} from '../features/department/services/departmentThemes';
import { V20PortalLayout } from '../features/department/components/v20/V20PortalLayout';
import { V20DashboardPage } from '../features/department/components/v20/V20DashboardPage';
import { OfficerPerformanceView } from '../features/department/components/v19/OfficerPerformanceView';
import { HodOfficersView } from '../features/department/components/v19/HodOfficersView';
import { ImageLightbox } from '../features/department/components/v19/ImageLightbox';
import { validateProfilePhoto } from '../features/department/services/faceValidation';
import {
  fieldOperations,
  type DepartmentOfficer,
  type DepartmentWorkOrder,
  type OfficerWarning,
} from '../features/department/services/fieldOperations';

describe('AWAAZ-E-AWAM Phase V22.1 — Department Identity, Theme Architecture, Profile Verification & Privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* =========================================================================
     1. Department Atmospheric Palettes & Theme Canonicalization
     ========================================================================= */
  describe('1. Single-Hue Department Atmosphere & Canonicalization', () => {
    it('canonicalizes all departmental aliases correctly with safe neutral admin fallback', () => {
      // KMC (Burnt orange)
      expect(canonicalizeDepartmentKey('kmc')).toBe('kmc');
      expect(canonicalizeDepartmentKey('dept-kmc')).toBe('kmc');
      expect(canonicalizeDepartmentKey('roads')).toBe('kmc');
      expect(canonicalizeDepartmentKey('infrastructure')).toBe('kmc');

      // K-Electric (Electric cobalt blue)
      expect(canonicalizeDepartmentKey('kelectric')).toBe('kelectric');
      expect(canonicalizeDepartmentKey('ke')).toBe('kelectric');
      expect(canonicalizeDepartmentKey('electric')).toBe('kelectric');
      expect(canonicalizeDepartmentKey('electricity')).toBe('kelectric');

      // KW&SC (Ocean teal)
      expect(canonicalizeDepartmentKey('kwsc')).toBe('kwsc');
      expect(canonicalizeDepartmentKey('kwsb')).toBe('kwsc');
      expect(canonicalizeDepartmentKey('water')).toBe('kwsc');
      expect(canonicalizeDepartmentKey('sewerage')).toBe('kwsc');

      // SSWMB (Emerald green)
      expect(canonicalizeDepartmentKey('sswmb')).toBe('sswmb');
      expect(canonicalizeDepartmentKey('sanitation')).toBe('sswmb');
      expect(canonicalizeDepartmentKey('waste')).toBe('sswmb');

      // Gas (Crimson red)
      expect(canonicalizeDepartmentKey('gas')).toBe('gas');
      expect(canonicalizeDepartmentKey('ssgc')).toBe('gas');
      expect(canonicalizeDepartmentKey('sngpl')).toBe('gas');

      // SBCA (Royal violet)
      expect(canonicalizeDepartmentKey('sbca')).toBe('sbca');
      expect(canonicalizeDepartmentKey('building')).toBe('sbca');

      // Central Admin (Platinum slate)
      expect(canonicalizeDepartmentKey('admin')).toBe('admin');
      expect(canonicalizeDepartmentKey('central')).toBe('admin');

      // Unknown or null department falls back safely to neutral admin (NOT KMC orange!)
      expect(canonicalizeDepartmentKey(null)).toBe('admin');
      expect(canonicalizeDepartmentKey(undefined)).toBe('admin');
      expect(canonicalizeDepartmentKey('unknown_civic_dept')).toBe('admin');
    });

    it('enforces verified single-hue atmospheric color stops for all 7 departments', () => {
      // SSWMB: Emerald green stops (#0C1B14 -> #20643D -> #58C78C), zero orange/brown
      const sswmb = DEPARTMENT_ATMOSPHERES.sswmb;
      expect(sswmb.deep).toBe('#0C1B14');
      expect(sswmb.mid).toBe('#20643D');
      expect(sswmb.highlight).toBe('#58C78C');
      expect(sswmb.spotlightDark).toBe('rgba(88, 199, 140, 0.10)');

      // KMC: Burnt orange
      const kmc = DEPARTMENT_ATMOSPHERES.kmc;
      expect(kmc.deep).toBe('#1B120C');
      expect(kmc.mid).toBe('#79400F');
      expect(kmc.highlight).toBe('#E5A044');

      // K-Electric: Cobalt blue
      const ke = DEPARTMENT_ATMOSPHERES.kelectric;
      expect(ke.deep).toBe('#0C1220');
      expect(ke.mid).toBe('#193F91');
      expect(ke.highlight).toBe('#548EFF');

      // KW&SC: Ocean teal
      const kwsc = DEPARTMENT_ATMOSPHERES.kwsc;
      expect(kwsc.deep).toBe('#081B1E');
      expect(kwsc.mid).toBe('#11666E');
      expect(kwsc.highlight).toBe('#42C6C9');

      // Gas: Crimson red
      const gas = DEPARTMENT_ATMOSPHERES.gas;
      expect(gas.deep).toBe('#210D13');
      expect(gas.mid).toBe('#8C243D');
      expect(gas.highlight).toBe('#EC667B');

      // SBCA: Royal violet
      const sbca = DEPARTMENT_ATMOSPHERES.sbca;
      expect(sbca.deep).toBe('#170F24');
      expect(sbca.mid).toBe('#57328B');
      expect(sbca.highlight).toBe('#AA80E8');

      // Admin: Platinum slate
      const admin = DEPARTMENT_ATMOSPHERES.admin;
      expect(admin.deep).toBe('#101318');
      expect(admin.mid).toBe('#414B5A');
      expect(admin.highlight).toBe('#A4B2C5');
    });

    it('mounts V20PortalLayout with canonical department code in both dark and light modes', () => {
      const { container, rerender } = render(
        <V20PortalLayout
          departmentCode="sswmb"
          departmentName="Sindh Solid Waste Management Board"
          role="head"
          username="sswmb.director"
          themeMode="dark"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        >
          <div data-testid="child-content">Portal Content</div>
        </V20PortalLayout>
      );

      const portalRoot = screen.getByTestId('v20-portal-root');
      expect(portalRoot).toHaveAttribute('data-dept', 'sswmb');
      expect(portalRoot).toHaveAttribute('data-theme', 'dark');
      expect(portalRoot).not.toHaveClass('v20-light-mode');

      // Check spotlight element receives canonical department
      const spotlight = screen.getByTestId('v20-cursor-spotlight');
      expect(spotlight).toHaveAttribute('data-dept', 'sswmb');

      // Rerender with light mode
      rerender(
        <V20PortalLayout
          departmentCode="waste"
          departmentName="Sindh Solid Waste Management Board"
          role="head"
          username="sswmb.director"
          themeMode="light"
          onToggleTheme={vi.fn()}
          onSignOut={vi.fn()}
          activeTab="dashboard"
          onSelectTab={vi.fn()}
        >
          <div data-testid="child-content">Portal Content</div>
        </V20PortalLayout>
      );

      expect(portalRoot).toHaveClass('v20-light-mode');
      expect(portalRoot).toHaveAttribute('data-dept', 'sswmb'); // Normalized from 'waste'
      expect(portalRoot).toHaveAttribute('data-theme', 'light');
    });
  });

  /* =========================================================================
     2. Scorecard Microcopy & Data Integrity
     ========================================================================= */
  describe('2. Microcopy Clean-Up & Zero-Count Data Integrity', () => {
    it('renders clean human headings without robotic institutional jargon in V20DashboardPage', () => {
      render(
        <V20DashboardPage
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          periodSolvedCases={12}
          periodInProgress={5}
          periodPending={3}
          periodVerification={2}
          periodActiveCases={10}
        />
      );

      // Editorial heading is Dashboard
      expect(screen.getByRole('heading', { level: 2, name: /Dashboard/i })).toBeInTheDocument();
      // Case status description
      expect(screen.getByText(/Case status for selected/i)).toBeInTheDocument();
      // Sub-cohorts use clean human labels
      expect(screen.getAllByText(/^In progress$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Pending$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Awaiting verification$/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^Resolved$/i).length).toBeGreaterThanOrEqual(1);
    });

    it('computes 0% progress bar width when metric counts are zero (no hardcoded nonzero bars)', () => {
      const { container } = render(
        <V20DashboardPage
          departmentCode="kmc"
          departmentName="Karachi Municipal Corporation"
          role="head"
          periodSolvedCases={0}
          periodInProgress={0}
          periodPending={0}
          periodVerification={0}
          periodActiveCases={0}
        />
      );

      // Verify all 4 progress bar fills have 0% width
      const progressFills = container.querySelectorAll('.v20-glass-card div[style*="height: 100%"]');
      expect(progressFills.length).toBe(4);
      progressFills.forEach((fill) => {
        expect((fill as HTMLElement).style.width).toBe('0%');
      });
    });

    it('renders human microcopy in OfficerPerformanceView and displays Active standing', () => {
      const mockOfficer: DepartmentOfficer = {
        user_id: 'local-officer-a',
        display_name: 'Field Officer A',
        employee_id: 'kmc-off-01',
        department_id: 'kmc',
        verified_cases: 15,
        on_time_cases: 14,
        overdue_cases: 1,
        disputed_cases: 0,
        membership_status: 'active',
      };

      const mockWarnings: OfficerWarning[] = [];
      const mockOrders: DepartmentWorkOrder[] = [
        {
          id: 'test-order-01',
          department_id: 'kmc',
          case_label: 'Storm Drain Desilting',
          officer_id: 'local-officer-a',
          assigned_by: 'local-hod',
          status: 'verified',
          instructions: 'Clear blocked drain on Shahrah-e-Faisal.',
          assigned_at: new Date().toISOString(),
          due_at: new Date().toISOString(),
          original_due_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          extension_requested_due_at: null,
          extension_reason: null,
          reviewed_at: new Date().toISOString(),
          review_note: 'Verified with GPS.',
          citizen_dispute_pending: false,
        },
      ];

      render(
        <OfficerPerformanceView
          officer={mockOfficer}
          orders={mockOrders}
          departmentCode="KMC"
          departmentName="Karachi Municipal Corporation"
          warnings={mockWarnings}
        />
      );

      // Heading is Performance
      expect(screen.getByRole('heading', { level: 2, name: /Performance/i })).toBeInTheDocument();
      // Standing is Active (Good standing)
      expect(screen.getByText('Active (Good standing)')).toBeInTheDocument();
      // Warnings section header
      expect(screen.getByText(/Warnings \(0\)/i)).toBeInTheDocument();
      // Work history section header
      expect(screen.getByText(/Work history \(1\)/i)).toBeInTheDocument();
      // Real verified count with 30m GPS validation
      expect(screen.getByText(/1 verified with 30m GPS validation/i)).toBeInTheDocument();
    });
  });

  /* =========================================================================
     3. Local Face Quality Validation (HTML5 Canvas 2D)
     ========================================================================= */
  describe('3. Local Anthropometric Face & Image Quality Validation', () => {
    it('rejects files exceeding the 5MB size limit', async () => {
      // Create mock blob of 6MB
      const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/jpeg' });
      const res = await validateProfilePhoto(bigBlob);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('5 MB limit'))).toBe(true);
    });

    it('rejects unsupported file formats', async () => {
      const gifBlob = new Blob(['mock-gif-data'], { type: 'image/gif' });
      const res = await validateProfilePhoto(gifBlob);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Unsupported format'))).toBe(true);
    });
  });

  /* =========================================================================
     4. Authorized Profile Approval Workflow & Department Isolation
     ========================================================================= */
  describe('4. Authorized Profile Approval & Department Isolation', () => {
    it('submits profile photo and transitions status to awaiting_approval', async () => {
      const res = await fieldOperations.submitStaffProfilePhoto(
        'officer-test-99',
        'kmc',
        'data:image/jpeg;base64,mockBase64PhotoData'
      );
      expect(res.success).toBe(true);
      expect(res.status).toBe('awaiting_approval');

      const profile = await fieldOperations.fetchOfficerProfile('officer-test-99');
      expect(profile).not.toBeNull();
      expect(profile?.approval_status).toBe('awaiting_approval');
      expect(profile?.profile_photo_storage_path).toBe('data:image/jpeg;base64,mockBase64PhotoData');
    });

    it('enforces department isolation during profile review', async () => {
      // Set up pending profile in KW&SC
      await fieldOperations.submitStaffProfilePhoto(
        'officer-kwsc-01',
        'kwsc',
        'data:image/jpeg;base64,kwscPhoto'
      );

      // Attempt review by a KMC HOD (cross-department breach)
      await expect(
        fieldOperations.reviewStaffProfilePhoto({
          reviewerId: 'hod-kmc-user',
          reviewerRole: 'head',
          reviewerDepartment: 'kmc', // Different department!
          targetUserId: 'officer-kwsc-01',
          decision: 'approve',
        })
      ).rejects.toThrow(/Department isolation breach/i);
    });

    it('prohibits self-approval when reviewer is the target user', async () => {
      await fieldOperations.submitStaffProfilePhoto(
        'officer-self-test',
        'kmc',
        'data:image/jpeg;base64,selfPhoto'
      );

      await expect(
        fieldOperations.reviewStaffProfilePhoto({
          reviewerId: 'officer-self-test', // Same user!
          reviewerRole: 'officer',
          reviewerDepartment: 'kmc',
          targetUserId: 'officer-self-test',
          decision: 'approve',
        })
      ).rejects.toThrow(/Self-approval prohibited/i);
    });

    it('requires mandatory reason when requesting a photo retake', async () => {
      await fieldOperations.submitStaffProfilePhoto(
        'officer-retake-test',
        'kmc',
        'data:image/jpeg;base64,blurryPhoto'
      );

      // Attempt retake with empty reason
      await expect(
        fieldOperations.reviewStaffProfilePhoto({
          reviewerId: 'local-hod',
          reviewerRole: 'head',
          reviewerDepartment: 'kmc',
          targetUserId: 'officer-retake-test',
          decision: 'retake',
          reason: '   ', // Empty
        })
      ).rejects.toThrow(/justification reason is mandatory/i);

      // Retake with valid reason succeeds
      const retakeRes = await fieldOperations.reviewStaffProfilePhoto({
        reviewerId: 'local-hod',
        reviewerRole: 'head',
        reviewerDepartment: 'kmc',
        targetUserId: 'officer-retake-test',
        decision: 'retake',
        reason: 'Photograph is blurry and lighting is insufficient.',
      });

      expect(retakeRes.success).toBe(true);
      expect(retakeRes.newStatus).toBe('retake_required');

      const profile = await fieldOperations.fetchOfficerProfile('officer-retake-test');
      expect(profile?.approval_status).toBe('retake_required');
      expect(profile?.rejection_reason).toBe('Photograph is blurry and lighting is insufficient.');
    });

    it('renders Profile Approvals tab in HodOfficersView with review cards and actions', async () => {
      // Ensure pending profile exists in KMC
      await fieldOperations.submitStaffProfilePhoto(
        'officer-pending-hod-view',
        'kmc',
        'data:image/jpeg;base64,pendingPhotoData'
      );

      render(
        <HodOfficersView
          departmentCode="kmc"
          officers={[]}
          orders={[]}
          onProvisionOfficer={vi.fn()}
          onToggleSuspension={vi.fn()}
          onIssueWarning={vi.fn()}
        />
      );

      // Verify sub-tab pills exist
      const directoryBtn = screen.getByTestId('hod-officers-subtab-directory');
      const approvalsBtn = screen.getByTestId('hod-officers-subtab-approvals');
      expect(directoryBtn).toBeInTheDocument();
      expect(approvalsBtn).toBeInTheDocument();

      // Click Approvals sub-tab
      fireEvent.click(approvalsBtn);

      // Wait for approval card to render
      await waitFor(() => {
        expect(screen.getByTestId('hod-profile-approvals-view')).toBeInTheDocument();
      });

      // Verify action buttons exist for pending profile
      expect(screen.getByTestId('approve-photo-officer-pending-hod-view')).toBeInTheDocument();
      expect(screen.getByTestId('retake-photo-officer-pending-hod-view')).toBeInTheDocument();

      // Click Approve
      fireEvent.click(screen.getByTestId('approve-photo-officer-pending-hod-view'));

      await waitFor(async () => {
        const approvedProfile = await fieldOperations.fetchOfficerProfile('officer-pending-hod-view');
        expect(approvedProfile?.approval_status).toBe('approved');
      });
    });
  });

  /* =========================================================================
     5. Screenshot Deterrence & Privacy Shield
     ========================================================================= */
  describe('5. Screenshot Deterrence, Watermark & Privacy Shield', () => {
    it('renders restrained official watermark stamp on confidential evidence', () => {
      render(
        <ImageLightbox
          imageUrl="blob:test-evidence-preview"
          caption="Completed asphalt repair"
          onClose={vi.fn()}
          watermarkText="OFFICER-007 · KMC"
        />
      );

      // Official Use Only watermark stamp is rendered
      expect(screen.getByText(/OFFICIAL USE ONLY/i)).toBeInTheDocument();
      expect(screen.getByText(/CONFIDENTIAL · SENSITIVE EVIDENCE/i)).toBeInTheDocument();
      expect(screen.getByText(/OFFICER-007 · KMC/i)).toBeInTheDocument();

      // Trigger window blur (simulating window minimize or tab switch)
      fireEvent.blur(window);

      // Privacy shield is active
      expect(screen.getByText(/Sensitive Evidence Concealed/i)).toBeInTheDocument();
      expect(screen.getByText(/Application is out of focus/i)).toBeInTheDocument();

      // Trigger window focus (user returns to window)
      fireEvent.focus(window);
      expect(screen.queryByText(/Sensitive Evidence Concealed/i)).not.toBeInTheDocument();
    });
  });
});
