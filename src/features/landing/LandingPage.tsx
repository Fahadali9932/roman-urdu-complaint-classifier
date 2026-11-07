import React from 'react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  PenTool,
  LayoutList,
  CheckCircle2,
  Lock,
  Sparkles,
  Building,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
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
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-16 overflow-x-hidden">
      {/* 1. LAYERED GLASS WORKSPACE HERO */}
      <section className="relative">
        <Container size="xl">
          {/* Layer 2: Dominant Frosted-Glass Workspace */}
          <div className="glass-workspace rounded-3xl p-6 sm:p-12 lg:p-16 relative overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center text-start">
              
              {/* Left Column: Direct Citizen Message & Dual Actions */}
              <div className="lg:col-span-6 space-y-6 lg:pe-4 min-w-0">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 text-[#17423F] border border-[#DFE7E4] shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] animate-pulse"></span>
                  <span>{t('heroBadge') || 'Karachi Civic Workspace'}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold text-[#172D31] tracking-tight leading-[1.12]">
                  Your voice matters. <br className="hidden sm:inline" />
                  <span className="text-[#126B63]">Make it heard.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#667679] leading-relaxed max-w-xl">
                  {t('heroSubtitle') || t('heroDescription')}
                </p>

                {/* Primary & Secondary Action CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                  <Link to="/submit" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      leftIcon={<PenTool className="w-4 h-4" />}
                      className="w-full sm:w-auto bg-[#126B63] hover:bg-[#17423F] text-white px-7 py-3.5 rounded-xl shadow-xs text-sm sm:text-base font-medium transition-all"
                    >
                      {t('heroActionWrite') || 'Write a Complaint'}
                    </Button>
                  </Link>
                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      leftIcon={<LayoutList className="w-4 h-4" />}
                      className="w-full sm:w-auto border-[#DFE7E4] bg-white/80 hover:bg-white text-[#172D31] px-7 py-3.5 rounded-xl shadow-2xs text-sm sm:text-base font-medium transition-all"
                    >
                      {t('heroActionDashboard') || 'My Complaints'}
                    </Button>
                  </Link>
                </div>

                {/* Trust Signifiers */}
                <div className="pt-2 flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-[#667679]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#126B63]" />
                    <span>Free Municipal Service</span>
                  </span>
                  <span className="text-[#DFE7E4] hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#126B63]" />
                    <span>Privacy Protected</span>
                  </span>
                  <span className="text-[#DFE7E4] hidden sm:inline">•</span>
                  <span>Fictional Demonstration Mode</span>
                </div>
              </div>

              {/* Right Column: Glass & Stationery Paper Composition (No Fake Data) */}
              <div className="lg:col-span-6 relative w-full pt-4 lg:pt-0">
                
                {/* Genuine Digital Paper Writing Sheet Preview */}
                <div className="paper-surface rounded-2xl p-6 sm:p-8 space-y-5 relative shadow-md">
                  
                  {/* Paper Document Header Line */}
                  <div className="pb-3 border-b border-[#DFE7E4] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#17423F] uppercase tracking-wider text-[11px]">
                      {t('paperDocHeader') || 'CITIZEN COMPLAINT APPLICATION'}
                    </span>
                    <span className="text-[#667679] font-mono text-[11px] bg-[#F4F6F5] px-2 py-0.5 rounded border border-[#DFE7E4]">
                      FORM SPEC-2026
                    </span>
                  </div>

                  {/* Addressed To Note */}
                  <div className="p-3 rounded-lg bg-[#F4F6F5]/90 border border-[#DFE7E4] flex items-start gap-2.5 text-xs">
                    <Building className="w-4 h-4 text-[#126B63] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-[#172D31] block">
                        {t('paperDocTo') || 'To: Concerned Service Department, Karachi'}
                      </span>
                      <span className="text-[#667679] text-[11px] block mt-0.5">
                        Automated semantic classification routes complaint to responsible municipal entity.
                      </span>
                    </div>
                  </div>

                  {/* Blank Writing Surface with Subtle Decorative Stationery Guidelines */}
                  <div className="space-y-3.5 pt-1">
                    {/* Simulated Subject Field */}
                    <div className="space-y-1">
                      <div className="h-2 w-28 bg-[#DFE7E4]/70 rounded"></div>
                      <div className="h-9 w-full bg-[#FAFCFB] rounded-lg border border-[#DFE7E4] px-3 flex items-center text-xs text-[#667679]/50 italic">
                        {t('paperSubjectPlaceholder') || 'Complaint Subject / Title...'}
                      </div>
                    </div>

                    {/* Simulated Description Canvas with Watermark Stationery Lines */}
                    <div className="h-32 w-full bg-[#FAFCFB] rounded-lg border border-[#DFE7E4] p-3.5 space-y-3 relative overflow-hidden">
                      <span className="text-xs text-[#667679]/60 italic block">
                        {t('heroPreviewSnippet') || 'Start writing naturally in Roman Urdu...'}
                      </span>
                      <div className="space-y-2.5 opacity-40">
                        <div className="h-1.5 w-11/12 bg-[#DFE7E4] rounded"></div>
                        <div className="h-1.5 w-4/5 bg-[#DFE7E4] rounded"></div>
                        <div className="h-1.5 w-5/6 bg-[#DFE7E4] rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Subordinate Applicant Section Indicator */}
                  <div className="pt-2 border-t border-[#DFE7E4]/70 flex items-center justify-between text-[11px] text-[#667679]">
                    <span className="font-medium text-[#172D31]">Applicant & Location Details</span>
                    <span className="flex items-center gap-1 text-[#126B63]">
                      <Lock className="w-3 h-3" />
                      <span>Contact protected</span>
                    </span>
                  </div>
                </div>

                {/* Layer 3: Floating Secondary Glass Element (Depth without Fake Operational Data) */}
                <div className="glass-floating rounded-2xl p-4 sm:p-5 absolute -bottom-5 -end-3 sm:-bottom-7 sm:-end-6 max-w-[270px] space-y-1.5 shadow-lg hidden sm:block">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#172D31]">
                    <div className="p-1 rounded-md bg-[#E7F2EF] text-[#126B63]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span>{t('heroFloatingHelpTitle') || 'Roman Urdu Native Input'}</span>
                  </div>
                  <p className="text-xs text-[#667679] leading-relaxed">
                    {t('heroFloatingHelpDesc') || 'Write naturally as you speak. The system understands everyday Roman Urdu phrasing.'}
                  </p>
                </div>

              </div>

            </div>
          </div>
        </Container>
      </section>

      {/* 2. COMPACT TYPOGRAPHIC PROCESS SEQUENCE: Write → Classify → Route → Track */}
      <section className="relative">
        <Container size="xl">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#172D31] tracking-tight">
              {t('howTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#667679]">
              {t('howSubtitle')}
            </p>
          </div>

          {/* Minimal 4-Step Process Flow with Clean Connecting Line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-start">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="paper-surface rounded-xl p-5 space-y-2.5 relative flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#126B63] bg-[#E7F2EF] px-2 py-0.5 rounded">
                      {step.num}
                    </span>
                    {idx < steps.length - 1 && (
                      <span className="hidden lg:block text-[#DFE7E4] font-mono text-sm">→</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#172D31]">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#667679] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
};
