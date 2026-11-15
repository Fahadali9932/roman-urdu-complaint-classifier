import React, { useState, useEffect, useCallback } from 'react';
import {
  type IncidentCaseSummary,
  type CaseReportRow,
  type CaseActivityEvent,
  type BulkAcceptPreview,
  type CursorPage,
} from '../../../types';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { BulkAcceptModal } from './BulkAcceptModal';
import {
  ArrowLeft,
  Check,
  Search,
  Loader2,
} from 'lucide-react';

interface CaseDetailPageProps {
  caseId: string;
  onBack: () => void;
  onOpenReport?: (referenceNumber: string) => void;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  caseId,
  onBack,
  onOpenReport,
}) => {
  const [caseItem, setCaseItem] = useState<IncidentCaseSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'activity' | 'work'>('overview');
  const [loading, setLoading] = useState(true);

  // Reports tab state
  const [reportSearch, setReportSearch] = useState('');
  const [reportPageNum, setReportPageNum] = useState(0);
  const [reportsPage, setReportsPage] = useState<CursorPage<CaseReportRow>>({
    items: [],
    nextCursor: null,
    prevCursor: null,
    total: 0,
    page: 0,
    pageSize: 10,
    totalPages: 1,
  });

  // Activity tab state
  const [activityEvents, setActivityEvents] = useState<CaseActivityEvent[]>([]);

  // Bulk Accept Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preview, setPreview] = useState<BulkAcceptPreview | null>(null);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Case Item
  const loadCase = useCallback(async () => {
    setLoading(true);
    const item = await caseOperationsService.getCaseDetail(caseId);
    setCaseItem(item);
    if (item) {
      const prev = await caseOperationsService.previewBulkAcceptance(item.id);
      setPreview(prev);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Load Reports Tab Data
  const loadReports = useCallback(async () => {
    if (!caseItem) return;
    const res = await caseOperationsService.listCaseReports(
      caseItem.id,
      reportSearch,
      reportPageNum,
      10
    );
    setReportsPage(res);
  }, [caseItem, reportSearch, reportPageNum]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  // Load Activity Tab Data
  useEffect(() => {
    if (activeTab === 'activity' && caseItem) {
      caseOperationsService.listCaseActivity(caseItem.id).then(setActivityEvents);
    }
  }, [activeTab, caseItem]);

  // Handle Bulk Accept Confirmation
  const handleConfirmAccept = async () => {
    if (!caseItem) return;
    setIsSubmittingAccept(true);
    try {
      const idempotencyKey = `idemp-${Date.now()}`;
      const result = await caseOperationsService.executeBulkAcceptance(
        caseItem.id,
        idempotencyKey
      );

      // Refresh case and preview
      await loadCase();
      if (activeTab === 'reports') await loadReports();
      if (activeTab === 'activity') {
        const act = await caseOperationsService.listCaseActivity(caseItem.id);
        setActivityEvents(act);
      }

      setIsModalOpen(false);
      setToastMessage(
        `${result.accepted} reports accepted · ${result.skippedIneligible} unchanged`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Bulk accept failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const formatPakistanDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Karachi',
          hour12: true,
        })
          .format(d)
          .replace(',', ' ·') + ' PKT'
      );
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 className="ico animate-spin" style={{ width: 28, height: 28, margin: '0 auto' }} />
        <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading incident case details...</p>
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Incident case not found</h2>
        <p>The requested case reference does not exist or you lack access.</p>
        <button type="button" className="button" onClick={onBack}>
          Back to work queue
        </button>
      </div>
    );
  }

  const eligibleCount = preview ? preview.eligible : caseItem.pendingAcceptanceCount;

  return (
    <div className="case-detail-container">
      {/* Back button */}
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft className="ico" style={{ width: 16, height: 16 }} />
        Back to work queue
      </button>

      {/* Page Header */}
      <div className="page-heading detail-heading">
        <div>
          <h1>{caseItem.title}</h1>
          <div className="detail-sub">
            <span className="tag">{caseItem.caseNumber}</span>
            <span>{caseItem.locality}</span>
            <span>·</span>
            <span>{caseItem.publicPlace}</span>
          </div>
        </div>

        <div className="detail-header-actions">
          {eligibleCount > 0 ? (
            <button
              type="button"
              className="button primary"
              data-action="open-accept"
              onClick={() => setIsModalOpen(true)}
            >
              <Check className="ico" style={{ width: 16, height: 16 }} />
              Accept {eligibleCount} eligible reports
            </button>
          ) : (
            <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              ✓ All reports acknowledged
            </span>
          )}
          <button
            type="button"
            className="button"
            data-tab="reports"
            onClick={() => setActiveTab('reports')}
          >
            View reports
          </button>
        </div>
      </div>

      {/* Fact Strip Card */}
      <div className="fact-strip">
        <div className="fact">
          <span>Work status</span>
          <strong>
            {caseItem.workStatus === 'needs_acceptance'
              ? 'Needs acceptance'
              : caseItem.workStatus === 'in_progress'
              ? 'In progress'
              : caseItem.workStatus === 'completed'
              ? 'Completed'
              : 'Accepted'}
          </strong>
        </div>
        <div className="fact">
          <span>Linked original reports</span>
          <strong>{caseItem.linkedReportCount} reports · {caseItem.uniqueReporterCount} residents</strong>
        </div>
        <div className="fact">
          <span>First reported</span>
          <strong>{caseItem.ageDays} days ago</strong>
        </div>
        <div className="fact">
          <span>Issue type</span>
          <strong>{caseItem.issueSubtype}</strong>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="detail-tabs" role="tablist" aria-label="Incident case details">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reports'}
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports ({caseItem.linkedReportCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activity'}
          className={activeTab === 'activity' ? 'active' : ''}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'work'}
          className={activeTab === 'work' ? 'active' : ''}
          onClick={() => setActiveTab('work')}
        >
          Work
        </button>
      </div>

      {/* Tab Content */}
      <div className="detail-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="two-cols">
            <section className="section">
              <h2>Incident summary</h2>
              <div className="detail-brief">{caseItem.summary}</div>

              <h3>Public incident location</h3>
              <p className="value">{caseItem.publicPlace}</p>
              <p>
                {caseItem.locality} · Verified public-place description from citizen submissions.
                No citizen residential or private address details are ever displayed.
              </p>

              <div className="quiet-divider" />

              <h2>What&apos;s needed</h2>
              <p>
                {eligibleCount > 0
                  ? `Review linked reports and accept the ${eligibleCount} still awaiting department acknowledgement. This single action updates each citizen's tracking record; it does not confirm that physical field work is completed.`
                  : 'There are no linked reports awaiting acknowledgement in this case. Work coordination and progress updates can be logged in the Work tab.'}
              </p>
            </section>

            <aside className="section">
              <h2>At a glance</h2>
              <div className="statline">
                <div>
                  <strong>Original reports</strong>
                  <br />
                  <span>Independently trackable</span>
                </div>
                <b>{caseItem.linkedReportCount}</b>
              </div>

              <div className="statline">
                <div>
                  <strong>Awaiting acceptance</strong>
                  <br />
                  <span>Eligible for one action</span>
                </div>
                <b>{eligibleCount}</b>
              </div>

              <div className="statline">
                <div>
                  <strong>Staff owner</strong>
                  <br />
                  <span>Work assignment</span>
                </div>
                <b>{caseItem.assignedStaffLabel}</b>
              </div>

              <div className="quiet-divider" />

              <h2>Priority context</h2>
              <p>
                {caseItem.priority === 'critical'
                  ? 'Safety hazard: this case must be considered quickly even if only one person reports it.'
                  : caseItem.priority === 'high'
                  ? 'Age and service disruption make this case worth immediate operational attention.'
                  : `Standard priority. ${caseItem.linkedReportCount} reports inform scale but do not automatically make a life safety hazard.`}
              </p>
            </aside>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="section">
            <div className="report-head">
              <div>
                <h2 style={{ marginBottom: 6 }}>Linked original complaints</h2>
                <span className="hint">
                  {caseItem.linkedReportCount} independent reports · {eligibleCount} awaiting acceptance
                </span>
              </div>
              <label className="searchbox" htmlFor="caseReportSearch">
                <Search className="ico" />
                <input
                  id="caseReportSearch"
                  type="search"
                  value={reportSearch}
                  onChange={(e) => {
                    setReportSearch(e.target.value);
                    setReportPageNum(0);
                  }}
                  placeholder="Search reference or report text"
                  aria-label="Search linked reports"
                />
              </label>
            </div>

            {reportsPage.items.length > 0 ? (
              reportsPage.items.map((r) => (
                <div
                  key={r.complaintId}
                  className="report-line"
                  style={onOpenReport ? { cursor: 'pointer' } : undefined}
                  onClick={() => onOpenReport?.(r.referenceNumber)}
                >
                  <div>
                    <div className="report-ref">
                      {r.referenceNumber} · {formatPakistanDate(r.submittedAt)}
                    </div>
                    <p>{r.sanitizedNarrativePreview}</p>
                  </div>
                  <span
                    className={`status ${
                      r.status === 'assigned' || r.status === 'submitted'
                        ? 'pending'
                        : r.status === 'in_progress'
                        ? 'progress'
                        : r.status === 'resolved'
                        ? 'done'
                        : 'pending'
                    }`}
                  >
                    {r.status === 'assigned'
                      ? 'Pending'
                      : r.status === 'accepted'
                      ? 'Accepted'
                      : r.status === 'in_progress'
                      ? 'In progress'
                      : r.status === 'resolved'
                      ? 'Completed'
                      : r.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">No linked reports match this search.</div>
            )}

            <div className="list-footer">
              <span>
                {reportsPage.total > 0 ? (
                  <>
                    {reportPageNum * 10 + 1}–
                    {Math.min((reportPageNum + 1) * 10, reportsPage.total)} of{' '}
                    {reportsPage.total} original reports
                  </>
                ) : (
                  '0 reports'
                )}
              </span>

              <div className="row">
                <button
                  type="button"
                  className="button small"
                  data-action="reports-prev"
                  disabled={reportPageNum === 0}
                  onClick={() => setReportPageNum((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {reportPageNum + 1} of {reportsPage.totalPages}
                </span>
                <button
                  type="button"
                  className="button small"
                  data-action="reports-next"
                  disabled={reportPageNum >= reportsPage.totalPages - 1}
                  onClick={() => setReportPageNum((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="section">
            <h2>Case activity</h2>
            <p className="hint">
              These are case-level events. Every citizen&apos;s original complaint maintains an independent timeline history.
            </p>

            {activityEvents.map((a) => (
              <div key={a.id} className="activity-line">
                <span className="activity-dot" />
                <div>
                  <strong>{a.label}</strong>
                  <p>{a.detail}</p>
                  <span className="hint">
                    {a.actorLabel} · {a.formattedWhen}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WORK TAB */}
        {activeTab === 'work' && (
          <div className="two-cols">
            <section className="section">
              <h2>Work coordination</h2>
              <p>
                Work assignment and field crew dispatch. Real updates reflect authorized
                department actions on the ground.
              </p>
              <div className="notice">
                {eligibleCount > 0
                  ? `${eligibleCount} incoming reports can be acknowledged in one confirmed action. Acceptance is distinct from starting work or recording proof of completion.`
                  : 'All linked reports in this case have already been acknowledged or completed.'}
              </div>
            </section>

            <aside className="section">
              <h2>Assignment</h2>
              <p className="value">{caseItem.assignedStaffLabel}</p>
              <p className="hint">
                Municipal operations maintain an audited staff assignment log.
              </p>
            </aside>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {preview && (
        <BulkAcceptModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          caseItem={caseItem}
          preview={preview}
          onConfirm={handleConfirmAccept}
          isSubmitting={isSubmittingAccept}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
};
