export interface StackedSectionProps {
  id?: string;
  as?: 'div' | 'section' | 'article' | 'main';
  className?: string;
  children: React.ReactNode;
  /**
   * Stacking depth order (1 = bottom layer, 2 = layer 2, etc.)
   */
  depth?: number;
  /**
   * Whether this section recedes into 3D space when the next section overlaps it
   * Default: true
   */
  recedeOnScroll?: boolean;
  /**
   * Whether this section casts a physical incoming shadow over the layer beneath it
   * Default: true
   */
  hasIncomingShadow?: boolean;
  /**
   * Pinning behavior: 'top' stays pinned at top: 0 while next section scrolls over;
   * 'bottom' pins when bottom reaches screen; 'none' flows naturally.
   * Default: 'top' for viewport-height sections, 'bottom' for tall sections
   */
  stickyMode?: 'top' | 'bottom' | 'none';
  /**
   * Minimum height styling for the section
   */
  minHeight?: string;
}

export interface StackedScrollContextType {
  registerSection: (id: string, element: HTMLElement) => void;
  unregisterSection: (id: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  prefersReducedMotion: boolean;
  isRTL: boolean;
}

