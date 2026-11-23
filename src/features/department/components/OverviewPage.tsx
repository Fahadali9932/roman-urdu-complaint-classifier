import React, { useEffect, useState, useMemo } from 'react';
import type { DepartmentId, IncidentCaseSummary, AreaWorkloadSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { fieldOperations, type DepartmentWorkOrder } from '../services/fieldOperations';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  CalendarClock,
  FileCheck2,
  Send,
  MapPin,
} from 'lucide-react';
import '../v13_21_operations.css';

interface OverviewPageProps {
  departmentId: DepartmentId;
  departmentName: string;
  onNavigate: (section: WorkspaceSection) => void;
  onSelectCase: (caseId: string) => void;
  density?: 'comfortable' | 'compact';
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  departmentId,
  departmentName,
  onNavigate,
  onSelectCase,
  density = 'comfortable',
}) => {
  const [summary, setSummary] = useState<{
    totalCases: number;
    totalReports: number;
    casesNeedingResponse: number;
    casesAccepted: number;
    reportsAwaitingAck: number;
    casesInProgress: number;
    casesCompleted: number;
    casesUnassigned: number;
    urgentCases: number;
  }>({
    totalCases: 0,
    totalReports: 0,
    casesNeedingResponse: 0,
    casesAccepted: 0,
    reportsAwaitingAck: 0,
    casesInProgress: 0,
    casesCompleted: 0,
    casesUnassigned: 0,
    urgentCases: 0,
  });

  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [nextUpCases, setNextUpCases] = useState<IncidentCaseSummary[]>([]);
  const [topAreas, setTopAreas] = useState<AreaWorkloadSummary[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadState('loading');

    Promise.all([
      caseOperationsService.getDepartmentWorkSummary(departmentId),
      caseOperationsService.listDepartmentCases(departmentId, {
        displayMode: 'cases',
        savedView: 'needs',
        sort: 'attention',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        page: 0,
        pageSize: 5,
      }),
      caseOperationsService.listAreaWorkload(departmentId),
      fieldOperations.orders(departmentId).catch(() => []),
    ])
      .then(([workSummary, casesPage, areas, workOrders]) => {
        if (!active) return;
        setSummary(workSummary);
        setNextUpCases(casesPage.items.slice(0, 4));
        setTopAreas(areas.slice(0, 4));
        setOrders(workOrders);
        setLoadState('ready');

        const now = new Date();
        const pktTime = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        setLastRefreshed(`Updated today at ${pktTime} PKT`);
      })
      .catch((err) => {
        if (active) {
          setLoadState('error');
          console.warn('Overview data loading failed:', err);
        }
      });

    return () => {
      active = false;
    };
  }, [departmentId, reloadKey]);

  // Derived counts for the 4 Actionable Attention Ribbon Cards
  const urgentSafetyCount = useMemo(() => {
    const criticalCases = nextUpCases.filter((c) => c.priority === 'critical').length;
    return Math.max(summary.urgentCases || 0, criticalCases);
  }, [summary.urgentCases, nextUpCases]);

  const dueTodayCount = useMemo(() => {
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return orders.filter((o) => {
      if (o.status === 'verified') return false;
      const dueTime = new Date(o.due_at).getTime();
      return dueTime > now && dueTime <= endOfDay.getTime() + 86400000;
    }).length;
  }, [orders]);

  const proofPendingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'pending_review').length;
  }, [orders]);

  const activeDispatchesCount = useMemo(() => {
    return summary.casesInProgress + summary.casesUnassigned;
  }, [summary.casesInProgress, summary.casesUnassigned]);

  return (
    <div className={`overview-page v21-content-container ${density === 'compact' ? 'density-compact' : 'density-comfortable'}`}>
      {/* 1. Calm Civic Page Heading */}
      <div className="v21-sec-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {departmentName} / OPERATIONS DESK
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 2px 0', color: 'var(--v21-text-main)', letterSpacing: '-0.02em' }}>
            Good work starts here.
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--v21-text-muted)', margin: 0 }}>
            Calm, task-first municipal operations. Address immediate safety risks and dispatch field crews.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="v21-btn"
            onClick={() => setReloadKey((key) => key + 1)}
            aria-label="Refresh department overview"
            title="Refresh overview"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="v21-btn v21-btn-primary"
            onClick={() => onNavigate('queue')}
          >
            <span>Open work queue</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Honest Local Demonstration Notice */}
      {caseOperationsService.isDemonstrationWorkspace() && (
        <div className="ops-demo-notice" role="note" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>
            <strong>Local demonstration.</strong> Figures include seeded sample incidents and may not reflect production workload.
          </span>
        </div>
      )}

      {loadState === 'error' && (
        <div className="ops-error-state" role="alert" style={{ marginBottom: '16px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Overview unavailable</strong>
            <p>We could not load the latest case summary. Existing counts have not been refreshed.</p>
          </div>
          <button type="button" className="v21-btn" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="ops-loading-state" role="status" style={{ padding: '24px 0', color: 'var(--v21-text-muted)' }}>
          Refreshing department summary…
        </div>
      )}

      {loadState === 'ready' && (
        <>
          {/* 2. Four Actionable Attention Ribbon Cards */}
          <div className="v21-ribbon-grid" role="group" aria-label="Department priority ribbons">
            <button
              type="button"
              className={`v21-ribbon-card ${urgentSafetyCount > 0 ? 'urgent' : ''}`}
              onClick={() => onNavigate('queue')}
            >
              <div>
                <div className="v21-ribbon-label">Urgent Safety</div>
                <div className="v21-ribbon-number">{urgentSafetyCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '2px' }}>
                  {urgentSafetyCount > 0 ? 'Hazardous incidents' : 'No hazards pending'}
                </div>
              </div>
              <ShieldAlert size={20} color={urgentSafetyCount > 0 ? 'var(--v21-danger)' : 'var(--v21-text-tertiary)'} />
            </button>

            <button
              type="button"
              className={`v21-ribbon-card ${dueTodayCount > 0 ? 'warning' : ''}`}
              onClick={() => onNavigate('dispatch')}
            >
              <div>
                <div className="v21-ribbon-label">Due Today</div>
                <div className="v21-ribbon-number">{dueTodayCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '2px' }}>
                  Work orders nearing SLA
                </div>
              </div>
              <CalendarClock size={20} color={dueTodayCount > 0 ? 'var(--v21-warning)' : 'var(--v21-text-tertiary)'} />
            </button>

            <button
              type="button"
              className={`v21-ribbon-card ${proofPendingCount > 0 ? 'active' : ''}`}
              onClick={() => onNavigate('dispatch')}
            >
              <div>
                <div className="v21-ribbon-label">Proof Review</div>
                <div className="v21-ribbon-number">{proofPendingCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '2px' }}>
                  Photos awaiting sign-off
                </div>
              </div>
              <FileCheck2 size={20} color={proofPendingCount > 0 ? 'var(--v21-accent)' : 'var(--v21-text-tertiary)'} />
            </button>

            <button
              type="button"
              className="v21-ribbon-card"
              onClick={() => onNavigate('queue')}
            >
              <div>
                <div className="v21-ribbon-label">Active Dispatches</div>
                <div className="v21-ribbon-number">{activeDispatchesCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '2px' }}>
                  Crews mobilized & unassigned
                </div>
              </div>
              <Send size={20} color="var(--v21-text-tertiary)" />
            </button>
          </div>

          {/* 3. Primary Task Stream: "Immediate Action Required" (Max 3-4 items) */}
          <section aria-labelledby="v21-immediate-action-heading" style={{ marginBottom: '24px' }}>
            <div className="v21-sec-header">
              <h2 id="v21-immediate-action-heading" className="v21-sec-title">
                Immediate Action Required
                <span className="v21-sec-counter">{nextUpCases.length} prioritized</span>
              </h2>
              <button
                type="button"
                className="v21-sec-link"
                onClick={() => onNavigate('queue')}
              >
                <span>View all {summary.casesNeedingResponse} cases in queue →</span>
              </button>
            </div>

            <div className="v21-case-card">
              {nextUpCases.length > 0 ? (
                nextUpCases.map((c) => {
                  const isCritical = c.priority === 'critical';
                  return (
                    <div
                      key={c.id}
                      className="v21-case-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectCase(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectCase(c.id);
                        }
                      }}
                    >
                      <div className="v21-case-main">
                        <span
                          className={`v21-status-dot ${isCritical ? 'danger' : c.priority === 'high' ? 'warning' : 'normal'}`}
                          title={isCritical ? 'Critical Safety Risk' : c.priority}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="v21-meta-code">{c.caseNumber}</span>
                            <span className="v21-case-title">
                              {isCritical && (
                                <span style={{ color: 'var(--v21-danger)', marginRight: '6px', fontWeight: 700 }}>
                                  [Safety Risk]
                                </span>
                              )}
                              {c.title}
                            </span>
                          </div>
                          <div className="v21-case-meta">
                            <span><MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />{c.locality}</span>
                            <span>·</span>
                            <span>{c.linkedReportCount} citizen {c.linkedReportCount === 1 ? 'report' : 'reports'}</span>
                            <span>·</span>
                            <span>Reported {c.ageDays} {c.ageDays === 1 ? 'day' : 'days'} ago</span>
                          </div>
                        </div>
                      </div>

                      <div className="v21-case-actions">
                        <button
                          type="button"
                          className="v21-btn v21-btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                          }}
                        >
                          <span>Dispatch Officer</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--v21-text-muted)', fontSize: '13px' }}>
                  No incident cases currently require immediate triage.
                </div>
              )}
            </div>
          </section>

          {/* 4. Three Distinct Non-Overlapping Workload Totals (Backward test compatibility) */}
          <div className="overview-facts-strip" role="group" aria-label="Department case summary metrics" style={{ marginBottom: '24px' }}>
            <button
              type="button"
              className="fact-item"
              onClick={() => onNavigate('queue')}
            >
              <span className="fact-label">Total incident cases</span>
              <b className="fact-value">{summary.totalCases}</b>
              <span className="fact-desc">unique public issues</span>
            </button>

            <button
              type="button"
              className="fact-item"
              onClick={() => onNavigate('queue')}
            >
              <span className="fact-label">Citizen reports</span>
              <b className="fact-value">{summary.totalReports.toLocaleString()}</b>
              <span className="fact-desc">individually trackable submissions</span>
            </button>

            <button
              type="button"
              className="fact-item"
              onClick={() => onNavigate('queue')}
            >
              <span className="fact-label">Unassigned cases</span>
              <b className="fact-value fact-alert">{summary.casesUnassigned}</b>
              <span className="fact-desc">need a responsible officer</span>
            </button>
          </div>

          {/* 5. Lower Section: Where help is needed (Top Areas) */}
          <section aria-labelledby="v21-areas-heading" style={{ marginBottom: '24px' }}>
            <div className="v21-sec-header">
              <h2 id="v21-areas-heading" className="v21-sec-title">
                Where help is needed
              </h2>
              <button
                type="button"
                className="v21-sec-link"
                onClick={() => onNavigate('areas')}
              >
                <span>View all areas →</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {topAreas.map((a) => (
                <button
                  type="button"
                  key={a.area}
                  className="v21-ribbon-card"
                  onClick={() => onNavigate('areas')}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v21-text-main)' }}>
                      {a.area}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.topIssues.length > 0 ? a.topIssues.join(', ') : 'Municipal works'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--v21-text-main)' }}>
                      {a.activeCasesCount}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)' }}>
                      {a.activeCasesCount === 1 ? 'case' : 'cases'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--v21-text-tertiary)', paddingTop: '12px', borderTop: '1px solid var(--v21-border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
            <span>Each case represents one incident; its linked citizen reports stay separately traceable.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              <span>{lastRefreshed}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
