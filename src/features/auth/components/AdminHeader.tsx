import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { LogOut, Globe, Moon, Sun } from 'lucide-react';
import '../admin-portal.css';

interface AdminHeaderProps {
  activeTab: 'overview' | 'complaints' | 'requests' | 'access' | 'ai';
}

/**
 * Floating 1120x56px frosted pill header for the Central Administrator workspace,
 * preserving bilingual toggle, theme persistence, and zero-oversight-leak sign out.
 */
export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab }) => {
  const { language, setLanguage } = useLanguage();
  const { adminSession, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved =
        localStorage.getItem('awaaz_dept_theme_mode') ||
        localStorage.getItem('aawaaz-demo-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    document.body.classList.add('v3-civic-active');
    return () => {
      document.body.classList.remove('v3-civic-active');
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('awaaz_dept_theme_mode') ||
        localStorage.getItem('aawaaz-demo-theme');
      const mode = saved === 'dark' || saved === 'light' ? saved : 'light';
      setThemeMode(mode);
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
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
      document.documentElement.classList.toggle('dark', next === 'dark');
      const shells = document.querySelectorAll('.admin-shell');
      shells.forEach((s) => s.setAttribute('data-theme', next));
    }
  };

  return (
    <div className="v3-nav-outer" style={{ paddingBottom: '12px' }}>
      <header
        className="v3-nav-pill flex-wrap"
        style={{
          height: 'auto',
          minHeight: '56px',
          padding: '8px 14px 8px 18px',
        }}
      >
        {/* Brand Anchor */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold"
            style={{
              backgroundColor: 'var(--v3-action)',
              color: 'var(--v3-onaction)',
            }}
          >
            a.
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-medium" style={{ color: 'var(--v3-ink)' }}>
                Awaaz-e-Awam
              </span>
              <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--v3-muted)' }}>
                · MAIN ADMINISTRATOR
              </span>
            </div>
            <p className="hidden md:block text-[11px]" style={{ color: 'var(--v3-muted)' }}>
              {adminSession?.fullName || (language === 'ur' ? 'سپر ایڈمنسٹریٹر' : 'Provincial Civic Oversight')}
            </p>
          </div>
        </div>

        {/* Navigation Pill Links */}
        <nav
          className="flex items-center gap-1 overflow-x-auto max-w-full"
          aria-label="Admin Navigation"
        >
          <NavLink
            to="/admin/requests"
            data-testid="admin-nav-requests"
            className={`v3-nav-tab ${activeTab === 'requests' ? 'is-active' : ''}`}
          >
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
            className={`v3-nav-tab ${activeTab === 'access' ? 'is-active' : ''}`}
          >
            <span className="hidden sm:inline">
              {language === 'ur' ? 'محکمے اور رسائی' : 'People & permissions'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'رسائی' : 'Permissions'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/ai"
            data-testid="admin-nav-ai"
            className={`v3-nav-tab ${activeTab === 'ai' ? 'is-active' : ''}`}
          >
            <span className="hidden sm:inline">
              {language === 'ur' ? 'اے آئی کا جائزہ' : 'Model review'}
            </span>
            <span className="inline sm:hidden">
              {language === 'ur' ? 'اے آئی' : 'AI review'}
            </span>
          </NavLink>

          <NavLink
            to="/submit"
            className="v3-nav-tab hidden md:inline-flex"
          >
            {language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}
          </NavLink>
        </nav>

        {/* Theme, Language, Sign out */}
        <div className="v3-nav-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="v3-icon-btn"
            title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            data-testid="v3-admin-theme-toggle"
          >
            {themeMode === 'light' ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium cursor-pointer"
            style={{ color: 'var(--v3-ink)' }}
            title={language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'en' ? 'اردو' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium cursor-pointer"
            style={{ color: 'var(--v3-danger)' }}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'ur' ? 'لاگ آؤٹ' : 'Sign out'}
            </span>
          </button>

          <div className="v3-avatar-pill" title="Central Administrator">
            A
          </div>
        </div>
      </header>
    </div>
  );
};
