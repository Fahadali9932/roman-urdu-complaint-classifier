import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useCivicTheme } from '../../department/hooks/useCivicTheme';
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
  const { signOut } = useAdminAuth();
  const navigate = useNavigate();
  const { theme: themeMode, toggleTheme } = useCivicTheme();

  useEffect(() => {
    document.body.classList.add('v3-civic-active');
    return () => {
      document.body.classList.remove('v3-civic-active');
    };
  }, []);

  useEffect(() => {
    const shells = document.querySelectorAll('.admin-shell');
    shells.forEach((s) => s.setAttribute('data-theme', themeMode));
  }, [themeMode]);

  const handleSignOut = () => {
    signOut();
    navigate('/admin/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <div className="v3-nav-outer" style={{ paddingBottom: '12px' }}>
      <header
        className="v3-nav-pill flex-wrap lg:flex-nowrap gap-2"
        style={{
          height: 'auto',
          minHeight: '56px',
          padding: '6px 12px 6px 14px',
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
            <div className="text-[13.5px] font-medium whitespace-nowrap" style={{ color: 'var(--v3-ink)' }}>
              Awaaz-e-Awam
            </div>
            <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--v3-muted)' }}>
              {language === 'ur' ? 'مین ایڈمنسٹریٹر' : 'MAIN ADMINISTRATOR'}
            </p>
          </div>
        </div>

        {/* Navigation Pill Links */}
        <nav
          className="flex items-center gap-1 min-w-0 shrink-0"
          aria-label="Admin Navigation"
        >
          <NavLink
            to="/admin/requests"
            data-testid="admin-nav-requests"
            className={`v3-nav-tab whitespace-nowrap ${activeTab === 'requests' ? 'is-active' : ''}`}
            style={{ padding: '0 13px', fontSize: '13px' }}
          >
            <span className="hidden md:inline">
              {language === 'ur' ? 'محکمہ درخواستیں' : 'Department Requests'}
            </span>
            <span className="inline md:hidden">
              {language === 'ur' ? 'درخواستیں' : 'Requests'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/access"
            data-testid="admin-nav-access"
            className={`v3-nav-tab whitespace-nowrap ${activeTab === 'access' ? 'is-active' : ''}`}
            style={{ padding: '0 13px', fontSize: '13px' }}
          >
            <span className="hidden md:inline">
              {language === 'ur' ? 'محکمے اور رسائی' : 'People & permissions'}
            </span>
            <span className="inline md:hidden">
              {language === 'ur' ? 'رسائی' : 'Permissions'}
            </span>
          </NavLink>

          <NavLink
            to="/admin/ai"
            data-testid="admin-nav-ai"
            className={`v3-nav-tab whitespace-nowrap ${activeTab === 'ai' ? 'is-active' : ''}`}
            style={{ padding: '0 13px', fontSize: '13px' }}
          >
            <span className="hidden md:inline">
              {language === 'ur' ? 'اے آئی کا جائزہ' : 'Model review'}
            </span>
            <span className="inline md:hidden">
              {language === 'ur' ? 'اے آئی' : 'AI review'}
            </span>
          </NavLink>

          <NavLink
            to="/submit"
            className="v3-nav-tab v3-nav-tab-desktop-only whitespace-nowrap"
            style={{ padding: '0 13px', fontSize: '13px' }}
          >
            {language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}
          </NavLink>
        </nav>

        {/* Theme, Language, Sign out */}
        <div className="v3-nav-actions shrink-0">
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
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap cursor-pointer"
            style={{ color: 'var(--v3-ink)' }}
            title={language === 'en' ? 'Switch to Urdu' : 'انگریزی میں تبدیل کریں'}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{language === 'en' ? 'اردو' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap cursor-pointer"
            style={{ color: 'var(--v3-danger)' }}
            aria-label={language === 'ur' ? 'لاگ آؤٹ' : 'Sign out'}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">
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
