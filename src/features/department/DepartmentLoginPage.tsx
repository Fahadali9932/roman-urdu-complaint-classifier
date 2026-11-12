import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type DepartmentId } from '../../types';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Zap,
  Trash2,
  Flame,
  Droplets,
} from 'lucide-react';
import { getDepartmentIcon } from './components/DepartmentHeader';
import './department-theme.css';

export const DepartmentLoginPage: React.FC = () => {
  const { availableDepartments, signIn } = useDepartmentAuth();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>('kelectric');
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedDepartment = availableDepartments.find((d) => d.id === selectedDeptId) || availableDepartments[0];

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = signIn(selectedDeptId, accessKey);
    if (res.success) {
      navigate('/department');
    } else {
      setError(res.error || 'Failed to sign in.');
    }
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="dept-workspace-root flex flex-col justify-between min-h-screen relative selection:bg-[#2C4A52]/20">
      {/* Top Bar */}
      <header className="relative z-10 border-b border-[#E1E4E6] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1240px] mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-[#122E32]">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#122E32] text-[#FFFFFF] flex items-center justify-center font-bold text-sm sm:text-base shadow-xs group-hover:bg-[#0F1E21] transition-colors">
              آ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[#0F1E21]">
                {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold text-[#5B646B] bg-[#F4F6F6] px-2 py-0.5 rounded-md border border-[#E1E4E6]">
                {t('deptPortalLabel')}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E1E4E6] text-xs sm:text-sm font-semibold text-[#0F1E21] hover:bg-[#F4F6F6] transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#5B646B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5B646B] hover:text-[#0F1E21] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('deptSwitchToCitizenPortal')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-[1140px] w-full mx-auto bg-[#FFFFFF] border border-[#E1E4E6] rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          {/* LEFT SIDE — BRAND AND CONTEXT (lg:col-span-5) */}
          <section className="lg:col-span-5 relative bg-gradient-to-br from-[#122E32] via-[#1B3B41] to-[#0F1E21] text-[#FFFFFF] p-6 sm:p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
            {/* Ambient Background Accents */}
            <div
              className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(172, 175, 182, 0.4) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
              style={{
                background: 'radial-gradient(circle, rgba(104, 126, 139, 0.5) 0%, transparent 75%)',
              }}
              aria-hidden="true"
            />

            {/* Top Identity (Compact on mobile, spacious on desktop) */}
            <div className="relative z-10 space-y-2 sm:space-y-3 lg:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-semibold text-[#ACAFB6]">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>{language === 'ur' ? 'بلدیاتی گورننس کونسول' : 'Municipal Governance Console'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                {t('deptBrandPanelTitle')}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-[#ACAFB6] leading-relaxed max-w-sm">
                {t('deptBrandPanelSubtitle')}
              </p>
            </div>

            {/* Department Service Pillars (Restrained Architectural Graphics) - DESKTOP ONLY */}
            <div className="hidden lg:block relative z-10 my-8 lg:my-10 space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#ACAFB6]/80 mb-3">
                {language === 'ur' ? 'شامل بلدیاتی محکمے' : 'Integrated Municipal Authorities'}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">K-Electric</div>
                    <div className="text-[10px] text-[#ACAFB6] truncate">Power Grid</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">SSWMB</div>
                    <div className="text-[10px] text-[#ACAFB6] truncate">Solid Waste</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">SSGC</div>
                    <div className="text-[10px] text-[#ACAFB6] truncate">Gas Utility</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
                    <Droplets className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">KW&SC</div>
                    <div className="text-[10px] text-[#ACAFB6] truncate">Water & Sewer</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Civic Privacy Assurance - DESKTOP ONLY */}
            <div className="hidden lg:flex relative z-10 pt-4 border-t border-white/10 items-start gap-3 text-xs text-[#ACAFB6] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span>{t('deptBrandPanelNotice')}</span>
            </div>
          </section>

          {/* RIGHT SIDE — SIGN-IN FORM (lg:col-span-7) */}
          <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-[#FFFFFF]">
            <div className="max-w-md w-full mx-auto space-y-6">
              {/* Heading */}
              <div className="space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-[#F0F4F5] text-[#122E32] flex items-center justify-center mb-3 border border-[#E1E4E6]">
                  <Building2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E21]">
                  {t('deptSignInTitle')}
                </h2>
                <p className="text-sm text-[#5B646B] leading-relaxed">
                  {t('deptSignInSubtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Professional Department Selector */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="block text-sm font-semibold text-[#0F1E21]">
                    {t('deptSelectAgency')}
                  </label>

                  {/* Custom Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="w-full h-[52px] px-3.5 rounded-xl border border-[#E1E4E6] bg-[#FFFFFF] hover:bg-[#FAFBFB] text-[#0F1E21] flex items-center justify-between transition-colors focus:outline-none focus:border-[#2C4A52] focus:ring-2 focus:ring-[#2C4A52]/15 cursor-pointer"
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#F4F6F6] text-[#2C4A52] flex items-center justify-center shrink-0 border border-[#E1E4E6]">
                        {getDepartmentIcon(selectedDepartment.id, 'w-4 h-4')}
                      </div>
                      <div className="text-left rtl:text-right min-w-0">
                        <span className="block text-sm font-semibold text-[#0F1E21] truncate">
                          {language === 'ur' ? selectedDepartment.nameUrdu : selectedDepartment.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-[#5B646B] bg-[#F4F6F6] px-2 py-0.5 rounded border border-[#E1E4E6]">
                        {selectedDepartment.code}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#687E8B] transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Dropdown Popover */}
                  {isDropdownOpen && (
                    <div
                      className="absolute z-30 left-0 right-0 mt-1.5 bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl shadow-xl overflow-hidden py-1.5 max-h-[300px] overflow-y-auto dept-fade-in"
                      role="listbox"
                    >
                      {availableDepartments.map((dept) => {
                        const isSelected = selectedDeptId === dept.id;
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => {
                              setSelectedDeptId(dept.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 flex items-center justify-between text-left rtl:text-right transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#F0F4F5] font-semibold text-[#0F1E21]'
                                : 'hover:bg-[#FAFBFB] text-[#0F1E21]'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'bg-[#122E32] text-white border-[#122E32]'
                                    : 'bg-[#F4F6F6] text-[#2C4A52] border-[#E1E4E6]'
                                }`}
                              >
                                {getDepartmentIcon(dept.id, 'w-4 h-4')}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-sm font-semibold truncate">
                                  {language === 'ur' ? dept.nameUrdu : dept.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs font-bold text-[#5B646B]">
                                {dept.code}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-[#122E32]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Access Key Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="accessKey" className="block text-sm font-semibold text-[#0F1E21]">
                      {t('deptAccessKeyLabel')}
                    </label>
                    <span className="text-xs text-[#5B646B]">
                      {language === 'ur' ? 'پروٹوٹائپ موڈ' : 'Prototype mode'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#687E8B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="accessKey"
                      type={showKey ? 'text' : 'password'}
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      placeholder={t('deptAccessKeyPlaceholder')}
                      className="dept-input h-[52px] pl-10 pr-11 text-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#687E8B] hover:text-[#0F1E21] transition-colors cursor-pointer"
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#5B646B] leading-relaxed">
                    {t('deptPrototypeNotice')}
                  </p>
                </div>

                {/* PII Redaction Guarantee */}
                <div className="p-3.5 rounded-xl bg-[#FAFBFB] border border-[#E1E4E6] flex items-start gap-3 text-xs sm:text-sm text-[#5B646B] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#2C4A52] shrink-0 mt-0.5" />
                  <span>
                    {language === 'ur'
                      ? 'شہری کوائف کا مکمل تحفظ: شہری کا نام، فون نمبر، ای میل اور ذاتی رہائشی پتہ محکمانہ لاگ ان سے مکمل پوشیدہ رکھے جاتے ہیں۔'
                      : 'Citizen PII Protected: Citizen names, phone numbers, email addresses, and residential home addresses are strictly excluded from departmental view.'}
                  </span>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  className="dept-btn-primary w-full h-[52px] rounded-xl text-base font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('deptEnterPortal')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 border-t border-[#E1E4E6] bg-[#FFFFFF] text-center text-xs sm:text-sm text-[#5B646B]">
        <div className="max-w-[1240px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Awaaz-e-Awam • Department Portal</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/about" className="hover:text-[#0F1E21] transition-colors">
              About
            </Link>
            <Link to="/privacy-policy" className="hover:text-[#0F1E21] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-use" className="hover:text-[#0F1E21] transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
