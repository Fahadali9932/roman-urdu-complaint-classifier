import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowUpRight, ArrowUpLeft, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  const workflowStages = [
    {
      num: '[01]',
      title: language === 'ur' ? 'تحریر' : 'WRITE',
      desc: language === 'ur'
        ? 'اپنا بلدیاتی مسئلہ قدرتی انداز میں روزمرہ کی رومن اردو میں بیان کریں۔'
        : 'Describe public grievances naturally in everyday Roman Urdu without bureaucratic vocabulary.',
    },
    {
      num: '[02]',
      title: language === 'ur' ? 'ترسیل' : 'ROUTE',
      desc: language === 'ur'
        ? 'سیمنٹک اے آئی تجزیہ خودکار طور پر متعلقہ بلدیاتی محکمے کا تعین کرتا ہے۔'
        : 'Semantic natural language processing identifies and routes to KW&SC, SSWMB, K-Electric, or KMC.',
    },
    {
      num: '[03]',
      title: language === 'ur' ? 'پیش رفت' : 'TRACK',
      desc: language === 'ur'
        ? 'ہر شکایت کا الگ ریکارڈ جس کے ذریعے کام کی رفتار دیکھی جا سکتی ہے۔'
        : 'Follow verified on-ground milestones presented as an individual case file in your account.',
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
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#5B5B5B] uppercase">
                  {language === 'ur' ? '۰۱ / سندھ شہری پلیٹ فارم' : '01 / SINDH CIVIC PLATFORM'}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                <span className="text-[11px] font-mono text-[#5B5B5B] uppercase">
                  Karachi Division
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
                  ? 'رومن اردو میں بلدیاتی شکایات درج کرنے اور ان کی پیش رفت دیکھنے کا آسان اور شفاف طریقہ۔'
                  : 'Write public-service complaints in Roman Urdu and keep track of their progress across municipal authorities.'}
              </p>

              {/* Architectural Trust Signifiers */}
              <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-mono text-[#5B5B5B] border-t border-[#D5D5D3]">
                <span className="flex items-center gap-1.5 text-[#111111] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'ur' ? 'مفت بلدیاتی سروس' : 'Free Civic Service'}</span>
                </span>
                <span className="text-[#D5D5D3] hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{language === 'ur' ? 'رازداری کا تحفظ' : 'Privacy Protected'}</span>
                </span>
                <span className="text-[#D5D5D3] hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'ur' ? 'تعلیمی ڈیمو موڈ' : 'Academic Prototype'}</span>
                </span>
              </div>
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

            <span className="mt-4 text-[11px] font-mono text-[#5B5B5B] uppercase tracking-wider block">
              {language === 'ur' ? 'رومن اردو معاونت' : 'Roman Urdu Native Support'}
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
              <div className="font-mono text-xs font-bold text-[#888888] mb-3">
                {stage.num}
              </div>
              <h2 className="font-display font-black text-xl text-[#111111] uppercase tracking-tight mb-2">
                {stage.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#5B5B5B] leading-relaxed">
                {stage.desc}
              </p>
            </div>
          ))}
        </section>

        {/* 3. CASE FILE ARCHITECTURE PREVIEW (Honest Architecture Concept - Zero Dummy Records) */}
        <section className="p-6 sm:p-10 lg:p-14 text-start">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D5D5D3]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B5B5B] block">
                {language === 'ur' ? 'کیس فائل سسٹم' : 'CASE FILE ARCHITECTURE'}
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#111111] uppercase tracking-tight mt-1">
                {language === 'ur' ? 'شکایات کا باقاعدہ ریکارڈ' : 'Modular Case File Registry'}
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] hover:underline"
            >
              <span>{t('navMyComplaints') || 'My Complaints'}</span>
              {isRTL ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            </Link>
          </div>

          {/* Architectural Explanation Grid */}
          <div className="p-6 sm:p-8 rounded-lg bg-[#FAFAF9] border border-[#D5D5D3] space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#EAEAE8] text-[11px] font-mono font-bold uppercase text-[#111111]">
              <span>System Design Specification</span>
            </div>
            <p className="text-sm text-[#5B5B5B] max-w-3xl leading-relaxed">
              {language === 'ur'
                ? 'جب شہری شکایت درج کرے گا، ہر شکایت تصدیق کے بعد ایک انفرادی کیس فائل فولڈر کے طور پر محفوظ ہوگی۔ کوئی مصنوعی ڈیٹا یا نمونہ ریکارڈ شامل نہیں کیا گیا ہے۔'
                : 'When an authenticated citizen submits a complaint to the backend, each complaint appears as a distinct folder-shaped case file under My Complaints. The system maintains strict ownership separation and Row-Level Security.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#5B5B5B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#111111]" />
                <span>1 Saved Complaint = 1 Case File</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#111111]" />
                <span>Zero Fabricated Tracking Codes</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#111111]" />
                <span>Direct Case File Expansion</span>
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
