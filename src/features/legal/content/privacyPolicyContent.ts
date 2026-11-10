import { LegalDocumentContent } from '../types';

export const privacyPolicyContent: LegalDocumentContent = {
  en: {
    title: 'Privacy Policy',
    eyebrow: 'ACADEMIC PROJECT DISCLOSURE · AWAAZ-E-AWAM',
    subtitle:
      'This policy describes how information is handled within the current Awaaz-e-Awam prototype. As an academic research project, we provide full transparency regarding data collection, browser storage, and operational limitations.',
    effectiveDate: 'Effective date: November 2026 · Academic Prototype Preview',
    academicNotice:
      'Awaaz-e-Awam is an independent university research initiative developed at Greenwich University, Karachi. It is not an official service of the Government of Sindh or any municipal authority.',
    tableOfContentsLabel: 'ON THIS PAGE',
    returnHomeLabel: 'Return to Homepage',
    otherDocumentLabel: 'Related Document',
    otherDocumentTitle: 'Read Terms of Use',
    otherDocumentPath: '/terms-of-use',
    sections: [
      {
        id: 'about-platform',
        number: '01',
        title: 'About Awaaz-e-Awam & Prototype Scope',
        paragraphs: [
          'Awaaz-e-Awam ("The Voice of the People") is an independent academic project created by university students at Greenwich University, Karachi, Pakistan. The project explores natural language processing and complaint classification for civic issues written in Roman Urdu, Urdu, and English.',
          'This web application is currently a frontend prototype and demonstration environment. It allows citizens and evaluators to test the user interface, typography, localized drafting experience, and sample workflows. It is not an official municipal dispatch system or government grievance portal.',
        ],
        callout: {
          title: 'Prototype Operating Status',
          text: 'This website is not connected to municipal government servers or department complaint desks. Submitting a complaint in this preview does not transmit your issue to any civic agency.',
        },
      },
      {
        id: 'information-you-enter',
        number: '02',
        title: 'Information You Enter in Forms',
        paragraphs: [
          'When testing the citizen complaint drafting workspace, the interface provides fields for entering information relevant to describing a public service problem:',
        ],
        bulletPoints: [
          'Citizen Contact Information: Full name and Pakistani telephone number (e.g., 03XXXXXXXXX).',
          'Geographic Location: Selected Karachi administrative district (e.g., District East, South, Central, West, Korangi, Malir, Keamari), locality or block, landmark, and private street address.',
          'Civic Issue Description: Complaint subject line and everyday description in Roman Urdu, Urdu, or English (limited to a maximum of 200 words).',
          'Demo Registration & Login: The sign-in and registration forms display email and password fields for visual evaluation.',
        ],
      },
      {
        id: 'how-information-is-processed',
        number: '03',
        title: 'How Information Is Processed',
        paragraphs: [
          'Information entered into the complaint form is processed entirely inside your local web browser. When you select "Submit Complaint", the application checks that mandatory fields are filled, validates phone number formatting, and verifies that the description does not exceed the 200-word limit.',
          'Upon successful validation, the browser displays a confirmation modal showing a review summary. No data packet is transmitted over the internet to a server, API, or external machine learning service. Once the modal is dismissed or the page is refreshed, form entries exist only in temporary component memory.',
          'The sign-in and registration screens similarly operate as client-side interface simulations. Entering an email address and password does not create a server account or initiate an authentication session.',
        ],
      },
      {
        id: 'storage-and-retention',
        number: '04',
        title: 'Storage and Data Retention',
        paragraphs: [
          'The current application does not connect to an active database. No complaint records, citizen profiles, passwords, or personal telephone numbers are saved to server-side hard drives, cloud databases, or persistent files.',
          'Because no personal complaint data is stored on our servers, there is no automated data retention schedule or automatic purge window currently in effect. Navigating away from the writing form or refreshing your browser clears all entered form fields from memory.',
        ],
        callout: {
          title: 'Future Development Notice',
          text: 'When future backend phases introduce persistent database storage and secure account management, a formal data retention and deletion schedule will be established and published here prior to public launch.',
        },
      },
      {
        id: 'access-controls',
        number: '05',
        title: 'Access to Information',
        paragraphs: [
          'Because complaint information is neither stored on a server nor broadcast across a network, no third parties, other users, or government officials have access to the text you type into the prototype.',
          'Any reference numbers (e.g., KHI-2026-XXXX) or sample case files visible in the citizen dashboard or timeline components are static mock records designed to illustrate intended tracking functionality.',
        ],
      },
      {
        id: 'third-party-services',
        number: '06',
        title: 'Third-Party Services and Network Requests',
        paragraphs: [
          'We maintain a minimal technical footprint. The application does not embed commercial advertising networks, social media tracking pixels, or third-party behavioral analytics suites (such as Google Analytics or Meta Pixel).',
          'The single external technical asset loaded by the website is Google Fonts (fonts.googleapis.com and fonts.gstatic.com), used to render our typography families (Archivo, Outfit, Playfair Display, and Inter). When your browser downloads these font files, it makes a standard HTTP request to Google’s Content Delivery Network, transmitting your device’s IP address and user-agent string as required by standard internet architecture.',
        ],
      },
      {
        id: 'cookies-local-storage',
        number: '07',
        title: 'Cookies and Browser LocalStorage',
        paragraphs: [
          'The website does not set tracking, profiling, or advertising cookies on your computer.',
          'The application uses your browser’s local storage (localStorage) for a single specific configuration key:',
        ],
        bulletPoints: [
          'preferred_language: Stores your selected interface language ("en" for English or "ur" for Urdu) so your preference is remembered on subsequent visits.',
        ],
      },
      {
        id: 'security-limitations',
        number: '08',
        title: 'Security and Safe Testing Practices',
        paragraphs: [
          'The frontend implements defensive programming practices including input sanitization, form validation, and content length restrictions. However, because this is an educational prototype and not a hardened production government facility, we ask all evaluators and citizens to observe safe testing practices.',
          'Do not enter real Computerized National Identity Card (CNIC) numbers, banking details, sensitive medical records, passwords, or confidential government documents into any form on this website.',
        ],
      },
      {
        id: 'data-inquiries',
        number: '09',
        title: 'Data Inquiries and Contact Information',
        paragraphs: [
          'Because the prototype does not store personal records or user accounts on a server, there is no database from which to search, export, or delete personal data upon request.',
          'A dedicated public telephone helpline or dedicated privacy support inbox has not yet been established for this student project. Evaluators participating in university coursework or demonstration sessions may direct questions to the student development team through Greenwich University academic supervision channels.',
        ],
      },
      {
        id: 'policy-updates',
        number: '10',
        title: 'Updates to This Privacy Policy',
        paragraphs: [
          'This Privacy Policy reflects the verified technical capabilities and operational posture of the Awaaz-e-Awam web application as of November 2026.',
          'If and when backend database storage, live Roman Urdu ML classification APIs, or departmental routing mechanisms are connected in subsequent project phases, this policy will be thoroughly updated to explain the new data flows and citizen protections before any public deployment.',
        ],
      },
    ],
  },
  ur: {
    title: 'رازداری کی پالیسی',
    eyebrow: 'تعلیمی منصوبے کی وضاحتی رپورٹ • آوازِ عوام',
    subtitle:
      'یہ پالیسی واضح کرتی ہے کہ آوازِ عوام کے موجودہ پیش منظر (پروٹوٹائپ) میں معلومات کے ساتھ کیا برتاؤ کیا جاتا ہے۔ ایک آزاد تعلیمی منصوبے کے طور پر، ہم ڈیٹا کے اندراج، براؤزر اسٹوریج اور تکنیکی حدود کی مکمل اور سچی تفصیل فراہم کرتے ہیں۔',
    effectiveDate: 'نفاذ کی تاریخ: نومبر ۲۰۲۶ء • تعلیمی پیش منظر',
    academicNotice:
      'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد تعلیمی و تحقیقی منصوبہ ہے۔ یہ حکومتِ سندھ یا کسی سرکاری یا بلدیاتی ادارے کی سرکاری ویب سائٹ نہیں ہے۔',
    tableOfContentsLabel: 'اس صفحے پر',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentLabel: 'متعلقہ دستاویز',
    otherDocumentTitle: 'استعمال کی شرائط پڑھیں',
    otherDocumentPath: '/terms-of-use',
    sections: [
      {
        id: 'about-platform',
        number: '۰۱',
        title: 'منصوبے کا تعارف اور دائرہ کار',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی، پاکستان کے طلبہ کا ایک آزاد تعلیمی منصوبہ ہے۔ اس منصوبے کا مقصد عوامی مسائل کے لیے رومن اردو، اردو اور انگریزی زبان میں تحریری شکایات کی خودکار درجہ بندی اور متعلقہ محکموں کی نشاندہی پر تحقیق کرنا ہے۔',
          'یہ ویب سائٹ فی الوقت صرف ایک فرنٹ اینڈ پیش منظر (پروٹوٹائپ) اور نمائشی پلیٹ فارم ہے۔ اس کا مقصد شہریوں اور جائزہ کاروں کو انٹرفیس، خطاطی اور شکایات لکھنے کا طریقہ کار دکھانا ہے۔ یہ سرکاری محکموں کا براہِ راست شکایتی پورٹل نہیں ہے۔',
        ],
        callout: {
          title: 'پیش منظر کی عملی حیثیت',
          text: 'یہ ویب سائٹ بلدیاتی یا حکومتی سرورز سے منسلک نہیں ہے۔ اس پیش منظر میں شکایت درج کرنے سے وہ کسی سرکاری محکمے کو موصول نہیں ہوتی۔',
        },
      },
      {
        id: 'information-you-enter',
        number: '۰۲',
        title: 'وہ معلومات جو آپ فارم میں درج کرتے ہیں',
        paragraphs: [
          'شہری شکایت لکھنے کے خانے میں عوامی مسئلہ بیان کرنے کے لیے درج ذیل معلومات کے اندراج کی سہولت دی گئی ہے:',
        ],
        bulletPoints: [
          'شہری کے رابطے کی تفصیل: پورا نام اور پاکستانی موبائل فون نمبر (مثلاً 03XXXXXXXXX)۔',
          'جغرافیائی مقام: کراچی کا انتظامی ضلع (مثلاً ضلع شرقی، جنوبی، وسطی، غربی، کورنگی، ملیر، کیماڑی)، علاقہ، بلاک، قریبی نشانی اور رہائشی پتہ۔',
          'عوامی مسئلے کی تفصیل: شکایت کا عنوان اور روزمرہ کی زبان (رومن اردو، اردو یا انگریزی) میں مسئلے کی تفصیل (زیادہ سے زیادہ ۲۰۰ الفاظ تک)۔',
          'اکاؤنٹ اور لاگ ان فارم: ای میل اور پاس ورڈ کے خانے محض انٹرفیس کے جائزے کے لیے موجود ہیں۔',
        ],
      },
      {
        id: 'how-information-is-processed',
        number: '۰۳',
        title: 'معلومات کی جانچ اور پراسیسنگ کا طریقہ',
        paragraphs: [
          'شکایت کے فارم میں درج کردہ معلومات صرف آپ کے اپنے براؤزر کے اندر ہی جانچی جاتی ہیں۔ جب آپ "شکایت جمع کرائیں" کا بٹن دباتے ہیں تو ایپلیکیشن صرف یہ چیک کرتی ہے کہ ضروری خانے بھرے ہوئے ہیں، فون نمبر کا فارمیٹ درست ہے، اور الفاظ کی تعداد ۲۰۰ سے زیادہ نہیں ہے۔',
          'معلومات درست ہونے پر براؤزر میں ایک تصدیقی کھڑکی (ماڈل) کھلتی ہے جس میں درج شدہ تفصیلات کا جائزہ دکھایا جاتا ہے۔ کوئی بھی ڈیٹا انٹرنیٹ کے ذریعے کسی بیرونی سرور، ڈیٹا بیس یا مشین لرننگ سروس کو نہیں بھیجا جاتا۔ کھڑکی بند کرنے یا صفحہ ریفریش کرنے سے یہ معلومات ختم ہو جاتی ہیں۔',
          'اسی طرح لاگ ان اور رجسٹریشن کے اسکرینز محض فرنٹ اینڈ ڈیزائن کا حصہ ہیں؛ ان میں معلومات درج کرنے سے سرور پر کوئی حقیقی اکاؤنٹ نہیں بنتا۔',
        ],
      },
      {
        id: 'storage-and-retention',
        number: '۰۴',
        title: 'ڈیٹا کا ذخیرہ اور برقراری کی مدت',
        paragraphs: [
          'موجودہ ایپلیکیشن سے کوئی ڈیٹا بیس منسلک نہیں ہے۔ شہریوں کا نام، موبائل نمبر، شکایات یا پاس ورڈز کسی بھی سرور، کلاؤڈ یا ہارڈ ڈرائیو پر محفوظ نہیں کیے جاتے۔',
          'چونکہ سرور پر کوئی ذاتی ریکارڈ محفوظ ہی نہیں ہوتا، اس لیے ڈیٹا برقرار رکھنے یا خودکار طور پر مٹانے کی کوئی مصنوعی مدت لاگو نہیں ہوتی۔ براؤزر بند کرنے یا فارم ری سیٹ کرنے پر تمام درج شدہ مواد فوری ختم ہو جاتا ہے۔',
        ],
        callout: {
          title: 'مستقبل کی ترقیاتی اطلاع',
          text: 'جب مستقبل کے مراحل میں ڈیٹا بیس اور مستند صارف اکاؤنٹس شامل کیے جائیں گے تو عوامی لانچ سے قبل ڈیٹا کی حفاظت اور حذف کرنے کی باقاعدہ پالیسی یہاں شائع کی جائے گی۔',
        },
      },
      {
        id: 'access-controls',
        number: '۰۵',
        title: 'معلومات تک رسائی کا نظام',
        paragraphs: [
          'چونکہ شکایات کی معلومات کسی سرور پر محفوظ نہیں ہوتیں اور نہ ہی نیٹ ورک پر بھیجی جاتی ہیں، اس لیے کوئی تیسرا فریق، دوسرا شہری یا سرکاری اہلکار آپ کی لکھی ہوئی تفصیلات نہیں دیکھ سکتا۔',
          'شہری ڈیش بورڈ یا ٹائم لائن میں نظر آنے والے کیس نمبرز (مثلاً KHI-2026-XXXX) محض نمونے کے فرضی ریکارڈز ہیں جو ٹریکنگ کا ممکنہ طریقہ کار سمجھانے کے لیے بنائے گئے ہیں۔',
        ],
      },
      {
        id: 'third-party-services',
        number: '۰۶',
        title: 'تیسرے فریق کی خدمات اور نیٹ ورک کا رابطہ',
        paragraphs: [
          'ہم غیر ضروری بیرونی سروسز سے مکمل پرہیز کرتے ہیں۔ اس ویب سائٹ پر کوئی کمرشل اشتہارات، سوشل میڈیا ٹریکنگ پکسلز، یا بیرونی تجزیاتی ٹولز (جیسے گوگل اینالیٹکس یا میٹا پکسل) نصب نہیں ہیں۔',
          'ویب سائٹ پر صرف ایک بیرونی تکنیکی سروس استعمال ہوتی ہے اور وہ ہے گوگل فونٹس (Google Fonts)، جس کے ذریعے خوبصورت خطاطی (Archivo, Outfit, Playfair Display, Inter) لوڈ ہوتی ہے۔ فونٹ فائلز ڈاؤن لوڈ کرتے وقت براؤزر گوگل کے سی ڈی این نیٹ ورک کو ایک روایتی ایچ ٹی ٹی پی درخواست بھیجتا ہے جس میں صارف کا آئی پی ایڈریس شامل ہوتا ہے۔',
        ],
      },
      {
        id: 'cookies-local-storage',
        number: '۰۷',
        title: 'کوکیز اور براؤزر کی لوکل اسٹوریج',
        paragraphs: [
          'یہ ویب سائٹ آپ کے کمپیوٹر پر کوئی اشتہاری یا ٹریکنگ کوکیز سیٹ نہیں کرتی۔',
          'ایپلیکیشن آپ کے براؤزر کی لوکل اسٹوریج (localStorage) میں صرف ایک ترجیحی سیٹنگ محفوظ کرتی ہے:',
        ],
        bulletPoints: [
          'preferred_language: اس میں آپ کی منتخب کردہ زبان (انگریزی "en" یا اردو "ur") محفوظ رہتی ہے تاکہ اگلی بار آنے پر ویب سائٹ آپ کی پسندیدہ زبان میں کھلے۔',
        ],
      },
      {
        id: 'security-limitations',
        number: '۰۸',
        title: 'تکنیکی سیکیورٹی اور محفوظ استعمال کی ہدایات',
        paragraphs: [
          'ویب سائٹ کے کوڈ میں ان پٹ کی صفائی، فارم کی تصدیق اور الفاظ کی حدود کا خیال رکھا گیا ہے۔ تاہم، چونکہ یہ ایک تعلیمی تحقیقی پروٹوٹائپ ہے اور کوئی تجارتی بینکنگ یا سرکاری دفاعی پورٹل نہیں ہے، اس لیے ہم تمام شہریوں سے محفوظ رویے کی درخواست کرتے ہیں۔',
          'برائے مہربانی اس ویب سائٹ کے کسی بھی خانے میں اصل قومی شناختی کارڈ (CNIC) نمبر، بینک یا کریڈٹ کارڈ کی معلومات، پاس ورڈز یا خفیہ سرکاری دستاویزات درج نہ کریں۔',
        ],
      },
      {
        id: 'data-inquiries',
        number: '۰۹',
        title: 'معلومات سے متعلق سوالات اور رابطہ',
        paragraphs: [
          'چونکہ پروٹوٹائپ سرور پر کسی قسم کا ذاتی ریکارڈ محفوظ نہیں کرتا، اس لیے سرور پر تلاش، برآمد (export) یا حذف (delete) کرنے کے لیے کوئی ڈیٹا موجود نہیں ہے۔',
          'اس تعلیمی پروجیکٹ کے لیے فی الحال کوئی عوامی ہیلپ لائن یا باضابطہ سپورٹ ای میل فعال نہیں ہے۔ یونیورسٹی کے تعلیمی مظاہرے میں شریک افراد گرین وچ یونیورسٹی کی فیکلٹی اور نگران اساتذہ کے توسط سے ٹیم سے رابطہ کر سکتے ہیں۔',
        ],
      },
      {
        id: 'policy-updates',
        number: '۱۰',
        title: 'پالیسی میں ترامیم اور تبدیلیاں',
        paragraphs: [
          'یہ رازداری کی پالیسی نومبر ۲۰۲۶ء کے مطابق آوازِ عوام ایپلیکیشن کی موجودہ تکنیکی ساخت کی سچی عکاسی کرتی ہے۔',
          'جب اس منصوبے میں ڈیٹا بیس کا نفاذ، رومن اردو ماڈلز کی حقیقی تفویض، اور محکموں کی براہِ راست رسائی فعال کی جائے گی تو عوامی نفاذ سے قبل اس دستاویز میں ضروری ترامیم کی جائیں گی۔',
        ],
      },
    ],
  },
};
