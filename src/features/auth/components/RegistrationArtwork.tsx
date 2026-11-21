import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { ShieldCheck } from 'lucide-react';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';

/** The footer's Mazar-e-Quaid photograph, presented as an unobstructed civic portrait. */
export const RegistrationArtwork: React.FC = () => {
  const { t, isRTL } = useLanguage();

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-[22px] bg-[#141414] text-start text-white lg:h-full lg:flex-1">
      {/* Keep the subject clear: no giant type printed across the actual monument. */}
      <div className="relative h-[210px] w-full shrink-0 overflow-hidden sm:h-[280px] lg:h-auto lg:min-h-[385px] lg:flex-1">
        <picture className="absolute inset-0 block h-full w-full" aria-hidden="true">
          <source media="(max-width: 1023px)" srcSet={mazarMobile} />
          <img
            data-testid="registration-monument"
            src={mazarDesktop}
            alt=""
            className="block h-full w-full object-cover object-[center_43%]"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/20" aria-hidden="true" />
        <p className="absolute start-6 top-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white sm:start-8 sm:top-8">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Awaaz-e-Awam
        </p>
      </div>

      <div className="flex flex-col justify-center gap-3 px-6 py-6 sm:px-8 sm:py-9 lg:shrink-0 lg:px-9 lg:py-10">
        <h2 className="max-w-[28ch] font-display text-[clamp(1.55rem,2.3vw,2.05rem)] font-black uppercase leading-[1.06] tracking-[-0.025em] text-white">
          {t('authArtworkHeading') || (isRTL ? 'عوامی مسائل کی شکایت کا آسان اور شفاف طریقہ۔' : 'A simpler way to report public-service issues.')}
        </h2>
        <p className="max-w-[38ch] text-sm font-medium leading-relaxed text-[#E7E2DD] sm:text-base">
          {t('authArtworkSubtitle') || (isRTL ? 'اپنی شکایت عام فہم زبان میں لکھیں اور ایک ہی جگہ اس کی پیش رفت دیکھیں۔' : 'Write your complaint in everyday language and follow its progress in one place.')}
        </p>
      </div>
    </aside>
  );
};
