import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { Menu, X, User, Home, HelpCircle, FolderOpen, PenTool } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'steps' | 'write-intro'>('hero');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Track active section on landing page via scroll
  useEffect(() => {
    if (location.pathname !== '/') return;

    const handleScroll = () => {
      const stepsEl = document.getElementById('steps');
      const writeIntroEl = document.getElementById('write-intro');

      if (writeIntroEl && window.scrollY >= writeIntroEl.offsetTop - 300) {
        setActiveSection('write-intro');
      } else if (stepsEl && window.scrollY >= stepsEl.offsetTop - 300) {
        setActiveSection('steps');
      } else {
        setActiveSection('hero');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Compute dynamic dropdown anchor position directly beneath the Menu trigger button
  const updateDropdownPosition = useCallback(() => {
    if (!menuButtonRef.current) return;
    const btnRect = menuButtonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const menuWidth = isMobile ? Math.min(320, window.innerWidth - 24) : 280;
    const top = Math.round(btnRect.bottom + 8);

    if (language === 'ur') {
      const rawRight = window.innerWidth - btnRect.right;
      const right = Math.max(12, Math.min(rawRight, window.innerWidth - menuWidth - 12));
      setDropdownPosition({ top, right });
    } else {
      const rawLeft = btnRect.left;
      const left = Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12));
      setDropdownPosition({ top, left });
    }
  }, [language]);

  useEffect(() => {
    if (mobileMenuOpen) {
      updateDropdownPosition();
      const handleResizeOrScroll = () => updateDropdownPosition();
      window.addEventListener('resize', handleResizeOrScroll, { passive: true });
      window.addEventListener('scroll', handleResizeOrScroll, { passive: true });
      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    }
  }, [mobileMenuOpen, updateDropdownPosition]);

  // Close dropdown on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string, fallbackPath: string) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${targetId}`);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
    } else {
      setMobileMenuOpen(false);
      navigate(fallbackPath);
    }
  };

  // Determine active tab for floating pill dock
  const isHomeActive = location.pathname === '/' && activeSection === 'hero';
  const isStepsActive = location.pathname === '/' && activeSection === 'steps';
  const isDashboardActive = location.pathname === '/dashboard';
  const isSubmitActive = location.pathname === '/submit';

  return (
    <>
      {/* ========================================================
          1. TOP MINIMAL BAR: Brand Wordmark, Language & Account
          ======================================================== */}
      <header className="fixed top-0 left-0 right-0 z-40 py-4 px-4 sm:px-8 lg:px-12 pointer-events-none">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between w-full pointer-events-auto">

          {/* Brand Wordmark (Monochrome Civic Editorial) */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="group flex items-center gap-2 cursor-pointer select-none rounded-lg focus-visible:outline-2 focus-visible:outline-[#141414]"
            aria-label="Awaaz-e-Awam Home"
          >
            <span className="font-wordmark italic font-bold tracking-tight text-[#141414] text-xl sm:text-2xl group-hover:text-[#681822] transition-colors select-none">
              Awaaz-e-Awam
            </span>
          </Link>

          {/* Controls: Language Toggle, Account Link & Mobile Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            <div className="hidden sm:block h-3.5 w-px bg-[#E5E3E0] shrink-0 mx-0.5" />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-ui font-normal text-[#141414] hover:text-[#681822] hover:bg-[#E5E3E0]/40 transition-colors select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141414]"
            >
              <User className="w-3.5 h-3.5 text-[#323232]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>

            {/* Mobile / Tablet Menu Button */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-full bg-[#FAF9F7] border border-[#E5E3E0] text-[#141414] hover:bg-[#E5E3E0]/50 transition-colors cursor-pointer select-none shadow-sm focus-visible:outline-2 focus-visible:outline-[#141414]"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-[#141414]" />
              ) : (
                <Menu className="w-4 h-4 text-[#141414]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. REFERENCE 1: FLOATING PILL NAVIGATION DOCK (Bottom-Centered)
             Clean rounded container #FAF9F7, border #E5E3E0,
             distinctive deep Blood Maroon selected state #681822
          ======================================================== */}
      <aside
        className="fixed bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none transition-all duration-300"
        aria-label="Floating Civic Navigation Dock"
      >
        <nav
          aria-label="Desktop primary navigation"
          className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full bg-[#FAF9F7]/95 backdrop-blur-md border border-[#E5E3E0] shadow-[0_12px_36px_rgba(20,20,20,0.12),0_2px_8px_rgba(20,20,20,0.04)] max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-none"
        >
          {/* Home Link */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, 'hero', '/')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12.5px] sm:text-[13.5px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
              isHomeActive
                ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/60 font-normal'
            }`}
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>{t('navHome') || 'Home'}</span>
          </a>

          {/* How It Works Link */}
          <a
            href="#steps"
            onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12.5px] sm:text-[13.5px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
              isStepsActive
                ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/60 font-normal'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{language === 'ur' ? 'طریقہ کار' : 'How It Works'}</span>
          </a>

          {/* My Complaints Link */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12.5px] sm:text-[13.5px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
              isDashboardActive
                ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/60 font-normal'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{t('navMyComplaints') || 'My Complaints'}</span>
          </Link>

          {/* Write Complaint Link (Primary Signature CTA) */}
          <Link
            to="/submit"
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[12.5px] sm:text-[13.5px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
              isSubmitActive
                ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm ring-2 ring-[#681822]/20'
                : 'bg-[#141414] text-[#FFFFFF] hover:bg-[#681822] font-medium'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-[#FFFFFF] shrink-0" />
            <span>{t('navWriteComplaint') || 'Write Complaint'}</span>
          </Link>
        </nav>
      </aside>

      {/* ========================================================
          3. ACCESSIBLE MOBILE DRAWER (For small screens)
          ======================================================== */}
      {mobileMenuOpen && (
        <>
          <div
            data-testid="menu-backdrop"
            className="fixed inset-0 bg-[#141414]/30 backdrop-blur-[2px] z-50 pointer-events-auto transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            style={{
              top: `${dropdownPosition.top}px`,
              ...(dropdownPosition.left !== undefined ? { left: `${dropdownPosition.left}px` } : {}),
              ...(dropdownPosition.right !== undefined ? { right: `${dropdownPosition.right}px` } : {}),
            }}
            className="fixed w-[calc(100vw-24px)] max-w-xs p-4 rounded-3xl bg-[#FAF9F7] border border-[#E5E3E0] shadow-2xl z-50 text-start space-y-1 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#E5E3E0]">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#323232]">
                {language === 'ur' ? 'نیویگیشن مینیو' : 'Navigation Menu'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-[#323232] hover:text-[#141414] hover:bg-[#E5E3E0] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui font-medium text-[#141414] hover:bg-[#E5E3E0]/60 transition-colors cursor-pointer"
            >
              {t('navHome') || 'Home'}
            </a>
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#323232] hover:text-[#141414] hover:bg-[#E5E3E0]/60 transition-colors cursor-pointer"
            >
              {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
            </a>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#323232] hover:text-[#141414] hover:bg-[#E5E3E0]/60 transition-colors cursor-pointer"
            >
              {t('navMyComplaints') || 'My Complaints'}
            </Link>
            <Link
              to="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#323232] hover:text-[#141414] hover:bg-[#E5E3E0]/60 transition-colors cursor-pointer"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </Link>

            <div className="pt-2 mt-1 border-t border-[#E5E3E0] space-y-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-ui text-[#141414] bg-[#E5E3E0]/50 hover:bg-[#E5E3E0] transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-[#323232]" />
                <span>{t('navAccount') || t('navSignIn')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};
