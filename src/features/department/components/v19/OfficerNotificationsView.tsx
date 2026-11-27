import React from 'react';
import { StaffNotificationsView, type StaffNotificationItem } from './StaffNotificationsView';

export interface OfficerNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'deadline' | 'verification' | 'warning';
  createdAt: string;
  read: boolean;
  orderId?: string;
}

export interface OfficerNotificationsViewProps {
  notifications: OfficerNotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const OfficerNotificationsView: React.FC<OfficerNotificationsViewProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToOrder,
}) => {
  const staffNotifs: StaffNotificationItem[] = notifications.map((n) => ({
    ...n,
    orderId: n.orderId,
  }));

  return (
    <div data-testid="v19-officer-notifications" style={{ width: '100%' }}>
      <StaffNotificationsView
        notifications={staffNotifs}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onNavigateToItem={(item) => {
          if (item.orderId && onNavigateToOrder) {
            onNavigateToOrder(item.orderId);
          }
        }}
      />
    </div>
  );
};
