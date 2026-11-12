import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Zap,
  Trash2,
  Flame,
  Droplets,
  Building2,
  ShieldCheck,
  ChevronDown,
  Globe,
  ExternalLink,
  LogOut,
  User,
  Check,
} from 'lucide-react';
import { type DepartmentId } from '../../../types';

export const getDepartmentIcon = (id: DepartmentId, className = 'w-4 h-4') => {
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
      return <ShieldCheck className={className} />;
    default:
      return <Building2 className={className} />;
  }
};

export const DepartmentHeader: React.FC = () => {
  const {
    departmentId,
    departmentMeta,
    availableDepartments,
    officer,
    setDepartment,
    signOut,
  } = useDepartmentAuth();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const [isDeptMenuOpen, setIsDeptMenuOpen] = useState(false);
  const [isOfficerMenuOpen, setIsOfficerMenuOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const officerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        deptDropdownRef.current &&
        !deptDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDeptMenuOpen(false);
      }
      if (
        officerDropdownRef.current &&
        !officerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsOfficerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E3E0] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Left: Brand Identity & Dept Switcher */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            {/* Brand Logo & Title */}
            <Link
              to="/department"
              className="flex items-center gap-2.5 group shrink-0"
              title="Awaaz-e-Awam Department Workspace"
            >
              <div className="w-9 h-9 rounded-xl bg-[#681822] text-[#F7F6F3] flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-[#50131B] transition-colors">
                آ
              </div>
              <div className="hidden md:flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-[#141414]">
                    {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F4F1EA] text-[#681822] border border-[#E8E2D5]">
                    {language === 'ur' ? 'محکمانہ پورٹل' : 'Dept Workspace'}
                  </span>
                </div>
                <span className="text-[11px] text-[#737373]">
                  {language === 'ur'
                    ? 'کراچی بلدیاتی شکایات مینجمنٹ'
                    : 'Karachi Municipal Grievance Desk'}
                </span>
              </div>
            </Link>

            {/* Separator */}
            <div className="hidden sm:block h-6 w-px bg-[#E5E3E0]" />

            {/* Active Department Selector Dropdown */}
            <div className="relative" ref={deptDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDeptMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E5E3E0] bg-[#FAFAF8] hover:bg-[#F3EFEA] hover:border-[#D9D5CF] transition-all text-left text-xs sm:text-sm font-medium text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#681822]/20"
                aria-expanded={isDeptMenuOpen}
                aria-label={t('deptSwitchDepartment')}
              >
                <div className="w-6 h-6 rounded-md bg-[#681822]/10 text-[#681822] flex items-center justify-center shrink-0">
                  {getDepartmentIcon(departmentId, 'w-3.5 h-3.5')}
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs tracking-tight text-[#141414] truncate max-w-[120px] sm:max-w-[200px]">
                      {language === 'ur' ? departmentMeta.nameUrdu : departmentMeta.name}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-[#681822] bg-[#681822]/10 px-1.5 py-0.2 rounded">
                      {departmentMeta.code}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#737373] transition-transform shrink-0 ${
                    isDeptMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Department Dropdown Menu */}
              {isDeptMenuOpen && (
                <div
                  className={`absolute top-full mt-1.5 w-72 sm:w-80 rounded-xl bg-[#FFFFFF] border border-[#E5E3E0] shadow-xl p-2 z-50 ${
                    isRTL ? 'right-0' : 'left-0'
                  }`}
                >
                  <div className="px-3 py-2 text-[11px] font-semibold text-[#737373] uppercase tracking-wider border-b border-[#F0EEEB] mb-1">
                    {t('deptSwitchDepartment')}
                  </div>
                  <div className="space-y-1">
                    {availableDepartments.map((dept) => {
                      const isSelected = dept.id === departmentId;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            setDepartment(dept.id);
                            setIsDeptMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs ${
                            isSelected
                              ? 'bg-[#681822]/5 text-[#681822] font-semibold border border-[#681822]/20'
                              : 'text-[#141414] hover:bg-[#F7F6F3]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#681822] text-[#FFFFFF]'
                                  : 'bg-[#F0EDE6] text-[#555555]'
                              }`}
                            >
                              {getDepartmentIcon(dept.id, 'w-4 h-4')}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="truncate">
                                {language === 'ur' ? dept.nameUrdu : dept.name}
                              </span>
                              <span className="text-[10px] text-[#737373]">
                                Code: {dept.code}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#681822] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Officer, PII Shield, Language, Citizen Portal */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* PII Shield Badge */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
              title={t('deptPrivacyNotice')}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('deptPrivacyShield')}</span>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E3E0] hover:bg-[#FAFAF8] text-xs font-medium text-[#141414] transition-colors"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#737373]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Link back to Citizen Portal */}
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E3E0] hover:bg-[#FAFAF8] text-xs font-medium text-[#5B5B5B] hover:text-[#141414] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('deptSwitchToCitizenPortal')}</span>
            </Link>

            {/* Officer Profile & Dropdown */}
            <div className="relative" ref={officerDropdownRef}>
              <button
                type="button"
                onClick={() => setIsOfficerMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-[#E5E3E0] bg-[#FFFFFF] hover:bg-[#FAFAF8] transition-colors text-xs text-[#141414]"
                aria-expanded={isOfficerMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-[#681822]/10 text-[#681822] flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-3.5 h-3.5 text-[#681822]" />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="font-semibold text-xs text-[#141414]">
                    {language === 'ur' ? officer.nameUrdu : officer.name}
                  </span>
                  <span className="text-[10px] text-[#737373]">
                    {officer.badgeNumber}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-[#737373] hidden sm:block" />
              </button>

              {isOfficerMenuOpen && (
                <div
                  className={`absolute top-full mt-1.5 w-60 rounded-xl bg-[#FFFFFF] border border-[#E5E3E0] shadow-xl p-3 z-50 ${
                    isRTL ? 'left-0' : 'right-0'
                  }`}
                >
                  <div className="pb-2 border-b border-[#F0EEEB] mb-2">
                    <p className="text-xs font-semibold text-[#141414]">
                      {language === 'ur' ? officer.nameUrdu : officer.name}
                    </p>
                    <p className="text-[11px] text-[#737373]">
                      {language === 'ur' ? officer.roleUrdu : officer.role}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F1EA] text-[#681822] border border-[#E8E2D5]">
                      Badge: {officer.badgeNumber}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/department/login"
                      onClick={() => setIsOfficerMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#141414] hover:bg-[#F7F6F3] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[#737373]" />
                      <span>{t('deptSwitchDepartment')}</span>
                    </Link>
                    <Link
                      to="/"
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-[#141414] hover:bg-[#F7F6F3] transition-colors sm:hidden"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#737373]" />
                      <span>{t('deptSwitchToCitizenPortal')}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setIsOfficerMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'ur' ? 'لاگ آؤٹ' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
