import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll detection with requestAnimationFrame & smooth threshold
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

  // Compute dynamic dropdown anchor position directly beneath the Menu trigger button
  const updateDropdownPosition = useCallback(() => {
    if (!menuButtonRef.current) return;
    const btnRect = menuButtonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const menuWidth = isMobile ? Math.min(320, window.innerWidth - 24) : 300;

    // Position directly beneath the button with a refined 10px vertical gap
    const top = Math.round(btnRect.bottom + 10);

    if (language === 'ur') {
      // In RTL mode, anchor to right edge of button
      const rawRight = window.innerWidth - btnRect.right;
      const right = Math.max(12, Math.min(rawRight, window.innerWidth - menuWidth - 12));
      setDropdownPosition({ top, right });
    } else {
      // In LTR mode, anchor to left edge of button
      const rawLeft = btnRect.left;
      const left = Math.max(12, Math.min(rawLeft, window.innerWidth - menuWidth - 12));
      setDropdownPosition({ top, left });
    }
  }, [language]);

  // Update dropdown position on open, scroll, or resize
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

  // Prevent background scrolling when mobile menu is open on phone screens
  useEffect(() => {
    if (mobileMenuOpen && window.innerWidth < 640) {
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
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isScrolled
          ? 'py-3 sm:py-4 px-3 sm:px-6'
          : 'py-6 sm:py-7 lg:py-8 px-4 sm:px-8 lg:px-14 xl:px-20 bg-transparent'
      }`}
    >
      {/* Outer Floating Container Wrapper */}
      <div
        className={`relative mx-auto pointer-events-auto transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isScrolled
            ? 'w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-4xl xl:max-w-5xl px-4 sm:px-7 lg:px-9 py-3 sm:py-4 lg:py-5 min-h-[68px] sm:min-h-[72px] lg:min-h-[92px] flex items-center'
            : 'w-full max-w-[1360px] px-0 py-0 min-h-0'
        }`}
      >
        {/* Unified Floating Background Surface Layer
            Encapsulates background color, border, and elevation shadow.
            Transitions as one coherent visual layer, completely curing the border flash! */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-[34px] sm:rounded-[46px] bg-[var(--hero-center-surface)] border border-[#34394A]/15 shadow-[0_14px_36px_rgba(11,20,33,0.10),0_3px_10px_rgba(11,20,33,0.04)] pointer-events-none transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isScrolled
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-[0.98]'
          }`}
        />

        {/* Navigation Content (Z-10, always crisp, stable & mathematically centered) */}
        <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center w-full">

          {/* Zone 1 (Left): Navigation Links or Borderless Menu Button */}
          <div className="flex items-center justify-start min-w-0">
            {/* When at top (unscrolled) AND on xl: screens (>=1280px), show full 4 links without collision */}
            {!isScrolled ? (
              <>
                <nav
                  aria-label="Desktop primary navigation"
                  className="hidden xl:flex items-center gap-4 xl:gap-5 text-[12.5px] font-ui font-normal tracking-[0.015em]"
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

                {/* Below xl: (tablet & mobile), show borderless menu button */}
                <div className="flex xl:hidden items-center">
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-full bg-transparent hover:bg-[#CBD0D6]/50 text-[#0B1421] transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0B1421]"
                    aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation-drawer"
                  >
                    {mobileMenuOpen ? (
                      <X className="w-4 h-4 text-[#0B1421] shrink-0" />
                    ) : (
                      <Menu className="w-4 h-4 text-[#0B1421] shrink-0" />
                    )}
                    <span className="text-[12.5px] font-ui font-medium tracking-[0.015em] hidden sm:inline">
                      {language === 'ur' ? 'مینیو' : 'Menu'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              /* When scrolled, ALWAYS use compact borderless Menu button to prevent ANY collision in floating capsule */
              <div className="flex items-center">
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-full bg-transparent hover:bg-[#CBD0D6]/50 text-[#0B1421] transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0B1421]"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation-drawer"
                >
                  {mobileMenuOpen ? (
                    <X className="w-4 h-4 text-[#0B1421] shrink-0" />
                  ) : (
                    <Menu className="w-4 h-4 text-[#0B1421] shrink-0" />
                  )}
                  <span className="text-[12.5px] font-ui font-medium tracking-[0.015em] hidden sm:inline">
                    {language === 'ur' ? 'مینیو' : 'Menu'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Zone 2 (Center): Brand Wordmark (Mathematically Dead Center) */}
          <div className="flex items-center justify-center shrink-0 px-2 sm:px-6 lg:px-8 text-center">
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
                    ? 'text-[15px] sm:text-xl lg:text-[1.45rem]'
                    : 'text-base sm:text-2xl lg:text-[1.65rem]'
                }`}
              >
                Awaaz-e-Awam
              </span>
            </Link>
          </div>

          {/* Zone 3 (Right): Borderless Language Toggle & Account Control */}
          <div className="flex items-center justify-end min-w-0 gap-1 sm:gap-2">
            <LanguageToggle />

            <div className="hidden sm:block h-3.5 w-px bg-[#34394A]/15 shrink-0 mx-1" />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-full text-[12.5px] font-ui font-normal tracking-[0.015em] text-[#0B1421] hover:text-[#283041] bg-transparent hover:bg-[#CBD0D6]/50 transition-colors shrink-0 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0B1421]"
            >
              <User className="w-3.5 h-3.5 text-[#34394A] shrink-0" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Accessible Navigation Dropdown
          Anchored directly beneath the Menu trigger button with ~10px separation */}
      {mobileMenuOpen && (
        <>
          <div
            data-testid="menu-backdrop"
            className="fixed inset-0 bg-[#0B1421]/15 backdrop-blur-[1px] z-40 pointer-events-auto transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            style={{
              top: `${dropdownPosition.top}px`,
              ...(dropdownPosition.left !== undefined ? { left: `${dropdownPosition.left}px` } : {}),
              ...(dropdownPosition.right !== undefined ? { right: `${dropdownPosition.right}px` } : {})
            }}
            className="fixed w-[calc(100vw-24px)] sm:w-76 max-w-xs p-4 sm:p-5 rounded-3xl bg-[var(--hero-center-surface)] border border-[#34394A]/15 shadow-2xl z-50 text-start space-y-1 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-2.5 mb-1.5 border-b border-[#34394A]/15">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#535965]">
                {language === 'ur' ? 'نیویگیشن مینیو' : 'Navigation Menu'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-[#535965] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui font-medium text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors cursor-pointer"
            >
              {t('navHome') || 'Home'}
            </a>
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors cursor-pointer"
            >
              {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
            </a>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors cursor-pointer"
            >
              {t('navMyComplaints') || 'My Complaints'}
            </Link>
            <Link
              to="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-[13px] font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6]/60 transition-colors cursor-pointer"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </Link>

            <div className="pt-2.5 mt-1.5 border-t border-[#34394A]/15 space-y-1.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-ui text-[#0B1421] bg-[#CBD0D6]/50 hover:bg-[#CBD0D6] transition-colors cursor-pointer"
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
