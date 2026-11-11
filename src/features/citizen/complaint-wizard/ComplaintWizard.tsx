import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { countWords, MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import {
  FullComplaintFormState,
  ApplicantFormData,
  ProblemLocationData,
  ComplaintDetailsData,
  PersistableComplaintData,
} from '../../../types';
import { WizardShell } from './WizardShell';
import { ProblemStep } from './ProblemStep';
import { LocationStep } from './LocationStep';
import { ApplicantStep } from './ApplicantStep';
import { ReviewStep } from './ReviewStep';
import { ComplaintReviewModal } from '../components/ComplaintReviewModal';

export interface ComplaintWizardProps {
  embedded?: boolean;
}

const INITIAL_FORM_STATE: FullComplaintFormState = {
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
};

export const ComplaintWizard: React.FC<ComplaintWizardProps> = () => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Synchronize document.title
  useEffect(() => {
    document.title = ur ? 'شکایت درج کریں — آوازِ عوام' : 'Write a Complaint — Awaaz-e-Awam';
  }, [ur]);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM_STATE);

  const [errors, setErrors] = useState<{
    applicant: Partial<Record<keyof ApplicantFormData, string>>;
    location: Partial<Record<keyof ProblemLocationData, string>>;
    complaint: Partial<Record<keyof ComplaintDetailsData, string>>;
  }>({
    applicant: {},
    location: {},
    complaint: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Keep each new casefile stage legible after a lower-page action advances it.
  useEffect(() => {
    if (currentStep === 1) return;
    const flow = document.getElementById('casefile-flow');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    flow?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [currentStep]);

  const descriptionWords = countWords(formData.complaint.description);
  const isOverWordLimit = descriptionWords > MAX_COMPLAINT_WORDS;

  // Field update handlers (State preservation across transitions)
  const handleComplaintChange = (field: keyof ComplaintDetailsData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      complaint: { ...prev.complaint, [field]: value },
    }));
    if (errors.complaint[field]) {
      setErrors((prev) => {
        const next = { ...prev, complaint: { ...prev.complaint } };
        delete next.complaint[field];
        return next;
      });
    }
  };

  const handleLocationChange = (updates: Partial<ProblemLocationData>) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, ...updates },
    }));
    setErrors((prev) => {
      const nextLoc = { ...prev.location };
      Object.keys(updates).forEach((k) => {
        delete nextLoc[k as keyof ProblemLocationData];
      });
      return { ...prev, location: nextLoc };
    });
  };

  const handleApplicantChange = (field: keyof ApplicantFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      applicant: { ...prev.applicant, [field]: value },
    }));
    if (errors.applicant[field]) {
      setErrors((prev) => {
        const next = { ...prev, applicant: { ...prev.applicant } };
        delete next.applicant[field];
        return next;
      });
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({ applicant: {}, location: {}, complaint: {} });
    setCurrentStep(1);
  };

  // Step-Specific Validation Routines
  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof ComplaintDetailsData, string>> = {};
    if (!formData.complaint.title.trim()) {
      errs.title = t('valTitleRequired') || t('valSubjectRequired');
    }
    if (!formData.complaint.description.trim()) {
      errs.description = t('valDescRequired');
    } else if (descriptionWords > MAX_COMPLAINT_WORDS) {
      errs.description = t('valDescExceeded');
    }

    setErrors((prev) => ({ ...prev, complaint: errs }));
    if (Object.keys(errs).length > 0) {
      const firstInvalidId = errs.title ? 'title' : 'description';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof ProblemLocationData, string>> = {};
    if (!formData.location.locality.trim()) {
      errs.locality = t('valLocalityRequired');
    }
    if (!formData.location.district) {
      errs.district = t('valDistrictRequired');
    }
    if (!formData.location.publicLocation.trim()) {
      errs.publicLocation = t('valPublicLocationRequired') || t('valStreetLandmarkRequired');
    }

    setErrors((prev) => ({ ...prev, location: errs }));
    if (Object.keys(errs).length > 0) {
      const firstInvalidId = errs.locality ? 'locality' : errs.district ? 'district' : 'publicLocation';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const errs: Partial<Record<keyof ApplicantFormData, string>> = {};
    if (!formData.applicant.citizenName.trim()) {
      errs.citizenName = t('valNameRequired');
    }
    const phoneClean = formData.applicant.citizenPhone.replace(/[\s-]/g, '');
    const phoneRegex = /^((\+92)|(0092)|(03))\d{9}$/;
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      errs.citizenPhone = t('valPhoneRequired');
    }
    if (formData.applicant.citizenEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.applicant.citizenEmail.trim())) {
        errs.citizenEmail = t('valEmailInvalid');
      }
    }

    setErrors((prev) => ({ ...prev, applicant: errs }));
    if (Object.keys(errs).length > 0) {
      const firstInvalidId = errs.citizenName ? 'citizenName' : errs.citizenPhone ? 'citizenPhone' : 'citizenEmail';
      document.getElementById(firstInvalidId)?.focus();
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (validateStep3()) setCurrentStep(4);
    } else if (currentStep === 4) {
      // Final submission of client prototype
      if (!validateStep1() || !validateStep2() || !validateStep3()) {
        return;
      }

      setIsSubmitting(true);

      /**
       * PRIVACY DATA MINIMIZATION:
       * Phone number and applicant residential address are strictly excluded from persistent
       * complaint records and payloads.
       */
      const _persistablePayload: PersistableComplaintData = {
        citizenName: formData.applicant.citizenName,
        district: formData.location.district as any,
        locality: formData.location.locality,
        publicLocation: formData.location.publicLocation,
        title: formData.complaint.title,
        description: formData.complaint.description,
        detectedLanguage: /[\u0600-\u06FF]/.test(formData.complaint.description) ? 'urdu' : 'roman_urdu',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      };
      void _persistablePayload;

      setTimeout(() => {
        setIsSubmitting(false);
        setShowModal(true);
      }, 350);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleEditSection = (targetStep: number) => {
    setCurrentStep(targetStep);
  };

  // Step Header Information
  const stepHeadings = [
    {
      title: t('wizardStep1Heading'),
      subtitle: t('wizardStep1Subtitle'),
    },
    {
      title: t('wizardStep2Heading'),
      subtitle: t('wizardStep2Subtitle'),
    },
    {
      title: t('wizardStep3Heading'),
      subtitle: t('wizardStep3Subtitle'),
    },
    {
      title: t('wizardStep4Heading'),
      subtitle: t('wizardStep4Subtitle'),
    },
  ];

  const currentMeta = stepHeadings[currentStep - 1] || stepHeadings[0];

  return (
    <>
      <WizardShell
        currentStep={currentStep}
        totalSteps={4}
        stepTitle={currentMeta.title}
        stepSubtitle={currentMeta.subtitle}
        onBack={handleBack}
        onContinue={handleContinue}
        isSubmitting={isSubmitting}
        canContinue={!isOverWordLimit}
        onReset={handleReset}
      >
        {currentStep === 1 && (
          <ProblemStep
            data={formData.complaint}
            onChange={handleComplaintChange}
            errors={errors.complaint}
            wordCount={descriptionWords}
          />
        )}

        {currentStep === 2 && (
          <LocationStep
            data={formData.location}
            onChange={handleLocationChange}
            errors={errors.location}
          />
        )}

        {currentStep === 3 && (
          <ApplicantStep
            data={formData.applicant}
            onChange={handleApplicantChange}
            errors={errors.applicant}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            formData={formData}
            onEditSection={handleEditSection}
          />
        )}
      </WizardShell>

      {/* Honest Application Review Modal */}
      <ComplaintReviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
      />
    </>
  );
};
