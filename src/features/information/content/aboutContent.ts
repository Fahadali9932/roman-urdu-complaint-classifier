import { InfoDocumentContent } from '../types';

export const aboutContent: InfoDocumentContent = {
  en: {
    title: 'ABOUT US.',
    subtitle: 'A civic complaint platform built to make reporting everyday public-service issues simpler and more accessible.',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'Contact Us',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        title: 'Our Purpose',
        paragraphs: [
          'Citizens encounter everyday public-service challenges involving electricity, gas, water supply, and sanitation. Describing these issues should not require formal bureaucratic vocabulary. Awaaz-e-Awam is designed to understand complaints written primarily in Roman Urdu, Urdu, or English and automatically categorize them for the relevant municipal service department. The broader goal is transparent communication, accessible filing, and straightforward tracking for every neighborhood.',
        ],
      },
      {
        id: 'the-team',
        title: 'The Team',
        leadCredit: {
          teamIntro: 'BUILT BY A TEAM OF FIVE.',
          name: 'Fahad Ali',
          role: 'Team Leader & Lead Developer',
          teamAcknowledgment: 'Supported by four fellow team members.',
        },
        paragraphs: [
          'Awaaz-e-Awam was developed as an academic software engineering capstone project at Greenwich University in Karachi, Pakistan. It represents an independent student initiative and is not an official service of any municipal authority.',
        ],
      },
    ],
  },
  ur: {
    title: 'ہمارا تعارف',
    subtitle: 'شہری مسائل کے اندراج کو آسان اور ہر شہری کی پہنچ میں لانے کے لیے تیار کردہ پلیٹ فارم۔',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'ہم سے رابطہ کریں',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        title: 'ہمارا مقصد',
        paragraphs: [
          'شہریوں کو بجلی، گیس، پانی اور نکاسی آب جیسے روزمرہ کے بلدیاتی مسائل کا سامنا رہتا ہے۔ ان مسائل کے اندراج کے لیے کسی پیچیدہ دفتری زبان کی ضرورت نہیں ہونی چاہیے۔ آوازِ عوام کو اس طرح تیار کیا گیا ہے کہ یہ عام بول چال کی رومن اردو، اردو یا انگریزی میں لکھی گئی شکایات کو سمجھ کر متعلقہ ادارے سے منسلک کر سکے۔ اس کا وسیع تر مقصد ہر شہری کے لیے شکایت کے اندراج اور نگرانی کے عمل کو آسان اور شفاف بنانا ہے۔',
        ],
      },
      {
        id: 'the-team',
        title: 'منصوبے کی ٹیم',
        leadCredit: {
          teamIntro: 'پانچ ارکان پر مشتمل ٹیم کی تخلیق۔',
          name: 'فہد علی (Fahad Ali)',
          role: 'ٹیم لیڈر اور لیڈ ڈویلپر',
          teamAcknowledgment: 'دیگر چار ساتھی اراکین کے اشتراک اور تعاون سے۔',
        },
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی میں تیار کردہ ایک تعلیمی سافٹ ویئر انجینئرنگ کیپسٹون پروجیکٹ ہے۔ یہ طلبہ کی ایک خود مختار کاوش ہے اور اس کا کسی سرکاری بلدیاتی ادارے سے براہِ راست الحاق نہیں ہے۔',
        ],
      },
    ],
  },
};
