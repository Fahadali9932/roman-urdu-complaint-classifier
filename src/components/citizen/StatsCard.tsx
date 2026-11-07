import React, { type ReactNode } from 'react';
import { Card } from '../common/Card';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  variant?: 'teal' | 'amber' | 'emerald' | 'blue' | 'slate';
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  variant = 'teal',
  description,
}) => {
  const iconBgStyles = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  return (
    <Card className="p-5 text-start hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          {label}
        </span>
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${iconBgStyles[variant]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="ref-code text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500 font-medium">{description}</p>
      )}
    </Card>
  );
};
