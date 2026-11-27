import React, { useState } from 'react';
import { KeyRound, LogOut, Building2, Smartphone, Camera } from 'lucide-react';
import { fieldOperations } from '../../services/fieldOperations';

export interface OfficerProfileViewProps {
  departmentCode: string;
  departmentName: string;
  officerName: string;
  employeeId?: string;
  staffUsername: string;
  onSignOut: () => void;
  onOpenPasswordModal?: () => void;
}

export const OfficerProfileView: React.FC<OfficerProfileViewProps> = ({
  departmentCode,
  departmentName,
  officerName,
  employeeId,
  staffUsername,
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
        await fieldOperations.uploadProfilePhoto(staffUsername, file);
        let preview = '';
        try {
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            preview = URL.createObjectURL(file);
          } else {
            preview = 'blob:officer-photo';
          }
        } catch {
          preview = 'blob:officer-photo';
        }
        setPhotoUrl(preview);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div data-testid="v19-officer-profile" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Officer Identity Card */}
      <div className="v19-glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--v20-accent-soft, rgba(223, 165, 29, 0.16))',
              border: '2px solid var(--v20-accent, #DFA51D)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v20-accent, #DFA51D)',
              fontSize: '24px',
              fontWeight: 700,
              overflow: 'hidden',
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Officer Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              officerName[0]?.toUpperCase() || 'O'
            )}
          </div>
          <label
            htmlFor="officer-photo-upload"
            title="Upload profile photograph"
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--v20-accent, #DFA51D)',
              color: '#0E121A',
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
            id="officer-photo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
            disabled={isUploading}
          />
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v20-text-primary)', margin: 0 }}>
            {officerName}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
            Field Officer · {departmentName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--v20-accent)', marginTop: '2px', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
            Officer Operations · {employeeId ? `ID: ${employeeId} · ` : ''}{departmentCode}
          </div>
        </div>
      </div>

      {/* Security & Operational Controls */}
      <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>
          Credentials &amp; Jurisdiction
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v20-glass-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <KeyRound size={18} style={{ color: 'var(--v20-accent)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>Officer Passphrase</div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Update individual operational access credentials</div>
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
            <Building2 size={18} style={{ color: 'var(--v20-accent)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>Assigned Department</div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>{departmentName} ({departmentCode})</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v20-glass-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Smartphone size={18} style={{ color: 'var(--v20-accent-light)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>Mobile Field Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)' }}>Work console, camera capture, and 30m GPS authorized</div>
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
            <span>Sign Out of Fieldwork Desk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
