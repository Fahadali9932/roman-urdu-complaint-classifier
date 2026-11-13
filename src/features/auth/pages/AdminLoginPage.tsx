import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { StaffAuthLayout } from '../components/StaffAuthLayout';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Shield, AlertCircle, Info } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Required field validation
    if (!email.trim()) {
      setError(
        language === 'ur'
          ? 'براہ کرم اپنا دفتری ای میل درج کریں۔'
          : 'Please enter your work email.'
      );
      return;
    }
    if (!password) {
      setError(
        language === 'ur'
          ? 'براہ کرم اپنا پاس ورڈ درج کریں۔'
          : 'Please enter your password.'
      );
      return;
    }

    // Honest frontend prototype notice (NO fake auth, NO password storage)
    setNotice(
      language === 'ur'
        ? 'پروٹوٹائپ موڈ: مین ایڈمنسٹریٹر کا محفوظ بیک اینڈ تصدیقی نظام اگلے مرحلے میں فعال کیا جائے گا۔ اس پریویو میں کوئی پاس ورڈ محفوظ نہیں کیا جا رہا۔'
        : 'Prototype Preview: Live backend authentication for Main Administrators is scheduled for Phase 2. No credentials are stored or authenticated in this UI milestone.'
    );
  };

  return (
    <StaffAuthLayout activeRole="admin">
      <div className="space-y-6">
        {/* Header Block (Figma Frame 35:1299 - 35:1301) */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-mono font-semibold tracking-wide text-[#0F1E21]">
            <Shield className="w-3.5 h-3.5 text-[#122E32]" />
            <span>{language === 'ur' ? 'مین ایڈمنسٹریٹر' : 'Main Administrator'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E21]">
            {language === 'ur' ? 'خوش آمدید' : 'Welcome back.'}
          </h2>

          <p className="text-sm text-[#64748B] leading-relaxed">
            {language === 'ur'
              ? 'مجاز مین ایڈمنسٹریٹرز کے لیے علیحدہ لاگ ان۔'
              : 'Separate sign-in for authorized Main Administrators.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2"
            role="status"
          >
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Sign-In Form (Figma Frame 35:1302 - 35:1310) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Work Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider"
            >
              {language === 'ur' ? 'دفتری ای میل' : 'Work email'}
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.org"
              className="staff-input"
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider"
              >
                {language === 'ur' ? 'پاس ورڈ' : 'Password'}
              </label>
              <button
                type="button"
                onClick={() =>
                  setNotice(
                    language === 'ur'
                      ? 'پاس ورڈ ری سیٹ کی سہولت تصدیقی بیک اینڈ کے ساتھ فراہم کی جائے گی۔'
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
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  language === 'ur' ? 'اپنا پاس ورڈ درج کریں' : 'Enter your password'
                }
                className="staff-input pr-10 rtl:pr-4 rtl:pl-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 rtl:right-auto rtl:left-0 rtl:pl-3 flex items-center text-[#64748B] hover:text-[#0F1E21] cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button (Sign in →) */}
          <button
            type="submit"
            className="staff-btn-primary w-full mt-2"
          >
            <span>{language === 'ur' ? 'لاگ ان کریں' : 'Sign in'}</span>
            <ArrowIcon className="w-4 h-4 staff-icon-arrow" />
          </button>

          {/* Prototype Notice text (Figma 35:1382) */}
          <p className="text-center text-xs text-[#64748B] pt-1">
            {language === 'ur'
              ? 'پروٹوٹائپ • انٹرفیس معائنے کے لیے'
              : 'Prototype • Visual interface inspection'}
          </p>
        </form>

        {/* Separate Role Entry (Figma Frame 35:1384) */}
        <div className="staff-subtle-card p-5 sm:p-6 space-y-3.5 mt-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0F1E21]">
              {language === 'ur'
                ? 'کیا آپ کسی محکمے کے ساتھ کام کر رہے ہیں؟'
                : 'Working with a department?'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {language === 'ur'
                ? 'اپنے محکمے کو تفویض کردہ شکایات کا جائزہ لینے اور اپ ڈیٹ کرنے کے لیے محکمہ پورٹل استعمال کریں۔'
                : 'Use the Department Portal to review and update complaints assigned to your department.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/department/login')}
            className="staff-btn-secondary w-full"
          >
            <span>
              {language === 'ur'
                ? 'محکمہ پورٹل لاگ ان کی طرف جائیں'
                : 'Department Portal sign in'}
            </span>
            <ArrowIcon className="w-4 h-4 staff-icon-arrow" />
          </button>
        </div>
      </div>
    </StaffAuthLayout>
  );
};
