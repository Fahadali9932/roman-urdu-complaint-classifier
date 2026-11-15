import React from 'react';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Inbox } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  accentColor?: string;
}

export const getDisplayStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case 'under_review':
      return {
        label: 'Needs Review',
        className: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
      };
    case 'submitted':
      return {
        label: 'New',
        className: 'bg-white/5 text-slate-400 border border-white/10',
      };
    case 'assigned':
      return {
        label: 'Pending Acceptance',
        className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      };
    case 'accepted':
      return {
        label: 'Accepted',
        className: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
      };
    case 'resolved':
      return {
        label: 'Work Done',
        className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
      };
    default:
      return {
        label: status,
        className: 'bg-white/5 text-slate-400 border border-white/10',
      };
  }
};

export const ComplaintInboxList: React.FC<ComplaintInboxListProps> = ({
  complaints,
  selectedReference,
  onSelectComplaint,
}) => {
  if (complaints.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0 select-none">
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-slate-400">
          <Inbox className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No complaints yet</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          New complaints assigned to your department will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Complaints List"
      className="flex-1 divide-y divide-white/[0.05] overflow-y-auto min-h-0 dept-custom-scrollbar"
    >
      {complaints.map((c) => {
        const isSelected = selectedReference === c.referenceNumber;
        const badge = getDisplayStatusBadge(c.status);
        const locationText = c.locality
          ? `${c.locality} · ${c.district}`
          : c.district || 'Karachi';

        const summaryPreview = c.factualSummary || c.sanitizedDescription || c.description;

        return (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelectComplaint(c.referenceNumber)}
            className={`w-full px-3.5 py-3 text-left transition-colors cursor-pointer group flex flex-col gap-1 border-l-[3px] ${
              isSelected
                ? 'bg-white/[0.06] border-[var(--dept-accent)]'
                : 'border-transparent hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none'
            }`}
          >
            {/* Top Line: Heading + Status Pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-xs sm:text-[13px] text-white tracking-tight truncate flex-1">
                {c.generatedHeading || c.title || 'Municipal Complaint'}
              </span>
              <span
                className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Middle Line: Short 1-line Summary Preview */}
            <p className="text-xs text-slate-400 truncate leading-snug">
              {summaryPreview}
            </p>

            {/* Bottom Line: Quiet Reference + Location */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="text-slate-400 tracking-tight">{c.referenceNumber}</span>
              <span className="text-slate-500">·</span>
              <span className="font-sans text-slate-400 truncate">{locationText}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
