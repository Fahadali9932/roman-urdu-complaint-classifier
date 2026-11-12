import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Droplets, Flame, Globe, LogOut, Trash2, Zap } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { type DepartmentId } from '../../../types';

export const getDepartmentIcon = (id: DepartmentId | null, className = 'h-4 w-4') => {
  switch (id) {
    case 'kelectric': return <Zap className={className} />;
    case 'sswmb': return <Trash2 className={className} />;
    case 'ssgc': return <Flame className={className} />;
    case 'kwsc': return <Droplets className={className} />;
    default: return <Building2 className={className} />;
  }
};

export const DepartmentHeader: React.FC = () => {
  const { departmentId, departmentMeta, signOut } = useDepartmentAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const departmentName = departmentMeta ? (language === 'ur' ? departmentMeta.nameUrdu : departmentMeta.name) : '';

  const handleSignOut = () => {
    signOut();
    navigate('/department/login');
  };

  return (
    <header className="dept-toolbar flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-7">
      <Link to="/department" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dept-accent)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--dept-shell)] text-sm font-bold text-white">آ</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold tracking-tight text-[var(--dept-ink)]">Awaaz-e-Awam</span>
          <span className="hidden text-[11px] font-medium text-[var(--dept-muted)] sm:block">{t('deptPortalLabel')}</span>
        </span>
      </Link>

      {departmentMeta && (
        <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-[var(--dept-border)] bg-[var(--dept-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--dept-ink)] md:flex">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--dept-tint)] text-[var(--dept-primary)]">
            {getDepartmentIcon(departmentId, 'h-3.5 w-3.5')}
          </span>
          <span className="max-w-[230px] truncate lg:max-w-[360px]">{departmentName}</span>
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-[var(--dept-muted)]">{departmentMeta.code}</span>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={toggleLanguage} className="flex items-center gap-1.5 rounded-lg border border-[var(--dept-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--dept-ink)] transition-colors hover:bg-[var(--dept-tint)]" title="Switch language">
          <Globe className="h-3.5 w-3.5 text-[var(--dept-muted)]" />
          <span>{language === 'en' ? 'اردو' : 'English'}</span>
        </button>
        <button type="button" onClick={handleSignOut} className="flex items-center gap-1.5 rounded-lg border border-[var(--dept-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--dept-muted)] transition-colors hover:border-[var(--dept-accent)] hover:text-[var(--dept-ink)]" title={t('deptSignOut')}>
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('deptSignOut')}</span>
        </button>
      </div>
    </header>
  );
};
