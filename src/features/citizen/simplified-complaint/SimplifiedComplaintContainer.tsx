import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Home,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiAreaCombobox } from '../components/KarachiAreaCombobox';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
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
  const [showAddress, setShowAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

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
    Boolean(formData.location.locality && formData.location.district && formData.location.publicLocation.trim()),
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
    address: 'رہائشی پتہ (اختیاری)', addAddress: 'رہائشی پتہ شامل کریں', remove: 'ہٹائیں',
    description: 'شکایت کی تفصیل', continue: 'آگے بڑھیں', back: 'واپس', submit: 'شکایت جمع کروائیں',
    privacy: 'آپ کا فون نمبر اور رہائشی پتہ محفوظ رکھا جاتا ہے اور عوامی ریکارڈ میں شامل نہیں ہوتا۔',
    emailNote: 'ای میل صرف رابطے کے لیے لی جاتی ہے؛ اطلاعات کا وعدہ تبھی ہوگا جب ای میل سروس فعال ہو۔',
    streetHelp: 'سڑک، بلاک یا قریبی نشانی مسئلے کی جگہ سمجھنے میں مدد دیتی ہے۔',
    success: 'شکایت درج ہو گئی', preview: 'پروٹوٹائپ پیش منظر', close: 'بند کریں', edit: 'ترمیم کریں',
  } : {
    title: 'Write your complaint', intro: 'Report a public issue in three straightforward steps.',
    details: 'Your details', location: 'Location', complaint: 'Complaint',
    detailsLead: 'We only collect the contact details needed to reach you.',
    locationLead: 'Tell us where this public issue is happening in Karachi.',
    complaintLead: 'Describe what happened in your own words.',
    name: 'Full name', phone: 'Pakistani mobile number', email: 'Email (optional)',
    locationLabel: 'Area / Locality', district: 'Karachi district', landmark: 'Street, block or nearby landmark',
    address: 'Home address (optional)', addAddress: 'Add home address', remove: 'Remove',
    description: 'Complaint description', continue: 'Continue', back: 'Back', submit: 'Submit Complaint',
    privacy: 'Your phone number and home address stay private and never appear in the public record.',
    emailNote: 'Email is optional. We only promise notifications when a real email service is available.',
    streetHelp: 'A street, block or nearby landmark helps identify the incident location.',
    success: 'Complaint submitted', preview: 'Prototype preview', close: 'Close', edit: 'Edit form',
  };

  const updateApplicant = (field: keyof ApplicantFormData, value: string) => {
    setFormData((current) => ({ ...current, applicant: { ...current.applicant, [field]: value } }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const updateLocation = (updates: Partial<ProblemLocationData>) => {
    setFormData((current) => ({ ...current, location: { ...current.location, ...updates } }));
    setErrors((current) => ({ ...current, locality: '', district: '', publicLocation: '' }));
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
    }
    if (target === 3) {
      if (!words) next.description = ur ? 'شکایت کی تفصیل درج کریں۔' : 'Describe the complaint.';
      if (words > MAX_COMPLAINT_WORDS) next.description = ur ? 'شکایت ۲۰۰ الفاظ سے زیادہ ہے۔' : 'Keep the complaint within 200 words.';
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(first)?.focus();
    return !first;
  };
  const continueStage = () => { if (validate(stage)) { setStage((stage + 1) as Stage); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const submit = async () => {
    if (!validate(3)) return;
    setIsSubmitting(true);
    try {
      const result = await complaintService.submitComplaint({
        citizenName: formData.applicant.citizenName, citizenPhone: formData.applicant.citizenPhone,
        citizenEmail: formData.applicant.citizenEmail, privateAddress: formData.applicant.applicantAddress,
        locality: formData.location.locality, district: formData.location.district as KarachiDistrict,
        publicLocation: formData.location.publicLocation,
        title: formData.complaint.description.trim().slice(0, 50) || 'Public complaint', description: formData.complaint.description,
      });
      setSubmission(result);
    } finally { setIsSubmitting(false); }
  };

  const fieldClass = (hasError: boolean) => `w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:ring-4 focus:ring-[#681822]/10 ${hasError ? 'border-[#B4233E] focus:border-[#B4233E]' : 'border-[#DDD9D4] hover:border-[#AAA39B] focus:border-[#681822]'}`;
  const stages = [copy.details, copy.location, copy.complaint];

  return <main className="min-h-screen bg-[#F7F6F3] -mt-24 sm:-mt-28 -mb-32 sm:-mb-36 px-4 pb-24 pt-32 text-[#171717] sm:px-6 sm:pt-36" dir={isRTL ? 'rtl' : 'ltr'}>
    <div className="mx-auto max-w-5xl">
      <header className="mb-7 text-center sm:mb-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#681822]">Awaaz-e-Awam</p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#625D58] sm:text-base">{copy.intro}</p>
      </header>

      <section className="mb-6 rounded-[24px] border border-[#E6E1DB] bg-white p-5 shadow-[0_16px_45px_rgba(41,31,24,0.07)] sm:p-6" aria-label={ur ? 'فارم کی پیش رفت' : 'Form progress'}>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#625D58]">
          <span>{ur ? `مرحلہ ${stage} از ۳` : `Step ${stage} of 3`}</span><span className="text-[#681822]">{Math.round(progress)}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-[#E8E4DF]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="h-full rounded-full bg-[#681822] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-center">
          {stages.map((label, index) => { const itemStage = (index + 1) as Stage; const active = itemStage === stage; const passed = itemStage < stage || complete[index]; return <li key={label}>
            <button type="button" onClick={() => (itemStage <= stage || complete[index]) && setStage(itemStage)} className={`mx-auto flex min-h-9 items-center gap-2 rounded-full px-2 text-xs font-semibold transition ${active ? 'text-[#681822]' : 'text-[#817A73]'} ${itemStage <= stage || complete[index] ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${passed ? 'border-[#681822] bg-[#681822] text-white' : active ? 'border-[#681822] text-[#681822]' : 'border-[#D7D1CB]'}`}>{passed ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="hidden sm:inline">{label}</span>
            </button>
          </li>; })}
        </ol>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#E6E1DB] bg-white shadow-[0_18px_50px_rgba(41,31,24,0.09)]">
        <div className="border-b border-[#ECE8E3] bg-[#FCFBF9] px-6 py-6 sm:px-9 sm:py-7">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#681822] text-sm font-bold text-white">{stage}</span><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#681822]">{stages[stage - 1]}</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">{stage === 1 ? copy.detailsLead : stage === 2 ? copy.locationLead : copy.complaintLead}</h2></div></div>
        </div>
        <div className="p-6 sm:p-9">
          {stage === 1 && <form noValidate onSubmit={(event) => { event.preventDefault(); continueStage(); }} className="mx-auto max-w-2xl space-y-5 text-start">
            <Field htmlFor="citizenName" label={copy.name} required error={errors.citizenName}><div className="relative"><User className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#817A73] ${isRTL ? 'right-4' : 'left-4'}`} /><input id="citizenName" autoComplete="name" aria-label="Full Name" value={formData.applicant.citizenName} onChange={(e) => updateApplicant('citizenName', e.target.value)} className={`${fieldClass(Boolean(errors.citizenName))} ${isRTL ? 'pr-11' : 'pl-11'}`} /></div></Field>
            <Field htmlFor="citizenPhone" label={copy.phone} required error={errors.citizenPhone}><div className="relative"><Phone className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#817A73] ${isRTL ? 'right-4' : 'left-4'}`} /><input id="citizenPhone" type="tel" dir="ltr" autoComplete="tel" aria-label="Phone Number" placeholder="03001234567 or +923001234567" value={formData.applicant.citizenPhone} onChange={(e) => updateApplicant('citizenPhone', e.target.value)} className={`${fieldClass(Boolean(errors.citizenPhone))} ${isRTL ? 'pr-11' : 'pl-11'}`} /></div></Field>
            <Field htmlFor="citizenEmail" label={copy.email} error={errors.citizenEmail}><div className="relative"><Mail className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#817A73] ${isRTL ? 'right-4' : 'left-4'}`} /><input id="citizenEmail" type="email" dir="ltr" autoComplete="email" aria-label="Email Address" value={formData.applicant.citizenEmail} onChange={(e) => updateApplicant('citizenEmail', e.target.value)} className={`${fieldClass(Boolean(errors.citizenEmail))} ${isRTL ? 'pr-11' : 'pl-11'}`} /></div><p className="mt-2 text-xs leading-5 text-[#746E67]">{copy.emailNote}</p></Field>
            <ActionButton label={copy.continue} />
          </form>}
          {stage === 2 && <form noValidate onSubmit={(event) => { event.preventDefault(); continueStage(); }} className="mx-auto max-w-2xl space-y-5 text-start">
            <div><KarachiAreaCombobox id="locality" label={copy.locationLabel} required value={formData.location.locality} onChange={handleLocality} selectedDistrict={formData.location.district} error={errors.locality} placeholder={ur ? 'علاقہ یا بلاک تلاش کریں' : 'Search by area or block'} /> </div>
            {formData.location.isDistrictAutoResolved && formData.location.district ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCD6D0] bg-[#FCFBF9] px-4 py-3"><span data-testid="resolved-district" className="text-sm font-semibold">{copy.district}: {formData.location.district}</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822]"><CheckCircle2 className="h-4 w-4" />{ur ? 'خودکار تصدیق شدہ' : 'Automatically identified'}</span></div> : <Field htmlFor="district" label={copy.district} required error={errors.district}><select id="district" aria-label="Karachi District" value={formData.location.district} onChange={(e) => updateLocation({ district: e.target.value as KarachiDistrict, isDistrictAutoResolved: false, districtNeedsConfirmation: false })} className={fieldClass(Boolean(errors.district))}><option value="">{ur ? 'ضلع منتخب کریں' : 'Select a district'}</option>{KARACHI_DISTRICTS_DATA.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></Field>}
            <Field htmlFor="publicLocation" label={copy.landmark} required error={errors.publicLocation}><div className="relative"><MapPin className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#817A73] ${isRTL ? 'right-4' : 'left-4'}`} /><input id="publicLocation" aria-label="Street, block or nearby landmark" value={formData.location.publicLocation} onChange={(e) => updateLocation({ publicLocation: e.target.value })} className={`${fieldClass(Boolean(errors.publicLocation))} ${isRTL ? 'pr-11' : 'pl-11'}`} /></div><p className="mt-2 text-xs text-[#746E67]">{copy.streetHelp}</p></Field>
            {!showAddress ? <button type="button" onClick={() => setShowAddress(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#681822] hover:underline"><Home className="h-4 w-4" />{copy.addAddress}</button> : <div className="rounded-xl border border-[#E6E1DB] bg-[#FCFBF9] p-4"><div className="mb-3 flex items-center justify-between"><label htmlFor="applicantAddress" className="text-sm font-semibold">{copy.address}</label><button type="button" onClick={() => { updateApplicant('applicantAddress', ''); setShowAddress(false); }} className="text-xs font-semibold text-[#681822]">{copy.remove}</button></div><input id="applicantAddress" aria-label="Home Address" autoComplete="street-address" value={formData.applicant.applicantAddress} onChange={(e) => updateApplicant('applicantAddress', e.target.value)} className={fieldClass(false)} /></div>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setStage(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] px-5 text-sm font-semibold hover:bg-[#F7F6F3]"><ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />{copy.back}</button><ActionButton label={copy.continue} /></div>
          </form>}
          {stage === 3 && <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="mx-auto max-w-2xl space-y-5 text-start"><div><div className="mb-2 flex items-center justify-between gap-4"><label htmlFor="description" className="text-sm font-semibold">{copy.description} <span className="text-[#681822]">*</span></label><span className={`text-xs font-semibold ${words > MAX_COMPLAINT_WORDS ? 'text-[#B4233E]' : 'text-[#746E67]'}`}><span data-testid="word-count-display">{words}</span> / {MAX_COMPLAINT_WORDS} {ur ? 'الفاظ' : 'words'}</span></div><textarea id="description" aria-label="Complaint Description" rows={8} dir={/[\u0600-\u06FF]/.test(formData.complaint.description) ? 'rtl' : 'ltr'} value={formData.complaint.description} onChange={(e) => { const description = e.target.value; setFormData((current) => ({ ...current, complaint: { title: description.trim().slice(0, 50), description } })); setErrors((current) => ({ ...current, description: '' })); }} placeholder={ur ? 'اپنے الفاظ میں مسئلہ، اس کی جگہ اور مدت بیان کریں…' : 'Describe what happened, where it is, and how long it has affected the area…'} className={`${fieldClass(Boolean(errors.description) || words > MAX_COMPLAINT_WORDS)} min-h-52 resize-y leading-7`} />{errors.description && <p className="mt-2 text-xs font-medium text-[#B4233E]">{errors.description}</p>}{words > MAX_COMPLAINT_WORDS && !errors.description && <p className="mt-2 text-xs font-medium text-[#B4233E]">{ur ? 'شکایت ۲۰۰ الفاظ سے زیادہ ہے۔' : 'Keep the complaint within 200 words.'}</p>}</div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setStage(2)} disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] px-5 text-sm font-semibold hover:bg-[#F7F6F3] disabled:opacity-50"><ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />{copy.back}</button><button type="submit" disabled={isSubmitting || words > MAX_COMPLAINT_WORDS} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(104,24,34,0.22)] transition hover:bg-[#54131B] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}{isSubmitting ? (ur ? 'جمع ہو رہا ہے…' : 'Submitting…') : copy.submit}</button></div></form>}
        </div>
        <div className="flex items-start gap-3 border-t border-[#ECE8E3] bg-[#FCFBF9] px-6 py-4 text-xs leading-5 text-[#625D58] sm:px-9"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#681822]" />{copy.privacy}</div>
      </section>
    </div>
    {submission && <SubmissionModal submission={submission} formData={formData} copy={copy} ur={ur} onClose={() => setSubmission(null)} onEdit={() => { setSubmission(null); setStage(3); }} />}
  </main>;
};

const Field: React.FC<{ htmlFor?: string; label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ htmlFor, label, required, error, children }) => <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold">{label}{required && <span className="text-[#681822]"> *</span>}</label>{children}{error && <p className="mt-2 text-xs font-medium text-[#B4233E]">{error}</p>}</div>;
const ActionButton: React.FC<{ label: string }> = ({ label }) => <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(104,24,34,0.22)] transition hover:bg-[#54131B] sm:w-auto"><span>{label}</span><ChevronRight className="h-4 w-4" /></button>;

const SubmissionModal: React.FC<{ submission: SubmissionResult; formData: FullComplaintFormState; copy: Record<string, string>; ur: boolean; onClose: () => void; onEdit: () => void }> = ({ submission, formData, copy, ur, onClose, onEdit }) => {
  const isSuccess = !submission.isSimulated;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#171717]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="submission-title"><div className="w-full max-w-lg animate-[fadeIn_220ms_ease-out] rounded-[26px] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${isSuccess ? 'bg-emerald-50 text-emerald-800' : 'bg-[#F7EFF0] text-[#681822]'}`}>{isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{isSuccess ? copy.success : copy.preview}</span><h2 id="submission-title" className="mt-4 text-2xl font-bold">{isSuccess ? copy.success : (ur ? 'آپ کا فارم جائزے کے لیے تیار ہے' : 'Your form is ready to review')}</h2></div><button type="button" onClick={onClose} aria-label={copy.close} className="rounded-lg p-2 text-[#625D58] hover:bg-[#F7F6F3]"><X className="h-5 w-5" /></button></div><div className="mt-5 rounded-xl border border-[#E6E1DB] bg-[#FCFBF9] p-4 text-sm leading-6"><p className="font-semibold">{formData.applicant.citizenName}</p><p>{formData.location.locality}{formData.location.district ? ` · ${formData.location.district}` : ''}</p><p className="mt-2 text-[#625D58]">{formData.complaint.description}</p></div><div className="mt-5 rounded-xl border border-[#E6E1DB] p-4 text-sm leading-6 text-[#625D58]">{isSuccess ? (ur ? 'سرور نے آپ کی شکایت کی تصدیق کر دی ہے۔' : 'The server confirmed your complaint.') : (ur ? 'یہ ڈیمو موڈ ہے: کوئی حقیقی شکایت کسی سرور یا ادارے کو نہیں بھیجی گئی، اور کوئی ٹریکنگ نمبر نہیں بنایا گیا۔' : 'This is demo mode: no real complaint was delivered to a server or authority, and no tracking number was created.')}</div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onEdit} className="min-h-11 rounded-xl border border-[#D9D3CC] px-5 text-sm font-semibold hover:bg-[#F7F6F3]">{copy.edit}</button><button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[#681822] px-5 text-sm font-bold text-white hover:bg-[#54131B]">{copy.close}</button></div></div></div>;
};
