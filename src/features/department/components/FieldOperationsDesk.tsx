import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  X,
  Upload,
  Compass,
} from 'lucide-react';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import type { IncidentCaseSummary, WorkQueueFilter } from '../../../types/case-operations';
import {
  fieldOperations,
  officerRating,
  workDeadline,
  isLocalFieldDemo,
  type DepartmentOfficer,
  type DepartmentProof,
  type DepartmentWorkOrder,
  type StaffPosition,
} from '../services/fieldOperations';
import { supabase } from '../../../lib/supabase';
import { DepartmentDeadlinePicker } from './DepartmentDeadlinePicker';
import '../v13_21_operations.css';
import '../field-operations-v18.css';

interface Props {
  departmentId: string;
  userId: string;
  role: StaffPosition;
  view: 'dispatch' | 'field' | 'team' | 'verification' | 'field_archive';
  officerFilter?: 'today' | 'all';
}

const formatPKT = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const localInputDateTime = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const dueInputDefault = () => {
  const date = new Date(Date.now() + 3 * 86400000);
  date.setHours(17, 0, 0, 0);
  return localInputDateTime(date);
};

const filter: WorkQueueFilter = {
  savedView: 'all',
  displayMode: 'cases',
  searchQuery: '',
  area: 'All areas',
  issueType: 'All issues',
  sort: 'attention',
  page: 0,
  pageSize: 100,
};

