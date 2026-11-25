import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { type DepartmentId } from '../../types';
import { staffAuthService } from '../../services/staffAuthService';
import { DEPARTMENT_THEMES } from './design-system/tokens';
import { useCivicTheme } from './hooks/useCivicTheme';
import { V3PrimaryButton } from '../../components/v3';

const VALID_DEPARTMENTS: { id: DepartmentId; label: string }[] = [
  { id: 'kmc', label: 'KMC — Roads & Infrastructure' },
  { id: 'kelectric', label: 'KE — Electricity & Power' },
  { id: 'kwsc', label: 'KWSC — Water & Sewerage' },
  { id: 'ssgc', label: 'SSGC — Gas Utility' },
  { id: 'sswmb', label: 'SSWMB — Sanitation & Waste' },
  { id: 'sbca', label: 'SBCA — Building Control' },
];

/**
 * V3 · Staff access request (Figma 14:1364 / 9:502)
 * Collects applicant identity (Full name, Official work email, Staff ID, CNIC, passphrase)
 * and submits an administrator-reviewed onboarding request via staffAuthService.
 */
export const StaffAccessRequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useCivicTheme();

  const initialDept = (searchParams.get('dept') as DepartmentId) || 'kmc';
  const roleParam = searchParams.get('role') === 'head' ? 'Department Head' : 'Field Officer';
  const [departmentId, setDepartmentId] = useState<DepartmentId>(
    VALID_DEPARTMENTS.some((d) => d.id === initialDept) ? initialDept : 'kmc'
  );
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  const deptTheme = DEPARTMENT_THEMES[departmentId] || DEPARTMENT_THEMES.kmc;
  const backPath =
    searchParams.get('role') === 'head'
      ? `/department/head/login?dept=${departmentId}`
      : `/department/officer/login?dept=${departmentId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !workEmail.trim() || !staffId.trim() || !cnic.trim()) {
      setError('Complete all staff identity fields before submitting.');
      return;
    }
    if (password.length < 15) {
      setError('Choose a work passphrase of at least 15 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await staffAuthService.requestDepartmentAccess({
        departmentId,
        fullName: fullName.trim(),
        workEmail: workEmail.trim(),
        password,
      });

      if (!res.success) {
        setError(res.error || 'Could not submit staff access request.');
        return;
      }

      setSubmittedRequestId(res.requestId || 'PENDING');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit staff access request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v3-portal-shell min-h-screen px-5 py-9 sm:px-8" data-theme={theme}>
      <div className="mx-auto w-full max-w-[560px]">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-medium" style={{ color: 'var(--v3-ink)' }}>
            Awaaz-e-Awam
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="v3-quiet-action"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
        </div>

        <h1 className="mt-10 text-[34px] font-medium leading-tight" style={{ color: 'var(--v3-ink)' }}>
          Request staff access
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--v3-muted)' }}>
          {roleParam} · {deptTheme.code}
        </p>

        {submittedRequestId ? (
          <div className="v3-card mt-8 space-y-4 p-6" role="status">
            <div className="flex items-center gap-2.5 text-[16px] font-medium" style={{ color: 'var(--v3-success)' }}>
              <CheckCircle2 className="h-5 w-5" />
              <span>Access request recorded</span>
            </div>
            <p className="text-[14px]" style={{ color: 'var(--v3-ink)' }}>
              Your request ({submittedRequestId}) has been queued for Central Administrator review. Sign-in remains locked until formal verification.
            </p>
            <Link to={backPath} className="v3-quiet-action -ml-3 justify-start">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4" noValidate>
            {error && (
              <div
                className="rounded-[10px] p-3.5 text-[13px]"
                style={{
                  backgroundColor: 'var(--v3-danger-soft)',
                  border: '1px solid var(--v3-danger)',
                  color: 'var(--v3-ink)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="req-dept" className="v3-field-label">
                Department
              </label>
              <select
                id="req-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                className="v3-input"
              >
                {VALID_DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="req-fullname" className="v3-field-label">
                Full name
              </label>
              <input
                id="req-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="v3-input"
                required
              />
            </div>

            <div>
              <label htmlFor="req-email" className="v3-field-label">
                Official work email
              </label>
              <input
                id="req-email"
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="Enter department email"
                className="v3-input"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="req-staffid" className="v3-field-label">
                  Staff ID
                </label>
                <input
                  id="req-staffid"
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Enter staff identifier"
                  className="v3-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="req-cnic" className="v3-field-label">
                  CNIC
                </label>
                <input
                  id="req-cnic"
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="Enter national identity number"
                  className="v3-input"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="req-password" className="v3-field-label">
                Work passphrase (15+ characters)
              </label>
              <input
                id="req-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a passphrase for review"
                minLength={15}
                className="v3-input"
                required
              />
            </div>

            <p className="pt-1 text-[14px]" style={{ color: 'var(--v3-muted)' }}>
              Your request requires administrator approval.
            </p>

            <div className="pt-2">
              <V3PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Submitting request…' : 'Submit request'}
              </V3PrimaryButton>
            </div>

            <div>
              <Link to={backPath} className="v3-quiet-action -ml-3 justify-start">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
