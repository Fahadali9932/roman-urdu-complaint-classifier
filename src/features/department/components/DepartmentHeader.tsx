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
    <header className="sticky top-0 z-30 w-full border-b border-[#E1E4E6] bg-[#FFFFFF]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand & Authenticated Agency */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link
              to="/department"
              className="flex items-center gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-[#122E32]"
              title="Awaaz-e-Awam Department Portal"
            >
              <div className="w-8 h-8 rounded-lg bg-[#122E32] text-[#FFFFFF] flex items-center justify-center font-bold text-sm">
                آ
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-[#0F1E21]">
                  {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F6F6] text-[#5B646B] border border-[#E1E4E6]">
                  {t('deptPortalLabel')}
                </span>
              </div>
            </Link>

            <div className="hidden sm:block h-5 w-px bg-[#E1E4E6]" aria-hidden="true" />

            {/* Authenticated Department Identity (Read from auth session - NO dropdown switcher) */}
            {departmentMeta && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FAFBFB] border border-[#E1E4E6] text-xs font-medium text-[#0F1E21] min-w-0">
                <div className="w-5 h-5 rounded bg-[#2C4A52]/10 text-[#2C4A52] flex items-center justify-center shrink-0">
                  {getDepartmentIcon(departmentId, 'w-3 h-3')}
                </div>
                <span className="truncate max-w-[160px] sm:max-w-[280px]">
                  {displayName}
                </span>
                <span className="hidden md:inline-block text-[10px] font-bold text-[#2C4A52] bg-[#2C4A52]/10 px-1.5 py-0.2 rounded">
                  {departmentMeta.code}
                </span>
              </div>
            )}
          </div>

          {/* Right Controls: Privacy Indicator, Language Toggle, Citizen Portal, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Single Quiet Privacy Badge */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFBFB] border border-[#E1E4E6] text-[11px] font-medium text-[#5B646B]"
              title="Citizen personal identifying information is redacted from departmental views."
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#2C4A52]" />
              <span>{t('deptPiiProtected')}</span>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E1E4E6] hover:bg-[#F4F6F6] text-xs font-medium text-[#0F1E21] transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-[#5B646B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Link to Citizen Portal */}
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E1E4E6] hover:bg-[#F4F6F6] text-xs font-medium text-[#5B646B] hover:text-[#0F1E21] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('deptSwitchToCitizenPortal')}</span>
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E1E4E6] hover:bg-rose-50 hover:border-rose-200 text-xs font-medium text-[#5B646B] hover:text-rose-700 transition-colors"
              title={t('deptSignOut')}
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
