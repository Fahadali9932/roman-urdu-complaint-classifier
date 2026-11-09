import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import poster from '../../assets/civic-footer-poster.png';
import './PublicFooter.css';

const copyrightYear = new Date().getFullYear();

export const PublicFooter = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  return (
    <footer className="civic-footer" dir={isRTL ? 'rtl' : 'ltr'} aria-label={ur ? 'آوازِ عوام کے روابط' : 'Awaaz-e-Awam footer'}>
      <div className="civic-footer-art" style={{ '--poster': `url("${poster}")` } as React.CSSProperties}>
        <img src={poster} width="1672" height="941" loading="lazy" decoding="async"
          alt={ur ? 'مزارِ قائد — اپنی شکایت درج کریں، شہر کو بہتر بنائیں' : 'Mazar-e-Quaid. Urdu message: Submit your complaint, make the city better.'} />
      </div>
      <p className="civic-footer-mobile-tagline" lang="ur" dir="rtl">اپنی شکایت درج کریں، شہر کو بہتر بنائیں</p>
      <div className="civic-footer-panel"><div className="civic-footer-inner">
        <div className="civic-footer-grid">
          <div className="civic-footer-brand">
            <a href="/#hero" className="font-wordmark civic-footer-wordmark" lang="en" dir="ltr">Awaaz-e-Awam</a>
            <p>{ur ? 'اپنے شہر کے مسائل، اپنے الفاظ میں۔ بہتر شہر کی شروعات آپ کی آواز سے۔' : 'Your city. Your concerns. Your words. A better city begins with being heard.'}</p>
            <Link to="/submit" className="civic-footer-cta">{ur ? 'شکایت لکھیں' : 'Write Complaint'}<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <nav aria-label={ur ? 'شہری روابط' : 'Citizen links'}>
            <h2>{ur ? 'آپ کی آواز' : 'Your voice'}</h2>
            <ul>
              <li><a href="/#steps">{ur ? 'طریقہ کار' : 'How It Works'}</a></li>
              <li><Link to="/dashboard">{ur ? 'میری شکایات' : 'My Complaints'}</Link></li>
              <li><Link to="/track">{ur ? 'شکایت کی پیش رفت' : 'Track Complaint'}</Link></li>
            </ul>
          </nav>
          <nav aria-label={ur ? 'منصوبے کی معلومات' : 'Project information'}>
            <h2>{ur ? 'ہمارے بارے میں' : 'Get to know us'}</h2>
            <ul>
              <li><Link to="/about">{ur ? 'ہمارا تعارف' : 'About Us'}</Link></li>
              <li><Link to="/contact">{ur ? 'ہم سے رابطہ' : 'Contact Us'}</Link></li>
              <li><Link to="/privacy">{ur ? 'رازداری کی پالیسی' : 'Privacy Policy'}</Link></li>
              <li><Link to="/terms">{ur ? 'استعمال کی شرائط' : 'Terms of Use'}</Link></li>
            </ul>
          </nav>
          <div className="civic-footer-project">
            <h2>{ur ? 'ایک شہری منصوبہ' : 'A civic project'}</h2>
            <p>{ur ? 'ایک آزاد تعلیمی منصوبہ۔ یہ سرکاری ویب سائٹ نہیں ہے۔' : 'An independent academic project. This is not a government service.'}</p>
            <p className="civic-footer-attribution">{ur ? 'گرین وچ یونیورسٹی، کراچی' : 'Greenwich University, Karachi'}</p>
          </div>
        </div>
        <div className="civic-footer-bottom">
          <span>© {copyrightYear} <bdi>Awaaz-e-Awam</bdi></span>
          <span>{ur ? 'فی الحال شکایت کا جائزہ لیا جا سکتا ہے؛ شکایت بھیجی نہیں جاتی۔' : 'Currently a preview: complaints can be reviewed, but are not sent.'}</span>
          <a href="/#hero">{ur ? 'واپس اوپر' : 'Back to top'} <ArrowUp size={16} aria-hidden="true" /></a>
        </div>
      </div></div>
    </footer>
  );
};
