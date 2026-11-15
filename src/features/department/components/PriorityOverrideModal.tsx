import React, { useState } from 'react';
import { type PriorityLevel, type PriorityEvaluation } from '../../../lib/priority-engine';
import { ShieldCheck, X, AlertTriangle } from 'lucide-react';

interface PriorityOverrideModalProps {
  referenceNumber: string;
  currentEval: PriorityEvaluation;
  onSaveOverride: (newPriority: PriorityLevel, reason: string) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { id: PriorityLevel; label: string; desc: string; badgeClass: string }[] = [
  {
    id: 'critical',
    label: 'Critical Priority',
    desc: 'Imminent danger to life, safety, or structural stability requiring immediate emergency dispatch.',
    badgeClass: 'bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800',
  },
  {
    id: 'high',
    label: 'High Priority',
    desc: 'Severe essential service outage, health hazard, or major safety risk.',
    badgeClass: 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
  },
  {
    id: 'normal',
    label: 'Normal Priority',
    desc: 'Standard municipal maintenance, routine repairs, and ordinary civic requests.',
    badgeClass: 'bg-blue-50 text-blue-950 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800',
  },
  {
    id: 'low',
    label: 'Low Priority',
    desc: 'Minor non-urgent maintenance, cosmetic repairs, or scheduled improvements.',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  },
];

export const PriorityOverrideModal: React.FC<PriorityOverrideModalProps> = ({
  referenceNumber,
  currentEval,
  onSaveOverride,
  onClose,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>(currentEval.priority);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory justification note is required to modify complaint priority.');
      return;
    }
    setError(null);
    onSaveOverride(selectedPriority, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--dept-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--dept-accent-subtle)] text-[var(--dept-accent)] border border-[var(--dept-accent-border)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--dept-text-primary)] tracking-tight">
                Adjust Complaint Priority
              </h3>
              <p className="text-xs text-[var(--dept-text-muted)] font-mono">
                {referenceNumber} · Current: {currentEval.priority.toUpperCase()}
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
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-[var(--dept-text-primary)]">
                Automated Severity Basis
              </div>
              <p className="text-[var(--dept-text-secondary)] leading-relaxed">
                {currentEval.explanation}
              </p>
            </div>
          </div>

          {/* Target Priority Radio Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--dept-text-primary)] tracking-tight">
              Select Authorized Priority:
            </label>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = selectedPriority === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedPriority(opt.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-[var(--dept-accent)] bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-[var(--dept-accent)]'
                        : 'border-[var(--dept-border)] bg-[var(--dept-surface)] hover:bg-[var(--dept-surface-hover)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${opt.badgeClass}`}>
                          {opt.label}
                        </span>
                        {opt.id === currentEval.baseSeverity && (
                          <span className="text-[10px] text-[var(--dept-text-muted)] font-mono">
                            (System Default)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--dept-text-secondary)] leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Justification Reason */}
          <div className="space-y-1.5">
            <label htmlFor="priority-reason" className="block text-xs font-bold text-[var(--dept-text-primary)] tracking-tight">
              Justification Note (Mandatory):
            </label>
            <textarea
              id="priority-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Field inspection by engineering team verified active hazard requiring expedited intervention."
              rows={3}
              required
              className="w-full px-3 py-2 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-primary)] placeholder:text-[var(--dept-text-muted)] focus:outline-none focus:border-[var(--dept-accent)] transition-colors resize-none"
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--dept-accent)] hover:opacity-90 text-white shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              Save Priority Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
