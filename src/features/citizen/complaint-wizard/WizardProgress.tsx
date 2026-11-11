import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export interface WizardProgressProps {
  currentStep: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, totalSteps = 4 }) => {
  const { t } = useLanguage();
  const stages = [t('wizardStageProblem'), t('wizardStageLocation'), t('wizardStageContact'), t('wizardStageReview')];
  const stepString = t('wizardStepCount').replace('{current}', String(currentStep).padStart(2, '0')).replace('{total}', String(totalSteps).padStart(2, '0'));

  return (
    <div className="casefile__progress" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={stepString}>
      <span className="sr-only">{stepString}</span>
      {stages.map((stage, index) => {
        const step = index + 1;
        const status = step === currentStep ? 'is-current' : step < currentStep ? 'is-done' : '';
        return <div key={stage} className={`casefile__progress-item ${status}`}><span className="casefile__progress-dot">{step}</span><span>{stage}</span></div>;
      })}
    </div>
  );
};
