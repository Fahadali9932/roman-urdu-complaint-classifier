import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './PublicFooter.css';

const copyrightYear = new Date().getFullYear();

export const PublicFooter: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
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
      {/* Upper Closing Statement Scene (Objective 8) */}
      <div className="footer-statement-section">
        <div className="footer-statement-inner">

          {/* Monumental Editorial Closing Statement (Strictly ONE line on desktop) */}
          <h2 className="footer-statement-headline font-display">
            {t('footerHeadline')}
          </h2>

          {/* Subtitle in Soft Paper White */}
          <p className="footer-statement-sub font-ui">
            {t('footerSubtitle')}
          </p>

        </div>
      </div>

      {/* Structured Minimal Navigation & Attribution Panel (Objective 9) */}
      <div className="footer-navigation-panel">
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
    </footer>
  );
};

export default PublicFooter;
