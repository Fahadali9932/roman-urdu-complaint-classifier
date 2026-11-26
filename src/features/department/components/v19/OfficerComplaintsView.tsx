import React, { useState, useMemo } from 'react';
import { type DepartmentWorkOrder } from '../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';
import { ImageLightbox } from './ImageLightbox';
import { MapPin, Play, Clock, CheckCircle2, X } from 'lucide-react';

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

  // Filter only assigned, not-started work orders
  const assignedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'assigned' && !o.started_at);
  }, [orders]);

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
    <div data-testid="v19-officer-complaints" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Lightbox for citizen evidence */}
      <ImageLightbox
        imageUrl={lightboxImg}
        caption="Citizen photographic report"
        onClose={() => setLightboxImg(null)}
        watermarkText={`${departmentCode} · FIELD OFFICER ASSIGNMENT`}
      />

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v19-text-primary)' }}>
          Assigned Tasks (Pending Start)
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--v19-text-muted)', margin: '4px 0 0' }}>
          Work orders dispatched by Department Head. Review details and click Start Working to begin fieldwork countdown.
        </p>
      </div>

      {assignedOrders.length === 0 ? (
        <div className="v19-glass-card" style={{ padding: '64px', textAlign: 'center', color: 'var(--v19-text-muted)' }}>
          <CheckCircle2 size={36} style={{ color: 'var(--v19-green)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v19-text-primary)', margin: '0 0 6px' }}>
            No Pending Unstarted Tasks
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {isLoading ? 'Loading your assigned tasks…' : 'All your assigned work orders have been started or completed.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: activeOrder ? '1fr 1.25fr' : '1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Assigned Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignedOrders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const complaint = complaints.find((c) => c.id === order.anchor_complaint_id);

              return (
                <div
                  key={order.id}
                  className={`v19-glass-card v19-parallax-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedOrderId(order.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderColor: isSelected ? 'var(--v19-lime)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-lime)', fontFamily: 'var(--v19-font-mono)' }}>
                        ORDER #{order.id.slice(0, 8)}
                      </span>
                      {complaint?.priority && (
                        <span className={`v19-priority-square ${complaint.priority.toLowerCase()}`} style={{ width: '18px', height: '18px', fontSize: '9px' }}>
                          {complaint.priority[0]}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                      {order.case_label}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)' }}>
                      {complaint ? `${complaint.publicPlace || 'Location'}, ${complaint.locality || ''}` : 'Location specified in order'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', background: 'var(--v19-amber-soft)', color: 'var(--v19-amber)' }}>
                      Not Started
                    </span>
                    <span style={{ fontSize: '16px', color: 'var(--v19-text-muted)' }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Order Detail & Start Working Action */}
          {activeOrder && (
            <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'sticky', top: '90px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--v19-glass-border)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-lime)', fontFamily: 'var(--v19-font-mono)' }}>
                  ORDER #{activeOrder.id.slice(0, 8)} · ASSIGNED
                </span>
                <button type="button" className="v19-action-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setSelectedOrderId(null)}>
                  <X size={14} />
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v19-text-primary)', margin: 0 }}>
                  {activeOrder.case_label}
                </h3>
              </div>

              {/* Location info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--v19-glass-border)' }}>
                <MapPin size={18} style={{ color: 'var(--v19-cyan)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                    {linkedComplaint?.publicPlace || 'Location unspecified'}
                    {linkedComplaint?.locality ? `, ${linkedComplaint.locality}` : ''}
                  </div>
                  {linkedComplaint?.latitude && linkedComplaint?.longitude && (
                    <div style={{ fontSize: '11.5px', color: 'var(--v19-text-muted)', marginTop: '2px', fontFamily: 'var(--v19-font-mono)' }}>
                      GPS: {linkedComplaint.latitude.toFixed(5)}, {linkedComplaint.longitude.toFixed(5)} ·{' '}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${linkedComplaint.latitude},${linkedComplaint.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--v19-blue)', textDecoration: 'none' }}
                      >
                        Open Directions ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions from HOD */}
              {activeOrder.instructions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                    Supervisor Instructions
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--v19-text-secondary)', background: 'var(--v19-glass-subtle)', padding: '10px 12px', borderRadius: '8px', margin: 0, fontStyle: 'italic' }}>
                    &ldquo;{activeOrder.instructions}&rdquo;
                  </p>
                </div>
              )}

              {/* Citizen narrative */}
              {linkedComplaint && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                    Citizen Complaint Summary
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--v19-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {linkedComplaint.rawText || linkedComplaint.sanitizedText || linkedComplaint.factualSummary}
                  </p>
                </div>
              )}

              {/* Citizen photo if available */}
              {linkedComplaint?.photoUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                    Citizen Attached Photo
                  </span>
                  <div
                    style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '120px', cursor: 'zoom-in', border: '1px solid var(--v19-glass-border)' }}
                    onClick={() => setLightboxImg(linkedComplaint.photoUrl || null)}
                  >
                    <img src={linkedComplaint.photoUrl} alt="Citizen evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              )}

              {/* Duration & Start Working Action */}
              <div style={{ borderTop: '1px solid var(--v19-glass-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--v19-text-muted)' }}>
                  <Clock size={14} style={{ color: 'var(--v19-amber)' }} />
                  <span>Commencement countdown begins when you tap Start</span>
                </div>

                <button
                  type="button"
                  className="v19-nav-tab"
                  disabled={isStarting}
                  style={{
                    background: 'var(--v19-lime)',
                    color: '#0E121A',
                    fontWeight: 700,
                    padding: '10px 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 14px var(--v19-lime-soft)',
                  }}
                  onClick={() => handleStartWorkClick(activeOrder.id)}
                >
                  <Play size={16} fill="currentColor" />
                  <span>{isStarting ? 'Commencing…' : 'Start Working'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
