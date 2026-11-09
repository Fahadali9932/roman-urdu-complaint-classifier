import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, PenTool } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
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
      {/* Upper Closing Statement Scene */}
      <div className="footer-statement-section">
        <div className="footer-statement-inner">

          {/* Eyebrow tag */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#681822]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#E5E3E0]">
              {ur ? 'شہری شمولیت • آوازِ عوام' : 'CIVIC INITIATIVE • AWAAZ-E-AWAM'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#681822]" />
          </div>

          {/* Monumental Editorial Closing Statement */}
          <h2 className="footer-statement-headline font-display">
            {ur ? (
              <>
                آپ کی آواز<br />
                اہم ہے۔
              </>
            ) : (
              <>
                YOUR VOICE<br />
                MATTERS.
              </>
            )}
          </h2>

          {/* Subtitle in Soft Paper White */}
          <p className="footer-statement-sub">
            {ur
              ? 'اپنے محلے اور شہر کے عوامی مسائل کو اپنے روزمرہ الفاظ میں درج کریں تاکہ متعلقہ ادارے کارروائی کر سکیں۔'
              : 'Report municipal, infrastructure, and utility challenges in your own words so responsible authorities can act.'}
          </p>

          {/* Editorial Call to Action */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Link to="/submit" className="footer-cta-primary">
              <PenTool className="w-4 h-4 text-[#FFFFFF]" />
              <span>{ur ? 'شکایت درج کریں' : 'Write Complaint'}</span>
              <ArrowUpRight className="w-4 h-4 opacity-75" />
            </Link>
            <Link to="/dashboard" className="footer-cta-secondary">
              <span>{ur ? 'میری شکایات' : 'My Complaints'}</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Structured Minimal Navigation Panel */}
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
                  ? 'رومن اردو، اردو اور انگریزی میں عوامی شکایات کے اندراج اور خودکار درجہ بندی کا آزاد شہری نظام۔'
                  : 'An independent civic system for public-service grievance classification and routing in Sindh.'}
              </p>
              <div className="footer-academic-badge">
                <span className="footer-academic-label font-mono">
                  {ur ? 'تعلیمی منصوبہ' : 'ACADEMIC PROJECT'}
                </span>
                <span className="footer-academic-inst">
                  {ur ? 'گرین وچ یونیورسٹی، کراچی' : 'Greenwich University, Karachi'}
                </span>
              </div>
            </div>

            {/* Col 2: Citizen Actions */}
            <nav className="footer-col-nav" aria-label={ur ? 'شہری روابط' : 'Citizen navigation'}>
              <h3 className="footer-col-title font-mono">{ur ? 'شہری خدمات' : 'CITIZEN'}</h3>
              <ul className="footer-links-list">
                <li><Link to="/submit">{ur ? 'شکایت لکھیں' : 'Write Complaint'}</Link></li>
                <li><a href="#steps">{ur ? 'طریقہ کار' : 'How It Works'}</a></li>
                <li><Link to="/dashboard">{ur ? 'میری شکایات' : 'My Complaints'}</Link></li>
                <li><Link to="/track">{ur ? 'ٹریکنگ' : 'Track Complaint'}</Link></li>
              </ul>
            </nav>

            {/* Col 3: Information & Links */}
            <nav className="footer-col-nav" aria-label={ur ? 'معلومات' : 'Information links'}>
              <h3 className="footer-col-title font-mono">{ur ? 'معلومات' : 'PLATFORM'}</h3>
              <ul className="footer-links-list">
                <li><a href="#hero">{ur ? 'ہمارا تعارف' : 'About Us'}</a></li>
                <li><Link to="/submit">{ur ? 'رابطہ کریں' : 'Contact Us'}</Link></li>
                <li><Link to="/terms">{ur ? 'رازداری کی پالیسی' : 'Privacy Policy'}</Link></li>
                <li><Link to="/terms">{ur ? 'استعمال کی شرائط' : 'Terms of Use'}</Link></li>
              </ul>
            </nav>

            {/* Col 4: Platform Transparency Note */}
            <div className="footer-col-transparency">
              <h3 className="footer-col-title font-mono">{ur ? 'شفافیت' : 'TRANSPARENCY'}</h3>
              <p className="footer-transparency-note">
                {ur
                  ? 'یہ گرین وچ یونیورسٹی، کراچی کے شعبہ کمپیوٹر سائنس کا ایک آزاد تعلیمی منصوبہ ہے۔ یہ سرکاری ویب سائٹ نہیں ہے۔'
                  : 'An independent academic initiative at Greenwich University, Karachi. Not an official government agency.'}
              </p>
              <p className="footer-transparency-sub">
                {ur
                  ? 'عوامی شکایات کا تجزیہ اور درجہ بندی جدید قدرتی زبان کے ماڈلز کے ذریعے کی جاتی ہے۔'
                  : 'Public complaints are evaluated and categorized through natural language processing algorithms.'}
              </p>
            </div>

          </div>

          {/* Bottom Bar: Copyright, Back to Top */}
          <div className="footer-sub-bar">
            <span className="footer-copyright">
              © {copyrightYear} <bdi>Awaaz-e-Awam</bdi> — {ur ? 'جملہ حقوق محفوظ ہیں۔' : 'All rights reserved.'}
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
