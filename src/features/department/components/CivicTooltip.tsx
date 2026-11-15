import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface CivicTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export const CivicTooltipProvider = TooltipPrimitive.Provider;

export const CivicTooltip: React.FC<CivicTooltipProps> = ({
  content,
  children,
  side = 'right',
  align = 'center',
  delayDuration = 200,
}) => {
  if (!content) return children;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className="z-50 px-2.5 py-1 text-[11px] font-medium text-[var(--dept-text-primary)] bg-[var(--dept-surface)] border border-[var(--dept-border-strong)] rounded-md shadow-md animate-in fade-in-0 zoom-in-95 select-none pointer-events-none"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--dept-border-strong)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
