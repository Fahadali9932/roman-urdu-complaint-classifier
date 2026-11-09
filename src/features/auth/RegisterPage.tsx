import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Lock, User, Phone, UserPlus, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
    }, 500);
  };

  return (
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex justify-center mb-1">
            <CivicEmblem size="md" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#101A28] uppercase tracking-tight">
            {t('authRegisterTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#263E59] max-w-xs mx-auto font-ui">
            {t('authRegisterSubtitle')}
          </p>
        </div>

        <div className="bg-white border border-[#DFD9CF] rounded-2xl p-6 sm:p-10 text-start space-y-4 shadow-xl shadow-[#101A28]/06">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('formCitizenName')}
              required
              id="fullName"
              placeholder={t('formCitizenNamePlaceholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-[#5A626E]" />}
            />

            <Input
              label={t('authEmail')}
              type="email"
              required
              id="email"
              placeholder={t('authEmailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-[#5A626E]" />}
            />

            <Input
              label={t('formPhone')}
              required
              id="phone"
              placeholder={t('formPhonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-[#5A626E]" />}
              helperText="Format: 03XXXXXXXXX"
            />

            <Input
              label={t('authPassword')}
              type={showPassword ? 'text' : 'password'}
              required
              id="password"
              placeholder={t('authPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-[#5A626E]" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('passwordHide') : t('passwordShow')}
                  className="p-1.5 text-[#5A626E] hover:text-[#101A28] focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={submitted}
              leftIcon={<UserPlus className="w-4 h-4 text-[#D5B995]" />}
            >
              {t('authRegisterButton')}
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#DFD9CF]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-[#5A626E] font-medium text-[11px]">{t('authOr')}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full font-medium text-xs"
              onClick={() => navigate('/dashboard')}
            >
              {t('authExploreDemo')}
            </Button>

            <div className="text-center pt-2 border-t border-[#DFD9CF]">
              <Link
                to="/login"
                className="text-xs font-semibold text-[#263E59] hover:text-[#88413F] inline-flex items-center gap-1"
              >
                <span>{t('authHaveAccount')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </form>
        </div>

        {/* Prototype Transparency Notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#D5B995]/45 text-start flex items-start gap-2.5 text-xs text-[#5A626E]">
          <Shield className="w-4 h-4 text-[#88413F] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[#101A28] block">
              {t('authNoticeTitle')}
            </span>
            <p className="text-[11px] leading-relaxed">
              {t('authNoticeText')}
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};
