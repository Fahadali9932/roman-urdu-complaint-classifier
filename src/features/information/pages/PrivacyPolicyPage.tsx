import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { CinematicInfoLayout } from '../components/CinematicInfoLayout';
import { privacyContent } from '../content/privacyContent';

export const PrivacyPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const documentTitle = language === 'ur' ? 'رازداری کی پالیسی — آوازِ عوام' : 'Privacy Policy — Awaaz-e-Awam';

  return <CinematicInfoLayout content={privacyContent} documentTitle={documentTitle} />;
};

export default PrivacyPolicyPage;
