import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // UI foundation only: navigate to dashboard as demonstration
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex justify-center">
            <CivicEmblem size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('authSignInTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            {t('authSignInSubtitle')}
          </p>
        </div>

        <Card className="p-6 sm:p-8 text-start">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('authEmail')}
              type="email"
              required
              id="email"
              placeholder={t('authEmailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  {t('authPassword')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-teal-700 hover:text-teal-900 cursor-pointer">
                  {t('authForgotPassword')}
                </span>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                id="password"
                placeholder={t('authPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('passwordHide') : t('passwordShow')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors"
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

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>{t('authRememberMe')}</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={submitted}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              {t('authSignInButton')}
            </Button>

            {/* Direct Demo Exploration Mode */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">{t('authOr')}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full border-teal-300 text-teal-800 hover:bg-teal-50 font-semibold"
              onClick={() => navigate('/dashboard')}
              leftIcon={<Sparkles className="w-4 h-4 text-teal-600" />}
            >
              {t('authExploreDemo')}
            </Button>

            <div className="text-center pt-2 border-t border-slate-100">
              <Link
                to="/register"
                className="text-xs sm:text-sm font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
              >
                <span>{t('authNoAccount')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </form>
        </Card>

        {/* Security Notice: Supabase planned for Phase 2 */}
        <div className="mt-6">
          <AlertBanner type="info" title={t('authNoticeTitle')}>
            {t('authNoticeText')}
          </AlertBanner>
        </div>
      </Container>
    </div>
  );
};
