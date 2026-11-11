import { createContext, useContext } from 'react';

export interface SectionRegistration {
  id: string;
  depth: number;
  outerEl: HTMLElement;
  innerEl: HTMLElement;
  recedeOnScroll: boolean;
}

export interface StackedScrollContextType {
  registerSection: (reg: SectionRegistration) => void;
  unregisterSection: (id: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  prefersReducedMotion: boolean;
  isRTL: boolean;
}

export const StackedScrollContext = createContext<StackedScrollContextType | undefined>(undefined);

export const useStackedScroll = (): StackedScrollContextType => {
  const ctx = useContext(StackedScrollContext);
  if (!ctx) {
    throw new Error('useStackedScroll must be used within a StackedScrollContainer');
  }
  return ctx;
};

