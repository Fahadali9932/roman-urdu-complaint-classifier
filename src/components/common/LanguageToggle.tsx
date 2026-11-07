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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DFE7E4] bg-white/90 hover:bg-white text-[#172D31] text-xs font-medium tracking-wide shadow-2xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#126B63] ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#126B63] shrink-0" />
      <span className="font-sans">
        {language === 'en' ? (
          <>
            <span className="text-[#172D31] font-semibold">EN</span> / <span className="text-[#667679]">اردو</span>
          </>
        ) : (
          <>
            <span className="text-[#667679]">EN</span> / <span className="text-[#126B63] font-semibold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
