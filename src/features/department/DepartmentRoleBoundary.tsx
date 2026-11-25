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
    return (
      <main className="v3-portal-shell min-h-screen grid place-items-center p-5">
        <section
          className="v3-auth-glass-card w-full max-w-lg p-7"
          aria-labelledby="role-restricted-title"
        >
          <p className="v3-eyebrow uppercase tracking-wider">Awaaz-e-Awam / Staff access</p>
          <h1 id="role-restricted-title" className="mt-3 text-[24px] font-medium" style={{ color: 'var(--v3-ink)' }}>
            Different staff workspace
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--v3-muted)' }} role="alert">
            {result.error || `You are signed in as ${actual}. This address is reserved for ${expectedRole === 'head' ? 'Department Heads' : 'Field Officers'}.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {result.role && (
              <Link className="v3-btn-primary" to={`/department/${result.role}`}>
                Open my workspace
              </Link>
            )}
            <button type="button" className="v3-btn-secondary" onClick={signOut}>
              Sign out to switch account
            </button>
          </div>
        </section>
      </main>
    );
  }
  return <DepartmentDashboardPage />;
}
