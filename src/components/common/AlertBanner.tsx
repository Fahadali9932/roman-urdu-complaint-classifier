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
      container: 'bg-[#182637] border-[#2c415c] text-[#b8d5fa]',
      icon: <Info className="w-5 h-5 text-[#60a5fa] shrink-0 mt-0.5" />,
      titleColor: 'text-[#F1F2F3] font-semibold',
    },
    warning: {
      container: 'bg-[#292215] border-[#4f3e23] text-[#fde047]',
      icon: <AlertTriangle className="w-5 h-5 text-[#facc15] shrink-0 mt-0.5" />,
      titleColor: 'text-[#F1F2F3] font-semibold',
    },
    success: {
      container: 'bg-[#162920] border-[#254d3a] text-[#86efac]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#4ade80] shrink-0 mt-0.5" />,
      titleColor: 'text-[#F1F2F3] font-semibold',
    },
    danger: {
      container: 'bg-[#31181f] border-[#592635] text-[#fca5a5]',
      icon: <AlertCircle className="w-5 h-5 text-[#f87171] shrink-0 mt-0.5" />,
      titleColor: 'text-[#F1F2F3] font-semibold',
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
