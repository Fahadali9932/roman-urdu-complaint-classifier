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
  const [activeTab, setActiveTab] = useState(initialTab);
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

  return (
    <V20PortalLayout
      departmentCode={departmentCode}
      departmentName={departmentName}
      role="officer"
      username={username}
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
            staffName={officerProfile?.display_name || username}
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
              await fieldOperations.markNotificationRead(id).catch(() => null);
              setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
            }}
            onMarkAllAsRead={async () => {
              await Promise.all(
                notifications.filter((n) => !n.read).map((n) => fieldOperations.markNotificationRead(n.id).catch(() => null))
              );
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            officerName={officerProfile?.display_name || username}
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
