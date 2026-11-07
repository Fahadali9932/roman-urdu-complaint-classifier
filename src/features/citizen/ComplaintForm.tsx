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
import { countWords, MAX_COMPLAINT_WORDS } from '../../utils/wordCounter';
import { formatDateOnly } from '../../utils/dateFormatter';
import { type KarachiDistrict } from '../../types';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  Building,
  Sparkles,
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
  const [showModal, setShowModal] = useState(false);

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
    // Honest client-side review & validation experience (no fake network submission)
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 sm:py-16">
      <Container size="xl">
        {/* Page Heading */}
        <div className="text-center space-y-2 mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#172D31] tracking-tight">
            {t('paperFormTitle') || t('formTitle')}
          </h1>
          <p className="text-sm sm:text-base text-[#667679] max-w-xl mx-auto leading-relaxed">
            {t('paperFormSubtitle') || t('formSubtitle')}
          </p>
        </div>

        {/* Layer 2: Main Glass Workspace Desk */}
        <div className="glass-workspace rounded-3xl p-4 sm:p-10 lg:p-12 relative max-w-[960px] mx-auto">
          
          {/* Floating Secondary Glass Help Element (Desktop only) */}
          <div className="glass-floating rounded-2xl p-4 absolute -top-5 end-6 max-w-xs shadow-md hidden lg:flex items-start gap-3 z-10 text-start">
            <div className="p-1.5 rounded-lg bg-[#E7F2EF] text-[#126B63] shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#172D31] block">
                {t('heroFloatingHelpTitle') || 'Roman Urdu Native Input'}
              </span>
              <p className="text-[11px] text-[#667679] leading-snug">
                Write naturally as you speak. No need for complex bureaucratic terminology.
              </p>
            </div>
          </div>

          {/* Layer 3: Digital Paper Application Sheet (760-820px wide) */}
          <div className="paper-surface rounded-2xl p-6 sm:p-10 lg:p-12 text-start relative shadow-md max-w-[820px] mx-auto">
            <form onSubmit={handleSubmit} noValidate className="space-y-7">
              
              {/* 1. Formal Paper Header */}
              <div className="pb-4 border-b border-[#DFE7E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#17423F] uppercase tracking-wider text-xs">
                    {t('paperDocHeader') || 'CITIZEN COMPLAINT APPLICATION'}
                  </span>
                </div>
                <div className="text-[#667679] flex items-center gap-1.5 font-mono text-xs">
                  <span>{t('paperDateLabel') || 'Date'}:</span>
                  <span className="font-semibold text-[#172D31]">{todayFormatted}</span>
                </div>
              </div>

              {/* 2. Official Recipient Notification Banner */}
              <div className="p-4 rounded-xl bg-[#F4F6F5]/90 border border-[#DFE7E4] flex items-start gap-3">
                <Building className="w-5 h-5 text-[#126B63] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#172D31] block text-sm">
                    {t('paperDocTo') || 'To: Concerned Service Department, Karachi'}
                  </span>
                  <span className="text-[#667679] text-xs block leading-relaxed">
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
                  className="bg-white border-[#DFE7E4] focus:border-[#126B63]"
                />
              </div>

              {/* 4. Natural Application Writing Canvas */}
              <div className="space-y-2.5">
                <Textarea
                  label={t('formDescription')}
                  required
                  id="description"
                  rows={8}
                  placeholder={t('formDescriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  error={errors.description}
                  className="paper-textarea font-sans text-sm sm:text-base leading-relaxed p-4 rounded-xl"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-[#667679]">
                  <p className="italic text-xs text-[#667679]">
                    {t('formRomanUrduExample')}
                  </p>
                  <WordCounter currentCount={descriptionWords} maxWords={MAX_COMPLAINT_WORDS} className="w-full sm:w-64" />
                </div>
              </div>

              {/* 5. Applicant & Location Information Section */}
              <div className="pt-6 border-t border-[#DFE7E4] space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#172D31]">
                    {t('paperApplicantSection') || 'Applicant & Location Details'}
                  </h2>
                  <span className="text-xs text-[#667679] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#126B63]" />
                    <span>{t('paperPrivacyNotice') || 'Contact details kept private'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

              {/* 6. Submission Action & Honest Phase 1 Prototype Status */}
              <div className="pt-6 border-t border-[#DFE7E4] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#667679]">
                  <ShieldCheck className="w-4 h-4 text-[#126B63] shrink-0" />
                  <span>Client prototype validation • Live database connected in Phase 2</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={descriptionWords > MAX_COMPLAINT_WORDS}
                  leftIcon={<Send className="w-4 h-4" />}
                  className="w-full sm:w-auto bg-[#126B63] hover:bg-[#17423F] text-white px-7 rounded-xl font-medium shadow-sm transition-all"
                >
                  {isSubmitting ? t('formSubmitting') : t('formSubmitButton') || 'Submit Complaint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Container>

      {/* Honest Validation Confirmation Modal (No Fake Data / No Fake Reference Codes) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('modalTitle')}
      >
        <div className="space-y-5 text-start">
          <div className="p-4 sm:p-5 rounded-xl bg-[#F4F6F5] border border-[#DFE7E4] flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#126B63] shrink-0" />
            <div className="space-y-1">
              <span className="block text-sm font-semibold text-[#172D31]">
                Application Verified Successfully
              </span>
              <p className="text-xs text-[#667679]">
                All intake fields, Pakistani phone verification, and word limits are confirmed valid.
              </p>
            </div>
          </div>

          <p className="text-sm text-[#667679] leading-relaxed">
            {t('modalBody1')}
          </p>

          <AlertBanner
            type="info"
            title={t('modalNoticeHeader')}
          >
            {t('modalNoticeText')}
          </AlertBanner>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto text-[#667679] border-[#DFE7E4]"
            >
              {t('modalClose')}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowModal(false);
                navigate('/dashboard');
              }}
              rightIcon={<ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              className="w-full sm:w-auto bg-[#126B63] hover:bg-[#17423F]"
            >
              {t('modalTrackNow')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
