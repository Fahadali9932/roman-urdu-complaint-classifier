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
    <header className="sticky top-0 z-30 w-full border-b border-black/[0.08] bg-white/80 backdrop-blur-xl shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] gap-4">
          {/* Left: Brand & Portal Identifier */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to="/department"
              className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-black"
              title="Awaaz-e-Awam Department Portal"
            >
              <div className="w-8 h-8 rounded-xl bg-[#111827] text-white flex items-center justify-center font-serif font-black text-base shadow-sm">
                a.
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-[#111827]">
                  {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 text-slate-600 border border-black/5">
                  {t('deptPortalLabel')}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Authenticated Department Identity */}
          {departmentMeta && (
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/[0.03] border border-black/[0.08] text-xs sm:text-sm font-bold text-[#111827] min-w-0 max-w-[280px] sm:max-w-[400px]"
              title={displayName}
            >
              <div className="w-6 h-6 rounded-lg bg-[#111827] text-white flex items-center justify-center shrink-0">
                {getDepartmentIcon(departmentId, 'w-3.5 h-3.5')}
              </div>
              <span className="truncate">{displayName}</span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded shrink-0 border border-black/10 shadow-2xs">
                {departmentMeta.code}
              </span>
            </div>
          )}

          {/* Right: Language, Citizen Portal Link, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 bg-white/80 hover:bg-white text-xs font-bold text-[#111827] shadow-2xs transition-colors cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-600" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Link to Citizen Portal */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 bg-white/80 hover:bg-white text-xs font-bold text-[#111827] shadow-2xs transition-colors"
              title="View Public Citizen Portal"
            >
              <span>{t('deptSwitchToCitizenPortal')}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            </Link>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 transition-colors cursor-pointer"
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
