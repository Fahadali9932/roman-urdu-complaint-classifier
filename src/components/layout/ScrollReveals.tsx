import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Lightweight scroll-linked depth cues for ordinary pages. The homepage has its
 * own cinematic stacked-scroll scene; this only animates content below the fold
 * on the other routes. Content stays readable without JavaScript or observers.
 */
export const ScrollReveals = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const main = document.querySelector('main');
    if (!main) return;

    const observed = new Set<HTMLElement>();
    let scrollFrame: number | null = null;

    const updateParallax = () => {
      scrollFrame = null;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const narrow = window.innerWidth < 768;
      observed.forEach((element) => {
        if (!element.hasAttribute('data-scroll-depth') || !element.classList.contains('civic-reveal-visible')) return;
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) return;
        const centerDistance = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        const distance = Math.max(-1, Math.min(1, centerDistance));
        element.style.setProperty('--civic-parallax-y', `${(-distance * (narrow ? 5 : 12)).toFixed(1)}px`);
        element.style.setProperty('--civic-parallax-z', `${((1 - Math.abs(distance)) * (narrow ? 3 : 18)).toFixed(1)}px`);
        element.style.setProperty('--civic-parallax-tilt', `${(-distance * (narrow ? 0.25 : 1.0)).toFixed(2)}deg`);
      });
    };

    const requestParallax = () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(updateParallax);
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.classList.remove('civic-reveal-pending');
        element.classList.add('civic-reveal-visible');
        observer.unobserve(element);

        // When transition completes, settle to none for 100% native subpixel sharpness
        const onSettled = () => {
          element.removeEventListener('transitionend', onSettled);
          if (!element.hasAttribute('data-scroll-depth')) {
            element.classList.add('civic-reveal-settled');
          }
        };
        element.addEventListener('transitionend', onSettled);
        setTimeout(onSettled, 900);
      }
      requestParallax();
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

    const registerNew = () => {
      const targets = main.querySelectorAll<HTMLElement>(
        'h1, h2, article, section, [data-scroll-depth]'
      );
      targets.forEach((element) => {
        if (observed.has(element) || element.closest('[role="dialog"]')) return;
        observed.add(element);

        // Anything initially visible renders instantly; only content the user
        // has not reached receives the entering 3D transform.
        const bounds = element.getBoundingClientRect();
        if (bounds.top > window.innerHeight * 0.86 && bounds.bottom > 0) {
          element.classList.add('civic-reveal-pending');
          observer.observe(element);
        }
      });
    };

    registerNew();
    requestParallax();
    // Search results, FAQ category changes and async data can add new content.
    const mutationObserver = new MutationObserver(registerNew);
    mutationObserver.observe(main, { childList: true, subtree: true });
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax, { passive: true });

    const onMotionPreference = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      observer.disconnect();
      observed.forEach((element) => element.classList.remove('civic-reveal-pending'));
    };
    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motionPreference?.addEventListener?.('change', onMotionPreference);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('scroll', requestParallax);
      window.removeEventListener('resize', requestParallax);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      motionPreference?.removeEventListener?.('change', onMotionPreference);
      observed.forEach((element) => {
        element.classList.remove('civic-reveal-pending', 'civic-reveal-visible');
        element.style.removeProperty('--civic-parallax-y');
        element.style.removeProperty('--civic-parallax-z');
        element.style.removeProperty('--civic-parallax-tilt');
      });
    };
  }, [pathname]);

  return null;
};
