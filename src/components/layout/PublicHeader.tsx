import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { Menu, X, User } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll detection with requestAnimationFrame
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on Escape key or outside click
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

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isScrolled
          ? 'py-3 sm:py-4 px-3 sm:px-6'
          : 'py-6 sm:py-7 lg:py-8 px-5 sm:px-10 lg:px-14 xl:px-20 bg-transparent'
      }`}
    >
      {/* Outer Floating Container */}
      <div
        className={`mx-auto pointer-events-auto transition-all duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled
            ? 'w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-4xl xl:max-w-5xl rounded-[34px] sm:rounded-[46px] bg-[var(--hero-center-surface)] min-h-[68px] sm:min-h-[72px] lg:min-h-[92px] border border-[#34394A]/15 shadow-[0_14px_36px_rgba(11,20,33,0.10),0_3px_10px_rgba(11,20,33,0.04)] px-4 sm:px-7 lg:px-9 py-3 sm:py-4 lg:py-5 flex items-center'
            : 'w-full max-w-[1360px]'
        }`}
      >
        {/* 3-Zone CSS Grid Layout for Mathematical Centering */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">

          {/* Zone 1 (Left): Desktop navigation links / Mobile menu toggle */}
          <div className="flex items-center justify-start min-w-0">
            {/* Desktop Navigation Links: Outfit 400, 12.5px, 0.015em letter-spacing */}
            <nav
              aria-label="Desktop primary navigation"
              className="hidden lg:flex items-center gap-4 xl:gap-5 text-[12.5px] font-ui font-normal tracking-[0.015em]"
            >
              <a
                href="#hero"
                onClick={(e) => handleNavClick(e, 'hero', '/')}
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-2 px-2.5 rounded-full hover:bg-[#CBD0D6]/40 shrink-0 select-none cursor-pointer"
              >
                {t('navHome') || 'Home'}
              </a>
              <a
                href="#steps"
                onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-2 px-2.5 rounded-full hover:bg-[#CBD0D6]/40 shrink-0 select-none cursor-pointer"
              >
                {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
              </a>
              <Link
                to="/dashboard"
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-2 px-2.5 rounded-full hover:bg-[#CBD0D6]/40 shrink-0 select-none cursor-pointer"
              >
                {t('navMyComplaints') || 'My Complaints'}
              </Link>
              <Link
                to="/submit"
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-2 px-2.5 rounded-full hover:bg-[#CBD0D6]/40 shrink-0 select-none cursor-pointer"
              >
                {t('navWriteComplaint') || 'Write Complaint'}
              </Link>
            </nav>

            {/* Mobile / Tablet Compact Menu Button */}
            <div className="flex lg:hidden items-center">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 sm:p-2.5 min-h-[44px] min-w-[44px] border border-[#34394A]/20 bg-[var(--hero-center-surface)] hover:bg-[#CBD0D6] rounded-full text-[#0B1421] transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#0B1421]"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B1421]" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B1421]" />
                )}
              </button>
            </div>
          </div>

          {/* Zone 2 (Center): Brand Wordmark (Mathematically Dead Center) */}
          <div className="flex items-center justify-center shrink-0 px-3 sm:px-6 lg:px-8 text-center">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="group flex items-center justify-center cursor-pointer select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#0B1421] rounded-lg"
              aria-label="Awaaz-e-Awam Home"
            >
              <span
                className={`font-wordmark italic font-bold tracking-tight text-[#0B1421] group-hover:text-[#283041] transition-all whitespace-nowrap select-none ${
                  isScrolled
                    ? 'text-lg sm:text-xl lg:text-[1.45rem]'
                    : 'text-xl sm:text-2xl lg:text-[1.65rem]'
                }`}
              >
                Awaaz-e-Awam
              </span>
            </Link>
          </div>

          {/* Zone 3 (Right): Language Toggle & Account Control */}
          <div className="flex items-center justify-end min-w-0 gap-2 sm:gap-3.5">
            <LanguageToggle />

            <div className="hidden sm:block h-3.5 w-px bg-[#34394A]/20 shrink-0" />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-full text-[12.5px] font-ui font-normal tracking-[0.015em] text-[#0B1421] hover:text-[#283041] bg-[#DEE1E5]/75 hover:bg-[#DEE1E5] border border-[#34394A]/20 transition-colors shrink-0 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0B1421]"
            >
              <User className="w-3.5 h-3.5 text-[#34394A] shrink-0" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Accessible Mobile Drawer Backdrop & Panel */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#0B1421]/20 backdrop-blur-[2px] z-40 lg:hidden pointer-events-auto"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed top-20 sm:top-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-84 max-w-sm mx-auto p-5 rounded-3xl bg-[var(--hero-center-surface)] border border-[#34394A]/20 shadow-2xl z-50 text-start space-y-1.5 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#34394A]/15">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#535965]">
                {language === 'ur' ? 'نیویگیشن' : 'Navigation'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-[#535965] hover:text-[#0B1421] hover:bg-[#CBD0D6] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className="block px-3.5 py-2.5 rounded-xl text-[13.5px] font-ui font-medium text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors"
            >
              {t('navHome') || 'Home'}
            </a>
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className="block px-3.5 py-2.5 rounded-xl text-[13.5px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors"
            >
              {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
            </a>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-[13.5px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors"
            >
              {t('navMyComplaints') || 'My Complaints'}
            </Link>
            <Link
              to="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-[13.5px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </Link>

            <div className="pt-3 mt-2 border-t border-[#34394A]/15 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-ui text-[#0B1421] bg-[#CBD0D6]/60 hover:bg-[#CBD0D6] transition-colors"
              >
                <User className="w-4 h-4 text-[#34394A]" />
                <span>{t('navAccount') || t('navSignIn')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
