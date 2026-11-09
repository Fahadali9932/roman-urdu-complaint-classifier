import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, PenTool } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SindhGeometricRule } from '../common/SindhGeometricRule';
import './PublicFooter.css';

const copyrightYear = new Date().getFullYear();

export const PublicFooter: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  return (
    <footer
      className="civic-editorial-footer"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={ur ? 'آوازِ عوام کا اختتامیہ' : 'Awaaz-e-Awam civic footer'}
    >
      {/* Background Architectural & Heritage Canvas (No cutout posters, pure vector/CSS) */}
      <div className="footer-canvas-overlay" aria-hidden="true">
        {/* Subtle architectural silhouette engraving etched into the deep ground */}
        <svg
          viewBox="0 0 1440 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="footer-architectural-etching"
          preserveAspectRatio="none"
        >
          {/* Subtle architectural arches and geometric lines */}
          <path
            d="M0 280 L0 220 L120 220 L120 180 L200 180 L200 220 L340 220 L340 160 Q400 110 460 160 L460 220 L620 220 L620 140 Q720 70 820 140 L820 220 L980 220 L980 160 Q1040 110 1100 160 L1100 220 L1240 220 L1240 180 L1320 180 L1320 220 L1440 220 L1440 280 Z"
            fill="#1A0B0E"
            opacity="0.35"
          />
          <path
            d="M620 220 L620 140 Q720 70 820 140 L820 220"
            stroke="#D5B995"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.22"
          />
          <line x1="0" y1="220" x2="1440" y2="220" stroke="#D5B995" strokeWidth="0.8" opacity="0.18" />
        </svg>
      </div>

      {/* Main Closing Editorial Viewport (~65% of desktop height) */}
      <div className="footer-statement-section">
        <div className="footer-statement-inner">
          {/* Section Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D5B995]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#D5B995]">
              {ur ? 'شہری شرکت • آوازِ عوام' : 'CIVIC PARTICIPATION • AWAAZ-E-AWAM'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#D5B995]" />
          </div>

          {/* Commanding Editorial Closing Statement */}
          <h2 className="footer-statement-headline font-display">
            {ur ? (
              <>
                ایک بہتر شہر کا آغاز<br />
                آپ کی آواز سے ہوتا ہے۔
              </>
            ) : (
              <>
                A BETTER CITY BEGINS<br />
                WITH YOUR VOICE.
              </>
            )}
          </h2>

          {/* Subtitle in Warm Limestone */}
          <p className="footer-statement-sub">
            {ur
              ? 'اپنے محلے اور شہر کے مسائل کو اپنے الفاظ میں بیان کریں تاکہ وہ متعلقہ محکموں تک پہنچ سکیں۔'
              : 'Express your local civic concerns in your own words so they can be heard and resolved.'}
          </p>

          {/* Restrained Architectural Sindh Geometric Rule */}
          <div className="w-56 sm:w-72 mx-auto my-5 opacity-75">
            <SindhGeometricRule variant="dark" />
          </div>

          {/* Editorial Call to Action */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link to="/submit" className="footer-cta-primary">
              <PenTool className="w-4 h-4 text-[#D5B995]" />
              <span>{ur ? 'شکایت درج کریں' : 'Write Complaint'}</span>
              <ArrowUpRight className="w-4 h-4 opacity-75" />
            </Link>
            <Link to="/dashboard" className="footer-cta-secondary">
              <span>{ur ? 'شکایات کی فائلیں' : 'My Complaints'}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Structured Editorial Navigation & Academic Identification */}
      <div className="footer-navigation-panel">
        <div className="footer-navigation-inner">
          <div className="footer-navigation-grid">
            {/* Col 1: Identity & Academic Attribution */}
            <div className="footer-col-brand">
              <a
                href="#hero"
                onClick={scrollToTop}
                className="font-wordmark footer-brand-wordmark"
                lang="en"
                dir="ltr"
              >
                Awaaz-e-Awam
              </a>
              <p className="footer-brand-mission">
                {ur
                  ? 'رومن اردو، اردو اور انگریزی میں عوامی شکایات کے اندراج اور درجہ بندی کا خودکار شہری نظام۔'
                  : 'An intelligent civic system for Roman Urdu, Urdu and English complaint submission and routing.'}
              </p>
              <div className="footer-academic-badge">
                <span className="footer-academic-label font-mono">
                  {ur ? 'تحقیقی و تعلیمی منصوبہ' : 'ACADEMIC PROJECT'}
                </span>
                <span className="footer-academic-inst">
                  {ur ? 'گرین وچ یونیورسٹی، کراچی' : 'Greenwich University, Karachi'}
                </span>
              </div>
            </div>

            {/* Col 2: Citizen Actions */}
            <nav className="footer-col-nav" aria-label={ur ? 'شہری روابط' : 'Citizen links'}>
              <h3 className="footer-col-title font-mono">{ur ? 'آپ کی آواز' : 'YOUR VOICE'}</h3>
              <ul className="footer-links-list">
                <li><Link to="/submit">{ur ? 'شکایت لکھیں' : 'Write Complaint'}</Link></li>
                <li><a href="#steps">{ur ? 'طریقہ کار' : 'How It Works'}</a></li>
                <li><Link to="/dashboard">{ur ? 'میری شکایات' : 'My Complaints'}</Link></li>
                <li><Link to="/track">{ur ? 'شکایت کی پیش رفت' : 'Track Complaint'}</Link></li>
              </ul>
            </nav>

            {/* Col 3: Information & Institutional Pages */}
            <nav className="footer-col-nav" aria-label={ur ? 'منصوبے کی معلومات' : 'Project information'}>
              <h3 className="footer-col-title font-mono">{ur ? 'معلومات' : 'INFORMATION'}</h3>
              <ul className="footer-links-list">
                <li><Link to="/about">{ur ? 'ہمارا تعارف' : 'About Us'}</Link></li>
                <li><Link to="/privacy">{ur ? 'رازداری کی پالیسی' : 'Privacy Policy'}</Link></li>
                <li><Link to="/terms">{ur ? 'استعمال کی شرائط' : 'Terms of Use'}</Link></li>
                <li><Link to="/contact">{ur ? 'ہم سے رابطہ' : 'Contact Us'}</Link></li>
              </ul>
            </nav>

            {/* Col 4: Platform Transparency Note */}
            <div className="footer-col-transparency">
              <h3 className="footer-col-title font-mono">{ur ? 'شفافیت کی یادداشت' : 'PREVIEW NOTICE'}</h3>
              <p className="footer-transparency-note">
                {ur
                  ? 'یہ گرین وچ یونیورسٹی، کراچی کے لیے ایک آزاد تعلیمی منصوبہ ہے۔ یہ سرکاری ویب سائٹ نہیں ہے اور نہ ہی سرکاری محکموں کی براہ راست نمائندگی کرتی ہے۔'
                  : 'An independent academic project for Greenwich University, Karachi. This is not an official government service.'}
              </p>
              <p className="footer-transparency-sub">
                {ur
                  ? 'موجودہ پیش منظر میں شکایات براؤزر میں جانچی جاتی ہیں۔ حقیقی ترسیل اگلی مرحلہ وار ترقی میں شامل کی جائے گی۔'
                  : 'Currently an exploratory preview: complaints are validated locally and are not yet forwarded to departments.'}
              </p>
            </div>

          </div>

          {/* Bottom Bar: Copyright, Back to Top, System Status */}
          <div className="footer-sub-bar">
            <span className="footer-copyright">
              © {copyrightYear} <bdi>Awaaz-e-Awam</bdi> — {ur ? 'جملہ حقوق محفوظ ہیں۔' : 'All rights reserved.'}
            </span>
            <span className="footer-status-tag">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-1.5" />
              {ur ? 'تعلیمی پیش منظر' : 'Academic Prototype Preview'}
            </span>
            <a
              href="#hero"
              onClick={scrollToTop}
              className="footer-back-to-top"
              aria-label={ur ? 'صفحے کے آغاز پر جائیں' : 'Back to top of page'}
            >
              <span>{ur ? 'واپس اوپر' : 'Back to top'}</span>
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};
