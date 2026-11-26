import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Moon,
  Sun,
  RefreshCw,
  AlertCircle,
  User,
} from 'lucide-react';
import type { DepartmentId, IncidentCaseSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { fieldOperations, type DepartmentOfficer, type DepartmentWorkOrder } from '../services/fieldOperations';

export type PriorityFilter = 'all' | 'urgent' | 'unassigned' | 'overdue';

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
    options?: { queueView?: 'needs' | 'unassigned' | 'mine' | 'all' | 'completed' }
  ) => void;
  onSelectCase: (caseId: string) => void;
}

interface PriorityInboxEntry {
  id: string;
  subject: string;
  reference: string;
  location: string;
  statusLabel: string;
  statusTone: 'urgent' | 'overdue' | 'proof' | 'neutral';
  actionLabel: 'Review' | 'Assign' | 'Inspect';
  isUrgent: boolean;
  isUnassigned: boolean;
  isOverdue: boolean;
  rankScore: number;
  onAction: () => void;
}

function getPktGreeting(): { greeting: string; formattedDate: string } {
  const now = new Date();
  let pktHour = now.getHours();
  try {
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Karachi',
    }).format(now);
    const parsed = Number(hourStr);
    if (Number.isFinite(parsed)) pktHour = parsed;
  } catch {
    // Fallback to local clock if timezone formatting unavailable
  }

  const greeting =
    pktHour >= 5 && pktHour < 12
      ? 'Good morning'
      : pktHour >= 12 && pktHour < 17
      ? 'Good afternoon'
      : 'Good evening';

  let formattedDate = '';
  try {
    formattedDate =
      new Intl.DateTimeFormat('en-PK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
      }).format(now) + ' · PKT';
  } catch {
    formattedDate = now.toDateString();
  }

  return { greeting, formattedDate };
}

/**
 * V15.0 Department Head Home Page
 * Centered around immediate operational decisions:
 * - Compact workspace header & PKT greeting
 * - Four inline operational counts (Incoming | Unassigned | Proof review | Overdue)
 * - Deterministic Priority Inbox showing at most 5 eligible records
 */
