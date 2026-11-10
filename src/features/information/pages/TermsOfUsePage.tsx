import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { CinematicInfoLayout } from '../components/CinematicInfoLayout';
import { termsContent } from '../content/termsContent';

export const TermsOfUsePage: React.FC = () => {
  const { language } = useLanguage();
  const documentTitle = language === 'ur' ? 'استعمال کے ضوابط — آوازِ عوام' : 'Terms of Use — Awaaz-e-Awam';

  return <CinematicInfoLayout content={termsContent} documentTitle={documentTitle} />;
};

export default TermsOfUsePage;
