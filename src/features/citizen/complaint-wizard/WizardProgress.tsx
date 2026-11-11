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
  const { t } = useLanguage();

  const stepString = t('wizardStepCount')
    .replace('{current}', String(currentStep).padStart(2, '0'))
    .replace('{total}', String(totalSteps).padStart(2, '0'));

  const stages = [
    { step: 1, name: t('wizardStageProblem') },
    { step: 2, name: t('wizardStageLocation') },
    { step: 3, name: t('wizardStageContact') },
    { step: 4, name: t('wizardStageReview') },
  ];

  return (
    <div className="space-y-2.5 pb-5 border-b border-[#F1EFEC] text-start">
      {/* Top Meta: Step Counter & Subtle Stage Labels */}
      <div className="flex items-center justify-between text-xs font-ui">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#77716E]">
          {stepString}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#A8A29E]">
          {stages.map((stage, idx) => {
            const isCurrent = stage.step === currentStep;
            const isCompleted = stage.step < currentStep;
            return (
              <React.Fragment key={stage.step}>
                <span
                  className={
                    isCurrent
                      ? 'text-[#141414] font-bold'
                      : isCompleted
                      ? 'text-[#681822] font-medium'
                      : 'text-[#A8A29E]'
                  }
                >
                  {stage.name}
                </span>
                {idx < stages.length - 1 && <span className="opacity-40">/</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Slim 4-Segmented Progress Indicator */}
      <div
        className="grid grid-cols-4 gap-2 pt-0.5"
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
              className={`h-[2.5px] rounded-full transition-all duration-300 ease-out ${
                isActive ? 'bg-[#681822]' : 'bg-[#E8E5E1]'
              }`}
            />
          );
        })}
      </div>

      {/* Confident Question Heading & Supporting Line */}
      <div className="pt-2">
        <h1 className="font-display font-black text-2xl sm:text-[28px] text-[#141414] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#77716E] font-ui font-normal mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
