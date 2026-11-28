import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Home,
  Info,
  Lock,
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
import { IncidentPinPicker, type IncidentPin } from '../components/IncidentPinPicker';
import { IssuePhotoCaptureSection } from '../components/IssuePhotoCaptureSection';
import { verifySindhLocation } from '../../../lib/geo/sindhEligibility';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { KARACHI_DEPARTMENTS } from '../../../mocks/complaints';
import { complaintService, localV11ComplaintService } from '../../../services';
import {
  assessComplaintDraft,
  type ClarificationQuestion,
  type ClarificationAnswer,
} from '../../../services/complaintUnderstanding';
import { V11AnalysisResultView } from './V11AnalysisResultView';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import {
  ApplicantFormData,
  KarachiDistrict,
  ProblemLocationData,
  FullComplaintFormState,
  SubmissionResult,
} from '../../../types';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';

type Stage = 1 | 2 | 3 | 4;

const LEGACY_DRAFT_KEY = 'awaaz_complaint_draft_v1';
const GUEST_SESSION_KEY = 'awaaz_guest_draft_token_v2';

const getGuestToken = (): string => {
  if (typeof window === 'undefined' || !window.sessionStorage) return 'ephemeral';
  let token = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!token) {
    // Isolate an unsigned guest's local draft without predictable identifiers.
    // This key never grants access to a complaint or any server record.
    token = globalThis.crypto?.randomUUID?.() || '';
    if (!token) throw new Error('A secure browser context is required to save a guest draft.');
    sessionStorage.setItem(GUEST_SESSION_KEY, token);
  }
  return token;
};

const getDraftKey = (userId?: string | null): string => {
  if (userId) return `awaaz:draft:v2:citizen:${userId}`;
  return `awaaz:draft:v2:guest:${getGuestToken()}`;
};

const INITIAL_FORM: FullComplaintFormState = {
  applicant: { citizenName: '', citizenPhone: '', citizenEmail: '', applicantAddress: '' },
  location: {
    locality: '', district: '', isDistrictAutoResolved: false,
    districtNeedsConfirmation: false, publicLocation: '',
  },
  complaint: { title: '', description: '' },
};

interface TestPreset {
  id: string;
  label: string;
  category: string;
  locality: string;
  district: KarachiDistrict;
  publicLocation: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
}

const PRESET_CASES: TestPreset[] = [
  {
    id: 'road_original',
    label: '1. Road (KHI-2026-B1D32C02)',
    category: 'Single Issue (Road Damage)',
    locality: 'Machar Colony',
    district: 'District Keamari',
    publicLocation: 'Machar Colony Road',
    address: 'House 42, Sector 5, Machar Colony',
    latitude: 24.8475,
    longitude: 66.9854,
    description: 'Humare ghar ke pass wali road kharab hai isko jald se jald theek kiya jae',
  },
  {
    id: 'causal_motor',
    label: '2. Causal (Power -> Water Motor)',
    category: 'Causal Consequence',
    locality: 'Gulshan-e-Iqbal',
    district: 'District East',
    publicLocation: 'Block 4 Main Market',
    address: 'House 12, Street 3, Block 4',
    latitude: 24.9182,
    longitude: 67.0971,
    description: 'Bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi',
  },
  {
    id: 'independent_dual',
    label: '3. Independent (Road + Pipe)',
    category: 'Independent Multi-Agency',
    locality: 'Saddar',
    district: 'District South',
    publicLocation: 'Preedy Street near market',
    address: 'Flat 3-B, Commercial Area',
    latitude: 24.8594,
    longitude: 67.0241,
    description: 'Sarak mein gaddha hai aur public pani ki pipeline bhi leak kar rahi hai',
  },
  {
    id: 'negated_garbage',
    label: '4. Negated (Gas Fine, Waste Uncollected)',
    category: 'Negation Handling',
    locality: 'Korangi',
    district: 'District Korangi',
    publicLocation: 'Sector 31-D Main Road',
    address: 'House 88, Street 4, Sector 31-D',
    latitude: 24.8326,
    longitude: 67.1512,
    description: 'Gas ka koi masla nahi hai lekin hamari gali se kachra nahi uthaya ja raha',
  },
  {
    id: 'complex_collapse',
    label: '5. Complex (Pipe Burst + Road Collapse)',
    category: 'Dual Repair (Same Incident)',
    locality: 'Nazimabad',
    district: 'District Central',
    publicLocation: 'Block 2 near petrol pump',
    address: 'House 15, Block 2',
    latitude: 24.9144,
    longitude: 67.0321,
    description: 'Public water main phat gayi hai jiski wajah se road bhi dhans gayi. Dono pipeline aur road ko repair karna zaroori hai.',
  },
  {
    id: 'long_letter_180',
    label: '6. Full Letter (~175 Words)',
    category: 'Long-Form Complete Letter',
    locality: 'Clifton',
    district: 'District South',
    publicLocation: 'Block 2 near Boat Basin',
    address: 'House 204, Block 2, Clifton',
    latitude: 24.8138,
    longitude: 67.0299,
    description: 'Mohtaram afsaran, main Clifton Block 2 ka rehaishi hun aur nihayat adab se ap ki tawajjuh is ahem maslay ki taraf dilana chahta hun. Pichlay chand hafton se hamare ilaqay ki mukammal main sarak shadeed toot phoot ka shikar hai aur jaga jaga gehre khadday ban chukay hain jis se aam shehriyon aur traffic ko shaded mushkilaat ka samna hai. Barsat ke baad se halat mazeed kharab ho chuki hai aur footpath bhi toot phoot chuka hai. Hum barha ilaqay ke muaziz shehriyon ke sath mil kar guzarish kar chuke hain lekin abhi tak KMC ki taraf se koi amli iqdam nahi uthaya gaya. Rozana subah school jane wale bachay aur daftari mulazmeen is kharab sarak ki wajah se shadeed takleef uthate hain aur gaariyon ko bhi nuqsan pohanch raha hai. Baraye meherbani is shikayat ka fori notice liya jaye aur KMC ki engineering team bhej kar is sarak aur footpath ki jald az jald az-sar-e-nau taameer aur carpeting karwai jaye taake awam ko mazeed pareshani na ho. Shukriya.',
  },
  {
    id: 'v13_2_basia_typos',
    label: '7. Basia Bungalows (KE+KMC+SSWMB Typos)',
    category: 'V13.2 Spelling & Multi-Issue',
    locality: 'Gulshan-e-Iqbal',
    district: 'District East',
    publicLocation: 'Basia Bungalows Block 4 Gulshan',
    address: 'Bungalow 18, Block 4, Gulshan-e-Iqbal',
    latitude: 24.9182,
    longitude: 67.0971,
    description: 'Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he',
  },
  {
    id: 'v13_2_anger_gas',
    label: '8. Gas Outage with Anger & Noise',
    category: 'V13.2 Noise & Emotion Robustness',
    locality: 'Liaquatabad',
    district: 'District Central',
    publicLocation: 'Liaquatabad No 4 Main Bazaar',
    address: 'House 55, Street 2, Liaquatabad No 4',
    latitude: 24.9012,
    longitude: 67.0468,
    description: 'Lanat ho tum sab pe gas nahi arahi subah se chulha nahi chala bache bhooke hain pagal samjha hai kya hume gas ka pressure bilkul zero hai',
  },
];

