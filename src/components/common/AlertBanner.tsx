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
      container: 'bg-[#FAF9F7] border-[#E5E3E0] text-[#141414]',
      icon: <Info className="w-5 h-5 text-[#323232] shrink-0 mt-0.5" />,
      titleColor: 'text-[#141414] font-semibold',
    },
    warning: {
      container: 'bg-[#FAF9F7] border-[#E5E3E0] text-[#141414]',
      icon: <AlertTriangle className="w-5 h-5 text-[#681822] shrink-0 mt-0.5" />,
      titleColor: 'text-[#141414] font-semibold',
    },
    success: {
      container: 'bg-[#FAF9F7] border-emerald-300 text-[#141414]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />,
      titleColor: 'text-[#141414] font-semibold',
    },
    danger: {
      container: 'bg-[#FAF0F0] border-[#681822]/30 text-[#141414]',
      icon: <AlertCircle className="w-5 h-5 text-[#681822] shrink-0 mt-0.5" />,
      titleColor: 'text-[#681822] font-semibold',
    },
  };

  const current = styles[type];

  return (
    <div
      className={`rounded-xl border p-4 text-start flex gap-3 shadow-2xs ${current.container} ${className}`}
      role="alert"
    >
      {current.icon}
      <div className="space-y-0.5 text-xs sm:text-sm font-ui">
        {title && <h4 className={`text-sm ${current.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
