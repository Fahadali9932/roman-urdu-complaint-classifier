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
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-full border border-[#34394A]/20 bg-[#DEE1E5]/75 hover:bg-[#DEE1E5] text-[#0B1421] text-[12px] font-ui tracking-[0.015em] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0B1421] shrink-0 ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-[#34394A] shrink-0" />
      <span className="text-[12px] font-ui select-none">
        {language === 'en' ? (
          <>
            <span className="text-[#0B1421] font-semibold">EN</span>
            <span className="text-[#34394A]/40 mx-0.5">/</span>
            <span className="text-[#535965]">اردو</span>
          </>
        ) : (
          <>
            <span className="text-[#535965]">EN</span>
            <span className="text-[#34394A]/40 mx-0.5">/</span>
            <span className="text-[#0B1421] font-semibold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
