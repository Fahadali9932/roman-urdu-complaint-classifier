import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { countWords, MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import {
  ApplicantFormData,
  ComplaintDetailsData,
  FullComplaintFormState,
  PersistableComplaintData,
  ProblemLocationData,
} from '../../../types';
import { ProblemStep } from './ProblemStep';
import { LocationStep } from './LocationStep';
import { ApplicantStep } from './ApplicantStep';
import { ComplaintReviewModal } from '../components/ComplaintReviewModal';
import './editorial-casefile.css';

type IntakePhase = 'details' | 'contact';

export interface ComplaintWizardProps {
  embedded?: boolean;
}

const INITIAL_FORM_STATE: FullComplaintFormState = {
  applicant: { citizenName: '', citizenPhone: '', citizenEmail: '', applicantAddress: '' },
  location: { locality: '', district: '', isDistrictAutoResolved: false, districtNeedsConfirmation: false, publicLocation: '' },
  complaint: { title: '', description: '' },
};

export const ComplaintWizard: React.FC<ComplaintWizardProps> = () => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';
  const [phase, setPhase] = useState<IntakePhase>('details');
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM_STATE);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<{
    applicant: Partial<Record<keyof ApplicantFormData, string>>;
    location: Partial<Record<keyof ProblemLocationData, string>>;
    complaint: Partial<Record<keyof ComplaintDetailsData, string>>;
  }>({ applicant: {}, location: {}, complaint: {} });

  useEffect(() => {
    document.title = ur ? 'شکایت درج کریں — آوازِ عوام' : 'Write a Complaint — Awaaz-e-Awam';
  }, [ur]);

  const descriptionWords = countWords(formData.complaint.description);
  const isOverWordLimit = descriptionWords > MAX_COMPLAINT_WORDS;
  const complaintReady = Boolean(formData.complaint.title.trim() && formData.complaint.description.trim() && !isOverWordLimit);
  const locationReady = Boolean(formData.location.locality.trim() && formData.location.district && formData.location.publicLocation.trim());
  const phoneClean = formData.applicant.citizenPhone.replace(/[\s-]/g, '');
  const contactReady = Boolean(
    formData.applicant.citizenName.trim() &&
    /^((\+92)|(0092)|(03))\d{9}$/.test(phoneClean) &&
    (!formData.applicant.citizenEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicant.citizenEmail.trim()))
  );
  const completedGroups = [complaintReady, locationReady, contactReady].filter(Boolean).length;
  const progress = Math.round((completedGroups / 3) * 100);

  const updateComplaint = (field: keyof ComplaintDetailsData, value: string) => {
    setFormData((previous) => ({ ...previous, complaint: { ...previous.complaint, [field]: value } }));
    if (errors.complaint[field]) setErrors((previous) => ({ ...previous, complaint: { ...previous.complaint, [field]: undefined } }));
  };

  const updateLocation = (updates: Partial<ProblemLocationData>) => {
    setFormData((previous) => ({ ...previous, location: { ...previous.location, ...updates } }));
    setErrors((previous) => {
      const locationErrors = { ...previous.location };
      Object.keys(updates).forEach((key) => delete locationErrors[key as keyof ProblemLocationData]);
      return { ...previous, location: locationErrors };
    });
  };

  const updateApplicant = (field: keyof ApplicantFormData, value: string) => {
    setFormData((previous) => ({ ...previous, applicant: { ...previous.applicant, [field]: value } }));
    if (errors.applicant[field]) setErrors((previous) => ({ ...previous, applicant: { ...previous.applicant, [field]: undefined } }));
  };

  const validateDetails = () => {
    const complaint: Partial<Record<keyof ComplaintDetailsData, string>> = {};
    const location: Partial<Record<keyof ProblemLocationData, string>> = {};
    if (!formData.complaint.title.trim()) complaint.title = t('valTitleRequired') || t('valSubjectRequired');
    if (!formData.complaint.description.trim()) complaint.description = t('valDescRequired');
    else if (isOverWordLimit) complaint.description = t('valDescExceeded');
    if (!formData.location.locality.trim()) location.locality = t('valLocalityRequired');
    if (!formData.location.district) location.district = t('valDistrictRequired');
    if (!formData.location.publicLocation.trim()) location.publicLocation = t('valPublicLocationRequired') || t('valStreetLandmarkRequired');
    setErrors((previous) => ({ ...previous, complaint, location }));
    const firstInvalid = complaint.title ? 'title' : complaint.description ? 'description' : location.locality ? 'locality' : location.district ? 'district' : location.publicLocation ? 'publicLocation' : null;
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return false;
    }
    return true;
  };

  const validateContact = () => {
    const applicant: Partial<Record<keyof ApplicantFormData, string>> = {};
    if (!formData.applicant.citizenName.trim()) applicant.citizenName = t('valNameRequired');
    if (!phoneClean || !/^((\+92)|(0092)|(03))\d{9}$/.test(phoneClean)) applicant.citizenPhone = t('valPhoneRequired');
    if (formData.applicant.citizenEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicant.citizenEmail.trim())) applicant.citizenEmail = t('valEmailInvalid');
    setErrors((previous) => ({ ...previous, applicant }));
    const firstInvalid = applicant.citizenName ? 'citizenName' : applicant.citizenPhone ? 'citizenPhone' : applicant.citizenEmail ? 'citizenEmail' : null;
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return false;
    }
    return true;
  };

  const changePhase = (next: IntakePhase) => {
    setPhase(next);
    window.requestAnimationFrame(() => {
      const intake = document.getElementById('complaint-intake');
      if (typeof intake?.scrollIntoView === 'function') {
        intake.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  };

  const openReview = () => {
    if (!validateDetails() || !validateContact()) return;
    // Intentionally constructed but never sent or persisted. Contact phone and home address are excluded.
    const previewPayload: PersistableComplaintData = {
      citizenName: formData.applicant.citizenName,
      district: formData.location.district as PersistableComplaintData['district'],
      locality: formData.location.locality,
      publicLocation: formData.location.publicLocation,
      title: formData.complaint.title,
      description: formData.complaint.description,
      detectedLanguage: /[\u0600-\u06FF]/.test(formData.complaint.description) ? 'urdu' : 'roman_urdu',
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    void previewPayload;
    setShowModal(true);
  };

  const milestones = useMemo(() => [
    { label: ur ? 'مسئلہ' : 'Issue', ready: complaintReady },
    { label: ur ? 'مقام' : 'Location', ready: locationReady },
    { label: ur ? 'رابطہ' : 'Contact', ready: contactReady },
  ], [ur, complaintReady, locationReady, contactReady]);

  return (
    <main id="complaint-intake" className="intake" dir={ur ? 'rtl' : 'ltr'}>
      <div className="intake__frame">
        <header className="intake__header">
          <div>
            <p className="intake__eyebrow">{ur ? 'شہری ریکارڈ · پیش منظر' : 'Civic record · prototype preview'}</p>
            <h1>{ur ? 'اپنی بات واضح طور پر درج کریں' : 'Make the issue clear.'}</h1>
            <p className="intake__intro">{ur ? 'مختصر تفصیل اور درست عوامی مقام سے آغاز کریں۔' : 'A short description and a precise public location are enough to begin.'}</p>
          </div>
          <div className="intake__privacy" aria-label={ur ? 'رازداری کی یاد دہانی' : 'Privacy reminder'}>
            <ShieldCheck aria-hidden="true" />
            <span>{ur ? 'فون اور گھر کا پتہ محفوظ نہیں ہوتے' : 'Phone and home address stay out of the record'}</span>
          </div>
        </header>

        <section className="intake__progress" aria-label={ur ? 'فارم کی تکمیل' : 'Form completion'}>
          <div className="intake__progress-meta"><span>{ur ? `${completedGroups} از 3 بنیادی معلومات تیار` : `${completedGroups} of 3 essentials ready`}</span><strong>{progress}%</strong></div>
          <div className="intake__track" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completedGroups} aria-valuetext={ur ? `${completedGroups} از 3 بنیادی معلومات تیار` : `${completedGroups} of 3 essentials ready`}><span className="intake__fill" style={{ width: `${progress}%` }} /></div>
          <div className="intake__milestones">
            {milestones.map((milestone, index) => <span key={milestone.label} className={milestone.ready ? 'is-ready' : ''}><i>{milestone.ready ? <Check aria-hidden="true" /> : index + 1}</i>{milestone.label}</span>)}
          </div>
        </section>

        {phase === 'details' ? (
          <section className="intake__surface intake__surface--details" aria-labelledby="intake-details-title">
            <div className="intake__surface-heading"><span>01</span><div><p>{ur ? 'مسئلہ اور مقام' : 'Issue & location'}</p><h2 id="intake-details-title">{ur ? 'صرف ضروری تفصیل شامل کریں' : 'Start with what happened and where.'}</h2></div></div>
            <div className="intake__detail-grid">
              <section className="intake__section intake__section--problem"><ProblemStep data={formData.complaint} onChange={updateComplaint} errors={errors.complaint} wordCount={descriptionWords} /></section>
              <section className="intake__section intake__section--location"><LocationStep data={formData.location} onChange={updateLocation} errors={errors.location} /></section>
            </div>
            <footer className="intake__actions">
              <button type="button" className="intake__quiet" onClick={() => { setFormData(INITIAL_FORM_STATE); setErrors({ applicant: {}, location: {}, complaint: {} }); }}><RotateCcw aria-hidden="true" />{ur ? 'صاف کریں' : 'Clear draft'}</button>
              <button type="button" className="intake__primary" onClick={() => validateDetails() && changePhase('contact')} disabled={isOverWordLimit}>{ur ? 'رابطے کی تفصیل شامل کریں' : 'Add contact details'}<ArrowRight aria-hidden="true" /></button>
            </footer>
          </section>
        ) : (
          <section className="intake__surface intake__surface--contact" aria-labelledby="intake-contact-title">
            <div className="intake__surface-heading"><span>02</span><div><p>{ur ? 'رابطہ اور جائزہ' : 'Contact & review'}</p><h2 id="intake-contact-title">{ur ? 'رابطے کی معلومات شامل کریں' : 'Add a way to reach you.'}</h2></div></div>
            <div className="intake__contact-grid">
              <section className="intake__section"><ApplicantStep data={formData.applicant} onChange={updateApplicant} errors={errors.applicant} /></section>
              <aside className="intake__review-hint"><span>{ur ? 'تیار ہونے پر' : 'When ready'}</span><h3>{ur ? 'ایک مختصر جائزہ لیں' : 'Take one quick review.'}</h3><p>{ur ? 'جائزہ کھلنے سے پہلے ضروری معلومات کی جانچ ہوتی ہے۔ کوئی شکایت ارسال یا محفوظ نہیں کی جاتی۔' : 'We check the required details before opening your review. Nothing is sent or saved.'}</p></aside>
            </div>
            <footer className="intake__actions"><button type="button" className="intake__back" onClick={() => changePhase('details')}><ArrowLeft aria-hidden="true" />{ur ? 'تفصیلات میں واپس جائیں' : 'Back to details'}</button><button type="button" className="intake__primary" onClick={openReview}>{ur ? 'جائزہ کھولیں' : 'Open review'}<ArrowRight aria-hidden="true" /></button></footer>
          </section>
        )}
      </div>

      <ComplaintReviewModal isOpen={showModal} onClose={() => setShowModal(false)} formData={formData} onEditDetails={() => { setShowModal(false); changePhase('details'); }} onEditContact={() => { setShowModal(false); changePhase('contact'); }} />
    </main>
  );
};
