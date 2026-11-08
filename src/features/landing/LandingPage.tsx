import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { PenTool, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { language, isRTL } = useLanguage();

  return (
    <div className="w-full bg-[#0B1421] text-[#F1F2F3]">
      
      {/* ========================================================
          FULL-SCREEN LANDING HERO (#hero)
          ======================================================== */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-12 lg:px-20 pt-28 sm:pt-32 pb-20 sm:pb-24 overflow-hidden cinematic-hero-atmosphere text-center select-none"
      >
        {/* Architectural atmospheric light veil behind display headline */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[95vw] h-[520px] pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(40, 48, 65, 0.75) 0%, rgba(52, 57, 74, 0.35) 45%, transparent 75%)',
            filter: 'blur(75px)',
          }}
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col items-center">
          
          {/* Main Display Headline: Confident, uncompressed editorial weight */}
          <h1 className="font-display text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[7rem] xl:text-[8rem] text-[#F1F2F3] uppercase leading-[0.98] tracking-tight">
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

          {/* Minimal Human-Centered Subtitle */}
          <p className="mt-6 sm:mt-8 text-base sm:text-xl md:text-2xl text-[#B5B9BC] max-w-2xl mx-auto leading-relaxed font-normal">
            {language === 'ur'
              ? 'اپنے روزمرہ کے الفاظ میں عوامی مسئلے کی اطلاع دیں۔'
              : 'Report a public-service issue in your own words.'}
          </p>

          {/* Primary and Secondary Action Triggers */}
          <div className="mt-9 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            <Link
              to="/submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-[#F1F2F3] hover:bg-white text-[#0B1421] font-bold text-sm sm:text-base tracking-wide transition-all shadow-xl shadow-[#0B1421]/50 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>{language === 'ur' ? 'شکایت لکھیں' : 'Write Complaint'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#283041]/90 hover:bg-[#34394A] border border-[#34394A] hover:border-[#B5B9BC]/50 text-[#F1F2F3] font-semibold text-sm sm:text-base tracking-wide transition-all active:scale-[0.98] cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#B5B9BC]" />
              <span>{language === 'ur' ? 'میری شکایات' : 'My Complaints'}</span>
            </Link>
          </div>

        </div>

        {/* Scroll transition indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#B5B9BC]/50 pointer-events-none">
          <span className="text-[10px] font-mono tracking-widest uppercase">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-[#B5B9BC]/50 to-transparent" />
        </div>
      </section>

      {/* ========================================================
          MINIMAL SCROLL CONTINUATION (#steps)
          Demonstrates the scroll transition and scrolled navbar state
          ======================================================== */}
      <section
        id="steps"
        className="py-24 sm:py-32 px-6 sm:px-12 lg:px-20 border-t border-[#34394A]/70 relative bg-gradient-to-b from-[#0B1421] via-[#101B2B] to-[#0B1421]"
      >
        <div className="max-w-5xl mx-auto text-start">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16 pb-6 border-b border-[#34394A]">
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-widest uppercase text-[#B5B9BC]">
                01 TO 04 • WORKFLOW
              </span>
              <h2 className="font-display text-3xl sm:text-5xl text-[#F1F2F3] uppercase tracking-tight">
                {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
              </h2>
            </div>
            <p className="text-sm text-[#B5B9BC] max-w-md leading-relaxed">
              {language === 'ur'
                ? 'اپنے روزمرہ کے الفاظ سے لے کر محکماتی حل تک ایک شفاف نظام۔'
                : 'A transparent path from your everyday words to verified municipal attention.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01',
                title: language === 'ur' ? 'لکھیں' : 'Write',
                desc: language === 'ur'
                  ? 'رومن اردو، اردو یا انگریزی میں اپنا مسئلہ بیان کریں۔'
                  : 'Describe the civic problem in Roman Urdu, Urdu, or English.',
              },
              {
                num: '02',
                title: language === 'ur' ? 'جائزہ لیں' : 'Review',
                desc: language === 'ur'
                  ? 'عنوان، جگہ اور تفصیل دوبارہ چیک کریں۔'
                  : 'Verify your description, landmark, and details before submitting.',
              },
              {
                num: '03',
                title: language === 'ur' ? 'درجہ بندی' : 'Route',
                desc: language === 'ur'
                  ? 'این ایل پی ماڈل خودکار طور پر متعلقہ محکمے کو تفویض کرتا ہے۔'
                  : 'Automated natural language routing to the concerned civic agency.',
              },
              {
                num: '04',
                title: language === 'ur' ? 'ٹریک کریں' : 'Track',
                desc: language === 'ur'
                  ? 'اپنے ریفرنس کوڈ سے براہ راست پیش رفت دیکھیں۔'
                  : 'Follow resolution progress with your personal tracking reference.',
              },
            ].map((item) => (
              <div
                key={item.num}
                className="p-6 rounded-2xl bg-[#172131]/80 border border-[#34394A] flex flex-col justify-between space-y-4 shadow-lg hover:border-[#B5B9BC]/40 transition-colors"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[#B5B9BC]">
                    [{item.num}]
                  </span>
                  <h3 className="font-display text-2xl text-[#F1F2F3] tracking-tight mt-2 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#B5B9BC] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};
