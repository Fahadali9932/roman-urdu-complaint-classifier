import React from 'react';
import { CheckCircle2, CircleDot, Clock3, Inbox, MapPin, Search, X } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { type ComplaintStatus, type DepartmentComplaintView } from '../../../types';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  totalAssignedCount: number;
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const getStatusChip = (status: ComplaintStatus, language: 'en' | 'ur') => {
  const labels: Record<ComplaintStatus, { en: string; ur: string; icon: React.ComponentType<{ className?: string }> }> = {
    submitted: { en: 'New', ur: 'نئی', icon: CircleDot },
    under_review: { en: 'Under Review', ur: 'زیرِ جائزہ', icon: Clock3 },
    assigned: { en: 'Assigned', ur: 'تفویض شدہ', icon: Clock3 },
    in_progress: { en: 'In Progress', ur: 'زیرِ کارروائی', icon: Clock3 },
    resolved: { en: 'Resolved', ur: 'حل شدہ', icon: CheckCircle2 },
    rejected: { en: 'Closed', ur: 'بند', icon: CheckCircle2 },
  };
  const current = labels[status] || labels.submitted;
  const Icon = current.icon;
  const resolved = status === 'resolved';
  const closed = status === 'rejected';
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ' + (resolved ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : closed ? 'border-slate-200 bg-slate-50 text-slate-600' : 'dept-status-chip')}>
      <Icon className="h-3 w-3" />
      <span>{language === 'ur' ? current.ur : current.en}</span>
    </span>
  );
};

export const ComplaintInboxList: React.FC<ComplaintInboxListProps> = ({ complaints, totalAssignedCount, selectedReference, onSelectComplaint, searchQuery, onSearchChange }) => {
  const { language, t } = useLanguage();
  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return value;
    }
  };

  return (
    <div className="dept-panel flex h-full min-h-[520px] flex-col overflow-hidden">
      <div className="border-b border-[var(--dept-border)] bg-[var(--dept-panel)] p-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--dept-muted)] rtl:left-auto rtl:right-3" />
          <input type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder={t('deptSearchPlaceholder')} className="dept-input h-10 pl-9 pr-9 text-sm rtl:pr-9 rtl:pl-9" />
          {searchQuery && <button type="button" onClick={() => onSearchChange('')} className="absolute right-2.5 top-2.5 rounded p-0.5 text-[var(--dept-muted)] hover:text-[var(--dept-ink)] rtl:right-auto rtl:left-2.5" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </div>
        <div className="mt-3 flex items-center justify-between px-0.5 text-xs font-medium text-[var(--dept-muted)]">
          <span>{complaints.length} {language === 'ur' ? 'شکایات' : 'complaints'}</span>
          {searchQuery && <span className="text-[var(--dept-primary)]">{language === 'ur' ? 'فلٹر شدہ' : 'Filtered'}</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-[var(--dept-border)] overflow-y-auto">
        {complaints.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dept-tint)] text-[var(--dept-primary)]"><Inbox className="h-5 w-5" /></span>
            <p className="text-sm font-bold text-[var(--dept-ink)]">{totalAssignedCount === 0 ? t('deptEmptyAssigned') : t('deptEmptyFilter')}</p>
            {totalAssignedCount > 0 && <p className="mt-1 text-xs leading-5 text-[var(--dept-muted)]">{language === 'ur' ? 'تلاش یا سٹیٹس فلٹر تبدیل کر کے دوبارہ کوشش کریں۔' : 'Try a different search or status filter.'}</p>}
          </div>
        ) : complaints.map((complaint) => {
          const selected = selectedReference === complaint.referenceNumber;
          return (
            <button key={complaint.id} type="button" onClick={() => onSelectComplaint(complaint.referenceNumber)} className={'dept-focus-border w-full px-4 py-4 text-left transition-colors rtl:text-right ' + (selected ? 'dept-selected-row' : 'bg-white hover:bg-[var(--dept-panel)]')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[var(--dept-muted)]">{complaint.referenceNumber}</span>
                {getStatusChip(complaint.status, language)}
              </div>
              <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--dept-ink)]">{complaint.title}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--dept-muted)]">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--dept-primary)]" />
                <span className="truncate">{complaint.locality}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{formatDate(complaint.submittedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
