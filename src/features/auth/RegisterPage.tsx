import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { CivicEmblem } from '../../components/common/CivicEmblem';
import { RegistrationArtwork } from './components/RegistrationArtwork';
import { Mail, Lock, User, Phone, Eye, EyeOff, Shield } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export const RegisterPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      setSubmitted(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setSubmitted(false);
      return;
    }

    if (!/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
      setError('Include an uppercase letter, a number and a special symbol.');
      setSubmitted(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitted(false);
      return;
    }

    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Live registration is not configured.');
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim() }, emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      if (data.session) {
        navigate(returnTo, { replace: true });
      } else {
        setNotice('If this address can be registered, a confirmation email has been sent. (Supabase free-tier rate limits email delivery to 2/hour).');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create your account.'); }
    finally { setSubmitted(false); }
  };

  return (
    <div className="w-full bg-[#F7F6F3] min-h-[calc(100svh-80px)] flex flex-col justify-center items-center py-6 sm:py-8 px-4">
      {/* Balanced editorial registration layout; remain single-column on mobile. */}
      <div className="w-full max-w-[1060px] bg-white rounded-[24px] border border-[#EAE7E2] shadow-[0_16px_48px_rgba(20,20,20,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-start lg:items-stretch">
        {/* LEFT COLUMN: 43% Form Section */}
        <div className="w-full min-w-0 p-5 sm:px-9 sm:py-8 lg:px-10 lg:py-10 flex flex-col justify-between text-start">
          <div className="max-w-[460px] w-full mx-auto lg:mx-0">
            {/* Brand Mark */}
            <div className="flex items-center gap-2 mb-3">
              <CivicEmblem size="sm" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#74706C] font-semibold">
                Awaaz-e-Awam
              </span>
            </div>

            {/* Main Heading & Subtitle */}
            <h1 className="font-display font-black text-[clamp(1.85rem,5.8vw,2.45rem)] text-[#171717] tracking-[-0.035em] leading-[1.12] mb-2">
              {t('authRegisterTitle')}
            </h1>
            <p className="text-base text-[#514B46] leading-relaxed mb-5 sm:mb-6">
              {t('authRegisterSubtitle')}
            </p>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
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
                    minLength={8}
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
                <p className="text-xs font-medium leading-relaxed text-[#625D58]">
                  {isRTL
                    ? 'کم از کم 8 حروف، ایک بڑا انگریزی حرف، ایک عدد اور ایک خاص علامت۔'
                    : '8+ characters, one uppercase letter, one number and one special symbol.'}
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-[#282424] select-none font-ui"
                >
                  {t('authConfirmPassword')} <span className="text-[#681822]">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} pointer-events-none text-[#74706C]`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    required
                    minLength={8}
                    placeholder={t('authConfirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full h-[44px] rounded-[9px] border border-[#E5E1DE] bg-white text-[13px] text-[#171717] placeholder:text-[#A8A39F] transition-all outline-none focus:border-[#681822] focus:ring-2 focus:ring-[#681822]/15 hover:border-[#CDC8C0] text-start ${
                      isRTL ? 'pe-10 ps-9' : 'ps-9 pe-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('passwordHide') : t('passwordShow')}
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      isRTL ? 'left-2.5' : 'right-2.5'
                    } p-1 text-[#74706C] hover:text-[#171717] transition-colors cursor-pointer`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitted}
                  className="w-full min-h-[50px] rounded-xl bg-[#681822] hover:bg-[#52131b] active:scale-[0.99] text-white font-bold text-[15px] font-ui transition-all duration-200 cursor-pointer shadow-xs hover:shadow focus:ring-2 focus:ring-[#681822]/30 outline-none flex items-center justify-center gap-2"
                >
                  {submitted ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{t('authRegisterButton')}</span>
                  )}
                </button>
              </div>
              {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</p>}

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

          {/* Account security note */}
          <div className="max-w-[460px] w-full mx-auto lg:mx-0 mt-5 pt-3 border-t border-[#F4F3F0]">
            <div className="flex items-start gap-2 text-[11px] text-[#74706C] font-ui">
              <Shield className="w-3.5 h-3.5 text-[#681822] shrink-0 mt-0.5" />
              <span>
                Your account keeps complaints together. Guests can still track with their private number without signing up.
              </span>
            </div>
          </div>
        </div>

        {/* Compact contextual service panel; never a second, oversized blank artwork. */}
        <div className="w-full min-w-0 p-3 sm:p-5 lg:p-6 flex flex-col">
          <RegistrationArtwork />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
