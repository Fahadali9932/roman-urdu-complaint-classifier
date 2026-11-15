import React, { useState, useMemo } from 'react';
import { type DepartmentComplaintView, type DepartmentId } from '../../../types';
import {
  calculateComplaintPriority,
  formatPakistanDateTime,
  type QueueTabType,
  getPriorityQueueCounts,
} from '../../../lib/priority-engine';
import { getDisplayStatusBadge } from './ComplaintInboxList';
import {
  AlertOctagon,
  Clock,
  HelpCircle,
  MapPin,
  ChevronRight,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface PriorityQueuePageProps {
  complaints: DepartmentComplaintView[];
  departmentId: DepartmentId;
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  initialTab?: QueueTabType;
}

const cleanPublicLandmark = (landmark?: string | null): string | null => {
  if (!landmark) return null;
  const trimmed = landmark.trim();
  if (/^(none|null|n\/a|na|nil|undefined|no landmark)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const PriorityQueuePage: React.FC<PriorityQueuePageProps> = ({
  complaints,
  onSelectComplaint,
  initialTab = 'urgent',
}) => {
  const [activeTab, setActiveTab] = useState<QueueTabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Priority calculations for all complaints
  const evaluatedComplaints = useMemo(() => {
    return complaints.map((c) => ({
      complaint: c,
      evaluation: calculateComplaintPriority(c),
    }));
  }, [complaints]);

  // Tab counts
  const counts = useMemo(() => {
    return getPriorityQueueCounts(complaints);
  }, [complaints]);

  // Filter complaints based on activeTab and searchQuery
  const filteredList = useMemo(() => {
    return evaluatedComplaints.filter(({ complaint, evaluation }) => {
      // Must match active tab
      if (!evaluation.queueTabs.includes(activeTab)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = complaint.referenceNumber.toLowerCase().includes(q);
        const matchesHeading = (complaint.generatedHeading || complaint.title || '').toLowerCase().includes(q);
        const matchesLoc = (complaint.locality || '').toLowerCase().includes(q);
        const matchesDesc = (complaint.description || '').toLowerCase().includes(q);
        return matchesRef || matchesHeading || matchesLoc || matchesDesc;
      }

      return true;
    });
  }, [evaluatedComplaints, activeTab, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--dept-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
              Priority Queue
            </h1>
            {counts.total > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-[var(--status-urgent-border)] bg-[var(--status-urgent-bg)] text-[var(--status-urgent-text)]">
                {counts.total} Actionable {counts.total === 1 ? 'Case' : 'Cases'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
            Evidence-based escalation queue displaying active safety hazards, prolonged utility disruptions, and overdue complaints.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dept-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search priority queue..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-primary)] placeholder:text-[var(--dept-text-muted)] focus:outline-none focus:border-[var(--dept-accent)] transition-colors"
          />
        </div>
      </div>

      {/* Priority Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--dept-border)] pb-2 overflow-x-auto dept-scrollbar">
        {/* Urgent Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('urgent')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'urgent'
              ? 'border border-[var(--status-urgent-border)] bg-[var(--status-urgent-bg)] text-[var(--status-urgent-text)] shadow-xs'
              : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Urgent</span>
          {counts.urgent > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
              {counts.urgent}
            </span>
          )}
        </button>

        {/* Overdue Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overdue'
              ? 'border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)] shadow-xs'
              : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Overdue</span>
          {counts.overdue > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold">
              {counts.overdue}
            </span>
          )}
        </button>

        {/* Needs Assessment Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('needs_assessment')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'needs_assessment'
              ? 'border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 shadow-xs'
              : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Needs Assessment</span>
          {counts.needsAssessment > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {counts.needsAssessment}
            </span>
          )}
        </button>
      </div>

      {/* Priority Queue Table or Empty State */}
      {filteredList.length === 0 ? (
        <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs select-none">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--dept-text-primary)] mb-1">
            No complaints currently require priority attention
          </h3>
          <p className="text-xs text-[var(--dept-text-secondary)] max-w-md leading-relaxed">
            All complaints in this queue category have either been resolved or are within standard municipal service thresholds. Routine requests are managed in the main Complaints table.
          </p>
        </div>
      ) : (
        <div className="w-full bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto dept-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--dept-border)] bg-[var(--dept-surface-subtle)]/70 text-[11px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)] select-none">
                  <th scope="col" className="py-3 px-4 w-[36%] min-w-[240px]">
                    Complaint / Subject
                  </th>
                  <th scope="col" className="py-3 px-3 w-[13%] min-w-[120px]">
                    Reference
                  </th>
                  <th scope="col" className="py-3 px-3 w-[15%] min-w-[140px] hidden sm:table-cell">
                    Public Location
                  </th>
                  <th scope="col" className="py-3 px-3 w-[12%] min-w-[110px] hidden md:table-cell">
                    Time Waiting
                  </th>
                  <th scope="col" className="py-3 px-3 w-[14%] min-w-[140px]">
                    Urgency Reason
                  </th>
                  <th scope="col" className="py-3 px-4 w-[10%] text-right min-w-[110px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dept-separator)] text-xs">
                {filteredList.map(({ complaint: c, evaluation: pEval }) => {
                  const statusBadge = getDisplayStatusBadge(c.status);
                  const exactSubmittedText = formatPakistanDateTime(c.submittedAt);
                  const localityStr = c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi';
                  const landmark = cleanPublicLandmark(c.publicLocation);
                  const summarySnippet = c.factualSummary || c.sanitizedDescription || c.description;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectComplaint(c.referenceNumber)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectComplaint(c.referenceNumber);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View priority complaint ${c.referenceNumber}`}
                      className="group cursor-pointer hover:bg-[var(--dept-surface-hover)] focus-visible:bg-[var(--dept-surface-hover)] focus-visible:outline-none transition-colors"
                    >
                      {/* Complaint / Heading */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-sm text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors leading-snug">
                          {c.generatedHeading || c.title || 'Municipal Complaint'}
                        </div>
                        <div className="text-xs text-[var(--dept-text-secondary)] line-clamp-1 mt-0.5 leading-relaxed">
                          {summarySnippet}
                        </div>
                        <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-[var(--dept-text-muted)] mt-1.5">
                          <span>{localityStr}</span>
                          <span>·</span>
                          <span>{exactSubmittedText}</span>
                        </div>
                      </td>

                      {/* Reference Number */}
                      <td className="py-3.5 px-3 align-top font-mono font-medium text-xs text-[var(--dept-text-primary)] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] font-semibold">
                          {c.referenceNumber}
                        </span>
                      </td>

                      {/* Public Location (sm+) */}
                      <td className="py-3.5 px-3 align-top text-xs text-[var(--dept-text-secondary)] hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                          <span className="truncate font-medium">{localityStr}</span>
                        </div>
                        {landmark && (
                          <div className="text-[11px] text-[var(--dept-text-muted)] truncate max-w-[200px] mt-0.5 pl-5">
                            {landmark}
                          </div>
                        )}
                      </td>

                      {/* Time Waiting (md+) */}
                      <td className="py-3.5 px-3 align-top text-xs font-mono font-semibold text-[var(--dept-text-primary)] whitespace-nowrap hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0" />
                          <span>{pEval.timeWaitingFormatted}</span>
                        </div>
                      </td>

                      {/* Urgency Reason */}
                      <td className="py-3.5 px-3 align-top text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--status-urgent-border)] bg-[var(--status-urgent-bg)] text-[var(--status-urgent-text)] line-clamp-2">
                          {pEval.priorityReason || pEval.severityReason}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--dept-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-[var(--dept-surface-subtle)] border-t border-[var(--dept-border)] flex items-center justify-between text-xs text-[var(--dept-text-muted)]">
            <span>
              Showing <strong className="text-[var(--dept-text-primary)] font-mono">{filteredList.length}</strong> prioritized {filteredList.length === 1 ? 'case' : 'cases'}
            </span>
            <span className="text-[11px]">
              Evidence-based triage
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
