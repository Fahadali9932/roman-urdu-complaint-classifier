import { InfoDocumentContent } from '../types';

export const contactContent: InfoDocumentContent = {
  en: {
    title: 'CONTACT US.',
    subtitle: 'How to reach the Awaaz-e-Awam project team.',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'About Us',
    otherDocumentPath: '/about',
    sections: [
      {
        id: 'project-inquiries',
        title: 'Project Inquiries',
        paragraphs: [
          'Awaaz-e-Awam is an academic student project at Greenwich University, Karachi. Faculty, evaluators, and academic reviewers can share feedback through university course channels and designated academic liaisons.',
        ],
      },
      {
        id: 'public-support',
        title: 'Public Inquiries',
        paragraphs: [
          'A public telephone helpline, commercial support desk, or active email inbox has not yet been commissioned for this prototype preview. Please do not send confidential identity documents, passwords, or urgent personal inquiries.',
        ],
      },
    ],
  },
  ur: {
    title: 'ہم سے رابطہ',
    subtitle: 'آوازِ عوام کی ٹیم سے رابطے کا طریقہ کار۔',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'ہمارا تعارف',
    otherDocumentPath: '/about',
    sections: [
      {
        id: 'project-inquiries',
        title: 'منصوبے سے رابطہ',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک تعلیمی منصوبہ ہے۔ یونیورسٹی فیکلٹی اور جائزہ کار اپنے سوالات اور تجاویز متعلقہ تعلیمی ذرائع کے ذریعے پہنچا سکتے ہیں۔',
        ],
      },
      {
        id: 'public-support',
        title: 'عوامی رابطہ',
        paragraphs: [
          'اس آزمائشی ورژن کے لیے فی الحال کوئی باضابطہ فون ہیلپ لائن یا پبلک ای میل سپورٹ فعال نہیں ہے۔ برائے مہربانی شناختی دستاویزات، پاس ورڈ یا حساس ذاتی معلومات ارسال نہ کریں۔',
        ],
      },
    ],
  },
};
