import React, { useState, useMemo } from 'react';
import { type DepartmentWorkOrder } from '../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';
import { ImageLightbox } from './ImageLightbox';
import { OfficerWorkList } from './work/OfficerWorkList';
import { OfficerWorkDetail } from './work/OfficerWorkDetail';
import { WorkResolutionForm } from './work/WorkResolutionForm';
import { WorkConfirmationModal } from './work/WorkConfirmationModal';
import { X } from 'lucide-react';

export interface OfficerWorkViewProps {
  departmentCode: string;
  orders: DepartmentWorkOrder[];
  complaints: HeadIndependentComplaintRow[];
  onSubmitCompletion: (
    orderId: string,
    evidenceFile: File,
    gps: { latitude: number; longitude: number; accuracy: number; distanceM?: number }
  ) => Promise<void>;
  onRequestMoreTime: (orderId: string, additionalHours: number, reason: string) => Promise<void>;
  onStartWork?: (orderId: string) => void | Promise<void>;
  isLoading?: boolean;
}

export const OfficerWorkView: React.FC<OfficerWorkViewProps> = ({
  departmentCode,
  orders,
  complaints,
  onSubmitCompletion,
  onRequestMoreTime,
  onStartWork,
  isLoading = false,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'resolution'>('list');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Extension Modal State
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extHours, setExtHours] = useState(24);
  const [extReason, setExtReason] = useState('');
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);

  // Confirmation Modal State
  const [confirmationData, setConfirmationData] = useState<{
    referenceNumber: string;
    orderId: string;
    submittedAt: Date;
  } | null>(null);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  const selectedComplaint = useMemo(() => {
    if (!selectedOrder) return null;
    return (
      complaints.find(
        (c) =>
          c.id === selectedOrder.anchor_complaint_id ||
          c.referenceNumber === selectedOrder.anchor_complaint_id
      ) || null
    );
  }, [selectedOrder, complaints]);

  // Navigate to detail
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setViewMode('detail');
  };

  // Back to list
  const handleBackToList = () => {
    setSelectedOrderId(null);
    setViewMode('list');
  };

  // Back to detail from resolution form
  const handleBackToDetail = () => {
    setViewMode('detail');
  };

  // Open resolution form
  const handleOpenResolution = () => {
    setViewMode('resolution');
  };

  // Submit Completion & Trigger Confirmation
  const handleSubmitCompletion = async (
    orderId: string,
    evidenceFile: File,
    gps: { latitude: number; longitude: number; accuracy: number; distanceM?: number }
  ) => {
    await onSubmitCompletion(orderId, evidenceFile, gps);

    const refNum = selectedComplaint?.referenceNumber || selectedOrder?.anchor_complaint_id || orderId;
    setConfirmationData({
      referenceNumber: refNum,
      orderId,
      submittedAt: new Date(),
    });

    setViewMode('list');
    setSelectedOrderId(null);
  };

  // Submit Extension Request
  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !extReason.trim()) return;

    setIsSubmittingExt(true);
    try {
      await onRequestMoreTime(selectedOrder.id, extHours, extReason.trim());
      setIsExtModalOpen(false);
      setExtReason('');
    } finally {
      setIsSubmittingExt(false);
    }
  };

  return (
    <div
      data-testid="v19-officer-work"
      className="v20-officer-work-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
      }}
    >
      {/* Lightbox for inspecting evidence */}
      <ImageLightbox
        imageUrl={lightboxImg}
        caption="Work evidence photograph"
        onClose={() => setLightboxImg(null)}
        watermarkText={`${departmentCode} · FIELD WORK CONSOLE`}
      />

      {/* Centered Confirmation Dialog upon successful resolution */}
      {confirmationData && (
        <WorkConfirmationModal
          isOpen={Boolean(confirmationData)}
          referenceNumber={confirmationData.referenceNumber}
          orderId={confirmationData.orderId}
          submittedAt={confirmationData.submittedAt}
          onClose={() => setConfirmationData(null)}
        />
      )}

      {/* Main Orchestrated Views */}
      {viewMode === 'list' || !selectedOrder ? (
        <OfficerWorkList
          orders={orders}
          complaints={complaints}
          onSelectOrder={handleSelectOrder}
          onStartWork={onStartWork}
          isLoading={isLoading}
        />
      ) : viewMode === 'detail' ? (
        <OfficerWorkDetail
          order={selectedOrder}
          complaint={selectedComplaint}
          onBack={handleBackToList}
          onStartWork={onStartWork}
          onOpenResolution={handleOpenResolution}
          onOpenExtension={() => setIsExtModalOpen(true)}
          onOpenLightbox={(url) => setLightboxImg(url)}
          isLoading={isLoading}
        />
      ) : (
        <WorkResolutionForm
          order={selectedOrder}
          complaint={selectedComplaint}
          onBack={handleBackToDetail}
          onSubmit={handleSubmitCompletion}
          onOpenLightbox={(url) => setLightboxImg(url)}
          isLoading={isLoading}
        />
      )}

      {/* Deadline Extension Modal */}
      {isExtModalOpen && (
        <div
          className="v19-lightbox-backdrop v20-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Request deadline extension"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              borderRadius: '20px',
              background: 'var(--v20-glass-surface, #111317)',
              border: '1px solid var(--v20-glass-border, #2A3038)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--warning, #E59B2F)',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 700 }}>Request Deadline Extension</span>
              <button
                type="button"
                className="v19-action-icon-btn"
                style={{ width: '28px', height: '28px' }}
                onClick={() => setIsExtModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitExtension}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--v20-text-muted, #7E858E)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Additional Hours Requested
                </label>
                <select
                  value={extHours}
                  onChange={(e) => setExtHours(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--v20-card-subsurface, rgba(0,0,0,0.3))',
                    border: '1px solid var(--v20-glass-border, rgba(255,255,255,0.12))',
                    color: 'var(--v20-text-primary, #F3EEE4)',
                    marginTop: '6px',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                >
                  <option value={12}>+12 hours (Minor site delay)</option>
                  <option value={24}>+24 hours (Full day extra)</option>
                  <option value={48}>+48 hours (Complex equipment required)</option>
                  <option value={72}>+72 hours (Inter-agency utility approval)</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--v20-text-muted, #7E858E)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Operational Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify why more time is needed on site..."
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'var(--v20-card-subsurface, rgba(0,0,0,0.3))',
                    border: '1px solid var(--v20-glass-border, rgba(255,255,255,0.12))',
                    color: 'var(--v20-text-primary, #F3EEE4)',
                    fontSize: '13.5px',
                    marginTop: '6px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="v19-nav-tab v20-round-btn"
                  onClick={() => setIsExtModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
                    color: 'var(--v20-text-primary, #F3EEE4)',
                    border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.12))',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExt || !extReason.trim()}
                  className="v19-nav-tab v20-pill-btn"
                  style={{
                    padding: '9px 22px',
                    borderRadius: '9999px',
                    background: 'var(--warning, #E59B2F)',
                    color: '#0E121A',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: isSubmittingExt || !extReason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingExt ? 'Submitting…' : 'Submit Extension Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
