import React, { useState } from 'react';
import { PatientCase, TriageCategory } from '../types/medical';
import { createEmptyCase } from '../services/seedData';
import { Zap, X, AlertCircle, PlusCircle, User, Clock } from 'lucide-react';

interface Props {
  existingCaseIds: string[];
  onCaseCreated: (newCase: PatientCase) => void;
  onClose: () => void;
}

export const NewCaseModal: React.FC<Props> = ({ existingCaseIds, onCaseCreated, onClose }) => {
  const [template, setTemplate] = useState<'stroke' | 'seizure' | 'headache' | 'altered' | 'blank'>('stroke');
  const [caseId, setCaseId] = useState<string>(() => `NEURO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [initials, setInitials] = useState('');
  const [mrn, setMrn] = useState('');
  const [age, setAge] = useState<number | string>('');
  const [sex, setSex] = useState<'M' | 'F' | 'Other'>('M');
  const [bedLocation, setBedLocation] = useState('Resus Bay 1');
  const [triage, setTriage] = useState<TriageCategory>('red');
  const [chiefComplaint, setChiefComplaint] = useState('Sudden onset left-sided hemiplegia and dysarthria');
  const [lkwMinutesAgo, setLkwMinutesAgo] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateChange = (tmpl: 'stroke' | 'seizure' | 'headache' | 'altered' | 'blank') => {
    setTemplate(tmpl);
    if (tmpl === 'stroke') {
      setChiefComplaint('Sudden onset left-sided hemiparesis, facial droop, and speech difficulty');
      setTriage('red');
      setBedLocation('Resus 1 (Stroke Code)');
      setLkwMinutesAgo(60);
    } else if (tmpl === 'seizure') {
      setChiefComplaint('Multiple witnessed generalized tonic-clonic convulsions; persistent post-ictal confusion');
      setTriage('orange');
      setBedLocation('Bay 2');
      setLkwMinutesAgo(120);
    } else if (tmpl === 'headache') {
      setChiefComplaint('Thunderclap headache, reached 10/10 severity within 30 seconds with neck stiffness and nausea');
      setTriage('red');
      setBedLocation('Bay 3 (Dim Room)');
      setLkwMinutesAgo(45);
    } else if (tmpl === 'altered') {
      setChiefComplaint('Progressive encephalopathy, fluctuating level of consciousness, combative when aroused');
      setTriage('orange');
      setBedLocation('Observation 4');
      setLkwMinutesAgo(240);
    } else {
      setChiefComplaint('');
      setTriage('yellow');
      setBedLocation('ER Bay');
      setLkwMinutesAgo(0);
    }
  };

  const handleCreate = () => {
    const trimmedId = caseId.trim().toUpperCase();
    if (!trimmedId) {
      setError('Please provide a valid Case ID.');
      return;
    }
    if (existingCaseIds.includes(trimmedId)) {
      setError(`Case ID "${trimmedId}" already exists. Case IDs must be unique.`);
      return;
    }

    const c = createEmptyCase();
    c.id = trimmedId;
    c.identification.id = trimmedId;
    c.identification.initials = initials.trim().toUpperCase() || 'PT';
    c.identification.mrn = mrn.trim();
    c.identification.age = age || '';
    c.identification.sex = sex;
    c.identification.bedLocation = bedLocation.trim();
    c.identification.triage = triage;
    c.identification.status = 'new';

    const now = new Date();
    c.identification.arrivalTime = now.toISOString();

    const lkwDate = new Date(now.getTime() - Math.max(0, lkwMinutesAgo) * 60 * 1000);
    c.identification.lastKnownWell = lkwDate.toISOString();
    c.chiefComplaint.lastKnownWellTime = lkwDate.toISOString();
    c.chiefComplaint.symptom = chiefComplaint.trim();
    c.chiefComplaint.onsetDuration = lkwMinutesAgo > 0 ? `${lkwMinutesAgo} minutes ago` : 'Acute';

    // Populate tailored template tags and clinical defaults
    if (template === 'stroke') {
      c.chiefComplaint.tags = ['Stroke Code', 'Hyperacute (<4.5h)', 'Neuro Vascular'];
      c.chiefComplaint.mode = 'sudden';
      c.assessmentPlan.workingDiagnosis = 'Acute Ischemic Stroke rule-out (Hyperacute Window)';
      c.assessmentPlan.strokeCodeProtocol = {
        lkwWithin4_5h: true,
        isCandidateTpa: true,
        isCandidateEvt: true,
        tpaCandidate: true,
        evtCandidate: true,
      };
      c.assessmentPlan.managementPlan = '1. STAT Non-contrast CT Brain + CTA Head & Neck.\n2. Point of care blood glucose & stat coags (PT/INR).\n3. Assess for IV Thrombolysis (Tenecteplase) eligibility.\n4. Screen for Endovascular Thrombectomy (EVT) candidate.\n5. Keep SBP < 185/110 mmHg.';
    } else if (template === 'seizure') {
      c.chiefComplaint.tags = ['Status Epilepticus', 'Seizure Cluster', 'Post-ictal'];
      c.chiefComplaint.mode = 'fluctuating';
      c.assessmentPlan.workingDiagnosis = 'Seizure cluster / Status epilepticus (post-ictal)';
      c.assessmentPlan.managementPlan = '1. Airway and oxygenation support, monitor SpO2.\n2. IV Lorazepam 4mg IV if seizure persists >5 min.\n3. IV Levetiracetam 60 mg/kg (max 4500 mg) infusion.\n4. Check glucose, lytes, toxicology, anti-seizure drug levels.\n5. Neuroimaging (NCCT) and EEG.';
    } else if (template === 'headache') {
      c.chiefComplaint.tags = ['Thunderclap Headache', 'SAH Rule-Out', 'Red Triage'];
      c.chiefComplaint.mode = 'sudden';
      c.assessmentPlan.workingDiagnosis = 'Aneurysmal Subarachnoid Hemorrhage rule-out';
      c.assessmentPlan.managementPlan = '1. STAT NCCT Brain (<6 hours of onset has >99% sensitivity for SAH).\n2. If NCCT negative >6h, perform diagnostic Lumbar Puncture for xanthochromia.\n3. STAT CTA Head & Neck for vascular aneurysm or dissection.\n4. SBP control target < 140 mmHg.\n5. Nimodipine 60mg q4h if SAH confirmed.';
    } else if (template === 'altered') {
      c.chiefComplaint.tags = ['Altered Mental Status', 'Encephalopathy', 'GCS Deficit'];
      c.chiefComplaint.mode = 'progressive';
      c.assessmentPlan.workingDiagnosis = 'Acute Encephalopathy (Toxic / Metabolic / Infectious)';
      c.assessmentPlan.managementPlan = '1. Check vitals, CBG, ABG/VBG, toxicology screen.\n2. Non-contrast CT Brain to exclude acute intracranial pathology.\n3. Screen for sepsis, urinary tract infection, pneumonia.\n4. Consider Lumbar Puncture if febrile or meningeal signs present.';
    }

    onCaseCreated(c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                New Emergency Neurology Case
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly initialize a patient card with rapid clinical protocols
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Clinical Templates */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
            Select Rapid ER Protocol Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleTemplateChange('stroke')}
              className={`p-2.5 rounded-xl border text-center transition font-medium ${
                template === 'stroke'
                  ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Zap className="w-4 h-4 mx-auto mb-1 text-red-500" />
              Stroke Code
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('seizure')}
              className={`p-2.5 rounded-xl border text-center transition font-medium ${
                template === 'seizure'
                  ? 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4 mx-auto mb-1 text-orange-500" />
              Seizure / Status
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('headache')}
              className={`p-2.5 rounded-xl border text-center transition font-medium ${
                template === 'headache'
                  ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              Thunderclap
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('altered')}
              className={`p-2.5 rounded-xl border text-center transition font-medium ${
                template === 'altered'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <User className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              Altered / Coma
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('blank')}
              className={`p-2.5 rounded-xl border text-center transition font-medium ${
                template === 'blank'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <PlusCircle className="w-4 h-4 mx-auto mb-1 text-cyan-500" />
              Blank Case
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Case ID (Unique) *
            </label>
            <input
              type="text"
              value={caseId}
              onChange={(e) => {
                setCaseId(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
              placeholder="e.g. NEURO-2026-9041"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Patient Initials
            </label>
            <input
              type="text"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 uppercase"
              placeholder="e.g. J.D."
              maxLength={6}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              MRN / Hospital ID
            </label>
            <input
              type="text"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
              placeholder="Optional local ID"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Age (Years)
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              placeholder="Age"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Sex
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Bed / ER Location
            </label>
            <input
              type="text"
              value={bedLocation}
              onChange={(e) => setBedLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
              placeholder="e.g. Resus Bay 1"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Triage Category
            </label>
            <select
              value={triage}
              onChange={(e) => setTriage(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="red" className="text-red-600 font-bold">Red (Resus / Emergent)</option>
              <option value="orange" className="text-orange-600 font-bold">Orange (Very Urgent)</option>
              <option value="yellow" className="text-amber-600 font-bold">Yellow (Urgent)</option>
              <option value="green" className="text-emerald-600 font-bold">Green (Standard)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Last Known Well (LKW) - Minutes Prior to Arrival
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={lkwMinutesAgo}
                onChange={(e) => setLkwMinutesAgo(parseInt(e.target.value, 10) || 0)}
                className="w-32 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
                min={0}
              />
              <span className="text-slate-500">mins ago</span>
              {lkwMinutesAgo <= 270 && lkwMinutesAgo > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Within &lt;4.5h IV Lysis Window
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Chief Complaint &amp; Key Symptoms *
          </label>
          <textarea
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100"
            placeholder="Describe presenting neurological complaint..."
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Create Patient Case Card
          </button>
        </div>
      </div>
    </div>
  );
};
