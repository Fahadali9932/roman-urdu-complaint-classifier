import React, { useState, useMemo } from 'react';
import { type DepartmentWorkOrder } from '../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';
import { ParallaxComplaintList, type ParallaxComplaintItem } from './ParallaxComplaintList';
import { ImageLightbox } from './ImageLightbox';
import { MapPin, Play, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';

export interface OfficerComplaintsViewProps {
  departmentCode: string;
  orders: DepartmentWorkOrder[];
  complaints: HeadIndependentComplaintRow[];
  onStartWork: (orderId: string) => Promise<void>;
  isLoading?: boolean;
}

export const OfficerComplaintsView: React.FC<OfficerComplaintsViewProps> = ({
  departmentCode,
  orders,
  complaints,
  onStartWork,
  isLoading = false,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Filter only assigned, not-yet-started work orders
  const assignedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'assigned' && !o.started_at);
  }, [orders]);

  // Deterministic priority weight
  const priorityWeight: Record<string, number> = {
    critical: 4,
    urgent: 4,
    high: 3,
    normal: 2,
    medium: 2,
    routine: 1,
  };

  // Sorted orders: Priority first, then due date / creation date
  const sortedOrders = useMemo(() => {
    return [...assignedOrders].sort((a, b) => {
      const complaintA = complaints.find((c) => c.id === a.anchor_complaint_id);
      const complaintB = complaints.find((c) => c.id === b.anchor_complaint_id);
      const weightA = priorityWeight[complaintA?.priority?.toLowerCase() || 'normal'] || 2;
      const weightB = priorityWeight[complaintB?.priority?.toLowerCase() || 'normal'] || 2;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.assigned_at || 0).getTime() - new Date(a.assigned_at || 0).getTime();
    });
  }, [assignedOrders, complaints]);

  // Convert to shared ParallaxComplaintList items for unified horizontal glass card presentation
  const parallaxItems: ParallaxComplaintItem[] = useMemo(() => {
    return sortedOrders.map((order) => {
      const complaint = complaints.find((c) => c.id === order.anchor_complaint_id);
      const p = (complaint?.priority?.toLowerCase() as any) || 'normal';
      const refNum = complaint?.referenceNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
      const location = complaint
        ? `${complaint.publicPlace || 'Location unspecified'}${complaint.locality ? `, ${complaint.locality}` : ''}`
        : 'Assigned municipal location';
      const dateStr = order.assigned_at
        ? new Date(order.assigned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'Pending';

      return {
        id: order.id,
        referenceNumber: refNum,
        heading: order.case_label,
        publicLocation: location,
        priority: p,
        status: 'Assigned',
        submittedAt: dateStr,
      };
    });
  }, [sortedOrders, complaints]);

  const activeOrder = useMemo(() => {
    return assignedOrders.find((o) => o.id === selectedOrderId) || null;
  }, [assignedOrders, selectedOrderId]);

  // Find linked complaint for reading details
  const linkedComplaint = useMemo(() => {
    if (!activeOrder) return null;
    return complaints.find((c) => c.id === activeOrder.anchor_complaint_id) || null;
  }, [activeOrder, complaints]);

  const handleStartWorkClick = async (orderId: string) => {
    setIsStarting(true);
    try {
      await onStartWork(orderId);
      setSelectedOrderId(null);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div data-testid="v19-officer-complaints" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Lightbox for citizen evidence */}
      <ImageLightbox
        imageUrl={lightboxImg}
        caption="Citizen photographic report"
        onClose={() => setLightboxImg(null)}
        watermarkText={`${departmentCode} · FIELD OFFICER ASSIGNMENT`}
      />

      {/* Header */}
      {!activeOrder && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v20-text-primary)' }}>
            Assigned Tasks (Pending Start)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--v20-text-muted)', margin: '4px 0 0' }}>
            Work orders dispatched by Department Head. Select an assignment to review details, directions, and start work.
          </p>
        </div>
      )}

      {assignedOrders.length === 0 ? (
        <div className="v19-glass-card" style={{ padding: '64px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
          <CheckCircle2 size={36} style={{ color: 'var(--v20-status-solved, #43A047)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v20-text-primary)', margin: '0 0 6px' }}>
            No Pending Unstarted Tasks
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {isLoading ? 'Loading your assigned tasks…' : 'All your assigned work orders have been started or completed.'}
          </p>
        </div>
      ) : activeOrder ? (
        /* Dedicated Full-Width Reading Detail View matching HOD structure */
        <div
          className="v19-glass-card v20-complaint-detail"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '36px 40px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header row with back button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--v20-glass-border)',
              paddingBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                className="v19-nav-tab"
                onClick={() => setSelectedOrderId(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Assigned Tasks</span>
              </button>
              <span className="v20-ref-num" style={{ fontSize: '13.5px' }}>
                ORDER #{activeOrder.id.slice(0, 8)}
              </span>
              {linkedComplaint && (
                <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                  · Ref #{linkedComplaint.referenceNumber}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {linkedComplaint?.priority && (
                <span
                  className={`v19-priority-square ${linkedComplaint.priority.toLowerCase()}`}
                  style={{ width: 'auto', height: 'auto', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}
                >
                  {linkedComplaint.priority.toUpperCase()}
                </span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                Assigned · Ready to Start
              </span>
            </div>
          </div>

          {/* Centered Heading */}
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h1
              style={{
                fontSize: 'clamp(20px, 2.5vw, 28px)',
                fontWeight: 700,
                color: 'var(--v20-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              {activeOrder.case_label}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--v20-text-muted)' }}>
              Dispatched by Department Supervisor
            </div>
          </div>

          {/* Location info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: 'rgba(0,0,0,0.25)',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid var(--v20-glass-border)',
            }}
          >
            <MapPin size={20} style={{ color: 'var(--v20-accent, #DFA51D)', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>
                {linkedComplaint?.publicPlace || 'Location unspecified'}
                {linkedComplaint?.locality ? `, ${linkedComplaint.locality}` : ''}
              </div>
              {linkedComplaint?.latitude && linkedComplaint?.longitude ? (
                <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '4px', fontFamily: 'var(--v20-font-mono)' }}>
                  GPS: {linkedComplaint.latitude.toFixed(5)}, {linkedComplaint.longitude.toFixed(5)} ·{' '}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${linkedComplaint.latitude},${linkedComplaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--v20-accent, #DFA51D)', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Open Directions ↗
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '4px' }}>
                  Locality address registered without precise GPS pin
                </div>
              )}
            </div>
          </div>

          {/* Supervisor Instructions */}
          {activeOrder.instructions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--v20-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Supervisor Instructions
              </span>
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--v20-text-primary)',
                  background: 'rgba(223, 165, 29, 0.08)',
                  border: '1px solid rgba(223, 165, 29, 0.25)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  margin: 0,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{activeOrder.instructions}&rdquo;
              </p>
            </div>
          )}

          {/* Citizen Complaint Description */}
          {linkedComplaint && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--v20-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Citizen Complaint Narrative
              </span>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--v20-text-secondary)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  border: '1px solid var(--v20-glass-border)',
                  margin: 0,
                }}
              >
                {linkedComplaint.rawText || linkedComplaint.sanitizedText || linkedComplaint.factualSummary}
              </p>
            </div>
          )}

          {/* Citizen Photographic Evidence */}
          {linkedComplaint?.photoUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--v20-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Citizen Photographic Evidence (Click to inspect)
              </span>
              <div
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'zoom-in',
                  maxHeight: '280px',
                  border: '1.5px solid var(--v20-glass-border)',
                  width: 'fit-content',
                }}
                onClick={() => setLightboxImg(linkedComplaint.photoUrl || null)}
              >
                <img
                  src={linkedComplaint.photoUrl}
                  alt="Citizen evidence thumbnail"
                  style={{ maxHeight: '280px', maxWidth: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#FFFFFF',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  Inspect Fullscreen ↗
                </span>
              </div>
            </div>
          )}

          {/* Commencement Notice & Action Control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              paddingTop: '18px',
              borderTop: '1px solid var(--v20-glass-border)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--v20-text-muted)' }}>
              <Clock size={16} style={{ color: 'var(--v20-accent, #DFA51D)' }} />
              <span>Commencement countdown begins immediately upon tapping Start Working</span>
            </div>

            <button
              type="button"
              className="v19-nav-tab"
              disabled={isStarting}
              style={{
                background: 'var(--v20-accent, #DFA51D)',
                color: '#0E1017',
                fontWeight: 700,
                padding: '11px 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              }}
              onClick={() => handleStartWorkClick(activeOrder.id)}
            >
              <Play size={16} fill="currentColor" />
              <span>{isStarting ? 'Commencing Work…' : 'Start Working ↗'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unified Full-Width Parallax List with Hardware Acceleration */
        <ParallaxComplaintList
          items={parallaxItems}
          selectedId={selectedOrderId}
          onSelectItem={(item) => setSelectedOrderId(item.id)}
          emptyMessage={isLoading ? 'Loading assigned tasks…' : 'No pending unstarted tasks.'}
        />
      )}
    </div>
  );
};
