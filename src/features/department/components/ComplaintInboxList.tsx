import React from 'react';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { FileText } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  accentColor?: string;
}

export const getDisplayStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case 'submitted':
    case 'under_review':
      return {
        label: 'New',
        className: 'bg-white/10 text-slate-300 border border-white/15',
      };
    case 'assigned':
      return {
        label: 'Accepted',
        className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
      };
    case 'resolved':
      return {
        label: 'Work Done',
        className: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-500/15 text-red-300 border border-red-500/30',
      };
    default:
      return {
        label: status,
        className: 'bg-white/10 text-slate-300 border border-white/15',
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[460px]">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400">
          <FileText className="w-6 h-6 text-amber-200/70" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">No complaints yet</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          New complaints assigned to your department will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.07] overflow-y-auto max-h-[620px] dept-custom-scrollbar">
      {complaints.map((c) => {
        const isSelected = selectedReference === c.referenceNumber;
        const badge = getDisplayStatusBadge(c.status);
        const locationText = c.locality
          ? `${c.locality} · ${c.district}`
          : c.district || 'Karachi';

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectComplaint(c.referenceNumber)}
            className={`w-full p-4 sm:p-5 flex items-start justify-between gap-3 text-left transition-all cursor-pointer ${
              isSelected
                ? 'dept-row-active bg-white/[0.04]'
                : 'hover:bg-white/[0.03]'
            }`}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white tracking-tight">
                  {c.referenceNumber}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-300 line-clamp-2 leading-relaxed">
                {c.description}
              </p>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <span>{locationText}</span>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
