import React from 'react';
import { type Complaint } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Calendar,
} from 'lucide-react';
import { KARACHI_DEPARTMENTS } from '../../mocks/complaints';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';
  const [copiedRef, setCopiedRef] = React.useState(false);

  if (!isOpen || !complaint) return null;

  const formattedDate = formatDateOnly(complaint.submittedAt, language);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(complaint.referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  // Helper for department names
  const getDepartmentNames = (): string[] => {
    if (complaint.assignedDepartmentIds && complaint.assignedDepartmentIds.length > 0) {
      return complaint.assignedDepartmentIds.map((id) => {
        const d = KARACHI_DEPARTMENTS[id];
        return ur ? d?.nameUrdu || d?.name || id.toUpperCase() : d?.name || id.toUpperCase();
      });
    }
    if (
      complaint.assignedDepartmentId &&
      complaint.assignedDepartmentId !== 'unassigned' &&
      complaint.assignedDepartmentId.toLowerCase() !== 'municipal triage'
    ) {
      const d = KARACHI_DEPARTMENTS[complaint.assignedDepartmentId];
      const name = ur
        ? d?.nameUrdu || complaint.assignedDepartmentName || d?.name || complaint.assignedDepartmentId.toUpperCase()
        : complaint.assignedDepartmentName || d?.name || complaint.assignedDepartmentId.toUpperCase();
      return [name];
    }
    return [];
  };

  const assignedDepartments = getDepartmentNames();

  // Status Badge Configuration
  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{ur ? 'حل شدہ' : 'Resolved'}</span>
          </span>
        );
      case 'in_progress':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{ur ? 'زیرِ کارروائی' : 'In Progress'}</span>
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{ur ? 'محکمانہ قبولیت کا منتظر' : 'Awaiting Department Acceptance'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>{ur ? 'مسترد شدہ' : 'Rejected'}</span>
          </span>
        );
      case 'under_review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{ur ? 'زیرِ جائزہ' : 'Under Review'}</span>
          </span>
        );
    }
  };

  // Build honest progress steps
  const progressSteps = [
    {
      key: 'submitted',
      labelEn: 'Complaint submitted',
      labelUr: 'شکایت موصول ہو گئی',
      completed: true,
      current: complaint.status === 'submitted',
    },
    {
      key: 'under_review',
      labelEn: 'Under review',
      labelUr: 'ابتدائی جانچ و جائزہ',
      completed: complaint.status !== 'submitted',
      current: complaint.status === 'under_review',
    },
    {
      key: 'assigned',
      labelEn: 'Department assigned',
      labelUr: 'متعلقہ محکمے کو تفویض',
      completed: ['assigned', 'accepted', 'in_progress', 'resolved'].includes(complaint.status),
      current: complaint.status === 'assigned',
    },
    {
      key: 'in_progress',
      labelEn: 'In progress',
      labelUr: 'کام جاری ہے',
      completed: ['accepted', 'in_progress', 'resolved'].includes(complaint.status),
      current: ['accepted', 'in_progress'].includes(complaint.status),
    },
    {
      key: 'resolved',
      labelEn: 'Resolved',
      labelUr: 'مسئلہ حل ہو گیا',
      completed: complaint.status === 'resolved',
      current: complaint.status === 'resolved',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-[#141414]/60 backdrop-blur-xs animate-in fade-in duration-200 text-start"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-details-title"
    >
      <div className="w-full max-w-4xl bg-white border-2 border-[#E5E3E0] rounded-[22px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90dvh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-10 py-6 sm:py-8 border-b border-[#E5E3E0] bg-[#FAF9F7]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#681822]">
                {complaint.referenceNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1 rounded text-[#88827A] hover:text-[#141414] transition cursor-pointer"
                title={ur ? 'حوالہ نمبر کاپی کریں' : 'Copy reference number'}
                aria-label={ur ? 'حوالہ نمبر کاپی کریں' : 'Copy reference number'}
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[#D9D3CC]">•</span>
              {getStatusBadge(complaint.status)}
            </div>

            <h2
              id="complaint-details-title"
              className="font-display font-black text-2xl sm:text-4xl text-[#141414] leading-tight tracking-tight pt-2"
            >
              {complaint.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#88827A] hover:text-[#141414] hover:bg-[#E5E3E0]/50 transition cursor-pointer shrink-0"
            aria-label={ur ? 'بند کریں' : 'Close case file'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-10 space-y-8 overflow-y-auto font-ui text-base">
          {/* Section 1: Complaint Information */}
          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-black tracking-wide text-[#681822] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{ur ? 'معلوماتِ شکایت' : 'Complaint Information'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 sm:p-7 rounded-[24px] bg-[#FAF9F7] border-2 border-[#E5E3E0]">
              <div>
                <span className="block text-sm text-[#645C55] font-bold">
                  {ur ? 'تاریخِ اندراج' : 'Submitted Date'}
                </span>
                <span className="font-bold text-[#141414] text-base sm:text-lg mt-1 block">
                  {formattedDate}
                </span>
              </div>

              <div>
                <span className="block text-sm text-[#645C55] font-bold">
                  {ur ? 'مقامِ واقعہ' : 'Incident Location'}
                </span>
                <span className="font-bold text-[#141414] text-base sm:text-lg mt-1 block flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#681822] shrink-0" />
                  <span>
                    {complaint.locality}, {complaint.district}
                  </span>
                </span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-[#EAE7E2]">
                <span className="block text-sm text-[#645C55] font-bold mb-2">
                  {ur ? 'متعلقہ بلدیاتی محکمہ' : 'Responsible Department'}
                </span>
                {assignedDepartments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedDepartments.map((deptName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#D9D3CC] px-4 py-2 font-bold text-base text-[#141414]"
                      >
                        <Building2 className="w-3.5 h-3.5 text-[#681822]" />
                        <span>{deptName}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-[#625D58] leading-relaxed">
                    {ur
                      ? 'آپ کی شکایت کا جائزہ لیا جا رہا ہے۔ تصدیق کے بعد متعلقہ محکمہ یہاں ظاہر ہوگا۔'
                      : 'Your complaint is being reviewed. The responsible department will appear here once confirmed.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Your Complaint */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-black tracking-wide text-[#681822] flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span>{ur ? 'آپ کی شکایت' : 'Your Complaint'}</span>
              <span className="text-[11px] font-normal text-[#88827A]">
                {ur ? 'اصل بیان (رومن اردو)' : 'Original Grievance Statement (Roman Urdu)'}
              </span>
            </h3>

            <div className="p-5 sm:p-8 rounded-[24px] bg-[#FAF9F7] border-2 border-[#E5E3E0]">
              <p className="text-base sm:text-lg text-[#141414] leading-[1.75] whitespace-pre-wrap font-sans">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Section 3: Complaint Progress */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm sm:text-base font-black tracking-wide text-[#681822] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{ur ? 'پیش رفت کا ٹائم لائن' : 'Complaint Progress'}</span>
            </h3>

            {/* Custom Simple Steps Tracker */}
            <div className="rounded-[24px] border-2 border-[#E5E3E0] bg-[#FAF9F7] p-5 sm:p-8">
              <ol className="space-y-3 relative border-s border-[#D9D3CC] ms-3 sm:ms-4">
                {progressSteps.map((step) => (
                  <li key={step.key} className="ms-4">
                    <span
                      className={`absolute w-3 h-3 rounded-full -start-1.5 mt-1 border-2 border-white ${
                        step.completed
                          ? 'bg-emerald-600'
                          : step.current
                          ? 'bg-amber-600'
                          : 'bg-[#D9D3CC]'
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold ${
                          step.completed
                            ? 'text-[#141414]'
                            : step.current
                            ? 'text-amber-800'
                            : 'text-[#88827A]'
                        }`}
                      >
                        {ur ? step.labelUr : step.labelEn}
                      </span>
                      {step.completed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {/* Recorded Updates from Department/Admin Timeline */}
              {complaint.timeline && complaint.timeline.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#EAE7E2] space-y-2">
                  <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#625D58]">
                    {ur ? 'سرکاری ریکارڈ شدہ پیش رفت' : 'Official Timeline Events'}
                  </span>
                  <div className="space-y-2">
                    {complaint.timeline.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl bg-white border border-[#E5E3E0] p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[#88827A]">
                          <span className="font-semibold text-[#141414]">
                            {ur && event.titleUrdu ? event.titleUrdu : event.title}
                          </span>
                          <span className="text-[11px] font-mono">
                            {formatDateOnly(event.timestamp, language)}
                          </span>
                        </div>
                        <p className="text-[#625D58] leading-relaxed">
                          {ur && event.descriptionUrdu ? event.descriptionUrdu : event.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-[#E5E3E0] bg-[#FAF9F7] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-xl border border-[#D9D3CC] bg-white px-5 text-xs font-bold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
          >
            {ur ? 'بند کریں' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
