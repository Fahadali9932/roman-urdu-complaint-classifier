import React from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { getStatusBadge } from './ComplaintInboxList';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Cpu,
  FileText,
  History,
  CheckCircle2,
  ArrowLeft,
  Edit3,
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
      <div className="flex-1 bg-[#FFFFFF] border border-[#E5E3E0] rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-[#F7F6F3] text-[#737373] flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-[#141414] mb-1">
          {t('deptSelectComplaint')}
        </h3>
        <p className="text-xs text-[#737373] max-w-md leading-relaxed">
          {t('deptSelectComplaintDesc')}
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

  const getActorBadge = (role: string) => {
    switch (role) {
      case 'citizen':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {language === 'ur' ? 'شہری' : 'Citizen'}
          </span>
        );
      case 'system':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {language === 'ur' ? 'اے آئی ٹرائج' : 'AI Classifier'}
          </span>
        );
      case 'department_officer':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {language === 'ur' ? 'محکمہ افسر' : 'Department Officer'}
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#FFFFFF] border border-[#E5E3E0] rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Mobile Back Button Bar */}
      {onBackToList && (
        <div className="md:hidden p-3 border-b border-[#E5E3E0] bg-[#FAFAF8] flex items-center">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#681822] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('deptBackToInbox')}</span>
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="p-4 sm:p-6 border-b border-[#E5E3E0] bg-[#FAFAF8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-bold tracking-tight text-[#141414]">
              {complaint.referenceNumber}
            </span>
            {getStatusBadge(complaint.status, language)}
            <span className="text-[11px] text-[#737373] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDateTime(complaint.submittedAt)}</span>
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-[#141414]">
            {complaint.title}
          </h2>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenStatusModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#681822] hover:bg-[#50131B] text-[#FFFFFF] text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#681822]/30"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('deptUpdateStatus')}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)]">
        {/* Citizen Privacy Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-semibold block">
              {t('deptPrivacyShield')}
            </span>
            <span className="text-[11px] text-emerald-800">
              {t('deptPrivacyNotice')}
            </span>
          </div>
        </div>

        {/* Dual Meta Cards: Location & AI Triage */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Incident Location Card */}
          <div className="bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#141414] font-semibold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-[#681822]" />
              <span>{t('deptIncidentLocation')}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-3 py-1.5 border-b border-[#EBE7DF]">
                <span className="text-[#737373] shrink-0">{t('deptDistrict')}:</span>
                <span className="font-semibold text-[#141414] text-right">
                  {complaint.district}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1.5 border-b border-[#EBE7DF]">
                <span className="text-[#737373] shrink-0">{t('deptLocality')}:</span>
                <span className="font-semibold text-[#141414] text-right">
                  {complaint.locality}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1.5">
                <span className="text-[#737373] shrink-0">{t('deptStreetLandmark')}:</span>
                <span className="font-medium text-[#141414] text-right">
                  {complaint.publicLocation || 'Not specified by citizen'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Categorization Card */}
          <div className="bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#141414] font-semibold text-xs uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-[#681822]" />
              <span>{t('deptAiCategorization')}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-3 py-1.5 border-b border-[#EBE7DF]">
                <span className="text-[#737373] shrink-0">
                  {language === 'ur' ? 'شناخت شدہ زبان' : 'Detected Language'}:
                </span>
                <span className="font-semibold text-[#141414] text-right">
                  Roman Urdu (اردو رسم الخط برائے انگریزی)
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1.5 border-b border-[#EBE7DF]">
                <span className="text-[#737373] shrink-0">
                  {language === 'ur' ? 'متعلقہ محکمہ' : 'Target Authority'}:
                </span>
                <span className="font-semibold text-[#141414] text-right">
                  {departmentMeta.name} ({departmentMeta.code})
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1.5">
                <span className="text-[#737373] shrink-0">
                  {language === 'ur' ? 'اعتماد کی شرح' : 'Classifier Confidence'}:
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {Math.round((complaint.predictionConfidence || 0.94) * 100)}% Match
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Roman Urdu Grievance Card */}
        <div className="bg-[#FCFBF9] border-2 border-[#E8E2D5] rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#681822] uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>{t('deptCitizenStatement')}</span>
            </div>
            <span className="text-[10px] font-bold text-[#681822] bg-[#681822]/10 px-2 py-0.5 rounded">
              VERBATIM CITIZEN RECORD
            </span>
          </div>

          <div className="border-l-4 border-l-[#681822] pl-4 py-1 space-y-2">
            <h4 className="text-sm font-bold text-[#141414]">
              &ldquo;{complaint.title}&rdquo;
            </h4>
            <p className="text-xs sm:text-sm text-[#222222] italic leading-relaxed font-serif">
              &ldquo;{complaint.description}&rdquo;
            </p>
          </div>
        </div>

        {/* Quick Status Action Controls */}
        <div className="bg-[#FAF9F6] border border-[#EBE7DF] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141414] uppercase tracking-wider">
              {language === 'ur' ? 'فوری کارروائی' : 'Quick Operational Transitions'}
            </span>
            <span className="text-[11px] text-[#737373]">
              Click to advance workflow or open full dialog for custom notes
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {complaint.status !== 'in_progress' && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mark In Progress</span>
              </button>
            )}
            {complaint.status !== 'assigned' && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('assigned')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dispatch Field Team</span>
              </button>
            )}
            {complaint.status !== 'resolved' && (
              <button
                type="button"
                onClick={() => onQuickStatusUpdate('resolved')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenStatusModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3E0] bg-[#FFFFFF] hover:bg-[#F3EFEA] text-[#141414] text-xs font-medium transition-colors ml-auto"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#737373]" />
              <span>{t('deptUpdateStatus')} &amp; Add Note...</span>
            </button>
          </div>
        </div>

        {/* Audit Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#141414] uppercase tracking-wider">
            <History className="w-4 h-4 text-[#681822]" />
            <span>{t('deptTimeline')}</span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E3E0]">
            {complaint.timeline.map((evt) => (
              <div key={evt.id} className="relative flex flex-col gap-1 text-xs">
                {/* Marker Dot */}
                <div className="absolute -left-6 sm:-left-8 top-1 w-2.5 h-2.5 rounded-full bg-[#681822] ring-4 ring-[#FFFFFF]" />

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#141414]">
                    {language === 'ur' ? evt.titleUrdu : evt.title}
                  </span>
                  {getActorBadge(evt.actorRole)}
                  <span className="text-[10px] text-[#737373]">
                    {formatDateTime(evt.timestamp)}
                  </span>
                </div>

                <p className="text-[#5B5B5B] leading-relaxed">
                  {language === 'ur' ? evt.descriptionUrdu : evt.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
