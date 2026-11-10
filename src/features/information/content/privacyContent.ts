import { InfoDocumentContent } from '../types';

export const privacyContent: InfoDocumentContent = {
  en: {
    title: 'PRIVACY POLICY.',
    eyebrow: 'ACADEMIC PROJECT DISCLOSURE · AWAAZ-E-AWAM',
    subtitle:
      'This policy describes how information is handled within the current Awaaz-e-Awam prototype. As an academic research project, we provide full transparency regarding data collection, browser storage, and operational limitations.',
    effectiveDate: 'Effective date: November 2026 · Academic Prototype Preview',
    academicNotice:
      'Awaaz-e-Awam is an independent university research initiative developed at Greenwich University, Karachi. It is not an official service of the Government of Sindh or any municipal authority.',
    tableOfContentsLabel: 'ON THIS PAGE',
    returnHomeLabel: 'Return to Home',
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
          'Upon successful validation, the application displays a confirmation modal showing a preview of the submitted complaint along with a simulated tracking reference (e.g., KHI-2026-XXXX). No network transmission to a backend server takes place.',
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
          'Awaaz-e-Awam does not use HTTP cookies or session tracking cookies.',
          'The application uses the browser’s standard localStorage API for exactly one technical purpose: storing your language selection ("en" for English or "ur" for Urdu) under the key "preferred_language". This ensures your preferred language persists when navigating between pages. No personal identifying information is stored in localStorage.',
        ],
      },
      {
        id: 'security-limitations',
        number: '08',
        title: 'Security and Safe Testing Practices',
        paragraphs: [
          'Because this preview operates without a secure backend server or encrypted database connection, we advise all users and evaluators to exercise safe testing practices:',
        ],
        bulletPoints: [
          'Do not enter real National Identity Card (CNIC) numbers, passport details, or banking information.',
          'Do not enter actual passwords used for other accounts when testing the login or registration forms.',
          'Use fictional descriptions or non-sensitive sample scenarios when testing the complaint-writing tool.',
        ],
      },
      {
        id: 'data-inquiries',
        number: '09',
        title: 'Data Inquiries and Contact Information',
        paragraphs: [
          'Because this project is an academic research demonstration conducted at Greenwich University, Karachi, Pakistan, there is no designated public data protection officer or commercial customer support helpline.',
          'Academic reviewers, faculty, and project evaluators may direct methodological inquiries and project feedback through designated institutional academic channels.',
        ],
      },
      {
        id: 'policy-updates',
        number: '10',
        title: 'Updates to This Privacy Policy',
        paragraphs: [
          'As the Awaaz-e-Awam project progresses from a frontend prototype toward potential backend integration, machine learning pipeline deployment, or pilot testing, this Privacy Policy will be revised to reflect actual server-side data handling, database storage, and municipal routing workflows.',
          'All revisions will be published on this page with an updated effective date before any live civic data collection commences.',
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
    otherDocumentTitle: 'استعمال کے ضوابط پڑھیں',
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
          'شکایت کے آزمائشی فارم میں درج ذیل خانے فراہم کیے گئے ہیں جن کا مقصد عوامی مسئلہ واضح کرنا ہے:',
        ],
        bulletPoints: [
          'رابطے کی معلومات: شہری کا نام اور پاکستانی موبائل نمبر (مثلاً 03XXXXXXXXX)۔',
          'جغرافیائی مقام: کراچی کا متعلقہ ضلع (مثلاً ضلع شرقی، جنوبی، وسطی، غربی، کورنگی، ملیر، کیماڑی)، علاقہ یا بلاک، قریبی نشانی اور گلی کا پتہ۔',
          'مسئلے کی تفصیل: شکایت کا عنوان اور روزمرہ زبان میں تفصیل (زیادہ سے زیادہ ۲۰۰ الفاظ کی حد)۔',
          'آزمائشی لاگ ان اور رجسٹریشن: ای میل اور پاس ورڈ کے خانے صرف انٹرفیس کی آزمائش کے لیے ہیں۔',
        ],
      },
      {
        id: 'how-information-is-processed',
        number: '۰۳',
        title: 'معلومات کی جانچ اور پروسیسنگ کا طریقہ',
        paragraphs: [
          'فارم میں درج کی گئی تمام معلومات مکمل طور پر آپ کے مقامی ویب براؤزر کے اندر ہی جانچی جاتی ہیں۔ جب آپ "شکایت جمع کروائیں" کا بٹن دباتے ہیں، تو براؤزر ضروری خانوں کے اندراج، فون نمبر کی ساخت اور ۲۰۰ الفاظ کی حد کی تصدیق کرتا ہے۔',
          'کامیاب جانچ کے بعد سکرین پر ایک تصدیقی کھڑکی کھلتی ہے جس میں درج شدہ معلومات اور ایک فرضی ٹریکنگ نمبر (مثلاً KHI-2026-XXXX) نظر آتا ہے۔ انٹرنیٹ کے ذریعے کسی بیرونی سرور پر کوئی ڈیٹا نہیں بھیجا جاتا۔',
        ],
      },
      {
        id: 'storage-and-retention',
        number: '۰۴',
        title: 'ڈیٹا کا ذخیرہ اور برقراری کی مدت',
        paragraphs: [
          'موجودہ ایپلیکیشن کسی فعال ڈیٹابیس سے منسلک نہیں ہے۔ کوئی بھی شکایت، شہری کا نام، پاس ورڈ یا فون نمبر کسی سرور کی ہارڈ ڈسک یا کلاؤڈ ڈیٹا بیس میں محفوظ نہیں ہوتا۔',
          'چونکہ کوئی ڈیٹا ہمارے پاس محفوظ نہیں ہوتا، اس لیے ڈیٹا ڈیلیٹ کرنے یا برقرار رکھنے کا کوئی خودکار شیڈول نافذ العمل نہیں ہے۔ جیسے ہی آپ صفحہ ریفریش کرتے ہیں یا فارم چھوڑتے ہیں، تمام درج شدہ معلومات میموری سے خود بخود صاف ہو جاتی ہیں۔',
        ],
        callout: {
          title: 'مستقبل کی منصوبہ بندی',
          text: 'جب مستقبل کے مراحل میں ڈیٹا بیس اور محفوظ اکاؤنٹس کا نظام شامل کیا جائے گا، تو اس وقت ڈیٹا کے تحفظ اور اس کے اخراج کا باقاعدہ شیڈول عوامی اجرا سے قبل یہاں شائع کیا جائے گا۔',
        },
      },
      {
        id: 'access-controls',
        number: '۰۵',
        title: 'معلومات تک رسائی کا نظام',
        paragraphs: [
          'چونکہ شکایتی معلومات کسی سرور پر منتقل نہیں کی جاتیں، اس لیے کسی تیسرے فریق، دیگر صارفین یا سرکاری افسران کو آپ کی لکھی ہوئی تحریر تک کوئی رسائی حاصل نہیں ہے۔',
          'ڈیش بورڈ یا ٹائم لائن میں نظر آنے والے کیسز اور ٹریکنگ نمبرز محض فرضی نمونے ہیں جو مستقبل کے نظام کا اندازہ کروانے کے لیے بنائے گئے ہیں۔',
        ],
      },
      {
        id: 'third-party-services',
        number: '۰۶',
        title: 'تیسرے فریق کی خدمات اور نیٹ ورک کا رابطہ',
        paragraphs: [
          'یہ ایپلیکیشن تجارتی اشتہارات، سوشل میڈیا ٹریکنگ کوڈز یا صارفین کے رویے جانچنے والے پروگرامز (جیسے گوگل اینالیٹکس یا میٹا پکسل) کا استعمال نہیں کرتی۔',
          'صرف ایک بیرونی خدمت گوگل فونٹس (fonts.googleapis.com) کے ذریعے فونٹس ڈاؤن لوڈ کرنے کے لیے استعمال ہوتی ہے۔ جب آپ کا براؤزر یہ فونٹس حاصل کرتا ہے تو انٹرنیٹ پروٹوکول کے تحت آپ کا آئی پی ایڈریس گوگل کے مواد کی ترسیل کے نیٹ ورک کو موصول ہوتا ہے۔',
        ],
      },
      {
        id: 'cookies-local-storage',
        number: '۰۷',
        title: 'کوکیز اور براؤزر کی لوکل اسٹوریج',
        paragraphs: [
          'آوازِ عوام روایتی ٹریکنگ کوکیز کا استعمال نہیں کرتی۔',
          'ویب سائٹ صرف براؤزر کی معیاری "لوکل اسٹوریج" (localStorage) کو زبان کے انتخاب ("en" یا "ur") کو یاد رکھنے کے لیے استعمال کرتی ہے تاکہ اگلے صفحے پر جانے سے آپ کی منتخب کردہ زبان تبدیل نہ ہو۔ لوکل اسٹوریج میں کوئی ذاتی یا نجی معلومات محفوظ نہیں کی جاتی۔',
        ],
      },
      {
        id: 'security-limitations',
        number: '۰۸',
        title: 'تکنیکی سیکیورٹی اور محفوظ استعمال کی ہدایات',
        paragraphs: [
          'چونکہ یہ ایک آزمائشی ورژن ہے اور اس کے پیچھے محفوظ انکرپٹڈ ڈیٹابیس سرور فعال نہیں ہے، اس لیے تمام شہریوں اور ٹیسٹ کرنے والوں سے گزارش ہے کہ درج ذیل احتیاطی تدابیر اختیار کریں:',
        ],
        bulletPoints: [
          'اصلی شناختی کارڈ نمبر (CNIC)، پاسپورٹ یا بینک اکاؤنٹ کی معلومات فارم میں نہ لکھیں۔',
          'لاگ ان یا سائن اپ ٹیسٹ کرتے وقت اپنا اصل پاس ورڈ استعمال نہ کریں۔',
          'شکایت لکھنے کے فارم میں فرضی یا نمونے کے واقعات درج کریں۔',
        ],
      },
      {
        id: 'data-inquiries',
        number: '۰۹',
        title: 'رابطہ اور سوالات',
        paragraphs: [
          'چونکہ یہ گرین وچ یونیورسٹی، کراچی، پاکستان کے طلبہ کا تعلیمی منصوبہ ہے، اس لیے یہاں کوئی کمرشل سپورٹ ڈیسک یا عوامی ڈیٹا پروٹیکشن آفیسر موجود نہیں ہے۔',
          'تعلیمی جائزہ کار اور اساتذہ اپنے سوالات اور فیڈ بیک مجاز تعلیمی ذرائع کے ذریعے پہنچا سکتے ہیں۔',
        ],
      },
      {
        id: 'policy-updates',
        number: '۱۰',
        title: 'پالیسی میں ترامیم اور تبدیلیاں',
        paragraphs: [
          'جیسے جیسے آوازِ عوام منصوبہ تحقیقی پروٹوٹائپ سے آگے بڑھے گا اور اس میں بیک اینڈ یا خودکار ترسیل کی صلاحیتیں شامل کی جائیں گی، اس پالیسی کو اپ ڈیٹ کیا جائے گا۔',
          'تمام ترامیم عوامی سطح پر سروس شروع کرنے سے قبل اسی صفحے پر نئی تاریخ کے ساتھ شائع کی جائیں گی۔',
        ],
      },
    ],
  },
};
