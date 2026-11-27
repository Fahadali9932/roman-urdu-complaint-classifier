import React from 'react';
import { Monitor, Smartphone, ArrowRight } from 'lucide-react';

export interface OfficerMobileGateProps {
  activeTab: string;
  onNavigateToWork: () => void;
  children: React.ReactNode;
}

/**
 * V19 Officer Mobile Access Boundary
 * Policy Enforcement:
 * - On mobile viewports (< 768px), ONLY the Work tab, authentication, and essential session controls are operational.
 * - Non-fieldwork administrative tabs (Home, Complaints, Performance, Notifications) display this
 *   informative Apple-styled desktop restriction gate.
 */
export const OfficerMobileGate: React.FC<OfficerMobileGateProps> = ({
  activeTab,
  onNavigateToWork,
  children,
}) => {
  // Allow Work tab and profile controls without gating
  if (activeTab === 'work' || activeTab === 'profile') {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop rendering: children are shown normally */}
      <div className="v19-desktop-only-content">
        {children}
      </div>

      {/* Mobile rendering: boundary gate when on non-work tabs */}
      <div className="v19-mobile-restricted-gate" data-testid="v19-mobile-restriction-gate">
        <div
          className="v19-glass-card"
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '440px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--v19-amber-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v19-amber)',
            }}
          >
            <Monitor size={30} />
          </div>

          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--v19-amber)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Fieldwork Operating Restriction
            </span>
            <h3
              style={{
                fontSize: '19px',
                fontWeight: 600,
                color: 'var(--v19-text-primary)',
                margin: '6px 0 8px',
                letterSpacing: '-0.015em',
              }}
            >
              Desktop Workstation Required
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--v19-text-secondary)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Analytical dashboards, roster reviews, and detailed administrative queues require a desktop browser. On mobile devices, field personnel are authorized exclusively to operate the active <strong>Work</strong> console.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--v19-text-muted)',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'var(--v19-glass-subtle)',
            }}
          >
            <Smartphone size={14} />
            <span>Active Field Mode · Mobile Authorized</span>
          </div>

          <button
            type="button"
            className="v19-nav-tab"
            style={{
              background: 'var(--v20-accent, #DFA51D)',
              color: '#0E121A',
              fontWeight: 600,
              padding: '10px 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              borderRadius: '24px',
              boxShadow: '0 2px 14px var(--v20-accent-soft, rgba(223, 165, 29, 0.25))',
            }}
            onClick={onNavigateToWork}
          >
            <span>Switch to Active Work Tab</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
};
