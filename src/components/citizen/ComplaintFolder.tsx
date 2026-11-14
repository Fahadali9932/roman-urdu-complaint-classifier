import React from 'react';
import { type Complaint } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowUpRight, ArrowUpLeft, Clock, MapPin } from 'lucide-react';

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
  const formattedDate = formatDateOnly(complaint.submittedAt, language);

  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#111111] text-white">
            Resolved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#B4233E] text-white">
            Rejected
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#EAEAE8] text-[#111111] border border-[#D5D5D3]">
            In Progress
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
            Accepted
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            Pending Acceptance
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#FAFAF9] text-[#5B5B5B] border border-[#D5D5D3]">
            {language === 'ur' ? 'بلدیاتی جائزہ' : 'Awaiting Review'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#FAFAF9] text-[#5B5B5B] border border-[#D5D5D3]">
            Submitted
          </span>
        );
    }
  };

  const departmentDisplay =
    complaint.assignedDepartmentName ||
    (complaint.assignedDepartmentId && complaint.assignedDepartmentId !== 'unassigned'
      ? complaint.assignedDepartmentId.toUpperCase()
      : 'MUNICIPAL TRIAGE');

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
      className={`group cursor-pointer select-none text-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${className}`}
      aria-label={`Case file ${complaint.referenceNumber}: ${complaint.title}`}
    >
      {/* 1. Folder Silhouette Top Tab */}
      <div className="flex items-end">
        <div className="swiss-folder-tab px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#5B5B5B] flex items-center gap-2">
          <span className="text-[#111111]">CASE FILE</span>
          <span>#{complaint.referenceNumber}</span>
        </div>
        <div className="flex-1 border-b border-[#D5D5D3]" />
      </div>

      {/* 2. Main Folder Case Surface */}
      <div className="swiss-folder-body p-6 sm:p-7 space-y-4 transition-all duration-200 group-hover:border-[#111111] group-hover:shadow-md">
        
        {/* Department & Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#5B5B5B]">
            {departmentDisplay}
          </span>
          {getStatusBadge(complaint.status)}
        </div>

        {/* Complaint Subject */}
        <div>
          <h3 className="font-display font-black text-lg sm:text-xl text-[#111111] uppercase tracking-tight group-hover:underline underline-offset-2">
            {complaint.title}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5B5B5B] line-clamp-2 leading-relaxed">
            {complaint.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="pt-3 border-t border-[#D5D5D3] flex items-center justify-between text-xs font-mono text-[#5B5B5B]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#111111]" />
              <span>{complaint.locality}, {complaint.district}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1 font-bold uppercase text-[#111111]">
            <span className="text-[11px]">Open Case</span>
            {isRTL ? (
              <ArrowUpLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
