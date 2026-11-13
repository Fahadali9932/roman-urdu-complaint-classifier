import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { SculpturalComposition } from './SculpturalComposition';
import { Globe, ArrowLeft, ArrowRight } from 'lucide-react';
import '../staff-auth.css';

interface StaffAuthLayoutProps {
  children: React.ReactNode;
  activeRole: 'admin' | 'department';
}

export const StaffAuthLayout: React.FC<StaffAuthLayoutProps> = ({
  children,
}) => {
  const { language, toggleLanguage, isRTL } = useLanguage();

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
          <section className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-8 lg:p-12 text-[#F8FAFC]">
            {/* Top Brand Monogram */}
            <div className="flex items-center gap-3.5">
              <Link
                to="/"
                className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl"
                title="Go to citizen portal"
              >
                <div className="w-[42px] h-[42px] rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-serif text-xl font-bold transition-transform group-hover:scale-105">
                  a.
                </div>
                <div>
                  <span className="block font-semibold text-base tracking-tight text-white">
                    {language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}
                  </span>
                  <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#94A3B8]">
                    ADMINISTRATOR &amp; DEPARTMENT PORTAL
                  </span>
                </div>
              </Link>
            </div>

            {/* Display Typography */}
            <div className="my-8 lg:my-10 space-y-4">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-normal leading-[1.12] tracking-tight text-[#FDFCFB]">
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
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-md font-sans">
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
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#94A3B8]/80">
              <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-[#64748B]">
                B / SCULPTURAL INTERFACE
              </span>
              <span className="text-[11px]">
                Visual direction study • Editable design example
              </span>
            </div>
          </section>

          {/* =========================================================================
              RIGHT COLUMN — ELEVATED SCULPTED PORCELAIN SURFACE (lg:col-span-6)
              Matches Figma Frame 35:1297 (696x952)
              ========================================================================= */}
          <section className="lg:col-span-6 flex flex-col justify-center">
            <div className="staff-porcelain-surface w-full max-w-[696px] mx-auto p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
              {/* Top Navigation & Language Switcher inside porcelain surface */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#E2E8F0]">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F1E21] transition-colors"
                >
                  {isRTL ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'ur' ? 'شہری پورٹل' : 'Citizen Portal'}</span>
                </Link>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0F1E21] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  title="Switch language"
                >
                  <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                  <span className="font-mono">{language === 'en' ? 'EN / اردو' : 'اردو / EN'}</span>
                </button>
              </div>

              {/* Injected Form Content */}
              <div className="flex-1 flex flex-col justify-center">
                {children}
              </div>

              {/* Bottom Institutional Disclaimer */}
              <div className="pt-6 mt-6 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
                <p>© 2026 Awaaz-e-Awam • Government of Sindh Civic Portal</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
