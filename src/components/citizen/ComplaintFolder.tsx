import React from 'react';
import { type Complaint } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, ArrowLeft, Clock, MapPin, Building2 } from 'lucide-react';
import { KARACHI_DEPARTMENTS } from '../../mocks/complaints';

interface ComplaintFolderProps {
  complaint: Complaint;
  onClick: () => void;
  className?: string;
}

export const ComplaintFolder: React.FC<ComplaintFolderProps> = ({
  complaint,
  onClick,
  className = '',
}) => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';
  const formattedDate = formatDateOnly(complaint.submittedAt, language);

  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{ur ? 'حل شدہ' : 'Resolved'}</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{ur ? 'زیرِ کارروائی' : 'In Progress'}</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{ur ? 'قبول شدہ' : 'Accepted'}</span>
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{ur ? 'قبولیت کا منتظر' : 'Pending Acceptance'}</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>{ur ? 'مسترد شدہ' : 'Rejected'}</span>
          </span>
        );
      case 'under_review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{ur ? 'زیرِ جائزہ' : 'Under Review'}</span>
          </span>
        );
    }
  };

  // Determine friendly department display
  const getDepartmentLabel = (): string => {
    if (complaint.assignedDepartmentIds && complaint.assignedDepartmentIds.length > 0) {
      return complaint.assignedDepartmentIds
        .map((id) => {
          const d = KARACHI_DEPARTMENTS[id];
          return ur ? d?.nameUrdu || d?.code || id.toUpperCase() : d?.code || d?.name || id.toUpperCase();
        })
        .join(ur ? ' اور ' : ' & ');
    }
    if (
      complaint.assignedDepartmentId &&
      complaint.assignedDepartmentId !== 'unassigned' &&
      complaint.assignedDepartmentId.toLowerCase() !== 'municipal triage'
    ) {
      const d = KARACHI_DEPARTMENTS[complaint.assignedDepartmentId];
      return ur
        ? d?.nameUrdu || complaint.assignedDepartmentName || d?.code || complaint.assignedDepartmentId.toUpperCase()
        : d?.code || complaint.assignedDepartmentName || d?.name || complaint.assignedDepartmentId.toUpperCase();
    }
    return ur ? 'جائزہ جاری ہے' : 'Awaiting Department';
  };

  const departmentLabel = getDepartmentLabel();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      data-scroll-depth
      className={`civic-depth-card group cursor-pointer select-none text-start rounded-[20px] sm:rounded-[30px] bg-white border-2 border-[#E5E3E0] p-4 sm:p-9 transition-all duration-200 hover:border-[#681822]/40 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#681822] ${className}`}
      aria-label={`Complaint ${complaint.referenceNumber}: ${complaint.title}`}
    >
      {/* Top Meta Line: Reference, Dept & Status */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F2EFEA]">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <span className="min-w-0 max-w-full break-all font-mono text-sm font-bold text-[#681822] sm:break-normal">
            #{complaint.referenceNumber}
          </span>
          <span className="text-[#D9D3CC]">•</span>
          <span className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-[#5A554E]">
            <Building2 className="w-3.5 h-3.5 text-[#88827A]" />
            <span className="min-w-0 break-words">{departmentLabel}</span>
          </span>
        </div>

        {getStatusBadge(complaint.status)}
      </div>

      {/* Main Content: Title & Preview */}
      <div className="py-6 sm:py-8 space-y-3">
        <h3 className="font-display font-black text-xl sm:text-2xl lg:text-3xl leading-tight text-[#141414] tracking-tight group-hover:text-[#681822] transition-colors">
          {complaint.title}
        </h3>
        <p className="text-base sm:text-lg text-[#5A554E] line-clamp-2 leading-relaxed">
          {complaint.description}
        </p>
      </div>

      {/* Footer Meta & Call-To-Action */}
      <div className="pt-5 border-t border-[#F2EFEA] flex flex-wrap items-center justify-between gap-4 text-sm text-[#645C55]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[#5A554E] font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#681822] shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {complaint.locality}, {complaint.district}
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#88827A]" />
            <span>{formattedDate}</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1 font-black text-sm sm:text-base text-[#681822] group-hover:underline">
          <span>{ur ? 'تفصیلات دیکھیں' : 'View Details'}</span>
          <span className="sr-only">Open Case</span>
          {isRTL ? (
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          )}
        </div>
      </div>
    </div>
  );
};
