import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Sun, Moon, ShieldAlert } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useCivicTheme, useDepartmentAtmosphereEffect } from '../hooks/useCivicTheme';
import {
  type AuthorizedDepartmentKey,
  type StaffDepartmentKey,
  canonicalizeDepartmentKey,
  DEPARTMENT_ATMOSPHERES,
  STAFF_DEPARTMENTS,
} from '../services/departmentThemes';
import { StaffDepartmentSelection } from './StaffDepartmentSelection';
import { fieldOperations } from '../services/fieldOperations';
import '../v20-atmospheric.css';

export const OfficerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithCredentials, signOut } = useDepartmentAuth();
  const { theme: themeMode, toggleTheme } = useCivicTheme();

  // Check if a valid service department is explicitly selected via URL
  const rawDept = searchParams.get('dept');
  const hasValidDept =
    !!rawDept &&
    STAFF_DEPARTMENTS.some(
      (d) => d.key === canonicalizeDepartmentKey(rawDept)
    );

  const selectedDeptKey: AuthorizedDepartmentKey = hasValidDept
    ? canonicalizeDepartmentKey(rawDept)
    : 'selection';

  // Synchronize active department atmosphere to document element
  useDepartmentAtmosphereEffect(selectedDeptKey);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMismatchError, setRoleMismatchError] = useState<string | null>(null);

  const isLight = themeMode === 'light';
  const atmosphere = DEPARTMENT_ATMOSPHERES[selectedDeptKey] || DEPARTMENT_ATMOSPHERES.selection;
  const currentDeptMeta = STAFF_DEPARTMENTS.find((d) => d.key === selectedDeptKey);

  // Stage 1 -> Stage 2: Select a department
  const handleSelectDepartment = (deptKey: StaffDepartmentKey) => {
    setSearchParams({ dept: deptKey });
    setErrorMessage(null);
    setRoleMismatchError(null);
  };

  // Stage 2 -> Stage 1: Return to department selection
  const handleChangeDepartment = () => {
    setSearchParams({});
    setErrorMessage(null);
    setRoleMismatchError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your staff username or email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setRoleMismatchError(null);

    try {
      const res = await signInWithCredentials(
        username.trim(),
        password,
        selectedDeptKey === 'gas' ? ('ssgc' as any) : selectedDeptKey
      );

      if (!res.success) {
        setIsLoading(false);
        if (res.status === 'wrong_department') {
          setErrorMessage('This staff account is not authorized for the selected department.');
        } else if (res.status === 'revoked') {
          setErrorMessage('Your departmental access has been suspended or revoked. Contact supervisor.');
        } else if (res.status === 'pending') {
          setErrorMessage('Your departmental access request is pending approval by the Main Administrator.');
        } else {
          setErrorMessage(res.error || 'Invalid credentials. Please verify your staff username and password.');
        }
        return;
      }

      // Verify Role Separation at Boundary
      const authSession = (await import('../../../services/staffAuthService')).staffAuthService.getCurrentStaffSession();
      if (!authSession?.userId) {
        setIsLoading(false);
        setErrorMessage('Unable to verify individual staff identity.');
        return;
      }

      const verifiedRole = await fieldOperations.getMyRole(
        selectedDeptKey === 'gas' ? 'ssgc' : selectedDeptKey,
        authSession.userId
      );

      if (verifiedRole === 'head') {
        // Enforce role separation: reject head credentials at Officer portal
        signOut();
        setIsLoading(false);
        setRoleMismatchError(
          'This sign-in is for Field Officers. Your account belongs to the Department Head workspace and is not authorized for the Field Officer workspace.'
        );
        return;
      }

      setIsLoading(false);
      navigate('/department/officer', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    }
  };

  // =========================================================================
  // STAGE 1: Department Selection (No department selected yet)
  // =========================================================================
  if (!hasValidDept) {
    return (
      <StaffDepartmentSelection
        role="officer"
        onSelectDepartment={handleSelectDepartment}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // =========================================================================
  // STAGE 2: Centered Field Officer Credential Entry
  // =========================================================================
  return (
    <div
      className={`v20-portal-root ${isLight ? 'v20-light-mode' : ''}`}
      data-dept={selectedDeptKey}
      data-theme={themeMode}
      data-role="officer"
      data-testid="officer-login-page"
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
      {/* 1. Exact Department Atmospheric Gradient Background */}
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* 2. Top Header Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '920px',
          margin: '0 auto 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              a.
            </span>
            <span>Awaaz-e-Awam</span>
          </Link>

          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 9px',
              borderRadius: '6px',
              background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.78)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            Field Officer
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleChangeDepartment}
            data-testid="officer-change-dept-header-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 650,
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.85)',
              background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '9999px',
              padding: '8px 14px',
              cursor: 'pointer',
              transition: 'background 160ms ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>Change department</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            data-testid="officer-login-theme-toggle"
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

      {/* 3. Centered Layout */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '520px',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Department Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.75)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: currentDeptMeta?.accent || atmosphere.highlight || '#65717F',
                display: 'inline-block',
              }}
            />
            {currentDeptMeta ? currentDeptMeta.name.toUpperCase() : atmosphere.label} · FIELD OPERATIONS
          </span>
        </div>

        {/* Expressive Portal Headline */}
        <h1
          id="officer-login-heading"
          style={{
            fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
            fontSize: 'clamp(44px, 6.2vw, 98px)',
            fontWeight: 750,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
            margin: '0 0 12px 0',
            color: isLight ? '#171717' : '#FFFFFF',
          }}
        >
          Field Officer.
          <span className="sr-only"> — Field Officer Sign-In</span>
        </h1>
        <span className="sr-only">Use the Field Officer account (roads-02)</span>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(14.5px, 1.8vw, 17px)',
            color: isLight ? '#4A4A4A' : 'rgba(242, 239, 233, 0.75)',
            margin: '0 0 32px 0',
            lineHeight: 1.45,
            maxWidth: '440px',
          }}
        >
          {currentDeptMeta ? currentDeptMeta.name : atmosphere.category} — Field Operations &amp; Incident Resolution
        </p>

        {/* Centered Glass Authentication Form Card */}
        <div
          className="v20-glass-card"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '36px 30px',
            borderRadius: '24px',
            background: isLight ? 'rgba(250, 250, 248, 0.94)' : 'rgba(16, 20, 28, 0.84)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: isLight
              ? '0 20px 50px rgba(0, 0, 0, 0.08)'
              : '0 20px 50px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
                color: isLight ? '#171717' : '#FFFFFF',
              }}
            >
              Sign in
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: isLight ? '#555555' : 'rgba(242, 239, 233, 0.65)',
              }}
            >
              {atmosphere.label}
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(224, 86, 86, 0.14)',
                  border: '1px solid rgba(224, 86, 86, 0.3)',
                  color: '#E05656',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Role Mismatch Warning without cross-portal links */}
            {roleMismatchError && (
              <div
                role="alert"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(217, 119, 6, 0.14)',
                  border: '1px solid rgba(217, 119, 6, 0.32)',
                  color: isLight ? '#92400E' : '#F59E0B',
                  fontSize: '13px',
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{roleMismatchError}</div>
              </div>
            )}

            {/* Identifier field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="officer-identifier"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
                }}
              >
                Staff username or email
              </label>
              <input
                id="officer-identifier"
                type="text"
                aria-label="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. roads-02 or officer@kmc.gos.pk"
                data-testid="officer-login-username-input"
                className="v20-auth-input"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Password field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="officer-password"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="officer-password"
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Access key (local demo)"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="officer-login-password-input"
                  className="v20-auth-input"
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 44px 10px 14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="officer-toggle-password-visibility"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Sign In"
              data-testid="officer-login-submit-button"
              className="v20-field-btn primary"
              style={{
                width: '100%',
                minHeight: '46px',
                marginTop: '6px',
                fontSize: '14px',
                fontWeight: 650,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <span>Verifying credentials…</span>
              ) : (
                <>
                  <span>Sign in as Field Officer</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Concise Footer Notice */}
          <div
            style={{
              paddingTop: '14px',
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.55)', textAlign: 'center' }}>
              Accounts are issued by your department head.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleChangeDepartment}
                data-testid="officer-change-dept-link"
                style={{
                  background: 'none',
                  border: 'none',
                  color: isLight ? '#555555' : 'rgba(242, 239, 233, 0.65)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px',
                }}
              >
                Select a different department
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OfficerLoginPage;
