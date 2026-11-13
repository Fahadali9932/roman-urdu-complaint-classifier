import React, { useState } from 'react';
import { ArrowLeft, ShieldAlert, KeyRound, User, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { staffAuthService } from '../../services/staffAuthService';
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
  const { signInWithCredentials } = useDepartmentAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // 1. Authenticate with backend service using Username + Access Key & strict department check
      const res = await staffAuthService.signInDepartmentStaffWithUsername(
        trimmedUsername,
        accessKey,
        departmentId
      );

      if (!res.success) {
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

      // 2. Strict Server-Side Department Verification
      const authenticatedDeptId = res.session?.departmentId;
      if (authenticatedDeptId !== departmentId) {
        staffAuthService.signOutStaff();
        const otherDeptName =
          res.session?.departmentName || authenticatedDeptId?.toUpperCase() || 'another agency';
        setErrorMessage(
          `Access Denied: Your staff account is authorized for "${otherDeptName}". You cannot access the ${theme.shortName} console with these credentials. Please return to Department Selection.`
        );
        return;
      }

      // 3. Establish Context Session and navigate to workspace
      const contextRes = await signInWithCredentials(trimmedUsername, accessKey, departmentId);
      if (contextRes.success) {
        navigate('/department', { replace: true });
      } else {
        setErrorMessage(contextRes.error || 'Failed to establish departmental session.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected authentication error.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
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
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                {theme.titleEn}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {theme.name} • {theme.subtitleEn}
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
