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
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      labelEn: 'New',
      labelUr: 'نئی',
      icon: Sparkles,
    },
    under_review: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      labelEn: 'Under Review',
      labelUr: 'زیرِ جائزہ',
      icon: Clock,
    },
    assigned: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      labelEn: 'Assigned',
      labelUr: 'تفویض شدہ',
      icon: Clock,
    },
    in_progress: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      labelEn: 'In Progress',
      labelUr: 'زیرِ کارروائی',
      icon: Clock,
    },
    resolved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      labelEn: 'Resolved',
      labelUr: 'حل شدہ',
      icon: CheckCircle2,
    },
    rejected: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      labelEn: 'Closed',
      labelUr: 'بند',
      icon: CheckCircle2,
    },
  };

  const current = styles[status] || styles.submitted;
  const Icon = current.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${current.bg} ${current.text} ${current.border}`}
    >
      <Icon className="w-3 h-3" />
      <span>{language === 'ur' ? current.labelUr : current.labelEn}</span>
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
    <div className="w-full lg:w-96 shrink-0 flex flex-col bg-white/80 backdrop-blur-xl border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-3.5 border-b border-black/[0.08] bg-black/[0.02]">
        <div className="relative rounded-xl overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('deptSearchPlaceholder')}
            className="w-full bg-white border border-black/10 text-xs sm:text-sm text-[#111827] placeholder:text-slate-400 rounded-xl py-2 pl-9 pr-8 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-[#111827] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] divide-y divide-black/[0.06] p-2 space-y-1">
        {complaints.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <div className="text-xs font-bold text-[#111827]">
              {searchQuery ? 'No matching complaints found' : t('deptEmptyAssigned')}
            </div>
            <p className="text-[11px] text-slate-500">
              {searchQuery
                ? 'Try searching with a different reference number or location.'
                : 'No assigned municipal complaints currently in queue.'}
            </p>
          </div>
        ) : (
          complaints.map((item) => {
            const isSelected = selectedReference === item.referenceNumber;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectComplaint(item.referenceNumber)}
                className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer block border ${
                  isSelected
                    ? 'bg-white border-[#111827] shadow-sm ring-1 ring-[#111827]'
                    : 'bg-white/60 hover:bg-white border-transparent hover:border-black/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-[#111827]">
                    {item.referenceNumber}
                  </span>
                  {getStatusChip(item.status, language)}
                </div>

                <div className="text-xs font-bold text-[#111827] truncate mb-1">
                  {item.title || item.locality}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 truncate max-w-[190px]">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.locality}, {item.district}</span>
                  </div>
                  <span className="font-mono text-[10px] shrink-0">
                    {formatDate(item.submittedAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-black/[0.08] bg-black/[0.02] text-[11px] font-bold text-slate-500 text-center">
        {complaints.length} complaints
      </div>
    </div>
  );
};
