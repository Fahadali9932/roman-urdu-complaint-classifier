import React, { useEffect, useState, useMemo } from 'react';
import type { DepartmentId, IncidentCaseSummary, AreaWorkloadSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { fieldOperations, type DepartmentWorkOrder } from '../services/fieldOperations';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { V3CaseRow, V3QuietAction } from '../../../components/v3';
import '../v13_21_operations.css';

interface OverviewPageProps {
  departmentId: DepartmentId;
  departmentName: string;
  onNavigate: (section: WorkspaceSection) => void;
  onSelectCase: (caseId: string) => void;
  density?: 'comfortable' | 'compact';
}

/**
 * V3 · Department Head · Focus screen:
 * Calm operational focal view showing 2-4 highest-priority pending decisions
 * without heavy metric card clutter.
 */
export const OverviewPage: React.FC<OverviewPageProps> = ({
  departmentId,
  departmentName,
  onNavigate,
  onSelectCase,
}) => {
  const [summary, setSummary] = useState({
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
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadState('loading');

    Promise.all([
      caseOperationsService.getDepartmentWorkSummary(departmentId),
      caseOperationsService.listDepartmentCases(departmentId, {
        savedView: 'needs',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 4,
      }),
      caseOperationsService.listAreaWorkload(departmentId),
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
    ])
      .then(([sum, nextPage, areaRows, orderRows]) => {
        if (!active) return;
        setSummary(sum);
        setNextUpCases(nextPage.items.slice(0, 4));
        setTopAreas(areaRows.slice(0, 4));
        setOrders(orderRows);
        setLastRefreshed(
          new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
        );
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [departmentId, reloadKey]);

  const proofPending = useMemo(
    () => orders.filter((o) => o.status === 'pending_review'),
    [orders]
  );
  const extensionPending = useMemo(
    () => orders.filter((o) => Boolean(o.extension_requested_due_at)),
    [orders]
  );

  // Compose 2-4 focused decisions matching V3 Head Focus cadence
  const decisionItems = useMemo(() => {
    const rows: Array<{
      id: string;
      title: string;
      meta: string;
      status: string;
      tone: 'default' | 'danger' | 'warning' | 'success';
      actionLabel: string;
      onAction: () => void;
    }> = [];

    for (const order of proofPending.slice(0, 2)) {
      rows.push({
        id: `proof-${order.id}`,
        title: order.case_label || 'Completed work verification',
        meta: `Evidence submitted · Due ${new Date(order.due_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`,
        status: 'Proof review',
        tone: 'warning',
        actionLabel: 'Review',
        onAction: () => onNavigate('verification'),
      });
    }

    for (const order of extensionPending.slice(0, 1)) {
      rows.push({
        id: `ext-${order.id}`,
        title: order.case_label || 'Deadline extension request',
        meta: order.extension_reason || 'Requested extra field time',
        status: 'Extension pending',
        tone: 'warning',
        actionLabel: 'Review',
        onAction: () => onNavigate('dispatch'),
      });
    }

    for (const c of nextUpCases) {
      if (rows.length >= 4) break;
      rows.push({
        id: `case-${c.id}`,
        title: c.title,
        meta: `${c.caseNumber} · ${c.locality} · ${c.linkedReportCount} ${
          c.linkedReportCount === 1 ? 'report' : 'reports'
        }`,
        status: c.priority === 'critical' ? 'Safety concern' : 'Needs dispatch',
        tone: c.priority === 'critical' ? 'danger' : 'default',
        actionLabel: c.assignedStaffId ? 'Inspect' : 'Dispatch',
        onAction: () => onSelectCase(c.id),
      });
    }

    return rows.slice(0, 4);
  }, [proofPending, extensionPending, nextUpCases, onNavigate, onSelectCase]);

  return (
    <div className="mx-auto w-full max-w-[960px]" data-testid="department-overview-view">
      {/* V3 Focus Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="v3-eyebrow">
            {departmentId.toUpperCase()} · {departmentName}
          </div>
          <h1 className="v3-page-h1">Focus</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--v3-muted)' }}>
            Decisions for today — prioritized to keep response calm and timely.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <V3QuietAction onClick={() => setReloadKey((k) => k + 1)} aria-label="Refresh department overview">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </V3QuietAction>
          <button
            type="button"
            className="v3-btn-primary"
            onClick={() => onNavigate('queue')}
          >
            Open complaints
          </button>
        </div>
      </div>

      {/* Honest Local Demonstration Notice */}
      {caseOperationsService.isDemonstrationWorkspace() && (
        <div
          className="mt-5 flex items-center gap-2.5 rounded-[12px] px-4 py-3 text-[13px]"
          style={{
            backgroundColor: 'var(--v3-raised)',
            border: '1px solid var(--v3-edge)',
            color: 'var(--v3-ink)',
          }}
          role="note"
        >
          <AlertCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--v3-accent)' }} />
          <span>
            <strong>Local demonstration.</strong> Figures include seeded sample incidents and do not represent live municipal counts.
          </span>
        </div>
      )}

      {loadState === 'error' && (
        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] p-4"
          style={{
            backgroundColor: 'var(--v3-danger-soft)',
            border: '1px solid var(--v3-danger)',
          }}
          role="alert"
        >
          <div>
            <strong className="text-[14px]">Overview unavailable</strong>
            <p className="text-[13px]" style={{ color: 'var(--v3-muted)' }}>
              We could not load the latest case summary.
            </p>
          </div>
          <button type="button" className="v3-btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="py-10 text-[14px]" style={{ color: 'var(--v3-muted)' }} role="status">
          Refreshing department focus…
        </div>
      )}

      {loadState === 'ready' && (
        <>
          {/* Decisions for today (2-4 prioritized items) */}
          <section aria-labelledby="v3-decisions-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="v3-decisions-heading" className="v3-section-heading">
                Decisions for today
              </h2>
              <V3QuietAction onClick={() => onNavigate('queue')}>
                View all {summary.casesNeedingResponse} pending →
              </V3QuietAction>
            </div>

            {decisionItems.length > 0 ? (
              <div>
                {decisionItems.map((item, idx) => (
                  <V3CaseRow
                    key={item.id}
                    title={item.title}
                    meta={item.meta}
                    status={item.status}
                    statusTone={item.tone}
                    actionLabel={item.actionLabel}
                    onAction={item.onAction}
                    focused={idx === 0}
                  />
                ))}
              </div>
            ) : (
              <div
                className="v3-card p-6 text-[14px]"
                style={{ color: 'var(--v3-muted)' }}
              >
                No pending dispatch, extension, or proof reviews require immediate action.
              </div>
            )}
          </section>

          {/* Compact calm operational totals strip */}
          <div
            className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-b py-4 text-[13px]"
            style={{ borderColor: 'var(--v3-edge)', color: 'var(--v3-muted)' }}
            role="group"
            aria-label="Department case summary metrics"
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="inline-flex items-baseline gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-left"
                style={{ color: 'var(--v3-muted)' }}
              >
                <strong style={{ color: 'var(--v3-ink)' }}>{summary.totalCases}</strong>
                <span>Total incident cases</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="inline-flex items-baseline gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-left"
                style={{ color: 'var(--v3-muted)' }}
              >
                <strong style={{ color: 'var(--v3-ink)' }}>{summary.totalReports.toLocaleString()}</strong>
                <span>Citizen reports</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="inline-flex items-baseline gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-left"
                style={{ color: 'var(--v3-muted)' }}
              >
                <strong style={{ color: 'var(--v3-danger)' }}>{summary.casesUnassigned}</strong>
                <span>Unassigned cases</span>
              </button>
              <span>
                <strong style={{ color: 'var(--v3-ink)' }}>{proofPending.length}</strong> Awaiting proof review
              </span>
            </div>
            {lastRefreshed && <span>Updated {lastRefreshed}</span>}
          </div>

          {/* Areas needing attention */}
          {topAreas.length > 0 && (
            <section aria-labelledby="v3-areas-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="v3-areas-heading" className="v3-section-heading">
                  Where help is needed
                </h2>
                <V3QuietAction onClick={() => onNavigate('areas')}>
                  All areas →
                </V3QuietAction>
              </div>

              <div>
                {topAreas.map((area) => (
                  <V3CaseRow
                    key={area.area}
                    title={area.area}
                    meta={area.topIssues.length > 0 ? area.topIssues.join(', ') : 'Municipal works'}
                    status={`${area.activeCasesCount} ${area.activeCasesCount === 1 ? 'case' : 'cases'}`}
                    actionLabel="Open"
                    onAction={() => onNavigate('areas')}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
