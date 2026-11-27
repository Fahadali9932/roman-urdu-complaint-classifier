import React, { useState, useMemo } from 'react';
import { type DepartmentWorkOrder } from '../../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../../services/CaseOperationsService';
import { trustedTimeService } from '../../../../../services/trustedTimeService';
import {
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  PlayCircle,
} from 'lucide-react';

export interface OfficerWorkListProps {
  orders: DepartmentWorkOrder[];
  complaints: HeadIndependentComplaintRow[];
  onSelectOrder: (orderId: string) => void;
  onStartWork?: (orderId: string) => void | Promise<void>;
  isLoading?: boolean;
}

export const OfficerWorkList: React.FC<OfficerWorkListProps> = ({
  orders,
  complaints,
  onSelectOrder,
  onStartWork,
  isLoading = false,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'assigned'>('all');
  const nowMs = trustedTimeService.now().getTime();

  // Map order to its matched complaint row
  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const complaint = complaints.find(
        (c) => c.id === order.anchor_complaint_id || c.referenceNumber === order.anchor_complaint_id
      );

      // Remaining time calculation
      let remainingDisplay = '';
      let isOverdue = false;
      let urgencyColor = 'var(--v20-text-secondary, #A6AEB8)';

      if (order.started_at) {
        const startMs = new Date(order.started_at).getTime();
        const durationHours = order.assigned_duration_hours || 72;
        const deadlineMs = order.effective_deadline_at
          ? new Date(order.effective_deadline_at).getTime()
          : startMs + durationHours * 3600000;

        const remMs = deadlineMs - nowMs;
        const remHours = Math.floor(remMs / 3600000);
        const remMins = Math.floor((remMs % 3600000) / 60000);
        isOverdue = remMs < 0;

        if (isOverdue) {
          remainingDisplay = `Overdue by ${Math.abs(remHours)}h ${Math.abs(remMins)}m`;
          urgencyColor = 'var(--danger, #E05656)';
        } else if (remHours < 4) {
          remainingDisplay = `${remHours}h ${remMins}m remaining`;
          urgencyColor = 'var(--danger, #E05656)';
        } else if (remHours < 24) {
          remainingDisplay = `${remHours}h ${remMins}m remaining`;
          urgencyColor = 'var(--warning, #E59B2F)';
        } else {
          remainingDisplay = `${remHours}h remaining`;
          urgencyColor = 'var(--success, #3BC977)';
        }
      } else {
        const durationHours = order.assigned_duration_hours || 72;
        remainingDisplay = `${durationHours}h allocated (awaiting start)`;
      }

      return {
        order,
        complaint,
        remainingDisplay,
        isOverdue,
        urgencyColor,
      };
    });
  }, [orders, complaints, nowMs]);

  const filteredOrders = useMemo(() => {
    if (filterTab === 'in_progress') {
      return enrichedOrders.filter(
        (item) => item.order.status === 'in_progress' || (Boolean(item.order.started_at) && item.order.status !== 'verified')
      );
    }
    if (filterTab === 'assigned') {
      return enrichedOrders.filter(
        (item) => item.order.status === 'assigned' && !item.order.started_at
      );
    }
    return enrichedOrders;
  }, [enrichedOrders, filterTab]);

  const inProgressCount = useMemo(
    () =>
      enrichedOrders.filter(
        (item) => item.order.status === 'in_progress' || (Boolean(item.order.started_at) && item.order.status !== 'verified')
      ).length,
    [enrichedOrders]
  );

  const assignedCount = useMemo(
    () => enrichedOrders.filter((item) => item.order.status === 'assigned' && !item.order.started_at).length,
    [enrichedOrders]
  );

  return (
    <div
      data-testid="officer-work-list"
      className="v20-work-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '1200px',
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
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--v20-text-primary, #F3EEE4)',
              }}
            >
              My work
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
                color: 'var(--v20-text-secondary, #A6AEB8)',
                border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
              }}
            >
              {enrichedOrders.length} {enrichedOrders.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--v20-text-secondary, #A6AEB8)',
              margin: '6px 0 0',
            }}
          >
            Assigned complaints requiring on-site fieldwork, GPS verification, and photographic resolution.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`v19-nav-tab ${filterTab === 'all' ? 'is-active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: filterTab === 'all' ? 'var(--button-primary, #F0ECE3)' : 'var(--v20-glass-surface, rgba(255,255,255,0.06))',
              color: filterTab === 'all' ? 'var(--button-primary-text, #101216)' : 'var(--v20-text-secondary, #A6AEB8)',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
              cursor: 'pointer',
            }}
          >
            All tasks ({enrichedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('in_progress')}
            className={`v19-nav-tab ${filterTab === 'in_progress' ? 'is-active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: filterTab === 'in_progress' ? 'var(--button-primary, #F0ECE3)' : 'var(--v20-glass-surface, rgba(255,255,255,0.06))',
              color: filterTab === 'in_progress' ? 'var(--button-primary-text, #101216)' : 'var(--v20-text-secondary, #A6AEB8)',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
              cursor: 'pointer',
            }}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('assigned')}
            className={`v19-nav-tab ${filterTab === 'assigned' ? 'is-active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: filterTab === 'assigned' ? 'var(--button-primary, #F0ECE3)' : 'var(--v20-glass-surface, rgba(255,255,255,0.06))',
              color: filterTab === 'assigned' ? 'var(--button-primary-text, #101216)' : 'var(--v20-text-secondary, #A6AEB8)',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
              cursor: 'pointer',
            }}
          >
            Awaiting Start ({assignedCount})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div
          className="v19-glass-card v20-empty-work"
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '20px',
            background: 'var(--v20-glass-surface, #111317)',
            border: '1px solid var(--v20-glass-border, #2A3038)',
          }}
        >
          <CheckCircle2 size={44} style={{ color: 'var(--success, #3BC977)' }} />
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--v20-text-primary, #F3EEE4)',
              margin: 0,
            }}
          >
            No Field Tasks Currently In Progress
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--v20-text-secondary, #A6AEB8)',
              margin: 0,
              maxWidth: '420px',
            }}
          >
            {isLoading
              ? 'Loading active fieldwork tasks…'
              : 'You have completed all assigned work orders. New departmental assignments will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map(({ order, complaint, remainingDisplay, urgencyColor }) => {
            const refNumber = complaint?.referenceNumber || order.anchor_complaint_id;
            const priority = (complaint?.priority || 'NORMAL').toUpperCase();
            const locationStr = complaint
              ? [complaint.publicPlace, complaint.locality, complaint.district]
                  .filter(Boolean)
                  .join(', ')
              : order.case_label && order.case_label.includes('—')
                ? `${order.case_label.split('—')[0].trim()}, Karachi`
                : 'Incident address detailed in complaint';

            const isStarted = Boolean(order.started_at);
            const statusLabel = isStarted ? 'In Progress' : 'Assigned (Pending Start)';

            return (
              <div
                key={order.id}
                data-testid={`officer-work-card-${order.id}`}
                className="v19-glass-card v20-work-card"
                onClick={() => onSelectOrder(order.id)}
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderRadius: '20px',
                  background: 'var(--v20-glass-surface, #111317)',
                  border: '1px solid var(--v20-glass-border, #2A3038)',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                  position: 'relative',
                }}
              >
                {/* Top Row: Reference, Order ID & Status Badges */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--v20-accent, #E2A24D)',
                        fontFamily: 'var(--v20-font-number, monospace)',
                        background: 'var(--v20-card-subsurface, rgba(226, 162, 77, 0.1))',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--v20-accent-border, rgba(226, 162, 77, 0.25))',
                      }}
                    >
                      REF #{refNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--v20-text-muted, #7E858E)',
                        fontFamily: 'var(--v20-font-number, monospace)',
                      }}
                    >
                      Work Order #{order.id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Priority Badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background:
                          priority === 'CRITICAL' || priority === 'URGENT'
                            ? 'rgba(224, 86, 86, 0.15)'
                            : priority === 'HIGH'
                              ? 'rgba(229, 155, 47, 0.15)'
                              : 'rgba(78, 156, 255, 0.15)',
                        color:
                          priority === 'CRITICAL' || priority === 'URGENT'
                            ? 'var(--danger, #E05656)'
                            : priority === 'HIGH'
                              ? 'var(--warning, #E59B2F)'
                              : 'var(--info, #4E9CFF)',
                        border:
                          priority === 'CRITICAL' || priority === 'URGENT'
                            ? '1px solid rgba(224, 86, 86, 0.3)'
                            : priority === 'HIGH'
                              ? '1px solid rgba(229, 155, 47, 0.3)'
                              : '1px solid rgba(78, 156, 255, 0.3)',
                      }}
                    >
                      {priority}
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: isStarted ? 'rgba(59, 201, 119, 0.12)' : 'rgba(229, 155, 47, 0.12)',
                        color: isStarted ? 'var(--success, #3BC977)' : 'var(--warning, #E59B2F)',
                        border: isStarted
                          ? '1px solid rgba(59, 201, 119, 0.25)'
                          : '1px solid rgba(229, 155, 47, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isStarted ? <Briefcase size={12} /> : <Clock size={12} />}
                      <span>{statusLabel}</span>
                    </span>
                  </div>
                </div>

                {/* Main Details */}
                <div>
                  <h3
                    style={{
                      fontSize: '19px',
                      fontWeight: 700,
                      color: 'var(--v20-text-primary, #F3EEE4)',
                      margin: '0 0 8px',
                      lineHeight: 1.35,
                    }}
                  >
                    {order.case_label || complaint?.heading || 'Municipal Fieldwork Assignment'}
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--v20-text-secondary, #A6AEB8)',
                      margin: '0 0 10px',
                      lineHeight: 1.5,
                    }}
                  >
                    {complaint?.factualSummary || complaint?.sanitizedText || 'Field assignment details provided by Head of Department.'}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: 'var(--v20-text-muted, #7E858E)',
                    }}
                  >
                    <MapPin size={15} style={{ color: 'var(--info, #4E9CFF)', flexShrink: 0 }} />
                    <span>{locationStr}</span>
                  </div>

                  {order.instructions && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.04))',
                        fontSize: '13px',
                        color: 'var(--v20-text-secondary, #A6AEB8)',
                      }}
                    >
                      <strong style={{ color: 'var(--v20-text-primary, #F3EEE4)' }}>Supervisor Note:</strong> {order.instructions}
                    </div>
                  )}
                </div>

                {/* Footer Row: Countdown & Open Action */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: urgencyColor }} />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 650,
                        color: urgencyColor,
                        fontFamily: 'var(--v20-font-number, monospace)',
                      }}
                    >
                      {remainingDisplay}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {!isStarted && onStartWork && (
                      <button
                        type="button"
                        className="v19-nav-tab v20-pill-btn"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '9999px',
                          background: 'var(--button-primary, #F0ECE3)',
                          color: 'var(--button-primary-text, #101216)',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        data-testid={`v20-start-work-btn-${order.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartWork(order.id);
                        }}
                      >
                        <span>Start Working</span>
                        <PlayCircle size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="v19-nav-tab v20-pill-btn"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '9999px',
                        background: 'var(--button-primary, #F0ECE3)',
                        color: 'var(--button-primary-text, #101216)',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      data-testid={`open-complaint-btn-${order.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order.id);
                      }}
                    >
                      <span>Open complaint</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
