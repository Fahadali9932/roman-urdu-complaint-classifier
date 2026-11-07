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
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets className="w-4 h-4 text-[#087F76]" aria-hidden="true" />;
      case 'Trash2':
        return <Trash2 className="w-4 h-4 text-[#087F76]" aria-hidden="true" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-[#087F76]" aria-hidden="true" />;
      case 'Building2':
        return <Building2 className="w-4 h-4 text-[#087F76]" aria-hidden="true" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-[#087F76]" aria-hidden="true" />;
    }
  };

  const steps = [
    {
      num: '1',
      title: t('step1Title') || '1. Write your complaint',
      desc: t('step1Desc') || 'Describe your civic issue naturally in Roman Urdu or English.',
    },
    {
      num: '2',
      title: t('step2Title') || '2. The system identifies the issue',
      desc: t('step2Desc') || 'Automated semantic NLP routes your grievance to the correct municipal entity.',
    },
    {
      num: '3',
      title: t('step3Title') || '3. Reaches department queue',
      desc: t('step3Desc') || 'Directed straight to KW&SC, SSWMB, K-Electric, or KMC action queues.',
    },
    {
      num: '4',
      title: t('step4Title') || '4. Track its progress',
      desc: t('step4Desc') || 'Follow your unique reference number from intake to verified on-ground resolution.',
    },
  ];

  const features = [
    {
      title: t('feat1Title') || 'Roman Urdu Native Support',
      desc: t('feat1Desc') || 'No need to translate or find formal bureaucratic words. Write exactly as you speak.',
      icon: <FileText className="w-4 h-4 text-[#087F76]" />,
    },
    {
      title: t('feat2Title') || 'Intelligent Routing',
      desc: t('feat2Desc') || 'Granular automated routing across KW&SC, SSWMB, K-Electric, KMC, and SBCA.',
      icon: <CheckCircle2 className="w-4 h-4 text-[#087F76]" />,
    },
    {
      title: t('feat3Title') || 'Private Citizen Information',
      desc: t('feat3Desc') || 'Your personal phone and home address remain strictly segregated from public lookup views.',
      icon: <Lock className="w-4 h-4 text-[#087F76]" />,
    },
    {
      title: t('feat4Title') || 'Direct Tracking',
      desc: t('feat4Desc') || 'Every complaint generates a clean timeline tracking on-ground departmental progress.',
      icon: <Search className="w-4 h-4 text-[#087F76]" />,
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 py-8 sm:py-14">
      {/* 1. Minimal Hero Section */}
      <section>
        <Container size="xl">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E5E9E7]/60 text-[#193D3D] border border-[#E5E9E7]">
              <span>Karachi Civic Grievance Triage</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold text-[#1C3033] tracking-tight leading-[1.2]">
              {t('heroTitle') || 'Your voice deserves to be heard.'}
            </h1>

            <p className="text-sm sm:text-base text-[#667578] leading-relaxed max-w-xl mx-auto">
              {t('heroSubtitle') || t('heroDescription')}
            </p>

            {/* Clear Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link to="/submit">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<PenTool className="w-4 h-4" />}
                  className="bg-[#193D3D] hover:bg-[#1C3033] text-white px-5 shadow-none"
                >
                  {t('heroActionWrite') || t('heroCtaSubmit') || 'Write a Complaint'}
                </Button>
              </Link>
              <Link to="/track">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Search className="w-4 h-4" />}
                  className="border-[#E5E9E7] text-[#1C3033] hover:bg-[#E5E9E7]/40 px-5"
                >
                  {t('heroActionTrack') || t('heroCtaTrack') || 'Track Complaint'}
                </Button>
              </Link>
            </div>

            {/* Restrained Document-Inspired Preview Snippet */}
            <div className="pt-8 max-w-xl mx-auto text-start">
              <div className="paper-sheet rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E9E7] text-xs">
                  <span className="font-semibold text-[#193D3D] uppercase tracking-wider text-[11px]">
                    Live Grievance Preview
                  </span>
                  <span className="ref-code text-[11px] px-2 py-0.5 rounded bg-[#F7F8F7] border border-[#E5E9E7] text-[#1C3033]">
                    KHI-2026-5120
                  </span>
                </div>

                <p className="italic text-xs sm:text-sm text-[#1C3033] roman-urdu-text leading-relaxed bg-[#F7F8F7] p-3 rounded-lg border border-[#E5E9E7]">
                  "{t('heroPreviewSnippet')}"
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#667578] pt-1">
                  <span>Detected: <strong>Roman Urdu</strong></span>
                  <span className="text-[#087F76] font-medium">Routed to: K-Electric & KW&SC</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. How It Works Section */}
      <section>
        <Container size="xl">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1C3033] tracking-tight">
              {t('howTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#667578]">
              {t('howSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-start">
            {steps.map((step) => (
              <div
                key={step.num}
                className="paper-sheet rounded-lg p-5 space-y-2.5"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold bg-[#E5E9E7]/70 text-[#193D3D]">
                  {step.num}
                </div>
                <h3 className="text-sm font-semibold text-[#1C3033]">
                  {step.title}
                </h3>
                <p className="text-xs text-[#667578] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. Concise Key Points (Features) */}
      <section>
        <Container size="xl">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1C3033] tracking-tight">
              {t('featuresTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-[#667578]">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-start">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="paper-sheet rounded-lg p-5 flex items-start gap-3.5"
              >
                <div className="p-2 rounded bg-[#F7F8F7] border border-[#E5E9E7] shrink-0 mt-0.5">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#1C3033]">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#667578] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Supported Karachi Civic Utilities */}
      <section>
        <Container size="xl">
          <div className="pb-4 border-b border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#1C3033]">
                Participating Municipal Entities
              </h2>
              <p className="text-xs text-[#667578]">
                Complaints are classified and directed automatically to specialized authorities
              </p>
            </div>
            <Link
              to="/submit"
              className="text-xs font-semibold text-[#087F76] hover:text-[#193D3D] inline-flex items-center gap-1"
            >
              <span>{t('heroActionWrite') || 'Write a Complaint'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-start">
            {Object.values(KARACHI_DEPARTMENTS).map((dept) => (
              <div
                key={dept.id}
                className="paper-sheet rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#F7F8F7] border border-[#E5E9E7]">
                    {getDeptIcon(dept.iconName)}
                  </div>
                  <div>
                    <span className="ref-code text-[10px] font-bold text-[#087F76]">
                      {dept.code}
                    </span>
                    <h4 className="text-xs font-semibold text-[#1C3033] line-clamp-1">
                      {language === 'ur' ? dept.nameUrdu : dept.name}
                    </h4>
                  </div>
                </div>
                <p className="text-[11px] text-[#667578] line-clamp-2 leading-relaxed">
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
