import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { compressComplaintPhoto, formatFileSize } from '../../../utils/imageCompression';

export interface IssuePhotoCaptureSectionProps {
  photo: File | null;
  photoPreviewUrl: string | null;
  onPhotoCaptured: (file: File, previewUrl: string) => void;
  onPhotoRemoved: () => void;
  error?: string;
  isSubmitting?: boolean;
}

export const IssuePhotoCaptureSection: React.FC<IssuePhotoCaptureSectionProps> = ({
  photo,
  photoPreviewUrl,
  onPhotoCaptured,
  onPhotoRemoved,
  error,
  isSubmitting = false,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [clientError, setClientError] = useState('');

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    // Reset input value so same file can be re-selected if user removed it
    event.target.value = '';

    // Validate mime type
    if (!selected.type.startsWith('image/')) {
      setClientError(
        ur
          ? 'براہِ کرم درست تصویری فائل (JPG، PNG، یا WebP) منتخب کریں۔'
          : 'Please choose a valid image file (JPG, PNG, or WebP).'
      );
      return;
    }

    setClientError('');
    setIsCompressing(true);

    try {
      const result = await compressComplaintPhoto(selected);
      onPhotoCaptured(result.file, result.previewUrl);
    } catch {
      // Fallback: use raw file with object URL
      try {
        const previewUrl = URL.createObjectURL(selected);
        onPhotoCaptured(selected, previewUrl);
      } catch {
        onPhotoCaptured(selected, '');
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRetake = () => {
    // If mobile, open camera; otherwise open file selector
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const activeError = error || clientError;

  return (
    <div
      id="issue-photo-panel"
      className="bg-white rounded-2xl border border-[#E8E5E1] p-5 sm:p-7 shadow-[0_4px_20px_-2px_rgba(20,20,20,0.03)] space-y-6 text-start"
    >
      {/* Hidden native inputs for mobile camera and file upload */}
      <input
        ref={cameraInputRef}
        id="camera-photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Capture issue photo with camera"
        onChange={handleFileSelection}
        disabled={isSubmitting || isCompressing}
      />
      <input
        ref={fileInputRef}
        id="file-photo-input"
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload issue photo from files"
        onChange={handleFileSelection}
        disabled={isSubmitting || isCompressing}
      />

      {/* Header */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-[#F1EFEC]">
        <div className="w-10 h-10 rounded-xl bg-[#F7EFF0] text-[#681822] flex items-center justify-center shrink-0 border border-[#681822]/10">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-sm tracking-widest text-[#141414] uppercase">
              {ur ? 'مسئلے کی تصویر' : 'Issue photograph'}
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#681822] bg-[#F7EFF0] px-2 py-0.5 rounded-full">
              {ur ? 'لازمی' : 'Required'}
            </span>
          </div>
          <p className="text-xs text-[#77716E] font-ui mt-0.5">
            {ur
              ? 'واضح تصویر سے فیلڈ ٹیم کو مسئلہ سمجھنے اور تصدیق میں مدد ملتی ہے۔'
              : 'A clear photo helps field teams verify and address the issue faster.'}
          </p>
        </div>
      </div>

      {/* Active Validation Error Banner */}
      {activeError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-medium">{activeError}</span>
        </div>
      )}

      {/* Main Photo Capture / Preview State */}
      {photo ? (
        /* Photo Preview Card */
        <div className="rounded-2xl border border-[#E0DCD6] bg-[#FAF9F7] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#126B53] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#126B53]" />
                {ur ? 'تصویر منسلک ہو گئی' : 'Photo attached'}
              </span>
              <span className="text-xs font-mono text-[#77716E] bg-white border border-[#E8E5E1] px-2 py-1 rounded-md">
                {formatFileSize(photo.size)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSubmitting || isCompressing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D9D3CC] bg-white hover:bg-[#F2EFEA] text-[#141414] text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{ur ? 'دوبارہ تصویر لیں' : 'Retake photo'}</span>
              </button>
              <button
                type="button"
                onClick={onPhotoRemoved}
                disabled={isSubmitting || isCompressing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{ur ? 'حذف کریں' : 'Remove'}</span>
              </button>
            </div>
          </div>

          {/* Photo Display Frame */}
          <div className="relative w-full overflow-hidden rounded-xl bg-[#141414]/5 border border-[#E0DCD6] aspect-video max-h-[360px] flex items-center justify-center">
            {photoPreviewUrl ? (
              <img
                src={photoPreviewUrl}
                alt={ur ? 'شکایت کے مسئلے کی تصویر' : 'Captured issue photograph'}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-[#77716E]">
                <ImageIcon className="w-8 h-8 text-[#88827A]" />
                <span className="text-xs font-medium">{photo.name}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty Capture Card with Live Capture and Upload Buttons */
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-[#D9D3CC] bg-[#FAF9F7] p-6 sm:p-8 text-center space-y-4 transition-colors hover:border-[#681822]/40">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F7EFF0] text-[#681822] flex items-center justify-center border border-[#681822]/15 shadow-2xs">
              {isCompressing ? (
                <Loader2 className="w-7 h-7 animate-spin text-[#681822]" />
              ) : (
                <Camera className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#141414]">
                {isCompressing
                  ? ur
                    ? 'تصویر تیار ہو رہی ہے…'
                    : 'Compressing photo…'
                  : ur
                    ? 'مسئلے کی تصویر لیں یا اپلوڈ کریں'
                    : 'Take a photo of the issue'}
              </h3>
              <p className="text-xs text-[#77716E] max-w-md mx-auto leading-relaxed">
                {ur
                  ? 'روڈ کی خرابی، سیوریج، کوڑا کرکٹ یا گیس / پانی کی لیکیج کی واضح تصویر لیں۔'
                  : 'Capture the road damage, pipe leak, uncollected waste, or public infrastructure hazard.'}
              </p>
            </div>

            {/* Action Buttons: Live Capture & Device Upload */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              {/* Primary: Live Camera Trigger */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isSubmitting || isCompressing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#681822] hover:bg-[#52131B] text-white font-ui font-semibold text-xs sm:text-sm tracking-wide shadow-sm shadow-[#681822]/20 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{ur ? 'کیمرے سے تصویر لیں' : 'Capture issue photo'}</span>
              </button>

              {/* Secondary: Device Gallery / Files Fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isCompressing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#D9D3CC] bg-white hover:bg-[#F2EFEA] text-[#141414] font-ui font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#77716E]" />
                <span>{ur ? 'ڈیوائس سے منتخب کریں' : 'Choose from files'}</span>
              </button>
            </div>
          </div>

          {/* Civic Privacy & Guidance Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-[#625D58]">
            <div className="flex items-start gap-2 bg-[#FAF9F7] border border-[#EFECE8] rounded-xl p-3">
              <span className="text-[#681822] font-bold text-sm leading-none">•</span>
              <span>
                {ur
                  ? 'چہروں، شناختی دستاویزات اور گھر کے ذاتی نمبروں کی تصاویر سے پرہیز کریں۔'
                  : 'Avoid faces, identity documents, and private residence interiors.'}
              </span>
            </div>
            <div className="flex items-start gap-2 bg-[#FAF9F7] border border-[#EFECE8] rounded-xl p-3">
              <span className="text-[#681822] font-bold text-sm leading-none">•</span>
              <span>
                {ur
                  ? 'تصاویر موبائل ڈیٹا بچانے کے لیے خودکار طور پر کمپریس کی جاتی ہیں۔'
                  : 'Photos are automatically compressed client-side to save mobile data.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Official Security Reassurance Footer */}
      <div className="pt-4 border-t border-[#F1EFEC] flex items-center gap-2 text-xs text-[#77716E] font-ui">
        <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0" />
        <span>
          {ur
            ? 'تصویر محفوظ بلدیاتی ریکارڈ کا حصہ بنتی ہے اور صرف مجاز افسران دیکھ سکتے ہیں۔'
            : 'Photographs are kept in private civic records and viewed only by authorized officers.'}
        </span>
      </div>
    </div>
  );
};
