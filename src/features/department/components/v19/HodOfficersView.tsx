import React, { useState } from 'react';
import { type DepartmentOfficer, type DepartmentWorkOrder, type ProvisionOfficerResult } from '../../services/fieldOperations';
import { UserPlus, CheckCircle2, X, Search, ArrowLeft, ShieldAlert, Clock, AlertTriangle, Star } from 'lucide-react';

export interface HodOfficersViewProps {
  departmentId?: string;
  departmentCode: string;
  officers: DepartmentOfficer[];
  orders: DepartmentWorkOrder[];
  onProvisionOfficer: (data: {
    fullName: string;
    email: string;
    cnic: string;
    phoneNumber: string;
  }) => Promise<ProvisionOfficerResult>;
  onToggleSuspension: (officerId: string, currentStatus: string, reason?: string) => Promise<void>;
  onIssueWarning: (officerId: string, reason: string) => Promise<void>;
  onExtendDeadline?: (orderId: string, additionalHours: number) => Promise<void>;
  isLoading?: boolean;
}

export const HodOfficersView: React.FC<HodOfficersViewProps> = ({
  departmentCode,
  officers,
  orders,
  onProvisionOfficer,
  onToggleSuspension,
  onIssueWarning,
  onExtendDeadline,
}) => {
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'active' | 'history' | 'notices'>('active');

  // Add Officer Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [provisionResult, setProvisionResult] = useState<ProvisionOfficerResult | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Warning Modal State
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false);

  // Suspension Modal State
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // Extend Deadline State
  const [extendingOrderId, setExtendingOrderId] = useState<string | null>(null);
  const [extendHours, setExtendHours] = useState(24);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

  const activeOfficer = officers.find((o) => o.user_id === selectedOfficerId) || null;
  const officerOrders = orders.filter((o) => o.officer_id === selectedOfficerId);

  // Filter orders by status
  const activeOrders = officerOrders.filter((o) => o.status !== 'verified' && (o.status as string) !== 'rejected');
  const completedOrders = officerOrders.filter((o) => o.status === 'verified');

  const filteredOfficers = officers.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.display_name.toLowerCase().includes(q) ||
      (o.employee_id && o.employee_id.toLowerCase().includes(q)) ||
      (o.staff_username && o.staff_username.toLowerCase().includes(q))
    );
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !cnic.trim()) return;
    setIsSubmittingAdd(true);
    try {
      const res = await onProvisionOfficer({
        fullName: fullName.trim(),
        email: email.trim(),
        cnic: cnic.trim(),
        phoneNumber: phone.trim(),
      });
      setProvisionResult(res);
      setFullName('');
      setEmail('');
      setCnic('');
      setPhone('');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleIssueWarningSubmit = async () => {
    if (!activeOfficer || !warningReason.trim()) return;
    setIsSubmittingWarning(true);
    try {
      await onIssueWarning(activeOfficer.user_id, warningReason.trim());
      setIsWarningOpen(false);
      setWarningReason('');
    } finally {
      setIsSubmittingWarning(false);
    }
  };

  const handleConfirmSuspension = async () => {
    if (!activeOfficer) return;
    setIsSubmittingSuspension(true);
    try {
      await onToggleSuspension(
        activeOfficer.user_id,
        activeOfficer.membership_status || 'active',
        activeOfficer.membership_status === 'suspended' ? undefined : 'Supervisory administrative suspension'
      );
      setIsSuspendConfirmOpen(false);
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleExecuteExtendDeadline = async () => {
    if (!extendingOrderId || !onExtendDeadline) return;
    setIsSubmittingExtension(true);
    try {
      await onExtendDeadline(extendingOrderId, extendHours);
      setExtendingOrderId(null);
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  const calculateRating = (off: DepartmentOfficer) => {
    if (!off.verified_cases || off.verified_cases === 0) return 'Unrated';
    const score = Math.max(1, Math.min(5, 3.5 + off.verified_cases * 0.1 - off.overdue_cases * 0.2));
    return score.toFixed(1);
  };

  return (
    <div data-testid="v19-hod-officers" className="v20-officers-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* =========================================================================
          VIEW 1: DEDICATED FULL-WIDTH OFFICER DETAIL (When selectedOfficerId !== null)
          ========================================================================= */}
      {activeOfficer ? (
        <div className="v20-officer-detail-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* Back Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="v20-landing-btn v20-landing-btn-secondary"
              onClick={() => setSelectedOfficerId(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
              data-testid="v20-officer-back-btn"
            >
              <ArrowLeft size={16} />
              <span>Back to officers</span>
            </button>

            <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
              Officer Personnel File · {departmentCode}
            </span>
          </div>

          {/* Full-width Identity Header Card */}
          <div
            className="v19-glass-card"
            style={{
              padding: '32px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                {/* Large 80px Avatar with Initials */}
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '2px solid rgba(255, 255, 255, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--v20-text-primary, #F0ECE3)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  {activeOfficer.display_name[0]?.toUpperCase() || 'O'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0, letterSpacing: '-0.02em' }}>
                      {activeOfficer.display_name}
                    </h2>

                    {/* Account Status Badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: activeOfficer.membership_status === 'suspended' ? 'rgba(229, 57, 53, 0.18)' : 'rgba(67, 160, 71, 0.18)',
                        color: activeOfficer.membership_status === 'suspended' ? '#EF5350' : '#66BB6A',
                        border: activeOfficer.membership_status === 'suspended' ? '1px solid rgba(229,57,53,0.35)' : '1px solid rgba(67,160,71,0.35)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {activeOfficer.membership_status === 'suspended' ? 'Suspended' : 'Active Account'}
                    </span>

                    {/* Online Presence Indicator */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: activeOfficer.membership_status === 'suspended' ? 'rgba(255,255,255,0.04)' : 'rgba(59, 201, 119, 0.12)',
                        color: activeOfficer.membership_status === 'suspended' ? 'var(--v20-text-muted)' : '#3BC977',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: activeOfficer.membership_status === 'suspended' ? '#888' : '#3BC977',
                        }}
                      />
                      <span>{activeOfficer.membership_status === 'suspended' ? 'Offline' : 'Online · Operational'}</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', color: 'var(--v20-text-secondary)', fontSize: '13px' }}>
                    <span style={{ fontFamily: 'var(--v20-font-display, sans-serif)' }}>
                      Officer ID: <strong style={{ color: 'var(--v20-text-primary)' }}>{activeOfficer.employee_id || activeOfficer.staff_username || 'OFFICER'}</strong>
                    </span>
                    <span>·</span>
                    <span>Department: <strong style={{ color: 'var(--v20-text-primary)' }}>{departmentCode} Field Operations</strong></span>
                    <span>·</span>
                    <span>Active Since: Nov 2026</span>
                  </div>
                </div>
              </div>

              {/* Administrative Actions Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="v19-nav-tab"
                  style={{
                    color: '#F59E0B',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsWarningOpen(true)}
                >
                  Issue Formal Warning
                </button>

                <button
                  type="button"
                  className="v19-nav-tab"
                  style={{
                    color: activeOfficer.membership_status === 'suspended' ? '#66BB6A' : '#EF5350',
                    background: activeOfficer.membership_status === 'suspended' ? 'rgba(67, 160, 71, 0.14)' : 'rgba(229, 57, 53, 0.14)',
                    border: activeOfficer.membership_status === 'suspended' ? '1px solid rgba(67, 160, 71, 0.35)' : '1px solid rgba(229, 57, 53, 0.35)',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsSuspendConfirmOpen(true)}
                >
                  {activeOfficer.membership_status === 'suspended' ? 'Reactivate Officer' : 'Suspend Officer'}
                </button>
              </div>
            </div>

            {/* Standalone Performance Metrics Bar (No Nested Cards!) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                background: 'rgba(0, 0, 0, 0.22)',
                borderRadius: '18px',
                padding: '20px 24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Performance Rating
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '4px' }}>
                  {calculateRating(activeOfficer)}
                  <span style={{ fontSize: '13px', color: 'var(--v20-text-muted)', fontWeight: 400 }}> / 5.0</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Active Assigned Cases
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '4px' }}>
                  {activeOfficer.active_cases}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Resolved &amp; Verified
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#43A047', marginTop: '4px' }}>
                  {activeOfficer.verified_cases}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Overdue Violations
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: activeOfficer.overdue_cases > 0 ? '#F59E0B' : 'var(--v20-text-muted)', marginTop: '4px' }}>
                  {activeOfficer.overdue_cases}
                </div>
              </div>
            </div>
          </div>

          {/* Operational Tabs (Active Tasks, Work History, Supervisory Notices) */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
            <button
              type="button"
              className={`v19-nav-tab ${detailTab === 'active' ? 'is-active' : ''}`}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                borderRadius: '9999px',
                background: detailTab === 'active' ? 'var(--button-primary, #F0ECE3)' : 'transparent',
                color: detailTab === 'active' ? '#101216' : 'var(--v20-text-secondary)',
                fontWeight: detailTab === 'active' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setDetailTab('active')}
            >
              Active Tasks ({activeOrders.length})
            </button>

            <button
              type="button"
              className={`v19-nav-tab ${detailTab === 'history' ? 'is-active' : ''}`}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                borderRadius: '9999px',
                background: detailTab === 'history' ? 'var(--button-primary, #F0ECE3)' : 'transparent',
                color: detailTab === 'history' ? '#101216' : 'var(--v20-text-secondary)',
                fontWeight: detailTab === 'history' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setDetailTab('history')}
            >
              Work History ({completedOrders.length})
            </button>

            <button
              type="button"
              className={`v19-nav-tab ${detailTab === 'notices' ? 'is-active' : ''}`}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                borderRadius: '9999px',
                background: detailTab === 'notices' ? 'var(--button-primary, #F0ECE3)' : 'transparent',
                color: detailTab === 'notices' ? '#101216' : 'var(--v20-text-secondary)',
                fontWeight: detailTab === 'notices' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setDetailTab('notices')}
            >
              Supervisory Notices ({activeOfficer.overdue_cases > 0 ? 1 : 0})
            </button>
          </div>

          {/* Tab 1: Active Tasks */}
          {detailTab === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeOrders.length === 0 ? (
                <div className="v19-glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
                  <CheckCircle2 size={32} style={{ color: '#43A047', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No active field tasks currently assigned to this officer.</p>
                </div>
              ) : (
                activeOrders.map((o) => (
                  <div
                    key={o.id}
                    className="v19-glass-card"
                    style={{
                      padding: '20px 24px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15.5px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                        {o.case_label}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
                        Status: <strong style={{ textTransform: 'capitalize', color: 'var(--v20-text-primary)' }}>{o.status.replace('_', ' ')}</strong> · Due:{' '}
                        {new Date(o.due_at).toLocaleDateString()} at{' '}
                        {new Date(o.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} PKT
                      </div>
                      {o.instructions && (
                        <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '4px' }}>
                          Instructions: {o.instructions}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        className="v19-nav-tab"
                        style={{
                          padding: '7px 16px',
                          fontSize: '12px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setExtendingOrderId(o.id);
                          setExtendHours(24);
                        }}
                      >
                        Extend ↗
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Work History */}
          {detailTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedOrders.length === 0 ? (
                <div className="v19-glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
                  <Clock size={32} style={{ color: 'var(--v20-text-muted)', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No completed field orders recorded yet for this officer.</p>
                </div>
              ) : (
                completedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="v19-glass-card"
                    style={{
                      padding: '20px 24px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15.5px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                        {o.case_label}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', marginTop: '4px' }}>
                        Completed &amp; Supervisor-Verified · Started:{' '}
                        {o.started_at ? new Date(o.started_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(67, 160, 71, 0.16)',
                        color: '#66BB6A',
                        border: '1px solid rgba(67,160,71,0.3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Verified Resolution ✓
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Supervisory Notices */}
          {detailTab === 'notices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeOfficer.overdue_cases > 0 ? (
                <div
                  className="v19-glass-card"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '20px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    background: 'rgba(245, 158, 11, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: '14.5px', fontWeight: 650, color: '#F59E0B' }}>
                      Operational Delay Advisory Notice
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--v20-text-primary)', margin: '8px 0 4px' }}>
                    Officer has {activeOfficer.overdue_cases} field tasks currently exceeding official commencement or completion thresholds.
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>
                    Transmitted automatically by HOD Fieldwork Monitoring Engine
                  </span>
                </div>
              ) : (
                <div className="v19-glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
                  <ShieldAlert size={32} style={{ color: '#43A047', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No disciplinary warnings or formal notices issued.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           VIEW 2: RESPONSIVE OFFICER DIRECTORY GRID (When selectedOfficerId === null)
           ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Officers
              </h2>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 650,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--v20-text-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                {filteredOfficers.length} personnel
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search input by Name or ID */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '14px', color: 'var(--v20-text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search officer name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '9px 16px 9px 36px',
                    borderRadius: '9999px',
                    background: 'rgba(18, 15, 12, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--v20-text-primary, #F0ECE3)',
                    fontSize: '13px',
                    outline: 'none',
                    width: '230px',
                  }}
                  data-testid="v20-officer-search-input"
                />
              </div>

              {/* Add New Officer CTA */}
              <button
                type="button"
                className="v20-landing-btn v20-landing-btn-primary"
                style={{
                  padding: '9px 20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setProvisionResult(null);
                  setIsAddOpen(true);
                }}
              >
                <UserPlus size={15} />
                <span>Add New Officer</span>
              </button>
            </div>
          </div>

          {/* 3-Column Responsive Officers Grid (cards 300-360px wide, 260-300px min-height) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              width: '100%',
            }}
          >
            {filteredOfficers.length === 0 ? (
              <div
                className="v19-glass-card"
                style={{
                  gridColumn: '1 / -1',
                  padding: '56px',
                  textAlign: 'center',
                  borderRadius: '26px',
                  color: 'var(--v20-text-muted)',
                }}
              >
                <Search size={32} style={{ margin: '0 auto 12px', color: 'var(--v20-text-muted)' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No officers matched your search criteria.</p>
              </div>
            ) : (
              filteredOfficers.map((off) => {
                const isSuspended = off.membership_status === 'suspended';
                const rating = calculateRating(off);

                return (
                  <div
                    key={off.user_id}
                    className="v19-glass-card v20-officer-card"
                    onClick={() => setSelectedOfficerId(off.user_id)}
                    style={{
                      padding: '26px',
                      borderRadius: '26px',
                      background: 'rgba(18, 15, 12, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      minHeight: '270px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    data-testid={`v20-officer-card-${off.user_id}`}
                  >
                    {/* Top Identity Block */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* 68px Circular Photo/Initials Avatar */}
                        <div
                          style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1.5px solid rgba(255, 255, 255, 0.14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26px',
                            fontWeight: 700,
                            color: 'var(--v20-text-primary, #F0ECE3)',
                            flexShrink: 0,
                          }}
                        >
                          {off.display_name[0]?.toUpperCase() || 'O'}
                        </div>

                        <div>
                          <div style={{ fontSize: '17px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)', lineHeight: 1.25 }}>
                            {off.display_name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '4px', fontFamily: 'var(--v20-font-display, sans-serif)' }}>
                            ID: {off.employee_id || off.staff_username || 'OFFICER'}
                          </div>
                        </div>
                      </div>

                      {/* Presence / Status Badge */}
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: isSuspended ? 'rgba(229, 57, 53, 0.16)' : 'rgba(67, 160, 71, 0.16)',
                          color: isSuspended ? '#EF5350' : '#66BB6A',
                          border: isSuspended ? '1px solid rgba(229,57,53,0.35)' : '1px solid rgba(67,160,71,0.35)',
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{isSuspended ? '✕' : '●'}</span>
                        <span>{isSuspended ? 'Suspended' : 'Online'}</span>
                      </span>
                    </div>

                    {/* Standalone Metrics Row (Assigned, Resolved, Overdue) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.22)',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Assigned</div>
                        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '2px' }}>
                          {off.active_cases}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Resolved</div>
                        <div style={{ fontSize: '17px', fontWeight: 700, color: '#43A047', marginTop: '2px' }}>
                          {off.verified_cases}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Overdue</div>
                        <div style={{ fontSize: '17px', fontWeight: 700, color: off.overdue_cases > 0 ? '#F59E0B' : 'var(--v20-text-muted)', marginTop: '2px' }}>
                          {off.overdue_cases}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Rating & View Profile Action */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={13} style={{ color: rating !== 'Unrated' ? '#DFA51D' : 'var(--v20-text-muted)' }} />
                        <span>Rating: <strong>{rating}</strong></span>
                      </div>

                      <button
                        type="button"
                        className="v19-nav-tab"
                        style={{
                          fontSize: '12px',
                          fontWeight: 650,
                          padding: '5px 14px',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--v20-text-primary, #F0ECE3)',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOfficerId(off.user_id);
                        }}
                      >
                        View profile ↗
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD NEW OFFICER (PROVISIONING DIALOG)
          ========================================================================= */}
      {isAddOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-label="Add new officer" aria-modal="true" onClick={() => !isSubmittingAdd && setIsAddOpen(false)}>
          <div
            className="v19-glass-card"
            style={{ width: '100%', maxWidth: '460px', padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={18} style={{ color: 'var(--v20-text-primary, #F0ECE3)' }} />
                <span style={{ fontSize: '18px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                  Add New Field Officer
                </span>
              </div>
              <button
                type="button"
                className="v19-action-icon-btn"
                style={{ width: '28px', height: '28px', cursor: 'pointer' }}
                onClick={() => setIsAddOpen(false)}
                aria-label="Close add officer dialog"
              >
                <X size={14} />
              </button>
            </div>

            {!provisionResult ? (
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="hod-add-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    id="hod-add-name"
                    type="text"
                    required
                    placeholder="e.g. Tariq Mehmood"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--v20-text-primary, #F0ECE3)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="hod-add-email" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)', marginBottom: '6px' }}>
                    Official Email *
                  </label>
                  <input
                    id="hod-add-email"
                    type="email"
                    required
                    placeholder="e.g. officer@kmc.gos.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--v20-text-primary, #F0ECE3)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="hod-add-cnic" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)', marginBottom: '6px' }}>
                    CNIC *
                  </label>
                  <input
                    id="hod-add-cnic"
                    type="text"
                    required
                    placeholder="42101-XXXXXXX-X"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--v20-text-primary, #F0ECE3)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="hod-add-phone" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)', marginBottom: '6px' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    id="hod-add-phone"
                    type="tel"
                    placeholder="0300-XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--v20-text-primary, #F0ECE3)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="v19-nav-tab"
                    onClick={() => setIsAddOpen(false)}
                    style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="v20-landing-btn v20-landing-btn-primary"
                    disabled={isSubmittingAdd}
                    style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {isSubmittingAdd ? 'Provisioning...' : 'Generate Credentials'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3BC977' }}>
                  <CheckCircle2 size={24} />
                  <span style={{ fontSize: '15px', fontWeight: 650 }}>Temporary Credentials Generated</span>
                </div>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--v20-text-muted)' }}>Staff Username: </span>
                    <strong style={{ color: 'var(--v20-text-primary)' }}>{provisionResult.staffUsername}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--v20-text-muted)' }}>Employee ID: </span>
                    <strong style={{ color: 'var(--v20-text-primary)' }}>{provisionResult.employeeId}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--v20-text-muted)' }}>Temporary Passkey: </span>
                    <strong style={{ color: '#F59E0B', fontFamily: 'var(--v20-font-display, monospace)', fontSize: '14px' }}>
                      {provisionResult.temporaryAccessKey}
                    </strong>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--v20-text-muted)', margin: 0 }}>
                  Deliver these temporary credentials securely to the officer. The officer will be required to configure their personal password on initial sign-in.
                </p>

                <button
                  type="button"
                  className="v20-landing-btn v20-landing-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => setIsAddOpen(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ISSUE FORMAL WARNING
          ========================================================================= */}
      {isWarningOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Issue Formal Warning" onClick={() => !isSubmittingWarning && setIsWarningOpen(false)}>
          <div
            className="v19-glass-card"
            style={{ width: '100%', maxWidth: '440px', padding: '26px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: '16.5px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                  Issue Formal Notice to Officer
                </span>
              </div>
              <button
                type="button"
                className="v19-action-icon-btn"
                style={{ width: '28px', height: '28px', cursor: 'pointer' }}
                onClick={() => setIsWarningOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', margin: 0 }}>
              This operational warning will be logged to officer {activeOfficer?.display_name}'s permanent personnel scorecard.
            </p>

            <div>
              <label htmlFor="warning-reason-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)', marginBottom: '6px' }}>
                Operational Reason *
              </label>
              <textarea
                id="warning-reason-input"
                rows={3}
                placeholder="Specify the operational reason for this formal warning..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--v20-text-primary, #F0ECE3)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="v19-nav-tab"
                onClick={() => setIsWarningOpen(false)}
                style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v20-landing-btn v20-landing-btn-primary"
                disabled={isSubmittingWarning || !warningReason.trim()}
                style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
                onClick={handleIssueWarningSubmit}
              >
                {isSubmittingWarning ? 'Transmitting...' : 'Issue Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SUSPEND / REACTIVATE CONFIRMATION
          ========================================================================= */}
      {isSuspendConfirmOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Confirm Suspension Status" onClick={() => !isSubmittingSuspension && setIsSuspendConfirmOpen(false)}>
          <div
            className="v19-glass-card"
            style={{ width: '100%', maxWidth: '420px', padding: '26px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} style={{ color: activeOfficer?.membership_status === 'suspended' ? '#66BB6A' : '#EF5350' }} />
              <span style={{ fontSize: '17px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                {activeOfficer?.membership_status === 'suspended' ? 'Reactivate Officer Access' : 'Confirm Suspension'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {activeOfficer?.membership_status === 'suspended'
                ? `Restore operational field access for officer ${activeOfficer?.display_name}? The officer will be able to receive and execute departmental tasks.`
                : `Suspend field officer ${activeOfficer?.display_name}? The officer will be blocked from logging into fieldwork tools until reactivated.`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="v19-nav-tab"
                onClick={() => setIsSuspendConfirmOpen(false)}
                style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v20-landing-btn v20-landing-btn-primary"
                disabled={isSubmittingSuspension}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  background: activeOfficer?.membership_status === 'suspended' ? '#43A047' : '#EF5350',
                  color: '#FFF',
                  cursor: 'pointer',
                }}
                onClick={handleConfirmSuspension}
              >
                {isSubmittingSuspension
                  ? 'Processing...'
                  : activeOfficer?.membership_status === 'suspended'
                  ? 'Confirm Reactivation'
                  : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: EXTEND DEADLINE ON ACTIVE TASK
          ========================================================================= */}
      {extendingOrderId && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Extend Task Deadline" onClick={() => !isSubmittingExtension && setExtendingOrderId(null)}>
          <div
            className="v19-glass-card"
            style={{ width: '100%', maxWidth: '420px', padding: '26px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} style={{ color: '#29B6F6' }} />
              <span style={{ fontSize: '17px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Extend Field Task Deadline
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: 0 }}>
              Select additional operational hours to grant officer {activeOfficer?.display_name}:
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              {[12, 24, 48].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  className={`v19-nav-tab ${extendHours === hrs ? 'is-active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: extendHours === hrs ? 700 : 500,
                    background: extendHours === hrs ? 'var(--button-primary, #F0ECE3)' : 'rgba(255,255,255,0.06)',
                    color: extendHours === hrs ? '#101216' : 'var(--v20-text-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExtendHours(hrs)}
                >
                  +{hrs}h
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="v19-nav-tab"
                onClick={() => setExtendingOrderId(null)}
                style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v20-landing-btn v20-landing-btn-primary"
                disabled={isSubmittingExtension}
                style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
                onClick={handleExecuteExtendDeadline}
              >
                {isSubmittingExtension ? 'Extending...' : 'Authorize Extension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
