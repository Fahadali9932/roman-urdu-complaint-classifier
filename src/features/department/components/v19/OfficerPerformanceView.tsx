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
        <div className="v19-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              On-Time Completion Rate
            </span>
            <CheckCircle2 size={18} style={{ color: 'var(--v20-accent, #DFA51D)' }} />
          </div>
          <div style={{ fontSize: 'clamp(32px, 3.2vw, 40px)', fontWeight: 800, color: 'var(--v20-accent, #DFA51D)', fontFamily: 'var(--v20-font-number)' }}>
            {onTimePercentage}%
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)' }}>
            {officer?.on_time_cases || 0} completed within initial commencement deadline
          </div>
        </div>

        {/* Total Verified Cases */}
        <div className="v19-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Supervisor-Verified
            </span>
            <ShieldCheck size={18} style={{ color: 'var(--v20-status-solved, #43A047)' }} />
          </div>
          <div style={{ fontSize: 'clamp(32px, 3.2vw, 40px)', fontWeight: 800, color: 'var(--v20-status-solved, #43A047)', fontFamily: 'var(--v20-font-number)' }}>
            {officer?.verified_cases || verifiedOrders.length}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)' }}>
            100% corroborated with 30m GPS validation
          </div>
        </div>

        {/* Department Standing */}
        <div className="v19-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Field Standing
            </span>
            <Trophy size={18} style={{ color: 'var(--v20-accent, #DFA51D)' }} />
          </div>
          <div style={{ fontSize: 'clamp(32px, 3.2vw, 40px)', fontWeight: 800, color: 'var(--v20-accent, #DFA51D)', fontFamily: 'var(--v20-font-number)' }}>
            {officer?.membership_status === 'suspended' ? 'Suspended' : 'Exemplary'}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)' }}>
            Department: {departmentCode} · {departmentName}
          </div>
        </div>
      </div>

      {/* Formal Notices / Warnings Section */}
      <div className="v19-glass-card" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: warnings.length > 0 ? '#F59E0B' : 'var(--v20-status-solved, #43A047)' }}>
            {warnings.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontSize: '16px', fontWeight: 650 }}>
              Supervisory Operational Notices ({warnings.length})
            </span>
          </div>
        </div>

        {warnings.length === 0 ? (
          <p style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary)', margin: 0 }}>
            Clean operational record. No formal supervisor warnings or performance infractions are recorded for your account.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {warnings.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#F59E0B', letterSpacing: '0.04em' }}>FORMAL SUPERVISORY NOTICE</span>
                  <span style={{ color: 'var(--v20-text-muted)' }}>{new Date(w.issuedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--v20-text-primary)' }}>{w.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Work Orders Ledger */}
      <div className="v19-glass-card" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px' }}>
        <span style={{ fontSize: '16px', fontWeight: 650, color: 'var(--v20-text-primary)' }}>
          Historical Field Order Ledger ({orders.length})
        </span>

        {orders.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--v20-text-muted)', margin: 0 }}>No past field orders recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--v20-glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>
                    {o.case_label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--v20-text-muted)', fontFamily: 'var(--v20-font-number, monospace)', marginTop: '2px' }}>
                    ORDER #{o.id.slice(0, 8)} · Due: {new Date(o.due_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      background:
                        o.status === 'verified'
                          ? 'rgba(67, 160, 71, 0.16)'
                          : o.status === 'pending_review'
                          ? 'rgba(2, 136, 209, 0.16)'
                          : 'rgba(245, 158, 11, 0.16)',
                      color:
                        o.status === 'verified'
                          ? '#66BB6A'
                          : o.status === 'pending_review'
                          ? '#29B6F6'
                          : '#F59E0B',
                      border:
                        o.status === 'verified'
                          ? '1px solid rgba(67, 160, 71, 0.35)'
                          : o.status === 'pending_review'
                          ? '1px solid rgba(2, 136, 209, 0.35)'
                          : '1px solid rgba(245, 158, 11, 0.35)',
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
