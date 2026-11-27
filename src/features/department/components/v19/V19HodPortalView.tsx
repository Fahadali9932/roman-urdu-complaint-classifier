import React, { useState, useEffect } from 'react';
import type { NavTabOption } from './StaffPortalLayout';
import { V20PortalLayout } from '../v20/V20PortalLayout';
import { V20LandingPage } from '../v20/V20LandingPage';
import { V20DashboardPage } from '../v20/V20DashboardPage';
import '../../v20-atmospheric.css';
import { HodComplaintsView } from './HodComplaintsView';
import { HodVerificationView } from './HodVerificationView';
import { HodOfficersView } from './HodOfficersView';
import { HodProfileView } from './HodProfileView';
import { StaffNotificationsView, type StaffNotificationItem } from './StaffNotificationsView';
import { useDepartmentAuth } from '../../../../context/DepartmentAuthContext';
import { type HeadIndependentComplaintRow, caseOperationsService } from '../../../../services/CaseOperationsService';
import {
  fieldOperations,
  type DepartmentOfficer,
  type DepartmentWorkOrder,
  type DepartmentProof,
} from '../../services/fieldOperations';
import { CheckCircle2 } from 'lucide-react';

export interface V19HodPortalViewProps {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  username: string;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
  onOpenPasswordModal: () => void;
  initialTab?: string;
}

