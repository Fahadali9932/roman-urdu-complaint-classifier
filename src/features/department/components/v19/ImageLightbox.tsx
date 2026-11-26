import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ImageLightboxProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
  watermarkText?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  caption,
  onClose,
  watermarkText,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="v19-lightbox-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="High-resolution evidence photo viewer"
    >
      <button
        type="button"
        className="v19-action-icon-btn"
        style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10002 }}
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <X size={20} />
      </button>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '90vw' }}>
        <img src={imageUrl} alt={caption || 'Evidence full resolution'} className="v19-lightbox-img" />

        {/* Dynamic Watermark Stamp Overlay */}
        {watermarkText && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontFamily: 'var(--v19-font-mono)',
              pointerEvents: 'none',
              letterSpacing: '0.04em',
            }}
          >
            CONFIDENTIAL · {watermarkText}
          </div>
        )}

        {caption && (
          <div style={{ marginTop: '12px', color: 'var(--v19-text-secondary)', fontSize: '13px', textAlign: 'center' }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
