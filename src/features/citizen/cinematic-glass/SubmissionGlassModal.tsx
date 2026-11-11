import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { FullComplaintFormState } from '../../../types';
import { ShieldAlert, CheckCircle2, X, Edit3, ArrowLeft, User, MapPin, FileText } from 'lucide-react';

export interface SubmissionGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FullComplaintFormState;
  onEditStage: (stage: 1 | 2 | 3) => void;
}

export const SubmissionGlassModal: React.FC<SubmissionGlassModalProps> = ({
  isOpen,
  onClose,
  formData,
  onEditStage,
}) => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { applicant, location, complaint } = formData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl rounded-[28px] border border-white/20 bg-[rgba(22,20,24,0.65)] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2)] text-start space-y-6 text-white my-8"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between gap-4 border-b border-white/12 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#681822]/40 border border-[#681822] text-[#FFCCD2] text-[11px] font-mono uppercase tracking-wider font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('glassReady')}</span>
            </div>
            <h2
              id="submission-modal-title"
              className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight pt-1"
            >
              {t('glassPreviewTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-white/75 font-ui">
              {t('glassPreviewSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('glassPreviewClose')}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Honest Prototype Notice */}
        <div className="p-4 rounded-[18px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-amber-200/90 font-ui leading-relaxed">
            <span className="font-semibold block text-amber-200">
              {ur ? 'پروٹوٹائپ پیش منظر' : 'Prototype Preview Mode'}
            </span>
            <p>{t('glassPreviewDisclaimer')}</p>
          </div>
        </div>

        {/* Summary of Validated Data (Phone & Home Address Omitted for Citizen Privacy) */}
        <div className="space-y-3.5 rounded-[20px] border border-white/14 bg-white/[0.05] backdrop-blur-md p-4 sm:p-5 font-ui text-sm">
          {/* Applicant Name */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white/75">
              <User className="w-4 h-4 text-white/50" />
              <span className="text-[11px] font-mono text-white/60 uppercase block">
                {ur ? 'درخواست گزار' : 'Applicant'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white text-sm">
                {applicant.citizenName || '—'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStage(1);
                }}
                className="text-xs text-[#E89BA4] hover:text-white inline-flex items-center gap-1 cursor-pointer font-ui transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{ur ? 'ترمیم' : 'Edit'}</span>
              </button>
            </div>
          </div>

          {/* Email (If entered) */}
          {applicant.citizenEmail && (
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[11px] font-mono text-white/60 uppercase block">
                {ur ? 'ای میل' : 'Email'}
              </span>
              <span className="font-mono text-xs text-white/85">
                {applicant.citizenEmail}
              </span>
            </div>
          )}

          {/* Locality & District */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white/75">
              <MapPin className="w-4 h-4 text-white/50" />
              <span className="text-[11px] font-mono text-white/60 uppercase block">
                {ur ? 'علاقہ و ضلع' : 'Locality & District'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white text-sm">
                {location.locality} {location.district ? `• ${location.district}` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStage(2);
                }}
                className="text-xs text-[#E89BA4] hover:text-white inline-flex items-center gap-1 cursor-pointer font-ui transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{ur ? 'ترمیم' : 'Edit'}</span>
              </button>
            </div>
          </div>

          {/* Complaint Narrative */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/75">
                <FileText className="w-4 h-4 text-white/50" />
                <span className="text-[11px] font-mono text-white/60 uppercase block">
                  {ur ? 'شکایت کا متن' : 'Complaint'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStage(3);
                }}
                className="text-xs text-[#E89BA4] hover:text-white inline-flex items-center gap-1 cursor-pointer font-ui transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{ur ? 'ترمیم' : 'Edit'}</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-white/90 bg-black/35 p-3.5 rounded-[14px] border border-white/10 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {complaint.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditStage(3);
            }}
            className="flex-1 h-[50px] rounded-[16px] border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-white font-medium text-sm font-ui transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t('glassPreviewEdit')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[50px] rounded-[16px] bg-gradient-to-r from-[#681822] to-[#801D2A] hover:from-[#781B27] hover:to-[#922230] text-white font-semibold text-sm font-ui transition-all duration-200 cursor-pointer shadow-[0_12px_28px_rgba(104,24,34,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
          >
            <span>{t('glassPreviewClose')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
