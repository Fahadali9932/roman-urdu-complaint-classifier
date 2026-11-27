import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, ArrowRight, Check, ClipboardList, Loader2 } from 'lucide-react';

export interface StaffNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'deadline' | 'verification' | 'warning' | 'general' | 'overdue' | 'extension';
  createdAt: string;
  read: boolean;
  linkUrl?: string;
  orderId?: string;
  complaintId?: string;
}

export interface StaffNotificationsViewProps {
  notifications: StaffNotificationItem[];
  onMarkAsRead: (id: string) => void | Promise<void>;
  onMarkAllAsRead: () => void | Promise<void>;
  onNavigateToItem?: (item: StaffNotificationItem) => void;
  isLoading?: boolean;
}

function formatPktTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date) + ' PKT';
  } catch {
    return isoString;
  }
}

export const StaffNotificationsView: React.FC<StaffNotificationsViewProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToItem,
  isLoading: _isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Sync localReadIds if notifications update from parent
  useEffect(() => {
    // If all notifications in parent are marked read, keep localReadIds clean
    const hasUnread = notifications.some((n) => !n.read);
    if (!hasUnread) {
      setLocalReadIds(new Set());
    }
  }, [notifications]);

  const isItemRead = (item: StaffNotificationItem) => item.read || localReadIds.has(item.id);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !isItemRead(n);
    return true;
  });

  const unreadCount = notifications.filter((n) => !isItemRead(n)).length;

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || unreadCount === 0) return;
    setIsMarkingAllRead(true);
    const prevSet = new Set(localReadIds);
    // Optimistic update: mark all current notifications read immediately
    const nextSet = new Set(localReadIds);
    notifications.forEach((n) => nextSet.add(n.id));
    setLocalReadIds(nextSet);

    try {
      await onMarkAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Rollback on error
      setLocalReadIds(prevSet);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleMarkOneAsRead = async (id: string) => {
    setLocalReadIds((prev) => new Set(prev).add(id));
    try {
      await onMarkAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <div
      data-testid="v20-notifications-page"
      className="v20-notifications-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '880px',
        margin: '0 auto',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          paddingBottom: '8px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              color: 'var(--v20-text-primary, #F0ECE3)',
            }}
          >
            Notifications
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: '4px 0 0' }}>
            Operational alerts, field assignments, and administrative notices.
          </p>
        </div>

        {/* Controls: Mark All Read & Compact Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="v19-nav-tab"
            disabled={unreadCount === 0 || isMarkingAllRead}
            onClick={handleMarkAllAsRead}
            style={{
              fontSize: '12.5px',
              padding: '7px 16px',
              borderRadius: '9999px',
              background: unreadCount === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: unreadCount === 0 ? 'var(--v20-text-muted)' : 'var(--v20-text-primary, #F0ECE3)',
              cursor: unreadCount === 0 || isMarkingAllRead ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: unreadCount === 0 ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
            data-testid="v20-mark-all-read-btn"
          >
            {isMarkingAllRead ? (
              <>
                <Loader2 size={14} className="v20-spin" />
                <span>Marking as read...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Mark all as read</span>
              </>
            )}
          </button>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '4px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              className={`v19-nav-tab ${filter === 'all' ? 'is-active' : ''}`}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                borderRadius: '9999px',
                background: filter === 'all' ? 'var(--button-primary, #F0ECE3)' : 'transparent',
                color: filter === 'all' ? '#101216' : 'var(--v20-text-secondary)',
                fontWeight: filter === 'all' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setFilter('all')}
              data-testid="v20-filter-all-btn"
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              className={`v19-nav-tab ${filter === 'unread' ? 'is-active' : ''}`}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                borderRadius: '9999px',
                background: filter === 'unread' ? 'var(--button-primary, #F0ECE3)' : 'transparent',
                color: filter === 'unread' ? '#101216' : 'var(--v20-text-secondary)',
                fontWeight: filter === 'unread' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setFilter('unread')}
              data-testid="v20-filter-unread-btn"
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Stream Container */}
      <div
        className="v19-glass-card"
        style={{
          borderRadius: '26px',
          background: 'rgba(18, 15, 12, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filteredNotifs.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
            <Bell size={36} style={{ color: 'var(--v20-text-muted)', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)', margin: '0 0 6px' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p style={{ fontSize: '13px', margin: 0, color: 'var(--v20-text-secondary)' }}>
              {filter === 'unread'
                ? 'You have caught up with all operational alerts.'
                : 'Your operational notification stream is currently clear.'}
            </p>
          </div>
        ) : (
          filteredNotifs.map((item, idx) => {
            const itemRead = isItemRead(item);

            // Icon selection
            let iconElement = <Bell size={18} style={{ color: 'var(--v20-text-muted)' }} />;
            if (item.type === 'verification') {
              iconElement = <CheckCircle2 size={18} style={{ color: '#43A047' }} />;
            } else if (item.type === 'assignment') {
              iconElement = <ClipboardList size={18} style={{ color: '#4E9CFF' }} />;
            } else if (item.type === 'deadline' || item.type === 'extension') {
              iconElement = <Clock size={18} style={{ color: '#29B6F6' }} />;
            } else if (item.type === 'warning' || item.type === 'overdue') {
              iconElement = <AlertTriangle size={18} style={{ color: '#F59E0B' }} />;
            }

            const hasDivider = idx < filteredNotifs.length - 1;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '20px 24px',
                  borderBottom: hasDivider ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                  background: !itemRead ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
                data-testid={`v20-notif-item-${item.id}`}
              >
                {/* Unread dot indicator */}
                <div style={{ width: '8px', paddingTop: '6px', flexShrink: 0 }}>
                  {!itemRead && (
                    <span
                      style={{
                        display: 'block',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#4E9CFF',
                        boxShadow: '0 0 8px rgba(78, 156, 255, 0.6)',
                      }}
                      title="Unread notification"
                      data-testid={`v20-unread-dot-${item.id}`}
                    />
                  )}
                </div>

                {/* Neutral icon */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {iconElement}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <h4
                      style={{
                        fontSize: '15px',
                        fontWeight: itemRead ? 600 : 700,
                        color: 'var(--v20-text-primary, #F0ECE3)',
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </h4>

                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--v20-text-muted)',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--v20-font-display, sans-serif)',
                      }}
                    >
                      {formatPktTimestamp(item.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--v20-text-secondary)',
                      margin: '6px 0 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.message}
                  </p>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
                    {onNavigateToItem && (item.orderId || item.complaintId || item.linkUrl) && (
                      <button
                        type="button"
                        onClick={() => onNavigateToItem(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4E9CFF',
                          fontSize: '12px',
                          fontWeight: 650,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>View case details</span>
                        <ArrowRight size={12} />
                      </button>
                    )}

                    {!itemRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkOneAsRead(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--v20-text-muted)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        data-testid={`v20-mark-read-${item.id}`}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
