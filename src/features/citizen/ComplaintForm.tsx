import React, { useState } from 'react';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import { useLanguage } from '../../context/LanguageContext';
import { countWords, MAX_COMPLAINT_WORDS } from '../../utils/wordCounter';
import { type KarachiDistrict } from '../../types';
import { Send, ShieldCheck, CheckCircle2, RotateCcw, MapPin, User, FileText } from 'lucide-react';
import { ApplicationPaper } from './components/ApplicationPaper';
import { KarachiAreaCombobox } from './components/KarachiAreaCombobox';
import { RuledComplaintTextarea } from './components/RuledComplaintTextarea';
import { KARACHI_DISTRICTS_DATA } from '../../data/karachi/districts';

const KARACHI_DISTRICTS: { value: KarachiDistrict; label: string }[] = KARACHI_DISTRICTS_DATA.map((d) => ({
  value: d.id,
  label: `${d.name} (${d.headquarters})`,
}));

export interface ComplaintFormProps {
  embedded?: boolean;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ embedded = false }) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

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

  const handleLocalitySelect = (localityName: string, matchedDistrict?: KarachiDistrict) => {
    setFormData((prev) => ({
      ...prev,
      locality: localityName,
      // If user has not picked a district or area belongs to a specific district, auto-populate
      district: prev.district || matchedDistrict || prev.district,
    }));

    if (errors.locality) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.locality;
        if (matchedDistrict && next.district) delete next.district;
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
    }, 350);
  };

  return (
    <div className="w-full bg-[#F7F6F3] min-h-screen">
      <div className={`max-w-6xl mx-auto px-4 sm:px-8 text-start ${embedded ? 'py-2' : 'pt-28 sm:pt-32 pb-24 sm:pb-32'}`}>

        {/* Page Editorial Header */}
        {!embedded && (
          <div className="mb-10 sm:mb-12 text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414]/5 border border-[#141414]/10 text-xs font-mono font-semibold tracking-wider text-[#681822] uppercase">
              <span>{ur ? 'شہری بلدیاتی درخواست' : 'AWAAZ-E-AWAM // APPLICATION DESK'}</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-[#141414] uppercase tracking-tight leading-[0.98]">
              {ur ? 'اپنی شکایت درج کریں' : 'WRITE YOUR COMPLAINT.'}
            </h1>
            <p className="text-sm sm:text-base text-[#444] max-w-xl mx-auto font-normal leading-relaxed font-ui">
              {ur
                ? 'اپنے روزمرہ کے عام فہم الفاظ میں عوامی مسئلہ بیان کریں۔'
                : 'Describe the public-service issue in your own words.'}
            </p>
          </div>
        )}

        {/* Digital Formal Application Paper Sheet */}
        <ApplicationPaper currentDateIso={currentDateIso} applicantName={formData.citizenName}>
          <form onSubmit={handleSubmit} noValidate className="space-y-9">

            {/* SECTION 1: APPLICANT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[#E5E3E0]">
                <User className="w-4 h-4 text-[#681822]" />
                <h2 className="font-display font-black text-xs sm:text-sm tracking-wider text-[#141414] uppercase">
                  {ur ? '۱. درخواست گزار کی تفصیلات' : '1. Applicant Details'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input
                  label={t('formCitizenName')}
                  required
                  id="citizenName"
                  autoComplete="name"
                  placeholder={t('formCitizenNamePlaceholder')}
                  value={formData.citizenName}
                  onChange={(e) => handleChange('citizenName', e.target.value)}
                  error={errors.citizenName}
                />

                <Input
                  label={t('formPhone')}
                  required
                  id="citizenPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={t('formPhonePlaceholder')}
                  value={formData.citizenPhone}
                  onChange={(e) => handleChange('citizenPhone', e.target.value)}
                  error={errors.citizenPhone}
                  helperText={ur ? 'فارمیٹ: 03XXXXXXXXX یا +923XXXXXXXXX' : 'Pakistani Mobile: 03XXXXXXXXX or +923XXXXXXXXX'}
                />
              </div>
            </div>

            {/* SECTION 2: COMPLAINT LOCATION (Where the problem occurred) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#E5E3E0]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#681822]" />
                  <h2 className="font-display font-black text-xs sm:text-sm tracking-wider text-[#141414] uppercase">
                    {ur ? '۲. مسئلہ کہاں واقع ہے؟' : '2. Where is the problem located?'}
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#666]">
                  {ur ? 'مسئلے کی درست جگہ' : 'Location of the issue'}
                </span>
              </div>

              {/* District & Locality Combobox Grid */}
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

                <KarachiAreaCombobox
                  label={t('formLocality')}
                  required
                  id="locality"
                  value={formData.locality}
                  selectedDistrict={formData.district}
                  onChange={handleLocalitySelect}
                  error={errors.locality}
                  placeholder={t('formLocalityPlaceholder')}
                />
              </div>

              {/* Public Issue Location & Specific Landmark Details */}
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

              {/* Optional Private Address */}
              <Input
                label={t('formAddress')}
                id="privateAddress"
                placeholder={t('formAddressPlaceholder')}
                value={formData.privateAddress}
                onChange={(e) => handleChange('privateAddress', e.target.value)}
                helperText={t('formPrivacyNote')}
              />
            </div>

            {/* SECTION 3: COMPLAINT SUBJECT */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-[#E5E3E0]">
                <FileText className="w-4 h-4 text-[#681822]" />
                <h2 className="font-display font-black text-xs sm:text-sm tracking-wider text-[#141414] uppercase">
                  {ur ? '۳. شکایت کا عنوان' : '3. Complaint Subject'}
                </h2>
              </div>

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

            {/* SECTION 4: RULED COMPLAINT WRITING REGION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#E5E3E0]">
                <h2 className="font-display font-black text-xs sm:text-sm tracking-wider text-[#141414] uppercase">
                  {ur ? '۴. شکایت کی باضابطہ تحریر' : '4. Complaint Description'}
                </h2>
                <span className="text-[11px] font-mono text-[#666]">
                  {ur ? 'لائنوں پر اپنی شکایت درج کریں' : 'Ruled writing surface'}
                </span>
              </div>

              <RuledComplaintTextarea
                id="description"
                label={t('formDescription')}
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={errors.description}
                wordCount={descriptionWords}
                placeholder={t('formDescriptionPlaceholder')}
              />
            </div>

            {/* SECTION 5: ACTION CONTROLS */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[#555]">
                <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0" />
                <span>
                  {ur
                    ? 'یہ فارم صرف جائزے کے لیے ہے؛ ابھی کوئی شکایت خودکار طور پر سرکاری محکمے کو ارسال نہیں ہوتی۔'
                    : 'This form validates client requirements for review. No data is dispatched to government desks.'}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 tracking-wide text-xs font-bold"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  {ur ? 'صاف کریں' : 'Clear Form'}
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={descriptionWords > MAX_COMPLAINT_WORDS}
                  leftIcon={<Send className="w-3.5 h-3.5 text-white" />}
                  className="w-full sm:w-auto px-6 tracking-wide text-xs font-bold"
                >
                  {isSubmitting ? t('formSubmitting') : t('formSubmitButton') || 'Review complaint'}
                </Button>
              </div>
            </div>
          </form>
        </ApplicationPaper>
      </div>

      {/* Honest Application Review Modal */}
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
                {ur ? 'فارم جائزے کے لیے تیار ہے' : 'Your form is ready to review'}
              </span>
              <p className="text-xs text-[#555]">
                {ur
                  ? 'تمام ضروری خانے، الفاظ کی حد اور کراچی لوکیشن ویلیڈیٹ ہو چکی ہیں۔'
                  : 'Required fields, 200-word limit, and Karachi locality have been validated.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-[#E5E3E0] space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-[#F0EFEB] pb-1.5">
              <span className="text-[#666] uppercase">{ur ? 'درخواست گزار:' : 'Applicant:'}</span>
              <span className="font-bold text-[#141414]">{formData.citizenName}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0EFEB] pb-1.5">
              <span className="text-[#666] uppercase">{ur ? 'رابطہ نمبر:' : 'Contact:'}</span>
              <span className="font-bold text-[#141414]">{formData.citizenPhone}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0EFEB] pb-1.5">
              <span className="text-[#666] uppercase">{ur ? 'ضلع و علاقہ:' : 'Location:'}</span>
              <span className="font-bold text-[#141414]">{formData.district} — {formData.locality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666] uppercase">{ur ? 'عنوان:' : 'Subject:'}</span>
              <span className="font-bold text-[#141414] truncate max-w-[200px]">{formData.title}</span>
            </div>
          </div>

          <AlertBanner
            type="info"
            title={t('modalNoticeHeader')}
          >
            {t('modalNoticeText')}
          </AlertBanner>

          <div className="pt-2 flex items-center justify-end">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto tracking-wider text-xs font-bold"
            >
              {ur ? 'درخواست پر واپس جائیں' : 'Return to form'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
