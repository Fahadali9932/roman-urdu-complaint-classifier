import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { DepartmentId } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import {
  caseOperationsService,
  type HeadIndependentComplaintRow,
  type HeadOverviewPeriod,
} from '../../../services/CaseOperationsService';
import {
  fieldOperations,
  type DepartmentOfficer,
  type DepartmentWorkOrder,
} from '../services/fieldOperations';
import { LiquidSegmentedControl } from './glass/LiquidSegmentedControl';
import { PriorityPill } from './glass/PriorityPill';

export type ExtendedDateFilter = HeadOverviewPeriod | 'custom';
type InboxTab = 'priority' | 'unassigned' | 'in_progress' | 'all';

interface HeadHomePageProps {
  departmentId: DepartmentId;
  departmentCode: string;
  departmentName: string;
  username: string;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onNavigate: (
    section: WorkspaceSection,
    options?: { queueView?: 'needs' | 'unassigned' | 'mine' | 'all' | 'completed'; period?: HeadOverviewPeriod }
  ) => void;
  onSelectCase: (caseId: string) => void;
}

const DATE_OPTIONS: ReadonlyArray<{ id: ExtendedDateFilter; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

const INBOX_TABS: ReadonlyArray<{ id: InboxTab; label: string }> = [
  { id: 'priority', label: 'Priority' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'all', label: 'All' },
];

function formatComplaintStatus(row: HeadIndependentComplaintRow): string {
  if (row.workOrderStatus === 'pending_review') return 'Verify evidence';
  if (row.workOrderStatus === 'returned') return 'Rework needed';
  if (row.workOrderStatus === 'in_progress' || row.status === 'in_progress') return 'In progress';
  if (row.workOrderStatus === 'assigned' || row.status === 'accepted') return 'Assigned';
  if (row.status === 'under_review') return 'Under review';
  if (row.status === 'resolved') return 'Resolved';
  return 'New';
}

function priorityRank(p: HeadIndependentComplaintRow['priority']): number {
  if (p === 'critical') return 0;
  if (p === 'high') return 1;
  if (p === 'normal') return 2;
  return 3;
}

/**
 * Approved Section 10 Department Head Homepage:
 * 1. Overview heading + Department subtitle + Apple segmented date selector
 * 2. One integrated 5-metric Clear Liquid Glass strip (Received, Unassigned, In progress, Verify evidence, Resolved)
 * 3. ~65% Left Complaint Inbox (Priority, Unassigned, In progress, All + compact Apple Mail rows + View all)
 * 4. ~35% Right Field Operations (Officer availability + Evidence verification)
 */
export const HeadHomePage: React.FC<HeadHomePageProps> = ({
  departmentId,
  departmentName,
  onNavigate,
  onSelectCase,
}) => {
  const [dateFilter, setDateFilter] = useState<ExtendedDateFilter>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [inboxTab, setInboxTab] = useState<InboxTab>('priority');

  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [roster, setRoster] = useState<DepartmentOfficer[]>([]);
  const [allComplaints, setAllComplaints] = useState<HeadIndependentComplaintRow[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    setErrorMsg('');

    Promise.all([
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
      fieldOperations.orderLinksMap(departmentId).catch(() => new Map()),
      fieldOperations.officersDirectory(departmentId).catch(() => [] as DepartmentOfficer[]),
    ])
      .then(async ([orderRows, linksMap, officerRows]) => {
        if (!active) return;
        const names = new Map(officerRows.map((o) => [o.user_id, o.display_name]));
        const items = await caseOperationsService.listIndependentComplaintsForHead(departmentId, {
          period: 'all',
          includeResolved: true,
          orders: orderRows,
          orderLinksMap: linksMap,
          officerNames: names,
        });
        if (!active) return;
        setOrders(orderRows);
        setRoster(officerRows);
        setAllComplaints(items);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Unable to load departmental overview.');
        setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [departmentId, reloadKey]);

  const isDemo = caseOperationsService.isDemonstrationWorkspace();

  const periodFiltered = useMemo(() => {
    if (dateFilter === 'custom') {
      const fromMs = customFrom ? new Date(`${customFrom}T00:00:00+05:00`).getTime() : 0;
      const toMs = customTo ? new Date(`${customTo}T23:59:59+05:00`).getTime() : Number.MAX_SAFE_INTEGER;
      return allComplaints.filter((c) => {
        const ts = new Date(c.submittedAt).getTime();
        return Number.isFinite(ts) && ts >= fromMs && ts <= toMs;
      });
    }
    const now = new Date();
    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(now.getTime() + pktOffset);
    const y = pktNow.getUTCFullYear();
    const m = pktNow.getUTCMonth();
    const d = pktNow.getUTCDate();
    const todayStart = Date.UTC(y, m, d, 0, 0, 0, 0) - pktOffset;

    let startMs = todayStart;
    let endMs = now.getTime();
    if (dateFilter === 'yesterday') {
      startMs = todayStart - 86400000;
      endMs = todayStart - 1;
    } else if (dateFilter === 'month') {
      startMs = Date.UTC(y, m, 1, 0, 0, 0, 0) - pktOffset;
    } else if (dateFilter === 'year') {
      startMs = Date.UTC(y, 0, 1, 0, 0, 0, 0) - pktOffset;
    }

    return allComplaints.filter((c) => {
      const ts = new Date(c.submittedAt).getTime();
      return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
    });
  }, [allComplaints, dateFilter, customFrom, customTo]);

  const stats = useMemo(() => {
    const received = periodFiltered.length;
    const unassigned = periodFiltered.filter(
      (c) => c.status !== 'resolved' && c.status !== 'rejected' && !c.workOrderId && !c.assignedOfficerId
    ).length;
    const inProgress = periodFiltered.filter(
      (c) =>
        c.status !== 'resolved' &&
        c.status !== 'rejected' &&
        (c.workOrderStatus === 'assigned' || c.workOrderStatus === 'in_progress' || c.workOrderStatus === 'returned' || c.status === 'in_progress' || c.status === 'accepted')
    ).length;
    const verifyEvidence = periodFiltered.filter((c) => c.workOrderStatus === 'pending_review').length;
    const resolved = periodFiltered.filter((c) => c.status === 'resolved' || c.workOrderStatus === 'verified').length;
    return { received, unassigned, inProgress, verifyEvidence, resolved };
  }, [periodFiltered]);

  const inboxRows = useMemo(() => {
    const activeOnly = allComplaints.filter((c) => c.status !== 'resolved' && c.status !== 'rejected');
    let filtered = activeOnly;
    if (inboxTab === 'priority') {
      filtered = [...activeOnly].sort(
        (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.submittedAt.localeCompare(a.submittedAt)
      );
    } else if (inboxTab === 'unassigned') {
      filtered = activeOnly.filter((c) => !c.workOrderId && !c.assignedOfficerId);
    } else if (inboxTab === 'in_progress') {
      filtered = activeOnly.filter(
        (c) =>
          c.workOrderStatus === 'assigned' ||
          c.workOrderStatus === 'in_progress' ||
          c.workOrderStatus === 'returned' ||
          c.status === 'in_progress'
      );
    }
    return filtered.slice(0, 6);
  }, [allComplaints, inboxTab]);

  const officerStats = useMemo(() => {
    const activeRoster = roster.filter(
      (o) => o.staff_role === 'officer' && o.membership_status !== 'suspended' && o.membership_status !== 'revoked'
    );
    const assignedIds = new Set(
      orders.filter((o) => o.status !== 'verified').map((o) => o.officer_id)
    );
    const onAssignment = activeRoster.filter((o) => assignedIds.has(o.user_id) || o.active_cases > 0).length;
    const available = Math.max(0, activeRoster.length - onAssignment);
    const pendingProof = orders.filter((o) => o.status === 'pending_review').length;
    return { available, onAssignment, pendingProof };
  }, [roster, orders]);

  const navPeriod: HeadOverviewPeriod = dateFilter === 'custom' ? 'all' as never : dateFilter;

  return (
    <div data-testid="head-home-page">
      {/* 1. Overview Heading + Date Range Control */}
      <div className="lg-page-head-row">
        <div>
          <h1 className="lg-h1">Overview</h1>
          <p className="lg-subtitle">
            {departmentName}
            {isDemo ? ' · Local demonstration dataset' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <LiquidSegmentedControl
            options={DATE_OPTIONS}
            value={dateFilter}
            onChange={setDateFilter}
            ariaLabel="Overview date range"
          />
          <button
            type="button"
            className="lg-icon-btn"
            aria-label="Refresh overview"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {dateFilter === 'custom' && (
        <div
          className="lg-glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <label style={{ fontSize: '12.5px', color: 'var(--lg-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid var(--lg-border-hairline)', background: 'var(--lg-glass-dense)', color: 'var(--lg-ink)', fontSize: '13px' }}
            />
          </label>
          <label style={{ fontSize: '12.5px', color: 'var(--lg-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid var(--lg-border-hairline)', background: 'var(--lg-glass-dense)', color: 'var(--lg-ink)', fontSize: '13px' }}
            />
          </label>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="lg-glass-panel" style={{ padding: '32px', marginBottom: '20px' }} role="status">
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--lg-muted)' }}>
            Loading overview…
          </p>
        </div>
      )}

      {loadState === 'error' && (
        <div className="lg-glass-panel" style={{ padding: '24px', marginBottom: '20px' }} role="alert">
          <p style={{ margin: '0 0 6px', fontSize: '14.5px', fontWeight: 600, color: 'var(--lg-red)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} strokeWidth={1.75} />
            Unable to load overview
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--lg-muted)' }}>{errorMsg}</p>
          <button type="button" className="lg-btn" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {loadState === 'ready' && (
        <>
          {/* 2. Single Horizontal Clear Glass Overview Strip (5 Metrics) */}
          <section
            className="lg-glass-panel lg-overview-strip"
            aria-label="Department overview metrics"
            data-testid="v16-overview-body"
          >
            <button
              type="button"
              className="lg-overview-cell"
              onClick={() => onNavigate('queue', { period: dateFilter === 'custom' ? undefined : navPeriod })}
            >
              <span className="lg-overview-label">Received</span>
              <span className="lg-overview-value" data-testid="v16-overview-total">
                {stats.received}
              </span>
            </button>

            <button
              type="button"
              className="lg-overview-cell"
              onClick={() => onNavigate('queue', { queueView: 'unassigned' })}
            >
              <span className="lg-overview-label">Unassigned</span>
              <span className="lg-overview-value">{stats.unassigned}</span>
            </button>

            <button
              type="button"
              className="lg-overview-cell"
              onClick={() => onNavigate('dispatch')}
            >
              <span className="lg-overview-label">In progress</span>
              <span className="lg-overview-value">{stats.inProgress}</span>
            </button>

            <button
              type="button"
              className="lg-overview-cell"
              onClick={() => onNavigate('verification')}
            >
              <span className="lg-overview-label">Verify evidence</span>
              <span className="lg-overview-value">{stats.verifyEvidence}</span>
            </button>

            <button
              type="button"
              className="lg-overview-cell"
              onClick={() => onNavigate('archive')}
            >
              <span className="lg-overview-label">Resolved</span>
              <span className="lg-overview-value">{stats.resolved}</span>
            </button>
          </section>

          {/* 3. Asymmetric Split (~65% Complaint Inbox | ~35% Field Operations) */}
          <div className="lg-home-split">
            {/* Left (~65%): Complaint Inbox */}
            <section aria-labelledby="lg-inbox-heading">
              <div className="lg-section-head">
                <h2 id="lg-inbox-heading" className="lg-section-title">
                  Complaint inbox
                </h2>
                <button
                  type="button"
                  className="lg-quiet-btn"
                  onClick={() => onNavigate('queue')}
                >
                  <span>View all</span>
                  <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <div className="lg-glass-panel lg-inbox-panel">
                <div className="lg-inbox-toolbar">
                  <LiquidSegmentedControl
                    options={INBOX_TABS}
                    value={inboxTab}
                    onChange={setInboxTab}
                    ariaLabel="Complaint inbox filter"
                    size="sm"
                  />
                </div>

                {inboxRows.length === 0 ? (
                  <div style={{ padding: '28px 18px' }} data-testid="v16-overview-empty">
                    <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--lg-ink)' }}>
                      No complaints match this view
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--lg-muted)' }}>
                      Switch filters above or view the complete department complaints list.
                    </p>
                  </div>
                ) : (
                  <div data-testid="lg-inbox-list">
                    {inboxRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="lg-mail-row"
                        onClick={() => onSelectCase(row.id)}
                      >
                        <div className="lg-mail-main">
                          <span className="lg-mail-title">{row.heading}</span>
                          <span className="lg-mail-meta">
                            <span>
                              {row.publicPlace}
                              {row.locality ? `, ${row.locality}` : ''}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatComplaintStatus(row)}</span>
                          </span>
                        </div>

                        <div className="lg-mail-right">
                          <PriorityPill priority={row.priority} />
                          <ChevronRight size={15} strokeWidth={1.75} style={{ color: 'var(--lg-muted)' }} aria-hidden="true" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right (~35%): Field Operations */}
            <aside aria-labelledby="lg-field-ops-heading">
              <div className="lg-section-head">
                <h2 id="lg-field-ops-heading" className="lg-section-title">
                  Field operations
                </h2>
              </div>

              <div className="lg-ops-stack">
                <section className="lg-glass-panel lg-ops-panel" aria-label="Officer availability">
                  <h3 className="lg-ops-panel-title">Officer availability</h3>
                  <div className="lg-ops-two-metrics">
                    <div>
                      <div className="lg-ops-stat-val">{officerStats.available}</div>
                      <div className="lg-ops-stat-label">Available</div>
                    </div>
                    <div>
                      <div className="lg-ops-stat-val">{officerStats.onAssignment}</div>
                      <div className="lg-ops-stat-label">On assignment</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lg-ops-link-row"
                    onClick={() => onNavigate('team')}
                  >
                    <span>Manage officers</span>
                    <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </section>

                <section className="lg-glass-panel lg-ops-panel" aria-label="Evidence verification">
                  <h3 className="lg-ops-panel-title">Evidence verification</h3>
                  <div className="lg-ops-two-metrics" style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <div className="lg-ops-stat-val">{officerStats.pendingProof}</div>
                      <div className="lg-ops-stat-label">Awaiting review</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lg-ops-link-row"
                    onClick={() => onNavigate('verification')}
                  >
                    <span>Review submissions</span>
                    <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </section>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};
