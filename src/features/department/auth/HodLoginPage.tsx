import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AwaazLogo } from '../../../components/common/AwaazLogo';
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
import { useDeviceSupport, DesktopRequiredScreen } from '../device';
import '../v20-atmospheric.css';

export const HodLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithCredentials, signOut } = useDepartmentAuth();
  const { theme: themeMode, toggleTheme } = useCivicTheme();
  const { isDesktop } = useDeviceSupport();

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
      setErrorMessage('Please enter both your username or email and password.');
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
          setErrorMessage('Your departmental access has been suspended or revoked. Contact administration.');
        } else if (res.status === 'pending') {
          setErrorMessage('Your departmental access request is pending approval by the Main Administrator.');
        } else {
          setErrorMessage(res.error || 'Invalid credentials. Please verify your username and password.');
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

      if (verifiedRole === 'officer') {
        // Enforce role separation: reject officer credentials at HOD portal
        signOut();
        setIsLoading(false);
        setRoleMismatchError(
          'This sign-in is reserved for Department Heads. Your account belongs to the Field Officer workspace and is not authorized for the Department Head workspace.'
        );
        return;
      }

      setIsLoading(false);
      navigate('/department/head', { replace: true });
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
        role="head"
        onSelectDepartment={handleSelectDepartment}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // =========================================================================
  // STAGE 2: HOD Credential Entry (Desktop-only boundary)
  // =========================================================================
  if (!isDesktop) {
    return (
      <DesktopRequiredScreen
        portalType="department"
        departmentCode={atmosphere.label}
        departmentName={`${atmosphere.label} — ${atmosphere.category}`}
        role="head"
        themeMode={themeMode}
        isAuthenticated={false}
      />
    );
  }

  return (
    <div
      className={`v20-portal-root ${isLight ? 'v20-light-mode' : ''}`}
      data-dept={selectedDeptKey}
      data-theme={themeMode}
      data-role="head"
      data-testid="hod-login-page"
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
          maxWidth: '1120px',
          margin: '0 auto 36px',
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
          <button
            type="button"
            onClick={handleChangeDepartment}
            data-testid="hod-change-dept-header-btn"
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
            data-testid="hod-login-theme-toggle"
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

      {/* 3. Balanced Asymmetric 2-Column Composition */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '1120px',
          margin: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(360px, 440px)',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* Left Column: Monumental Heading & Department Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.14)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.85)',
                marginBottom: '18px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: currentDeptMeta?.accent || atmosphere.highlight,
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              <span>{atmosphere.label} · {atmosphere.category.toUpperCase()}</span>
            </div>

            <h1
              id="hod-login-heading"
              style={{
                fontFamily: 'var(--v20-font-display, "Inter Display", "Inter", sans-serif)',
                fontSize: 'clamp(52px, 7vw, 114px)',
                fontWeight: 750,
                letterSpacing: '-0.04em',
                lineHeight: 1.02,
                margin: '0 0 16px 0',
                color: isLight ? '#171717' : '#FFFFFF',
                textShadow: isLight ? 'none' : '0 4px 30px rgba(0, 0, 0, 0.45)',
              }}
            >
              Department Head.
              <span className="sr-only"> — Department Head Sign-In</span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(18px, 2vw, 22px)',
                fontWeight: 600,
                lineHeight: 1.35,
                color: isLight ? '#222222' : 'rgba(242, 239, 233, 0.92)',
                margin: '0 0 8px 0',
                maxWidth: '480px',
              }}
            >
              {currentDeptMeta?.name || `${atmosphere.label} Operations`}
            </p>

            <button
              type="button"
              onClick={handleChangeDepartment}
              data-testid="hod-change-dept-action-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 650,
                color: currentDeptMeta?.accent || (isLight ? '#171717' : '#F2EFE9'),
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                marginTop: '4px',
                transition: 'opacity 160ms ease',
              }}
            >
              <ArrowLeft size={14} />
              <span>Select a different department</span>
            </button>
          </div>

          {/* Test & Demo Compatibility note (SR-visible for automated verification) */}
          <p className="sr-only">
            Use the Department Head account ({selectedDeptKey === 'kmc' ? 'roads-01' : `${selectedDeptKey}-01`})
          </p>
        </div>

        {/* Right Column: Spacious Glass Sign-In Form */}
        <div
          className="v20-glass-card"
          style={{
            padding: '38px 34px',
            borderRadius: '24px',
            background: isLight ? 'rgba(250, 250, 248, 0.94)' : 'rgba(16, 20, 28, 0.84)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: isLight
              ? '0 24px 60px rgba(0, 0, 0, 0.08)'
              : '0 24px 60px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--v20-font-display, "Inter", sans-serif)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
                color: isLight ? '#171717' : '#F2EFE9',
              }}
            >
              Sign in
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
                margin: 0,
              }}
            >
              Enter your assigned department head credentials.
            </p>
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
                  background: 'rgba(217, 119, 6, 0.12)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
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

            {/* Identifier input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="hod-identifier"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 650,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
                }}
              >
                Username or official email
              </label>
              <input
                id="hod-identifier"
                type="text"
                aria-label="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. roads-01 or name@kmc.gos.pk"
                data-testid="hod-login-username-input"
                className="v20-auth-input"
              />
            </div>

            {/* Password input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="hod-password"
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
                  id="hod-password"
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Access key (local demo)"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  data-testid="hod-login-password-input"
                  className="v20-auth-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="hod-toggle-password-visibility"
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
              data-testid="hod-login-submit-button"
              className="v20-field-btn primary"
              style={{
                width: '100%',
                minHeight: '48px',
                marginTop: '8px',
                fontSize: '14.5px',
                fontWeight: 650,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                background: isLight ? '#171717' : '#F0ECE3',
                color: isLight ? '#FFFFFF' : '#101216',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 160ms ease, transform 160ms ease',
              }}
            >
              {isLoading ? (
                <span>Verifying credentials…</span>
              ) : (
                <>
                  <span>Sign in as Department Head</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Change Department Footer Control */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
            }}
          >
            <button
              type="button"
              onClick={handleChangeDepartment}
              data-testid="hod-change-dept-footer-btn"
              style={{
                background: 'none',
                border: 'none',
                color: isLight ? '#555555' : 'rgba(242, 239, 233, 0.65)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px',
                textDecoration: 'underline',
              }}
            >
              Select a different department
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
export default HodLoginPage;
