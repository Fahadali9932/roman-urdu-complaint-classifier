import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { FolderOpen, PenTool } from 'lucide-react';

export const ComplaintTracker: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="py-12 sm:py-16">
      <Container size="sm">
        <div className="rounded-3xl bg-white border border-[#E5E3E0] p-6 sm:p-12 text-center space-y-5 shadow-[0_12px_36px_rgba(20,20,20,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center mx-auto text-[#681822]">
            <FolderOpen className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight uppercase">
              {language === 'ur' ? 'شکایت کی پیش رفت' : 'Complaint progress'}
            </h1>
            <p className="text-sm text-[#323232] leading-relaxed font-ui">
              {language === 'ur'
                ? 'جب شکایات بھیجنے اور محفوظ کرنے کی سہولت دستیاب ہوگی تو ان کی پیش رفت یہاں دکھائی جائے گی۔'
                : 'Progress will be shown here when complaints can be sent and saved.'}
            </p>
          </div>
          <Link to="/submit" className="inline-block">
            <Button variant="primary" size="md" leftIcon={<PenTool className="w-4 h-4 text-[#FFFFFF]" />}>
              {t('navWriteComplaint')}
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};
