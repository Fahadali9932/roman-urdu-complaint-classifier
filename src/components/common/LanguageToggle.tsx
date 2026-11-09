import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[40px] rounded-full bg-transparent hover:bg-[#D5B995]/20 text-[#101A28] text-[12px] font-ui tracking-[0.015em] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#101A28] shrink-0 ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#263E59] shrink-0" />
      <span className="text-[12px] font-ui select-none">
        {language === 'en' ? (
          <>
            <span className="text-[#101A28] font-semibold">EN</span>
            <span className="hidden sm:inline text-[#D5B995] mx-0.5">/</span>
            <span className="hidden sm:inline text-[#5A626E]">اردو</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline text-[#5A626E]">EN</span>
            <span className="hidden sm:inline text-[#D5B995] mx-0.5">/</span>
            <span className="text-[#101A28] font-semibold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
