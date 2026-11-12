import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type DepartmentId } from '../../types';
import {
  Globe,
  ExternalLink,
  Lock,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  FileText,
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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedDepartment =
    availableDepartments.find((d) => d.id === selectedDeptId) || availableDepartments[0];

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
      {/* Top Navbar */}
      <header className="border-b border-[#E1E4E6] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-[1080px] mx-auto w-full flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[#122E32]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#122E32] text-[#FFFFFF] flex items-center justify-center font-bold text-sm">
              آ
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[#0F1E21]">
                {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
              </span>
              <span className="text-xs font-medium text-[#5B646B] bg-[#F4F6F6] px-2 py-0.5 rounded border border-[#E1E4E6]">
                {t('deptPortalLabel')}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E4E6] text-xs font-semibold text-[#0F1E21] hover:bg-[#F4F6F6] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#5B646B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#5B646B] hover:text-[#0F1E21] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('deptSwitchToCitizenPortal')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-[1020px] w-full mx-auto bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
          {/* LEFT SECTION — BRAND AND PURPOSE (lg:col-span-5) */}
          <section className="lg:col-span-5 relative bg-[#122E32] text-[#FFFFFF] p-8 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden">
            {/* Subtle Abstract Architectural Motif (Delicate lines, no marketing tiles) */}
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 100% 24px',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4 border border-white/15">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                {t('deptBrandPanelTitle')}
              </h1>
              <p className="text-sm sm:text-base text-[#ACAFB6] leading-relaxed max-w-xs">
                {t('deptBrandPanelSubtitle')}
              </p>
            </div>

            {/* Restrained Institutional Context Note */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 text-xs text-[#ACAFB6] leading-relaxed">
              <p>{t('deptBrandPanelNotice')}</p>
            </div>
          </section>

          {/* RIGHT SECTION — SIGN-IN FORM (lg:col-span-7) */}
          <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-[#FFFFFF]">
            <div className="max-w-md w-full mx-auto space-y-6">
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-[#0F1E21]">
                  {t('deptSignInTitle')}
                </h2>
                <p className="text-sm text-[#5B646B]">
                  {t('deptSignInSubtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* Department Selection */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
                    {t('deptSelectAgency')}
                  </label>

                  {/* Accessible Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="w-full h-[50px] px-3.5 rounded-xl border border-[#E1E4E6] bg-[#FFFFFF] hover:bg-[#FAFBFB] text-[#0F1E21] flex items-center justify-between transition-colors focus:outline-none focus:border-[#2C4A52] focus:ring-2 focus:ring-[#2C4A52]/15 cursor-pointer"
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#F4F6F6] text-[#2C4A52] flex items-center justify-center shrink-0 border border-[#E1E4E6]">
                        {getDepartmentIcon(selectedDepartment.id, 'w-3.5 h-3.5')}
                      </div>
                      <span className="block text-sm font-semibold text-[#0F1E21] truncate text-left rtl:text-right">
                        {language === 'ur' ? selectedDepartment.nameUrdu : selectedDepartment.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-[#5B646B] bg-[#F4F6F6] px-2 py-0.5 rounded border border-[#E1E4E6]">
                        {selectedDepartment.code}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#687E8B] transition-transform duration-150 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Dropdown Menu Popover */}
                  {isDropdownOpen && (
                    <div
                      className="absolute z-30 left-0 right-0 mt-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl shadow-lg overflow-hidden py-1 max-h-[280px] overflow-y-auto dept-fade-in"
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
                            className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left rtl:text-right transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#F0F4F5] font-semibold text-[#0F1E21]'
                                : 'hover:bg-[#FAFBFB] text-[#0F1E21]'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'bg-[#122E32] text-white border-[#122E32]'
                                    : 'bg-[#F4F6F6] text-[#2C4A52] border-[#E1E4E6]'
                                }`}
                              >
                                {getDepartmentIcon(dept.id, 'w-3.5 h-3.5')}
                              </div>
                              <span className="block text-sm font-semibold truncate">
                                {language === 'ur' ? dept.nameUrdu : dept.name}
                              </span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="accessKey" className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
                      {t('deptAccessKeyLabel')}
                    </label>
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
                      className="dept-input h-[50px] pl-10 pr-10 text-sm bg-white rounded-xl"
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
                  <p className="text-xs text-[#5B646B] leading-relaxed pt-0.5">
                    {t('deptPrototypeNotice')}
                  </p>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  className="dept-btn-primary w-full h-[50px] rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
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
      <footer className="py-4 border-t border-[#E1E4E6] bg-[#FFFFFF] text-center text-xs text-[#5B646B]">
        <div className="max-w-[1080px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
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
