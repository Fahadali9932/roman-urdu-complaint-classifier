import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { Button } from '../../../components/common/Button';
import {
  HelpCircle,
  ChevronDown,
  PenTool,
  Search,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'submission' | 'tracking' | 'routing' | 'privacy';
  questionEn: string;
  questionUr: string;
  answerEn: string;
  answerUr: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'submission',
    questionEn: 'What is Awaaz-e-Awam?',
    questionUr: 'آوازِ عوام کیا ہے؟',
    answerEn:
      'Awaaz-e-Awam is an AI-assisted municipal complaint routing platform developed for Karachi. It enables citizens to describe municipal issues in everyday Roman Urdu or English and automatically connects each issue to the responsible municipal department.',
    answerUr:
      'آوازِ عوام کراچی کے شہریوں کے لیے مصنوعی ذہانت پر مبنی بلدیاتی شکایات کی درجہ بندی کا پلیٹ فارم ہے۔ یہ شہریوں کو روزمرہ کی رومن اردو یا انگریزی میں مسائل بیان کرنے کی سہولت دیتا ہے اور درست متعلقہ محکمے تک پہنچاتا ہے۔',
  },
  {
    id: 'faq-2',
    category: 'submission',
    questionEn: 'How do I submit a complaint?',
    questionUr: 'میں شکایت کیسے درج کروں؟',
    answerEn:
      'Click "Write Complaint", enter your contact information (kept strictly private), choose your district and locality in Karachi, and describe the civic problem in your own words. You can submit either signed in or as a guest.',
    answerUr:
      'مرکزی مینو میں "شکایت لکھیں" پر کلک کریں، اپنے نجی رابطے کی معلومات درج کریں، کراچی کا ضلع اور علاقہ منتخب کریں، اور اپنے الفاظ میں بلدیاتی مسئلہ بیان کریں۔ آپ اکاؤنٹ کے ساتھ یا بطور مہمان شکایت درج کر سکتے ہیں۔',
  },
  {
    id: 'faq-3',
    category: 'submission',
    questionEn: 'Do I need an account to submit a complaint?',
    questionUr: 'کیا شکایت درج کروانے کے لیے اکاؤنٹ بنانا لازمی ہے؟',
    answerEn:
      'No. You can submit complaints as a guest without creating an account. You will receive a private 24-digit tracking number on your receipt, which allows you to check status updates at any time from any device.',
    answerUr:
      'نہیں۔ آپ بغیر اکاؤنٹ بنائے بطور مہمان بھی شکایت درج کروا سکتے ہیں۔ جمع کروانے پر آپ کو ۲۴ ہندسی نجی ٹریکنگ نمبر ملے گا جس سے آپ کسی بھی وقت اور ڈیوائس پر شکایت کی صورتحال دیکھ سکتے ہیں۔',
  },
  {
    id: 'faq-4',
    category: 'tracking',
    questionEn: 'How do I track my complaint?',
    questionUr: 'میں اپنی شکایت کی پیش رفت کیسے دیکھ سکتا ہوں؟',
    answerEn:
      'Visit the "Track Complaint" page and enter your 24-digit tracking number. The system will display the verified public status, assigned department, and official progress timeline without requiring a login.',
    answerUr:
      'ویب سائٹ کے مینو میں "شکایت ٹریک کریں" پر جائیں اور اپنا ۲۴ ہندسی ٹریکنگ نمبر درج کریں۔ نظام آپ کو شکایت کی موجودہ حیثیت، متعلقہ محکمہ اور پیش رفت کی تفصیلات بغیر لاگ ان دکھائے گا۔',
  },
  {
    id: 'faq-5',
    category: 'tracking',
    questionEn: 'What is my tracking number?',
    questionUr: 'ٹریکنگ نمبر کیا ہوتا ہے؟',
    answerEn:
      'Your tracking number is a unique 24-digit secure code generated upon successful complaint submission. It acts as a private key that lets you look up your complaint’s public-safe progress while keeping your identity confidential.',
    answerUr:
      'ٹریکنگ نمبر ۲۴ ہندسوں کا ایک منفرد نجی کوڈ ہے جو شکایت کے کامیاب اندراج پر دیا جاتا ہے۔ یہ آپ کی نجی شناخت ظاہر کیے بغیر شکایت کا اسٹیٹس معلوم کرنے کے لیے استعمال ہوتا ہے۔',
  },
  {
    id: 'faq-6',
    category: 'tracking',
    questionEn: 'What should I do if I lose my tracking number?',
    questionUr: 'اگر میرا ٹریکنگ نمبر کھو جائے تو کیا کروں؟',
    answerEn:
      'If you submitted the complaint using a registered citizen account, it remains permanently available in "My Complaints". For guest complaints, be sure to copy and save the tracking number upon submission, as it cannot be recovered publicly without ownership proof.',
    answerUr:
      'اگر آپ نے رجسٹرڈ اکاؤنٹ کے ذریعے شکایت جمع کروائی تھی تو وہ ہمیشہ "میری شکایات" کے صفحے پر محفوظ رہے گی۔ مہمان شکایت کی صورت میں تصدیقی صفحے پر موجود ٹریکنگ نمبر فوری طور پر محفوظ کر لیں کیونکہ رازداری کی وجہ سے یہ عوامی طور پر دوبارہ نہیں دکھایا جا سکتا۔',
  },
  {
    id: 'faq-7',
    category: 'routing',
    questionEn: 'How is my complaint assigned to a department?',
    questionUr: 'میری شکایت کسی محکمے کو کیسے تفویض ہوتی ہے؟',
    answerEn:
      'Our trained Roman Urdu classification model reads the complete complaint, identifies the root municipal problem, and maps it to one of six Karachi authorities: KMC, KW&SC, K-Electric, SSGC, SSWMB, or SBCA. Natural emotional language or greetings do not distract the routing decision.',
    answerUr:
      'ہمارا خصوصی رومن اردو ماڈل پوری تحریر پڑھ کر اصل بلدیاتی مسئلے کی نشاندہی کرتا ہے اور اسے کراچی کے ۶ متعلقہ اداروں (KMC، KW&SC، کے الیکٹرک، SSGC، SSWMB، یا SBCA) میں سے درست محکمے کے سپرد کرتا ہے۔',
  },
  {
    id: 'faq-8',
    category: 'routing',
    questionEn: 'Can a complaint be assigned to two departments?',
    questionUr: 'کیا ایک شکایت دو محکموں کو تفویض ہو سکتی ہے؟',
    answerEn:
      'Yes. When a citizen reports two genuinely independent municipal faults in a single submission (such as a fallen power cable and a broken road), the system assigns the case to both responsible departments with coordinated tracking.',
    answerUr:
      'جی ہاں۔ جب کوئی شہری ایک ہی شکایت میں دو الگ الگ بلدیاتی مسائل (مثلاً لٹکتی ہوئی بجلی کی تار اور ٹوٹی ہوئی سڑک) درج کرے، تو نظام دونوں متعلقہ اداروں کو متوازی طور پر یہ شکایت ارسال کرتا ہے۔',
  },
  {
    id: 'faq-9',
    category: 'routing',
    questionEn: 'What does "Under Review" mean?',
    questionUr: '"زیرِ جائزہ" (Under Review) کا کیا مطلب ہے؟',
    answerEn:
      '"Under Review" indicates that the complaint requires human administrative verification. This occurs when a complaint contains complex multi-department issues (3 or more departments) or ambiguous details needing human triage before field dispatch.',
    answerUr:
      '"زیرِ جائزہ" کا مطلب ہے کہ شکایت کو انسانی جانچ یا تصدیق کی ضرورت ہے۔ یہ اس وقت ہوتا ہے جب شکایت ۳ یا اس سے زیادہ محکموں کے مسائل پر مشتمل ہو، تاکہ غلط تفویض سے بچا جا سکے۔',
  },
  {
    id: 'faq-10',
    category: 'tracking',
    questionEn: 'How will I know if my complaint has been resolved?',
    questionUr: 'مجھے کیسے معلوم ہوگا کہ شکایت حل ہو گئی ہے؟',
    answerEn:
      'When the field team completes resolution work and records the official completion event, the status in your tracking timeline updates to "Resolved". If you provided an optional email, status notifications will also be sent.',
    answerUr:
      'جب متعلقہ محکمہ کام مکمل کر کے سرکاری ریکارڈ میں تصدیق درج کرے گا تو ٹریکنگ ٹائم لائن پر اسٹیٹس "حل شدہ" (Resolved) ہو جائے گا۔ اگر آپ نے ای میل درج کی تھی تو نوٹیفکیشن بھی موصول ہوگی۔',
  },
  {
    id: 'faq-11',
    category: 'routing',
    questionEn: 'Can a complaint assigned to the wrong department be corrected?',
    questionUr: 'اگر شکایت غلط محکمے کو چلی جائے تو کیا اسے درست کیا جا سکتا ہے؟',
    answerEn:
      'Yes. Field staff can flag misclassified complaints from their department portal. Flagged complaints move under review, and the central administrator reviews the case to confirm and reassign the true responsible department.',
    answerUr:
      'جی ہاں۔ محکمے کا عملہ غلط درجہ بندی والی شکایت کو منتظم (ایڈمن) کے جائزے کے لیے بھیج سکتا ہے۔ ایڈمن جانچ کے بعد شکایت کو درست محکمے کے سپرد کر دیتا ہے۔',
  },
  {
    id: 'faq-12',
    category: 'privacy',
    questionEn: 'Is my personal information protected?',
    questionUr: 'کیا میری ذاتی معلومات محفوظ ہیں؟',
    answerEn:
      'Yes. Your contact information (phone number, CNIC, email, and home address) is isolated in server-side private tables protected by Supabase Row-Level Security. Municipal field officers only see the public incident location and sanitized complaint statement.',
    answerUr:
      'جی ہاں۔ آپ کا فون نمبر، شناختی کارڈ، ای میل اور گھر کا پتہ سرور کی سخت سیکیورٹی میں علیحدہ محفوظ کیا جاتا ہے۔ محکمے کے عملے یا پبلک ٹریکنگ پر آپ کی نجی معلومات کبھی ظاہر نہیں ہوتیں۔',
  },
];

