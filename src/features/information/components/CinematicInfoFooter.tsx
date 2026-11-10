import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { ArrowUp } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export const CinematicInfoFooter: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  return (
    <footer
      className="relative z-10 w-full border-t border-white/10 bg-[#141414]/95 text-[#F7F6F3] py-12 sm:py-16 px-4 sm:px-8 lg:px-12 selection:bg-[#681822] selection:text-white"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={ur ? 'آوازِ عوام کا وضاحتی اختتامیہ' : 'Awaaz-e-Awam informational footer'}
    >
      <div className="max-w-[1240px] mx-auto w-full space-y-10 sm:space-y-12">
        {/* Top Grid: Brand & Purpose on Left, Navigation and Information on Right */}
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-8 sm:gap-12 items-start">
          {/* Brand & Academic Identity */}
          <div className="space-y-3 max-w-md">
            <Link
              to="/"
              className="inline-block group focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Awaaz-e-Awam Home"
            >
              <span className="font-wordmark italic font-bold tracking-tight text-2xl sm:text-3xl text-white group-hover:text-[#F7F6F3] transition-colors select-none">
                Awaaz-e-Awam
              </span>
            </Link>
            <p className="font-ui text-xs sm:text-sm text-[#A8A5A0] leading-relaxed">
              {ur
                ? 'گرین وچ یونیورسٹی، کراچی، پاکستان کے طلبہ کا ایک آزاد تعلیمی و شہری تحقیقی منصوبہ۔ رومن اردو، اردو اور انگریزی میں عوامی شکایات کا ڈیجیٹل جائزہ۔'
                : 'An independent academic civic technology initiative developed at Greenwich University, Karachi, Pakistan. Exploring natural language processing for Roman Urdu, Urdu, and English complaint formulation.'}
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <span className="block font-mono text-[11px] font-bold tracking-widest text-[#E57373] uppercase">
              {ur ? 'شہری راہنمائی' : 'NAVIGATION'}
            </span>
            <ul className="space-y-2 font-ui text-xs sm:text-[13px] text-[#D1D0CD]">
              <li>
                <Link to="/" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {t('navHome') || 'Home'}
                </Link>
              </li>
              <li>
                <Link to="/#steps" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {ur ? 'طریقہ کار' : 'How It Works'}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {t('navMyComplaints') || 'My Complaints'}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {t('navWriteComplaint') || 'Write Complaint'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Informational Document Links */}
          <div className="space-y-3">
            <span className="block font-mono text-[11px] font-bold tracking-widest text-[#E57373] uppercase">
              {ur ? 'منصوبے کی تفصیل' : 'INFORMATION'}
            </span>
            <ul className="space-y-2 font-ui text-xs sm:text-[13px] text-[#D1D0CD]">
              <li>
                <Link to="/about" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {ur ? 'ہمارا تعارف' : 'About Us'}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {ur ? 'ہم سے رابطہ' : 'Contact Us'}
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {ur ? 'رازداری کی پالیسی' : 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link to="/terms-of-use" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">
                  {ur ? 'استعمال کے ضوابط' : 'Terms of Use'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Academic Notice, and Back to top */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] font-mono text-[#8C8885]">
          <div>
            <span>© {CURRENT_YEAR} Awaaz-e-Awam</span>
            <span className="mx-2">·</span>
            <span>{ur ? 'تعلیمی و تحقیقی پیش منظر' : 'Academic Research Prototype'}</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-white hover:text-[#E57373] transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-white"
            aria-label={ur ? 'صفحے کے آغاز پر جائیں' : 'Scroll back to top'}
          >
            <span>{ur ? 'اوپر جائیں' : 'Back to top'}</span>
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
};
