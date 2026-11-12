import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Inbox } from 'lucide-react';

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

  const filterItems: { id: DepartmentStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('deptFilterAll'), count: counts.all },
    { id: 'new', label: t('deptFilterNew'), count: counts.new },
    { id: 'in_progress', label: t('deptFilterInProgress'), count: counts.in_progress },
    { id: 'resolved', label: t('deptFilterResolved'), count: counts.resolved },
  ];

  return (
    <aside className="w-52 lg:w-56 shrink-0 flex flex-col gap-2">
      <nav className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl p-2 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-[#5B646B] uppercase tracking-wider flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-[#687E8B]" />
          <span>{t('deptWorkspaceTitle')}</span>
        </div>

        {filterItems.map((item) => {
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectFilter(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#122E32] text-[#FFFFFF]'
                  : 'text-[#0F1E21] hover:bg-[#F4F6F6] text-left'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                    : 'bg-[#F4F6F6] text-[#5B646B]'
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
