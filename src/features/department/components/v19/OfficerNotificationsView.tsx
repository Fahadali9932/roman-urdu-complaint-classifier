import React, { useState } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div data-testid="v19-officer-notifications" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v19-text-primary)' }}>
            Operational Notifications
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--v19-text-muted)', margin: '4px 0 0' }}>
            Real-time assignment updates, supervisory verifications, and deadline adjustments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="v19-nav-tab"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={onMarkAllAsRead}
            >
              Mark All Read ({unreadCount})
            </button>
          )}

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '9999px', border: '1.5px solid var(--v20-glass-border)' }}>
            <button
              type="button"
              className={`v19-nav-tab ${filter === 'all' ? 'is-active' : ''}`}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                background: filter === 'all' ? 'var(--v20-accent, #DFA51D)' : 'transparent',
                color: filter === 'all' ? '#0E1017' : 'var(--v20-text-secondary)',
                fontWeight: filter === 'all' ? 700 : 500,
                border: 'none',
              }}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`v19-nav-tab ${filter === 'unread' ? 'is-active' : ''}`}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                background: filter === 'unread' ? 'var(--v20-accent, #DFA51D)' : 'transparent',
                color: filter === 'unread' ? '#0E1017' : 'var(--v20-text-secondary)',
                fontWeight: filter === 'unread' ? 700 : 500,
                border: 'none',
              }}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifs.length === 0 ? (
        <div className="v19-glass-card" style={{ padding: '64px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
          <Bell size={36} style={{ color: 'var(--v20-accent, #DFA51D)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v20-text-primary)', margin: '0 0 6px' }}>
            No Notifications
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {filter === 'unread' ? 'You have caught up with all operational notices.' : 'Your notification stream is currently clear.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifs.map((n) => {
            let icon = <Bell size={16} style={{ color: 'var(--v20-accent, #DFA51D)' }} />;
            if (n.type === 'verification') icon = <CheckCircle2 size={16} style={{ color: 'var(--v20-status-solved, #43A047)' }} />;
            else if (n.type === 'deadline') icon = <Clock size={16} style={{ color: '#29B6F6' }} />;
            else if (n.type === 'warning') icon = <AlertTriangle size={16} style={{ color: '#F59E0B' }} />;

            return (
              <div
                key={n.id}
                className={`v19-glass-card ${!n.read ? 'is-unread' : ''}`}
                style={{
                  padding: '18px 22px',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  background: !n.read ? 'var(--v20-accent-soft, rgba(223, 165, 29, 0.08))' : 'var(--v20-glass-surface)',
                  borderColor: !n.read ? 'var(--v20-accent, #DFA51D)' : 'var(--v20-glass-border)',
                }}
                onClick={() => {
                  if (!n.read) onMarkAsRead(n.id);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ marginTop: '2px' }}>{icon}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--v19-lime)' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--v19-text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--v19-text-muted)', display: 'block', marginTop: '4px' }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {n.orderId && onNavigateToOrder && (
                  <button
                    type="button"
                    className="v19-nav-tab"
                    style={{ fontSize: '11.5px', padding: '4px 10px', flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!n.read) onMarkAsRead(n.id);
                      onNavigateToOrder(n.orderId!);
                    }}
                  >
                    <span>View Task</span>
                    <ArrowRight size={13} style={{ marginLeft: '4px' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
