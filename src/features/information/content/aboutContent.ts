import { InfoDocumentContent } from '../types';

export const aboutContent: InfoDocumentContent = {
  en: {
    eyebrow: 'ACADEMIC RESEARCH INITIATIVE · AWAAZ-E-AWAM',
    title: 'ABOUT US.',
    subtitle: 'A civic technology research initiative exploring natural language processing for Roman Urdu, Urdu, and English complaint description.',
    academicNotice: 'Awaaz-e-Awam is an independent academic research initiative developed by university students at Greenwich University, Karachi. It is not an official service of the Government of Sindh or any municipal authority.',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'View Contact Information',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        number: '01',
        title: 'OUR PURPOSE',
        paragraphs: [
          'Citizens routinely encounter friction when attempting to describe everyday municipal problems through rigid, traditional government complaint forms. Awaaz-e-Awam ("The Voice of the People") explores whether natural language processing can interpret informal everyday language—particularly colloquial Roman Urdu, standard Urdu, and English—to identify municipal issues and suggest the appropriate administrative department.',
          'Our objective is to reduce communicative barriers for residents seeking civic attention, whether they are describing an overflowing sewer, broken street lamps, uncollected municipal waste, or contaminated water distribution in the words they speak daily.',
        ],
      },
      {
        id: 'the-project',
        number: '02',
        title: 'THE ACADEMIC PROJECT',
        paragraphs: [
          'Awaaz-e-Awam is an independent student research capstone and technical exploration developed at Greenwich University, Karachi, Pakistan. The initiative investigates localized text categorization, romanized script tokenization, and multi-lingual user experience design for public service interfaces.',
          'This web application is strictly an educational research demonstration. It is not owned, funded, operated, or endorsed by the Government of Sindh, the Karachi Metropolitan Corporation (KMC), or any municipal district administration.',
        ],
        callout: {
          title: 'PROTOTYPE STATUS',
          text: 'This platform functions as a frontend prototype. Complaints drafted here remain in browser memory for demonstration purposes and are not transmitted to municipal offices or government servers.',
        },
      },
      {
        id: 'what-we-are-building',
        number: '03',
        title: 'WHAT WE ARE BUILDING',
        paragraphs: [
          'The current preview provides an interactive citizen-facing workflow: bilingual language selection, structured complaint writing with real-time Roman Urdu character guidance, a 200-word editorial constraint, and simulated department classification previews.',
          'Future project phases aim to evaluate fine-tuned language models on diverse localized corpora, test automated dispatch routing algorithms, and investigate persistent tracking architectures if authorized government service integrations become available in future research phases.',
        ],
      },
    ],
  },
  ur: {
    eyebrow: 'آزاد تعلیمی و تحقیقی منصوبہ • آوازِ عوام',
    title: 'ہمارا تعارف',
    subtitle: 'ایک عوامی ٹیکنالوجی تحقیقی منصوبہ جو عوامی شکایات کو رومن اردو، اردو اور انگریزی میں بیان کرنے اور خودکار درجہ بندی کا جائزہ لیتا ہے۔',
    academicNotice: 'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد تعلیمی و تحقیقی منصوبہ ہے۔ یہ حکومتِ سندھ یا کسی سرکاری یا بلدیاتی ادارے کی سرکاری ویب سائٹ نہیں ہے۔',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'رابطے کی معلومات دیکھیں',
    otherDocumentPath: '/contact',
    sections: [
      {
        id: 'our-purpose',
        number: '۰۱',
        title: 'ہمارا مقصد',
        paragraphs: [
          'شہریوں کو روایتی بلدیاتی شکایتی فارمز پر اپنے مسائل بیان کرنے میں اکثر دشواری پیش آتی ہے۔ آوازِ عوام کا مقصد یہ دیکھنا ہے کہ کیا جدید نیچرل لینگویج پروسیسنگ (NLP) کے ذریعے عام بول چال کی زبان—خاص طور پر رومن اردو، باقاعدہ اردو اور انگریزی—سے شہری مسائل کو خودکار طور پر سمجھ کر متعلقہ بلدیاتی محکموں کو تجویز کیا جا سکتا ہے۔',
          'ہمارا مقصد ہر شہری کے لیے شکایت درج کرنے کے عمل کو آسان بنانا ہے، تاکہ وہ سیوریج، سڑکوں کی ٹوٹ پھوٹ، اسٹریٹ لائٹس یا کچرے کے مسائل کو اپنی مادری زبان میں بلا جھجھک لکھ سکیں۔',
        ],
      },
      {
        id: 'the-project',
        number: '۰۲',
        title: 'تعلیمی منصوبہ اور پس منظر',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد تحقیقی منصوبہ ہے۔ یہ منصوبہ رومنائزڈ الفاظ کی درجہ بندی، کثیر اللسانی انٹرفیس اور شہری خدمات کے جدید ڈیجیٹل حل پر تحقیق کر رہا ہے۔',
          'یہ پلیٹ فارم مکمل طور پر ایک تعلیمی اور تحقیقی پیش منظر ہے۔ اس کا حکومتِ سندھ، کے ایم سی (کراچی میٹروپولیٹن کارپوریشن) یا کسی بھی بلدیاتی ادارے سے کوئی سرکاری تعلق یا وابستگی نہیں ہے۔',
        ],
        callout: {
          title: 'پیش منظر کی عملی حیثیت',
          text: 'یہ ویب سائٹ اس وقت ایک فرنٹ اینڈ پیش منظر (پروٹوٹائپ) ہے۔ اس میں لکھی گئی شکایات صرف آزمائشی جائزے کے لیے ہیں اور کسی سرکاری محکمے کو موصول نہیں ہوتیں۔',
        },
      },
      {
        id: 'what-we-are-building',
        number: '۰۳',
        title: 'ہم کیا بنا رہے ہیں',
        paragraphs: [
          'موجودہ ورژن میں دو لسانی رہنمائی، ۲۰۰ الفاظ کی قید کے ساتھ شکایت لکھنے کا خودکار کاؤنٹر، اور متعلقہ محکمے کے فرضی تعین کا پیش منظر شامل ہے۔',
          'آئندہ کے مراحل میں مقامی زبانوں کے لیے تربیت یافتہ ماڈلز، خودکار ترسیل کے الگورتھم اور مستقبل کے باضابطہ حکومتی انضمام کی بنیاد پر مستقل ٹریکنگ سسٹم پر کام کیا جائے گا۔',
        ],
      },
    ],
  },
};
