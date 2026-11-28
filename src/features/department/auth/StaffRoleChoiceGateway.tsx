import React from 'react';
import { Link } from 'react-router-dom';
import { AwaazLogo } from '../../../components/common/AwaazLogo';
import { ArrowRight, ArrowLeft, Sun, Moon, Shield, Compass } from 'lucide-react';
import { useCivicTheme } from '../hooks/useCivicTheme';
import '../v20-atmospheric.css';

export const StaffRoleChoiceGateway: React.FC = () => {
  const { theme: themeMode, toggleTheme } = useCivicTheme();
  const isLight = themeMode === 'light';

  return (
    <div
      className={`v20-portal-root ${isLight ? 'v20-light-mode' : ''}`}
      data-dept="selection"
      data-theme={themeMode}
      data-testid="staff-role-choice-page"
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        padding: '24px 20px 48px',
      }}
    >
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* Top Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '920px',
          margin: '0 auto 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: isLight ? '#171717' : '#F2EFE9',
            fontWeight: 750,
            fontSize: '17px',
            letterSpacing: '-0.02em',
          }}
        >
          <AwaazLogo size={28} />
          <span>Awaaz-e-Awam</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: '9999px',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <ArrowLeft size={14} />
            <span>Homepage</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            data-testid="role-choice-theme-toggle"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isLight ? '#171717' : '#F2EFE9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Choice Body */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '920px',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '640px', marginBottom: '40px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.65)',
              marginBottom: '10px',
            }}
          >
            MUNICIPAL OPERATIONS · SEPARATE ACCESS
          </span>

          <h1
            style={{
              fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
              fontSize: 'clamp(44px, 5.5vw, 84px)',
              fontWeight: 750,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: '0 0 14px 0',
              color: isLight ? '#171717' : '#F8F2E8',
              textShadow: isLight ? 'none' : '0 4px 30px rgba(0, 0, 0, 0.45)',
            }}
          >
            Staff access.
          </h1>

          <p
            style={{
              fontSize: '16px',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              margin: 0,
            }}
          >
            Select your assigned role to proceed to department selection and authentication.
          </p>
        </div>

        {/* Two Role Cards */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1: Department Head */}
          <Link
            to="/department/head/login"
            data-testid="role-card-head"
            style={{
              textDecoration: 'none',
              padding: '36px 32px',
              borderRadius: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '220px',
              background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(20, 24, 32, 0.85)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: isLight
                ? '0 12px 32px rgba(0, 0, 0, 0.06)'
                : '0 16px 40px rgba(0, 0, 0, 0.4)',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isLight ? '#171717' : '#F2EFE9',
                  marginBottom: '20px',
                }}
              >
                <Shield size={22} />
              </div>
              <h2
                style={{
                  fontFamily: 'var(--v20-font-display, "Inter", sans-serif)',
                  fontSize: '24px',
                  fontWeight: 750,
                  letterSpacing: '-0.02em',
                  margin: '0 0 8px 0',
                  color: isLight ? '#171717' : '#FFFFFF',
                }}
              >
                Department Head
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
                  margin: 0,
                }}
              >
                Desk triage, priority incident assignment, personnel administration, and resolution verification.
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '24px',
                fontSize: '14px',
                fontWeight: 650,
                color: isLight ? '#171717' : '#F2EFE9',
              }}
            >
              <span>Continue to HOD portal</span>
              <ArrowRight size={16} />
            </div>
          </Link>

          {/* Card 2: Field Officer */}
          <Link
            to="/department/officer/login"
            data-testid="role-card-officer"
            style={{
              textDecoration: 'none',
              padding: '36px 32px',
              borderRadius: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '220px',
              background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(20, 24, 32, 0.85)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: isLight
                ? '0 12px 32px rgba(0, 0, 0, 0.06)'
                : '0 16px 40px rgba(0, 0, 0, 0.4)',
              transition: 'transform 200ms ease, border-color 200ms ease',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isLight ? '#171717' : '#F2EFE9',
                  marginBottom: '20px',
                }}
              >
                <Compass size={22} />
              </div>
              <h2
                style={{
                  fontFamily: 'var(--v20-font-display, "Inter", sans-serif)',
                  fontSize: '24px',
                  fontWeight: 750,
                  letterSpacing: '-0.02em',
                  margin: '0 0 8px 0',
                  color: isLight ? '#171717' : '#FFFFFF',
                }}
              >
                Field Officer
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
                  margin: 0,
                }}
              >
                Assigned fieldwork tasks, on-site GPS proximity verification, and photo resolution submission.
              </p>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '24px',
                fontSize: '14px',
                fontWeight: 650,
                color: isLight ? '#171717' : '#F2EFE9',
              }}
            >
              <span>Continue to Officer portal</span>
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
};
export default StaffRoleChoiceGateway;
