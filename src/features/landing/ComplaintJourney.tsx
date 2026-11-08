import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  PenTool, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Building2, 
  Sparkles, 
  FileText,
  MapPin,
  Tag,
  Send,
  Activity
} from 'lucide-react';

interface ComplaintJourneyProps {
  id?: string;
}

export const ComplaintJourney: React.FC<ComplaintJourneyProps> = ({ id = 'steps' }) => {
  const { t, language, isRTL } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const rafId = useRef<number | null>(null);

  // Subscribe to changes in prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Continuous bidirectional scroll progress controller
  const handleScroll = useCallback(() => {
    if (prefersReducedMotion) return;
    if (!containerRef.current) return;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollable = container.offsetHeight - viewportHeight;

      if (totalScrollable <= 0) return;

      // Calculate progress relative to container top reaching top margin
      const currentScroll = -rect.top;
      const rawProgress = currentScroll / totalScrollable;
      const clamped = Math.max(0, Math.min(1, rawProgress));

      setProgress(clamped);

      // 4 discrete stages: 0..0.25 (0), 0.25..0.50 (1), 0.50..0.75 (2), 0.75..1.00 (3)
      const stage = clamped < 0.25 ? 0 : clamped < 0.5 ? 1 : clamped < 0.75 ? 2 : 3;
      setActiveStage(stage);
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, prefersReducedMotion]);

  // Jump smoothly to a specific stage on click
  const jumpToStage = (stageIndex: number) => {
    setActiveStage(stageIndex);
    if (!containerRef.current) return;
    if (prefersReducedMotion) return;

    const container = containerRef.current;
    const totalScrollable = container.offsetHeight - window.innerHeight;
    const targetOffset = container.offsetTop + (stageIndex * 0.25 + 0.02) * totalScrollable;
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: targetOffset, behavior: 'smooth' });
    }
  };

  // Stage configuration metadata
  const stages = [
    {
      index: 0,
      num: t('journeyStep1Num') || '01',
      name: t('journeyStep1Name') || 'Write',
      title: t('journeyStep1Title') || '01 — Write',
      desc: t('journeyStep1Desc') || 'Describe the issue in your own words.',
      detail: t('journeyStep1Detail') || 'Write naturally in Roman Urdu without needing official administrative terminology.',
      icon: PenTool,
      badge: t('journeyDocStatusDraft') || 'DRAFTING',
      badgeColor: 'bg-[#0B1421] text-[#F1F2F3]',
    },
    {
      index: 1,
      num: t('journeyStep2Num') || '02',
      name: t('journeyStep2Name') || 'Review',
      title: t('journeyStep2Title') || '02 — Review',
      desc: t('journeyStep2Desc') || 'Check the complaint details.',
      detail: t('journeyStep2Detail') || 'Verify category, district, and street landmark before confirming.',
      icon: CheckCircle2,
      badge: t('journeyDocStatusReviewed') || 'CITIZEN VERIFIED',
      badgeColor: 'bg-[#283041] text-[#F1F2F3]',
    },
    {
      index: 2,
      num: t('journeyStep3Num') || '03',
      name: t('journeyStep3Name') || 'Route',
      title: t('journeyStep3Title') || '03 — Route',
      desc: t('journeyStep3Desc') || 'Identify the appropriate service department.',
      detail: t('journeyStep3Detail') || 'Direct connection to the responsible Karachi municipal authority.',
      icon: Building2,
      badge: t('journeyDocStatusRouted') || 'ROUTED TO DESK',
      badgeColor: 'bg-[#34394A] text-[#F1F2F3]',
    },
    {
      index: 3,
      num: t('journeyStep4Num') || '04',
      name: t('journeyStep4Name') || 'Track',
      title: t('journeyStep4Title') || '04 — Track',
      desc: t('journeyStep4Desc') || 'Follow updates on your complaint.',
      detail: t('journeyStep4Detail') || 'Transparent status milestones from receipt to on-ground resolution.',
      icon: Activity,
      badge: t('journeyDocStatusTrack') || 'TIMELINE ACTIVE',
      badgeColor: 'bg-[#0B1421] text-[#F1F2F3]',
    },
  ];

  // Subtle 2.5D document perspectives per stage
  const documentTransforms = [
    'perspective(1000px) rotateX(1.5deg) rotateY(-1deg) translateY(0px) scale(0.995)',
    'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-2px) scale(1)',
    'perspective(1000px) rotateX(-1deg) rotateY(1.5deg) translateY(-1px) scale(1)',
    'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)',
  ];

  // =========================================================================
  // REDUCED MOTION ACCESSIBLE FALLBACK
  // =========================================================================
  if (prefersReducedMotion) {
    return (
      <section
        id={id}
        className="py-16 sm:py-24 px-4 sm:px-12 lg:px-20 border-t border-[#34394A]/15 bg-[#E9EBED] scroll-mt-28 sm:scroll-mt-32"
        aria-label={t('journeyTitle') || 'How It Works'}
      >
        <div className="max-w-5xl mx-auto text-start">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#34394A]/15">
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-widest uppercase text-[#535965]">
                {t('journeyEyebrow') || '01 TO 04 • WORKFLOW'}
              </span>
              <h2 className="font-display text-3xl sm:text-5xl text-[#0B1421] uppercase tracking-tight">
                {t('journeyTitle') || 'How It Works'}
              </h2>
            </div>
            <p className="text-sm font-ui text-[#535965] max-w-md leading-relaxed">
              {t('journeySubtitle') || 'A transparent path from your everyday words to verified municipal attention.'}
            </p>
          </div>

          {/* Accessible Step Tabs */}
          <div className="flex flex-wrap gap-2 mb-8" role="tablist">
            {stages.map((stg) => (
              <button
                key={stg.index}
                role="tab"
                aria-selected={activeStage === stg.index}
                onClick={() => setActiveStage(stg.index)}
                className={`px-4 py-2.5 rounded-full text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${
                  activeStage === stg.index
                    ? 'bg-[#0B1421] text-[#F1F2F3] font-semibold'
                    : 'bg-white border border-[#34394A]/15 text-[#535965] hover:text-[#0B1421]'
                }`}
              >
                {stg.num} — {stg.name}
              </button>
            ))}
          </div>

          {/* Static Evolving Document Preview */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#34394A]/20 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-[#34394A]/15 text-xs font-mono text-[#535965]">
              <span>{t('journeyDocRef') || 'DOC-REF // AWAAZ-DRAFT-01'}</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${stages[activeStage].badgeColor}`}>
                {stages[activeStage].badge}
              </span>
            </div>
            <div className="py-6">
              <h3 className="font-display text-xl sm:text-2xl text-[#0B1421] tracking-tight">
                {stages[activeStage].title}
              </h3>
              <p className="mt-2 text-sm text-[#283041]">{stages[activeStage].desc}</p>
              <p className="mt-1 text-xs text-[#535965]">{stages[activeStage].detail}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // FULL INTERACTIVE SCROLL-DRIVEN COMPLAINT JOURNEY
  // =========================================================================
  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#34394A]/15 bg-[#E9EBED] scroll-mt-28 sm:scroll-mt-32"
      style={{
        // 260vh height on desktop, 220vh on mobile: deliberate, comfortable scroll pacing
        minHeight: '270vh',
      }}
      aria-label={t('journeyTitle') || 'How It Works'}
    >
      {/* ========================================================
          STICKY STORYTELLING FRAMEWORK
          Remains pinned while progress advances 0.0 -> 1.0,
          then naturally releases and scrolls into subsequent sections
          ======================================================== */}
      <div className="sticky top-24 sm:top-28 h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7.5rem)] w-full flex flex-col justify-between px-4 sm:px-8 lg:px-16 xl:px-20 py-4 sm:py-6 overflow-hidden">
        
        {/* Section Header with Eyebrow and Subtitle */}
        <div className="max-w-6xl mx-auto w-full text-start flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-[#34394A]/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[#535965]">
                {t('journeyEyebrow') || '01 TO 04 • WORKFLOW'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B1421]" />
              <span className="text-[10px] sm:text-xs font-mono text-[#0B1421] font-semibold">
                STAGE {activeStage + 1} OF 4
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl text-[#0B1421] uppercase tracking-tight">
              {t('journeyTitle') || 'How It Works'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-ui text-[#535965] max-w-md leading-relaxed hidden sm:block">
            {t('journeySubtitle') || 'A transparent path from your everyday words to verified municipal attention.'}
          </p>
        </div>

        {/* Mobile Stage Navigation Pills (< 768px) */}
        <div className="md:hidden max-w-md mx-auto w-full flex items-center justify-between gap-1.5 pt-2 pb-1">
          {stages.map((stg) => {
            const isActive = activeStage === stg.index;
            return (
              <button
                key={stg.index}
                type="button"
                onClick={() => jumpToStage(stg.index)}
                className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B1421] text-[#F1F2F3] shadow-sm font-semibold'
                    : 'bg-white/80 border border-[#34394A]/15 text-[#535965]'
                }`}
              >
                <div className="text-[10px] font-mono leading-tight">{stg.num}</div>
                <div className="text-[11px] font-ui truncate leading-tight">{stg.name}</div>
              </button>
            );
          })}
        </div>

        {/* Main Interactive Stage Experience: Narrative + Single Evolving Document */}
        <div className="max-w-6xl mx-auto w-full flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-8 items-center py-2 sm:py-4">
          
          {/* ========================================================
              LEFT COLUMN (Desktop): 4-Stage Narrative Step Selector
              ======================================================== */}
          <div className="hidden md:flex md:col-span-5 flex-col justify-center space-y-3 lg:space-y-4 text-start">
            {stages.map((stg) => {
              const isActive = activeStage === stg.index;
              const Icon = stg.icon;
              return (
                <button
                  key={stg.index}
                  type="button"
                  onClick={() => jumpToStage(stg.index)}
                  className={`w-full text-start p-4 lg:p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white border-[#0B1421] shadow-lg shadow-[#0B1421]/08 translate-x-1 sm:translate-x-2 rtl:-translate-x-1 sm:rtl:-translate-x-2'
                      : 'bg-white/50 border-[#34394A]/10 hover:bg-white hover:border-[#34394A]/30 opacity-70 hover:opacity-95'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive ? 'bg-[#0B1421] text-[#F1F2F3]' : 'bg-[#E9EBED] text-[#535965]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#535965]">
                        [{stg.num}]
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#0B1421] font-semibold bg-[#DEE1E5]/80 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg lg:text-xl text-[#0B1421] tracking-tight mt-2.5">
                    {stg.title}
                  </h3>
                  <p className="text-xs lg:text-sm font-ui text-[#283041] mt-1 leading-relaxed">
                    {stg.desc}
                  </p>

                  {/* Micro progression line inside active card */}
                  {isActive && (
                    <div className="mt-3 pt-2.5 border-t border-[#34394A]/10 text-[11px] font-ui text-[#535965] leading-normal flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B1421] animate-pulse" />
                      <span>{stg.detail}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================
              RIGHT COLUMN: The Single Evolving Complaint Document
              (ComplaintJourneyDocument)
              ======================================================== */}
          <div className="col-span-1 md:col-span-7 flex flex-col justify-center items-center w-full">
            
            {/* The Single Complaint Document Canvas */}
            <div
              className="w-full max-w-lg mx-auto bg-white rounded-2xl sm:rounded-3xl border border-[#34394A]/20 shadow-[0_18px_45px_rgba(11,20,33,0.08)] overflow-hidden transition-all duration-500 ease-out flex flex-col justify-between"
              style={{
                transform: documentTransforms[activeStage],
                minHeight: '380px',
              }}
            >
              {/* Document Header & Status Bar */}
              <div className="px-4 sm:px-6 py-3.5 bg-[#F8F9FA] border-b border-[#34394A]/15 flex items-center justify-between text-start">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B1421]" />
                  <span className="font-mono text-[10px] sm:text-xs text-[#535965] tracking-wider uppercase">
                    {t('journeyDocRef') || 'DOC-REF // AWAAZ-DRAFT-01'}
                  </span>
                </div>

                {/* Evolving Stage Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider transition-all duration-300 ${stages[activeStage].badgeColor}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  <span>{stages[activeStage].badge}</span>
                </div>
              </div>

              {/* Document Official Header Band */}
              <div className="px-4 sm:px-6 pt-3 pb-2 text-start border-b border-[#34394A]/10 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-mono text-[11px] sm:text-xs font-bold text-[#0B1421] tracking-wider uppercase">
                      {t('journeyDocTitle') || 'CITIZEN GRIEVANCE APPLICATION'}
                    </h4>
                    <p className="text-[10px] font-ui text-[#535965]">
                      {t('journeyDocSubtitle') || 'Civic Service Portal • Sindh Government Initiative'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#535965] hidden sm:block">
                    PROVINCE OF SINDH
                  </span>
                </div>
              </div>

              {/* ====================================================
                  STAGE-SPECIFIC INTERNAL EVOLVING VIEWPORT
                  The single document smoothly morphs its contents
                  ==================================================== */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center text-start">

                {/* ---------------- STAGE 0: WRITE ---------------- */}
                {activeStage === 0 && (
                  <div className="space-y-4 transition-all duration-300 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-[#535965]">
                      <span className="font-ui">
                        {language === 'ur' ? 'اپنا عوامی مسئلہ لکھیں:' : 'Civic grievance input:'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#DEE1E5]/70 text-[#0B1421] font-mono text-[10px] font-semibold">
                        {t('journeyDocIllustrativeTag') || 'ILLUSTRATIVE DRAFT'}
                      </span>
                    </div>

                    {/* Illustrative Input Box */}
                    <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#34394A]/20 focus-within:border-[#0B1421] shadow-inner transition-all">
                      <div className="flex items-start gap-2">
                        <PenTool className="w-4 h-4 text-[#0B1421] shrink-0 mt-0.5" />
                        <div className="w-full">
                          <p className="font-ui text-sm sm:text-base text-[#0B1421] font-medium leading-relaxed roman-urdu-text">
                            "{t('journeyDocExampleText') || 'Hamari gali mein pani nahi aa raha.'}"
                            <span className="inline-block w-1.5 h-4 ml-1 bg-[#0B1421] animate-pulse align-middle" />
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detected Language Chip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono text-[#535965]">
                      <div className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0B1421]" />
                        <span>{t('journeyDocDetectedMode') || 'Detected: Roman Urdu (Natural Speech)'}</span>
                      </div>
                      <span className="text-[10px] text-[#535965]/70">Max: 200 words</span>
                    </div>
                  </div>
                )}

                {/* ---------------- STAGE 1: REVIEW ---------------- */}
                {activeStage === 1 && (
                  <div className="space-y-3 transition-all duration-300 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-[#535965] pb-1 border-b border-[#34394A]/10">
                      <span className="font-ui font-medium text-[#0B1421]">
                        {language === 'ur' ? 'شکایت کی تفصیلات کی تصدیق' : 'Structured Complaint Verification'}
                      </span>
                      <span className="text-[10px] font-mono text-[#535965]">PRE-SUBMISSION</span>
                    </div>

                    {/* Structured Grid */}
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#34394A]/15 flex items-center justify-between">
                        <span className="text-[#535965] font-mono text-[11px]">
                          {t('journeyReviewSubjectLabel') || 'Subject'}:
                        </span>
                        <span className="font-ui font-semibold text-[#0B1421]">
                          {t('journeyReviewSubjectValue') || 'Pani ka Masla (Water Supply Shortage)'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#34394A]/15 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#535965] font-mono text-[11px]">
                          <Tag className="w-3.5 h-3.5 text-[#0B1421]" />
                          <span>{t('journeyReviewCategoryLabel') || 'Service Domain'}:</span>
                        </div>
                        <span className="font-ui font-semibold text-[#0B1421]">
                          {t('journeyReviewCategoryValue') || 'Municipal Water & Sewerage'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#F8F9FA] border border-[#34394A]/15 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#535965] font-mono text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-[#0B1421]" />
                          <span>{t('journeyReviewLocationLabel') || 'Location'}:</span>
                        </div>
                        <span className="font-ui font-semibold text-[#0B1421]">
                          {t('journeyReviewLocationValue') || 'District East, Karachi'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#DEE1E5]/40 border border-[#34394A]/15 flex items-center justify-between">
                        <span className="text-[#535965] font-mono text-[11px]">
                          {t('journeyReviewWordsLabel') || 'Citizen Words'}:
                        </span>
                        <span className="font-ui italic text-[#283041] roman-urdu-text truncate max-w-[200px]">
                          "{t('journeyDocExampleText') || 'Hamari gali mein pani nahi aa raha.'}"
                        </span>
                      </div>
                    </div>

                    {/* Citizen Self-Check Confirmation Note */}
                    <div className="pt-1 flex items-center gap-2 text-[11px] font-ui text-[#283041] bg-[#F1F2F3] px-3 py-2 rounded-lg border border-[#34394A]/15">
                      <CheckCircle2 className="w-4 h-4 text-[#0B1421] shrink-0" />
                      <span>{t('journeyReviewCheckNote') || 'Citizen Detail Check: Verified by citizen prior to transmission'}</span>
                    </div>
                  </div>
                )}

                {/* ---------------- STAGE 2: ROUTE ---------------- */}
                {activeStage === 2 && (
                  <div className="space-y-4 transition-all duration-300 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-[#535965] pb-1 border-b border-[#34394A]/10">
                      <span className="font-ui font-medium text-[#0B1421]">
                        {language === 'ur' ? 'خودکار بلدیاتی تفویض' : 'Intelligent Civic Dispatch'}
                      </span>
                      <span className="text-[10px] font-mono text-[#535965]">DIRECTED DISPATCH</span>
                    </div>

                    {/* Directional Connection Flow */}
                    <div className="space-y-3">
                      {/* Origin Node */}
                      <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#34394A]/15 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-ui text-[#283041]">
                          <FileText className="w-4 h-4 text-[#0B1421]" />
                          <span>{t('journeyRouteSource') || 'Citizen Submission (District East)'}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#535965] uppercase">Origin</span>
                      </div>

                      {/* Directional Connector Line */}
                      <div className="flex items-center justify-center gap-2 py-0.5">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0B1421] to-transparent" />
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1421] text-[#F1F2F3] text-[10px] font-mono tracking-wider">
                          <Send className="w-3 h-3" />
                          <span>DIRECTIONAL ROUTE</span>
                          {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0B1421] to-transparent" />
                      </div>

                      {/* Target Authority Node */}
                      <div className="p-3.5 rounded-xl bg-[#DEE1E5]/60 border border-[#0B1421]/30 shadow-sm flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-[#0B1421] shrink-0 mt-0.5" />
                        <div className="text-start">
                          <h5 className="font-ui font-semibold text-xs sm:text-sm text-[#0B1421]">
                            {t('journeyRouteTarget') || 'Karachi Water & Sewerage Corporation (KW&SC)'}
                          </h5>
                          <p className="text-[11px] font-mono text-[#535965] mt-0.5">
                            {t('journeyRouteNotice') || 'Natural Language Civic Routing • Public Utilities Sector'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-[#535965] text-center pt-1">
                      Direct architectural triage • Zero manual paperwork bottlenecks
                    </div>
                  </div>
                )}

                {/* ---------------- STAGE 3: TRACK ---------------- */}
                {activeStage === 3 && (
                  <div className="space-y-4 transition-all duration-300 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-[#535965] pb-1 border-b border-[#34394A]/10">
                      <span className="font-ui font-medium text-[#0B1421]">
                        {language === 'ur' ? 'حل کی مرحلہ وار ٹائم لائن' : 'Resolution Lifecycle Timeline'}
                      </span>
                      <span className="text-[10px] font-mono text-[#535965]">STAGE 1 LOGGED</span>
                    </div>

                    {/* Timeline Framework (4 Milestones) */}
                    <div className="space-y-2.5">
                      {[
                        {
                          name: t('journeyTrackStage1') || 'Logged',
                          desc: t('journeyTrackStage1Desc') || 'Registered in municipal queue',
                          status: 'current',
                          num: '01',
                        },
                        {
                          name: t('journeyTrackStage2') || 'Triaged',
                          desc: t('journeyTrackStage2Desc') || 'Under engineering review',
                          status: 'upcoming',
                          num: '02',
                        },
                        {
                          name: t('journeyTrackStage3') || 'Dispatched',
                          desc: t('journeyTrackStage3Desc') || 'Field crew allocation',
                          status: 'upcoming',
                          num: '03',
                        },
                        {
                          name: t('journeyTrackStage4') || 'Resolved',
                          desc: t('journeyTrackStage4Desc') || 'On-ground civic action',
                          status: 'upcoming',
                          num: '04',
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                            item.status === 'current'
                              ? 'bg-[#0B1421] text-[#F1F2F3] border-[#0B1421] shadow-sm'
                              : 'bg-[#F8F9FA] text-[#535965] border-[#34394A]/15'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                                item.status === 'current'
                                  ? 'bg-[#F1F2F3] text-[#0B1421]'
                                  : 'bg-[#DEE1E5] text-[#535965]'
                              }`}
                            >
                              {item.num}
                            </span>
                            <span className="font-ui font-semibold">{item.name}</span>
                          </div>
                          <span
                            className={`text-[11px] font-ui ${
                              item.status === 'current' ? 'text-[#DEE1E5]' : 'text-[#535965]'
                            }`}
                          >
                            {item.desc}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Footer Note */}
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#535965]">
                      <Clock className="w-3.5 h-3.5 text-[#0B1421]" />
                      <span>{t('journeyTrackNote') || 'Milestone Tracking: Follow live progress via your citizen workspace'}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Document Interactive Footer */}
              <div className="px-4 sm:px-6 py-3 bg-[#F8F9FA] border-t border-[#34394A]/15 flex items-center justify-between text-[11px] font-mono text-[#535965]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0B1421]" />
                  <span>STEP {activeStage + 1} // 04</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>SCROLL TO PROGRESS</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Section Progress Bar & Release Indicator */}
        <div className="max-w-6xl mx-auto w-full pt-3 sm:pt-4 border-t border-[#34394A]/15 flex items-center justify-between text-xs text-[#535965]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              JOURNEY PROGRESS: {Math.round(progress * 100)}%
            </span>
            {/* Visual continuous progress track */}
            <div className="w-28 sm:w-44 h-1.5 rounded-full bg-[#DEE1E5] overflow-hidden">
              <div
                className="h-full bg-[#0B1421] transition-all duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            {progress < 0.95 ? (
              <span>SCROLL DOWN TO ADVANCE ↓</span>
            ) : (
              <span className="text-[#0B1421] font-semibold">JOURNEY COMPLETE • CONTINUE SCROLLING ↓</span>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ComplaintJourney;
