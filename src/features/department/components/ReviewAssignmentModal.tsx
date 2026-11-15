import React, { useState } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { complaintService } from '../../../services';
import {
  type DepartmentComplaintView,
  type DepartmentId,
} from '../../../types';
import { X, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

interface ReviewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: DepartmentComplaintView;
  onAssigned: (updated: DepartmentComplaintView) => void;
}

const DEPARTMENT_OPTIONS: { id: DepartmentId; name: string; code: string; desc: string }[] = [
  {
    id: 'kmc',
    name: 'Karachi Metropolitan Corporation',
    code: 'KMC',
    desc: 'Roads, bridges, stormwater drains & major infrastructure',
  },
  {
    id: 'kwsc',
    name: 'Karachi Water & Sewerage Corporation',
    code: 'KWSC',
    desc: 'Water supply pipelines, sewerage leaks & water tankers',
  },
  {
    id: 'kelectric',
    name: 'K-Electric',
    code: 'KE',
    desc: 'Power outages, broken poles, loose cables & transformer fires',
  },
  {
    id: 'ssgc',
    name: 'Sui Southern Gas Company',
    code: 'SSGC',
    desc: 'Gas pipeline leakages, low pressure & transmission network',
  },
  {
    id: 'sswmb',
    name: 'Sindh Solid Waste Management Board',
    code: 'SSWMB',
    desc: 'Garbage dumps, municipal bins & solid waste collection',
  },
  {
    id: 'sbca',
    name: 'Sindh Building Control Authority',
    code: 'SBCA',
    desc: 'Illegal construction, dangerous building collapses & bylaws',
  },
];

export const ReviewAssignmentModal: React.FC<ReviewAssignmentModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onAssigned,
}) => {
  const { departmentId } = useDepartmentAuth();
  const initialDept: DepartmentId = (complaint.predictedDepartmentId as DepartmentId) || (departmentId as DepartmentId) || 'kmc';
  const [selectedDept, setSelectedDept] = useState<DepartmentId>(initialDept);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await complaintService.reviewAndAssignComplaint(
        complaint.id,
        selectedDept,
        notes.trim() || undefined
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to assign complaint.');
      }

      if (res.complaint) {
        onAssigned(res.complaint);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--dept-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--dept-text-primary)] tracking-tight">
                Assign Department
              </h3>
              <p className="text-xs text-[var(--dept-text-muted)] font-mono">
                {complaint.referenceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] flex items-center justify-center text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto dept-scrollbar">
          {/* Classifier Ambiguity Notice */}
          <div className="p-3.5 rounded-xl bg-purple-100/70 border border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-purple-950 dark:text-purple-100">
                Department Review Needed
              </div>
              <p className="text-purple-900 dark:text-purple-200 leading-relaxed font-medium">
                The system could not confidently identify the correct department. Please review the complaint and select the department responsible for this issue.
              </p>
            </div>
          </div>

          {/* Complaint Quote */}
          <div className="p-3 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
            <div className="text-[11px] font-semibold text-[var(--dept-text-muted)] mb-1">Citizen Complaint:</div>
            <p className="text-xs text-[var(--dept-text-primary)] italic line-clamp-3">
              "{complaint.sanitizedDescription || complaint.description}"
            </p>
          </div>

          {/* Target Department Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--dept-text-primary)] tracking-tight">
              Assign Responsible Department:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEPARTMENT_OPTIONS.map((dept) => {
                const isSelected = selectedDept === dept.id;
                const isPredicted = complaint.predictedDepartmentId === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedDept(dept.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-900 dark:text-purple-100 shadow-xs ring-1 ring-purple-400'
                        : 'bg-[var(--dept-surface)] border-[var(--dept-border)] hover:border-[var(--dept-border-strong)] text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-[var(--dept-text-primary)]">
                        {dept.code}
                      </span>
                      {isPredicted && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Predicted
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium leading-tight mb-1">
                      {dept.name}
                    </div>
                    <div className="text-[10px] text-[var(--dept-text-muted)] leading-snug">
                      {dept.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Notes */}
          <div className="space-y-1.5">
            <label htmlFor="review-notes" className="block text-xs font-bold text-[var(--dept-text-primary)] tracking-tight">
              Review Notes (Optional):
            </label>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified location belongs to KMC jurisdiction; confirmed road repair requirement."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-primary)] placeholder:text-[var(--dept-text-muted)] focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--dept-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
