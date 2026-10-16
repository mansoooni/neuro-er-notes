import React, { useState } from 'react';
import { NIHSSAssessmentItems, NIHSSRecord } from '../types/medical';
import { Plus, Clock, Check, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react';

interface Props {
  records: NIHSSRecord[];
  onAddRecord: (record: NIHSSRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
}

const DEFAULT_ITEMS: NIHSSAssessmentItems = {
  loc1a: null,
  locQuestions1b: null,
  locCommands1c: null,
  bestGaze2: null,
  visualFields3: null,
  facialPalsy4: null,
  motorLeftArm5a: null,
  motorRightArm5b: null,
  motorLeftLeg6a: null,
  motorRightLeg6b: null,
  limbAtaxia7: null,
  sensory8: null,
  bestLanguage9: null,
  dysarthria10: null,
  extinction11: null,
};

export const NIHSSCalculator: React.FC<Props> = ({ records, onAddRecord, onDeleteRecord }) => {
  const [currentItems, setCurrentItems] = useState<NIHSSAssessmentItems>(() => {
    // If an assessment exists, start with a fresh copy or clean
    return { ...DEFAULT_ITEMS };
  });

  const [assessmentLabel, setAssessmentLabel] = useState('ED Evaluation');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Calculate score & completeness
  const computeScore = (items: NIHSSAssessmentItems) => {
    let score = 0;
    let unscored = 0;

    const check = (val: number | 'UN' | null) => {
      if (val === null) {
        unscored++;
      } else if (typeof val === 'number') {
        score += val;
      }
      // 'UN' contributes 0 to total score as per official NIHSS rules
    };

    check(items.loc1a);
    check(items.locQuestions1b);
    check(items.locCommands1c);
    check(items.bestGaze2);
    check(items.visualFields3);
    check(items.facialPalsy4);
    check(items.motorLeftArm5a);
    check(items.motorRightArm5b);
    check(items.motorLeftLeg6a);
    check(items.motorRightLeg6b);
    check(items.limbAtaxia7);
    check(items.sensory8);
    check(items.bestLanguage9);
    check(items.dysarthria10);
    check(items.extinction11);

    let severity = 'No Stroke Symptoms (0)';
    if (score >= 1 && score <= 4) severity = 'Minor Stroke (1–4)';
    else if (score >= 5 && score <= 15) severity = 'Moderate Stroke (5–15)';
    else if (score >= 16 && score <= 20) severity = 'Moderate to Severe (16–20)';
    else if (score >= 21) severity = 'Severe Stroke (21–42)';

    return { score, unscored, isComplete: unscored === 0, severity };
  };

  const { score, unscored, isComplete, severity } = computeScore(currentItems);

  const updateItem = (key: keyof NIHSSAssessmentItems, val: number | 'UN') => {
    setCurrentItems((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSaveAssessment = () => {
    const record: NIHSSRecord = {
      id: `nihss-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: assessmentLabel.trim() || 'ED Evaluation',
      items: { ...currentItems },
      totalScore: score,
      isComplete,
      unscoredCount: unscored,
      severity,
      notes: assessmentNotes.trim(),
    };

    onAddRecord(record);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSetAllNormal = () => {
    setCurrentItems({
      loc1a: 0,
      locQuestions1b: 0,
      locCommands1c: 0,
      bestGaze2: 0,
      visualFields3: 0,
      facialPalsy4: 0,
      motorLeftArm5a: 0,
      motorRightArm5b: 0,
      motorLeftLeg6a: 0,
      motorRightLeg6b: 0,
      limbAtaxia7: 0,
      sensory8: 0,
      bestLanguage9: 0,
      dysarthria10: 0,
      extinction11: 0,
    });
  };

  const latestRecord = records && records.length > 0 ? records[0] : null;

  return (
    <div className="space-y-4">
      {/* Header with Prominent Score Display */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isComplete ? `NIHSS: ${score}/42` : `NIHSS: ${score}/42 (Partial - ${unscored} items unscored)`}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                score === 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : score <= 4
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : score <= 15
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {severity}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official National Institutes of Health Stroke Scale (15 items)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSetAllNormal}
            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
          >
            Mark All Normal (0)
          </button>

          <button
            type="button"
            onClick={handleSaveAssessment}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 active:scale-95"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Saved to Patient History!' : 'Record Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Assessment Label & Notes Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div>
          <label className="text-slate-500 block mb-0.5">Assessment Timing / Label</label>
          <input
            type="text"
            value={assessmentLabel}
            onChange={(e) => setAssessmentLabel(e.target.value)}
            placeholder="e.g. ED Baseline, Post-tPA 1h, Post-Thrombectomy"
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-0.5">Assessment Clinical Notes</label>
          <input
            type="text"
            value={assessmentNotes}
            onChange={(e) => setAssessmentNotes(e.target.value)}
            placeholder="e.g. Patient intubated, unable to test language; dense right neglect"
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Grid of All 15 Official NIHSS Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
        {/* 1a */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            1a. Level of Consciousness (LOC)
          </span>
          <select
            value={currentItems.loc1a ?? ''}
            onChange={(e) => updateItem('loc1a', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Alert; keenly responsive</option>
            <option value={1}>1 = Not alert; aroused by minor stimulation</option>
            <option value={2}>2 = Not alert; requires repeated/strong stimuli</option>
            <option value={3}>3 = Unresponsive / reflexive motor response or coma</option>
          </select>
        </div>

        {/* 1b */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            1b. LOC Questions (Month &amp; Age)
          </span>
          <select
            value={currentItems.locQuestions1b ?? ''}
            onChange={(e) => updateItem('locQuestions1b', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Answers both correctly</option>
            <option value={1}>1 = Answers one question correctly</option>
            <option value={2}>2 = Answers neither correctly / aphasic / stupor</option>
          </select>
        </div>

        {/* 1c */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            1c. LOC Commands (Open/Close Eyes, Grip)
          </span>
          <select
            value={currentItems.locCommands1c ?? ''}
            onChange={(e) => updateItem('locCommands1c', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Performs both tasks correctly</option>
            <option value={1}>1 = Performs one task correctly</option>
            <option value={2}>2 = Performs neither task correctly</option>
          </select>
        </div>

        {/* 2 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            2. Best Gaze (Horizontal)
          </span>
          <select
            value={currentItems.bestGaze2 ?? ''}
            onChange={(e) => updateItem('bestGaze2', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Normal horizontal gaze</option>
            <option value={1}>1 = Partial gaze palsy (can overcome)</option>
            <option value={2}>2 = Forced deviation or total gaze paresis</option>
          </select>
        </div>

        {/* 3 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            3. Visual Fields
          </span>
          <select
            value={currentItems.visualFields3 ?? ''}
            onChange={(e) => updateItem('visualFields3', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No visual field defect</option>
            <option value={1}>1 = Partial hemianopia / quadrantanopia</option>
            <option value={2}>2 = Complete homonymous hemianopia</option>
            <option value={3}>3 = Bilateral hemianopia / cortical blindness</option>
          </select>
        </div>

        {/* 4 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            4. Facial Palsy
          </span>
          <select
            value={currentItems.facialPalsy4 ?? ''}
            onChange={(e) => updateItem('facialPalsy4', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Normal symmetrical movements</option>
            <option value={1}>1 = Minor paralysis (flattened nasolabial fold)</option>
            <option value={2}>2 = Partial paralysis (lower face weakness)</option>
            <option value={3}>3 = Complete paralysis (one or both sides)</option>
          </select>
        </div>

        {/* 5a */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            5a. Left Arm Motor (10s drift)
          </span>
          <select
            value={currentItems.motorLeftArm5a ?? ''}
            onChange={(e) => updateItem('motorLeftArm5a', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No drift; holds 90°/45° for 10s</option>
            <option value={1}>1 = Drift before 10s; does not touch bed</option>
            <option value={2}>2 = Falls to bed before 10s; some effort</option>
            <option value={3}>3 = No effort against gravity; limb falls</option>
            <option value={4}>4 = No movement</option>
            <option value="UN">UN = Amputation / joint fusion (explain)</option>
          </select>
        </div>

        {/* 5b */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            5b. Right Arm Motor (10s drift)
          </span>
          <select
            value={currentItems.motorRightArm5b ?? ''}
            onChange={(e) => updateItem('motorRightArm5b', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No drift; holds 10s</option>
            <option value={1}>1 = Drift before 10s</option>
            <option value={2}>2 = Falls to bed before 10s; some effort</option>
            <option value={3}>3 = No effort against gravity</option>
            <option value={4}>4 = No movement</option>
            <option value="UN">UN = Amputation / joint fusion</option>
          </select>
        </div>

        {/* 6a */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            6a. Left Leg Motor (5s drift)
          </span>
          <select
            value={currentItems.motorLeftLeg6a ?? ''}
            onChange={(e) => updateItem('motorLeftLeg6a', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No drift; holds 30° for 5s</option>
            <option value={1}>1 = Drift before 5s; does not touch bed</option>
            <option value={2}>2 = Falls to bed before 5s; some effort</option>
            <option value={3}>3 = No effort against gravity</option>
            <option value={4}>4 = No movement</option>
            <option value="UN">UN = Amputation / joint fusion</option>
          </select>
        </div>

        {/* 6b */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            6b. Right Leg Motor (5s drift)
          </span>
          <select
            value={currentItems.motorRightLeg6b ?? ''}
            onChange={(e) => updateItem('motorRightLeg6b', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No drift; holds 5s</option>
            <option value={1}>1 = Drift before 5s</option>
            <option value={2}>2 = Falls to bed before 5s; some effort</option>
            <option value={3}>3 = No effort against gravity</option>
            <option value={4}>4 = No movement</option>
            <option value="UN">UN = Amputation / joint fusion</option>
          </select>
        </div>

        {/* 7 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            7. Limb Ataxia (Finger-nose &amp; Heel-shin)
          </span>
          <select
            value={currentItems.limbAtaxia7 ?? ''}
            onChange={(e) => updateItem('limbAtaxia7', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Absent (no ataxia)</option>
            <option value={1}>1 = Present in one limb</option>
            <option value={2}>2 = Present in two or more limbs</option>
            <option value="UN">UN = Amputation / plegic limb</option>
          </select>
        </div>

        {/* 8 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            8. Sensory (Pinprick / grimace)
          </span>
          <select
            value={currentItems.sensory8 ?? ''}
            onChange={(e) => updateItem('sensory8', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Normal; no sensory loss</option>
            <option value={1}>1 = Mild-to-moderate sensory loss</option>
            <option value={2}>2 = Severe to total sensory loss / unaware</option>
          </select>
        </div>

        {/* 9 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            9. Best Language (Aphasia)
          </span>
          <select
            value={currentItems.bestLanguage9 ?? ''}
            onChange={(e) => updateItem('bestLanguage9', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No aphasia; normal fluency &amp; naming</option>
            <option value={1}>1 = Mild-to-moderate aphasia</option>
            <option value={2}>2 = Severe aphasia; fragmented communication</option>
            <option value={3}>3 = Mute / global aphasia / coma</option>
          </select>
        </div>

        {/* 10 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            10. Dysarthria (Slurred speech)
          </span>
          <select
            value={currentItems.dysarthria10 ?? ''}
            onChange={(e) => updateItem('dysarthria10', e.target.value === 'UN' ? 'UN' : parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = Normal articulation</option>
            <option value={1}>1 = Mild-to-moderate dysarthria</option>
            <option value={2}>2 = Severe dysarthria / unintelligible or mute</option>
            <option value="UN">UN = Intubated or physical barrier</option>
          </select>
        </div>

        {/* 11 */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            11. Extinction &amp; Inattention (Neglect)
          </span>
          <select
            value={currentItems.extinction11 ?? ''}
            onChange={(e) => updateItem('extinction11', parseInt(e.target.value, 10))}
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1.5"
          >
            <option value="" disabled>Select score...</option>
            <option value={0}>0 = No abnormality</option>
            <option value={1}>1 = Visual, tactile, or spatial extinction</option>
            <option value={2}>2 = Profound hemi-inattention / hemi-neglect</option>
          </select>
        </div>
      </div>

      {/* Historical NIHSS Assessments Drawer */}
      {records && records.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span>Prior NIHSS Evaluations ({records.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="space-y-2 mt-2">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-700 dark:text-cyan-400">
                        NIHSS: {rec.totalScore}/42
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rec.label}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        ({rec.severity})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(rec.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      {onDeleteRecord && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Delete evaluation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {rec.notes && (
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Notes: {rec.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
