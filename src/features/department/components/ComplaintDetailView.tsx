import React from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
  type ComplaintTimelineEvent,
} from '../../../types';
import { getStatusChip } from './ComplaintInboxList';
import {
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
  Edit3,
  FileText,
  History,
  Building2,
  Calendar,
} from 'lucide-react';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: () => void;
  onQuickStatusUpdate: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  onOpenStatusModal,
  onBackToList,
}) => {
  const { departmentMeta } = useDepartmentAuth();
  const { language, t, isRTL } = useLanguage();

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (!complaint) {
    return (
      <div className="flex-1 bg-white/80 backdrop-blur-xl border border-black/[0.08] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs min-h-[460px]">
        <div className="w-12 h-12 rounded-2xl bg-black/5 text-slate-500 flex items-center justify-center mb-3 border border-black/10">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#111827] mb-1">
          {t('deptSelectPrompt')}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
          Select an assigned complaint from the list to review the issue and record progress.
        </p>
      </div>
    );
  }

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(language === 'ur' ? 'ur-PK' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  const getActorLabel = (role: string) => {
    switch (role) {
      case 'citizen':
        return language === 'ur' ? 'شہری' : 'Citizen';
      case 'department_officer':
        return language === 'ur' ? 'محکمہ' : 'Department Officer';
      default:
        return language === 'ur' ? 'سسٹم' : 'System';
    }
  };

  return (
    <div className="flex-1 bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Mobile / Tablet Back Button */}
      {onBackToList && (
        <div className="lg:hidden p-3 border-b border-black/[0.08] bg-black/[0.02] flex items-center">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#111827] hover:underline cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t('deptBackToInbox')}</span>
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="p-5 sm:p-6 border-b border-black/[0.08] bg-black/[0.02] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-black text-[#111827]">
              {complaint.referenceNumber}
            </span>
            {getStatusChip(complaint.status, language)}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Submitted {formatDateTime(complaint.submittedAt)}</span>
          </p>
        </div>

        {/* Action Button: Open Status Update Dialog */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenStatusModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <Edit3 className="w-4 h-4" />
            <span>{t('deptUpdateStatus')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
        {/* Section 1: Original Citizen Complaint in Roman Urdu */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('deptOriginalComplaint')}</span>
            <span className="font-mono text-[10px] text-slate-400">
              {complaint.detectedLanguage === 'roman_urdu' ? 'ROMAN URDU' : 'ENGLISH'}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-black/[0.03] border border-black/[0.08] text-[#111827] text-sm sm:text-base leading-relaxed font-sans whitespace-pre-wrap">
            {complaint.description}
          </div>
        </div>

        {/* Section 2: Public Issue Location */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('deptIncidentLocation')}
          </div>

          <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#111827]">
                  {complaint.locality}, {complaint.district}
                </div>
                {complaint.publicLocation && (
                  <div className="text-slate-500 text-xs mt-0.5">
                    {complaint.publicLocation}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned: {departmentMeta?.name || complaint.assignedDepartmentId}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {complaint.district}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Status Transition Timeline / History */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('deptProgressHistory')}</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs">
            {complaint.timeline && complaint.timeline.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-black/[0.08]">
                {complaint.timeline.map((event: ComplaintTimelineEvent, i: number) => (
                  <div key={i} className="flex items-start gap-3 relative pl-6">
                    <span className="w-2 h-2 rounded-full bg-[#111827] absolute left-1 top-1.5 ring-4 ring-white" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111827]">
                          {event.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {event.description || event.title || (event.actorRole ? `Updated by ${getActorLabel(event.actorRole)}` : 'Status updated')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>No timeline events recorded yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
