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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-600 ${className}`}
      title={language === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
      aria-label="Toggle interface language"
    >
      <Globe className="w-3.5 h-3.5 text-teal-600" />
      <span className="font-medium">
        {language === 'en' ? (
          <>
            <span className="text-slate-900 font-bold">EN</span> / <span className="text-slate-400">اردو</span>
          </>
        ) : (
          <>
            <span className="text-slate-400">EN</span> / <span className="text-emerald-700 font-bold">اردو</span>
          </>
        )}
      </span>
    </button>
  );
};
