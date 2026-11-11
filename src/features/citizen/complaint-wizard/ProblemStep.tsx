import React from 'react';
import { Input } from '../../../components/common/Input';
import { useLanguage } from '../../../context/LanguageContext';
import { ComplaintDetailsData } from '../../../types';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';

export interface ProblemStepProps {
  data: ComplaintDetailsData;
  onChange: (field: keyof ComplaintDetailsData, value: string) => void;
  errors: Partial<Record<keyof ComplaintDetailsData, string>>;
  wordCount: number;
}

export const ProblemStep: React.FC<ProblemStepProps> = ({
  data,
  onChange,
  errors,
  wordCount,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  const isUrduScript = /[\u0600-\u06FF]/.test(data.description);
  const textDirection = isUrduScript ? 'rtl' : 'ltr';
  const isOverLimit = wordCount > MAX_COMPLAINT_WORDS;

  return (
    <div className="space-y-6 text-start">
      {/* Subject Input */}
      <div>
        <Input
          label={t('formSubject')}
          required
          id="title"
          aria-label="Complaint Subject / Title"
          placeholder={t('formSubjectPlaceholder')}
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          error={errors.title}
          className="text-base"
        />
      </div>

      {/* Spacious Complaint Description (Primary Focus) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className="block text-xs sm:text-sm font-medium text-[#141414] select-none font-ui"
          >
            {t('formDescribeComplaint')} <span className="text-[#681822] ms-0.5" aria-hidden="true">*</span>
          </label>
          <div
            className={`text-[11px] font-mono font-medium tracking-tight ${
              isOverLimit ? 'text-[#681822] font-bold' : 'text-[#77716E]'
            }`}
          >
            <span data-testid="word-count-display">{wordCount}</span> / {MAX_COMPLAINT_WORDS} {t('formWordCounter')}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="description"
            aria-label="Complaint Description"
            dir={textDirection}
            rows={7}
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('formDescribeComplaintPlaceholder')}
            className={`w-full min-h-[220px] rounded-xl border p-4 text-base font-ui leading-relaxed transition-all duration-200 outline-none resize-y ${
              errors.description
                ? 'border-[#681822] bg-[#FAF9F7] focus:bg-white focus:border-[#681822] focus:ring-1 focus:ring-[#681822]'
                : 'border-[#E8E5E1] bg-[#FAF9F7] focus:bg-white focus:border-[#141414] focus:ring-1 focus:ring-[#141414]'
            }`}
          />
        </div>

        {/* Validation Errors & Helper */}
        {errors.description && (
          <p className="text-xs text-[#681822] font-ui font-medium pt-1">
            {errors.description}
          </p>
        )}

        {isOverLimit && !errors.description && (
          <p className="text-xs text-[#681822] font-ui font-medium pt-1">
            {ur
              ? `الفاظ کی حد ۲۰۰ سے زیادہ ہو گئی ہے (${wordCount} الفاظ)۔ برائے مہربانی مختصر بیان کریں۔`
              : `Complaint exceeds the 200-word limit (${wordCount} words). Please summarize your grievance.`}
          </p>
        )}

        <p className="text-[11px] text-[#77716E] font-ui pt-0.5 leading-normal">
          {t('formRomanUrduExample')}
        </p>
      </div>
    </div>
  );
};
