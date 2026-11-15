import React, { useState, useMemo } from 'react';
import { type DepartmentComplaintView, type DepartmentId } from '../../../types';
import {
  calculateComplaintPriority,
  type QueueTabType,
  getPriorityQueueCounts,
} from '../../../lib/priority-engine';
import {
  CheckCircle2,
} from 'lucide-react';
import { formatPakistanDateParts } from './ComplaintInboxList';

interface PriorityQueuePageProps {
  complaints: DepartmentComplaintView[];
  departmentId: DepartmentId;
  selectedReference: string | null;
  onSelectComplaint: (refNumber: string) => void;
  onViewAllComplaints?: () => void;
  initialTab?: QueueTabType;
}

export const PriorityQueuePage: React.FC<PriorityQueuePageProps> = ({
  complaints,
  onSelectComplaint,
  onViewAllComplaints,
  initialTab = 'urgent',
}) => {
  const [activeTab, setActiveTab] = useState<QueueTabType>(initialTab);

  // Evaluate priority for all complaints
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

  // Filter complaints based on activeTab
  const filteredList = useMemo(() => {
    return evaluatedComplaints.filter(({ evaluation }) => {
      return evaluation.queueTabs.includes(activeTab);
    });
  }, [evaluatedComplaints, activeTab]);

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Priority queue</h1>
          <p className="page-lead">
            Cases that need attention outside the routine workflow.
          </p>
        </div>
        {onViewAllComplaints && (
          <button
            type="button"
            className="overview-header-action"
            onClick={onViewAllComplaints}
          >
            All complaints →
          </button>
        )}
      </div>

      {/* Priority Navigation Tabs */}
      <div className="tabbar" role="tablist" aria-label="Priority queue filters">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'urgent'}
          className="tab-button"
          onClick={() => setActiveTab('urgent')}
        >
          Urgent
          <span className="tab-total">{counts.urgent}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overdue'}
          className="tab-button"
          onClick={() => setActiveTab('overdue')}
        >
          Overdue
          <span className="tab-total">{counts.overdue}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'needs_assessment'}
          className="tab-button"
          onClick={() => setActiveTab('needs_assessment')}
        >
          Needs assessment
          <span className="tab-total">{counts.needsAssessment}</span>
        </button>
      </div>

      {/* Category Section Heading */}
      <div style={{ marginTop: '26px', marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 720, color: 'var(--faint)', marginBottom: '5px' }}>
          {activeTab === 'urgent'
            ? 'URGENT CASES'
            : activeTab === 'overdue'
            ? 'OVERDUE CASES'
            : 'CASES NEEDING ASSESSMENT'}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
          {activeTab === 'urgent'
            ? 'These cases include an explicit report of immediate risk. Confirm the details before dispatch.'
            : activeTab === 'overdue'
            ? 'These cases have exceeded standard response thresholds. Prioritize administrative follow-up.'
            : 'These cases require staff assessment to clarify jurisdiction or hazard severity.'}
        </p>
      </div>

      {/* Priority Queue Cards or Empty State */}
      {filteredList.length === 0 ? (
        <div style={{ marginTop: '12px' }} className="empty-state">
          <span className="empty-icon">
            <CheckCircle2 className="w-6 h-6" />
          </span>
          <h2>No cases in this queue</h2>
          <p>
            There are no {activeTab === 'urgent' ? 'urgent' : activeTab === 'overdue' ? 'overdue' : 'assessment'} cases in this sample. Routine complaints are intentionally excluded.
          </p>
        </div>
      ) : (
        <div className="priority-queue-cards" style={{ marginTop: '12px' }}>
          {filteredList.map(({ complaint: c, evaluation }) => {
            const dt = formatPakistanDateParts(c.submittedAt);
            const localityStr = c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi';
            const titleText = c.generatedHeading || c.title || 'Municipal Complaint';
            const pillText =
              activeTab === 'urgent'
                ? '● Urgent'
                : activeTab === 'overdue'
                ? '● Overdue'
                : '● Needs assessment';

            const accentBorder =
              activeTab === 'urgent'
                ? 'var(--urgent)'
                : activeTab === 'overdue'
                ? '#d97706'
                : 'var(--brand)';

            return (
              <article
                key={c.id}
                className="priority-item"
                style={{
                  borderLeft: `4px solid ${accentBorder}`,
                }}
              >
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <span
                      className="priority-pill"
                      style={
                        activeTab !== 'urgent'
                          ? { background: 'var(--hover)', color: 'var(--text)', border: '1px solid var(--line)' }
                          : undefined
                      }
                    >
                      {pillText}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 650, color: 'var(--text)', marginBottom: '5px' }}>
                    {titleText}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '14px' }}>
                    {localityStr} · Reported {dt.date}, {dt.time}
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>
                    Why this case needs attention
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--body)', margin: '0 0 14px 0', lineHeight: 1.55 }}>
                    {evaluation.priorityReason || evaluation.explanation || 'Priority assessment active.'}
                  </p>

                  <span className="ref-code">{c.referenceNumber}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectComplaint(c.referenceNumber)}
                  className="overview-header-action"
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    borderColor: 'var(--brand)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    height: '38px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Open case →
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
