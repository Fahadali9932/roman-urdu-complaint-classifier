import React, { useState } from 'react';
import { V20InteractiveDonut, DonutSegment } from './V20InteractiveDonut';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export interface V20DashboardPageProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  totalActiveCases: number;
  totalSolvedCases: number;
  // Optional distribution counts
  inProgressCount?: number;
  pendingCount?: number;
  verificationCount?: number;
}

type PeriodFilter = 'today' | 'yesterday' | 'month' | 'year';

export const V20DashboardPage: React.FC<V20DashboardPageProps> = ({
  departmentCode,
  departmentName,
  role,
  totalActiveCases,
  totalSolvedCases,
  inProgressCount = 18,
  pendingCount = 12,
  verificationCount = 8,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('today');

  const { dateStr, timeStr } = trustedTimeService.formatPkt();

  // Multipliers for interactive date filter switching to demonstrate dynamic transitions
  const filterMultipliers: Record<PeriodFilter, { label: string; mult: number }> = {
    today: { label: 'Today', mult: 1 },
    yesterday: { label: 'Yesterday', mult: 0.85 },
    month: { label: 'This Month', mult: 4.2 },
    year: { label: 'This Year', mult: 24.5 },
  };

  const currentMult = filterMultipliers[selectedPeriod].mult;
  const periodLabel = filterMultipliers[selectedPeriod].label;

  // Segment slices with harmonized departmental atmospheric colors
  const segments: DonutSegment[] = [
    {
      id: 'solved',
      label: 'Solved',
      value: Math.round(totalSolvedCases * (selectedPeriod === 'today' ? 0.35 : currentMult * 0.15)) || 14,
      color: 'var(--v20-status-solved, #43A047)',
    },
    {
      id: 'progress',
      label: 'In progress',
      value: Math.round(inProgressCount * (selectedPeriod === 'today' ? 1 : currentMult * 0.4)) || 18,
      color: 'var(--v20-accent, #DFA51D)',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: Math.round(pendingCount * (selectedPeriod === 'today' ? 1 : currentMult * 0.3)) || 12,
      color: 'var(--v20-status-pending, #E65100)',
    },
    {
      id: 'verification',
      label: role === 'head' ? 'Verification' : 'Under Review',
      value: Math.round(verificationCount * (selectedPeriod === 'today' ? 1 : currentMult * 0.2)) || 8,
      color: 'var(--v20-status-verification, #0288D1)',
    },
  ];

  const periodTotal = segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <main className="v20-dashboard-container" data-testid="v20-dashboard-page">
      {/* Top Context Sub-Bar */}
      <div className="v20-dashboard-context-row">
        <span className="v20-dashboard-context-crumb" data-testid="v20-dashboard-crumb" title={departmentName}>
          {departmentCode.toUpperCase()} / DASHBOARD
        </span>
        <span className="v20-dashboard-context-datetime">
          {dateStr} · {timeStr} PKT
        </span>
      </div>

      {/* Main Two-Column Editorial Composition (Exact Screenshot 655 Layout) */}
      <div className="v20-dashboard-main-grid">
        {/* Left Side: Standalone Large Bold Numbers (Direct against background) */}
        <div className="v20-dashboard-stats-column" data-testid="v20-dashboard-standalone-stats">
          {/* Active Cases Block */}
          <div className="v20-stat-block">
            <span className="v20-stat-label">
              {role === 'head' ? 'TOTAL ACTIVE CASES' : 'CASES PENDING'}
            </span>
            <div className="v20-stat-number" data-testid="v20-stat-active-cases">
              {totalActiveCases}
            </div>
          </div>

          {/* Solved Cases Block */}
          <div className="v20-stat-block">
            <span className="v20-stat-label">
              {role === 'head' ? 'TOTAL CASES SOLVED' : 'CASES SOLVED'}
            </span>
            <div className="v20-stat-number" data-testid="v20-stat-solved-cases">
              {totalSolvedCases}
            </div>
          </div>
        </div>

        {/* Right Side: Period Switcher & Donut Chart (Direct against background) */}
        <div className="v20-dashboard-chart-column">
          {/* Period Capsule Filter */}
          <div className="v20-chart-filter-row" role="group" aria-label="Date Period Filters">
            {(['today', 'yesterday', 'month', 'year'] as PeriodFilter[]).map((p) => {
              const isActive = selectedPeriod === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={`v20-filter-capsule-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => setSelectedPeriod(p)}
                  data-filter={p}
                >
                  {filterMultipliers[p].label}
                </button>
              );
            })}
          </div>

          {/* NameThatUI-inspired Interactive Donut Chart */}
          <V20InteractiveDonut
            segments={segments}
            periodLabel={periodLabel}
            totalCases={periodTotal}
          />
        </div>
      </div>
    </main>
  );
};
