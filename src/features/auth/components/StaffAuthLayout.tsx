import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useCivicTheme } from '../../department/hooks/useCivicTheme';
import { SculpturalComposition } from './SculpturalComposition';
import { Globe, ArrowLeft, ArrowRight, Sun, Moon } from 'lucide-react';
import '../staff-auth.css';

interface StaffAuthLayoutProps {
  children: React.ReactNode;
  activeRole: 'admin' | 'department';
}

export const StaffAuthLayout: React.FC<StaffAuthLayoutProps> = ({
  children,
}) => {
  const { language, toggleLanguage, isRTL } = useLanguage();
  const { theme, toggleTheme } = useCivicTheme();

  return (
    <div className="staff-auth-root flex flex-col justify-between min-h-screen relative selection:bg-[#2C4A52]/30">
      {/* Background Ambience (Deep Mineral Canvas) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(44, 74, 82, 0.4) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(18, 46, 50, 0.3) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Main Responsive Grid Container (1440px Canvas standard) */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* =========================================================================
              LEFT COLUMN — SCULPTURAL CIVIC INTERFACE & PURPOSE (lg:col-span-6)
              Matches Figma frames 35:1283 - 35:1296
              ========================================================================= */}
          <section className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-8 lg:p-12" style={{ color: 'var(--v3-ink)' }}>
            {/* Top Brand Monogram */}
            <div className="flex items-center gap-3.5">
              <Link
                to="/"
                className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 rounded-xl"
                title="Go to citizen portal"
              >
                <div
                  className="w-[42px] h-[42px] rounded-xl flex items-center justify-center font-serif text-xl font-bold transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: 'var(--v3-surface)',
                    border: '1px solid var(--v3-edge)',
                    color: 'var(--v3-ink)',
                  }}
                >
                  a.
                </div>
                <div>
                  <span className="block font-medium text-base tracking-tight" style={{ color: 'var(--v3-ink)' }}>
                    {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                  </span>
                  <span className="block font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--v3-muted)' }}>
                    ADMINISTRATOR &amp; DEPARTMENT PORTAL
                  </span>
                </div>
              </Link>
            </div>

            {/* Display Typography */}
            <div className="my-8 lg:my-10 space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-medium leading-[1.12] tracking-tight" style={{ color: 'var(--v3-ink)' }}>
                {language === 'ur' ? (
                  <>
                    ذمہ داری،
                    <br />
                    کارروائی کی گنجائش کے ساتھ۔
                  </>
                ) : (
                  <>
                    Responsibility,
                    <br />
                    with room to act.
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed max-w-md" style={{ color: 'var(--v3-muted)' }}>
                {language === 'ur'
                  ? 'عوامی خدمت اور جوابدہی کے تحفظ کے لیے مخصوص اور سنجیدہ ورک اسپیس۔'
                  : 'A considered workspace for the people who keep public services accountable.'}
              </p>
            </div>

            {/* Sculptural Composition Centerpiece */}
            <div className="my-4 lg:my-6 flex items-center justify-center">
              <SculpturalComposition />
            </div>

            {/* Footer Metadata Tag */}
            <div className="pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--v3-edge)', color: 'var(--v3-muted)' }}>
              <span className="font-mono text-[11px] tracking-[0.25em] uppercase">
                B / ATMOSPHERIC CIVIC GLASS
              </span>
              <span className="text-[11px]">
                Central Administrator Portal · Zero public registration
              </span>
            </div>
          </section>

          {/* =========================================================================
              RIGHT COLUMN — ELEVATED SCULPTED PORCELAIN SURFACE (lg:col-span-6)
              Matches Figma Frame 35:1297 (696x952)
              ========================================================================= */}
          <section className="lg:col-span-6 flex flex-col justify-center">
            <div className="staff-porcelain-surface w-full max-w-[696px] mx-auto p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
              {/* Top Navigation, Language & Theme Switcher inside glass surface */}
              <div
                className="flex items-center justify-between pb-6 mb-6 border-b"
                style={{ borderColor: 'var(--v3-edge)' }}
              >
                <Link
                  to="/"
                  className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--v3-muted)' }}
                >
                  {isRTL ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="staff-theme-toggle flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      borderColor: 'var(--v3-edge)',
                      color: 'var(--v3-ink)',
                      backgroundColor: 'var(--v3-surface)',
                    }}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" style={{ color: 'var(--v3-muted)' }} />
                    )}
                    <span className="font-mono text-[11px]">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      borderColor: 'var(--v3-edge)',
                      color: 'var(--v3-ink)',
                      backgroundColor: 'var(--v3-surface)',
                    }}
                    title="Switch language"
                  >
                    <Globe className="w-3.5 h-3.5" style={{ color: 'var(--v3-muted)' }} />
                    <span className="font-mono">{language === 'en' ? 'EN / اردو' : 'اردو / EN'}</span>
                  </button>
                </div>
              </div>

              {/* Injected Form Content */}
              <div className="flex-1 flex flex-col justify-center">
                {children}
              </div>

              {/* Bottom Institutional Disclaimer */}
              <div
                className="pt-6 mt-6 border-t text-center text-xs"
                style={{ borderColor: 'var(--v3-edge)', color: 'var(--v3-muted)' }}
              >
                <p>© 2026 Awaaz-e-Awam • Government of Sindh Civic Portal</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
