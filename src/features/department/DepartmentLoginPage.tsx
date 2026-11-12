import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Eye, EyeOff, Globe, Landmark, LockKeyhole } from 'lucide-react';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { type DepartmentId } from '../../types';
import { getDepartmentIcon } from './components/DepartmentHeader';
import './department-theme.css';

export const DepartmentLoginPage: React.FC = () => {
  const { availableDepartments, signIn } = useDepartmentAuth();
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [selectedDeptId, setSelectedDeptId] = useState<DepartmentId>('kelectric');
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedDepartment = availableDepartments.find((department) => department.id === selectedDeptId) || availableDepartments[0];
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsDropdownOpen(false); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = signIn(selectedDeptId, accessKey);
    if (result.success) navigate('/department');
    else setError(result.error || 'Unable to continue.');
  };

  return (
    <div className="dept-workspace-root dept-login-root" data-department={selectedDeptId} dir={isRTL ? 'rtl' : 'ltr'}>
      <main className="dept-login-stage relative flex items-center justify-center px-0 py-0 sm:px-6 sm:py-10">
        <div className="dept-login-frame relative z-10 grid overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
          <section className="dept-login-brand flex min-h-[360px] flex-col justify-between p-7 text-white sm:p-10 lg:min-h-0 lg:p-12">
            <div>
              <div className="mb-14 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  <span className="dept-login-brand-mark flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold">آ</span>
                  <span className="text-sm font-semibold tracking-tight">Awaaz-e-Awam</span>
                </Link>
                <button type="button" onClick={toggleLanguage} className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" title="Switch language">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? 'اردو' : 'English'}</span>
                </button>
              </div>
              <div className="max-w-md">
                <p className="mb-4 text-xs font-bold uppercase tracking-[.16em] text-white/55">{t('deptPortalLabel')}</p>
                <h1 className="text-4xl font-bold leading-[1.03] tracking-[-.045em] sm:text-5xl">{t('deptBrandPanelTitle')}</h1>
                <p className="mt-5 max-w-sm text-sm leading-6 text-white/68 sm:text-base">{t('deptBrandPanelSubtitle')}</p>
              </div>
            </div>
            <div className="max-w-sm border-t border-white/14 pt-5 text-xs leading-5 text-white/62">
              {language === 'ur' ? 'شکایت کی تفصیلات صرف اپنے محکمے کی فہرست میں دیکھیں۔' : 'Review complaint details only in your department’s assigned queue.'}
            </div>
          </section>

          <section className="dept-login-form flex items-center p-7 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-white"><Landmark className="h-5 w-5" /></span>
                <h2 className="text-2xl font-bold tracking-[-.03em] text-white">{t('deptSignInTitle')}</h2>
                <p className="mt-2 text-sm leading-6 text-white/62">{language === 'ur' ? 'اپنے محکمے کو تفویض کردہ شکایات کا انتظام کریں۔' : 'Manage complaints assigned to your department.'}</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-5">
                {error && <div className="rounded-xl border border-rose-300/35 bg-rose-950/35 p-3 text-xs font-semibold text-rose-100">{error}</div>}
                <div ref={dropdownRef} className="relative">
                  <label className="dept-label">{t('deptSelectAgency')}</label>
                  <button type="button" onClick={() => setIsDropdownOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={isDropdownOpen} className="dept-select-trigger flex h-12 w-full items-center justify-between rounded-xl border px-3.5 text-left transition-colors rtl:text-right">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[var(--dept-accent)]">{getDepartmentIcon(selectedDepartment.id, 'h-3.5 w-3.5')}</span>
                      <span className="truncate text-sm font-semibold">{language === 'ur' ? selectedDepartment.nameUrdu : selectedDepartment.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white/72">{selectedDepartment.code}</span>
                      <ChevronDown className={'h-4 w-4 text-white/58 transition-transform ' + (isDropdownOpen ? 'rotate-180' : '')} />
                    </span>
                  </button>
                  {isDropdownOpen && (
                    <div role="listbox" className="dept-fade-in absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/15 bg-[#182027] py-1 shadow-[0_18px_38px_rgba(0,0,0,.36)]">
                      {availableDepartments.map((department) => {
                        const isSelected = department.id === selectedDeptId;
                        return (
                          <button key={department.id} type="button" role="option" aria-selected={isSelected} onClick={() => { setSelectedDeptId(department.id); setIsDropdownOpen(false); }} className={'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors rtl:text-right ' + (isSelected ? 'bg-white/10 text-white' : 'text-white/78 hover:bg-white/7')}>
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[var(--dept-accent)]">{getDepartmentIcon(department.id, 'h-3.5 w-3.5')}</span>
                              <span className="truncate font-semibold">{language === 'ur' ? department.nameUrdu : department.name}</span>
                            </span>
                            <span className="flex items-center gap-2 font-mono text-[11px] font-bold text-white/54">{department.code}{isSelected && <Check className="h-4 w-4 text-[var(--dept-accent)]" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="accessKey" className="dept-label">{t('deptAccessKeyLabel')}</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-white/48 rtl:left-auto rtl:right-3.5" />
                    <input id="accessKey" type={showKey ? 'text' : 'password'} value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder={t('deptAccessKeyPlaceholder')} className="dept-input pl-10 pr-10 rtl:pr-10 rtl:pl-10" />
                    <button type="button" onClick={() => setShowKey((show) => !show)} className="absolute right-3 top-3 rounded p-0.5 text-white/48 hover:text-white rtl:right-auto rtl:left-3" aria-label={showKey ? 'Hide access key' : 'Show access key'}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <p className="dept-prototype-note rounded-r-lg py-2 pl-3 text-xs leading-5 text-white/62 rtl:rounded-r-none rtl:rounded-l-lg rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-3">
                  {language === 'ur' ? 'پروٹو ٹائپ رسائی: اس مرحلے پر رسائی کوڈ کی تصدیق نہیں ہوتی۔' : 'Prototype access: this key is not validated at this stage.'}
                </p>
                <button type="submit" className="dept-btn-primary w-full"><span>{t('deptEnterPortal')}</span><ArrowIcon className="h-4 w-4" /></button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
