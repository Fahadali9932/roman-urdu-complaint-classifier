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
  ArrowRight,
  Edit3,
  FileText,
  History,
  CheckCircle2,
  Building2,
  ShieldCheck,
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
      <div className="flex-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs min-h-[460px]">
        <div className="w-14 h-14 rounded-2xl bg-[#F4F6F6] text-[#687E8B] flex items-center justify-center mb-4 border border-[#E1E4E6]">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#0F1E21] mb-1.5">
          {t('deptSelectPrompt')}
        </h3>
        <p className="text-sm text-[#5B646B] max-w-sm leading-relaxed">
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
    <div className="flex-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl shadow-xs flex flex-col overflow-hidden">
      {/* Mobile / Tablet Back Button */}
      {onBackToList && (
        <div className="lg:hidden p-3.5 border-b border-[#E1E4E6] bg-[#FAFBFB] flex items-center">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-2 text-sm font-semibold text-[#122E32] hover:underline cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t('deptBackToInbox')}</span>
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="p-5 sm:p-6 border-b border-[#E1E4E6] bg-[#FAFBFB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#0F1E21]">
              {complaint.referenceNumber}
            </span>
            {getStatusChip(complaint.status, language)}
            <span className="text-xs sm:text-sm text-[#5B646B] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#687E8B]" />
              <span>{formatDateTime(complaint.submittedAt)}</span>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F1E21]">
            {complaint.title}
          </h2>
        </div>

        {/* Primary Status Update Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenStatusModal}
            className="dept-btn-primary h-11 px-5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>{t('deptUpdateStatus')}</span>
          </button>
        </div>
      </div>

      {/* Detail Content Body */}
      <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">
        {/* Original Complaint (Centerpiece) */}
        <section className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2C4A52] uppercase tracking-wider">
              <FileText className="w-4 h-4 text-[#2C4A52]" />
              <span>{t('deptOriginalComplaint')}</span>
            </div>
            <span className="text-xs text-[#5B646B] font-medium">Roman Urdu / English</span>
          </div>
          <p className="text-base sm:text-lg text-[#0F1E21] leading-relaxed whitespace-pre-wrap font-normal">
            {complaint.description}
          </p>
        </section>

        {/* Incident Location & Department Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Incident Location (Zero PII - Only municipal coordinates) */}
          <div className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-2xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F1E21] uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#2C4A52]" />
              <span>{t('deptIncidentLocation')}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-2 border-b border-[#ECEEEF] pb-2">
                <span className="text-xs text-[#5B646B] font-medium">{t('deptLocality')}:</span>
                <span className="font-semibold text-[#0F1E21] text-right rtl:text-left">{complaint.locality}</span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-[#ECEEEF] pb-2">
                <span className="text-xs text-[#5B646B] font-medium">{t('deptDistrict')}:</span>
                <span className="font-semibold text-[#0F1E21] text-right rtl:text-left">{complaint.district}</span>
              </div>
              <div className="flex items-start justify-between gap-2 pt-0.5">
                <span className="text-xs text-[#5B646B] font-medium">{t('deptStreetLandmark')}:</span>
                <span className="font-semibold text-[#0F1E21] text-right rtl:text-left">
                  {complaint.publicLocation || 'Not specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Department Assignment */}
          <div className="bg-[#FAFBFB] border border-[#E1E4E6] rounded-2xl p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F1E21] uppercase tracking-wider mb-3">
                <Building2 className="w-4 h-4 text-[#2C4A52]" />
                <span>{language === 'ur' ? 'تفویض شدہ بلدیاتی ادارہ' : 'Assigned Authority'}</span>
              </div>
              <div className="space-y-2">
                <div className="text-base font-bold text-[#0F1E21]">
                  {departmentMeta ? (language === 'ur' ? departmentMeta.nameUrdu : departmentMeta.name) : (complaint.assignedDepartmentName || complaint.assignedDepartmentId.toUpperCase())}
                </div>
                <div className="inline-block text-xs font-bold font-mono text-[#2C4A52] bg-[#2C4A52]/10 px-2.5 py-1 rounded-md">
                  {departmentMeta?.code || complaint.assignedDepartmentId.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ECEEEF] flex items-center gap-2 text-xs text-[#5B646B]">
              <ShieldCheck className="w-4 h-4 text-[#2C4A52] shrink-0" />
              <span>{language === 'ur' ? 'شہری رازداری محفوظ' : 'Citizen privacy strictly enforced.'}</span>
            </div>
          </div>
        </div>

        {/* Progress History Timeline */}
        <section className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#ECEEEF] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0F1E21]">
              <History className="w-4 h-4 text-[#2C4A52]" />
              <span>{t('deptProgressHistory')}</span>
            </div>
            <span className="text-xs text-[#5B646B] font-medium">
              {complaint.timeline?.length || 1} {language === 'ur' ? 'مراحل' : 'events'}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {complaint.timeline && complaint.timeline.length > 0 ? (
              complaint.timeline.map((item, idx) => (
                <div key={item.id || idx} className="relative pl-6 rtl:pl-0 rtl:pr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[#D0D9DE] pb-4 last:pb-0">
                  <div className="absolute -left-[7px] rtl:-left-auto rtl:-right-[7px] top-1 w-3 h-3 rounded-full bg-[#122E32] ring-4 ring-white" />
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-[#0F1E21]">
                      {getActorLabel(item.actorRole)}
                    </span>
                    <span className="text-xs text-[#5B646B]">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="mb-1">{getStatusChip(item.status, language)}</div>
                  {(item.description || item.descriptionUrdu) && (
                    <p className="text-sm text-[#0F1E21] bg-[#FAFBFB] border border-[#E1E4E6] rounded-xl p-3 mt-2 leading-relaxed">
                      {language === 'ur' ? (item.descriptionUrdu || item.description) : item.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 text-sm text-[#5B646B] py-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C4A52]" />
                <span>Logged into departmental queue.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
