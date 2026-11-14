import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { LayoutGrid, ArrowLeft } from 'lucide-react';
import { getDisplayStatusBadge } from './ComplaintInboxList';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: () => void;
  onQuickStatusUpdate?: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  onOpenStatusModal,
  onBackToList,
}) => {
  const { language } = useLanguage();

  if (!complaint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400">
          <LayoutGrid className="w-6 h-6 text-amber-200/70" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">No complaint selected</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Select a complaint when it arrives to view details and update progress.
        </p>
      </div>
    );
  }

  const badge = getDisplayStatusBadge(complaint.status);
  const locationText = complaint.locality
    ? `${complaint.locality} · ${complaint.district}`
    : complaint.district || 'Karachi Municipal Jurisdiction';

  // Format date cleanly
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const isSubmittedOrHigher = true;
  const isInProgressOrHigher =
    complaint.status === 'in_progress' || complaint.status === 'resolved';
  const isWorkDone = complaint.status === 'resolved';
  const isRejected = complaint.status === 'rejected';

  return (
    <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto min-h-0 dept-custom-scrollbar">
      <div className="space-y-5">
        {/* Mobile Back Button */}
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="lg:hidden flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to list</span>
          </button>
        )}

        {/* Top Header Row: Reference & Status Pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            {complaint.referenceNumber}
          </h2>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Public Incident Location Section (STRICTLY NO CITIZEN PRIVATE ADDRESS) */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            PUBLIC INCIDENT LOCATION
          </div>
          <div className="text-sm font-semibold text-slate-100">
            {locationText}
          </div>
          {complaint.publicLocation && (
            <div className="text-xs text-slate-400 mt-0.5">
              Landmark / Location: {complaint.publicLocation}
            </div>
          )}
        </div>

        <hr className="border-0 border-t border-white/[0.08]" />

        {/* Sanitized Complaint Text (STRICTLY NO CITIZEN PII) */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            COMPLAINT
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-normal">
            {complaint.description}
          </p>
        </div>

        <hr className="border-0 border-t border-white/[0.08]" />

        {/* Progress Timeline Stepper */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            PROGRESS
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/15">
            {/* Step 1: Submitted */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isSubmittedOrHigher
                    ? 'bg-[var(--dept-accent)] ring-[var(--dept-accent)]/30'
                    : 'bg-slate-600'
                }`}
              />
              <div className="text-xs font-semibold text-white">Submitted</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {formatDate(complaint.submittedAt)}
              </div>
            </div>

            {/* Step 2: Work Started / In Progress */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isInProgressOrHigher
                    ? 'bg-[var(--dept-accent)] ring-[var(--dept-accent)]/30'
                    : 'bg-[#242126] border border-slate-500'
                }`}
              />
              <div className="text-xs font-semibold text-white">
                {isRejected ? 'Rejected / Closed' : 'Work Started'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isInProgressOrHigher
                  ? 'Field operation active'
                  : isRejected
                  ? 'Review completed - Not actionable'
                  : 'Pending'}
              </div>
            </div>

            {/* Step 3: Work Done / Resolved */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isWorkDone
                    ? 'bg-emerald-400 ring-emerald-400/30'
                    : 'bg-[#242126] border border-slate-500'
                }`}
              />
              <div className="text-xs font-semibold text-white">Work Done</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isWorkDone ? 'Resolved and verified on-ground' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pt-6 mt-6 border-t border-white/[0.08] flex justify-end">
        <button
          type="button"
          onClick={onOpenStatusModal}
          className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--dept-accent)',
            color: '#151417',
          }}
        >
          Review complaint
        </button>
      </div>
    </div>
  );
};
