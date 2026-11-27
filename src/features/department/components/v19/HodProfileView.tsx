import React, { useState, useEffect } from 'react';
import { KeyRound, LogOut, Building2, Camera, Check, AlertCircle } from 'lucide-react';
import { fieldOperations } from '../../services/fieldOperations';
import { useDepartmentAuth } from '../../../../context/DepartmentAuthContext';

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
  const auth = useDepartmentAuth();
  const session = auth?.session;
  const updateDisplayName = auth?.updateDisplayName;

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Editable Display Name State
  const initialName = session?.displayName !== undefined ? session.displayName : username;
  const [displayNameInput, setDisplayNameInput] = useState(initialName);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Keep input synchronized if session changes externally
  useEffect(() => {
    if (session?.displayName !== undefined) {
      setDisplayNameInput(session.displayName);
    }
  }, [session?.displayName]);

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

  const handleSaveDisplayName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!updateDisplayName) return;

    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      const res = await updateDisplayName(displayNameInput);
      if (res.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
        setSaveErrorMessage(res.error || 'Failed to update display name.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const currentEffectiveName = session?.displayName || username;

  return (
    <div
      data-testid="v19-hod-profile"
      className="v20-profile-container"
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* 1. Identity Header Card with Large 80px Avatar */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '32px',
          borderRadius: '26px',
          background: 'rgba(18, 15, 12, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '2px solid rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v20-text-primary, #F0ECE3)',
              fontSize: '32px',
              fontWeight: 700,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="HOD Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentEffectiveName[0]?.toUpperCase() || 'H'
            )}
          </div>
          <label
            htmlFor="hod-photo-upload"
            title="Upload profile photograph"
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--button-primary, #F0ECE3)',
              color: '#101216',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid rgba(18, 15, 12, 0.95)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <Camera size={14} />
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
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0, letterSpacing: '-0.02em' }}>
            {currentEffectiveName}
          </h2>
          <div style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
            Department Head · {departmentName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '3px', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
            Operational Command · {departmentCode}
          </div>
        </div>
      </div>

      {/* 2. Editable Display Name Card with Live Landing Synchronization */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '28px',
          borderRadius: '26px',
          background: 'rgba(18, 15, 12, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Display Name
          </span>
          <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
            The name displayed on the Landing page greeting and throughout departmental communications.
          </p>
        </div>

        <form onSubmit={handleSaveDisplayName} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => {
                setDisplayNameInput(e.target.value);
                if (saveStatus !== 'idle') setSaveStatus('idle');
              }}
              placeholder="Enter your display name (or leave empty for default Admin)..."
              maxLength={50}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.35)',
                border: saveStatus === 'error' ? '1px solid #EF5350' : '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--v20-text-primary, #F0ECE3)',
                fontSize: '14px',
                outline: 'none',
              }}
              data-testid="v20-display-name-input"
            />

            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="v20-landing-btn v20-landing-btn-primary"
              style={{
                padding: '11px 22px',
                fontSize: '13px',
                fontWeight: 650,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
              }}
              data-testid="v20-save-display-name-btn"
            >
              {saveStatus === 'saving' && <span>Saving...</span>}
              {saveStatus === 'saved' && (
                <>
                  <Check size={14} />
                  <span>Saved ✓</span>
                </>
              )}
              {saveStatus === 'error' && <span>Retry</span>}
              {saveStatus === 'idle' && <span>Save changes</span>}
            </button>
          </div>

          {saveErrorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF5350', fontSize: '12px' }}>
              <AlertCircle size={14} />
              <span>{saveErrorMessage}</span>
            </div>
          )}

          <div style={{ fontSize: '11.5px', color: 'var(--v20-text-muted)' }}>
            Leaving the display name empty cleanly restores the approved &ldquo;Admin&rdquo; greeting on the Landing page without granting extra privileges.
          </div>
        </form>
      </div>

      {/* 3. Account Settings & Session Controls (Strictly Honest Controls) */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '28px',
          borderRadius: '26px',
          background: 'rgba(18, 15, 12, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Account &amp; Security Controls
        </span>

        {/* Change Password */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <KeyRound size={18} style={{ color: '#4E9CFF' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Account Passphrase
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Update your departmental login password
              </div>
            </div>
          </div>
          {onOpenPasswordModal && (
            <button
              type="button"
              className="v19-nav-tab"
              style={{
                padding: '6px 16px',
                fontSize: '12.5px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--v20-text-primary, #F0ECE3)',
                cursor: 'pointer',
              }}
              onClick={onOpenPasswordModal}
            >
              Change ↗
            </button>
          )}
        </div>

        {/* Read-Only Department Jurisdiction */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Building2 size={18} style={{ color: '#66BB6A' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Authorized Department
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                {departmentName} ({departmentCode})
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--v20-text-muted)', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.05)' }}>
            Read-only
          </span>
        </div>

        {/* Sign Out */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LogOut size={18} style={{ color: '#EF5350' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                End Operational Session
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Securely sign out of this workstation
              </div>
            </div>
          </div>
          <button
            type="button"
            className="v19-nav-tab"
            style={{
              padding: '6px 16px',
              fontSize: '12.5px',
              borderRadius: '9999px',
              color: '#EF5350',
              background: 'rgba(239, 83, 80, 0.12)',
              border: '1px solid rgba(239, 83, 80, 0.3)',
              cursor: 'pointer',
              fontWeight: 650,
            }}
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
