import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { WizardProgress } from './WizardProgress';
import { ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

export interface WizardShellProps {
  currentStep: number;
  totalSteps?: number;
  stepTitle: string;
  stepSubtitle?: string;
  onBack?: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
  continueText?: string;
  children: React.ReactNode;
  canContinue?: boolean;
  onReset?: () => void;
}

export const WizardShell: React.FC<WizardShellProps> = ({
  currentStep,
  totalSteps = 4,
  stepTitle,
  stepSubtitle,
  onBack,
  onContinue,
  isSubmitting = false,
  continueText,
  children,
  canContinue = true,
  onReset,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  const defaultContinueText =
    currentStep === totalSteps
      ? t('wizardBtnSubmit')
      : t('wizardBtnContinue');

  const finalContinueText = continueText || defaultContinueText;

  return (
    <div className="w-full bg-[#F7F6F3] min-h-[calc(100vh-80px)] py-10 sm:py-14 md:py-20 px-4 sm:px-6">
      <div className="max-w-[720px] mx-auto">
        {/* Layered Paper Wrapper */}
        <div className="relative">
          {/* Subtle Layered Paper Under-Cards */}
          <div
            className="absolute inset-x-3 -bottom-2.5 h-6 rounded-[22px] bg-white/70 border border-[#E8E5E1]/80 -z-10 shadow-xs pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-6 -bottom-5 h-6 rounded-[20px] bg-white/40 border border-[#E8E5E1]/50 -z-20 shadow-xs pointer-events-none"
            aria-hidden="true"
          />

          {/* Main White Editorial Surface */}
          <div className="bg-white rounded-[24px] border border-[#E8E5E1] p-6 sm:p-9 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
            {/* Panel Header */}
            <WizardProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              title={stepTitle}
              subtitle={stepSubtitle}
            />

            {/* Active Step Content with Smooth Transition */}
            <div className="py-7 transition-all duration-300 ease-out">
              {children}
            </div>

            {/* Navigation & Action Bar */}
            <div className="pt-6 border-t border-[#F1EFEC] flex items-center justify-between gap-4">
              <div>
                {currentStep > 1 ? (
                  <button
                    id="wizard-back-btn"
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8E5E1] bg-white text-[#77716E] hover:text-[#141414] hover:bg-[#FAF9F7] font-semibold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer font-ui"
                  >
                    {ur ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span>{t('wizardBtnBack')}</span>
                  </button>
                ) : onReset ? (
                  <button
                    id="wizard-clear-btn"
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#77716E] hover:text-[#141414] transition-colors cursor-pointer font-ui"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('formClear')}</span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <div>
                <button
                  id="wizard-continue-btn"
                  type="button"
                  onClick={onContinue}
                  disabled={!canContinue || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-[#681822] hover:bg-[#52131b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-sm shadow-[#681822]/20 transition-all cursor-pointer font-ui"
                >
                  {isSubmitting ? (
                    <span>{t('formSubmitting')}</span>
                  ) : (
                    <>
                      <span>{finalContinueText}</span>
                      {currentStep < totalSteps && (
                        ur ? <ArrowLeft className="w-4 h-4 text-white" /> : <ArrowRight className="w-4 h-4 text-white" />
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
