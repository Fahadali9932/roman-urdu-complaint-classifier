import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { type DepartmentId } from '../../types';
import { DEPARTMENT_THEMES } from './design-system/tokens';
import { DepartmentArtwork } from './design-system/DepartmentArtwork';
import { getAllDepartmentIdentities, getIdentityByDepartmentId } from './auth/departmentIdentities';
import { getLocalDemoCredentials } from '../../services/localDemoCredentials';
import { staffAuthService } from '../../services/staffAuthService';
import { fieldOperations, type StaffPosition } from './services/fieldOperations';
import { useCivicTheme } from './hooks/useCivicTheme';
import { V3AuthShell, V3PrimaryButton } from '../../components/v3';

interface ThemedDepartmentLoginScreenProps {
  departmentId: DepartmentId;
  targetRole?: StaffPosition;
  onBackToDepartmentSelection: () => void;
  isOnline?: boolean;
}

export const ThemedDepartmentLoginScreen: React.FC<ThemedDepartmentLoginScreenProps> = ({
  departmentId,
  targetRole,
  onBackToDepartmentSelection,
  isOnline = true,
}) => {
  const { signInWithCredentials, completeMfaSignIn, signOut } = useDepartmentAuth();
  const { theme: civicTheme, toggleTheme } = useCivicTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaFactor, setMfaFactor] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const theme = DEPARTMENT_THEMES[departmentId] || DEPARTMENT_THEMES.kmc;
  const isRoads = departmentId === 'kmc';
  const defaultIdentity = getIdentityByDepartmentId(departmentId);
  const roleIdentity =
    targetRole &&
    getAllDepartmentIdentities().find(
      (identity) => identity.departmentId === departmentId && (identity.demoRole ?? 'head') === targetRole
    );
  const defaultUsername = roleIdentity?.username || defaultIdentity?.username || 'roads-01';
  const roleTitle = targetRole === 'head' ? 'Department Head' : targetRole === 'officer' ? 'Field Officer' : null;
  const isLocalDemonstration = !isSupabaseConfigured() && !import.meta.env.PROD;
  const isLiveAuthMissing = !isSupabaseConfigured() && import.meta.env.PROD;

  const isRevokedParam = searchParams.get('revoked') === 'true';
  const reasonParam = searchParams.get('reason');
  const [explicitRevocation, setExplicitRevocation] = useState<string | null>(null);

  const revocationNotice =
    explicitRevocation ||
    (isRevokedParam
      ? `Your departmental access has been revoked: ${
          reasonParam || 'Access withdrawn by Main Administrator.'
        }`
      : null);

  const enterRoleWorkspace = async (): Promise<boolean> => {
    if (!targetRole) {
      navigate('/department', { replace: true });
      return true;
    }
    const current = staffAuthService.getCurrentStaffSession();
    if (!current?.userId) {
      signOut();
      setErrorMessage('Your individual staff identity could not be verified. Please sign in again.');
      return false;
    }
    try {
      const actualRole = await fieldOperations.getMyRole(departmentId, current.userId);
      if (actualRole !== targetRole) {
        signOut();
        setErrorMessage(
          `This sign-in is for ${roleTitle}s. Your account belongs to ${
            actualRole === 'head'
              ? 'the Department Head workspace'
              : actualRole === 'officer'
              ? 'the Field Officer workspace'
              : 'neither approved workspace'
          }. Use the correct staff login.`
        );
        return false;
      }
      navigate(`/department/${targetRole}`, { replace: true });
      return true;
    } catch (error) {
      signOut();
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify your staff responsibility.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage(
        isSupabaseConfigured() ? 'Enter your invited work email.' : 'Please enter your assigned department username.'
      );
      return;
    }
    if (!accessKey) {
      setErrorMessage('Enter your password.');
      return;
    }

    if (!isOnline) {
      setErrorMessage(
        'Offline: Authentication requires an active network connection to verify departmental credentials with Supabase.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await signInWithCredentials(trimmedUsername, accessKey, departmentId);
      if (!res.success) {
        if (res.status === 'mfa_required' && supabase) {
          const factors = await supabase.auth.mfa.listFactors();
          if (factors.error) {
            setErrorMessage(factors.error.message);
            return;
          }
          const existing = factors.data?.totp.find((f) => f.status === 'verified');
          if (existing) {
            setMfaFactor(existing.id);
          } else {
            const setup = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Awaaz department authenticator',
            });
            if (setup.error || !setup.data) {
              setErrorMessage(setup.error?.message || 'Could not set up your authenticator.');
              return;
            }
            setMfaFactor(setup.data.id);
            setMfaQr(setup.data.totp.qr_code);
            setMfaSecret(setup.data.totp.secret);
          }
          setMfaStep(true);
          return;
        }
        if (res.status === 'revoked') {
          setExplicitRevocation(`Access Revoked: ${res.rejectionReason || 'Withdrawn by Main Administrator.'}`);
        } else if (res.status === 'wrong_department') {
          setErrorMessage(
            res.error || `Access Denied: Account is not authorized for the ${theme.shortName} console.`
          );
        } else {
          setErrorMessage(res.error || 'Invalid username or access key. Please verify your credentials.');
        }
        return;
      }

      await enterRoleWorkspace();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !mfaFactor) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactor, code: mfaCode.trim() });
      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }
      const finished = await completeMfaSignIn();
      if (!finished.success) {
        setErrorMessage(finished.error || 'Verification failed.');
        return;
      }
      await enterRoleWorkspace();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Authenticator could not be verified.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <V3AuthShell
      portalTitle={roleTitle || theme.monumentalTitle}
      eyebrow={targetRole ? `${theme.code} · ${theme.jurisdiction}` : `${theme.code} • ${theme.monumentalTitle}`}
      subtitle={targetRole ? theme.name : theme.jurisdiction}
      artwork={<DepartmentArtwork departmentId={departmentId} />}
      theme={civicTheme}
      onToggleTheme={toggleTheme}
      backLabel=""
    >
      {/* Card Header */}
      <div className="mb-5">
        <div className="text-[12px] font-medium" style={{ color: 'var(--v3-muted)' }}>
          {theme.titleEn}
        </div>
        <h2
          className="mt-1 text-[26px] font-semibold leading-tight"
          style={{ color: 'var(--v3-ink)', textWrap: 'balance' }}
        >
          {roleTitle ? `${roleTitle} sign in` : 'Sign in'}
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--v3-muted)' }}>
          {roleTitle ? `${theme.name} · Individual ${targetRole} account` : `${theme.name} • ${theme.subtitleEn}`}
        </p>
      </div>

      {/* Legacy Combined Route Role Switcher (hidden on dedicated Head / Officer logins) */}
      {!targetRole && (
        <nav
          className="mb-5 flex gap-1.5 rounded-[12px] p-1"
          style={{
            backgroundColor: 'var(--v3-raised)',
            border: '1px solid var(--v3-edge)',
          }}
          aria-label="Staff workspace type"
        >
          <Link
            to={`/department/head/login?dept=${departmentId}`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-[9px] px-3 text-center text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--v3-ink)',
            }}
          >
            Department Head
          </Link>
          <Link
            to={`/department/officer/login?dept=${departmentId}`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-[9px] px-3 text-center text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--v3-ink)',
            }}
          >
            Field Officer
          </Link>
        </nav>
      )}

      {/* Local Demo Notice */}
      {isLocalDemonstration && (
        <div
          className="mb-5 rounded-[12px] px-4 py-3 text-[12px] leading-relaxed"
          style={{
            backgroundColor: 'var(--v3-raised)',
            border: '1px solid var(--v3-edge)',
            color: 'var(--v3-ink)',
          }}
          role="status"
        >
          <p>
            Local demonstration mode: this browser is not connected to Supabase.{' '}
            {roleTitle ? `Use the ${roleTitle} account (${defaultUsername}). ` : ''}Live staff accounts will not work here.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--v3-accent)' }}>
              Show temporary local access key
            </summary>
            <code className="mt-2 block select-all break-all text-[12px]">
              {getLocalDemoCredentials().staffPassword}
            </code>
          </details>
        </div>
      )}

      {isLiveAuthMissing && (
        <p
          className="mb-5 rounded-[12px] px-4 py-3 text-[12px] leading-relaxed"
          style={{
            backgroundColor: 'var(--v3-warning-soft)',
            border: '1px solid var(--v3-edge)',
            color: 'var(--v3-ink)',
          }}
          role="status"
        >
          Department sign-in is not configured. Contact the administrator to connect the authentication service.
        </p>
      )}

      {revocationNotice && (
        <div
          className="mb-5 flex items-start gap-3 rounded-[12px] p-4 text-[12px]"
          style={{
            backgroundColor: 'var(--v3-danger-soft)',
            border: '1px solid var(--v3-danger)',
            color: 'var(--v3-ink)',
          }}
          role="alert"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--v3-danger)' }} />
          <div>
            <div className="font-semibold">Account Access Revoked</div>
            <p className="mt-0.5 leading-relaxed">{revocationNotice}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="mb-5 flex items-start gap-3 rounded-[12px] p-4 text-[12px]"
          style={{
            backgroundColor: 'var(--v3-warning-soft)',
            border: '1px solid var(--v3-warning)',
            color: 'var(--v3-ink)',
          }}
          role="alert"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--v3-warning)' }} />
          <div className="flex-1">
            <div className="font-semibold">Authentication Alert</div>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Login Form or MFA Step */}
      {mfaStep ? (
        <form onSubmit={verifyMfa} className="space-y-4" aria-label="Authenticator verification">
          <h3 className="text-[18px] font-medium" style={{ color: 'var(--v3-ink)' }}>
            Verify your identity
          </h3>
          <p className="text-[13px]" style={{ color: 'var(--v3-muted)' }}>
            Enter the six-digit code from your authenticator app. This second step is required for every officer and department head.
          </p>
          {mfaQr && (
            <div className="rounded-[12px] p-4" style={{ backgroundColor: 'var(--v3-surface)', border: '1px solid var(--v3-edge)' }}>
              <p className="mb-2 text-[12px] font-medium" style={{ color: 'var(--v3-ink)' }}>
                Set up your authenticator first
              </p>
              <img src={mfaQr} alt="Authenticator setup QR code" className="mx-auto h-48 w-48" />
              <p className="mt-2 break-all text-[12px]" style={{ color: 'var(--v3-muted)' }}>
                Manual setup key: {mfaSecret}
              </p>
            </div>
          )}
          <div>
            <label htmlFor="dept-totp" className="v3-field-label">
              Six-digit verification code
            </label>
            <input
              id="dept-totp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="v3-input tracking-[0.28em]"
            />
          </div>
          <V3PrimaryButton type="submit" disabled={isLoading} className="w-full">
            Verify &amp; open workspace
          </V3PrimaryButton>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={isRoads ? 'roads-username' : `${departmentId}-username`} className="v3-field-label">
              {isLocalDemonstration ? 'Username' : 'Work email'}
            </label>
            <input
              id={isRoads ? 'roads-username' : `${departmentId}-username`}
              type={isLocalDemonstration ? 'text' : 'email'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLocalDemonstration ? defaultUsername : 'officer@department.gov.pk'}
              autoComplete="username"
              required
              disabled={isLoading}
              className="v3-input"
            />
          </div>

          <div>
            <label htmlFor={isRoads ? 'roads-access-key' : `${departmentId}-access-key`} className="v3-field-label">
              {isLocalDemonstration ? 'Access key (local demo)' : 'Password'}
            </label>
            <div className="relative">
              <input
                id={isRoads ? 'roads-access-key' : `${departmentId}-access-key`}
                type={showPassword ? 'text' : 'password'}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="v3-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg cursor-pointer"
                style={{ color: 'var(--v3-muted)' }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <V3PrimaryButton type="submit" disabled={isLoading} className="w-full">
              <span>{isLoading ? 'Verifying…' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </V3PrimaryButton>
          </div>
        </form>
      )}

      {/* Footer Switch Department + Role-scoped Access Application Link */}
      <div
        className="mt-5 flex flex-col items-center gap-2 border-t pt-4 text-center"
        style={{ borderColor: 'var(--v3-edge)' }}
      >
        <button
          type="button"
          onClick={onBackToDepartmentSelection}
          aria-label="Back to Department Selection"
          className="v3-quiet-action"
        >
          ← Switch Department
        </button>

        {targetRole && (
          <Link
            to={`/department/request-access?dept=${departmentId}&role=${targetRole}`}
            className="text-[13px] font-medium hover:underline"
            style={{ color: 'var(--v3-accent)' }}
          >
            New staff member? Submit credential onboarding form
          </Link>
        )}
      </div>
    </V3AuthShell>
  );
};
