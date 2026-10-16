import React from 'react';
import { PatientCase } from '../types/medical';
import { Clock, Zap, AlertCircle, Sun, HelpCircle, Check, Eye } from 'lucide-react';

interface Props {
  patientCase: PatientCase;
  onUpdateCase: (updater: (prev: PatientCase) => PatientCase) => void;
}

export function calculateElapsedLKW(lkwIsoString?: string): {
  hoursElapsed: number | null;
  elapsedFormatted: string;
  isWithin4_5h: boolean;
  isWithin24h: boolean;
} {
  if (!lkwIsoString) {
    return { hoursElapsed: null, elapsedFormatted: 'Not documented', isWithin4_5h: false, isWithin24h: false };
  }

  const lkwTime = new Date(lkwIsoString).getTime();
  if (isNaN(lkwTime)) {
    return { hoursElapsed: null, elapsedFormatted: 'Invalid datetime', isWithin4_5h: false, isWithin24h: false };
  }

  const now = Date.now();
  const diffMs = now - lkwTime;

  if (diffMs < 0) {
    return { hoursElapsed: 0, elapsedFormatted: 'Just now / Future', isWithin4_5h: true, isWithin24h: true };
  }

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursDecimal = Number((totalMinutes / 60).toFixed(1));

  let elapsedFormatted = '';
  if (hours === 0) {
    elapsedFormatted = `${mins}m ago`;
  } else if (mins === 0) {
    elapsedFormatted = `${hours}h ago`;
  } else {
    elapsedFormatted = `${hours}h ${mins}m ago (${hoursDecimal} hrs)`;
  }

  const isWithin4_5h = totalMinutes <= 270; // 4.5 hours = 270 minutes
  const isWithin24h = totalMinutes <= 1440; // 24 hours = 1440 minutes

  return {
    hoursElapsed: hoursDecimal,
    elapsedFormatted,
    isWithin4_5h,
    isWithin24h,
  };
}

