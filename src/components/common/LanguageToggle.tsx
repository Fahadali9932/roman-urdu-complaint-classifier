import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
  isDark?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '', isDark = false }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full transition-colors cursor-pointer shrink-0 ${
        isDark
          ? 'bg-white/10 hover:bg-white/20 text-[#FFFFFF] focus-visible:outline-2 focus-visible:outline-white'
          : 'bg-transparent hover:bg-[#EFECE6] text-[#141414] focus-visible:outline-2 focus-visible:outline-[#141414]'
      } ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-white/80' : 'text-[#323232]'}`} />
      <span className="text-[12px] font-ui select-none">
        {language === 'en' ? (
          <>
            <span className={isDark ? 'text-[#FFFFFF] font-semibold' : 'text-[#141414] font-semibold'}>EN</span>
            <span className={`hidden sm:inline mx-0.5 ${isDark ? 'text-white/40' : 'text-[#E5E3E0]'}`}>/</span>
            <span className={`hidden sm:inline ${isDark ? 'text-white/70' : 'text-[#6B6864]'}`}>اردو</span>
          </>
        ) : (
          <>
            <span className={`hidden sm:inline ${isDark ? 'text-white/70' : 'text-[#6B6864]'}`}>EN</span>
            <span className={`hidden sm:inline mx-0.5 ${isDark ? 'text-white/40' : 'text-[#E5E3E0]'}`}>/</span>
            <span className={isDark ? 'text-[#FFFFFF] font-semibold' : 'text-[#141414] font-semibold'}>اردو</span>
          </>
        )}
      </span>
    </button>
  );
};

export default LanguageToggle;
