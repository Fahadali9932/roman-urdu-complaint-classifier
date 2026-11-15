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
 * Uses semantic CSS variables defined in department-theme.css.
 */
export const getDisplayStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case 'under_review':
      return {
        label: 'Needs Review',
        className: 'border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
      };
    case 'submitted':
      return {
        label: 'New',
        className: 'border border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)]',
      };
    case 'assigned':
      return {
        label: 'Pending Acceptance',
        className: 'border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]',
      };
    case 'accepted':
      return {
        label: 'Accepted',
        className: 'border border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)]',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'border border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]',
      };
    case 'resolved':
      return {
        label: 'Work Done',
        className: 'border border-[var(--status-done-border)] bg-[var(--status-done-bg)] text-[var(--status-done-text)]',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]',
      };
    default:
      return {
        label: status,
        className: 'border border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)]',
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
        className: 'border border-[var(--status-urgent-border)] bg-[var(--status-urgent-bg)] text-[var(--status-urgent-text)]',
        dotColor: 'bg-rose-600',
      };
    case 'high':
      return {
        label: 'High',
        className: 'border border-[var(--status-overdue-border)] bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]',
        dotColor: 'bg-amber-600',
      };
    case 'normal':
      return {
        label: 'Normal',
        className: 'border border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)]',
        dotColor: 'bg-slate-500',
      };
    case 'low':
      return {
        label: 'Low',
        className: 'border border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)]',
        dotColor: 'bg-slate-400',
      };
  }
};

/**
 * Sanitizes landmark text so raw placeholders like "none", "null", "n/a" are never displayed.
 */
const cleanPublicLandmark = (landmark?: string | null): string | null => {
  if (!landmark) return null;
  const trimmed = landmark.trim();
  if (/^(none|null|n\/a|na|nil|undefined|no landmark)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
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
          No complaints matching the active status filter or search query were found.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto dept-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--dept-border)] bg-[var(--dept-surface-subtle)]/70 text-[11px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)] select-none">
              <th scope="col" className="py-3 px-4 w-[44%] min-w-[260px]">
                Complaint / Subject
              </th>
              <th scope="col" className="py-3 px-3 w-[14%] min-w-[130px]">
                Reference
              </th>
              <th scope="col" className="py-3 px-3 w-[18%] min-w-[150px] hidden sm:table-cell">
                Public Location
              </th>
              <th scope="col" className="py-3 px-3 w-[14%] min-w-[130px] hidden md:table-cell">
                Submitted
              </th>
              <th scope="col" className="py-3 px-4 w-[10%] text-right min-w-[120px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dept-separator)] text-xs">
            {complaints.map((c) => {
              const isSelected = selectedReference === c.referenceNumber;
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
                  aria-label={`View complaint ${c.referenceNumber}`}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--dept-surface-selected)] border-l-3 border-l-[var(--dept-accent)]'
                      : 'hover:bg-[var(--dept-surface-hover)] focus-visible:bg-[var(--dept-surface-hover)] focus-visible:outline-none'
                  }`}
                >
                  {/* Subject & Summary Line */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-sm text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors leading-snug">
                      {c.generatedHeading || c.title || 'Municipal Complaint'}
                    </div>
                    <div className="text-xs text-[var(--dept-text-secondary)] line-clamp-1 mt-0.5 leading-relaxed">
                      {summarySnippet}
                    </div>

                    {/* Mobile Only: Location & Timestamp summary */}
                    <div className="sm:hidden flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--dept-text-muted)] mt-1.5">
                      <span className="truncate max-w-[140px]">{localityStr}</span>
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
                    <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                      <span className="truncate font-medium">{localityStr}</span>
                    </div>
                    {landmark && (
                      <div className="text-[11px] text-[var(--dept-text-muted)] truncate max-w-[220px] mt-0.5 pl-5">
                        {landmark}
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

                  {/* Status Badge */}
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
          Showing <strong className="text-[var(--dept-text-primary)] font-mono">{complaints.length}</strong> {complaints.length === 1 ? 'complaint' : 'complaints'}
        </span>
        <span className="text-[11px]">
          Pakistan Standard Time (Asia/Karachi)
        </span>
      </div>
    </div>
  );
};
