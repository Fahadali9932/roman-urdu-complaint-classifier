import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { CinematicInfoLayout } from '../components/CinematicInfoLayout';
import { contactContent } from '../content/contactContent';

export const ContactPage: React.FC = () => {
  const { language } = useLanguage();
  const documentTitle = language === 'ur' ? 'ہم سے رابطہ — آوازِ عوام' : 'Contact Us — Awaaz-e-Awam';

  return <CinematicInfoLayout content={contactContent} documentTitle={documentTitle} />;
};

export default ContactPage;
