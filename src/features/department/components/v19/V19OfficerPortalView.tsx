import React, { useState, useEffect, useMemo } from 'react';
import type { NavTabOption } from './StaffPortalLayout';
import { V20PortalLayout } from '../v20/V20PortalLayout';
import { V20LandingPage } from '../v20/V20LandingPage';
import { V20DashboardPage } from '../v20/V20DashboardPage';
import '../../v20-atmospheric.css';
import { OfficerComplaintsView } from './OfficerComplaintsView';
import { OfficerWorkView } from './OfficerWorkView';
import { OfficerPerformanceView } from './OfficerPerformanceView';
import { OfficerNotificationsView, type OfficerNotificationItem } from './OfficerNotificationsView';
import { OfficerProfileView } from './OfficerProfileView';
import { OfficerMobileGate } from './OfficerMobileGate';
import { useDepartmentAuth } from '../../../../context/DepartmentAuthContext';
import { useDeviceSupport, DesktopRequiredScreen } from '../../device';
import { Sun, Moon, LogOut } from 'lucide-react';
import {
  fieldOperations,
  type DepartmentWorkOrder,
  type DepartmentOfficer,
} from '../../services/fieldOperations';
import { type HeadIndependentComplaintRow, caseOperationsService } from '../../../../services/CaseOperationsService';

