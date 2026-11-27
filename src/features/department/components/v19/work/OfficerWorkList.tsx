import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const cardOffsetsRef = useRef<number[]>([]);
  const surfaceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number>(0);
  const isTickingRef = useRef(false);

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

  // Measure and cache card layout offsets once on mount/resize for Parallax scroll
  const cacheLayoutGeometry = useCallback(() => {
    if (!containerRef.current) return;
    const wrappers = containerRef.current.querySelectorAll<HTMLElement>('.v20-card-wrapper');
    const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;
    cardOffsetsRef.current = Array.from(wrappers).map((w) => {
      return w.offsetTop + containerTop;
    });
  }, []);

  useEffect(() => {
    cacheLayoutGeometry();

    const handleResize = () => {
      cacheLayoutGeometry();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cacheLayoutGeometry, filteredOrders.length]);

  // High-performance scroll animation loop (identical to approved HOD parallax scroll)
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      surfaceRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = '';
          el.style.opacity = '1';
        }
      });
      return;
    }

    const stickyCeiling = 140;

    const onScroll = () => {
      if (isTickingRef.current) return;
      isTickingRef.current = true;

      rafIdRef.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const offsets = cardOffsetsRef.current;

        for (let i = 0; i < offsets.length; i++) {
          const surface = surfaceRefs.current[i];
          if (!surface) continue;

          const cardAbsoluteTop = offsets[i];
          const viewportTop = cardAbsoluteTop - currentScrollY;

          if (viewportTop > windowHeight + 100 || viewportTop < -300) {
            continue;
          }

          if (viewportTop < stickyCeiling) {
            const distancePast = stickyCeiling - viewportTop;
            const progress = Math.min(distancePast / 260, 1.0);

            const scale = 1 - 0.03 * progress;
            const translateY = 14 * progress;
            const translateZ = -20 * progress;
            const opacity = 1 - 0.12 * progress;

            surface.style.transform = `perspective(800px) scale(${scale.toFixed(4)}) translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px)`;
            surface.style.opacity = opacity.toFixed(3);
          } else {
            surface.style.transform = '';
            surface.style.opacity = '1';
          }
        }

        isTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      isTickingRef.current = false;
    };
  }, [filteredOrders.length]);

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

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`v20-field-btn ${filterTab === 'all' ? 'primary' : 'secondary'}`}
            style={{ minHeight: '38px', padding: '8px 18px', fontSize: '13px' }}
          >
            All tasks ({enrichedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('in_progress')}
            className={`v20-field-btn ${filterTab === 'in_progress' ? 'primary' : 'secondary'}`}
            style={{ minHeight: '38px', padding: '8px 18px', fontSize: '13px' }}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('assigned')}
            className={`v20-field-btn ${filterTab === 'assigned' ? 'primary' : 'secondary'}`}
            style={{ minHeight: '38px', padding: '8px 18px', fontSize: '13px' }}
          >
            Awaiting Start ({assignedCount})
          </button>
        </div>
      </div>

      {/* Orders List Container */}
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
        <div
          ref={containerRef}
          className="v20-parallax-stack-container"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {filteredOrders.map(({ order, complaint, remainingDisplay, urgencyColor }, idx) => {
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
                className="v20-card-wrapper"
                style={{
                  position: 'relative',
                  zIndex: idx + 1,
                  minHeight: '160px',
                }}
              >
                <div
                  ref={(el) => {
                    surfaceRefs.current[idx] = el;
                  }}
                  data-testid={`officer-work-card-${order.id}`}
                  className="v19-glass-card v19-parallax-card v20-work-card"
                  onClick={() => onSelectOrder(order.id)}
                  style={{
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    borderRadius: '20px',
                    background: 'var(--v20-glass-surface, #111317)',
                    border: '1px solid var(--v20-glass-border, #2A3038)',
                    cursor: 'pointer',
                    willChange: 'transform, opacity',
                    transformOrigin: 'top center',
                  }}
                >
                  {/* Top Row: Reference Left (Neutral Secondary), Badges Right */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 650,
                          color: 'var(--v20-text-secondary, #A6AEB8)',
                          fontFamily: 'var(--v20-font-number, monospace)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        REF #{refNumber}
                      </span>
                      {/* Accessible work order identifier preserved for assistive tech & audit */}
                      <span
                        style={{
                          position: 'absolute',
                          width: '1px',
                          height: '1px',
                          padding: 0,
                          margin: '-1px',
                          overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)',
                          whiteSpace: 'nowrap',
                          border: 0,
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

                  {/* Middle: Prominent Title & Incident Location */}
                  <div>
                    <h3
                      style={{
                        fontSize: '19px',
                        fontWeight: 700,
                        color: 'var(--v20-text-primary, #F3EEE4)',
                        margin: '0 0 6px',
                        lineHeight: 1.35,
                      }}
                    >
                      {order.case_label || complaint?.heading || 'Municipal Fieldwork Assignment'}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13.5px',
                        color: 'var(--v20-text-secondary, #A6AEB8)',
                      }}
                    >
                      <MapPin size={15} style={{ color: 'var(--info, #4E9CFF)', flexShrink: 0 }} />
                      <span>{locationStr}</span>
                    </div>

                    {/* Accessible supervisor directives preserved for screen readers & audit */}
                    {order.instructions && (
                      <span
                        style={{
                          position: 'absolute',
                          width: '1px',
                          height: '1px',
                          padding: 0,
                          margin: '-1px',
                          overflow: 'hidden',
                          clip: 'rect(0, 0, 0, 0)',
                          whiteSpace: 'nowrap',
                          border: 0,
                        }}
                      >
                        {order.instructions}
                      </span>
                    )}
                  </div>

                  {/* Footer Row: Countdown & Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingTop: '12px',
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
                          className="v20-field-btn secondary"
                          style={{ minHeight: '38px', padding: '8px 16px', fontSize: '13px' }}
                          data-testid={`v20-start-work-btn-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartWork(order.id);
                          }}
                        >
                          <PlayCircle size={15} />
                          <span>Start Working</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="v20-field-btn primary"
                        style={{ minHeight: '38px', padding: '8px 18px', fontSize: '13px' }}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

