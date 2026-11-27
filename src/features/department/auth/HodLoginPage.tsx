import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Sun, Moon, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useCivicTheme, useDepartmentAtmosphereEffect } from '../hooks/useCivicTheme';
import {
  type AuthorizedDepartmentKey,
  canonicalizeDepartmentKey,
  DEPARTMENT_ATMOSPHERES,
} from '../services/departmentThemes';
import { DepartmentThemeSelector } from './DepartmentThemeSelector';
import { fieldOperations } from '../services/fieldOperations';
import { useDeviceSupport, DesktopRequiredScreen } from '../device';
import '../v20-atmospheric.css';

export const HodLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithCredentials, signOut } = useDepartmentAuth();
  const { theme: themeMode, toggleTheme } = useCivicTheme();
  const { isDesktop } = useDeviceSupport();

  // Resolve department from query param or default to 'kmc'
  const rawDept = searchParams.get('dept');
  const selectedDeptKey: AuthorizedDepartmentKey = canonicalizeDepartmentKey(rawDept || 'kmc');

  // Sync atmospheric department to document
  useDepartmentAtmosphereEffect(selectedDeptKey);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMismatchError, setRoleMismatchError] = useState<string | null>(null);

  const atmosphere = DEPARTMENT_ATMOSPHERES[selectedDeptKey] || DEPARTMENT_ATMOSPHERES.kmc;
  const isLight = themeMode === 'light';

  const handleSelectDepartment = (deptKey: AuthorizedDepartmentKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('dept', deptKey);
      return next;
    });
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
          'This sign-in is reserved for Department Heads. Your account belongs to the Field Officer workspace. Use the correct staff login.'
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

  // Device-support boundary: HOD is desktop-first
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 1. Atmospheric Gradient Background */}
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* 2. Asymmetric Editorial Grid */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '1120px',
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1.1fr) minmax(360px, 440px)',
          gap: '64px',
          alignItems: 'center',
        }}
      >
        {/* Left Side: Bold Editorial Typography & Brand Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.07)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.8)',
                marginBottom: '16px',
              }}
            >
              DEPARTMENT OF SINDH • {atmosphere.category.toUpperCase()}
            </span>

            <h1
              id="hod-login-heading"
              style={{
                fontSize: 'clamp(44px, 4.8vw, 68px)',
                fontWeight: 750,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                margin: '0 0 16px 0',
                color: isLight ? '#171717' : '#FFFFFF',
              }}
            >
              Department Head.
              <span className="sr-only"> — Department Head Sign-In</span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(16px, 1.8vw, 20px)',
                fontWeight: 500,
                lineHeight: 1.45,
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.82)',
                margin: '0 0 8px 0',
                maxWidth: '460px',
              }}
            >
              {atmosphere.label} — {atmosphere.category}
            </p>

            <p
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.55)',
                margin: 0,
                maxWidth: '420px',
              }}
            >
              Executive oversight, incident assignment, personnel administration, and verified resolution review.
            </p>

            <p
              style={{
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
                margin: '8px 0 0 0',
              }}
            >
              Use the Department Head account ({selectedDeptKey === 'kmc' ? 'roads-01' : `${selectedDeptKey}-01`}) for local demonstration.
            </p>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.7)',
                textDecoration: 'none',
                transition: 'color 160ms ease',
              }}
            >
              <ArrowLeft size={16} />
              <span>Return to citizen homepage</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Sophisticated Glass Sign-In Form */}
        <div
          className="v20-glass-card"
          style={{
            padding: '36px 32px',
            borderRadius: '24px',
            background: isLight ? 'rgba(250, 250, 248, 0.94)' : 'rgba(16, 20, 28, 0.82)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: isLight
              ? '0 24px 60px rgba(0, 0, 0, 0.08)'
              : '0 24px 60px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Card Top Row: Department Selector + Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <DepartmentThemeSelector
                selectedDeptKey={selectedDeptKey}
                onSelectDepartment={handleSelectDepartment}
                themeMode={themeMode}
              />
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              data-testid="hod-login-theme-toggle"
              style={{
                marginTop: '22px',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isLight ? '#171717' : '#F2EFE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 160ms ease',
              }}
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          <div>
            <h2
              style={{
                fontSize: '19px',
                fontWeight: 650,
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
                color: isLight ? '#171717' : '#F2EFE9',
              }}
            >
              Executive Sign In
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
                margin: 0,
              }}
            >
              Authenticate with your issued department head credentials.
            </p>
          </div>

          {/* Form */}
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

            {/* Role Mismatch Warning with Quick Redirection */}
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
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{roleMismatchError}</div>
                </div>

                <Link
                  to={`/department/officer/login?dept=${selectedDeptKey}`}
                  className="v20-field-btn secondary"
                  style={{ alignSelf: 'flex-start', textDecoration: 'none' }}
                >
                  <span>Open Officer sign-in</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Identifier field */}
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
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.05)',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.14)' : '1px solid rgba(255, 255, 255, 0.14)',
                  color: isLight ? '#171717' : '#F2EFE9',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Password field */}
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
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 44px 10px 14px',
                    borderRadius: '12px',
                    background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.05)',
                    border: isLight ? '1px solid rgba(0, 0, 0, 0.14)' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: isLight ? '#171717' : '#F2EFE9',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
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
                minHeight: '46px',
                marginTop: '8px',
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
                  <span>Sign in as Department Head</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Navigation Switch */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <span style={{ color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.6)' }}>
              Operating in the field?
            </span>
            <Link
              to={`/department/officer/login?dept=${selectedDeptKey}`}
              style={{
                color: isLight ? '#171717' : '#F2EFE9',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Officer sign-in</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HodLoginPage;
