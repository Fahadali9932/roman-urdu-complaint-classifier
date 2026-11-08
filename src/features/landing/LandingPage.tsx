import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { PenTool, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { ComplaintJourney } from './ComplaintJourney';

export const LandingPage: React.FC = () => {
  const { language, isRTL } = useLanguage();

  return (
    <div className="w-full bg-[#E9EBED] text-[#0B1421]">
      
      {/* ========================================================
          FULL-SCREEN LIGHT CINEMATIC HERO (#hero)
          ======================================================== */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-12 lg:px-20 pt-28 sm:pt-32 pb-20 sm:pb-24 overflow-hidden light-cinematic-atmosphere text-center select-none scroll-mt-28 sm:scroll-mt-32"
      >
        {/* Soft, diffuse central light field matching --hero-center-surface */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] max-w-[95vw] h-[540px] pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle, #DEE1E5 0%, rgba(222, 225, 229, 0.85) 50%, transparent 75%)',
            filter: 'blur(50px)',
          }}
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col items-center">
          
          {/* Main Display Headline: Deep Inkwell #0B1421 on light atmospheric ground */}
          <h1 className="font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[7rem] xl:text-[8rem] text-[#0B1421] uppercase leading-[0.98] tracking-tight">
            {language === 'ur' ? (
              <>
                آپ کی شکایت۔<br />
                آپ کی آواز۔
              </>
            ) : (
              <>
                YOUR COMPLAINT.<br />
                YOUR VOICE.
              </>
            )}
          </h1>

          {/* Minimal Human-Centered Subtitle in Ophelia #283041 */}
          <p className="mt-6 sm:mt-8 text-base sm:text-xl md:text-2xl text-[#283041] max-w-2xl mx-auto leading-relaxed font-ui font-normal">
            {language === 'ur'
              ? 'اپنے روزمرہ کے الفاظ میں عوامی مسئلے کی اطلاع دیں۔'
              : 'Report a public-service issue in your own words.'}
          </p>

          {/* Primary and Secondary Action Triggers with Thin Refined Typography */}
          <div className="mt-9 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            {/* Primary Action: High-contrast Inkwell button with thin Outfit typography */}
            <Link
              to="/submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-[#0B1421] hover:bg-[#283041] text-[#F1F2F3] font-ui font-normal text-[15px] tracking-[0.015em] transition-all shadow-lg shadow-[#0B1421]/15 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-[#F1F2F3]" />
              <span>{language === 'ur' ? 'شکایت لکھیں' : 'Write Complaint'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>

            {/* Secondary Action: Refined light surface matching hero center tone */}
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#DEE1E5]/75 hover:bg-[#DEE1E5] border border-[#34394A]/25 hover:border-[#0B1421]/60 text-[#0B1421] font-ui font-normal text-[15px] tracking-[0.015em] transition-all active:scale-[0.98] cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#34394A]" />
              <span>{language === 'ur' ? 'میری شکایات' : 'My Complaints'}</span>
            </Link>
          </div>

        </div>

        {/* Scroll transition indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#535965]/60 pointer-events-none">
          <span className="text-[10px] font-mono tracking-widest uppercase">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-[#535965]/60 to-transparent" />
        </div>
      </section>

      {/* ========================================================
          SCROLL-DRIVEN COMPLAINT JOURNEY (#steps)
          Replaces the 4 static cards with a continuous,
          evolving digital complaint document journey
          ======================================================== */}
      <ComplaintJourney id="steps" />

    </div>
  );
};
