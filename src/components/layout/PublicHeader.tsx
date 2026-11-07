import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { LanguageToggle } from '../common/LanguageToggle';
import { Menu, X, PenTool, LayoutList, Search, User } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: t('navHome') },
    { path: '/dashboard', label: t('navMyComplaints') || 'My Complaints', icon: <LayoutList className="w-3.5 h-3.5" /> },
    { path: '/submit', label: t('navWriteComplaint') || 'Write Complaint', icon: <PenTool className="w-3.5 h-3.5" /> },
    { path: '/track', label: t('navTrack') || 'Track', icon: <Search className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-topbar">
      <Container size="xl">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <CivicEmblem size="sm" className="opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="text-start">
              <span className="block text-sm sm:text-base font-semibold text-[#1C3033] tracking-tight leading-tight">
                Awaaz-e-Awam
              </span>
              <span className="block text-[11px] font-normal text-[#667578] hidden sm:block">
                Karachi Civic Portal
              </span>
            </div>
          </Link>

          {/* Center: Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-[#193D3D] bg-[#E5E9E7]/60 font-semibold'
                    : 'text-[#667578] hover:text-[#1C3033] hover:bg-[#E5E9E7]/30'
                }`}
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Language Switcher & Account Access */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageToggle />
            <div className="h-4 w-px bg-[#E5E9E7]" />
            <Link
              to="/login"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                isActive('/login')
                  ? 'text-[#193D3D] font-semibold'
                  : 'text-[#667578] hover:text-[#1C3033]'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#667578]" />
              <span>{t('navAccount') || t('navSignIn')}</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-[#667578] hover:text-[#1C3033] hover:bg-[#E5E9E7]/40 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#E5E9E7] py-3 px-1 space-y-1 bg-[#F7F8F7]/95 backdrop-blur-md animate-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium ${
                  isActive(link.path)
                    ? 'text-[#193D3D] bg-[#E5E9E7]/70 font-semibold'
                    : 'text-[#667578] hover:text-[#1C3033] hover:bg-[#E5E9E7]/40'
                }`}
              >
                <span>{link.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-[#E5E9E7]">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium text-[#667578] hover:text-[#1C3033]"
              >
                <User className="w-4 h-4 text-[#667578]" />
                <span>{t('navAccount') || t('navSignIn')}</span>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
};
