import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowUpRight, ArrowUpLeft } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  const workflowStages = [
    {
      num: '[01]',
      title: language === 'ur' ? 'لکھیں' : 'Write',
      desc: language === 'ur'
        ? 'اپنا مسئلہ سادہ الفاظ میں بیان کریں۔'
        : 'Describe the issue in your own words.',
    },
    {
      num: '[02]',
      title: language === 'ur' ? 'جائزہ لیں' : 'Review',
      desc: language === 'ur'
        ? 'عنوان، مقام اور تفصیل دوبارہ دیکھیں۔'
        : 'Check the title, location, and description.',
    },
    {
      num: '[03]',
      title: language === 'ur' ? 'کیس فائلز' : 'Case files',
      desc: language === 'ur'
        ? 'حقیقی طور پر محفوظ شکایات یہاں الگ کیس فائلز بنیں گی۔'
        : 'Saved complaints will appear here as individual case files.',
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-[1280px] mx-auto border-x border-[#D5D5D3] bg-[#F1F1F0]">
        
        {/* 1. HERO ASYMMETRIC SWISS GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#D5D5D3] text-start">
          
          {/* Main Headline Column (8 cols on desktop) */}
          <div className="lg:col-span-8 p-6 sm:p-10 lg:p-16 border-b lg:border-b-0 lg:border-e border-[#D5D5D3] flex flex-col justify-between space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="text-[11px] font-mono font-semibold tracking-wide text-[#5B5B5B]">
                  {language === 'ur' ? 'سندھ کے شہریوں کے لیے' : 'For Sindh citizens'}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                <span className="text-[11px] font-mono text-[#5B5B5B]">
                  {language === 'ur' ? 'رومن اردو، اردو یا انگریزی' : 'Roman Urdu, Urdu, or English'}
                </span>
              </div>

              {/* Oversized, Ultra-Heavy Headline */}
              <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.2rem] text-[#111111] leading-[0.92] tracking-tighter uppercase select-none">
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
            </div>

            {/* Supporting Description & Trust Metadata */}
            <div className="space-y-6 max-w-xl">
              <p className="text-base sm:text-xl text-[#5B5B5B] leading-relaxed font-normal">
                {language === 'ur'
                  ? 'اپنے علاقے کے عوامی مسئلے کے بارے میں صاف اور سادہ شکایت لکھیں۔'
                  : 'Write clearly about a public issue in your area, in the language you use every day.'}
              </p>
            </div>
          </div>

          {/* Focal Circular Action Column (4 cols on desktop) */}
          <div className="lg:col-span-4 p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center bg-[#EAEAE8] text-center min-h-[300px] lg:min-h-auto">
            <Link
              to="/submit"
              className="swiss-circle-btn w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 p-6 group focus-visible:outline-4 focus-visible:outline-[#111111]"
              aria-label="Write a Complaint"
            >
              {isRTL ? (
                <ArrowUpLeft className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1" />
              ) : (
                <ArrowUpRight className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
              )}
              <span className="font-display font-black text-sm sm:text-base lg:text-lg tracking-wider uppercase leading-tight">
                {language === 'ur' ? 'شکایت لکھیں' : <>WRITE<br />COMPLAINT</>}
              </span>
            </Link>

            <span className="mt-4 text-[11px] font-mono text-[#5B5B5B] tracking-wide block">
              {language === 'ur' ? 'اپنا مسئلہ اپنے الفاظ میں لکھیں' : 'Write it in your own words'}
            </span>
          </div>
        </section>

        {/* 2. RESTRAINED EDITORIAL WORKFLOW GRID (Write → Route → Track) */}
        <section className="grid grid-cols-1 md:grid-cols-3 border-b border-[#D5D5D3] text-start">
          {workflowStages.map((stage, idx) => (
            <div
              key={stage.num}
              className={`p-6 sm:p-8 lg:p-10 ${
                idx < workflowStages.length - 1 ? 'border-b md:border-b-0 md:border-e border-[#D5D5D3]' : ''
              }`}
            >
              <div className="font-mono text-xs font-semibold text-[#888888] mb-3">
                {stage.num}
              </div>
              <h2 className="font-display font-black text-xl text-[#111111] tracking-tight mb-2">
                {stage.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#5B5B5B] leading-relaxed">
                {stage.desc}
              </p>
            </div>
          ))}
        </section>

        {/* 3. CASE FILE PREVIEW */}
        <section className="p-6 sm:p-10 lg:p-14 text-start">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D5D5D3]">
            <div>
              <span className="text-[10px] font-mono font-semibold tracking-wide text-[#5B5B5B] block">
                {language === 'ur' ? 'آپ کی شکایات' : 'Your complaints'}
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#111111] tracking-tight mt-1">
                {language === 'ur' ? 'ہر شکایت، ایک کیس فائل' : 'One complaint, one case file'}
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#111111] hover:underline"
            >
              <span>{t('navMyComplaints') || 'My Complaints'}</span>
              {isRTL ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            </Link>
          </div>

          <div className="p-6 sm:p-8 rounded-lg bg-[#FAFAF9] border border-[#D5D5D3] space-y-4">
            <p className="text-sm text-[#5B5B5B] max-w-3xl leading-relaxed">
              {language === 'ur'
                ? 'جب شکایت محفوظ کرنے کی سہولت دستیاب ہوگی تو آپ کی ہر حقیقی شکایت یہاں اپنے فولڈر میں نظر آئے گی۔'
                : 'When complaint saving is available, each real complaint will appear here in its own folder.'}
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};
