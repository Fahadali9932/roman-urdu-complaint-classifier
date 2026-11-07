import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Card } from '../../components/common/Card';
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
import { type KarachiDistrict, type SubmissionResult } from '../../types';
import {
  Send,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  User,
  MapPin,
  FileText,
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
  const { t, isRTL } = useLanguage();
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
    <div className="py-6 sm:py-10">
      <Container size="md">
        {/* Header */}
        <div className="text-start space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>Phase 1 Citizen Intake Prototype</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('formTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
            {t('formSubtitle')}
          </p>
        </div>

        {/* Informative Automated Routing Notice Banner */}
        <AlertBanner
          type="info"
          title={t('formDeptNoteTitle')}
          className="mb-6"
        >
          {t('formDeptNoteText')}
        </AlertBanner>

        {/* Complaint Form Card */}
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Group 1: Citizen Contact Information */}
            <div className="space-y-4 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                  <span>Citizen Contact Information</span>
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  Phone & private address protected
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
                  helperText="Format: 03XXXXXXXXX (Used for SMS updates only)"
                />
              </div>
            </div>

            {/* Group 2: Location & Jurisdiction */}
            <div className="space-y-4 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  <span>Karachi Location & Jurisdiction</span>
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  All 7 Karachi districts supported
                </span>
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

            {/* Group 3: Grievance Details & Roman Urdu Description */}
            <div className="space-y-4 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
                  <span>Grievance Description</span>
                </h2>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                  Roman Urdu • English • اردو
                </span>
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

              <div className="space-y-2">
                <Textarea
                  label={t('formDescription')}
                  required
                  id="description"
                  rows={5}
                  placeholder={t('formDescriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  error={errors.description}
                />

                {/* Live 200-Word Counter Gauge */}
                <WordCounter currentCount={descriptionWords} maxWords={MAX_COMPLAINT_WORDS} />

                {/* Instructional Roman Urdu Example Prompt */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">
                      Instructional Example:
                    </span>
                    <p className="italic text-slate-700 roman-urdu-text font-medium">
                      {t('formRomanUrduExample')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
                <span>Frontend validation active • Session prototype mode</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={descriptionWords > MAX_COMPLAINT_WORDS}
                leftIcon={<Send className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-sm"
              >
                {isSubmitting ? t('formSubmitting') : t('formSubmitButton')}
              </Button>
            </div>
          </form>
        </Card>
      </Container>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('modalTitle')}
      >
        <div className="space-y-5 text-start">
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-teal-50 border border-teal-200">
            <CheckCircle2 className="w-8 h-8 text-teal-600 shrink-0" aria-hidden="true" />
            <div>
              <span className="block text-xs text-teal-800 font-bold uppercase tracking-wider">
                {t('modalRefLabel')}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="ref-code text-xl sm:text-2xl font-extrabold text-teal-950">
                  {submissionResult?.referenceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1.5 rounded-lg text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                  title="Copy reference number"
                  aria-label="Copy reference number"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && (
                  <span className="text-xs text-teal-800 font-bold">Copied!</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('modalBody1')}
          </p>

          <AlertBanner
            type="warning"
            title={t('modalNoticeHeader')}
          >
            {t('modalNoticeText')}
          </AlertBanner>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setShowModal(false);
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto"
            >
              {t('modalClose')}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleTrackNow}
              rightIcon={<ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              className="w-full sm:w-auto"
            >
              {t('modalTrackNow')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
