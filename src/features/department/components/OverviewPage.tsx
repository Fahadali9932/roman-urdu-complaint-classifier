import React, { useEffect, useState, useMemo } from 'react';
import type { DepartmentId, IncidentCaseSummary, AreaWorkloadSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { ArrowRight, ArrowUpRight, AlertTriangle, Clock } from 'lucide-react';

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
    reportsAwaitingAck: number;
    casesInProgress: number;
    casesCompleted: number;
    casesUnassigned: number;
    urgentCases: number;
  }>({
    totalCases: 0,
    totalReports: 0,
    casesNeedingResponse: 0,
    reportsAwaitingAck: 0,
    casesInProgress: 0,
    casesCompleted: 0,
    casesUnassigned: 0,
    urgentCases: 0,
  });
  const [nextUpCases, setNextUpCases] = useState<IncidentCaseSummary[]>([]);
  const [topAreas, setTopAreas] = useState<AreaWorkloadSummary[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  useEffect(() => {
    let active = true;

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
        console.warn('Overview data loading failed:', err);
      });

    return () => {
      active = false;
    };
  }, [departmentId]);

  // Stage percentages for progress bars
  const stageStats = useMemo(() => {
    const total = Math.max(1, summary.totalCases);
    return {
      needsPct: Math.min(100, Math.round((summary.casesNeedingResponse / total) * 100)),
      inProgPct: Math.min(100, Math.round((summary.casesInProgress / total) * 100)),
      donePct: Math.min(100, Math.round((summary.casesCompleted / total) * 100)),
    };
  }, [summary]);

  return (
    <div className={`overview-page ${density === 'compact' ? 'density-compact' : 'density-comfortable'}`}>
      {/* 1. Page Heading */}
      <div className="overview-header">
        <div>
          <div className="overview-eyebrow">{departmentName}</div>
          <h1 className="overview-title">Overview</h1>
          <p className="overview-subtitle">Work that needs a response from your team.</p>
        </div>
        <button
          type="button"
          className="btn-overview-queue"
          onClick={() => onNavigate('queue')}
        >
          <span>Open work queue</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Response Needed Feature Band */}
      <div className="overview-feature-band">
        <div className="feature-band-left">
          <div className="feature-band-eyebrow">First response</div>
          <h2 className="feature-band-title">Cases waiting for a reply</h2>
          <div className="feature-band-figure">
            <span className="feature-band-number">{summary.casesNeedingResponse}</span>
            <div className="feature-band-note">
              <strong>distinct cases needing action</strong>
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

      {/* 3. Facts Strip (4 Distinct Case-Based Metrics) */}
      <div className="overview-facts-strip" role="group" aria-label="Department case summary metrics">
        <button
          type="button"
          className="fact-item"
          onClick={() => onNavigate('queue')}
        >
          <span className="fact-label">Needs response</span>
          <b className="fact-value fact-alert">{summary.casesNeedingResponse}</b>
          <span className="fact-desc">cases awaiting action</span>
        </button>

        <button
          type="button"
          className="fact-item"
          onClick={() => onNavigate('queue')}
        >
          <span className="fact-label">In progress</span>
          <b className="fact-value">{summary.casesInProgress}</b>
          <span className="fact-desc">cases being worked on</span>
        </button>

        <button
          type="button"
          className="fact-item"
          onClick={() => onNavigate('queue')}
        >
          <span className="fact-label">Unassigned</span>
          <b className="fact-value">{summary.casesUnassigned}</b>
          <span className="fact-desc">cases without an owner</span>
        </button>

        <button
          type="button"
          className="fact-item"
          onClick={() => onNavigate('queue')}
        >
          <span className="fact-label">Completed</span>
          <b className="fact-value fact-success">{summary.casesCompleted}</b>
          <span className="fact-desc">cases closed</span>
        </button>
      </div>

      {/* 4. Lower Two-Column Section: Work First + Areas with Open Cases */}
      <div className="overview-lower-grid">
        {/* Left Column: Work First */}
        <section className="overview-section" aria-labelledby="work-first-heading">
          <div className="overview-section-head">
            <h2 id="work-first-heading">Work first</h2>
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
            <h2 id="areas-heading">Areas with open cases</h2>
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

      <div className="overview-data-note">
        Total municipal workload: {summary.totalCases} physical cases representing {summary.totalReports.toLocaleString()} individual citizen submissions across Karachi.
      </div>
    </div>
  );
};
