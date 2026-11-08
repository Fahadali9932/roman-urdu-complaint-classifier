import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ComplaintForm } from '../citizen/ComplaintForm';
import { Button } from '../../components/common/Button';
import {
  PenTool,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ShieldCheck,
  FolderOpen,
  FileText,
  User,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const [authViewMode, setAuthViewMode] = useState<'unauthenticated' | 'authenticated_empty'>('unauthenticated');

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const workflowSteps = [
    {
      step: '01',
      title: language === 'ur' ? 'لکھیں' : 'Write',
      subtitle: language === 'ur' ? 'اپنے روزمرہ کے الفاظ' : 'In your own words',
      desc: language === 'ur'
        ? 'اپنے علاقے کے عوامی مسئلے کے بارے میں رومن اردو، اردو یا انگریزی میں لکھیں۔ قریبی نشان اور تفصیل واضح کریں۔'
        : 'Describe the public issue in Roman Urdu, Urdu, or English. Detail streets, landmarks, and utility failures.',
      icon: <PenTool className="w-5 h-5 text-[#F1F2F3]" />,
    },
    {
      step: '02',
      title: language === 'ur' ? 'جائزہ لیں' : 'Review',
      subtitle: language === 'ur' ? 'درستگی کی جانچ' : 'Verify before dispatch',
      desc: language === 'ur'
        ? 'ارسال کرنے سے پہلے عنوان، جگہ اور ۲۰۰ الفاظ کی حد کو چیک کریں تاکہ معلومات مکمل ہوں۔'
        : 'Inspect your submission draft, word count, and public landmark descriptors before confirming application details.',
      icon: <FileText className="w-5 h-5 text-[#F1F2F3]" />,
    },
    {
      step: '03',
      title: language === 'ur' ? 'درجہ بندی' : 'Route',
      subtitle: language === 'ur' ? 'خودکار شعبہ جاتی تفویض' : 'Departmental routing',
      desc: language === 'ur'
        ? 'رومن اردو این ایل پی ماڈل شکایت کا تجزیہ کر کے متعلقہ محکمے (واٹر بورڈ، کے الیکٹرک، سالڈ ویسٹ) کو نشان زد کرتا ہے۔'
        : 'Natural language classification processes Roman Urdu text to route issues to KWSB, K-Electric, SSGC, or Waste Management.',
      icon: <Compass className="w-5 h-5 text-[#F1F2F3]" />,
    },
    {
      step: '04',
      title: language === 'ur' ? 'ٹریک کریں' : 'Track',
      subtitle: language === 'ur' ? 'شفاف پیش رفت' : 'Real status updates',
      desc: language === 'ur'
        ? 'اپنے ریفرنس کوڈ کے ذریعے جانیں کہ فیلڈ افسران نے کیا پیش رفت کی ہے اور مسئلہ کب حل ہوگا۔'
        : 'Follow verified on-ground resolution updates using your official tracking reference as municipal teams take action.',
      icon: <Clock className="w-5 h-5 text-[#F1F2F3]" />,
    },
  ];

  return (
    <div className="w-full bg-[#0B1421] text-[#F1F2F3]">
      
      {/* ========================================================
          1. FULL-SCREEN HERO SECTION (#hero)
          ======================================================== */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col justify-center px-6 sm:px-12 lg:px-20 pt-28 pb-20 overflow-hidden border-b border-[#34394A]"
      >
        {/* Subtle Atmospheric Lighting Radial Gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#283041]/40 via-[#172131]/20 to-transparent blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-6xl mx-auto w-full relative z-10 text-start">
          
          {/* Metadata Coordinates & Civic Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mb-6 sm:mb-8 text-xs font-mono text-[#B5B9BC]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#283041]/80 border border-[#34394A] text-[#F1F2F3] font-bold text-[11px] tracking-wider uppercase">
              <MapPin className="w-3.5 h-3.5 text-[#B5B9BC]" />
              24.8607° N, 67.0011° E • Karachi
            </span>
            <span className="hidden sm:inline-block text-[#34394A]">•</span>
            <span className="text-[#B5B9BC] tracking-wider uppercase text-[11px]">
              {language === 'ur' ? 'سندھ عوامی شکایات پورٹل' : 'Sindh Citizen Grievance Portal'}
            </span>
          </div>

          {/* Ultra-Heavy Display Headline */}
          <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] xl:text-[8.5rem] text-[#F1F2F3] uppercase leading-[0.92] tracking-tighter select-none">
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

          {/* Subtitle & Mission Statement */}
          <p className="mt-8 text-base sm:text-xl lg:text-2xl text-[#B5B9BC] max-w-3xl leading-relaxed font-normal">
            {language === 'ur'
              ? 'اپنے علاقے کے عوامی مسئلے کے بارے میں صاف اور سادہ شکایت لکھیں۔ رومن اردو، اردو اور انگریزی کے لیے مخصوص باوقار ڈیجیٹل پلیٹ فارم۔'
              : 'Report a public-service issue in your own words. A dark cinematic civic platform engineered for Sindh citizens writing in Roman Urdu, Urdu, or English.'}
          </p>

          {/* Dual Action Controls */}
          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              type="button"
              onClick={() => scrollTo('write-complaint')}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#F1F2F3] hover:bg-white text-[#0B1421] font-bold text-sm tracking-wider uppercase transition-all shadow-xl hover:shadow-2xl cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>{language === 'ur' ? 'شکایت لکھیں' : 'Write Complaint'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => scrollTo('my-complaints')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#283041]/80 hover:bg-[#283041] border border-[#34394A] text-[#F1F2F3] font-semibold text-sm tracking-wide transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-[#B5B9BC]" />
              <span>{language === 'ur' ? 'میری شکایات' : 'My Complaints'}</span>
            </button>

            <button
              type="button"
              onClick={() => scrollTo('steps')}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-4 text-xs font-mono text-[#B5B9BC] hover:text-[#F1F2F3] transition-colors"
            >
              <span>{language === 'ur' ? 'طریقہ کار دیکھیں' : 'Explore Journey'}</span>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          </div>

          {/* Trust Attributes Row */}
          <div className="mt-14 sm:mt-18 pt-8 border-t border-[#34394A]/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-[#B5B9BC]">
            <div>
              <span className="block text-[#F1F2F3] font-bold">100% Honest Data</span>
              <span>Zero fabricated records</span>
            </div>
            <div>
              <span className="block text-[#F1F2F3] font-bold">Roman Urdu Native</span>
              <span>Everyday phonetic text</span>
            </div>
            <div>
              <span className="block text-[#F1F2F3] font-bold">Municipal Routing</span>
              <span>Karachi districts covered</span>
            </div>
            <div>
              <span className="block text-[#F1F2F3] font-bold">Greenwich University</span>
              <span>Academic Capstone 2026</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          2. COMPLAINT JOURNEY / STEPS SECTION (#steps)
          ======================================================== */}
      <section
        id="steps"
        className="py-20 sm:py-28 px-6 sm:px-12 lg:px-20 border-b border-[#34394A] relative bg-[#0B1421]/95"
      >
        <div className="max-w-6xl mx-auto text-start">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14 pb-6 border-b border-[#34394A]">
            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#B5B9BC] block">
                01 TO 04 • WORKFLOW
              </span>
              <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F1F2F3] uppercase tracking-tight">
                {language === 'ur' ? 'طریقہ کار' : 'The Citizen Journey'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#B5B9BC] max-w-md leading-relaxed">
              {language === 'ur'
                ? 'اپنے روزمرہ کے الفاظ سے لے کر محکماتی حل تک ایک شفاف چار مرحلہ وار نظام۔'
                : 'A transparent path from your everyday words to verified municipal attention.'}
            </p>
          </div>

          {/* Staggered 4-Column Grid with 2.5D Elevation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => (
              <div
                key={step.step}
                className="group p-6 sm:p-8 rounded-2xl bg-[#172131]/80 backdrop-blur-md border border-[#34394A] hover:border-[#B5B9BC]/50 transition-all duration-300 flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-sm font-bold text-[#B5B9BC] group-hover:text-[#F1F2F3] transition-colors">
                      [{step.step}]
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#283041] border border-[#34394A] flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>

                  <h3 className="font-display font-black text-2xl text-[#F1F2F3] tracking-tight mb-1">
                    {step.title}
                  </h3>
                  <div className="text-xs font-mono text-[#B5B9BC]/80 mb-3">
                    {step.subtitle}
                  </div>
                  <p className="text-xs sm:text-sm text-[#B5B9BC] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#34394A]/60 text-[11px] font-mono text-[#B5B9BC]/60 flex items-center justify-between">
                  <span>Phase 1B Certified</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================
          3. MY COMPLAINTS SECTION (#my-complaints)
          ======================================================== */}
      <section
        id="my-complaints"
        className="py-20 sm:py-28 px-6 sm:px-12 lg:px-20 border-b border-[#34394A] relative bg-[#0D1826]"
      >
        <div className="max-w-6xl mx-auto text-start">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 pb-6 border-b border-[#34394A]">
            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#B5B9BC] block">
                CIVIC CASE REGISTRY
              </span>
              <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F1F2F3] uppercase tracking-tight">
                {language === 'ur' ? 'آپ کی شکایات' : 'My Complaints'}
              </h2>
            </div>
            
            {/* View Mode Switcher */}
            <div className="flex items-center gap-2 p-1 rounded-full bg-[#172131] border border-[#34394A] text-xs">
              <button
                type="button"
                onClick={() => setAuthViewMode('unauthenticated')}
                className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  authViewMode === 'unauthenticated'
                    ? 'bg-[#283041] text-[#F1F2F3] font-semibold'
                    : 'text-[#B5B9BC] hover:text-[#F1F2F3]'
                }`}
              >
                Sign In View
              </button>
              <button
                type="button"
                onClick={() => setAuthViewMode('authenticated_empty')}
                className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  authViewMode === 'authenticated_empty'
                    ? 'bg-[#283041] text-[#F1F2F3] font-semibold'
                    : 'text-[#B5B9BC] hover:text-[#F1F2F3]'
                }`}
              >
                Empty Case View
              </button>
            </div>
          </div>

          {/* Real Digital Letter Experience Container */}
          <div className="max-w-4xl mx-auto">
            {authViewMode === 'unauthenticated' ? (
              /* Unauthenticated State */
              <div className="p-8 sm:p-14 rounded-2xl bg-[#172131]/90 backdrop-blur-md border border-[#34394A] text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-[#283041] border border-[#34394A] flex items-center justify-center mx-auto text-[#F1F2F3]">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-2xl sm:text-3xl text-[#F1F2F3] uppercase tracking-tight">
                    {language === 'ur' ? 'شکایات دیکھنے کے لیے سائن ان کریں' : 'Sign in to view your complaints'}
                  </h3>
                  <p className="text-sm text-[#B5B9BC] max-w-md mx-auto leading-relaxed">
                    {language === 'ur'
                      ? 'آپ کی شکایات کو محفوظ رکھنے اور ان کی پیش رفت جاننے کے لیے اپنے شہری اکاؤنٹ میں سائن ان کریں۔'
                      : 'Connect your citizen identity to inspect your official grievance letters, tracking history, and departmental resolutions.'}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/login">
                    <Button variant="primary" size="md" leftIcon={<User className="w-4 h-4" />}>
                      {language === 'ur' ? 'سائن ان کریں' : 'Sign in to Account'}
                    </Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAuthViewMode('authenticated_empty')}
                    className="text-xs font-mono text-[#B5B9BC] hover:text-[#F1F2F3] underline underline-offset-4 cursor-pointer"
                  >
                    View empty case files preview
                  </button>
                </div>
              </div>
            ) : (
              /* Authenticated Empty State */
              <div className="p-8 sm:p-14 rounded-2xl bg-[#172131]/90 backdrop-blur-md border border-[#34394A] text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-[#283041] border border-[#34394A] flex items-center justify-center mx-auto text-[#F1F2F3]">
                  <FolderOpen className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-2xl sm:text-3xl text-[#F1F2F3] uppercase tracking-tight">
                    {language === 'ur' ? 'ابھی کوئی شکایت نہیں۔' : 'No complaints yet.'}
                  </h3>
                  <p className="text-sm text-[#B5B9BC] max-w-lg mx-auto leading-relaxed">
                    {language === 'ur'
                      ? 'یہ پیش منظر ابھی شکایات نہیں بھیجتا یا محفوظ کرتا، اس لیے یہاں کوئی کیس فائل موجود نہیں ہے۔'
                      : 'This preview does not send or save complaints yet, so there are no case files to show.'}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollTo('write-complaint')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F1F2F3] text-[#0B1421] font-bold text-xs uppercase tracking-wider hover:bg-white transition-colors cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{language === 'ur' ? 'شکایت لکھیں' : 'Write First Complaint'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Verification Guarantee Footer */}
            <div className="mt-6 p-4 rounded-xl bg-[#283041]/50 border border-[#34394A] flex items-center justify-between text-xs font-mono text-[#B5B9BC]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4ade80]" />
                <span>Zero fabricated tracking codes or fake database items</span>
              </div>
              <span className="hidden sm:inline-block">Phase 2 Cloud Sync Ready</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          4. WRITE COMPLAINT SECTION (#write-complaint)
          ======================================================== */}
      <section
        id="write-complaint"
        className="py-20 sm:py-28 px-6 sm:px-12 lg:px-20 border-b border-[#34394A] relative bg-[#0B1421]"
      >
        <div className="max-w-6xl mx-auto text-start">
          
          <div className="mb-10 pb-6 border-b border-[#34394A] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#B5B9BC] block">
                OFFICIAL APPLICATION WORKSPACE
              </span>
              <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F1F2F3] uppercase tracking-tight">
                {language === 'ur' ? 'شکایت درج کریں' : 'Write a Complaint'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#B5B9BC] max-w-md leading-relaxed">
              {language === 'ur'
                ? 'اپنے مسئلے کو مکمل تفصیل اور درست مقام کے ساتھ لکھیں تاکہ فوری کارروائی ہو سکے۔'
                : 'Articulate a civic grievance clearly in Roman Urdu, Urdu, or English. Maximum 200 words.'}
            </p>
          </div>

          {/* Embedded Complaint Application */}
          <ComplaintForm embedded={true} />

        </div>
      </section>

    </div>
  );
};