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

  let textColor = 'text-slate-500';
  let barColor = 'bg-teal-600';

  if (isOverLimit) {
    textColor = 'text-rose-600 font-bold';
    barColor = 'bg-rose-600';
  } else if (isNearLimit) {
    textColor = 'text-amber-600 font-semibold';
    barColor = 'bg-amber-500';
  }

  return (
    <div className={`flex flex-col gap-1 text-xs select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-slate-500">
          {t('formWordCounter')}:{' '}
          <span className={textColor} data-testid="word-count-display">
            {currentCount}
          </span>{' '}
          / {maxWords}
        </span>
        <span className={`text-[11px] font-medium ${textColor}`}>
          {isOverLimit ? t('valDescExceeded') : `${maxWords - currentCount} remaining`}
        </span>
      </div>
      {/* Visual gauge */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
