import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { countWords, MAX_COMPLAINT_WORDS } from '../../utils/wordCounter';
import {
  FullComplaintFormState,
  ApplicantFormData,
  ProblemLocationData,
  ComplaintDetailsData,
  PersistableComplaintData,
} from '../../types';
import { Send, RotateCcw } from 'lucide-react';
import { ApplicantDetailsSection } from './components/ApplicantDetailsSection';
import { ProblemLocationSection } from './components/ProblemLocationSection';
import { ComplaintDetailsSection } from './components/ComplaintDetailsSection';
import { ComplaintReviewModal } from './components/ComplaintReviewModal';

export interface ComplaintFormProps {
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

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ embedded = false }) => {
  const { t } = useLanguage();

  // Three-part organized form state
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM_STATE);

  // Grouped validation errors
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

  // Live word counter for complaint description
  const descriptionWords = countWords(formData.complaint.description);

  // Field update handlers
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

  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({ applicant: {}, location: {}, complaint: {} });
  };

  // Comprehensive Form Validation
  const validateForm = (): boolean => {
    const applicantErrors: Partial<Record<keyof ApplicantFormData, string>> = {};
    const locationErrors: Partial<Record<keyof ProblemLocationData, string>> = {};
    const complaintErrors: Partial<Record<keyof ComplaintDetailsData, string>> = {};

    // 1. Applicant Details Validation
    if (!formData.applicant.citizenName.trim()) {
      applicantErrors.citizenName = t('valNameRequired');
    }

    const phoneClean = formData.applicant.citizenPhone.replace(/[\s-]/g, '');
    const phoneRegex = /^((\+92)|(0092)|(03))\d{9}$/;
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      applicantErrors.citizenPhone = t('valPhoneRequired');
    }

    if (formData.applicant.citizenEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.applicant.citizenEmail.trim())) {
        applicantErrors.citizenEmail = t('valEmailInvalid');
      }
    }

    // 2. Problem Location Validation
    if (!formData.location.locality.trim()) {
      locationErrors.locality = t('valLocalityRequired');
    }

    if (!formData.location.district) {
      locationErrors.district = t('valDistrictRequired');
    }

    if (!formData.location.publicLocation.trim()) {
      locationErrors.publicLocation = t('valPublicLocationRequired') || t('valStreetLandmarkRequired');
    }

    // 3. Complaint Details Validation
    if (!formData.complaint.title.trim()) {
      complaintErrors.title = t('valTitleRequired') || t('valSubjectRequired');
    }

    if (!formData.complaint.description.trim()) {
      complaintErrors.description = t('valDescRequired');
    } else if (descriptionWords > MAX_COMPLAINT_WORDS) {
      complaintErrors.description = t('valDescExceeded');
    }

    const hasApplicantErrors = Object.keys(applicantErrors).length > 0;
    const hasLocationErrors = Object.keys(locationErrors).length > 0;
    const hasComplaintErrors = Object.keys(complaintErrors).length > 0;

    setErrors({
      applicant: applicantErrors,
      location: locationErrors,
      complaint: complaintErrors,
    });

    return !hasApplicantErrors && !hasLocationErrors && !hasComplaintErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus first erroneous input element
      const firstInvalidId =
        (errors.applicant.citizenName && 'citizenName') ||
        (errors.applicant.citizenPhone && 'citizenPhone') ||
        (errors.applicant.citizenEmail && 'citizenEmail') ||
        (errors.location.locality && 'locality') ||
        (errors.location.district && 'district') ||
        (errors.location.publicLocation && 'publicLocation') ||
        (errors.complaint.title && 'title') ||
        (errors.complaint.description && 'description');

      if (firstInvalidId) {
        document.getElementById(firstInvalidId)?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    /**
     * PRIVACY DATA ISOLATION DEMONSTRATION:
     * When building a persistable complaint record, phone and applicant residential address
     * are strictly omitted via explicit allowlist mapping.
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

    // Client-side validation delay before showing honest review modal
    setTimeout(() => {
      setIsSubmitting(false);
      setShowModal(true);
    }, 350);
  };

  return (
    <div className="w-full bg-[#F7F6F3] min-h-screen">
      <div
        className={`max-w-5xl mx-auto px-4 sm:px-8 text-start ${
          embedded ? 'py-2' : 'pt-24 sm:pt-28 pb-20 sm:pb-28'
        }`}
      >
        {/* Prominent Page Heading (Modern Civic Editorial) */}
        {!embedded && (
          <div className="mb-10 sm:mb-12 space-y-2">
            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-[#141414] uppercase tracking-tight leading-[0.98]">
              {t('formTitle')}
            </h1>
            <p className="text-sm sm:text-base text-[#555] font-normal leading-relaxed font-ui max-w-2xl">
              {t('formSubtitle')}
            </p>
          </div>
        )}

        {/* Form Container (Clean Canvas - No Fake Paper, No Ruled Lines) */}
        <form onSubmit={handleSubmit} noValidate className="space-y-10 sm:space-y-12">
          {/* SECTION 1: APPLICANT DETAILS */}
          <ApplicantDetailsSection
            data={formData.applicant}
            onChange={handleApplicantChange}
            errors={errors.applicant}
          />

          {/* SECTION 2: PROBLEM LOCATION */}
          <ProblemLocationSection
            data={formData.location}
            onChange={handleLocationChange}
            errors={errors.location}
          />

          {/* SECTION 3: COMPLAINT DETAILS */}
          <ComplaintDetailsSection
            data={formData.complaint}
            onChange={handleComplaintChange}
            errors={errors.complaint}
            wordCount={descriptionWords}
          />

          {/* FORM ACTIONS */}
          <div className="pt-4 border-t border-[#E5E3E0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              className="w-full sm:w-auto px-5 tracking-wide text-xs font-bold"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {t('formClear')}
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={descriptionWords > MAX_COMPLAINT_WORDS}
              leftIcon={<Send className="w-3.5 h-3.5 text-white" />}
              className="w-full sm:w-auto px-7 tracking-wide text-xs font-bold bg-[#681822] hover:bg-[#52131b] text-white border-transparent"
            >
              {isSubmitting ? t('formSubmitting') : t('formSubmitButton')}
            </Button>
          </div>
        </form>
      </div>

      {/* Honest Application Review Modal */}
      <ComplaintReviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        formData={formData}
      />
    </div>
  );
};
