import React from 'react';
import { MAX_COMPLAINT_WORDS } from '../../utils/wordCounter';
import { useLanguage } from '../../context/LanguageContext';

interface WordCounterProps {
  currentCount: number;
  maxWords?: number;
  className?: string;
}

export const WordCounter: React.FC<WordCounterProps> = ({
  currentCount,
  maxWords = MAX_COMPLAINT_WORDS,
  className = '',
}) => {
  const { t } = useLanguage();
  const isOverLimit = currentCount > maxWords;
  const isNearLimit = currentCount >= maxWords - 20 && !isOverLimit;
  const percentage = Math.min(Math.round((currentCount / maxWords) * 100), 100);

  let textColor = 'text-[#B5B9BC]';
  let barColor = 'bg-[#F1F2F3]';

  if (isOverLimit) {
    textColor = 'text-rose-400 font-bold';
    barColor = 'bg-rose-400';
  } else if (isNearLimit) {
    textColor = 'text-amber-400 font-semibold';
    barColor = 'bg-amber-400';
  }

  return (
    <div className={`flex flex-col gap-1.5 text-xs select-none shrink-0 ${className}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-[#B5B9BC] font-medium whitespace-nowrap">
          {t('formWordCounter')}:{' '}
          <span className={`ref-code font-bold ${textColor}`} data-testid="word-count-display">
            {currentCount}
          </span>{' '}
          <span className="ref-code text-[#B5B9BC]/70">/ {maxWords}</span>
        </span>
        <span className={`text-[11px] font-medium whitespace-nowrap ${textColor}`}>
          {isOverLimit ? (
            t('valDescExceeded')
          ) : (
            <>
              <span className="ref-code font-semibold">{maxWords - currentCount}</span> {t('wordsRemaining')}
            </>
          )}
        </span>
      </div>
      {/* Visual gauge */}
      <div className="w-full h-1.5 bg-[#34394A] rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentCount} aria-valuemin={0} aria-valuemax={maxWords}>
        <div
          className={`h-full transition-all duration-200 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
