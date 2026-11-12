import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Search, X, MapPin, Inbox } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  totalAssignedCount: number;
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const getStatusChip = (status: ComplaintStatus, language: 'en' | 'ur') => {
  const styles: Record<
    ComplaintStatus,
    { bg: string; text: string; border: string; labelEn: string; labelUr: string }
  > = {
    submitted: {
      bg: 'bg-[#F0F4F7]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D0D9DE]',
      labelEn: 'New',
      labelUr: 'نئی',
    },
    under_review: {
      bg: 'bg-[#F0F4F7]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D0D9DE]',
      labelEn: 'Under Review',
      labelUr: 'زیرِ جائزہ',
    },
    assigned: {
      bg: 'bg-[#F2F5F0]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D2DEC8]',
      labelEn: 'Assigned',
      labelUr: 'تفویض شدہ',
    },
    in_progress: {
      bg: 'bg-[#EAF1F2]',
      text: 'text-[#122E32]',
      border: 'border-[#C2D6D9]',
      labelEn: 'In Progress',
      labelUr: 'زیرِ کارروائی',
    },
    resolved: {
      bg: 'bg-[#EEF5F1]',
      text: 'text-[#245938]',
      border: 'border-[#CCE0D3]',
      labelEn: 'Resolved',
      labelUr: 'حل شدہ',
    },
    rejected: {
      bg: 'bg-[#F4F6F6]',
      text: 'text-[#5B646B]',
      border: 'border-[#E1E4E6]',
      labelEn: 'Closed',
      labelUr: 'بند',
    },
  };

  const current = styles[status] || styles.submitted;
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${current.bg} ${current.text} ${current.border}`}
    >
      {language === 'ur' ? current.labelUr : current.labelEn}
    </span>
  );
};

export const ComplaintInboxList: React.FC<ComplaintInboxListProps> = ({
  complaints,
  totalAssignedCount,
  selectedReference,
  onSelectComplaint,
  searchQuery,
  onSearchChange,
}) => {
  const { language, t, isRTL } = useLanguage();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-[380px] shrink-0 flex flex-col bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl overflow-hidden shadow-xs">
      {/* Search Header */}
      <div className="p-3 border-b border-[#E1E4E6] bg-[#FAFBFB] space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#687E8B] absolute top-2.5 left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('deptSearchPlaceholder')}
            className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-[#E1E4E6] bg-[#FFFFFF] text-[#0F1E21] placeholder-[#8A9298] focus:outline-none focus:border-[#2C4A52] focus:ring-1 focus:ring-[#2C4A52]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-2.5 right-2.5 text-[#5B646B] hover:text-[#0F1E21]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#5B646B] px-0.5">
          <span>
            {complaints.length} {language === 'ur' ? 'شکایات' : 'complaints'}
          </span>
          {searchQuery && (
            <span className="text-[#2C4A52] font-medium">Filtered</span>
          )}
        </div>
      </div>

      {/* Complaint Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#ECEEEF] max-h-[calc(100vh-230px)]">
        {complaints.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4F6F6] text-[#687E8B] flex items-center justify-center mx-auto mb-2">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#0F1E21]">
              {totalAssignedCount === 0
                ? t('deptEmptyAssigned')
                : t('deptEmptyFilter')}
            </p>
            <p className="text-[11px] text-[#5B646B] max-w-xs mx-auto leading-relaxed">
              {totalAssignedCount === 0
                ? t('deptEmptyPrompt')
                : 'Try adjusting your search query or filter.'}
            </p>
          </div>
        ) : (
          complaints.map((c) => {
            const isSelected = selectedReference === c.referenceNumber;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectComplaint(c.referenceNumber)}
                className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 focus:outline-none cursor-pointer ${
                  isSelected
                    ? isRTL
                      ? 'bg-[#F0F4F5] border-r-3 border-r-[#122E32]'
                      : 'bg-[#F0F4F5] border-l-3 border-l-[#122E32]'
                    : 'hover:bg-[#FAFBFB] text-[#0F1E21]'
                }`}
              >
                {/* Reference & Date */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-bold tracking-tight ${
                      isSelected ? 'text-[#122E32]' : 'text-[#0F1E21]'
                    }`}
                  >
                    {c.referenceNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#5B646B]">
                      {formatDate(c.submittedAt)}
                    </span>
                    {getStatusChip(c.status, language)}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#5B646B] truncate">
                  <MapPin className="w-3 h-3 text-[#687E8B] shrink-0" />
                  <span className="truncate">
                    {c.locality} · {c.district}
                  </span>
                </div>

                {/* Concise preview of complaint text */}
                <p className="text-xs text-[#5B646B] line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
