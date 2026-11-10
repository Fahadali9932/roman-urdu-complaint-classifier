import { InfoDocumentContent } from '../types';

export const aboutContent: InfoDocumentContent = {
  en: {
    title: 'ABOUT US.',
    subtitle: 'A student-built platform exploring a simpler way for citizens to report public-service concerns.',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'Contact Us',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        title: 'Our Purpose',
        paragraphs: [
          'Citizens often face difficulties when trying to describe municipal issues through complex forms. Awaaz-e-Awam explores how natural everyday language—whether Roman Urdu, Urdu, or English—can make expressing civic concerns simpler, faster, and accessible to everyone.',
        ],
      },
      {
        id: 'the-team',
        title: 'The Team',
        paragraphs: [
          'Awaaz-e-Awam was created by university students as a software engineering capstone project at Greenwich University in Karachi, Pakistan. It is an independent academic research initiative and is not an official service of the Government of Sindh or any municipal authority.',
        ],
      },
    ],
  },
  ur: {
    title: 'ہمارا تعارف',
    subtitle: 'شہری مسائل کو آسان اور عام فہم انداز میں بیان کرنے کے لیے طلبہ کا بنایا گیا ایک تحقیقی پلیٹ فارم۔',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'ہم سے رابطہ کریں',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        title: 'ہمارا مقصد',
        paragraphs: [
          'شہریوں کو روایتی پیچیدہ فارمز کے ذریعے بلدیاتی مسائل بیان کرنے میں اکثر دشواری پیش آتی ہے۔ آوازِ عوام کا مقصد عام بول چال کی زبان—چاہے وہ رومن اردو ہو، اردو ہو یا انگریزی—کے ذریعے شکایات کو آسان، تیز رفتار اور ہر ایک کی پہنچ میں بنانا ہے۔',
        ],
      },
      {
        id: 'the-team',
        title: 'منصوبے کی ٹیم',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ نے سافٹ ویئر انجینئرنگ کے فائنل ایئر پروجیکٹ کے طور پر تیار کیا ہے۔ یہ طلبہ کا ایک آزاد تعلیمی منصوبہ ہے اور اس کا حکومتِ سندھ یا کسی بلدیاتی ادارے سے کوئی سرکاری تعلق نہیں ہے۔',
        ],
      },
    ],
  },
};
