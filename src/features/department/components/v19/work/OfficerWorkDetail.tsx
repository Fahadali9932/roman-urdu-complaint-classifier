import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DepartmentWorkOrder } from '../../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../../services/CaseOperationsService';
import { trustedTimeService } from '../../../../../services/trustedTimeService';
import {
  buildGoogleMapsSearchUrl,
  buildGoogleMapsDirectionsUrl,
} from '../../../services/googleMapsLinks';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Camera,
  Navigation,
  RotateCcw,
  CheckCircle2,
  PlayCircle,
  UserCheck,
} from 'lucide-react';

export interface OfficerWorkDetailProps {
  order: DepartmentWorkOrder;
  complaint?: HeadIndependentComplaintRow | null;
  onBack: () => void;
  onStartWork?: (orderId: string) => void | Promise<void>;
  onOpenResolution: () => void;
  onOpenExtension: () => void;
  onOpenLightbox: (imageUrl: string) => void;
  isLoading?: boolean;
}

/** Free OpenStreetMap Leaflet mini preview map */
const MiniComplaintMap: React.FC<{ latitude: number; longitude: number; label: string }> = ({
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
      style={{
        width: '100%',
        height: '220px',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
      }}
      aria-label={`Incident map at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
    />
  );
};

export const OfficerWorkDetail: React.FC<OfficerWorkDetailProps> = ({
  order,
  complaint,
  onBack,
  onStartWork,
  onOpenResolution,
  onOpenExtension,
  onOpenLightbox,
  isLoading: _isLoading = false,
}) => {
  const nowMs = trustedTimeService.now().getTime();
  const isStarted = Boolean(order.started_at);
  const refNumber = complaint?.referenceNumber || order.anchor_complaint_id;
  const priority = (complaint?.priority || 'NORMAL').toUpperCase();

  // Location resolution
  const lat = complaint?.latitude ?? null;
  const lng = complaint?.longitude ?? null;
  const addressParts = [complaint?.publicPlace, complaint?.locality, complaint?.district].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  const combinedAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  // If complaint address is missing, extract location from case_label (e.g. before the dash "Main University Road — ...")
  let fallbackAddress: string | null = null;
  if (!combinedAddress && order.case_label) {
    const parts = order.case_label.split('—');
    if (parts.length > 0 && parts[0].trim()) {
      fallbackAddress = `${parts[0].trim()}, Karachi`;
    } else {
      fallbackAddress = `${order.case_label}, Karachi`;
    }
  }

  const effectiveAddress = combinedAddress || fallbackAddress;
  const searchUrl = buildGoogleMapsSearchUrl(lat, lng, effectiveAddress);
  const directionsUrl = buildGoogleMapsDirectionsUrl(lat, lng, effectiveAddress);

  // Time & deadline calculations
  const assignedAtFormatted = order.assigned_at
    ? new Date(order.assigned_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const startedAtFormatted = order.started_at
    ? new Date(order.started_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  let remainingDisplay = '';
  let isOverdue = false;
  let urgencyColor = 'var(--v20-text-secondary, #A6AEB8)';
  let deadlineFormatted = '';

  if (isStarted && order.started_at) {
    const startMs = new Date(order.started_at).getTime();
    const durationHours = order.assigned_duration_hours || 72;
    const deadlineMs = order.effective_deadline_at
      ? new Date(order.effective_deadline_at).getTime()
      : startMs + durationHours * 3600000;

    deadlineFormatted = new Date(deadlineMs).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const remMs = deadlineMs - nowMs;
    const remHours = Math.floor(remMs / 3600000);
    const remMins = Math.floor((remMs % 3600000) / 60000);
    isOverdue = remMs < 0;

    if (isOverdue) {
      remainingDisplay = `Overdue by ${Math.abs(remHours)}h ${Math.abs(remMins)}m`;
      urgencyColor = 'var(--danger, #E05656)';
    } else if (remHours < 4) {
      remainingDisplay = `${remHours}h ${remMins}m remaining`;
      urgencyColor = 'var(--danger, #E05656)';
    } else if (remHours < 24) {
      remainingDisplay = `${remHours}h ${remMins}m remaining`;
      urgencyColor = 'var(--warning, #E59B2F)';
    } else {
      remainingDisplay = `${remHours}h remaining`;
      urgencyColor = 'var(--success, #3BC977)';
    }
  } else {
    const durationHours = order.assigned_duration_hours || 72;
    remainingDisplay = `${durationHours} hours allocated`;
    deadlineFormatted = `Within ${durationHours} hours from start`;
  }

  return (
    <div
      data-testid="officer-work-detail"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* SECTION A: Dedicated Back Navigation Row (Above Document Card) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="v20-back-btn"
          data-testid="v21-8-back-to-work-list"
        >
          <ArrowLeft size={16} />
          <span>Back to my work</span>
        </button>
      </div>

      {/* Main Glass Document Container */}
      <div
        className="v19-glass-card v20-work-document"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          padding: '36px 40px',
          borderRadius: '24px',
          background: 'var(--v20-glass-surface, #111317)',
          border: '1px solid var(--v20-glass-border, #2A3038)',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* SECTION B: Document Header (Metadata & Centered Title) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            borderBottom: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
            paddingBottom: '24px',
          }}
        >
          {/* Metadata Row: Reference Left, Priority & Status Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 650,
                  color: 'var(--v20-text-secondary, #A6AEB8)',
                  fontFamily: 'var(--v20-font-number, monospace)',
                  letterSpacing: '0.02em',
                }}
              >
                REF #{refNumber}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Priority Badge */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background:
                    priority === 'CRITICAL' || priority === 'URGENT'
                      ? 'rgba(224, 86, 86, 0.15)'
                      : priority === 'HIGH'
                        ? 'rgba(229, 155, 47, 0.15)'
                        : 'rgba(78, 156, 255, 0.15)',
                  color:
                    priority === 'CRITICAL' || priority === 'URGENT'
                      ? 'var(--danger, #E05656)'
                      : priority === 'HIGH'
                        ? 'var(--warning, #E59B2F)'
                        : 'var(--info, #4E9CFF)',
                  border:
                    priority === 'CRITICAL' || priority === 'URGENT'
                      ? '1px solid rgba(224, 86, 86, 0.3)'
                      : priority === 'HIGH'
                        ? '1px solid rgba(229, 155, 47, 0.3)'
                        : '1px solid rgba(78, 156, 255, 0.3)',
                }}
              >
                {priority} PRIORITY
              </span>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: isStarted ? 'rgba(59, 201, 119, 0.12)' : 'rgba(229, 155, 47, 0.12)',
                  color: isStarted ? 'var(--success, #3BC977)' : 'var(--warning, #E59B2F)',
                  border: isStarted
                    ? '1px solid rgba(59, 201, 119, 0.25)'
                    : '1px solid rgba(229, 155, 47, 0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {isStarted ? 'In Progress' : 'Assigned (Pending Start)'}
              </span>
            </div>
          </div>

          {/* Centered Title & Incident Area */}
          <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
            <h2
              style={{
                fontSize: 'clamp(24px, 3.2vw, 34px)',
                fontWeight: 700,
                color: 'var(--v20-text-primary, #F3EEE4)',
                letterSpacing: '-0.025em',
                margin: '0 0 8px',
                lineHeight: 1.25,
              }}
            >
              {order.case_label || complaint?.heading || 'Municipal Fieldwork Complaint'}
            </h2>
            <div
              style={{
                fontSize: '14.5px',
                color: 'var(--v20-text-secondary, #A6AEB8)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={15} style={{ color: 'var(--info, #4E9CFF)' }} />
              <span>{effectiveAddress || 'Karachi, Sindh'}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: Work Timeline & Deadline (4 Clean Columns) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.22))',
            padding: '20px 24px',
            borderRadius: '18px',
            border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Assigned On
            </span>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--v20-text-primary, #F3EEE4)',
                marginTop: '4px',
              }}
            >
              {assignedAtFormatted}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Work Commenced
            </span>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--v20-text-primary, #F3EEE4)',
                marginTop: '4px',
              }}
            >
              {startedAtFormatted || 'Not yet started'}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Completion Deadline
            </span>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--v20-text-primary, #F3EEE4)',
                marginTop: '4px',
              }}
            >
              {deadlineFormatted}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Remaining Time
            </span>
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                color: urgencyColor,
                marginTop: '4px',
                fontFamily: 'var(--v20-font-number, monospace)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={15} />
              <span>{remainingDisplay}</span>
            </div>
          </div>
        </div>

        {/* SECTION D: Complaint Description (Sanitized) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--v20-text-muted, #7E858E)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Citizen Complaint Narrative
          </span>
          <div
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'var(--v20-text-secondary, #A6AEB8)',
              background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.2))',
              padding: '20px 24px',
              borderRadius: '16px',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
            }}
          >
            {complaint?.sanitizedText ||
              complaint?.factualSummary ||
              complaint?.rawText ||
              'Complaint description unavailable.'}
          </div>
        </div>

        {/* SECTION E: Location Information & Google Maps Integration */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.22))',
            padding: '22px 26px',
            borderRadius: '18px',
            border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <MapPin size={22} style={{ color: 'var(--info, #4E9CFF)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v20-text-primary, #F3EEE4)' }}>
                  {effectiveAddress || 'Incident location details pending verification'}
                </div>
                {lat !== null && lng !== null ? (
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--v20-text-muted, #7E858E)',
                      marginTop: '4px',
                      fontFamily: 'var(--v20-font-number, monospace)',
                    }}
                  >
                    GPS Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                ) : (
                  <div style={{ fontSize: '12.5px', color: 'var(--v20-text-muted, #7E858E)', marginTop: '4px' }}>
                    Coordinates not recorded · Navigation uses descriptive street address
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons: View location & Get directions (Proper Geometry, No Circular Clipping) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {searchUrl ? (
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v20-field-btn secondary"
                  data-testid="view-location-btn"
                >
                  <MapPin size={15} />
                  <span>View location ↗</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="v20-field-btn secondary"
                  style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                >
                  Location unavailable
                </button>
              )}

              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v20-field-btn accent-blue"
                  data-testid="get-directions-btn"
                >
                  <Navigation size={15} />
                  <span>Get directions ↗</span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Mini Preview Map */}
          {lat !== null && lng !== null && (
            <div style={{ marginTop: '4px' }}>
              <MiniComplaintMap
                latitude={lat}
                longitude={lng}
                label={`${refNumber} · ${combinedAddress || 'Incident Location'}`}
              />
            </div>
          )}
        </div>

        {/* SECTION F: Citizen Photographic Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--v20-text-muted, #7E858E)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Citizen Photographic Evidence
          </span>

          {complaint?.photoUrl ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '360px',
              }}
            >
              <div
                onClick={() => onOpenLightbox(complaint.photoUrl!)}
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <img
                  src={complaint.photoUrl}
                  alt="Citizen submitted evidence"
                  style={{
                    width: '100%',
                    maxHeight: '220px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#FFFFFF',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Click to inspect in lightbox
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--v20-text-muted, #7E858E)' }}>
                Photograph provided by reporting citizen at intake. Click to enlarge.
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '14px',
                background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.15))',
                border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.06))',
                fontSize: '13.5px',
                color: 'var(--v20-text-muted, #7E858E)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Camera size={16} />
              <span>No photographs attached by reporting citizen.</span>
            </div>
          )}
        </div>

        {/* SECTION G: Supervisor Instructions */}
        {order.instructions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Supervisor Directives &amp; Operational Directives
            </span>
            <div
              style={{
                fontSize: '14.5px',
                lineHeight: 1.55,
                color: 'var(--v20-text-primary, #F3EEE4)',
                background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.04))',
                padding: '18px 22px',
                borderRadius: '16px',
                border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
              }}
            >
              {order.instructions}
            </div>
          </div>
        )}

        {/* SECTION H: Work Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            paddingTop: '24px',
            borderTop: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} style={{ color: 'var(--v20-text-muted, #7E858E)' }} />
            <span style={{ fontSize: '13px', color: 'var(--v20-text-secondary, #A6AEB8)' }}>
              {isStarted
                ? 'Work is currently in progress. Submit photographic resolution upon physical completion.'
                : 'Work order assigned. Start working to begin field timer countdown.'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {!isStarted ? (
              <button
                type="button"
                className="v20-field-btn primary"
                data-testid="start-working-btn"
                onClick={() => onStartWork && onStartWork(order.id)}
              >
                <PlayCircle size={17} />
                <span>Start Working</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="v20-field-btn warning"
                  data-testid="request-more-time-btn"
                  onClick={onOpenExtension}
                >
                  <RotateCcw size={15} />
                  <span>Request more time</span>
                </button>

                <button
                  type="button"
                  className="v20-field-btn success"
                  data-testid="submit-completed-work-btn"
                  onClick={onOpenResolution}
                >
                  <CheckCircle2 size={17} />
                  <span>Submit completed work</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
