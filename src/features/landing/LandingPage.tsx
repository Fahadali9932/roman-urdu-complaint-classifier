import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { PenTool, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { ComplaintJourney } from './ComplaintJourney';
import { FountainPenNib } from '../../components/common/FountainPenNib';
import { PublicFooter } from '../../components/layout/PublicFooter';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  return (
    <div className="w-full bg-[#F7F6F3] text-[#141414] overflow-visible selection:bg-[#681822] selection:text-[#FFFFFF]">

      {/* ========================================================
          PANEL 1: MONOCHROME CIVIC EDITORIAL HERO (#hero)
          Sticky Layer 1 (z-10): Stays pinned at top while Panel 2
          physically rises up and covers it with depth shadow
          ======================================================== */}
      <section
        id="hero"
        className="sticky top-0 z-10 h-screen w-full flex flex-col items-center justify-center px-4 sm:px-8 lg:px-16 pt-20 sm:pt-24 pb-20 sm:pb-24 bg-[#F7F6F3] text-center select-none overflow-hidden motion-reduce:static"
      >
        {/* Soft atmospheric paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.8)_0%,rgba(247,246,243,0)_70%)]"
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">

          {/* Civic Microtags (SERVICE / RESPONSIBILITY / ACCOUNTABILITY) */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-[11px] sm:text-[12px] font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase text-[#323232] select-none">
            <span>{t('heroCivicMicrotags') || (ur ? 'خدمت / ذمہ داری / احتساب' : 'SERVICE / RESPONSIBILITY / ACCOUNTABILITY')}</span>
          </div>

          {/* Monumental Headline Intersected by Fountain Pen Nib */}
          <div className="relative inline-block w-full max-w-5xl my-2 sm:my-4">

            {/* Monumental Display Headline */}
            <h1 className="font-display text-[3.25rem] sm:text-6xl md:text-7xl lg:text-[9rem] xl:text-[10.5rem] text-[#141414] uppercase leading-[0.88] tracking-tight relative z-10">
              {ur ? (
                <>
                  <span className="block text-2xl sm:text-4xl md:text-5xl text-[#323232] font-medium tracking-normal mb-1">
                    آپ کی شکایت۔
                  </span>
                  <span>آپ کی آواز۔</span>
                </>
              ) : (
                <>
                  <span className="block text-xl sm:text-3xl md:text-4xl text-[#323232] font-semibold tracking-wider mb-1 sm:mb-2">
                    YOUR COMPLAINT.
                  </span>
                  <span>YOUR VOICE.</span>
                </>
              )}
            </h1>

            {/* Fountain Pen Nib Angled across central typography */}
            <div
              className="absolute -top-10 sm:-top-16 lg:-top-24 right-4 sm:right-12 lg:right-24 w-28 sm:w-40 lg:w-56 h-auto pointer-events-none z-20 transform -rotate-[26deg] sm:-rotate-[28deg] transition-transform duration-700 ease-out hover:scale-105"
              aria-hidden="true"
            >
              <FountainPenNib className="w-full h-auto drop-shadow-[0_25px_35px_rgba(20,20,20,0.3)]" />
            </div>

          </div>

          {/* Minimal Human-Centered Subtitle in Graphite #323232 */}
          <p className="mt-4 sm:mt-6 text-base sm:text-xl md:text-2xl text-[#323232] max-w-2xl mx-auto leading-relaxed font-ui font-normal">
            {ur
              ? 'اپنے روزمرہ کے الفاظ میں عوامی مسئلے کی اطلاع دیں۔'
              : 'Report a public-service issue in your own words.'}
          </p>

          {/* Primary and Secondary Action Triggers */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* Primary Action: Blood Maroon Button #681822 */}
            <Link
              to="/submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-[#681822] hover:bg-[#52121b] text-[#FFFFFF] font-ui font-medium text-[15px] tracking-[0.015em] transition-all shadow-lg shadow-[#681822]/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-[#FFFFFF]" />
              <span>{ur ? 'شکایت لکھیں' : 'Write Complaint'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>

            {/* Secondary Action: Minimal Paper Pill */}
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#FAF9F7] hover:bg-[#E5E3E0]/60 border border-[#E5E3E0] text-[#141414] font-ui font-normal text-[15px] tracking-[0.015em] transition-all active:scale-[0.98] cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#323232]" />
              <span>{ur ? 'میری شکایات' : 'My Complaints'}</span>
            </Link>
          </div>

        </div>

        {/* Minimal Scroll Indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#323232]/70 pointer-events-none">
          <span className="text-[10px] font-mono tracking-widest uppercase text-[#323232]">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-[#323232] to-transparent" />
        </div>
      </section>

      {/* ========================================================
          PANEL 2: HOW IT WORKS (#steps)
          Sticky Layer 2 (z-20): Physically rises over Hero with
          deep shadow and contains the full-screen journey
          ======================================================== */}
      <div className="relative z-20 w-full min-h-screen bg-[#F7F6F3] shadow-[0_-35px_70px_rgba(20,20,20,0.25)] border-t border-[#E5E3E0] motion-reduce:shadow-none">
        <ComplaintJourney id="steps" />
      </div>

      {/* ========================================================
          PANEL 3: EDITORIAL GRAPHIC TRANSITION (#write-intro)
          Layer 3 (z-30): Monumental cropped letterform "WRITE"
          with confident negative space and restrained typography,
          rises over Panel 2 with deep shadow
          ======================================================== */}
      <div className="relative z-30 w-full min-h-[180vh] lg:min-h-[200vh] bg-[#FAF9F7] shadow-[0_-35px_70px_rgba(20,20,20,0.28)] border-t border-[#E5E3E0] motion-reduce:min-h-0 motion-reduce:shadow-none">
        <section
          id="write-intro"
          className="sticky top-0 z-30 h-screen w-full flex flex-col justify-center px-6 sm:px-12 lg:px-20 overflow-hidden select-none motion-reduce:static motion-reduce:h-auto motion-reduce:py-24"
          aria-label="Editorial Write Introduction"
        >
          <div className="max-w-7xl mx-auto w-full relative">

            {/* Monumental Cropped Typography
                Huge cropped word creating editorial graphic architecture */}
            <div
              className="font-display text-[7.5rem] sm:text-[14rem] md:text-[18rem] lg:text-[23rem] text-[#141414] leading-none select-none tracking-tighter opacity-[0.06] sm:opacity-[0.08] absolute -top-16 sm:-top-32 -left-6 sm:-left-12 pointer-events-none uppercase overflow-hidden"
              aria-hidden="true"
            >
              {ur ? 'تحریر' : 'WRITE'}
            </div>

            {/* Active Editorial Content nested in the negative space */}
            <div className="relative z-10 max-w-2xl sm:ml-auto">

              {/* Fine Blood Maroon Accent Rule */}
              <div className="w-16 h-1 bg-[#681822] mb-6" />

              <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl text-[#141414] uppercase leading-[0.98] tracking-tight mb-4">
                {t('writeSectionTitle')}
              </h2>

              <p className="font-ui text-base sm:text-xl text-[#323232] leading-relaxed max-w-xl font-normal">
                {t('writeSectionSubtitle')}
              </p>

            </div>

          </div>
        </section>
      </div>

      {/* ========================================================
          PANEL 4: FULL-SCREEN FOOTER (#footer)
          Layer 4 (z-40): Monumental closing statement that rises
          over WRITE intro with deep physical shadow
          ======================================================== */}
      <div className="relative z-40 w-full bg-[#141414] shadow-[0_-40px_80px_rgba(0,0,0,0.45)] border-t border-[#323232] motion-reduce:shadow-none">
        <PublicFooter isHomePage={true} />
      </div>

    </div>
  );
};

export default LandingPage;
