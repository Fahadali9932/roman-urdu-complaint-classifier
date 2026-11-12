import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Zap,
  Trash2,
  Flame,
  Droplets,
  Building2,
  ShieldCheck,
  Globe,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { type DepartmentId } from '../../../types';

export const getDepartmentIcon = (id: DepartmentId | null, className = 'w-4 h-4') => {
  switch (id) {
    case 'kelectric':
      return <Zap className={className} />;
    case 'sswmb':
      return <Trash2 className={className} />;
    case 'ssgc':
      return <Flame className={className} />;
    case 'kwsc':
      return <Droplets className={className} />;
    case 'kmc':
      return <Building2 className={className} />;
    case 'sbca':
      return <Building2 className={className} />;
    default:
      return <Building2 className={className} />;
  }
};

export const DepartmentHeader: React.FC = () => {
  const { departmentId, departmentMeta, signOut } = useDepartmentAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/department/login');
  };

  const displayName = departmentMeta
    ? language === 'ur'
      ? departmentMeta.nameUrdu
      : departmentMeta.name
    : '';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E1E4E6] bg-[#FFFFFF] shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-4">
          {/* Left: Brand & Authenticated Agency */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link
              to="/department"
              className="flex items-center gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-[#122E32] group"
              title="Awaaz-e-Awam Department Portal"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#122E32] text-[#FFFFFF] flex items-center justify-center font-bold text-sm sm:text-base shadow-xs group-hover:bg-[#0F1E21] transition-colors">
                آ
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-[#0F1E21]">
                  {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F4F6F6] text-[#5B646B] border border-[#E1E4E6]">
                  {t('deptPortalLabel')}
                </span>
              </div>
            </Link>

            <div className="hidden sm:block h-6 w-px bg-[#E1E4E6]" aria-hidden="true" />

            {/* Authenticated Department Identity (Read strictly from auth session - NO dropdown switcher) */}
            {departmentMeta && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-[#FAFBFB] border border-[#E1E4E6] text-xs sm:text-sm font-semibold text-[#0F1E21] min-w-0 shadow-xs">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#122E32] text-white flex items-center justify-center shrink-0">
                  {getDepartmentIcon(departmentId, 'w-3 h-3 sm:w-3.5 sm:h-3.5')}
                </div>
                <span className="hidden md:inline-block truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[320px]">
                  {displayName}
                </span>
                <span className="font-mono text-xs font-bold text-[#2C4A52] bg-[#2C4A52]/10 px-1.5 py-0.5 rounded-md">
                  {departmentMeta.code}
                </span>
              </div>
            )}
          </div>

          {/* Right Controls: Privacy Indicator, Language Toggle, Citizen Portal, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Single Quiet Privacy Badge */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAFBFB] border border-[#E1E4E6] text-xs font-semibold text-[#5B646B]"
              title="Citizen personal identifying information is redacted from departmental views."
            >
              <ShieldCheck className="w-4 h-4 text-[#2C4A52]" />
              <span>{t('deptPiiProtected')}</span>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-[#E1E4E6] text-xs sm:text-sm font-semibold text-[#0F1E21] hover:bg-[#F4F6F6] transition-colors cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#5B646B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Citizen Portal Link */}
            <Link
              to="/"
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#5B646B] hover:text-[#0F1E21] hover:bg-[#FAFBFB] transition-colors"
              title="Return to Citizen Portal"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('deptSwitchToCitizenPortal')}</span>
            </Link>

            {/* Sign Out Action */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#FFFFFF] border border-[#E1E4E6] text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('deptSignOut')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
