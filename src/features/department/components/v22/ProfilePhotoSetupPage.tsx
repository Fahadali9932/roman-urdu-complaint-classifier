import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, Shield, Upload, Info } from 'lucide-react';
import { validateProfilePhoto, type FaceValidationResult } from '../../services/faceValidation';
import { fieldOperations } from '../../services/fieldOperations';

export interface ProfilePhotoSetupPageProps {
  userId: string;
  departmentId: string;
  departmentName?: string;
  onPhotoSubmitted?: () => void;
  onCancel?: () => void;
}

export const ProfilePhotoSetupPage: React.FC<ProfilePhotoSetupPageProps> = ({
  userId,
  departmentId,
  departmentName = 'Municipal Department',
  onPhotoSubmitted,
  onCancel,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validation, setValidation] = useState<FaceValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedStatus, setSubmittedStatus] = useState<'idle' | 'submitted' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize front camera feed
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. You can upload an official photograph below or complete in-person verification.'
          : err.message || 'Unable to access front camera hardware.';
      setCameraError(msg);
    }
  }, []);

  // Cleanup stream tracks
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Run validation on a captured or selected blob
  const handleAnalyzeBlob = async (blob: Blob) => {
    setIsValidating(true);
    setErrorMessage(null);
    try {
      const result = await validateProfilePhoto(blob);
      setValidation(result);
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze photograph.');
    } finally {
      setIsValidating(false);
    }
  };

  // Capture still from live video feed
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopCamera();
          handleAnalyzeBlob(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedBlob(null);
    setValidation(null);
    setSubmittedStatus('idle');
    setErrorMessage(null);
    startCamera();
  };

  // Fallback file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      handleAnalyzeBlob(file);
    }
  };

  // Submit photo for supervisor review
  const handleSubmit = async () => {
    if (!capturedBlob || !validation?.valid) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(capturedBlob);
      });

      const dataUrl = await base64Promise;
      await fieldOperations.submitStaffProfilePhoto(userId, departmentId, dataUrl);
      setSubmittedStatus('submitted');
      if (onPhotoSubmitted) {
        setTimeout(onPhotoSubmitted, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please try again.');
      setSubmittedStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="v22-profile-setup-container"
      data-testid="v22-profile-photo-setup"
      style={{
        maxWidth: '560px',
        margin: '40px auto',
        padding: '32px 28px',
        borderRadius: '24px',
        background: 'var(--v20-glass-surface, rgba(20, 24, 33, 0.85))',
        border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.12))',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* 1. Header & Supporting Copy */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'var(--v20-accent-soft, rgba(164, 178, 197, 0.12))',
            border: '1px solid var(--v20-accent-border, rgba(164, 178, 197, 0.25))',
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--v20-accent, #A4B2C5)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
          }}
        >
          <Shield size={13} />
          <span>{departmentName} · Staff Identity Verification</span>
        </div>
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 6px',
            color: 'var(--v20-text-primary, #F2EFE9)',
            letterSpacing: '-0.02em',
          }}
        >
          Set up your profile
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--v20-text-secondary, #B8B5B0)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Take a clear photograph of yourself.
        </p>
      </div>

      {/* 2. Success Banner */}
      {submittedStatus === 'submitted' && (
        <div
          data-testid="profile-photo-submitted-banner"
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'rgba(32, 100, 61, 0.15)',
            border: '1px solid rgba(88, 199, 140, 0.4)',
            color: '#58C78C',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
          }}
        >
          <CheckCircle2 size={20} />
          <div>
            <strong>Photograph submitted successfully.</strong>
            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
              Your profile photograph is currently awaiting supervisor approval.
            </div>
          </div>
        </div>
      )}

      {/* 3. Camera / Preview Frame */}
      {submittedStatus !== 'submitted' && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '20px',
            overflow: 'hidden',
            background: '#07090C',
            border: '1.5px solid var(--v20-glass-border, rgba(255, 255, 255, 0.14))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {previewUrl ? (
            /* Still Image Preview */
            <img
              src={previewUrl}
              alt="Profile photograph preview"
              data-testid="profile-photo-preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : !cameraError ? (
            /* Live Camera Stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-testid="profile-photo-video"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror user perspective
                }}
              />
              {/* Oval Face Positioning Guide Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: '12% 18%',
                  borderRadius: '50%',
                  border: '2px dashed rgba(255, 255, 255, 0.55)',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  pointerEvents: 'none',
                }}
              >
                Center your face within the guide
              </div>
            </>
          ) : (
            /* Camera Hardware / Permission Error Fallback */
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--v20-text-secondary, #B8B5B0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={32} style={{ color: '#E05656' }} />
              <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{cameraError}</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="v20-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '12px',
                  background: 'var(--button-primary, #F2EFE9)',
                  color: 'var(--button-primary-text, #171717)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <Upload size={16} />
                Upload Photo File
              </button>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Hidden File Input for fallback uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        data-testid="profile-photo-file-input"
      />

      {/* 4. Local Validation Feedback Banners */}
      {validation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {validation.valid ? (
            <div
              data-testid="profile-validation-success"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(32, 100, 61, 0.12)',
                border: '1px solid rgba(88, 199, 140, 0.3)',
                color: '#58C78C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Photograph satisfies municipal clarity, framing, and single-face standards.</span>
            </div>
          ) : (
            <div
              data-testid="profile-validation-errors"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(224, 86, 86, 0.12)',
                border: '1px solid rgba(224, 86, 86, 0.3)',
                color: '#E05656',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {validation.errors.map((err, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(229, 155, 47, 0.1)',
                border: '1px solid rgba(229, 155, 47, 0.25)',
                color: '#E59B2F',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {validation.warnings.map((warn, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={15} />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{ color: '#E05656', fontSize: '13px', textAlign: 'center' }}>{errorMessage}</div>
      )}

      {/* 5. Controls & Action Buttons */}
      {submittedStatus !== 'submitted' && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!previewUrl ? (
            /* Live mode: Capture button & fallback upload trigger */
            <>
              <button
                type="button"
                onClick={handleCapture}
                data-testid="profile-photo-capture-btn"
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '14px',
                  background: 'var(--button-primary, #F2EFE9)',
                  color: 'var(--button-primary-text, #171717)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Camera size={18} />
                Capture Photograph
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                data-testid="profile-photo-upload-btn"
                title="Upload from device"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--v20-text-primary, #F2EFE9)',
                  border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.14))',
                  cursor: 'pointer',
                }}
              >
                <Upload size={18} />
              </button>
            </>
          ) : (
            /* Preview mode: Retake & Submit */
            <>
              <button
                type="button"
                onClick={handleRetake}
                data-testid="profile-photo-retake-btn"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--v20-text-primary, #F2EFE9)',
                  border: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.14))',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={17} />
                Retake
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                data-testid="profile-photo-submit-btn"
                disabled={!validation?.valid || isSubmitting || isValidating}
                style={{
                  flex: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '14px',
                  background: validation?.valid
                    ? 'var(--button-primary, #F2EFE9)'
                    : 'rgba(255, 255, 255, 0.15)',
                  color: validation?.valid
                    ? 'var(--button-primary-text, #171717)'
                    : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 650,
                  cursor: validation?.valid ? 'pointer' : 'not-allowed',
                  boxShadow: validation?.valid ? '0 4px 14px rgba(0, 0, 0, 0.15)' : 'none',
                }}
              >
                <CheckCircle2 size={18} />
                {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '14px 20px',
                borderRadius: '14px',
                background: 'transparent',
                color: 'var(--v20-text-muted, #A6A6A6)',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* 6. Truthful Architectural Notice */}
      <div
        style={{
          borderTop: '1px solid var(--v20-glass-border, rgba(255, 255, 255, 0.08))',
          paddingTop: '16px',
          fontSize: '11.5px',
          color: 'var(--v20-text-muted, #A6A6A6)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        <span>
          Local image quality analysis runs entirely on your device. Zero biometric embeddings are stored.
          Submitted photographs require manual approval by an authorized department supervisor.
        </span>
      </div>
    </div>
  );
};
