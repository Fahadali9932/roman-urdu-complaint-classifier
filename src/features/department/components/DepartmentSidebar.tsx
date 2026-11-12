import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Inbox, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

export type DepartmentStatusFilter = 'all' | 'new' | 'in_progress' | 'resolved';

interface DepartmentSidebarProps {
  activeFilter: DepartmentStatusFilter;
  onSelectFilter: (filter: DepartmentStatusFilter) => void;
  counts: {
    all: number;
    new: number;
    in_progress: number;
    resolved: number;
  };
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  activeFilter,
  onSelectFilter,
  counts,
}) => {
  const { t } = useLanguage();

  const filterItems: {
    id: DepartmentStatusFilter;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'all', label: t('deptFilterAll'), count: counts.all, icon: Inbox },
    { id: 'new', label: t('deptFilterNew'), count: counts.new, icon: Sparkles },
    { id: 'in_progress', label: t('deptFilterInProgress'), count: counts.in_progress, icon: Clock },
    { id: 'resolved', label: t('deptFilterResolved'), count: counts.resolved, icon: CheckCircle2 },
  ];

  return (
    <aside className="w-56 lg:w-60 shrink-0 flex flex-col">
      <nav className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl p-2 shadow-xs space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-[#5B646B] uppercase tracking-wider flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-[#687E8B]" />
          <span>{t('deptWorkspaceTitle')}</span>
        </div>

        {filterItems.map((item) => {
          const isActive = activeFilter === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFilter(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#122E32] text-[#FFFFFF] shadow-xs'
                  : 'text-[#0F1E21] hover:bg-[#F4F6F6] text-left rtl:text-right'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#687E8B]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                    : 'bg-[#F4F6F6] text-[#5B646B] border border-[#E1E4E6]'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
