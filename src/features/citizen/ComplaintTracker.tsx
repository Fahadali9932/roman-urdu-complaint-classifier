import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import {
  FolderOpen,
  KeyRound,
  PenTool,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { complaintService } from '../../services';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';

type PendingClaim = { referenceNumber: string; claimCode: string };
const PENDING_CLAIM_KEY = 'awaaz-pending-complaint-claim';

const readPendingClaim = (): PendingClaim | null => {
  try {
    const value = sessionStorage.getItem(PENDING_CLAIM_KEY);
    return value ? (JSON.parse(value) as PendingClaim) : null;
  } catch {
    return null;
  }
};

export const ComplaintTracker: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const navigate = useNavigate();
  const location = useLocation();
  const { referenceNumber: routeRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();
  const routeReference = routeRef || searchParams.get('ref') || '';
  const initialCodeParam = searchParams.get('code') || '';
  const pending = readPendingClaim();

  // Mode: if routeReference is given, default to claim tab for backwards compatibility
  const [activeTab, setActiveTab] = useState<'track' | 'claim'>(
    routeReference ? 'claim' : 'track'
  );

  // 1-Number Guest Tracking State
  const [trackingNumber, setTrackingNumber] = useState(initialCodeParam);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [pastedCodeNotice, setPastedCodeNotice] = useState('');
  const [trackResult, setTrackResult] = useState<{
    found: boolean;
    public_status?: string;
    display_status?: string;
    public_category?: string;
    submitted_at?: string;
    updated_at?: string;
    public_updates?: Array<{ status: string; at: string; message: string }>;
    is_multilabel?: boolean;
    public_issues?: Array<{
      department_name: string;
      department_id: string;
      status: string;
      display_status: string;
    }>;
  } | null>(null);

  // Account Claim State (Legacy / Ownership Flow)
  const [referenceNumber, setReferenceNumber] = useState(
    routeReference || pending?.referenceNumber || ''
  );
  const [claimCode, setClaimCode] = useState(pending?.claimCode || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');

  // Rate limiting tracker
  const [attemptCount, setAttemptCount] = useState(0);

  // Format 24 digits into groups of 4: XXXX XXXX XXXX XXXX XXXX XXXX
  const handleTrackingNumberChange = (value: string) => {
    setPastedCodeNotice('');
    setTrackingError('');

    // Check if user pasted a claim code or KHI reference
    if (value.startsWith('KHI-') || value.startsWith('khi-')) {
      setPastedCodeNotice(
        'This looks like a case reference number. Use the "Claim to account" tab below to track or link it.'
      );
      return;
    }
    if (value.startsWith('CLM-') || value.startsWith('clm-')) {
      setPastedCodeNotice(
        'This looks like a private claim code. Use the "Claim to account" tab below with your reference number.'
      );
      return;
    }

    const digitsOnly = value.replace(/\D/g, '').slice(0, 24);
    const groups = digitsOnly.match(/.{1,4}/g);
    setTrackingNumber(groups ? groups.join(' ') : digitsOnly);
  };

  const executeTracking = async (digits: string) => {
    const rawDigits = digits.replace(/\D/g, '');
    if (rawDigits.length !== 24) return;
    setTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await complaintService.trackGuestComplaint(rawDigits);
      if (res && res.found) {
        setTrackResult(res);
      } else {
        setTrackingError(
          res?.error || "We couldn't find a complaint with that number. Check it and try again."
        );
      }
    } catch {
      setTrackingError("We couldn't find a complaint with that number. Check it and try again.");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => active && setIsAuthenticated(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      setIsAuthenticated(Boolean(session))
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Secure auto-fill and URL sanitization
  useEffect(() => {
    // 1. Check if tracking number was passed via navigation state (secure, zero URL leak)
    const stateTrackingNumber = (location.state as { trackingNumber?: string } | null)?.trackingNumber;
    if (stateTrackingNumber) {
      handleTrackingNumberChange(stateTrackingNumber);
      executeTracking(stateTrackingNumber);
      return;
    }

    // 2. Legacy / bookmark URL query parameter ?code=...
    if (initialCodeParam) {
      // Immediately sanitize the URL: strip the tracking secret from address bar and history
      window.history.replaceState({}, '', window.location.pathname);
      handleTrackingNumberChange(initialCodeParam);
      executeTracking(initialCodeParam);
    }
  }, []);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError('');
    setPastedCodeNotice('');

    if (attemptCount >= 10) {
      setTrackingError('Too many tries. Please wait a moment.');
      return;
    }

    const rawDigits = trackingNumber.replace(/\s+/g, '');
    if (rawDigits.length !== 24) {
      setTrackingError('Please enter a complete 24-digit tracking number.');
      return;
    }

    setTrackingLoading(true);
    setAttemptCount((prev) => prev + 1);

    try {
      const res = await complaintService.trackGuestComplaint(rawDigits);
      if (res && res.found) {
        setTrackResult(res);
      } else {
        setTrackingError(
          res.error || "We couldn't find a complaint with that number. Check it and try again."
        );
      }
    } catch {
      setTrackingError("We couldn't find a complaint with that number. Check it and try again.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setClaimError('');
    const cleanReference = referenceNumber.trim().toUpperCase();
    const cleanCode = claimCode.trim().toUpperCase();
    if (!cleanReference || !cleanCode) {
      setClaimError('Enter both the complaint reference number and its private claim code.');
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem(
        PENDING_CLAIM_KEY,
        JSON.stringify({ referenceNumber: cleanReference, claimCode: cleanCode })
      );
      navigate(`/login?ref=${encodeURIComponent(cleanReference)}`, {
        state: { from: `/track?ref=${encodeURIComponent(cleanReference)}` },
      });
      return;
    }
    setClaimLoading(true);
    const result = await complaintService.claimComplaint(cleanReference, cleanCode);
    setClaimLoading(false);
    if (!result.success) {
      setClaimError(
        result.error || 'Invalid reference number or claim code. Please check and try again.'
      );
      return;
    }
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    navigate('/dashboard', { replace: true });
  };

  // Determine timeline progress state
  const getTimelineSteps = () => {
    const status = trackResult?.public_status || 'submitted';
    const isResolved = status === 'resolved';
    const isInProgress = ['in_progress', 'accepted', 'assigned', 'investigating'].includes(status) || isResolved;
    const isRouted = ['assigned', 'accepted', 'in_progress', 'resolved'].includes(status);

    return [
      {
        id: 'received',
        title: ur ? 'شکایت موصول ہو گئی' : 'Complaint Received',
        desc: ur ? 'شہری شکایت کا باقاعدہ اندراج ہو گیا' : 'Case filed into civic records',
        completed: true,
        date: trackResult?.submitted_at,
      },
      {
        id: 'routed',
        title: ur ? 'محکمے کو تفویض' : 'Routed to Department',
        desc: trackResult?.public_category
          ? (ur ? `${trackResult.public_category} کے متعلقہ محکمے کو ارسال` : `Assigned to ${trackResult.public_category}`)
          : (ur ? 'متعلقہ بلدیاتی محکمے کو بھیج دیا گیا' : 'Forwarded to municipal authority'),
        completed: isRouted,
      },
      {
        id: 'progress',
        title: ur ? 'کارروائی جاری ہے' : 'Work in Progress',
        desc: ur ? 'فیلڈ انسپکشن اور کارروائی جاری ہے' : 'Field investigation or engineering work in progress',
        completed: isInProgress,
      },
      {
        id: 'resolved',
        title: ur ? 'مسئلہ حل ہو گیا' : 'Resolved',
        desc: ur ? 'بلدیاتی محکمے کی جانب سے مکمل' : 'Action completed and verified',
        completed: isResolved,
      },
    ];
  };

  return (
    <div className="py-4 sm:py-6 civic-kinetic-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Target Content Area: ~680–760px desktop width */}
      <div className="w-full max-w-[760px] mx-auto px-4">
        <div className="rounded-[20px] sm:rounded-[24px] bg-white border border-[#E5E3E0] p-5 sm:p-8 shadow-[0_8px_28px_rgba(20,20,20,0.035)]">

          {/* Top Bar: Icon Badge & Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAE7E2]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FAF6F6] border border-[#681822]/20 flex items-center justify-center text-[#681822] shrink-0">
                <FolderOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#681822] font-bold block">
                  Awaaz-e-Awam
                </span>
                <span className="text-xs text-[#625D58]">
                  {ur ? 'شہری پورٹل سروس' : 'Civic Tracking Service'}
                </span>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="inline-flex rounded-xl bg-[#FAF9F7] p-1 border border-[#EAE7E2] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('track');
                  setTrackResult(null);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-[13px] font-bold transition cursor-pointer ${
                  activeTab === 'track'
                    ? 'bg-white text-[#681822] shadow-xs'
                    : 'text-[#625D58] hover:text-[#141414]'
                }`}
              >
                {ur ? 'ٹریکنگ نمبر' : 'Tracking Number'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('claim')}
                className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-[13px] font-bold transition cursor-pointer ${
                  activeTab === 'claim'
                    ? 'bg-white text-[#681822] shadow-xs'
                    : 'text-[#625D58] hover:text-[#141414]'
                }`}
              >
                {ur ? 'اکاؤنٹ سے منسلک کریں' : 'Claim to Account'}
              </button>
            </div>
          </div>

          {/* Main Heading: Disciplined & Restrained */}
          <div className="mt-5 mb-6">
            <h1 className="font-display font-black text-2xl sm:text-[1.85rem] text-[#141414] tracking-tight leading-tight">
              {activeTab === 'track'
                ? (ur ? 'شکایت کی صورتحال معلوم کریں' : 'Track Your Complaint')
                : (ur ? 'شکایت اکاؤنٹ سے منسلک کریں' : 'Track Complaint')}
            </h1>
            <p className="mt-1.5 text-sm sm:text-[15px] text-[#5A554E] leading-relaxed">
              {activeTab === 'track'
                ? (ur
                    ? 'شکایت درج کرواتے وقت ملا ہوا 24 ہندسوں پر مشتمل ٹریکنگ نمبر درج کریں۔'
                    : 'Enter the 24-digit tracking number provided on your submission receipt.')
                : (ur
                    ? 'نجی کلیم کوڈ کے ذریعے شکایت کو اپنے باقاعدہ اکاؤنٹ سے منسلک کریں۔'
                    : 'Link a guest complaint to your verified account using your reference number and private claim code.')}
            </p>
          </div>

          {activeTab === 'track' ? (
            <div>
              {trackResult ? (
                /* Civic-Service Document View */
                <div className="rounded-[20px] border border-[#E5E3E0] bg-[#FAF9F7] p-5 sm:p-7 space-y-6 animate-in fade-in duration-300">

                  {/* Document Header & Verified Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE7E2]">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#681822] font-bold block">
                        {ur ? 'سرکاری تصدیق شدہ صورتحال' : 'Verified Civic Status'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-[#141414] mt-0.5">
                        {trackResult.display_status || trackResult.public_status || 'Under Review'}
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 self-start sm:self-auto">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{ur ? 'فعال ریکارڈ' : 'Active Record'}</span>
                    </span>
                  </div>

                  {/* Official Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white rounded-xl border border-[#EAE7E2] p-3.5">
                    <div>
                      <span className="block text-[11px] font-medium text-[#88827A]">{ur ? 'درج شدہ تاریخ:' : 'Filed On:'}</span>
                      <span className="font-semibold text-[#141414] mt-0.5 block">
                        {trackResult.submitted_at
                          ? new Date(trackResult.submitted_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-medium text-[#88827A]">{ur ? 'آخری پیش رفت:' : 'Last Update:'}</span>
                      <span className="font-semibold text-[#141414] mt-0.5 block">
                        {trackResult.updated_at
                          ? new Date(trackResult.updated_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[11px] font-medium text-[#88827A]">{ur ? 'محکمہ / خدمت:' : 'Department / Service:'}</span>
                      <span className="font-semibold text-[#141414] mt-0.5 block truncate">
                        {trackResult.public_category || (trackResult.public_issues?.[0]?.department_name) || 'Municipal Service'}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Department(s) Card - Multi-agency breakdown */}
                  {trackResult.public_issues && trackResult.public_issues.length > 1 ? (
                    <div className="rounded-xl border border-[#EAE7E2] bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#681822] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>
                            {trackResult.public_issues.length > 1
                              ? (ur ? 'تفویض شدہ بلدیاتی محکمے' : 'Assigned Municipal Departments')
                              : (ur ? 'تفویض شدہ بلدیاتی محکمہ' : 'Assigned Municipal Department')}
                          </span>
                        </span>
                        {trackResult.public_issues.length > 1 && (
                          <span className="text-[10px] bg-[#681822]/10 text-[#681822] font-semibold px-2 py-0.5 rounded-full">
                            Multi-Agency
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {trackResult.public_issues.map((iss, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[#EAE7E2]/60 last:border-0">
                            <span className="font-semibold text-[#141414]">{iss.department_name}</span>
                            <span className="font-semibold text-emerald-800 capitalize bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
                              {iss.display_status || iss.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Chronological Progress Timeline */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#141414] block">
                      {ur ? 'پیش رفت کا ٹائم لائن' : 'Progress Timeline'}
                    </span>
                    <ol className="relative border-s-2 border-[#D9D3CC] ms-3 space-y-4">
                      {getTimelineSteps().map((step) => (
                        <li key={step.id} className="ms-4">
                          <div
                            className={`absolute w-3 h-3 rounded-full -start-[7px] mt-1 border-2 border-white ${
                              step.completed ? 'bg-[#681822]' : 'bg-[#D9D3CC]'
                            }`}
                          />
                          <div className="space-y-0.5">
                            <span className={`text-xs font-bold block ${step.completed ? 'text-[#141414]' : 'text-[#88827A]'}`}>
                              {step.title}
                            </span>
                            <p className="text-[11px] text-[#625D58] leading-relaxed">
                              {step.desc}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Actual Updates (if any recorded) */}
                  {trackResult.public_updates && trackResult.public_updates.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#EAE7E2]">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414]">
                        {ur ? 'محکمانہ پیغامات' : 'Department Updates'}
                      </h3>
                      <div className="space-y-2">
                        {trackResult.public_updates.map((update, idx) => (
                          <div key={idx} className="rounded-lg bg-white border border-[#EAE7E2] p-3 text-xs">
                            <time className="text-[10px] font-mono text-[#88827A] block">
                              {update.at ? new Date(update.at).toLocaleString('en-GB') : ''}
                            </time>
                            <p className="text-xs font-medium text-[#141414] mt-0.5">
                              {update.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset Action: Track another complaint */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackResult(null);
                        setTrackingNumber('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#681822] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{ur ? 'دوسری شکایت تلاش کریں' : 'Track another complaint'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* One-number 24-digit input form */
                <form onSubmit={handleTrackSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="tracking-number-input"
                      className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                    >
                      {ur ? 'ٹریکنگ نمبر (24 ہندسے)' : 'Tracking number (24 digits)'}
                    </label>
                    <div className="relative">
                      <input
                        id="tracking-number-input"
                        value={trackingNumber}
                        onChange={(e) => handleTrackingNumberChange(e.target.value)}
                        required
                        placeholder="8041 7263 9150 2846 0371 6628"
                        maxLength={29}
                        className="w-full min-h-[56px] rounded-xl border border-[#D9D3CC] px-4 py-3 font-mono text-base sm:text-lg font-bold tracking-wider placeholder:text-[#A8A29E] focus:border-[#681822] focus:outline-none focus:ring-2 focus:ring-[#681822]/15 bg-[#FAF9F7]"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#625D58] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#681822]" />
                      <span>
                        {ur
                          ? 'خالی جگہیں خودکار شامل ہو جاتی ہیں۔ آپ کی ذاتی معلومات محفوظ رکھی جاتی ہیں۔'
                          : 'Spaces are added automatically. Your personal details are never exposed.'}
                      </span>
                    </p>
                  </div>

                  {pastedCodeNotice && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 shrink-0 text-blue-700 mt-0.5" />
                      <div>
                        <span>{pastedCodeNotice}</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('claim')}
                          className="block mt-1 font-bold text-blue-800 underline cursor-pointer"
                        >
                          {ur ? 'اکاؤنٹ سے منسلک کرنے والے ٹیب پر جائیں ←' : 'Switch to Claim to account →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {trackingError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                      <span>{trackingError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full min-h-[50px] text-sm sm:text-base font-bold"
                    isLoading={trackingLoading}
                    leftIcon={<Search className="w-4 h-4 text-white" />}
                  >
                    {ur ? 'معلومات دیکھیں' : 'Check status'}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            /* Legacy / Ownership Claim Tab */
            <div>
              <p className="text-xs sm:text-sm text-[#323232] leading-relaxed">
                {ur
                  ? 'مہمان شکایات تب تک نجی رہتی ہیں جب تک آپ لاگ ان کر کے رسید سے حوالہ نمبر اور کلیم کوڈ کے ذریعے ملکیت ثابت نہ کریں۔'
                  : 'Guest complaints stay private until you sign in and prove ownership with the reference number and private claim code from your receipt.'}
              </p>

              <form onSubmit={handleClaim} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="track-reference"
                    className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                  >
                    {ur ? 'شکایت کا حوالہ نمبر' : 'Complaint reference number'}
                  </label>
                  <input
                    id="track-reference"
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    required
                    placeholder="KHI-2026-XXXXXXXX"
                    className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none bg-[#FAF9F7]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="track-claim-code"
                    className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                  >
                    {ur ? 'نجی کلیم کوڈ' : 'Private claim code'}
                  </label>
                  <input
                    id="track-claim-code"
                    value={claimCode}
                    onChange={(event) => setClaimCode(event.target.value)}
                    required
                    placeholder="CLM-XXXX-XXXX-XXXX"
                    className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none bg-[#FAF9F7]"
                  />
                </div>
                {claimError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    {claimError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full min-h-[50px] text-sm font-bold"
                  isLoading={claimLoading}
                  leftIcon={<KeyRound className="w-4 h-4 text-white" />}
                >
                  {isAuthenticated
                    ? (ur ? 'شکایت منسلک کریں اور دیکھیں' : 'Claim and view complaint')
                    : (ur ? 'منسلک کرنے کے لیے لاگ ان کریں' : 'Sign in to claim and track')}
                </Button>
              </form>
            </div>
          )}

          {/* Quick Footer Links */}
          <div className="mt-6 pt-4 border-t border-[#EAE7E2] flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link to="/register" className="font-semibold text-[#681822] hover:underline">
              {ur ? 'نیا شہری اکاؤنٹ بنائیں' : 'Create a citizen account'}
            </Link>
            <Link
              to="/submit"
              className="inline-flex items-center gap-1 font-semibold text-[#323232] hover:text-[#681822]"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{ur ? 'نئی شکایت درج کریں' : 'Write a complaint'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintTracker;
