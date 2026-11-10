import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { formatDateOnly } from '../../../utils/dateFormatter';

export interface ApplicationPaperProps {
  currentDateIso: string;
  applicantName?: string;
  children: React.ReactNode;
}

export const ApplicationPaper: React.FC<ApplicationPaperProps> = ({
  currentDateIso,
  applicantName,
  children,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';
  const formattedDate = formatDateOnly(currentDateIso, language);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto bg-white border border-[#DDD9D4] rounded-lg p-6 sm:p-10 lg:p-14 text-start transition-all"
      style={{
        boxShadow:
          '0 4px 20px -2px rgba(20, 20, 20, 0.05), 0 2px 6px -1px rgba(20, 20, 20, 0.03)',
      }}
    >
      {/* Formal Application Document Letterhead */}
      <div className="pb-6 mb-8 border-b border-[#E5E3E0] space-y-4">
        {/* Top Identification Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="block font-bold tracking-widest text-[#141414] uppercase text-sm sm:text-base">
              {ur ? 'شہری بلدیاتی شکایت کی باقاعدہ درخواست' : 'PUBLIC SERVICE COMPLAINT'}
            </span>
            <span className="text-[11px] text-[#666] tracking-wider uppercase block">
              {ur ? 'آوازِ عوام // عوامی بلدیاتی پورٹل' : 'Awaaz-e-Awam // Civic Grievance Framework'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F7F6F3] px-3 py-1.5 rounded border border-[#E5E3E0]">
            <span className="text-[#666] uppercase text-[11px] font-bold">
              {ur ? 'تاریخ:' : 'Date:'}
            </span>
            <span className="font-bold text-[#141414] text-xs">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Formal Addressed Recipient */}
        <div className="pt-2 text-xs font-ui leading-relaxed text-[#333] space-y-0.5">
          <span className="block font-bold text-[#141414] uppercase text-[11px] tracking-wider text-[#681822]">
            {ur ? 'بخدمت جناب:' : 'To:'}
          </span>
          <p className="font-semibold text-sm text-[#141414]">
            {ur ? 'متعلقہ بلدیاتی ادارہ و مجاز افسران' : 'Concerned Public Service Department'}
          </p>
          <p className="text-xs text-[#555]">
            {ur ? 'کراچی، حکومتِ سندھ، پاکستان' : 'Karachi, Sindh, Pakistan'}
          </p>
        </div>
      </div>

      {/* Main Document Body Form Elements */}
      <div className="space-y-8">
        {children}
      </div>

      {/* Formal Document Sign-off / Applicant Closing */}
      <div className="mt-10 pt-6 border-t border-[#E5E3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-[#555]">
        <div>
          <span className="block uppercase text-[11px] tracking-wider text-[#777]">
            {ur ? 'درخواست گزار کی توثیق:' : 'Applicant Declaration:'}
          </span>
          <span className="font-bold text-[#141414] text-sm">
            {applicantName?.trim() || (ur ? '— نام درج کریں —' : '— Enter Name Above —')}
          </span>
        </div>

        <div className="text-start sm:text-end space-y-0.5">
          <span className="block uppercase text-[10px] text-[#777] tracking-wider">
            {ur ? 'کیپسٹون تعلیمی جائزہ' : 'Academic Capstone Evaluation'}
          </span>
          <span className="text-[11px] text-[#444]">
            Greenwich University, Karachi
          </span>
        </div>
      </div>
    </div>
  );
};
