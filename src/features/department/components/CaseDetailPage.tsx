import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface CaseDetailPageProps {
  caseId: string;
  onBack: () => void;
  onOpenReport?: (referenceNumber: string) => void;
  isArchive?: boolean;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  caseId,
  onBack,
  onOpenReport,
  isArchive = false,
}) => {
  const [caseItem, setCaseItem] = useState<IncidentCaseSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'activity' | 'work'>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportError, setReportError] = useState(false);

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
  const pendingAcceptKey = useRef<string | null>(null);

  useEffect(() => {
    // An idempotency key belongs to one case and must never follow a navigation.
    pendingAcceptKey.current = null;
  }, [caseId]);

  // Load Case Item
  const loadCase = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const item = await caseOperationsService.getCaseDetail(caseId);
      setCaseItem(item);
      if (item) {
        const prev = await caseOperationsService.previewBulkAcceptance(item.id);
        setPreview(prev);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Load Reports Tab Data
  const loadReports = useCallback(async () => {
    if (!caseItem) return;
    setReportError(false);
    try {
      const res = await caseOperationsService.listCaseReports(caseItem.id, reportSearch, reportPageNum, 10);
      setReportsPage(res);
    } catch {
      setReportError(true);
    }
  }, [caseItem, reportSearch, reportPageNum]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  // Load Activity Tab Data
  useEffect(() => {
    if (activeTab === 'activity' && caseItem) {
      caseOperationsService.listCaseActivity(caseItem.id).then(setActivityEvents).catch(() => setActivityEvents([]));
    }
  }, [activeTab, caseItem]);

  // Handle Bulk Accept Confirmation
  const handleConfirmAccept = async () => {
    if (!caseItem) return;
    setIsSubmittingAccept(true);
    try {
      // Retry the same transaction key after uncertain network failures.
      const idempotencyKey = pendingAcceptKey.current ?? `idemp-${crypto.randomUUID()}`;
      pendingAcceptKey.current = idempotencyKey;
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
      pendingAcceptKey.current = null;
      setToastMessage(
        `${result.accepted} reports accepted · ${result.skippedIneligible} unchanged`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`Acceptance failed: ${err?.message || 'Please retry.'}`);
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

  if (loadError) return <div className="ops-error-state" role="alert"><AlertCircle size={22} /><div><strong>Could not open the case</strong><p>{loadError}</p></div><button type="button" className="button" onClick={loadCase}><RefreshCw size={16} /> Retry</button></div>;

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
        {isArchive ? 'Back to completed cases' : 'Back to work queue'}
      </button>

      {/* Page Header */}
      <div className="page-heading detail-heading">
        <div style={{ minWidth: 0 }}>
          <div className="ops-eyebrow">Incident record</div>
          <h1 style={{ textWrap: 'balance' }}>{caseItem.title}</h1>
          <div className="detail-sub">
            <span className="tag" style={{ whiteSpace: 'nowrap' }}>{caseItem.caseNumber}</span>
            <span>{caseItem.locality}</span>
            <span aria-hidden="true">·</span>
            <span>{caseItem.publicPlace}</span>
          </div>
        </div>

        <div className="detail-header-actions">
          <button className="ops-icon-action" type="button" title="Refresh case" aria-label="Refresh case" onClick={loadCase}><RefreshCw size={17} /></button>
          {caseItem.workStatus === 'completed' ? (
            <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Filed in Completed cases</span>
          ) : eligibleCount === 1 ? (
            <button
              type="button"
              className="button primary"
              data-action="open-accept"
              onClick={() => setIsModalOpen(true)}
            >
              <Check className="ico" style={{ width: 16, height: 16 }} />
              Accept complaint
            </button>
          ) : eligibleCount > 1 ? (
            <span className="tag" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>
              Inspect reports individually
            </span>
          ) : (
            <span className="tag" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              ✓ Complaint acknowledged
            </span>
          )}
        </div>
      </div>

      {/* Quiet Key-Fact Definition Strip (replaces boxed cell grid) */}
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
          <div className="two-cols ops-detail-record">
            <section className="section ops-detail-narrative">
              <h2>Incident summary</h2>
              <div className="detail-brief">{caseItem.summary}</div>

              <h3>Public incident location</h3>
              <p className="value">{caseItem.publicPlace}</p>
              <p>{caseItem.locality}</p>

              <div className="quiet-divider" />

              <h2>Required action</h2>
              <p>
                {eligibleCount > 0
                  ? `${eligibleCount} reports are awaiting initial acknowledgment.`
                  : 'All citizen reports in this case have been acknowledged.'}
              </p>
            </section>

            <aside className="section ops-detail-meta">
              <h2>Case details</h2>
              <div className="statline">
                <div>
                  <strong>Reports received</strong>
                </div>
                <b>{caseItem.linkedReportCount}</b>
              </div>

              <div className="statline">
                <div>
                  <strong>Waiting for acknowledgment</strong>
                </div>
                <b>{eligibleCount}</b>
              </div>

              <div className="statline">
                <div>
                  <strong>Assigned to</strong>
                </div>
                <b>{caseItem.assignedStaffLabel === 'Unassigned' ? 'Not assigned' : caseItem.assignedStaffLabel}</b>
              </div>

              <div className="quiet-divider" />

              <h2>Priority rationale</h2>
              <p>
                {caseItem.priority === 'critical'
                  ? 'Safety hazard: prioritized for immediate field review regardless of report count.'
                  : caseItem.priority === 'high'
                  ? `Reported ${caseItem.ageDays} days ago. Residents remain affected.`
                  : `Standard municipal priority across ${caseItem.linkedReportCount} linked reports.`}
              </p>
            </aside>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="section">
            <div className="report-head">
              <div>
                <h2 style={{ marginBottom: 6 }}>Reports on this issue</h2>
                <span className="hint">
                  {caseItem.linkedReportCount} reports · {eligibleCount} waiting for a reply
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

            {reportError && <div className="ops-error-state" role="alert"><AlertCircle size={18} /><div><strong>Reports could not be loaded</strong><p>Try again to view the linked submissions.</p></div><button className="button" type="button" onClick={loadReports}>Retry</button></div>}
            {!reportError && (reportsPage.items.length > 0 ? (
              reportsPage.items.map((r) => (
                <button type="button"
                  key={r.complaintId}
                  className="report-line"
                  disabled={!onOpenReport}
                  onClick={() => onOpenReport?.(r.referenceNumber)}
                  aria-label={`Open original report ${r.referenceNumber}`}
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
                </button>
              ))
            ) : (
              <div className="empty-state">No linked reports match this search.</div>
            ))}

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
            <h2>Updates</h2>

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
              <h2>Work</h2>
              <p>
                {caseItem.assignedStaffLabel === 'Unassigned'
                  ? 'No one is assigned yet.'
                  : `Assigned to ${caseItem.assignedStaffLabel}.`}
              </p>
              <div className="notice">
                {eligibleCount > 0
                  ? `Accept ${eligibleCount} reports to mark them as received. Physical work can then be tracked here.`
                  : 'All linked reports in this case have already been acknowledged.'}
              </div>
            </section>

            <aside className="section">
              <h2>Assignment</h2>
              <p className="value">{caseItem.assignedStaffLabel === 'Unassigned' ? 'Not assigned' : caseItem.assignedStaffLabel}</p>
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
