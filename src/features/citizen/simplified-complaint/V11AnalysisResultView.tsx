import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  Brain,
  Layers,
  Info,
  Building2,
  Clock,
  X,
  MapPin,
} from 'lucide-react';
import type { SubmissionResult, DepartmentId } from '../../../types';
import type { V11LocalAnalysisPayload } from '../../../services/LocalV11ComplaintService';
import { KARACHI_DEPARTMENTS } from '../../../mocks/complaints';

interface V11AnalysisResultViewProps {
  submission: SubmissionResult;
  analysis: V11LocalAnalysisPayload;
  ur?: boolean;
  onClose: () => void;
  onReset: () => void;
}

const DEPT_THRESHOLDS: Record<string, number> = {
  kmc: 0.25,
  kwsc: 0.40,
  kelectric: 0.32,
  ssgc: 0.45,
  sswmb: 0.25,
  sbca: 0.25,
};

export const V11AnalysisResultView: React.FC<V11AnalysisResultViewProps> = ({
  submission,
  analysis,
  onClose,
  onReset,
}) => {
  const [copiedRef, setCopiedRef] = useState(false);

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(submission.referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getRelationBadge = () => {
    switch (analysis.relation) {
      case 'SINGLE':
        return { label: 'Single Issue', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', desc: 'One distinct actionable issue' };
      case 'INDEPENDENT':
        return { label: 'Multiple Independent Issues', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', desc: 'Distinct parallel defects assigned to responsible departments' };
      case 'CAUSES_CONTEXT_ONLY':
        return { label: 'Causal Consequence (Suppressed)', color: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Symptom resulting from root defect; secondary agency suppressed' };
      case 'NEGATED':
        return { label: 'Explicit Negation (Suppressed)', color: 'bg-purple-100 text-purple-800 border-purple-300', desc: 'Negated agency confirmed inactive' };
      case 'SAME_INCIDENT_DIFFERENT_REPAIRS':
        return { label: 'Multi-Agency Incident', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Shared incident requiring coordinated repairs' };
      case 'RECIPIENT_ONLY':
        return { label: 'Addressee / Recipient Only', color: 'bg-slate-100 text-slate-800 border-slate-300', desc: 'Agency mentioned as recipient; defect belongs to another' };
      case 'SPATIAL_PROXIMITY_ONLY':
        return { label: 'Spatial Proximity Only', color: 'bg-slate-100 text-slate-800 border-slate-300', desc: 'Landmark reference without functional defect' };
      default:
        return { label: 'Under Review', color: 'bg-rose-100 text-rose-800 border-rose-300', desc: 'Uncertain or ambiguous defect requiring human clarification' };
    }
  };

  const relInfo = getRelationBadge();
  const activeThresholds = analysis.thresholds || DEPT_THRESHOLDS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="v11-analysis-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#141414]/70 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 rounded-[28px] bg-white p-5 sm:p-8 shadow-2xl text-start max-h-[92vh] overflow-y-auto border border-[#E6E3DF]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE7E3] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
              <Brain className="h-3.5 w-3.5 text-amber-700" />
              <span>LOCAL AI TEST MODE</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-mono font-medium text-slate-700">
              <span>{analysis.modelVersion}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Clock className="h-3 w-3" />
              <span>{analysis.latencyMs} ms</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#625D58] hover:bg-[#F7F6F3] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Title & Reference */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 id="v11-analysis-title" className="text-2xl font-black text-[#141414] tracking-tight">
              Complaint Classification & Relation Analysis
            </h2>
            <p className="text-xs text-[#625D58] mt-0.5">
              Evaluated via offline 3-fold calibrated ensemble + civic relation grounding. Zero hosted DB mutations.
            </p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 font-mono text-xs font-bold text-slate-800">
              <span>Ref: {submission.referenceNumber}</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="hover:text-black cursor-pointer ml-1 p-0.5"
                title="Copy reference code"
              >
                {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </span>
          </div>
        </div>

        {/* Status / Review Decision Banner */}
        <div className="mt-5">
          {analysis.needsReview ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-4 text-xs text-rose-950">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-rose-800 text-[11px]">
                <span>Status: Needs Human Review</span>
                <span className="rounded bg-rose-200 px-2 py-0.5 font-mono text-[10px] text-rose-900">
                  {analysis.reviewReason || 'UNCERTAIN_DEFECT'}
                </span>
              </div>
              <p className="mt-1 text-rose-800 leading-relaxed">
                The AI identified ambiguity, out-of-scope content, or ungrounded claims. This complaint has been safely routed to the human review desk rather than misrouted.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-emerald-800 text-[11px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Status: Verified & Auto-Assigned</span>
                <span className="rounded bg-emerald-200 px-2 py-0.5 font-mono text-[10px] text-emerald-900">
                  DIRECT ROUTING
                </span>
              </div>
              <p className="mt-1 text-emerald-800 leading-relaxed">
                Actionable defect matched affirmative civic lexicon with high confidence and passing decision thresholds.
              </p>
            </div>
          )}
        </div>

        {/* Assigned Municipal Departments */}
        <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 bg-[#FAF9F7]">
          <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-2">
            Predicted Municipal Authorities ({analysis.departments.length})
          </span>

          {analysis.departments.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No civic department assigned (flagged for manual triage).</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.departments.map((deptId) => {
                const meta = KARACHI_DEPARTMENTS[deptId];
                return (
                  <div
                    key={deptId}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2"
                  >
                    <Building2 className="h-4 w-4 text-[#681822]" />
                    <div>
                      <span className="font-mono text-xs font-black uppercase text-[#681822]">
                        {deptId.toUpperCase()}
                      </span>
                      <span className="mx-1 text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-800">
                        {meta?.name || deptId.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Relation badge */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500">Issue Relation:</span>
            <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${relInfo.color}`}>
              {relInfo.label}
            </span>
            <span className="text-xs text-slate-600 hidden sm:inline">— {relInfo.desc}</span>
          </div>
        </div>

        {/* Truthful Location Source Attribution Alert (V13.3) */}
        {analysis.missingPublicLocation ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
            <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">
                INCOMPLETE_PUBLIC_LOCATION (Informational Flag)
              </p>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                The complaint contains an actionable defect, but the description text lacks specific public street, sector, or landmark details.
              </p>
              {analysis.locationAttribution?.source === 'FORM_METADATA' && (
                <p className="mt-1 text-slate-700">
                  <span className="font-semibold text-slate-900">Form Location: </span>
                  Supplied via applicant form fields: <span className="font-semibold">"{analysis.locationAttribution.displayLocation}"</span> (not mentioned in complaint text).
                </p>
              )}
              <p className="mt-1 font-semibold text-amber-900">
                Separation Guarantee: This location check is evaluated independently and does NOT force valid civic issues into model review.
              </p>
            </div>
          </div>
        ) : analysis.locationAttribution?.source === 'COMPLAINT_TEXT' ? (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">
                Public Location Grounded in Complaint Narrative
              </p>
              <p className="mt-0.5 leading-relaxed text-emerald-800">
                Specific street, locality, or landmark indicators detected directly in citizen text: <span className="font-semibold">"{analysis.locationAttribution.displayLocation}"</span>.
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Separation Guarantee: Location completeness is evaluated independently and does NOT alter civic issue routing.
              </p>
            </div>
          </div>
        ) : analysis.locationAttribution?.source === 'FORM_METADATA' ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex items-start gap-2.5 text-xs text-blue-950">
            <MapPin className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">
                Location Supplied in Form Details (Not in Narrative Text)
              </p>
              <p className="mt-0.5 leading-relaxed text-blue-800">
                Location provided via applicant form fields: <span className="font-semibold">"{analysis.locationAttribution.displayLocation}"</span>. Complaint narrative text did not explicitly name this landmark.
              </p>
              <p className="mt-1 text-[11px] text-blue-700">
                Separation Guarantee: Location completeness is evaluated independently and does NOT force valid civic issues into model review.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center gap-2 text-xs text-slate-800">
            <Info className="h-4 w-4 text-slate-500 shrink-0" />
            <span>Location Attribution: General civic municipal zone.</span>
          </div>
        )}

        {/* Grounded Actionable Issues Table / List */}
        {analysis.issueCandidates && analysis.issueCandidates.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 bg-[#FAF9F7]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#681822]" />
              <span>Grounded Actionable Civic Issues ({analysis.issueCandidates.length})</span>
            </p>
            <div className="space-y-2">
              {analysis.issueCandidates.map((c, i) => {
                const deptName = (c.department || 'unassigned').toUpperCase();
                const defectDesc = c.defect_evidence && c.defect_evidence.length > 0
                  ? c.defect_evidence.join(', ')
                  : (c.mention_type === 'actionable_defect' ? 'Reported Civic Defect' : c.mention_type);
                return (
                  <div
                    key={c.span_id || i}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold uppercase text-[#681822] bg-[#F7F2F2] px-2 py-0.5 rounded text-[11px]">
                          {deptName}
                        </span>
                        <span className="font-medium text-slate-700">{defectDesc}</span>
                        {c.is_actionable ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Actionable Repair
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Contextual Reference
                          </span>
                        )}
                      </div>
                      <p className="font-serif italic text-slate-600 pl-1 border-l-2 border-slate-200">
                        "{c.span_text}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Model Probabilities vs. Thresholds Grid */}
        <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center justify-between">
            <span>Calibrated Department Probabilities vs Decision Thresholds</span>
            <span className="font-mono text-[11px] text-slate-400 font-normal">Sigmoid Posterior P(D|X)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {Object.keys(activeThresholds).map((d) => {
              const prob = analysis.probabilities[d as DepartmentId] ?? 0;
              const thresh = activeThresholds[d] ?? 0.25;
              const isSelected = analysis.departments.includes(d as any);
              const pct = Math.min(Math.round(prob * 100), 100);
              const threshPct = Math.round(thresh * 100);

              return (
                <div
                  key={d}
                  className={`rounded-xl border p-2.5 transition ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className={isSelected ? 'text-emerald-900' : 'text-slate-600'}>
                      {d.toUpperCase()}
                    </span>
                    <span className={isSelected ? 'text-emerald-700 font-black' : 'text-slate-500'}>
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isSelected ? 'bg-emerald-600' : 'bg-slate-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Bar: {threshPct}%</span>
                    <span>{isSelected ? '✓ PASS' : 'NO'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Decisions & Threshold Audit Table (V13.3) */}
        {analysis.decisionRecords && analysis.decisionRecords.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 bg-white overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center justify-between">
              <span>Department Decisions & Policy Audit Trace</span>
              <span className="font-mono text-[11px] text-slate-400 font-normal">Single Authoritative Record</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-600 font-mono">
                    <th className="py-2 px-2.5">Authority</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5">Probability</th>
                    <th className="py-2 px-2.5">Threshold</th>
                    <th className="py-2 px-2.5">Source</th>
                    <th className="py-2 px-2.5">Reason / Determination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {analysis.decisionRecords.map((rec: any) => {
                    const isSel = rec.status === 'SELECTED';
                    const isSupp = rec.status === 'SUPPRESSED';
                    const badgeClass = isSel
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isSupp
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200';
                    return (
                      <tr key={rec.department} className={isSel ? 'bg-emerald-50/30' : ''}>
                        <td className="py-2.5 px-2.5 font-mono font-bold text-[#681822]">
                          {rec.department.toUpperCase()}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono">
                          {Math.round((rec.probability ?? 0) * 100)}%
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-500">
                          {Math.round((rec.threshold ?? 0.25) * 100)}%
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-600">
                          {rec.decisionSource}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 max-w-xs text-[11px] leading-relaxed">
                          {rec.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Truthful Factual Summary & Original Complaint */}
        <div className="mt-4 rounded-2xl border border-[#E6E3DF] p-4 bg-[#FAF9F7] space-y-3 text-xs">
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1">
              Truthful Generated Heading
            </span>
            <p className="font-bold text-slate-900 text-sm">{analysis.heading}</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1">
              Factual Summary (Natural English, Zero Hallucinations)
            </span>
            <p className="text-slate-700 leading-relaxed">{analysis.factualSummary}</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1 flex items-center justify-between">
              <span>Original Roman Urdu Complaint Text</span>
              <span className="font-mono text-slate-400 font-normal">{analysis.wordCount} words</span>
            </span>
            <p className="font-mono text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
              {analysis.sanitizedDescription}
            </p>
          </div>
        </div>

        {/* Explainable Decision Notes / Reason Trace */}
        {analysis.notes && analysis.notes.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-3.5 bg-white text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1.5">
              Audit Reason Trace
            </span>
            <ul className="space-y-1 list-disc list-inside text-slate-700">
              {analysis.notes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#EAE7E3]">
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Test Another Complaint
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#681822] text-white font-bold text-xs hover:bg-[#52131B] transition cursor-pointer shadow-sm"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
