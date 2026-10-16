import React from 'react';
import { PatientCase, MedicalImage } from '../types/medical';
import { Printer, X, Download } from 'lucide-react';

interface Props {
  patientCase: PatientCase;
  images: MedicalImage[];
  onClose: () => void;
}

export const PrintCaseView: React.FC<Props> = ({ patientCase, images, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const c = patientCase;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-6 flex justify-center">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-10 relative my-auto print:m-0 print:p-6 print:shadow-none print:w-full">
        {/* Actions bar (hidden in print) */}
        <div className="print:hidden flex items-center justify-between pb-6 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold uppercase">
              Printable Medical Case Note
            </span>
            <span className="text-xs text-slate-500">Case ID: {c.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Medical Case Document Content */}
        <div className="space-y-6 text-sm text-slate-800 font-sans leading-relaxed">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Emergency Department Neurology Consultation
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  NeuroER Clinical Document &bull; Generated: {new Date().toLocaleString()}
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <p className="font-bold text-sm text-slate-900">CASE ID: {c.id}</p>
                {c.identification.mrn && <p className="text-slate-600">MRN: {c.identification.mrn}</p>}
                <p className="text-slate-600">Bed: {c.identification.bedLocation || 'ER Bay'}</p>
              </div>
            </div>

            {/* Quick Demographics Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Patient / Initials:</span>
                <strong className="text-slate-900 font-semibold">{c.identification.initials || 'Not documented'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Age / Sex:</span>
                <strong className="text-slate-900">{c.identification.age || '—'} yo / {c.identification.sex}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Arrival Time:</span>
                <span className="font-mono">{new Date(c.identification.arrivalTime).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Known Well (LKW):</span>
                <span className="font-mono text-red-600 font-semibold">{new Date(c.identification.lastKnownWell).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Triage Category:</span>
                <span className="uppercase font-bold text-red-700">{c.identification.triage}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Case Status:</span>
                <span className="capitalize font-medium">{c.identification.status.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Allergies:</span>
                <span className="text-red-600 font-semibold">{c.history.allergies || 'No Known Drug Allergies (NKDA)'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Current Medications:</span>
                <span className="truncate block" title={c.history.medications}>{c.history.medications || 'None recorded'}</span>
              </div>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              1. Chief Complaint &amp; Onset
            </h2>
            <p className="font-medium text-slate-900">{c.chiefComplaint.symptom || 'Not documented'}</p>
            <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-slate-600">
              <p><strong>Duration / Onset:</strong> {c.chiefComplaint.onsetDuration || 'Acute'}</p>
              <p><strong>Mode of Onset:</strong> <span className="capitalize font-semibold">{c.chiefComplaint.mode}</span></p>
              <p className="col-span-2"><strong>Associated Symptoms:</strong> {c.chiefComplaint.associatedSymptoms || 'None reported'}</p>
            </div>
          </div>

          {/* History */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              2. History of Present Illness &amp; Background
            </h2>
            <div className="space-y-2 text-xs">
              <p className="whitespace-pre-wrap leading-relaxed">{c.history.hpi || 'No HPI documented.'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                <p><strong>Past Medical History:</strong> {c.history?.pastMedical || 'None'}</p>
                <p><strong>Surgical History:</strong> {c.history?.surgical || 'None'}</p>
                <p><strong>Prior Neuro Events:</strong> {c.history?.pastNeurological?.notes || (c.history?.pastNeurological?.stroke ? 'Prior Stroke' : 'None') || 'None'}</p>
                <p><strong>Social History:</strong> {c.history?.socialHistory || 'Non-smoker'}</p>
              </div>
            </div>
          </div>

          {/* Vitals and Exam */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              3. Objective Physical &amp; Neurological Examination
            </h2>

            {/* Vitals Table */}
            <div className="grid grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-center mb-3">
              <div>
                <span className="text-slate-400 block text-[10px]">BP (mmHg)</span>
                <span className="font-bold">{c.vitals.bpSys}/{c.vitals.bpDia}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">HR (bpm)</span>
                <span className="font-bold">{c.vitals.hr}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SpO2 (%)</span>
                <span className="font-bold">{c.vitals.spo2}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Temp (°C)</span>
                <span className="font-bold">{c.vitals.temp}°C</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CBG (Glucose)</span>
                <span className="font-bold text-blue-700">{c.vitals.cbg || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">GCS</span>
                <span className="font-bold text-indigo-700">
                  {c.neuroExam?.gcs?.totalText || `${(c.vitals.gcsEye || 4) + (c.vitals.gcsVerbal || 5) + (c.vitals.gcsMotor || 6)}/15`}
                </span>
              </div>
            </div>

            {/* Neurological Detail */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>GCS &amp; Mental Status:</strong> {c.neuroExam?.gcs?.notes || c.neuroExam?.mentalStatus || 'Spontaneous, alert'}</p>
                <p><strong>General Exam:</strong> {c.neuroExam?.generalExamNotes || 'No acute distress, chest clear'}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <strong className="block text-slate-700 mb-1">Cranial Nerves (CN I - XII):</strong>
                <p>{c.neuroExam?.cranialNerves?.overallCranialNotes || c.neuroExam?.cranialNerves?.cn2_optic || 'Pupils equal & reactive to light, extraocular movements intact, facial symmetry preserved.'}</p>
              </div>

              {/* Motor MRC Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                <div>
                  <strong className="block text-slate-700 mb-0.5">Motor Power (MRC 0-5):</strong>
                  <p>Right Upper: {c.neuroExam?.motor?.rightUpperPower ?? 5}/5 | Left Upper: {c.neuroExam?.motor?.leftUpperPower ?? 5}/5</p>
                  <p>Right Lower: {c.neuroExam?.motor?.rightLowerPower ?? 5}/5 | Left Lower: {c.neuroExam?.motor?.leftLowerPower ?? 5}/5</p>
                </div>
                <div>
                  <strong className="block text-slate-700 mb-0.5">Plantar &amp; Reflexes:</strong>
                  <p>Right Plantar: {c.neuroExam?.plantars?.right || 'Flexor'} | Left Plantar: {c.neuroExam?.plantars?.left || 'Flexor'}</p>
                  <p>Reflex Notes: {c.neuroExam?.plantars?.notes || 'Normal 2+ symmetrically'}</p>
                </div>
              </div>

              {/* NIHSS Breakdown if present */}
              {c.neuroExam?.nihss && (
                <div className="p-2 rounded bg-amber-50/80 border border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900">NIH Stroke Scale Score: {c.neuroExam.nihss.totalScore} / 42</span>
                    <span className="text-amber-800 font-medium">{c.neuroExam.nihss.severity}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Investigations */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              4. Laboratory Investigations &amp; ECG
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <p><strong>CBC:</strong> Hb {c.investigations?.cbc?.hb || '—'}, WBC {c.investigations?.cbc?.wbc || '—'}, Plt {c.investigations?.cbc?.platelets || '—'}</p>
              <p><strong>Coag:</strong> INR {c.investigations?.coagulation?.inr || '—'}, PT {c.investigations?.coagulation?.pt || '—'}, aPTT {c.investigations?.coagulation?.aptt || '—'}</p>
              <p><strong>Renal:</strong> Cr {c.investigations?.renal?.cr || '—'}, BUN {c.investigations?.renal?.bun || '—'}</p>
              <p><strong>Electrolytes:</strong> Na {c.investigations?.electrolytes?.na || '—'}, K {c.investigations?.electrolytes?.k || '—'}</p>
            </div>
            {c.investigations?.ecgFindings && (
              <p className="text-xs text-slate-700 mt-1"><strong>ECG:</strong> {c.investigations.ecgFindings}</p>
            )}
          </div>

          {/* Neuroimaging */}
          {images.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                5. Neuroimaging Studies ({images.length} Studies Logged)
              </h2>
              <div className="space-y-2">
                {images.map((img) => (
                  <div key={img.id} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{img.modality} &bull; {img.title}</span>
                      <span className="font-mono text-slate-500">{new Date(img.studyDate).toLocaleString()}</span>
                    </div>
                    {img.aspectsScore && (
                      <p className="text-emerald-700 font-mono font-medium">ASPECTS Score: {img.aspectsScore}/10</p>
                    )}
                    <p className="text-slate-700 mt-0.5">{img.interpretation || 'No interpretation documented.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment & Plan */}
          <div className="border-t-2 border-slate-900 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-1 mb-2">
              6. Clinical Assessment &amp; Emergency Management Plan
            </h2>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded">
                <p className="font-bold text-sm text-blue-950">
                  Working Diagnosis: {c.assessmentPlan.workingDiagnosis || 'Under Evaluation'}
                </p>
                {c.assessmentPlan.clinicalLocalization && (
                  <p className="text-blue-900 mt-0.5"><strong>Localization:</strong> {c.assessmentPlan.clinicalLocalization}</p>
                )}
                {c.assessmentPlan.differentials && (
                  <p className="text-blue-800 text-[11px] mt-0.5"><strong>Differentials:</strong> {c.assessmentPlan.differentials}</p>
                )}
              </div>

              <div>
                <strong className="block text-slate-800 mb-1">Management Plan:</strong>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{c.assessmentPlan.managementPlan || 'Supportive care and monitoring.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <p><strong>Consultations:</strong> {c.assessmentPlan.consultations || 'None'}</p>
                <p><strong>Disposition:</strong> <span className="font-semibold text-slate-900">{c.assessmentPlan.disposition || 'Pending'}</span></p>
              </div>
            </div>
          </div>

          {/* Progress Notes */}
          {c.progressNotes.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                7. Clinical Timeline &amp; Progress Notes
              </h2>
              <div className="space-y-1.5 text-xs">
                {c.progressNotes.map((note) => (
                  <div key={note.id} className="border-l-2 border-slate-400 pl-2.5 py-0.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{note.category} &bull; {note.author}</span>
                      <span className="font-mono">{new Date(note.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-800">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Footer */}
          <div className="border-t border-slate-300 pt-6 mt-8 flex justify-between items-end text-xs text-slate-500 font-mono">
            <div>
              <p>Documentation completed via NeuroER offline medical notebook.</p>
              <p>Confidential Medical Record &bull; For Clinical Shift Use Only</p>
            </div>
            <div className="text-right">
              <p className="border-b border-slate-400 w-48 mb-1 pb-4"></p>
              <p className="font-sans font-semibold text-slate-800">Neurology Resident on Duty</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
