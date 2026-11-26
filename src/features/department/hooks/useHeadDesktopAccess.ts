import { useEffect, useState } from 'react';

export const HEAD_MIN_DESKTOP_WIDTH_PX = 1024;

export interface HeadDesktopAccessState {
  isDesktopAllowed: boolean;
  viewportWidth: number;
  viewportHeight: number;
  isMobileFormFactor: boolean;
  reason: 'supported' | 'narrow_viewport' | 'mobile_device';
}

const MOBILE_PHONE_UA_PATTERN =
  /Android.*Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

/**
 * Evaluates whether the current browser viewport and pointing environment
 * satisfy the Department Head desktop/laptop operating threshold (>= 1024 CSS px
 * and not an ordinary phone form-factor, including landscape phones).
 *
 * Security note: Browser-side viewport and pointer checks are strictly usability
 * controls and can be altered via developer tools or user-agent overrides. Server
 * authentication, department membership, AAL2, and Supabase RLS remain the real
 * security boundary.
 */
export function evaluateHeadDesktopAccess(): HeadDesktopAccessState {
  if (typeof window === 'undefined') {
    return {
      isDesktopAllowed: true,
      viewportWidth: HEAD_MIN_DESKTOP_WIDTH_PX,
      viewportHeight: 768,
      isMobileFormFactor: false,
      reason: 'supported',
    };
  }

  const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || HEAD_MIN_DESKTOP_WIDTH_PX;
  const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 768;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

  const hasPhoneUa = MOBILE_PHONE_UA_PATTERN.test(ua);
  const hasCoarseHoverNone =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse) and (hover: none)').matches
      : false;
  const shortViewportEdge = Math.min(viewportWidth, viewportHeight);
  const shortScreenEdge =
    typeof window.screen !== 'undefined' && window.screen.width && window.screen.height
      ? Math.min(window.screen.width, window.screen.height)
      : shortViewportEdge;

  // Catches landscape phone sessions and handheld mobile browsers even when width is stretched.
  const isMobileFormFactor =
    hasPhoneUa || (hasCoarseHoverNone && Math.min(shortViewportEdge, shortScreenEdge) < 640);

  if (isMobileFormFactor) {
    return {
      isDesktopAllowed: false,
      viewportWidth,
      viewportHeight,
      isMobileFormFactor: true,
      reason: 'mobile_device',
    };
  }

  if (viewportWidth < HEAD_MIN_DESKTOP_WIDTH_PX) {
    return {
      isDesktopAllowed: false,
      viewportWidth,
      viewportHeight,
      isMobileFormFactor: false,
      reason: 'narrow_viewport',
    };
  }

  return {
    isDesktopAllowed: true,
    viewportWidth,
    viewportHeight,
    isMobileFormFactor: false,
    reason: 'supported',
  };
}

export function useHeadDesktopAccess(): HeadDesktopAccessState {
  const [state, setState] = useState<HeadDesktopAccessState>(() => evaluateHeadDesktopAccess());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      setState(evaluateHeadDesktopAccess());
    };

    handleUpdate();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(`(min-width: ${HEAD_MIN_DESKTOP_WIDTH_PX}px)`)
        : null;
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleUpdate);
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleUpdate);
      }
    };
  }, []);

  return state;
}
