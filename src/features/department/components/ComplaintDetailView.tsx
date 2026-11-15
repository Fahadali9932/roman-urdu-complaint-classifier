import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import {
  LayoutGrid,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { getDisplayStatusBadge } from './ComplaintInboxList';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: (actionStatus?: ComplaintStatus) => void;
  onQuickStatusUpdate?: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
  onOpenReviewModal?: () => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  onOpenStatusModal,
  onBackToList,
  onOpenReviewModal,
}) => {
  const { language } = useLanguage();

  if (!complaint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-0 select-none">
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-slate-400">
          <LayoutGrid className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No complaint selected</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Select a complaint from the list to review details and update progress.
        </p>
      </div>
    );
  }

  const badge = getDisplayStatusBadge(complaint.status);
  const locationText = complaint.locality
    ? `${complaint.locality} · ${complaint.district}`
    : complaint.district || 'Karachi Municipal Jurisdiction';

  const hasValidLandmark =
    complaint.publicLocation &&
    !/^(none|null|n\/a|-|undefined|nan)$/i.test(complaint.publicLocation.trim());

  // Format date cleanly
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Stepper milestones
  const isAcceptedOrHigher =
    complaint.status === 'accepted' ||
    complaint.status === 'in_progress' ||
    complaint.status === 'resolved';
  const isInProgressOrHigher =
    complaint.status === 'in_progress' || complaint.status === 'resolved';
  const isWorkDone = complaint.status === 'resolved';
  const isRejected = complaint.status === 'rejected';

  // Last timeline events for notes display
  const lastResolvedEvent = isWorkDone
    ? [...complaint.timeline].reverse().find((e) => e.status === 'resolved')
    : null;
  const lastRejectedEvent = isRejected
    ? [...complaint.timeline].reverse().find((e) => e.status === 'rejected')
    : null;

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto min-h-0 dept-custom-scrollbar">
      <div className="space-y-4 max-w-3xl">
        {/* Mobile Back Button */}
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to list</span>
          </button>
        )}

        {/* 1. Primary Header: Heading (Prominently once) + Metadata Strip */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug flex-1">
              {complaint.generatedHeading || complaint.title || 'Municipal Complaint'}
            </h2>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Compact Metadata Row */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
            <span className="text-slate-300 font-semibold tracking-tight">
              {complaint.referenceNumber}
            </span>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1 font-sans text-slate-400 text-[11px]">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formatDate(complaint.submittedAt)}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1 font-sans text-slate-400 text-[11px]">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{locationText}</span>
              {hasValidLandmark && (
                <span className="text-slate-500">({complaint.publicLocation})</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Compact Classification Review Notice (when held under_review) */}
        {complaint.status === 'under_review' && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-[200px] flex-1">
              <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-purple-200 mr-1.5">
                  Department Review Needed
                </span>
                <span className="text-slate-300">
                  The correct department needs confirmation. Please review the complaint before assigning it.
                </span>
              </div>
            </div>
            {onOpenReviewModal && (
              <button
                type="button"
                onClick={onOpenReviewModal}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assign Department</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Short Factual Summary Paragraph */}
        {complaint.factualSummary && (
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-400 tracking-wide">
              Summary
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {complaint.factualSummary}
            </p>
          </div>
        )}

        {/* 4. Full Sanitized Complaint (Strictly zero PII) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              Sanitized Complaint
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
              <ShieldCheck className="w-2.5 h-2.5" />
              PII Protected
            </span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1.5">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {complaint.sanitizedDescription || complaint.description}
            </p>
            {complaint.redactionNeedsReview && (
              <div className="pt-1.5 border-t border-white/[0.04] flex items-center gap-1.5 text-[11px] text-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Notice: Ambiguous address phrase flagged for review.</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Compact Progress Workflow Indicator */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="text-[11px] font-medium text-slate-400 tracking-wide">
            Progress Workflow
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Step 1: Submitted */}
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--dept-accent)]" />
                <span className="text-xs font-semibold text-white">Submitted</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {formatDate(complaint.submittedAt)}
              </div>
            </div>

            {/* Step 2: Accepted / Rejected */}
            <div
              className={`p-2 rounded-lg border ${
                isAcceptedOrHigher
                  ? 'bg-sky-500/10 border-sky-500/25'
                  : isRejected
                  ? 'bg-rose-500/10 border-rose-500/25'
                  : 'bg-white/[0.02] border-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAcceptedOrHigher
                      ? 'bg-sky-400'
                      : isRejected
                      ? 'bg-rose-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-white">
                  {isRejected ? 'Rejected' : 'Accepted'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isAcceptedOrHigher
                  ? 'Department accepted'
                  : isRejected
                  ? 'Complaint closed'
                  : complaint.status === 'assigned'
                  ? 'Pending review'
                  : 'Pending'}
              </div>
            </div>

            {/* Step 3: In Progress */}
            <div
              className={`p-2 rounded-lg border ${
                isInProgressOrHigher
                  ? 'bg-blue-500/10 border-blue-500/25'
                  : 'bg-white/[0.02] border-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isInProgressOrHigher ? 'bg-blue-400' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-white">In Progress</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isInProgressOrHigher ? 'Field work active' : 'Pending'}
              </div>
            </div>

            {/* Step 4: Work Done */}
            <div
              className={`p-2 rounded-lg border ${
                isWorkDone
                  ? 'bg-emerald-500/10 border-emerald-500/25'
                  : 'bg-white/[0.02] border-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWorkDone ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-white">Work Done</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isWorkDone ? 'Resolved on ground' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Contextual Action Footer */}
      <div className="pt-4 mt-4 border-t border-white/[0.06] shrink-0">
        {/* State A: Pending Acceptance (assigned) */}
        {complaint.status === 'assigned' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Awaiting department acceptance before work begins.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-3.5 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-white/5 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-white/10"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('accepted')}
                className="px-4 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--dept-accent)',
                  color: '#151417',
                }}
              >
                Accept Complaint
              </button>
            </div>
          </div>
        )}

        {/* State B: Accepted */}
        {complaint.status === 'accepted' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Complaint accepted. Ready to deploy field team.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-3.5 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-white/5 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-white/10"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('in_progress')}
                className="px-4 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--dept-accent)',
                  color: '#151417',
                }}
              >
                Start Work
              </button>
            </div>
          </div>
        )}

        {/* State C: In Progress */}
        {complaint.status === 'in_progress' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Field operation active. Mark completed when verified.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-3.5 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-white/5 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-white/10"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('resolved')}
                className="px-4 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-[0.98] bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                Mark Work Done
              </button>
            </div>
          </div>
        )}

        {/* State D: Terminal Resolved */}
        {complaint.status === 'resolved' && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0 flex-1 text-xs">
              <div className="font-semibold text-emerald-300">
                Work Completed & Verified on Ground
              </div>
              <p className="text-slate-400 leading-normal">
                This civic complaint has been successfully remediated and verified under municipal protocol.
              </p>
              {lastResolvedEvent?.description && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-emerald-500/15 mt-1">
                  <span className="font-medium text-slate-300">Resolution Note:</span>{' '}
                  <span className="italic">"{lastResolvedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State E: Terminal Rejected */}
        {complaint.status === 'rejected' && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0 flex-1 text-xs">
              <div className="font-semibold text-rose-300">
                Complaint Rejected / Closed
              </div>
              <p className="text-slate-400 leading-normal">
                This complaint was reviewed and determined to be outside actionable jurisdiction.
              </p>
              {lastRejectedEvent?.description && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-rose-500/15 mt-1">
                  <span className="font-medium text-slate-300">Rejection Reason:</span>{' '}
                  <span className="italic">"{lastRejectedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State F: under_review */}
        {complaint.status === 'under_review' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-purple-300">
              The correct department needs confirmation. Please review the complaint before assigning it.
            </div>
            <button
              type="button"
              onClick={onOpenReviewModal || (() => onOpenStatusModal())}
              className="px-4 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 active:scale-[0.98]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Assign Department</span>
            </button>
          </div>
        )}

        {/* State G: Initial submitted fallback */}
        {complaint.status === 'submitted' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpenStatusModal()}
              className="px-4 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--dept-accent)',
                color: '#151417',
              }}
            >
              Review complaint
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
