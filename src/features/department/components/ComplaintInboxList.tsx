import React from 'react';
import { type DepartmentComplaintView, type ComplaintStatus } from '../../../types';
import { Inbox } from 'lucide-react';

interface ComplaintInboxListProps {
  complaints: DepartmentComplaintView[];
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  accentColor?: string;
}

/**
 * Returns clean status chip class and human-readable civic label
 */
export const getStatusChipInfo = (status: ComplaintStatus) => {
  switch (status) {
    case 'under_review':
      return { label: 'Needs review', className: 'status-pending' };
    case 'submitted':
    case 'assigned':
      return { label: 'Awaiting acceptance', className: 'status-pending' };
    case 'accepted':
      return { label: 'Accepted', className: 'status-accepted' };
    case 'in_progress':
      return { label: 'In progress', className: 'status-in-progress' };
    case 'resolved':
      return { label: 'Completed', className: 'status-work-done' };
    case 'rejected':
      return { label: 'Rejected', className: 'status-rejected' };
    default:
      return { label: status, className: 'status-pending' };
  }
};

/**
 * Parses ISO date string into PKT date and time components
 */
export const formatPakistanDateParts = (iso: string) => {
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
    const time =
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Karachi',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d) + ' PKT';
    return { date, time };
  } catch {
    return { date: iso, time: '' };
  }
};

/**
 * Sanitizes landmark text so raw placeholders like "none", "null", "n/a" are never displayed.
 */
const cleanPublicLandmark = (landmark?: string | null): string | null => {
  if (!landmark) return null;
  const trimmed = landmark.trim();
  if (/^(none|null|n\/a|na|nil|undefined|no landmark|-)$/i.test(trimmed)) {
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
      <div className="empty-state">
        <span className="empty-icon">
          <Inbox className="w-6 h-6" />
        </span>
        <h2>No complaints yet</h2>
        <p>No complaints matching the active status filter or search query were found.</p>
      </div>
    );
  }

  return (
    <div className="content-card">
      <div className="table-scroll">
        <table className="complaints-table">
          <thead>
            <tr>
              <th className="col-subject">Complaint</th>
              <th className="col-ref">Reference</th>
              <th className="col-location">Public location</th>
              <th className="col-date">Submitted</th>
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => {
              const isSelected = selectedReference === c.referenceNumber;
              const chip = getStatusChipInfo(c.status);
              const dt = formatPakistanDateParts(c.submittedAt);

              const localityStr = c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi';
              const landmark = cleanPublicLandmark(c.publicLocation);
              const titleText = c.generatedHeading || c.title || 'Municipal Complaint';
              const summarySnippet = c.factualSummary || c.sanitizedDescription || c.description || '';

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectComplaint(c.referenceNumber)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'var(--brand-soft)' : undefined,
                  }}
                >
                  {/* Complaint Column (Subject + One-line summary) */}
                  <td className="subject-cell">
                    <button
                      type="button"
                      className="subject-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComplaint(c.referenceNumber);
                      }}
                      title={titleText}
                    >
                      {titleText}
                    </button>
                    <span className="single-line" title={summarySnippet}>
                      {summarySnippet}
                    </span>
                  </td>

                  {/* Reference Column */}
                  <td className="ref-cell">
                    <span className="ref-code">{c.referenceNumber}</span>
                  </td>

                  {/* Public Location Column */}
                  <td className="location-cell">
                    <span className="location-primary">{localityStr}</span>
                    {landmark && <span className="location-secondary">{landmark}</span>}
                  </td>

                  {/* Submitted Date & Time Column */}
                  <td className="date-cell">
                    <span className="date-primary">{dt.date}</span>
                    <span className="date-secondary">{dt.time}</span>
                  </td>

                  {/* Status Column */}
                  <td className="status-cell">
                    <span className={`status-chip ${chip.className}`}>{chip.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="table-summary">
        <span>
          Showing {complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'}
        </span>
        <span>Pakistan Standard Time (Asia/Karachi)</span>
      </div>
    </div>
  );
};
