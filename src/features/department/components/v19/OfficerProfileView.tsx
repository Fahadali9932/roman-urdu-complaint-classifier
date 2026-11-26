import React from 'react';
import { KeyRound, LogOut, Building2, Smartphone } from 'lucide-react';

export interface OfficerProfileViewProps {
  departmentCode: string;
  departmentName: string;
  officerName: string;
  employeeId?: string;
  staffUsername: string;
  onSignOut: () => void;
  onOpenPasswordModal?: () => void;
}

export const OfficerProfileView: React.FC<OfficerProfileViewProps> = ({
  departmentCode,
  departmentName,
  officerName,
  employeeId,
  staffUsername,
  onSignOut,
  onOpenPasswordModal,
}) => {
  return (
    <div data-testid="v19-officer-profile" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Officer Identity Card */}
      <div className="v19-glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '28px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--v19-lime-soft)',
            border: '2px solid var(--v19-lime)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--v19-lime)',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          {officerName[0]?.toUpperCase() || 'O'}
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v19-text-primary)', margin: 0 }}>
            {officerName}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--v19-text-muted)', marginTop: '4px' }}>
            Field Officer · {departmentName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--v19-lime)', marginTop: '2px', fontFamily: 'var(--v19-font-mono)' }}>
            USER: {staffUsername} · {employeeId ? `ID: ${employeeId}` : ''} · DEPT: {departmentCode}
          </div>
        </div>
      </div>

      {/* Security & Operational Controls */}
      <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
          Credentials &amp; Jurisdiction
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v19-glass-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <KeyRound size={18} style={{ color: 'var(--v19-cyan)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>Officer Passphrase</div>
              <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)' }}>Update individual operational access credentials</div>
            </div>
          </div>
          {onOpenPasswordModal && (
            <button type="button" className="v19-nav-tab" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={onOpenPasswordModal}>
              Change ↗
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v19-glass-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building2 size={18} style={{ color: 'var(--v19-lime)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>Assigned Department</div>
              <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)' }}>{departmentName} ({departmentCode})</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--v19-glass-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Smartphone size={18} style={{ color: 'var(--v19-blue)' }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>Mobile Field Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)' }}>Work console, camera capture, and 30m GPS authorized</div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--v19-glass-border)' }}>
          <button
            type="button"
            className="v19-nav-tab"
            style={{ color: 'var(--v19-red)', background: 'var(--v19-red-soft)', width: '100%', justifyContent: 'center', padding: '10px' }}
            onClick={onSignOut}
          >
            <LogOut size={16} style={{ marginRight: '6px' }} />
            <span>Sign Out of Fieldwork Desk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
