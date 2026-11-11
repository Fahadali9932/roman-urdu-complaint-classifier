import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { ApplicantFormData, ProblemLocationData, FullComplaintFormState } from '../../../types';
import { PenProgressBar } from './PenProgressBar';
import { Stage1Details } from './Stage1Details';
import { Stage2Location } from './Stage2Location';
import { Stage3Complaint } from './Stage3Complaint';
import { SubmissionGlassModal } from './SubmissionGlassModal';
import { ShieldCheck, Check } from 'lucide-react';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';

export const CinematicGlassContainer: React.FC = () => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Active Stage: 1 = Details, 2 = Location, 3 = Complaint
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState<FullComplaintFormState>({
    applicant: {
      citizenName: '',
      citizenPhone: '',
      citizenEmail: '',
      applicantAddress: '',
    },
    location: {
      locality: '',
      district: '',
      isDistrictAutoResolved: false,
      districtNeedsConfirmation: false,
      publicLocation: '',
    },
    complaint: {
      title: '',
      description: '',
    },
  });

  // Validation Errors
  const [errors, setErrors] = useState<{
    applicant: Partial<Record<keyof ApplicantFormData, string>>;
    location: Partial<Record<keyof ProblemLocationData, string>>;
    complaint: { description?: string };
  }>({
    applicant: {},
    location: {},
    complaint: {},
  });

  // Submission State & Modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Phone validation helper (Pakistani formats: 03XXXXXXXXX or +923XXXXXXXXX)
  const phoneClean = formData.applicant.citizenPhone.replace(/[\s-]/g, '');
  const isPhoneValid = /^(?:(?:\+92|0092|92)\s*3\d{2}|03\d{2})[-.\s]?\d{7}$/.test(
    formData.applicant.citizenPhone.trim()
  );

  // Email format validation (optional field, but if entered must be valid)
  const isEmailValid =
    !formData.applicant.citizenEmail.trim() ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicant.citizenEmail.trim());

  // Real Validation-Driven Progress Calculation (0 to 100%)
  const stage1Ready = Boolean(formData.applicant.citizenName.trim() && isPhoneValid && isEmailValid);
  const stage2Ready = Boolean(formData.location.locality.trim() && formData.location.district);

  // Count description words for stage 3
  const descriptionWords = useMemo(() => {
    const text = formData.complaint.description.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [formData.complaint.description]);

  const stage3Ready = descriptionWords >= 1 && descriptionWords <= 200;

  // Calculate actual completion percentage based strictly on completed valid requirements:
  // - Stage 1 valid = 34%
  // - Stage 2 valid = 33%
  // - Stage 3 valid = 33%
  // Total = 100%
  const progress = useMemo(() => {
    let p = 0;
    // Stage 1 breakdown:
    if (formData.applicant.citizenName.trim()) p += 17;
    if (isPhoneValid) p += 17;

    // Stage 2 breakdown:
    if (formData.location.locality.trim()) p += 17;
    if (formData.location.district) p += 16;

    // Stage 3 breakdown:
    if (stage3Ready) {
      p += 33;
    } else if (descriptionWords > 0) {
      p += Math.min(25, Math.round((descriptionWords / 15) * 25));
    }

    return Math.min(100, p);
  }, [
    formData.applicant.citizenName,
    isPhoneValid,
    formData.location.locality,
    formData.location.district,
    stage3Ready,
    descriptionWords,
  ]);

  // Field change handlers
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
    const locationErrors: Partial<Record<keyof ProblemLocationData, string>> = {};
    if (!formData.location.locality.trim()) {
      locationErrors.locality = t('valLocalityRequired');
    }
    if (!formData.location.district) {
      locationErrors.district = t('valDistrictRequired');
    }

    if (Object.keys(locationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, location: locationErrors }));
      const firstInvalidId = locationErrors.locality ? 'locality' : 'district';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const validateStage3 = (): boolean => {
    if (!formData.complaint.description.trim()) {
      setErrors((prev) => ({
        ...prev,
        complaint: { description: t('valDescRequired') },
      }));
      document.getElementById('description')?.focus();
      return false;
    }
    if (descriptionWords > 200) {
      setErrors((prev) => ({
        ...prev,
        complaint: {
          description: ur
            ? 'شکایت ۲۰۰ الفاظ سے زیادہ ہے، برائے مہربانی مختصر کریں'
            : 'Complaint exceeds the 200-word limit. Please shorten your description.',
        },
      }));
      document.getElementById('description')?.focus();
      return false;
    }
    return true;
  };

  // Stage transition handlers
  const handleStage1Continue = () => {
    if (validateStage1()) {
      setCurrentStage(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStage2Continue = () => {
    if (validateStage2()) {
      setCurrentStage(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStage3Submit = () => {
    if (!validateStage3()) return;

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
      {/* 1. Mazar-e-Quaid Atmospheric Background Layer (Visible & Recognizable) */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <picture>
          <source media="(max-width: 768px)" srcSet={mazarMobile} />
          <img
            src={mazarDesktop}
            alt=""
            className="w-full h-full object-cover object-center filter grayscale contrast-[1.10] brightness-[0.72] opacity-60 scale-100"
          />
        </picture>

        {/* Atmospheric Dark & Controlled Maroon Tint (Landmark remains clearly recognizable) */}
        <div className="absolute inset-0 bg-[#08080A]/50 bg-gradient-to-b from-[#08080A]/60 via-[#08080A]/40 to-[#08080A]/70" />
        <div className="absolute inset-0 bg-radial-[circle_at_top_right,rgba(104,24,34,0.22)_0%,transparent_60%]" />
        <div className="absolute inset-0 bg-radial-[circle_at_bottom_left,rgba(104,24,34,0.18)_0%,transparent_50%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col justify-center">
        {/* Animated Pen Progress Bar (Signature Feature: Thick, Fully Rounded 14px Track) */}
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

        {/* Balanced Two-Zone Desktop Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* LEFT ZONE: Editorial Introduction & Stage Navigator */}
          <div className="lg:col-span-5 flex flex-col justify-between text-start space-y-6 lg:py-3">
            <div className="space-y-4">
              {/* Identity Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/18 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#E89BA4]" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/90 font-semibold">
                  Awaaz-e-Awam • Civic Intake
                </span>
              </div>

              {/* Dynamic Editorial Headline */}
              <div className="space-y-2.5">
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-[40px] text-white tracking-tight leading-[1.15]">
                  {stageTitles.title}
                </h1>
                <p className="text-[15px] sm:text-base text-white/80 font-ui leading-relaxed">
                  {stageTitles.subtitle}
                </p>
              </div>
            </div>

            {/* Stage Summary Cards / Pills (Refined Glass Surfaces) */}
            <div className="space-y-2.5 pt-1">
              {/* Stage 1 Pill */}
              <div
                onClick={() => setCurrentStage(1)}
                className={`p-3.5 sm:p-4 rounded-[20px] border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                  currentStage === 1
                    ? 'border-[#681822] bg-[rgba(104,24,34,0.28)] backdrop-blur-xl ring-1 ring-[#681822]/60 shadow-[0_8px_24px_rgba(104,24,34,0.3),inset_0_1px_0_rgba(255,255,255,0.18)]'
                    : stage1Ready
                    ? 'border-white/18 bg-[rgba(22,20,24,0.38)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.08)]'
                    : 'border-white/10 bg-[rgba(22,20,24,0.25)] backdrop-blur-md opacity-70'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                    stage1Ready ? 'bg-[#681822] text-white shadow-[0_0_8px_rgba(104,24,34,0.6)]' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage1Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '01'}
                  </div>
                  <div>
                    <span className="block text-xs sm:text-[13px] font-semibold text-white font-ui">
                      {t('glassPillStage1')}
                    </span>
                    <span className="block text-[11px] sm:text-xs text-white/55 font-ui">
                      {formData.applicant.citizenName || (ur ? 'نام اور رابطہ' : 'Name & Phone')}
                    </span>
                  </div>
                </div>
                {currentStage === 1 && (
                  <span className="w-2 h-2 rounded-full bg-[#E89BA4] shadow-[0_0_8px_#E89BA4]" />
                )}
              </div>

              {/* Stage 2 Pill */}
              <div
                onClick={() => {
                  if (stage1Ready || currentStage >= 2) setCurrentStage(2);
                }}
                className={`p-3.5 sm:p-4 rounded-[20px] border transition-all duration-300 flex items-center justify-between ${
                  currentStage === 2
                    ? 'border-[#681822] bg-[rgba(104,24,34,0.28)] backdrop-blur-xl ring-1 ring-[#681822]/60 shadow-[0_8px_24px_rgba(104,24,34,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] cursor-pointer'
                    : stage2Ready
                    ? 'border-white/18 bg-[rgba(22,20,24,0.38)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer'
                    : stage1Ready
                    ? 'border-white/10 bg-[rgba(22,20,24,0.25)] backdrop-blur-md cursor-pointer'
                    : 'border-white/10 bg-[rgba(22,20,24,0.25)] backdrop-blur-md opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                    stage2Ready ? 'bg-[#681822] text-white shadow-[0_0_8px_rgba(104,24,34,0.6)]' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage2Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '02'}
                  </div>
                  <div>
                    <span className="block text-xs sm:text-[13px] font-semibold text-white font-ui">
                      {t('glassPillStage2')}
                    </span>
                    <span className="block text-[11px] sm:text-xs text-white/55 font-ui">
                      {formData.location.locality ? `${formData.location.locality} (${formData.location.district})` : (ur ? 'کراچی کا علاقہ' : 'Karachi Locality')}
                    </span>
                  </div>
                </div>
                {currentStage === 2 && (
                  <span className="w-2 h-2 rounded-full bg-[#E89BA4] shadow-[0_0_8px_#E89BA4]" />
                )}
              </div>

              {/* Stage 3 Pill */}
              <div
                onClick={() => {
                  if (stage2Ready || currentStage === 3) setCurrentStage(3);
                }}
                className={`p-3.5 sm:p-4 rounded-[20px] border transition-all duration-300 flex items-center justify-between ${
                  currentStage === 3
                    ? 'border-[#681822] bg-[rgba(104,24,34,0.28)] backdrop-blur-xl ring-1 ring-[#681822]/60 shadow-[0_8px_24px_rgba(104,24,34,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] cursor-pointer'
                    : stage3Ready
                    ? 'border-white/18 bg-[rgba(22,20,24,0.38)] backdrop-blur-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer'
                    : stage2Ready
                    ? 'border-white/10 bg-[rgba(22,20,24,0.25)] backdrop-blur-md cursor-pointer'
                    : 'border-white/10 bg-[rgba(22,20,24,0.25)] backdrop-blur-md opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                    stage3Ready ? 'bg-[#681822] text-white shadow-[0_0_8px_rgba(104,24,34,0.6)]' : 'bg-white/10 text-white/70'
                  }`}>
                    {stage3Ready ? <Check className="w-4 h-4 stroke-[2.5]" /> : '03'}
                  </div>
                  <div>
                    <span className="block text-xs sm:text-[13px] font-semibold text-white font-ui">
                      {t('glassPillStage3')}
                    </span>
                    <span className="block text-[11px] sm:text-xs text-white/55 font-ui">
                      {descriptionWords > 0 ? `${descriptionWords} ${t('formWordCounter')}` : (ur ? 'مسئلہ کی تفصیل' : 'Complaint Narrative')}
                    </span>
                  </div>
                </div>
                {currentStage === 3 && (
                  <span className="w-2 h-2 rounded-full bg-[#E89BA4] shadow-[0_0_8px_#E89BA4]" />
                )}
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="pt-1">
              <div className="flex items-start gap-2.5 p-3.5 rounded-[18px] bg-[rgba(22,20,24,0.38)] backdrop-blur-md border border-white/12 text-xs sm:text-[12.5px] text-white/70 font-ui leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#FFCCD2] shrink-0 mt-0.5" />
                <span>{t('glassPrivacyReminder')}</span>
              </div>
            </div>
          </div>

          {/* RIGHT ZONE: Real Glassmorphism Form Panel (Not Opaque Black) */}
          <div className="lg:col-span-7">
            <div className="relative rounded-[28px] border border-white/18 bg-[rgba(22,20,24,0.48)] backdrop-blur-[24px] saturate-[135%] p-6 sm:p-8 md:p-9 shadow-[0_24px_70px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300">
              {/* Soft Inset Ambient Glow in Header of Panel */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#681822]/15 rounded-full filter blur-3xl pointer-events-none" />

              {/* Stage Sub-header indicator inside card */}
              <div className="flex items-center justify-between border-b border-white/12 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-[10px] bg-white/10 font-mono text-xs font-bold text-white tracking-wider border border-white/10">
                    0{currentStage}
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-white/80 font-ui">
                    {currentStage === 1 && t('glassPillStage1')}
                    {currentStage === 2 && t('glassPillStage2')}
                    {currentStage === 3 && t('glassPillStage3')}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-mono text-white/50">
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

      {/* Honest Prototype Preview Modal */}
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
