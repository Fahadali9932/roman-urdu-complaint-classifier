import React, { useState } from 'react';
import { ArrowLeft, ShieldAlert, KeyRound, User, ArrowRight } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { type DepartmentId } from '../../types';
import { DEPARTMENT_THEMES } from './design-system/tokens';
import { DepartmentArtwork } from './design-system/DepartmentArtwork';
import { GlassCard } from './design-system/GlassCard';
import { GlassInput } from './design-system/GlassInput';
import { GlassButton } from './design-system/GlassButton';
import { getAllDepartmentIdentities, getIdentityByDepartmentId } from './auth/departmentIdentities';
import { getLocalDemoCredentials } from '../../services/localDemoCredentials';
import { staffAuthService } from '../../services/staffAuthService';
import { fieldOperations, type StaffPosition } from './services/fieldOperations';

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
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
  const roleIdentity = targetRole && getAllDepartmentIdentities().find((identity) => identity.departmentId === departmentId && (identity.demoRole ?? 'head') === targetRole);
  const defaultUsername = roleIdentity?.username || defaultIdentity?.username || 'roads-01';
  const roleTitle = targetRole === 'head' ? 'Department Head' : targetRole === 'officer' ? 'Field Officer' : null;
  const isLocalDemonstration = !isSupabaseConfigured() && !import.meta.env.PROD;
  const isLiveAuthMissing = !isSupabaseConfigured() && import.meta.env.PROD;

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

  const enterRoleWorkspace = async (): Promise<boolean> => {
    if (!targetRole) { navigate('/department', { replace: true }); return true; }
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
        setErrorMessage(`This sign-in is for ${roleTitle}s. Your account belongs to ${actualRole === 'head' ? 'the Department Head workspace' : actualRole === 'officer' ? 'the Field Officer workspace' : 'neither approved workspace'}. Use the correct staff login.`);
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
      setErrorMessage(isSupabaseConfigured() ? 'Enter your invited work email.' : 'Please enter your assigned department username.');
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
      // Authenticate once. Context handles department verification and session
      // creation; calling the service separately would repeat the Auth request.
      const res = await signInWithCredentials(
        trimmedUsername,
        accessKey,
        departmentId
      );

      if (!res.success) {
        if (res.status === 'mfa_required' && supabase) {
          const factors = await supabase.auth.mfa.listFactors();
          if (factors.error) { setErrorMessage(factors.error.message); return; }
          const existing = factors.data?.totp.find(f => f.status === 'verified');
          if (existing) setMfaFactor(existing.id);
          else {
            const setup = await supabase.auth.mfa.enroll({ factorType:'totp',friendlyName:'Awaaz department authenticator' });
            if (setup.error || !setup.data) { setErrorMessage(setup.error?.message || 'Could not set up your authenticator.'); return; }
            setMfaFactor(setup.data.id);
            setMfaQr(setup.data.totp.qr_code);
            setMfaSecret(setup.data.totp.secret);
          }
          setMfaStep(true);
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
          setErrorMessage(res.error || 'Invalid username or access key. Please verify your credentials.');
        }
        return;
      }

      await enterRoleWorkspace();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected authentication error.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (e:React.FormEvent) => {
    e.preventDefault(); if (!supabase || !mfaFactor) return;
    setIsLoading(true); setErrorMessage(null);
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({factorId:mfaFactor,code:mfaCode.trim()});
      if (result.error) { setErrorMessage(result.error.message); return; }
      const finished = await completeMfaSignIn();
      if (!finished.success) { setErrorMessage(finished.error || 'Verification failed.'); return; }
      await enterRoleWorkspace();
    } catch(err) { setErrorMessage(err instanceof Error ? err.message : 'Authenticator could not be verified.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="dept-login-screen relative min-h-screen w-full overflow-hidden bg-[#FAF8F5] text-[#111827] flex flex-col justify-between selection:bg-[#111827] selection:text-white">
      {/* 1. Flowing Sculptural Vector Artwork across the Canvas */}
      <DepartmentArtwork departmentId={departmentId} />

      {/* 2. Top Header with Back Navigation & Branding */}
      <header className="relative z-20 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDepartmentSelection}
            className="dept-login-back flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 hover:bg-white border border-black/10 text-xs font-bold text-[#111827] shadow-sm transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-black/20"
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
            <span className="dept-login-mark font-serif font-black text-xl text-[#111827]">a.</span>
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
              {theme.name}
            </span>
          </div>

          <h1 className={roleTitle ? 'dept-login-title text-[clamp(2.6rem,6vw,5.5rem)] font-semibold tracking-tight text-[#111827] leading-[1.05]' : 'dept-login-title text-[clamp(4.5rem,13vw,11.5rem)] font-black tracking-tighter text-[#111827] leading-[0.85] uppercase'}>
            {roleTitle || theme.monumentalTitle}
          </h1>

          <p className="dept-login-jurisdiction mt-3 text-sm sm:text-base font-medium text-slate-600 max-w-md">
            {theme.jurisdiction}
          </p>
        </div>

        {/* Right Side: Purposefully Placed Frosted Glass Login Form */}
        <div className="w-full lg:w-auto lg:min-w-[420px] lg:max-w-[460px] self-center">
          <GlassCard
            variant="light"
            className="dept-login-card p-7 sm:p-9 bg-white/75 backdrop-blur-2xl border border-black/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.08)]"
          >
            {/* Header inside Card */}
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111827]">
                {roleTitle ? `${roleTitle} sign in` : theme.titleEn}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {roleTitle ? `${theme.name} · Individual ${targetRole} account` : `${theme.name} • ${theme.subtitleEn}`}
              </p>
            </div>
            <nav className="dept-login-nav mb-6 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Staff workspace type">
              <Link to={`/department/head/login?dept=${departmentId}`} aria-current={targetRole === 'head' ? 'page' : undefined} className={`flex-1 rounded-md px-3 py-2.5 text-center text-xs font-semibold ${targetRole === 'head' ? 'bg-[#102e30] text-white' : 'text-slate-600 hover:bg-white'}`}>Department Head</Link>
              <Link to={`/department/officer/login?dept=${departmentId}`} aria-current={targetRole === 'officer' ? 'page' : undefined} className={`flex-1 rounded-md px-3 py-2.5 text-center text-xs font-semibold ${targetRole === 'officer' ? 'bg-[#102e30] text-white' : 'text-slate-600 hover:bg-white'}`}>Field Officer</Link>
            </nav>

            {isLocalDemonstration && (
              <div className="dept-login-demo mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700" role="status">
                <p>Local demonstration mode: this browser is not connected to Supabase. {roleTitle ? `Use the ${roleTitle} account (${defaultUsername}). ` : ''}Live staff accounts will not work here.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Show temporary local access key</summary>
                  <code className="mt-2 block select-all break-all">{getLocalDemoCredentials().staffPassword}</code>
                </details>
              </div>
            )}

            {isLiveAuthMissing && (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900" role="status">
                Department sign-in is not configured. Contact the administrator to connect the authentication service.
              </p>
            )}

            {/* Revocation Warning Alert */}
            {revocationNotice && (
              <div
                className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3"
                role="alert"
              >
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-red-800">Account Access Revoked</div>
                  <p className="mt-0.5 text-red-700 leading-relaxed">
                    {revocationNotice}
                  </p>
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
                  <p className="mt-0.5 text-amber-700 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Login Form */}
            {mfaStep ? <form onSubmit={verifyMfa} className="space-y-4" aria-label="Authenticator verification">
              <h2 className="text-xl font-extrabold text-slate-900">Verify your identity</h2>
              <p className="text-sm text-slate-700">Enter the six-digit code from your authenticator app. This second step is required for every officer and department head.</p>
              {mfaQr && <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-700 mb-2">Set up your authenticator first</p><img src={mfaQr} alt="Authenticator setup QR code" className="w-48 h-48 mx-auto"/><p className="text-xs text-slate-500 mt-2 break-all">Manual setup key: {mfaSecret}</p></div>}
              <label htmlFor="dept-totp" className="block text-xs font-bold text-slate-800">Six-digit verification code</label><input id="dept-totp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base tracking-[.3em]"/>
              <GlassButton type="submit" variant="dark" isLoading={isLoading} className="w-full">Verify &amp; open workspace</GlassButton>
            </form> : <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <GlassInput
                id={isRoads ? 'roads-username' : `${departmentId}-username`}
                label={isLocalDemonstration?'Username':'Work email'}
                type={isLocalDemonstration?'text':'email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isLocalDemonstration?defaultUsername:'officer@department.gov.pk'}
                autoComplete="username"
                required
                disabled={isLoading}
                leadingIcon={<User className="w-4 h-4" />}
                variant="light"
              />

              <GlassInput
                id={isRoads ? 'roads-access-key' : `${departmentId}-access-key`}
                label={isLocalDemonstration?'Access key (local demo)':'Password'}
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
            </form>}

            {/* Back to Department Selection Link */}
            <div className="mt-5 pt-4 border-t border-black/[0.08] text-center">
              <button
                type="button"
                onClick={onBackToDepartmentSelection}
                className="text-xs font-semibold text-slate-500 hover:text-[#111827] transition-colors cursor-pointer"
              >
                ← Switch Department
              </button>
            </div>
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
