import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './PublicFooter.css';

const copyrightYear = new Date().getFullYear();

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smoother = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

interface PublicFooterProps {
  isHomePage?: boolean;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ isHomePage }) => {
  const { t, language, isRTL } = useLanguage();
  const location = useLocation();
  const ur = language === 'ur';
  const isHome = isHomePage ?? (location.pathname === '/');

  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const functionalRef = useRef<HTMLDivElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  const layoutMetricsRef = useRef({
    top: 0,
    height: 0,
    vh: 900,
    scrollableDistance: 1,
  });

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const rafId = useRef<number | null>(null);

  const measureLayout = useCallback(() => {
    if (!containerRef.current) return;
    const vh = window.innerHeight;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const top = rect.top + scrollY;
    const height = containerRef.current.offsetHeight;
    const scrollableDistance = Math.max(1, height - vh);

    layoutMetricsRef.current = {
      top,
      height,
      vh,
      scrollableDistance,
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mqMotion.addEventListener('change', handleMotion);

    const mqMobile = window.matchMedia('(max-width: 1023px)');
    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqMobile.addEventListener('change', handleMobile);

    const handleResize = () => measureLayout();
    window.addEventListener('resize', handleResize, { passive: true });
    measureLayout();

    return () => {
      mqMotion.removeEventListener('change', handleMotion);
      mqMobile.removeEventListener('change', handleMobile);
      window.removeEventListener('resize', handleResize);
    };
  }, [measureLayout]);

  const applyMotion = useCallback(
    (p: number) => {
      if (prefersReducedMotion || isMobile || !isHome) return;

      // Headline motion: starts slightly lower (+44px) and glides upward smoothly into position
      const tHeadline = smoother(clamp01(p / 0.70));
      const headlineY = (1 - tHeadline) * 44;
      if (headlineRef.current) {
        headlineRef.current.style.transform = `translate3d(0, ${headlineY}px, 0)`;
      }

      // Zone B Functional Grid motion: reveals and slides up (+24px -> 0px)
      const tFunctional = smoother(clamp01((p - 0.15) / 0.60));
      const functionalY = (1 - tFunctional) * 24;
      if (functionalRef.current) {
        functionalRef.current.style.transform = `translate3d(0, ${functionalY}px, 0)`;
        functionalRef.current.style.opacity = `${tFunctional}`;
      }
    },
    [isHome, isMobile, prefersReducedMotion]
  );

  const handleScroll = useCallback(() => {
    if (prefersReducedMotion || isMobile || !isHome) return;

    const scrollY = window.scrollY;
    const { top, scrollableDistance } = layoutMetricsRef.current;
    const currentScroll = scrollY - top;
    const rawProgress = currentScroll / scrollableDistance;
    const clamped = clamp01(rawProgress);

    targetProgressRef.current = clamped;

    if (rafId.current === null) {
      const updateLoop = () => {
        const target = targetProgressRef.current;
        const current = currentProgressRef.current;
        const diff = target - current;

        if (Math.abs(diff) <= 0.0008) {
          currentProgressRef.current = target;
          applyMotion(target);
          rafId.current = null;
          return;
        }

        // Responsive tracking: 0.40 eliminates scroll lag and post-scroll drift
        const next = current + diff * 0.40;
        currentProgressRef.current = next;
        applyMotion(next);
        rafId.current = requestAnimationFrame(updateLoop);
      };

      rafId.current = requestAnimationFrame(updateLoop);
    }
  }, [applyMotion, isHome, isMobile, prefersReducedMotion]);

  useEffect(() => {
    if (!isHome || prefersReducedMotion || isMobile) return;

    measureLayout();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [handleScroll, isHome, isMobile, measureLayout, prefersReducedMotion]);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (isHome) {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <footer
      id="footer"
      ref={containerRef}
      className={`civic-editorial-footer ${isHome && !isMobile && !prefersReducedMotion ? 'footer-animated-track' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={ur ? 'آوازِ عوام کا اختتامیہ' : 'Awaaz-e-Awam civic footer'}
    >
      <div className={`footer-canvas ${isHome && !isMobile && !prefersReducedMotion ? 'sticky top-0 h-screen' : ''}`}>
        {/* Zone A: Upper Closing Statement Scene (~55-60% height) */}
        <div className="footer-zone-a">
          <div className="footer-statement-inner">
            <h2
              ref={headlineRef}
              className="footer-statement-headline font-display will-change-transform"
              style={isHome && !isMobile && !prefersReducedMotion ? { transform: 'translate3d(0, 44px, 0)' } : undefined}
            >
              {t('footerHeadline')}
            </h2>
          </div>
        </div>

        {/* Zone B: Lower Functional Footer (~40-45% height) */}
        <div
          ref={functionalRef}
          className="footer-zone-b will-change-transform"
          style={isHome && !isMobile && !prefersReducedMotion ? { opacity: 0, transform: 'translate3d(0, 24px, 0)' } : undefined}
        >
          <div className="footer-zone-b-inner">
            {/* Multi-column Editorial Grid */}
            <div className="footer-grid">
              {/* Column 1: Brand & Truthful Civic Tagline */}
              <div className="footer-col-brand">
                <a
                  href="#hero"
                  onClick={scrollToTop}
                  className="font-wordmark footer-brand-title"
                  lang="en"
                  dir="ltr"
                >
                  Awaaz-e-Awam
                </a>
                <p className="footer-brand-tagline">
                  {t('footerTagline')}
                </p>
                <div className="footer-brand-signature" aria-hidden="true" />
              </div>

              {/* Column 2: Navigation Links */}
              <div className="footer-col-links">
                <h3 className="footer-col-heading">
                  {t('footerColNav')}
                </h3>
                <nav className="footer-links-list" aria-label={ur ? 'اہم روابط' : 'Main navigation'}>
                  <a href="#hero" onClick={(e) => handleSectionClick(e, 'hero')} className="footer-link">
                    {t('footerNavHome')}
                  </a>
                  <a href="#steps" onClick={(e) => handleSectionClick(e, 'steps')} className="footer-link">
                    {t('footerNavSteps')}
                  </a>
                  <Link to="/submit" className="footer-link">
                    {t('footerNavSubmit')}
                  </Link>
                  <Link to="/dashboard" className="footer-link">
                    {t('footerNavDashboard')}
                  </Link>
                </nav>
              </div>

              {/* Column 3: Information Links */}
              <div className="footer-col-links">
                <h3 className="footer-col-heading">
                  {t('footerColInfo')}
                </h3>
                <nav className="footer-links-list" aria-label={ur ? 'معلوماتی روابط' : 'Information links'}>
                  <Link to="/about" className="footer-link">
                    {t('footerNavAbout')}
                  </Link>
                  <Link to="/contact" className="footer-link">
                    {t('footerNavContact')}
                  </Link>
                  <Link to="/privacy" className="footer-link">
                    {t('footerNavPrivacy')}
                  </Link>
                  <Link to="/terms" className="footer-link">
                    {t('footerNavTerms')}
                  </Link>
                </nav>
              </div>
            </div>

            {/* Bottom Row: Attribution, Academic Capstone & Back to top */}
            <div className="footer-bottom-bar">
              <div className="footer-copyright">
                © {copyrightYear} <bdi>Awaaz-e-Awam</bdi>. {t('footerRights')}
              </div>

              <div className="footer-academic">
                {t('footerAcademicConcise')}
              </div>

              <div className="footer-actions">
                <a
                  href="#hero"
                  onClick={scrollToTop}
                  className="footer-back-to-top"
                  aria-label={ur ? 'صفحے کے آغاز پر جائیں' : 'Back to top of page'}
                >
                  <span>{t('footerBackToTop')}</span>
                  <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
