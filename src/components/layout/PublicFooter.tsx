import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="w-full bg-[#F1F1F0] border-t border-[#D5D5D3] text-[#5B5B5B] mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-start pb-8 border-b border-[#D5D5D3]">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-6 space-y-2">
            <span className="font-display font-black text-lg text-[#111111] uppercase tracking-tighter block">
              Awaaz-e-Awam
            </span>
            <p className="text-xs sm:text-sm text-[#5B5B5B] max-w-md leading-relaxed">
              {language === 'ur'
                ? 'رومن اردو میں بلدیاتی شکایات درج کرنے اور ان کی پیش رفت دیکھنے کا خودکار اور شفاف پلیٹ فارم۔'
                : 'Roman Urdu complaint management platform for Sindh, Pakistan. Routing civic grievances to responsible municipal entities.'}
            </p>
          </div>

          {/* Quick Editorial Navigation */}
          <div className="md:col-span-3 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#111111] block">
              Navigation
            </span>
            <ul className="space-y-1.5 text-xs font-semibold uppercase tracking-wider">
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

          {/* Academic Capstone Details */}
          <div className="md:col-span-3 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#111111] block">
              Academic Context
            </span>
            <div className="text-xs text-[#5B5B5B] space-y-1 leading-relaxed">
              <p className="font-semibold text-[#111111]">Greenwich University, Karachi</p>
              <p>Department of Computer Science</p>
              <p className="text-[11px] text-[#5B5B5B]">BSCS Software Engineering Capstone Project (Dec 2026)</p>
            </div>
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] font-mono text-[#5B5B5B]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#111111]" />
            <span>Greenwich University • Karachi Civic Tech Prototype</span>
          </div>
          <span>100% Free Public Service • Zero Data Harvesting</span>
        </div>
      </div>
    </footer>
  );
};
