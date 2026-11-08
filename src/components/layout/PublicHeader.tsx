import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { Menu, X, User, Search } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export const PublicHeader: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
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
      }
      setMobileMenuOpen(false);
    } else {
      setMobileMenuOpen(false);
      navigate(fallbackPath);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/track?ref=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out ${
          isScrolled
            ? 'py-3 px-4 sm:px-8'
            : 'py-5 px-6 sm:px-12 bg-transparent'
        }`}
      >
        <div
          className={`relative mx-auto transition-all duration-300 ${
            isScrolled
              ? 'max-w-5xl rounded-full bg-[#283041]/85 backdrop-blur-md border border-[#34394A] shadow-2xl px-6 py-2.5 flex items-center justify-between'
              : 'max-w-7xl flex items-center justify-between'
          }`}
        >
          {/* Left: Section Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium tracking-wide">
            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className="text-[#B5B9BC] hover:text-[#F1F2F3] transition-colors"
            >
              {t('navHome') || 'Home'}
            </a>
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className="text-[#B5B9BC] hover:text-[#F1F2F3] transition-colors"
            >
              {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
            </a>
            <a
              href="#my-complaints"
              onClick={(e) => handleNavClick(e, 'my-complaints', '/dashboard')}
              className="text-[#B5B9BC] hover:text-[#F1F2F3] transition-colors"
            >
              {t('navMyComplaints') || 'My Complaints'}
            </a>
            <a
              href="#write-complaint"
              onClick={(e) => handleNavClick(e, 'write-complaint', '/submit')}
              className="text-[#B5B9BC] hover:text-[#F1F2F3] transition-colors"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </a>
          </nav>

          {/* Center: Brand Wordmark (Exact Viewport Center) */}
          <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex flex-col items-center justify-center">
            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="group flex flex-col items-center text-center"
            >
              <span className="font-wordmark italic font-bold text-xl sm:text-2xl text-[#F1F2F3] tracking-tight group-hover:text-white transition-colors">
                Awaaz-e-Awam
              </span>
              {!isScrolled && (
                <span className="text-[10px] tracking-widest text-[#B5B9BC]/70 uppercase font-mono">
                  {language === 'ur' ? 'شہری شکایات پورٹل' : 'Citizen Platform'}
                </span>
              )}
            </Link>
          </div>

          {/* Right: Functional Utilities (Search, Language, Sign In) */}
          <div className="hidden sm:flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-full text-[#B5B9BC] hover:text-[#F1F2F3] hover:bg-[#283041] transition-colors cursor-pointer"
              title="Search or track complaint"
              aria-label="Search complaints"
            >
              <Search className="w-4 h-4" />
            </button>

            <LanguageToggle />

            <div className="h-4 w-px bg-[#34394A]" />

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#F1F2F3] bg-[#283041]/80 hover:bg-[#283041] border border-[#34394A] transition-colors"
            >
              <User className="w-3.5 h-3.5 text-[#B5B9BC]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-full text-[#B5B9BC] hover:text-[#F1F2F3] hover:bg-[#283041] transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-[#34394A] bg-[#283041]/80 rounded-lg text-[#F1F2F3] hover:bg-[#283041] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 max-w-lg mx-auto p-4 rounded-2xl bg-[#172131]/95 backdrop-blur-xl border border-[#34394A] shadow-2xl text-start space-y-2 animate-in fade-in duration-200">
            <a
              href="#hero"
              onClick={(e) => handleNavClick(e, 'hero', '/')}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#F1F2F3] hover:bg-[#283041] transition-colors"
            >
              {t('navHome') || 'Home'}
            </a>
            <a
              href="#steps"
              onClick={(e) => handleNavClick(e, 'steps', '/#steps')}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#B5B9BC] hover:text-[#F1F2F3] hover:bg-[#283041] transition-colors"
            >
              {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
            </a>
            <a
              href="#my-complaints"
              onClick={(e) => handleNavClick(e, 'my-complaints', '/dashboard')}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#B5B9BC] hover:text-[#F1F2F3] hover:bg-[#283041] transition-colors"
            >
              {t('navMyComplaints') || 'My Complaints'}
            </a>
            <a
              href="#write-complaint"
              onClick={(e) => handleNavClick(e, 'write-complaint', '/submit')}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#B5B9BC] hover:text-[#F1F2F3] hover:bg-[#283041] transition-colors"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </a>
            <div className="pt-2 border-t border-[#34394A]">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#F1F2F3] hover:bg-[#283041] transition-colors"
              >
                <User className="w-4 h-4 text-[#B5B9BC]" />
                <span>{t('navAccount') || t('navSignIn')}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Search & Track Modal */}
      <Modal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title={language === 'ur' ? 'شکایت تلاش یا ٹریک کریں' : 'Search or Track Complaint'}
        maxWidth="md"
      >
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <p className="text-xs text-[#B5B9BC] leading-relaxed">
            {language === 'ur'
              ? 'اپنا ٹریکنگ کوڈ یا کلیدی الفاظ درج کریں تاکہ آپ اپنی شکایت کا اسٹیٹس دیکھ سکیں۔'
              : 'Enter your tracking reference number (e.g. KHI-2026-0042) or keywords to locate and track your complaint.'}
          </p>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. KHI-2026-0042"
            autoFocus
            leftIcon={<Search className="w-4 h-4" />}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!searchQuery.trim()}
            >
              {language === 'ur' ? 'ٹریک کریں' : 'Track Now'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};