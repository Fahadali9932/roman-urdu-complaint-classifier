import React, { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  secondaryAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 mb-3.5 border border-slate-200/80 shadow-2xs">
        {icon || <Inbox className="w-7 h-7 text-teal-700/60" aria-hidden="true" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
