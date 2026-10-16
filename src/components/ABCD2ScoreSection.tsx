import React, { useState } from 'react';
import { PatientCase, ABCD2ClinicalFeature, ABCD2DurationCategory, ABCD2DiabetesStatus } from '../types/medical';
import { calculateABCD2, ABCD2_SAFEGUARD_TEXT } from '../services/abcd2Calculator';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
  patientCase: PatientCase;
  onUpdateCase: (updater: (prev: PatientCase) => PatientCase) => void;
}

export const ABCD2ScoreSection: React.FC<Props> = ({ patientCase, onUpdateCase }) => {
  const [isOpen, setIsOpen] = useState(true);

  const abcd2 = calculateABCD2(patientCase);
  const { totalScore = 0, isComplete, incompleteCount, riskCategory, summaryExplanation } = abcd2;

  const handleSetClinicalFeature = (feature: ABCD2ClinicalFeature) => {
    onUpdateCase((prev) => ({
      ...prev,
      abcd2Score: {
        ...prev.abcd2Score,
        clinicalFeatures: feature,
        clinicalPoints:
          feature === 'unilateral_weakness' ? 2 : feature === 'speech_without_weakness' ? 1 : feature === 'other' ? 0 : undefined,
        clinicalAssessed: feature !== 'not_assessed',
        maxScore: 7,
        incompleteCount: 0,
        manualOverrides: {
          ...prev.abcd2Score?.manualOverrides,
          clinicalFeatures: true,
        },
      },
    }));
  };

  const handleSetDuration = (duration: ABCD2DurationCategory) => {
    onUpdateCase((prev) => ({
      ...prev,
      abcd2Score: {
        ...prev.abcd2Score,
        durationCategory: duration,
        durationPoints:
          duration === 'ge_60' ? 2 : duration === '10_59' ? 1 : duration === 'lt_10' ? 0 : undefined,
        durationAssessed: duration !== 'not_assessed',
        maxScore: 7,
        incompleteCount: 0,
        manualOverrides: {
          ...prev.abcd2Score?.manualOverrides,
          duration: true,
        },
      },
    }));
  };

  const handleSetDiabetes = (status: ABCD2DiabetesStatus) => {
    onUpdateCase((prev) => ({
      ...prev,
      abcd2Score: {
        ...prev.abcd2Score,
        diabetesStatus: status,
        diabetesPoints: status === 'yes' ? 1 : status === 'no' ? 0 : undefined,
        diabetesAssessed: status !== 'not_assessed',
        maxScore: 7,
        incompleteCount: 0,
        manualOverrides: {
          ...prev.abcd2Score?.manualOverrides,
          diabetes: true,
        },
      },
    }));
  };

  const handleResetOverrides = () => {
    onUpdateCase((prev) => ({
      ...prev,
      abcd2Score: undefined,
    }));
  };

  // Determine badge styling based on score & completion
  const getBadgeStyle = () => {
    if (!isComplete) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800';
    }
    if (totalScore >= 6) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800';
    }
    if (totalScore >= 4) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200 border-orange-300 dark:border-orange-800';
    }
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
  };

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/70 via-white to-slate-50/60 dark:from-teal-950/30 dark:via-slate-900/60 dark:to-slate-950/40 p-3 sm:p-4 shadow-sm space-y-3">
      {/* Top Banner & Total Score */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                ABCD² Score Calculator (TIA Risk Stratification)
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                Auto-calculated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Derived automatically from documented history &amp; vitals with bedside clinical override
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 ${getBadgeStyle()}`}>
            <span>ABCD²: {totalScore}/7</span>
            {isComplete ? (
              <span className="text-[10px] font-sans font-semibold">
                ({totalScore >= 6 ? 'High 8.1%' : totalScore >= 4 ? 'Mod 4.1%' : 'Low 1.0%'})
              </span>
            ) : (
              <span className="text-[10px] font-sans font-medium text-amber-700 dark:text-amber-300">
                (Partial: {incompleteCount} unassessed)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isOpen ? 'Collapse ABCD2 tool' : 'Expand ABCD2 tool'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 pt-1 border-t border-teal-100 dark:border-teal-900/50">
          {/* Summary / Risk Stratification Alert */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Risk Assessment:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{riskCategory}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Risk tiers: Low 0–3 (1.0%) | Moderate 4–5 (4.1%) | High 6–7 (8.1%)</span>
              {Object.keys(patientCase.abcd2Score?.manualOverrides || {}).length > 0 && (
                <button
                  type="button"
                  onClick={handleResetOverrides}
                  className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                  title="Reset manual overrides and re-calculate automatically from text fields"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Overrides</span>
                </button>
              )}
            </div>
          </div>

          {/* 5 Components Scoring Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {/* 1. Age (A) */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  A — Age (≥ 60 years = 1 pt)
                </span>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  abcd2.agePoints === 1
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : abcd2.agePoints === 0
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {abcd2.agePoints !== undefined ? `+${abcd2.agePoints} pt` : 'Not assessed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {abcd2.ageLabel} (Derived from patient age: {patientCase.identification.age || '—'})
              </p>
            </div>

            {/* 2. Blood Pressure (B) */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  B — Blood Pressure (≥ 140/90 mmHg = 1 pt)
                </span>
                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  abcd2.bpPoints === 1
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : abcd2.bpPoints === 0
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {abcd2.bpPoints !== undefined ? `+${abcd2.bpPoints} pt` : 'Not assessed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {abcd2.bpLabel} (Initial BP: {patientCase.vitals.bpSys || '—'}/{patientCase.vitals.bpDia || '—'} mmHg)
              </p>
            </div>

            {/* 3. Clinical Features (C) */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    C — Clinical Features
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Unilateral weakness (2 pts) | Speech disturbance without weakness (1 pt) | Other (0 pt)
                  </span>
                </div>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  abcd2.clinicalPoints !== undefined
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {abcd2.clinicalPoints !== undefined ? `+${abcd2.clinicalPoints} pts` : 'Not assessed'}
                </span>
              </div>

              {/* Editable Quick Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetClinicalFeature('unilateral_weakness')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition text-[11px] font-semibold flex items-center justify-between ${
                    abcd2.clinicalFeatures === 'unilateral_weakness'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Unilateral Weakness</span>
                  <span className="font-mono text-xs">+2</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetClinicalFeature('speech_without_weakness')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition text-[11px] font-semibold flex items-center justify-between ${
                    abcd2.clinicalFeatures === 'speech_without_weakness'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Speech Only (No Weakness)</span>
                  <span className="font-mono text-xs">+1</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetClinicalFeature('other')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition text-[11px] font-semibold flex items-center justify-between ${
                    abcd2.clinicalFeatures === 'other'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Other (Sensory/Visual)</span>
                  <span className="font-mono text-xs">0</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetClinicalFeature('not_assessed')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition text-[11px] font-semibold text-center justify-center ${
                    abcd2.clinicalFeatures === 'not_assessed'
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Not Assessed</span>
                </button>
              </div>
            </div>

            {/* 4. Duration of Symptoms (D) */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    D — Duration of Episode
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ≥ 60 min (2 pts) | 10–59 min (1 pt) | &lt; 10 min (0 pt)
                  </span>
                </div>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  abcd2.durationPoints !== undefined
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {abcd2.durationPoints !== undefined ? `+${abcd2.durationPoints} pts` : 'Not assessed'}
                </span>
              </div>

              {/* Editable Duration Quick Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => handleSetDuration('ge_60')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.durationCategory === 'ge_60'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ≥ 60m (+2)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDuration('10_59')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.durationCategory === '10_59'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  10–59m (+1)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDuration('lt_10')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.durationCategory === 'lt_10'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  &lt; 10m (0)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDuration('not_assessed')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.durationCategory === 'not_assessed'
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Unassessed
                </button>
              </div>
            </div>

            {/* 5. Diabetes Mellitus (D2) */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    D — Diabetes Mellitus (1 pt)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    History of diabetes (+1 pt) | No diabetes (0 pt)
                  </span>
                </div>
                <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  abcd2.diabetesPoints !== undefined
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {abcd2.diabetesPoints !== undefined ? `+${abcd2.diabetesPoints} pt` : 'Not assessed'}
                </span>
              </div>

              {/* Editable Diabetes Quick Selectors */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => handleSetDiabetes('yes')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.diabetesStatus === 'yes'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Diabetes (+1)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDiabetes('no')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.diabetesStatus === 'no'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  No Diabetes (0)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetDiabetes('not_assessed')}
                  className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition text-center ${
                    abcd2.diabetesStatus === 'not_assessed'
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Unassessed
                </button>
              </div>
            </div>
          </div>

          {/* Important Clinical Safeguard Callout */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="font-bold block">Important clinical safeguard:</strong>
              <p className="text-[11px] leading-relaxed">
                {ABCD2_SAFEGUARD_TEXT}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
