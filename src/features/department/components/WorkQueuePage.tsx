import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  type DepartmentId,
  type IncidentCaseSummary,
  type CaseReportRow,
  type WorkQueueFilter,
  type CursorPage,
} from '../../../types';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import {
  Search,
  ChevronRight,
  ChevronDown,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface WorkQueuePageProps {
  departmentId: DepartmentId;
  actorId?: string;
  onOpenCase: (caseId: string) => void;
  onOpenReport?: (referenceNumber: string) => void;
  initialArea?: string;
  initialSavedView?: 'needs' | 'unassigned' | 'mine' | 'all' | 'completed';
  initialDisplayMode?: 'cases' | 'reports';
  onCountUpdate?: (counts: { cases: number; reports: number; urgent: number }) => void;
  density?: 'comfortable' | 'compact';
}

export const WorkQueuePage: React.FC<WorkQueuePageProps> = ({
  departmentId,
  actorId,
  onOpenCase,
  onOpenReport,
  initialArea = 'All areas',
  initialSavedView = 'needs',
  initialDisplayMode = 'cases',
  onCountUpdate,
  density = 'comfortable',
}) => {
  // State
  const [savedView, setSavedView] = useState<WorkQueueFilter['savedView']>(
    initialSavedView
  );
  const [displayMode, setDisplayMode] = useState<'cases' | 'reports'>(
    initialDisplayMode
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [selectedIssue, setSelectedIssue] = useState('All issues');
  const [selectedSort, setSelectedSort] = useState<
    'attention' | 'oldest' | 'most_reports' | 'recently_updated'
  >('attention');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const requestId = useRef(0);

  // Data
  const [casePage, setCasePage] = useState<CursorPage<IncidentCaseSummary>>({
    items: [],
    nextCursor: null,
    prevCursor: null,
    total: 0,
    page: 0,
    pageSize,
    totalPages: 1,
  });

  const [reportPage, setReportPage] = useState<
    CursorPage<CaseReportRow & { caseId: string; caseTitle: string; area: string }>
  >({
    items: [],
    nextCursor: null,
    prevCursor: null,
    total: 0,
    page: 0,
    pageSize,
    totalPages: 1,
  });

  const [summaryStats, setSummaryStats] = useState({
    totalCases: 0,
    totalReports: 0,
    casesNeedingResponse: 0,
    casesAccepted: 0,
    reportsAwaitingAck: 0,
    casesInProgress: 0,
    casesCompleted: 0,
    casesUnassigned: 0,
    urgentCases: 0,
    awaitingAcceptance: 0,
  });

  // Areas list
  const [areaOptions, setAreaOptions] = useState(['All areas']);

  useEffect(() => {
    let current = true;
    caseOperationsService.listAreaWorkload(departmentId)
      .then((areas) => {
        if (current) setAreaOptions(['All areas', ...areas.map((area) => area.area)]);
      })
      .catch(() => {
        // The queue is still usable without locality suggestions.
      });
    return () => { current = false; };
  }, [departmentId, retry]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const [issueOptions, setIssueOptions] = useState(['All issues']);
  useEffect(() => {
    let active = true;
    caseOperationsService.listDepartmentIssueTypes(departmentId)
      .then((types) => { if (active) setIssueOptions(['All issues', ...types]); })
      .catch(() => { /* Keep the unfiltered view available on fetch errors. */ });
    return () => { active = false; };
  }, [departmentId, retry]);

  // Fetch summary
  useEffect(() => {
    let mounted = true;
    caseOperationsService.getDepartmentWorkSummary(departmentId).then((res) => {
      if (mounted) {
        setSummaryStats(res);
        if (onCountUpdate) {
          onCountUpdate({
            cases: res.totalCases,
            reports: res.totalReports,
            urgent: res.urgentCases,
          });
        }
      }
    }).catch(() => {
      // Loading errors are reported by the queue itself below.
    });
    return () => {
      mounted = false;
    };
  }, [departmentId, onCountUpdate, retry]);

  // Fetch data
  const loadData = useCallback(async () => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    const filter: WorkQueueFilter = {
      savedView,
      actorId,
      displayMode,
      searchQuery: debouncedSearch,
      area: selectedArea,
      issueType: selectedIssue,
      sort: selectedSort,
      page,
      pageSize,
    };

    try {
      if (displayMode === 'cases') {
        const res = await caseOperationsService.listDepartmentCases(departmentId, filter);
        if (requestId.current === thisRequest) setCasePage(res);
      } else {
        const res = await caseOperationsService.listDepartmentReports(departmentId, filter);
        if (requestId.current === thisRequest) setReportPage(res);
      }
    } catch (error) {
      if (requestId.current === thisRequest) {
        setLoadError(error instanceof Error ? error.message : 'The work queue could not be loaded.');
      }
    } finally {
      if (requestId.current === thisRequest) setLoading(false);
    }
  }, [
    departmentId,
    actorId,
    savedView,
    displayMode,
    debouncedSearch,
    selectedArea,
    selectedIssue,
    selectedSort,
    page,
    pageSize,
    retry,
  ]);

  useEffect(() => {
    loadData();
    return () => { requestId.current += 1; };
  }, [loadData]);

  // Handle external initial area change
  useEffect(() => {
    if (initialArea) {
      setSelectedArea(initialArea);
      setPage(0);
    }
  }, [initialArea]);

  useEffect(() => {
    setSavedView(initialSavedView);
    setPage(0);
  }, [initialSavedView]);

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedArea('All areas');
    setSelectedIssue('All issues');
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedArea !== 'All areas' ||
    selectedIssue !== 'All issues';

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

  return (
    <div className="work-queue-container" onClick={() => setActiveDropdown(null)}>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="ops-eyebrow">{initialSavedView === 'completed' ? 'Records archive' : 'Intake & triage'}</div>
          <h1>{initialSavedView === 'completed' ? 'Completed cases' : 'Work queue'}</h1>
          <p>{initialSavedView === 'completed'
            ? 'Resolved case history kept separate from active operations.'
            : 'Review incoming cases, assign field responses, and track citizen reports.'}</p>
        </div>
        <span
          className="text-[13px] font-medium"
          style={{ color: 'var(--v3-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {summaryStats.totalCases} cases · {summaryStats.totalReports.toLocaleString()} reports
        </span>
      </div>

      {caseOperationsService.isDemonstrationWorkspace() && (
        <div className="ops-demo-notice" role="note">
          <AlertCircle size={16} aria-hidden="true" />
          <span><strong>Demonstration data.</strong> Example incidents are included in this local workspace; counts are not verified live totals.</span>
        </div>
      )}

      {/* Saved Views & Display Mode Switch */}
      <div className="viewbar">
        <div className="saved-views" role="tablist" aria-label="Saved work views">
          {initialSavedView === 'completed' ? (
            <button type="button" role="tab" aria-selected="true" className="view-chip active">
              Archived resolutions <b>{summaryStats.casesCompleted}</b>
            </button>
          ) : displayMode === 'cases' ? (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'needs'}
                className={`view-chip ${savedView === 'needs' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('needs');
                  setPage(0);
                }}
              >
                Needs response {summaryStats.casesNeedingResponse > 0 && <b>{summaryStats.casesNeedingResponse}</b>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'unassigned'}
                className={`view-chip ${savedView === 'unassigned' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('unassigned');
                  setPage(0);
                }}
              >
                Unassigned {summaryStats.casesUnassigned > 0 && <b>{summaryStats.casesUnassigned}</b>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'mine'}
                className={`view-chip ${savedView === 'mine' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('mine');
                  setPage(0);
                }}
              >
                My cases
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'all'}
                className={`view-chip ${savedView === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('all');
                  setPage(0);
                }}
              >
                Active cases <b>{Math.max(0, summaryStats.totalCases - summaryStats.casesCompleted)}</b>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'needs'}
                className={`view-chip ${savedView === 'needs' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('needs');
                  setPage(0);
                }}
              >
                Awaiting acknowledgment {summaryStats.reportsAwaitingAck > 0 && <b>{summaryStats.reportsAwaitingAck}</b>}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={savedView === 'all'}
                className={`view-chip ${savedView === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSavedView('all');
                  setPage(0);
                }}
              >
                All reports <b>{summaryStats.totalReports}</b>
              </button>
            </>
          )}
        </div>

        {/* Display Mode: Cases vs Individual Reports */}
        <div className="segment" role="group" aria-label="Work queue display">
          <button
            type="button"
            className={displayMode === 'cases' ? 'active' : ''}
            aria-pressed={displayMode === 'cases'}
            onClick={() => {
              setDisplayMode('cases');
              setPage(0);
            }}
          >
            Cases
          </button>
          <button
            type="button"
            className={displayMode === 'reports' ? 'active' : ''}
            aria-pressed={displayMode === 'reports'}
            onClick={() => {
              setDisplayMode('reports');
              setPage(0);
            }}
          >
            Individual reports
          </button>
        </div>
      </div>

      {/* Single Filter / Search Toolbar */}
      <div className="filterbar" onClick={(e) => e.stopPropagation()}>
        <label className="searchbox" htmlFor="searchBox">
          <Search className="ico" />
          <input
            id="searchBox"
            type="search"
            autoComplete="off"
            placeholder="Search issue, public place or reference"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            aria-label="Search cases"
          />
        </label>

        {/* Area Dropdown */}
        <div className="dropdown-wrap">
          <button
            type="button"
            className={`button filter-btn ${selectedArea !== 'All areas' ? 'selected' : ''}`}
            onClick={() => setActiveDropdown(activeDropdown === 'area' ? null : 'area')}
            aria-expanded={activeDropdown === 'area'}
            aria-haspopup="listbox"
            data-dropdown="area"
          >
            <span>{selectedArea}</span>
            <ChevronDown className="ico" style={{ width: 14, height: 14 }} />
          </button>
          {activeDropdown === 'area' && (
            <div className="dropdown-menu" role="listbox" aria-label="Area filter">
              {areaOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  role="option"
                  aria-selected={selectedArea === opt}
                  data-select="area"
                  data-value={opt}
                  onClick={() => {
                    setSelectedArea(opt);
                    setActiveDropdown(null);
                    setPage(0);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Issue Type Dropdown */}
        <div className="dropdown-wrap">
          <button
            type="button"
            className={`button filter-btn ${selectedIssue !== 'All issues' ? 'selected' : ''}`}
            onClick={() => setActiveDropdown(activeDropdown === 'issue' ? null : 'issue')}
            aria-expanded={activeDropdown === 'issue'}
            aria-haspopup="listbox"
            data-dropdown="issue"
          >
            <span>{selectedIssue}</span>
            <ChevronDown className="ico" style={{ width: 14, height: 14 }} />
          </button>
          {activeDropdown === 'issue' && (
            <div className="dropdown-menu" role="listbox" aria-label="Issue filter">
              {issueOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  role="option"
                  aria-selected={selectedIssue === opt}
                  data-select="issue"
                  data-value={opt}
                  onClick={() => {
                    setSelectedIssue(opt);
                    setActiveDropdown(null);
                    setPage(0);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="dropdown-wrap">
          <button
            type="button"
            className="button filter-btn"
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
            aria-expanded={activeDropdown === 'sort'}
            aria-haspopup="listbox"
            data-dropdown="sort"
          >
            <span>
              {selectedSort === 'attention'
                ? 'Sort: Attention first'
                : selectedSort === 'oldest'
                ? 'Sort: Oldest waiting'
                : selectedSort === 'most_reports'
                ? 'Sort: Most reports'
                : 'Sort: Recently updated'}
            </span>
            <ChevronDown className="ico" style={{ width: 14, height: 14 }} />
          </button>
          {activeDropdown === 'sort' && (
            <div className="dropdown-menu" role="listbox" aria-label="Sort options">
              <button
                type="button"
                role="option"
                aria-selected={selectedSort === 'attention'}
                onClick={() => {
                  setSelectedSort('attention');
                  setActiveDropdown(null);
                  setPage(0);
                }}
              >
                Attention first
              </button>
              <button
                type="button"
                role="option"
                aria-selected={selectedSort === 'oldest'}
                onClick={() => {
                  setSelectedSort('oldest');
                  setActiveDropdown(null);
                  setPage(0);
                }}
              >
                Oldest waiting
              </button>
              <button
                type="button"
                role="option"
                aria-selected={selectedSort === 'most_reports'}
                onClick={() => {
                  setSelectedSort('most_reports');
                  setActiveDropdown(null);
                  setPage(0);
                }}
              >
                Most reports
              </button>
              <button
                type="button"
                role="option"
                aria-selected={selectedSort === 'recently_updated'}
                onClick={() => {
                  setSelectedSort('recently_updated');
                  setActiveDropdown(null);
                  setPage(0);
                }}
              >
                Recently updated
              </button>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            className="button ghost"
            data-action="clear-filters"
            onClick={handleClearFilters}
          >
            <X className="ico" style={{ width: 14, height: 14 }} />
            Clear filters
          </button>
        )}
      </div>

      {/* Quiet summary line integrated above the list */}
      <p className="queue-note">
        {displayMode === 'cases'
          ? 'Grouped by public incident; linked citizen reports remain individually traceable.'
          : 'Individual citizen reports retain their own reference numbers and timelines.'}
      </p>

      {/* Contiguous List Surface */}
      {loadError && (
        <div className="ops-error-state" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <div><strong>Unable to load the work queue</strong><p>{loadError}</p></div>
          <button type="button" className="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} /> Retry</button>
        </div>
      )}
      {loading && !loadError && <div className="ops-loading-state" role="status">Loading current work queue…</div>}
      {!loading && !loadError && (
      <div className={`list-shell ${density === 'compact' ? 'density-compact' : 'density-comfortable'}`}>
        <div className="case-list-header">
          <span>
            {displayMode === 'cases' ? 'INCIDENT CASE' : 'ORIGINAL REPORT'} / PUBLIC LOCATION
          </span>
          <span>REPORTS</span>
          <span>OLDEST</span>
          <span>WORK STATUS</span>
          <span>ASSIGNED</span>
          <span />
        </div>

        {displayMode === 'cases' ? (
          casePage.items.length > 0 ? (
            casePage.items.map((c) => (
              <button
                type="button"
                key={c.id}
                className="case-row"
                data-open={c.id}
                onClick={() => onOpenCase(c.id)}
                aria-label={`Open incident case ${c.title} with ${c.linkedReportCount} linked reports`}
              >
                <div>
                  <div className="case-title" title={c.title}>
                    {c.priority === 'critical' && (
                      <span className="risk">● Urgent</span>
                    )}
                    {c.title}
                  </div>
                  <div className="case-subline">
                    {c.locality} <span className="dot">·</span> {c.publicPlace}
                  </div>
                </div>

                <div className="number">
                  {c.linkedReportCount}
                  <small>{c.linkedReportCount === 1 ? 'report' : 'reports'}</small>
                </div>

                <div className="age">
                  {c.ageDays} {c.ageDays === 1 ? 'day' : 'days'}
                  <small>oldest report</small>
                </div>

                <div>
                  <span
                    className={`status ${
                      c.workStatus === 'needs_acceptance'
                        ? 'pending'
                        : c.workStatus === 'in_progress'
                        ? 'progress'
                        : c.workStatus === 'completed'
                        ? 'done'
                        : 'pending'
                    }`}
                  >
                    {c.workStatus === 'needs_acceptance'
                      ? 'Needs response'
                      : c.workStatus === 'in_progress'
                      ? 'In progress'
                      : c.workStatus === 'completed'
                      ? 'Completed'
                      : 'Accepted'}
                  </span>
                </div>

                <div className="age">{c.assignedStaffLabel}</div>

                <ChevronRight className="ico arrow" />
              </button>
            ))
          ) : (
            <div className="empty-state">
              <strong>No work matches these filters</strong>
              <p>Try another area, issue type or search term.</p>
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="button"
                  data-action="clear-filters"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </button>
              </div>
            </div>
          )
        ) : reportPage.items.length > 0 ? (
          reportPage.items.map((r) => (
            <button
              type="button"
              key={r.complaintId}
              className="case-row"
              data-open={r.caseId}
              onClick={() => {
                if (onOpenReport) onOpenReport(r.referenceNumber);
                else onOpenCase(r.caseId);
              }}
              aria-label={`Open case for report ${r.referenceNumber}`}
            >
              <div>
                <div className="case-title">{r.caseTitle}</div>
                <div className="case-subline">
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                    {r.referenceNumber}
                  </span>{' '}
                  <span className="dot">·</span> {r.area}
                </div>
              </div>

              <div className="number">
                1 report
                <small>original reference</small>
              </div>

              <div className="age">
                {formatPakistanDate(r.submittedAt).replace(' PKT', '')}
                <small>submitted · PKT</small>
              </div>

              <div>
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
                    ? 'Needs acceptance'
                    : r.status === 'accepted'
                    ? 'Accepted'
                    : r.status === 'in_progress'
                    ? 'In progress'
                    : r.status === 'resolved'
                    ? 'Completed'
                    : r.status}
                </span>
              </div>

              <div className="age">Assigned</div>

              <ChevronRight className="ico arrow" />
            </button>
          ))
        ) : (
          <div className="empty-state">
            <strong>No original reports match these filters</strong>
            <p>Try another area, issue type or search term.</p>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="button"
                data-action="clear-filters"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* List Pagination Footer */}
        <div className="list-footer">
          <span>
            {displayMode === 'cases' ? (
              casePage.total > 0 ? (
                <>
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, casePage.total)} of{' '}
                  {casePage.total.toLocaleString()} cases
                </>
              ) : (
                '0 cases'
              )
            ) : reportPage.total > 0 ? (
              <>
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, reportPage.total)} of{' '}
                {reportPage.total.toLocaleString()} reports
              </>
            ) : (
              '0 reports'
            )}
          </span>

          <div className="row">
            <button
              type="button"
              className="button small"
              data-action="previous"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of{' '}
              {displayMode === 'cases' ? casePage.totalPages : reportPage.totalPages}
            </span>
            <button
              type="button"
              className="button small"
              data-action="next"
              disabled={
                page >=
                (displayMode === 'cases'
                  ? casePage.totalPages - 1
                  : reportPage.totalPages - 1)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ico" style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
