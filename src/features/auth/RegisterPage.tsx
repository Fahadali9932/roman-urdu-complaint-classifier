import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { RegistrationArtwork } from './components/RegistrationArtwork';
import { Mail, Lock, User, Phone, Eye, EyeOff, Shield } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setShowNotice(true);
    setTimeout(() => {
      setSubmitted(false);
    }, 600);
  };

  return (
    <div className="w-full bg-[#F7F6F3] min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-6 sm:py-8 md:py-10 px-4">
      {/* Main Registration Container (1100px desktop, 28px radius, two columns 43/57) */}
      <div className="w-full max-w-[1100px] bg-white rounded-[28px] border border-[#EAE7E2] shadow-[0_28px_75px_rgba(20,20,20,0.08)] overflow-hidden flex flex-col lg:flex-row items-stretch transition-all duration-300">
        {/* LEFT COLUMN: 43% Form Section */}
        <div className="w-full lg:w-[43%] p-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8 flex flex-col justify-between text-start">
          <div className="max-w-[355px] w-full mx-auto lg:mx-0">
            {/* Brand Mark */}
            <div className="flex items-center gap-2 mb-3">
              <CivicEmblem size="sm" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#74706C] font-semibold">
                Awaaz-e-Awam
              </span>
            </div>

            {/* Main Heading & Subtitle */}
            <h1 className="font-display font-black text-[26px] sm:text-[29px] text-[#171717] tracking-[-0.035em] leading-[1.12] mb-1.5">
              {t('authRegisterTitle')}
            </h1>
            <p className="text-xs text-[#74706C] leading-[1.45] mb-4 sm:mb-5">
              {t('authRegisterSubtitle')}
            </p>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold text-[#282424] select-none font-ui"
                >
                  {t('formCitizenName')} <span className="text-[#681822]">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#74706C]`}>
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder={t('formCitizenNamePlaceholder')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full h-[44px] rounded-[9px] border border-[#E5E1DE] bg-white text-[13px] text-[#171717] placeholder:text-[#A8A39F] transition-all outline-none focus:border-[#681822] focus:ring-2 focus:ring-[#681822]/15 hover:border-[#CDC8C0] ${
                      isRTL ? 'pe-3 ps-9' : 'ps-9 pe-3'
                    }`}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-[#282424] select-none font-ui"
                >
                  {t('authEmail')} <span className="text-[#681822]">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#74706C]`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    dir="ltr"
                    required
                    placeholder={t('authEmailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full h-[44px] rounded-[9px] border border-[#E5E1DE] bg-white text-[13px] text-[#171717] placeholder:text-[#A8A39F] transition-all outline-none focus:border-[#681822] focus:ring-2 focus:ring-[#681822]/15 hover:border-[#CDC8C0] text-start ${
                      isRTL ? 'pe-3 ps-9' : 'ps-9 pe-3'
                    }`}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold text-[#282424] select-none font-ui"
                >
                  {t('formPhone')} <span className="text-[#681822]">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#74706C]`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    required
                    placeholder="03001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full h-[44px] rounded-[9px] border border-[#E5E1DE] bg-white text-[13px] text-[#171717] placeholder:text-[#A8A39F] transition-all outline-none focus:border-[#681822] focus:ring-2 focus:ring-[#681822]/15 hover:border-[#CDC8C0] text-start ${
                      isRTL ? 'pe-3 ps-9' : 'ps-9 pe-3'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#282424] select-none font-ui"
                >
                  {t('authPassword')} <span className="text-[#681822]">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#74706C]`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    required
                    placeholder={t('authPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full h-[44px] rounded-[9px] border border-[#E5E1DE] bg-white text-[13px] text-[#171717] placeholder:text-[#A8A39F] transition-all outline-none focus:border-[#681822] focus:ring-2 focus:ring-[#681822]/15 hover:border-[#CDC8C0] text-start ${
                      isRTL ? 'pe-10 ps-9' : 'ps-9 pe-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('passwordHide') : t('passwordShow')}
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      isRTL ? 'left-2.5' : 'right-2.5'
                    } p-1 text-[#74706C] hover:text-[#171717] transition-colors cursor-pointer`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitted}
                  className="w-full h-[44px] rounded-[9px] bg-[#681822] hover:bg-[#52131b] active:scale-[0.99] text-white font-semibold text-[13px] font-ui transition-all duration-200 cursor-pointer shadow-xs hover:shadow focus:ring-2 focus:ring-[#681822]/30 outline-none flex items-center justify-center gap-2"
                >
                  {submitted ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{t('authRegisterButton')}</span>
                  )}
                </button>
              </div>

              {/* Divider & Secondary Action */}
              <div className="relative my-2 pt-0.5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#F1EFEC]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-[#A8A39F] font-mono text-[11px]">
                    {t('authOr')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full h-[40px] rounded-[9px] border border-[#E5E1DE] bg-[#FAF9F7] hover:bg-white hover:border-[#CDC8C0] text-[#171717] font-medium text-xs font-ui transition-colors cursor-pointer"
              >
                {t('authExploreDemo')}
              </button>

              {/* Bottom Login Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#74706C] font-ui">
                  <span>{t('authHaveAccount')}{' '}</span>
                  <Link
                    to="/login"
                    className="font-semibold text-[#681822] hover:text-[#52131b] hover:underline transition-colors"
                  >
                    {t('authLoginLink') || 'Log in'}
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Prototype Reassurance Notice */}
          <div className="max-w-[355px] w-full mx-auto lg:mx-0 mt-3.5 pt-2.5 border-t border-[#F4F3F0]">
            <div className="flex items-start gap-2 text-[11px] text-[#74706C] font-ui">
              <Shield className="w-3.5 h-3.5 text-[#681822] shrink-0 mt-0.5" />
              <span>
                {t('authNoticeText') || 'This preview does not create live accounts or store sensitive credentials.'}
              </span>
            </div>
            {showNotice && (
              <p className="mt-2 text-[11px] text-[#681822] font-semibold font-ui bg-[#681822]/5 p-2 rounded-lg border border-[#681822]/15">
                {t('authNoticeTitle')}: {t('authNoticeText')}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 57% Artwork-Led Panel */}
        <div className="w-full lg:w-[57%] p-3.5 sm:p-4.5 lg:p-5 flex flex-col">
          <RegistrationArtwork />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
