import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="w-full bg-[#DEE1E5]/80 border-t border-[#34394A]/15 text-[#535965] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 text-start pb-10 border-b border-[#34394A]/15">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-5 space-y-3">
            <span className="font-wordmark italic font-bold text-2xl text-[#0B1421] tracking-tight block">
              Awaaz-e-Awam
            </span>
            <p className="text-xs sm:text-sm text-[#283041] max-w-sm leading-relaxed font-ui">
              {language === 'ur'
                ? 'سندھ کے شہریوں کے لیے رومن اردو میں عوامی مسائل بیان کرنے اور ان کی پیش رفت جاننے کا ڈیجیٹل پلیٹ فارم۔'
                : 'A light cinematic civic platform for Sindh citizens to articulate public-service grievances in Roman Urdu.'}
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#535965]">
              Greenwich University Karachi • Department of Computer Science
            </div>
          </div>

          {/* Quick Editorial Navigation */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#0B1421] uppercase block">
              Navigation
            </span>
            <ul className="space-y-2 text-xs font-ui font-medium">
              <li>
                <a href="#hero" className="text-[#283041] hover:text-[#0B1421] transition-colors">
                  {t('navHome') || 'Home'}
                </a>
              </li>
              <li>
                <a href="#steps" className="text-[#283041] hover:text-[#0B1421] transition-colors">
                  {language === 'ur' ? 'طریقہ کار' : 'How It Works'}
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-[#283041] hover:text-[#0B1421] transition-colors">
                  {t('navMyComplaints') || 'My Complaints'}
                </Link>
              </li>
              <li>
                <Link to="/submit" className="text-[#283041] hover:text-[#0B1421] transition-colors">
                  {t('navWriteComplaint') || 'Write Complaint'}
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-[#283041] hover:text-[#0B1421] transition-colors">
                  {t('trackTitle') || 'Track Status'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic & Prototype Note */}
          <div className="md:col-span-4 space-y-3">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#0B1421] uppercase block">
              {language === 'ur' ? 'منصوبہ بندی و تعلیمی نوٹس' : 'System Architecture'}
            </span>
            <p className="text-xs text-[#535965] leading-relaxed font-ui">
              {language === 'ur'
                ? 'یہ سسٹم رومن اردو ٹیکسٹ کی خودکار درجہ بندی کے لیے ڈیزائن کیا گیا ہے۔ تصدیق شدہ ڈیٹا ماڈل فیز ۲ میں کلاؤڈ ڈیٹا بیس سے منسلک کیا جائے گا۔'
                : 'Roman Urdu Complaint Classifier is engineered to automate civic routing. Zero dummy records are fabricated; full persistence connects in Phase 2.'}
            </p>
            <div className="inline-block px-3 py-1 rounded-md bg-[#CBD0D6]/60 border border-[#34394A]/15 text-[10px] font-mono text-[#0B1421]">
              Phase 1 • Light Cinematic Editorial
            </div>
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-[#535965]">
          <span>&copy; 2026 Awaaz-e-Awam • Final Citizen Experience</span>
          <span>{language === 'ur' ? 'تمام حقوق بحق محفوظ ہیں' : 'Designed & engineered for citizen empowerment'}</span>
        </div>
      </div>
    </footer>
  );
};