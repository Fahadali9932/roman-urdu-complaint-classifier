import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export interface WizardProgressProps {
  currentStep: number; // 1-based (1..4)
  totalSteps?: number;
  title: string;
  subtitle?: string;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  totalSteps = 4,
  title,
  subtitle,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  const stepString = t('wizardStepCount')
    .replace('{current}', String(currentStep).padStart(2, '0'))
    .replace('{total}', String(totalSteps).padStart(2, '0'));

  return (
    <div className="space-y-3 pb-6 border-b border-[#F1EFEC] text-start">
      {/* Step Counter Label */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#77716E]">
          {stepString}
        </span>
        <span className="text-xs font-medium text-[#77716E] font-ui">
          {currentStep === 1 && (ur ? 'شکایت' : 'Grievance')}
          {currentStep === 2 && (ur ? 'مقام' : 'Location')}
          {currentStep === 3 && (ur ? 'رابطہ' : 'Contact')}
          {currentStep === 4 && (ur ? 'جائزہ' : 'Review')}
        </span>
      </div>

      {/* 4-Segmented Progress Bar */}
      <div
        className="grid grid-cols-4 gap-2"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={stepString}
      >
        {Array.from({ length: totalSteps }, (_, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum <= currentStep;
          return (
            <div
              key={stepNum}
              className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                isActive ? 'bg-[#681822]' : 'bg-[#E8E5E1]'
              }`}
            />
          );
        })}
      </div>

      {/* Step Heading & Subtitle */}
      <div className="pt-2">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#77716E] font-ui font-normal mt-1.5 leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
