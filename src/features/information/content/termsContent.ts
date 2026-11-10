import { InfoDocumentContent } from '../types';

export const termsContent: InfoDocumentContent = {
  en: {
    title: 'TERMS OF USE.',
    eyebrow: 'ACADEMIC PROJECT DISCLOSURE · AWAAZ-E-AWAM',
    subtitle:
      'These terms govern your use and evaluation of the Awaaz-e-Awam academic prototype. By accessing this website, you acknowledge its status as an educational research demonstration and understand its operational boundaries.',
    effectiveDate: 'Effective date: November 2026 · Academic Prototype Preview',
    academicNotice:
      'Awaaz-e-Awam is an independent university research initiative developed at Greenwich University, Karachi. It is not an official service of the Government of Sindh or any municipal authority.',
    tableOfContentsLabel: 'ON THIS PAGE',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'Read Privacy Policy',
    otherDocumentPath: '/privacy-policy',
    sections: [
      {
        id: 'about-platform',
        number: '01',
        title: 'About the Platform',
        paragraphs: [
          'Awaaz-e-Awam ("The Voice of the People") is an independent civic technology research project created by students at Greenwich University in Karachi, Pakistan. The project explores natural language processing and complaint classification for civic issues written in Roman Urdu, Urdu, and English.',
          'The platform is developed solely for educational, academic, and technological demonstration purposes. It is not owned, operated, funded, or formally endorsed by the Government of Sindh, the Karachi Metropolitan Corporation (KMC), or any municipal department.',
        ],
      },
      {
        id: 'purpose-of-service',
        number: '02',
        title: 'Purpose of the Service',
        paragraphs: [
          'The intended purpose of Awaaz-e-Awam is to demonstrate how conversational and everyday civic grievances can be captured, verified, and mapped to municipal departments using machine-assisted classification. The current live website represents an interactive user interface demonstration.',
        ],
      },
      {
        id: 'prototype-status',
        number: '03',
        title: 'Prototype Status & No Official Filing',
        paragraphs: [
          'Awaaz-e-Awam is an academic prototype in active exploration. Submitting information through the complaint-writing tool DOES NOT constitute an official filing with any governmental body, municipal authority, or law enforcement agency.',
          'The application is NOT connected to active government intake systems. No civil servant, municipal inspector, or utility operator monitors or resolves grievances entered into this platform.',
        ],
        callout: {
          title: 'NO OFFICIAL ACTION',
          text: 'This website is NOT an official government grievance portal. If you require real municipal assistance, emergency response, or formal government action, you must use authorized official portals or contact municipal helplines directly.',
        },
      },
      {
        id: 'acceptable-use',
        number: '04',
        title: 'Acceptable Use Guidelines',
        paragraphs: [
          'When interacting with this demonstration environment, users agree to adhere to respectful civic testing standards:',
        ],
        bulletPoints: [
          'Do not submit abusive, harassing, defamatory, or unlawful content in complaint description fields.',
          'Do not include the personal telephone numbers, residential addresses, or private information of other individuals without their consent.',
          'Do not attempt to disrupt or exploit the frontend application or overload the hosting infrastructure.',
          'Use fictional scenarios or generalized community issues when evaluating the complaint-writing interface.',
        ],
      },
      {
        id: 'accounts-and-access',
        number: '05',
        title: 'Accounts and Demonstration Access',
        paragraphs: [
          'The user login and registration interfaces provided on this website are client-side demonstration forms. No user accounts are persisted in a database, no passwords are encrypted or validated against a remote identity store, and no authentication tokens (JWTs, session cookies) are issued.',
          'Entering credentials into the sign-in forms serves only to demonstrate interface states and does not establish a persistent user account or grant access to private administrative records.',
        ],
      },
      {
        id: 'complaint-submission',
        number: '06',
        title: 'Complaint Drafting and Form Review',
        paragraphs: [
          'The complaint drafting interface allows citizens to compose descriptions up to a strict limit of 200 words. Selecting "Submit Complaint" runs local client-side validation rules and displays a modal review dialog with a generated mock reference code.',
          'This interaction is a local simulation. The entered text is not transmitted across the internet, is not stored on a server, and is cleared from memory when you leave or refresh the page.',
        ],
      },
      {
        id: 'classification-and-routing',
        number: '07',
        title: 'Classification and Routing Limitations',
        paragraphs: [
          'Any departmental categories, priority indicators, or department routing badges shown in the interface represent simulated previews and prototype demonstrations.',
          'These classifications do not represent binding administrative routing decisions and should not be relied upon as official legal or administrative advice.',
        ],
      },
      {
        id: 'status-tracking',
        number: '08',
        title: 'Status Tracking Limitations',
        paragraphs: [
          'Tracking numbers (such as KHI-2026-XXXX) and timeline events visible in the citizen dashboard or tracker components are static mock records created to illustrate intended user workflows.',
          'They do not correspond to active municipal cases, real investigations, or ongoing municipal field operations.',
        ],
      },
      {
        id: 'privacy-reference',
        number: '09',
        title: 'Privacy and Data Handling',
        paragraphs: [
          'Your interaction with this platform is governed by our Privacy Policy, which details our minimal technical footprint, our use of localStorage for language preference ("preferred_language"), and the absence of tracking cookies or persistent databases.',
        ],
      },
      {
        id: 'service-limitations',
        number: '10',
        title: 'No Guarantee of Official Resolution',
        paragraphs: [
          'Because Awaaz-e-Awam is an academic prototype with no official governmental integration, the platform cannot guarantee, expedite, or facilitate the resolution of any civic issue. For urgent matters—such as electrical fires, severe flooding, gas leaks, or public safety emergencies—always contact official emergency services directly.',
        ],
      },
      {
        id: 'modifications-to-terms',
        number: '11',
        title: 'Modifications to Platform and Terms',
        paragraphs: [
          'As an academic research project, Awaaz-e-Awam may be modified, updated, or temporarily taken offline without prior notice as development requirements evolve. These Terms of Use will be updated to reflect changes in functionality before any broader public deployment.',
        ],
      },
      {
        id: 'academic-contact',
        number: '12',
        title: 'Academic Context and Governing Environment',
        paragraphs: [
          'These terms and the Awaaz-e-Awam platform are created within the academic framework of Greenwich University, Karachi, Pakistan. They are intended to provide fair, transparent notice of the prototype’s capabilities and limitations to all testers, evaluators, and academic reviewers.',
        ],
      },
    ],
  },
  ur: {
    title: 'استعمال کے ضوابط',
    eyebrow: 'تعلیمی منصوبے کی وضاحتی رپورٹ • آوازِ عوام',
    subtitle:
      'یہ شرائط و ضوابط آوازِ عوام کے تعلیمی پیش منظر کے استعمال اور جائزے کا احاطہ کرتے ہیں۔ اس ویب سائٹ تک رسائی حاصل کر کے آپ اس کے تعلیمی اور تحقیقی دائرہ کار کو تسلیم کرتے ہیں۔',
    effectiveDate: 'نفاذ کی تاریخ: نومبر ۲۰۲۶ء • تعلیمی پیش منظر',
    academicNotice:
      'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد تعلیمی و تحقیقی منصوبہ ہے۔ یہ حکومتِ سندھ یا کسی سرکاری یا بلدیاتی ادارے کی سرکاری ویب سائٹ نہیں ہے۔',
    tableOfContentsLabel: 'اس صفحے پر',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'رازداری کی پالیسی پڑھیں',
    otherDocumentPath: '/privacy-policy',
    sections: [
      {
        id: 'about-platform',
        number: '۰۱',
        title: 'پلیٹ فارم کا تعارف',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد شہری ٹیکنالوجی منصوبہ ہے۔ اس منصوبے کا مقصد رومن اردو، اردو اور انگریزی زبانوں میں تحریری شکایات کی خودکار درجہ بندی کا جائزہ لینا ہے۔',
          'یہ پلیٹ فارم مکمل طور پر تعلیمی اور تحقیقی مقاصد کے لیے بنایا گیا ہے۔ یہ حکومتِ سندھ، کے ایم سی (کراچی میٹروپولیٹن کارپوریشن) یا کسی بھی بلدیاتی ادارے کی ملکیت یا باضابطہ سروس نہیں ہے۔',
        ],
      },
      {
        id: 'purpose-of-service',
        number: '۰۲',
        title: 'سروس کا بنیادی مقصد',
        paragraphs: [
          'آوازِ عوام کا مقصد یہ دکھانا ہے کہ کس طرح عام بول چال میں لکھے گئے عوامی مسائل کو مشین لرننگ کے ذریعے سمجھا اور متعلقہ محکموں کو تجویز کیا جا سکتا ہے۔ موجودہ ویب سائٹ صرف اس طریقہ کار کا انٹرایکٹو مظاہرہ ہے۔',
        ],
      },
      {
        id: 'prototype-status',
        number: '۰۳',
        title: 'پیش منظر کی حیثیت اور سرکاری اندراج کی نفی',
        paragraphs: [
          'آوازِ عوام اس وقت ایک فعال تعلیمی پروٹوٹائپ ہے۔ شکایتی فارم میں معلومات درج کرنے سے وہ کسی سرکاری محکمے یا قانونی ادارے میں باقاعدہ درج نہیں ہوتی۔',
          'یہ ایپلیکیشن حکومتی سرورز سے منسلک نہیں ہے اور نہ ہی کوئی سرکاری اہلکار یا بلدیاتی انسپکٹر اس پلیٹ فارم کے ذریعے شکایات پر کارروائی کرتا ہے۔',
        ],
        callout: {
          title: 'سرکاری کارروائی کی عدم موجودگی',
          text: 'یہ ویب سائٹ کوئی سرکاری شکایتی پورٹل نہیں ہے۔ اگر آپ کو اپنے مسئلے پر باقاعدہ سرکاری کارروائی درکار ہے تو مجاز سرکاری ذرائع یا ہیلپ لائنز استعمال کریں۔',
        },
      },
      {
        id: 'acceptable-use',
        number: '۰۴',
        title: 'درست اور شائستہ استعمال کے اصول',
        paragraphs: [
          'اس آزمائشی پلیٹ فارم پر ٹیسٹ کرتے وقت صارفین درج ذیل اخلاقی و شہری اصولوں کی پاسداری کے پابند ہیں:',
        ],
        bulletPoints: [
          'شکایت کے خانے میں گالم گلوچ، ہتک آمیز یا غیر قانونی تحریر درج نہ کریں۔',
          'کسی دوسرے شہری کا موبائل نمبر، گھر کا پتہ یا نجی معلومات ان کی اجازت کے بغیر شامل نہ کریں۔',
          'ویب سائٹ کے انٹرفیس کو خراب کرنے یا ہوسٹنگ سرور پر غیر ضروری بوجھ ڈالنے سے گریز کریں۔',
          'فارم کو ٹیسٹ کرتے وقت فرضی یا علامتی مسائل کا انتخاب کریں۔',
        ],
      },
      {
        id: 'accounts-and-access',
        number: '۰۵',
        title: 'اکاؤنٹس اور ڈیمو رسائی کی وضاحت',
        paragraphs: [
          'ویب سائٹ پر موجود لاگ ان اور رجسٹریشن کے فارمز صرف فرنٹ اینڈ انٹرفیس کے نمونے ہیں۔ کوئی ڈیٹا بیس محفوظ نہیں ہوتا، نہ ہی پاس ورڈ کی توثیق ہوتی ہے اور نہ ہی سیشن ٹوکنز جاری کیے جاتے ہیں۔',
          'ان فارمز میں معلومات درج کرنا صرف ڈیزائن کا جائزہ لینے کے لیے ہے اور اس سے کوئی باقاعدہ صارف اکاؤنٹ قائم نہیں ہوتا۔',
        ],
      },
      {
        id: 'complaint-submission',
        number: '۰۶',
        title: 'شکایت کی تحریر اور جائزہ',
        paragraphs: [
          'شکایت لکھنے کے فارم میں زیادہ سے زیادہ ۲۰۰ الفاظ کی حد مقرر ہے۔ "شکایت جمع کروائیں" کے بٹن پر کلک کرنے سے براؤزر میں جانچ کا عمل مکمل ہوتا ہے اور سکرین پر ایک فرضی تصدیقی کھڑکی دکھائی دیتی ہے۔',
          'یہ عمل محض ایک مقامی نمائش ہے۔ کوئی بھی تحریر انٹرنیٹ پر نہیں بھیجی جاتی اور صفحہ بند کرنے پر مکمل طور پر مٹ جاتی ہے۔',
        ],
      },
      {
        id: 'classification-and-routing',
        number: '۰۷',
        title: 'خودکار درجہ بندی کی حدود',
        paragraphs: [
          'انٹرفیس میں نظر آنے والے محکموں کے نام، ترجیحی لیبلز یا تجاویز صرف آزمائشی پیش منظر کے طور پر دکھائے گئے ہیں۔',
          'ان تجاویز کو حتمی قانونی یا انتظامی فیصلہ نہ سمجھا جائے۔',
        ],
      },
      {
        id: 'status-tracking',
        number: '۰۸',
        title: 'ٹریکنگ نمبرز کی فرضی حیثیت',
        paragraphs: [
          'ڈیش بورڈ یا ٹریکر پر نظر آنے والے ٹریکنگ کوڈز (جیسے KHI-2026-XXXX) اور ٹائم لائن کے واقعات نمونے کے طور پر تیار کیے گئے ہیں۔',
          'ان کا تعلق کسی حقیقی بلدیاتی کیس یا فیلڈ کارروائی سے نہیں ہے۔',
        ],
      },
      {
        id: 'privacy-reference',
        number: '۰۹',
        title: 'رازداری اور ڈیٹا کا تحفظ',
        paragraphs: [
          'اس پلیٹ فارم کا استعمال ہماری رازداری کی پالیسی کے تحت ہے، جس میں واضح کیا گیا ہے کہ ہم ٹریکنگ کوکیز یا مستقل ڈیٹا بیس استعمال نہیں کرتے اور صرف زبان کے انتخاب کو لوکل اسٹوریج میں رکھتے ہیں۔',
        ],
      },
      {
        id: 'service-limitations',
        number: '۱۰',
        title: 'مسائل کے حل کی عدم ضمانت',
        paragraphs: [
          'چونکہ آوازِ عوام ایک تعلیمی منصوبہ ہے جس کا سرکاری اداروں سے انضمام نہیں ہے، اس لیے یہ کسی مسئلے کے حل کی ضمانت نہیں دیتا۔ ہنگامی حالات (جیسے گیس لیکیج، شدید سیلاب، بجلی کی آگ یا حادثات) کے لیے ہمیشہ باضابطہ ہنگامی سروسز سے رابطہ کریں۔',
        ],
      },
      {
        id: 'modifications-to-terms',
        number: '۱۱',
        title: 'شرائط میں ترامیم اور تبدیلی',
        paragraphs: [
          'تحقیقی منصوبے کے طور پر، آوازِ عوام کو ترقیاتی ضروریات کے تحت پیشگی اطلاع کے بغیر تبدیل کیا جا سکتا ہے۔ کسی بھی بڑی تبدیلی کی صورت میں ان شرائط کو اپ ڈیٹ کیا جائے گا۔',
        ],
      },
      {
        id: 'academic-contact',
        number: '۱۲',
        title: 'تعلیمی ماحول اور دائرہ کار',
        paragraphs: [
          'یہ شرائط گرین وچ یونیورسٹی، کراچی، پاکستان کے تعلیمی ضوابط کے تحت تیار کی گئی ہیں تاکہ تمام ٹیسٹرز، اساتذہ اور جائزہ کاروں کے سامنے منصوبے کی حدود بالکل واضح رہیں۔',
        ],
      },
    ],
  },
};
