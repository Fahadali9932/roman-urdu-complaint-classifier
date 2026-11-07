import React from 'react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { KARACHI_DEPARTMENTS } from '../../mocks/complaints';
import { Link } from 'react-router-dom';
import {
  PenTool,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
  Droplets,
  Trash2,
  Zap,
  Building2,
  ShieldAlert,
  FileText,
  Activity,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-[#126B63]" aria-hidden="true" />;
      case 'Trash2':
        return <Trash2 className="w-5 h-5 text-[#126B63]" aria-hidden="true" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-[#126B63]" aria-hidden="true" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-[#126B63]" aria-hidden="true" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-[#126B63]" aria-hidden="true" />;
    }
  };

  const steps = [
    {
      num: '01',
      title: t('step1Title') || '1. Write your complaint',
      desc: t('step1Desc') || 'Describe your civic issue naturally in Roman Urdu or English.',
    },
    {
      num: '02',
      title: t('step2Title') || '2. The system identifies the issue',
      desc: t('step2Desc') || 'Automated semantic NLP routes your grievance to the correct municipal entity.',
    },
    {
      num: '03',
      title: t('step3Title') || '3. Reaches department queue',
      desc: t('step3Desc') || 'Directed straight to KW&SC, SSWMB, K-Electric, or KMC action queues.',
    },
    {
      num: '04',
      title: t('step4Title') || '4. Track its progress',
      desc: t('step4Desc') || 'Follow your unique reference number from intake to verified on-ground resolution.',
    },
  ];

  const features = [
    {
      title: t('feat1Title') || 'Roman Urdu Native Support',
      desc: t('feat1Desc') || 'No need to translate or find formal bureaucratic words. Write exactly as you speak.',
      icon: <FileText className="w-5 h-5 text-[#126B63]" />,
    },
    {
      title: t('feat2Title') || 'Intelligent Routing',
      desc: t('feat2Desc') || 'Granular automated routing across KW&SC, SSWMB, K-Electric, KMC, and SBCA.',
      icon: <Sparkles className="w-5 h-5 text-[#126B63]" />,
    },
    {
      title: t('feat3Title') || 'Private Citizen Information',
      desc: t('feat3Desc') || 'Your personal phone and home address remain strictly segregated from public lookup views.',
      icon: <Lock className="w-5 h-5 text-[#126B63]" />,
    },
    {
      title: t('feat4Title') || 'Direct Tracking',
      desc: t('feat4Desc') || 'Every complaint generates a clean timeline tracking on-ground departmental progress.',
      icon: <Search className="w-5 h-5 text-[#126B63]" />,
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-6 sm:py-16 overflow-x-hidden">
      {/* 1. Signature Hero Section with Two-Column Glass & Paper Composition */}
      <section className="relative">
        <Container size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center text-start">
            
            {/* Left Column: Editorial Headline, Subtitle & Action CTAs */}
            <div className="lg:col-span-7 space-y-6 lg:pe-6 min-w-0 w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#E7F2EF] text-[#17423F] border border-[#DFE7E4]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#126B63] animate-pulse"></span>
                <span>{t('heroBadge') || 'Karachi Civic Grievance Triage'}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold text-[#172D31] tracking-tight leading-[1.16]">
                {t('heroTitle')}
              </h1>

              <p className="text-sm sm:text-lg text-[#667679] leading-relaxed max-w-xl">
                {t('heroSubtitle') || t('heroDescription')}
              </p>

              {/* CTAs: Full-width on mobile, auto on desktop */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link to="/submit" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<PenTool className="w-4 h-4" />}
                    className="w-full sm:w-auto bg-[#126B63] hover:bg-[#17423F] text-white px-6 py-3 rounded-xl shadow-xs text-sm sm:text-base font-medium transition-all"
                  >
                    {t('heroActionWrite') || t('heroCtaSubmit') || 'Write a Complaint'}
                  </Button>
                </Link>
                <Link to="/track" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    leftIcon={<Search className="w-4 h-4" />}
                    className="w-full sm:w-auto border-[#DFE7E4] bg-white/80 hover:bg-white text-[#172D31] px-6 py-3 rounded-xl shadow-2xs text-sm sm:text-base font-medium transition-all"
                  >
                    {t('heroActionTrack') || t('heroCtaTrack') || 'Track Complaint'}
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-1 flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-[#667679]">
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

            {/* Right Column: Signature Frosted-Glass Triage Preview */}
            <div className="lg:col-span-5 relative w-full">
              {/* Outer Frosted Glass Container */}
              <div className="civic-glass rounded-2xl p-4 sm:p-7 relative border border-white/80 space-y-4">
                
                {/* Header within Glass Container */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DFE7E4]/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#126B63] animate-pulse"></span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#172D31]">
                      Karachi Triage Desk
                    </span>
                  </div>
                  <span className="ref-code text-xs px-2.5 py-0.5 rounded-md bg-white/90 border border-[#DFE7E4] text-[#172D31] font-medium shadow-2xs">
                    KHI-2026-8942
                  </span>
                </div>

                {/* Simulated Citizen Paper Note Sheet */}
                <div className="civic-paper rounded-xl p-4 sm:p-5 space-y-2.5 relative">
                  <div className="flex items-center justify-between text-[11px] text-[#667679]">
                    <span className="font-medium text-[#172D31]">Citizen Grievance Submission</span>
                    <span>14m ago</span>
                  </div>
                  <p className="italic text-xs sm:text-sm text-[#172D31] roman-urdu-text leading-relaxed bg-[#F3F6F5]/90 p-3 rounded-lg border border-[#DFE7E4]">
                    "Bijli ka jhuka hua pole gali ke konay par girnay wala hai, bachay khel rahay hain khatra hai."
                  </p>
                  <p className="text-[11px] text-[#667679]">
                    Locality: <strong className="text-[#172D31] font-normal">Gulshan-e-Iqbal, Block 13-D</strong>
                  </p>
                </div>

                {/* NLP Semantic Classifier Triage Card */}
                <div className="bg-white/90 rounded-xl p-4 border border-[#DFE7E4] space-y-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#172D31] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#126B63]" />
                      <span>Automated Routing Breakdown</span>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E7F2EF] text-[#17423F] font-medium">
                      Roman Urdu (98%)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#DFE7E4]/50">
                      <span className="text-[#667679]">Primary Entity:</span>
                      <span className="font-semibold text-[#126B63]">K-Electric (Infrastructure)</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[#667679]">Action Status:</span>
                      <span className="text-[#172D31] font-medium">Dispatched to Local Feeder</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Trust Note */}
                <div className="text-center pt-1">
                  <span className="text-[11px] text-[#667679]">
                    No department selection needed • NLP routes automatically
                  </span>
                </div>
              </div>
            </div>

          </div>
        </Container>
      </section>

      {/* 2. How It Works: Refined Horizontal Process Flow */}
      <section className="relative">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#172D31] tracking-tight">
              {t('howTitle')}
            </h2>
            <p className="text-xs sm:text-base text-[#667679]">
              {t('howSubtitle')}
            </p>
          </div>

          {/* Process Flow Cards with Numbered Markers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-start">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="civic-paper civic-paper-hover rounded-xl p-5 sm:p-6 relative flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#126B63] bg-[#E7F2EF] px-2.5 py-1 rounded-md">
                      {step.num}
                    </span>
                    {idx < steps.length - 1 && (
                      <span className="hidden lg:block text-[#DFE7E4] font-mono text-sm">→</span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#172D31] leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#667679] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. Concise Key Features: Modern Civic Capabilities */}
      <section className="relative">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#172D31] tracking-tight">
              {t('featuresTitle')}
            </h2>
            <p className="text-xs sm:text-base text-[#667679]">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-start">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="civic-paper civic-paper-hover rounded-xl p-5 sm:p-6 flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-[#E7F2EF] border border-[#DFE7E4] shrink-0 mt-0.5">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-[#172D31]">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#667679] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Participating Municipal Authorities */}
      <section className="relative">
        <Container size="xl">
          <div className="pb-4 sm:pb-5 border-b border-[#DFE7E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start mb-6 sm:mb-8">
            <div>
              <h2 className="text-lg sm:text-2xl font-semibold text-[#172D31]">
                Participating Municipal Entities
              </h2>
              <p className="text-xs sm:text-sm text-[#667679] mt-0.5">
                Complaints are analyzed and automatically routed to specialized Karachi utility desks
              </p>
            </div>
            <Link
              to="/submit"
              className="text-xs sm:text-sm font-semibold text-[#126B63] hover:text-[#17423F] inline-flex items-center gap-1 transition-colors"
            >
              <span>{t('heroActionWrite') || 'Write a Complaint'}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-start">
            {Object.values(KARACHI_DEPARTMENTS).map((dept) => (
              <div
                key={dept.id}
                className="civic-paper civic-paper-hover rounded-xl p-4 sm:p-5 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#E7F2EF] border border-[#DFE7E4]">
                    {getDeptIcon(dept.iconName)}
                  </div>
                  <div>
                    <span className="ref-code text-[11px] font-bold text-[#126B63]">
                      {dept.code}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#172D31] line-clamp-1">
                      {language === 'ur' ? dept.nameUrdu : dept.name}
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-[#667679] line-clamp-2 leading-relaxed">
                  {language === 'ur' ? dept.descriptionUrdu : dept.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
};
