import React, { useState, useMemo, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ParallaxComplaintList, type ParallaxComplaintItem } from './ParallaxComplaintList';
import { ImageLightbox } from './ImageLightbox';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';
import { type DepartmentOfficer, type CandidateWorkOrderMatch } from '../../services/fieldOperations';
import { MapPin, CheckCircle2, X, Search, AlertTriangle, ArrowLeft, Send, Clock } from 'lucide-react';

/** Flat read-only GPS map inside an authenticated detail panel using OpenStreetMap free tiles. */
const AuthorizedComplaintMap: React.FC<{ latitude: number; longitude: number; label: string }> = ({
  latitude,
  longitude,
  label,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const instance = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
    }).setView([latitude, longitude], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(instance);
    L.circleMarker([latitude, longitude], {
      radius: 8,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#007AFF',
      fillOpacity: 0.92,
    })
      .addTo(instance)
      .bindPopup(label);
    mapRef.current = instance;
    const t = window.setTimeout(() => instance.invalidateSize(), 60);
    return () => {
      window.clearTimeout(t);
      try {
        instance.remove();
      } catch {
        // Ignore teardown race
      }
      mapRef.current = null;
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '200px', borderRadius: '12px' }}
      aria-label={`Submitted GPS map at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
    />
  );
};

export interface HodComplaintsViewProps {
  departmentId?: string;
  departmentCode: string;
  complaints: HeadIndependentComplaintRow[];
  officers: DepartmentOfficer[];
  onRejectComplaint: (complaintId: string, reason: string) => Promise<void>;
  onAssignComplaint: (
    complaintId: string,
    officerId: string,
    durationHours: number,
    instructions: string,
    attachToOrderId?: string
  ) => Promise<void>;
  onFindCandidates?: (lat: number, lng: number, issueTypes: string[]) => Promise<CandidateWorkOrderMatch[]>;
  isLoading?: boolean;
}

/**
 * V20 HOD Incoming Complaints & Assignment Flow
 * Architecture:
 * - Deterministic priority-first sorting (Critical/Urgent > High > Normal/Medium > Routine).
 * - Full-width hardware-accelerated ParallaxComplaintList.
 * - Dedicated Reading Detail View.
 * - Dedicated Full-Width Assignment Destination View (viewMode === 'assign'):
 *   1. Clean return navigation back to complaint details.
 *   2. Complaint summary header & reference.
 *   3. 30m duplicate incident advisory for single-click order consolidation.
 *   4. Rich officer roster grid with workload, rating badges, resolved cases, and clear selection cards.
 *   5. Duration picker pills (24h, 48h, 72h, 5d, 7d).
 *   6. Operational instructions input.
 *   7. Direct dispatch confirmation.
 */
export const HodComplaintsView: React.FC<HodComplaintsViewProps> = ({
  departmentCode,
  complaints,
  officers,
  onRejectComplaint,
  onAssignComplaint,
  onFindCandidates,
  isLoading = false,
}) => {
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Rejection Modal State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Dedicated Assignment View State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [durationHours, setDurationHours] = useState(72);
  const [instructions, setInstructions] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState<CandidateWorkOrderMatch[]>([]);
  const [selectedAttachOrderId, setSelectedAttachOrderId] = useState<string | undefined>(undefined);
  const [isAssignSuccessOpen, setIsAssignSuccessOpen] = useState(false);
  const [assignedDetails, setAssignedDetails] = useState<{
    officerName: string;
    refNum: string;
    deadlineHours: number;
  } | null>(null);

  // Filter only actionable, unassigned incoming complaints
  const unassignedComplaints = useMemo(() => {
    return complaints.filter(
      (c) => (c.status === 'submitted' || c.status === 'under_review' || c.status === 'assigned') && (!c.workOrderStatus || c.workOrderStatus === 'assigned')
    );
  }, [complaints]);

  // Distinct areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    unassignedComplaints.forEach((c) => {
      if (c.locality) set.add(c.locality);
    });
    return Array.from(set).sort();
  }, [unassignedComplaints]);

  // Priority-first deterministic sorting and query filtering
  const filteredItems = useMemo(() => {
    const priorityWeight: Record<string, number> = {
      critical: 4,
      urgent: 4,
      high: 3,
      normal: 2,
      medium: 2,
      routine: 1,
    };

    return unassignedComplaints
      .filter((c) => {
        if (areaFilter !== 'all' && c.locality !== areaFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            c.referenceNumber.toLowerCase().includes(q) ||
            c.heading.toLowerCase().includes(q) ||
            (c.publicPlace && c.publicPlace.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const weightA = priorityWeight[a.priority.toLowerCase()] || 1;
        const weightB = priorityWeight[b.priority.toLowerCase()] || 1;
        if (weightB !== weightA) return weightB - weightA;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [unassignedComplaints, areaFilter, searchQuery]);

  // Convert to parallax list items
  const parallaxItems: ParallaxComplaintItem[] = useMemo(() => {
    return filteredItems.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      heading: c.heading,
      publicLocation: `${c.publicPlace || 'Location unspecified'}${c.locality ? `, ${c.locality}` : ''}`,
      priority: c.priority.toLowerCase() as any,
      status: 'Unassigned',
      submittedAt: new Date(c.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }));
  }, [filteredItems]);

  const activeComplaint = useMemo(() => {
    return unassignedComplaints.find((c) => c.id === selectedComplaintId) || null;
  }, [unassignedComplaints, selectedComplaintId]);

  // Handle opening dedicated assignment destination view
  const handleOpenAssign = async () => {
    if (!activeComplaint) return;
    setIsAssignOpen(true);
    setCandidateMatches([]);
    setSelectedAttachOrderId(undefined);

    // If GPS coordinates exist and candidate finder is available, search for 30m duplicate advisories
    if (activeComplaint.latitude && activeComplaint.longitude && onFindCandidates) {
      try {
        const matches = await onFindCandidates(
          activeComplaint.latitude,
          activeComplaint.longitude,
          activeComplaint.issueTypes || []
        );
        setCandidateMatches(matches);
      } catch (err) {
        console.warn('Candidate advisory search error:', err);
      }
    }
  };

  const handleConfirmReject = async () => {
    if (!activeComplaint || !rejectReason.trim()) return;
    setIsSubmittingReject(true);
    try {
      await onRejectComplaint(activeComplaint.id, rejectReason.trim());
      setIsRejectOpen(false);
      setRejectReason('');
      setSelectedComplaintId(null);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!activeComplaint || !selectedOfficerId) return;
    setIsSubmittingAssign(true);
    try {
      await onAssignComplaint(
        activeComplaint.id,
        selectedOfficerId,
        durationHours,
        instructions.trim(),
        selectedAttachOrderId
      );
      const officer = officers.find((o) => o.user_id === selectedOfficerId);
      setAssignedDetails({
        officerName: officer?.display_name || 'Assigned Officer',
        refNum: activeComplaint.referenceNumber,
        deadlineHours: durationHours,
      });
      setIsAssignOpen(false);
      setIsAssignSuccessOpen(true);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div data-testid="v19-hod-complaints" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Lightbox for citizen photo */}
      <ImageLightbox
        imageUrl={lightboxImg}
        caption="Citizen-submitted complaint evidence"
        onClose={() => setLightboxImg(null)}
        watermarkText={`${departmentCode} · HOD INSPECTION`}
      />

      {/* Top Filter & Search Bar - only shown when not inside detail/assign view */}
      {!activeComplaint && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v20-text-primary)' }}>
              Incoming Complaints
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--v20-text-muted)', margin: '4px 0 0' }}>
              Actionable unassigned citizen reports requiring departmental assignment or rejection
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            {/* Responsive Search Box */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '180px', maxWidth: '320px', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--v20-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search reference, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 14px 8px 32px',
                  borderRadius: '9999px',
                  background: 'var(--v20-glass-surface)',
                  border: '1px solid var(--v20-glass-border)',
                  color: 'var(--v20-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--v20-text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Area Filter */}
            {areas.length > 0 && (
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  background: 'var(--v20-glass-surface)',
                  border: '1px solid var(--v20-glass-border)',
                  color: 'var(--v20-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Areas ({unassignedComplaints.length})</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area: Dedicated Assign View vs Reading Detail View vs Parallax List */}
      {activeComplaint ? (
        isAssignOpen ? (
          /* Dedicated Full-Width Assignment Destination View */
          <div
            className="v19-glass-card v20-assignment-view"
            role="dialog"
            aria-label="Assign complaint to officer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              padding: '36px 40px',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Navigation & Context Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--v20-glass-border)',
                paddingBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  className="v19-nav-tab"
                  onClick={() => setIsAssignOpen(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <ArrowLeft size={15} />
                  <span>Back to Complaint Details</span>
                </button>
                <span className="v20-ref-num" style={{ fontSize: '13.5px' }}>
                  DISPATCH WORK ORDER · #{activeComplaint.referenceNumber}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`v19-priority-square ${activeComplaint.priority.toLowerCase()}`}
                  style={{ width: 'auto', height: 'auto', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}
                >
                  {activeComplaint.priority.toUpperCase()} PRIORITY
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(223, 165, 29, 0.15)',
                    color: 'var(--v20-accent, #DFA51D)',
                    border: '1px solid rgba(223, 165, 29, 0.3)',
                  }}
                >
                  Assignment Mode
                </span>
              </div>
            </div>

            {/* Complaint Summary Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.22)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid var(--v20-glass-border)',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16.5px', fontWeight: 600, color: 'var(--v20-text-primary)', margin: '0 0 4px' }}>
                  {activeComplaint.heading}
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--v20-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: 'var(--v20-accent, #DFA51D)' }} />
                  <span>{activeComplaint.publicPlace || 'Location unspecified'}{activeComplaint.locality ? `, ${activeComplaint.locality}` : ''}</span>
                </div>
              </div>

              {activeComplaint.photoUrl && (
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'zoom-in',
                    border: '1px solid var(--v20-glass-border)',
                    flexShrink: 0,
                  }}
                  onClick={() => setLightboxImg(activeComplaint.photoUrl || null)}
                >
                  <img src={activeComplaint.photoUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* 30m Duplicate Incident Advisory Banner */}
            {candidateMatches.length > 0 && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#F59E0B' }}>
                  <AlertTriangle size={18} />
                  <span>30m Incident Advisory: Existing Work Order Found In Immediate Vicinity</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  An active work order exists within 30 metres of this incident. You can attach this complaint to consolidate fieldwork under a single dispatch, preventing duplicate officer travel.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {candidateMatches.map((cand) => (
                    <label
                      key={cand.order_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: 'var(--v20-text-primary)',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: selectedAttachOrderId === cand.order_id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0,0,0,0.2)',
                        border: selectedAttachOrderId === cand.order_id ? '1px solid #F59E0B' : '1px solid transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="attachOrder"
                        checked={selectedAttachOrderId === cand.order_id}
                        onChange={() => {
                          setSelectedAttachOrderId(cand.order_id);
                          setSelectedOfficerId(cand.officer_id);
                        }}
                      />
                      <span>
                        Consolidate into Order <strong>#{cand.anchor_reference}</strong> ({cand.officer_name} · {cand.distance_m.toFixed(0)}m away)
                      </span>
                    </label>
                  ))}
                  {selectedAttachOrderId && (
                    <button
                      type="button"
                      onClick={() => setSelectedAttachOrderId(undefined)}
                      style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#F59E0B', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' }}
                    >
                      Clear consolidation (dispatch as independent work order)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Officer Selection Roster Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Select Field Officer Roster
                </span>
                <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                  {officers.filter((o) => o.membership_status !== 'suspended').length} active field officers available
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '14px',
                }}
              >
                {officers
                  .filter((o) => o.membership_status !== 'suspended')
                  .map((off) => {
                    const isSelected = selectedOfficerId === off.user_id;
                    return (
                      <div
                        key={off.user_id}
                        onClick={() => setSelectedOfficerId(off.user_id)}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '16px',
                          background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'var(--v20-glass-surface)',
                          border: isSelected ? '2px solid rgba(255, 255, 255, 0.45)' : '1px solid var(--v20-glass-border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: isSelected ? '0 4px 20px rgba(0, 0, 0, 0.35)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--v20-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {off.display_name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--v20-text-muted)' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                              {off.active_cases || 0} Active Cases
                            </span>
                            <span>·</span>
                            <span>{off.verified_cases || 0} Resolved</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {isSelected ? (
                            <CheckCircle2 size={20} style={{ color: 'var(--success, #3BC977)' }} />
                          ) : (
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid var(--v20-glass-border)' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Permitted Completion Duration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Permitted Duration for Resolution
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--v20-text-primary)' }}>
                  {durationHours} Hours ({Math.round(durationHours / 24)} Days)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[24, 48, 72, 120, 168].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`v19-nav-tab ${durationHours === h ? 'is-active' : ''}`}
                    style={{
                      flex: '1 1 80px',
                      padding: '10px 0',
                      fontSize: '13px',
                      textAlign: 'center',
                      background: durationHours === h ? 'var(--button-primary, #F0ECE3)' : 'rgba(255, 255, 255, 0.05)',
                      color: durationHours === h ? '#101216' : 'var(--v20-text-primary)',
                      border: durationHours === h ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid var(--v20-glass-border)',
                      fontWeight: durationHours === h ? 700 : 500,
                      borderRadius: '12px',
                    }}
                    onClick={() => setDurationHours(h)}
                  >
                    {h}h ({Math.round(h / 24)}d)
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>Custom Resolution Target:</span>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={durationHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) setDurationHours(val);
                  }}
                  style={{
                    width: '84px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--v20-glass-border)',
                    color: 'var(--v20-text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--v20-font-number, monospace)',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>hours</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                <Clock size={14} style={{ color: 'var(--v20-text-secondary)' }} />
                <span>Notice: Official completion countdown begins strictly when the field officer taps &ldquo;Start Working&rdquo;.</span>
              </div>
            </div>

            {/* Supervisor Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v20-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Supervisor Instructions &amp; Directives
              </span>
              <textarea
                rows={3}
                placeholder="Specific instructions for the field officer (e.g. verify broken manhole cover on northern sidewalk, secure cordon before repair)..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1.5px solid var(--v20-glass-border)',
                  color: 'var(--v20-text-primary)',
                  fontSize: '13.5px',
                  resize: 'none',
                  boxSizing: 'border-box',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Bottom Action Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '14px',
                paddingTop: '20px',
                borderTop: '1px solid var(--v20-glass-border)',
              }}
            >
              <button
                type="button"
                className="v19-nav-tab"
                onClick={() => setIsAssignOpen(false)}
                style={{ padding: '10px 22px', fontSize: '13px' }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="v19-nav-tab"
                disabled={!selectedOfficerId || isSubmittingAssign}
                style={{
                  background: 'var(--button-primary, #F0ECE3)',
                  color: '#101216',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '11px 28px',
                  fontSize: '13.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
                }}
                onClick={handleConfirmAssign}
              >
                <Send size={15} />
                <span>{isSubmittingAssign ? 'Assigning…' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Dedicated Reading Detail View */
          <div
            className="v19-glass-card v20-complaint-detail"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              padding: '36px 40px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header row with back button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--v20-glass-border)',
                paddingBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  className="v19-nav-tab"
                  onClick={() => setSelectedComplaintId(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <ArrowLeft size={15} />
                  <span>Back to Inbox</span>
                </button>
                <span className="v20-ref-num" style={{ fontSize: '13.5px' }}>
                  REF #{activeComplaint.referenceNumber}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--v20-text-muted)' }}>
                  · Submitted {new Date(activeComplaint.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`v19-priority-square ${activeComplaint.priority.toLowerCase()}`}
                  style={{ width: 'auto', height: 'auto', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}
                >
                  {activeComplaint.priority.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>

            {/* 1. Centered Title */}
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <h3
                style={{
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  fontWeight: 700,
                  color: 'var(--v20-text-primary)',
                  letterSpacing: '-0.02em',
                  margin: '0 0 8px',
                  lineHeight: 1.3,
                }}
              >
                {activeComplaint.heading}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--v20-text-muted)' }}>
                Citizen Incident Report · Awaiting Departmental Action
              </div>
            </div>

            {/* 2. Structured Location Information & Free Leaflet Map */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(0,0,0,0.25)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid var(--v20-glass-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={20} style={{ color: 'var(--info, #4E9CFF)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '13.5px', flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--v20-text-primary)' }}>
                    {activeComplaint.publicPlace || 'Location unspecified'}
                    {activeComplaint.locality ? `, ${activeComplaint.locality}` : ''}
                  </div>
                  {activeComplaint.latitude && activeComplaint.longitude ? (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--v20-text-muted)',
                        marginTop: '4px',
                        fontFamily: 'var(--v20-font-number, monospace)',
                      }}
                    >
                      GPS: {activeComplaint.latitude.toFixed(5)}, {activeComplaint.longitude.toFixed(5)} ·{' '}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeComplaint.latitude},${activeComplaint.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--info, #4E9CFF)', textDecoration: 'none' }}
                      >
                        Open Directions ↗
                      </a>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--v20-text-muted)', marginTop: '4px' }}>
                      No precise GPS coordinates captured
                    </div>
                  )}
                </div>
              </div>

              {/* Free OpenStreetMap Leaflet Interactive View */}
              {activeComplaint.latitude && activeComplaint.longitude && (
                <div style={{ height: '200px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '6px' }}>
                  <AuthorizedComplaintMap
                    latitude={activeComplaint.latitude}
                    longitude={activeComplaint.longitude}
                    label={`${activeComplaint.referenceNumber} · ${activeComplaint.publicPlace || 'Incident location'}`}
                  />
                </div>
              )}
            </div>

            {/* 3. Sanitized Citizen Description Narrative */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--v20-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Citizen Complaint Narrative
              </span>
              <p
                style={{
                  fontSize: '14.5px',
                  lineHeight: 1.6,
                  color: 'var(--v20-text-secondary)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '18px 22px',
                  borderRadius: '16px',
                  border: '1px solid var(--v20-glass-border)',
                  margin: 0,
                }}
              >
                {activeComplaint.sanitizedText || activeComplaint.rawText || activeComplaint.factualSummary}
              </p>
            </div>

            {/* 4. Citizen Photographic Evidence */}
            {activeComplaint.photoUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--v20-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Citizen Photographic Evidence (Click to inspect)
                </span>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'zoom-in',
                    maxHeight: '280px',
                    border: '1.5px solid var(--v20-glass-border)',
                    width: 'fit-content',
                  }}
                  onClick={() => setLightboxImg(activeComplaint.photoUrl || null)}
                >
                  <img
                    src={activeComplaint.photoUrl}
                    alt="Citizen evidence thumbnail"
                    style={{ maxHeight: '280px', maxWidth: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#FFFFFF',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    Inspect Fullscreen ↗
                  </span>
                </div>
              </div>
            )}

            {/* 5. Reject & Accept Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '14px',
                paddingTop: '16px',
                borderTop: '1px solid var(--v20-glass-border)',
              }}
            >
              <button
                type="button"
                className="v19-nav-tab"
                style={{
                  color: '#EF5350',
                  background: 'rgba(229,57,53,0.12)',
                  border: '1px solid rgba(229,57,53,0.3)',
                  padding: '10px 22px',
                  fontWeight: 600,
                }}
                onClick={() => setIsRejectOpen(true)}
              >
                Reject Complaint
              </button>

              <button
                type="button"
                className="v19-nav-tab"
                style={{
                  background: 'var(--button-primary, #F0ECE3)',
                  color: '#101216',
                  fontWeight: 700,
                  padding: '10px 26px',
                  borderRadius: '9999px',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                }}
                onClick={handleOpenAssign}
              >
                Accept &amp; Assign ↗
              </button>
            </div>
          </div>
        )
      ) : (
        /* Full-Width Scroll-Linked Parallax Complaint List */
        <ParallaxComplaintList
          items={parallaxItems}
          selectedId={selectedComplaintId}
          onSelectItem={(item) => setSelectedComplaintId(item.id)}
          emptyMessage={isLoading ? 'Loading actionable complaints…' : 'No unassigned complaints in this view.'}
        />
      )}

      {/* Rejection Reason Modal */}
      {isRejectOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Reject complaint">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v20-text-primary)' }}>
                Reject Complaint #{activeComplaint?.referenceNumber}
              </span>
              <button type="button" className="v19-action-icon-btn" onClick={() => setIsRejectOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Please specify the operational reason for rejecting this complaint. This reason is logged on the permanent audit trail.
            </p>

            <textarea
              rows={3}
              placeholder="Jurisdiction belongs to provincial highway authority, duplicate report, out of municipal scope..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1.5px solid var(--v20-glass-border)',
                color: 'var(--v20-text-primary)',
                fontSize: '13px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="v19-nav-tab" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="v19-nav-tab"
                disabled={!rejectReason.trim() || isSubmittingReject}
                style={{ background: '#EF5350', color: '#FFFFFF', fontWeight: 600, border: 'none' }}
                onClick={handleConfirmReject}
              >
                {isSubmittingReject ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Assignment Success Confirmation Modal Dialog */}
      {isAssignSuccessOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Assignment Confirmed">
          <div
            className="v19-glass-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '36px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '28px',
              background: 'rgba(18, 15, 12, 0.96)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(67, 160, 71, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#66BB6A',
                border: '1.5px solid rgba(67, 160, 71, 0.35)',
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--v20-text-primary)' }}>
              Work Order Dispatched
            </h3>

            <p style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary)', margin: 0, lineHeight: 1.55 }}>
              Complaint <strong style={{ color: '#E2DBD0' }}>#{assignedDetails?.refNum}</strong> has been assigned to <strong style={{ color: 'var(--text-primary, #F3EEE4)' }}>{assignedDetails?.officerName}</strong> with a {assignedDetails?.deadlineHours}h resolution deadline.
            </p>

            <button
              type="button"
              className="v20-landing-btn v20-landing-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              onClick={() => {
                setIsAssignSuccessOpen(false);
                setSelectedOfficerId('');
                setInstructions('');
                setSelectedComplaintId(null);
              }}
            >
              <span>Return to Complaints Queue</span>
              <span className="v20-btn-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
