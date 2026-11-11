import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { countWords, MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import {
  ApplicantFormData,
  ComplaintDetailsData,
  FullComplaintFormState,
  ProblemLocationData,
} from '../../../types';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';
import { PenProgressBar } from './PenProgressBar';
import { Stage1Details } from './Stage1Details';
import { Stage2Location } from './Stage2Location';
import { Stage3Complaint } from './Stage3Complaint';
import { SubmissionGlassModal } from './SubmissionGlassModal';
import { ShieldCheck, Check } from 'lucide-react';

const INITIAL_FORM_STATE: FullComplaintFormState = {
  applicant: { citizenName: '', citizenPhone: '', citizenEmail: '', applicantAddress: '' },
  location: { locality: '', district: '', isDistrictAutoResolved: false, districtNeedsConfirmation: false, publicLocation: '' },
  complaint: { title: '', description: '' },
};

export const CinematicGlassContainer: React.FC = () => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // 1 = Your Details, 2 = Your Location, 3 = Write Complaint
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [errors, setErrors] = useState<{
    applicant: Partial<Record<keyof ApplicantFormData, string>>;
    location: Partial<Record<keyof ProblemLocationData, string>>;
    complaint: Partial<Record<keyof ComplaintDetailsData, string>>;
  }>({ applicant: {}, location: {}, complaint: {} });

  useEffect(() => {
    document.title = ur ? 'شکایت درج کریں — آوازِ عوام' : 'Write a Complaint — Awaaz-e-Awam';
  }, [ur]);

  // Calculations for Stage Readiness and Progress
  const phoneClean = formData.applicant.citizenPhone.replace(/[\s-]/g, '');
  const isPhoneValid = /^((\+92)|(0092)|(03))\d{9}$/.test(phoneClean);
  const isEmailValid =
    !formData.applicant.citizenEmail.trim() ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicant.citizenEmail.trim());

  const stage1Ready = Boolean(formData.applicant.citizenName.trim() && isPhoneValid && isEmailValid);

  const stage2Ready = Boolean(
    formData.location.locality.trim() &&
    formData.location.district
  );

  const descriptionWords = countWords(formData.complaint.description);
  const isOverWordLimit = descriptionWords > MAX_COMPLAINT_WORDS;
  const stage3Ready = Boolean(formData.complaint.description.trim() && !isOverWordLimit);

  // Granular progress (0 to 100%)
  const progress = useMemo(() => {
    let score = 0;
    if (formData.applicant.citizenName.trim().length >= 2) score += 17;
    if (isPhoneValid) score += 17;
    if (formData.location.locality.trim().length > 0) score += 17;
    if (formData.location.district) score += 16;
    if (formData.complaint.description.trim().length > 0 && !isOverWordLimit) score += 33;
    return Math.min(100, score);
  }, [formData.applicant.citizenName, isPhoneValid, formData.location.locality, formData.location.district, formData.complaint.description, isOverWordLimit]);

  // Form Data Handlers
  const updateApplicant = (field: keyof ApplicantFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      applicant: { ...prev.applicant, [field]: value },
    }));
    if (errors.applicant[field]) {
      setErrors((prev) => ({ ...prev, applicant: { ...prev.applicant, [field]: undefined } }));
    }
  };

  const updateLocation = (updates: Partial<ProblemLocationData>) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, ...updates },
    }));
    setErrors((prev) => {
      const locErrors = { ...prev.location };
      Object.keys(updates).forEach((k) => delete locErrors[k as keyof ProblemLocationData]);
      return { ...prev, location: locErrors };
    });
  };

  const updateDescription = (value: string) => {
    // Also adapt internal title to ensure complete compatibility
    const autoTitle = value.trim().slice(0, 50) || (formData.location.locality ? `${formData.location.locality} Complaint` : 'Public Complaint');
    setFormData((prev) => ({
      ...prev,
      complaint: { title: autoTitle, description: value },
    }));
    if (errors.complaint.description) {
      setErrors((prev) => ({
        ...prev,
        complaint: { ...prev.complaint, description: undefined },
      }));
    }
  };

  // Validation functions
  const validateStage1 = (): boolean => {
    const applicantErrors: Partial<Record<keyof ApplicantFormData, string>> = {};
    if (!formData.applicant.citizenName.trim()) {
      applicantErrors.citizenName = t('valNameRequired');
    }
    if (!phoneClean || !isPhoneValid) {
      applicantErrors.citizenPhone = t('valPhoneRequired');
    }
    if (formData.applicant.citizenEmail.trim() && !isEmailValid) {
      applicantErrors.citizenEmail = t('valEmailInvalid');
    }

    if (Object.keys(applicantErrors).length > 0) {
      setErrors((prev) => ({ ...prev, applicant: applicantErrors }));
      const firstInvalidId = applicantErrors.citizenName
        ? 'citizenName'
        : applicantErrors.citizenPhone
        ? 'citizenPhone'
        : 'citizenEmail';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const validateStage2 = (): boolean => {
    const locErrors: Partial<Record<keyof ProblemLocationData, string>> = {};
    if (!formData.location.locality.trim()) {
      locErrors.locality = t('valLocalityRequired');
    }
    if (!formData.location.district) {
      locErrors.district = t('valDistrictRequired');
    }

    if (Object.keys(locErrors).length > 0) {
      setErrors((prev) => ({ ...prev, location: locErrors }));
      const firstInvalidId = locErrors.locality ? 'locality' : 'district';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const validateStage3 = (): boolean => {
    const compErrors: Partial<Record<keyof ComplaintDetailsData, string>> = {};
    if (!formData.complaint.description.trim()) {
      compErrors.description = t('valDescRequired');
    } else if (isOverWordLimit) {
      compErrors.description = t('valDescExceeded');
    }

    if (Object.keys(compErrors).length > 0) {
      setErrors((prev) => ({ ...prev, complaint: compErrors }));
      document.getElementById('description')?.focus();
      return false;
    }
    return true;
  };

  const handleStage1Continue = () => {
    if (validateStage1()) {
      setCurrentStage(2);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleStage2Continue = () => {
    if (validateStage2()) {
      setCurrentStage(3);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleStage3Submit = () => {
    if (!validateStage1()) {
      setCurrentStage(1);
      return;
    }
    if (!validateStage2()) {
      setCurrentStage(2);
      return;
    }
    if (!validateStage3()) {
      return;
    }

    setIsSubmitting(true);
    // Honest submission transition: simulated pending state for 450ms then honest review dialog
    setTimeout(() => {
      setIsSubmitting(false);
      setShowModal(true);
    }, 450);
  };

  // Dynamic editorial titles
  const stageTitles = {
    1: {
      title: t('glassStage1Title'),
      subtitle: t('glassStage1Subtitle'),
    },
    2: {
      title: t('glassStage2Title'),
      subtitle: t('glassStage2Subtitle'),
    },
    3: {
      title: t('glassStage3Title'),
      subtitle: t('glassStage3Subtitle'),
    },
  }[currentStage];

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden -mt-24 sm:-mt-28 -mb-32 sm:-mb-36 pt-28 sm:pt-32 pb-24 sm:pb-32 flex flex-col justify-between">
      {/* 1. Mazar-e-Quaid Atmospheric Background Layer */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <picture>
          <source media="(max-width: 768px)" srcSet={mazarMobile} />
          <img
            src={mazarDesktop}
            alt=""
            className="w-full h-full object-cover object-center filter grayscale contrast-[1.15] brightness-[0.28] scale-105"
          />
        </picture>

        {/* Cinematic Atmospheric Dark & Blood-Maroon Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F]/90 via-[#141414]/85 to-[#0A0A0A]/95" />
        <div className="absolute inset-0 bg-radial-[circle_at_top_right,rgba(104,24,34,0.35)_0%,transparent_60%]" />
        <div className="absolute inset-0 bg-radial-[circle_at_bottom_left,rgba(104,24,34,0.25)_0%,transparent_50%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        {/* Animated Pen Progress Bar (Signature Feature) */}
        <div className="mb-6 sm:mb-8">
          <PenProgressBar
            progress={progress}
            currentStage={currentStage}
            onSelectStage={(st) => {
              if (st === 1) setCurrentStage(1);
              if (st === 2 && (stage1Ready || currentStage >= 2)) setCurrentStage(2);
              if (st === 3 && (stage2Ready || currentStage >= 3)) setCurrentStage(3);
            }}
            stage1Ready={stage1Ready}
            stage2Ready={stage2Ready}
            stage3Ready={stage3Ready}
          />
        </div>

        {/* Balanced Two-Zone Desktop Composition (Reference 2 Inspiration) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* LEFT ZONE: Editorial Introduction & Stage Navigator */}
          <div className="lg:col-span-5 flex flex-col justify-between text-start space-y-6 lg:py-4">
            <div className="space-y-4">
              {/* Identity Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#E89BA4] animate-pulse" />
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-white/80 font-semibold">
                  Awaaz-e-Awam • Civic Intake
                </span>
              </div>

              {/* Dynamic Editorial Headline */}
              <div className="space-y-2">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-[1.15]">
                  {stageTitles.title}
                </h1>
                <p className="text-sm sm:text-base text-white/70 font-ui leading-relaxed">
                  {stageTitles.subtitle}
                </p>
              </div>
            </div>

            {/* Stage Summary Cards / Pills (Reference 2 Left-Column Inspiration) */}
            <div className="space-y-2.5 pt-2">
              {/* Stage 1 Pill */}
              <div
                onClick={() => setCurrentStage(1)}
                className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                  currentStage === 1
                    ? 'border-[#681822] bg-[#681822]/20 backdrop-blur-md ring-1 ring-[#681822]/50 shadow-lg shadow-[#681822]/20'
                    : stage1Ready
                    ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'border-white/10 bg-white/[0.02] opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold ${
                    stage1Ready ? 'bg-[#681822] text-white' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage1Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '01'}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white font-ui">
                      {t('glassPillStage1')}
                    </span>
                    <span className="block text-[11px] text-white/50 font-ui">
                      {formData.applicant.citizenName || (ur ? 'نام اور رابطہ' : 'Name & Phone')}
                    </span>
                  </div>
                </div>
                {currentStage === 1 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E89BA4] shadow-[0_0_6px_#E89BA4]" />
                )}
              </div>

              {/* Stage 2 Pill */}
              <div
                onClick={() => {
                  if (stage1Ready || currentStage >= 2) setCurrentStage(2);
                }}
                className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                  currentStage === 2
                    ? 'border-[#681822] bg-[#681822]/20 backdrop-blur-md ring-1 ring-[#681822]/50 shadow-lg shadow-[#681822]/20 cursor-pointer'
                    : stage2Ready
                    ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer'
                    : stage1Ready
                    ? 'border-white/10 bg-white/[0.02] cursor-pointer'
                    : 'border-white/10 bg-white/[0.02] opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold ${
                    stage2Ready ? 'bg-[#681822] text-white' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage2Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '02'}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white font-ui">
                      {t('glassPillStage2')}
                    </span>
                    <span className="block text-[11px] text-white/50 font-ui">
                      {formData.location.locality ? `${formData.location.locality} (${formData.location.district})` : (ur ? 'کراچی کا علاقہ' : 'Karachi Locality')}
                    </span>
                  </div>
                </div>
                {currentStage === 2 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E89BA4] shadow-[0_0_6px_#E89BA4]" />
                )}
              </div>

              {/* Stage 3 Pill */}
              <div
                onClick={() => {
                  if (stage2Ready || currentStage === 3) setCurrentStage(3);
                }}
                className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                  currentStage === 3
                    ? 'border-[#681822] bg-[#681822]/20 backdrop-blur-md ring-1 ring-[#681822]/50 shadow-lg shadow-[#681822]/20 cursor-pointer'
                    : stage3Ready
                    ? 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer'
                    : stage2Ready
                    ? 'border-white/10 bg-white/[0.02] cursor-pointer'
                    : 'border-white/10 bg-white/[0.02] opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold ${
                    stage3Ready ? 'bg-[#681822] text-white' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage3Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '03'}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white font-ui">
                      {t('glassPillStage3')}
                    </span>
                    <span className="block text-[11px] text-white/50 font-ui">
                      {descriptionWords > 0 ? `${descriptionWords} ${t('formWordCounter')}` : (ur ? 'مسئلہ کی تفصیل' : 'Complaint Narrative')}
                    </span>
                  </div>
                </div>
                {currentStage === 3 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E89BA4] shadow-[0_0_6px_#E89BA4]" />
                )}
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/60 font-ui leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#FFCCD2] shrink-0 mt-0.5" />
                <span>{t('glassPrivacyReminder')}</span>
              </div>
            </div>
          </div>

          {/* RIGHT ZONE: Interactive Dark Glassmorphism Form Panel (Reference 2) */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl border border-white/15 bg-[#121212]/85 backdrop-blur-2xl p-6 sm:p-8 md:p-9 shadow-[0_32px_80px_rgba(0,0,0,0.65)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300">
              {/* Subtle Inset Ambient Glow in Header of Panel */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#681822]/20 rounded-full filter blur-3xl pointer-events-none" />

              {/* Stage Sub-header indicator inside card */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/10 font-mono text-[11px] font-bold text-white tracking-wider">
                    0{currentStage}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70 font-ui">
                    {currentStage === 1 && t('glassPillStage1')}
                    {currentStage === 2 && t('glassPillStage2')}
                    {currentStage === 3 && t('glassPillStage3')}
                  </span>
                </div>
                <div className="text-xs font-mono text-white/50">
                  {currentStage} / 3
                </div>
              </div>

              {/* Render Active Stage */}
              {currentStage === 1 && (
                <Stage1Details
                  data={formData.applicant}
                  onChange={updateApplicant}
                  errors={errors.applicant}
                  onContinue={handleStage1Continue}
                />
              )}

              {currentStage === 2 && (
                <Stage2Location
                  data={formData.location}
                  applicantAddress={formData.applicant.applicantAddress}
                  onChangeLocation={updateLocation}
                  onChangeAddress={(val) => updateApplicant('applicantAddress', val)}
                  errors={errors.location}
                  onContinue={handleStage2Continue}
                  onBack={() => setCurrentStage(1)}
                />
              )}

              {currentStage === 3 && (
                <Stage3Complaint
                  description={formData.complaint.description}
                  onChangeDescription={updateDescription}
                  wordCount={descriptionWords}
                  error={errors.complaint.description}
                  isSubmitting={isSubmitting}
                  onSubmit={handleStage3Submit}
                  onBack={() => setCurrentStage(2)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Honest Prototype Preview Modal (Section 5) */}
      <SubmissionGlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
        onEditStage={(st) => {
          setCurrentStage(st);
        }}
      />
    </div>
  );
};
