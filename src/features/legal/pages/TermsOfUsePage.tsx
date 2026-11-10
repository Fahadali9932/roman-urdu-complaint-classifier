import React, { useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { termsOfUseContent } from '../content/termsOfUseContent';

export const TermsOfUsePage: React.FC = () => {
  const { language } = useLanguage();

  useEffect(() => {
    document.title =
      language === 'ur'
        ? 'استعمال کی شرائط — آوازِ عوام'
        : 'Terms of Use — Awaaz-e-Awam';
  }, [language]);

  return <LegalPageLayout content={termsOfUseContent} />;
};

export default TermsOfUsePage;
