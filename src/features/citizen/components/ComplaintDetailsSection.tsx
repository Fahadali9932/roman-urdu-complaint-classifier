import React from 'react';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { ComplaintDetailsData } from '../../../types';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import { PenLine, ArrowRight, RotateCcw } from 'lucide-react';

export interface ComplaintDetailsSectionProps {
  data: ComplaintDetailsData;
  onChange: (field: keyof ComplaintDetailsData, value: string) => void;
  errors: Partial<Record<keyof ComplaintDetailsData, string>>;
  wordCount: number;
  onReset?: () => void;
  isSubmitting?: boolean;
}

export const ComplaintDetailsSection: React.FC<ComplaintDetailsSectionProps> = ({
  data,
  onChange,
  errors,
  wordCount,
  onReset,
  isSubmitting = false,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Check if content contains Urdu/Arabic characters for script direction
  const isUrduScript = /[\u0600-\u06FF]/.test(data.description);
  const textDirection = isUrduScript ? 'rtl' : 'ltr';
  const isOverLimit = wordCount > MAX_COMPLAINT_WORDS;

  return (
    <div id="complaint-details-panel" className="bg-white rounded-2xl border border-[#E8E5E1] p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(20,20,20,0.04)] space-y-6">
      {/* Designed Panel Header */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-[#F1EFEC]">
        <div className="w-10 h-10 rounded-xl bg-[#F7EFF0] text-[#681822] flex items-center justify-center shrink-0 border border-[#681822]/10">
          <PenLine className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-black text-sm tracking-widest text-[#141414] uppercase">
            {t('sectionComplaintDetails')}
          </h2>
          <p className="text-xs text-[#77716E] font-ui mt-0.5">
            {t('panelComplaintSubtitle')}
          </p>
        </div>
      </div>

      {/* Fields Column */}
      <div className="space-y-5">
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
                isOverLimit ? 'text-[#681822]' : 'text-[#77716E]'
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
            className={`w-full rounded-xl border bg-[#FAF9F7] p-4.5 sm:p-5 font-sans text-sm sm:text-base text-[#141414] leading-relaxed transition-all placeholder:text-[#888] outline-none min-h-[220px] focus:bg-white shadow-2xs ${
              errors.description
                ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-[#E8E5E1] hover:border-[#323232] focus:border-[#141414] focus:ring-1 focus:ring-[#141414]'
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

      {/* Integrated Action Bar at bottom of panel */}
      <div id="action-buttons-group" className="pt-6 border-t border-[#F1EFEC] flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-[#E8E5E1] bg-white text-[#77716E] hover:text-[#141414] hover:bg-[#FAF9F7] font-semibold text-xs tracking-wide transition-colors"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {t('formClear')}
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isOverLimit}
          rightIcon={<ArrowRight className="w-4 h-4 text-white" />}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#681822] hover:bg-[#52131b] text-white font-bold text-xs tracking-wider uppercase shadow-sm shadow-[#681822]/20 transition-all cursor-pointer"
        >
          {isSubmitting ? t('formSubmitting') : t('formSubmitButton')}
        </Button>
      </div>
    </div>
  );
};
