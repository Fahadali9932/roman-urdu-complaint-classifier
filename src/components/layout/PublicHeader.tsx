import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { Menu, X, User } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: t('navHome') },
    { path: '/submit', label: t('navWriteComplaint') || 'Write Complaint' },
    { path: '/dashboard', label: t('navMyComplaints') || 'My Complaints' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F1F1F0] border-b border-[#D5D5D3]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Left: Brand Identity */}
          <Link to="/" className="flex flex-col text-start group">
            <span className="font-display font-black text-xl sm:text-2xl text-[#111111] tracking-tighter uppercase leading-none">
              Awaaz-e-Awam
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wide text-[#5B5B5B] mt-1">
              {language === 'ur' ? 'شہری شکایات پورٹل' : 'Citizen Complaint Portal'}
            </span>
          </Link>

          {/* Center: Swiss Editorial Navigation */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-xs font-bold tracking-wide px-3.5 py-1.5 rounded-md transition-all ${
                  isActive(link.path)
                    ? 'text-[#111111] bg-[#FAFAF9] border border-[#D5D5D3] shadow-2xs'
                    : 'text-[#5B5B5B] hover:text-[#111111]'
                }`}
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Language Toggle & Account Access */}
          <div className="hidden sm:flex items-center gap-4">
            <LanguageToggle />
            <div className="h-4 w-px bg-[#D5D5D3]" />
            <Link
              to="/login"
              className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#111111] hover:text-[#2A2B2E] transition-colors ${
                isActive('/login') ? 'underline underline-offset-4' : ''
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#5B5B5B]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-[#D5D5D3] bg-[#FAFAF9] rounded-md text-[#111111] hover:bg-[#EAEAE8] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-[#D5D5D3] text-start space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-md text-xs font-bold tracking-wide transition-colors ${
                  isActive(link.path)
                    ? 'bg-[#111111] text-white'
                    : 'text-[#5B5B5B] hover:bg-[#FAFAF9] hover:text-[#111111]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#D5D5D3]">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold tracking-wide transition-colors ${
                  isActive('/login')
                    ? 'bg-[#111111] text-white'
                    : 'text-[#5B5B5B] hover:bg-[#FAFAF9] hover:text-[#111111]'
                }`}
              >
                <User className="w-4 h-4 text-[#5B5B5B]" />
                <span>{t('navAccount') || t('navSignIn')}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
