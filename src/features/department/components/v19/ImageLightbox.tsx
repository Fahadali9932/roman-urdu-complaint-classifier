import React, { useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

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
  const [isConcealed, setIsConcealed] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19));

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Deterrence & Background Concealment on window blur or tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsConcealed(document.visibilityState === 'hidden');
    };
    const handleBlur = () => {
      setIsConcealed(true);
    };
    const handleFocus = () => {
      setIsConcealed(false);
      setCurrentTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 19));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
          <img
            src={imageUrl}
            alt={caption || 'Evidence full resolution'}
            className="v19-lightbox-img"
            style={{
              filter: isConcealed ? 'blur(32px) brightness(0.4)' : 'none',
              transition: 'filter 180ms ease',
              display: 'block',
            }}
          />

          {/* Privacy concealment shield overlay when window/tab unfocused */}
          {isConcealed && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#FFFFFF',
                textAlign: 'center',
                padding: '24px',
                zIndex: 10,
              }}
            >
              <ShieldAlert size={36} style={{ color: '#E59B2F' }} />
              <div style={{ fontSize: '15px', fontWeight: 650 }}>
                Sensitive Evidence Concealed
              </div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '340px' }}>
                Application is out of focus to deter unauthorized screen capture and data leaks. Click window to resume viewing.
              </div>
            </div>
          )}

          {/* Dynamic Watermark Stamp Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontFamily: 'var(--v19-font-mono, monospace)',
              pointerEvents: 'none',
              letterSpacing: '0.04em',
              zIndex: 5,
            }}
          >
            CONFIDENTIAL · SENSITIVE EVIDENCE · {watermarkText ? `${watermarkText} · ` : ''}{currentTimestamp}
          </div>
        </div>

        {caption && (
          <div style={{ marginTop: '12px', color: 'var(--v19-text-secondary)', fontSize: '13px', textAlign: 'center' }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
