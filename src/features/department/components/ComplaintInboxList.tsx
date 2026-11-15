import React from 'react';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { formatPakistanDateTime, type PriorityLevel } from '../../../lib/priority-engine';
import { Inbox, MapPin, Clock, ChevronRight } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  accentColor?: string;
}

/**
 * Restrained, high-contrast civic status badges (WCAG AA compliant: >= 4.5:1 contrast)
 * Avoids oversaturated pills or competing bright backgrounds.
 */
export const getDisplayStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case 'under_review':
      return {
        label: 'Needs Review',
        className:
          'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60',
      };
    case 'submitted':
      return {
        label: 'New',
        className:
          'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700',
      };
    case 'assigned':
      return {
        label: 'Pending Acceptance',
        className:
          'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/60',
      };
    case 'accepted':
      return {
        label: 'Accepted',
        className:
          'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className:
          'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800/60',
      };
    case 'resolved':
      return {
        label: 'Work Done',
        className:
          'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60',
      };
    case 'rejected':
      return {
        label: 'Closed / Rejected',
        className:
          'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
      };
    default:
      return {
        label: status,
        className:
          'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      };
  }
};

/**
 * High-contrast priority badge styling (used in Priority Queue & Detail view only)
 */
export const getPriorityBadge = (priority: PriorityLevel) => {
  switch (priority) {
    case 'critical':
      return {
        label: 'Critical',
        className:
          'bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800',
        dotColor: 'bg-rose-600',
      };
    case 'high':
      return {
        label: 'High',
        className:
          'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-600',
      };
    case 'normal':
      return {
        label: 'Normal',
        className:
          'bg-blue-50 text-blue-950 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800',
        dotColor: 'bg-blue-600',
      };
    case 'low':
      return {
        label: 'Low',
        className:
          'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        dotColor: 'bg-slate-500',
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
      <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs select-none">
        <div className="w-12 h-12 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] flex items-center justify-center mb-3 text-[var(--dept-text-muted)]">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[var(--dept-text-primary)] mb-1">
          No complaints yet
        </h3>
        <p className="text-xs text-[var(--dept-text-secondary)] max-w-sm leading-relaxed">
          No complaints matching the active department filters or search query were found.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto dept-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--dept-border)] bg-[var(--dept-surface-subtle)]/80 text-[11px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)] select-none">
              <th scope="col" className="py-3 px-4 w-[42%] min-w-[240px]">
                Complaint / Subject
              </th>
              <th scope="col" className="py-3 px-3 w-[15%] min-w-[120px]">
                Reference
              </th>
              <th scope="col" className="py-3 px-3 w-[18%] min-w-[140px] hidden sm:table-cell">
                Public Location
              </th>
              <th scope="col" className="py-3 px-3 w-[15%] min-w-[140px] hidden md:table-cell">
                Submitted
              </th>
              <th scope="col" className="py-3 px-4 w-[10%] text-right min-w-[110px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dept-border)] text-xs">
            {complaints.map((c) => {
              const isSelected = selectedReference === c.referenceNumber;
              const statusBadge = getDisplayStatusBadge(c.status);
              const exactSubmittedText = formatPakistanDateTime(c.submittedAt);

              const locationText = c.locality
                ? `${c.locality}, ${c.district}`
                : c.district || 'Karachi';
              const summarySnippet =
                c.factualSummary || c.sanitizedDescription || c.description;

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
                  aria-label={`View complaint ${c.referenceNumber}`}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--dept-surface-selected)] border-l-4 border-l-[var(--dept-accent)]'
                      : 'hover:bg-[var(--dept-surface-hover)] focus-visible:bg-[var(--dept-surface-hover)] focus-visible:outline-none'
                  }`}
                >
                  {/* Subject & Summary Snippet */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-sm text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors leading-snug">
                      {c.generatedHeading || c.title || 'Municipal Complaint'}
                    </div>
                    <div className="text-xs text-[var(--dept-text-secondary)] line-clamp-1 mt-0.5 leading-relaxed">
                      {summarySnippet}
                    </div>

                    {/* Mobile Only: Location & Timestamp summary */}
                    <div className="sm:hidden flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--dept-text-muted)] mt-1.5">
                      <span className="truncate max-w-[140px]">{locationText}</span>
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
                      <span className="truncate font-medium">{locationText}</span>
                    </div>
                    {c.publicLocation && (
                      <div className="text-[11px] text-[var(--dept-text-muted)] truncate max-w-[200px] mt-0.5 pl-5">
                        {c.publicLocation}
                      </div>
                    )}
                  </td>

                  {/* Submitted Date & Time (md+) */}
                  <td className="py-3.5 px-3 align-top text-xs text-[var(--dept-text-secondary)] whitespace-nowrap hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                      <span className="font-medium">{exactSubmittedText}</span>
                    </div>
                  </td>

                  {/* Status Badge & Action */}
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

      {/* Footer Count Bar */}
      <div className="px-4 py-2.5 bg-[var(--dept-surface-subtle)] border-t border-[var(--dept-border)] flex items-center justify-between text-xs text-[var(--dept-text-muted)]">
        <span>
          Showing <strong className="text-[var(--dept-text-primary)]">{complaints.length}</strong> {complaints.length === 1 ? 'complaint' : 'complaints'}
        </span>
        <span className="text-[11px]">
          Pakistan Standard Time (PKT)
        </span>
      </div>
    </div>
  );
};
