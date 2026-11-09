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
  const subRef = useRef<HTMLParagraphElement>(null);
  const navPanelRef = useRef<HTMLDivElement>(null);

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

      // Headline movement: starts lower (centered in dark space) and glides upward into upper position
      const tHeadline = smoother(clamp01(p / 0.75));
      const headlineY = (1 - tHeadline) * 110;
      if (headlineRef.current) {
        headlineRef.current.style.transform = `translate3d(0, ${headlineY}px, 0)`;
      }

      // Subtitle fade and subtle elevation
      const tSub = smoother(clamp01((p - 0.15) / 0.45));
      if (subRef.current) {
        subRef.current.style.opacity = `${tSub * 0.85}`;
        subRef.current.style.transform = `translate3d(0, ${(1 - tSub) * 20}px, 0)`;
      }

      // Lower navigation panel: reveals and expands upward from below, taking ~45% space
      const tNav = smoother(clamp01((p - 0.25) / 0.55));
      const navY = (1 - tNav) * 90;
      if (navPanelRef.current) {
        navPanelRef.current.style.transform = `translate3d(0, ${navY}px, 0)`;
        navPanelRef.current.style.opacity = `${tNav}`;
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

        if (Math.abs(diff) <= 0.0003) {
          currentProgressRef.current = target;
          applyMotion(target);
          rafId.current = null;
          return;
        }

        const next = current + diff * 0.18;
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

  return (
    <footer
      id="footer"
      ref={containerRef}
      className={`civic-editorial-footer ${isHome && !isMobile && !prefersReducedMotion ? 'footer-animated-track' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={ur ? 'آوازِ عوام کا اختتامیہ' : 'Awaaz-e-Awam civic footer'}
    >
      <div className={`footer-canvas ${isHome && !isMobile && !prefersReducedMotion ? 'sticky top-0 h-screen' : ''}`}>
        {/* Upper Closing Statement Scene */}
        <div className="footer-statement-section">
          <div className="footer-statement-inner">
            {/* Monumental Editorial Closing Statement (Strictly ONE line on desktop) */}
            <h2
              ref={headlineRef}
              className="footer-statement-headline font-display will-change-transform"
              style={isHome && !isMobile && !prefersReducedMotion ? { transform: 'translate3d(0, 110px, 0)' } : undefined}
            >
              {t('footerHeadline')}
            </h2>

            {/* Subtitle in Soft Paper White */}
            <p
              ref={subRef}
              className="footer-statement-sub font-ui will-change-transform"
              style={isHome && !isMobile && !prefersReducedMotion ? { opacity: 0, transform: 'translate3d(0, 20px, 0)' } : undefined}
            >
              {t('footerSubtitle')}
            </p>
          </div>
        </div>

        {/* Structured Minimal Navigation & Attribution Panel (Lower ~40-50% screen) */}
        <div
          ref={navPanelRef}
          className="footer-navigation-panel will-change-transform"
          style={isHome && !isMobile && !prefersReducedMotion ? { opacity: 0, transform: 'translate3d(0, 90px, 0)' } : undefined}
        >
          <div className="footer-navigation-inner">
            {/* Minimal Navigation Links Bar */}
            <nav className="footer-minimal-nav" aria-label={ur ? 'شہری روابط' : 'Citizen navigation'}>
              <a href="#hero" className="footer-nav-link">{ur ? 'ہمارا تعارف' : 'About Us'}</a>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <a href="#steps" className="footer-nav-link">{ur ? 'طریقہ کار' : 'How It Works'}</a>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <Link to="/dashboard" className="footer-nav-link">{ur ? 'میری شکایات' : 'My Complaints'}</Link>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <Link to="/submit" className="footer-nav-link">{ur ? 'شکایت لکھیں' : 'Write Complaint'}</Link>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <Link to="/submit" className="footer-nav-link">{ur ? 'رابطہ کریں' : 'Contact Us'}</Link>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <Link to="/terms" className="footer-nav-link">{ur ? 'رازداری کی پالیسی' : 'Privacy Policy'}</Link>
              <span className="footer-nav-dot" aria-hidden="true">•</span>
              <Link to="/terms" className="footer-nav-link">{ur ? 'استعمال کی شرائط' : 'Terms of Use'}</Link>
            </nav>

            {/* Sub-bar: Brand wordmark, academic note, copyright & back-to-top */}
            <div className="footer-sub-bar">
              <div className="footer-identity-group">
                <a
                  href="#hero"
                  onClick={scrollToTop}
                  className="font-wordmark footer-brand-wordmark"
                  lang="en"
                  dir="ltr"
                >
                  Awaaz-e-Awam
                </a>
                <span className="footer-academic-line">
                  {t('footerAcademicConcise')}
                </span>
              </div>

              <div className="footer-actions-group">
                <span className="footer-copyright">
                  © {copyrightYear} <bdi>Awaaz-e-Awam</bdi>. {ur ? 'جملہ حقوق محفوظ ہیں۔' : 'All rights reserved.'}
                </span>

                <a
                  href="#hero"
                  onClick={scrollToTop}
                  className="footer-back-to-top"
                  aria-label={ur ? 'صفحے کے آغاز پر جائیں' : 'Back to top of page'}
                >
                  <span>{ur ? 'واپس اوپر' : 'Back to top'}</span>
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
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
