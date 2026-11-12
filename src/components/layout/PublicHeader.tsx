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
  const [scrollSection, setScrollSection] = useState<'home' | 'steps' | 'submit' | 'footer'>('home');
  const [darkHeaderActive, setDarkHeaderActive] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isInfoPage = ['/about', '/contact', '/privacy-policy', '/terms-of-use', '/privacy', '/terms'].includes(
    location.pathname
  );
  const isDarkHeader = isInfoPage || darkHeaderActive;
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Synchronized active-section detection and dark-footer contrast switching
  useEffect(() => {
    const checkActiveSection = () => {
      const footerEl = document.getElementById('footer') || document.querySelector('footer');
      const writeIntroEl = document.getElementById('write-intro');
      const stepsEl = document.getElementById('steps');
      const vh = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      setIsScrolled(scrollY > 20);

      // Dark header detection: dark footer surface is dominant behind header (< 72px)
      if (footerEl) {
        const fRect = footerEl.getBoundingClientRect();
        if (fRect.top <= 72 && fRect.bottom > 72) {
          setDarkHeaderActive(true);
        } else {
          setDarkHeaderActive(false);
        }

        // Objective 9: When footer is visible on screen on homepage, set neutral dock state (no pill active)
        if (location.pathname === '/' && fRect.top <= vh * 0.45 && fRect.bottom > 72) {
          setScrollSection('footer');
          return;
        }
      } else {
        setDarkHeaderActive(false);
      }

      if (location.pathname === '/') {
        if (writeIntroEl) {
          const rect = writeIntroEl.getBoundingClientRect();
          if (rect.top <= vh * 0.45) {
            setScrollSection('submit');
            return;
          }
        }

        if (stepsEl) {
          const rect = stepsEl.getBoundingClientRect();
          if (rect.top <= vh * 0.45) {
            setScrollSection('steps');
            return;
          }
        }

        setScrollSection('home');
      }
    };

    window.addEventListener('scroll', checkActiveSection, { passive: true });
    window.addEventListener('resize', checkActiveSection, { passive: true });
    checkActiveSection();

    return () => {
      window.removeEventListener('scroll', checkActiveSection);
      window.removeEventListener('resize', checkActiveSection);
    };
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
        const isMobile = window.innerWidth < 640;
        // On mobile, keep comfortable header clearance.
        // On desktop, full-screen sticky stages (like #steps) align flush at top: 0.
        const headerOffset = isMobile ? 72 : (targetId === 'steps' ? 0 : 0);
        const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset);
        window.scrollTo({ top, behavior: 'smooth' });
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

  // Exactly one active item state helper
  const isHomeActive = location.pathname === '/' && scrollSection === 'home';
  const isStepsActive = location.pathname === '/' && scrollSection === 'steps';
  const isDashboardActive = location.pathname === '/dashboard';
  const isSubmitActive = location.pathname === '/submit' || (location.pathname === '/' && scrollSection === 'submit');

  return (
    <>
      {/* ========================================================
          TOP HEADER: Brand (Left), Centered Pill Dock (Center),
          Language & Account Controls (Right)
          Features dynamic contrast inversion on dark background
          ======================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 py-3 sm:py-4 px-4 sm:px-8 lg:px-12 transition-all duration-300 ${
          isInfoPage && isScrolled
            ? 'bg-[#141414]/80 backdrop-blur-md border-b border-white/10 pointer-events-auto'
            : isDarkHeader
              ? 'bg-transparent border-b border-transparent pointer-events-none'
              : location.pathname !== '/' && isScrolled
                ? 'bg-[#F7F6F3]/90 backdrop-blur-md border-b border-[#E5E3E0]/80 shadow-[0_4px_20px_rgba(20,20,20,0.03)] pointer-events-auto'
                : 'bg-transparent border-b border-transparent pointer-events-none'
        }`}
      >
        <div className="max-w-[1440px] mx-auto w-full relative flex items-center justify-between pointer-events-auto">

          {/* LEFT: Brand Wordmark (turns white on dark footer) */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="group flex items-center gap-2 cursor-pointer select-none rounded-lg focus-visible:outline-2 focus-visible:outline-[#141414] z-20 shrink-0"
            aria-label="Awaaz-e-Awam Home"
          >
            <span
              className={`font-wordmark italic font-bold tracking-tight text-xl sm:text-2xl transition-colors select-none ${
                isDarkHeader
                  ? 'text-[#FFFFFF] group-hover:text-[#F7F6F3]'
                  : 'text-[#141414] group-hover:text-[#681822]'
              }`}
            >
              Awaaz-e-Awam
            </span>
          </Link>

          {/* CENTER: Floating Pill Navigation Dock (Viewport-Centered)
              Only ONE item selected at a time with #681822 Blood Maroon highlight */}
          <nav
            aria-label="Desktop primary navigation"
            className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden lg:flex items-center p-1 sm:p-1.5 rounded-full bg-[#FAF9F7]/95 backdrop-blur-md border border-[#E5E3E0] shadow-[0_8px_24px_rgba(20,20,20,0.08)] select-none z-10"
          >
            {/* Home Link */}
            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[13px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
                isHomeActive
                  ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/40 font-normal'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>{t('navHome') || 'Home'}</span>
            </a>

            {/* How It Works Link */}
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[13px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
                isStepsActive
                  ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/40 font-normal'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ur' ? 'طریقہ کار' : 'How It Works'}</span>
            </a>

            {/* My Complaints Link */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[13px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
                isDashboardActive
                  ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/40 font-normal'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t('navMyComplaints') || 'My Complaints'}</span>
            </Link>

            {/* Write Complaint Link (Identical pill geometry, exactly ONE maroon highlight when active) */}
            <Link
              to="/submit"
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[13px] font-ui transition-all duration-300 whitespace-nowrap cursor-pointer select-none ${
                isSubmitActive
                  ? 'bg-[#681822] text-[#FFFFFF] font-medium shadow-sm'
                  : 'text-[#171717] hover:text-[#141414] hover:bg-[#E5E3E0]/40 font-normal'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span>{t('navWriteComplaint') || 'Write Complaint'}</span>
            </Link>
          </nav>

          {/* RIGHT: Controls (Language Toggle, Account Link, Mobile Menu Trigger)
              Dynamically turns white on dark footer scene */}
          <div className="flex items-center gap-2 sm:gap-3 z-20 shrink-0">
            <LanguageToggle isDark={isDarkHeader} />

            <div className={`hidden lg:block h-3.5 w-px shrink-0 mx-0.5 transition-colors ${
              isDarkHeader ? 'bg-white/20' : 'bg-[#E5E3E0]'
            }`} />

            <Link
              to="/login"
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-ui font-normal transition-colors select-none cursor-pointer ${
                isDarkHeader
                  ? 'text-[#FFFFFF] hover:text-[#FAF9F7] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white'
                  : 'text-[#141414] hover:text-[#681822] hover:bg-[#E5E3E0]/40 focus-visible:outline-2 focus-visible:outline-[#141414]'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${isDarkHeader ? 'text-white/80' : 'text-[#323232]'}`} />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>

            {/* Mobile / Tablet Menu Button */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden inline-flex items-center justify-center p-2 rounded-full transition-colors cursor-pointer select-none shadow-sm ${
                isDarkHeader
                  ? 'bg-white/10 border border-white/20 text-[#FFFFFF] hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white'
                  : 'bg-[#FAF9F7] border border-[#E5E3E0] text-[#141414] hover:bg-[#E5E3E0]/50 focus-visible:outline-2 focus-visible:outline-[#141414]'
              }`}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? (
                <X className={`w-4 h-4 ${isDarkHeader ? 'text-[#FFFFFF]' : 'text-[#141414]'}`} />
              ) : (
                <Menu className={`w-4 h-4 ${isDarkHeader ? 'text-[#FFFFFF]' : 'text-[#141414]'}`} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          ACCESSIBLE MOBILE NAVIGATION DRAWER
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
            className="fixed z-50 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] p-4 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E3E0]/70 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#323232]">
                Navigation Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#323232] hover:text-[#141414] hover:bg-[#E5E3E0]/50 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5" aria-label="Mobile links">
              <a
                href="#hero"
                onClick={(e) => handleNavClick(e, 'hero', '/')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui transition-colors ${
                  isHomeActive
                    ? 'bg-[#681822] text-[#FFFFFF] font-medium'
                    : 'text-[#141414] hover:bg-[#E5E3E0]/50 font-normal'
                }`}
              >
                <span className="font-medium">{t('navHome') || 'Home'}</span>
              </a>

              <a
                href="#steps"
                onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui transition-colors ${
                  isStepsActive
                    ? 'bg-[#681822] text-[#FFFFFF] font-medium'
                    : 'text-[#141414] hover:bg-[#E5E3E0]/50 font-normal'
                }`}
              >
                <span className="font-medium">{language === 'ur' ? 'طریقہ کار' : 'How It Works'}</span>
              </a>

              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui transition-colors ${
                  isDashboardActive
                    ? 'bg-[#681822] text-[#FFFFFF] font-medium'
                    : 'text-[#141414] hover:bg-[#E5E3E0]/50 font-normal'
                }`}
              >
                <span className="font-medium">{t('navMyComplaints') || 'My Complaints'}</span>
              </Link>

              <Link
                to="/submit"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui transition-colors ${
                  isSubmitActive
                    ? 'bg-[#681822] text-[#FFFFFF] font-medium'
                    : 'text-[#141414] hover:bg-[#E5E3E0]/50 font-normal'
                }`}
              >
                <span className="font-medium">{t('navWriteComplaint') || 'Write Complaint'}</span>
              </Link>

              <div className="pt-2 mt-1 border-t border-[#E5E3E0]/70">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui text-[#141414] bg-[#E5E3E0]/40 hover:bg-[#E5E3E0]/70 transition-colors"
                >
                  <User className="w-4 h-4 text-[#323232]" />
                  <span className="font-medium">{t('navAccount') || t('navSignIn')}</span>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default PublicHeader;
