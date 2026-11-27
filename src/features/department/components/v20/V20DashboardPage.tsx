import React, { useState } from 'react';
import { V20InteractiveDonut, type DonutSegment } from './V20InteractiveDonut';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export type DashboardStatus = 'solved' | 'progress' | 'pending' | 'verification';
export interface DashboardRecord { timestamp: string; status: DashboardStatus }
export interface V20DashboardPageProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  totalActiveCases: number;
  totalSolvedCases: number;
  records?: DashboardRecord[];
  isLoading?: boolean;
  inProgressCount?: number;
  pendingCount?: number;
  verificationCount?: number;
}
type Period = 'today' | 'yesterday' | 'month' | 'year';
const periods: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' },
  { id: 'month', label: 'This Month' }, { id: 'year', label: 'This Year' },
];

export function filterDashboardRecords(records: DashboardRecord[], period: Period, now: Date): DashboardRecord[] {
  // Pakistan uses UTC+05:00 year-round. Shift to a calendar representation before selecting boundaries.
  const offset = 5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
  const start = (period === 'year' ? Date.UTC(y, 0, 1) : period === 'month' ? Date.UTC(y, m, 1) : Date.UTC(y, m, d - (period === 'yesterday' ? 1 : 0))) - offset;
  const end = period === 'yesterday' ? Date.UTC(y, m, d) - offset : now.getTime() + 1;
  return records.filter(r => { const time = Date.parse(r.timestamp); return Number.isFinite(time) && time >= start && time < end; });
}

export const V20DashboardPage: React.FC<V20DashboardPageProps> = ({
  departmentCode, departmentName, role, totalActiveCases, totalSolvedCases, records, isLoading,
}) => {
  const [period, setPeriod] = useState<Period>('today');
  const selected = filterDashboardRecords(records ?? [], period, trustedTimeService.now());
  const categories: { id: DashboardStatus; label: string; color: string }[] = [
    { id: 'solved', label: 'Solved', color: 'var(--v20-chart-solved)' },
    { id: 'progress', label: 'In progress', color: 'var(--v20-chart-progress)' },
    { id: 'pending', label: 'Pending', color: 'var(--v20-chart-pending)' },
    { id: 'verification', label: 'Awaiting verification', color: 'var(--v20-chart-verification)' },
  ];
  const segments: DonutSegment[] = categories.map(c => ({ ...c, value: selected.filter(r => r.status === c.id).length }));
  return (
    <main className="v20-dashboard-container" data-testid="v20-dashboard-page">
      <div className="v20-dashboard-context-row">
        <h1 className="v20-dashboard-context-crumb" data-testid="v20-dashboard-crumb" title={departmentName}>{departmentCode.toUpperCase()} / Dashboard</h1>
      </div>
      <div className="v20-dashboard-main-grid">
        <section className="v20-dashboard-stats-column" data-testid="v20-dashboard-standalone-stats" aria-label="Overall totals">
          <div className="v20-stat-block"><span className="v20-stat-label">{role === 'head' ? 'Total active cases' : 'Cases pending'}</span><div className="v20-stat-number" data-testid="v20-stat-active-cases">{isLoading ? '—' : totalActiveCases}</div></div>
          <div className="v20-stat-block"><span className="v20-stat-label">{role === 'head' ? 'Total cases solved' : 'Cases solved'}</span><div className="v20-stat-number" data-testid="v20-stat-solved-cases">{isLoading ? '—' : totalSolvedCases}</div></div>
        </section>
        <section className="v20-dashboard-chart-column" aria-label="Case distribution">
          <div className="v20-chart-filter-row" role="group" aria-label="Date Period Filters">
            {periods.map(p => <button key={p.id} type="button" data-filter={p.id} aria-pressed={period === p.id} className={`v20-filter-capsule-btn ${period === p.id ? 'is-active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
          </div>
          {isLoading ? <p role="status">Loading case distribution…</p> : records === undefined ? <p>Period data unavailable.</p> : <V20InteractiveDonut key={period} segments={segments} periodLabel={periods.find(p => p.id === period)!.label} totalCases={selected.length}/>}
          <p className="v20-chart-scope">{role === 'head' ? 'Complaints received' : 'Assignments received'} in selected period · current status</p>
        </section>
      </div>
    </main>
  );
};