export const FaqPage: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const [openIds, setOpenIds] = useState<string[]>(['faq-1']);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const categories = [
    { id: 'all', labelEn: 'All Questions', labelUr: 'تمام سوالات' },
    { id: 'submission', labelEn: 'Submissions', labelUr: 'شکایات درج کروانا' },
    { id: 'tracking', labelEn: 'Tracking & Numbers', labelUr: 'ٹریکنگ اور کوڈز' },
    { id: 'routing', labelEn: 'AI & Departments', labelUr: 'درجہ بندی و محکمے' },
    { id: 'privacy', labelEn: 'Privacy & Security', labelUr: 'رازداری اور تحفظ' },
  ];

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const qText = (ur ? item.questionUr : item.questionEn).toLowerCase();
    const aText = (ur ? item.answerUr : item.answerEn).toLowerCase();
    return qText.includes(q) || aText.includes(q);
  });

  return (
    <div className="py-4 sm:py-7 text-start civic-kinetic-page">
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="space-y-3 sm:space-y-4 pb-6 sm:pb-8 border-b border-[#D9D3CC]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F1E8E6] border border-[#E4D0CE] px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[#681822]">
            <HelpCircle className="w-4 h-4" />
            <span>{ur ? 'رہنمائی اور مدد' : 'Help & Information'}</span>
          </div>
          <h1 className="font-display font-black text-[clamp(2rem,3.4vw,3.4rem)] leading-[1.08] text-[#141414] tracking-[-0.035em] max-w-[950px]">
            {ur ? 'اکثر پوچھے جانے والے سوالات' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-sm sm:text-base text-[#4A453E] max-w-2xl leading-[1.6] font-medium">
            {ur
              ? 'شکایات درج کروانے، ٹریکنگ نمبرز، خودکار بلدیاتی تفویض اور ذاتی کوائف کے تحفظ سے متعلق اہم سوالات کے جوابات۔'
              : 'Find answers about submitting civic complaints, guest tracking numbers, departmental assignment, and personal data protection.'}
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="pt-6 sm:pt-8 space-y-4">
          <div className="relative">
            <Search className={`w-5 h-5 text-[#6A625C] absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-5' : 'left-5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ur ? 'سوال یا موضوع تلاش کریں…' : 'Search questions or keywords…'}
              className={`w-full min-h-[52px] sm:min-h-[56px] rounded-2xl border border-[#D9D3CC] bg-white py-3 font-ui text-sm sm:text-base font-medium placeholder:font-normal placeholder:text-[#78716B] focus:border-[#681822] focus:outline-none focus:ring-2 focus:ring-[#681822]/15 ${
                isRTL ? 'pr-14 pl-5' : 'pl-14 pr-5'
              }`}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${
                  selectedCategory === cat.id
                    ? 'bg-[#681822] text-white shadow-xs'
                    : 'bg-[#FAF9F7] text-[#5A554E] border border-[#E5E3E0] hover:bg-white hover:text-[#141414]'
                }`}
              >
                {ur ? cat.labelUr : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="pt-6 sm:pt-7 space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isOpen = openIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  data-scroll-depth
                  className="civic-depth-card rounded-2xl sm:rounded-[20px] border border-[#E5E3E0] bg-white overflow-hidden shadow-[0_4px_18px_rgba(20,20,20,0.025)] transition-colors duration-300 hover:border-[#BA9698]"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`${item.id}-answer`}
                    className="w-full min-h-[64px] sm:min-h-[76px] flex items-center justify-between gap-4 p-4 sm:px-6 sm:py-5 text-start cursor-pointer hover:bg-[#FAF9F7]/70 transition select-none"
                  >
                    <span className="font-bold text-[#141414] text-base sm:text-lg leading-snug tracking-tight">
                      {ur ? item.questionUr : item.questionEn}
                    </span>
                    <span
                      className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center text-[#5A554E] transition-transform duration-300 ${
                        isOpen ? 'rotate-180 bg-[#F7EFF0] text-[#681822] border-[#F0D5D8]' : ''
                      }`}
                    >
                      <ChevronDown className="w-5 h-5" />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={`${item.id}-answer`}
                      className="px-4 sm:px-6 pb-5 sm:pb-6 pt-4 sm:pt-5 text-sm sm:text-base text-[#423C37] leading-[1.7] border-t border-[#F2EFEA] bg-[#FCFBF9]"
                    >
                      <p>{ur ? item.answerUr : item.answerEn}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-10 rounded-[28px] bg-white border-2 border-[#E5E3E0] text-center space-y-3">
              <p className="text-lg sm:text-xl font-black text-[#141414]">
                {ur ? 'کوئی سوال نہیں ملا' : 'No matching questions found'}
              </p>
              <p className="text-base text-[#706A63]">
                {ur
                  ? 'براہ کرم دوسرا لفظ تلاش کریں یا کیٹیگری تبدیل کریں۔'
                  : 'Try adjusting your search terms or selecting another category.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-base font-bold text-[#681822] underline cursor-pointer"
              >
                {ur ? 'تمام سوالات دیکھیں' : 'View all questions'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Action Box */}
        <div data-scroll-depth className="civic-depth-card mt-8 sm:mt-10 rounded-2xl sm:rounded-[24px] bg-[#EFEAE5] border border-[#E2D9D1] p-5 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-sm">
          <div className="space-y-2 text-start">
            <h3 className="font-bold text-xl sm:text-2xl text-[#141414] tracking-tight">
              {ur ? 'کیا آپ بلدیاتی مسئلہ درج کروانا چاہتے ہیں؟' : 'Ready to submit a civic complaint?'}
            </h3>
            <p className="text-sm sm:text-base text-[#5A554E] leading-relaxed">
              {ur
                ? 'اپنے علاقے کا مسئلہ روزمرہ رومن اردو میں درج کروائیں اور فوری ٹریکنگ حاصل کریں۔'
                : 'Describe your neighborhood issue in Roman Urdu and receive instant tracking.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <Link to="/track" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#D9D3CC] bg-white px-6 py-3 text-sm sm:text-base font-bold text-[#141414] hover:bg-[#FAF9F7] transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#681822]" />
                <span>{ur ? 'شکایت ٹریک کریں' : 'Track Complaint'}</span>
              </button>
            </Link>

            <Link to="/submit" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                leftIcon={<PenTool className="w-3.5 h-3.5 text-white" />}
                className="w-full sm:w-auto min-h-[52px] px-6 text-sm sm:text-base font-bold"
              >
                {ur ? 'شکایت درج کریں' : 'Write Complaint'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
