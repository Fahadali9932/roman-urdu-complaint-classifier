import React from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { getDepartmentIcon } from './DepartmentHeader';

export type DepartmentFilterType =
  | 'all'
  | 'new'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

interface DepartmentSidebarProps {
  activeFilter: DepartmentFilterType;
  onSelectFilter: (filter: DepartmentFilterType) => void;
  counts: {
    all: number;
    new: number;
    in_progress: number;
    resolved: number;
    rejected: number;
  };
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  activeFilter,
  onSelectFilter,
  counts,
}) => {
  const { departmentId, departmentMeta } = useDepartmentAuth();
  const { language, t } = useLanguage();

  const filterItems = [
    {
      id: 'all' as DepartmentFilterType,
      label: t('deptFilterAll'),
      count: counts.all,
      icon: Inbox,
    },
    {
      id: 'new' as DepartmentFilterType,
      label: t('deptFilterNew'),
      count: counts.new,
      icon: AlertCircle,
    },
    {
      id: 'in_progress' as DepartmentFilterType,
      label: t('deptFilterInProgress'),
      count: counts.in_progress,
      icon: Clock,
    },
    {
      id: 'resolved' as DepartmentFilterType,
      label: t('deptFilterResolved'),
      count: counts.resolved,
      icon: CheckCircle2,
    },
    {
      id: 'rejected' as DepartmentFilterType,
      label: t('deptFilterRejected'),
      count: counts.rejected,
      icon: XCircle,
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
      {/* Department Summary Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E3E0] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#681822]/10 text-[#681822] flex items-center justify-center shrink-0">
            {getDepartmentIcon(departmentId, 'w-5 h-5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-[#141414] truncate">
                {departmentMeta.code}
              </span>
              <span className="text-[10px] text-[#737373] uppercase font-semibold">
                {language === 'ur' ? 'سرکاری ڈیسک' : 'Official Desk'}
              </span>
            </div>
            <h3 className="font-semibold text-xs text-[#141414] truncate">
              {language === 'ur' ? departmentMeta.nameUrdu : departmentMeta.name}
            </h3>
          </div>
        </div>
        <p className="text-[11px] text-[#737373] leading-relaxed line-clamp-2">
          {language === 'ur' ? departmentMeta.descriptionUrdu : departmentMeta.description}
        </p>
      </div>

      {/* Navigation Filter List */}
      <nav className="bg-[#FFFFFF] border border-[#E5E3E0] rounded-xl p-2 shadow-sm space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
          {language === 'ur' ? 'شکایات فلٹرز' : 'Grievance Views'}
        </div>
        {filterItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFilter(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#681822] text-[#FFFFFF] shadow-sm'
                  : 'text-[#141414] hover:bg-[#F7F6F3] text-left'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#FFFFFF]' : 'text-[#737373]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                    : 'bg-[#F0EDE6] text-[#555555]'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Privacy Guarantee Card */}
      <div className="bg-[#FAFAF8] border border-[#E5E3E0] rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-xs tracking-tight">
            {t('deptPrivacyShield')}
          </span>
        </div>
        <p className="text-[11px] text-[#5B5B5B] leading-relaxed">
          {t('deptPrivacyNotice')}
        </p>
      </div>
    </aside>
  );
};
