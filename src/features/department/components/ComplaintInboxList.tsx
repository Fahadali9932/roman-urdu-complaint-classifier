import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Search, X, MapPin, Inbox } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const getStatusBadge = (status: ComplaintStatus, language: 'en' | 'ur') => {
  const styles: Record<ComplaintStatus, { bg: string; text: string; border: string; labelEn: string; labelUr: string }> = {
    submitted: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      labelEn: 'Submitted',
      labelUr: 'درج شدہ',
    },
    under_review: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      labelEn: 'Under Review',
      labelUr: 'زیرِ جائزہ',
    },
    assigned: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      labelEn: 'Assigned',
      labelUr: 'تفویض شدہ',
    },
    in_progress: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      labelEn: 'In Progress',
      labelUr: 'زیرِ کارروائی',
    },
    resolved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      labelEn: 'Resolved',
      labelUr: 'حل شدہ',
    },
    rejected: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      labelEn: 'Rejected',
      labelUr: 'مسترد',
    },
  };

  const current = styles[status] || styles.submitted;
  return (
    <span
      className={`inline-flex items-center text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${current.bg} ${current.text} ${current.border}`}
    >
      {language === 'ur' ? current.labelUr : current.labelEn}
    </span>
  );
};

export const ComplaintInboxList: React.FC<ComplaintInboxListProps> = ({
  complaints,
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
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col bg-[#FFFFFF] border border-[#E5E3E0] rounded-xl overflow-hidden shadow-sm">
      {/* Search Bar Header */}
      <div className="p-3 border-b border-[#E5E3E0] bg-[#FAFAF8] space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#737373] absolute top-2.5 left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('deptSearchPlaceholder')}
            className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-[#E5E3E0] bg-[#FFFFFF] text-[#141414] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#681822]/20 focus:border-[#681822]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-2.5 right-2.5 text-[#737373] hover:text-[#141414]"
              aria-label="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#737373] px-1">
          <span>
            {complaints.length} {language === 'ur' ? 'شکایات' : 'grievances found'}
          </span>
          {searchQuery && (
            <span className="text-[#681822] font-medium">
              Filtered by &quot;{searchQuery}&quot;
            </span>
          )}
        </div>
      </div>

      {/* List Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F0EEEB] max-h-[calc(100vh-230px)]">
        {complaints.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F6F3] text-[#737373] flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-[#141414]">
              {t('deptEmptyInbox')}
            </p>
            <p className="text-[11px] text-[#737373] leading-relaxed">
              {t('deptEmptyInboxDesc')}
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
                className={`w-full text-left p-3.5 transition-all flex flex-col gap-1.5 focus:outline-none ${
                  isSelected
                    ? isRTL
                      ? 'bg-[#FDFCF9] border-r-4 border-r-[#681822] shadow-xs'
                      : 'bg-[#FDFCF9] border-l-4 border-l-[#681822] shadow-xs'
                    : 'hover:bg-[#FAFAF8] text-[#141414]'
                }`}
              >
                {/* Reference & Date */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-bold tracking-tight ${
                      isSelected ? 'text-[#681822]' : 'text-[#141414]'
                    }`}
                  >
                    {c.referenceNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#737373]">
                      {formatDate(c.submittedAt)}
                    </span>
                    {getStatusBadge(c.status, language)}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#5B5B5B] truncate">
                  <MapPin className="w-3 h-3 text-[#737373] shrink-0" />
                  <span className="truncate">
                    {c.locality} • {c.district}
                  </span>
                </div>

                {/* Title */}
                <h4
                  className={`text-xs font-medium line-clamp-1 ${
                    isSelected ? 'text-[#141414]' : 'text-[#333333]'
                  }`}
                >
                  {c.title}
                </h4>

                {/* Roman Urdu Excerpt */}
                <p className="text-[11px] text-[#737373] line-clamp-2 italic leading-relaxed bg-[#FAF9F6] p-1.5 rounded border border-[#F0EFEB]">
                  &ldquo;{c.description}&rdquo;
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
