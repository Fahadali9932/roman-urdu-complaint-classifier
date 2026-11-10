import React from 'react';
import { WordCounter } from '../../../components/common/WordCounter';
import { MAX_COMPLAINT_WORDS } from '../../../utils/wordCounter';
import { useLanguage } from '../../../context/LanguageContext';

export interface RuledComplaintTextareaProps {
  id?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  wordCount: number;
  placeholder?: string;
}

export const RuledComplaintTextarea: React.FC<RuledComplaintTextareaProps> = ({
  id = 'description',
  label,
  value,
  onChange,
  error,
  required = true,
  wordCount,
  placeholder,
}) => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';

  // Detect script direction of the complaint text
  // Roman Urdu is Latin script -> LTR even in Urdu UI
  const isUrduScript = /[\u0600-\u06FF]/.test(value.trim());
  const textDirection = value.trim() ? (isUrduScript ? 'rtl' : 'ltr') : isRTL ? 'rtl' : 'ltr';

  return (
    <div className="space-y-2 text-start">
      {/* Label and Guidance Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
        <label
          htmlFor={id}
          className="block font-ui text-xs sm:text-sm font-bold tracking-wide uppercase text-[#141414]"
        >
          {label} {required && <span className="text-[#681822]">*</span>}
        </label>
        <span className="font-mono text-[11px] text-[#555] tracking-tight">
          {ur ? 'رومن اردو، اردو یا انگریزی میں لکھیں' : 'Roman Urdu, Urdu, or English'}
        </span>
      </div>

      {/* The Ruled Paper Sheet Container */}
      <div
        className={`relative w-full rounded-md border transition-colors ${
          error
            ? 'border-[#681822] ring-1 ring-[#681822]/20'
            : 'border-[#D8D6D2] focus-within:border-[#141414] focus-within:ring-1 focus-within:ring-[#141414]/15'
        } bg-[#FCFBF9] overflow-hidden`}
        style={{
          boxShadow: 'inset 0 1px 3px rgba(20,20,20,0.03)',
        }}
      >
        {/*
          Horizontal Ruled Lines:
          32px grid period perfectly aligned with 32px line-height.
          background-attachment: local ensures lines scroll seamlessly with multiline text.
        */}
        <div
          className="w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 31px,
              rgba(180, 176, 170, 0.45) 31px,
              rgba(180, 176, 170, 0.45) 32px
            )`,
            backgroundSize: '100% 32px',
            backgroundPosition: '0 8px',
            backgroundAttachment: 'local',
          }}
        >
          <textarea
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            dir={textDirection}
            rows={8}
            placeholder={
              placeholder ||
              (ur
                ? 'رومن اردو، اردو یا انگریزی میں اپنی شکایت درج کریں... (مثلاً: پچھلے تین دن سے مین لائن بند ہے)'
                : 'Write your complaint here in Roman Urdu, English, or Urdu... (e.g., Do din se bijli nahi aa rahi)')
            }
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`w-full bg-transparent px-4 sm:px-6 pt-[8px] pb-[8px] font-sans text-sm sm:text-base text-[#141414] leading-[32px] resize-y outline-none transition-all placeholder:text-[#888580] placeholder:font-normal placeholder:leading-[32px] ${
              textDirection === 'rtl' ? 'text-right' : 'text-left'
            }`}
            style={{
              lineHeight: '32px',
              minHeight: '264px',
            }}
          />
        </div>
      </div>

      {/* Word Counter & Helper Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-[#555]">
        <p className="italic text-xs text-[#555] font-ui">
          {ur
            ? 'مثال: "Pichlay do haftay se hamaray area mein kachra nahi uthaya gaya."'
            : 'Example: "Pichlay do haftay se hamaray area mein kachra nahi uthaya gaya."'}
        </p>
        <WordCounter
          currentCount={wordCount}
          maxWords={MAX_COMPLAINT_WORDS}
          className="w-full sm:w-60"
        />
      </div>

      {/* Error Message */}
      {error && (
        <p id={`${id}-error`} className="font-ui text-xs font-semibold text-[#681822] pt-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
