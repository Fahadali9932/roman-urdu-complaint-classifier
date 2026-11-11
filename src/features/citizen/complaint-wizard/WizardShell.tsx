import React from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { WizardProgress } from './WizardProgress';
import './editorial-casefile.css';

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

const casefileCopy = {
  en: {
    displayTitles: ['SAY IT\nCLEARLY.', 'PLACE IT\nPRECISELY.', 'REACH YOU\nRESPONSIBLY.', 'READ IT\nONCE MORE.'],
    prompts: [
      'Write the public record. Keep it about the public issue.',
      'A locality resolves to a district while you type.',
      'Your contact details stay outside the case record.',
      'This is a preview. Nothing will be sent, routed, or saved.',
    ],
    rail: 'WRITE\nTHE\nRECORD.',
    clear: 'Clear draft',
  },
  ur: {
    displayTitles: ['صاف\nلکھیں۔', 'مقام\nبتائیں۔', 'رابطہ\nرکھیں۔', 'ایک بار\nپڑھیں۔'],
    prompts: [
      'عوامی مسئلہ اپنی زبان میں بیان کریں۔',
      'علاقہ لکھنے پر ضلع کی شناخت ہو جاتی ہے۔',
      'رابطے کی تفصیل کیس ریکارڈ کا حصہ نہیں بنتی۔',
      'یہ پیش منظر ہے، کچھ بھی بھیجا یا محفوظ نہیں ہوگا۔',
    ],
    rail: 'اپنی\nبات\nلکھیں۔',
    clear: 'فارم صاف کریں',
  },
};

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
  const copy = casefileCopy[ur ? 'ur' : 'en'];
  const index = currentStep - 1;
  const continueLabel = continueText || (currentStep === totalSteps ? t('wizardBtnSubmit') : t('wizardBtnContinue'));

  return (
    <main id="casefile-flow" className="casefile" dir={ur ? 'rtl' : 'ltr'}>
      <section className="casefile__layout" aria-label={ur ? 'شکایت لکھیں' : 'Write a complaint'}>
        <aside className="casefile__rail" aria-label={ur ? `مرحلہ ${currentStep}` : `Step ${currentStep}`}>
          <span className="casefile__index">{String(currentStep).padStart(2, '0')}</span>
          <p className="casefile__rail-title" aria-hidden="true">
            {copy.rail.split('\n').map((line) => <span key={line}>{line}</span>)}
          </p>
          <p className="casefile__prompt">{copy.prompts[index]}</p>
        </aside>

        <div className="casefile__content">
          <WizardProgress currentStep={currentStep} totalSteps={totalSteps} title={stepTitle} subtitle={stepSubtitle} />
          <div className="casefile__heading">
            <p className="casefile__kicker">{String(currentStep).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</p>
            <h1 aria-label={stepTitle}>
              {copy.displayTitles[index].split('\n').map((line) => <span key={line} aria-hidden="true">{line}</span>)}
            </h1>
            {stepSubtitle && <p className="casefile__subtitle">{stepSubtitle}</p>}
          </div>

          <div className="casefile__sheet">
            <div key={currentStep} className="casefile__step">{children}</div>
            <div className="casefile__actions">
              {currentStep > 1 ? (
                <button id="wizard-back-btn" type="button" onClick={onBack} className="casefile__secondary">
                  {ur ? <ArrowRight aria-hidden="true" /> : <ArrowLeft aria-hidden="true" />}
                  <span>{t('wizardBtnBack')}</span>
                </button>
              ) : onReset ? (
                <button id="wizard-clear-btn" type="button" onClick={onReset} className="casefile__clear">
                  <RotateCcw aria-hidden="true" />
                  <span>{copy.clear}</span>
                </button>
              ) : <span />}

              <button id="wizard-continue-btn" type="button" onClick={onContinue} disabled={!canContinue || isSubmitting} className="casefile__primary">
                <span>{isSubmitting ? t('formSubmitting') : continueLabel}</span>
                {!isSubmitting && currentStep < totalSteps && (ur ? <ArrowLeft aria-hidden="true" /> : <ArrowRight aria-hidden="true" />)}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
