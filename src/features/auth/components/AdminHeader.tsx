import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { Shield, LogOut, Globe, FileText, UserCheck, Users, Cpu, Moon, Sun } from 'lucide-react';
import '../admin-portal.css';

interface AdminHeaderProps {
  activeTab: 'overview' | 'complaints' | 'requests' | 'access' | 'ai';
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab }) => {
  const { language, setLanguage } = useLanguage();
  const { adminSession, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('awaaz_dept_theme_mode') || localStorage.getItem('aawaaz-demo-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awaaz_dept_theme_mode') || localStorage.getItem('aawaaz-demo-theme');
      const mode = (saved === 'dark' || saved === 'light') ? saved : 'light';
      setThemeMode(mode);
      document.documentElement.setAttribute('data-theme', mode);
      const shells = document.querySelectorAll('.admin-shell');
      shells.forEach((s) => s.setAttribute('data-theme', mode));
    }
  }, []);

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('awaaz_dept_theme_mode', next);
      localStorage.setItem('aawaaz-demo-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      const shells = document.querySelectorAll('.admin-shell');
      shells.forEach((s) => s.setAttribute('data-theme', next));
    }
  };

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
      {/* Top Bar: Identity & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Monogram */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F1E21] text-white flex items-center justify-center font-mono font-bold text-base shadow-sm">
              a.
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#0F1E21] uppercase">
                  AWAAZ-E-AWAM
                </span>
                <span className="text-xs text-[#94A3B8]">/</span>
                <span className="hidden sm:flex text-xs font-semibold text-[#122E32] items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#122E32]" />
                  {language === 'ur' ? 'مین ایڈمنسٹریٹر' : 'MAIN ADMINISTRATOR'}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                {adminSession?.fullName || (language === 'ur' ? 'سپر ایڈمنسٹریٹر' : 'Provincial Civic Oversight')}
              </p>
            </div>
          </div>

          {/* Controls: Theme toggle, Language toggle & Sign out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F1E21] transition-colors cursor-pointer"
              title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {themeMode === 'light' ? <Moon className="w-3.5 h-3.5 text-[#64748B]" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{themeMode === 'light' ? 'Dark' : 'Light'}</span>
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F1E21] transition-colors cursor-pointer"
              title={language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
            >
              <Globe className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{language === 'en' ? 'اردو' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-semibold text-rose-700 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {language === 'ur' ? 'لاگ آؤٹ' : 'Sign out'}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Rail (Figma 35:1065 / 35:1129) */}
        <nav
          className="flex items-center gap-2 sm:gap-7 -mb-px overflow-x-visible"
          aria-label="Admin Navigation"
        >
          <NavLink
            to="/admin/requests"
            data-testid="admin-nav-requests"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'ur' ? 'محکمہ درخواستیں' : 'Department Requests'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'درخواستیں' : 'Requests'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/access"
            data-testid="admin-nav-access"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'access'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'ur' ? 'محکمے اور رسائی' : 'People & permissions'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'رسائی' : 'Access'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/ai"
            data-testid="admin-nav-ai"
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-[#0F1E21] text-[#0F1E21]'
                : 'border-transparent text-[#64748B] hover:text-[#0F1E21]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'ur' ? 'اے آئی کا جائزہ' : 'Model review'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'اے آئی' : 'AI Review'}
            </span>
          </NavLink>

          <NavLink
            to="/submit"
            className="py-3 text-xs sm:text-sm font-semibold border-b-2 border-transparent text-[#64748B] hover:text-[#0F1E21] flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'شہری' : 'Citizen'}
            </span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
