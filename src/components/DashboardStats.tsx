import React from 'react';
import { PatientCase } from '../types/medical';
import { Activity, AlertOctagon, Zap, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  cases: PatientCase[];
  onFilterTriage?: (triage: string | null) => void;
  activeTriageFilter: string | null;
}

export const DashboardStats: React.FC<Props> = ({ cases, onFilterTriage, activeTriageFilter }) => {
  const activeCases = cases.filter((c) => !c.archived && c.identification.status !== 'discharged');

  // Red triage count
  const redCount = activeCases.filter((c) => c.identification.triage === 'red').length;
  const orangeCount = activeCases.filter((c) => c.identification.triage === 'orange').length;

  // LKW < 4.5h stroke candidates
  const now = Date.now();
  const hyperacuteStrokeCount = activeCases.filter((c) => {
    const lkwMs = new Date(c.identification.lastKnownWell).getTime();
    const diffHours = (now - lkwMs) / (1000 * 60 * 60);
    return diffHours <= 4.5 && diffHours >= 0;
  }).length;

  // Total pending tasks
  const pendingTasksCount = activeCases.reduce(
    (acc, c) => acc + (c.assessmentPlan?.pendingTasks?.filter((t: any) => !t.completed).length || 0),
    0
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Total Active Cases */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Active ER Patients
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {activeCases.length}
            </span>
            <span className="text-xs text-slate-400">cases</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-400">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* Red Emergent Cases */}
      <button
        onClick={() => onFilterTriage && onFilterTriage(activeTriageFilter === 'red' ? null : 'red')}
        className={`p-3.5 rounded-xl border text-left transition shadow-sm flex items-center justify-between ${
          activeTriageFilter === 'red'
            ? 'border-red-500 bg-red-50 dark:bg-red-950/60 ring-2 ring-red-400'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300'
        }`}
      >
        <div>
          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            Red / Resuscitation
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {redCount}
            </span>
            <span className="text-xs text-slate-400">emergent</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </button>

      {/* LKW < 4.5h Stroke Code Candidates */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            LKW &lt; 4.5h Stroke Window
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {hyperacuteStrokeCount}
            </span>
            <span className="text-xs text-slate-400">tPA/EVT active</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* Pending Tasks & Orders */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pending Orders / Labs
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {pendingTasksCount}
            </span>
            <span className="text-xs text-slate-400">tasks</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