export const SimplifiedComplaintContainer: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const [stage, setStage] = useState<Stage>(1);
  const [formData, setFormData] = useState<FullComplaintFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [incidentPin, setIncidentPin] = useState<IncidentPin | null>(null);
  const [isLocatingLocation, setIsLocatingLocation] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [evidenceNotice, setEvidenceNotice] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isTestMode, setIsTestMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'local-ai-test' || params.get('aiTest') === 'true';
  });
  const showDevTools = import.meta.env.DEV && (
    import.meta.env.MODE === 'test' ||
    searchParams.get('dev') === 'true' ||
    searchParams.get('mode') === 'local-ai-test' ||
    searchParams.get('aiTest') === 'true' ||
    isTestMode
  );
  const [selectedEngine, setSelectedEngine] = useState<
    'run004_v11' | 'v13_2_candidate' | 'v13_4_candidate' | 'v13_5_candidate' | 'v13_6_candidate'
  >('run004_v11');
  const [activeClarification, setActiveClarification] = useState<{
    question: ClarificationQuestion;
  } | null>(null);
  const [clarificationChoice, setClarificationChoice] = useState<string>('');
  const [clarificationDetails, setClarificationDetails] = useState<string>('');

  const applyPreset = (preset: TestPreset) => {
    setFormData({
      applicant: {
        citizenName: 'Fahad Malik (Test Citizen)',
        citizenPhone: '03001234567',
        citizenEmail: 'citizen.test@awaaz.local',
        applicantAddress: preset.address,
      },
      location: {
        locality: preset.locality,
        district: preset.district,
        publicLocation: preset.publicLocation,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      },
      complaint: {
        title: preset.description.slice(0, 50),
        description: preset.description,
      },
    });
    setIncidentPin({ latitude: preset.latitude, longitude: preset.longitude });
    const dummyBlob = new Blob(['preset-photo-evidence-test-bytes'], { type: 'image/jpeg' });
    const dummyFile = new File([dummyBlob], 'preset-evidence.jpg', { type: 'image/jpeg' });
    setPhoto(dummyFile);
    setPhotoPreviewUrl('');
    setStage(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // One-time startup purge of legacy unnamespaced draft key
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(LEGACY_DRAFT_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Restore draft safely scoped to active authenticated user or guest token
  useEffect(() => {
    let active = true;

    const hydrateSafeDraft = (userId: string | null) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const key = getDraftKey(userId);
          const saved = sessionStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              // PII DEFENSE: Only restore non-sensitive public location and complaint text.
              // Applicant PII is strictly kept in React memory for the active user session!
              setFormData((prev) => ({
                ...prev,
                location: { ...prev.location, ...(parsed.location || {}) },
                complaint: { ...prev.complaint, ...(parsed.complaint || {}) },
              }));
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }
    };

    if (isSupabaseConfigured() && supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        const uid = data.session?.user?.id || null;
        setCurrentUserId(uid);
        hydrateSafeDraft(uid);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        const nextUid = session?.user?.id || null;
        if (nextUid !== currentUserId) {
          // Cross-identity switch: Blank out all previous form data immediately
          setFormData(INITIAL_FORM);
          setErrors({});
          setCurrentUserId(nextUid);
          hydrateSafeDraft(nextUid);
        }
      });

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } else {
      hydrateSafeDraft(null);
    }
  }, [currentUserId]);

  // Save non-sensitive draft only (narrative + incident location)
  const saveDraft = (nextForm: FullComplaintFormState) => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const key = getDraftKey(currentUserId);
        const safePayload = {
          location: nextForm.location,
          complaint: nextForm.complaint,
        };
        sessionStorage.setItem(key, JSON.stringify(safePayload));
      }
    } catch {
      // Ignore write errors
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
    Boolean(photo),
    Boolean(
      formData.location.locality &&
      formData.location.district &&
      formData.location.publicLocation.trim() &&
      formData.applicant.applicantAddress.trim() &&
      incidentPin
    ),
    words > 0 && words <= MAX_COMPLAINT_WORDS,
  ];
  const progress = Math.max(0, Math.min(100, ((stage - 1) * 25) + (complete[stage - 1] ? 25 : 8)));

  const copy = ur ? {
    title: 'اپنی شکایت درج کریں', intro: 'چار مختصر مراحل میں اپنا عوامی مسئلہ درج کریں۔',
    details: 'آپ کی تفصیلات', photo: 'مسئلے کی تصویر', location: 'مقام', complaint: 'شکایت',
    detailsLead: 'آپ سے رابطے کے لیے صرف ضروری معلومات لیں گے۔',
    photoLead: 'مسئلے کی واضح تصویر لیں۔',
    locationLead: 'کراچی میں اس عوامی مسئلے کی جگہ بتائیں۔',
    complaintLead: 'اپنے الفاظ میں بتائیں کہ کیا ہوا۔',
    name: 'پورا نام', phone: 'پاکستانی موبائل نمبر', email: 'ای میل (اختیاری)',
    locationLabel: 'علاقہ / محلہ', district: 'کراچی کا ضلع', landmark: 'گلی، بلاک یا قریبی نشانی',
    address: 'رہائشی پتہ', addressHelp: 'یہ شکایت مکمل کرنے کے لیے ضروری ہے؛ نجی ریکارڈ میں محفوظ کی جاتی ہے اور محکمانہ عملے سے شیئر نہیں کی جاتی۔',
    description: 'شکایت کی تفصیل', continue: 'آگے بڑھیں', back: 'واپس', submit: 'شکایت جمع کروائیں',
    privacy: 'آپ کے رابطے کی تفصیلات صرف شکایت کے انتظام کے لیے استعمال ہوتی ہیں اور محکمانہ عملے کو نہیں دکھائی جاتیں۔',
    emailNote: 'ای میل صرف رابطے کے لیے لی جاتی ہے؛ اطلاعات کا وعدہ تبھی ہوگا جب ای میل سروس فعال ہو۔',
    streetHelp: 'سڑک، بلاک یا قریبی نشانی مسئلے کی جگہ سمجھنے میں مدد دیتی ہے۔',
    success: 'شکایت درج ہو گئی', close: 'بند کریں',
  } : {
    title: 'Write your complaint', intro: 'Report a public issue in four straightforward steps.',
    details: 'Your details', photo: 'Issue photo', location: 'Location', complaint: 'Complaint',
    detailsLead: 'We only collect the contact details needed to reach you.',
    photoLead: 'Capture a clear photograph of the issue.',
    locationLead: 'Tell us where this public issue is happening in Karachi.',
    complaintLead: 'Describe what happened in your own words.',
    name: 'Full name', phone: 'Pakistani mobile number', email: 'Email (optional)',
    locationLabel: 'Area / Locality', district: 'Karachi district', landmark: 'Street, block or nearby landmark',
    address: 'Home address', addressHelp: 'Required to complete your report. Stored in private records and never shared with department staff.',
    description: 'Complaint description', continue: 'Continue', back: 'Back', submit: 'Submit Complaint',
    privacy: 'We use your contact details to manage your complaint. They are kept private and never shown to department staff.',
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
      if (!photo) {
        next.photo = ur ? 'براہِ کرم آگے بڑھنے کے لیے مسئلے کی تصویر لیں۔' : 'Please capture a photo of the issue to proceed.';
      }
    }
    if (target === 3) {
      if (!formData.location.locality.trim()) next.locality = ur ? 'علاقہ درج کریں۔' : 'Enter an area or locality.';
      if (!formData.location.district) next.district = ur ? 'ضلع منتخب کریں۔' : 'Select a Karachi district.';
      if (!formData.location.publicLocation.trim()) next.publicLocation = ur ? 'قریبی نشانی درج کریں۔' : 'Enter the incident street or landmark.';
      if (!formData.applicant.applicantAddress.trim()) next.applicantAddress = ur ? 'رہائشی پتہ درج کریں۔' : 'Enter your home address.';
      if (!incidentPin) {
        next.incidentLocation = ur ? 'جاری رکھنے کے لیے مقام کی اجازت دیں یا مقام شامل کریں۔' : 'Attach your location while at the issue site to continue.';
      } else {
        const pinCheck = verifySindhLocation(incidentPin.latitude, incidentPin.longitude);
        if (!pinCheck.eligible) {
          next.incidentLocation = ur ? 'یہ مقام ہماری سروس کے دائرہ کار سے باہر ہے۔' : 'This location is outside our service area.';
        }
      }
    }
    if (target === 4) {
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
  const submit = async (overrideAnswer?: ClarificationAnswer) => {
    if (isSubmittingRef.current || isSubmitting) return;
    if (!validate(4)) return;
    if (!photo) {
      setErrors(current => ({...current,photo:ur?'مسئلے کی تصویر لیں۔':'Capture a photograph of the issue.'}));
      setStage(2);
      return;
    }

    if (!incidentPin) {
      const msg = ur ? 'جاری رکھنے کے لیے مقام کی اجازت دیں یا مقام شامل کریں۔' : 'Attach your location while at the issue site to continue.';
      setErrors((current) => ({
        ...current,
        incidentLocation: msg,
        submit: msg,
      }));
      setStage(3);
      return;
    }

    const pinCheck = verifySindhLocation(incidentPin.latitude, incidentPin.longitude);
    if (!pinCheck.eligible) {
      const msg = ur ? 'یہ مقام ہماری سروس کے دائرہ کار سے باہر ہے۔' : 'This location is outside our service area.';
      setErrors((current) => ({
        ...current,
        incidentLocation: msg,
        submit: msg,
        submitCode: pinCheck.code,
      }));
      setStage(3);
      return;
    }

    if (!overrideAnswer) {
      const activeService = import.meta.env.DEV && isTestMode ? localV11ComplaintService : complaintService;
      const preview = (activeService as any).previewComplaint
        ? (activeService as any).previewComplaint(formData.complaint.description.trim())
        : assessComplaintDraft(formData.complaint.description.trim());
      if (preview.state === 'ask') {
        setActiveClarification({ question: preview.question });
        setClarificationChoice('');
        setClarificationDetails('');
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrors((current) => {
      const next = { ...current };
      delete next.submit;
      delete next.submitCode;
      return next;
    });

    try {
      const activeService = (import.meta.env.DEV && isTestMode) ? localV11ComplaintService : complaintService;
      const result = await activeService.submitComplaint({
        citizenName: formData.applicant.citizenName,
        citizenPhone: formData.applicant.citizenPhone,
        citizenEmail: formData.applicant.citizenEmail,
        residentialAddress: formData.applicant.applicantAddress,
        locality: formData.location.locality,
        district: formData.location.district as KarachiDistrict,
        publicLocation: formData.location.publicLocation,
        incidentLatitude: incidentPin.latitude,
        incidentLongitude: incidentPin.longitude,
        title: formData.complaint.description.trim().slice(0, 50) || 'Public complaint',
        description: formData.complaint.description.trim(),
        isDemonstration: Boolean(import.meta.env.DEV && isTestMode),
        clarificationAnswer: overrideAnswer,
        photo,
      });
      setEvidenceNotice(result.isSimulated ? 'Local test mode does not store photos.' : '');
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(getDraftKey(currentUserId));
        sessionStorage.removeItem(LEGACY_DRAFT_KEY);
      }
      setActiveClarification(null);
      setSubmission(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit complaint.';
      const code = (error as { code?: string })?.code || '';
      setErrors((current) => ({ ...current, submit: message, submitCode: code }));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };



  const handleClarificationConfirm = () => {
    if (!activeClarification) return;
    const q = activeClarification.question;
    let answer: ClarificationAnswer;
    if (q.kind === 'choice') {
      if (!clarificationChoice) return;
      answer = {
        draftText: formData.complaint.description.trim(),
        questionId: q.id as any,
        choice: clarificationChoice as any,
      };
    } else {
      if (!clarificationDetails.trim()) return;
      const draftWords = formData.complaint.description.trim().split(/\s+/).filter(Boolean).length;
      const detailsWords = clarificationDetails.trim().split(/\s+/).filter(Boolean).length;
      if (draftWords + detailsWords > MAX_COMPLAINT_WORDS) {
        setErrors((current) => ({
          ...current,
          submit: ur
            ? 'شکایت اور اضافی تفصیلات ۲۰۰ الفاظ سے زیادہ ہیں۔'
            : 'Complaint description with additional details cannot exceed 200 words.',
        }));
        return;
      }
      answer = {
        draftText: formData.complaint.description.trim(),
        questionId: q.id as any,
        details: clarificationDetails.trim(),
      };
    }
    submit(answer);
  };

  const handleClarificationSkip = () => {
    if (!activeClarification) return;
    const answer: ClarificationAnswer = {
      draftText: formData.complaint.description.trim(),
      questionId: activeClarification.question.id as any,
      skip: true,
    };
    submit(answer);
  };

  const fieldClass = (hasError: boolean) =>
    `field-refined w-full px-4 py-3 text-[14px] sm:text-[15px] placeholder:text-[#88827A] ${
      hasError ? 'field-refined-error' : ''
    }`;
  const stages = [copy.details, copy.photo, copy.location, copy.complaint];

  return (
    <div
      className="write-complaint-wrapper relative w-full bg-[#F7F6F3] text-[#171717]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="write-complaint-viewport sticky bottom-0 z-10 w-full px-4 pt-20 pb-10 sm:px-6 sm:pt-24 sm:pb-14 lg:pt-28 lg:pb-16 motion-reduce:static">
        <div className="mx-auto max-w-[780px] w-full">
          {/* Development-Only Local AI Test Mode Banner & Presets (Accessible via ?dev=true or test mode) */}
          {showDevTools && (
            <div
              className={`mb-6 rounded-2xl border p-4 sm:p-5 shadow-sm text-start transition ${
                isTestMode
                  ? 'border-amber-300 bg-amber-50/95 ring-1 ring-amber-300'
                  : 'border-slate-200 bg-white'
              }`}
              data-testid="local-ai-test-banner"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold shrink-0 shadow-2xs ${
                      isTestMode ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    🧪
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                        LOCAL AI TEST MODE
                      </span>
                      <span className="text-[11px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        V11 Champion (Run004 • SHA: E4D04293)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Executes inference 100% locally in browser. Zero network calls to Supabase. Zero DB mutations.
                    </p>
                    {isTestMode && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <label className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                          Model Candidate:
                        </label>
                        <select
                          value={selectedEngine}
                          onChange={(e) => {
                            const val = e.target.value as
                              | 'run004_v11'
                              | 'v13_2_candidate'
                              | 'v13_4_candidate'
                              | 'v13_5_candidate'
                              | 'v13_6_candidate';
                            setSelectedEngine(val);
                            (localV11ComplaintService as any).setEngineMode?.(val);
                          }}
                          className="text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-slate-800 shadow-2xs focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="v13_6_candidate">
                            V13.6 Experimental (Independent Issue Recovery • 3+ Human Review)
                          </option>
                          <option value="v13_5_candidate">
                            V13.5 Candidate (Two-Department Policy • 1-2 Dept Auto-Routing, 3+ Human Review)
                          </option>
                          <option value="v13_4_candidate">
                            V13.4 Candidate (Causal Reasoning & False-Extra Reduced)
                          </option>
                          <option value="v13_2_candidate">
                            V13.2 Candidate (Enhanced Issue Understanding & Normalization)
                          </option>
                          <option value="run004_v11">
                            V11 Champion (Run004 - Active Runtime Baseline)
                          </option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {isTestMode ? 'ENABLED' : 'OFF'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTestMode}
                      onChange={(e) => setIsTestMode(e.target.checked)}
                      className="sr-only peer"
                      aria-label="Toggle Local AI Test Mode"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#681822]"></div>
                  </label>
                </div>
              </div>

              {/* Quick-Fill Presets for Phase V11.4.3 Evaluation */}
              {isTestMode && (
                <div className="mt-4 pt-3.5 border-t border-amber-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      ⚡ Quick-Fill Civic Test Complaints (Including V13.2 Basia Bungalows & Anger Cases):
                    </p>
                    <span className="text-[10px] text-amber-700 italic">
                      Click to auto-populate and jump to Step 3
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {PRESET_CASES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="flex flex-col text-start rounded-xl bg-white border border-amber-200/80 p-2.5 hover:bg-amber-100/60 hover:border-amber-300 transition cursor-pointer shadow-2xs group"
                      >
                        <span className="text-xs font-bold text-[#681822] group-hover:text-[#52131B]">
                          {preset.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                          {preset.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Page Header */}
          <header className="mb-7 text-center sm:mb-9">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#681822]">
              Awaaz-e-Awam
            </p>
            <h1 className="font-display text-[1.65rem] font-extrabold tracking-tight text-[#141414] sm:text-[2rem] lg:text-[2.25rem] lg:leading-[1.15]">
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
              <span>{ur ? `مرحلہ ${stage} از ۴` : `Step ${stage} of 4`}</span>
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
            <ol className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
              {stages.map((label, index) => {
                const itemStage = (index + 1) as Stage;
                const active = itemStage === stage;
                const passed = itemStage < stage || complete[index];
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => (itemStage <= stage || complete[index]) && setStage(itemStage)}
                      className={`mx-auto flex min-h-9 items-center gap-1.5 sm:gap-2 rounded-full px-1.5 sm:px-2 text-xs sm:text-[13px] font-semibold transition ${
                        active ? 'text-[#681822]' : 'text-[#817A73]'
                      } ${
                        itemStage <= stage || complete[index]
                          ? 'cursor-pointer hover:text-[#681822]'
                          : 'cursor-default'
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold transition-colors shrink-0 ${
                          passed
                            ? 'border-[#681822] bg-[#681822] text-white'
                            : active
                              ? 'border-[#681822] bg-[#F7EFF0] text-[#681822]'
                              : 'border-[#D7D1CB] text-[#817A73]'
                        }`}
                      >
                        {passed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="hidden sm:inline truncate">{label}</span>
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
                    {stage === 1
                      ? copy.detailsLead
                      : stage === 2
                        ? copy.photoLead
                        : stage === 3
                          ? copy.locationLead
                          : copy.complaintLead}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-9 lg:p-10">
              {errors.submit && (
                errors.submitCode === 'CITIZEN_ACCOUNT_REQUIRED' ? (
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
                        onClick={() => { void submit(); }}
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
                <div className="mx-auto max-w-2xl space-y-5 text-start">
                  <IssuePhotoCaptureSection
                    photo={photo}
                    photoPreviewUrl={photoPreviewUrl}
                    onPhotoCaptured={(compressedFile, previewUrl) => {
                      setPhoto(compressedFile);
                      setPhotoPreviewUrl(previewUrl);
                      setErrors((current) => {
                        const next = { ...current };
                        delete next.photo;
                        return next;
                      });
                    }}
                    onPhotoRemoved={() => {
                      setPhoto(null);
                      setPhotoPreviewUrl(null);
                    }}
                    error={errors.photo}
                    isSubmitting={isSubmitting}
                  />

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStage(1)}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-sm sm:text-[15px] font-semibold text-[#171717] hover:bg-[#F2EFEA] transition cursor-pointer"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {copy.back}
                    </button>
                    <button
                      type="button"
                      onClick={continueStage}
                      disabled={!photo}
                      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm sm:text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition hover:bg-[#53131B] active:scale-[0.99] sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{copy.continue}</span>
                      <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {stage === 3 && (
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

                  <IncidentPinPicker
                    value={incidentPin}
                    onChange={(pin) => {
                      setIncidentPin(pin);
                      setErrors((current) => ({ ...current, incidentLocation: '', submit: '', submitCode: '' }));
                    }}
                    onLocatingChange={setIsLocatingLocation}
                    error={errors.incidentLocation}
                  />

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
                      onClick={() => setStage(2)}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-sm sm:text-[15px] font-semibold text-[#171717] hover:bg-[#F2EFEA] transition cursor-pointer"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {copy.back}
                    </button>
                    <ActionButton label={copy.continue} disabled={!incidentPin || isLocatingLocation} />
                  </div>
                </form>
              )}

              {stage === 4 && (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (activeClarification) return;
                    submit();
                  }}
                  className="mx-auto max-w-2xl space-y-5 text-start"
                >
                  <div>
                    {/* Bilingual Guest Submission Informational Notice */}
                    <div
                      data-testid="guest-submission-notice"
                      className="mb-4 rounded-xl border border-[#E6E3DF] bg-[#FAF9F7] p-3.5 sm:p-4 text-start"
                    >
                      <div className="flex items-start gap-2.5">
                        <Info className="h-4 w-4 shrink-0 text-[#681822] mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-[13px] font-bold text-[#141414]">
                            {ur
                              ? 'شکایت درج کرنے کے لیے اکاؤنٹ بنانا لازمی نہیں ہے۔'
                              : 'No account required to submit a complaint.'}
                          </p>
                          <p className="text-xs leading-relaxed text-[#625D58]">
                            {ur
                              ? 'شکایت درج ہونے کے بعد ملنے والا 24 ہندسوں کا نجی ٹریکنگ نمبر محفوظ رکھیں۔ اس نمبر سے بغیر اکاؤنٹ کے پیش رفت دیکھ سکتے ہیں۔'
                              : 'After submitting, save the private 24-digit tracking number on your receipt. Use it to check progress without creating an account.'}
                          </p>
                        </div>
                      </div>
                    </div>

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
                        if (activeClarification) {
                          setActiveClarification(null);
                        }
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

                  {activeClarification && (
                    <div
                      data-testid="inline-clarification-card"
                      className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-4 sm:p-5 shadow-sm space-y-4 text-start animate-in fade-in duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white text-sm font-bold shrink-0">
                          💡
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-amber-950">
                            {ur ? 'وضاحت درکار ہے (مقامی اے آئی جائزہ)' : 'Clarification Needed (Local AI Preflight)'}
                          </h4>
                          <p className="text-xs sm:text-[13px] text-amber-900 leading-relaxed font-medium">
                            {ur
                              ? activeClarification.question.prompt.ur
                              : activeClarification.question.prompt.en}
                          </p>
                        </div>
                      </div>

                      {'options' in activeClarification.question && activeClarification.question.options && (
                        <div className="space-y-2 pt-1">
                          {activeClarification.question.options.map((opt) => (
                            <label
                              key={opt.value}
                              data-testid={`clarification-option-${opt.value}`}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition ${
                                clarificationChoice === opt.value
                                  ? 'border-amber-500 bg-white shadow-2xs font-semibold text-amber-950 ring-1 ring-amber-400'
                                  : 'border-amber-200 bg-white/70 hover:bg-white text-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name="clarificationChoice"
                                value={opt.value}
                                checked={clarificationChoice === opt.value}
                                onChange={() => setClarificationChoice(opt.value)}
                                className="mt-0.5 text-amber-600 focus:ring-amber-500"
                              />
                              <span>{ur ? opt.label.ur : opt.label.en}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {activeClarification.question.kind === 'details' && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            data-testid="clarification-details-input"
                            rows={3}
                            value={clarificationDetails}
                            onChange={(e) => setClarificationDetails(e.target.value)}
                            placeholder={
                              ur
                                ? 'براہ کرم مزید تفصیلات یہاں درج کریں…'
                                : 'Please enter additional details here…'
                            }
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={() => setActiveClarification(null)}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                        >
                          {ur ? 'منسوخ' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          data-testid="clarification-skip-btn"
                          onClick={handleClarificationSkip}
                          className="px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                        >
                          {ur ? 'چھوڑیں / جائزے کے لیے جمع کریں' : 'Skip / Proceed to Review'}
                        </button>
                        <button
                          type="button"
                          data-testid="clarification-submit-btn"
                          onClick={handleClarificationConfirm}
                          disabled={
                            'options' in activeClarification.question
                              ? !clarificationChoice
                              : !clarificationDetails.trim()
                          }
                          className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition shadow-2xs cursor-pointer"
                        >
                          {ur ? 'وضاحت کے ساتھ جمع کریں' : 'Confirm & Submit'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStage(3)}
                      disabled={isSubmitting}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-sm sm:text-[15px] font-semibold text-[#171717] hover:bg-[#F2EFEA] disabled:opacity-50 transition cursor-pointer"
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                      {copy.back}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || words > MAX_COMPLAINT_WORDS || Boolean(activeClarification)}
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
        submission.v11Analysis ? (
          <V11AnalysisResultView
            submission={submission}
            analysis={submission.v11Analysis}
            ur={ur}
            onClose={() => {
              setSubmission(null);
            }}
            onReset={() => {
              setSubmission(null);
              setStage(4);
            }}
          />
        ) : (
          <SubmissionModal
            submission={submission}
            formData={formData}
            copy={copy}
            ur={ur}
            evidenceNotice={evidenceNotice}
            onClose={() => {
              setSubmission(null);
              setFormData(INITIAL_FORM);
              setPhoto(null);
              setIncidentPin(null);
              setEvidenceNotice('');
              setStage(1);
            }}
          />
        )
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

const ActionButton: React.FC<{ label: string; disabled?: boolean; id?: string }> = ({ label, disabled, id }) => (
  <button
    id={id}
    type="submit"
    disabled={disabled}
    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-sm sm:text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition hover:bg-[#53131B] active:scale-[0.99] sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#681822]"
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
  evidenceNotice?: string;
  onClose: () => void;
}> = ({ submission, copy, ur, evidenceNotice, onClose }) => {
  const navigate = useNavigate();
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(submission.referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const handleCopyTracking = async () => {
    if (!submission.guestTrackingNumber) return;
    try {
      await navigator.clipboard.writeText(submission.guestTrackingNumber);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const deptMeta = submission.departmentId ? KARACHI_DEPARTMENTS[submission.departmentId] : null;
  // A classifier candidate is not proof that the department accepted an assignment.
  // Never display a predicted name when the case is held for human routing.
  const confirmedRouting = ['assigned', 'accepted', 'in_progress', 'resolved', 'partly_resolved'].includes(submission.status || '');
  const verifiedDepartments = (submission.departments || []).filter((d) => Boolean(KARACHI_DEPARTMENTS[d]));
  const isUnderReview = submission.needsReview || !confirmedRouting ||
    (verifiedDepartments.length === 0 && !deptMeta);
  const deptDisplayName = ur
    ? deptMeta?.nameUrdu || deptMeta?.name || 'بلدیاتی ادارہ'
    : deptMeta?.name || submission.departmentId?.toUpperCase() || 'Municipal Authority';

  const formattedGuestTracking = submission.guestTrackingNumber
    ? submission.guestTrackingNumber.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || submission.guestTrackingNumber
    : null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#141414]/60 p-2 sm:p-5 backdrop-blur-xs font-ui text-start"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-title"
    >
      <div className="w-full max-w-[660px] animate-in fade-in zoom-in-95 duration-200 rounded-[26px] sm:rounded-[30px] bg-white p-5 sm:p-9 shadow-2xl max-h-[94dvh] sm:max-h-[90dvh] overflow-y-auto">
        {/* Header: Emerald checkmark and single title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600">
              <CheckCircle2 className="h-7 w-7 sm:h-9 sm:w-9 stroke-[2.3]" />
            </div>
            <div>
              <h2
                id="submission-title"
                aria-label={ur ? 'شکایت موصول ہو گئی' : 'Complaint Received - Complaint Submitted Successfully'}
                className="text-2xl sm:text-4xl font-black text-[#141414] tracking-tight leading-tight"
              >
                {ur ? 'شکایت موصول ہو گئی' : 'Complaint Received'}
              </h2>
              <p className="mt-2 text-base font-medium text-[#514A45]">
                {ur ? 'آپ کی شکایت کا باقاعدہ اندراج کر لیا گیا ہے۔' : 'Your complaint has been registered successfully.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close || 'Close'}
            className="rounded-xl p-2 text-[#88827A] hover:bg-[#FAF9F7] transition cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {evidenceNotice && (
          <div role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            <p>{evidenceNotice}</p>

          </div>
        )}

        {/* 1. Primary Code Display: ONE Secret Tracking Card for Guests */}
        {submission.guestTrackingNumber ? (
          <div className="mt-6 rounded-[22px] border-2 border-[#681822] bg-[#FCF8F8] p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#681822] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#681822]" />
                {ur ? 'آپ کا نجی ٹریکنگ کوڈ' : 'Your Private Tracking Code'}
              </span>
              <span className="text-[10px] font-bold uppercase bg-[#681822] text-white px-2.5 py-0.5 rounded-full">
                {ur ? 'محفوظ رکھیں' : 'Keep Private'}
              </span>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="font-mono text-[clamp(1.15rem,4.1vw,1.65rem)] font-black tracking-[0.04em] leading-snug text-[#141414] select-all break-words">
                {formattedGuestTracking}
              </span>
              <button
                type="button"
                onClick={handleCopyTracking}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border-2 border-[#681822] bg-white px-4 py-2 text-sm font-bold text-[#681822] hover:bg-[#F7EFF0] transition cursor-pointer shrink-0"
                aria-label="Copy code"
              >
                {copiedTracking ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[#681822]" />}
                <span>{copiedTracking ? (ur ? 'کاپی ہو گیا' : 'Copied!') : (ur ? 'کوڈ کاپی کریں' : 'Copy Code')}</span>
              </button>
            </div>

            <p className="mt-4 text-sm font-medium leading-relaxed text-[#4C4541]">
              {ur
                ? 'اس 24 ہندسی نمبر کو محفوظ رکھیں۔ آپ کسی بھی ڈیوائس پر بغیر لاگ ان کیے اس کوڈ کے ذریعے اپنی شکایت کی پیش رفت دیکھ سکتے ہیں۔'
                : 'Keep this 24-digit code private. You can track your complaint progress on any device at /track without signing in or creating an account.'}
            </p>
          </div>
        ) : (
          /* Authenticated Citizen Reference Display */
          <div className="mt-6 rounded-2xl border border-[#D9D3CC] bg-[#FAF9F7] p-5">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#681822]">
              {ur ? 'سرکاری کیس حوالہ نمبر' : 'Official Case Reference Number'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-mono text-xl sm:text-2xl font-black tracking-wide text-[#141414]">
                {submission.referenceNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9D3CC] bg-white px-3.5 py-2 text-xs font-semibold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
                aria-label="Copy reference number"
              >
                {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#625D58]" />}
                <span>{copiedRef ? (ur ? 'کاپی ہو گیا' : 'Copied!') : (ur ? 'حوالہ کاپی کریں' : 'Copy Reference')}</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-[#5A554E]">
              {ur
                ? 'یہ شکایت آپ کے اکاؤنٹ سے منسلک ہو گئی ہے اور ڈیش بورڈ پر موجود ہے۔'
                : 'This case is linked to your account and is available in My Complaints.'}
            </p>
          </div>
        )}

        {/* 2. Department Routing & Progress Card */}
        <div className="mt-5 rounded-[22px] border border-[#DDD4D0] bg-[#FAF9F7] p-5 sm:p-6 space-y-3">
          {isUnderReview ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#625D58]">
                  {ur ? 'بلدیاتی تفویض' : 'Department Assignment'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                  {ur ? 'محکمے کی تصدیق باقی ہے' : 'Assignment pending'}
                </span>
              </div>
              <h3 className="mt-3 text-xl sm:text-2xl font-black text-[#191515]">
                {ur ? 'متعلقہ محکمے کو بھیجی جا رہی ہے' : 'Being directed to the relevant department'}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[#4C4541]">
                {ur
                  ? 'آپ کی شکایت درج کر لی گئی ہے۔ متعلقہ محکمے کی تصدیق ہوتے ہی یہاں نام ظاہر ہوگا۔'
                  : 'Your complaint has been received. The department name will appear once the assignment is confirmed.'}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#625D58]">
                  {verifiedDepartments.length > 1
                    ? ur ? 'تفویض شدہ بلدیاتی محکمے' : 'Assigned Departments'
                    : ur ? 'تفویض شدہ بلدیاتی محکمہ' : 'Assigned Department'}
                </span>
                <span className="inline-flex items-center rounded-md bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-[#92400E] shrink-0">
                  {ur ? 'محکمانہ منظوری کا انتظار' : 'Pending Acceptance'}
                </span>
              </div>

              {verifiedDepartments.length > 1 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {verifiedDepartments.map((d) => {
                    const m = KARACHI_DEPARTMENTS[d];
                    const name = ur ? m?.nameUrdu || m?.name || d.toUpperCase() : m?.name || d.toUpperCase();
                    return (
                      <span key={d} className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        {name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 font-display font-black text-[#141414] text-lg sm:text-2xl">
                  {deptDisplayName}
                </div>
              )}

              <p className="mt-2 text-base font-medium leading-relaxed text-[#4C4541]">
                {verifiedDepartments.length > 1
                  ? ur
                    ? 'آپ کی شکایت متعلقہ بلدیاتی محکموں کو بھیج دی گئی ہے اور منظوری کے منتظر ہے۔'
                    : 'Your complaint has been forwarded to the assigned municipal departments and is awaiting acceptance.'
                  : ur
                    ? `آپ کی شکایت ${deptDisplayName} کو بھیج دی گئی ہے اور محکمانہ توثیق کے منتظر ہے۔`
                    : `Your complaint has been forwarded to ${deptDisplayName} and is awaiting department acceptance.`}
              </p>
            </div>
          )}
        </div>

        {/* 3. Action Buttons (Zero PII Exposed, Safe State Navigation) */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/');
              }}
              aria-label={ur ? 'ہوم پیج پر جائیں' : 'Return Home'}
              className="min-h-11 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-5 text-xs sm:text-sm font-semibold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
            >
              {ur ? 'ہوم پیج پر جائیں' : 'Return Home'}
            </button>

            {submission.guestTrackingNumber ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // CRITICAL SECURITY: Safe navigation via state, NEVER query parameter leak!
                  navigate('/track', {
                    state: { trackingNumber: submission.guestTrackingNumber },
                  });
                }}
                className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-xs sm:text-sm font-bold text-white hover:bg-[#53131B] shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition cursor-pointer"
              >
                <span>{ur ? 'شکایت ٹریک کریں' : 'Track Complaint'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
                className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#681822] px-6 text-xs sm:text-sm font-bold text-white hover:bg-[#53131B] shadow-[0_4px_16px_rgba(104,24,34,0.20)] transition cursor-pointer"
              >
                <span>{ur ? 'میری شکایات دیکھیں' : 'View in My Complaints'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {submission.guestTrackingNumber && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/register');
                }}
                aria-label={ur ? 'اکاؤنٹ بنائیں' : 'Create an optional citizen account'}
                className="text-sm text-[#681822] hover:underline cursor-pointer font-semibold"
              >
                {ur ? 'اختیاری: اپنی شکایات ایک جگہ رکھنے کے لیے اکاؤنٹ بنائیں →' : 'Optional: Create an account to manage future complaints →'}
              </button>
            </div>
          )}
        </div>
      </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
