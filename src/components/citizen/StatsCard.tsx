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
    teal: 'bg-teal-50 text-teal-700 border-teal-200/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/60',
  };

  return (
    <Card className="p-5 text-start">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl border ${iconBgStyles[variant]}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
    </Card>
  );
};
