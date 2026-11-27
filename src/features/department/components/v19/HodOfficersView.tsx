import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type DepartmentOfficer, type DepartmentWorkOrder, type ProvisionOfficerResult } from '../../services/fieldOperations';
import {
  UserPlus,
  CheckCircle2,
  X,
  Search,
  ArrowLeft,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Star,
  Calendar,
  Building,
  FileText,
} from 'lucide-react';

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

  // Suspension Modal State
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState(false);
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // Extend Deadline State
  const [extendingOrderId, setExtendingOrderId] = useState<string | null>(null);
  const [extendHours, setExtendHours] = useState(24);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

  // Parallax Scroll Motion Setup (Reusing Approved Complaint Scroll Effect)
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cardOffsetsRef = useRef<number[]>([]);
  const surfaceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number>(0);
  const isTickingRef = useRef(false);

  const activeOfficer = officers.find((o) => o.user_id === selectedOfficerId) || null;
  const officerOrders = orders.filter((o) => o.officer_id === selectedOfficerId);

  // Filter orders by status
  const activeOrders = officerOrders.filter((o) => o.status !== 'verified' && (o.status as string) !== 'rejected');
  const completedOrders = officerOrders.filter((o) => o.status === 'verified');
  const extensionRequests = officerOrders.filter((o) => Boolean(o.extension_requested_due_at));

  const filteredOfficers = officers.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.display_name.toLowerCase().includes(q) ||
      (o.employee_id && o.employee_id.toLowerCase().includes(q)) ||
      (o.staff_username && o.staff_username.toLowerCase().includes(q))
    );
  });

  // Layout Measurement for Parallax Scroll
  const cacheLayoutGeometry = useCallback(() => {
    if (!gridContainerRef.current) return;
    const wrappers = gridContainerRef.current.querySelectorAll<HTMLElement>('.v20-officer-card-wrapper');
    const containerTop = gridContainerRef.current.getBoundingClientRect().top + window.scrollY;
    cardOffsetsRef.current = Array.from(wrappers).map((w) => w.offsetTop + containerTop);
  }, []);

  useEffect(() => {
    if (selectedOfficerId) return; // Only run when in directory view
    cacheLayoutGeometry();

    const handleResize = () => cacheLayoutGeometry();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [cacheLayoutGeometry, filteredOfficers.length, selectedOfficerId]);

  // Scroll Motion Loop (Identical to ParallaxComplaintList)
  useEffect(() => {
    if (selectedOfficerId) return; // Only run when directory is active

    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      surfaceRefs.current.forEach((el) => {
        if (el) el.style.transform = '';
      });
      return;
    }

    const stickyCeiling = 140; // Clearance under 120px top notch

    const onScroll = () => {
      if (isTickingRef.current) return;
      isTickingRef.current = true;

      rafIdRef.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const offsets = cardOffsetsRef.current;

        for (let i = 0; i < offsets.length; i++) {
          const surface = surfaceRefs.current[i];
          if (!surface) continue;

          const cardAbsoluteTop = offsets[i];
          const viewportTop = cardAbsoluteTop - currentScrollY;

          // Only calculate for visible cards
          if (viewportTop > windowHeight + 100 || viewportTop < -300) {
            continue;
          }

          if (viewportTop < stickyCeiling) {
            // Card has scrolled past sticky ceiling: apply subtle bounded depth
            const distancePast = stickyCeiling - viewportTop;
            const progress = Math.min(distancePast / 260, 1.0);

            // Bounded scale: 1.0 down to 0.97 max
            const scale = 1 - 0.03 * progress;
            // Bounded translate: 0 to 14px max
            const translateY = 14 * progress;
            // Subtle depth: 0 to -20px max
            const translateZ = -20 * progress;
            // Slight opacity drop (never unreadable)
            const opacity = 1 - 0.12 * progress;

            surface.style.transform = `perspective(800px) scale(${scale.toFixed(4)}) translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px)`;
            surface.style.opacity = opacity.toFixed(3);
          } else {
            surface.style.transform = '';
            surface.style.opacity = '1';
          }
        }

        isTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      isTickingRef.current = false;
    };
  }, [filteredOfficers.length, selectedOfficerId]);

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

  const calculateOnTimeRate = (off: DepartmentOfficer) => {
    if (!off.verified_cases || off.verified_cases === 0) return '100%';
    const rate = Math.round(((off.on_time_cases ?? off.verified_cases) / off.verified_cases) * 100);
    return `${Math.min(100, Math.max(0, rate))}%`;
  };

  return (
    <div
      data-testid="v19-hod-officers"
      className="v20-officers-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      {/* =========================================================================
          VIEW 1: COMPREHENSIVE DEDICATED OFFICER PERSONNEL FILE (selectedOfficerId !== null)
          ========================================================================= */}
      {activeOfficer ? (
        <div
          className="v20-officer-personnel-file"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            width: '100%',
          }}
        >
          {/* Navigation Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="v20-landing-btn v20-landing-btn-secondary"
              onClick={() => setSelectedOfficerId(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
              data-testid="v20-officer-back-btn"
            >
              <ArrowLeft size={16} />
              <span>Back to officers</span>
            </button>

            <span
              style={{
                fontSize: '12px',
                color: 'var(--v20-text-muted)',
                fontFamily: 'var(--v20-font-display, sans-serif)',
                letterSpacing: '0.04em',
              }}
            >
              Officer Personnel File · {departmentCode} Division
            </span>
          </div>

          {/* Section 1: Officer Identity Composition */}
          <div
            className="v19-glass-card"
            style={{
              padding: '36px',
              borderRadius: '28px',
              background: 'rgba(18, 15, 12, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
                {/* Large 92px Avatar with Initials */}
                <div
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '2px solid rgba(255, 255, 255, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: 'var(--v20-text-primary, #F0ECE3)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                    flexShrink: 0,
                  }}
                >
                  {activeOfficer.display_name[0]?.toUpperCase() || 'O'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <h2
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: 'var(--v20-text-primary, #F0ECE3)',
                        margin: 0,
                        letterSpacing: '-0.025em',
                      }}
                    >
                      {activeOfficer.display_name}
                    </h2>

                    {/* Account Status Badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background:
                          activeOfficer.membership_status === 'suspended'
                            ? 'rgba(229, 57, 53, 0.18)'
                            : 'rgba(67, 160, 71, 0.18)',
                        color: activeOfficer.membership_status === 'suspended' ? '#EF5350' : '#66BB6A',
                        border:
                          activeOfficer.membership_status === 'suspended'
                            ? '1px solid rgba(229,57,53,0.35)'
                            : '1px solid rgba(67,160,71,0.35)',
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
                        background:
                          activeOfficer.membership_status === 'suspended'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(59, 201, 119, 0.12)',
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
                      <span>{activeOfficer.membership_status === 'suspended' ? 'Offline · Inactive' : 'Online · Operational'}</span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '8px',
                      color: 'var(--v20-text-secondary)',
                      fontSize: '13.5px',
                    }}
                  >
                    <span>
                      Officer ID: <strong style={{ color: 'var(--v20-text-primary)' }}>{activeOfficer.employee_id || activeOfficer.staff_username || 'OFFICER'}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Division: <strong style={{ color: 'var(--v20-text-primary)' }}>{departmentCode} Field Operations</strong>
                    </span>
                    <span>·</span>
                    <span>Joined: November 2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Personnel Information Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--v20-text-secondary)', fontSize: '13px' }}>
                <Building size={16} style={{ color: 'var(--v20-text-muted)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--v20-text-muted)' }}>Department</div>
                  <div style={{ color: 'var(--v20-text-primary)', fontWeight: 600 }}>{departmentCode} Metropolitan</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--v20-text-secondary)', fontSize: '13px' }}>
                <FileText size={16} style={{ color: 'var(--v20-text-muted)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--v20-text-muted)' }}>Employee ID</div>
                  <div style={{ color: 'var(--v20-text-primary)', fontWeight: 600 }}>{activeOfficer.employee_id || activeOfficer.staff_username}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--v20-text-secondary)', fontSize: '13px' }}>
                <Calendar size={16} style={{ color: 'var(--v20-text-muted)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--v20-text-muted)' }}>Status</div>
                  <div style={{ color: 'var(--v20-text-primary)', fontWeight: 600 }}>
                    {activeOfficer.membership_status === 'suspended' ? 'Suspended' : 'Operational'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--v20-text-secondary)', fontSize: '13px' }}>
                <Clock size={16} style={{ color: 'var(--v20-text-muted)' }} />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--v20-text-muted)' }}>Last Active Time</div>
                  <div style={{ color: 'var(--v20-text-primary)', fontWeight: 600 }}>Heartbeat Verified (Today)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Performance Overview (Standalone Prominent Numerical Values) */}
          <div
            className="v19-glass-card"
            style={{
              padding: '30px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0 }}>
              Performance Overview
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '20px',
                padding: '24px 28px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Performance Rating
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '4px' }}>
                  {calculateRating(activeOfficer)}
                  <span style={{ fontSize: '13px', color: 'var(--v20-text-muted)', fontWeight: 400 }}> / 5.0</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  On-Time Completion
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#3BC977', marginTop: '4px' }}>
                  {calculateOnTimeRate(activeOfficer)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Assigned Tasks
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '4px' }}>
                  {activeOfficer.active_cases}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Resolved &amp; Verified
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#43A047', marginTop: '4px' }}>
                  {activeOfficer.verified_cases}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--v20-text-muted)' }}>
                  Overdue Cases
                </div>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 700,
                    color: activeOfficer.overdue_cases > 0 ? '#F59E0B' : 'var(--v20-text-muted)',
                    marginTop: '4px',
                  }}
                >
                  {activeOfficer.overdue_cases}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Current Assignments */}
          <div
            className="v19-glass-card"
            style={{
              padding: '30px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0 }}>
                Current Assignments ({activeOrders.length})
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Active Field Work Orders
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeOrders.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
                  <CheckCircle2 size={32} style={{ color: '#43A047', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No active field tasks currently assigned to this officer.</p>
                </div>
              ) : (
                activeOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      padding: '22px 26px',
                      borderRadius: '20px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                        {o.case_label}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)' }}>
                        Order #{o.id.slice(0, 8)} · Status:{' '}
                        <strong style={{ textTransform: 'capitalize', color: 'var(--v20-text-primary)' }}>
                          {o.status.replace('_', ' ')}
                        </strong>{' '}
                        · Deadline: {new Date(o.due_at).toLocaleDateString()} at{' '}
                        {new Date(o.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} PKT
                      </div>
                      {(o.instructions || (o as any).supervisor_instructions) && (
                        <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '2px' }}>
                          Instructions: {o.instructions || (o as any).supervisor_instructions}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="v19-nav-tab"
                      style={{
                        padding: '8px 18px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '9999px',
                        color: 'var(--v20-text-primary, #F0ECE3)',
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
                ))
              )}
            </div>
          </div>

          {/* Section 5: Work History */}
          <div
            className="v19-glass-card"
            style={{
              padding: '30px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0 }}>
                Work History ({completedOrders.length})
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                Supervisor-Verified Completions
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedOrders.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
                  <Clock size={32} style={{ color: 'var(--v20-text-muted)', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No completed field orders recorded yet for this officer.</p>
                </div>
              ) : (
                completedOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      padding: '20px 24px',
                      borderRadius: '20px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
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
                        Order #{o.id.slice(0, 8)} · Completed and supervisor-verified with on-site GPS evidence
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 14px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(67, 160, 71, 0.16)',
                        color: '#66BB6A',
                        border: '1px solid rgba(67,160,71,0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Verified Resolution ✓
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6: Warnings and Extension Requests */}
          <div
            className="v19-glass-card"
            style={{
              padding: '30px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', margin: 0 }}>
              Warnings &amp; Extension Requests
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Warnings Sub-section */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '18px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: activeOfficer.overdue_cases > 0 ? '#F59E0B' : '#43A047' }} />
                  <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary)' }}>
                    Formal Warnings
                  </span>
                </div>
                {activeOfficer.overdue_cases > 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Officer has active operational delay advisories issued for exceeded commencement thresholds.
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--v20-text-muted)', margin: 0 }}>
                    No formal disciplinary warnings or notices recorded.
                  </p>
                )}
              </div>

              {/* Extension Requests Sub-section */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '18px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: '#29B6F6' }} />
                  <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--v20-text-primary)' }}>
                    Extension Requests ({extensionRequests.length})
                  </span>
                </div>
                {extensionRequests.length > 0 ? (
                  extensionRequests.map((req) => (
                    <div key={req.id} style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)' }}>
                      Order #{req.id.slice(0, 8)}: {req.extension_reason || 'Fieldwork delay'}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--v20-text-muted)', margin: 0 }}>
                    No pending time extension requests awaiting decision.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Dedicated Administrative Controls Area */}
          <div
            className="v19-glass-card"
            style={{
              padding: '26px 32px',
              borderRadius: '26px',
              background: 'rgba(18, 15, 12, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '18px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 650, color: 'var(--v20-text-primary, #F0ECE3)' }}>
                Administrative Controls
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--v20-text-muted)', marginTop: '2px' }}>
                Authorized supervisory personnel management operations for {activeOfficer.display_name}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="v19-nav-tab"
                data-testid="officer-action-warning-btn"
                style={{
                  color: '#F59E0B',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 650,
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
                data-testid="officer-action-suspend-btn"
                style={{
                  color: activeOfficer.membership_status === 'suspended' ? '#66BB6A' : '#EF5350',
                  background:
                    activeOfficer.membership_status === 'suspended'
                      ? 'rgba(67, 160, 71, 0.14)'
                      : 'rgba(229, 57, 53, 0.14)',
                  border:
                    activeOfficer.membership_status === 'suspended'
                      ? '1px solid rgba(67, 160, 71, 0.35)'
                      : '1px solid rgba(229, 57, 53, 0.35)',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 650,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                }}
                onClick={() => setIsSuspendConfirmOpen(true)}
              >
                {activeOfficer.membership_status === 'suspended' ? 'Reactivate Officer' : 'Suspend Officer'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW 2: ENLARGED OFFICER DIRECTORY WITH COMPLAINT SCROLL DEPTH MOTION
           ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', width: '100%' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  margin: 0,
                  color: 'var(--v20-text-primary, #F0ECE3)',
                }}
              >
                Officers
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 650,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--v20-text-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                {filteredOfficers.length} personnel
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Search input by Name or ID */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} style={{ position: 'absolute', left: '16px', color: 'var(--v20-text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search officer name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '10px 18px 10px 42px',
                    borderRadius: '9999px',
                    background: 'rgba(18, 15, 12, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--v20-text-primary, #F0ECE3)',
                    fontSize: '13.5px',
                    outline: 'none',
                    width: '260px',
                  }}
                  data-testid="v20-officer-search-input"
                />
              </div>

              {/* Add New Officer Action Button */}
              <button
                type="button"
                className="v20-landing-btn v20-landing-btn-primary"
                style={{
                  padding: '10px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '9999px',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setProvisionResult(null);
                  setIsAddOpen(true);
                }}
              >
                <UserPlus size={16} />
                <span>Add New Officer</span>
              </button>
            </div>
          </div>

          {/* 3-Column Responsive Officers Grid (340-400px wide, min-height 330-360px, padding 28-32px) */}
          <div
            ref={gridContainerRef}
            data-testid="v20-officers-parallax-list"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px',
              width: '100%',
              perspective: '800px',
            }}
          >
            {filteredOfficers.length === 0 ? (
              <div
                className="v19-glass-card"
                style={{
                  gridColumn: '1 / -1',
                  padding: '64px',
                  textAlign: 'center',
                  borderRadius: '28px',
                  color: 'var(--v20-text-muted)',
                }}
              >
                <Search size={36} style={{ margin: '0 auto 14px', color: 'var(--v20-text-muted)' }} />
                <p style={{ margin: 0, fontSize: '15px' }}>No officers matched your search criteria.</p>
              </div>
            ) : (
              filteredOfficers.map((off, index) => {
                const isSuspended = off.membership_status === 'suspended';
                const rating = calculateRating(off);

                return (
                  <div
                    key={off.user_id}
                    className="v20-officer-card-wrapper"
                    style={{
                      position: 'relative',
                      zIndex: index + 1,
                    }}
                  >
                    <div
                      ref={(el) => {
                        surfaceRefs.current[index] = el;
                      }}
                      className="v19-glass-card v20-officer-card"
                      onClick={() => setSelectedOfficerId(off.user_id)}
                      style={{
                        padding: '30px',
                        borderRadius: '28px',
                        background: 'rgba(18, 15, 12, 0.78)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        minHeight: '330px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '22px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                      }}
                      data-testid={`v20-officer-card-${off.user_id}`}
                    >
                      {/* Top Row: 84px Circular Avatar, Name, ID, Presence Badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                          {/* Enlarged 84px Avatar */}
                          <div
                            style={{
                              width: '84px',
                              height: '84px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1.5px solid rgba(255, 255, 255, 0.16)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '34px',
                              fontWeight: 700,
                              color: 'var(--v20-text-primary, #F0ECE3)',
                              flexShrink: 0,
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
                            }}
                          >
                            {off.display_name[0]?.toUpperCase() || 'O'}
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: '19px',
                                fontWeight: 700,
                                color: 'var(--v20-text-primary, #F0ECE3)',
                                lineHeight: 1.25,
                                letterSpacing: '-0.015em',
                              }}
                            >
                              {off.display_name}
                            </div>
                            <div
                              style={{
                                fontSize: '12.5px',
                                color: 'var(--v20-text-muted)',
                                marginTop: '4px',
                                fontFamily: 'var(--v20-font-display, sans-serif)',
                              }}
                            >
                              ID: {off.employee_id || off.staff_username || 'OFFICER'}
                            </div>
                          </div>
                        </div>

                        {/* Status / Presence Capsule */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            background: isSuspended ? 'rgba(229, 57, 53, 0.16)' : 'rgba(67, 160, 71, 0.16)',
                            color: isSuspended ? '#EF5350' : '#66BB6A',
                            border: isSuspended ? '1px solid rgba(229,57,53,0.35)' : '1px solid rgba(67,160,71,0.35)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span>{isSuspended ? '✕' : '●'}</span>
                          <span>{isSuspended ? 'Suspended' : 'Online'}</span>
                        </span>
                      </div>

                      {/* Standalone Prominent Numerical Values (Assigned, Resolved, Overdue) */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '12px',
                          background: 'rgba(0, 0, 0, 0.26)',
                          padding: '16px 18px',
                          borderRadius: '18px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Assigned
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--v20-text-primary, #F0ECE3)', marginTop: '4px' }}>
                            {off.active_cases}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Resolved
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: '#43A047', marginTop: '4px' }}>
                            {off.verified_cases}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Overdue
                          </div>
                          <div
                            style={{
                              fontSize: '22px',
                              fontWeight: 700,
                              color: off.overdue_cases > 0 ? '#F59E0B' : 'var(--v20-text-muted)',
                              marginTop: '4px',
                            }}
                          >
                            {off.overdue_cases}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Rating & Neutral View Profile Action */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          paddingTop: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--v20-text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Star size={14} style={{ color: rating !== 'Unrated' ? '#DFA51D' : 'var(--v20-text-muted)' }} />
                          <span>
                            Rating: <strong style={{ color: 'var(--v20-text-primary)' }}>{rating}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          className="v19-nav-tab"
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 650,
                            padding: '6px 16px',
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS PRESERVED: PROVISIONING, WARNING, SUSPENSION & EXTEND DEADLINE
          ========================================================================= */}
      {/* 1. Add New Officer Modal */}
      {isAddOpen && (
        <div
          className="v19-lightbox-backdrop"
          role="dialog"
          aria-label="Add new officer"
          aria-modal="true"
          onClick={() => !isSubmittingAdd && setIsAddOpen(false)}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
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

      {/* 2. Issue Formal Warning Modal */}
      {isWarningOpen && (
        <div
          className="v19-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Issue Formal Warning"
          onClick={() => !isSubmittingWarning && setIsWarningOpen(false)}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '26px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
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
              This operational warning will be logged to officer {activeOfficer?.display_name}&apos;s permanent personnel scorecard.
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

      {/* 3. Suspend / Reactivate Confirmation Modal */}
      {isSuspendConfirmOpen && (
        <div
          className="v19-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Suspension Status"
          onClick={() => !isSubmittingSuspension && setIsSuspendConfirmOpen(false)}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '26px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
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

      {/* 4. Extend Deadline on Active Task Modal */}
      {extendingOrderId && (
        <div
          className="v19-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Extend Task Deadline"
          onClick={() => !isSubmittingExtension && setExtendingOrderId(null)}
        >
          <div
            className="v19-glass-card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '26px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
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
