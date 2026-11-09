import React, { useState } from 'react';
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

export interface ComplaintFormProps {
  embedded?: boolean;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ embedded = false }) => {
  const { t, language } = useLanguage();
  // Form fields state
  const [formData, setFormData] = useState({
    citizenName: '',
    citizenPhone: '',
    district: '' as KarachiDistrict,
    locality: '',
    publicLocation: '',
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

  // Current date for formal application header
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

  const handleReset = () => {
    setFormData({
      citizenName: '',
      citizenPhone: '',
      district: '' as KarachiDistrict,
      locality: '',
      publicLocation: '',
      privateAddress: '',
      title: '',
      description: '',
    });
    setErrors({});
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

    if (!formData.publicLocation.trim()) {
      newErrors.publicLocation = t('valPublicLocationRequired');
    }

    if (!formData.title.trim()) {
      newErrors.title = t('valTitleRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('valDescRequired');
    } else if (descriptionWords > MAX_COMPLAINT_WORDS) {
      newErrors.description = t('valDescExceeded');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.getElementById(firstError)?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    // Simulated short client-side delay for prototype review modal
    setTimeout(() => {
      setIsSubmitting(false);
      setShowModal(true);
    }, 400);
  };

  return (
    <div className="w-full">
      <div className={`max-w-6xl mx-auto px-4 sm:px-8 text-start ${embedded ? 'py-2' : 'py-8 sm:py-12'}`}>

        {/* Page Header within Civic Workspace */}
        {!embedded && (
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-[#681822] uppercase">
                {language === 'ur' ? 'اپنی شکایت لکھیں' : 'Write your complaint'}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#681822]" />
              <span className="text-[11px] font-mono text-[#323232]">
                Awaaz-e-Awam
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-[#141414] uppercase tracking-tight">
              {t('paperFormTitle') || t('formTitle')}
            </h1>
            <p className="text-sm sm:text-base text-[#323232] max-w-2xl font-normal leading-relaxed font-ui">
              {t('paperFormSubtitle') || t('formSubtitle')}
            </p>
          </div>
        )}

        {/* Structured Formal Paper Writing Workspace Container */}
        <div>
          <div className="max-w-4xl mx-auto bg-white border border-[#E5E3E0] rounded-2xl p-6 sm:p-12 shadow-[0_12px_36px_rgba(20,20,20,0.06)] text-start">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">

              {/* Formal Case Header */}
              <div className="pb-4 border-b border-[#E5E3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
                <span className="font-bold text-[#141414] tracking-wider uppercase">
                  {t('paperDocHeader') || 'CITIZEN COMPLAINT APPLICATION'}
                </span>
                <div className="text-[#323232] flex items-center gap-1.5">
                  <span>{t('paperDateLabel') || 'Date'}:</span>
                  <span className="font-bold text-[#141414]">{todayFormatted}</span>
                </div>
              </div>

              {/* Writing guidance */}
              <div className="p-4 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-start gap-3">
                <Building className="w-5 h-5 text-[#681822] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-[#141414] block text-xs sm:text-sm tracking-wide">
                    {language === 'ur' ? 'اپنے مسئلے کی جگہ واضح کریں' : 'Make the location clear'}
                  </span>
                  <span className="text-[#323232] text-xs block leading-relaxed">
                    {language === 'ur'
                      ? 'علاقہ، قریبی نشان اور مسئلے کی تفصیل شامل کریں تاکہ شکایت سمجھنے میں آسانی ہو۔'
                      : 'Include the area, a nearby landmark, and a short description so the issue is easy to understand.'}
                  </span>
                </div>
              </div>

              {/* Subject Field */}
              <div>
                <Input
                  label={t('formComplaintTitle')}
                  required
                  id="title"
                  placeholder={t('formComplaintTitlePlaceholder')}
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  error={errors.title}
                />
              </div>

              {/* Complaint Description (Dominant Visual Focus) */}
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
                  className="font-sans text-sm sm:text-base leading-relaxed p-4 rounded-lg"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-[#323232]">
                  <p className="italic text-xs text-[#323232]">
                    {t('formRomanUrduExample')}
                  </p>
                  <WordCounter
                    currentCount={descriptionWords}
                    maxWords={MAX_COMPLAINT_WORDS}
                    className="w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Applicant & Location Details Section */}
              <div className="pt-6 border-t border-[#E5E3E0] space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-black text-sm tracking-wider text-[#141414] uppercase">
                    {t('paperApplicantSection') || 'Applicant & Location Details'}
                  </h2>
                  <span className="text-xs font-mono text-[#323232]">
                    {language === 'ur' ? 'ضروری معلومات شامل کریں' : 'Include the details that help explain it'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  label={t('formPublicLocation')}
                  required
                  id="publicLocation"
                  placeholder={t('formPublicLocationPlaceholder')}
                  value={formData.publicLocation}
                  onChange={(e) => handleChange('publicLocation', e.target.value)}
                  error={errors.publicLocation}
                  helperText={t('formPublicLocationHelp')}
                />

                <Input
                  label={t('formAddress')}
                  id="privateAddress"
                  placeholder={t('formAddressPlaceholder')}
                  value={formData.privateAddress}
                  onChange={(e) => handleChange('privateAddress', e.target.value)}
                  helperText={t('formPrivacyNote')}
                />
              </div>

              {/* Form Action Controls */}
              <div className="pt-6 border-t border-[#E5E3E0] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[#323232]">
                  <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0" />
                  <span>{language === 'ur' ? 'یہ فارم صرف جائزے کے لیے ہے؛ ابھی کوئی شکایت بھیجی یا محفوظ نہیں ہوتی۔' : 'This form is for review only. It does not send or save a complaint yet.'}</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-5 tracking-wide text-xs font-bold"
                  >
                    {language === 'ur' ? 'صاف کریں' : 'Clear'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={descriptionWords > MAX_COMPLAINT_WORDS}
                    leftIcon={<Send className="w-4 h-4 text-[#FFFFFF]" />}
                    className="w-full sm:w-auto px-7 tracking-wide text-xs font-bold"
                  >
                    {isSubmitting ? t('formSubmitting') : t('formSubmitButton') || 'Review complaint'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Honest Validation Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('modalTitle')}
      >
        <div className="space-y-5 text-start">
          <div className="p-4 sm:p-5 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="space-y-1">
              <span className="block text-sm font-bold text-[#141414] tracking-wide">
                {language === 'ur' ? 'فارم جائزے کے لیے تیار ہے' : 'Your form is ready to review'}
              </span>
              <p className="text-xs text-[#323232]">
                {language === 'ur'
                  ? 'ضروری معلومات اور الفاظ کی حد چیک کر لی گئی ہے۔'
                  : 'The required information and word limit have been checked.'}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#323232] leading-relaxed">
            {t('modalBody1')}
          </p>

          <AlertBanner
            type="info"
            title={t('modalNoticeHeader')}
          >
            {t('modalNoticeText')}
          </AlertBanner>

          <div className="pt-3 flex items-center justify-end">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto tracking-wider text-xs font-bold"
            >
              {language === 'ur' ? 'فارم پر واپس جائیں' : 'Return to form'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
