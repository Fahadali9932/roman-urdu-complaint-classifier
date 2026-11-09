import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { PenTool, FolderOpen, ArrowRight, ArrowLeft } from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { t, language, isRTL } = useLanguage();

  return (
    <div className="w-full text-start space-y-8">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D5B995]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[#88413F] uppercase">
              {language === 'ur' ? 'شہری دستاویزات' : 'CITIZEN ARCHIVE'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#D5B995]" />
            <span className="text-[11px] font-mono text-[#5A626E]">
              Awaaz-e-Awam
            </span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#101A28] uppercase tracking-tight">
            {language === 'ur' ? 'آپ کی شکایات' : 'Your Complaints'}
          </h1>
          <p className="text-xs sm:text-sm text-[#263E59] font-ui">
            {language === 'ur'
              ? 'جب شکایات محفوظ ہوں گی تو آپ کی کیس فائلز یہاں نظر آئیں گی۔'
              : 'Your digital correspondence and case files will appear here when complaint saving is available.'}
          </p>
        </div>

        <Link to="/submit">
          <Button variant="primary" size="md" leftIcon={<PenTool className="w-4 h-4 text-[#D5B995]" />} className="w-full sm:w-auto tracking-wider text-xs">
            {t('navWriteComplaint') || 'Write Complaint'}
          </Button>
        </Link>
      </div>

      {/* Honest Digital Correspondence Empty State (Personal Letter Archive) */}
      <div className="p-8 sm:p-16 rounded-3xl bg-white border border-[#DFD9CF] text-center max-w-2xl mx-auto my-8 space-y-6 shadow-xl shadow-[#101A28]/06">
        <div className="w-20 h-20 rounded-2xl bg-[#FAF8F5] border border-[#D5B995]/60 flex items-center justify-center mx-auto text-[#88413F]">
          <FolderOpen className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-[#101A28] uppercase tracking-tight">
            {language === 'ur' ? 'ابھی کوئی شکایت نہیں۔' : 'No complaints yet.'}
          </h2>
          <p className="text-sm sm:text-base text-[#5A626E] max-w-md mx-auto leading-relaxed font-ui">
            {language === 'ur'
              ? 'یہ پیش منظر ابھی شکایات نہیں بھیجتا یا محفوظ کرتا، اس لیے یہاں کوئی کیس فائل موجود نہیں ہے۔'
              : 'This academic preview does not send or save complaints yet, so there are no case files to show.'}
          </p>
        </div>
        <div className="pt-2">
          <Link to="/submit">
            <Button variant="primary" size="lg" rightIcon={isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />} className="tracking-wider text-xs sm:text-sm px-8">
              {t('navWriteComplaint') || 'Write Complaint'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
