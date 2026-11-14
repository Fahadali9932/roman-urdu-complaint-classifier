import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { LayoutGrid, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
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

  // Stepper milestones
  const isSubmittedOrHigher = true;
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

        {/* Classifier Uncertainty Callout */}
        {complaint.status === 'under_review' && (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-purple-200">
                Staff Classification Review Required
              </div>
              <p className="text-slate-300 leading-relaxed">
                The automated classifier held this complaint because confidence was ambiguous
                {complaint.predictionConfidence != null ? ` (${Math.round(complaint.predictionConfidence * 100)}%)` : ''}.
                {complaint.predictedDepartmentId ? ` Preliminary prediction suggested "${complaint.predictedDepartmentId}".` : ''}
                {' '}Authorized staff must review and confirm or assign the responsible department before remediation work can begin.
              </p>
            </div>
          </div>
        )}

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

        {/* 4-Step Progress Stepper */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            PROGRESS WORKFLOW
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
              <div className="text-xs font-semibold text-white">1. Submitted</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {formatDate(complaint.submittedAt)}
              </div>
            </div>

            {/* Step 2: Department Acceptance */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isAcceptedOrHigher
                    ? 'bg-sky-400 ring-sky-400/30'
                    : isRejected
                    ? 'bg-red-400 ring-red-400/30'
                    : 'bg-[#242126] border border-slate-500'
                }`}
              />
              <div className="text-xs font-semibold text-white">
                {isRejected ? '2. Rejected / Closed' : '2. Accepted'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isAcceptedOrHigher
                  ? 'Formally accepted by department'
                  : isRejected
                  ? 'Review completed - Closed'
                  : complaint.status === 'assigned'
                  ? 'Pending department acceptance'
                  : 'Pending'}
              </div>
            </div>

            {/* Step 3: Work In Progress */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isInProgressOrHigher
                    ? 'bg-indigo-400 ring-indigo-400/30'
                    : 'bg-[#242126] border border-slate-500'
                }`}
              />
              <div className="text-xs font-semibold text-white">
                3. In Progress
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isInProgressOrHigher
                  ? 'Field operation active'
                  : 'Pending'}
              </div>
            </div>

            {/* Step 4: Work Done / Resolved */}
            <div className="relative">
              <span
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#151417] ${
                  isWorkDone
                    ? 'bg-emerald-400 ring-emerald-400/30'
                    : 'bg-[#242126] border border-slate-500'
                }`}
              />
              <div className="text-xs font-semibold text-white">4. Work Done</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isWorkDone ? 'Resolved and verified on-ground' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Area: Context-Aware Dynamic Buttons or Read-Only Terminal Banner */}
      <div className="pt-6 mt-6 border-t border-white/[0.08]">
        {/* State A: Pending Acceptance (assigned) */}
        {complaint.status === 'assigned' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Complaint awaiting official department acceptance before work begins.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('accepted')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
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

        {/* State B: Accepted - Ready to start field work */}
        {complaint.status === 'accepted' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Complaint accepted. Ready to deploy field team or begin remediation.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('in_progress')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
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

        {/* State C: In Progress - Field work underway */}
        {complaint.status === 'in_progress' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-400">
              Remediation underway. Mark work completed when verified on-ground.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenStatusModal('rejected')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
              >
                Reject Complaint
              </button>
              <button
                type="button"
                onClick={() => onOpenStatusModal('resolved')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98] bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Mark Work Done
              </button>
            </div>
          </div>
        )}

        {/* State D: Terminal Resolved - Read-only summary banner */}
        {complaint.status === 'resolved' && (
          <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-sm font-bold text-emerald-300">
                Work Completed & Verified on Ground
              </div>
              <p className="text-xs text-slate-300">
                This civic complaint has been successfully remediated and sealed under municipal protocol.
              </p>
              {lastResolvedEvent?.description && (
                <div className="text-xs text-slate-400 pt-2 border-t border-emerald-500/20">
                  <span className="font-semibold text-slate-300">Resolution Note:</span>{' '}
                  <span className="italic">"{lastResolvedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State E: Terminal Rejected - Read-only rejection summary banner */}
        {complaint.status === 'rejected' && (
          <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-sm font-bold text-red-300">
                Complaint Rejected / Closed
              </div>
              <p className="text-xs text-slate-300">
                This complaint was reviewed and determined to be outside actionable jurisdiction.
              </p>
              {lastRejectedEvent?.description && (
                <div className="text-xs text-slate-400 pt-2 border-t border-red-500/20">
                  <span className="font-semibold text-slate-300">Rejection Reason:</span>{' '}
                  <span className="italic">"{lastRejectedEvent.description}"</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State F: under_review — Explicit Classification Review Workflow */}
        {complaint.status === 'under_review' && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-purple-300">
              Uncertain classification held in review queue. Review and assign responsible department.
            </div>
            <button
              type="button"
              onClick={onOpenReviewModal || (() => onOpenStatusModal())}
              className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 hover:brightness-110 active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review & Assign Department</span>
            </button>
          </div>
        )}

        {/* State G: Initial submitted fallback */}
        {complaint.status === 'submitted' && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpenStatusModal()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
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
