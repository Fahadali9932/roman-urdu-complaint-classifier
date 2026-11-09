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
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full bg-transparent hover:bg-[#EFECE6] text-[#141414] text-[12px] font-ui tracking-normal transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141414] shrink-0 ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#323232] shrink-0" />
      <span className="text-[12px] font-ui select-none">
        {language === 'en' ? (
          <>
            <span className="text-[#141414] font-semibold">EN</span>
            <span className="hidden sm:inline text-[#E5E3E0] mx-0.5">/</span>
            <span className="hidden sm:inline text-[#6B6864]">اردو</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline text-[#6B6864]">EN</span>
            <span className="hidden sm:inline text-[#E5E3E0] mx-0.5">/</span>
            <span className="text-[#141414] font-semibold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
