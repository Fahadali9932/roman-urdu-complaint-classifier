import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="w-full bg-[#F1F1F0] border-t border-[#D5D5D3] text-[#5B5B5B] mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-start pb-8 border-b border-[#D5D5D3]">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-6 space-y-2">
            <span className="font-display font-black text-lg text-[#111111] tracking-tighter block">
              Awaaz-e-Awam
            </span>
            <p className="text-xs sm:text-sm text-[#5B5B5B] max-w-md leading-relaxed">
              {language === 'ur'
                ? 'سندھ کے شہریوں کے لیے عوامی مسائل واضح الفاظ میں لکھنے کی جگہ۔'
                : 'A place for Sindh citizens to describe public issues in clear, everyday language.'}
            </p>
          </div>

          {/* Quick Editorial Navigation */}
          <div className="md:col-span-3 space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-wide text-[#111111] block">
              Navigation
            </span>
            <ul className="space-y-1.5 text-xs font-semibold tracking-wide">
              <li>
                <Link to="/" className="hover:text-[#111111] transition-colors">
                  {t('navHome')}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-[#111111] transition-colors">
                  {t('navWriteComplaint') || 'Write Complaint'}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#111111] transition-colors">
                  {t('navMyComplaints') || 'My Complaints'}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#111111] transition-colors">
                  {t('navAccount') || 'Sign In'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Plain-language note */}
          <div className="md:col-span-3 space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-wide text-[#111111] block">
              {language === 'ur' ? 'اہم بات' : 'A quick note'}
            </span>
            <div className="text-xs text-[#5B5B5B] leading-relaxed">
              <p>{language === 'ur'
                ? 'یہ ایک آزاد تعلیمی پیش منظر ہے، سرکاری ویب سائٹ نہیں۔'
                : 'This is an independent academic preview, not an official government website.'}</p>
            </div>
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] font-mono text-[#5B5B5B]">
          <span>{language === 'ur' ? 'آوازِ عوام' : 'Awaaz-e-Awam'}</span>
          <span>{language === 'ur' ? 'ابھی شکایات بھیجی یا محفوظ نہیں ہوتیں۔' : 'Complaints are not sent or saved in this preview.'}</span>
        </div>
      </div>
    </footer>
  );
};
