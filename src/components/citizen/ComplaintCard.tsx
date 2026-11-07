import React from 'react';
import { type Complaint } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../common/Card';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { formatDateOnly } from '../../utils/dateFormatter';
import { MapPin, Calendar, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComplaintCardProps {
  complaint: Complaint;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  const { language, t, isRTL } = useLanguage();

  return (
    <Card hoverable className="p-5 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="ref-code text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/80">
            {complaint.referenceNumber}
          </span>
          {complaint.isDemonstration && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
              DEMO
            </span>
          )}
        </div>
        <ComplaintStatusBadge status={complaint.status} size="sm" />
      </div>

      <div className="mt-3.5 space-y-1.5">
        <h4 className="text-base font-bold text-slate-900 line-clamp-1">
          {complaint.title}
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed roman-urdu-text">
          "{complaint.description}"
        </p>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>{complaint.district} • {complaint.locality}</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>{formatDateOnly(complaint.submittedAt, language)}</span>
          </span>
          {complaint.assignedDepartmentName && (
            <span className="flex items-center gap-1.5 text-teal-800 font-medium">
              <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
              <span>{complaint.assignedDepartmentName.split('(')[0].trim()}</span>
            </span>
          )}
        </div>

        <Link
          to={`/track/${complaint.referenceNumber}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 group min-h-[36px] py-1 px-2 rounded-md hover:bg-teal-50 transition-colors"
          aria-label={`Track complaint ${complaint.referenceNumber}`}
        >
          <span>{t('dashViewAction')}</span>
          <ArrowRight
            className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
              isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''
            }`}
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
};