export const HeadHomePage: React.FC<HeadHomePageProps> = ({
  departmentId,
  departmentCode,
  departmentName,
  username,
  themeMode,
  onToggleTheme,
  onOpenPasswordModal,
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
  const [activeCases, setActiveCases] = useState<IncidentCaseSummary[]>([]);
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);

  const { greeting, formattedDate } = useMemo(() => getPktGreeting(), []);

  useEffect(() => {
    let mounted = true;
    setLoadState('loading');
    setErrorMsg('');

    Promise.all([
      caseOperationsService.getDepartmentWorkSummary(departmentId),
      caseOperationsService.listDepartmentCases(departmentId, {
        savedView: 'all',
        displayMode: 'cases',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        sort: 'attention',
        page: 0,
        pageSize: 50,
      }),
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
      fieldOperations.team(departmentId).catch(() => [] as DepartmentOfficer[]),
    ])
      .then(([sum, casesPage, orderRows, teamRows]) => {
        if (!mounted) return;
        setSummary(sum);
        setActiveCases(casesPage.items);
        setOrders(orderRows);
        setOfficers(teamRows);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to load departmental operational summary.'
        );
        setLoadState('error');
      });

    return () => {
      mounted = false;
    };
  }, [departmentId, reloadKey]);

  const { proofPending, overdueOrders } = useMemo(() => {
    const nowMs = Date.now();
    const proof = orders.filter((o) => o.status === 'pending_review');
    const overdue = orders.filter((o) => {
      if (o.status === 'verified') return false;
      const dueMs = new Date(o.due_at).getTime();
      return Number.isFinite(dueMs) && dueMs < nowMs;
    });
    return { proofPending: proof, overdueOrders: overdue };
  }, [orders]);

  // Deterministic ordering over real departmental cases & work orders (no AI ranking invention)
  const allEligiblePriorityEntries = useMemo<PriorityInboxEntry[]>(() => {
    const entries: PriorityInboxEntry[] = [];
    const seenCaseIds = new Set<string>();
    const nowMs = Date.now();
    const officerNameById = new Map(officers.map((off) => [off.user_id, off.display_name]));
    const caseByAnchorId = new Map(activeCases.map((c) => [c.id, c]));

    // 1. Overdue and proof-review work orders take immediate operational priority
    for (const order of orders) {
      if (order.status === 'verified') continue;
      const dueMs = new Date(order.due_at).getTime();
      const isOverdue = Number.isFinite(dueMs) && dueMs < nowMs;
      const isProof = order.status === 'pending_review';
      const isExtension = Boolean(order.extension_requested_due_at);

      if (!isOverdue && !isProof && !isExtension) continue;
      const linkedCase = order.anchor_complaint_id
        ? caseByAnchorId.get(order.anchor_complaint_id)
        : undefined;
      if (order.anchor_complaint_id) seenCaseIds.add(order.anchor_complaint_id);

      const statusLabel = isOverdue
        ? 'Overdue'
        : isProof
        ? 'Proof review'
        : 'Extension requested';
      const statusTone: PriorityInboxEntry['statusTone'] = isOverdue ? 'overdue' : 'proof';
      const officerLabel = officerNameById.get(order.officer_id) || 'Assigned officer';
      const refLabel = linkedCase?.caseNumber || `WO-${order.id.slice(0, 8).toUpperCase()}`;

      entries.push({
        id: `order-${order.id}`,
        subject: order.case_label || `Work order ${order.id.slice(0, 8)}`,
        reference: refLabel,
        location: `${officerLabel} · Due ${new Date(
          order.due_at
        ).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`,
        statusLabel,
        statusTone,
        actionLabel: isProof ? 'Review' : 'Inspect',
        isUrgent: isOverdue,
        isUnassigned: false,
        isOverdue,
        rankScore: (isOverdue ? 1000 : 0) + (isProof ? 750 : 0) + (isExtension ? 500 : 0),
        onAction: () => {
          if (isProof) {
            onNavigate('verification');
          } else {
            onNavigate('work_orders');
          }
        },
      });
    }

    // 2. Open incident cases ordered deterministically by severity, assignment state, reports, and age
    for (const c of activeCases) {
      if (c.workStatus === 'completed') continue;
      if (seenCaseIds.has(c.id)) continue;

      const isCritical = c.priority === 'critical';
      const isHigh = c.priority === 'high';
      const isUnassigned = !c.assignedStaffId || c.assignedStaffLabel === 'Unassigned';
      const isAgedOverdue = c.ageDays > 10 && c.workStatus === 'needs_acceptance';

      const statusLabel = isCritical
        ? 'Urgent'
        : isAgedOverdue
        ? 'Overdue intake'
        : isUnassigned
        ? 'Unassigned'
        : c.workStatus === 'in_progress'
        ? 'In progress'
        : 'Accepted';

      const statusTone: PriorityInboxEntry['statusTone'] = isCritical
        ? 'urgent'
        : isAgedOverdue
        ? 'overdue'
        : 'neutral';

      const actionLabel: PriorityInboxEntry['actionLabel'] = isUnassigned ? 'Assign' : 'Inspect';

      const score =
        (isCritical ? 600 : 0) +
        (isAgedOverdue ? 300 : 0) +
        (isHigh ? 200 : 0) +
        (isUnassigned ? 100 : 0) +
        Math.min(90, c.linkedReportCount) +
        Math.min(30, c.ageDays);

      entries.push({
        id: `case-${c.id}`,
        subject: c.title,
        reference: c.caseNumber,
        location: `${c.publicPlace}, ${c.locality}`,
        statusLabel,
        statusTone,
        actionLabel,
        isUrgent: isCritical || isHigh,
        isUnassigned,
        isOverdue: isAgedOverdue,
        rankScore: score,
        onAction: () => {
          if (actionLabel === 'Assign') {
            onNavigate('dispatch');
          } else {
            onSelectCase(c.id);
          }
        },
      });
    }

    return entries.sort((a, b) => b.rankScore - a.rankScore);
  }, [orders, officers, activeCases, onNavigate, onSelectCase]);

  const filteredEntries = useMemo(() => {
    if (filter === 'urgent') return allEligiblePriorityEntries.filter((e) => e.isUrgent);
    if (filter === 'unassigned') return allEligiblePriorityEntries.filter((e) => e.isUnassigned);
    if (filter === 'overdue') return allEligiblePriorityEntries.filter((e) => e.isOverdue);
    return allEligiblePriorityEntries;
  }, [allEligiblePriorityEntries, filter]);

  // Display only the 5 highest-priority eligible records initially
  const visibleEntries = useMemo(() => filteredEntries.slice(0, 5), [filteredEntries]);

  const isDemo = caseOperationsService.isDemonstrationWorkspace();
  const emptyFilterLabels: Record<PriorityFilter, string> = {
    all: 'No incoming complaints require immediate attention.',
    urgent: 'No urgent complaints match this view.',
    unassigned: 'No unassigned complaints remain.',
    overdue: 'No overdue complaints or work orders found.',
  };

  return (
    <div className="v15-main-page" data-testid="head-home-page">
      {/* A. Workspace Header */}
      <header className="v15-workspace-topbar">
        <div className="v15-workspace-id">
          <strong>{departmentCode}</strong>
          <span aria-hidden="true">·</span>
          <span>{departmentName}</span>
          <span aria-hidden="true">·</span>
          <span>Department Head</span>
        </div>

        <div className="v15-topbar-controls">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="v15-surface-btn"
            aria-label="Refresh home summary"
            title="Refresh home summary"
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenPasswordModal}
            className="v15-surface-btn"
            aria-label={`Account ${username}`}
            title="Account settings"
          >
            <User size={15} strokeWidth={1.75} />
            <span>{username}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="v15-surface-btn"
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="v15-home-theme-toggle"
          >
            {themeMode === 'dark' ? (
              <Sun size={15} strokeWidth={1.75} />
            ) : (
              <Moon size={15} strokeWidth={1.75} />
            )}
            <span>{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {/* Greeting & PKT Date */}
      <section className="v15-greeting-block" aria-labelledby="v15-greeting-heading">
        <h1 id="v15-greeting-heading" className="v15-greeting-title">
          {greeting}
        </h1>
        <div className="v15-greeting-meta">
          <span>{formattedDate}</span>
          <span aria-hidden="true">·</span>
          <span>Review incoming triage, crew assignments, and overdue follow-ups.</span>
          {isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span role="note">Local demonstration dataset</span>
            </>
          )}
        </div>
      </section>

      {/* B. Compact Operational Overview (4 Inline Counts) */}
      <section
        className="v15-overview-strip"
        aria-label="Department operational overview"
      >
        <button
          type="button"
          className="v15-overview-metric"
          onClick={() => onNavigate('queue', { queueView: 'needs' })}
        >
          <span className="v15-overview-label">Incoming</span>
          <span className="v15-overview-count">{summary.casesNeedingResponse}</span>
        </button>

        <button
          type="button"
          className="v15-overview-metric"
          onClick={() => onNavigate('queue', { queueView: 'unassigned' })}
        >
          <span className="v15-overview-label">Unassigned</span>
          <span className="v15-overview-count">{summary.casesUnassigned}</span>
        </button>

        <button
          type="button"
          className="v15-overview-metric is-proof"
          onClick={() => onNavigate('verification')}
        >
          <span className="v15-overview-label">Proof review</span>
          <span className={`v15-overview-count ${proofPending.length > 0 ? 'has-items' : ''}`}>
            {proofPending.length}
          </span>
        </button>

        <button
          type="button"
          className="v15-overview-metric is-overdue"
          onClick={() => onNavigate('work_orders')}
        >
          <span className="v15-overview-label">Overdue</span>
          <span className={`v15-overview-count ${overdueOrders.length > 0 ? 'has-items' : ''}`}>
            {overdueOrders.length}
          </span>
        </button>
      </section>

      {/* C. Priority Inbox */}
      <section className="v15-inbox-section" aria-labelledby="v15-priority-inbox-heading">
        <div className="v15-inbox-header">
          <h2 id="v15-priority-inbox-heading" className="v15-inbox-title">
            Priority inbox
          </h2>

          <button
            type="button"
            className="v15-quiet-link"
            onClick={() => onNavigate('queue', { queueView: 'needs' })}
          >
            <span>View all complaints</span>
            <ArrowRight size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Compact Filter Controls */}
        <div className="v15-filter-row" role="group" aria-label="Priority inbox filters">
          {(
            [
              { id: 'all', label: 'All priorities' },
              { id: 'urgent', label: 'Urgent' },
              { id: 'unassigned', label: 'Unassigned' },
              { id: 'overdue', label: 'Overdue' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={`v15-filter-pill ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Inbox Body States */}
        {loadState === 'loading' && (
          <div className="v15-state-box" role="status">
            <p className="v15-state-title">Loading priority inbox…</p>
            <p className="v15-state-desc">Fetching active departmental complaints and work orders.</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="v15-state-box" role="alert">
            <p className="v15-state-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--v15-danger)' }}>
              <AlertCircle size={17} strokeWidth={1.75} />
              Unable to load priority inbox
            </p>
            <p className="v15-state-desc">{errorMsg}</p>
            <button
              type="button"
              className="v15-surface-btn"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw size={14} strokeWidth={1.75} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {loadState === 'ready' && visibleEntries.length === 0 && (
          <div className="v15-state-box" data-testid="v15-inbox-empty">
            <p className="v15-state-title">
              {allEligiblePriorityEntries.length === 0
                ? 'No incoming complaints'
                : emptyFilterLabels[filter]}
            </p>
            <p className="v15-state-desc">
              {allEligiblePriorityEntries.length === 0
                ? 'Active queues are clear right now.'
                : 'Select another filter or open the full inbox to inspect resolved or non-urgent records.'}
            </p>
            {filter !== 'all' && (
              <button
                type="button"
                className="v15-surface-btn"
                onClick={() => setFilter('all')}
              >
                Show all priorities
              </button>
            )}
          </div>
        )}

        {loadState === 'ready' && visibleEntries.length > 0 && (
          <div className="v15-inbox-list" data-testid="v15-inbox-list">
            {visibleEntries.map((row) => (
              <div key={row.id} className="v15-inbox-row" data-testid="v15-inbox-row">
                <div className="v15-row-main">
                  <span className="v15-row-subject">{row.subject}</span>
                  <div className="v15-row-meta">
                    <span className="v15-row-ref">{row.reference}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.location}</span>
                  </div>
                </div>

                <span
                  className={`v15-status-tag ${
                    row.statusTone === 'urgent'
                      ? 'is-urgent'
                      : row.statusTone === 'overdue'
                      ? 'is-overdue'
                      : row.statusTone === 'proof'
                      ? 'is-proof'
                      : ''
                  }`}
                >
                  {row.statusLabel}
                </span>

                <button
                  type="button"
                  className="v15-row-action"
                  onClick={row.onAction}
                >
                  {row.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* E. Quiet Inbox Footer */}
        <footer className="v15-inbox-footer">
          <span>
            Showing {visibleEntries.length} of {filteredEntries.length} priority records
          </span>
          <button
            type="button"
            className="v15-quiet-link"
            onClick={() => onNavigate('queue', { queueView: 'all' })}
          >
            <span>Open full inbox</span>
            <ArrowRight size={15} strokeWidth={1.75} />
          </button>
        </footer>
      </section>
    </div>
  );
};
