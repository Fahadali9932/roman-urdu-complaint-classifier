import React from 'react';
import { Input } from '../../../components/common/Input';
import { useLanguage } from '../../../context/LanguageContext';
import { ComplaintDetailsData } from '../../../types';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';

export interface ComplaintDetailsSectionProps {
  data: ComplaintDetailsData;
  onChange: (field: keyof ComplaintDetailsData, value: string) => void;
  errors: Partial<Record<keyof ComplaintDetailsData, string>>;
  wordCount: number;
}

export const ComplaintDetailsSection: React.FC<ComplaintDetailsSectionProps> = ({
  data,
  onChange,
  errors,
  wordCount,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Check if content contains Urdu/Arabic characters for script direction
  const isUrduScript = /[\u0600-\u06FF]/.test(data.description);
  const textDirection = isUrduScript ? 'rtl' : 'ltr';
  const isOverLimit = wordCount > MAX_COMPLAINT_WORDS;

  return (
    <div className="space-y-5">
      {/* Group Heading (Level 2) */}
      <div className="pb-3 border-b border-[#E5E3E0]">
        <h2 className="font-display font-bold text-lg sm:text-xl text-[#141414] tracking-tight">
          {t('sectionComplaintDetails')}
        </h2>
      </div>

      {/* Fields Column */}
      <div className="space-y-4">
        {/* Subject Input */}
        <Input
          label={t('formSubject')}
          required
          id="title"
          aria-label="Complaint Subject / Title"
          placeholder={t('formSubjectPlaceholder')}
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          error={errors.title}
        />

        {/* Clean Spacious Complaint Description Textarea */}
        <div className="space-y-1.5 text-start">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="description"
              className="block text-xs sm:text-sm font-medium text-[#141414] select-none font-ui"
            >
              {t('formDescribeComplaint')} <span className="text-[#681822] ms-1" aria-hidden="true">*</span>
            </label>
            <span
              data-testid="word-count-display"
              className={`font-mono text-xs font-semibold ${
                isOverLimit ? 'text-[#681822]' : 'text-[#666]'
              }`}
            >
              {wordCount} / {MAX_COMPLAINT_WORDS} {t('formWordCounter')}
            </span>
          </div>

          <textarea
            id="description"
            rows={8}
            dir={textDirection}
            aria-label="Complaint Description"
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('formDescribeComplaintPlaceholder')}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            className={`w-full rounded-lg border bg-white p-4 font-sans text-sm sm:text-base text-[#141414] leading-relaxed transition-all placeholder:text-[#888] outline-none min-h-[200px] ${
              errors.description
                ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-[#E5E3E0] hover:border-[#323232] focus:border-[#141414] focus:ring-1 focus:ring-[#141414]'
            } ${isUrduScript ? 'font-serif text-base' : ''}`}
          />

          {errors.description && (
            <p id="description-error" className="font-ui text-xs font-semibold text-[#681822] pt-0.5" role="alert">
              {errors.description}
            </p>
          )}

          {isOverLimit && (
            <p className="font-ui text-xs font-semibold text-[#681822]" role="alert">
              {ur
                ? `الفاظ کی حد ۲۰۰ سے زیادہ ہو گئی ہے (${wordCount} الفاظ)۔ برائے مہربانی مختصر بیان کریں۔`
                : `Complaint exceeds the 200-word limit (${wordCount} words). Please summarize your grievance.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
