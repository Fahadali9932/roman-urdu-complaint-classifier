import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import { ArrowLeft, Send } from 'lucide-react';

export interface Stage3ComplaintProps {
  description: string;
  onChangeDescription: (value: string) => void;
  wordCount: number;
  error?: string;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const Stage3Complaint: React.FC<Stage3ComplaintProps> = ({
  description,
  onChangeDescription,
  wordCount,
  error,
  isSubmitting = false,
  onSubmit,
  onBack,
}) => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const isUrduScript = /[\u0600-\u06FF]/.test(description);
  const textDirection = isUrduScript ? 'rtl' : 'ltr';
  const isOverLimit = wordCount > MAX_COMPLAINT_WORDS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOverLimit && !isSubmitting) {
      onSubmit();
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-start">
      {/* Spacious Writing Area */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
          >
            {t('formDescribeComplaint')}{' '}
            <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
          </label>
          <div
            className={`text-xs font-mono font-semibold tracking-tight ${
              isOverLimit ? 'text-rose-400 font-bold' : wordCount > 180 ? 'text-amber-300' : 'text-white/60'
            }`}
          >
            <span data-testid="word-count-display">{wordCount}</span> / {MAX_COMPLAINT_WORDS} {t('formWordCounter')}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="description"
            aria-label="Complaint Description"
            required
            rows={7}
            dir={textDirection}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder={
              ur
                ? 'اپنے الفاظ میں مسئلہ بیان کریں، یہ کس گلی یا مقام پر ہے اور کب سے درپیش ہے...'
                : 'Describe what happened in Roman Urdu or English (e.g. "Do din se gali me pani khara hai aur sewer line block hai")...'
            }
            className={`w-full min-h-[190px] rounded-[18px] border-[1.5px] p-4 text-sm sm:text-base font-ui leading-relaxed transition-all duration-200 outline-none resize-y ${
              error || isOverLimit
                ? 'border-rose-400 bg-rose-950/25 text-white placeholder:text-white/40 focus:ring-1 focus:ring-rose-400'
                : 'border-white/14 bg-white/[0.07] text-white placeholder:text-white/40 hover:border-white/25 focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)] shadow-inner'
            }`}
          />
        </div>

        {error && <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{error}</p>}

        {isOverLimit && !error && (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">
            {ur
              ? `الفاظ کی حد ۲۰۰ سے زیادہ ہو گئی ہے (${wordCount} الفاظ)۔ برائے مہربانی مختصر بیان کریں۔`
              : `Complaint exceeds the 200-word limit (${wordCount} words). Please summarize your grievance.`}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="h-[52px] sm:h-14 px-6 rounded-[16px] border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.99] text-white font-medium text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('glassBtnBack')}</span>
        </button>

        <button
          type="submit"
          disabled={isOverLimit || isSubmitting}
          className="flex-1 h-[52px] sm:h-14 rounded-[16px] bg-gradient-to-r from-[#681822] to-[#801D2A] hover:from-[#781B27] hover:to-[#922230] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer shadow-[0_12px_28px_rgba(104,24,34,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_16px_36px_rgba(104,24,34,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>{t('glassSubmitting')}</span>
            </>
          ) : (
            <>
              <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              <span>{t('glassBtnSubmit')}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
