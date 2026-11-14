import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Home,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiAreaCombobox } from '../components/KarachiAreaCombobox';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { KARACHI_DEPARTMENTS } from '../../../mocks/complaints';
import { complaintService } from '../../../services';
import {
  ApplicantFormData,
  KarachiDistrict,
  ProblemLocationData,
  FullComplaintFormState,
  SubmissionResult,
} from '../../../types';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';

type Stage = 1 | 2 | 3;

const DRAFT_STORAGE_KEY = 'awaaz_complaint_draft_v1';

const INITIAL_FORM: FullComplaintFormState = {
  applicant: { citizenName: '', citizenPhone: '', citizenEmail: '', applicantAddress: '' },
  location: {
    locality: '', district: '', isDistrictAutoResolved: false,
    districtNeedsConfirmation: false, publicLocation: '',
  },
  complaint: { title: '', description: '' },
};

export const SimplifiedComplaintContainer: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const [stage, setStage] = useState<Stage>(1);
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  // Restore draft from sessionStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setFormData((prev) => ({
              applicant: { ...prev.applicant, ...(parsed.applicant || {}) },
              location: { ...prev.location, ...(parsed.location || {}) },
              complaint: { ...prev.complaint, ...(parsed.complaint || {}) },
            }));
          }
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, []);

  const saveDraft = (nextForm: FullComplaintFormState) => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextForm));
      }
    } catch {
      // Ignore sessionStorage write errors
    }
  };

  const words = useMemo(() => {
    const value = formData.complaint.description.trim();
    return value ? value.split(/\s+/).filter(Boolean).length : 0;
  }, [formData.complaint.description]);
  const phone = formData.applicant.citizenPhone.trim();
  const phoneIsValid = /^(?:(?:\+92|0092|92)\s*3\d{2}|03\d{2})[-.\s]?\d{7}$/.test(phone);
  const email = formData.applicant.citizenEmail.trim();
  const emailIsValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const complete = [
    Boolean(formData.applicant.citizenName.trim() && phoneIsValid && emailIsValid),
    Boolean(
      formData.location.locality &&
      formData.location.district &&
      formData.location.publicLocation.trim() &&
      formData.applicant.applicantAddress.trim()
    ),
    words > 0 && words <= MAX_COMPLAINT_WORDS,
  ];
  const progress = Math.max(0, Math.min(100, ((stage - 1) * 33) + (complete[stage - 1] ? 34 : 12)));

  const copy = ur ? {
    title: 'اپنی شکایت درج کریں', intro: 'تین مختصر مراحل میں اپنا عوامی مسئلہ درج کریں۔',
    details: 'آپ کی تفصیلات', location: 'مقام', complaint: 'شکایت',
    detailsLead: 'آپ سے رابطے کے لیے صرف ضروری معلومات لیں گے۔',
    locationLead: 'کراچی میں اس عوامی مسئلے کی جگہ بتائیں۔',
    complaintLead: 'اپنے الفاظ میں بتائیں کہ کیا ہوا۔',
    name: 'پورا نام', phone: 'پاکستانی موبائل نمبر', email: 'ای میل (اختیاری)',
    locationLabel: 'علاقہ / محلہ', district: 'کراچی کا ضلع', landmark: 'گلی، بلاک یا قریبی نشانی',
    address: 'رہائشی پتہ', addressHelp: 'یہ فارم مکمل کرنے کے لیے ضروری ہے، مگر صرف اسی براؤزر میں عارضی طور پر رکھا جاتا ہے؛ عوامی یا محکمانہ ریکارڈ میں نہیں بھیجا یا محفوظ کیا جاتا۔',
    description: 'شکایت کی تفصیل', continue: 'آگے بڑھیں', back: 'واپس', submit: 'شکایت جمع کروائیں',
    privacy: 'آپ کا فون نمبر اور رہائشی پتہ صرف اس فارم میں عارضی طور پر رہتا ہے؛ عوامی یا محکمانہ ریکارڈ میں شامل نہیں ہوتا۔',
    emailNote: 'ای میل صرف رابطے کے لیے لی جاتی ہے؛ اطلاعات کا وعدہ تبھی ہوگا جب ای میل سروس فعال ہو۔',
    streetHelp: 'سڑک، بلاک یا قریبی نشانی مسئلے کی جگہ سمجھنے میں مدد دیتی ہے۔',
    success: 'شکایت درج ہو گئی', close: 'بند کریں',
  } : {
    title: 'Write your complaint', intro: 'Report a public issue in three straightforward steps.',
    details: 'Your details', location: 'Location', complaint: 'Complaint',
    detailsLead: 'We only collect the contact details needed to reach you.',
    locationLead: 'Tell us where this public issue is happening in Karachi.',
    complaintLead: 'Describe what happened in your own words.',
    name: 'Full name', phone: 'Pakistani mobile number', email: 'Email (optional)',
    locationLabel: 'Area / Locality', district: 'Karachi district', landmark: 'Street, block or nearby landmark',
    address: 'Home address', addressHelp: 'Required to complete this form, but kept only in this browser preview and never sent to or saved in public or departmental records.',
    description: 'Complaint description', continue: 'Continue', back: 'Back', submit: 'Submit Complaint',
    privacy: 'Your phone number and home address stay only in this form and are never sent to or saved in public or departmental records.',
    emailNote: 'Email is optional. We only promise notifications when a real email service is available.',
    streetHelp: 'A street, block or nearby landmark helps identify the incident location.',
    success: 'Complaint submitted', close: 'Close',
  };

  const updateApplicant = (field: keyof ApplicantFormData, value: string) => {
    setFormData((current) => {
      const next = { ...current, applicant: { ...current.applicant, [field]: value } };
      saveDraft(next);
      return next;
    });
    setErrors((current) => ({ ...current, [field]: '', submit: '', submitCode: '' }));
  };
  const updateLocation = (updates: Partial<ProblemLocationData>) => {
    setFormData((current) => {
      const next = { ...current, location: { ...current.location, ...updates } };
      saveDraft(next);
      return next;
    });
    setErrors((current) => ({ ...current, locality: '', district: '', publicLocation: '', submit: '', submitCode: '' }));
  };
  const handleLocality = (locality: string, matchedDistrict?: KarachiDistrict) => {
    if (!locality.trim()) return updateLocation({ locality: '', district: '', isDistrictAutoResolved: false, districtNeedsConfirmation: false });
    if (matchedDistrict) return updateLocation({ locality, district: matchedDistrict, isDistrictAutoResolved: true, districtNeedsConfirmation: false });
    const resolution = defaultLocalityResolver.resolve(locality);
    updateLocation(resolution.status === 'verified' && resolution.district
      ? { locality, district: resolution.district, isDistrictAutoResolved: true, districtNeedsConfirmation: false }
      : { locality, district: '', isDistrictAutoResolved: false, districtNeedsConfirmation: true });
  };
  const validate = (target: Stage) => {
    const next: Record<string, string> = {};
    if (target === 1) {
      if (!formData.applicant.citizenName.trim()) next.citizenName = ur ? 'پورا نام درج کریں۔' : 'Enter your full name.';
      if (!phoneIsValid) next.citizenPhone = ur ? 'درست پاکستانی موبائل نمبر درج کریں۔' : 'Enter a valid Pakistani mobile number.';
      if (!emailIsValid) next.citizenEmail = ur ? 'درست ای میل درج کریں۔' : 'Enter a valid email address.';
    }
    if (target === 2) {
      if (!formData.location.locality.trim()) next.locality = ur ? 'علاقہ درج کریں۔' : 'Enter an area or locality.';
      if (!formData.location.district) next.district = ur ? 'ضلع منتخب کریں۔' : 'Select a Karachi district.';
      if (!formData.location.publicLocation.trim()) next.publicLocation = ur ? 'قریبی نشانی درج کریں۔' : 'Enter the incident street or landmark.';
      if (!formData.applicant.applicantAddress.trim()) next.applicantAddress = ur ? 'رہائشی پتہ درج کریں۔' : 'Enter your home address.';
    }
    if (target === 3) {
      if (!words) next.description = ur ? 'شکایت کی تفصیل درج کریں۔' : 'Describe the complaint.';
      if (words > MAX_COMPLAINT_WORDS) next.description = ur ? 'شکایت ۲۰۰ الفاظ سے زیادہ ہے۔' : 'Keep the complaint within 200 words.';
    }
    setErrors((current) => ({ ...current, ...next }));
    const first = Object.keys(next)[0];
    if (first) document.getElementById(first)?.focus();
    return !first;
  };
  const continueStage = () => {
    if (validate(stage)) {
      const nextStage = (stage + 1) as Stage;
      setStage(nextStage);
      saveDraft(formData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const submit = async () => {
    if (!validate(3)) return;
    setIsSubmitting(true);
    setErrors((current) => {
      const next = { ...current };
      delete next.submit;
      delete next.submitCode;
      return next;
    });
    try {
      const result = await complaintService.submitComplaint({
        citizenName: formData.applicant.citizenName,
        citizenPhone: formData.applicant.citizenPhone,
        citizenEmail: formData.applicant.citizenEmail,
        residentialAddress: formData.applicant.applicantAddress,
        locality: formData.location.locality,
        district: formData.location.district as KarachiDistrict,
        publicLocation: formData.location.publicLocation,
        title: formData.complaint.description.trim().slice(0, 50) || 'Public complaint',
        description: formData.complaint.description,
        isDemonstration: false,
      });
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      setSubmission(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit complaint.';
      const code = (error as { code?: string })?.code || '';
      setErrors((current) => ({ ...current, submit: message, submitCode: code }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (hasError: boolean) =>
    `field-refined w-full px-4 py-3 text-[14px] sm:text-[15px] placeholder:text-[#88827A] ${
      hasError ? 'field-refined-error' : ''
    }`;
  const stages = [copy.details, copy.location, copy.complaint];

  return (
    <div
      className="write-complaint-wrapper relative w-full bg-[#F7F6F3] text-[#171717]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="write-complaint-viewport sticky bottom-0 z-10 w-full px-4 pt-28 pb-12 sm:px-6 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-20 motion-reduce:static">
        <div className="mx-auto max-w-5xl">
          {/* Main Page Header */}
          <header className="mb-7 text-center sm:mb-9">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#681822]">
              Awaaz-e-Awam
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl lg:text-[40px] lg:leading-[1.15]">
              {copy.title}
            </h1>
            <p className="mx-auto mt-2.5 max-w-xl text-sm leading-6 text-[#625D58] sm:text-base">
              {copy.intro}
            </p>
          </header>

          {/* Progress Indicator Card */}
          <section
            className="mb-6 rounded-[22px] sm:rounded-[26px] border border-[#E6E3DF] bg-white p-5 shadow-[0_8px_30px_rgba(20,20,20,0.04)] sm:p-6"
            aria-label={ur ? 'فارم کی پیش رفت' : 'Form progress'}
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#625D58]">
              <span>{ur ? `مرحلہ ${stage} از ۳` : `Step ${stage} of 3`}</span>
              <span className="font-mono text-xs font-bold text-[#681822]">
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className="h-3.5 sm:h-4 overflow-hidden rounded-full bg-[#EAE7E2]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full rounded-full bg-[#681822] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="mt-4 grid grid-cols-3 gap-2 text-center">
              {stages.map((label, index) => {
                const itemStage = (index + 1) as Stage;
                const active = itemStage === stage;
                const passed = itemStage < stage || complete[index];
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => (itemStage <= stage || complete[index]) && setStage(itemStage)}
                      className={`mx-auto flex min-h-9 items-center gap-2 rounded-full px-2 text-xs sm:text-[13px] font-semibold transition ${
                        active ? 'text-[#681822]' : 'text-[#817A73]'
                      } ${
                        itemStage <= stage || complete[index]
                          ? 'cursor-pointer hover:text-[#681822]'
                          : 'cursor-default'
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold transition-colors ${
                          passed
                            ? 'border-[#681822] bg-[#681822] text-white'
                            : active
                              ? 'border-[#681822] bg-[#F7EFF0] text-[#681822]'
                              : 'border-[#D7D1CB] text-[#817A73]'
                        }`}
                      >
                        {passed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Form Container Card - overflow-visible prevents clipping combobox dropdown */}
          <section className="overflow-visible rounded-[24px] sm:rounded-[28px] border border-[#E6E3DF] bg-white shadow-[0_12px_42px_rgba(20,20,20,0.05)]">
            <div className="rounded-t-[24px] sm:rounded-t-[28px] border-b border-[#EFECE8] bg-[#FAF9F7]/70 px-5 py-4 sm:px-9 sm:py-6">
              <div className="flex items-center gap-3.5">
                <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-[#681822] text-xs sm:text-sm font-bold text-white shrink-0 shadow-sm">
                  {stage}
                </span>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#681822]">
                    {stages[stage - 1]}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-[#141414] sm:text-xl lg:text-[22px] tracking-tight">
                    {stage === 1 ? copy.detailsLead : stage === 2 ? copy.locationLead : copy.complaintLead}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-9 lg:p-10">
              {errors.submit && (
                errors.submitCode === 'AUTHENTICATION_REQUIRED' ? (
                  <div role="alert" className="mb-6 rounded-2xl border border-[#F0D5D8] bg-[#FDF7F8] p-5 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#681822] text-white">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-bold text-[#141414]">
                          {ur ? 'شہری لاگ ان درکار ہے' : 'Citizen Sign-In Required'}
                        </h3>
                        <p className="text-xs sm:text-[13px] leading-relaxed text-[#625D58]">
                          {ur
                            ? 'شکایت جمع کروانے کے لیے اپنے شہری اکاؤنٹ سے سائن ان کریں۔ آپ کا اندراج شدہ فارم خودکار طور پر محفوظ کر لیا گیا ہے۔'
                            : 'Please sign in with your citizen account to file this grievance. All your entered details (name, locality, and description) are safely saved in this session.'}
                        </p>
                        <div className="pt-2 flex flex-wrap gap-2">
                          <Link
                            to="/login"
                            state={{ from: '/submit' }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#681822] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#53131B] transition cursor-pointer"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            <span>{ur ? 'سائن ان کریں' : 'Sign In as Citizen'}</span>
                          </Link>
                          <Link
                            to="/register"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9D3CC] bg-white px-4 py-2 text-xs font-semibold text-[#171717] hover:bg-[#FAF9F7] transition cursor-pointer"
                          >
                            <span>{ur ? 'نیا اکاؤنٹ بنائیں' : 'Create Account'}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : errors.submitCode === 'CITIZEN_ACCOUNT_REQUIRED' ? (
                  <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-700 text-white">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-bold text-amber-950">
                          {ur ? 'شہری اکاؤنٹ درکار ہے' : 'Citizen Account Required'}
                        </h3>
                        <p className="text-xs sm:text-[13px] leading-relaxed text-amber-900">
                          {ur
                            ? 'آپ اس وقت محکمہ کے عملے کے اکاؤنٹ سے لاگ ان ہیں۔ عوامی شکایت درج کرنے کے لیے عملے کا سیشن بند کر کے شہری اکاؤنٹ سے سائن ان کریں۔'
                            : 'You are currently signed in with a department staff account. To file a public grievance, please sign out of staff mode and sign in with a citizen account.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-bold text-red-950">{ur ? 'شکایت جمع نہ ہو سکی' : 'Submission Failed'}</h3>
                          <p className="text-xs sm:text-[13px] text-red-800 mt-0.5">{errors.submit}</p>
                          <p className="text-xs text-red-600 mt-1">
                            {ur ? 'آپ کی درج کردہ معلومات محفوظ ہیں۔ براہِ کرم دوبارہ کوشش کریں۔' : 'Your entered information is intact. Please try again.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={isSubmitting}
                        className="shrink-0 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50 transition cursor-pointer"
                      >
                        {ur ? 'دوبارہ کوشش' : 'Retry'}
                      </button>
                    </div>
                  </div>
                )
              )}
              {stage === 1 && (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueStage();
                  }}
                  className="mx-auto max-w-2xl space-y-5 text-start"
                >
                  <Field htmlFor="citizenName" label={copy.name} required error={errors.citizenName}>
                    <div className="relative">
                      <User
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#88827A] ${
                          isRTL ? 'right-4' : 'left-4'
                        }`}
                      />
                      <input
                        id="citizenName"
                        autoComplete="name"
                        aria-label="Full Name"
                        value={formData.applicant.citizenName}
                        onChange={(e) => updateApplicant('citizenName', e.target.value)}
                        className={`${fieldClass(Boolean(errors.citizenName))} ${
                          isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                        }`}
                      />
                    </div>
                  </Field>

                  <Field htmlFor="citizenPhone" label={copy.phone} required error={errors.citizenPhone}>
                    <div className="relative">
                      <Phone
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#88827A] ${
                          isRTL ? 'right-4' : 'left-4'
                        }`}
                      />
                      <input
                        id="citizenPhone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        aria-label="Phone Number"
                        placeholder="03001234567 or +923001234567"
                        value={formData.applicant.citizenPhone}
                        onChange={(e) => updateApplicant('citizenPhone', e.target.value)}
                        className={`${fieldClass(Boolean(errors.citizenPhone))} ${
                          isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                        }`}
                      />
                    </div>
                  </Field>

                  <Field htmlFor="citizenEmail" label={copy.email} error={errors.citizenEmail}>
                    <div className="relative">
                      <Mail
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#88827A] ${
                          isRTL ? 'right-4' : 'left-4'
                        }`}
                      />
                      <input
                        id="citizenEmail"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        aria-label="Email Address"
                        value={formData.applicant.citizenEmail}
                        onChange={(e) => updateApplicant('citizenEmail', e.target.value)}
                        className={`${fieldClass(Boolean(errors.citizenEmail))} ${
                          isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#6B6864]">{copy.emailNote}</p>
                  </Field>

                  <div className="pt-2">
                    <ActionButton label={copy.continue} />
                  </div>
                </form>
              )}

              {stage === 2 && (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueStage();
                  }}
                  className="mx-auto max-w-2xl space-y-5 text-start"
                >
                  <div>
                    <KarachiAreaCombobox
                      id="locality"
                      label={copy.locationLabel}
                      required
                      value={formData.location.locality}
                      onChange={handleLocality}
                      selectedDistrict={formData.location.district}
                      error={errors.locality}
                      placeholder={ur ? 'علاقہ یا بلاک تلاش کریں' : 'Search by area or block'}
                    />
                  </div>

                  {formData.location.isDistrictAutoResolved && formData.location.district ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-xl border border-[#E0DCD6] bg-[#FAF9F7] px-4 py-3">
                      <span data-testid="resolved-district" className="text-sm font-semibold text-[#141414]">
                        {copy.district}: {formData.location.district}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{ur ? 'خودکار تصدیق شدہ' : 'Automatically identified'}</span>
                      </span>
                    </div>
                  ) : (
                    <Field htmlFor="district" label={copy.district} required error={errors.district}>
                      <select
                        id="district"
                        aria-label="Karachi District"
                        value={formData.location.district}
                        onChange={(e) =>
                          updateLocation({
                            district: e.target.value as KarachiDistrict,
                            isDistrictAutoResolved: false,
                            districtNeedsConfirmation: false,
                          })
                        }
                        className={fieldClass(Boolean(errors.district))}
                      >
                        <option value="">{ur ? 'ضلع منتخب کریں' : 'Select a district'}</option>
                        {KARACHI_DISTRICTS_DATA.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field htmlFor="publicLocation" label={copy.landmark} required error={errors.publicLocation}>
                    <div className="relative">
                      <MapPin
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#88827A] ${
                          isRTL ? 'right-4' : 'left-4'
                        }`}
                      />
                      <input
                        id="publicLocation"
                        aria-label="Street, block or nearby landmark"
                        value={formData.location.publicLocation}
                        onChange={(e) => updateLocation({ publicLocation: e.target.value })}
                        className={`${fieldClass(Boolean(errors.publicLocation))} ${
                          isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6B6864]">{copy.streetHelp}</p>
                  </Field>

                  <Field htmlFor="applicantAddress" label={copy.address} required error={errors.applicantAddress}>
                    <div className="relative">
                      <Home
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#88827A] ${
                          isRTL ? 'right-4' : 'left-4'
                        }`}
                      />
                      <input
                        id="applicantAddress"
                        aria-label="Home Address"
                        autoComplete="street-address"
                        placeholder={ur ? 'مکان نمبر، گلی، علاقہ' : 'House / Flat no., street, residential area'}
                        value={formData.applicant.applicantAddress}
                        onChange={(e) => updateApplicant('applicantAddress', e.target.value)}
                        className={`${fieldClass(Boolean(errors.applicantAddress))} ${
                          isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6B6864]">{copy.addressHelp}</p>
                  </Field>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStage(1)}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-sm sm:text-[15px] font-semibold text-[#171717] hover:bg-[#F2EFEA] transition cursor-pointer"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {copy.back}
                    </button>
                    <ActionButton label={copy.continue} />
                  </div>
                </form>
              )}

              {stage === 3 && (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                  }}
                  className="mx-auto max-w-2xl space-y-5 text-start"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <label htmlFor="description" className="text-sm font-semibold text-[#141414]">
                        {copy.description} <span className="text-[#681822]">*</span>
                      </label>
                      <span
                        className={`text-xs font-semibold ${
                          words > MAX_COMPLAINT_WORDS ? 'text-[#B4233E]' : 'text-[#6B6864]'
                        }`}
                      >
                        <span data-testid="word-count-display">{words}</span> / {MAX_COMPLAINT_WORDS}{' '}
                        {ur ? 'الفاظ' : 'words'}
                      </span>
                    </div>
                    <textarea
                      id="description"
                      aria-label="Complaint Description"
                      rows={8}
                      dir={/[\u0600-\u06FF]/.test(formData.complaint.description) ? 'rtl' : 'ltr'}
                      value={formData.complaint.description}
                      onChange={(e) => {
                        const description = e.target.value;
                        setFormData((current) => {
                          const next = {
                            ...current,
                            complaint: { title: description.trim().slice(0, 50), description },
                          };
                          saveDraft(next);
                          return next;
                        });
                        setErrors((current) => ({ ...current, description: '', submit: '', submitCode: '' }));
                      }}
                      placeholder={
                        ur
                          ? 'اپنے الفاظ میں مسئلہ، اس کی جگہ اور مدت بیان کریں…'
                          : 'Describe what happened, where it is, and how long it has affected the area…'
                      }
                      className={`${fieldClass(
                        Boolean(errors.description) || words > MAX_COMPLAINT_WORDS
                      )} min-h-52 resize-y leading-relaxed`}
                    />
                    {errors.description && (
                      <p className="mt-2 text-xs font-medium text-[#B4233E]">{errors.description}</p>
                    )}
                    {words > MAX_COMPLAINT_WORDS && !errors.description && (
                      <p className="mt-2 text-xs font-medium text-[#B4233E]">
                        {ur ? 'شکایت ۲۰۰ الفاظ سے زیادہ ہے۔' : 'Keep the complaint within 200 words.'}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStage(2)}
                      disabled={isSubmitting}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-sm sm:text-[15px] font-semibold text-[#171717] hover:bg-[#F2EFEA] disabled:opacity-50 transition cursor-pointer"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {copy.back}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || words > MAX_COMPLAINT_WORDS}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm sm:text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition hover:bg-[#53131B] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSubmitting ? (ur ? 'جمع ہو رہا ہے…' : 'Submitting…') : copy.submit}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Privacy Guarantee Footer Inside Panel */}
            <div className="rounded-b-[24px] sm:rounded-b-[28px] flex items-start gap-3 border-t border-[#EFECE8] bg-[#FAF9F7]/70 px-5 py-3.5 text-xs leading-5 text-[#625D58] sm:px-9 sm:py-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#681822]" />
              <span>{copy.privacy}</span>
            </div>
          </section>
        </div>
      </div>

      {submission && (
        <SubmissionModal
          submission={submission}
          formData={formData}
          copy={copy}
          ur={ur}
          onClose={() => {
            setSubmission(null);
            setFormData(INITIAL_FORM);
            setStage(1);
          }}
        />
      )}
    </div>
  );
};

const Field: React.FC<{
  htmlFor?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ htmlFor, label, required, error, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-[13px] sm:text-[14px] font-semibold text-[#141414]">
      {label}
      {required && <span className="text-[#681822] ms-1">*</span>}
    </label>
    {children}
    {error && <p className="mt-1.5 text-xs font-medium text-[#B4233E]">{error}</p>}
  </div>
);

const ActionButton: React.FC<{ label: string }> = ({ label }) => (
  <button
    type="submit"
    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm sm:text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition hover:bg-[#53131B] active:scale-[0.99] sm:w-auto cursor-pointer"
  >
    <span>{label}</span>
    <ChevronRight className="h-4 w-4" />
  </button>
);

const SubmissionModal: React.FC<{
  submission: SubmissionResult;
  formData: FullComplaintFormState;
  copy: Record<string, string>;
  ur: boolean;
  onClose: () => void;
}> = ({ submission, formData, copy, ur, onClose }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(submission.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const deptMeta = submission.departmentId ? KARACHI_DEPARTMENTS[submission.departmentId] : null;
  const isUnderReview = submission.needsReview || submission.status === 'under_review';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#141414]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-title"
    >
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-[28px] bg-white p-6 shadow-2xl sm:p-8 text-start">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{ur ? 'شکایت کامیابی سے درج ہو گئی' : 'Complaint Registered Successfully'}</span>
            </span>
            <h2 id="submission-title" className="pt-2 text-2xl font-black text-[#141414] tracking-tight">
              {ur ? 'آپ کی شکایت کا سرکاری ریکارڈ قائم ہو گیا ہے' : 'Official Complaint Filed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-xl p-2 text-[#625D58] hover:bg-[#F7F6F3] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Case Reference Display Card */}
        <div className="mt-5 rounded-2xl border border-[#E6E3DF] bg-[#FAF9F7] p-4 sm:p-5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#681822]">
            {ur ? 'سرکاری ٹریکنگ حوالہ نمبر' : 'Official Case Reference Number'}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-xl sm:text-2xl font-black tracking-wide text-[#141414]">
              {submission.referenceNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9D3CC] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
              aria-label="Copy reference number"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#625D58]" />}
              <span>{copied ? (ur ? 'کاپی ہو گیا' : 'Copied!') : (ur ? 'کاپی کریں' : 'Copy')}</span>
            </button>
          </div>
        </div>

        {/* Department Routing Status Card */}
        <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 sm:p-5 space-y-2.5">
          {isUnderReview ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase text-amber-800">
                  {ur ? 'بلدیاتی درجہ بندی کا جائزہ جاری ہے' : 'Awaiting Municipal Classification Review'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#625D58]">
                {ur
                  ? 'شکایت کی خودکار درجہ بندی کے بعد اسے بلدیاتی جائزے میں رکھا گیا ہے تاکہ تصدیق کے بعد متعلقہ محکمے کو بھیجا جا سکے۔'
                  : 'Your grievance has been safely received and held for municipal review to guarantee it reaches the correct authority without misrouting.'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#625D58]">
                {ur ? 'تفویض شدہ بلدیاتی محکمہ' : 'Assigned Municipal Department'}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-display font-bold text-[#141414] text-sm sm:text-base">
                  {ur ? deptMeta?.nameUrdu || deptMeta?.name : deptMeta?.name || submission.departmentId?.toUpperCase()}
                </span>
                <span className="inline-flex items-center rounded-md bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-[#92400E] shrink-0">
                  {ur ? 'محکمانہ منظوری کا انتظار' : 'Pending Acceptance'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#625D58]">
                {ur
                  ? 'آپ کی شکایت متعلقہ ادارے کو بھیج دی گئی ہے۔ محکمہ کا مجاز افسر اس کا جائزہ لے کر باضابطہ طور پر کارروائی شروع کرے گا۔'
                  : 'Classified and delivered to the department desk. Staff will formally review and accept the complaint before commencing field resolution.'}
              </p>
            </div>
          )}
        </div>

        {/* Grievance Details Summary */}
        <div className="mt-4 rounded-xl bg-[#FAF9F7] px-4 py-3 text-xs leading-5 text-[#625D58] space-y-1">
          <p className="font-semibold text-[#141414]">
            {formData.applicant.citizenName} · {formData.location.locality}
            {formData.location.district ? ` (${formData.location.district})` : ''}
          </p>
          <p className="line-clamp-2 text-[#625D58]">{formData.complaint.description}</p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/dashboard');
            }}
            className="min-h-11 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-4 text-xs sm:text-sm font-semibold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
          >
            {ur ? 'میری شکایات دیکھیں' : 'View in My Complaints'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/track/${submission.referenceNumber}`);
            }}
            className="min-h-11 rounded-xl bg-[#681822] px-5 text-xs sm:text-sm font-bold text-white hover:bg-[#53131B] shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition cursor-pointer"
          >
            {ur ? 'شکایت ٹریک کریں' : 'Track Complaint'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
