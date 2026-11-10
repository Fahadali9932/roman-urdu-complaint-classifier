import React, { useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { LegalPageLayout } from '../components/LegalPageLayout';
import { privacyPolicyContent } from '../content/privacyPolicyContent';

export const PrivacyPolicyPage: React.FC = () => {
  const { language } = useLanguage();

  useEffect(() => {
    document.title =
      language === 'ur'
        ? 'رازداری کی پالیسی — آوازِ عوام'
        : 'Privacy Policy — Awaaz-e-Awam';
  }, [language]);

  return <LegalPageLayout content={privacyPolicyContent} />;
};

export default PrivacyPolicyPage;
