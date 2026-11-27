import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, ArrowLeft, ArrowRight, LogOut, Briefcase } from 'lucide-react';

export interface DesktopRequiredScreenProps {
  portalType?: 'department' | 'admin';
  departmentCode?: string;
  departmentName?: string;
  role?: 'head' | 'officer' | 'admin';
  isAuthenticated?: boolean;
  onSignOut?: () => void;
  onNavigateToWork?: () => void;
}

/**
 * AWAAZ-E-AWAM — V21.7 Desktop-First Access Restriction Screen
 *
 * Designed as a clean, intentional part of the Awaaz-e-Awam civic platform:
 * - Replaces unsupported desktop management layouts completely.
 * - Prevents mounting of complex desktop navbar, cursor spotlight, or scroll controllers.
 * - Department atmospheric gradient for staff portals; platinum/slate dark aesthetic for Central Admin.
 * - Responsive down to 320px with generous negative space and zero horizontal overflow.
 */
export const DesktopRequiredScreen: React.FC<DesktopRequiredScreenProps> = ({
  portalType = 'department',
  departmentCode = 'KMC',
  departmentName = 'Karachi Metropolitan Corporation',
  role = 'head',
  isAuthenticated = false,
  onSignOut,
  onNavigateToWork,
}) => {
  const navigate = useNavigate();
  const isAdmin = portalType === 'admin' || role === 'admin';
  const isOfficer = role === 'officer';

  return (
    <div
      className={`v20-desktop-restriction-root ${isAdmin ? 'v20-admin-restriction' : ''}`}
      data-testid="v20-desktop-required-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        backgroundColor: isAdmin ? '#0F1218' : 'var(--v20-bg-base, #0D0A08)',
        color: 'var(--v20-text-primary, #F4EFE5)',
        fontFamily: 'var(--v20-font-body, "Inter", sans-serif)',
      }}
    >
      {/* 1. Atmospheric Gradient Background */}
      {!isAdmin && (
        <div
          className="v20-atmospheric-background"
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />
      )}

      {/* 2. Centered Content Container with Generous Negative Space */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          margin: 'auto 0',
        }}
      >
        {/* Simple Desktop Monitor Icon */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: isAdmin
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.06)',
            border: isAdmin
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAdmin ? '#94A3B8' : 'var(--v20-accent, #F0ECE3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            marginBottom: '4px',
          }}
        >
          <Monitor size={40} strokeWidth={1.5} />
        </div>

        {/* Brand & Context Identifier */}
        <div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isAdmin ? '#94A3B8' : 'var(--v20-text-muted, rgba(244, 239, 229, 0.6))',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            AWAAZ-E-AWAM
          </span>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: isAdmin ? '#CBD5E1' : 'var(--v20-text-secondary, rgba(244, 239, 229, 0.8))',
            }}
            title={departmentName}
          >
            {isAdmin
              ? 'CENTRAL ADMINISTRATOR WORKSPACE'
              : `${departmentCode.toUpperCase()} / ${role === 'head' ? 'OPERATIONAL DESK' : 'FIELD OPERATIONS'}`}
          </span>
        </div>

        {/* Exact Content Heading & Supporting Text */}
        <div style={{ margin: '4px 0' }}>
          <h1
            style={{
              fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--v20-text-primary, #FFFFFF)',
              margin: '0 0 10px 0',
              lineHeight: 1.2,
            }}
          >
            Desktop access required.
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--v20-text-secondary, rgba(244, 239, 229, 0.72))',
              maxWidth: '360px',
              margin: '0 auto',
            }}
          >
            Please open this portal on a desktop or laptop to continue.
          </p>
        </div>

        {/* Restrained Action Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '300px',
            marginTop: '8px',
          }}
        >
          {/* Authenticated Officer Exclusive: Open Fieldwork Console */}
          {isOfficer && onNavigateToWork && (
            <button
              type="button"
              className="v20-restriction-btn v20-restriction-btn-accent"
              onClick={onNavigateToWork}
              data-testid="v20-restriction-fieldwork-btn"
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: 650,
                border: 'none',
                background: 'var(--v20-accent, #F0ECE3)',
                color: '#101216',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                transition: 'transform 180ms ease, opacity 180ms ease',
              }}
            >
              <Briefcase size={16} />
              <span>Open fieldwork</span>
              <ArrowRight size={15} />
            </button>
          )}

          {/* Primary Action: Return to Homepage */}
          <button
            type="button"
            className="v20-restriction-btn v20-restriction-btn-primary"
            onClick={() => navigate('/')}
            data-testid="v20-restriction-home-btn"
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '9999px',
              fontSize: '13.5px',
              fontWeight: isOfficer ? 500 : 650,
              border: isOfficer
                ? '1px solid rgba(255, 255, 255, 0.16)'
                : 'none',
              background: isOfficer
                ? 'rgba(255, 255, 255, 0.06)'
                : 'var(--v20-accent, #F0ECE3)',
              color: isOfficer ? 'var(--v20-text-primary, #FFFFFF)' : '#101216',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'background 180ms ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to homepage</span>
          </button>

          {/* Authenticated User Sign Out Action */}
          {isAuthenticated && onSignOut && (
            <button
              type="button"
              className="v20-restriction-btn v20-restriction-btn-secondary"
              onClick={onSignOut}
              data-testid="v20-restriction-signout-btn"
              style={{
                width: '100%',
                padding: '11px 20px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'transparent',
                color: 'var(--v20-text-muted, rgba(244, 239, 229, 0.65))',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'color 180ms ease, border-color 180ms ease',
              }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
