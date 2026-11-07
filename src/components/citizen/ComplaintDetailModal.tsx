import React from 'react';
import { type Complaint } from '../../types';
import { formatDateOnly } from '../../utils/dateFormatter';
import { useLanguage } from '../../context/LanguageContext';
import { X, Clock, MapPin, Building, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

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

  if (!isOpen || !complaint) return null;

  const formattedDate = formatDateOnly(complaint.submittedAt, language);

  const departmentDisplay =
    complaint.assignedDepartmentName ||
    (complaint.assignedDepartmentId && complaint.assignedDepartmentId !== 'unassigned'
      ? complaint.assignedDepartmentId.toUpperCase()
      : 'MUNICIPAL TRIAGE');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-file-title"
    >
      <div className="w-full max-w-2xl bg-[#F1F1F0] border border-[#D5D5D3] rounded-xl shadow-2xl overflow-hidden text-start">
        
        {/* Case File Folder Tab Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAFAF9] border-b border-[#D5D5D3]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111]">
              CASE FILE
            </span>
            <span className="text-xs font-mono text-[#5B5B5B]">
              #{complaint.referenceNumber}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#5B5B5B] hover:text-[#111111] hover:bg-[#EAEAE8] transition-colors cursor-pointer"
            aria-label="Close case file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Case File Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Title & Metadata */}
          <div className="space-y-3 pb-6 border-b border-[#D5D5D3]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#5B5B5B]">
                {departmentDisplay}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#111111] text-white">
                {complaint.status.replace('_', ' ')}
              </span>
            </div>

            <h2 id="case-file-title" className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
              {complaint.title}
            </h2>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-mono text-[#5B5B5B]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#111111]" />
                <span>{complaint.locality}, {complaint.district}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted: {formattedDate}</span>
              </span>
            </div>
          </div>

          {/* Original Complaint Statement */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5B5B5B] block">
              Original Grievance Statement (Roman Urdu)
            </span>
            <div className="p-4 rounded-lg bg-[#FAFAF9] border border-[#D5D5D3]">
              <p className="text-sm sm:text-base text-[#111111] leading-relaxed whitespace-pre-wrap font-sans">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Department Information & Progress */}
          <div className="space-y-3 pt-4 border-t border-[#D5D5D3]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5B5B5B] block">
              Assigned Municipal Department
            </span>
            <div className="p-4 rounded-lg bg-[#FAFAF9] border border-[#D5D5D3] flex items-start gap-3">
              <Building className="w-5 h-5 text-[#111111] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase text-[#111111] block">
                  {departmentDisplay}
                </span>
                <p className="text-xs text-[#5B5B5B] mt-0.5">
                  Grievance indexed under municipal case records. Updates from field engineers will populate here.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Ownership Verification */}
          <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#5B5B5B]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#111111]" />
              <span>Row-Level Security Protected</span>
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Case File
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
