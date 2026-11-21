import React, { useEffect, useState, useMemo } from 'react';
import type { DepartmentId, IncidentCaseSummary, AreaWorkloadSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { ArrowRight, ArrowUpRight, AlertTriangle, Clock, RefreshCw, AlertCircle } from 'lucide-react';

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
    ])
      .then(([workSummary, casesPage, areas]) => {
        if (!active) return;
        setSummary(workSummary);
        setNextUpCases(casesPage.items.slice(0, 4));
        setTopAreas(areas.slice(0, 4));
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

  // Stage percentages for progress bars
  const stageStats = useMemo(() => {
    const total = Math.max(1, summary.totalCases);
    return {
      needsPct: Math.min(100, Math.round((summary.casesNeedingResponse / total) * 100)),
      acceptedPct: Math.min(100, Math.round(((summary.casesAccepted || 0) / total) * 100)),
      inProgPct: Math.min(100, Math.round((summary.casesInProgress / total) * 100)),
      donePct: Math.min(100, Math.round((summary.casesCompleted / total) * 100)),
    };
  }, [summary]);

  return (
    <div className={`overview-page ${density === 'compact' ? 'density-compact' : 'density-comfortable'}`}>
      {/* 1. Page Heading */}
      <div className="overview-header">
        <div>
          <div className="overview-eyebrow">{departmentName} / OPERATIONS</div>
          <h1 className="overview-title">Good work starts here.</h1>
          <p className="overview-subtitle">Your team's current workload and the next cases to handle.</p>
        </div>
        <div className="ops-heading-actions">
          <button type="button" className="ops-icon-action" onClick={() => setReloadKey((key) => key + 1)} aria-label="Refresh department overview" title="Refresh overview"><RefreshCw size={17} /></button>
          <button type="button" className="btn-overview-queue" onClick={() => onNavigate('queue')}>
            <span>Open work queue</span><ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {caseOperationsService.isDemonstrationWorkspace() && (
        <div className="ops-demo-notice" role="note"><AlertCircle size={16} aria-hidden="true" /><span><strong>Local demonstration.</strong> Figures include seeded sample incidents and may not reflect production workload.</span></div>
      )}
      {loadState === 'error' && (
        <div className="ops-error-state" role="alert"><AlertCircle size={20} /><div><strong>Overview unavailable</strong><p>We could not load the latest case summary. Existing counts have not been refreshed.</p></div><button type="button" className="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button></div>
      )}
      {loadState === 'loading' && <div className="ops-loading-state" role="status">Refreshing department summary…</div>}

      {loadState === 'ready' && <>

      {/* 2. Response Needed Feature Band */}
      <div className="overview-feature-band">
        <div className="feature-band-left">
          <div className="feature-band-eyebrow">01 / ATTENTION REQUIRED</div>
          <h2 className="feature-band-title">Needs a first response</h2>
          <div className="feature-band-figure">
            <span className="feature-band-number">{summary.casesNeedingResponse}</span>
            <div className="feature-band-note">
              <strong>cases awaiting action</strong>
              <span>
                {summary.reportsAwaitingAck > 0
                  ? `${summary.reportsAwaitingAck.toLocaleString()} citizen reports waiting for acknowledgment.`
                  : 'All linked citizen reports acknowledged.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-feature-action"
            onClick={() => onNavigate('queue')}
          >
            <span>Review {summary.casesNeedingResponse} cases</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="feature-band-right">
          <div className="stage-breakdown-head">
            <span>Work by stage</span>
            <small>Cases</small>
          </div>

          <div className="stage-row">
            <span className="stage-name">Needs response</span>
            <div className="stage-bar-track">
              <div
                className="stage-bar-fill stage-fill-needs"
                style={{ width: `${stageStats.needsPct}%` }}
              />
            </div>
            <strong className="stage-count">{summary.casesNeedingResponse}</strong>
          </div>

          <div className="stage-row">
            <span className="stage-name">Accepted</span>
            <div className="stage-bar-track">
              <div
                className="stage-bar-fill stage-fill-accepted"
                style={{ width: `${stageStats.acceptedPct}%` }}
              />
            </div>
            <strong className="stage-count">{summary.casesAccepted || 0}</strong>
          </div>

          <div className="stage-row">
            <span className="stage-name">In progress</span>
            <div className="stage-bar-track">
              <div
                className="stage-bar-fill stage-fill-prog"
                style={{ width: `${stageStats.inProgPct}%` }}
              />
            </div>
            <strong className="stage-count">{summary.casesInProgress}</strong>
          </div>

          <div className="stage-row">
            <span className="stage-name">Completed</span>
            <div className="stage-bar-track">
              <div
                className="stage-bar-fill stage-fill-done"
                style={{ width: `${stageStats.donePct}%` }}
              />
            </div>
            <strong className="stage-count">{summary.casesCompleted}</strong>
          </div>

          <div className="stage-footer">
            <Clock className="w-3.5 h-3.5 text-[#5A6877]" />
            <span>{lastRefreshed || 'Updated today PKT'}</span>
          </div>
        </div>
      </div>

      {/* Three non-overlapping workload totals (stage counts live above). */}
      <div className="overview-facts-strip" role="group" aria-label="Department case summary metrics">
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

      {/* 4. Lower Two-Column Section: Work First + Areas with Open Cases */}
      <div className="overview-lower-grid">
        {/* Left Column: Work First */}
        <section className="overview-section" aria-labelledby="work-first-heading">
          <div className="overview-section-head">
            <h2 id="work-first-heading">Next in line</h2>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate('queue')}
            >
              <span>See all cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overview-panel">
            {nextUpCases.length > 0 ? (
              nextUpCases.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="overview-work-item"
                  onClick={() => onSelectCase(c.id)}
                >
                  <div className="work-item-content">
                    <strong className="work-item-title">
                      {c.priority === 'critical' && (
                        <span className="work-item-hazard">
                          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                          Safety risk ·{' '}
                        </span>
                      )}
                      {c.title}
                    </strong>
                    <span className="work-item-subline">
                      {c.locality} · {c.linkedReportCount} {c.linkedReportCount === 1 ? 'report' : 'reports'}
                    </span>
                  </div>
                  <div className="work-item-age">
                    <b>{c.ageDays} {c.ageDays === 1 ? 'day' : 'days'}</b>
                    <small>first reported</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-panel-note">No cases currently require response.</div>
            )}
          </div>
        </section>

        {/* Right Column: Areas with Open Cases */}
        <section className="overview-section" aria-labelledby="areas-heading">
          <div className="overview-section-head">
            <h2 id="areas-heading">Where help is needed</h2>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate('areas')}
            >
              <span>View areas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overview-panel">
            {topAreas.length > 0 ? (
              topAreas.map((a) => (
                <button
                  type="button"
                  key={a.area}
                  className="overview-area-row"
                  onClick={() => onNavigate('areas')}
                >
                  <div className="area-row-content">
                    <strong className="area-row-name">{a.area}</strong>
                    <span className="area-row-subline">
                      {a.topIssues.length > 0 ? a.topIssues.join(', ') : 'Municipal works'}
                    </span>
                  </div>
                  <div className="area-row-stats">
                    <b>{a.activeCasesCount}</b>
                    <small>{a.activeCasesCount === 1 ? 'case' : 'cases'}</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-panel-note">No active areas reported.</div>
            )}
          </div>
        </section>
      </div>

      <div className="overview-data-note">Each case represents one incident; its linked reports stay separately traceable.</div>
      </>}
    </div>
  );
};
