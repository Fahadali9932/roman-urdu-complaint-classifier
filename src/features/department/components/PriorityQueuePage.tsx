import React, { useState, useMemo } from 'react';
import { type DepartmentComplaintView, type DepartmentId } from '../../../types';
import {
  calculateComplaintPriority,
  formatPakistanDateTime,
  type QueueTabType,
  getPriorityQueueCounts,
} from '../../../lib/priority-engine';
import { getDisplayStatusBadge, getPriorityBadge } from './ComplaintInboxList';
import {
  AlertOctagon,
  Clock,
  HelpCircle,
  MapPin,
  ChevronRight,
  Search,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface PriorityQueuePageProps {
  complaints: DepartmentComplaintView[];
  departmentId: DepartmentId;
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  initialTab?: QueueTabType;
}

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
    <div className="space-y-4">
      {/* Priority Queue Header Banner */}
      <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--dept-text-primary)] tracking-tight">
                  Selective Priority Queue
                </h2>
                {counts.total > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800">
                    {counts.total} Actionable {counts.total === 1 ? 'Case' : 'Cases'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--dept-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                Evidence-based escalation queue displaying active safety hazards, prolonged utility disruptions,
                and overdue complaints. Routine municipal maintenance is managed under standard departmental schedules.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dept-text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search priority queue..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-primary)] placeholder:text-[var(--dept-text-muted)] focus:outline-none focus:border-[var(--dept-accent)] transition-colors"
            />
          </div>
        </div>

        {/* Priority Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[var(--dept-border)] overflow-x-auto dept-scrollbar">
          {/* Urgent Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('urgent')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'urgent'
                ? 'bg-rose-50 text-rose-950 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800 shadow-xs'
                : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>1. Urgent</span>
            {counts.urgent > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                {counts.urgent}
              </span>
            )}
          </button>

          {/* Overdue Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 shadow-xs'
                : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>2. Overdue (&ge; 72h)</span>
            {counts.overdue > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-600 text-white text-[10px] font-bold">
                {counts.overdue}
              </span>
            )}
          </button>

          {/* Needs Assessment Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('needs_assessment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'needs_assessment'
                ? 'bg-blue-50 text-blue-950 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800 shadow-xs'
                : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] border border-transparent'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>3. Needs Assessment</span>
            {counts.needsAssessment > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                {counts.needsAssessment}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Priority Queue Complaints Table */}
      {filteredList.length === 0 ? (
        <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl shadow-xs select-none">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--dept-text-primary)] mb-1">
            No complaints currently require priority attention
          </h3>
          <p className="text-xs text-[var(--dept-text-secondary)] max-w-md leading-relaxed">
            All complaints in this category have either been resolved or are within standard operational SLA thresholds.
            Routine requests remain in the All Complaints table.
          </p>
        </div>
      ) : (
        <div className="w-full bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto dept-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--dept-border)] bg-[var(--dept-surface-subtle)]/80 text-[11px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)] select-none">
                  <th scope="col" className="py-3 px-4 w-[34%] min-w-[220px]">
                    Complaint Heading
                  </th>
                  <th scope="col" className="py-3 px-3 w-[12%] min-w-[110px]">
                    Reference
                  </th>
                  <th scope="col" className="py-3 px-3 w-[10%] min-w-[90px]">
                    Priority
                  </th>
                  <th scope="col" className="py-3 px-3 w-[14%] min-w-[120px] hidden sm:table-cell">
                    Location
                  </th>
                  <th scope="col" className="py-3 px-3 w-[12%] min-w-[110px] hidden md:table-cell">
                    Time Waiting
                  </th>
                  <th scope="col" className="py-3 px-3 w-[18%] min-w-[180px]">
                    Priority Reason
                  </th>
                  <th scope="col" className="py-3 px-4 w-[10%] text-right min-w-[100px]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dept-border)] text-xs">
                {filteredList.map(({ complaint: c, evaluation: pEval }) => {
                  const statusBadge = getDisplayStatusBadge(c.status);
                  const priorityBadge = getPriorityBadge(pEval.priority);
                  const exactSubmittedText = formatPakistanDateTime(c.submittedAt);
                  const locationText = c.locality
                    ? `${c.locality}, ${c.district}`
                    : c.district || 'Karachi';

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
                      {/* Heading */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-sm text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors leading-snug">
                          {c.generatedHeading || c.title || 'Municipal Complaint'}
                        </div>
                        <div className="text-[11px] text-[var(--dept-text-muted)] mt-0.5">
                          Submitted: {exactSubmittedText}
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-3 align-top font-mono font-medium text-xs text-[var(--dept-text-primary)] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] font-semibold">
                          {c.referenceNumber}
                        </span>
                      </td>

                      {/* Priority Level (Established) */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${priorityBadge.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityBadge.dotColor}`} />
                          <span>{priorityBadge.label}</span>
                        </span>
                      </td>

                      {/* Public Incident Location */}
                      <td className="py-3.5 px-3 align-top text-xs text-[var(--dept-text-secondary)] hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                          <span className="truncate font-medium">{locationText}</span>
                        </div>
                        {c.publicLocation && (
                          <div className="text-[11px] text-[var(--dept-text-muted)] truncate max-w-[160px] mt-0.5 pl-5">
                            {c.publicLocation}
                          </div>
                        )}
                      </td>

                      {/* Time Waiting */}
                      <td className="py-3.5 px-3 align-top text-xs text-[var(--dept-text-secondary)] whitespace-nowrap hidden md:table-cell">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                          <span className={pEval.isOverdue ? 'text-amber-800 dark:text-amber-400 font-bold' : ''}>
                            {pEval.timeWaitingFormatted}
                          </span>
                        </div>
                      </td>

                      {/* Factual Priority Reason */}
                      <td className="py-3.5 px-3 align-top text-xs text-[var(--dept-text-secondary)]">
                        <div className="flex items-start gap-1.5">
                          {pEval.isManualOverride && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          )}
                          <span className="line-clamp-2 leading-relaxed">
                            {pEval.priorityReason}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[var(--dept-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block shrink-0" />
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
              Showing <strong className="text-[var(--dept-text-primary)]">{filteredList.length}</strong> prioritized {filteredList.length === 1 ? 'case' : 'cases'} in {activeTab.replace('_', ' ')} tab
            </span>
            <span className="text-[11px]">
              Evidence-Based Municipal Triage
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
