import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Search, X, MapPin, Inbox, CheckCircle2, Clock, Sparkles } from 'lucide-react';

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
    { bg: string; text: string; border: string; labelEn: string; labelUr: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    submitted: {
      bg: 'bg-[#F0F4F7]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D0D9DE]',
      labelEn: 'New',
      labelUr: 'نئی',
      icon: Sparkles,
    },
    under_review: {
      bg: 'bg-[#F0F4F7]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D0D9DE]',
      labelEn: 'Under Review',
      labelUr: 'زیرِ جائزہ',
      icon: Clock,
    },
    assigned: {
      bg: 'bg-[#F2F5F0]',
      text: 'text-[#2C4A52]',
      border: 'border-[#D2DEC8]',
      labelEn: 'Assigned',
      labelUr: 'تفویض شدہ',
      icon: Clock,
    },
    in_progress: {
      bg: 'bg-[#EAF1F2]',
      text: 'text-[#122E32]',
      border: 'border-[#C2D6D9]',
      labelEn: 'In Progress',
      labelUr: 'زیرِ کارروائی',
      icon: Clock,
    },
    resolved: {
      bg: 'bg-[#EEF5F1]',
      text: 'text-[#245938]',
      border: 'border-[#CCE0D3]',
      labelEn: 'Resolved',
      labelUr: 'حل شدہ',
      icon: CheckCircle2,
    },
    rejected: {
      bg: 'bg-[#F4F6F6]',
      text: 'text-[#5B646B]',
      border: 'border-[#E1E4E6]',
      labelEn: 'Closed',
      labelUr: 'بند',
      icon: CheckCircle2,
    },
  };

  const current = styles[status] || styles.submitted;
  const Icon = current.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${current.bg} ${current.text} ${current.border}`}
    >
      <Icon className="w-3 h-3" />
      <span>{language === 'ur' ? current.labelUr : current.labelEn}</span>
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
  const { language, t } = useLanguage();

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
    <div className="w-full flex flex-col bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl overflow-hidden shadow-xs">
      {/* Search Header */}
      <div className="p-3.5 sm:p-4 border-b border-[#E1E4E6] bg-[#FAFBFB] space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#687E8B] absolute top-3 left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('deptSearchPlaceholder')}
            className="w-full text-sm pl-10 pr-9 py-2.5 rounded-xl border border-[#E1E4E6] bg-[#FFFFFF] text-[#0F1E21] placeholder-[#8A9298] focus:outline-none focus:border-[#2C4A52] focus:ring-2 focus:ring-[#2C4A52]/15 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-3 right-3 text-[#5B646B] hover:text-[#0F1E21] p-0.5"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-[#5B646B] px-1">
          <span>
            {complaints.length} {language === 'ur' ? 'شکایات' : 'complaints'}
          </span>
          {searchQuery && (
            <span className="text-[#2C4A52] font-semibold bg-[#F0F4F5] px-2 py-0.5 rounded-md border border-[#D0D9DE]">
              Filtered
            </span>
          )}
        </div>
      </div>

      {/* Complaint Rows */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[calc(100vh-250px)]">
        {complaints.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F6F6] text-[#687E8B] flex items-center justify-center mx-auto mb-2 border border-[#E1E4E6]">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0F1E21]">
              {totalAssignedCount === 0
                ? t('deptEmptyAssigned')
                : t('deptEmptyFilter')}
            </p>
            <p className="text-xs text-[#5B646B] max-w-xs mx-auto leading-relaxed">
              {totalAssignedCount === 0
                ? t('deptEmptyPrompt')
                : 'Try adjusting your search query or status filter.'}
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
                className={`w-full text-left rtl:text-right p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#2C4A52] bg-[#F0F4F5] shadow-xs ring-1 ring-[#2C4A52]/20 border-l-4 rtl:border-l rtl:border-r-4 rtl:border-r-[#122E32] border-l-[#122E32]'
                    : 'border-[#E1E4E6] bg-white hover:bg-[#FAFBFB] hover:border-[#D0D9DE]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-bold tracking-tight text-[#0F1E21]">
                    {c.referenceNumber}
                  </span>
                  {getStatusChip(c.status, language)}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2C4A52] mb-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.locality}</span>
                  <span className="text-[#ACAFB6]">•</span>
                  <span className="text-[#5B646B] font-normal truncate">{formatDate(c.submittedAt)}</span>
                </div>

                <p className="text-xs sm:text-sm text-[#5B646B] line-clamp-2 leading-relaxed">
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
