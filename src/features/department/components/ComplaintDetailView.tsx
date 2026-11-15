import React, { useState } from 'react';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import {
  calculateComplaintPriority,
  formatPakistanDateTime,
  type PriorityLevel,
} from '../../../lib/priority-engine';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Activity,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { getDisplayStatusBadge, getPriorityBadge } from './ComplaintInboxList';
import { PriorityOverrideModal } from './PriorityOverrideModal';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: (actionStatus?: ComplaintStatus) => void;
  onQuickStatusUpdate?: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
  onOpenReviewModal?: () => void;
  onOverridePriority?: (refNumber: string, newPriority: PriorityLevel, reason: string) => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  onOpenStatusModal,
  onBackToList,
  onOpenReviewModal,
  onOverridePriority,
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

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

  const statusBadge = getDisplayStatusBadge(complaint.status);
  const priorityEval = calculateComplaintPriority(complaint);
  const priorityBadge = getPriorityBadge(priorityEval.priority);
  const exactSubmissionTime = formatPakistanDateTime(complaint.submittedAt);

  const locationText = complaint.locality
    ? `${complaint.locality}, ${complaint.district}`
    : complaint.district || 'Karachi Municipal Jurisdiction';

  const hasValidLandmark =
    complaint.publicLocation &&
    !/^(none|null|n\/a|-|undefined|nan)$/i.test(complaint.publicLocation.trim());

  // Stepper milestones
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
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 px-2 sm:px-6 space-y-5">
      {/* Top Navigation & Back Button */}
      {onBackToList && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Complaints</span>
          </button>

          <span className="text-xs text-[var(--dept-text-muted)] font-mono">
            ID: {complaint.referenceNumber}
          </span>
        </div>
      )}

      {/* Persistent Complaint Header Card */}
      <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            {/* Meta Row: Ref, Status, Language */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-[var(--dept-text-primary)]">
                {complaint.referenceNumber}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
              <span className="text-[11px] text-[var(--dept-text-muted)] uppercase tracking-wider font-semibold">
                {complaint.detectedLanguage === 'roman_urdu' ? 'Roman Urdu Intake' : complaint.detectedLanguage}
              </span>
            </div>

            {/* Complaint Title / Heading */}
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--dept-text-primary)] tracking-tight leading-snug">
              {complaint.generatedHeading || complaint.title || 'Municipal Complaint'}
            </h1>

            {/* Public Incident Location & Submission Timestamp */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--dept-text-secondary)] pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0" />
                <span>{locationText}</span>
                {hasValidLandmark && (
                  <span className="text-[var(--dept-text-muted)]">· Near {complaint.publicLocation}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0" />
                <span>Submitted: {exactSubmissionTime}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Header Slot */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {complaint.status === 'assigned' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenStatusModal('accepted')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--dept-accent)] hover:opacity-90 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Complaint</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenStatusModal('rejected')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                >
                  <span>Reject Complaint / Not Actionable</span>
                </button>
              </>
            )}

            {complaint.status === 'accepted' && (
              <button
                type="button"
                onClick={() => onOpenStatusModal('in_progress')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--dept-accent)] hover:opacity-90 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Start Work</span>
              </button>
            )}

            {complaint.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => onOpenStatusModal('resolved')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Work Done</span>
              </button>
            )}

            {complaint.status === 'under_review' && onOpenReviewModal && (
              <button
                type="button"
                onClick={onOpenReviewModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Assign Department</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accessible Radix Tabs Container */}
      <Tabs.Root
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full space-y-4"
      >
        {/* Tab Navigation List */}
        <Tabs.List
          aria-label="Complaint Details"
          className="flex items-center gap-2 border-b border-[var(--dept-border)] pb-1 overflow-x-auto dept-scrollbar"
        >
          <Tabs.Trigger
            id="tab-overview"
            value="overview"
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] ${
              selectedTab === 'overview'
                ? 'border-[var(--dept-accent)] text-[var(--dept-accent)] bg-[var(--dept-surface)] shadow-xs'
                : 'border-transparent text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            id="tab-full_complaint"
            value="full_complaint"
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] ${
              selectedTab === 'full_complaint'
                ? 'border-[var(--dept-accent)] text-[var(--dept-accent)] bg-[var(--dept-surface)] shadow-xs'
                : 'border-transparent text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Full Complaint</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            id="tab-progress"
            value="progress"
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] ${
              selectedTab === 'progress'
                ? 'border-[var(--dept-accent)] text-[var(--dept-accent)] bg-[var(--dept-surface)] shadow-xs'
                : 'border-transparent text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Progress ({complaint.timeline.length})</span>
          </Tabs.Trigger>

          <Tabs.Trigger
            id="tab-priority"
            value="priority"
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] ${
              selectedTab === 'priority'
                ? 'border-[var(--dept-accent)] text-[var(--dept-accent)] bg-[var(--dept-surface)] shadow-xs'
                : 'border-transparent text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Priority</span>
            {priorityEval.qualifiesForPriorityQueue && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Tabs.Trigger>
        </Tabs.List>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================== */}
        <Tabs.Content value="overview" className="space-y-4 focus-visible:outline-none">
          {/* Resolved Outcome Banner */}
          {isWorkDone && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-200">
                  Work Completed &amp; Verified on Ground
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {lastResolvedEvent?.description || 'Municipal remediation has concluded successfully.'}
                </p>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 pt-1">
                  Resolved on: {lastResolvedEvent ? formatPakistanDateTime(lastResolvedEvent.timestamp) : exactSubmissionTime}
                </div>
              </div>
            </div>
          )}

          {/* Rejected Outcome Banner */}
          {isRejected && (
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">
                  Complaint Closed (RESOLVED)
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {lastRejectedEvent?.description || 'This complaint has concluded its municipal workflow.'}
                </p>
              </div>
            </div>
          )}

          {/* Factual Summary Card */}
          <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--dept-text-primary)] uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[var(--dept-accent)]" />
              <span>Factual Operational Overview</span>
            </div>
            <p className="text-sm text-[var(--dept-text-primary)] leading-relaxed">
              {complaint.factualSummary || complaint.sanitizedDescription || complaint.description}
            </p>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                Administrative District
              </span>
              <p className="text-sm font-semibold text-[var(--dept-text-primary)]">
                {complaint.district || 'Karachi District'}
              </p>
            </div>

            <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                Locality / Sub-Town
              </span>
              <p className="text-sm font-semibold text-[var(--dept-text-primary)]">
                {complaint.locality || 'General Jurisdiction'}
              </p>
            </div>

            <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                Public Landmark
              </span>
              <p className="text-sm font-semibold text-[var(--dept-text-primary)] truncate">
                {hasValidLandmark ? complaint.publicLocation : 'No landmark supplied'}
              </p>
            </div>
          </div>
        </Tabs.Content>

        {/* ============================================================== */}
        {/* TAB 2: FULL COMPLAINT */}
        {/* ============================================================== */}
        <Tabs.Content value="full_complaint" className="space-y-4 focus-visible:outline-none">
          {/* Privacy Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-[var(--dept-text-primary)]">
                Citizen Privacy &amp; PII Shield Active
              </div>
              <p className="text-[var(--dept-text-secondary)] leading-relaxed">
                All citizen contact identifiers (Phone number, CNIC, and personal residential address) have been redacted
                and sealed in the private citizen vault. Municipal staff inspect only incident descriptions and public landmarks.
              </p>
            </div>
          </div>

          {/* Full Narrative Card */}
          <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[var(--dept-text-muted)] uppercase tracking-wider">
              Sanitized Complaint Narrative (Roman Urdu / English)
            </h3>
            <div className="text-sm text-[var(--dept-text-primary)] leading-relaxed whitespace-pre-wrap font-sans bg-[var(--dept-surface-subtle)]/50 p-4 rounded-xl border border-[var(--dept-border)]">
              {complaint.sanitizedDescription || complaint.description}
            </div>
          </div>
        </Tabs.Content>

        {/* ============================================================== */}
        {/* TAB 3: PROGRESS */}
        {/* ============================================================== */}
        <Tabs.Content value="progress" className="space-y-4 focus-visible:outline-none">
          <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--dept-text-muted)] uppercase tracking-wider">
                Official Municipal Workflow Timeline
              </h3>
              <span className="text-xs text-[var(--dept-text-muted)]">
                {complaint.timeline.length} Recorded Milestones
              </span>
            </div>

            {/* Chronological Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--dept-border)]">
              {complaint.timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative flex items-start gap-3.5 group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[var(--dept-surface)] border-2 border-[var(--dept-accent)] flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--dept-accent)]" />
                  </div>

                  <div className="space-y-1 w-full bg-[var(--dept-surface-subtle)] p-3.5 rounded-xl border border-[var(--dept-border)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-xs text-[var(--dept-text-primary)]">
                        {event.title}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--dept-text-muted)]">
                        {formatPakistanDateTime(event.timestamp)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-[var(--dept-text-secondary)] leading-relaxed">
                        {event.description}
                      </p>
                    )}
                    <div className="text-[10px] text-[var(--dept-text-muted)] uppercase font-semibold pt-1">
                      Actor: {event.actorRole.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>

        {/* ============================================================== */}
        {/* TAB 4: PRIORITY */}
        {/* ============================================================== */}
        <Tabs.Content value="priority" className="space-y-4 focus-visible:outline-none">
          <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[var(--dept-accent)]" />
                <h3 className="text-xs font-bold text-[var(--dept-text-muted)] uppercase tracking-wider">
                  Civic Triage &amp; Escalation Assessment
                </h3>
              </div>

              {onOverridePriority && (
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Adjust Priority</span>
                </button>
              )}
            </div>

            {/* Condition 1: Routine Maintenance */}
            {priorityEval.isRoutine ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Standard Municipal Maintenance (Routine)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  This complaint does not present immediate life safety hazards or prolonged essential service disruptions.
                  It is handled under regular municipal dispatch timelines and stays outside the Priority Queue.
                </p>
              </div>
            ) : null}

            {/* Condition 2: Urgent Hazard / Disruption */}
            {priorityEval.isUrgent ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-900 dark:text-rose-200">
                  <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Urgent Action Required — {priorityBadge.label} Priority</span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  {priorityEval.priorityReason}
                </p>
              </div>
            ) : null}

            {/* Condition 3: Overdue */}
            {priorityEval.isOverdue ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Overdue Response Alert (&ge; 72 Hours)</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  This complaint has remained unresolved for {priorityEval.agingHours} hours.
                  Unresolved issues exceeding 72 hours automatically escalate in the department priority queue.
                </p>
              </div>
            ) : null}

            {/* Condition 4: Needs Assessment */}
            {priorityEval.needsAssessment ? (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Supervisory Assessment Flagged</span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  Classification confidence or privacy redactions require municipal officer verification.
                </p>
              </div>
            ) : null}

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                  Time Waiting
                </span>
                <span className="text-xs font-semibold text-[var(--dept-text-primary)]">
                  {priorityEval.timeWaitingFormatted}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                  Base Severity
                </span>
                <span className="text-xs font-semibold text-[var(--dept-text-primary)] uppercase">
                  {priorityEval.baseSeverity}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                <span className="text-[11px] font-bold text-[var(--dept-text-muted)] uppercase tracking-wider block mb-1">
                  Queue Urgency
                </span>
                <span className="text-xs font-semibold text-[var(--dept-text-primary)]">
                  {priorityEval.isRoutine ? 'Routine (Standard SLA)' : priorityEval.queueTabs.map((t) => t.replace('_', ' ')).join(', ')}
                </span>
              </div>
            </div>

            {/* Manual Override Audit Card */}
            {priorityEval.isManualOverride && (
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Authorized Priority Override History</span>
                </div>
                <p className="text-blue-900 dark:text-blue-300 leading-relaxed">
                  Priority manually assigned to <strong>{priorityEval.priority.toUpperCase()}</strong> by {priorityEval.overriddenBy}.
                </p>
                {priorityEval.overrideReason && (
                  <p className="text-blue-800/80 dark:text-blue-300/80 italic">
                    &ldquo;{priorityEval.overrideReason}&rdquo;
                  </p>
                )}
                {priorityEval.overriddenAt && (
                  <div className="text-[10px] text-blue-700 dark:text-blue-400">
                    Recorded at: {formatPakistanDateTime(priorityEval.overriddenAt)}
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Manual Priority Override Modal */}
      {isOverrideModalOpen && onOverridePriority && (
        <PriorityOverrideModal
          referenceNumber={complaint.referenceNumber}
          currentEval={priorityEval}
          onSaveOverride={(newPriority, reason) => {
            onOverridePriority(complaint.referenceNumber, newPriority, reason);
            setIsOverrideModalOpen(false);
          }}
          onClose={() => setIsOverrideModalOpen(false)}
        />
      )}
    </div>
  );
};
