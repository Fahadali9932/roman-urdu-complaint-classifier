import React from 'react';
import { CircleDot, CheckCircle2, Clock3, Inbox } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export type DepartmentStatusFilter = 'all' | 'new' | 'in_progress' | 'resolved';

interface DepartmentSidebarProps {
  activeFilter: DepartmentStatusFilter;
  onSelectFilter: (filter: DepartmentStatusFilter) => void;
  counts: Record<DepartmentStatusFilter, number>;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({ activeFilter, onSelectFilter, counts }) => {
  const { t } = useLanguage();
  const filterItems = [
    { id: 'all' as const, label: t('deptFilterAll'), icon: Inbox },
    { id: 'new' as const, label: t('deptFilterNew'), icon: CircleDot },
    { id: 'in_progress' as const, label: t('deptFilterInProgress'), icon: Clock3 },
    { id: 'resolved' as const, label: t('deptFilterResolved'), icon: CheckCircle2 },
  ];

  return (
    <aside className="dept-rail hidden shrink-0 flex-col items-center py-5 xl:flex">
      <nav aria-label={t('deptWorkspaceTitle')} className="flex flex-col items-center gap-3">
        {filterItems.map((item) => {
          const Icon = item.icon;
          const active = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="dept-rail-button group flex items-center justify-center"
              onClick={() => onSelectFilter(item.id)}
              aria-current={active ? 'true' : undefined}
              aria-label={item.label + ': ' + counts[item.id]}
              title={item.label + ' (' + counts[item.id] + ')'}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              <span className="sr-only">{item.label} ({counts[item.id]})</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
