import React, { useState, useMemo } from 'react';
import { ParallaxComplaintList, type ParallaxComplaintItem } from './ParallaxComplaintList';
import { ImageLightbox } from './ImageLightbox';
import { type HeadIndependentComplaintRow } from '../../../../services/CaseOperationsService';
import { type DepartmentOfficer, type CandidateWorkOrderMatch } from '../../services/fieldOperations';
import { MapPin, CheckCircle2, X, Search, AlertTriangle } from 'lucide-react';

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
 * V19 HOD Incoming Complaints Inbox & Reading View
 * Features:
 * - Strictly actionable, unassigned complaints for authorized department
 * - NameThatUI-inspired scroll-linked parallax list
 * - Priority complaints appear first (Critical -> High -> Normal)
 * - Dedicated Reading Detail View:
 *   1. Centered Title
 *   2. Location info (area, locality, address, coordinates, map link)
 *   3. Sanitized complaint description
 *   4. Citizen photo gallery with ImageLightbox
 *   5. Controls: Reject (with reason modal) and Accept & Assign (drawer)
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

  // Assignment Drawer State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [durationHours, setDurationHours] = useState(72);
  const [instructions, setInstructions] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState<CandidateWorkOrderMatch[]>([]);
  const [selectedAttachOrderId, setSelectedAttachOrderId] = useState<string | undefined>(undefined);

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

  // Handle opening assignment drawer
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
      setIsAssignOpen(false);
      setSelectedOfficerId('');
      setInstructions('');
      setSelectedComplaintId(null);
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

      {/* Top Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--v19-text-primary)' }}>
            Incoming Complaints
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--v19-text-muted)', margin: '4px 0 0' }}>
            Actionable unassigned citizen reports requiring departmental assignment or rejection
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--v19-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search reference, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 14px 8px 32px',
                borderRadius: '9999px',
                background: 'var(--v19-glass-surface)',
                border: '1px solid var(--v19-glass-border)',
                color: 'var(--v19-text-primary)',
                fontSize: '12.5px',
                width: '200px',
                outline: 'none',
              }}
            />
          </div>

          {/* Area Filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '9999px',
              background: 'var(--v19-glass-surface)',
              border: '1px solid var(--v19-glass-border)',
              color: 'var(--v19-text-primary)',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#0F172A' }}>All Areas</option>
            {areas.map((a) => (
              <option key={a} value={a} style={{ background: '#0F172A' }}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two-Column View: Left List (Parallax) / Right Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: activeComplaint ? '1fr 1.25fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Scroll-Linked Parallax Complaint List */}
        <div>
          <ParallaxComplaintList
            items={parallaxItems}
            selectedId={selectedComplaintId}
            onSelectItem={(item) => setSelectedComplaintId(item.id)}
            emptyMessage={isLoading ? 'Loading actionable complaints…' : 'No unassigned complaints in this view.'}
          />
        </div>

        {/* Right: Individual Dedicated Complaint Reading View */}
        {activeComplaint && (
          <div className="v19-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '90px' }}>
            {/* Top Close / Reference Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--v19-glass-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-lime)', fontFamily: 'var(--v19-font-mono)' }}>
                  #{activeComplaint.referenceNumber}
                </span>
                <span className={`v19-priority-square ${activeComplaint.priority.toLowerCase()}`} style={{ width: '22px', height: '22px', fontSize: '10px' }}>
                  {activeComplaint.priority[0]}
                </span>
              </div>

              <button
                type="button"
                className="v19-action-icon-btn"
                style={{ width: '28px', height: '28px' }}
                onClick={() => setSelectedComplaintId(null)}
                aria-label="Close detail view"
              >
                <X size={14} />
              </button>
            </div>

            {/* 1. Prominently Centered Complaint Title */}
            <div style={{ textAlign: 'center', padding: '4px 12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v19-text-primary)', margin: 0, letterSpacing: '-0.015em' }}>
                {activeComplaint.heading}
              </h3>
            </div>

            {/* 2. Dedicated Location Information Area */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--v19-glass-border)' }}>
              <MapPin size={18} style={{ color: 'var(--v19-cyan)', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                  {activeComplaint.publicPlace || 'Location unspecified'}
                  {activeComplaint.locality ? `, ${activeComplaint.locality}` : ''}
                </div>
                {activeComplaint.latitude && activeComplaint.longitude ? (
                  <div style={{ fontSize: '11.5px', color: 'var(--v19-text-muted)', marginTop: '2px', fontFamily: 'var(--v19-font-mono)' }}>
                    GPS: {activeComplaint.latitude.toFixed(5)}, {activeComplaint.longitude.toFixed(5)} ·{' '}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeComplaint.latitude},${activeComplaint.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--v19-blue)', textDecoration: 'none' }}
                    >
                      Open Directions ↗
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: '11.5px', color: 'var(--v19-text-dim)', marginTop: '2px' }}>
                    No precise GPS coordinates captured
                  </div>
                )}
              </div>
            </div>

            {/* 3. Sanitized Complaint Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Citizen Description
              </span>
              <p style={{ fontSize: '13.5px', lineHeight: '1.5', color: 'var(--v19-text-secondary)', background: 'var(--v19-glass-subtle)', padding: '12px', borderRadius: '10px', margin: 0 }}>
                {activeComplaint.rawText || activeComplaint.sanitizedText || 'No detailed narrative provided.'}
              </p>
            </div>

            {/* 4. Citizen-Uploaded Photograph(s) */}
            {activeComplaint.photoUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Citizen Photographic Evidence (Click to inspect)
                </span>
                <div
                  style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', maxHeight: '160px', border: '1px solid var(--v19-glass-border)' }}
                  onClick={() => setLightboxImg(activeComplaint.photoUrl || null)}
                >
                  <img
                    src={activeComplaint.photoUrl}
                    alt="Citizen evidence thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(0,0,0,0.6)', color: '#FFFFFF' }}>
                    Inspect Lightbox ↗
                  </span>
                </div>
              </div>
            )}

            {/* 5. Reject & Accept Controls at Bottom Right */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--v19-glass-border)' }}>
              <button
                type="button"
                className="v19-nav-tab"
                style={{ color: 'var(--v19-red)', background: 'var(--v19-red-soft)', padding: '8px 16px' }}
                onClick={() => setIsRejectOpen(true)}
              >
                Reject Complaint
              </button>

              <button
                type="button"
                className="v19-nav-tab"
                style={{ background: 'var(--v19-lime)', color: '#0E121A', fontWeight: 600, padding: '8px 20px', boxShadow: '0 2px 10px var(--v19-lime-soft)' }}
                onClick={handleOpenAssign}
              >
                Accept &amp; Assign ↗
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {isRejectOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Reject complaint">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--v19-red)' }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Reject Department Responsibility</span>
              </div>
              <button type="button" className="v19-action-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setIsRejectOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--v19-text-secondary)', margin: 0 }}>
              Specify the operational reason for rejecting this complaint from {departmentCode}. The citizen will receive an official update.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Jurisdiction belongs to cantonment board / duplicate submission / out of scope..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--v19-glass-border)',
                color: 'var(--v19-text-primary)',
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
                style={{ background: 'var(--v19-red)', color: '#FFFFFF', fontWeight: 600 }}
                onClick={handleConfirmReject}
              >
                {isSubmittingReject ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Drawer / Modal */}
      {isAssignOpen && (
        <div className="v19-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Assign complaint to officer">
          <div className="v19-glass-card" style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                  Assign Field Officer
                </span>
                <div style={{ fontSize: '12px', color: 'var(--v19-text-muted)', marginTop: '2px' }}>
                  Select an active officer and specify the authorized completion duration.
                </div>
              </div>
              <button type="button" className="v19-action-icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setIsAssignOpen(false)}>
                <X size={14} />
              </button>
            </div>

            {/* V16 Duplicate Incident Advisory (30m matching) */}
            {candidateMatches.length > 0 && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--v19-amber-soft)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--v19-amber)' }}>
                  <AlertTriangle size={14} />
                  <span>30m Incident Advisory: Existing Work Order Found Nearby</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--v19-text-secondary)', margin: '4px 0 8px' }}>
                  An active work order exists within 30 metres. You may attach this complaint to consolidate work without duplicate dispatch.
                </p>
                {candidateMatches.map((cand) => (
                  <label
                    key={cand.order_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--v19-text-primary)',
                      cursor: 'pointer',
                      padding: '4px 0',
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
                    <span>Attach to order #{cand.anchor_reference} ({cand.officer_name} · {cand.distance_m.toFixed(0)}m away)</span>
                  </label>
                ))}
              </div>
            )}

            {/* Officer Selection Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                Eligible Department Officers
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {officers
                  .filter((o) => o.membership_status !== 'suspended')
                  .map((off) => {
                    const isSelected = selectedOfficerId === off.user_id;
                    return (
                      <div
                        key={off.user_id}
                        onClick={() => setSelectedOfficerId(off.user_id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'var(--v19-lime-soft)' : 'var(--v19-glass-surface)',
                          border: isSelected ? '1.5px solid var(--v19-lime)' : '1px solid var(--v19-glass-border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 120ms ease',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--v19-text-primary)' }}>
                            {off.display_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--v19-text-muted)' }}>
                            {off.active_cases} active · {off.verified_cases} resolved
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--v19-lime)' }} />}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Completion Duration Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                  Permitted Duration
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v19-lime)' }}>
                  {durationHours} Hours ({Math.round(durationHours / 24)} Days)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[24, 48, 72, 120, 168].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`v19-nav-tab ${durationHours === h ? 'is-active' : ''}`}
                    style={{ flex: 1, padding: '6px 0', fontSize: '12px', textAlign: 'center', background: durationHours === h ? 'var(--v19-lime)' : 'rgba(0,0,0,0.2)' }}
                    onClick={() => setDurationHours(h)}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--v19-text-dim)' }}>
                Notice: Completion countdown begins strictly when the officer presses &quot;Start Working&quot;.
              </span>
            </div>

            {/* Instructions Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-text-muted)', textTransform: 'uppercase' }}>
                Operational Instructions
              </span>
              <textarea
                rows={2}
                placeholder="Specific instructions for the field officer (e.g. inspect sewer manhole cover on north footpath)..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--v19-glass-border)',
                  color: 'var(--v19-text-primary)',
                  fontSize: '12.5px',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Confirm Assignment Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="v19-nav-tab" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="v19-nav-tab"
                disabled={!selectedOfficerId || isSubmittingAssign}
                style={{ background: 'var(--v19-lime)', color: '#0E121A', fontWeight: 600 }}
                onClick={handleConfirmAssign}
              >
                {isSubmittingAssign ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
