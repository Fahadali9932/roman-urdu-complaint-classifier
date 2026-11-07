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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D5D3] bg-[#FAFAF9] hover:bg-[#EAEAE8] text-[#111111] text-xs font-semibold tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#111111] ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#5B5B5B] shrink-0" />
      <span className="font-mono">
        {language === 'en' ? (
          <>
            <span className="text-[#111111] font-bold">EN</span> / <span className="text-[#5B5B5B]">اردو</span>
          </>
        ) : (
          <>
            <span className="text-[#5B5B5B]">EN</span> / <span className="text-[#111111] font-bold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
