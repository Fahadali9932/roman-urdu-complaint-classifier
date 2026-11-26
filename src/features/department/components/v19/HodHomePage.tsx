import React, { useState, useMemo } from 'react';
import { DonutChart, type DonutDatePeriod, type DonutSegment } from './DonutChart';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';

export interface HodHomePageProps {
  departmentName: string;
  hodName: string;
  complaints: HeadIndependentComplaintRow[];
  onNavigateToSection: (sectionId: string) => void;
  isLoading?: boolean;
}

/**
 * V19 HOD Home View
 * Features:
 * - Large, bold personalized greeting using authenticated HOD name
 * - Left column: Total active cases & total solved cases with expressive typography
 * - Right column: Pure SVG Donut chart with complaint distribution + Date filters
 * - Strict adherence: Clean, focused — zero incoming cards or officer lists on Home
 */
export const HodHomePage: React.FC<HodHomePageProps> = ({
  departmentName,
  hodName,
  complaints,
  onNavigateToSection,
  isLoading = false,
}) => {
  const [period, setPeriod] = useState<DonutDatePeriod>('today');
  const [mountTime] = useState<number>(() => Date.now());

  // Greeting based on PKT hour
  const greetingText = useMemo(() => {
    try {
      const date = new Date(mountTime);
      const hour = parseInt(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Karachi',
          hour: 'numeric',
          hour12: false,
        }).format(date),
        10
      );
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      return 'Good evening';
    } catch {
      return 'Welcome';
    }
  }, [mountTime]);

  // Filter complaints by period for statistics
  const periodComplaints = useMemo(() => {
    if (period === 'year') return complaints;

    const pktOffset = 5 * 60 * 60 * 1000;
    const pktNow = new Date(mountTime + pktOffset);
    const y = pktNow.getUTCFullYear();
    const m = pktNow.getUTCMonth();
    const d = pktNow.getUTCDate();
    const todayStart = Date.UTC(y, m, d, 0, 0, 0, 0) - pktOffset;

    let startMs = todayStart;
    let endMs = mountTime;

    if (period === 'yesterday') {
      startMs = todayStart - 86400000;
      endMs = todayStart - 1;
    } else if (period === 'month') {
      startMs = Date.UTC(y, m, 1, 0, 0, 0, 0) - pktOffset;
      endMs = mountTime;
    }

    return complaints.filter((c) => {
      const ts = new Date(c.submittedAt).getTime();
      return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
    });
  }, [complaints, period, mountTime]);

  // Derive counts
  const stats = useMemo(() => {
    const unassigned = periodComplaints.filter(
      (c) => (c.status === 'submitted' || c.status === 'under_review' || c.status === 'assigned') && (!c.workOrderStatus || c.workOrderStatus === 'assigned')
    ).length;
    const inProgress = periodComplaints.filter(
      (c) => c.status === 'in_progress' || c.workOrderStatus === 'in_progress'
    ).length;
    const verificationPending = periodComplaints.filter(
      (c) => c.workOrderStatus === 'pending_review'
    ).length;
    const solved = periodComplaints.filter(
      (c) => c.status === 'resolved' || c.workOrderStatus === 'verified'
    ).length;

    const totalActive = unassigned + inProgress + verificationPending;

    return {
      unassigned,
      inProgress,
      verificationPending,
      solved,
      totalActive,
    };
  }, [periodComplaints]);

  // Donut chart segments
  const donutSegments: DonutSegment[] = useMemo(() => [
    {
      id: 'unassigned',
      label: 'Unassigned Inbox',
      value: stats.unassigned,
      color: 'var(--v19-amber)',
    },
    {
      id: 'in_progress',
      label: 'Field In Progress',
      value: stats.inProgress,
      color: 'var(--v19-blue)',
    },
    {
      id: 'verification_pending',
      label: 'Awaiting Verification',
      value: stats.verificationPending,
      color: 'var(--v19-cyan)',
    },
    {
      id: 'solved',
      label: 'Verified & Solved',
      value: stats.solved,
      color: 'var(--v19-green)',
    },
  ], [stats]);

  return (
    <div data-testid="v19-hod-home" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Greeting */}
      <div className="v19-home-header">
        <div>
          <h1 className="v19-greeting-title">
            {greetingText}, {hodName}
          </h1>
          <p className="v19-greeting-subtitle">
            {departmentName} · Karachi Municipal Operations Command
          </p>
        </div>
      </div>

      {/* Main Home Grid */}
      <div className="v19-home-grid">
        {/* Left Column: Stat Stack */}
        <div className="v19-stat-stack">
          {/* Card 1: Active Cases */}
          <div
            className="v19-glass-card v19-stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigateToSection('complaints')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="v19-stat-label">Total Active Cases</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: 'var(--v19-lime-soft)', color: 'var(--v19-lime)' }}>
                Requires Action
              </span>
            </div>

            <div className="v19-stat-number" style={{ color: 'var(--v19-lime)' }}>
              {isLoading ? '…' : stats.totalActive}
            </div>

            <div className="v19-stat-footer">
              <span>{stats.unassigned} unassigned</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{stats.inProgress} field progress</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{stats.verificationPending} review proof</span>
            </div>
          </div>

          {/* Card 2: Solved Cases */}
          <div
            className="v19-glass-card v19-stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigateToSection('verification')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="v19-stat-label">Total Solved Cases</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: 'var(--v19-green-soft)', color: 'var(--v19-green)' }}>
                Verified
              </span>
            </div>

            <div className="v19-stat-number" style={{ color: 'var(--v19-text-primary)' }}>
              {isLoading ? '…' : stats.solved}
            </div>

            <div className="v19-stat-footer">
              <span>Supervised &amp; confirmed departmental resolutions</span>
            </div>
          </div>
        </div>

        {/* Right Column: Filterable SVG Donut Chart */}
        <DonutChart
          title="Departmental Case Distribution"
          segments={donutSegments}
          period={period}
          onPeriodChange={setPeriod}
          centerLabel="Total Cases"
          onSegmentClick={(segmentId) => {
            if (segmentId === 'unassigned') onNavigateToSection('complaints');
            else if (segmentId === 'verification_pending') onNavigateToSection('verification');
            else onNavigateToSection('complaints');
          }}
        />
      </div>
    </div>
  );
};
