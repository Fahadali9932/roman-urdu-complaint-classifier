import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, RefreshCw, AlertCircle } from 'lucide-react';
import type { DepartmentId } from '../../../types';
import {
  caseOperationsService,
  type ComplaintsDateFilter,
  type HeadIndependentComplaintRow,
} from '../../../services/CaseOperationsService';
import { fieldOperations } from '../services/fieldOperations';
import { HeadComplaintDetailView } from './HeadComplaintDetailView';
import { LiquidSegmentedControl } from './glass/LiquidSegmentedControl';
import { PriorityPill } from './glass/PriorityPill';

interface HeadComplaintsPageProps {
  departmentId: DepartmentId;
  initialComplaintId?: string | null;
}

const DATE_FILTERS: Array<{ id: ComplaintsDateFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'month', label: 'This month' },
];

/**
 * V16 Department Head Complaints view:
 * - Default period: Today (with All / Today / Yesterday / This month)
 * - Area dropdown filter
 * - Flat independent complaint rows: heading, location, chevron only (no unconfirmed bundle count)
 * - Opens flat reading page while preserving list filter state and Prev/Next traversal
 */
export const HeadComplaintsPage: React.FC<HeadComplaintsPageProps> = ({
  departmentId,
  initialComplaintId = null,
}) => {
  const [period, setPeriod] = useState<ComplaintsDateFilter>('today');
  const [selectedArea, setSelectedArea] = useState<string>('All areas');
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState<string[]>(['All areas']);
  const [rows, setRows] = useState<HeadIndependentComplaintRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialComplaintId);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [orders, linksMap, roster, areaList] = await Promise.all([
        fieldOperations.orders(departmentId).catch(() => []),
        fieldOperations.orderLinksMap(departmentId).catch(() => new Map()),
        fieldOperations.officersDirectory(departmentId).catch(() => []),
        caseOperationsService.listAreaWorkload(departmentId).catch(() => []),
      ]);
      const officerNames = new Map(roster.map((o) => [o.user_id, o.display_name]));
      const items = await caseOperationsService.listIndependentComplaintsForHead(departmentId, {
        period,
        area: selectedArea,
        searchQuery,
        orders,
        orderLinksMap: linksMap,
        officerNames,
      });
      setRows(items);
      setAreas(['All areas', ...areaList.map((a) => a.area).filter(Boolean)]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [departmentId, period, selectedArea, searchQuery]);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints, reloadKey]);

  const selectedIndex = useMemo(
    () => (selectedId ? rows.findIndex((r) => r.id === selectedId || r.referenceNumber === selectedId) : -1),
    [rows, selectedId]
  );
  const selectedComplaint = selectedIndex >= 0 ? rows[selectedIndex] : null;

  if (selectedComplaint) {
    return (
      <HeadComplaintDetailView
        departmentId={departmentId}
        complaint={selectedComplaint}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex < rows.length - 1}
        onPrev={() => {
          if (selectedIndex > 0) {
            setSelectedId(rows[selectedIndex - 1].id);
          }
        }}
        onNext={() => {
          if (selectedIndex < rows.length - 1) {
            setSelectedId(rows[selectedIndex + 1].id);
          }
        }}
        onBack={() => setSelectedId(null)}
        onAssigned={async () => {
          await loadComplaints();
        }}
      />
    );
  }

  return (
    <section className="v16-complaints-page" data-testid="v16-head-complaints">
      <header className="v16-complaints-header">
        <div>
          <h1 className="v16-page-title">Complaints</h1>
          <p className="v16-overview-sub">
            Independent incoming citizen complaints for departmental triage and work assignment.
          </p>
        </div>

        <button
          type="button"
          className="v15-surface-btn"
          onClick={() => setReloadKey((k) => k + 1)}
          aria-label="Refresh complaints"
        >
          <RefreshCw size={15} strokeWidth={1.75} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Filter Bar */}
      <div className="v16-complaints-controls">
        <LiquidSegmentedControl
          ariaLabel="Complaint date range"
          size="sm"
          value={period}
          onChange={(next) => setPeriod(next)}
          options={DATE_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
        />

        <div className="v16-complaints-right-filters">
          <select
            aria-label="Filter by area"
            className="v16-area-select"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
          >
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <label className="v16-search-input-wrap">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, reference, location"
              aria-label="Search complaints"
            />
          </label>
        </div>
      </div>

      {/* Flat List States */}
      {loading && (
        <div className="v15-state-box" role="status">
          <p className="v15-state-title">Loading complaints…</p>
          <p className="v15-state-desc">Fetching independent department complaints.</p>
        </div>
      )}

      {!loading && errorMsg && (
        <div className="v15-state-box" role="alert">
          <p className="v15-state-title" style={{ color: 'var(--v15-danger)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={17} strokeWidth={1.75} />
            Unable to load complaints
          </p>
          <p className="v15-state-desc">{errorMsg}</p>
          <button type="button" className="v15-surface-btn" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw size={14} strokeWidth={1.75} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!loading && !errorMsg && rows.length === 0 && (
        <div className="v15-state-box" data-testid="v16-complaints-empty">
          <p className="v15-state-title">No complaints match this filter</p>
          <p className="v15-state-desc">
            Try switching to All dates or clearing the area filter.
          </p>
          {(period !== 'all' || selectedArea !== 'All areas' || searchQuery) && (
            <button
              type="button"
              className="v15-surface-btn"
              onClick={() => {
                setPeriod('all');
                setSelectedArea('All areas');
                setSearchQuery('');
              }}
            >
              Show all complaints
            </button>
          )}
        </div>
      )}

      {!loading && !errorMsg && rows.length > 0 && (
        <div className="lg-glass-panel lg-inbox-card" data-testid="v16-complaints-list">
          {rows.map((item) => (
            <button
              key={item.id}
              type="button"
              className="lg-mail-row"
              data-testid="v16-complaint-row"
              onClick={() => setSelectedId(item.id)}
            >
              <div className="lg-mail-main">
                <div className="lg-mail-title v16-flat-row-heading">{item.heading}</div>
                <div className="lg-mail-meta">
                  <span>{item.referenceNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {item.publicPlace}
                    {item.locality ? `, ${item.locality}` : ''}
                  </span>
                </div>
              </div>
              <div className="lg-mail-right">
                <PriorityPill priority={item.priority} />
                <ChevronRight size={16} strokeWidth={1.75} className="lg-row-chevron" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
