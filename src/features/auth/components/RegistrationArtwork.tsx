import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { CheckCircle2, Compass, PenTool, ShieldCheck } from 'lucide-react';

/** Service information, deliberately using real text instead of empty decorative art. */
export const RegistrationArtwork: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const steps = isRTL
    ? ['اپنی شکایت عام فہم زبان میں لکھیں۔', 'متعلقہ محکمے کی تصدیق اور پیش رفت دیکھیں۔', 'اپنی شکایات ایک محفوظ جگہ پر رکھیں۔']
    : ['Describe the issue in your own words.', 'See the confirmed department and real updates.', 'Keep your complaints together in one account.'];

  return (
    <aside className="flex h-full min-h-[245px] flex-col justify-between gap-7 rounded-[22px] bg-[#461018] p-6 text-start text-white sm:p-9 lg:min-h-[520px] lg:p-10">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[#F2C9CE] uppercase">
          <ShieldCheck className="size-5" /> Awaaz-e-Awam
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white"><PenTool className="size-4" />{t('authChipWrite') || (isRTL ? 'شکایت لکھیں' : 'Write a complaint')}</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white"><Compass className="size-4" />{t('authChipTrack') || (isRTL ? 'پیش رفت دیکھیں' : 'Track progress')}</span>
        </div>
        <h2 className="mt-5 max-w-[25ch] font-display text-[clamp(1.55rem,3vw,2.6rem)] font-black leading-[1.1] tracking-tight text-white">
          {t('authArtworkHeading') || (isRTL ? 'عوامی مسائل کی شکایت کا آسان اور شفاف طریقہ۔' : 'A simpler way to report public-service issues.')}
        </h2>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-[#F8E9EA]">
          {t('authArtworkSubtitle') || (isRTL ? 'اپنی شکایت عام فہم زبان میں لکھیں اور ایک ہی جگہ اس کی پیش رفت دیکھیں۔' : 'Write your complaint in everyday language and follow its progress in one place.')}
        </p>
      </div>
      <ol className="space-y-3 border-t border-white/20 pt-5">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-white">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#E8B8BF]" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
};
