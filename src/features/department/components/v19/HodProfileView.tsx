import React, { useState } from 'react';
import { KeyRound, LogOut, Building2, Camera } from 'lucide-react';
import { fieldOperations } from '../../services/fieldOperations';

export interface HodProfileViewProps {
  departmentCode: string;
  departmentName: string;
  username: string;
  onSignOut: () => void;
  onOpenPasswordModal?: () => void;
}

export const HodProfileView: React.FC<HodProfileViewProps> = ({
  departmentCode,
  departmentName,
  username,
  onSignOut,
  onOpenPasswordModal,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        await fieldOperations.uploadProfilePhoto(username, file);
        let preview = '';
        try {
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            preview = URL.createObjectURL(file);
          } else {
            preview = 'blob:profile-photo';
          }
        } catch {
          preview = 'blob:profile-photo';
        }
        setPhotoUrl(preview);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div data-testid="v19-hod-profile" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="v19-glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v20-text-primary)',
              fontSize: '24px',
              fontWeight: 700,
              overflow: 'hidden',
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="HOD Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              username[0]?.toUpperCase() || 'H'
            )}
          </div>
          <label
            htmlFor="hod-photo-upload"
            title="Upload profile photograph"
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--button-primary, #F0ECE3)',
              color: '#101216',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid var(--v20-bg-base, #140D03)',
            }}
          >
            <Camera size={12} />
          </label>
          <input
            id="hod-photo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
            disabled={isUploading}
          />
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v20-text-primary)', margin: 0 }}>
            {username}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
            Department Head · {departmentName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #A6AEB8)', marginTop: '2px', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
            Operational Command · {departmentCode}
          </div>
        </div>
      </div>

      <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>
          Security &amp; Session Controls
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v20-glass-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <KeyRound size={18} style={{ color: 'var(--info, #4E9CFF)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>Account Passphrase</div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Update individual staff password</div>
            </div>
          </div>
          {onOpenPasswordModal && (
            <button type="button" className="v19-nav-tab" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={onOpenPasswordModal}>
              Change ↗
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v20-glass-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={18} style={{ color: 'var(--info, #4E9CFF)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>Department Jurisdiction</div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>{departmentName} ({departmentCode})</div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--v19-glass-border)' }}>
          <button
            type="button"
            className="v19-nav-tab"
            style={{ color: 'var(--v19-red)', background: 'var(--v19-red-soft)', width: '100%', justifyContent: 'center', padding: '10px' }}
            onClick={onSignOut}
          >
            <LogOut size={16} style={{ marginRight: '6px' }} />
            <span>Sign Out of Operational Desk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
