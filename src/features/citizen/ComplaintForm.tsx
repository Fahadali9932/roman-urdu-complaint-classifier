import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { Button } from '../../components/common/Button';
import { WordCounter } from '../../components/common/WordCounter';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import { countWords, MAX_COMPLAINT_WORDS } from '../../utils/wordCounter';
import { formatDateOnly } from '../../utils/dateFormatter';
import { type KarachiDistrict, type SubmissionResult } from '../../types';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  Lock,
  Building,
} from 'lucide-react';

const KARACHI_DISTRICTS: { value: KarachiDistrict; label: string }[] = [
  { value: 'District East', label: 'District East (Gulshan, Jamshed Town)' },
  { value: 'District Central', label: 'District Central (Nazimabad, Liaquatabad, North Nazimabad)' },
  { value: 'District South', label: 'District South (Saddar, Clifton, Defense)' },
  { value: 'District West', label: 'District West (SITE, Orangi, Baldia)' },
  { value: 'District Korangi', label: 'District Korangi (Korangi, Landhi, Shah Faisal)' },
  { value: 'District Malir', label: 'District Malir (Bin Qasim, Gadap, Airport)' },
  { value: 'District Keamari', label: 'District Keamari (Harbour, Baldia, Mauripur)' },
];

export const ComplaintForm: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Form fields state
  const [formData, setFormData] = useState({
    citizenName: '',
    citizenPhone: '',
    district: '' as KarachiDistrict,
    locality: '',
    privateAddress: '',
    title: '',
    description: '',
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derived word count for complaint description
  const descriptionWords = countWords(formData.description);

  // Automatically formatted current date for formal paper application header
  const [currentDateIso] = useState(() => new Date().toISOString());
  const todayFormatted = formatDateOnly(currentDateIso, language);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.citizenName.trim()) {
      newErrors.citizenName = t('valNameRequired');
    }

    // Phone validation (Pakistani formats: 03XXXXXXXXX or +923XXXXXXXXX)
    const phoneClean = formData.citizenPhone.replace(/[\s-]/g, '');
    const phoneRegex = /^((\+92)|(0092)|(03))\d{9}$/;
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      newErrors.citizenPhone = t('valPhoneRequired');
    }

    if (!formData.district) {
      newErrors.district = t('valDistrictRequired');
    }

    if (!formData.locality.trim()) {
      newErrors.locality = t('valLocalityRequired');
    }

    if (!formData.title.trim() || formData.title.trim().length < 5) {
      newErrors.title = t('valTitleRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('valDescRequired');
    } else if (descriptionWords > MAX_COMPLAINT_WORDS) {
      newErrors.description = `${t('valDescExceeded')} (${descriptionWords} / ${MAX_COMPLAINT_WORDS} words)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await complaintService.submitComplaint({
        citizenName: formData.citizenName.trim(),
        citizenPhone: formData.citizenPhone.trim(),
        district: formData.district,
        locality: formData.locality.trim(),
        privateAddress: formData.privateAddress.trim() || undefined,
        title: formData.title.trim(),
        description: formData.description.trim(),
      });

      setSubmissionResult(result);
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (submissionResult?.referenceNumber) {
      navigator.clipboard.writeText(submissionResult.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTrackNow = () => {
    if (submissionResult?.referenceNumber) {
      setShowModal(false);
      navigate(`/track/${submissionResult.referenceNumber}`);
    }
  };

  return (
    <div className="py-8 sm:py-12">
      <Container size="md">
        {/* Minimal Page Heading */}
        <div className="text-center space-y-1.5 mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C3033] tracking-tight">
            {t('paperFormTitle') || t('formTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#667578] max-w-lg mx-auto">
            {t('paperFormSubtitle') || t('formSubtitle')}
          </p>
        </div>

        {/* Paper-Style Application Sheet */}
        <div className="paper-sheet rounded-xl p-6 sm:p-10 max-w-2xl mx-auto text-start">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 1. Formal Paper Header */}
            <div className="pb-4 border-b border-[#E5E9E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#193D3D] uppercase tracking-wider text-[11px]">
                  {t('paperDocHeader') || 'CITIZEN CIVIC GRIEVANCE APPLICATION'}
                </span>
              </div>
              <div className="text-[#667578] flex items-center gap-1 font-mono text-[11px]">
                <span>{t('paperDateLabel') || 'Date'}:</span>
                <span className="font-semibold text-[#1C3033]">{todayFormatted}</span>
              </div>
            </div>

            {/* 2. Official Recipient Line */}
            <div className="p-3 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7] flex items-start gap-2.5 text-xs">
              <Building className="w-4 h-4 text-[#087F76] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#1C3033] block">
                  {t('paperDocTo') || 'To: Concerned Service Department, Karachi'}
                </span>
                <span className="text-[#667578] text-[11px] block mt-0.5">
                  {t('paperRoutingNotice') || t('formDeptNoteText')}
                </span>
              </div>
            </div>

            {/* 3. Subject Line Field */}
            <div>
              <Input
                label={t('formComplaintTitle')}
                required
                id="title"
                placeholder={t('formComplaintTitlePlaceholder')}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                error={errors.title}
                className="bg-white border-[#E5E9E7] focus:border-[#087F76]"
              />
            </div>

            {/* 4. Natural Application Writing Area */}
            <div className="space-y-2">
              <Textarea
                label={t('formDescription')}
                required
                id="description"
                rows={6}
                placeholder={t('formDescriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={errors.description}
                className="paper-textarea font-sans text-sm sm:text-base leading-relaxed p-4"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-[#667578]">
                <p className="italic text-[11px]">
                  Example: "{t('formRomanUrduExample')}"
                </p>
                <WordCounter currentCount={descriptionWords} maxWords={MAX_COMPLAINT_WORDS} />
              </div>
            </div>

            {/* 5. Applicant & Location Information Section */}
            <div className="pt-4 border-t border-[#E5E9E7] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C3033]">
                  {t('paperApplicantSection') || 'Applicant & Incident Location'}
                </h2>
                <span className="text-[11px] text-[#667578] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#087F76]" />
                  <span>{t('paperPrivacyNotice') || 'Contact details kept private'}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('formCitizenName')}
                  required
                  id="citizenName"
                  placeholder={t('formCitizenNamePlaceholder')}
                  value={formData.citizenName}
                  onChange={(e) => handleChange('citizenName', e.target.value)}
                  error={errors.citizenName}
                />

                <Input
                  label={t('formPhone')}
                  required
                  id="citizenPhone"
                  placeholder={t('formPhonePlaceholder')}
                  value={formData.citizenPhone}
                  onChange={(e) => handleChange('citizenPhone', e.target.value)}
                  error={errors.citizenPhone}
                  helperText="Format: 03XXXXXXXXX"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label={t('formDistrict')}
                  required
                  id="district"
                  placeholder={t('formDistrictPlaceholder')}
                  options={KARACHI_DISTRICTS}
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  error={errors.district}
                />

                <Input
                  label={t('formLocality')}
                  required
                  id="locality"
                  placeholder={t('formLocalityPlaceholder')}
                  value={formData.locality}
                  onChange={(e) => handleChange('locality', e.target.value)}
                  error={errors.locality}
                />
              </div>

              <Input
                label={t('formAddress')}
                id="privateAddress"
                placeholder={t('formAddressPlaceholder')}
                value={formData.privateAddress}
                onChange={(e) => handleChange('privateAddress', e.target.value)}
                helperText={t('formPrivacyNote')}
              />
            </div>

            {/* 6. Submission Action & Fictional Disclaimer */}
            <div className="pt-4 border-t border-[#E5E9E7] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-[#667578]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087F76] shrink-0" />
                <span>Client prototype mode • Supabase database connected in Phase 2</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={descriptionWords > MAX_COMPLAINT_WORDS}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto bg-[#193D3D] hover:bg-[#1C3033] text-white"
              >
                {isSubmitting ? t('formSubmitting') : t('formSubmitButton')}
              </Button>
            </div>
          </form>
        </div>
      </Container>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('modalTitle')}
      >
        <div className="space-y-4 text-start">
          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E9E7] flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#087F76] shrink-0" />
            <div>
              <span className="block text-xs text-[#667578] font-medium">
                {t('modalRefLabel')}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="ref-code text-lg sm:text-xl font-bold text-[#1C3033]">
                  {submissionResult?.referenceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 rounded text-[#667578] hover:text-[#1C3033] hover:bg-[#E5E9E7]/50 transition-colors cursor-pointer"
                  title="Copy reference number"
                  aria-label="Copy reference number"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copied && (
                  <span className="text-xs text-[#087F76] font-medium">Copied!</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-[#667578] leading-relaxed">
            {t('modalBody1')}
          </p>

          <AlertBanner
            type="warning"
            title={t('modalNoticeHeader')}
          >
            {t('modalNoticeText')}
          </AlertBanner>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowModal(false);
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto text-[#667578]"
            >
              {t('modalClose')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTrackNow}
              rightIcon={<ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />}
              className="w-full sm:w-auto bg-[#193D3D] hover:bg-[#1C3033]"
            >
              {t('modalTrackNow')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
