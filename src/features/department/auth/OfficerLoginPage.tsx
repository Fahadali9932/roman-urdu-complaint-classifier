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
import '../v20-atmospheric.css';

export const OfficerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signInWithCredentials, signOut } = useDepartmentAuth();
  const { theme: themeMode, toggleTheme } = useCivicTheme();

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
          'This sign-in is for Field Officers. Your account belongs to the Department Head workspace. Use the correct staff login.'
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* 1. Atmospheric Gradient Background */}
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* 2. Top Bar: Citizen Home Link + Theme Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
            textDecoration: 'none',
            padding: '8px 14px',
            borderRadius: '9999px',
            background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ArrowLeft size={15} />
          <span>Homepage</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          data-testid="officer-login-theme-toggle"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            color: isLight ? '#171717' : '#F2EFE9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
          }}
        >
          {isLight ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>

      {/* 3. Centered Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          margin: 'auto 0',
        }}
      >
        {/* Centered Heading Block */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              marginBottom: '10px',
            }}
          >
            {atmosphere.category.toUpperCase()} • FIELD OPERATIONS
          </span>

          <h1
            id="officer-login-heading"
            style={{
              fontSize: 'clamp(32px, 4.2vw, 44px)',
              fontWeight: 750,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 8px 0',
              color: isLight ? '#171717' : '#FFFFFF',
            }}
          >
            Officer access.
            <span className="sr-only"> — Field Officer Sign-In</span>
          </h1>

          <p
            style={{
              fontSize: '14.5px',
              color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.72)',
              margin: 0,
            }}
          >
            Sign in to your department to access active fieldwork tasks.
          </p>

          <p
            style={{
              fontSize: '12px',
              color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.65)',
              margin: '6px 0 0 0',
            }}
          >
            Use the Field Officer account ({selectedDeptKey === 'kmc' ? 'roads-02' : `${selectedDeptKey}-02`}) for local demonstration.
          </p>
        </div>

        {/* Compact Spacious Glass Authentication Form */}
        <div
          className="v20-glass-card"
          style={{
            width: '100%',
            padding: '32px 28px',
            borderRadius: '24px',
            background: isLight ? 'rgba(250, 250, 248, 0.94)' : 'rgba(16, 20, 28, 0.82)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: isLight
              ? '0 20px 50px rgba(0, 0, 0, 0.08)'
              : '0 20px 50px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Department Selector */}
          <DepartmentThemeSelector
            selectedDeptKey={selectedDeptKey}
            onSelectDepartment={handleSelectDepartment}
            themeMode={themeMode}
          />

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
                  to={`/department/head/login?dept=${selectedDeptKey}`}
                  className="v20-field-btn secondary"
                  style={{ alignSelf: 'flex-start', textDecoration: 'none' }}
                >
                  <span>Open Department Head sign-in</span>
                  <ArrowRight size={14} />
                </Link>
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
              paddingTop: '12px',
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.55)', textAlign: 'center' }}>
              Accounts are issued by your department head.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Link
                to={`/department/head/login?dept=${selectedDeptKey}`}
                style={{
                  color: isLight ? '#171717' : '#F2EFE9',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                }}
              >
                <span>Department Head sign-in</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OfficerLoginPage;
