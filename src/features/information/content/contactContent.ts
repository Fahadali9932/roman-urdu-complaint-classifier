import { InfoDocumentContent } from '../types';

export const contactContent: InfoDocumentContent = {
  en: {
    eyebrow: 'COMMUNICATION & OPERATIONAL GUIDELINES · AWAAZ-E-AWAM',
    title: 'CONTACT US.',
    subtitle: 'Operational communication channels, academic inquiry guidelines, and official public grievance resources.',
    academicNotice: 'Awaaz-e-Awam is an academic prototype developed at Greenwich University, Karachi. It does not monitor incoming emergency messages or forward complaints to municipal agencies.',
    returnHomeLabel: 'Return to Home',
    otherDocumentTitle: 'Read About the Project',
    otherDocumentPath: '/about',
    sections: [
      {
        id: 'academic-inquiries',
        number: '01',
        title: 'ACADEMIC & EVALUATION INQUIRIES',
        paragraphs: [
          'Awaaz-e-Awam is an active student research initiative conducted within Greenwich University, Karachi, Pakistan. The project serves academic demonstration, testing, and algorithmic evaluation purposes.',
          'University faculty, project evaluators, and academic participants reviewing this demonstration are requested to direct methodological questions, project feedback, and evaluation assessments through their authorized university course coordinators or academic liaisons.',
        ],
        callout: {
          title: 'NO PUBLIC HELPDESK COMMISSIONED',
          text: 'An open public telephone call-center, commercial ticketing system, or dedicated support email address has not been commissioned for this prototype. Please do not submit confidential documents or urgent personal inquiries.',
        },
      },
      {
        id: 'official-grievances',
        number: '02',
        title: 'OFFICIAL CIVIC GRIEVANCES & EMERGENCIES',
        paragraphs: [
          'This web application operates as a technical demonstration interface and does not file complaints with government departments or dispatch municipal crews. Submitting information here will not generate an official municipal action.',
          'For active civic emergencies, municipal breakdowns, utility failures, or hazardous conditions across Karachi and Sindh, citizens must utilize official government helplines and established complaint portals:',
        ],
        bulletPoints: [
          'Karachi Metropolitan Corporation (KMC) Citizen Helpline: Dial 1339',
          'Sindh Government Citizen Portal / CM Complaint Cell: Official provincial portal',
          'K-Electric Emergency Helpline: Dial 118 (Power outages and electrical hazards)',
          'Karachi Water & Sewerage Board (KW&SB): Dial 1339 or visit your zonal billing office',
          'Sindh Solid Waste Management Board (SSWMB): Designated district municipal helplines',
        ],
      },
      {
        id: 'prototype-communication-notice',
        number: '03',
        title: 'COMMUNICATION & PRIVACY NOTICE',
        paragraphs: [
          'Because Awaaz-e-Awam is a frontend demonstration, any complaint text entered into the writing tool is held only in browser memory for preview purposes and is not transmitted across the internet to government authorities.',
          'We urge all evaluators and users never to include personal identity numbers (such as CNIC), passwords, payment card numbers, or medical records within sample complaint texts.',
        ],
      },
    ],
  },
  ur: {
    eyebrow: 'رابطے اور عملی رہنمائی • آوازِ عوام',
    title: 'ہم سے رابطہ',
    subtitle: 'منصوبے سے رابطے کا طریقہ کار، تعلیمی رہنمائی اور حقیقی عوامی شکایات کے لیے سرکاری ذرائع۔',
    academicNotice: 'آوازِ عوام گرین وچ یونیورسٹی، کراچی کا ایک تعلیمی پروٹوٹائپ ہے۔ یہ ہنگامی پیغامات کی نگرانی نہیں کرتا اور نہ ہی شکایات سرکاری اداروں کو بھیجتا ہے۔',
    returnHomeLabel: 'مرکزی صفحہ پر واپس جائیں',
    otherDocumentTitle: 'ہمارے بارے میں پڑھیں',
    otherDocumentPath: '/about',
    sections: [
      {
        id: 'academic-inquiries',
        number: '۰۱',
        title: 'تعلیمی و تحقیقی رابطہ',
        paragraphs: [
          'آوازِ عوام گرین وچ یونیورسٹی، کراچی کے طلبہ کا ایک فعال تعلیمی اور تحقیقی منصوبہ ہے۔ اس کا بنیادی مقصد تعلیمی جائزہ اور الگورتھم کی آزمائش ہے۔',
          'یونیورسٹی فیکلٹی، جائزہ کار اور تعلیمی شرکاء سے گزارش ہے کہ وہ منصوبے سے متعلق اپنی تکنیکی آراء، سوالات اور تجاویز اپنے متعلقہ کورس کوآرڈینیٹر یا تعلیمی ذرائع کے ذریعے پہنچائیں۔',
        ],
        callout: {
          title: 'عوامی ہیلپ ڈیسک کی عدم دستیابی',
          text: 'اس تعلیمی پیش منظر کے لیے کوئی باضابطہ تجارتی کال سینٹر یا سپورٹ ای میل فعال نہیں ہے۔ برائے مہربانی حساس یا ہنگامی نوعیت کے پیغامات ارسال نہ کریں۔',
        },
      },
      {
        id: 'official-grievances',
        number: '۰۲',
        title: 'حقیقی عوامی شکایات کے سرکاری ذرائع',
        paragraphs: [
          'یہ پلیٹ فارم صرف ایک تکنیکی مظاہرہ ہے اور سرکاری محکموں کو شکایات ارسال نہیں کرتا۔ یہاں درج کی گئی معلومات سے سرکاری کارروائی شروع نہیں ہوتی۔',
          'شہر کراچی اور صوبہ سندھ میں کسی بھی حقیقی عوامی مسئلے، بلدیاتی شکایت یا ہنگامی صورت حال کے لیے شہری براہ راست متعلقہ سرکاری اداروں اور ہیلپ لائنز سے رابطہ کریں:',
        ],
        bulletPoints: [
          'کراچی میٹروپولیٹن کارپوریشن (کے ایم سی) ہیلپ لائن: 1339',
          'حکومت سندھ کمپلینٹ سیل / سندھ سٹیزن پورٹل: باضابطہ سرکاری پورٹل',
          'کے الیکٹرک ہنگامی ہیلپ لائن: 118 (بجلی کی خرابی یا حادثات کی صورت میں)',
          'کراچی واٹر اینڈ سیوریج بورڈ (واٹر بورڈ): 1339 یا علاقائی زونل دفاتر',
          'سندھ سالڈ ویسٹ مینجمنٹ بورڈ (صفائی ستھرائی): متعلقہ ضلعی ہیلپ لائنز',
        ],
      },
      {
        id: 'prototype-communication-notice',
        number: '۰۳',
        title: 'رابطہ اور رازداری کی احتیاط',
        paragraphs: [
          'چونکہ آوازِ عوام ایک فرنٹ اینڈ پیش منظر ہے، اس لیے فارم میں لکھی گئی معلومات صرف براؤزر کی میموری میں رہتی ہے اور کسی حکومتی سرور کو منتقل نہیں کی جاتی۔',
          'صارفین اور جائزہ کاروں سے التماس ہے کہ وہ آزمائشی فارم میں اپنا شناختی کارڈ نمبر (CNIC)، بینک کی تفصیلات، پاس ورڈ یا دیگر حساس معلومات ہرگز درج نہ کریں۔',
        ],
      },
    ],
  },
};