export interface V19OfficerPortalViewProps {
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

export const V19OfficerPortalView: React.FC<V19OfficerPortalViewProps> = ({
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
  const deviceSupport = useDeviceSupport();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && initialTab === 'home') {
      return 'work';
    }
    return initialTab;
  });
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [complaints, setComplaints] = useState<HeadIndependentComplaintRow[]>([]);
  const [officerProfile, setOfficerProfile] = useState<DepartmentOfficer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Notifications State
  const [notifications, setNotifications] = useState<OfficerNotificationItem[]>([]);

  // Load operational data
  useEffect(() => {
    let active = true;

    Promise.all([
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
      fieldOperations.officersDirectory(departmentId).catch(() => [] as DepartmentOfficer[]),
      fieldOperations.orderLinksMap(departmentId).catch(() => new Map()),
      fieldOperations.fetchNotifications(departmentId, username).catch(() => []),
    ])
      .then(async ([orderRows, officerRows, linksMap, notifRows]) => {
        if (!active) return;

        // Find this officer
        const currentOfficer =
          officerRows.find((o) => o.staff_username === username || o.user_id === username) ||
          officerRows[0] ||
          null;
        setOfficerProfile(currentOfficer);

        // Filter orders assigned to this officer
        const officerOrders = currentOfficer
          ? orderRows.filter((o) => o.officer_id === currentOfficer.user_id)
          : orderRows;
        setOrders(officerOrders);

        // Map live staff notifications
        if (Array.isArray(notifRows) && notifRows.length > 0) {
          const mapped: OfficerNotificationItem[] = notifRows.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.notification_type === 'general' ? 'assignment' : n.notification_type) as any,
            createdAt: n.created_at,
            read: n.is_read,
            orderId: n.link_url?.includes('order') ? n.link_url : undefined,
          }));
          setNotifications(mapped);
        } else {
          setNotifications([
            {
              id: 'notif-1',
              title: 'Municipal Task Assigned',
              message: 'New road hazard restoration assigned by Department Head. Review instructions and commence work.',
              type: 'assignment',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              read: false,
            },
            {
              id: 'notif-2',
              title: '30m Proximity Audit',
              message: 'Remember to capture evidence on site. The system validates high-accuracy GPS coordinates against the citizen report.',
              type: 'deadline',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              read: true,
            },
          ]);
        }

        // Load complaints for detail reading
        const names = new Map(officerRows.map((o: DepartmentOfficer) => [o.user_id, o.display_name]));
        const complaintItems = await caseOperationsService.listIndependentComplaintsForHead(
          departmentId as any,
          {
            period: 'all',
            includeResolved: true,
            orders: orderRows,
            orderLinksMap: linksMap,
            officerNames: names,
          }
        );
        if (!active) return;
        setComplaints(complaintItems);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Officer V19 data:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [departmentId, username, reloadKey]);

  // Derived counts for tabs
  const assignedNotStartedCount = useMemo(() => {
    return orders.filter((o) => o.status === 'assigned' && !o.started_at).length;
  }, [orders]);

  const activeWorkCount = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'in_progress' || (Boolean(o.started_at) && o.status !== 'verified')
    ).length;
  }, [orders]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Officer Navigation Tabs
  const officerTabs: NavTabOption[] = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'complaints', label: 'Assigned', badge: assignedNotStartedCount },
    { id: 'work', label: 'Work', badge: activeWorkCount },
    { id: 'performance', label: 'Scorecard' },
    { id: 'notifications', label: 'Notices', badge: unreadNotifCount },
    { id: 'profile', label: 'Profile' },
  ];

  // Action: Start Working (sets started_at and transitions to in_progress with commencement deadline)
  const handleStartWork = async (orderId: string) => {
    await fieldOperations.startWorkOrder(orderId);
    setReloadKey((k) => k + 1);
    // Switch to active work console
    setActiveTab('work');
  };

  // Action: Submit Work Completion
  const handleSubmitCompletion = async (
    orderId: string,
    evidenceFile: File,
    gps: { latitude: number; longitude: number; accuracy: number; distanceM?: number }
  ) => {
    const storagePath = `proofs/${departmentCode}/${orderId}_${Date.now()}.jpg`;
    const res = await fieldOperations.submitWorkCompletion(
      orderId,
      storagePath,
      {
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
      },
      evidenceFile
    );

    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: res.gpsVerified ? 'Resolution Submitted (GPS Verified)' : 'Resolution Submitted (Exception Review)',
        message: `Order #${orderId.slice(0, 8)} submitted. ${res.gpsVerified ? `Site proximity verified (${res.distanceMeters ?? 0}m).` : 'Proximity requires supervisor exception review.'}`,
        type: 'verification',
        createdAt: new Date().toISOString(),
        read: false,
        orderId,
      },
      ...prev,
    ]);

    setReloadKey((k) => k + 1);
  };

  // Action: Request More Time
  const handleRequestMoreTime = async (orderId: string, additionalHours: number, reason: string) => {
    const targetDue = new Date(Date.now() + additionalHours * 3600000).toISOString();
    await fieldOperations.requestExtension(orderId, targetDue, reason);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Deadline Extension Requested',
        message: `Requested +${additionalHours} hours for order #${orderId.slice(0, 8)}. Awaiting HOD decision.`,
        type: 'deadline',
        createdAt: new Date().toISOString(),
        read: false,
        orderId,
      },
      ...prev,
    ]);

    setReloadKey((k) => k + 1);
  };

  const auth = useDepartmentAuth();
  const session = auth?.session;
  const effectiveStaffName = session?.displayName || officerProfile?.display_name || username;

  // Mobile / Tablet Viewport Boundary Enforcement
  if (!deviceSupport.isDesktop) {
    if (activeTab === 'work') {
      return (
        <div
          className="v20-mobile-officer-root"
          data-testid="v20-mobile-officer-work-root"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--v20-bg-base, #0D0A08)',
            color: 'var(--v20-text-primary, #F4EFE5)',
            fontFamily: 'var(--v20-font-body, "Inter", sans-serif)',
            position: 'relative',
          }}
        >
          {/* Atmospheric background */}
          <div
            className="v20-atmospheric-background"
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
          />

          {/* Clean minimal mobile header */}
          <header
            className="v20-mobile-officer-header"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(13, 10, 8, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--v20-accent, #E2A24D)',
                }}
              >
                AWAAZ-E-AWAM • {departmentCode.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 650,
                  color: 'var(--v20-text-primary, #F4EFE5)',
                  marginTop: '1px',
                }}
              >
                Fieldwork Console
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--v20-text-primary, #F4EFE5)',
                  cursor: 'pointer',
                }}
              >
                {themeMode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--v20-text-primary, #F4EFE5)',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>

          {/* Focused mobile single-column fieldwork content */}
          <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '16px 12px' }}>
            <OfficerWorkView
              departmentCode={departmentCode}
              orders={orders}
              complaints={complaints}
              onSubmitCompletion={handleSubmitCompletion}
              onRequestMoreTime={handleRequestMoreTime}
              onStartWork={handleStartWork}
              isLoading={isLoading}
            />
          </main>
        </div>
      );
    }

    return (
      <DesktopRequiredScreen
        portalType="department"
        departmentCode={departmentCode}
        departmentName={departmentName}
        role="officer"
        isAuthenticated={true}
        onSignOut={onSignOut}
        onNavigateToWork={() => setActiveTab('work')}
      />
    );
  }

  return (
    <V20PortalLayout
      departmentCode={departmentCode}
      departmentName={departmentName}
      role="officer"
      username={effectiveStaffName}
      themeMode={themeMode}
      tabs={officerTabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onToggleTheme={onToggleTheme}
      onSignOut={onSignOut}
      unreadNotifications={unreadNotifCount}
      onOpenNotifications={() => setActiveTab('notifications')}
    >
      <OfficerMobileGate activeTab={activeTab} onNavigateToWork={() => setActiveTab('work')}>
        {activeTab === 'home' && (
          <V20LandingPage
            departmentCode={departmentCode}
            departmentName={departmentName}
            role="officer"
            staffName={effectiveStaffName}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToComplaints={() => setActiveTab('complaints')}
          />
        )}

        {activeTab === 'dashboard' && (
          <V20DashboardPage
            departmentCode={departmentCode}
            departmentName={departmentName}
            role="officer"
            totalActiveCases={orders.filter((o) => o.status !== 'verified').length}
            totalSolvedCases={orders.filter((o) => o.status === 'verified').length}
            inProgressCount={orders.filter((o) => o.status === 'in_progress').length}
            pendingCount={orders.filter((o) => o.status === 'assigned' && !o.started_at).length}
            verificationCount={orders.filter((o) => o.status === 'pending_review').length}
            records={orders.map((o) => ({
              timestamp: o.assigned_at || new Date().toISOString(),
              status: o.status === 'verified'
                ? 'solved'
                : o.status === 'in_progress'
                ? 'progress'
                : o.status === 'pending_review'
                ? 'verification'
                : 'pending',
            }))}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'complaints' && (
          <OfficerComplaintsView
            departmentCode={departmentCode}
            orders={orders}
            complaints={complaints}
            onStartWork={handleStartWork}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'work' && (
          <OfficerWorkView
            departmentCode={departmentCode}
            orders={orders}
            complaints={complaints}
            onSubmitCompletion={handleSubmitCompletion}
            onRequestMoreTime={handleRequestMoreTime}
            onStartWork={handleStartWork}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'performance' && (
          <OfficerPerformanceView
            departmentCode={departmentCode}
            departmentName={departmentName}
            officer={officerProfile}
            orders={orders}
          />
        )}

        {activeTab === 'notifications' && (
          <OfficerNotificationsView
            notifications={notifications}
            onMarkAsRead={async (id) => {
              setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
              await fieldOperations.markNotificationRead(id).catch(() => null);
            }}
            onMarkAllAsRead={async () => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              const unreadNotifs = notifications.filter((n) => !n.read);
              if (unreadNotifs.length > 0) {
                await Promise.all(
                  unreadNotifs.map((n) => fieldOperations.markNotificationRead(n.id).catch(() => null))
                );
              }
            }}
            onNavigateToOrder={(_orderId) => {
              setActiveTab('work');
            }}
          />
        )}

        {activeTab === 'profile' && (
          <OfficerProfileView
            departmentCode={departmentCode}
            departmentName={departmentName}
            officerName={effectiveStaffName}
            employeeId={officerProfile?.employee_id || undefined}
            staffUsername={username}
            onSignOut={onSignOut}
            onOpenPasswordModal={onOpenPasswordModal}
          />
        )}
      </OfficerMobileGate>
    </V20PortalLayout>
  );
};
