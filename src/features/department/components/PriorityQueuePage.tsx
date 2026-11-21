import React, { useState, useMemo } from 'react';
import { type DepartmentComplaintView, type DepartmentId } from '../../../types';
import {
  calculateComplaintPriority,
  type QueueTabType,
  getPriorityQueueCounts,
} from '../../../lib/priority-engine';
import {
  CheckCircle2,
  ArrowUpRight,
  Clock3,
  MapPin,
  Search,
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
  const [search, setSearch] = useState('');

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
    return evaluatedComplaints.filter(({ evaluation, complaint }) =>
      evaluation.queueTabs.includes(activeTab) &&
      `${complaint.referenceNumber} ${complaint.generatedHeading || complaint.title} ${complaint.locality} ${complaint.district}`.toLowerCase().includes(search.trim().toLowerCase())
    ).sort((a, b) => new Date(a.complaint.submittedAt).getTime() - new Date(b.complaint.submittedAt).getTime());
  }, [evaluatedComplaints, activeTab, search]);

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="ops-eyebrow">OPERATIONS / ESCALATIONS</div>
          <h1>Priority queue</h1>
          <p className="page-lead">Handle urgent safety issues and overdue citizen reports first.</p>
        </div>
        {onViewAllComplaints && (
          <button
            type="button"
            className="overview-header-action"
            onClick={onViewAllComplaints}
          >
            View work queue <ArrowUpRight size={16} />
          </button>
        )}
      </div>
      <div className="ops-priority-toolbar"><span>Ordered oldest report first</span><label className="ops-area-search"><Search size={16} /><input aria-label="Search priority complaints" placeholder="Search reference or place" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>

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
      <div className="ops-priority-description">
        <div className="ops-eyebrow">
          {activeTab === 'urgent'
            ? 'URGENT CASES'
            : activeTab === 'overdue'
            ? 'OVERDUE CASES'
            : 'CASES NEEDING ASSESSMENT'}
        </div>
        <p>
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
            {search ? 'No results match your search. Try another reference or locality.' : `There are currently no ${activeTab === 'urgent' ? 'urgent' : activeTab === 'overdue' ? 'overdue' : 'assessment'} reports in this queue.`}
          </p>
        </div>
      ) : (
        <div className="priority-queue-cards ops-priority-list">
          {filteredList.map(({ complaint: c, evaluation }, index) => {
            const dt = formatPakistanDateParts(c.submittedAt);
            const localityStr = c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi';
            const titleText = c.generatedHeading || c.title || 'Municipal Complaint';
            const pillText =
              activeTab === 'urgent'
                ? '● Urgent'
                : activeTab === 'overdue'
                ? '● Overdue'
                : '● Needs assessment';

            return (
              <article key={c.id} className="priority-item ops-priority-item" data-severity={activeTab}>
                <div className="ops-priority-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                <div className="ops-priority-main"><span className="priority-pill">{pillText.replace('● ', '')}</span><h3>{titleText}</h3><div className="ops-priority-meta"><span><MapPin size={14} /> {localityStr}</span><span><Clock3 size={14} /> {dt.date}, {dt.time}</span><code>{c.referenceNumber}</code></div><p>{evaluation.priorityReason || evaluation.explanation || 'Priority assessment is required.'}</p></div>
                <button type="button" onClick={() => onSelectComplaint(c.referenceNumber)} className="ops-open-case">Review case <ArrowUpRight size={16} /></button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
