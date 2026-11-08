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
        <div className="rounded-2xl bg-[#172131]/90 backdrop-blur-md border border-[#34394A] p-8 sm:p-12 text-center space-y-5 shadow-2xl">
          <FolderOpen className="w-12 h-12 text-[#F1F2F3] mx-auto stroke-[1.5]" />
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#F1F2F3] tracking-tight">
              {language === 'ur' ? 'شکایت کی پیش رفت' : 'Complaint progress'}
            </h1>
            <p className="text-sm text-[#B5B9BC] leading-relaxed">
              {language === 'ur'
                ? 'جب شکایات بھیجنے اور محفوظ کرنے کی سہولت دستیاب ہوگی تو ان کی پیش رفت یہاں دکھائی جائے گی۔'
                : 'Progress will be shown here when complaints can be sent and saved.'}
            </p>
          </div>
          <Link to="/submit" className="inline-block">
            <Button variant="primary" size="md" leftIcon={<PenTool className="w-4 h-4" />}>
              {t('navWriteComplaint')}
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
};