export const FieldOperationsDesk: React.FC<Props> = ({
  departmentId,
  userId,
  role,
  view,
  officerFilter = 'today',
}) => {
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [team, setTeam] = useState<DepartmentOfficer[]>([]);
  const [cases, setCases] = useState<IncidentCaseSummary[]>([]);
  const [selected, setSelected] = useState<IncidentCaseSummary | null>(null);
  const [assignStage, setAssignStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [officer, setOfficer] = useState('');
  const [deadline, setDeadline] = useState(dueInputDefault);
  const [instructions, setInstructions] = useState('Inspect, repair and upload a clear photo from the issue location.');
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(35);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [reviewing, setReviewing] = useState<{ order: DepartmentWorkOrder; proof: DepartmentProof; image?: string; beforeImage?: string } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [extensionFor, setExtensionFor] = useState<string | null>(null);
  const [extensionDate, setExtensionDate] = useState(dueInputDefault);
  const [extensionReason, setExtensionReason] = useState('');
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState('');
  const [closureReasons, setClosureReasons] = useState<Record<string, string>>({});
  const [minimumDeadlineInput] = useState(() => localInputDateTime(new Date()));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [work, roster, casePage] = await Promise.all([
        fieldOperations.orders(departmentId),
        role === 'head' ? fieldOperations.team(departmentId) : Promise.resolve([]),
        role === 'head' ? caseOperationsService.listDepartmentCases(departmentId as never, filter) : Promise.resolve({ items: [] }),
      ]);
      setOrders(work);
      setTeam(roster);
      setCases(casePage.items);
      setMessage(null);
    } catch (error) {
      setMessage({
        success: false,
        text: error instanceof Error ? error.message : 'Unable to load field operations.',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reviewing) setReviewing(null);
        if (extensionFor) setExtensionFor(null);
        if (uploadFor) setUploadFor(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewing, extensionFor, uploadFor]);

  const myOrders = role === 'head' ? orders : orders.filter((order) => order.officer_id === userId);
  const active = myOrders.filter((o) => o.status !== 'verified');
  const verified = myOrders.filter((o) => o.status === 'verified');
  const overdue = active.filter((o) => workDeadline(o) === 'overdue');
  const pending = orders.filter((o) => o.status === 'pending_review');
  const candidates = useMemo(
    () => cases.filter((c) => `${c.title} ${c.locality} ${c.caseNumber}`.toLowerCase().includes(search.toLowerCase())),
    [cases, search],
  );
  const isHead = role === 'head';
  const heading =
    view === 'team'
      ? 'Officers'
      : view === 'verification'
      ? 'Proof review'
      : view === 'field_archive'
      ? isHead
        ? 'Archive'
        : 'History'
      : isHead
      ? 'Dispatch'
      : officerFilter === 'all'
      ? 'Assignments'
      : 'My day';
  const actionable = view === 'verification' ? pending : view === 'field_archive' ? verified : active;

  async function execute(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ success: true, text: success });
      await reload();
      setMessage({ success: true, text: success });
    } catch (err) {
      setMessage({
        success: false,
        text: err instanceof Error ? err.message : 'The action could not be completed.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function assignCase(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !officer) return;
    if (!Number.isFinite(new Date(deadline).getTime()) || new Date(deadline).getTime() <= Date.now()) {
      setMessage({ success: false, text: 'Choose a future work deadline before assigning this case.' });
      return;
    }
    await execute(async () => {
      const reports = await caseOperationsService.listCaseReports(selected.id, '', 0, 100);
      if (!reports.items.length || reports.total > 100) {
        throw new Error('This case has no eligible linked complaints or exceeds 100 reports. Review the case before assigning.');
      }
      const reportIds = reports.items.map((r) => r.complaintId);
      await fieldOperations.assign({
        departmentId,
        anchorComplaintId: reportIds[0],
        reportIds,
        caseLabel: selected.title.slice(0, 80),
        officerId: officer,
        dueAt: new Date(deadline).toISOString(),
        instructions,
      });
      setSelected(null);
    }, 'The work order has been assigned to the officer.');
  }

  async function showProof(order: DepartmentWorkOrder) {
    setBusy(true);
    try {
      const proof = await fieldOperations.proof(order.id);
      if (!proof) throw new Error('No evidence was found for this work order.');
      let afterUrl: string | undefined;
      let beforeUrl: string | undefined;

      if (isLocalFieldDemo()) {
        afterUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><text x="50%" y="45%" fill="%2310b981" font-size="20" font-family="sans-serif" text-anchor="middle" font-weight="bold">REPAIRED STATE (AFTER)</text><text x="50%" y="60%" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Officer On-Site Work Evidence</text></svg>';
        if (proof.before_storage_path) {
          beforeUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><text x="50%" y="45%" fill="%23f59e0b" font-size="20" font-family="sans-serif" text-anchor="middle" font-weight="bold">INITIAL CONDITION (BEFORE)</text><text x="50%" y="60%" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Initial Site Photograph</text></svg>';
        }
      } else {
        const signed = await supabase?.storage.from('department-work-proof-private').createSignedUrl(proof.storage_path, 300);
        afterUrl = signed?.data?.signedUrl;
        if (proof.before_storage_path) {
          const beforeSigned = await supabase?.storage.from('department-work-proof-private').createSignedUrl(proof.before_storage_path, 300);
          beforeUrl = beforeSigned?.data?.signedUrl;
        }
      }
      setReviewNote('');
      setReviewing({ order, proof, image: afterUrl, beforeImage: beforeUrl });
    } catch (err) {
      setMessage({ success: false, text: err instanceof Error ? err.message : 'Unable to load proof.' });
    } finally {
      setBusy(false);
    }
  }

  function getPosition() {
    setLocationError('');
    setLocation(null);
    if (!navigator.geolocation) {
      setLocationError('Location is unavailable on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation(p.coords),
      (err) => setLocationError(err.message || 'Location permission denied.'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  return (
    <section className="field-desk v21-content-container" aria-label="Verified field operations">
      {/* Header Bar */}
      <div className="v21-sec-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {isHead ? 'DEPARTMENT HEAD' : 'FIELD OFFICER'} / {departmentId.toUpperCase()}
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 2px 0', color: 'var(--v21-text-main)', letterSpacing: '-0.02em' }}>
            {heading}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--v21-text-muted)', margin: 0 }}>
            {view === 'team'
              ? 'Review approved officers, open workloads and verified performance.'
              : view === 'verification'
              ? 'Review each photograph and location before accepting completed work.'
              : view === 'field_archive'
              ? 'Find the verified record and complete eligible citizen closures.'
              : isHead
              ? 'Assign cases, set deadlines and track each officer’s progress.'
              : 'Track deadlines, record repairs and submit verified proof for review.'}
          </p>
        </div>

        <button
          className="v21-btn"
          onClick={() => void reload()}
          disabled={loading}
          type="button"
          aria-label="Refresh operations"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status notification */}
      {message && (
        <div className={`field-feedback ${message.success ? 'good' : 'bad'}`} role="status" style={{ marginBottom: '16px' }}>
          {message.text}
          <button aria-label="Dismiss message" type="button" onClick={() => setMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Calm V3 Operational Summary Strip (replaces heavy 4-box SaaS KPI grid) */}
      {(view === 'dispatch' || view === 'field') && (
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-b py-3 text-[13px]"
          style={{
            borderColor: 'var(--v3-edge)',
            color: 'var(--v3-muted)',
            marginBottom: '22px',
          }}
          role="group"
          aria-label="Operations metrics"
        >
          <span>
            <strong style={{ color: 'var(--v3-ink)' }}>{active.length}</strong> open
          </span>
          <span>
            <strong style={{ color: overdue.length > 0 ? 'var(--v3-danger)' : 'var(--v3-ink)' }}>
              {overdue.length}
            </strong>{' '}
            past deadline
          </span>
          {isHead && (
            <span>
              <strong style={{ color: 'var(--v3-accent)' }}>{pending.length}</strong> awaiting proof review
            </span>
          )}
          <span>
            <strong style={{ color: 'var(--v3-ink)' }}>{verified.length}</strong> verified
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--v21-text-muted)' }}>
          Loading department operations…
        </div>
      ) : (
        <>
          {/* VIEW: Officer Roster */}
          {view === 'team' && isHead && (
            <div className="v21-case-card" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Officer roster</h2>
                <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', margin: 0 }}>
                  Performance is based on verified cases, completion time and citizen disputes—not raw complaint volume.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {team
                  .filter((o) => o.staff_role === 'officer')
                  .map((o) => {
                    const score = officerRating(o);
                    return (
                      <div
                        key={o.user_id}
                        className="v21-officer-card"
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                          <div className="v21-user-avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                            {o.display_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '14px', color: 'var(--v21-text-main)', display: 'block' }}>
                              {o.display_name}
                            </strong>
                            <small style={{ fontSize: '11px', color: 'var(--v21-text-muted)' }}>
                              {o.active_cases} open · {o.overdue_cases} overdue · {o.verified_cases} verified
                            </small>
                          </div>
                        </div>

                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '8px', borderTop: '1px solid var(--v21-border-subtle)' }}
                          aria-label={
                            score === null
                              ? `${o.display_name} is not rated until five verified cases`
                              : `${o.display_name}: ${score.toFixed(1)} out of 5, based on punctuality and citizen disputes`
                          }
                        >
                          <span style={{ display: 'flex', gap: '2px', color: 'var(--v21-warning)' }} aria-hidden="true">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={13}
                                fill={score !== null && i < Math.round(score) ? 'currentColor' : 'none'}
                              />
                            ))}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-text-main)' }}>
                            {score !== null ? `${score.toFixed(1)} / 5.0` : 'New (Awaiting 5 cases)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {!team.some((o) => o.staff_role === 'officer') && (
                <p style={{ padding: '24px 0', textAlign: 'center', color: 'var(--v21-text-muted)', fontSize: '13px' }}>
                  No approved officers. The central administrator must approve officers first.
                </p>
              )}
            </div>
          )}

          {/* VIEW: Dispatch Desk (Head) with 5-stage assignment workflow */}
          {view === 'dispatch' && isHead && (
            <div className={`v21-dispatch-grid ${selected ? 'has-selected' : ''}`}>
              {/* Left Column: Incoming Cases Ready for Assignment */}
              <div className="v21-case-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.04em' }}>
                      INCOMING CASES
                    </span>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                      Ready for assignment{' '}
                      <span style={{ fontSize: '12px', color: 'var(--v21-text-tertiary)', fontWeight: 500 }}>
                        ({search ? `${candidates.length} of ${cases.length}` : `${candidates.length}`})
                      </span>
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--v21-bg-surface-subtle)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--v21-border-subtle)' }}>
                    <Search size={14} color="var(--v21-text-tertiary)" />
                    <input
                      aria-label="Search cases"
                      placeholder="Search reference or area"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setVisibleLimit(35);
                      }}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: 'var(--v21-text-main)', width: '130px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
                  {candidates.slice(0, visibleLimit).map((c) => {
                    const isSelected = selected?.id === c.id;
                    const isCritical = c.priority === 'critical';
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          if (selected?.id !== c.id) {
                            setAssignStage(1);
                          }
                          setSelected(c);
                          setOfficer('');
                        }}
                        className={`v21-case-row ${isSelected ? 'selected' : ''}`}
                        aria-pressed={isSelected}
                        style={{
                          borderRadius: '8px',
                          border: isSelected ? '1px solid var(--v21-accent)' : '1px solid var(--v21-border-subtle)',
                          background: isSelected ? 'var(--v21-accent-light)' : 'var(--v21-bg-surface)',
                          textAlign: 'left',
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="v21-meta-code">{c.caseNumber}</span>
                            {isCritical && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-danger)', background: 'var(--v21-danger-light)', padding: '1px 5px', borderRadius: '4px' }}>
                                URGENT
                              </span>
                            )}
                          </div>
                          <strong style={{ fontSize: '13px', color: 'var(--v21-text-main)', display: 'block', margin: '4px 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.title}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--v21-text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                            {c.locality} · {c.linkedReportCount} citizen reports
                          </span>
                        </div>
                        <ChevronRight size={16} color="var(--v21-text-tertiary)" />
                      </button>
                    );
                  })}
                </div>

                {candidates.length > visibleLimit && (
                  <button
                    type="button"
                    className="v21-btn"
                    style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
                    onClick={() => setVisibleLimit((v) => v + 35)}
                  >
                    Show more cases ({Math.min(visibleLimit, candidates.length)} of {candidates.length})
                  </button>
                )}

                {!candidates.length && (
                  <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--v21-text-muted)', fontSize: '13px' }}>
                    {cases.length ? 'No cases match that search.' : 'No cases are available for assignment.'}
                  </p>
                )}
              </div>

              {/* Right Column: 5-Stage Assignment Workflow Panel */}
              <div className="v21-case-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.04em' }}>
                    5-STAGE DISPATCH WORKFLOW
                  </span>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                    {selected ? 'Assign this case' : 'Assignment brief'}
                  </h2>
                </div>

                {selected ? (
                  <form onSubmit={(e) => void assignCase(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Stepper Node Track (5 stages) */}
                    <div className="v21-step-track">
                      {[
                        { num: 1, label: 'Case' },
                        { num: 2, label: 'Officer' },
                        { num: 3, label: 'Deadline' },
                        { num: 4, label: 'Instructions' },
                        { num: 5, label: 'Confirm' },
                      ].map((s) => {
                        const isActive = assignStage === s.num;
                        const isDone = assignStage > s.num;
                        return (
                          <button
                            type="button"
                            key={s.num}
                            onClick={() => {
                              if (s.num < assignStage) setAssignStage(s.num as any);
                            }}
                            className={`v21-step-node ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                            style={{ background: 'transparent', border: 'none', cursor: s.num < assignStage ? 'pointer' : 'default', padding: 0 }}
                          >
                            <span className="v21-step-circle">{isDone ? '✓' : s.num}</span>
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* STAGE 1: CASE SELECTION REVIEW */}
                    {assignStage === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: 'var(--v21-bg-surface-subtle)', padding: '14px', borderRadius: '10px', border: '1px solid var(--v21-border-subtle)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Step 1 of 5: Case Verification
                          </span>
                          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v21-text-main)', margin: '4px 0 6px 0' }}>
                            {selected.title}
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', margin: '0 0 8px 0' }}>
                            {selected.publicPlace} · {selected.locality}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="v21-dept-badge" style={{ textTransform: 'capitalize' }}>
                              Priority: {selected.priority}
                            </span>
                            <span className="v21-dept-badge">
                              {selected.linkedReportCount} citizen report{selected.linkedReportCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="v21-btn"
                            onClick={() => setSelected(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="v21-btn v21-btn-primary"
                            onClick={() => setAssignStage(2)}
                          >
                            <span>Next: Choose Officer</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 2: OFFICER SELECTION */}
                    {assignStage === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Step 2 of 5: Responsible officer
                          </div>
                          <label htmlFor="field-officer" style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--v21-text-main)' }}>
                            Responsible officer
                          </label>
                          <p style={{ fontSize: '11px', color: 'var(--v21-text-muted)', margin: '0 0 10px 0' }}>
                            Select an approved municipal field officer to assign on-site inspection and repair duties.
                          </p>
                          <select
                            id="field-officer"
                            value={officer}
                            onChange={(e) => setOfficer(e.target.value)}
                            required
                            className="v21-time-select"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '12px' }}
                          >
                            <option value="">Choose approved officer</option>
                            {team
                              .filter((o) => o.staff_role === 'officer')
                              .map((o) => (
                                <option key={o.user_id} value={o.user_id}>
                                  {o.display_name} — {o.active_cases} active workloads ({o.verified_cases} verified)
                                </option>
                              ))}
                          </select>
                        </div>

                        {officer && (
                          <div style={{ background: 'var(--v21-bg-surface-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--v21-border-subtle)', fontSize: '11px', color: 'var(--v21-text-muted)' }}>
                            Selected: <strong style={{ color: 'var(--v21-text-main)' }}>{team.find(t => t.user_id === officer)?.display_name}</strong>
                            {' · '}Current active cases: {team.find(t => t.user_id === officer)?.active_cases}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="v21-btn"
                            onClick={() => setAssignStage(1)}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            className="v21-btn v21-btn-primary"
                            disabled={!officer}
                            onClick={() => setAssignStage(3)}
                          >
                            <span>Next: Set Deadline</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 3: DEADLINE SELECTION */}
                    {assignStage === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            Step 3 of 5: Resolution Deadline
                          </span>
                          <DepartmentDeadlinePicker
                            id="field-due"
                            label="Work deadline (PKT)"
                            value={deadline}
                            min={minimumDeadlineInput}
                            onChange={setDeadline}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="v21-btn"
                            onClick={() => setAssignStage(2)}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            className="v21-btn v21-btn-primary"
                            disabled={!deadline || new Date(deadline).getTime() <= Date.now()}
                            onClick={() => setAssignStage(4)}
                          >
                            <span>Next: Write Instructions</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 4: INSTRUCTIONS BRIEFING */}
                    {assignStage === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label htmlFor="field-instructions" style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--v21-text-main)' }}>
                            Step 4 of 5: Instructions to officer
                          </label>
                          <p style={{ fontSize: '11px', color: 'var(--v21-text-muted)', margin: '0 0 8px 0' }}>
                            Specify safety measures, site landmarks, and mandatory work verification tasks.
                          </p>
                          <textarea
                            id="field-instructions"
                            rows={4}
                            minLength={8}
                            maxLength={1200}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Provide clear guidance for the field crew..."
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid var(--v21-border-strong)',
                              background: 'var(--v21-bg-surface)',
                              color: 'var(--v21-text-main)',
                              fontSize: '12px',
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--v21-text-tertiary)', marginTop: '4px' }}>
                            <span>Min 8 characters</span>
                            <span>{instructions.length}/1200</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="v21-btn"
                            onClick={() => setAssignStage(3)}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            className="v21-btn v21-btn-primary"
                            disabled={instructions.trim().length < 8}
                            onClick={() => setAssignStage(5)}
                          >
                            <span>Next: Review Summary</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 5: FINAL CONFIRMATION SUMMARY REVIEW */}
                    {assignStage === 5 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: 'var(--v21-bg-surface-subtle)', padding: '14px', borderRadius: '10px', border: '1px solid var(--v21-border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--v21-border-subtle)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-accent)', textTransform: 'uppercase' }}>
                              Step 5 of 5: Work Order Summary
                            </span>
                            <span className="v21-dept-badge">READY TO DISPATCH</span>
                          </div>

                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)', display: 'block', fontWeight: 600 }}>CASE</span>
                            <strong style={{ fontSize: '12px', color: 'var(--v21-text-main)' }}>{selected.title}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--v21-text-muted)' }}>{selected.publicPlace} · {selected.locality}</div>
                          </div>

                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)', display: 'block', fontWeight: 600 }}>ASSIGNED OFFICER</span>
                            <strong style={{ fontSize: '12px', color: 'var(--v21-text-main)' }}>
                              {team.find(t => t.user_id === officer)?.display_name || officer}
                            </strong>
                          </div>

                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)', display: 'block', fontWeight: 600 }}>DEADLINE (PKT)</span>
                            <strong style={{ fontSize: '12px', color: 'var(--v21-text-main)' }}>
                              {new Date(deadline).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                            </strong>
                          </div>

                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)', display: 'block', fontWeight: 600 }}>INSTRUCTIONS</span>
                            <p style={{ fontSize: '11px', color: 'var(--v21-text-muted)', margin: 0, fontStyle: 'italic', background: 'var(--v21-bg-surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--v21-border-subtle)' }}>
                              &ldquo;{instructions}&rdquo;
                            </p>
                          </div>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', margin: 0, textAlign: 'center' }}>
                          Dispatching creates an active work order and sends an operational notification to the officer.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="v21-btn"
                            onClick={() => setAssignStage(4)}
                          >
                            ← Back
                          </button>
                          <button
                            className="v21-btn v21-btn-primary"
                            type="submit"
                            aria-label="Confirm & Dispatch Work Order (Assign with deadline)"
                            disabled={busy || !officer || !deadline || instructions.trim().length < 8}
                            style={{ padding: '10px 16px' }}
                          >
                            <span>Confirm & Dispatch Work Order</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--v21-text-muted)' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                      Three steps to dispatch a case
                    </p>
                    <ol style={{ textAlign: 'left', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', margin: '0 auto', maxWidth: '320px' }}>
                      <li>Select an incident from the case list.</li>
                      <li>Choose an approved officer and deadline.</li>
                      <li>Confirm instructions and assign the work.</li>
                    </ol>
                    <p style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '16px' }}>
                      Each assignment stays visible until its evidence is verified.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: Work Orders List (for Field, Verification, Archive, and Dispatch secondary) */}
          {(view === 'field' || view === 'dispatch' || view === 'verification' || view === 'field_archive') && (
            <div className="v21-case-card" style={{ padding: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.04em' }}>
                    {view === 'verification'
                      ? 'EVIDENCE INBOX'
                      : view === 'field_archive'
                      ? 'COMPLETED / ARCHIVED'
                      : 'WORK IN MOTION'}
                  </span>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                    {view === 'verification'
                      ? 'Awaiting a decision'
                      : view === 'field_archive'
                      ? 'Verified work history'
                      : isHead
                      ? 'Assigned work orders'
                      : 'My assigned work'}
                  </h2>
                </div>
                <span className="v21-sec-counter">{actionable.length} records</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {actionable.map((o) => {
                  const state = workDeadline(o);
                  const isInProgress = o.status === 'in_progress';
                  const isPending = o.status === 'pending_review';
                  const isVerified = o.status === 'verified';

                  return (
                    <article
                      key={o.id}
                      className="v21-case-row"
                      style={{
                        borderRadius: '10px',
                        border: '1px solid var(--v21-border-subtle)',
                        background: 'var(--v21-bg-surface)',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '12px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginBottom: '6px',
                              background: o.citizen_dispute_pending
                                ? 'var(--v21-danger-light)'
                                : state === 'overdue'
                                ? 'var(--v21-danger-light)'
                                : 'var(--v21-bg-surface-subtle)',
                              color: o.citizen_dispute_pending
                                ? 'var(--v21-danger)'
                                : state === 'overdue'
                                ? 'var(--v21-danger)'
                                : 'var(--v21-text-main)',
                            }}
                          >
                            {o.citizen_dispute_pending
                              ? 'CITIZEN DISPUTE / REWORK'
                              : state === 'overdue'
                              ? 'PAST DUE'
                              : state === 'approaching'
                              ? 'DUE SOON'
                              : o.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--v21-text-main)' }}>
                            {o.case_label}
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', margin: 0 }}>
                            {o.instructions}
                          </p>

                          {o.citizen_dispute_pending && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: 'var(--v21-danger-light)',
                                color: 'var(--v21-danger)',
                                fontSize: '12px',
                              }}
                              role="status"
                            >
                              A citizen reported that this repair is not complete. The assigned officer must revisit the issue and provide new evidence for head review.
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span>
                              <CalendarClock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                              Due {formatPKT(o.due_at)}
                            </span>
                            <span>
                              <Clock3 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                              {o.status.replace('_', ' ')}
                            </span>
                            {isHead && (
                              <span>
                                Officer: {team.find((t) => t.user_id === o.officer_id)?.display_name || o.officer_id.slice(0, 8)}
                              </span>
                            )}
                          </div>

                          {o.extension_requested_due_at && (
                            <p style={{ fontSize: '11px', color: 'var(--v21-warning)', marginTop: '6px' }}>
                              Extension requested until {formatPKT(o.extension_requested_due_at)}. Reason: {o.extension_reason}
                            </p>
                          )}
                        </div>

                        {/* Lifecycle action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {isHead ? (
                            <>
                              {o.status === 'pending_review' && (
                                <button
                                  className="v21-btn v21-btn-primary"
                                  type="button"
                                  data-testid="inspect-evidence-btn"
                                  aria-label="Review evidence"
                                  disabled={busy}
                                  onClick={() => void showProof(o)}
                                >
                                  <FileCheck2 size={14} />
                                  <span>Review evidence</span>
                                </button>
                              )}
                              {o.extension_requested_due_at && (
                                <>
                                  <button
                                    className="v21-btn v21-btn-primary"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void execute(() => fieldOperations.decideExtension(o.id, true), 'Extension approved.')}
                                  >
                                    Approve extension
                                  </button>
                                  <button
                                    className="v21-btn"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void execute(() => fieldOperations.decideExtension(o.id, false), 'Extension declined.')}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {(o.status === 'assigned' || o.status === 'returned') && (
                                <button
                                  className="v21-btn v21-btn-primary"
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void execute(() => fieldOperations.start(o.id), 'Work has started.')}
                                >
                                  <span>Start work</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}
                              {o.status === 'in_progress' && (
                                <button
                                  className="v21-btn v21-btn-primary"
                                  type="button"
                                  data-testid="submit-field-proof-btn"
                                  aria-label="Submit field proof"
                                  onClick={() => {
                                    setUploadFor(o.id);
                                    setPhoto(null);
                                    setBeforePhoto(null);
                                    setLocation(null);
                                  }}
                                >
                                  <Camera size={14} />
                                  <span>Submit field proof</span>
                                </button>
                              )}
                              {o.status !== 'verified' && o.status !== 'pending_review' && (
                                <button
                                  className="v21-btn"
                                  type="button"
                                  data-testid="request-extension-btn"
                                  aria-label="Request extra time"
                                  onClick={() => setExtensionFor(o.id)}
                                >
                                  Request extra time
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Linear 5-Step Officer Lifecycle Stepper */}
                      {!isHead && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--v21-border-subtle)', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)' }}>Lifecycle Stage:</span>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                            <span style={{ fontWeight: o.status === 'assigned' ? 700 : 500, color: o.status === 'assigned' ? 'var(--v21-accent)' : 'var(--v21-text-tertiary)' }}>
                              1. Assigned
                            </span>
                            <span>→</span>
                            <span style={{ fontWeight: isInProgress ? 700 : 500, color: isInProgress ? 'var(--v21-accent)' : 'var(--v21-text-tertiary)' }}>
                              2. In Progress
                            </span>
                            <span>→</span>
                            <span style={{ fontWeight: isPending ? 700 : 500, color: isPending ? 'var(--v21-accent)' : 'var(--v21-text-tertiary)' }}>
                              3. Proof Submitted
                            </span>
                            <span>→</span>
                            <span style={{ fontWeight: isVerified ? 700 : 500, color: isVerified ? 'var(--v21-accent)' : 'var(--v21-text-tertiary)' }}>
                              4. Head Verified
                            </span>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {!actionable.length && (
                <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--v21-text-muted)', fontSize: '13px' }}>
                  {view === 'verification'
                    ? 'No proof is waiting for approval.'
                    : view === 'field_archive'
                    ? 'No supervisor-verified work to archive yet.'
                    : 'No active work orders in this view.'}
                </p>
              )}

              {isHead && view === 'verification' && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--v21-text-tertiary)', marginTop: '16px' }}>
                  <ShieldAlert size={14} />
                  <span>Location proximity and image fingerprints are warnings, not a guarantee that a photo is genuine. Review the evidence manually.</span>
                </p>
              )}
            </div>
          )}

          {/* VIEW: Citizen Case Closure (Head Archive) */}
          {view === 'field_archive' && isHead && verified.length > 0 && (
            <div className="v21-case-card" style={{ padding: '20px', marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)', letterSpacing: '0.04em' }}>
                  CITIZEN CASE CLOSURE
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                  Finish the record, not just the repair.
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', margin: '4px 0 0 0' }}>
                  Close only after each citizen confirms every department's evidence, or after 72 unanswered hours with a documented supervisor reason. A dispute automatically returns the assignment for rework.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {verified.map((order) => (
                  <div
                    key={`close-${order.id}`}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--v21-border-subtle)',
                      background: 'var(--v21-bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--v21-text-main)', display: 'block', marginBottom: '4px' }}>
                        {order.case_label}
                      </strong>
                      <label
                        htmlFor={`field-close-reason-${order.id}`}
                        style={{ fontSize: '11px', color: 'var(--v21-text-muted)', display: 'block', marginBottom: '4px' }}
                      >
                        Reason for closure without a citizen response (required only after 72 hours)
                      </label>
                      <textarea
                        id={`field-close-reason-${order.id}`}
                        rows={2}
                        maxLength={1200}
                        placeholder="Document the evidence reviewed and why this unresolved response is being administratively closed (20+ characters)."
                        value={closureReasons[order.id] || ''}
                        onChange={(e) => setClosureReasons((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid var(--v21-border-strong)',
                          background: 'var(--v21-bg-surface-subtle)',
                          color: 'var(--v21-text-main)',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className="v21-btn v21-btn-primary"
                      disabled={busy}
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() =>
                        void execute(
                          () => fieldOperations.closeVerified(order.id, closureReasons[order.id] || ''),
                          'Eligible citizen records were closed and official updates were queued.',
                        )
                      }
                    >
                      <span>Close verified reports</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: Supervisor Proof Verification */}
      {reviewing && (
        <div
          className="v21-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReviewing(null);
          }}
        >
          <section
            className="v21-modal-window"
            role="dialog"
            aria-modal="true"
            aria-label="Review submitted proof"
            data-testid="supervisor-review-modal"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)' }}>
                  SUPERVISOR VERIFICATION
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                  {reviewing.order.case_label}
                </h2>
              </div>
              <button
                className="v21-btn"
                type="button"
                onClick={() => setReviewing(null)}
                aria-label="Close"
                style={{ padding: '4px', minHeight: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Split Before / After Photo Previews */}
            <div style={{ display: 'grid', gridTemplateColumns: reviewing.beforeImage ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '14px' }}>
              {reviewing.beforeImage && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--v21-border-subtle)', background: '#000', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '6px 10px', background: 'var(--v21-bg-surface-subtle)', borderBottom: '1px solid var(--v21-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-warning)' }}>
                      INITIAL CONDITION (BEFORE)
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)' }}>Site pin</span>
                  </div>
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={reviewing.beforeImage}
                      alt="Before work condition"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--v21-border-subtle)', background: '#000', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '6px 10px', background: 'var(--v21-bg-surface-subtle)', borderBottom: '1px solid var(--v21-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-accent)' }}>
                    REPAIRED STATE (AFTER)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--v21-text-tertiary)' }}>Mandatory</span>
                </div>
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {reviewing.image ? (
                    <img
                      src={reviewing.image}
                      alt="Repaired work evidence"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <p style={{ color: '#fff', fontSize: '12px', padding: '24px' }}>
                      Secure preview could not be retrieved. Verify storage access before approving.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--v21-text-muted)', marginBottom: '12px', padding: '8px 12px', borderRadius: '6px', background: 'var(--v21-bg-surface-subtle)' }}>
              Location: <strong>{reviewing.proof.location_result.replaceAll('_', ' ')}</strong> ·{' '}
              {reviewing.proof.original_distance_m == null
                ? 'Original citizen pin not available'
                : `${Math.round(reviewing.proof.original_distance_m)} metres from complaint pin`}{' '}
              · Accuracy ±{Math.round(reviewing.proof.accuracy_m)}m
            </div>

            {reviewing.proof.duplicate_warning && (
              <p style={{ fontSize: '12px', color: 'var(--v21-danger)', margin: '0 0 12px 0', fontWeight: 600 }}>
                This photograph matches an earlier uploaded image.
              </p>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="field-review-note"
                style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--v21-text-main)' }}
              >
                Decision notes{' '}
                {reviewing.proof.location_result !== 'near' || reviewing.proof.duplicate_warning
                  ? '(mandatory for approval)'
                  : ''}
              </label>
              <textarea
                id="field-review-note"
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Explain why this work should be approved or returned."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--v21-border-strong)',
                  background: 'var(--v21-bg-surface)',
                  color: 'var(--v21-text-main)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="v21-btn"
                disabled={busy}
                onClick={() =>
                  void execute(async () => {
                    await fieldOperations.review(reviewing.order.id, false, reviewNote);
                    setReviewing(null);
                  }, 'Evidence returned to the officer.')
                }
              >
                Return for correction
              </button>
              <button
                className="v21-btn v21-btn-primary"
                type="button"
                disabled={
                  busy ||
                  !reviewing.image ||
                  ((reviewing.proof.location_result !== 'near' || reviewing.proof.duplicate_warning) &&
                    reviewNote.trim().length < 20)
                }
                onClick={() =>
                  void execute(async () => {
                    await fieldOperations.review(reviewing.order.id, true, reviewNote);
                    setReviewing(null);
                  }, 'Evidence approved and available to linked citizens.')
                }
              >
                <span>Approve verified work</span>
                <Check size={14} />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: Deadline Extension Request */}
      {extensionFor && (
        <div className="v21-modal-overlay">
          <form
            className="v21-modal-window"
            role="dialog"
            aria-modal="true"
            aria-label="Request a deadline extension"
            data-testid="officer-extension-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !Number.isFinite(new Date(extensionDate).getTime()) ||
                new Date(extensionDate).getTime() <= Date.now()
              ) {
                setMessage({ success: false, text: 'Choose a future proposed deadline.' });
                return;
              }
              void execute(async () => {
                await fieldOperations.requestExtension(
                  extensionFor,
                  new Date(extensionDate).toISOString(),
                  extensionReason,
                );
                setExtensionFor(null);
              }, 'Extension request sent to your department head.');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)' }}>
                  TIME REQUEST
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                  Need more time?
                </h2>
              </div>
              <button
                className="v21-btn"
                type="button"
                onClick={() => setExtensionFor(null)}
                style={{ padding: '4px', minHeight: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', marginBottom: '14px' }}>
              Your supervisor will review the reason and new target.
            </p>

            <DepartmentDeadlinePicker
              id="field-extension-date"
              label="Proposed new deadline"
              value={extensionDate}
              min={minimumDeadlineInput}
              onChange={setExtensionDate}
            />

            <div style={{ marginTop: '12px', marginBottom: '16px' }}>
              <label
                htmlFor="field-extension-reason"
                style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--v21-text-main)' }}
              >
                Reason for the delay
              </label>
              <textarea
                id="field-extension-reason"
                required
                minLength={12}
                rows={3}
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--v21-border-strong)',
                  background: 'var(--v21-bg-surface)',
                  color: 'var(--v21-text-main)',
                  fontSize: '12px',
                }}
              />
            </div>

            <button type="submit" className="v21-btn v21-btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Send request</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      )}

      {/* MODAL: Submit Work Evidence (With Before/After Photo & Explicit GPS Telemetry) */}
      {uploadFor && (
        <div className="v21-modal-overlay">
          <form
            className="v21-modal-window"
            role="dialog"
            aria-modal="true"
            aria-label="Submit work evidence"
            data-testid="officer-evidence-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (!photo || !location) return;
              void execute(async () => {
                await fieldOperations.submitEvidence(uploadFor, {
                  afterPhoto: photo,
                  beforePhoto: beforePhoto || null,
                  location,
                });
                setUploadFor(null);
                setPhoto(null);
                setBeforePhoto(null);
              }, 'Proof submitted for head review. The work is not verified yet.');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v21-text-tertiary)' }}>
                  ON-SITE EVIDENCE
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--v21-text-main)' }}>
                  Show the completed work
                </h2>
              </div>
              <button
                className="v21-btn"
                type="button"
                onClick={() => setUploadFor(null)}
                style={{ padding: '4px', minHeight: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--v21-text-muted)', marginBottom: '14px' }}>
              Capture a clear photograph and share your current GPS coordinates. Photo authenticity is verified by your department head.
            </p>

            {/* Split Photo Dropzones: Optional Before Photo & Mandatory After Photo */}
            <div className="v21-upload-split">
              <div className="v21-upload-zone">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-text-muted)', display: 'block', marginBottom: '6px' }}>
                  Initial Condition (Optional)
                </span>
                <input
                  id="field-before-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setBeforePhoto(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="field-before-photo"
                  className="v21-btn"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '11px', minHeight: '34px' }}
                >
                  <Upload size={12} />
                  <span>{beforePhoto ? beforePhoto.name.slice(0, 14) : 'Upload Before'}</span>
                </label>
              </div>

              <div className="v21-upload-zone" style={{ borderColor: 'var(--v21-accent)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v21-accent)', display: 'block', marginBottom: '6px' }}>
                  Repaired Issue (Mandatory)
                </span>
                <input
                  id="field-proof-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  required
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="field-proof-photo"
                  className="v21-btn v21-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '11px', minHeight: '34px' }}
                >
                  <Camera size={12} />
                  <span>{photo ? photo.name.slice(0, 14) : 'Capture After'}</span>
                </label>
              </div>
            </div>

            {/* Explicit GPS Telemetry Module */}
            <div className="v21-gps-badge">
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--v21-text-main)' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {location
                    ? `Lat: ${location.latitude.toFixed(5)}, Lng: ${location.longitude.toFixed(5)}`
                    : 'GPS coordinates not acquired'}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)' }}>
                  {location ? `Accuracy: ±${Math.round(location.accuracy)}m` : 'Tap to fetch device coordinates'}
                </span>
              </div>
              <button
                type="button"
                className="v21-btn"
                onClick={getPosition}
                style={{ fontSize: '11px', minHeight: '32px' }}
              >
                <Compass size={13} />
                <span>Acquire GPS</span>
              </button>
            </div>

            {locationError && (
              <p style={{ fontSize: '11px', color: 'var(--v21-danger)', margin: '0 0 12px 0' }}>
                {locationError}. Ensure location permission is allowed.
              </p>
            )}

            <button
              className="v21-btn v21-btn-primary"
              type="submit"
              disabled={busy || !photo || !location || photo.size > 1048576 || (beforePhoto !== null && beforePhoto.size > 1048576)}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', backgroundColor: 'var(--v3-action)', color: 'var(--v3-onaction)', minHeight: '44px' }}
            >
              <span>Submit for verification</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
