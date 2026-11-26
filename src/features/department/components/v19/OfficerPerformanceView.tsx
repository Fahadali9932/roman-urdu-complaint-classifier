import React, { useMemo } from 'react';
import { type DepartmentWorkOrder, type DepartmentOfficer } from '../../services/fieldOperations';
import { Trophy, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface OfficerPerformanceViewProps {
  departmentCode: string;
  departmentName: string;
  officer: DepartmentOfficer | null;
  orders: DepartmentWorkOrder[];
  warnings?: Array<{ id: string; reason: string; issuedAt: string }>;
}

export const OfficerPerformanceView: React.FC<OfficerPerformanceViewProps> = ({
  departmentCode,
  departmentName,
  officer,
  orders,
  warnings = [],
}) => {
  // Derive performance statistics
  const verifiedOrders = useMemo(() => orders.filter((o) => o.status === 'verified'), [orders]);

  const onTimePercentage = useMemo(() => {
    if (!officer) return 100;
    const total = officer.verified_cases + officer.overdue_cases;
    if (total === 0) return 100;
    return Math.round((officer.on_time_cases / total) * 100);
  }, [officer]);

  return (
    <div data-testid="v19-officer-performance" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v19-text-primary)' }}>
          Operational Performance &amp; Scorecard
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--v19-text-muted)', margin: '4px 0 0' }}>
          Personal resolution record, on-time delivery ratings, supervisory notices, and departmental standing.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* On-Time Delivery Rate */}
        <div className="v19-glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
              On-Time Completion Rate
            </span>
            <CheckCircle2 size={18} style={{ color: 'var(--v19-lime)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v19-lime)', fontFamily: 'var(--v19-font-mono)' }}>
            {onTimePercentage}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--v19-text-secondary)' }}>
            {officer?.on_time_cases || 0} completed within initial commencement deadline
          </div>
        </div>

        {/* Total Verified Cases */}
        <div className="v19-glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
              Supervisor-Verified
            </span>
            <ShieldCheck size={18} style={{ color: 'var(--v19-green)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v19-green)', fontFamily: 'var(--v19-font-mono)' }}>
            {officer?.verified_cases || verifiedOrders.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--v19-text-secondary)' }}>
            100% corroborated with 30m GPS validation
          </div>
        </div>

        {/* Department Standing */}
        <div className="v19-glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
              Field Standing
            </span>
            <Trophy size={18} style={{ color: 'var(--v19-cyan)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v19-cyan)', fontFamily: 'var(--v19-font-mono)' }}>
            {officer?.membership_status === 'suspended' ? 'Suspended' : 'Exemplary'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--v19-text-secondary)' }}>
            Department: {departmentCode} · {departmentName}
          </div>
        </div>
      </div>

      {/* Formal Notices / Warnings Section */}
      <div className="v19-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: warnings.length > 0 ? 'var(--v19-amber)' : 'var(--v19-green)' }}>
            {warnings.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              Supervisory Operational Notices ({warnings.length})
            </span>
          </div>
        </div>

        {warnings.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--v19-text-secondary)', margin: 0 }}>
            Clean operational record. No formal supervisor warnings or performance infractions are recorded for your account.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {warnings.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid var(--v19-amber-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--v19-amber)' }}>FORMAL SUPERVISORY NOTICE</span>
                  <span style={{ color: 'var(--v19-text-muted)' }}>{new Date(w.issuedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--v19-text-primary)' }}>{w.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Work Orders Ledger */}
      <div className="v19-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
          Historical Field Order Ledger ({orders.length})
        </span>

        {orders.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--v19-text-dim)', margin: 0 }}>No past field orders recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'var(--v19-glass-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                    {o.case_label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--v19-text-muted)', fontFamily: 'var(--v19-font-mono)', marginTop: '2px' }}>
                    ORDER #{o.id.slice(0, 8)} · Due: {new Date(o.due_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background:
                        o.status === 'verified'
                          ? 'var(--v19-green-soft)'
                          : o.status === 'pending_review'
                          ? 'var(--v19-cyan-soft)'
                          : 'var(--v19-amber-soft)',
                      color:
                        o.status === 'verified'
                          ? 'var(--v19-green)'
                          : o.status === 'pending_review'
                          ? 'var(--v19-cyan)'
                          : 'var(--v19-amber)',
                    }}
                  >
                    {o.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
