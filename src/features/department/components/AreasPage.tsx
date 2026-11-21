import React, { useState, useEffect, useMemo } from 'react';
import type { DepartmentId, AreaWorkloadSummary } from '../../../types';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { ChevronRight, ArrowRight, Inbox, Loader2, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface AreasPageProps {
  departmentId: DepartmentId;
  onSelectArea: (area: string) => void;
  onViewWorkQueue: () => void;
}

export const AreasPage: React.FC<AreasPageProps> = ({
  departmentId,
  onSelectArea,
  onViewWorkQueue,
}) => {
  const [workloads, setWorkloads] = useState<AreaWorkloadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<'active' | 'oldest' | 'alphabetical'>('active');

  useEffect(() => {
    let mounted = true;
    setError(false);
    setLoading(true);
    caseOperationsService.listAreaWorkload(departmentId).then((res) => {
      if (mounted) {
        setWorkloads(res);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) { setError(true); setLoading(false); }
    });
    return () => {
      mounted = false;
    };
  }, [departmentId, retry]);

  const visibleWorkloads = useMemo(() => {
    const filtered = workloads.filter((area) =>
      `${area.area} ${area.topIssues.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())
    );
    return filtered.sort((a, b) => order === 'alphabetical'
      ? a.area.localeCompare(b.area)
      : order === 'oldest'
      ? b.oldestWaitDays - a.oldestWaitDays
      : b.activeCasesCount - a.activeCasesCount);
  }, [workloads, search, order]);

  const totalActiveCases = workloads.reduce((sum, w) => sum + w.activeCasesCount, 0);
  const totalReports = workloads.reduce((sum, w) => sum + w.linkedReportsCount, 0);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 className="ico animate-spin" style={{ width: 28, height: 28, margin: '0 auto' }} />
        <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading area workloads...</p>
      </div>
    );
  }

  if (error) return <div className="ops-error-state" role="alert"><AlertCircle size={22} /><div><strong>Locality data unavailable</strong><p>Please retry. No figures are shown until this request succeeds.</p></div><button className="button" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} /> Retry</button></div>;

  return (
    <div className="areas-page-container">
      {/* Header */}
      <div className="page-heading">
        <div>
          <div className="ops-eyebrow">OPERATIONS / COVERAGE</div>
          <h1>Areas</h1>
          <p>Find the localities carrying the heaviest unresolved workload.</p>
        </div>
        <button
          type="button"
          className="button"
          data-action="go-queue"
          onClick={onViewWorkQueue}
        >
          <Inbox className="ico" style={{ width: 16, height: 16 }} />
          View work queue
          <ArrowRight className="ico" style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {caseOperationsService.isDemonstrationWorkspace() && <div className="ops-demo-notice" role="note"><AlertCircle size={16} /><span><strong>Demonstration data.</strong> Locality totals include seeded incidents.</span></div>}

      {/* 3 Mini Stats */}
      <div className="mini-stats">
        <div className="mini-stat">
          <small>Localities in this department</small>
          <strong>{workloads.length}</strong>
          <em>across Karachi metropolitan area</em>
        </div>

        <div className="mini-stat">
          <small>Active incident cases</small>
          <strong>{totalActiveCases}</strong>
          <em>distinct physical defects requiring work</em>
        </div>

        <div className="mini-stat">
          <small>Linked citizen reports</small>
          <strong>{totalReports.toLocaleString()}</strong>
          <em>individual citizen submissions</em>
        </div>
      </div>

      {/* Locality Workload Section */}
      <section className="section area-section" style={{ marginTop: 24 }}>
        <div className="ops-section-topline"><div><h2>Locality workload</h2><p>Choose an area to see its cases and linked citizen reports.</p></div><div className="ops-area-tools"><label className="ops-area-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an area" aria-label="Search localities" /></label><label className="ops-sort-label">Sort <select value={order} onChange={(event) => setOrder(event.target.value as typeof order)}><option value="active">Most cases</option><option value="oldest">Longest waiting</option><option value="alphabetical">A to Z</option></select></label></div></div>

        <div className="list-shell area-table">
          <div className="area-head">
            <span>AREA / LOCALITY</span>
            <span>ACTIVE CASES</span>
            <span>LINKED REPORTS</span>
            <span>OLDEST WAIT</span>
            <span>URGENT</span>
            <span />
          </div>

          {visibleWorkloads.map((g) => (
            <button
              type="button"
              key={g.area}
              className="area-row"
              data-area={g.area}
              onClick={() => onSelectArea(g.area)}
              aria-label={`Open ${g.area} cases`}
            >
              <div>
                <strong>{g.area}</strong>
                <br />
                <span style={{ fontSize: 12, color: 'var(--subtle)' }}>
                  {g.topIssues.join(' · ') || 'Municipal service'}
                </span>
              </div>

              <span className="area-count">{g.activeCasesCount}</span>
              <span className="area-count">{g.linkedReportsCount}</span>
              <span>{g.oldestWaitDays} days</span>
              <span>
                {g.urgentCasesCount > 0 ? (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    {g.urgentCasesCount} safety case{g.urgentCasesCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  '0'
                )}
              </span>

              <ChevronRight className="ico" style={{ width: 16, height: 16, color: 'var(--subtle)' }} />
            </button>
          ))}
          {visibleWorkloads.length === 0 && <div className="empty-state"><strong>No matching areas</strong><p>Try a different locality name.</p><button type="button" className="button" onClick={() => setSearch('')}>Clear search</button></div>}
        </div>
      </section>
    </div>
  );
};
