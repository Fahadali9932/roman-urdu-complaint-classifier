import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  Maximize2,
  X,
  AlertTriangle,
  CheckCircle2,
  Link2,
  UserPlus,
} from 'lucide-react';
import type { DepartmentId } from '../../../types';
import { type HeadIndependentComplaintRow } from '../../../services/CaseOperationsService';
import {
  fieldOperations,
  type CandidateWorkOrderMatch,
  type DepartmentOfficer,
} from '../services/fieldOperations';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import { DepartmentDeadlinePicker } from './DepartmentDeadlinePicker';

interface HeadComplaintDetailViewProps {
  departmentId: DepartmentId;
  complaint: HeadIndependentComplaintRow;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onAssigned: () => Promise<void> | void;
}

const localInputDateTime = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const defaultDueInput = () => {
  const d = new Date(Date.now() + 3 * 86400000);
  d.setHours(17, 0, 0, 0);
  return localInputDateTime(d);
};

function formatPktDateTime(iso: string): string {
  try {
    return (
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Karachi',
        hour12: true,
      })
        .format(new Date(iso))
        .replace(',', ' ·') + ' PKT'
    );
  } catch {
    return iso;
  }
}

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
      className="v16-map-frame"
      aria-label={`Submitted GPS map at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
    />
  );
};

export const HeadComplaintDetailView: React.FC<HeadComplaintDetailViewProps> = ({
  departmentId,
  complaint,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onBack,
  onAssigned,
}) => {
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [zoomPhoto, setZoomPhoto] = useState(false);

  // Assignment + duplicate advisory state
  const [assignStep, setAssignStep] = useState<'idle' | 'advisory' | 'separate'>('idle');
  const [checkingCandidates, setCheckingCandidates] = useState(false);
  const [candidates, setCandidates] = useState<CandidateWorkOrderMatch[]>([]);
  const [includeUncertain, setIncludeUncertain] = useState(false);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [dueInput, setDueInput] = useState(defaultDueInput);
  const [minDueInput] = useState(() => localInputDateTime(new Date()));
  const [instructions, setInstructions] = useState(
    'Inspect site, remediate reported issue, and upload geotagged verification proof.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const opKeyRef = useRef<string>('');

  // Reset per-complaint transient states cleanly on Prev/Next navigation
  useEffect(() => {
    setAssignStep('idle');
    setCandidates([]);
    setIncludeUncertain(false);
    setSelectedOfficer('');
    setFeedback(null);
    setZoomPhoto(false);
    opKeyRef.current = `v16-${complaint.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, [complaint.id]);

  // Fetch authorized citizen pin & signed photo strictly on single detail inspection
  useEffect(() => {
    let active = true;
    setPin(null);
    setPhotoUrl(null);
    setEvidenceError('');

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    setEvidenceLoading(true);
    const client = supabase;
    Promise.all([
      client
        .from('complaint_geo_points')
        .select('latitude, longitude')
        .eq('complaint_id', complaint.id)
        .maybeSingle(),
      client
        .from('complaint_evidence')
        .select('storage_path')
        .eq('complaint_id', complaint.id)
        .maybeSingle(),
    ])
      .then(async ([geoRes, photoRes]) => {
        if (!active) return;
        if (geoRes.error || photoRes.error) {
          setEvidenceError('Authorized evidence could not be loaded for this complaint.');
          return;
        }
        if (geoRes.data) {
          const lat = Number(geoRes.data.latitude);
          const lon = Number(geoRes.data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            setPin({ latitude: lat, longitude: lon });
          }
        }
        if (photoRes.data?.storage_path) {
          const { data: signed, error: signErr } = await client.storage
            .from('complaint-evidence-private')
            .createSignedUrl(photoRes.data.storage_path, 600);
          if (active) {
            if (signErr || !signed?.signedUrl) {
              setEvidenceError('Citizen photo could not be loaded.');
            } else {
              setPhotoUrl(signed.signedUrl);
            }
          }
        }
      })
      .catch(() => {
        if (active) setEvidenceError('Unable to fetch complaint attachments.');
      })
      .finally(() => {
        if (active) setEvidenceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [complaint.id]);

  const loadCandidatesAndOfficers = async (uncertain = includeUncertain) => {
    setCheckingCandidates(true);
    setFeedback(null);
    try {
      const [found, roster] = await Promise.all([
        fieldOperations.findCandidateOrders(departmentId, complaint.id, 30, uncertain, {
          issueTypes: complaint.issueTypes,
          pin,
        }),
        fieldOperations.officersDirectory(departmentId),
      ]);
      setCandidates(found);
      setOfficers(roster.filter((o) => o.staff_role === 'officer' && o.membership_status !== 'suspended'));
      if (found.length > 0) {
        setAssignStep('advisory');
      } else {
        setAssignStep('separate');
      }
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to check active work orders.',
      });
    } finally {
      setCheckingCandidates(false);
    }
  };

  const handleAttachToExisting = async (orderId: string) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await fieldOperations.attachReportToWorkOrder({
        departmentId,
        orderId,
        complaintId: complaint.id,
        idempotencyKey: opKeyRef.current || `attach-${complaint.id}-${Date.now()}`,
        reason: 'Supervisor confirmed same physical incident from detail review',
      });
      setFeedback({ ok: true, text: 'Report linked to existing active work order. Citizen timeline updated.' });
      setAssignStep('idle');
      await onAssigned();
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to link complaint to work order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSeparateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer) return;
    const dueMs = new Date(dueInput).getTime();
    if (!Number.isFinite(dueMs) || dueMs <= Date.now()) {
      setFeedback({ ok: false, text: 'Select a future PKT deadline before assigning.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await fieldOperations.createWorkOrderWithAdvisory({
        departmentId,
        complaintId: complaint.id,
        officerId: selectedOfficer,
        dueAt: new Date(dueInput).toISOString(),
        instructions: instructions.trim(),
        caseLabel: complaint.heading.slice(0, 80),
        idempotencyKey: opKeyRef.current || `create-${complaint.id}-${Date.now()}`,
        expectedCandidateOrderIds: candidates.map((c) => c.order_id),
      });
      setFeedback({ ok: true, text: 'New work order created and officer dispatched.' });
      setAssignStep('idle');
      await onAssigned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assignment failed.';
      if (msg.includes('STALE_CANDIDATES')) {
        await loadCandidatesAndOfficers(includeUncertain);
        setFeedback({
          ok: false,
          text: 'A matching nearby active work order was just created concurrently. Review updated candidates before confirming.',
        });
      } else {
        setFeedback({ ok: false, text: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyLinked = Boolean(complaint.workOrderId);
  const canAssign =
    !alreadyLinked &&
    complaint.status !== 'resolved' &&
    complaint.status !== 'rejected';

  const unknownIssue = complaint.issueTypes.every((t) =>
    ['general', 'unknown', 'other', 'uncategorized', 'unclassified', 'unspecified', ''].includes(
      t.trim().toLowerCase()
    )
  );

  return (
    <article className="v16-detail-page" data-testid="v16-complaint-detail">
      {/* Top Action & Prev/Next Bar */}
      <div className="v16-detail-nav">
        <button type="button" className="v15-surface-btn" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.75} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="v15-surface-btn"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Previous complaint"
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
            <span>Previous</span>
          </button>
          <button
            type="button"
            className="v15-surface-btn"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Next complaint"
          >
            <span>Next</span>
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Flat Header Metadata */}
      <header className="v16-detail-header">
        <div className="v16-detail-ref-row">
          <span className="v15-row-ref">{complaint.referenceNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{formatPktDateTime(complaint.submittedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="v15-status-tag">{complaint.status.replace('_', ' ')}</span>
        </div>

        <h1 className="v16-detail-title">{complaint.heading}</h1>

        <p className="v16-detail-location">
          <MapPin size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {complaint.publicPlace}
            {complaint.locality ? `, ${complaint.locality}` : ''}
          </span>
        </p>

        {feedback && (
          <div
            role={feedback.ok ? 'status' : 'alert'}
            className={`v16-feedback-line ${feedback.ok ? 'is-ok' : 'is-err'}`}
          >
            {feedback.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Direct Assignment Action */}
        <div className="v16-detail-actions">
          {alreadyLinked ? (
            <div className="v16-assigned-note">
              Linked to active work order{' '}
              <strong>{complaint.assignedOfficerName || 'assigned officer'}</strong> (
              {complaint.workOrderStatus?.replace('_', ' ') || 'in progress'}).
            </div>
          ) : canAssign ? (
            <button
              type="button"
              className="v15-primary-btn"
              disabled={checkingCandidates}
              onClick={() => void loadCandidatesAndOfficers(includeUncertain)}
            >
              <UserPlus size={15} strokeWidth={1.75} />
              <span>{checkingCandidates ? 'Checking nearby work orders…' : 'Assign'}</span>
            </button>
          ) : null}

          {unknownIssue && canAssign && assignStep === 'idle' && (
            <label className="v16-uncertain-toggle">
              <input
                type="checkbox"
                checked={includeUncertain}
                onChange={(e) => setIncludeUncertain(e.target.checked)}
              />
              <span>Include uncertain nearby department work orders (subtype unknown)</span>
            </label>
          )}
        </div>
      </header>

      {/* Compact Candidate Duplicate Advisory — ONLY rendered when candidates exist */}
      {assignStep === 'advisory' && candidates.length > 0 && (
        <section className="v16-advisory-strip" role="region" aria-label="Nearby active work orders">
          <div className="v16-advisory-head">
            <AlertTriangle size={17} strokeWidth={1.75} aria-hidden="true" />
            <div>
              <strong>Nearby active work order detected within 30 m</strong>
              <p>
                Verify physically whether this describes the exact same incident before deciding. Physical identity remains a supervisor decision.
              </p>
            </div>
          </div>

          <div className="v16-candidate-list">
            {candidates.map((cand) => (
              <div key={cand.order_id} className="v16-candidate-row">
                <div className="v16-candidate-info">
                  <div className="v16-candidate-title">
                    {cand.case_label}{' '}
                    {cand.match_confidence === 'uncertain_subtype_pin' && (
                      <span className="v15-status-tag is-proof">Uncertain match</span>
                    )}
                  </div>
                  <div className="v16-candidate-meta">
                    <span>Order {cand.order_id.slice(0, 8)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Ref {cand.anchor_reference}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cand.public_location}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cand.distance_m} m away</span>
                    <span aria-hidden="true">·</span>
                    <span>Officer: {cand.officer_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Status: {cand.status.replace('_', ' ')}</span>
                  </div>
                </div>

                {cand.can_direct_attach ? (
                  <button
                    type="button"
                    className="v15-primary-btn"
                    disabled={submitting}
                    onClick={() => void handleAttachToExisting(cand.order_id)}
                  >
                    <Link2 size={14} strokeWidth={1.75} />
                    <span>Same issue — link to order</span>
                  </button>
                ) : (
                  <span className="v16-proof-block-note">
                    Proof review pending — verify proof or assign separately
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="v16-advisory-footer">
            <button type="button" className="v15-surface-btn" onClick={() => setAssignStep('idle')}>
              Cancel
            </button>
            <button type="button" className="v15-surface-btn" onClick={() => setAssignStep('separate')}>
              Different issue — assign separately
            </button>
          </div>
        </section>
      )}

      {/* Separate Officer Assignment Form */}
      {assignStep === 'separate' && (
        <form className="v16-assign-panel" onSubmit={(e) => void handleCreateSeparateOrder(e)}>
          <div className="v16-assign-panel-head">
            <h2>Assign officer & deadline</h2>
            <button type="button" className="v15-quiet-link" onClick={() => setAssignStep('idle')}>
              Cancel
            </button>
          </div>

          <div className="v16-assign-field">
            <label htmlFor="v16-assign-officer">Field officer</label>
            <select
              id="v16-assign-officer"
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              required
            >
              <option value="">Choose active field officer</option>
              {officers.map((o) => (
                <option key={o.user_id} value={o.user_id}>
                  {o.display_name} ({o.active_cases} open)
                </option>
              ))}
            </select>
          </div>

          <div className="v16-assign-field">
            <DepartmentDeadlinePicker
              id="v16-detail-deadline"
              label="Work deadline (PKT)"
              value={dueInput}
              min={minDueInput}
              onChange={setDueInput}
            />
          </div>

          <div className="v16-assign-field">
            <label htmlFor="v16-assign-notes">Instructions</label>
            <textarea
              id="v16-assign-notes"
              rows={3}
              minLength={8}
              maxLength={1200}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
            />
          </div>

          <div className="v16-assign-submit-row">
            <button type="button" className="v15-surface-btn" onClick={() => setAssignStep('idle')}>
              Cancel
            </button>
            <button
              type="submit"
              className="v15-primary-btn"
              disabled={submitting || !selectedOfficer || instructions.trim().length < 8}
            >
              {submitting ? 'Assigning…' : 'Confirm assignment'}
            </button>
          </div>
        </form>
      )}

      {/* Flat Reading Sections */}
      <section className="v16-reading-section" aria-label="Sanitized complaint narrative">
        <h2>Sanitized complaint</h2>
        <p className="v16-reading-prose">{complaint.sanitizedText}</p>
      </section>

      <section className="v16-reading-section" aria-label="Uploaded photos">
        <h2>Uploaded photo</h2>
        {evidenceLoading ? (
          <p className="v16-missing-note">Loading authorized photo…</p>
        ) : evidenceError ? (
          <p className="v16-missing-note">{evidenceError}</p>
        ) : photoUrl ? (
          <div className="v16-photo-wrap">
            <img
              src={photoUrl}
              alt={`Citizen evidence for ${complaint.referenceNumber}`}
              className="v16-photo-preview"
              onClick={() => setZoomPhoto(true)}
            />
            <button
              type="button"
              className="v15-surface-btn"
              onClick={() => setZoomPhoto(true)}
            >
              <Maximize2 size={14} strokeWidth={1.75} />
              <span>View full image</span>
            </button>
          </div>
        ) : (
          <p className="v16-missing-note">
            <Camera size={14} strokeWidth={1.75} style={{ display: 'inline', marginRight: 6 }} />
            No citizen photograph attached to this complaint.
          </p>
        )}
      </section>

      <section className="v16-reading-section" aria-label="Submitted GPS location">
        <h2>Submitted GPS location</h2>
        {pin ? (
          <>
            <p className="v16-gps-coords">
              {pin.latitude.toFixed(5)}° N, {pin.longitude.toFixed(5)}° E
            </p>
            <AuthorizedComplaintMap
              latitude={pin.latitude}
              longitude={pin.longitude}
              label={`${complaint.referenceNumber} · ${complaint.publicPlace}`}
            />
          </>
        ) : (
          <p className="v16-missing-note">No citizen-confirmed GPS pin recorded for this complaint.</p>
        )}
      </section>

      {/* Authorized Photo Full View Modal */}
      {zoomPhoto && photoUrl && (
        <div
          className="v16-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full citizen photograph view"
          onClick={() => setZoomPhoto(false)}
        >
          <button
            type="button"
            className="v15-surface-btn v16-lightbox-close"
            onClick={() => setZoomPhoto(false)}
            aria-label="Close full photograph view"
          >
            <X size={16} />
            <span>Close</span>
          </button>
          <img
            src={photoUrl}
            alt={`Full-size citizen photograph for ${complaint.referenceNumber}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
};
