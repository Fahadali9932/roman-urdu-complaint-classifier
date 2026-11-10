import { LegalDocumentContent } from '../types';

export const termsOfUseContent: LegalDocumentContent = {
  en: {
    title: 'Terms of Use',
    eyebrow: 'ACADEMIC PROJECT DISCLOSURE · AWAAZ-E-AWAM',
    subtitle:
      'These terms govern your use and evaluation of the Awaaz-e-Awam academic prototype. By accessing this website, you acknowledge its status as an educational research demonstration and understand its operational boundaries.',
    effectiveDate: 'Effective date: November 2026 · Academic Prototype Preview',
    academicNotice:
      'Awaaz-e-Awam is an independent university research initiative developed at Greenwich University, Karachi. It is not an official service of the Government of Sindh or any municipal authority.',
    tableOfContentsLabel: 'ON THIS PAGE',
    returnHomeLabel: 'Return to Homepage',
    otherDocumentLabel: 'Related Document',
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
          'The intended purpose of Awaaz-e-Awam is to demonstrate how citizens can describe civic service challenges in their everyday natural language, and how natural language classification could assist municipal organizations in categorizing and directing public reports.',
          'In this current release, the service provides an accessible writing interface, word counter, localized bilingual display, and illustrative complaint workflows for evaluation by university reviewers and civic technologists.',
        ],
      },
      {
        id: 'prototype-status',
        number: '03',
        title: 'Prototype Status & No Official Filing',
        paragraphs: [
          'This website is an academic prototype and is NOT an official government grievance portal. Completing the complaint drafting form or receiving a review confirmation does NOT constitute a legally binding submission, formal petition, or active case filing with any civic department.',
          'Awaaz-e-Awam does not provide emergency services, immediate municipal dispatch, or life-safety intervention. If you are experiencing an urgent civic emergency, utility hazard (such as fallen power lines or gas leaks), or immediate danger, you must contact the official emergency helplines of the responsible service providers directly.',
        ],
        callout: {
          title: 'Important Civic Notice',
          text: 'Filing a draft on this website will not result in government action or inspection. For active civic grievances requiring municipal resolution, please contact the relevant utility or municipal helpline through their verified government channels.',
        },
      },
      {
        id: 'acceptable-use',
        number: '04',
        title: 'Acceptable Use Guidelines',
        paragraphs: [
          'When testing and evaluating the platform, we ask all participants to interact in a constructive, ethical manner. By using this service, you agree to:',
        ],
        bulletPoints: [
          'Use the writing workspace for testing civic complaint descriptions in good faith.',
          'Avoid submitting intentionally offensive, defamatory, harassing, or threatening language.',
          'Avoid entering sensitive personal information belonging to other individuals without their knowledge or consent.',
          'Refrain from attempting to compromise, reverse-engineer, inject malicious scripts, or disrupt the operation of the web application.',
          'Acknowledge that any simulated case numbers or tracking data displayed are for demonstration purposes only.',
        ],
      },
      {
        id: 'accounts-and-access',
        number: '05',
        title: 'Accounts and Demonstration Access',
        paragraphs: [
          'The sign-in and user registration screens on this website are client-side prototypes intended to demonstrate the user flow of a citizen portal. Real account creation, persistent credential storage, password hashing databases, and password recovery workflows are not currently operational.',
          'Users may explore the authenticated citizen workspace layout using the "Explore Demo" option without supplying private credentials. Because these accounts are simulated, no user rights or data ownership claims attach to demonstration profiles.',
        ],
      },
      {
        id: 'complaint-submission',
        number: '06',
        title: 'Complaint Drafting and Form Review',
        paragraphs: [
          'The complaint drafting form provides client-side validation to ensure that descriptions are clear, concise, and focused on civic concerns (limited to 200 words).',
          'Selecting "Submit Complaint" activates a local validation routine and presents a review summary modal. No complaint text or contact information is transmitted across the internet or delivered to municipal officers.',
        ],
      },
      {
        id: 'classification-and-routing',
        number: '07',
        title: 'Classification and Routing Limitations',
        paragraphs: [
          'Demonstrations of automated department routing (e.g., KW&SC, K-Electric, SBCA, Solid Waste Management) shown on the landing page and interactive cards reflect planned machine learning architectures.',
          'In this current release, automated routing algorithms are simulated for user experience evaluation. We make no warranty or representation regarding the legal accuracy, official authority, or governmental binding nature of any categorized department tags.',
        ],
      },
      {
        id: 'status-tracking',
        number: '08',
        title: 'Status Tracking Limitations',
        paragraphs: [
          'The complaint tracking interface and citizen dashboard display sample progress stages (Submitted, Under Review, Assigned, Resolved) for interface demonstration.',
          'These tracking numbers and status badges do not correspond to open municipal service tickets. Awaaz-e-Awam does not guarantee resolution times, inspection visits, or department responses for issues described within this prototype.',
        ],
      },
      {
        id: 'privacy-reference',
        number: '09',
        title: 'Privacy and Data Handling',
        paragraphs: [
          'Our treatment of information entered during testing is governed by our Privacy Policy. In summary, because the current prototype operates entirely within your local browser, no personal complaints or user credentials are saved to external databases.',
          'For a complete explanation of technical requests (such as Google Fonts CDN assets) and browser storage (such as language preference), please review the Privacy Policy.',
        ],
      },
      {
        id: 'service-limitations',
        number: '10',
        title: 'Service Availability & "As-Is" Status',
        paragraphs: [
          'The Awaaz-e-Awam prototype is provided on an "as-is" and "as-available" basis for educational and academic evaluation. The student development team makes no warranties, express or implied, regarding continuous uptime, error-free operation, or fitness for municipal operational use.',
          'Features, visual styling, localized terminology, and page structures may be modified, updated, or removed during ongoing academic iterations without advance notice.',
        ],
      },
      {
        id: 'modifications-to-terms',
        number: '11',
        title: 'Modifications to These Terms',
        paragraphs: [
          'These Terms of Use reflect the operational scope of the frontend prototype as of November 2026. As future development phases introduce backend databases, live APIs, and potential institutional integrations, these terms will be revised to reflect actual operational obligations prior to public deployment.',
        ],
      },
      {
        id: 'academic-contact',
        number: '12',
        title: 'Academic Inquiries and Questions',
        paragraphs: [
          'This project is managed under academic supervision at Greenwich University, Karachi. Feedback or inquiries concerning the research methodology or user interface design may be directed through official university demonstration channels.',
          'For real-world public service grievances, citizens should consult the official directories of their respective district administrations and municipal service providers.',
        ],
      },
    ],
  },
  ur: {
    title: 'استعمال کی شرائط',
    eyebrow: 'تعلیمی منصوبے کی وضاحتی رپورٹ • آوازِ عوام',
    subtitle:
      'یہ شرائط آوازِ عوام کے تعلیمی پیش منظر (پروٹوٹائپ) کے استعمال اور جائزے کے اصول واضح کرتی ہیں۔ اس ویب سائٹ کو دیکھ کر یا استعمال کر کے آپ تسلیم کرتے ہیں کہ یہ ایک تعلیمی تحقیقی منصوبہ ہے اور اس کی عملی حدود سے باخبر ہیں۔',
    effectiveDate: 'نفاذ کی تاریخ: نومبر ۲۰۲۶ء • تعلیمی پیش منظر',
    academicNotice:
      'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک آزاد تعلیمی و تحقیقی منصوبہ ہے۔ یہ حکومتِ سندھ یا کسی سرکاری یا بلدیاتی ادارے کی سرکاری سروس نہیں ہے۔',
    tableOfContentsLabel: 'اس صفحے پر',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentLabel: 'متعلقہ دستاویز',
    otherDocumentTitle: 'رازداری کی پالیسی پڑھیں',
    otherDocumentPath: '/privacy-policy',
    sections: [
      {
        id: 'about-platform',
        number: '۰۱',
        title: 'پلیٹ فارم کا تعارف اور حیثیت',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی، پاکستان کے طلبہ کا ایک آزاد تعلیمی و تحقیقی منصوبہ ہے۔ اس کا بنیادی مقصد رومن اردو، اردو اور انگریزی زبان میں عوامی شکایات کی خودکار درجہ بندی کا تکنیکی جائزہ لینا ہے۔',
          'یہ پلیٹ فارم محض تعلیمی، تحقیقی اور تدریسی نمائش کے لیے تیار کیا گیا ہے۔ یہ حکومتِ سندھ، بلدیہ عظمیٰ کراچی (KMC) یا کسی بھی سرکاری ادارے کی ملکیت یا زیرِ انتظام نہیں ہے۔',
        ],
      },
      {
        id: 'purpose-of-service',
        number: '۰۲',
        title: 'سروس کا مقصد',
        paragraphs: [
          'آوازِ عوام کا مقصد یہ ظاہر کرنا ہے کہ شہری کس طرح روزمرہ کی آسان زبان میں بلدیاتی مسائل بیان کر سکتے ہیں، اور قدرتی زبان کی درجہ بندی (NLP) کے ذریعے کس طرح مسائل کو متعلقہ شعبوں میں منظم کیا جا سکتا ہے۔',
          'موجودہ ریلیز میں یہ ویب سائٹ صرف ایک سہل تحریری انٹرفیس، الفاظ کا کاؤنٹر، اور نمونے کے مراحل دکھاتی ہے تاکہ تعلیمی جائزے اور فیڈ بیک میں آسانی ہو۔',
        ],
      },
      {
        id: 'prototype-status',
        number: '۰۳',
        title: 'پیش منظر کی نوعیت اور سرکاری شکایت کا عدم نفاذ',
        paragraphs: [
          'یہ ویب سائٹ ایک تعلیمی پیش منظر ہے اور سرکاری شکایت درج کرانے کا باضابطہ پورٹل ہرگز نہیں ہے۔ فارم پُر کرنے یا تصدیقی میسج دیکھنے کا مطلب یہ نہیں ہے کہ آپ کی شکایت کسی محکمے کو باضابطہ طور پر جمع ہو گئی ہے۔',
          'آوازِ عوام ہنگامی خدمات یا فوری شہری ریلیف فراہم نہیں کر سکتا۔ اگر آپ کو کسی فوری نوعیت کے حادثے، گیس لیکیج، بجلی کی لٹکتی تاروں یا جان لیوا مسئلے کا سامنا ہے تو فوری طور پر متعلقہ اداروں کی سرکاری ایمرجنسی ہیلپ لائنز سے رابطہ کریں۔',
        ],
        callout: {
          title: 'شہریوں کے لیے اہم اطلاع',
          text: 'اس ویب سائٹ پر شکایت لکھنے سے کسی سرکاری محکمے کی کارروائی عمل میں نہیں آئے گی۔ حقیقی عوامی مسائل کے حل کے لیے متعلقہ اداروں کے سرکاری دفاتر یا ہیلپ لائنز سے رجوع کریں۔',
        },
      },
      {
        id: 'acceptable-use',
        number: '۰۴',
        title: 'قابلِ قبول استعمال کے رہنما اصول',
        paragraphs: [
          'ویب سائٹ کے جائزے اور جانچ کے دوران ہم تمام صارفین سے باوقار اور ذمہ دارانہ طرزِ عمل کی توقع رکھتے ہیں۔ اس پلیٹ فارم کو استعمال کرتے ہوئے آپ درج ذیل باتوں سے اتفاق کرتے ہیں:',
        ],
        bulletPoints: [
          'شکایت لکھنے کے خانے کو صرف جائز شہری مسائل کے تجزیاتی جائزے کے لیے استعمال کیا جائے۔',
          'کسی قسم کی توہین آمیز، نازیبا، غیر اخلاقی، یا دھمکی آمیز زبان کے استعمال سے گریز کیا جائے۔',
          'کسی دوسرے شہری کی ذاتی و نجی معلومات اس کی اجازت کے بغیر شامل نہ کی جائیں۔',
          'ایپلیکیشن کو نقصان پہنچانے، نقصان دہ اسکرپٹس داخل کرنے، یا سسٹم میں خلل ڈالنے کی کوشش نہ کی جائے۔',
          'تمام کیس نمبرز اور ڈیمو ٹریکنگ ڈیٹا کو محض تعلیمی نمونہ سمجھا جائے۔',
        ],
      },
      {
        id: 'accounts-and-access',
        number: '۰۵',
        title: 'صارف اکاؤنٹس اور ڈیمو رسائی',
        paragraphs: [
          'لاگ ان اور سائن اپ کی اسکرینز محض فرنٹ اینڈ ڈیزائن کی تفہیم کے لیے ہیں۔ سرور پر اصلی اکاؤنٹ بنانے، پاس ورڈ محفوظ کرنے یا پاس ورڈ کی بازیابی کا کوئی فعال نظام موجود نہیں ہے۔',
          'صارفین "Explore Demo" بٹن کے ذریعے بغیر کسی پاس ورڈ کے شہری ڈیش بورڈ کا جائزہ لے سکتے ہیں۔ چونکہ یہ پروفائلز فرضی ہیں، اس لیے ان سے کوئی قانونی ملکیت وابستہ نہیں ہے۔',
        ],
      },
      {
        id: 'complaint-submission',
        number: '۰۶',
        title: 'شکایت لکھنے اور جائزے کا عمل',
        paragraphs: [
          'شکایت کا فارم براؤزر کی سطح پر جانچ کرتا ہے کہ تفصیلات ۲۰۰ الفاظ سے زیادہ نہ ہوں اور بنیادی خانے پُر کیے گئے ہوں۔',
          '"شکایت جمع کرائیں" کا بٹن دبانے پر صرف براؤزر کے اندر جائزے کا خلاصہ ظاہر ہوتا ہے۔ کوئی بھی تحریر انٹرنیٹ پر نشر نہیں ہوتی اور نہ ہی کسی سرکاری اہلکار کو موصول ہوتی ہے۔',
        ],
      },
      {
        id: 'classification-and-routing',
        number: '۰۷',
        title: 'درجہ بندی اور تفویض کی حدود',
        paragraphs: [
          'مرکزی صفحے پر محکموں کی نشاندہی (مثلاً واٹر بورڈ، کے الیکٹرک، ایس بی سی اے) کے جو مظاہرے دکھائے گئے ہیں وہ مجوزہ مشین لرننگ ماڈلز کا فکری خاکہ ہیں۔',
          'موجودہ پیش منظر میں خودکار حکومتی تفویض کا نظام فعال نہیں ہے۔ ہم محکموں کے خودکار تعین کی قانونی صحت یا حکومتی پابندی کی کوئی ضمانت نہیں دیتے۔',
        ],
      },
      {
        id: 'status-tracking',
        number: '۰۸',
        title: 'کیس ٹریکنگ کے فرضی مراحل',
        paragraphs: [
          'شکایت ٹریکر اور ڈیش بورڈ میں دکھائے جانے والے مراحل (درج شدہ، زیرِ جائزہ، تفویض شدہ، حل شدہ) محض انٹرفیس کی نمائش کے لیے ہیں۔',
          'یہ ٹریکنگ کوڈز کسی اصلی سرکاری فائل کا حوالہ نہیں ہیں۔ آوازِ عوام کسی بھی بیان کردہ مسئلے کے معائنے، کارروائی یا حل کی ضمانت نہیں دیتا۔',
        ],
      },
      {
        id: 'privacy-reference',
        number: '۰۹',
        title: 'رازداری اور ڈیٹا کی حفاظت',
        paragraphs: [
          'جانچ کے دوران معلومات کا برتاؤ ہماری رازداری کی پالیسی (Privacy Policy) کے تحت ہے۔ مختصراً یہ کہ پروٹوٹائپ صرف آپ کے براؤزر میں کام کرتا ہے اور سرور پر کوئی ڈیٹا بیس محفوظ نہیں رکھتا۔',
          'تکنیکی وسائل (جیسے گوگل فونٹس سی ڈی این) اور براؤزر کی لوکل سیٹنگز کی مکمل تفصیل کے لیے برائے مہربانی ہماری رازداری کی پالیسی کا مطالعہ کریں۔',
        ],
      },
      {
        id: 'service-limitations',
        number: '۱۰',
        title: 'سروس کی فراہمی اور "جیسا ہے ویسا ہی" کی بنیاد',
        paragraphs: [
          'آوازِ عوام کا پیش منظر تعلیمی و تدریسی مقاصد کے لیے "جیسا ہے ویسا ہی" (As-Is) کی بنیاد پر فراہم کیا گیا ہے۔ طلبہ کی ٹیم اس ویب سائٹ کی مستقل دستیابی یا بلدیاتی آپریشنل مقاصد کے لیے مکمل موزونیت کی کوئی قانونی ضمانت نہیں دیتی۔',
          'تعلیمی تحقیق کی پیش رفت کے دوران کسی بھی وقت بغیر پیشگی اطلاع کے فیچرز، ڈیزائن یا الفاظ میں تبدیلی کی جا سکتی ہے۔',
        ],
      },
      {
        id: 'modifications-to-terms',
        number: '۱۱',
        title: 'شرائط میں رد و بدل',
        paragraphs: [
          'استعمال کی یہ شرائط نومبر ۲۰۲۶ء کے مطابق پروٹوٹائپ کے دائرہ کار کی عکاسی کرتی ہیں۔ جب مستقبل میں ڈیٹا بیس اور اے پی آئی کے رابطے شامل کیے جائیں گے تو ان شرائط کو عوامی آغاز سے قبل اپ ڈیٹ کیا جائے گا۔',
        ],
      },
      {
        id: 'academic-contact',
        number: '۱۲',
        title: 'تعلیمی سوالات اور رابطہ',
        paragraphs: [
          'یہ منصوبہ گرین وچ یونیورسٹی، کراچی کے نگران اساتذہ کی رہنمائی میں تیار ہو رہا ہے۔ تحقیقی طریقہ کار یا ڈیزائن سے متعلق سوالات یونیورسٹی کے تعلیمی ذرائع کے ذریعے پوچھے جا سکتے ہیں۔',
          'حقیقی شہری مسائل کے حل کے لیے شہری متعلقہ بلدیاتی اداروں اور ضلعی انتظامیہ کے سرکاری پورٹلز اور ہیلپ لائنز سے رجوع کریں۔',
        ],
      },
    ],
  },
};
