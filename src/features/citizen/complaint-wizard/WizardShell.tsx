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
    <div className="w-full bg-[#F7F6F3] min-h-[calc(100vh-80px)] flex flex-col justify-center py-6 sm:py-10 md:py-12 px-4">
      {/* Centered Panel Wrapper with Subtle Maroon Depth Layer */}
      <div className="relative w-full max-w-[580px] mx-auto">
        {/* Extremely subtle overlapping maroon background layer adding soft optical depth */}
        <div
          aria-hidden="true"
          className="absolute -top-1 sm:-top-1.5 inset-x-2 sm:inset-x-3.5 bottom-0 rounded-[28px] sm:rounded-[30px] bg-[#681822]/[0.05] border border-[#681822]/[0.07] -z-10 pointer-events-none transition-all duration-300"
        />

        {/* Primary Interactive White Panel */}
        <div className="relative w-full bg-white rounded-[26px] sm:rounded-[28px] border border-[#EAE7E2] p-6 sm:p-7 md:p-8 shadow-[0_16px_40px_-12px_rgba(20,20,20,0.05),0_2px_6px_rgba(104,24,34,0.02)] transition-all">
          {/* Integrated Step Progress & Heading */}
          <WizardProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            title={stepTitle}
            subtitle={stepSubtitle}
          />

          {/* Step Body */}
          <div className="py-5 transition-all duration-200 ease-out">
            {children}
          </div>

          {/* Bottom Actions Bar */}
          <div className="pt-5 border-t border-[#F1EFEC] flex items-center justify-between gap-4">
            <div className="flex items-center">
              {currentStep > 1 ? (
                <button
                  id="wizard-back-btn"
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8E5E1] bg-white text-[#77716E] hover:text-[#141414] hover:bg-[#FAF9F7] hover:border-[#CDC8C0] focus:ring-2 focus:ring-[#681822]/20 font-semibold text-xs sm:text-sm tracking-wide transition-all cursor-pointer font-ui outline-none"
                >
                  {ur ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span>{t('wizardBtnBack')}</span>
                </button>
              ) : onReset ? (
                <button
                  id="wizard-clear-btn"
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#77716E] hover:text-[#141414] transition-colors cursor-pointer font-ui"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('formClear')}</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center">
              <button
                id="wizard-continue-btn"
                type="button"
                onClick={onContinue}
                disabled={!canContinue || isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-[#681822] hover:bg-[#52131b] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer font-ui shadow-xs hover:shadow focus:ring-2 focus:ring-[#681822]/30 outline-none"
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
  );
};
