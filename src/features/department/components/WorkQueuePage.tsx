import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';

interface WorkQueuePageProps {
  departmentId: DepartmentId;
  onOpenCase: (caseId: string) => void;
  onOpenReport?: (referenceNumber: string) => void;
  initialArea?: string;
  initialSavedView?: 'needs' | 'unassigned' | 'mine' | 'all';
  initialDisplayMode?: 'cases' | 'reports';
  onCountUpdate?: (counts: { cases: number; reports: number; urgent: number }) => void;
}

export const WorkQueuePage: React.FC<WorkQueuePageProps> = ({
  departmentId,
  onOpenCase,
  onOpenReport,
  initialArea = 'All areas',
  initialSavedView = 'needs',
  initialDisplayMode = 'cases',
  onCountUpdate,
}) => {
  // State
  const [savedView, setSavedView] = useState<'needs' | 'unassigned' | 'mine' | 'all'>(
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
  const [_loading, setLoading] = useState(true);

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
    awaitingAcceptance: 0,
    urgentCases: 0,
  });

  // Areas list
  const areaOptions = [
    'All areas',
    'Gulshan-e-Iqbal',
    'Korangi',
    'Gulberg',
    'North Nazimabad',
    'Saddar',
    'Clifton',
    'PECHS',
  ];

  // Dynamic issue types based on loaded cases
  const issueOptions = useMemo(() => {
    return [
      'All issues',
      'Road damage',
      'Road safety',
      'Road drainage',
      'Road obstruction',
      'Footpath obstruction',
      'Pipeline burst',
      'Sewage overflow',
      'Contaminated water',
      'Sparking wire hazard',
      'Gas leak emergency',
      'Structural cracks',
      'Overflowing public dumpster',
    ];
  }, []);

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
    });
    return () => {
      mounted = false;
    };
  }, [departmentId, onCountUpdate]);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    const filter: WorkQueueFilter = {
      savedView,
      displayMode,
      searchQuery,
      area: selectedArea,
      issueType: selectedIssue,
      sort: selectedSort,
      page,
      pageSize,
    };

    if (displayMode === 'cases') {
      const res = await caseOperationsService.listDepartmentCases(departmentId, filter);
      setCasePage(res);
    } else {
      const res = await caseOperationsService.listDepartmentReports(departmentId, filter);
      setReportPage(res);
    }
    setLoading(false);
  }, [
    departmentId,
    savedView,
    displayMode,
    searchQuery,
    selectedArea,
    selectedIssue,
    selectedSort,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle external initial area change
  useEffect(() => {
    if (initialArea && initialArea !== selectedArea) {
      setSelectedArea(initialArea);
      setPage(0);
    }
  }, [initialArea, selectedArea]);

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
          <h1>Work queue</h1>
          <p>One place to manage incidents and all linked citizen reports.</p>
        </div>
        <div className="small-counter">
          {summaryStats.totalCases} cases · {summaryStats.totalReports.toLocaleString()} reports
        </div>
      </div>

      {/* Saved Views & Display Mode Switch */}
      <div className="viewbar">
        <div className="saved-views" role="tablist" aria-label="Saved work views">
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
            Needs action {summaryStats.awaitingAcceptance > 0 && <b>{summaryStats.awaitingAcceptance}</b>}
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
            Unassigned
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
            All cases <b>{summaryStats.totalCases}</b>
          </button>
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

      {/* Explanatory Helper Note */}
      <p className="queue-note">
        {displayMode === 'cases'
          ? 'Cases reflect separate public incidents. All original citizen reports remain individually trackable.'
          : 'Individual reports retain their own references, statuses and timelines.'}
      </p>

      {/* Contiguous List Surface */}
      <div className="list-shell">
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
                  <div className="case-title">
                    {c.priority === 'critical' ? (
                      <span className="risk">● URGENT</span>
                    ) : c.priority === 'high' ? (
                      <span className="risk high">● ATTENTION</span>
                    ) : null}
                    {c.title}
                  </div>
                  <div className="case-subline">
                    {c.locality} <span className="dot">·</span> {c.publicPlace}
                  </div>
                </div>

                <div className="number">
                  {c.linkedReportCount} {c.linkedReportCount === 1 ? 'report' : 'reports'}
                  <small>{c.uniqueReporterCount} residents</small>
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
                      ? 'Needs acceptance'
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
    </div>
  );
};
