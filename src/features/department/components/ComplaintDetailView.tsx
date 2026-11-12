import React from 'react';
import { ArrowLeft, ArrowRight, Building2, Clock3, Edit3, FileText, History, MapPin } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { type ComplaintStatus, type DepartmentComplaintView } from '../../../types';
import { getStatusChip } from './ComplaintInboxList';

interface ComplaintDetailViewProps {
  complaint: DepartmentComplaintView | null;
  onOpenStatusModal: () => void;
  onQuickStatusUpdate: (newStatus: ComplaintStatus) => void;
  onBackToList?: () => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({ complaint, onOpenStatusModal, onBackToList }) => {
  const { departmentMeta } = useDepartmentAuth();
  const { language, t, isRTL } = useLanguage();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (!complaint) {
    return (
      <div className="dept-panel dept-subtle-panel flex min-h-[360px] h-full flex-col items-center justify-center px-6 text-center">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dept-tint)] text-[var(--dept-primary)]"><FileText className="h-5 w-5" /></span>
        <h2 className="text-base font-bold text-[var(--dept-ink)]">{t('deptSelectPrompt')}</h2>
      </div>
    );
  }

  const formatDateTime = (value: string) => {
    try {
      return new Date(value).toLocaleString(language === 'ur' ? 'ur-PK' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return value;
    }
  };
  const actorLabel = (role: string) => {
    if (role === 'citizen') return language === 'ur' ? 'شہری' : 'Citizen';
    if (role === 'department_officer') return language === 'ur' ? 'محکمہ' : 'Department';
    return language === 'ur' ? 'سسٹم' : 'System';
  };

  return (
    <article className="dept-panel flex h-full min-h-[520px] flex-col overflow-hidden">
      {onBackToList && (
        <div className="flex items-center border-b border-[var(--dept-border)] bg-[var(--dept-panel)] px-4 py-3 xl:hidden">
          <button type="button" onClick={onBackToList} className="flex items-center gap-2 text-sm font-semibold text-[var(--dept-primary)]">
            <BackIcon className="h-4 w-4" /><span>{t('deptBackToInbox')}</span>
          </button>
        </div>
      )}
      <header className="flex flex-col gap-4 border-b border-[var(--dept-border)] bg-[var(--dept-panel)] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[var(--dept-ink)]">{complaint.referenceNumber}</span>
            {getStatusChip(complaint.status, language)}
          </div>
          <h2 className="text-lg font-bold tracking-[-.025em] text-[var(--dept-ink)]">{complaint.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--dept-muted)]"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(complaint.submittedAt)}</p>
        </div>
        <button type="button" onClick={onOpenStatusModal} className="dept-btn-primary shrink-0"><Edit3 className="h-4 w-4" /><span>{t('deptUpdateStatus')}</span></button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <section className="rounded-xl border border-[var(--dept-border)] bg-[var(--dept-panel)] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.08em] text-[var(--dept-primary)]"><FileText className="h-3.5 w-3.5" />{t('deptOriginalComplaint')}</h3>
            <span className="shrink-0 text-xs text-[var(--dept-muted)]">Roman Urdu / English</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--dept-ink)]">{complaint.description}</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-[var(--dept-border)] p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.08em] text-[var(--dept-primary)]"><MapPin className="h-3.5 w-3.5" />{t('deptIncidentLocation')}</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--dept-border)] pb-2"><dt className="text-xs text-[var(--dept-muted)]">{t('deptLocality')}</dt><dd className="text-right font-semibold text-[var(--dept-ink)] rtl:text-left">{complaint.locality}</dd></div>
              <div className="flex items-start justify-between gap-3 border-b border-[var(--dept-border)] pb-2"><dt className="text-xs text-[var(--dept-muted)]">{t('deptDistrict')}</dt><dd className="text-right font-semibold text-[var(--dept-ink)] rtl:text-left">{complaint.district}</dd></div>
              <div className="flex items-start justify-between gap-3"><dt className="text-xs text-[var(--dept-muted)]">{t('deptStreetLandmark')}</dt><dd className="text-right font-semibold text-[var(--dept-ink)] rtl:text-left">{complaint.publicLocation || (language === 'ur' ? 'درج نہیں' : 'Not specified')}</dd></div>
            </dl>
          </section>
          <section className="rounded-xl border border-[var(--dept-border)] p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.08em] text-[var(--dept-primary)]"><Building2 className="h-3.5 w-3.5" />{language === 'ur' ? 'محکمہ' : 'Department'}</h3>
            <p className="text-sm font-bold leading-5 text-[var(--dept-ink)]">{departmentMeta ? (language === 'ur' ? departmentMeta.nameUrdu : departmentMeta.name) : (complaint.assignedDepartmentName || complaint.assignedDepartmentId.toUpperCase())}</p>
            <span className="mt-3 inline-flex rounded-md bg-[var(--dept-tint)] px-2 py-1 font-mono text-xs font-bold text-[var(--dept-primary)]">{departmentMeta?.code || complaint.assignedDepartmentId.toUpperCase()}</span>
          </section>
        </div>

        <section className="rounded-xl border border-[var(--dept-border)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--dept-border)] pb-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--dept-ink)]"><History className="h-4 w-4 text-[var(--dept-primary)]" />{t('deptProgressHistory')}</h3>
            <span className="text-xs text-[var(--dept-muted)]">{complaint.timeline?.length || 0} {language === 'ur' ? 'اندراجات' : 'events'}</span>
          </div>
          <div className="space-y-4">
            {complaint.timeline?.map((item, index) => (
              <div key={item.id || index} className="relative border-l border-[var(--dept-border)] pb-4 pl-4 last:pb-0 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                <span className="absolute -left-[4px] top-1.5 h-2 w-2 rounded-full bg-[var(--dept-accent)] rtl:-left-auto rtl:-right-[4px]" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--dept-ink)]">{actorLabel(item.actorRole)}</span>
                  <span className="text-xs text-[var(--dept-muted)]">{formatDateTime(item.timestamp)}</span>
                </div>
                <div className="mt-1.5">{getStatusChip(item.status, language)}</div>
                {(item.description || item.descriptionUrdu) && <p className="mt-2 text-sm leading-6 text-[var(--dept-muted)]">{language === 'ur' ? (item.descriptionUrdu || item.description) : item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
};
