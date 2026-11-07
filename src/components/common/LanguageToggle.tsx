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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-white text-xs font-medium tracking-wide shadow-2xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      <span className="font-sans">
        {language === 'en' ? (
          <>
            <span className="text-white font-semibold">EN</span> / <span className="text-slate-400">اردو</span>
          </>
        ) : (
          <>
            <span className="text-slate-400">EN</span> / <span className="text-white font-semibold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
