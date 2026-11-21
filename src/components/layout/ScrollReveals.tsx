import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * One-time entrances for below-the-fold content on ordinary pages.
 * Static reading surfaces must not retain parallax transforms: they soften
 * body copy and force unnecessary compositing after motion has finished.
 * The homepage's separate stacked-scroll system provides continuous 3D motion.
 */
export const ScrollReveals = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const main = document.querySelector('main');
    if (!main) return;

    const observed = new Set<HTMLElement>();
    const settleTimers = new Set<ReturnType<typeof setTimeout>>();

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.classList.remove('civic-reveal-pending');
        element.classList.add('civic-reveal-visible');
        observer.unobserve(element);

        // Even depth cards become genuinely untransformed once visible.
        const timer = setTimeout(() => {
          element.classList.add('civic-reveal-settled');
          settleTimers.delete(timer);
        }, 850);
        settleTimers.add(timer);
      }
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
    // Search results, FAQ category changes and async data can add new content.
    const mutationObserver = new MutationObserver(registerNew);
    mutationObserver.observe(main, { childList: true, subtree: true });

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
      settleTimers.forEach(clearTimeout);
      motionPreference?.removeEventListener?.('change', onMotionPreference);
      observed.forEach((element) => {
        element.classList.remove('civic-reveal-pending', 'civic-reveal-visible');
        element.classList.remove('civic-reveal-settled');
      });
    };
  }, [pathname]);

  return null;
};
