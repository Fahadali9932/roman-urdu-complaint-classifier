import React from 'react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { NotebookPage } from '../../components/common/NotebookPage';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language } = useLanguage();

  const processSteps = [
    {
      num: '01',
      title: t('step1Title') || 'Write',
      desc: t('step1Desc') || 'Describe your civic issue naturally in Roman Urdu.',
    },
    {
      num: '02',
      title: t('step2Title') || 'Classify',
      desc: t('step2Desc') || 'Semantic NLP identifies the responsible civic domain.',
    },
    {
      num: '03',
      title: t('step3Title') || 'Route',
      desc: t('step3Desc') || 'Grievance reaches KW&SC, SSWMB, K-Electric, or KMC.',
    },
    {
      num: '04',
      title: t('step4Title') || 'Track',
      desc: t('step4Desc') || 'Follow progress through authenticated status milestones.',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 py-8 sm:py-16 overflow-x-hidden">
      {/* 1. CENTRAL HERO COMPOSITION: SINGLE LARGE WHITE NOTEBOOK PAGE */}
      <section className="relative">
        <Container size="xl" className="max-w-[1000px]">
          <NotebookPage maxWidth="max-w-[880px]">
            <div className="space-y-6 text-start">
              {/* Category / Document Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5E4F0]/60 pb-3">
                <span className="text-[11px] font-bold tracking-widest text-[#5A6A7E] uppercase select-none">
                  {language === 'ur' ? 'شہری شکایات پورٹل' : 'CITIZEN COMPLAINT PORTAL'}
                </span>
                <span className="text-xs text-[#5A6A7E] font-mono select-none">
                  {language === 'ur' ? 'سندھ پبلک سروس ڈیسک' : 'Sindh Public Grievance Desk'}
                </span>
              </div>

              {/* Main Headline */}
              <div className="pt-2">
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#182224] tracking-tight leading-[1.25]">
                  {language === 'ur' ? (
                    t('heroTitle')
                  ) : (
                    <>
                      Your voice matters. <br />
                      <span className="text-[#18191B]">Make it heard.</span>
                    </>
                  )}
                </h1>
              </div>

              {/* Description Paragraph */}
              <p className="text-base sm:text-lg text-[#4A5568] leading-[32px] max-w-2xl">
                {t('heroSubtitle') ||
                  'Write a public-service complaint in Roman Urdu and follow its progress in one place.'}
              </p>

              {/* Roman Urdu sample writing preview note */}
              <div className="p-4 rounded-xl bg-slate-50 border border-[#D5E4F0] max-w-xl text-start">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[#182224]">
                  <Sparkles className="w-3.5 h-3.5 text-[#5A6A7E]" />
                  <span>
                    {language === 'ur' ? 'رومن اردو کی مکمل شناخت' : 'Roman Urdu Native Support'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#4A5568] italic font-sans leading-relaxed">
                  "Hamare area Block 7 mein pichlay 3 din se paani ki main line leak hai aur road par jama ho raha hai..."
                </p>
              </div>

              {/* Primary & Secondary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3">
                <Link to="/submit" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-medium shadow-sm"
                  >
                    {t('heroActionWrite') || 'Write a Complaint'}
                  </Button>
                </Link>
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-medium"
                  >
                    {t('heroActionDashboard') || 'My Complaints'}
                  </Button>
                </Link>
              </div>

              {/* Trust & Prototype Notice */}
              <div className="pt-4 border-t border-[#D5E4F0]/60 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#5A6A7E]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#182224]" />
                  <span>{language === 'ur' ? 'مفت بلدیاتی خدمت' : 'Free Civic Service'}</span>
                </span>
                <span className="text-[#D5E4F0] hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#182224]" />
                  <span>{language === 'ur' ? 'رازداری کا تحفظ' : 'Privacy Protected'}</span>
                </span>
                <span className="text-[#D5E4F0] hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#182224]" />
                  <span>{language === 'ur' ? 'تعلیمی ڈیمو موڈ' : 'Academic Prototype Mode'}</span>
                </span>
              </div>
            </div>
          </NotebookPage>
        </Container>
      </section>

      {/* 2. RESTRAINED HORIZONTAL EXPLANATION: INTENDED WORKFLOW STAGES */}
      <section className="relative">
        <Container size="xl" className="max-w-[1000px]">
          <div className="px-4 text-start">
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {language === 'ur' ? 'نظام کے مراحل' : 'INTENDED CIVIC WORKFLOW'}
              </span>
            </div>

            {/* Linear Process Progression (Write → Classify → Route → Track) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {processSteps.map((step, idx) => (
                <div
                  key={step.num}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 text-start space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-slate-500 font-semibold">{step.num}</span>
                    {idx < processSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600 hidden lg:block" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};
