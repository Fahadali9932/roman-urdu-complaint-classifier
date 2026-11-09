import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { SindhGeometricRule } from '../../components/common/SindhGeometricRule';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const information = {
  about: {
    en: ['About Us', 'Awaaz-e-Awam explores a simpler way to describe public-service issues in Roman Urdu, Urdu or English.', 'It is an independent academic project for Greenwich University, Karachi. It is not affiliated with or endorsed by a government department.', 'This preview lets you write and review a complaint. Sending complaints to departments and tracking real cases are not yet available.'],
    ur: ['ہمارا تعارف', 'آوازِ عوام میں آپ عوامی مسائل رومن اردو، اردو یا انگریزی میں آسانی سے بیان کر سکتے ہیں۔', 'یہ گرین وچ یونیورسٹی، کراچی کے لیے ایک آزاد تعلیمی منصوبہ ہے۔ اسے کسی سرکاری محکمے کی وابستگی یا توثیق حاصل نہیں۔', 'فی الحال آپ شکایت لکھ کر اس کا جائزہ لے سکتے ہیں۔ محکموں کو شکایت بھیجنے اور حقیقی کیس کی پیش رفت جاننے کی سہولت ابھی دستیاب نہیں۔'],
  },
  privacy: {
    en: ['Privacy Policy', 'This notice describes the current preview. The complaint form checks the details in your browser and displays a review; it does not send or save a complaint.', 'Your language preference is saved in this browser so it can be remembered on your next visit. You can remove it by clearing this site’s browser data.', 'Use only the details needed to describe a public issue. Avoid entering identity documents, passwords or other sensitive information. Fonts are loaded from Google Fonts, which receives the browser request.', 'A service privacy policy and contact channel will need to be published before real complaint collection begins.'],
    ur: ['رازداری کی پالیسی', 'یہ اطلاع موجودہ پیش منظر کے بارے میں ہے۔ فارم آپ کے براؤزر میں معلومات جانچ کر جائزہ دکھاتا ہے؛ شکایت بھیجی یا محفوظ نہیں کی جاتی۔', 'آپ کی زبان کا انتخاب اسی براؤزر میں محفوظ رہتا ہے۔ اسے ختم کرنے کے لیے اس ویب سائٹ کا براؤزر ڈیٹا صاف کریں۔', 'صرف عوامی مسئلہ سمجھانے کے لیے ضروری معلومات درج کریں۔ شناختی دستاویزات، پاس ورڈ یا حساس معلومات نہ لکھیں۔ فونٹ گوگل فونٹس سے لوڈ ہوتے ہیں، جسے براؤزر کی درخواست موصول ہوتی ہے۔', 'حقیقی شکایات جمع کرنے سے پہلے سروس کی رازداری کی پالیسی اور رابطے کا ذریعہ شائع کرنا ضروری ہوگا۔'],
  },
  terms: {
    en: ['Terms of Use', 'This academic preview is available for exploring the complaint-writing experience. Reviewing a form does not file an official complaint or create a tracking reference.', 'Describe issues respectfully and accurately. Do not include another person’s private information without a legitimate reason.', 'This preview cannot provide emergency assistance or guarantee action by any department. For a real service issue, use the responsible provider’s official channels.'],
    ur: ['استعمال کی شرائط', 'یہ تعلیمی پیش منظر شکایت لکھنے کا طریقہ دیکھنے کے لیے ہے۔ فارم کا جائزہ لینے سے سرکاری شکایت درج نہیں ہوتی اور نہ ہی ٹریکنگ نمبر بنتا ہے۔', 'مسائل درست اور مہذب انداز میں بیان کریں۔ کسی دوسرے شخص کی نجی معلومات بلا ضرورت شامل نہ کریں۔', 'یہ پیش منظر ہنگامی مدد فراہم نہیں کرتا اور کسی محکمے کی کارروائی کی ضمانت نہیں دیتا۔ حقیقی مسئلے کے لیے متعلقہ ادارے کے سرکاری ذرائع استعمال کریں۔'],
  },
  contact: {
    en: ['Contact Us', 'A public contact email or support number has not yet been published for this project.', 'If you are taking part in a university demonstration, share feedback with the project team through your existing course or demonstration contact.', 'For an active public-service issue, contact the responsible service provider through its official channels. This preview does not forward messages to departments.'],
    ur: ['ہم سے رابطہ', 'اس منصوبے کے لیے عوامی رابطے کی ای میل یا سپورٹ نمبر ابھی شائع نہیں ہوا۔', 'اگر آپ یونیورسٹی کے مظاہرے میں شریک ہیں تو اپنے موجودہ کورس یا مظاہرے کے رابطے کے ذریعے منصوبے کی ٹیم کو رائے دیں۔', 'حقیقی عوامی مسئلے کے لیے متعلقہ ادارے کے سرکاری ذرائع سے رابطہ کریں۔ یہ پیش منظر محکموں کو پیغامات نہیں بھیجتا۔'],
  },
};

export const ProjectInformation = ({ page }: { page: keyof typeof information }) => {
  const { language, isRTL } = useLanguage();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);

  const [title, ...paragraphs] = information[page][language];

  return (
    <article dir={isRTL ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl px-6 py-16 sm:py-24 text-start">
      <div className="bg-white border border-[#DFD9CF] rounded-2xl p-6 sm:p-12 shadow-xl shadow-[#101A28]/06">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono font-semibold tracking-wider text-[#88413F] uppercase">
            {language === 'ur' ? 'منصوبے کی تفصیل' : 'PROJECT NOTICE'}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D5B995]" />
          <span className="text-[11px] font-mono text-[#5A626E]">
            Awaaz-e-Awam
          </span>
        </div>

        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-[#101A28] mb-4 focus:outline-none"
        >
          {title}
        </h1>

        <div className="w-36 my-4 opacity-75">
          <SindhGeometricRule variant="light" />
        </div>

        <div className="space-y-4 text-base sm:text-lg text-[#263E59] leading-relaxed font-ui mt-6">
          {paragraphs.map((text, idx) => (
            <p key={idx} className="leading-relaxed">
              {text}
            </p>
          ))}
        </div>

        <div className="pt-8 mt-6 border-t border-[#DFD9CF]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#101A28] hover:text-[#88413F] transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{language === 'ur' ? 'مرکزی صفحہ پر واپس جائیں' : 'Return to Home'}</span>
          </Link>
        </div>
      </div>
    </article>
  );
};
