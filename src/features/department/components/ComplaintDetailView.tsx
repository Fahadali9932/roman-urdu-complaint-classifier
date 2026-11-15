import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import {
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
      <div className="w-full py-20 flex flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] flex items-center justify-center mb-3 text-[var(--dept-text-muted)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[var(--dept-text-primary)] mb-1">
          No complaint selected
        </h3>
        <p className="text-xs text-[var(--dept-text-secondary)] max-w-sm leading-relaxed mb-4">
          Select a complaint from the list to review details and update progress.
        </p>
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--dept-accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Complaints
          </button>
        )}
      </div>
    );
  }

  const badge = getDisplayStatusBadge(complaint.status);
  const locationText = complaint.locality
    ? `${complaint.locality}, ${complaint.district}`
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
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 px-2 sm:px-6 space-y-6">
      {/* Top Navigation: Clear Back to Complaints Button */}
      {onBackToList && (
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--dept-accent)] hover:underline cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Complaints</span>
          </button>
        </div>
      )}

      {/* 1. Complaint Header Card */}
      <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--dept-text-primary)] tracking-tight leading-snug">
              {complaint.generatedHeading || complaint.title || 'Municipal Complaint'}
            </h1>
            <div className="flex items-center gap-2.5 text-xs text-[var(--dept-text-secondary)] flex-wrap pt-0.5">
              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-[var(--dept-text-primary)]">
                {complaint.referenceNumber}
              </span>
              <span className="text-[var(--dept-border-strong)]">·</span>
              <div className="flex items-center gap-1.5 text-[var(--dept-text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--dept-text-muted)]" />
                <span>Submitted {formatDate(complaint.submittedAt)}</span>
              </div>
              <span className="text-[var(--dept-border-strong)]">·</span>
              <div className="flex items-center gap-1.5 text-[var(--dept-text-secondary)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--dept-text-muted)]" />
                <span>{locationText}</span>
                {hasValidLandmark && (
                  <span className="text-[var(--dept-text-muted)]">
                    ({complaint.publicLocation})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span
              className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border shadow-2xs ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* 2. Review Queue Notice (if under_review) */}
        {complaint.status === 'under_review' && (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-[220px] flex-1">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <div className="font-bold text-purple-900 dark:text-purple-200">
                  Department Review Needed
                </div>
                <div className="text-purple-700 dark:text-purple-300 mt-0.5 leading-relaxed">
                  The correct department needs confirmation. Please review this complaint and assign it to the appropriate department.
                </div>
              </div>
            </div>
            {onOpenReviewModal && (
              <button
                type="button"
                onClick={onOpenReviewModal}
                className="px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shrink-0 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Assign Department</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Summary & Original Sanitized Complaint Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Section A: Factual Summary */}
        {complaint.factualSummary && (
          <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
              Summary
            </h2>
            <p className="text-sm sm:text-base text-[var(--dept-text-primary)] leading-relaxed font-normal">
              {complaint.factualSummary}
            </p>
          </div>
        )}

        {/* Section B: Sanitized Original Complaint */}
        <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--dept-border)] pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
              Complaint — Personal Details Removed
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PII Protected</span>
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] space-y-2">
            <p className="text-sm sm:text-base text-[var(--dept-text-primary)] leading-relaxed font-sans">
              {complaint.sanitizedDescription || complaint.description}
            </p>
            {complaint.redactionNeedsReview && (
              <div className="pt-2 border-t border-[var(--dept-border)] flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Notice: Ambiguous address phrase flagged for review.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Progress & Timeline Card */}
      <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
          Progress Workflow
        </h2>

        {/* 4-Milestone Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Step 1: Submitted */}
          <div className="p-3 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--dept-accent)]" />
              <span className="text-xs font-bold text-[var(--dept-text-primary)]">Submitted</span>
            </div>
            <div className="text-[11px] text-[var(--dept-text-muted)]">
              {formatDate(complaint.submittedAt)}
            </div>
          </div>

          {/* Step 2: Accepted / Rejected */}
          <div
            className={`p-3 rounded-lg border ${
              isAcceptedOrHigher
                ? 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800'
                : isRejected
                ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800'
                : 'bg-[var(--dept-surface-subtle)] border-[var(--dept-border)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAcceptedOrHigher
                    ? 'bg-sky-600'
                    : isRejected
                    ? 'bg-rose-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold text-[var(--dept-text-primary)]">
                {isRejected ? 'Rejected' : 'Accepted'}
              </span>
            </div>
            <div className="text-[11px] text-[var(--dept-text-muted)]">
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
            className={`p-3 rounded-lg border ${
              isInProgressOrHigher
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                : 'bg-[var(--dept-surface-subtle)] border-[var(--dept-border)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isInProgressOrHigher ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold text-[var(--dept-text-primary)]">
                In Progress
              </span>
            </div>
            <div className="text-[11px] text-[var(--dept-text-muted)]">
              {isInProgressOrHigher ? 'Field work active' : 'Pending'}
            </div>
          </div>

          {/* Step 4: Work Done */}
          <div
            className={`p-3 rounded-lg border ${
              isWorkDone
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                : 'bg-[var(--dept-surface-subtle)] border-[var(--dept-border)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isWorkDone ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold text-[var(--dept-text-primary)]">
                Work Done
              </span>
            </div>
            <div className="text-[11px] text-[var(--dept-text-muted)]">
              {isWorkDone ? 'Resolved on ground' : 'Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Contextual Actions Card / Banner */}
      <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-5 sm:p-6 shadow-xs">
        {/* State A: Pending Acceptance (assigned) */}
        {complaint.status === 'assigned' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[var(--dept-text-primary)]">
                Awaiting Department Acceptance
              </div>
              <div className="text-xs text-[var(--dept-text-secondary)]">
                Review jurisdiction and accept to assign field workers, or reject if non-actionable.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-[var(--dept-surface-subtle)] hover:bg-rose-50 text-[var(--dept-text-secondary)] hover:text-rose-700 border border-[var(--dept-border)] dark:hover:bg-rose-950/40"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('accepted')}
                className="px-5 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-[var(--dept-accent)] hover:opacity-90 text-white"
              >
                Accept Complaint
              </button>
            </div>
          </div>
        )}

        {/* State B: Accepted */}
        {complaint.status === 'accepted' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[var(--dept-text-primary)]">
                Complaint Accepted
              </div>
              <div className="text-xs text-[var(--dept-text-secondary)]">
                Ready to deploy team. Mark in-progress when field crew begins work.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-[var(--dept-surface-subtle)] hover:bg-rose-50 text-[var(--dept-text-secondary)] hover:text-rose-700 border border-[var(--dept-border)] dark:hover:bg-rose-950/40"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('in_progress')}
                className="px-5 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-[var(--dept-accent)] hover:opacity-90 text-white"
              >
                Start Work
              </button>
            </div>
          </div>
        )}

        {/* State C: In Progress */}
        {complaint.status === 'in_progress' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[var(--dept-text-primary)]">
                Field Operations In Progress
              </div>
              <div className="text-xs text-[var(--dept-text-secondary)]">
                Crew is currently actively remediating this incident. Mark resolved upon verification.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer bg-[var(--dept-surface-subtle)] hover:bg-rose-50 text-[var(--dept-text-secondary)] hover:text-rose-700 border border-[var(--dept-border)] dark:hover:bg-rose-950/40"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('resolved')}
                className="px-5 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Mark Work Done
              </button>
            </div>
          </div>
        )}

        {/* State D: Terminal Resolved */}
        {complaint.status === 'resolved' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1 text-xs sm:text-sm">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                Work Completed & Verified on Ground
              </div>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                This civic complaint has been successfully remediated and verified under municipal protocol.
              </p>
              {lastResolvedEvent?.description && (
                <div className="text-xs text-emerald-900 dark:text-emerald-200 pt-2 border-t border-emerald-200 dark:border-emerald-800/50 mt-2">
                  <span className="font-semibold">Resolution Note:</span>{' '}
                  <span className="italic">"{lastResolvedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State E: Terminal Rejected */}
        {complaint.status === 'rejected' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1 text-xs sm:text-sm">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                Complaint Rejected / Closed
              </div>
              <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                This complaint was reviewed and determined to be outside actionable jurisdiction.
              </p>
              {lastRejectedEvent?.description && (
                <div className="text-xs text-rose-900 dark:text-rose-200 pt-2 border-t border-rose-200 dark:border-rose-800/50 mt-2">
                  <span className="font-semibold">Rejection Reason:</span>{' '}
                  <span className="italic">"{lastRejectedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State F: under_review */}
        {complaint.status === 'under_review' && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs sm:text-sm text-purple-900 dark:text-purple-200">
              The correct department needs confirmation. Please review this complaint and assign it to the appropriate department.
            </div>
            <button
              type="button"
              onClick={onOpenReviewModal || (() => onOpenStatusModal())}
              className="px-5 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
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
              className="px-5 py-2 rounded-lg font-semibold text-xs tracking-tight transition-all cursor-pointer shadow-sm bg-[var(--dept-accent)] text-white hover:opacity-90"
            >
              Review complaint
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
