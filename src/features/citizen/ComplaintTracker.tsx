import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
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
} from 'lucide-react';
import { complaintService } from '../../services';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

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

  return (
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="rounded-3xl bg-white border border-[#E5E3E0] p-6 sm:p-10 shadow-[0_12px_36px_rgba(20,20,20,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center text-[#681822]">
              <FolderOpen className="w-7 h-7 stroke-[1.5]" />
            </div>
            {/* View Switcher Tabs */}
            <div className="inline-flex rounded-xl bg-[#FAF9F7] p-1 border border-[#EAE7E2]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('track');
                  setTrackResult(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === 'track'
                    ? 'bg-white text-[#681822] shadow-xs'
                    : 'text-[#625D58] hover:text-[#141414]'
                }`}
              >
                Tracking number
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('claim')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === 'claim'
                    ? 'bg-white text-[#681822] shadow-xs'
                    : 'text-[#625D58] hover:text-[#141414]'
                }`}
              >
                Claim to account
              </button>
            </div>
          </div>

          <h1 className="mt-5 font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight">
            {activeTab === 'track' ? 'Track Your Complaint' : 'Track Complaint'}
          </h1>

          {activeTab === 'track' ? (
            <div>
              <p className="mt-2 text-sm text-[#5A554E] leading-relaxed">
                Enter the tracking number provided when you submitted your complaint.
              </p>

              {trackResult ? (
                /* Public Safe Minimal Status Result */
                <div className="mt-6 rounded-2xl border border-[#E5E3E0] bg-[#FAF9F7] p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#681822]">
                        {trackResult.public_category || 'Municipal Service'}
                      </span>
                      <h2 className="mt-0.5 text-xl font-bold text-[#141414]">
                        {trackResult.display_status || 'Under review'}
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-y border-[#EAE7E2] py-3 text-[#625D58]">
                    <div>
                      <span className="block font-medium text-[#88827A]">Filed:</span>
                      <span className="font-semibold text-[#141414]">
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
                      <span className="block font-medium text-[#88827A]">Last update:</span>
                      <span className="font-semibold text-[#141414]">
                        {trackResult.updated_at
                          ? new Date(trackResult.updated_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {trackResult.public_issues && trackResult.public_issues.length > 1 && (
                    <div className="rounded-xl border border-[#EAE7E2] bg-[#FAF8F5] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#681822]">
                          Multi-Agency Linked Tasks ({trackResult.public_issues.length} Departments)
                        </span>
                        <span className="text-[10px] bg-[#681822]/10 text-[#681822] font-semibold px-2 py-0.5 rounded-full">
                          Single Receipt
                        </span>
                      </div>
                      <div className="space-y-2">
                        {trackResult.public_issues.map((iss, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[#EAE7E2]/60 last:border-0">
                            <span className="font-medium text-[#141414]">{iss.department_name}</span>
                            <span className="font-semibold text-emerald-800 capitalize bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px]">
                              {iss.display_status || iss.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackResult.public_updates && trackResult.public_updates.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414]">
                        Updates
                      </h3>
                      <ol className="relative border-s border-[#D9D3CC] ms-2.5 space-y-3">
                        {trackResult.public_updates.map((update, idx) => (
                          <li key={idx} className="ms-4">
                            <div className="absolute w-2 h-2 bg-[#681822] rounded-full mt-1.5 -start-1 border border-white" />
                            <time className="text-[11px] font-mono text-[#88827A]">
                              {update.at ? new Date(update.at).toLocaleString('en-GB') : ''}
                            </time>
                            <p className="text-xs font-medium text-[#141414] mt-0.5">
                              {update.message}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackResult(null);
                        setTrackingNumber('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#681822] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Track another complaint</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* One-number input form */
                <form onSubmit={handleTrackSubmit} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="tracking-number-input"
                      className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                    >
                      Tracking number (24 digits)
                    </label>
                    <div className="relative">
                      <input
                        id="tracking-number-input"
                        value={trackingNumber}
                        onChange={(e) => handleTrackingNumberChange(e.target.value)}
                        required
                        placeholder="8041 7263 9150 2846 0371 6628"
                        maxLength={29}
                        className="w-full rounded-xl border border-[#D9D3CC] px-4 py-3 font-mono text-base tracking-wider placeholder:text-[#A8A29E] focus:border-[#681822] focus:outline-none focus:ring-1 focus:ring-[#681822]"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#625D58] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#681822]" />
                      <span>Spaces are added automatically. Your personal details are never exposed.</span>
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
                          Switch to Claim to account →
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
                    className="w-full min-h-[48px]"
                    isLoading={trackingLoading}
                    leftIcon={<Search className="w-4 h-4 text-white" />}
                  >
                    Check status
                  </Button>
                </form>
              )}
            </div>
          ) : (
            /* Legacy / Ownership Claim Tab */
            <div>
              <p className="mt-2 text-sm text-[#323232] leading-relaxed">
                Guest complaints stay private until you sign in and prove ownership with the reference number and private claim code from your receipt. The code is used once to link the case to your account.
              </p>

              <form onSubmit={handleClaim} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="track-reference"
                    className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                  >
                    Complaint reference number
                  </label>
                  <input
                    id="track-reference"
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    required
                    placeholder="KHI-2026-XXXXXXXX"
                    className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="track-claim-code"
                    className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5"
                  >
                    Private claim code
                  </label>
                  <input
                    id="track-claim-code"
                    value={claimCode}
                    onChange={(event) => setClaimCode(event.target.value)}
                    required
                    placeholder="CLM-XXXX-XXXX-XXXX"
                    className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none"
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
                  className="w-full"
                  isLoading={claimLoading}
                  leftIcon={<KeyRound className="w-4 h-4 text-white" />}
                >
                  {isAuthenticated ? 'Claim and view complaint' : 'Sign in to claim and track'}
                </Button>
              </form>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/register" className="text-xs font-semibold text-[#681822] hover:underline">
              Create a citizen account
            </Link>
            <Link
              to="/submit"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#323232] hover:text-[#681822]"
            >
              <PenTool className="w-3.5 h-3.5" />
              Write a complaint
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};
