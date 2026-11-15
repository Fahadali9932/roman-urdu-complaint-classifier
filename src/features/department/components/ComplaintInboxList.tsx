import React from 'react';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Inbox, MapPin, Calendar, ChevronRight } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  accentColor?: string;
}

export const getDisplayStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case 'under_review':
      return {
        label: 'Needs Review',
        className:
          'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      };
    case 'submitted':
      return {
        label: 'New',
        className:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'assigned':
      return {
        label: 'Pending Acceptance',
        className:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'accepted':
      return {
        label: 'Accepted',
        className:
          'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className:
          'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      };
    case 'resolved':
      return {
        label: 'Work Done',
        className:
          'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className:
          'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    default:
      return {
        label: status,
        className:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
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
          Complaints assigned to your department matching the selected filters will appear here.
        </p>
      </div>
    );
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto dept-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--dept-border)] bg-[var(--dept-surface-subtle)]/70 text-[11px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)] select-none">
              <th scope="col" className="py-3 px-4 w-[42%] min-w-[200px]">
                Complaint / Subject
              </th>
              <th scope="col" className="py-3 px-4 w-[16%] min-w-[120px]">
                Reference
              </th>
              <th scope="col" className="py-3 px-4 w-[16%] min-w-[130px] hidden sm:table-cell">
                Location
              </th>
              <th scope="col" className="py-3 px-4 w-[12%] min-w-[100px] hidden md:table-cell">
                Submitted
              </th>
              <th scope="col" className="py-3 px-4 w-[14%] text-right min-w-[110px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dept-border)] text-xs">
            {complaints.map((c) => {
              const isSelected = selectedReference === c.referenceNumber;
              const badge = getDisplayStatusBadge(c.status);
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
                    {/* Mobile Location & Date (Hidden on sm+) */}
                    <div className="sm:hidden flex items-center gap-2 text-[11px] text-[var(--dept-text-muted)] mt-1">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{locationText}</span>
                      </span>
                      <span>·</span>
                      <span>{formatDate(c.submittedAt)}</span>
                    </div>
                  </td>

                  {/* Reference Number */}
                  <td className="py-3.5 px-4 align-top font-mono font-medium text-xs text-[var(--dept-text-primary)] whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                      {c.referenceNumber}
                    </span>
                  </td>

                  {/* Incident Location (sm+) */}
                  <td className="py-3.5 px-4 align-top text-xs text-[var(--dept-text-secondary)] hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                      <span className="truncate">{locationText}</span>
                    </div>
                  </td>

                  {/* Submitted Date (md+) */}
                  <td className="py-3.5 px-4 align-top text-xs text-[var(--dept-text-muted)] whitespace-nowrap hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-[var(--dept-text-muted)]" />
                      <span>{formatDate(c.submittedAt)}</span>
                    </div>
                  </td>

                  {/* Status Badge & Action */}
                  <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border leading-tight ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--dept-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
