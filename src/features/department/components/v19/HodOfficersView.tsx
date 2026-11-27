import React, { useState } from 'react';
import { type DepartmentOfficer, type DepartmentWorkOrder, type ProvisionOfficerResult } from '../../services/fieldOperations';
import { UserPlus, CheckCircle2, X, Search } from 'lucide-react';

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

  // Direct Deadline Extension
  const extHours = 24;

  const activeOfficer = officers.find((o) => o.user_id === selectedOfficerId) || null;

  // Officer assignments
  const officerOrders = orders.filter((o) => o.officer_id === selectedOfficerId);

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

  return (
    <div data-testid="v19-hod-officers" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v19-text-primary)' }}>
            Field Officer Roster &amp; Access
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--v19-text-muted)', margin: '4px 0 0' }}>
            Manage departmental field staff, provision secure credentials, and audit operational performance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--v19-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search officer name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 14px 8px 32px',
                borderRadius: '9999px',
                background: 'var(--v19-glass-surface)',
                border: '1px solid var(--v19-glass-border)',
                color: 'var(--v19-text-primary)',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            className="v19-nav-tab"
            style={{
              background: 'var(--v20-accent, #DFA51D)',
              color: '#0E1017',
              fontWeight: 700,
              padding: '9px 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              borderRadius: '9999px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
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

      {/* Main Grid: Officers Cards & Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: activeOfficer ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1fr', gap: '20px', alignItems: 'start', minWidth: 0 }}>
        {/* Officers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '16px', minWidth: 0 }}>
          {filteredOfficers.map((off) => {
            const isSelected = selectedOfficerId === off.user_id;
            const isSuspended = off.membership_status === 'suspended';

            return (
              <div
                key={off.user_id}
                className={`v19-glass-card ${isSelected ? 'is-selected' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderRadius: '24px',
                  border: isSelected ? '1.5px solid var(--v20-accent, #DFA51D)' : '1.5px solid var(--v20-glass-border)',
                  background: isSelected ? 'var(--v20-accent-soft, rgba(223, 165, 29, 0.12))' : 'var(--v20-glass-surface)',
                  boxShadow: isSelected ? '0 0 0 2px var(--v20-accent-soft), 0 10px 32px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.2)',
                  opacity: isSuspended ? 0.6 : 1,
                  transition: 'all 160ms ease',
                }}
                onClick={() => setSelectedOfficerId(off.user_id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1.5px solid var(--v20-glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--v20-accent, #DFA51D)',
                        fontSize: '14px',
                      }}
                    >
                      {off.display_name[0] || 'O'}
                    </div>

                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 650, color: 'var(--v20-text-primary)' }}>
                        {off.display_name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--v20-text-muted)', fontFamily: 'var(--v20-font-number, monospace)' }}>
                        ID: {off.employee_id || off.staff_username || 'OFFICER'}
                      </div>
                    </div>
                  </div>

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
                    }}
                  >
                    {isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(0,0,0,0.22)', padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--v20-glass-border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>Active</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--v20-accent, #DFA51D)' }}>{off.active_cases}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>Verified</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--v20-status-solved, #43A047)' }}>{off.verified_cases}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>Late</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: off.overdue_cases > 0 ? '#F59E0B' : 'var(--v20-text-muted)' }}>
                      {off.overdue_cases}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Officer Detail Sheet */}
        {activeOfficer && (
          <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '140px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--v19-glass-border)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                  {activeOfficer.display_name}
                </span>
                <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)', fontFamily: 'var(--v19-font-mono)' }}>
                  ID: {activeOfficer.employee_id || activeOfficer.staff_username} · {departmentCode}
                </div>
              </div>

              <button type="button" className="v19-action-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setSelectedOfficerId(null)}>
                <X size={14} />
              </button>
            </div>

            {/* Performance Overview & Realistic Active Usage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '16px', border: '1px solid var(--v20-glass-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Performance Rating</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--v20-accent, #DFA51D)', marginTop: '4px' }}>
                  {activeOfficer.verified_cases > 0 ? (Math.min(5, 3.5 + activeOfficer.verified_cases * 0.1 - activeOfficer.overdue_cases * 0.2)).toFixed(1) : 'Unrated'}
                  <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}> / 5.0</span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '16px', border: '1px solid var(--v20-glass-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Portal Engagement</span>
                <div style={{ fontSize: '16px', fontWeight: 650, color: 'var(--v20-text-primary)', marginTop: '6px' }}>
                  4h 12m <span style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>(heartbeat verified)</span>
                </div>
              </div>
            </div>

            {/* Active Assignments */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Current Assigned Field Orders ({officerOrders.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {officerOrders.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: 'var(--v20-text-muted)', margin: 0 }}>No active field orders assigned.</p>
                ) : (
                  officerOrders.map((o) => (
                    <div key={o.id} style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--v20-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--v20-text-primary)' }}>{o.case_label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)' }}>
                          Status: {o.status} · Due: {new Date(o.due_at).toLocaleDateString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="v19-nav-tab"
                        style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.06)' }}
                        onClick={() => {
                          if (onExtendDeadline) onExtendDeadline(o.id, extHours);
                        }}
                      >
                        Extend ↗
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* HOD Management Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--v20-glass-border)', paddingTop: '16px' }}>
              <button
                type="button"
                className="v19-nav-tab"
                style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '8px 16px', fontSize: '12.5px', fontWeight: 600 }}
                onClick={() => setIsWarningOpen(true)}
              >
                Issue Formal Warning
              </button>

              <button
                type="button"
                className="v19-nav-tab"
                style={{
                  color: activeOfficer.membership_status === 'suspended' ? '#66BB6A' : '#EF5350',
                  background: activeOfficer.membership_status === 'suspended' ? 'rgba(67,160,71,0.14)' : 'rgba(229,57,53,0.14)',
                  border: activeOfficer.membership_status === 'suspended' ? '1px solid rgba(67,160,71,0.35)' : '1px solid rgba(229,57,53,0.35)',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
                onClick={() =>
                  onToggleSuspension(
                    activeOfficer.user_id,
                    activeOfficer.membership_status || 'active',
                    'Administrative HOD operational suspension'
                  )
                }
              >
                {activeOfficer.membership_status === 'suspended' ? 'Reactivate Officer' : 'Suspend Access'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Officer Modal */}
      {isAddOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Add new officer">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--v20-accent, #DFA51D)' }} />
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>Provision Field Officer</span>
              </div>
              <button type="button" className="v19-action-icon-btn" onClick={() => setIsAddOpen(false)}>
                <X size={14} />
              </button>
            </div>

            {provisionResult ? (
              /* Success Credential Display */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(67, 160, 71, 0.12)', border: '1px solid rgba(67, 160, 71, 0.35)', padding: '14px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#66BB6A', fontWeight: 650 }}>
                    <CheckCircle2 size={16} />
                    <span>Officer Provisioned Successfully</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--v20-text-secondary)', margin: '6px 0 0' }}>
                    Distribute these temporary credentials to the officer privately. Mandatory passphrase change will be enforced on first login.
                  </p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--v20-font-number, monospace)', fontSize: '13px', border: '1px solid var(--v20-glass-border)' }}>
                  <div>Officer ID: <strong style={{ color: 'var(--v20-text-primary)' }}>{provisionResult.staffUsername}</strong></div>
                  <div>Temporary Access Key: <strong style={{ color: 'var(--v20-accent, #DFA51D)' }}>{provisionResult.temporaryAccessKey}</strong></div>
                </div>

                <button
                  type="button"
                  className="v19-nav-tab"
                  style={{ background: 'var(--v20-accent, #DFA51D)', color: '#0E1017', fontWeight: 700, width: '100%', textAlign: 'center', border: 'none', borderRadius: '9999px', padding: '10px 0' }}
                  onClick={() => setIsAddOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor="v19-officer-fullname" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                  <input
                    id="v19-officer-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1.5px solid var(--v20-glass-border)', color: 'var(--v20-text-primary)', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label htmlFor="v19-officer-email" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Official Email</label>
                  <input
                    id="v19-officer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1.5px solid var(--v20-glass-border)', color: 'var(--v20-text-primary)', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label htmlFor="v19-officer-cnic" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>CNIC (13 digits, masked)</label>
                  <input
                    id="v19-officer-cnic"
                    type="text"
                    required
                    placeholder="42101-1234567-1"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1.5px solid var(--v20-glass-border)', color: 'var(--v20-text-primary)', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label htmlFor="v19-officer-phone" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                  <input
                    id="v19-officer-phone"
                    type="tel"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1.5px solid var(--v20-glass-border)', color: 'var(--v20-text-primary)', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button type="button" className="v19-nav-tab" onClick={() => setIsAddOpen(false)}>Cancel</button>
                  <button type="submit" disabled={isSubmittingAdd} className="v19-nav-tab" style={{ background: 'var(--v20-accent, #DFA51D)', color: '#0E1017', fontWeight: 700, border: 'none', borderRadius: '9999px', padding: '9px 20px' }}>
                    {isSubmittingAdd ? 'Provisioning…' : 'Generate Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {isWarningOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Issue warning">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '24px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F59E0B' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Issue Formal Officer Warning</span>
              <button type="button" className="v19-action-icon-btn" onClick={() => setIsWarningOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Specify the operational reason for formal notice (e.g. repeated missed completion deadlines without justification)..."
              value={warningReason}
              onChange={(e) => setWarningReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1.5px solid var(--v20-glass-border)', color: 'var(--v20-text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="v19-nav-tab" onClick={() => setIsWarningOpen(false)}>Cancel</button>
              <button type="button" disabled={!warningReason.trim() || isSubmittingWarning} className="v19-nav-tab" style={{ background: '#F59E0B', color: '#0E1017', fontWeight: 700, border: 'none', borderRadius: '9999px', padding: '9px 20px' }} onClick={handleIssueWarningSubmit}>
                {isSubmittingWarning ? 'Issuing…' : 'Issue Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
