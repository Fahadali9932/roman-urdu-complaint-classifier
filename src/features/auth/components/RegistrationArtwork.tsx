import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { ShieldCheck } from 'lucide-react';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';

/** Shares the actual Mazar-e-Quaid photography used by the public footer. */
export const RegistrationArtwork: React.FC = () => {
  const { t, isRTL } = useLanguage();

  return (
    <aside className="relative isolate flex min-h-[280px] w-full flex-col justify-between overflow-hidden rounded-[22px] bg-[#141414] p-6 text-start text-white sm:min-h-[330px] sm:p-9 lg:min-h-[540px] lg:p-10">
      <picture className="absolute inset-0 -z-20" aria-hidden="true">
        <source media="(max-width: 1023px)" srcSet={mazarMobile} />
        <img
          data-testid="registration-monument"
          src={mazarDesktop}
          alt=""
          className="h-full w-full object-cover object-[center_24%]"
          loading="lazy"
          decoding="async"
        />
      </picture>
      {/* Footer-inspired overlay maintains contrast without obscuring the scene. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,20,20,0.68)_0%,rgba(20,20,20,0.18)_34%,rgba(20,20,20,0.5)_62%,rgba(20,20,20,0.94)_100%)]"
        aria-hidden="true"
      />

      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5F1EC]">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Awaaz-e-Awam
      </p>
      <div className="max-w-[34ch] pt-16 sm:pt-24 lg:pt-32">
        <h2 className="font-display text-[clamp(1.8rem,3.2vw,2.8rem)] font-black uppercase leading-[1.04] tracking-[-0.035em] text-white">
          {t('authArtworkHeading') || (isRTL ? 'عوامی مسائل کی شکایت کا آسان اور شفاف طریقہ۔' : 'A simpler way to report public-service issues.')}
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-[#F5F1EC] sm:text-base">
          {t('authArtworkSubtitle') || (isRTL ? 'اپنی شکایت عام فہم زبان میں لکھیں اور ایک ہی جگہ اس کی پیش رفت دیکھیں۔' : 'Write your complaint in everyday language and follow its progress in one place.')}
        </p>
      </div>
    </aside>
  );
};
