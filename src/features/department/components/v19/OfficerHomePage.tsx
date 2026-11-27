import React, { useState, useMemo } from 'react';
import { DonutChart, type DonutDatePeriod, type DonutSegment } from './DonutChart';
import { type DepartmentWorkOrder } from '../../services/fieldOperations';
import { Briefcase, ArrowRight } from 'lucide-react';

export interface OfficerHomePageProps {
  departmentName: string;
  officerName: string;
  employeeId?: string;
  orders: DepartmentWorkOrder[];
  onNavigateToSection: (sectionId: string) => void;
  isLoading?: boolean;
}

export const OfficerHomePage: React.FC<OfficerHomePageProps> = ({
  departmentName,
  officerName,
  employeeId,
  orders,
  onNavigateToSection,
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

  // Filter orders by period
  const periodOrders = useMemo(() => {
    if (period === 'year') return orders;

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

    return orders.filter((o) => {
      const ts = new Date(o.started_at || o.due_at).getTime();
      return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
    });
  }, [orders, period, mountTime]);

  // Counts
  const stats = useMemo(() => {
    const assignedNotStarted = periodOrders.filter((o) => o.status === 'assigned' && !o.started_at).length;
    const inProgress = periodOrders.filter((o) => o.status === 'in_progress' || Boolean(o.started_at && o.status !== 'verified')).length;
    const pendingVerification = periodOrders.filter((o) => o.status === 'pending_review').length;
    const verified = periodOrders.filter((o) => o.status === 'verified').length;

    const activeTotal = assignedNotStarted + inProgress;
    const totalOrders = periodOrders.length;
    const onTimeRate = totalOrders > 0 ? Math.round((verified / totalOrders) * 100) : 100;

    return {
      assignedNotStarted,
      inProgress,
      pendingVerification,
      verified,
      activeTotal,
      onTimeRate,
    };
  }, [periodOrders]);

  // Donut chart segments
  const donutSegments: DonutSegment[] = useMemo(() => [
    {
      id: 'assigned',
      label: 'Assigned (Pending Start)',
      value: stats.assignedNotStarted,
      color: 'var(--v19-amber)',
    },
    {
      id: 'in_progress',
      label: 'Field In Progress',
      value: stats.inProgress,
      color: 'var(--v19-blue)',
    },
    {
      id: 'pending_review',
      label: 'Submitted for Verification',
      value: stats.pendingVerification,
      color: 'var(--v19-cyan)',
    },
    {
      id: 'verified',
      label: 'Supervisor Verified',
      value: stats.verified,
      color: 'var(--v19-green)',
    },
  ], [stats]);

  return (
    <div data-testid="v19-officer-home" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Greeting */}
      <div className="v19-home-header">
        <div>
          <h1 className="v19-greeting-title">
            {greetingText}, {officerName}
          </h1>
          <p className="v19-greeting-subtitle">
            {departmentName} · Field Officer Desk {employeeId ? `· ID: ${employeeId}` : ''}
          </p>
        </div>
      </div>

      {/* Main Home Grid */}
      <div className="v19-home-grid">
        {/* Left Column: Stat Stack */}
        <div className="v19-stat-stack">
          {/* Active Field Tasks */}
          <div
            className="v19-glass-card v19-stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigateToSection('work')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="v19-stat-label">Active Field Tasks</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: 'var(--v19-lime-soft)', color: 'var(--v19-lime)' }}>
                My work ↗
                <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                  (Fieldwork Console)
                </span>
              </span>
            </div>
            <div className="v19-stat-value">{stats.activeTotal}</div>
            <div className="v19-stat-detail">
              <span>{stats.inProgress} active on site</span>
              <span>·</span>
              <span style={{ color: 'var(--v19-amber)' }}>{stats.assignedNotStarted} pending commencement</span>
            </div>
          </div>

          {/* Supervisor Verified Cases */}
          <div
            className="v19-glass-card v19-stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigateToSection('performance')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="v19-stat-label">Verified Completions</span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: 'var(--v19-green-soft)', color: 'var(--v19-green)' }}>
                Ledger ↗
              </span>
            </div>
            <div className="v19-stat-value" style={{ color: 'var(--v19-green)' }}>
              {stats.verified}
            </div>
            <div className="v19-stat-detail">
              <span>Audited 30m GPS proof</span>
              <span>·</span>
              <span>{stats.pendingVerification} awaiting HOD review</span>
            </div>
          </div>

          {/* Quick Jump to Active Work Hub */}
          <button
            type="button"
            className="v19-nav-tab"
            style={{
              background: 'var(--v19-lime)',
              color: '#0E121A',
              fontWeight: 600,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '16px',
              marginTop: '4px',
              boxShadow: '0 4px 18px var(--v19-lime-soft)',
            }}
            onClick={() => onNavigateToSection('work')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={18} />
              <span style={{ fontSize: '14px' }}>Open Active Work Hub</span>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Right Column: Donut Chart with Date Filters */}
        <div className="v19-chart-card">
          <DonutChart
            title="Personal Task Breakdown"
            segments={donutSegments}
            period={period}
            onPeriodChange={setPeriod}
            centerLabel="My Assigned Tasks"
            onSegmentClick={(id) => {
              if (id === 'assigned') onNavigateToSection('complaints');
              else if (id === 'in_progress') onNavigateToSection('work');
            }}
          />
        </div>
      </div>
    </div>
  );
};
