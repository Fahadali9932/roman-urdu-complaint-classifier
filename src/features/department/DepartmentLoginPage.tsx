import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type DepartmentId } from '../../types';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { getDepartmentIcon } from './components/DepartmentHeader';

export const DepartmentLoginPage: React.FC = () => {
  const { availableDepartments, departmentId, signIn } = useDepartmentAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>(departmentId);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(selectedDeptId);
    navigate('/department');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#141414] flex flex-col justify-between relative selection:bg-[#681822]/20">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-70 z-0"
        style={{
          background:
            'radial-gradient(1200px circle at 50% -20%, rgba(212, 160, 23, 0.09) 0%, transparent 70%)',
        }}
      />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-[#E5E3E0] bg-[#FFFFFF]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between max-w-[1400px] mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#681822] text-[#F7F6F3] flex items-center justify-center font-bold text-sm">
            آ
          </div>
          <div>
            <span className="font-semibold text-sm text-[#141414]">
              {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
            </span>
            <span className="ml-2 text-[10px] font-bold text-[#681822] bg-[#681822]/10 px-1.5 py-0.2 rounded uppercase">
              Official Desk
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3E0] text-xs font-medium text-[#141414] hover:bg-[#FAFAF8] transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#737373]" />
            <span>{language === 'en' ? 'اردو' : 'English'}</span>
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[#737373] hover:text-[#141414] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('deptSwitchToCitizenPortal')}</span>
          </Link>
        </div>
      </header>

      {/* Login Card */}
      <div className="relative z-10 max-w-lg w-full mx-auto px-4 py-8">
        <div className="bg-[#FFFFFF] border border-[#E5E3E0] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#681822]/10 text-[#681822] flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#141414]">
              {t('deptSignInTitle')}
            </h1>
            <p className="text-xs text-[#737373] max-w-sm mx-auto leading-relaxed">
              {t('deptSignInSubtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#141414] uppercase tracking-wider">
                {t('deptSelectAgency')}
              </label>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {availableDepartments.map((dept) => {
                  const isSelected = selectedDeptId === dept.id;
                  return (
                    <label
                      key={dept.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#681822] bg-[#681822]/5 shadow-xs'
                          : 'border-[#E5E3E0] hover:bg-[#FAFAF8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="department"
                        value={dept.id}
                        checked={isSelected}
                        onChange={() => setSelectedDeptId(dept.id)}
                        className="text-[#681822] focus:ring-[#681822]"
                      />
                      <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] text-[#681822] flex items-center justify-center shrink-0 border border-[#E8E2D5]">
                        {getDepartmentIcon(dept.id, 'w-4 h-4')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[#141414]">
                            {language === 'ur' ? dept.nameUrdu : dept.name}
                          </span>
                          <span className="text-[10px] font-bold text-[#681822] bg-[#681822]/10 px-1.5 py-0.2 rounded">
                            {dept.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#737373] truncate">
                          {language === 'ur' ? dept.descriptionUrdu : dept.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Privacy notice */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                {t('deptPrivacyNotice')}
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#681822] hover:bg-[#50131B] text-[#FFFFFF] font-semibold text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#681822]/30"
            >
              <span>{t('deptEnterPortal')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-[#737373]">
        <p>Awaaz-e-Awam Civic Service Portal • Official Karachi Municipal Grievance Desk</p>
      </footer>
    </div>
  );
};
