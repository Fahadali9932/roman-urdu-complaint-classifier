import React from 'react';
import type { IncidentCaseSummary, BulkAcceptPreview } from '../../../types';
import { X, Check, Loader2 } from 'lucide-react';

interface BulkAcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: IncidentCaseSummary;
  preview: BulkAcceptPreview;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export const BulkAcceptModal: React.FC<BulkAcceptModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  preview,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const skipped = preview.totalLinked - preview.eligible;

  return (
    <div className="modal-shade" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acceptTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <h2 id="acceptTitle">Accept eligible reports?</h2>
          <button
            type="button"
            className="icon-btn"
            data-action="close-modal"
            onClick={onClose}
            aria-label="Close confirmation"
          >
            <X className="ico" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <p>This is one acknowledgement action for original reports linked to:</p>
        <p>
          <strong>{caseItem.title}</strong>
          <br />
          {caseItem.publicPlace}, {caseItem.locality}
        </p>

        <div className="notice">
          <strong>{preview.eligible} reports will be accepted.</strong>
          <br />
          {skipped > 0
            ? `${skipped} reports are not awaiting acceptance and will stay unchanged.`
            : 'All linked reports are awaiting acceptance.'}
          <br />
          This does <strong>not</strong> mark any municipal repair complete.
        </div>

        <p className="hint">
          This executes an atomic, permission-checked server transaction. Each
          citizen's tracking timeline and history will be updated independently.
        </p>

        <div className="modal-foot">
          <button
            type="button"
            className="button"
            data-action="close-modal"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            data-action="confirm-accept"
            disabled={preview.eligible === 0 || isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ico animate-spin" style={{ width: 16, height: 16 }} />
                Accepting...
              </>
            ) : (
              <>
                <Check className="ico" style={{ width: 16, height: 16 }} />
                Confirm acceptance ({preview.eligible})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
