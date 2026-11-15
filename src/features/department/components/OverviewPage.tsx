import React, { useEffect, useState } from 'react';
import type { DepartmentId, IncidentCaseSummary, AreaWorkloadSummary } from '../../../types';
import type { WorkspaceSection } from './DepartmentSidebar';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

interface OverviewPageProps {
  departmentId: DepartmentId;
  departmentName: string;
  onNavigate: (section: WorkspaceSection) => void;
  onSelectCase: (caseId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  departmentId,
  departmentName,
  onNavigate,
  onSelectCase,
}) => {
  const [summary, setSummary] = useState<{
    needsAcceptanceCount: number;
    inProgressCount: number;
    completedCount: number;
    totalActiveCases: number;
  }>({
    needsAcceptanceCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    totalActiveCases: 0,
  });
  const [nextUpCases, setNextUpCases] = useState<IncidentCaseSummary[]>([]);
  const [topAreas, setTopAreas] = useState<AreaWorkloadSummary[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      caseOperationsService.getDepartmentWorkSummary(departmentId),
      caseOperationsService.listDepartmentCases(departmentId, {
        displayMode: 'cases',
        savedView: 'all',
        sort: 'attention',
        searchQuery: '',
        area: 'All areas',
        issueType: 'All issues',
        page: 0,
        pageSize: 5,
      }),
      caseOperationsService.listAreaWorkload(departmentId),
    ])
      .then(([workSummary, casesPage, areas]) => {
        if (!active) return;
        setSummary({
          needsAcceptanceCount: workSummary.awaitingAcceptance,
          inProgressCount: Math.max(0, workSummary.totalCases - workSummary.awaitingAcceptance),
          completedCount: Math.max(0, workSummary.totalReports - workSummary.awaitingAcceptance),
          totalActiveCases: workSummary.totalCases,
        });
        setNextUpCases(casesPage.items.slice(0, 4));
        setTopAreas(areas.slice(0, 4));
      })
      .catch((err) => {
        console.warn('Overview data loading failed:', err);
      });

    return () => {
      active = false;
    };
  }, [departmentId]);

  // Time-aware greeting for Pakistan Standard Time
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="overview-page">
      {/* 1. Hero Section with Headline & Animated Motion Frame */}
      <section
        className="overview-hero"
        aria-labelledby="overview-headline"
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-muted, #708996)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {getTimeGreeting()} · {departmentName}
          </div>
          <h1
            id="overview-headline"
            style={{
              fontSize: 'clamp(28px, 2.5vw, 42px)',
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              margin: '16px 0 12px',
              fontWeight: 800,
              color: 'var(--text-primary, #141414)',
            }}
          >
            A clearer view of <span style={{ color: 'var(--primary, #681822)' }}>what matters next.</span>
          </h1>
          <p
            style={{
              fontSize: '15px',
              maxWidth: '440px',
              lineHeight: 1.6,
              color: 'var(--text-muted, #625D58)',
              margin: 0,
            }}
          >
            {summary.needsAcceptanceCount > 0
              ? `${summary.needsAcceptanceCount} cases need a reply. Start with the oldest requests, or review areas with high public activity.`
              : 'All pending requests have been acknowledged. Operational queues are up to date.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '26px' }}>
            <button
              type="button"
              onClick={() => onNavigate('queue')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                borderRadius: '9px',
                backgroundColor: 'var(--primary, #681822)',
                fontWeight: 700,
                color: '#FFFFFF',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(104, 24, 34, 0.15)',
              }}
            >
              <span>Open work queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('areas')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                padding: '11px 12px',
                fontWeight: 650,
                color: 'var(--primary, #681822)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>Browse areas</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Animated Civic Service Network Illustration */}
        <div
          className="motion-frame"
          aria-label="Decorative illustration of civic service routes and public issue markers."
          style={{
            position: 'relative',
            height: '280px',
            border: '1px solid var(--border-subtle, #DDE4E8)',
            borderRadius: '18px',
            overflow: 'hidden',
            backgroundColor: '#F4F7F9',
            boxShadow: '0 8px 24px rgba(20, 20, 20, 0.03)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              zIndex: 2,
              top: '18px',
              left: '20px',
              color: '#526F7D',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            Civic Response Network <small style={{ fontSize: '10px', color: '#7D939E', marginLeft: '6px' }}>MUNICIPAL</small>
          </div>

          <svg
            viewBox="0 0 465 280"
            role="img"
            aria-label="Abstract roads connected to service response nodes"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* Background block shapes */}
            <rect x="32" y="85" width="91" height="52" rx="12" fill="#E2EDEF" stroke="#D5E5E8" strokeWidth="1.5" />
            <rect x="218" y="52" width="107" height="56" rx="12" fill="#E2EDEF" stroke="#D5E5E8" strokeWidth="1.5" />
            <rect x="348" y="145" width="77" height="60" rx="12" fill="#E2EDEF" stroke="#D5E5E8" strokeWidth="1.5" />
            <rect x="160" y="195" width="95" height="50" rx="12" fill="#E2EDEF" stroke="#D5E5E8" strokeWidth="1.5" />

            {/* Road pathways */}
            <path d="M25 228 C118 198 137 138 196 116 S314 138 422 46" stroke="#FFFFFF" strokeWidth="24" strokeLinecap="round" fill="none" />
            <path d="M25 228 C118 198 137 138 196 116 S314 138 422 46" stroke="#CFDEE3" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" fill="none" />

            <path d="M415 250 C342 192 295 180 257 192 S116 216 73 64" stroke="#FFFFFF" strokeWidth="24" strokeLinecap="round" fill="none" />
            <path d="M415 250 C342 192 295 180 257 192 S116 216 73 64" stroke="#CFDEE3" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" fill="none" />

            {/* Active route line */}
            <path d="M52 228 C130 195 127 125 195 113 S310 140 382 52" stroke="#75B5C2" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 10" opacity="0.9" />

            {/* Issue Node with Pulse */}
            <circle cx="196" cy="116" r="22" fill="#B8DDE3" opacity="0.45" />
            <circle cx="196" cy="116" r="12" fill="#D8F0F3" stroke="#81B7C4" strokeWidth="2" />
            <circle cx="196" cy="116" r="5" fill="#681822" />

            {/* Response Node */}
            <circle cx="342" cy="180" r="24" fill="#C6E5E9" opacity="0.45" />
            <circle cx="342" cy="180" r="12" fill="#FFFFFF" stroke="#78ADBA" strokeWidth="2" />
            <path d="M337 180h10M342 175v10" stroke="#25748A" strokeWidth="2" strokeLinecap="round" />

            <circle cx="83" cy="90" r="7" fill="#FFFFFF" stroke="#7CB9C3" strokeWidth="2" />

            <text x="212" y="112" style={{ font: '600 11px system-ui, sans-serif', fill: '#436B79' }}>
              Citizen report
            </text>
            <text x="358" y="184" style={{ font: '600 11px system-ui, sans-serif', fill: '#436B79' }}>
              Action unit
            </text>
          </svg>
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '12px',
              zIndex: 3,
              color: '#6D8993',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #D7E7EA',
              padding: '2px 7px',
              borderRadius: '5px',
              fontSize: '10px',
            }}
          >
            Karachi municipal network
          </div>
        </div>
      </section>

      {/* 2. Metrics Strip */}
      <section
        className="overview-metrics"
        aria-label="Overview summary metrics"
      >
        <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border-subtle, #E6E3DF)' }}>
          <span style={{ color: 'var(--text-muted, #617987)', fontSize: '13px', fontWeight: 600 }}>
            Waiting for a reply
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '30px',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: summary.needsAcceptanceCount > 0 ? 'var(--primary, #681822)' : 'var(--text-primary, #141414)',
              margin: '2px 0',
            }}
          >
            {summary.needsAcceptanceCount}
          </strong>
          <small style={{ fontSize: '12px', color: 'var(--text-muted, #718692)' }}>Needs acceptance</small>
        </div>

        <div style={{ padding: '0 16px', borderRight: '1px solid var(--border-subtle, #E6E3DF)' }}>
          <span style={{ color: 'var(--text-muted, #617987)', fontSize: '13px', fontWeight: 600 }}>
            Work started
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '30px',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: 'var(--text-primary, #141414)',
              margin: '2px 0',
            }}
          >
            {summary.inProgressCount}
          </strong>
          <small style={{ fontSize: '12px', color: 'var(--text-muted, #718692)' }}>Currently in progress</small>
        </div>

        <div style={{ padding: '0 16px', borderRight: '1px solid var(--border-subtle, #E6E3DF)' }}>
          <span style={{ color: 'var(--text-muted, #617987)', fontSize: '13px', fontWeight: 600 }}>
            Completed cases
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '30px',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: '#15803D',
              margin: '2px 0',
            }}
          >
            {summary.completedCount}
          </strong>
          <small style={{ fontSize: '12px', color: 'var(--text-muted, #718692)' }}>Verified closed</small>
        </div>

        <div style={{ paddingLeft: '16px' }}>
          <span style={{ color: 'var(--text-muted, #617987)', fontSize: '13px', fontWeight: 600 }}>
            Active municipal areas
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '30px',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: 'var(--text-primary, #141414)',
              margin: '2px 0',
            }}
          >
            {topAreas.length}
          </strong>
          <small style={{ fontSize: '12px', color: 'var(--text-muted, #718692)' }}>Karachi sub-districts</small>
        </div>
      </section>

      {/* 3. Lower Grid: Next Up (Cases) + Areas to Check */}
      <section
        className="overview-lower"
      >
        {/* Next Up List */}
        <div>
          <div
            style={{
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <h2 style={{ fontSize: '18px', letterSpacing: '-0.03em', margin: 0, fontWeight: 700 }}>
              Next up
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('queue')}
              style={{
                color: 'var(--primary, #681822)',
                fontSize: '13px',
                fontWeight: 650,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View all cases →
            </button>
          </div>

          <div
            style={{
              border: '1px solid var(--border-subtle, #E6E3DF)',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(20, 20, 20, 0.02)',
            }}
          >
            {nextUpCases.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#88827A', fontSize: '13px' }}>
                No active cases awaiting attention.
              </div>
            ) : (
              nextUpCases.map((c, idx) => {
                const isNeedsAcceptance = c.workStatus === 'needs_acceptance' || c.pendingAcceptanceCount > 0;
                return (
                  <div
                    key={c.id || idx}
                    onClick={() => onSelectCase(c.id)}
                    style={{
                      minHeight: '72px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '14px 18px',
                      borderBottom:
                        idx === nextUpCases.length - 1 ? 'none' : '1px solid var(--border-subtle, #E6E3DF)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF9F7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <strong
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--text-primary, #141414)',
                          marginBottom: '3px',
                        }}
                      >
                        {c.title}
                      </strong>
                      <small style={{ color: 'var(--text-muted, #625D58)', fontSize: '12px' }}>
                        {c.locality} · {c.ageDays === 0 ? 'Reported today' : `Reported ${c.ageDays}d ago`} · {c.linkedReportCount} reports
                      </small>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        backgroundColor: isNeedsAcceptance ? '#FEF3C7' : '#EFF6FF',
                        color: isNeedsAcceptance ? '#92400E' : '#1E40AF',
                        border: isNeedsAcceptance ? '1px solid #FDE68A' : '1px solid #BFDBFE',
                      }}
                    >
                      {isNeedsAcceptance ? 'Needs reply' : 'In progress'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Areas to Check */}
        <div>
          <div
            style={{
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <h2 style={{ fontSize: '18px', letterSpacing: '-0.03em', margin: 0, fontWeight: 700 }}>
              Areas to check
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('areas')}
              style={{
                color: 'var(--primary, #681822)',
                fontSize: '13px',
                fontWeight: 650,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              All areas →
            </button>
          </div>

          <div
            style={{
              border: '1px solid var(--border-subtle, #E6E3DF)',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '6px 18px',
              boxShadow: '0 4px 16px rgba(20, 20, 20, 0.02)',
            }}
          >
            {topAreas.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#88827A', fontSize: '13px' }}>
                No area workload data.
              </div>
            ) : (
              topAreas.map((area, idx) => (
                <div
                  key={area.area || idx}
                  onClick={() => onNavigate('areas')}
                  style={{
                    padding: '14px 2px',
                    borderBottom: idx === topAreas.length - 1 ? 'none' : '1px solid var(--border-subtle, #EAE7E2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <strong style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #141414)' }}>
                      {area.area}
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #718692)', marginTop: '2px' }}>
                      {area.topIssues?.slice(0, 1).join(', ') || 'Road maintenance'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: area.activeCasesCount > 0 ? 'var(--primary, #681822)' : '#625D58',
                    }}
                  >
                    {area.activeCasesCount} open {area.activeCasesCount === 1 ? 'case' : 'cases'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
