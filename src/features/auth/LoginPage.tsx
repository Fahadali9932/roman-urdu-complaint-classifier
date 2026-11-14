import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export const LoginPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
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
        throw new Error('This sign-in is only for citizen accounts. Department staff should use the Department Portal.');
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
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex justify-center mb-1">
            <CivicEmblem size="md" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#141414] uppercase tracking-tight">
            {t('authSignInTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#323232] max-w-xs mx-auto font-ui">
            {t('authSignInSubtitle')}
          </p>
        </div>

        <div className="bg-white border border-[#E5E3E0] rounded-2xl p-5 sm:p-10 text-start space-y-5 shadow-[0_12px_36px_rgba(20,20,20,0.06)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <Input
              label={t('authEmail')}
              type="email"
              required
              id="email"
              placeholder={t('authEmailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-[#323232]" />}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#141414] uppercase tracking-wider"
                >
                  {t('authPassword')} <span className="text-[#681822]">*</span>
                </label>
                <button type="button" onClick={handlePasswordReset} className="text-xs text-[#323232] hover:text-[#681822] hover:underline cursor-pointer">
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
                leftIcon={<Lock className="w-4 h-4 text-[#323232]" />}
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('passwordHide') : t('passwordShow')}
                    className="p-1.5 text-[#323232] hover:text-[#141414] focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors cursor-pointer"
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

            <div className="flex items-center justify-between text-xs text-[#323232]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-[#E5E3E0] bg-white text-[#141414] focus:ring-[#681822]"
                />
                <span>{t('authRememberMe')}</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={submitted}
              leftIcon={<LogIn className="w-4 h-4 text-[#FFFFFF]" />}
            >
              Sign in securely
            </Button>
            {resetMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{resetMessage}</p>}

            <div className="text-center pt-2 border-t border-[#E5E3E0]">
              <Link
                to="/register"
                className="text-xs font-semibold text-[#141414] hover:text-[#681822] inline-flex items-center gap-1"
              >
                <span>{t('authNoAccount')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </form>
        </div>

        {/* Account security note */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] text-start flex items-start gap-2.5 text-xs text-[#323232]">
          <Shield className="w-4 h-4 text-[#681822] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[#141414] block">
              Secure citizen access
            </span>
            <p className="text-[11px] leading-relaxed">
              Sign in to view private complaint details or claim a guest complaint with its reference number and private claim code.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};
