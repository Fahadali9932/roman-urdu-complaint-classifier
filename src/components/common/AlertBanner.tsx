import React, { type ReactNode } from 'react';
import { AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface AlertBannerProps {
  type?: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
  children: ReactNode;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  children,
  className = '',
}) => {
  const styles = {
    info: {
      container: 'bg-[#EBF1F7] border-[#263E59]/25 text-[#101A28]',
      icon: <Info className="w-5 h-5 text-[#263E59] shrink-0 mt-0.5" />,
      titleColor: 'text-[#101A28] font-semibold',
    },
    warning: {
      container: 'bg-[#FDF7EE] border-[#D5B995]/60 text-[#101A28]',
      icon: <AlertTriangle className="w-5 h-5 text-[#88413F] shrink-0 mt-0.5" />,
      titleColor: 'text-[#101A28] font-semibold',
    },
    success: {
      container: 'bg-[#EFF8F3] border-emerald-300/60 text-[#101A28]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />,
      titleColor: 'text-[#101A28] font-semibold',
    },
    danger: {
      container: 'bg-[#FAF0F0] border-[#88413F]/30 text-[#101A28]',
      icon: <AlertCircle className="w-5 h-5 text-[#88413F] shrink-0 mt-0.5" />,
      titleColor: 'text-[#88413F] font-semibold',
    },
  };

  const current = styles[type];

  return (
    <div
      className={`rounded-xl border p-4 text-start flex gap-3 shadow-2xs ${current.container} ${className}`}
      role="alert"
    >
      {current.icon}
      <div className="space-y-0.5 text-xs sm:text-sm">
        {title && <h4 className={`text-sm ${current.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
