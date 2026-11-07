import React from 'react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  Sparkles,
  Building,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

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
    <div className="space-y-14 sm:space-y-20 py-6 sm:py-14 overflow-x-hidden">
      {/* 1. DOMINANT FROSTED-GLASS HERO WORKSPACE */}
      <section className="relative">
        <Container size="xl" className="max-w-[1220px]">
          {/* Layer 2: The Large Frosted Glass Workspace Window */}
          <div className="glass-workspace rounded-3xl p-6 sm:p-10 lg:p-14 relative overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-start">
              
              {/* Left Column (55%): Clear, Confident Citizen Message */}
              <div className="lg:col-span-7 space-y-6 lg:pe-4 min-w-0">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 text-[#155D58] border border-[#D9E5E2] shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#087F76] animate-pulse"></span>
                  <span>{t('heroBadge') || 'Karachi Civic Workspace'}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold text-[#183438] tracking-tight leading-[1.12]">
                  Your voice matters. <br className="hidden sm:inline" />
                  <span className="text-[#155D58]">Make it heard.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#617679] leading-relaxed max-w-xl">
                  {t('heroSubtitle') || t('heroDescription')}
                </p>

                {/* Primary & Secondary Action CTAs (No clutter, clear hierarchy) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <Link to="/submit" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto bg-[#155D58] hover:bg-[#0f4642] text-white px-7 py-3.5 rounded-xl shadow-xs text-sm sm:text-base font-medium transition-all"
                    >
                      {t('heroActionWrite') || 'Write a Complaint'}
                    </Button>
                  </Link>
                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-[#D9E5E2] bg-white/80 hover:bg-white text-[#183438] px-7 py-3.5 rounded-xl shadow-2xs text-sm sm:text-base font-medium transition-all"
                    >
                      {t('heroActionDashboard') || 'My Complaints'}
                    </Button>
                  </Link>
                </div>

                {/* Understated Trust & Privacy Note */}
                <div className="pt-2 flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-xs text-[#617679]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#155D58]" />
                    <span>Free Municipal Service</span>
                  </span>
                  <span className="text-[#D9E5E2] hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#155D58]" />
                    <span>Privacy Protected</span>
                  </span>
                  <span className="text-[#D9E5E2] hidden sm:inline">•</span>
                  <span>Fictional Demonstration Mode</span>
                </div>
              </div>

              {/* Right Column (45%): Signature Glass Desk & Stationery Composition */}
              <div className="lg:col-span-5 relative w-full pt-4 lg:pt-0">
                
                {/* Translucent Glass Frame Desk Surface */}
                <div className="glass-subtle rounded-2xl p-3 sm:p-4.5 relative shadow-inner">
                  
                  {/* Digital Paper Writing Sheet (Pure White Document) */}
                  <div className="paper-surface rounded-xl p-5 sm:p-6 space-y-4 relative shadow-sm">
                    
                    {/* Document Header Line */}
                    <div className="pb-3 border-b border-[#D9E5E2] flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#155D58] uppercase tracking-wider text-[11px]">
                        {t('paperDocHeader') || 'CITIZEN COMPLAINT APPLICATION'}
                      </span>
                      <span className="text-[#617679] font-mono text-[10px] bg-[#EDF3F2] px-2 py-0.5 rounded border border-[#D9E5E2]">
                        FORM SPEC-2026
                      </span>
                    </div>

                    {/* Official Recipient Notice Line */}
                    <div className="p-2.5 rounded-lg bg-[#EDF3F2]/80 border border-[#D9E5E2] flex items-start gap-2.5 text-xs">
                      <Building className="w-3.5 h-3.5 text-[#155D58] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-[#183438] block text-[11px]">
                          {t('paperDocTo') || 'To: Concerned Service Department, Karachi'}
                        </span>
                        <span className="text-[#617679] text-[10px] block mt-0.5 leading-snug">
                          Automated semantic routing assigns to responsible authority.
                        </span>
                      </div>
                    </div>

                    {/* Decorative Document Writing Canvas (No Fictional Records) */}
                    <div className="space-y-3 pt-0.5">
                      {/* Simulated Subject Placeholder */}
                      <div className="h-8 w-full bg-[#FAFCFB] rounded-lg border border-[#D9E5E2] px-3 flex items-center text-xs text-[#617679]/45 italic">
                        {t('paperSubjectPlaceholder') || 'Complaint Subject / Title...'}
                      </div>

                      {/* Simulated Writing Sheet with Elegant Stationery Guidelines */}
                      <div className="h-28 w-full bg-[#FAFCFB] rounded-lg border border-[#D9E5E2] p-3 space-y-2.5 relative overflow-hidden">
                        <span className="text-[11px] text-[#617679]/60 italic block">
                          {t('heroPreviewSnippet') || 'Start writing naturally in Roman Urdu...'}
                        </span>
                        <div className="space-y-2 opacity-35">
                          <div className="h-1.5 w-11/12 bg-[#D9E5E2] rounded"></div>
                          <div className="h-1.5 w-4/5 bg-[#D9E5E2] rounded"></div>
                          <div className="h-1.5 w-5/6 bg-[#D9E5E2] rounded"></div>
                        </div>
                      </div>
                    </div>

                    {/* Subordinate Details Rule */}
                    <div className="pt-2 border-t border-[#D9E5E2]/70 flex items-center justify-between text-[10px] text-[#617679]">
                      <span className="font-medium text-[#183438]">Applicant & Incident Details</span>
                      <span className="flex items-center gap-1 text-[#155D58]">
                        <Lock className="w-3 h-3" />
                        <span>Protected</span>
                      </span>
                    </div>
                  </div>

                  {/* Layer 3: Floating Secondary Glass Element (Depth without Fake Operational Data) */}
                  <div className="glass-floating rounded-xl p-3.5 absolute -bottom-4 -end-2 sm:-bottom-5 sm:-end-4 max-w-[240px] space-y-1 shadow-lg hidden sm:block text-start">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#183438]">
                      <div className="p-1 rounded-md bg-[#DCEBE8] text-[#155D58]">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span>{t('heroFloatingHelpTitle') || 'Roman Urdu Native Input'}</span>
                    </div>
                    <p className="text-[11px] text-[#617679] leading-snug">
                      {t('heroFloatingHelpDesc') || 'Write naturally as you speak. The system parses everyday Roman Urdu phrasing.'}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </Container>
      </section>

      {/* 2. ONE LIGHTWEIGHT PROCESS EXPLANATION: Write → Classify → Route → Track */}
      <section className="relative">
        <Container size="xl" className="max-w-[1220px]">
          <div className="text-center max-w-xl mx-auto space-y-1.5 mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#183438] tracking-tight">
              {t('howTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#617679]">
              {t('howSubtitle')}
            </p>
          </div>

          {/* Continuous Typographic Progress Line on Desktop */}
          <div className="relative">
            {/* Subtle connecting line across steps (desktop only) */}
            <div className="hidden lg:block absolute top-4 inset-x-12 h-px bg-[#D9E5E2]" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-start relative">
              {processSteps.map((step) => (
                <div
                  key={step.num}
                  className="bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl p-5 space-y-2 relative shadow-2xs hover:bg-white/90 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#155D58] bg-[#DCEBE8] px-2 py-0.5 rounded-md">
                      {step.num}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#183438]">
                      {step.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#617679] leading-relaxed pt-1">
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
