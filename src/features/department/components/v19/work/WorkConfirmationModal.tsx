import React from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export interface WorkConfirmationModalProps {
  isOpen: boolean;
  referenceNumber: string;
  orderId: string;
  submittedAt?: Date | string;
  onClose: () => void;
}

export const WorkConfirmationModal: React.FC<WorkConfirmationModalProps> = ({
  isOpen,
  referenceNumber,
  orderId,
  submittedAt = new Date(),
  onClose,
}) => {
  if (!isOpen) return null;

  const formattedTime = new Date(submittedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className="v19-lightbox-backdrop v20-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Submitted for verification confirmation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
      }}
    >
      <div
        className="v19-glass-card v20-confirmation-dialog"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          borderRadius: '24px',
          background: 'var(--v20-glass-surface, #111317)',
          border: '1px solid var(--v20-glass-border, #2A3038)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(59, 201, 119, 0.14)',
            border: '2px solid var(--success, #3BC977)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success, #3BC977)',
          }}
        >
          <CheckCircle2 size={34} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--v20-text-primary, #F3EEE4)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Submitted for verification
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--v20-text-secondary, #A6AEB8)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Your completed work has been submitted to the Head of Department for review.
          </p>
        </div>

        {/* Details Card */}
        <div
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.25))',
            border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--v20-text-muted, #7E858E)' }}>Complaint Reference</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--v20-text-primary, #F3EEE4)',
                fontFamily: 'var(--v20-font-number, monospace)',
              }}
            >
              REF #{referenceNumber}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--v20-text-muted, #7E858E)' }}>Work Order</span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--v20-text-secondary, #A6AEB8)',
                fontFamily: 'var(--v20-font-number, monospace)',
              }}
            >
              #{orderId}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--v20-text-muted, #7E858E)' }}>Submission Time</span>
            <span style={{ fontSize: '12px', color: 'var(--v20-text-secondary, #A6AEB8)' }}>{formattedTime}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--v20-text-muted, #7E858E)' }}>Review Status</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--info, #4E9CFF)',
                background: 'rgba(78, 156, 255, 0.12)',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid rgba(78, 156, 255, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Awaiting Verification
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClose}
          className="v19-nav-tab v20-pill-btn"
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: '9999px',
            background: 'var(--button-primary, #F0ECE3)',
            color: 'var(--button-primary-text, #101216)',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            marginTop: '4px',
          }}
          data-testid="v21-8-back-to-work-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to my work</span>
        </button>
      </div>
    </div>
  );
};