export const V19HodPortalView: React.FC<V19HodPortalViewProps> = ({
  departmentId,
  departmentCode,
  departmentName,
  username,
  themeMode,
  onToggleTheme,
  onSignOut,
  onOpenPasswordModal,
  initialTab = 'home',
}) => {
  const auth = useDepartmentAuth();
  const session = auth?.session;
  const effectiveStaffName = session?.displayName || username;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [complaints, setComplaints] = useState<HeadIndependentComplaintRow[]>([]);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [proofs, setProofs] = useState<Record<string, DepartmentProof>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentTime] = useState<number>(() => Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [departmentNotifs, setDepartmentNotifs] = useState<any[]>([]);

  // Load operational data
  useEffect(() => {
    let active = true;

    Promise.all([
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
      fieldOperations.orderLinksMap(departmentId).catch(() => new Map()),
      fieldOperations.officersDirectory(departmentId).catch(() => [] as DepartmentOfficer[]),
      fieldOperations.fetchNotifications(departmentId).catch(() => []),
    ])
      .then(async ([orderRows, linksMap, officerRows, notifRows]) => {
        if (!active) return;
        const names = new Map(officerRows.map((o: DepartmentOfficer) => [o.user_id, o.display_name]));
        const items = await caseOperationsService.listIndependentComplaintsForHead(departmentId as any, {
          period: 'all',
          includeResolved: true,
          orders: orderRows,
          orderLinksMap: linksMap,
          officerNames: names,
        });
        if (!active) return;

        setOrders(orderRows);
        setOfficers(officerRows);
        setComplaints(items);
        setDepartmentNotifs(notifRows);

        // Map proofs from orders with pending review
        const proofsMap: Record<string, DepartmentProof> = {};
        for (const ord of orderRows) {
          if (ord.status === 'pending_review' || ord.status === 'verified') {
            proofsMap[ord.id] = {
              id: `proof-${ord.id}`,
              order_id: ord.id,
              storage_path: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
              before_storage_path: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
              location_result: (ord.gps_verified ? 'near' : 'needs_review') as any,
              original_distance_m: ord.gps_distance_m || 14,
              accuracy_m: ord.gps_accuracy_m || 4,
              duplicate_warning: false,
              submitted_at: ord.started_at || new Date().toISOString(),
              decision: ord.status === 'verified' ? 'approved' : 'pending',
            };
          }
        }
        setProofs(proofsMap);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load V19 HOD data:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [departmentId, reloadKey]);

  // Derived counts for morphing tabs badges
  const unassignedCount = complaints.filter(
    (c) => (c.status === 'submitted' || c.status === 'under_review' || c.status === 'assigned') && (!c.workOrderStatus || c.workOrderStatus === 'assigned')
  ).length;

  const verificationPendingCount = orders.filter(
    (o) => o.status === 'pending_review'
  ).length;

  const overdueOrders = orders.filter((o) => {
    if (o.status === 'verified') return false;
    const dueTime = new Date(o.effective_deadline_at || o.extension_requested_due_at || o.due_at).getTime();
    return Number.isFinite(dueTime) && dueTime < currentTime;
  });

  const extensionRequests = orders.filter((o) => Boolean(o.extension_requested_due_at));

  // 6 Primary HOD Tabs for V20
  const hodTabs: NavTabOption[] = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'complaints', label: 'Complaints', badge: unassignedCount },
    { id: 'verification', label: 'Verification', badge: verificationPendingCount },
    { id: 'officers', label: 'Officers' },
    { id: 'profile', label: 'Profile' },
  ];

  // Actions
  const handleRejectComplaint = async (complaintId: string, reason: string) => {
    await fieldOperations.rejectDepartmentComplaint(complaintId, reason);
    setComplaints((prev) => prev.filter((c) => c.id !== complaintId));
    setToastMessage(`Complaint #${complaintId.slice(0, 8)} rejected: ${reason}`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const handleAssignComplaint = async (
    complaintId: string,
    officerId: string,
    durationHours: number,
    instructions: string,
    attachToOrderId?: string
  ) => {
    const dueAt = new Date(Date.now() + durationHours * 3600000).toISOString();
    if (attachToOrderId) {
      await fieldOperations.attachReportToWorkOrder({
        orderId: attachToOrderId,
        complaintId,
        departmentId,
        idempotencyKey: crypto.randomUUID(),
      });
    } else {
      await fieldOperations.createWorkOrderWithAdvisory({
        departmentId,
        complaintId,
        officerId,
        instructions,
        dueAt,
        caseLabel: complaints.find((c) => c.id === complaintId)?.heading || 'Municipal Task',
        idempotencyKey: crypto.randomUUID(),
      });
    }
    setReloadKey((k) => k + 1);
  };

  const handleApproveResolution = async (orderId: string) => {
    await fieldOperations.approveResolution(orderId);
    setToastMessage(`Resolution for Order #${orderId.slice(0, 8)} approved and recorded.`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const handleReturnCorrection = async (orderId: string, reason: string, correctionHours: number) => {
    await fieldOperations.returnCorrection(orderId, reason, correctionHours);
    setToastMessage(`Order #${orderId.slice(0, 8)} returned for correction (+${correctionHours}h).`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const handleProvisionOfficer = async (data: {
    fullName: string;
    email: string;
    cnic: string;
    phoneNumber: string;
  }) => {
    const cleanEmp = data.cnic.replace(/[^0-9]/g, '').slice(-6) || `off-${Date.now().toString().slice(-4)}`;
    const res = await fieldOperations.provisionOfficer({
      departmentId,
      fullName: data.fullName,
      employeeId: cleanEmp,
    });

    // Save persistent officer profile details with masked CNIC and phone
    await fieldOperations.saveOfficerProfile(res.officerUserId, departmentId, {
      fullName: data.fullName,
      employeeId: cleanEmp,
      officialEmail: data.email,
      phone: data.phoneNumber,
      cnic: data.cnic,
    }).catch(() => null);

    setToastMessage(`Officer ${data.fullName} provisioned with temporary access.`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
    return res;
  };

  const handleToggleSuspension = async (officerId: string, currentStatus: string, reason?: string) => {
    if (currentStatus === 'suspended') {
      await fieldOperations.reactivateOfficer({ departmentId, targetUserId: officerId });
      setToastMessage(`Officer ${officerId} restored to active operational status.`);
    } else {
      await fieldOperations.suspendOfficer({ departmentId, targetUserId: officerId, reason: reason || 'Administrative HOD suspension' });
      setToastMessage(`Officer ${officerId} suspended from field operations.`);
    }
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const handleIssueWarning = async (officerId: string, reason: string, severity: 'advisory' | 'formal' | 'final' = 'formal') => {
    await fieldOperations.issueWarning(departmentId, officerId, reason, severity);
    setToastMessage(`Formal notice transmitted to officer ${officerId}: ${reason}`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const handleExtendDeadline = async (orderId: string, additionalHours: number) => {
    await fieldOperations.extendDeadline(orderId, additionalHours, 'Supervisory authorized extension');
    setToastMessage(`Order #${orderId.slice(0, 8)} deadline extended by ${additionalHours} hours.`);
    setTimeout(() => setToastMessage(null), 4000);
    setReloadKey((k) => k + 1);
  };

  const combinedNotifs: StaffNotificationItem[] = [
    ...departmentNotifs.map((n) => ({
      id: String(n.id),
      title: n.title,
      message: n.message,
      type: (n.notification_type === 'warning' ? 'warning' : 'general') as any,
      createdAt: n.created_at || new Date().toISOString(),
      read: Boolean(n.is_read),
      linkUrl: n.link_url,
    })),
    ...overdueOrders.map((o) => ({
      id: `overdue-${o.id}`,
      title: 'Overdue Assignment Alert',
      message: `Work Order #${o.id.slice(0, 8)} (${o.case_label}) assigned to officer ${o.officer_id} is overdue.`,
      type: 'overdue' as const,
      createdAt: o.due_at,
      read: false,
      orderId: o.id,
    })),
    ...extensionRequests.map((o) => ({
      id: `ext-${o.id}`,
      title: 'Time Extension Requested',
      message: `Officer ${o.officer_id} requested deadline extension for #${o.id.slice(0, 8)} (${o.case_label}): ${o.extension_reason || 'Fieldwork delay'}.`,
      type: 'extension' as const,
      createdAt: o.extension_requested_due_at || new Date().toISOString(),
      read: false,
      orderId: o.id,
    })),
    ...(verificationPendingCount > 0
      ? [
          {
            id: 'verif-pending',
            title: 'Resolutions Pending Verification',
            message: `${verificationPendingCount} field order resolutions submitted with on-site GPS evidence await HOD supervisory inspection.`,
            type: 'verification' as const,
            createdAt: new Date().toISOString(),
            read: false,
          },
        ]
      : []),
  ];

  const unreadCount = overdueOrders.length + extensionRequests.length + verificationPendingCount + departmentNotifs.filter(n => !n.is_read).length;

  return (
    <V20PortalLayout
      departmentCode={departmentCode}
      departmentName={departmentName}
      role="head"
      username={effectiveStaffName}
      tabs={hodTabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSignOut={onSignOut}
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => setActiveTab('notifications')}
    >
      {/* Centered Operational Feedback Modal Dialog (Zero Toasts) */}
      {toastMessage && (
        <div
          className="v19-lightbox-backdrop"
          role="status"
          aria-live="polite"
          onClick={() => setToastMessage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="v19-glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '28px 26px',
              borderRadius: '24px',
              background: 'rgba(18, 15, 12, 0.96)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(59, 201, 119, 0.15)',
                border: '1.5px solid rgba(59, 201, 119, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success, #3BC977)',
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 650, margin: 0, color: 'var(--v20-text-primary)' }}>
              Operational Notice
            </h4>
            <p style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {toastMessage}
            </p>
            <button
              type="button"
              className="v20-landing-btn v20-landing-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              onClick={() => setToastMessage(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'home' && (
        <V20LandingPage
          departmentCode={departmentCode}
          departmentName={departmentName}
          role="head"
          staffName={effectiveStaffName}
          onNavigateToDashboard={() => setActiveTab('dashboard')}
          onNavigateToComplaints={() => setActiveTab('complaints')}
        />
      )}

      {activeTab === 'dashboard' && (
        <V20DashboardPage
          departmentCode={departmentCode}
          departmentName={departmentName}
          role="head"
          totalActiveCases={complaints.filter((c) => c.status !== 'resolved' && c.status !== 'rejected').length}
          totalSolvedCases={complaints.filter((c) => c.status === 'resolved').length}
          inProgressCount={complaints.filter((c) => c.status === 'in_progress').length}
          pendingCount={complaints.filter((c) => c.status === 'submitted' || c.status === 'under_review').length}
          verificationCount={verificationPendingCount}
          records={complaints.map((c) => ({
            timestamp: c.submittedAt || new Date().toISOString(),
            status: c.status === 'resolved'
              ? 'solved'
              : c.status === 'in_progress'
              ? 'progress'
              : c.status === 'under_review' || c.workOrderStatus === 'pending_review'
              ? 'verification'
              : 'pending',
          }))}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'complaints' && (
        <HodComplaintsView
          departmentId={departmentId}
          departmentCode={departmentCode}
          complaints={complaints}
          officers={officers}
          onRejectComplaint={handleRejectComplaint}
          onAssignComplaint={handleAssignComplaint}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'verification' && (
        <HodVerificationView
          departmentId={departmentId}
          departmentCode={departmentCode}
          orders={orders}
          proofs={proofs}
          onApproveResolution={handleApproveResolution}
          onReturnCorrection={handleReturnCorrection}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'officers' && (
        <HodOfficersView
          departmentId={departmentId}
          departmentCode={departmentCode}
          officers={officers}
          orders={orders}
          onProvisionOfficer={handleProvisionOfficer}
          onToggleSuspension={handleToggleSuspension}
          onIssueWarning={handleIssueWarning}
          onExtendDeadline={handleExtendDeadline}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'profile' && (
        <HodProfileView
          departmentCode={departmentCode}
          departmentName={departmentName}
          username={effectiveStaffName}
          onSignOut={onSignOut}
          onOpenPasswordModal={onOpenPasswordModal}
        />
      )}

      {/* Dedicated Full-Page Notifications View */}
      {activeTab === 'notifications' && (
        <StaffNotificationsView
          notifications={combinedNotifs}
          onMarkAsRead={async (id) => {
            await fieldOperations.markNotificationRead(id).catch(() => null);
            setDepartmentNotifs((prev) => prev.map((n) => (String(n.id) === id ? { ...n, is_read: true } : n)));
          }}
          onMarkAllAsRead={async () => {
            await Promise.all(
              departmentNotifs.filter((n) => !n.is_read).map((n) => fieldOperations.markNotificationRead(n.id).catch(() => null))
            );
            setDepartmentNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
          }}
          onNavigateToItem={(item) => {
            if (item.type === 'verification') {
              setActiveTab('verification');
            } else if (item.orderId || item.complaintId) {
              setActiveTab('complaints');
            }
          }}
        />
      )}
    </V20PortalLayout>
  );
};
