import React from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { getStatusChip } from './ComplaintInboxList';
import {
  MapPin,
  Clock,
  ArrowLeft,
  Edit3,
  FileText,
  History,
  CheckCircle2,
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
  onQuickStatusUpdate,
  onBackToList,
}) => {
  const { departmentMeta } = useDepartmentAuth();
  const { language, t } = useLanguage();

  if (!complaint) {
    return (
      <div className="flex-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xs min-h-[480px]">
        <div className="w-12 h-12 rounded-xl bg-[#F4F6F6] text-[#687E8B] flex items-center justify-center mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#0F1E21] mb-1">
          {t('deptSelectPrompt')}
        </h3>
        <p className="text-xs text-[#5B646B] max-w-sm leading-relaxed">
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
        return language === 'ur' ? 'محکمہ' : 'Department';
      default:
        return language === 'ur' ? 'سسٹم' : 'System';
    }
  };

  return (
    <div className="flex-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl shadow-xs flex flex-col overflow-hidden">
      {/* Mobile Back Button */}
      {onBackToList && (
        <div className="md:hidden p-3 border-b border-[#E1E4E6] bg-[#FAFBFB] flex items-center">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#122E32] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('deptBackToInbox')}</span>
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="p-4 sm:p-6 border-b border-[#E1E4E6] bg-[#FAFBFB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-bold tracking-tight text-[#0F1E21]">
              {complaint.referenceNumber}
            </span>
            {getStatusChip(complaint.status, language)}
            <span className="text-xs text-[#5B646B] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#687E8B]" />
              <span>{formatDateTime(complaint.submittedAt)}</span>
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-[#0F1E21]">
            {complaint.title}
          </h2>
        </div>

        {/* Primary Status Update Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenStatusModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#122E32] hover:bg-[#0F1E21] text-[#FFFFFF] text-xs font-medium transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('deptUpdateStatus')}</span>
          </button>
        </div>
      </div>

      {/* Detail Content Body */}
      <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)]">
        {/* Original Complaint (Centerpiece) */}
        <section className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2C4A52] uppercase tracking-wider">
            <FileText className="w-4 h-4 text-[#2C4A52]" />
            <span>{t('deptOriginalComplaint')}</span>
          </div>
          <p className="text-sm sm:text-[15px] text-[#0F1E21] leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>
        </section>

        {/* Incident Location & Department Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Incident Location (Zero PII - Only municipal location) */}
          <div className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#2C4A52]" />
              <span>{t('deptIncidentLocation')}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#ECEEEF]">
                <span className="text-[#5B646B]">{t('deptDistrict')}</span>
                <span className="font-semibold text-[#0F1E21]">{complaint.district}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#ECEEEF]">
                <span className="text-[#5B646B]">{t('deptLocality')}</span>
                <span className="font-semibold text-[#0F1E21]">{complaint.locality}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5B646B]">{t('deptStreetLandmark')}</span>
                <span className="font-medium text-[#0F1E21] text-right">
                  {complaint.publicLocation || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Department (Real configuration - no fake AI percentages) */}
          <div className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
              <span>{language === 'ur' ? 'تفویض شدہ محکمہ' : 'Assigned Department'}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="py-1 border-b border-[#ECEEEF]">
                <span className="text-[#5B646B] block mb-0.5">
                  {language === 'ur' ? 'محکمہ کا نام' : 'Department Name'}
                </span>
                <span className="font-semibold text-[#0F1E21]">
                  {departmentMeta?.name || complaint.assignedDepartmentName || 'Assigned'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5B646B]">
                  {language === 'ur' ? 'محکمانہ کوڈ' : 'Department Code'}
                </span>
                <span className="font-mono font-semibold text-[#2C4A52] bg-[#2C4A52]/10 px-2 py-0.5 rounded">
                  {departmentMeta?.code || complaint.assignedDepartmentId.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operational Transitions */}
        <section className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
              {t('deptStatusManagement')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {complaint.status === 'submitted' && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('under_review')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ACAFB6] bg-[#FFFFFF] hover:bg-[#F4F6F6] text-xs font-medium text-[#0F1E21] transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2C4A52]" />
                <span>{t('deptMarkSeen')}</span>
              </button>
            )}

            {(complaint.status === 'submitted' || complaint.status === 'under_review') && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C2D6D9] bg-[#EAF1F2] hover:bg-[#DEEBEF] text-xs font-medium text-[#122E32] transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('deptStartWork')}</span>
              </button>
            )}

            {complaint.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('resolved')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CCE0D3] bg-[#EEF5F1] hover:bg-[#E2EFE6] text-xs font-medium text-[#245938] transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('deptMarkResolved')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenStatusModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E4E6] bg-[#FFFFFF] hover:bg-[#F4F6F6] text-xs font-medium text-[#5B646B] hover:text-[#0F1E21] transition-colors ml-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('deptUpdateStatus')}...</span>
            </button>
          </div>
        </section>

        {/* Progress History / Timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-[#687E8B]" />
            <span>{t('deptProgressHistory')}</span>
          </div>

          <div className="relative pl-6 sm:pl-7 space-y-4 before:absolute before:left-2 sm:before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[#E1E4E6]">
            {complaint.timeline.map((evt) => (
              <div key={evt.id} className="relative flex flex-col gap-0.5 text-xs">
                {/* Timeline Marker */}
                <div className="absolute -left-6 sm:-left-7 top-1 w-2 h-2 rounded-full bg-[#122E32] ring-3 ring-[#FFFFFF]" />

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#0F1E21]">
                    {language === 'ur' ? evt.titleUrdu : evt.title}
                  </span>
                  <span className="text-[10px] text-[#5B646B] bg-[#F4F6F6] px-1.5 py-0.2 rounded border border-[#E1E4E6]">
                    {getActorLabel(evt.actorRole)}
                  </span>
                  <span className="text-[11px] text-[#5B646B]">
                    {formatDateTime(evt.timestamp)}
                  </span>
                </div>

                <p className="text-[#5B646B] leading-relaxed">
                  {language === 'ur' ? evt.descriptionUrdu : evt.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
