import React, { useState, useEffect } from 'react';
import type { DepartmentId, AreaWorkloadSummary } from '../../../types';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { ChevronRight, ArrowRight, Inbox, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    let mounted = true;
    caseOperationsService.listAreaWorkload(departmentId).then((res) => {
      if (mounted) {
        setWorkloads(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [departmentId]);

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

  return (
    <div className="areas-page-container">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Areas</h1>
          <p>
            See workload by locality. Area totals summarize cases — they never merge unrelated incidents.
          </p>
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
      <section className="section" style={{ marginTop: 24 }}>
        <h2>Locality workload</h2>
        <p>Select a locality to open its cases, issues and linked original reports.</p>

        <div className="list-shell area-table">
          <div className="area-head">
            <span>AREA / LOCALITY</span>
            <span>ACTIVE CASES</span>
            <span>LINKED REPORTS</span>
            <span>OLDEST WAIT</span>
            <span>URGENT</span>
            <span />
          </div>

          {workloads.map((g) => (
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
        </div>
      </section>
    </div>
  );
};
