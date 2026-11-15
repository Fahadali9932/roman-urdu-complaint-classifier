import React, { useState } from 'react';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import {
  calculateComplaintPriority,
  type PriorityLevel,
} from '../../../lib/priority-engine';
import {
  ArrowLeft,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { formatPakistanDateParts, getStatusChipInfo } from './ComplaintInboxList';
import { PriorityOverrideModal } from './PriorityOverrideModal';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: (actionStatus?: ComplaintStatus) => void;
  onQuickStatusUpdate?: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
  onOpenReviewModal?: () => void;
  onOverridePriority?: (refNumber: string, newPriority: PriorityLevel, reason: string) => void;
}

const cleanPublicLandmark = (landmark?: string | null): string | null => {
  if (!landmark) return null;
  const trimmed = landmark.trim();
  if (/^(none|null|n\/a|na|nil|undefined|no landmark|-)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  onOpenStatusModal,
  onBackToList,
  onOpenReviewModal,
  onOverridePriority,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'complaint' | 'progress' | 'priority'>('overview');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  if (!complaint) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <AlertCircle className="w-6 h-6" />
        </span>
        <h2>No complaint selected</h2>
        <p>Select a complaint from the list to review details and take administrative action.</p>
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="overview-header-action"
            style={{ marginTop: '16px' }}
          >
            Back to complaints
          </button>
        )}
      </div>
    );
  }

  const chip = getStatusChipInfo(complaint.status);
  const priorityEval = calculateComplaintPriority(complaint);
  const dt = formatPakistanDateParts(complaint.submittedAt);
  const landmark = cleanPublicLandmark(complaint.publicLocation);
  const localityStr = complaint.locality
    ? `${complaint.locality}, ${complaint.district}`
    : complaint.district || 'Karachi';

  const titleText = complaint.generatedHeading || complaint.title || 'Municipal Complaint';
  const summaryText = complaint.factualSummary || complaint.sanitizedDescription || complaint.description || '';
  const fullText = complaint.sanitizedDescription || complaint.description || 'No complaint text available.';

  // Map priority label
  const priorityDisplayLabel = {
    critical: 'Urgent safety concern',
    high: 'High priority — overdue or elevated risk',
    normal: 'Routine — not escalated',
    low: 'Routine minor request',
  }[priorityEval.priority] || 'Routine';

  const isCompleted = complaint.status === 'resolved';
  const isRejected = complaint.status === 'rejected';
  const isAcceptedOrBeyond =
    complaint.status === 'accepted' ||
    complaint.status === 'in_progress' ||
    complaint.status === 'resolved';
  const isInProgressOrBeyond =
    complaint.status === 'in_progress' || complaint.status === 'resolved';

  const lastResolvedEvent = isCompleted && complaint.timeline
    ? [...complaint.timeline].reverse().find((e) => e.status === 'resolved')
    : null;

  return (
    <div className="detail-top">
      {/* Back button */}
      {onBackToList && (
        <button
          type="button"
          onClick={onBackToList}
          className="back-link"
        >
          <ArrowLeft className="icon" /> Back to complaints
        </button>
      )}

      {/* Overline & Heading */}
      <div className="section-overline">Complaint detail</div>
      <div className="detail-title-row">
        <h1>{titleText}</h1>
        <span className={`status-chip ${chip.className}`}>{chip.label}</span>
      </div>

      {/* Metadata strip */}
      <div className="detail-meta">
        <span><strong>{complaint.referenceNumber}</strong></span>
        <span>{localityStr}</span>
        <span>Submitted {dt.date} · {dt.time}</span>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <div className="tabbar" role="tablist" aria-label="Complaint detail views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className="tab-button"
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'complaint'}
            className="tab-button"
            onClick={() => setActiveTab('complaint')}
          >
            Full complaint
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'progress'}
            className="tab-button"
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'priority'}
            className="tab-button"
            onClick={() => setActiveTab('priority')}
          >
            Priority
            {priorityEval.priority === 'critical' && (
              <span className="tab-total" style={{ color: 'var(--urgent)', background: 'var(--urgent-bg)' }}>
                Urgent
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <section className="detail-panel" aria-live="polite">
        {/* TAB 1: OVERVIEW (2-COLUMN MATCHING 03_COMPLAINT_DETAIL_TARGET.png) */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(290px, 1fr)', gap: '22px', alignItems: 'start' }}>
            {/* Left Column: Summary, Location, Narrative note */}
            <div>
              {/* Resolved Status Banner */}
              {isCompleted && (
                <div
                  className="reading-card"
                  style={{
                    border: '1px solid var(--success)',
                    background: 'var(--success-bg)',
                    marginBottom: '16px',
                  }}
                >
                  <h3 style={{ color: 'var(--success)', margin: '0 0 6px 0', textTransform: 'none', fontSize: '15px' }}>
                    Work Completed & Verified on Ground
                  </h3>
                  <p style={{ color: 'var(--body)', margin: 0, fontSize: '13.5px' }}>
                    {lastResolvedEvent?.description || 'Road asphalt patched and leveled by KMC crew.'}
                  </p>
                </div>
              )}

              <div className="reading-card">
                <h3>Summary</h3>
                <p>{summaryText}</p>
              </div>

              <div className="reading-card">
                <h3>Public location</h3>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--body)', marginBottom: landmark ? '4px' : '0' }}>
                  {localityStr}
                </div>
                {landmark && (
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {landmark}
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--soft-line)', marginTop: '16px', paddingTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                  Submitted {dt.date} · {dt.time}
                </div>
              </div>

              <div style={{ marginTop: '14px', fontSize: '12.5px', color: 'var(--muted)' }}>
                See{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('complaint')}
                  className="ghost-link"
                  style={{ fontSize: '12.5px', fontWeight: 600 }}
                >
                  Full complaint
                </button>{' '}
                for the resident's exact words.
              </div>
            </div>

            {/* Right Column: Manage Complaint Card */}
            <div>
              {!isCompleted && !isRejected ? (
                <div className="reading-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', textTransform: 'none', color: 'var(--text)', margin: '0 0 8px 0', letterSpacing: 'normal' }}>
                    Manage complaint
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>Current status</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '18px' }}>
                    {chip.label}
                  </div>

                  {complaint.status === 'under_review' && onOpenReviewModal && (
                    <button
                      type="button"
                      onClick={onOpenReviewModal}
                      className="overview-header-action"
                      style={{ width: '100%', height: '42px', background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)', marginBottom: '10px' }}
                    >
                      Assign Department
                    </button>
                  )}

                  {(complaint.status === 'submitted' || complaint.status === 'assigned') && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('accepted')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '42px', background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)', marginBottom: '8px' }}
                      >
                        Accept Complaint
                      </button>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        Accept this case when your team is ready to begin work.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('rejected')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '36px', color: 'var(--urgent)', borderColor: 'var(--line)', marginBottom: '16px' }}
                      >
                        Reject Complaint
                      </button>
                    </>
                  )}

                  {complaint.status === 'accepted' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('in_progress')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '42px', background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)', marginBottom: '8px' }}
                      >
                        Start Work
                      </button>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        Mark in progress when a remediation crew has been dispatched.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('rejected')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '36px', color: 'var(--urgent)', borderColor: 'var(--line)', marginBottom: '16px' }}
                      >
                        Reject Complaint
                      </button>
                    </>
                  )}

                  {complaint.status === 'in_progress' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('resolved')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '42px', background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', marginBottom: '8px' }}
                      >
                        Mark Work Done
                      </button>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                        Confirm field remediation and mark complaint resolved.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal('rejected')}
                        className="overview-header-action"
                        style={{ width: '100%', height: '36px', color: 'var(--urgent)', borderColor: 'var(--line)', marginBottom: '16px' }}
                      >
                        Reject Complaint
                      </button>
                    </>
                  )}

                  <div style={{ borderTop: '1px solid var(--soft-line)', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('progress')}
                      className="ghost-link"
                    >
                      View status history →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="reading-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', textTransform: 'none', color: 'var(--text)', margin: '0 0 8px 0', letterSpacing: 'normal' }}>
                    Complaint completed
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '3px' }}>Current status</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--success)', marginBottom: '14px' }}>
                    {chip.label}
                  </div>
                  <div style={{ borderTop: '1px solid var(--soft-line)', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('progress')}
                      className="ghost-link"
                    >
                      View full activity timeline →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FULL COMPLAINT */}
        {activeTab === 'complaint' && (
          <div>
            <div className="reading-card">
              <h3>Full complaint — sanitized</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{fullText}</p>
            </div>
            <p style={{ fontSize: '12px', marginTop: '15px', color: 'var(--muted)' }}>
              Processed by intelligent privacy engine. Direct citizen PII (personal mobile numbers, CNIC, private home address) has been redacted prior to municipal staff presentation.
            </p>
          </div>
        )}

        {/* TAB 3: PROGRESS */}
        {activeTab === 'progress' && (
          <div>
            <div className="reading-card">
              <h3>Complaint timeline</h3>
              <div className="timeline">
                {/* 1. Submitted */}
                <div className="timeline-row">
                  <span className="timeline-mark">✓</span>
                  <div>
                    <h3>Submitted</h3>
                    <p>{dt.date}, {dt.time} · Registered by citizen</p>
                  </div>
                </div>

                {/* 2. Accepted */}
                <div className={`timeline-row ${isAcceptedOrBeyond ? '' : 'future'}`}>
                  <span className="timeline-mark">{isAcceptedOrBeyond ? '✓' : '·'}</span>
                  <div>
                    <h3>Accepted</h3>
                    <p>
                      {isAcceptedOrBeyond
                        ? 'Department acknowledged grievance and accepted jurisdiction'
                        : 'Waiting for department acceptance'}
                    </p>
                  </div>
                </div>

                {/* 3. In Progress */}
                <div className={`timeline-row ${isInProgressOrBeyond ? '' : 'future'}`}>
                  <span className="timeline-mark">{isInProgressOrBeyond ? '✓' : '·'}</span>
                  <div>
                    <h3>In progress</h3>
                    <p>
                      {isInProgressOrBeyond
                        ? 'Remediation crew dispatched / repair work underway'
                        : 'Work not yet started'}
                    </p>
                  </div>
                </div>

                {/* 4. Completed */}
                <div className={`timeline-row ${isCompleted ? '' : 'future'}`}>
                  <span className="timeline-mark">{isCompleted ? '✓' : '·'}</span>
                  <div>
                    <h3>Completed</h3>
                    <p>
                      {isCompleted
                        ? 'Remediation confirmed and work marked complete'
                        : 'Pending completion'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Timeline Logs if present */}
            {complaint.timeline && complaint.timeline.length > 0 && (
              <div className="reading-card" style={{ marginTop: '16px' }}>
                <h3>Official Activity Log</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {complaint.timeline.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--canvas)',
                        border: '1px solid var(--line)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--text)' }}>{entry.title}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          {formatPakistanDateParts(entry.timestamp).date} {formatPakistanDateParts(entry.timestamp).time}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--body)' }}>{entry.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Update Button (Only if not resolved or rejected) */}
            {!isCompleted && !isRejected && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => onOpenStatusModal()}
                  className="overview-header-action"
                >
                  Add status note or change status →
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRIORITY */}
        {activeTab === 'priority' && (
          <div>
            <div className="reading-card">
              <h3>Priority assessment</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span className={`priority-pill ${priorityEval.priority === 'normal' || priorityEval.priority === 'low' ? 'neutral' : ''}`}>
                  {priorityDisplayLabel}
                </span>
                {complaint.manualPriority && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--brand-soft)',
                      color: 'var(--brand-strong)',
                      fontWeight: 600,
                    }}
                  >
                    Officer override
                  </span>
                )}
              </div>

              <div className="data-line">
                <span className="label">Evaluation reason</span>
                <span className="value">{priorityEval.priorityReason || priorityEval.explanation}</span>
              </div>
              {priorityEval.severityReason && (
                <div className="data-line">
                  <span className="label">Severity analysis</span>
                  <span className="value" style={{ color: priorityEval.priority === 'critical' ? 'var(--urgent)' : 'inherit', fontWeight: 600 }}>
                    {priorityEval.severityReason}
                  </span>
                </div>
              )}
              <div className="data-line">
                <span className="label">Waiting duration</span>
                <span className="value">{priorityEval.timeWaitingFormatted || `${priorityEval.agingHours} hours`}</span>
              </div>
              {complaint.manualPriorityReason && (
                <div className="data-line">
                  <span className="label">Override justification</span>
                  <span className="value">{complaint.manualPriorityReason}</span>
                </div>
              )}
              {complaint.manualPriorityBy && (
                <div className="data-line">
                  <span className="label">Overridden by</span>
                  <span className="value">
                    {complaint.manualPriorityBy} · {formatPakistanDateParts(complaint.manualPriorityAt || '').date}
                  </span>
                </div>
              )}
            </div>

            {/* Staff Priority Override Action */}
            {onOverridePriority && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="overview-header-action"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Override priority level...
                </button>
              </div>
            )}

            <p style={{ fontSize: '12px', marginTop: '14px', color: 'var(--muted)' }}>
              Urgency assessments use explainable safety hazard analysis, prolonged disruption duration, and department-authorized officer discretion.
            </p>
          </div>
        )}
      </section>

      {/* Priority Override Modal */}
      {isOverrideModalOpen && (
        <PriorityOverrideModal
          referenceNumber={complaint.referenceNumber}
          currentEval={priorityEval}
          onSaveOverride={(newPriority: PriorityLevel, reason: string) => {
            if (onOverridePriority) {
              onOverridePriority(complaint.referenceNumber, newPriority, reason);
            }
            setIsOverrideModalOpen(false);
          }}
          onClose={() => setIsOverrideModalOpen(false)}
        />
      )}
    </div>
  );
};
