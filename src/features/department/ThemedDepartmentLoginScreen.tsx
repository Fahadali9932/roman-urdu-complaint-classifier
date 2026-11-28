import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  KeyRound,
  User,
  ArrowRight,
  QrCode,
  Lock,
  Clock,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { type DepartmentId } from '../../types';
import { DEPARTMENT_THEMES } from './design-system/tokens';
import { DepartmentArtwork } from './design-system/DepartmentArtwork';
import { GlassCard } from './design-system/GlassCard';
import { GlassInput } from './design-system/GlassInput';
import { GlassButton } from './design-system/GlassButton';
import { getIdentityByDepartmentId } from './auth/departmentIdentities';

interface ThemedDepartmentLoginScreenProps {
  departmentId: DepartmentId;
  onBackToDepartmentSelection: () => void;
  isOnline?: boolean;
}

export const ThemedDepartmentLoginScreen: React.FC<ThemedDepartmentLoginScreenProps> = ({
  departmentId,
  onBackToDepartmentSelection,
  isOnline = true,
}) => {
  const {
    signInWithCredentials,
    submitMfaCode,
    enrollMfa,
    getMfaFactors,
    cancelLoginFlow,
    updateStaffPassword,
  } = useDepartmentAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role: 'head' | 'officer', initialized from URL query param if present
  const [role, setRole] = useState<'head' | 'officer'>(() =>
    searchParams.get('role')?.toLowerCase() === 'officer' ? 'officer' : 'head'
  );

  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-stage flow states: 'credentials' | 'mfa' | 'password_change' | 'onboarding_required'
  const [viewMode, setViewMode] = useState<
    'credentials' | 'mfa' | 'password_change' | 'onboarding_required'
  >('credentials');

  // MFA state
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaEnrollData, setMfaEnrollData] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);

  // Forced password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const theme = DEPARTMENT_THEMES[departmentId] || DEPARTMENT_THEMES.kmc;
  const isRoads = departmentId === 'kmc';
  const defaultIdentity = getIdentityByDepartmentId(departmentId);
  const defaultUsername = defaultIdentity?.username || 'roads-01';

  // Real-time Revocation Query Parameter Detection
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

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Please enter your assigned department username.');
      return;
    }
    if (!accessKey) {
      setErrorMessage('Please enter your access key.');
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
      // Authenticate with secure Edge credential exchange and role-scoped verification
      const res = await signInWithCredentials(trimmedUsername, accessKey, departmentId, role);

      if (res.success) {
        navigate('/department', { replace: true });
        return;
      }

      if (res.status === 'mfa_required') {
        const factors = await getMfaFactors();
        if (factors && factors.length > 0) {
          setMfaFactorId(factors[0].id);
          setMfaEnrollData(null);
        } else {
          const enroll = await enrollMfa();
          setMfaFactorId(enroll.factorId);
          setMfaEnrollData({ qrCode: enroll.qrCode, secret: enroll.secret });
        }
        setViewMode('mfa');
        return;
      }

      if (res.status === 'password_change_required') {
        setViewMode('password_change');
        return;
      }

      if (res.status === 'onboarding_required') {
        setViewMode('onboarding_required');
        return;
      }

      if (res.status === 'revoked') {
        setExplicitRevocation(
          `Access Revoked: ${res.rejectionReason || 'Withdrawn by Main Administrator.'}`
        );
      } else if (res.status === 'wrong_department') {
        setErrorMessage(
          res.error || `Access Denied: Account is not authorized for the ${theme.shortName} console.`
        );
      } else {
        setErrorMessage(
          res.error || 'Invalid credentials or department authorization. Access restricted.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected authentication error.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = mfaCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await submitMfaCode(mfaFactorId, cleanCode, role, departmentId);
      if (res.success) {
        navigate('/department', { replace: true });
        return;
      }
      if (res.status === 'password_change_required') {
        setViewMode('password_change');
        return;
      }
      if (res.status === 'onboarding_required') {
        setViewMode('onboarding_required');
        return;
      }
      setErrorMessage(res.error || 'Invalid verification code. Please check your authenticator app.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 15) {
      setErrorMessage('New passphrase must be at least 15 characters long (NIST SP 800-63B standard).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passphrase and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateStaffPassword(newPassword);
      if (res.success) {
        navigate('/department', { replace: true });
      } else {
        setErrorMessage(res.error || 'Failed to update passphrase.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update passphrase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelFlow = async () => {
    await cancelLoginFlow();
    setViewMode('credentials');
    setMfaCode('');
    setMfaEnrollData(null);
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#FAF8F5] text-[#111827] flex flex-col justify-between selection:bg-[#111827] selection:text-white">
      {/* 1. Flowing Sculptural Vector Artwork across the Canvas */}
      <DepartmentArtwork departmentId={departmentId} />

      {/* 2. Top Header with Back Navigation & Branding */}
      <header className="relative z-20 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDepartmentSelection}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white border border-black/10 text-xs font-bold text-[#111827] shadow-sm transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Department Selection</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider"
            style={{
              backgroundColor: theme.badgeBg,
              color: theme.badgeText,
              border: `1px solid ${theme.badgeBorder}`,
            }}
          >
            {theme.code} • {isRoads ? 'ROADS' : theme.shortName.toUpperCase()}
          </span>
        </div>
      </header>

      {/* 3. Main Composition: Monumental Typographic Anchor (Left) & Frosted Glass Form (Right) */}
      <main className="relative z-10 w-full px-6 sm:px-12 my-auto flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 max-w-[1440px] mx-auto py-6">
        {/* Left Side: Monumental Bold Typographic Anchor */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left select-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-serif font-black text-xl text-[#111827]">a.</span>
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              {theme.name}
            </span>
          </div>

          <h1 className="text-[clamp(4.5rem,13vw,11.5rem)] font-black tracking-tighter text-[#111827] leading-[0.85] uppercase">
            {theme.monumentalTitle}
          </h1>

          <p className="mt-3 text-sm sm:text-base font-medium text-slate-600 max-w-md">
            {theme.jurisdiction}
          </p>
        </div>

        {/* Right Side: Purposefully Placed Frosted Glass Login Form */}
        <div className="w-full lg:w-auto lg:min-w-[420px] lg:max-w-[460px] self-center">
          <GlassCard
            variant="light"
            className="p-7 sm:p-9 bg-white/75 backdrop-blur-2xl border border-black/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.08)]"
          >
            {/* Header inside Card */}
            <div className="space-y-1 mb-5">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                {viewMode === 'mfa'
                  ? 'Two-Factor Authentication'
                  : viewMode === 'password_change'
                  ? 'Passphrase Update'
                  : viewMode === 'onboarding_required'
                  ? 'Onboarding Pending'
                  : theme.titleEn}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {viewMode === 'mfa'
                  ? 'Verify your authenticating device'
                  : viewMode === 'password_change'
                  ? 'NIST SP 800-63B passphrase requirement'
                  : viewMode === 'onboarding_required'
                  ? 'Municipal operational clearance'
                  : `${theme.name} • ${theme.subtitleEn}`}
              </p>
            </div>

            {/* Revocation Warning Alert */}
            {revocationNotice && (
              <div
                className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3"
                role="alert"
              >
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-800">Account Access Revoked</div>
                  <p className="mt-0.5 text-red-700 leading-relaxed">{revocationNotice}</p>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {errorMessage && (
              <div
                className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3"
                role="alert"
              >
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-amber-800">Authentication Alert</div>
                  <p className="mt-0.5 text-amber-700 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Stage 1: Credential Entry Screen */}
            {viewMode === 'credentials' && (
              <>
                {/* Role Selector Tabs (Department Head vs Operations Officer) */}
                <div className="flex rounded-xl p-1 bg-black/[0.04] border border-black/[0.06] mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('head');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      role === 'head'
                        ? 'bg-white text-[#111827] shadow-sm'
                        : 'text-slate-500 hover:text-[#111827]'
                    }`}
                  >
                    Department Head
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('officer');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      role === 'officer'
                        ? 'bg-white text-[#111827] shadow-sm'
                        : 'text-slate-500 hover:text-[#111827]'
                    }`}
                  >
                    Operations Officer
                  </button>
                </div>

                <form onSubmit={handleCredentialSubmit} className="space-y-4" noValidate>
                  <GlassInput
                    id={isRoads ? 'roads-username' : `${departmentId}-username`}
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={defaultUsername}
                    autoComplete="username"
                    required
                    disabled={isLoading}
                    leadingIcon={<User className="w-4 h-4" />}
                    variant="light"
                  />

                  <GlassInput
                    id={isRoads ? 'roads-access-key' : `${departmentId}-access-key`}
                    label="Access Key"
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    leadingIcon={<KeyRound className="w-4 h-4" />}
                    variant="light"
                  />

                  <div className="pt-2">
                    <GlassButton
                      type="submit"
                      variant="dark"
                      isLoading={isLoading}
                      icon={<ArrowRight className="w-4 h-4" />}
                      className="w-full"
                    >
                      Sign In
                    </GlassButton>
                  </div>
                </form>

                {/* Switch Department Link */}
                <div className="mt-5 pt-4 border-t border-black/[0.08] text-center">
                  <button
                    type="button"
                    onClick={onBackToDepartmentSelection}
                    className="text-xs font-semibold text-slate-500 hover:text-[#111827] transition-colors cursor-pointer"
                  >
                    ← Switch Department
                  </button>
                </div>
              </>
            )}

            {/* Stage 2: Two-Factor Authentication (MFA) Screen */}
            {viewMode === 'mfa' && (
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                {mfaEnrollData && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700">
                      <QrCode className="w-4 h-4 text-[#111827]" />
                      <span>Scan with Authenticator App</span>
                    </div>
                    {mfaEnrollData.qrCode ? (
                      <img
                        src={mfaEnrollData.qrCode}
                        alt="TOTP QR Code"
                        className="w-40 h-40 mx-auto rounded-lg border border-slate-200 bg-white p-1"
                      />
                    ) : (
                      <div className="w-40 h-40 mx-auto flex items-center justify-center bg-slate-100 rounded-lg text-xs text-slate-400">
                        QR Code
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono break-all px-2">
                      Key: <span className="font-bold text-slate-800">{mfaEnrollData.secret}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="staff-mfa-code"
                    className="block text-xs font-bold text-[#111827] uppercase tracking-wider"
                  >
                    6-digit authenticator code
                  </label>
                  <input
                    id="staff-mfa-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-xl font-mono tracking-widest py-3 px-4 rounded-xl border border-black/15 bg-white/90 focus:outline-none focus:ring-2 focus:ring-black/20"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <GlassButton
                    type="submit"
                    variant="dark"
                    isLoading={isLoading}
                    disabled={mfaCode.length !== 6 || isLoading}
                    className="w-full"
                  >
                    Verify & Continue
                  </GlassButton>

                  <button
                    type="button"
                    onClick={handleCancelFlow}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-[#111827] transition-colors cursor-pointer"
                  >
                    Cancel & Return
                  </button>
                </div>
              </form>
            )}

            {/* Stage 3: Mandatory Passphrase Update Screen */}
            {viewMode === 'password_change' && (
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  A mandatory passphrase change is required before your first console session (minimum 15 characters).
                </div>

                <GlassInput
                  id="new-passphrase"
                  label="New Passphrase (min 15 characters)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  minLength={15}
                  required
                  disabled={isLoading}
                  leadingIcon={<Lock className="w-4 h-4" />}
                  variant="light"
                />

                <GlassInput
                  id="confirm-passphrase"
                  label="Confirm Passphrase"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  minLength={15}
                  required
                  disabled={isLoading}
                  leadingIcon={<Lock className="w-4 h-4" />}
                  variant="light"
                />

                <div className="pt-2 space-y-2">
                  <GlassButton
                    type="submit"
                    variant="dark"
                    isLoading={isLoading}
                    disabled={newPassword.length < 15 || newPassword !== confirmPassword || isLoading}
                    className="w-full"
                  >
                    Update Passphrase & Continue
                  </GlassButton>

                  <button
                    type="button"
                    onClick={handleCancelFlow}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-[#111827] transition-colors cursor-pointer"
                  >
                    Cancel & Return
                  </button>
                </div>
              </form>
            )}

            {/* Stage 4: Officer Onboarding Required Screen */}
            {viewMode === 'onboarding_required' && (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-800 text-sm">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>Operational Approval Pending</span>
                  </div>
                  <p className="leading-relaxed text-sky-700">
                    Your municipal officer credentials have been verified. However, operational access to the{' '}
                    <strong>{theme.name}</strong> workspace requires activation by your Department Head or Main Administrator.
                  </p>
                </div>

                <div className="pt-2">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleCancelFlow}
                    className="w-full"
                  >
                    Return to Department Sign In
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </main>

      {/* 4. Minimal Clean Footer */}
      <footer className="relative z-10 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between text-xs text-slate-400">
        <span>Awaaz-e-Awam • {theme.name}</span>
        <span>Karachi Municipal Operational Workspace</span>
      </footer>
    </div>
  );
};
