import { useState, useEffect } from 'react';

export interface DeviceSupportState {
  /**
   * True if device meets the minimum desktop requirements:
   * 1. Viewport width >= 1024 CSS pixels.
   * 2. Not a mobile phone rotated into landscape (height < 550px with touch-only coarse pointer).
   */
  isDesktop: boolean;

  /**
   * True if device is classified as mobile or tablet (< 1024px or phone in landscape).
   */
  isMobileOrTablet: boolean;

  /**
   * Current viewport width in CSS pixels.
   */
  viewportWidth: number;

  /**
   * Current viewport height in CSS pixels.
   */
  viewportHeight: number;

  /**
   * True if the primary pointer is touch-only without a mouse or trackpad.
   */
  isTouchOnly: boolean;
}

/**
 * Deterministically evaluates whether the current browser environment is supported for
 * complex staff management operations (Desktop >= 1024px) or restricted (Mobile/Tablet).
 *
 * Designed to prevent phone landscape orientation from accidentally bypassing the restriction,
 * while fully supporting genuine desktop / laptop computers (including touchscreen laptops).
 */
export function checkDeviceSupport(): DeviceSupportState {
  if (typeof window === 'undefined') {
    return {
      isDesktop: true,
      isMobileOrTablet: false,
      viewportWidth: 1440,
      viewportHeight: 900,
      isTouchOnly: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const isCoarseTouchOnly =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse) and (hover: none)').matches;

  // Rule 1: Viewport width below 1024px is always mobile/tablet
  if (width < 1024) {
    return {
      isDesktop: false,
      isMobileOrTablet: true,
      viewportWidth: width,
      viewportHeight: height,
      isTouchOnly: isCoarseTouchOnly,
    };
  }

  // Rule 2: Rotating a phone into landscape (width >= 1024px but small height < 550px with coarse touch-only pointer)
  const isPhoneInLandscape = height < 550 && isCoarseTouchOnly;
  if (isPhoneInLandscape) {
    return {
      isDesktop: false,
      isMobileOrTablet: true,
      viewportWidth: width,
      viewportHeight: height,
      isTouchOnly: isCoarseTouchOnly,
    };
  }

  return {
    isDesktop: true,
    isMobileOrTablet: false,
    viewportWidth: width,
    viewportHeight: height,
    isTouchOnly: isCoarseTouchOnly,
  };
}

/**
 * React hook that subscribes to viewport and orientation changes to provide live device support status.
 * Preserves authenticated sessions across resizing with zero redirect loops.
 */
export function useDeviceSupport(): DeviceSupportState {
  const [deviceState, setDeviceState] = useState<DeviceSupportState>(() => checkDeviceSupport());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setDeviceState(checkDeviceSupport());
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceState;
}