export const LKWCallout: React.FC<Props> = ({ patientCase, onUpdateCase }) => {
  const lkwIso = patientCase.identification.lastKnownWell;
  const lkwType = patientCase.identification.lastKnownWellType || (lkwIso ? 'exact' : 'exact');
  const estimatedWindow = patientCase.identification.lastKnownWellEstimatedWindow || '';

  const { hoursElapsed, elapsedFormatted, isWithin4_5h, isWithin24h } = calculateElapsedLKW(lkwIso);

  const handleSetExactTime = (datetimeLocalVal: string) => {
    const iso = datetimeLocalVal ? new Date(datetimeLocalVal).toISOString() : '';
    onUpdateCase((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        lastKnownWell: iso,
        lastKnownWellType: 'exact',
      },
      chiefComplaint: {
        ...prev.chiefComplaint,
        lastKnownWellTime: iso,
      },
    }));
  };

  const handleSetPresetHoursAgo = (hoursAgo: number) => {
    const target = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const iso = target.toISOString();
    onUpdateCase((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        lastKnownWell: iso,
        lastKnownWellType: 'exact',
      },
      chiefComplaint: {
        ...prev.chiefComplaint,
        lastKnownWellTime: iso,
      },
    }));
  };

  const handleSetMode = (type: 'exact' | 'wake_up' | 'found_down' | 'unknown') => {
    onUpdateCase((prev) => {
      let iso = prev.identification.lastKnownWell;
      if (type === 'unknown') {
        // keep or clear
      }
      return {
        ...prev,
        identification: {
          ...prev.identification,
          lastKnownWellType: type,
        },
      };
    });
  };

  const handleSetEstimatedWindow = (win: string) => {
    onUpdateCase((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        lastKnownWellEstimatedWindow: win,
      },
    }));
  };

  // Determine callout background and status styling
  let calloutBg = 'border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-500/5 dark:from-amber-950/40 dark:via-slate-900/40 dark:to-slate-950/40';
  let badgeStyle = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800';

  if (lkwType === 'exact' && lkwIso) {
    if (isWithin4_5h) {
      calloutBg = 'border-emerald-500/80 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-slate-500/5 dark:from-emerald-950/50 dark:via-slate-900/50 dark:to-slate-950/40';
      badgeStyle = 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm';
    } else if (isWithin24h) {
      calloutBg = 'border-sky-500/80 bg-gradient-to-r from-sky-500/15 via-sky-500/5 to-slate-500/5 dark:from-sky-950/50 dark:via-slate-900/50 dark:to-slate-950/40';
      badgeStyle = 'bg-sky-600 text-white font-bold border-sky-700 shadow-sm';
    } else {
      calloutBg = 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40';
      badgeStyle = 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  } else if (lkwType === 'wake_up' || lkwType === 'found_down') {
    calloutBg = 'border-purple-400/80 bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-slate-500/5 dark:from-purple-950/40 dark:via-slate-900/40 dark:to-slate-950/40';
    badgeStyle = 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-800';
  }

  const datetimeLocalFormatted = lkwIso ? new Date(lkwIso).toISOString().slice(0, 16) : '';

  return (
    <div className={`rounded-xl border-2 p-3 sm:p-4 shadow-sm space-y-3 transition ${calloutBg}`}>
      {/* Top Priority Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-600 text-white shadow-sm flex items-center justify-center">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                Last Known Well (LKW) Time
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 border border-red-300 dark:border-red-800">
                Critical Priority
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Essential benchmark for IV Thrombolysis (≤ 4.5h) &amp; Mechanical Thrombectomy (≤ 24h)
            </p>
          </div>
        </div>

        {/* Clinical Window Indicators */}
        <div className="flex items-center gap-1.5">
          {lkwType === 'exact' && lkwIso && (
            <>
              {isWithin4_5h ? (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Within 4.5h IVT Window</span>
                </div>
              ) : isWithin24h ? (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow">
                  <Clock className="w-3.5 h-3.5" />
                  <span>🕒 Within 24h EVT Window</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  <span>Outside Standard Window (&gt; 24h)</span>
                </div>
              )}
            </>
          )}

          {lkwType === 'wake_up' && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white shadow">
              <Sun className="w-3.5 h-3.5" />
              <span>Wake-up Stroke (MRI/CTP Indicated)</span>
            </div>
          )}

          {lkwType === 'found_down' && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Found Down (Estimated Window)</span>
            </div>
          )}

          {lkwType === 'unknown' && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-600 text-white shadow">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Unknown LKW</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => handleSetMode('exact')}
          className={`px-3 py-1 rounded-lg border font-semibold transition ${
            lkwType === 'exact'
              ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Exact Date &amp; Time
        </button>

        <button
          type="button"
          onClick={() => handleSetMode('wake_up')}
          className={`px-3 py-1 rounded-lg border font-semibold transition ${
            lkwType === 'wake_up'
              ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Wake-up Stroke
        </button>

        <button
          type="button"
          onClick={() => handleSetMode('found_down')}
          className={`px-3 py-1 rounded-lg border font-semibold transition ${
            lkwType === 'found_down'
              ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Found Down
        </button>

        <button
          type="button"
          onClick={() => handleSetMode('unknown')}
          className={`px-3 py-1 rounded-lg border font-semibold transition ${
            lkwType === 'unknown'
              ? 'bg-slate-700 text-white border-slate-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Unknown
        </button>
      </div>

      {/* Input row based on selected mode */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Datetime Input & Elapsed Display */}
        <div className="sm:col-span-7 flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block shrink-0">
            {lkwType === 'exact'
              ? 'Exact LKW:'
              : lkwType === 'wake_up'
              ? 'Bedtime / Seen Normal:'
              : 'Estimated / Seen Normal:'}
          </label>
          <input
            type="datetime-local"
            value={datetimeLocalFormatted}
            onChange={(e) => handleSetExactTime(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-sm"
          />
        </div>

        {/* Elapsed Counter Box */}
        <div className="sm:col-span-5 flex items-center justify-between sm:justify-end gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500">Elapsed:</span>
          <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
            {lkwType === 'exact' && lkwIso ? elapsedFormatted : lkwType === 'unknown' ? 'Unknown' : 'Estimated'}
          </span>
        </div>
      </div>

      {/* Quick Presets for 1-click fast editing */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Quick Presets:
        </span>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(0)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          Just now
        </button>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(1)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          1 hr ago
        </button>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(2)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          2 hrs ago
        </button>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(3)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          3 hrs ago
        </button>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(4)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          4 hrs ago
        </button>
        <button
          type="button"
          onClick={() => handleSetPresetHoursAgo(8)}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          8 hrs ago
        </button>
      </div>

      {/* Optional Estimated Window / Notes for Wake-up or Found down */}
      {(lkwType === 'wake_up' || lkwType === 'found_down' || lkwType === 'unknown') && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Estimated Window / Collateral History:
          </label>
          <input
            type="text"
            value={estimatedWindow}
            onChange={(e) => handleSetEstimatedWindow(e.target.value)}
            placeholder="e.g. Went to bed at 23:00 normal, found at 07:00 (8h window)"
            className="flex-1 min-w-[240px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
      )}
    </div>
  );
};
