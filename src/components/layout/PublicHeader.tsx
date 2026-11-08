import React, { useState, useEffect } from 'react';
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out ${
        isScrolled
          ? 'py-3 sm:py-4 px-3 sm:px-6'
          : 'py-6 sm:py-8 px-5 sm:px-10 lg:px-14 xl:px-20 bg-transparent'
      }`}
    >
      <div
        className={`mx-auto transition-all duration-400 ease-out ${
          isScrolled
            ? 'max-w-5xl xl:max-w-6xl rounded-full bg-[var(--hero-center-surface)] min-h-[70px] sm:min-h-[72px] border border-[#34394A]/15 shadow-xl shadow-[#0B1421]/8 px-5 sm:px-8 py-3.5 sm:py-4 flex items-center'
            : 'w-full'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          
          {/* Left Wing (flex-1): Navigation links on desktop, hamburger on mobile */}
          <div className="flex items-center justify-start flex-1 min-w-0">
            {/* Desktop Nav Links: Thin, refined, geometric Outfit typography */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-[13px] sm:text-[14px] font-ui font-normal tracking-[0.015em]">
              <a
                href="#hero"
                onClick={(e) => handleNavClick(e, 'hero', '/')}
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-1 shrink-0"
              >
                {t('navHome') || 'Home'}
              </a>
              <a
                href="#steps"
                onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-1 shrink-0"
              >
                {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
              </a>
              <Link
                to="/dashboard"
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-1 shrink-0"
              >
                {t('navMyComplaints') || 'My Complaints'}
              </Link>
              <Link
                to="/submit"
                className="text-[#283041] hover:text-[#0B1421] transition-colors py-1 shrink-0"
              >
                {t('navWriteComplaint') || 'Write Complaint'}
              </Link>
            </nav>

            {/* Mobile Hamburger on Left */}
            <div className="flex lg:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 border border-[#34394A]/20 bg-[var(--hero-center-surface)] rounded-lg text-[#0B1421] hover:bg-[#CBD0D6] transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Center Anchor: Brand Wordmark (Dead Center + Protected Negative Space) */}
          <div className="flex items-center justify-center shrink-0 px-4 sm:px-6 lg:px-8">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="group flex items-center justify-center cursor-pointer select-none whitespace-nowrap"
              aria-label="Awaaz-e-Awam Home"
            >
              <span className={`font-wordmark italic font-bold tracking-tight text-[#0B1421] group-hover:text-[#283041] transition-all whitespace-nowrap ${
                isScrolled
                  ? 'text-lg sm:text-xl lg:text-2xl'
                  : 'text-xl sm:text-2xl lg:text-[1.75rem]'
              }`}>
                Awaaz-e-Awam
              </span>
            </Link>
          </div>

          {/* Right Wing (flex-1): Language Toggle & Sign In */}
          <div className="flex items-center justify-end flex-1 min-w-0 gap-2 sm:gap-4">
            <LanguageToggle />

            <div className="hidden sm:block h-3.5 w-px bg-[#34394A]/20" />

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-ui font-normal tracking-[0.015em] text-[#0B1421] hover:text-[#283041] bg-[#DEE1E5]/70 hover:bg-[#DEE1E5] border border-[#34394A]/20 transition-colors shrink-0"
            >
              <User className="w-3.5 h-3.5 text-[#34394A]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 max-w-sm mx-auto p-4 rounded-2xl bg-[var(--hero-center-surface)] border border-[#34394A]/20 shadow-xl text-start space-y-1.5 animate-in fade-in duration-200">
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, 'hero', '/')}
            className="block px-3.5 py-2.5 rounded-lg text-sm font-ui text-[#0B1421] hover:bg-[#CBD0D6] transition-colors"
          >
            {t('navHome') || 'Home'}
          </a>
          <a
            href="#steps"
            onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
            className="block px-3.5 py-2.5 rounded-lg text-sm font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6] transition-colors"
          >
            {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
          </a>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3.5 py-2.5 rounded-lg text-sm font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6] transition-colors"
          >
            {t('navMyComplaints') || 'My Complaints'}
          </Link>
          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3.5 py-2.5 rounded-lg text-sm font-ui text-[#283041] hover:text-[#0B1421] hover:bg-[#CBD0D6] transition-colors"
          >
            {t('navWriteComplaint') || 'Write Complaint'}
          </Link>
          <div className="pt-2.5 border-t border-[#34394A]/20">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-ui text-[#0B1421] bg-[#CBD0D6]/60 hover:bg-[#CBD0D6] transition-colors"
            >
              <User className="w-4 h-4 text-[#34394A]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
