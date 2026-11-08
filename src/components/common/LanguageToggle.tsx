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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#34394A] bg-[#283041]/60 hover:bg-[#283041] text-[#F1F2F3] text-xs font-semibold tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F1F2F3] ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#B5B9BC] shrink-0" />
      <span className="font-mono text-xs">
        {language === 'en' ? (
          <>
            <span className="text-[#F1F2F3] font-bold">EN</span> / <span className="text-[#B5B9BC]">اردو</span>
          </>
        ) : (
          <>
            <span className="text-[#B5B9BC]">EN</span> / <span className="text-[#F1F2F3] font-bold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
