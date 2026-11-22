import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { DepartmentDashboardPage } from './DepartmentDashboardPage';
import { fieldOperations, type StaffPosition } from './services/fieldOperations';

/**
 * Separate Head/Officer entry points share one backend authorization system.
 * Routing is a usability boundary; actual reads and writes remain enforced by
 * membership, AAL2 and database policies, never by the pathname alone.
 */
export function DepartmentRoleBoundary({ expectedRole }: { expectedRole: StaffPosition }) {
  const { departmentId, isAuthenticated, isCheckingSession, session, signOut } = useDepartmentAuth();
  const [result, setResult] = useState<{ identity: string; role: StaffPosition | null; error?: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !departmentId || !session?.userId) return;
    let cancelled = false;
    const identity = `${departmentId}:${session.userId}`;
    fieldOperations.getMyRole(departmentId, session.userId)
      .then((role) => { if (!cancelled) setResult({ identity, role }); })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ identity, role: null, error: error instanceof Error ? error.message : 'Unable to verify department role.' });
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, departmentId, session?.userId]);

  if (isCheckingSession) return <div className="min-h-screen grid place-items-center text-sm text-slate-600" role="status">Verifying your staff session…</div>;
  if (!isAuthenticated || !departmentId || !session?.userId) return <Navigate to={`/department/${expectedRole}/login${departmentId ? `?dept=${departmentId}` : ''}`} replace />;
  if (!result || result.identity !== `${departmentId}:${session.userId}`) return <div className="min-h-screen grid place-items-center text-sm text-slate-600" role="status">Checking department role…</div>;
  if (result.role !== expectedRole) {
    const actual = result.role === 'head' ? 'Department Head' : result.role === 'officer' ? 'Field Officer' : 'unverified staff';
    const isDark = typeof window !== 'undefined' && (localStorage.getItem('aawaaz-demo-theme') === 'dark' || localStorage.getItem('awaaz_dept_theme_mode') === 'dark');
    return <main className={`role-boundary-main min-h-screen grid place-items-center p-5 ${isDark ? 'bg-[#0f181b] text-[#edf6f5]' : 'bg-[#f3f5f5] text-[#111827]'}`}>
      <section className={`role-boundary-card w-full max-w-lg rounded-xl border p-7 shadow-sm ${isDark ? 'border-[#3b5359] bg-[#1b2c32]' : 'border-[#d8e0de] bg-white'}`} aria-labelledby="role-restricted-title">
        <p className={`role-boundary-kicker text-xs font-semibold tracking-widest uppercase ${isDark ? 'text-[#a6dfd0]' : 'text-[#075f57]'}`}>Awaaz-e-Awam / Staff access</p>
        <h1 id="role-restricted-title" className={`role-boundary-title mt-3 text-2xl font-semibold ${isDark ? 'text-[#edf6f5]' : 'text-[#14272a]'}`}>Different staff workspace</h1>
        <p className={`role-boundary-text mt-3 text-sm leading-relaxed ${isDark ? 'text-[#bbcdcd]' : 'text-slate-600'}`} role="alert">{result.error || `You are signed in as ${actual}. This address is reserved for ${expectedRole === 'head' ? 'Department Heads' : 'Field Officers'}.`}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {result.role && <Link className="role-boundary-action rounded-lg bg-[#075f57] hover:bg-[#064d46] transition-colors px-4 py-3 text-sm font-semibold text-white" to={`/department/${result.role}`}>Open my workspace</Link>}
          <button type="button" className={`role-boundary-signout rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${isDark ? 'border-[#3b5359] bg-[#243c3f] text-[#edf6f5] hover:bg-[#2c4947]' : 'border-[#c5d5d2] text-[#14272a] hover:bg-slate-50'}`} onClick={signOut}>Sign out to switch account</button>
        </div>
      </section>
    </main>;
  }
  return <DepartmentDashboardPage />;
}
