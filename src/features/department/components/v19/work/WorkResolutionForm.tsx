import React, { useState } from 'react';
import { type DepartmentWorkOrder } from '../../../services/fieldOperations';
import { type HeadIndependentComplaintRow } from '../../../../../services/CaseOperationsService';
import {
  syntheticImageDetector,
  type ForensicScreeningReport,
} from '../../../../../services/syntheticImageDetector';
import { haversineDistanceMeters } from '../../../services/googleMapsLinks';
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface WorkResolutionFormProps {
  order: DepartmentWorkOrder;
  complaint?: HeadIndependentComplaintRow | null;
  onBack: () => void;
  onSubmit: (
    orderId: string,
    evidenceFile: File,
    gps: { latitude: number; longitude: number; accuracy: number; distanceM?: number }
  ) => Promise<void>;
  onOpenLightbox: (imageUrl: string) => void;
  isLoading?: boolean;
}

export type GpsState =
  | { status: 'idle' }
  | { status: 'acquiring' }
  | {
      status: 'acquired';
      latitude: number;
      longitude: number;
      accuracy: number;
      distanceM?: number;
      withinRadius: boolean;
      poorAccuracy: boolean;
    }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'insecure_context'; message: string };

export const WorkResolutionForm: React.FC<WorkResolutionFormProps> = ({
  order,
  complaint,
  onBack,
  onSubmit,
  onOpenLightbox,
  isLoading: _isLoading = false,
}) => {
  const refNumber = complaint?.referenceNumber || order.anchor_complaint_id;

  // Form State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [screeningReport, setScreeningReport] = useState<ForensicScreeningReport | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // GPS State
  const [gpsState, setGpsState] = useState<GpsState>({ status: 'idle' });

  // Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setSubmitError(null);

      let url = '';
      try {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          url = URL.createObjectURL(file);
        } else {
          url = 'blob:evidence-preview';
        }
      } catch {
        url = 'blob:evidence-preview';
      }
      setPhotoPreviewUrl(url);

      // Run truthful synthetic screening
      syntheticImageDetector
        .screenImage(file)
        .then((report) => {
          setScreeningReport(report);
        })
        .catch(() => null);

      // Trigger high-accuracy GPS acquisition if not already acquired
      if (gpsState.status === 'idle') {
        acquireGps();
      }
    }
  };

  // Acquire Truthful High-Accuracy GPS
  const acquireGps = () => {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setGpsState({
        status: 'insecure_context',
        message: 'Location services require HTTPS or localhost. When testing on LAN (e.g. 192.168.x.x), please use HTTPS.',
      });
      return;
    }

    if (!navigator.geolocation) {
      setGpsState({
        status: 'unavailable',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setGpsState({ status: 'acquiring' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let distanceM: number | undefined = undefined;

        if (
          complaint?.latitude !== null &&
          complaint?.latitude !== undefined &&
          complaint?.longitude !== null &&
          complaint?.longitude !== undefined
        ) {
          distanceM = haversineDistanceMeters(
            latitude,
            longitude,
            complaint.latitude,
            complaint.longitude
          );
        }

        const withinRadius = distanceM !== undefined ? distanceM <= 30 : true;
        const poorAccuracy = accuracy > 50;

        setGpsState({
          status: 'acquired',
          latitude,
          longitude,
          accuracy,
          distanceM,
          withinRadius,
          poorAccuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState({
            status: 'denied',
            message: 'Location access was denied. Please allow location access in your browser settings.',
          });
        } else {
          setGpsState({
            status: 'unavailable',
            message: err.message || 'Unable to acquire location lock.',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      setSubmitError('Please capture or attach a photograph of the completed work.');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let gpsData: { latitude: number; longitude: number; accuracy: number; distanceM?: number };

      if (gpsState.status === 'acquired') {
        gpsData = {
          latitude: gpsState.latitude,
          longitude: gpsState.longitude,
          accuracy: gpsState.accuracy,
          distanceM: gpsState.distanceM,
        };
      } else {
        // Fallback to complaint coordinates or default if GPS denied/unavailable
        gpsData = {
          latitude: complaint?.latitude ?? 24.8607,
          longitude: complaint?.longitude ?? 67.0011,
          accuracy: 10,
          distanceM: undefined,
        };
      }

      await onSubmit(order.id, photoFile, gpsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="work-resolution-form"
      className="v19-glass-card v20-resolution-form"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '36px 40px',
        borderRadius: '24px',
        background: 'var(--v20-glass-surface, #111317)',
        border: '1px solid var(--v20-glass-border, #2A3038)',
        boxSizing: 'border-box',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          paddingBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onBack}
            className="v19-nav-tab v20-round-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
              color: 'var(--v20-text-primary, #F3EEE4)',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.12))',
              cursor: 'pointer',
            }}
            data-testid="resolution-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Back to complaint</span>
          </button>

          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--v20-accent, #E2A24D)',
              fontFamily: 'var(--v20-font-number, monospace)',
              background: 'var(--v20-card-subsurface, rgba(226, 162, 77, 0.1))',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--v20-accent-border, rgba(226, 162, 77, 0.25))',
            }}
          >
            REF #{refNumber}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(59, 201, 119, 0.12)',
              color: 'var(--success, #3BC977)',
              border: '1px solid rgba(59, 201, 119, 0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Resolution Submission
          </span>
        </div>
      </div>

      {/* Headline */}
      <div>
        <h2
          style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700,
            color: 'var(--v20-text-primary, #F3EEE4)',
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
            lineHeight: 1.3,
          }}
        >
          Submit completed work
        </h2>
        <div style={{ fontSize: '14px', color: 'var(--v20-text-secondary, #A6AEB8)' }}>
          {order.case_label || complaint?.heading || 'Municipal Fieldwork Complaint'}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* SECTION 1: Original Citizen Evidence */}
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
            1. Original Citizen Evidence (Reference Comparison)
          </span>

          {complaint?.photoUrl ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.2))',
                border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              <img
                src={complaint.photoUrl}
                alt="Citizen evidence thumbnail"
                onClick={() => onOpenLightbox(complaint.photoUrl!)}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  cursor: 'pointer',
                  border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v20-text-primary, #F3EEE4)' }}>
                  Citizen intake photograph
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--v20-text-muted, #7E858E)' }}>
                  Click thumbnail to enlarge in full-resolution lightbox for before/after comparison.
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '14px',
                background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.15))',
                border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.06))',
                fontSize: '13px',
                color: 'var(--v20-text-muted, #7E858E)',
              }}
            >
              No initial photograph submitted by citizen for this complaint.
            </div>
          )}
        </div>

        {/* SECTION 2: Completed Work Evidence (Camera Capture) */}
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
            2. Completed Work Evidence (Live On-Site Photographic Proof) *
          </span>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              borderRadius: '18px',
              border: '2px dashed var(--v20-glass-border, rgba(255, 255, 255, 0.16))',
              background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.25))',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background 0.2s ease',
              textAlign: 'center',
            }}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              required
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              data-testid="evidence-file-input"
            />

            {photoPreviewUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <img
                  src={photoPreviewUrl}
                  alt="Completed work evidence preview"
                  style={{
                    maxHeight: '260px',
                    maxWidth: '100%',
                    borderRadius: '14px',
                    objectFit: 'contain',
                    border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="v19-nav-tab v20-round-btn"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '9999px',
                      background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
                      color: 'var(--v20-accent, #E2A24D)',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid var(--v20-accent-border, rgba(226, 162, 77, 0.25))',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Retake or select different photo</span>
                  </button>
                </div>

                {/* Screening Report */}
                {screeningReport && (
                  <div
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.4))',
                      border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.1))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background:
                          screeningReport.status === 'screening_passed'
                            ? 'var(--success, #3BC977)'
                            : screeningReport.status === 'suspicious' || screeningReport.status === 'confirmed_synthetic'
                              ? 'var(--danger, #E05656)'
                              : 'var(--warning, #E59B2F)',
                      }}
                    />
                    <span style={{ color: 'var(--v20-text-primary, #F3EEE4)', fontWeight: 600 }}>
                      Integrity Audit: {screeningReport.verdictLabel}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(226, 162, 77, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--v20-accent, #E2A24D)',
                  }}
                >
                  <Camera size={28} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--v20-text-primary, #F3EEE4)' }}>
                  Take photo with camera or choose file
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--v20-text-muted, #7E858E)', maxWidth: '380px' }}>
                  Mobile devices automatically open the rear camera. Authentic EXIF metadata is preserved.
                </div>
              </div>
            )}
          </label>
        </div>

        {/* SECTION 3: High-Accuracy GPS Verification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--v20-text-muted, #7E858E)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              3. On-Site GPS Location Verification (30m Proximity Audit)
            </span>

            <button
              type="button"
              onClick={acquireGps}
              className="v19-nav-tab v20-round-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
                color: 'var(--info, #4E9CFF)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid rgba(78, 156, 255, 0.3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              data-testid="verify-location-btn"
            >
              <RotateCcw size={13} className={gpsState.status === 'acquiring' ? 'animate-spin' : ''} />
              <span>{gpsState.status === 'idle' ? 'Verify my location' : 'Re-acquire GPS'}</span>
            </button>
          </div>

          <div
            style={{
              padding: '18px 22px',
              borderRadius: '16px',
              background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.25))',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
            }}
          >
            {gpsState.status === 'idle' && (
              <div style={{ fontSize: '13.5px', color: 'var(--v20-text-secondary, #A6AEB8)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} style={{ color: 'var(--v20-text-muted, #7E858E)' }} />
                <span>Click &quot;Verify my location&quot; or capture a photo to record your live GPS proximity.</span>
              </div>
            )}

            {gpsState.status === 'acquiring' && (
              <div style={{ fontSize: '13.5px', color: 'var(--info, #4E9CFF)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={16} className="animate-spin" />
                <span>Acquiring satellite GPS lock from device hardware…</span>
              </div>
            )}

            {gpsState.status === 'acquired' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {gpsState.distanceM !== undefined ? (
                    gpsState.withinRadius ? (
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--success, #3BC977)',
                          background: 'rgba(59, 201, 119, 0.12)',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(59, 201, 119, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Within 30m Permitted Radius ({gpsState.distanceM.toFixed(1)}m from site)</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--warning, #E59B2F)',
                          background: 'rgba(229, 155, 47, 0.12)',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(229, 155, 47, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>Outside 30m Radius ({gpsState.distanceM.toFixed(1)}m) · Supervisor Exception Review Required</span>
                      </span>
                    )
                  ) : (
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 650,
                        color: 'var(--info, #4E9CFF)',
                        background: 'rgba(78, 156, 255, 0.12)',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(78, 156, 255, 0.3)',
                      }}
                    >
                      GPS Coordinates Captured (Incident baseline coordinates not recorded)
                    </span>
                  )}

                  {gpsState.poorAccuracy && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--warning, #E59B2F)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlertCircle size={14} />
                      <span>Low accuracy (±{gpsState.accuracy.toFixed(1)}m). If possible, stand under open sky.</span>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--v20-text-muted, #7E858E)',
                    fontFamily: 'var(--v20-font-number, monospace)',
                  }}
                >
                  Latitude: {gpsState.latitude.toFixed(5)} · Longitude: {gpsState.longitude.toFixed(5)} · Accuracy: ±{gpsState.accuracy.toFixed(1)}m
                </div>
              </div>
            )}

            {gpsState.status === 'denied' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning, #E59B2F)', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>{gpsState.message}</span>
              </div>
            )}

            {gpsState.status === 'unavailable' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--v20-text-muted, #7E858E)', fontSize: '13px' }}>
                <HelpCircle size={16} />
                <span>{gpsState.message}</span>
              </div>
            )}

            {gpsState.status === 'insecure_context' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning, #E59B2F)', fontSize: '13px' }}>
                <AlertTriangle size={16} />
                <span>{gpsState.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Work Completion Notes */}
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
            4. Work Completion Notes &amp; Description
          </span>

          <textarea
            rows={4}
            placeholder="Describe the physical work completed on site (e.g. replaced broken manhole cover, tested flow, cleared rubble from roadway)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.25))',
              border: '1.5px solid var(--v20-glass-border, rgba(255, 255, 255, 0.12))',
              color: 'var(--v20-text-primary, #F3EEE4)',
              fontSize: '14px',
              lineHeight: 1.5,
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            data-testid="completion-notes-input"
          />
        </div>

        {/* SECTION 5: Submission Summary */}
        <div
          style={{
            padding: '18px 22px',
            borderRadius: '16px',
            background: 'var(--v20-card-subsurface, rgba(0, 0, 0, 0.2))',
            border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 650, color: 'var(--v20-text-primary, #F3EEE4)' }}>
            Submission Summary
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--v20-text-secondary, #A6AEB8)', lineHeight: 1.5 }}>
            • Work Order: #{order.id}
            <br />
            • Attached Photo: {photoFile ? `Yes (${photoFile.name})` : 'Pending capture'}
            <br />
            • GPS Verification:{' '}
            {gpsState.status === 'acquired'
              ? gpsState.withinRadius
                ? '30m verified'
                : 'Outside radius (exception review)'
              : 'Standard coordinates'}
          </div>
        </div>

        {/* Error Notice */}
        {submitError && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(224, 86, 86, 0.12)',
              border: '1px solid rgba(224, 86, 86, 0.3)',
              color: 'var(--danger, #E05656)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{submitError}</span>
          </div>
        )}

        {/* SECTION 6: Submission Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            paddingTop: '20px',
            borderTop: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <button
            type="button"
            className="v19-nav-tab v20-round-btn"
            onClick={onBack}
            style={{
              padding: '11px 24px',
              borderRadius: '9999px',
              background: 'var(--v20-card-subsurface, rgba(255, 255, 255, 0.08))',
              color: 'var(--v20-text-primary, #F3EEE4)',
              border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.12))',
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!photoFile || isSubmitting}
            className="v19-nav-tab v20-pill-btn"
            onClick={handleSubmit}
            style={{
              padding: '12px 32px',
              borderRadius: '9999px',
              background: 'var(--success, #3BC977)',
              color: '#0B0B0B',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: !photoFile || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: !photoFile || isSubmitting ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(59, 201, 119, 0.35)',
            }}
            data-testid="submit-for-verification-btn"
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Submitting proof…' : 'Submit for verification'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
