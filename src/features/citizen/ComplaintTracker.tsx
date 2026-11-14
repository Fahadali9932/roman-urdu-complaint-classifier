import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { FolderOpen, KeyRound, PenTool } from 'lucide-react';
import { complaintService } from '../../services';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type PendingClaim = { referenceNumber: string; claimCode: string };
const PENDING_CLAIM_KEY = 'awaaz-pending-complaint-claim';

const readPendingClaim = (): PendingClaim | null => {
  try {
    const value = sessionStorage.getItem(PENDING_CLAIM_KEY);
    return value ? JSON.parse(value) as PendingClaim : null;
  } catch {
    return null;
  }
};

export const ComplaintTracker: React.FC = () => {
  const navigate = useNavigate();
  const { referenceNumber: routeRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();
  const routeReference = routeRef || searchParams.get('ref') || '';
  const pending = readPendingClaim();
  const [referenceNumber, setReferenceNumber] = useState(routeReference || pending?.referenceNumber || '');
  const [claimCode, setClaimCode] = useState(pending?.claimCode || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setIsAuthenticated(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setIsAuthenticated(Boolean(session)));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const handleClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanReference = referenceNumber.trim().toUpperCase();
    const cleanCode = claimCode.trim().toUpperCase();
    if (!cleanReference || !cleanCode) {
      setError('Enter both the complaint reference number and its private claim code.');
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ referenceNumber: cleanReference, claimCode: cleanCode }));
      navigate(`/login?ref=${encodeURIComponent(cleanReference)}`, { state: { from: `/track?ref=${encodeURIComponent(cleanReference)}` } });
      return;
    }
    setLoading(true);
    const result = await complaintService.claimComplaint(cleanReference, cleanCode);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Invalid reference number or claim code. Please check and try again.');
      return;
    }
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    navigate('/dashboard', { replace: true });
  };

  return <div className="py-12 sm:py-16"><Container size="sm"><div className="rounded-3xl bg-white border border-[#E5E3E0] p-6 sm:p-10 shadow-[0_12px_36px_rgba(20,20,20,0.06)]"><div className="w-16 h-16 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center text-[#681822]"><FolderOpen className="w-8 h-8 stroke-[1.5]" /></div><h1 className="mt-5 font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight uppercase">Track complaint</h1><p className="mt-2 text-sm text-[#323232] leading-relaxed">Guest complaints stay private until you sign in and prove ownership with the reference number and private claim code from your receipt. The code is used once to link the case to your account.</p><form onSubmit={handleClaim} className="mt-6 space-y-4"><div><label htmlFor="track-reference" className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">Complaint reference number</label><input id="track-reference" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} required placeholder="KHI-2026-XXXXXXXX" className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none" /></div><div><label htmlFor="track-claim-code" className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">Private claim code</label><input id="track-claim-code" value={claimCode} onChange={(event) => setClaimCode(event.target.value)} required placeholder="CLM-XXXX-XXXX-XXXX" className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none" /></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}<Button type="submit" variant="primary" size="md" className="w-full" isLoading={loading} leftIcon={<KeyRound className="w-4 h-4 text-white" />}>{isAuthenticated ? 'Claim and view complaint' : 'Sign in to claim and track'}</Button></form><div className="mt-5 flex flex-wrap gap-3"><Link to="/register" className="text-xs font-semibold text-[#681822] hover:underline">Create a citizen account</Link><Link to="/submit" className="inline-flex items-center gap-1 text-xs font-semibold text-[#323232] hover:text-[#681822]"><PenTool className="w-3.5 h-3.5" />Write a complaint</Link></div></div></Container></div>;
};
