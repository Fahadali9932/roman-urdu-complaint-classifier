import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FolderOpen, MapPinned, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import {
  getConfirmedDepartments,
  getTrackingCopy,
  getTrackingStage,
  type GuestTrackingRecord,
} from './guestTrackingPresentation';

const formatTrackingNumber = (input: string) =>
  (input.replace(/\D/g, '').slice(0, 24).match(/.{1,4}/g) || []).join(' ');

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ComplaintTracker: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [record, setRecord] = useState<GuestTrackingRecord | null>(null);
  const attempts = useRef(0);
  const autoLookupHandled = useRef(false);

  const lookup = async (input: string) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 24) {
      setError(ur ? 'مکمل 24 ہندسوں کا ٹریکنگ نمبر درج کریں۔' : 'Enter all 24 digits from your receipt.');
      return;
    }
    if (attempts.current >= 10) {
      setError(ur ? 'بہت زیادہ کوششیں ہو چکی ہیں۔ کچھ دیر بعد کوشش کریں۔' : 'Too many tries. Please wait a moment.');
      return;
    }
    attempts.current += 1;
    setLoading(true);
    setError('');
    setRecord(null);
    try {
      const result = await complaintService.trackGuestComplaint(digits);
      if (result?.found) setRecord(result);
      else setError(result?.error || (ur ? 'یہ ٹریکنگ نمبر نہیں ملا۔ دوبارہ چیک کریں۔' : 'We could not find this complaint. Check the number and try again.'));
    } catch {
      setError(ur ? 'ابھی ریکارڈ دستیاب نہیں۔ کچھ دیر بعد کوشش کریں۔' : 'Unable to check status right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Backward-compatible links and receipt navigation, but never leave secrets in the URL.
  useEffect(() => {
    if (autoLookupHandled.current) return;
    autoLookupHandled.current = true;
    const fromReceipt = (location.state as { trackingNumber?: string } | null)?.trackingNumber;
    const fromLegacyUrl = searchParams.get('code');
    if (fromLegacyUrl) window.history.replaceState({}, '', window.location.pathname);
    const candidate = fromReceipt || fromLegacyUrl;
    if (candidate) {
      setTrackingNumber(formatTrackingNumber(candidate));
      if (/^\d{24}$/.test(candidate.replace(/\s/g, ''))) void lookup(candidate);
    }
    // Only run on mount: subsequent input must never trigger automatic requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (input: string) => {
    setNotice('');
    setError('');
    if (/^(KHI-|CLM-)/i.test(input.trim())) {
      setTrackingNumber('');
      setNotice(ur ? 'براہ کرم رسید پر موجود 24 ہندسوں کا نجی ٹریکنگ نمبر استعمال کریں۔' : 'Use the private 24-digit tracking number from your receipt, not a case reference or claim code.');
      return;
    }
    setTrackingNumber(formatTrackingNumber(input));
  };

  const stage = record ? getTrackingStage(record) : 'received';
  const copy = getTrackingCopy(stage, ur);
  const departments = record ? getConfirmedDepartments(record) : [];

  return (
    <main className="civic-kinetic-page w-full px-4 py-8 sm:py-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-[800px] rounded-[28px] border border-[#E3DED9] bg-white p-5 shadow-[0_24px_70px_rgba(35,21,21,0.065)] sm:p-9">
        <div className="flex items-center gap-3 border-b border-[#EBE7E3] pb-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FAF1F2] text-[#681822]">
            <FolderOpen className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#681822]">Awaaz-e-Awam</p>
            <p className="text-sm font-semibold text-[#544C47]">{ur ? 'نجی شکایت ٹریکنگ' : 'Private complaint tracking'}</p>
          </div>
        </div>

        <div className="mb-7 pt-7">
          <h1 className="font-display text-[clamp(1.8rem,5vw,2.5rem)] font-black leading-tight tracking-tight text-[#171717]">
            {ur ? 'اپنی شکایت ٹریک کریں' : 'Track Your Complaint'}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[#544C47]">
            {ur ? 'رسید سے اپنا 24 ہندسوں کا نجی ٹریکنگ نمبر درج کریں۔ اکاؤنٹ کی ضرورت نہیں۔' : 'Enter the private 24-digit number on your receipt. No account needed.'}
          </p>
          <Link to="/karachi-map" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5DBD8] px-4 text-sm font-semibold text-[#681822] hover:bg-[#FAF1F2]">
            <MapPinned className="h-4 w-4" /> Explore Karachi's public issue map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!record ? (
          <form onSubmit={(event) => { event.preventDefault(); void lookup(trackingNumber); }} className="space-y-5">
            <div>
              <label htmlFor="tracking-number-input" className="mb-2 block text-sm font-extrabold text-[#262020]">
                {ur ? '24 ہندسوں کا ٹریکنگ نمبر' : '24-digit tracking number'}
              </label>
              <input
                id="tracking-number-input"
                value={trackingNumber}
                onChange={(event) => onChange(event.target.value)}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={29}
                required
                placeholder="0000 0000 0000 0000 0000 0000"
                aria-describedby="tracking-help"
                className="w-full min-h-[66px] rounded-2xl border-2 border-[#C9C0BA] bg-white px-4 py-4 font-mono text-[clamp(0.95rem,3.5vw,1.4rem)] font-black tracking-[0.07em] text-[#151515] placeholder:font-bold placeholder:text-[#716961] focus:border-[#681822] focus:outline-none focus:ring-4 focus:ring-[#681822]/10 sm:px-5"
              />
              <p id="tracking-help" className="mt-2 flex items-start gap-2 text-sm font-medium leading-relaxed text-[#514A45]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#681822]" aria-hidden="true" />
                {ur ? 'خالی جگہیں خود شامل ہو جائیں گی۔ اپنا نمبر نجی رکھیں۔' : 'Spaces are added automatically. Keep your number private.'}
              </p>
            </div>
            {notice && <p role="status" className="rounded-xl border border-[#E8D3B4] bg-[#FFF8EA] p-4 text-sm font-medium text-[#6B420B]">{notice}</p>}
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
            <Button type="submit" variant="primary" size="md" className="w-full min-h-[58px] text-base font-extrabold" isLoading={loading} leftIcon={<Search className="size-5" />}>
              {ur ? 'شکایت کی صورتحال دیکھیں' : 'Check Complaint Status'}
            </Button>
          </form>
        ) : (
          <section aria-live="polite" className="animate-in fade-in duration-300">
            <div className="rounded-[22px] border-2 border-[#E1D4D2] bg-[#FAF6F5] p-5 sm:p-7">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#681822]"><CheckCircle2 className="size-5" />{ur ? 'تصدیق شدہ تازہ صورتحال' : 'Current complaint status'}</p>
              <h2 className="text-[clamp(1.65rem,5vw,2.4rem)] font-black leading-tight text-[#1B1717]">{copy.title}</h2>
              <p className="mt-3 max-w-prose text-base font-medium leading-relaxed text-[#393230]">{copy.explanation}</p>
              <div className="mt-6 rounded-xl border border-[#E4DEDA] bg-white p-4">
                <p className="flex items-center gap-2 text-sm font-extrabold text-[#681822]"><Clock3 className="size-4" />{ur ? 'اگلا مرحلہ' : 'What happens next?'}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#4F4845]">{copy.next}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {record.submitted_at && <div className="rounded-xl border border-[#EAE4DF] p-4"><p className="text-xs font-bold text-[#605751]">{ur ? 'جمع کرانے کی تاریخ' : 'Submitted'}</p><p className="mt-1 text-base font-extrabold text-[#211C1C]">{formatDate(record.submitted_at)}</p></div>}
              {record.updated_at && <div className="rounded-xl border border-[#EAE4DF] p-4"><p className="text-xs font-bold text-[#605751]">{ur ? 'آخری اپ ڈیٹ' : 'Last updated'}</p><p className="mt-1 text-base font-extrabold text-[#211C1C]">{formatDate(record.updated_at)}</p></div>}
            </div>
            {departments.length > 0 && (
              <div className="mt-5 rounded-xl border border-[#EAE4DF] p-5">
                <h3 className="text-sm font-extrabold text-[#681822]">{ur ? 'تصدیق شدہ متعلقہ محکمے' : 'Assigned department' + (departments.length > 1 ? 's' : '')}</h3>
                <ul className="mt-2 space-y-2">{departments.map((name) => <li key={name} className="text-base font-bold text-[#262020]">{name}</li>)}</ul>
              </div>
            )}
            {record.public_updates && record.public_updates.length > 0 && (
              <details className="group mt-5 rounded-xl border border-[#EAE4DF] p-5">
                <summary className="cursor-pointer text-sm font-extrabold text-[#681822]">{ur ? 'محکمے کی اصل اپ ڈیٹس دیکھیں' : 'View official updates'} ({record.public_updates.length})</summary>
                <ul className="mt-4 space-y-3">{record.public_updates.map((update, index) => <li key={`${update.at}-${index}`} className="rounded-lg bg-[#FAF8F6] p-3 text-sm text-[#282323]"><p className="font-semibold">{update.message}</p><time className="mt-1 block text-xs text-[#635B55]">{formatDate(update.at)}</time></li>)}</ul>
              </details>
            )}
            <button type="button" onClick={() => { setRecord(null); setTrackingNumber(''); setError(''); }} className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#681822] hover:underline">
              <RotateCcw className="size-4" />{ur ? 'دوسری شکایت ٹریک کریں' : 'Track another complaint'}
            </button>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-[#EBE7E3] pt-5 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
          <Link to="/submit" className="inline-flex min-h-11 items-center gap-2 text-[#681822] hover:underline">{ur ? 'نئی شکایت درج کریں' : 'Submit a new complaint'}<ArrowRight className="size-4" /></Link>
          <Link to="/faq" className="inline-flex min-h-11 items-center text-[#413B38] hover:underline">{ur ? 'سوالات اور مدد' : 'Need help? Read FAQs'}</Link>
        </div>
      </div>
    </main>
  );
};

export default ComplaintTracker;
