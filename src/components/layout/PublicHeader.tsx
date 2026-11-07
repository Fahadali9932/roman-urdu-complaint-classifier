import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Container } from './Container';
import { CivicEmblem } from '../common/CivicEmblem';
import { LanguageToggle } from '../common/LanguageToggle';
import { Button } from '../common/Button';
import { Menu, X, PlusCircle, Search, LayoutDashboard } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t('navHome'), icon: null },
    { path: '/submit', label: t('navSubmit'), icon: <PlusCircle className="w-4 h-4" /> },
    { path: '/track', label: t('navTrack'), icon: <Search className="w-4 h-4" /> },
    { path: '/dashboard', label: t('navDashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <Container size="xl">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo & Academic Label */}
          <Link to="/" className="flex items-center gap-3 group">
            <CivicEmblem size="md" className="group-hover:scale-105 transition-transform" />
            <div className="text-start">
              <span className="block text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                {t('brandSub')}
              </span>
              <span className="block text-[11px] font-medium text-teal-800">
                {t('academicAffiliation')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-teal-900 bg-teal-50/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Action CTAs & Language Switcher */}
          <div className="hidden sm:flex items-center gap-2.5">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="outline" size="sm">
                {t('navSignIn')}
              </Button>
            </Link>
            <Link to="/submit">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
                {t('navSubmit')}
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 py-4 px-2 space-y-2 bg-white animate-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive(link.path)
                    ? 'text-teal-900 bg-teal-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full">
                  {t('navSignIn')}
                </Button>
              </Link>
              <Link to="/submit" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="md" className="w-full" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  {t('navSubmit')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
};
