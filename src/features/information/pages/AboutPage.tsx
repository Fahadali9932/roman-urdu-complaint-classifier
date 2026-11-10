import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { CinematicInfoLayout } from '../components/CinematicInfoLayout';
import { aboutContent } from '../content/aboutContent';

export const AboutPage: React.FC = () => {
  const { language } = useLanguage();
  const documentTitle = language === 'ur' ? 'ہمارا تعارف — آوازِ عوام' : 'About Us — Awaaz-e-Awam';

  return <CinematicInfoLayout content={aboutContent} documentTitle={documentTitle} />;
};

export default AboutPage;
