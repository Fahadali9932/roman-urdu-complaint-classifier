import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export const LoginPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from || '/dashboard';
  const initialError = (location.state as { error?: string } | null)?.error || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(initialError);
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setSubmitted(true);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Live sign-in is not configured.');
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError || profile?.role !== 'citizen') {
        await supabase.auth.signOut();
        throw new Error('This is a department account. Please use the department sign-in page.');
      }
      navigate(returnTo, { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to sign in.';
      setError(message === 'Invalid login credentials'
        ? 'Email or password is incorrect. Try again, reset your password, or create an account.'
        : message);
    }
    finally { setSubmitted(false); }
  };

  const handlePasswordReset = async () => {
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError('Enter your email address first, then select “Forgot password?”.');
      return;
    }
    if (!isSupabaseConfigured() || !supabase) {
      setError('Live password recovery is not configured.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetMessage('If that address has an account, a password-reset link has been sent.');
  };

  return (
    <div className="py-10 sm:py-16">
      <Container size="sm">
        <div className="text-center space-y-2.5 mb-8">
          <div className="inline-flex justify-center mb-1">
            <CivicEmblem size="md" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-4xl text-[#141414] uppercase tracking-tight">
            {t('authSignInTitle')}
          </h1>
          <p className="text-sm sm:text-base text-[#5A554E] max-w-sm mx-auto font-ui">
            {t('authSignInSubtitle')}
          </p>
        </div>

        <div className="bg-white border border-[#D9D3CC] rounded-[24px] sm:rounded-[28px] p-6 sm:p-10 text-start space-y-6 shadow-[0_16px_48px_rgba(20,20,20,0.06)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs sm:text-[13px] text-red-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-red-950 block">Authentication Notice</span>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>
            )}
            <Input
              label={t('authEmail')}
              type="email"
              required
              id="email"
              placeholder={t('authEmailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-[#625D58]" />}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-[13px] font-bold text-[#141414] uppercase tracking-wider"
                >
                  {t('authPassword')} <span className="text-[#681822]">*</span>
                </label>
                <button type="button" onClick={handlePasswordReset} className="text-xs sm:text-sm font-semibold text-[#625D58] hover:text-[#681822] hover:underline cursor-pointer">
                  {t('authForgotPassword')}
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                id="password"
                placeholder={t('authPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-[#625D58]" />}
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('passwordHide') : t('passwordShow')}
                    className="p-1.5 text-[#625D58] hover:text-[#141414] focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-[#5A554E]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-[#D9D3CC] bg-white text-[#681822] focus:ring-[#681822] h-4 w-4"
                />
                <span className="font-medium">{t('authRememberMe')}</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full min-h-[50px] sm:min-h-[54px] rounded-xl text-base font-bold"
              isLoading={submitted}
              leftIcon={<LogIn className="w-4 h-4 text-[#FFFFFF]" />}
            >
              Sign in securely
            </Button>
            {resetMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{resetMessage}</p>}

            <div className="text-center pt-3 border-t border-[#EAE7E2]">
              <Link
                to="/register"
                className="text-xs sm:text-sm font-bold text-[#141414] hover:text-[#681822] inline-flex items-center gap-1.5"
              >
                <span>{t('authNoAccount')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </form>
        </div>

        {/* Account security note */}
        <div className="mt-6 p-4 rounded-2xl bg-[#FAF9F7] border border-[#D9D3CC] text-start flex items-start gap-3 text-xs sm:text-sm text-[#5A554E]">
          <Shield className="w-5 h-5 text-[#681822] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[#141414] block">
              Secure citizen access
            </span>
            <p className="text-xs leading-relaxed">
              Sign in to view your complaint history, receive real-time updates, or claim previous complaints.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};
