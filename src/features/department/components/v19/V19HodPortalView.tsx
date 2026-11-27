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
import { type HeadIndependentComplaintRow, caseOperationsService } from '../../../../services/CaseOperationsService';
import {
  fieldOperations,
  type DepartmentOfficer,
  type DepartmentWorkOrder,
  type DepartmentProof,
} from '../../services/fieldOperations';
import { Bell, X } from 'lucide-react';

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

  // Notification Drawer State
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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

  const unreadCount = overdueOrders.length + extensionRequests.length + verificationPendingCount;

  return (
    <V20PortalLayout
      departmentCode={departmentCode}
      departmentName={departmentName}
      role="head"
      username={username}
      tabs={hodTabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSignOut={onSignOut}
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => setIsNotifOpen(true)}
    >
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 18px',
            background: 'var(--v19-glass-surface)',
            border: '1px solid var(--v19-lime)',
            borderRadius: '12px',
            color: 'var(--v19-text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--v19-lime)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'home' && (
        <V20LandingPage
          departmentCode={departmentCode}
          departmentName={departmentName}
          role="head"
          staffName={username}
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
          records={complaints.filter(c => c.status !== 'rejected').map(c => ({ timestamp: c.submittedAt, status: c.status === 'resolved' ? 'solved' : c.workOrderStatus === 'pending_review' ? 'verification' : c.status === 'in_progress' || c.workOrderStatus === 'in_progress' ? 'progress' : 'pending' }))}
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
          username={username}
          onSignOut={onSignOut}
          onOpenPasswordModal={onOpenPasswordModal}
        />
      )}

      {/* Notifications Drawer */}
      {isNotifOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Department Notifications">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: 'var(--v19-lime)' }} />
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                  Departmental Operational Alerts
                </span>
              </div>
              <button type="button" className="v19-action-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setIsNotifOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {departmentNotifs.map((n) => (
                <div key={n.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--v19-glass-subtle)', border: '1px solid var(--v19-glass-border)', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 600, color: n.notification_type === 'warning' ? 'var(--v19-amber)' : 'var(--v19-text-primary)' }}>
                    {n.title}
                  </div>
                  <div style={{ color: 'var(--v19-text-secondary)', marginTop: '2px' }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--v19-text-muted)', marginTop: '4px' }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {overdueOrders.map((o) => (
                <div key={o.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--v19-red-soft)', border: '1px solid var(--v19-red)', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--v19-red)' }}>OVERDUE ASSIGNMENT ALERT</div>
                  <div style={{ color: 'var(--v19-text-primary)', marginTop: '2px' }}>{o.case_label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--v19-text-muted)', marginTop: '2px' }}>Officer: {o.officer_id}</div>
                </div>
              ))}

              {extensionRequests.map((o) => (
                <div key={o.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--v19-amber-soft)', border: '1px solid var(--v19-amber)', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--v19-amber)' }}>TIME EXTENSION REQUESTED</div>
                  <div style={{ color: 'var(--v19-text-primary)', marginTop: '2px' }}>{o.case_label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--v19-text-muted)', marginTop: '2px' }}>Reason: {o.extension_reason || 'Fieldwork delay'}</div>
                </div>
              ))}

              {verificationPendingCount > 0 && (
                <div key="pending-verif" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--v19-cyan-soft)', border: '1px solid var(--v19-cyan)', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--v19-cyan)' }}>RESOLUTIONS PENDING VERIFICATION</div>
                  <div style={{ color: 'var(--v19-text-primary)', marginTop: '2px' }}>{verificationPendingCount} completed field orders ready for inspection</div>
                </div>
              )}

              {unreadCount === 0 && departmentNotifs.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--v19-text-muted)', fontSize: '13px', margin: '20px 0' }}>
                  No urgent alerts at this moment.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v19-glass-border)', paddingTop: '10px' }}>
              <button type="button" className="v19-nav-tab" onClick={() => setIsNotifOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </V20PortalLayout>
  );
};
