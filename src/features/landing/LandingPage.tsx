import React from 'react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useLanguage } from '../../context/LanguageContext';
import { KARACHI_DEPARTMENTS } from '../../mocks/complaints';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  MessageSquare,
  ShieldCheck,
  Cpu,
  MapPin,
  Clock,
  ArrowRight,
  GraduationCap,
  Droplets,
  Trash2,
  Zap,
  Building2,
  ShieldAlert,
  CheckCircle2,
  Send,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-blue-600" aria-hidden="true" />;
      case 'Trash2':
        return <Trash2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-600" aria-hidden="true" />;
      case 'Building2':
        return <Building2 className="w-5 h-5 text-purple-600" aria-hidden="true" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-rose-600" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* 1. Hero Section */}
      <section>
        <Container size="xl">
          <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 sm:p-12 lg:p-16 overflow-hidden shadow-xl ring-1 ring-white/10">
            {/* Background subtle decorative mesh */}
            <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -start-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-start">
              {/* Left Column: Heading and CTAs */}
              <div className="lg:col-span-7 space-y-6">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold tracking-wide">
                  <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('heroBadge')}</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                  {t('heroTitle')}
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  {t('heroDescription')}
                </p>

                {/* Call-to-actions */}
                <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Link to="/submit" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 shadow-md"
                      leftIcon={<PlusCircle className="w-5 h-5" />}
                    >
                      {t('heroCtaSubmit')}
                    </Button>
                  </Link>
                  <Link to="/track" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-slate-600 bg-white/10 hover:bg-white/20 text-white"
                      leftIcon={<Search className="w-5 h-5" />}
                    >
                      {t('heroCtaTrack')}
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-slate-400 pt-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
                  <span>{t('heroDisclaimer')}</span>
                </p>
              </div>

              {/* Right Column: Visual Civic Triage Demonstration Card */}
              <div className="lg:col-span-5 w-full">
                <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4 text-start">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                        {t('heroPreviewTitle')}
                      </span>
                    </div>
                    <span className="ref-code text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      KHI-2026-LIVE
                    </span>
                  </div>

                  {/* Citizen Input Mock */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      <span>Citizen Roman Urdu Submission:</span>
                    </span>
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-teal-100 italic roman-urdu-text">
                      {t('heroPreviewSnippet')}
                    </div>
                  </div>

                  {/* AI & Dispatch Routing Visual */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-teal-950/60 border border-teal-800/50 text-teal-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Cpu className="w-3.5 h-3.5 text-teal-400" />
                        <span>{t('heroPreviewDetected')}</span>
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    </div>

                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 text-slate-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t('heroPreviewTarget')}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-blue-900/60 text-blue-200 px-1.5 py-0.5 rounded border border-blue-700">
                        KE + KWSC
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 text-slate-200">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('heroPreviewStatus')}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded border border-amber-700">
                        Dispatched
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. How It Works Section */}
      <section>
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('howTitle')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('howSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-start">
            <Card className="p-6 relative group hover:border-teal-500/50">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm mb-4 border border-teal-100">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {t('step1Title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('step1Desc')}
              </p>
            </Card>

            <Card className="p-6 relative group hover:border-teal-500/50">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {t('step2Title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('step2Desc')}
              </p>
            </Card>

            <Card className="p-6 relative group hover:border-teal-500/50">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm mb-4 border border-amber-100">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {t('step3Title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('step3Desc')}
              </p>
            </Card>

            <Card className="p-6 relative group hover:border-teal-500/50">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm mb-4 border border-emerald-100">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {t('step4Title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('step4Desc')}
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* 3. Features Grid */}
      <section className="bg-slate-100/70 py-16">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('featuresTitle')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
            <Card className="p-6 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
                <MessageSquare className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {t('feat1Title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('feat1Desc')}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
                <MapPin className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {t('feat2Title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('feat2Desc')}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                <ShieldCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {t('feat3Title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('feat3Desc')}
                </p>
              </div>
            </Card>

            <Card className="p-6 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
                <Clock className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {t('feat4Title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('feat4Desc')}
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* 4. Karachi Departments Directory */}
      <section>
        <Container size="xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 text-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Participating Municipal Entities
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Complaints are classified and directed automatically to these specialized authorities
              </p>
            </div>
            <Link to="/submit" className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 group min-h-[36px] py-1 px-2 rounded-md hover:bg-teal-50 transition-colors">
              <span>{t('heroCtaSubmit')}</span>
              <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-start">
            {Object.values(KARACHI_DEPARTMENTS).map((dept) => (
              <Card key={dept.id} hoverable className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      {getDeptIcon(dept.iconName)}
                    </div>
                    <div>
                      <span className="ref-code text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
                        {dept.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                        {language === 'ur' ? dept.nameUrdu : dept.name}
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {language === 'ur' ? dept.descriptionUrdu : dept.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. Academic Banner (Greenwich University) */}
      <section>
        <Container size="xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xs text-start">
            <div className="w-14 h-14 rounded-2xl bg-teal-900 text-teal-300 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t('uniTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('uniSubtitle')}
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};
