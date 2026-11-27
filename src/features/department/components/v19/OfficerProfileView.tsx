import React, { useState, useEffect, useRef } from 'react';
import { User, KeyRound, LogOut, Camera, Check, AlertCircle } from 'lucide-react';
import { fieldOperations, type OfficerProfileDetails } from '../../services/fieldOperations';
import { useDepartmentAuth } from '../../../../context/DepartmentAuthContext';

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
  const auth = useDepartmentAuth();
  const session = auth?.session;
  const updateDisplayName = auth?.updateDisplayName;

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profileDetails, setProfileDetails] = useState<OfficerProfileDetails | null>(null);

  // Load authoritative personnel file
  useEffect(() => {
    const uid = session?.userId || staffUsername;
    if (uid) {
      fieldOperations.fetchOfficerProfile(uid).then((prof) => {
        if (prof) setProfileDetails(prof);
      }).catch(() => null);
    }
  }, [session?.userId, staffUsername]);

  // Editable Display Name State
  const initialName = session?.displayName !== undefined ? session.displayName : (officerName || staffUsername);
  const [displayNameInput, setDisplayNameInput] = useState(initialName);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Centered "Coming soon" modal state
  const [showComingSoon, setShowComingSoon] = useState(false);
  const lastActiveTriggerRef = useRef<HTMLButtonElement | null>(null);
  const okayButtonRef = useRef<HTMLButtonElement | null>(null);

  // Keep input synchronized if session changes externally
  useEffect(() => {
    if (session?.displayName !== undefined) {
      setDisplayNameInput(session.displayName);
    }
  }, [session?.displayName]);

  // Focus management for Coming soon modal
  useEffect(() => {
    if (showComingSoon) {
      okayButtonRef.current?.focus();

      const handleModalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          setShowComingSoon(false);
          lastActiveTriggerRef.current?.focus();
        }
      };

      window.addEventListener('keydown', handleModalKeyDown);
      return () => window.removeEventListener('keydown', handleModalKeyDown);
    }
  }, [showComingSoon]);

  const handleOpenComingSoon = (triggerElement?: HTMLButtonElement | null) => {
    if (triggerElement) {
      lastActiveTriggerRef.current = triggerElement;
    }
    setShowComingSoon(true);
    if (onOpenPasswordModal) {
      onOpenPasswordModal();
    }
  };

  const handleCloseComingSoon = () => {
    setShowComingSoon(false);
    lastActiveTriggerRef.current?.focus();
  };

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

  const currentEffectiveName = session?.displayName || officerName || staffUsername;

  return (
    <div
      data-testid="v19-officer-profile"
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
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--v20-text-primary, #F0ECE3)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          My profile
        </h1>
      </div>

      {/* 1. Identity Header Card with Large 80px Avatar */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '32px',
          borderRadius: '26px',
          background: 'var(--v20-glass-surface)',
          border: '1px solid var(--v20-glass-border)',
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
              <img src={photoUrl} alt="Officer Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentEffectiveName[0]?.toUpperCase() || 'O'
            )}
          </div>
          <label
            htmlFor="officer-photo-upload"
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
              border: '2px solid var(--v20-glass-surface)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <Camera size={14} />
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
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0, letterSpacing: '-0.02em' }}>
            {currentEffectiveName}
          </h2>
          <div style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
            Field Officer · {departmentName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '3px', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
            Officer Operations · {employeeId ? `ID: ${employeeId} · ` : ''}{departmentCode}
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
          background: 'var(--v20-glass-surface)',
          border: '1px solid var(--v20-glass-border)',
        }}
      >
        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Display name
          </span>
          <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
            The name displayed on the Landing page greeting and across fieldwork operations.
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

      {/* Official Personnel File Card */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '28px',
          borderRadius: '26px',
          background: 'var(--v20-glass-surface)',
          border: '1px solid var(--v20-glass-border)',
        }}
        data-testid="officer-personnel-file-card"
      >
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Official personnel file
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Official Email</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '2px' }}>
              {profileDetails?.official_email || session?.email || `${staffUsername}@${departmentCode.toLowerCase()}.gos.pk`}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Contact Phone</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '2px' }}>
              {profileDetails?.phone_masked || '0300-***-001'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Service Since</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '2px' }}>
              {profileDetails?.created_at ? new Date(profileDetails.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Nov 2026'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Assigned Department</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '2px' }}>
              {departmentName} ({departmentCode})
            </div>
          </div>
        </div>
      </div>

      {/* 3. Simplified Account Settings Card (Exactly Two Options + Sign Out) */}
      <div
        className="v19-glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '28px',
          borderRadius: '26px',
          background: 'var(--v20-glass-surface)',
          border: '1px solid var(--v20-glass-border)',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Account settings
        </span>

        {/* Option 1: Change Username */}
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
            <User size={18} style={{ color: '#4E9CFF' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Change username
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Update individual operational access username
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
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--v20-text-primary, #F0ECE3)',
              cursor: 'pointer',
            }}
            onClick={(e) => handleOpenComingSoon(e.currentTarget)}
            data-testid="officer-change-username-btn"
          >
            Change ↗
          </button>
        </div>

        {/* Option 2: Change Password */}
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
                Change password
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Update individual operational access credentials
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
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--v20-text-primary, #F0ECE3)',
              cursor: 'pointer',
            }}
            onClick={(e) => handleOpenComingSoon(e.currentTarget)}
            data-testid="officer-change-password-btn"
          >
            Change ↗
          </button>
        </div>

        {/* Option 3: Sign Out */}
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
                Sign out
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Securely sign out of this device
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
            data-testid="officer-signout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Centered Coming Soon Modal Dialog */}
      {showComingSoon && (
        <div
          className="v19-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="officer-coming-soon-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={handleCloseComingSoon}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '32px',
              borderRadius: '24px',
              background: 'rgba(22, 19, 15, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="officer-coming-soon-title"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--v20-text-primary, #F0ECE3)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Coming soon
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--v20-text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This feature will be added soon.
            </p>
            <button
              ref={okayButtonRef}
              type="button"
              className="v20-landing-btn v20-landing-btn-primary"
              style={{
                marginTop: '10px',
                padding: '10px 36px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: 650,
                cursor: 'pointer',
                background: 'var(--button-primary, #F0ECE3)',
                color: '#101216',
                border: 'none',
              }}
              onClick={handleCloseComingSoon}
              data-testid="coming-soon-okay-btn"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
