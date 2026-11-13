import React, { useState } from 'react';
import { ArrowLeft, ShieldAlert, CheckCircle2, Lock, Mail, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { staffAuthService } from '../../services/staffAuthService';
import { DepartmentBackground } from './design-system/DepartmentBackground';
import { GlassCard } from './design-system/GlassCard';
import { GlassInput } from './design-system/GlassInput';
import { GlassButton } from './design-system/GlassButton';
import { DEPARTMENT_THEMES } from './design-system/tokens';

interface RoadsLoginScreenProps {
  onBackToDepartmentSelection: () => void;
  isOnline?: boolean;
}

export const RoadsLoginScreen: React.FC<RoadsLoginScreenProps> = ({
  onBackToDepartmentSelection,
  isOnline = true,
}) => {
  const { signInWithCredentials } = useDepartmentAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [workEmail, setWorkEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roadsTheme = DEPARTMENT_THEMES.kmc;

  // Real-time Revocation Query Parameter Detection (Derived directly during render)
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

    const trimmedEmail = workEmail.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your assigned work email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password / access key.');
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
      // 1. Authenticate with backend service
      const res = await staffAuthService.signInDepartmentStaff(trimmedEmail, password);

      if (!res.success) {
        if (res.status === 'revoked') {
          setExplicitRevocation(
            `Access Revoked: ${res.rejectionReason || 'Withdrawn by Main Administrator.'}`
          );
        } else if (res.status === 'invalid_password') {
          setErrorMessage('Invalid password or credentials. Please verify your work access key.');
        } else if (res.status === 'not_found') {
          setErrorMessage('No authorized departmental account found for this email.');
        } else {
          setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
        }
        return;
      }

      // 2. Strict Server-Side Department Verification
      const authenticatedDeptId = res.session?.departmentId;
      if (authenticatedDeptId !== 'kmc') {
        // Sign out immediately to prevent cross-department privilege escalation
        staffAuthService.signOutStaff();
        const otherDeptName = res.session?.departmentName || authenticatedDeptId?.toUpperCase() || 'another agency';
        setErrorMessage(
          `Access Denied: Your staff account is authorized for "${otherDeptName}". You cannot access the Roads & Infrastructure console with these credentials. Please return to Department Selection.`
        );
        return;
      }

      // 3. Establish Context Session and navigate to workspace
      const contextRes = await signInWithCredentials(trimmedEmail, password);
      if (contextRes.success) {
        navigate('/department');
      } else {
        setErrorMessage(contextRes.error || 'Failed to establish departmental session.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DepartmentBackground departmentId="kmc" showRoadGeometry={true}>
      <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <button
            type="button"
            onClick={onBackToDepartmentSelection}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Department Selection</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider"
              style={{
                backgroundColor: roadsTheme.badgeBg,
                color: roadsTheme.badgeText,
                border: `1px solid ${roadsTheme.badgeBorder}`,
              }}
            >
              KMC • ROADS
            </span>
          </div>
        </header>

        {/* Center Glassmorphism Login Composition */}
        <main className="my-auto py-8 sm:py-12 flex items-center justify-center w-full">
          <div className="w-full max-w-lg">
            <GlassCard
              className="p-6 sm:p-10"
              accentBorderColor="#D4AF37"
              glowColor="rgba(212, 175, 55, 0.15)"
            >
              {/* Header inside Card */}
              <div className="space-y-3 mb-8">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[10px] sm:text-[11px] font-semibold text-[#F3E5AB]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>MUNICIPAL ROADS & INFRASTRUCTURE</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                    PORTAL ACCESS
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                  ROADS & INFRASTRUCTURE
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Karachi Metropolitan Corporation • Department Staff Sign-In
                </p>
              </div>

              {/* Revocation Warning Alert */}
              {revocationNotice && (
                <div
                  className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3"
                  role="alert"
                >
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-300">Account Access Revoked</div>
                    <p className="mt-0.5 text-red-200/90 leading-relaxed">
                      {revocationNotice}
                    </p>
                  </div>
                </div>
              )}

              {/* General Error Banner */}
              {errorMessage && (
                <div
                  className="mb-6 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3"
                  role="alert"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-amber-300">Authentication Alert</div>
                    <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <GlassInput
                  id="roads-work-email"
                  label="Assigned Work Email"
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="officer@kmc.gos.pk"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  leadingIcon={<Mail className="w-4 h-4" />}
                  accentColor="#D4AF37"
                />

                <GlassInput
                  id="roads-password"
                  label="Access Key / Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  leadingIcon={<Lock className="w-4 h-4" />}
                  accentColor="#D4AF37"
                />

                <div className="pt-2">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    accentColor="#D4AF37"
                    accentHoverColor="#E5C158"
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Sign In to Roads Console
                  </GlassButton>
                </div>
              </form>

              {/* Institutional Assurance */}
              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  <span>Server-Verified Authority</span>
                </span>
                <span className="font-mono text-[10px]">
                  256-BIT TLS ENCRYPTED
                </span>
              </div>
            </GlassCard>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
          <span>Karachi Metropolitan Corporation • Engineering & Works Division</span>
          <button
            type="button"
            onClick={onBackToDepartmentSelection}
            className="text-slate-300 hover:text-white underline cursor-pointer"
          >
            Switch Authority
          </button>
        </footer>
      </div>
    </DepartmentBackground>
  );
};
