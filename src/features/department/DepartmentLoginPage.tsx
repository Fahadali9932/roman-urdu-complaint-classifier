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
  Lock,
} from 'lucide-react';
import { getDepartmentIcon } from './components/DepartmentHeader';
import './department-theme.css';

export const DepartmentLoginPage: React.FC = () => {
  const { availableDepartments, signIn } = useDepartmentAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>('kelectric');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="dept-workspace-root flex flex-col justify-between relative selection:bg-[#2C4A52]/20">
      {/* Top Bar */}
      <header className="relative z-10 border-b border-[#E1E4E6] bg-[#FFFFFF] px-6 py-4 flex items-center justify-between max-w-[1440px] mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#122E32] text-[#FFFFFF] flex items-center justify-center font-bold text-sm">
            آ
          </div>
          <div>
            <span className="font-semibold text-sm text-[#0F1E21]">
              {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
            </span>
            <span className="ml-2 text-[10px] font-medium text-[#5B646B] bg-[#F4F6F6] px-2 py-0.5 rounded border border-[#E1E4E6]">
              {t('deptPortalLabel')}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E4E6] text-xs font-medium text-[#0F1E21] hover:bg-[#F4F6F6] transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#5B646B]" />
            <span>{language === 'en' ? 'اردو' : 'English'}</span>
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[#5B646B] hover:text-[#0F1E21] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('deptSwitchToCitizenPortal')}</span>
          </Link>
        </div>
      </header>

      {/* Main Sign In Card */}
      <div className="relative z-10 max-w-md w-full mx-auto px-4 py-12">
        <div className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-[#2C4A52]/10 text-[#2C4A52] flex items-center justify-center mx-auto mb-2">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F1E21]">
              {t('deptSignInTitle')}
            </h1>
            <p className="text-xs text-[#5B646B] max-w-xs mx-auto leading-relaxed">
              {t('deptSignInSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Department Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
                {t('deptSelectAgency')}
              </label>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                {availableDepartments.map((dept) => {
                  const isSelected = selectedDeptId === dept.id;
                  return (
                    <label
                      key={dept.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'border-[#122E32] bg-[#F0F4F5] font-medium text-[#0F1E21]'
                          : 'border-[#E1E4E6] hover:bg-[#FAFBFB] text-[#5B646B]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="department"
                        value={dept.id}
                        checked={isSelected}
                        onChange={() => setSelectedDeptId(dept.id)}
                        className="text-[#122E32] focus:ring-[#122E32]"
                      />
                      <div className="w-5 h-5 rounded bg-[#FAFBFB] text-[#2C4A52] flex items-center justify-center shrink-0 border border-[#E1E4E6]">
                        {getDepartmentIcon(dept.id, 'w-3 h-3')}
                      </div>
                      <span className="truncate flex-1">
                        {language === 'ur' ? dept.nameUrdu : dept.name}
                      </span>
                      <span className="font-mono text-[10px] text-[#5B646B]">
                        {dept.code}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Department Access Key */}
            <div className="space-y-1.5">
              <label
                htmlFor="accessKey"
                className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider"
              >
                {language === 'ur' ? 'رسائی کوڈ' : 'Access Key'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A9298] absolute top-2.5 left-3 pointer-events-none" />
                <input
                  id="accessKey"
                  type="password"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Official key or demo access"
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#E1E4E6] bg-[#FFFFFF] text-[#0F1E21] placeholder-[#8A9298] focus:outline-none focus:border-[#2C4A52] focus:ring-1 focus:ring-[#2C4A52]"
                />
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3 rounded-lg bg-[#FAFBFB] border border-[#E1E4E6] flex items-start gap-2 text-xs text-[#5B646B] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#2C4A52] shrink-0 mt-0.5" />
              <span>
                Authorized municipal access. Citizen personal phone numbers, names, and residential addresses are protected and not disclosed.
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#122E32] hover:bg-[#0F1E21] text-[#FFFFFF] font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>{t('deptEnterPortal')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-[#5B646B]">
        <p>Awaaz-e-Awam • Department Portal</p>
      </footer>
    </div>
  );
};
