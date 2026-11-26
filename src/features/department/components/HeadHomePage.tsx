import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { DepartmentId } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import {
  caseOperationsService,
  type HeadOverviewPeriod,
  type HeadPeriodOverview,
} from '../../../services/CaseOperationsService';
import { fieldOperations, type DepartmentWorkOrder } from '../services/fieldOperations';

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

const PERIOD_OPTIONS: Array<{ id: HeadOverviewPeriod; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

function getPktGreeting(): { greeting: string; formattedDate: string } {
  const now = new Date();
  const pktHourStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Asia/Karachi',
  }).format(now);
  const hour = Number(pktHourStr) % 24;
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const formattedDate = `${new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  }).format(now)} · PKT`;

  return { greeting, formattedDate };
}

/**
 * V16 Approved Department Head Home:
 * - Preserves V15 neutral theme header + PKT greeting
 * - Shows strictly ONE overview with Today (default), Yesterday, This month, This year
 * - Displays active complaints received in the selected PKT calendar window
 *   with one large total, one segmented horizontal bar, and four exact status labels
 * - No priority inbox, no overdue line, no secondary charts or filler widgets
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
}) => {
  const [period, setPeriod] = useState<HeadOverviewPeriod>('today');
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [orderLinksMap, setOrderLinksMap] = useState<Map<string, Array<{ complaint_id: string }>>>(new Map());
  const [overview, setOverview] = useState<HeadPeriodOverview>({
    period: 'today',
    totalActive: 0,
    newComplaints: 0,
    underReview: 0,
    inProgress: 0,
    awaitingVerification: 0,
  });
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const { greeting, formattedDate } = useMemo(() => getPktGreeting(), []);

  useEffect(() => {
    let mounted = true;
    setLoadState('loading');
    setErrorMsg('');

    Promise.all([
      fieldOperations.orders(departmentId).catch(() => [] as DepartmentWorkOrder[]),
      fieldOperations.orderLinksMap(departmentId).catch(() => new Map()),
    ])
      .then(async ([orderRows, linksMap]) => {
        if (!mounted) return;
        setOrders(orderRows);
        setOrderLinksMap(linksMap);
        const computed = await caseOperationsService.getHeadPeriodOverview(
          departmentId,
          period,
          orderRows,
          linksMap
        );
        if (!mounted) return;
        setOverview(computed);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to load departmental overview.'
        );
        setLoadState('error');
      });

    return () => {
      mounted = false;
    };
  }, [departmentId, reloadKey]);

  useEffect(() => {
    if (loadState !== 'ready') return;
    let active = true;
    caseOperationsService
      .getHeadPeriodOverview(departmentId, period, orders, orderLinksMap)
      .then((res) => {
        if (active) setOverview(res);
      })
      .catch(() => {
        // Keep last ready overview cleanly if fast period switch encounters error
      });
    return () => {
      active = false;
    };
  }, [departmentId, period, orders, orderLinksMap, loadState]);

  const isDemo = caseOperationsService.isDemonstrationWorkspace();

  const segments = [
    {
      key: 'new',
      label: 'New complaints',
      count: overview.newComplaints,
      color: themeMode === 'dark' ? '#E5E5E5' : '#171717',
    },
    {
      key: 'review',
      label: 'Under review',
      count: overview.underReview,
      color: themeMode === 'dark' ? '#93C5FD' : '#2563EB',
    },
    {
      key: 'progress',
      label: 'In progress',
      count: overview.inProgress,
      color: themeMode === 'dark' ? '#FCD34D' : '#D97706',
    },
    {
      key: 'verification',
      label: 'Awaiting verification',
      count: overview.awaitingVerification,
      color: themeMode === 'dark' ? '#86EFAC' : '#15803D',
    },
  ];

  const totalDenominator = Math.max(1, overview.totalActive);

  return (
    <div className="v15-main-page" data-testid="head-home-page">
      {/* Compact Workspace Header */}
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
            aria-label="Refresh overview"
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenPasswordModal}
            className="v15-surface-btn"
            aria-label={`Account ${username}`}
          >
            <span>{username}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="v15-surface-btn"
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="v15-home-theme-toggle"
          >
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
          {isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span role="note">Local demonstration dataset</span>
            </>
          )}
        </div>
      </section>

      {/* Single Period Overview Section */}
      <section className="v16-home-overview" aria-labelledby="v16-overview-heading">
        <div className="v16-overview-header">
          <div>
            <h2 id="v16-overview-heading" className="v15-inbox-title">
              Active complaints received
            </h2>
            <p className="v16-overview-sub">
              Distinct active department complaints received within the selected PKT calendar window.
            </p>
          </div>

          <div className="v15-filter-row" role="group" aria-label="Overview time period">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={period === opt.id}
                className={`v15-filter-pill ${period === opt.id ? 'is-active' : ''}`}
                onClick={() => setPeriod(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loadState === 'loading' && (
          <div className="v15-state-box" role="status">
            <p className="v15-state-title">Loading overview…</p>
            <p className="v15-state-desc">Computing active departmental counts for {PERIOD_OPTIONS.find((p) => p.id === period)?.label}.</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="v15-state-box" role="alert">
            <p className="v15-state-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--v15-danger)' }}>
              <AlertCircle size={17} strokeWidth={1.75} />
              Unable to load overview
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

        {loadState === 'ready' && (
          <div className="v16-overview-body" data-testid="v16-overview-body">
            <div className="v16-total-row">
              <div>
                <div className="v16-large-total" data-testid="v16-overview-total">
                  {overview.totalActive}
                </div>
                <div className="v16-total-caption">
                  Active complaints ({PERIOD_OPTIONS.find((p) => p.id === period)?.label})
                </div>
              </div>

              <button
                type="button"
                className="v15-quiet-link"
                onClick={() => onNavigate('queue')}
              >
                <span>Open complaints</span>
                <ArrowRight size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Single Horizontal Segmented Bar */}
            <div
              className="v16-segmented-bar"
              role="img"
              aria-label={`Active status breakdown: New complaints ${overview.newComplaints}, Under review ${overview.underReview}, In progress ${overview.inProgress}, Awaiting verification ${overview.awaitingVerification}`}
            >
              {overview.totalActive === 0 ? (
                <div className="v16-segment-empty" />
              ) : (
                segments.map((seg) =>
                  seg.count > 0 ? (
                    <div
                      key={seg.key}
                      className="v16-segment-slice"
                      style={{
                        width: `${(seg.count / totalDenominator) * 100}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.label}: ${seg.count}`}
                    />
                  ) : null
                )
              )}
            </div>

            {overview.totalActive === 0 ? (
              <div className="v15-state-box" style={{ paddingLeft: 0 }} data-testid="v16-overview-empty">
                <p className="v15-state-title">No active complaints in this window</p>
                <p className="v15-state-desc">
                  No new or open citizen complaints were received in {PERIOD_OPTIONS.find((p) => p.id === period)?.label.toLowerCase()}.
                </p>
              </div>
            ) : null}

            {/* Four Breakdown Labels */}
            <div className="v16-breakdown-grid" role="list" aria-label="Status counts">
              {segments.map((seg) => (
                <div key={seg.key} className="v16-breakdown-item" role="listitem">
                  <div className="v16-breakdown-label-row">
                    <span
                      className="v16-breakdown-dot"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden="true"
                    />
                    <span className="v16-breakdown-label">{seg.label}</span>
                  </div>
                  <div className="v16-breakdown-count">{seg.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
