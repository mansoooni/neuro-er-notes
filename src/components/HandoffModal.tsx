import React, { useState } from 'react';
import { PatientCase } from '../types/medical';
import { Copy, Check, X, FileText, Share2 } from 'lucide-react';

interface Props {
  cases: PatientCase[];
  selectedCaseId?: string;
  onClose: () => void;
}

export const HandoffModal: React.FC<Props> = ({ cases, selectedCaseId, onClose }) => {
  const [targetId, setTargetId] = useState<string>(selectedCaseId || 'all');
  const [copied, setCopied] = useState(false);

  const generateSBARForCase = (c: PatientCase): string => {
    const lkwHours = c.identification.lastKnownWell
      ? ((Date.now() - new Date(c.identification.lastKnownWell).getTime()) / (1000 * 60 * 60)).toFixed(1)
      : 'Unknown';
    const gcs = c.neuroExam?.gcs?.numericTotal ?? ((c.vitals.gcsEye || 4) + (c.vitals.gcsVerbal || 5) + (c.vitals.gcsMotor || 6));

    const pastNeuroText = c.history?.pastNeurological
      ? c.history.pastNeurological.notes || (c.history.pastNeurological.stroke ? 'Prior Stroke' : 'None')
      : 'None';

    const nihssText = c.neuroExam?.nihss
      ? `${c.neuroExam.nihss.totalScore} (${c.neuroExam.nihss.severity || 'Assessed'})`
      : 'Not scored';

    const pendingTasksList = (c.assessmentPlan?.pendingTasks || [])
      .filter((t: any) => !t.completed)
      .map((t: any) => t.task)
      .join('; ') || 'None';

    return `=== [${c.identification.id}] ${c.identification.initials || 'Pt'} | ${c.identification.age}yo ${c.identification.sex} | Bed: ${c.identification.bedLocation || 'ER'} ===
S (SITUATION):
  - Chief Complaint: ${c.chiefComplaint?.symptom || 'Not documented'} (Onset: ${c.chiefComplaint?.onsetDuration || 'Acute'}, Mode: ${c.chiefComplaint?.mode || 'Sudden'})
  - Triage: ${(c.identification.triage || 'Standard').toUpperCase()} | Status: ${c.identification.status}
  - Time LKW: ${c.identification.lastKnownWell ? new Date(c.identification.lastKnownWell).toLocaleTimeString() : 'Unknown'} (${lkwHours} hrs ago)

B (BACKGROUND):
  - PMHx: ${c.history?.pastMedical || 'None'}
  - Neuro Hx: ${pastNeuroText}
  - Current Meds: ${c.history?.medications || 'None'}
  - Allergies: ${c.history?.allergies || 'NKDA'}

A (ASSESSMENT):
  - Vitals: BP ${c.vitals.bpSys}/${c.vitals.bpDia} | HR ${c.vitals.hr} | SpO2 ${c.vitals.spo2}% | Temp ${c.vitals.temp}C | CBG ${c.vitals.cbg || 'N/A'}
  - GCS: ${gcs}/15 | NIHSS: ${nihssText}
  - Working Diagnosis: ${c.assessmentPlan?.workingDiagnosis || 'Pending'}
  - Localization: ${c.assessmentPlan?.clinicalLocalization || 'N/A'}
  - Key Findings: ${c.neuroExam?.positiveFindings || c.neuroExam?.motor?.generalMotorNotes || 'Focal deficits noted'}

R (RECOMMENDATION & NEXT STEPS):
  - Disposition: ${c.assessmentPlan?.disposition || 'ER Hold'}
  - Pending: ${pendingTasksList}
  - Action Plan: ${(c.assessmentPlan?.managementPlan || '').slice(0, 200)}...
`;
  };

  const getHandoffText = (): string => {
    if (targetId === 'all') {
      const activeCases = cases.filter((c) => !c.archived && c.identification.status !== 'discharged');
      let text = `NEUROLOGY ER SHIFT HANDOVER SUMMARY (${new Date().toLocaleString()})\nTotal Active Cases: ${activeCases.length}\n`;
      text += '=================================================================\n\n';
      activeCases.forEach((c) => {
        text += generateSBARForCase(c) + '\n-----------------------------------------------------------------\n\n';
      });
      return text;
    } else {
      const single = cases.find((c) => c.id === targetId);
      if (!single) return 'Case not found.';
      return generateSBARForCase(single);
    }
  };

  const handoffText = getHandoffText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(handoffText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clinical ER Shift Handover (SBAR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fast standardized clinical handoff for resident transfer or hospital messaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Scope:</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Active ER Cases ({cases.filter((c) => !c.archived).length})</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.identification.initials || 'Patient'} ({c.chiefComplaint.symptom.slice(0, 24)}...)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy SBAR Note</span>
              </>
            )}
          </button>
        </div>

        {/* Text Area Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950">
          <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {handoffText}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-xs text-slate-500">
          <span>Ready to paste directly into hospital messaging or EHR progress notes.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
