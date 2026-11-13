import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type DepartmentId } from '../../types';
import { StaffAuthLayout } from '../auth/components/StaffAuthLayout';
import { DepartmentSelector } from '../auth/components/DepartmentSelector';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Building2,
  AlertCircle,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const DepartmentLoginPage: React.FC = () => {
  const { availableDepartments, signIn } = useDepartmentAuth();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Sign In Form State (Frame 35:1332)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInNotice, setSignInNotice] = useState<string | null>(null);

  // Request Access Form State (Frame 35:1363)
  const [reqDepartment, setReqDepartment] = useState<DepartmentId | ''>('kelectric');
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [showReqPassword, setShowReqPassword] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  // Pending Approval State Toggle (Frame 35:1390)
  const [isAccessRequested, setIsAccessRequested] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Handle Sign In (Frame 35:1332)
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInNotice(null);

    if (!signInEmail.trim()) {
      setSignInError(
        language === 'ur'
          ? 'براہ کرم اپنا دفتری ای میل درج کریں۔'
          : 'Please enter your work email.'
      );
      return;
    }
    if (!signInPassword) {
      setSignInError(
        language === 'ur'
          ? 'براہ کرم اپنا پاس ورڈ درج کریں۔'
          : 'Please enter your password.'
      );
      return;
    }

    // Try finding matching department by email or default to KE for preview
    const matchingDept = availableDepartments.find((d) =>
      signInEmail.toLowerCase().includes(d.id.toLowerCase())
    ) || availableDepartments[0];

    // Local prototype sign-in for preview testing without saving password
    const res = signIn(matchingDept.id);
    if (res.success) {
      navigate('/department');
    } else {
      setSignInError(res.error || 'Authentication failed.');
    }
  };

  // Handle Request Access Submission (Frame 35:1363 -> Frame 35:1390)
  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);

    if (!reqDepartment) {
      setReqError(
        language === 'ur'
          ? 'براہ کرم اپنا متعلقہ محکمہ منتخب کریں۔'
          : 'Please select your department.'
      );
      return;
    }
    if (!reqFullName.trim()) {
      setReqError(
        language === 'ur'
          ? 'براہ کرم اپنا مکمل نام درج کریں۔'
          : 'Please enter your full name.'
      );
      return;
    }
    if (!reqEmail.trim() || !reqEmail.includes('@')) {
      setReqError(
        language === 'ur'
          ? 'براہ کرم ایک درست دفتری ای میل درج کریں۔'
          : 'Please enter a valid work email.'
      );
      return;
    }
    if (!reqPassword || reqPassword.length < 6) {
      setReqError(
        language === 'ur'
          ? 'پاس ورڈ کم از کم 6 حروف پر مشتمل ہونا چاہیے۔'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    // Transition to Pending Approval State (Frame 35:1390)
    // NOTE: ZERO passwords stored in localStorage or sessionStorage
    setIsAccessRequested(true);
  };

  return (
    <StaffAuthLayout activeRole="department">
      <div className="space-y-8">
        {/* =====================================================================
            SECTION 1: DEPARTMENT SIGN IN (Figma Frame 35:1332)
            ===================================================================== */}
        <section className="space-y-5" aria-labelledby="dept-signin-heading">
          {/* Header Block */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-mono font-semibold tracking-wide text-[#0F1E21]">
              <Building2 className="w-3.5 h-3.5 text-[#122E32]" />
              <span>{language === 'ur' ? 'محکمہ پورٹل' : 'Department Portal'}</span>
            </div>

            <h2
              id="dept-signin-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E21]"
            >
              {language === 'ur' ? 'سائن ان' : 'Sign in'}
            </h2>

            <p className="text-sm font-semibold text-[#0F1E21]">
              {language === 'ur' ? 'خوش آمدید' : 'Welcome back.'}
            </p>

            <p className="text-sm text-[#64748B] leading-relaxed">
              {language === 'ur'
                ? 'اپنے منظور شدہ محکمانہ اکاؤنٹ سے لاگ ان کریں۔'
                : 'Sign in with your approved departmental account.'}
            </p>
          </div>

          {/* Feedback messages */}
          {signInError && (
            <div
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{signInError}</span>
            </div>
          )}

          {signInNotice && (
            <div
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2"
              role="status"
            >
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{signInNotice}</span>
            </div>
          )}

          {/* Department Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Work email */}
            <div className="space-y-1.5">
              <label
                htmlFor="dept-signin-email"
                className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider"
              >
                {language === 'ur' ? 'دفتری ای میل' : 'Work email'}
              </label>
              <input
                id="dept-signin-email"
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="name@example.org"
                className="staff-input"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="dept-signin-password"
                  className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider"
                >
                  {language === 'ur' ? 'پاس ورڈ' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSignInNotice(
                      language === 'ur'
                        ? 'پاس ورڈ ری سیٹ کی سہولت تصدیقی بیک اینڈ کے ساتھ فعال ہوگی۔'
                        : 'Password reset will be available once the backend auth system is connected.'
                    )
                  }
                  className="text-xs font-medium text-[#64748B] hover:text-[#0F1E21] transition-colors cursor-pointer"
                >
                  {language === 'ur' ? 'پاس ورڈ بھول گئے؟' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="dept-signin-password"
                  type={showSignInPassword ? 'text' : 'password'}
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder={
                    language === 'ur' ? 'اپنا پاس ورڈ درج کریں' : 'Enter your password'
                  }
                  className="staff-input pr-10 rtl:pr-4 rtl:pl-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute inset-y-0 right-0 pr-3 rtl:right-auto rtl:left-0 rtl:pl-3 flex items-center text-[#64748B] hover:text-[#0F1E21] cursor-pointer transition-colors"
                  title={showSignInPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign in button (Figma 35:1360 / Continue to portal) */}
            <button
              type="submit"
              className="staff-btn-primary w-full mt-2"
            >
              <span>{language === 'ur' ? 'پورٹل میں داخل ہوں' : 'Continue to portal'}</span>
              <ArrowIcon className="w-4 h-4 staff-icon-arrow" />
            </button>

            {/* Sub-navigation links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-[#64748B]">
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="font-medium hover:text-[#0F1E21] transition-colors cursor-pointer"
              >
                {language === 'ur'
                  ? 'مین ایڈمنسٹریٹر لاگ ان →'
                  : 'Main Administrator sign in →'}
              </button>
              <span>
                {language === 'ur'
                  ? 'پروٹوٹائپ • انٹرفیس معائنے کے لیے'
                  : 'Prototype • Visual interface inspection'}
              </span>
            </div>
          </form>
        </section>

        {/* =====================================================================
            SECTION 2: REQUEST ACCESS / PENDING APPROVAL (Figma Frames 35:1363 & 35:1390)
            ===================================================================== */}
        <section
          className="staff-subtle-card p-6 sm:p-7 space-y-4"
          aria-labelledby="dept-request-heading"
        >
          {isAccessRequested ? (
            /* --- STATE / Department / Access requested (Figma Frame 35:1390) --- */
            <div className="space-y-4 py-2" role="region" aria-live="polite">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3
                    id="dept-request-heading"
                    className="text-base sm:text-lg font-bold text-[#0F1E21]"
                  >
                    {language === 'ur'
                      ? 'ایڈمنسٹریٹر کی منظوری کا انتظار ہے'
                      : 'Awaiting administrator approval'}
                  </h3>
                  <span className="text-xs font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">
                    {language === 'ur' ? 'زیرِ جائزہ' : 'PENDING REVIEW'}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                {language === 'ur'
                  ? 'یہ درخواست زیرِ جائزہ ہے۔ ایک بار جب ایڈمنسٹریٹر آپ کی رسائی کی تصدیق کر دے گا تو آپ لاگ ان کر سکیں گے۔'
                  : 'This sample request is pending review. You can sign in once an administrator approves your access.'}
              </p>

              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 text-[#0F1E21] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#122E32]" />
                  <span>
                    {language === 'ur'
                      ? 'انتظامی گورننس ضابطہ'
                      : 'Administrative Governance Policy'}
                  </span>
                </div>
                <p>
                  {language === 'ur'
                    ? 'عملے کو صرف اپنے متعلقہ محکمے کی شکایات تک رسائی حاصل ہوتی ہے۔ شہریوں کے نجی رابطے کے کوائف مخفی رکھے جاتے ہیں۔'
                    : 'Staff access only assigned complaints. Citizen contact details are restricted.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="font-mono text-[#64748B] text-[11px]">
                  {language === 'ur'
                    ? 'ڈیزائن نمونہ • کوئی اکاؤنٹ نہیں بنایا گیا'
                    : 'Design example • No account is created'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAccessRequested(false)}
                  className="font-semibold text-[#122E32] hover:underline cursor-pointer"
                >
                  {language === 'ur'
                    ? 'دوسری درخواست جمع کرائیں'
                    : 'Submit another request'}
                </button>
              </div>
            </div>
          ) : (
            /* --- Department access / request preview (Figma Frame 35:1363) --- */
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3
                    id="dept-request-heading"
                    className="text-base font-bold text-[#0F1E21]"
                  >
                    {language === 'ur' ? 'محکمہ پورٹل' : 'Department Portal'}
                  </h3>
                  <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
                    {language === 'ur' ? 'رسائی کی درخواست' : 'Request Access'}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {language === 'ur'
                    ? 'رسائی کی درخواست کریں • لاگ ان سے پہلے ایڈمنسٹریٹر کی منظوری لازمی ہے'
                    : 'Request access • Approval required before sign-in'}
                </p>
              </div>

              {/* Request Access Form Validation Error */}
              {reqError && (
                <div
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{reqError}</span>
                </div>
              )}

              <form onSubmit={handleRequestAccess} className="space-y-3.5">
                {/* 2-Column Grid (Figma: width 270 per field) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Department Selector */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="req-department-select"
                      className="block text-xs font-semibold text-[#0F1E21]"
                    >
                      {language === 'ur' ? 'محکمہ' : 'Department'}
                    </label>
                    <DepartmentSelector
                      id="req-department-select"
                      value={reqDepartment}
                      onChange={(id) => setReqDepartment(id)}
                      placeholder={
                        language === 'ur' ? 'محکمہ منتخب کریں' : 'Select department'
                      }
                      hasError={!reqDepartment && !!reqError}
                    />
                  </div>

                  {/* Field 2: Full Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="req-fullname"
                      className="block text-xs font-semibold text-[#0F1E21]"
                    >
                      {language === 'ur' ? 'مکمل نام' : 'Full name'}
                    </label>
                    <input
                      id="req-fullname"
                      type="text"
                      value={reqFullName}
                      onChange={(e) => setReqFullName(e.target.value)}
                      placeholder={language === 'ur' ? 'آپ کا مکمل نام' : 'Your full name'}
                      className="staff-input"
                      autoComplete="name"
                    />
                  </div>

                  {/* Field 3: Work Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="req-email"
                      className="block text-xs font-semibold text-[#0F1E21]"
                    >
                      {language === 'ur' ? 'دفتری ای میل' : 'Work email'}
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="name@example.org"
                      className="staff-input"
                      autoComplete="email"
                    />
                  </div>

                  {/* Field 4: Password Creation */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="req-password"
                      className="block text-xs font-semibold text-[#0F1E21]"
                    >
                      {language === 'ur' ? 'پاس ورڈ' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="req-password"
                        type={showReqPassword ? 'text' : 'password'}
                        value={reqPassword}
                        onChange={(e) => setReqPassword(e.target.value)}
                        placeholder={
                          language === 'ur'
                            ? 'پاس ورڈ بنائیں'
                            : 'Create password'
                        }
                        className="staff-input pr-10 rtl:pr-4 rtl:pl-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowReqPassword(!showReqPassword)}
                        className="absolute inset-y-0 right-0 pr-3 rtl:right-auto rtl:left-0 rtl:pl-3 flex items-center text-[#64748B] hover:text-[#0F1E21] cursor-pointer"
                        title={showReqPassword ? 'Hide password' : 'Show password'}
                      >
                        {showReqPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Row: Request Access CTA & Navigation Link */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    className="staff-btn-primary w-full sm:w-[220px]"
                  >
                    <span>
                      {language === 'ur' ? 'رسائی کی درخواست کریں' : 'Request Access'}
                    </span>
                    <ArrowIcon className="w-4 h-4 staff-icon-arrow" />
                  </button>

                  <a
                    href="#dept-signin-heading"
                    className="text-xs font-medium text-[#64748B] hover:text-[#0F1E21] text-center sm:text-right rtl:sm:text-left transition-colors"
                  >
                    {language === 'ur'
                      ? 'پہلے سے منظور شدہ؟ محکمہ لاگ ان اوپر ہے ↑'
                      : 'Already approved? Department sign in ↑'}
                  </a>
                </div>

                {/* Operational Security Disclosure (Figma 35:1381) */}
                <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#122E32] shrink-0" />
                  <span>
                    {language === 'ur'
                      ? 'عملے کو صرف اپنے متعلقہ محکمے کی شکایات تک رسائی حاصل ہوتی ہے۔ شہریوں کے رابطے کے کوائف مخفی رہتے ہیں۔'
                      : 'Staff access only assigned complaints. Citizen contact details are restricted.'}
                  </span>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </StaffAuthLayout>
  );
};
