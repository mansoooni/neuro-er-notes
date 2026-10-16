export type TriageCategory = 'red' | 'orange' | 'yellow' | 'green';

export type CaseStatus =
  | 'new'
  | 'assessment'
  | 'investigations'
  | 'treatment'
  | 'admitted'
  | 'referred'
  | 'discharged'
  | 'archived'
  | 'trash';

export type OnsetMode = 'sudden' | 'progressive' | 'intermittent' | 'fluctuating';

export interface PatientIdentification {
  id: string; // e.g. NEURO-2026-0842
  initials: string;
  mrn?: string;
  age: number | string;
  sex: 'M' | 'F' | 'Other';
  arrivalTime: string; // ISO datetime string
  lastKnownWell: string; // ISO datetime string
  lastKnownWellType?: 'exact' | 'wake_up' | 'found_down' | 'unknown';
  lastKnownWellEstimatedWindow?: string;
  lastKnownWellNotes?: string;
  triage: TriageCategory;
  status: CaseStatus;
  bedLocation?: string;
  dischargedAt?: string;
  archivedAt?: string;
  trashedAt?: string;
}

export interface ChiefComplaint {
  symptom: string;
  onsetDuration: string;
  lastKnownWellTime?: string;
  mode: OnsetMode;
  associatedSymptoms: string;
  tags?: string[];
}

export interface MedicalHistory {
  hpi: string;
  pastMedical: string;
  pastNeurological?: {
    stroke?: boolean;
    tia?: boolean;
    seizures?: boolean;
    hemorrhage?: boolean;
    migraine?: boolean;
    notes?: string;
  };
  surgical?: string;
  medications: string;
  allergies: string;
  familyHistory?: string;
  socialHistory?: string;
  riskFactors?: {
    hypertension?: boolean;
    diabetes?: boolean;
    dyslipidemia?: boolean;
    smoking?: boolean;
    atrialFibrillation?: boolean;
    previousStroke?: boolean;
    cad?: boolean;
    anticoagulated?: boolean;
  };
}

export interface Vitals {
  bpSys: string | number;
  bpDia: string | number;
  hr: string | number;
  rr?: string | number;
  temp: string | number;
  spo2: string | number;
  cbg: string | number; // Capillary Blood Glucose (mg/dL)
  generalCondition?: string;
  gcsEye?: number;
  gcsVerbal?: number;
  gcsMotor?: number;
}

// 1. GCS Structure
export interface GCSScore {
  eye: number | 'U'; // 1-4 or 'U' (Untestable)
  eyeUntestableReason?: string;
  verbal: number | 'U'; // 1-5 or 'U' (Untestable: e.g. Intubated 'T', Aphasic)
  verbalUntestableReason?: string;
  motor: number | 'U'; // 1-6 or 'U' (Untestable: e.g. Paralyzed)
  motorUntestableReason?: string;
  totalText: string; // e.g. "E4 V5 M6 = 15/15" or "E3 V[T] M6"
  numericTotal?: number;
  notes?: string;
}

// 2. Motor Examination Structure
export interface MotorExamDetailed {
  rightUpperPower: number | string; // MRC 0-5
  leftUpperPower: number | string; // MRC 0-5
  rightLowerPower: number | string; // MRC 0-5
  leftLowerPower: number | string; // MRC 0-5
  leftArmPower?: number | string;
  rightArmPower?: number | string;
  leftLegPower?: number | string;
  rightLegPower?: number | string;
  toneNotes?: string;
  driftNotes?: string;
  movementsNotes?: string;
  generalMotorNotes?: string;
  reflexesUpperLeft?: string;
  reflexesUpperRight?: string;
  reflexesLowerLeft?: string;
  reflexesLowerRight?: string;
  plantarLeft?: string;
  plantarRight?: string;
}

// 3. Sensory Examination Structure
export interface SensoryExamDetailed {
  lightTouch?: string;
  pain?: string;
  temperature?: string;
  vibration?: string;
  jointPositionSense?: string;
  corticalSensory?: string;
  overallSensoryNotes?: string;
}

// 4. Cranial Nerves Structure (Simplified 5 concise points with legacy compatibility)
export interface CranialNervesDetailed {
  // 5 simplified concise points:
  cn2_pupils?: string; // 1. CN II — Pupils: Document pupil size, symmetry, and light reaction when assessed
  cn3_4_6_eye_movements?: string; // 2. CN III, IV, VI — Eye Movements: Document extraocular movements, gaze limitation, and diplopia when relevant
  cn7_facial_symmetry?: string; // 3. CN VII — Facial Symmetry: Document facial symmetry, forehead sparing, and smile/eye closure findings
  cn9_10_12_speech_bulbar?: string; // 4. CN IX, X, XII — Speech and Bulbar Function: Document dysarthria, dysphonia, palate movement, and tongue protrusion
  other_cranial_nerves?: string; // 5. Other Cranial Nerves: Document other findings when clinically indicated, such as hearing changes, jaw jerk, or corneal reflex

  // Legacy fields for backward compatibility and migration:
  cn1_olfactory?: string;
  cn2_optic?: string;
  cn3_4_6_extraocular?: string;
  cn5_trigeminal?: string;
  cn7_facial?: string;
  cn8_vestibulocochlear?: string;
  cn9_10_glossopharyngeal_vagus?: string;
  cn11_accessory?: string;
  cn12_hypoglossal?: string;
  overallCranialNotes?: string;
  pupils?: string;
  fields?: string;
  eom?: string;
  facial?: string;
  palateGag?: string;
}

// ABCD2 Score Structure
export type ABCD2ClinicalFeature = 'unilateral_weakness' | 'speech_without_weakness' | 'other' | 'not_assessed';
export type ABCD2DurationCategory = 'ge_60' | '10_59' | 'lt_10' | 'not_assessed';
export type ABCD2DiabetesStatus = 'yes' | 'no' | 'not_assessed';

export interface ABCD2Score {
  agePoints?: number; // 1 or 0
  ageAssessed?: boolean;
  bpPoints?: number; // 1 or 0
  bpAssessed?: boolean;
  clinicalFeatures?: ABCD2ClinicalFeature;
  clinicalPoints?: number; // 2, 1, or 0
  clinicalAssessed?: boolean;
  durationCategory?: ABCD2DurationCategory;
  durationPoints?: number; // 2, 1, or 0
  durationAssessed?: boolean;
  diabetesStatus?: ABCD2DiabetesStatus;
  diabetesPoints?: number; // 1 or 0
  diabetesAssessed?: boolean;
  totalScore?: number;
  maxScore: 7;
  incompleteCount: number;
  riskCategory?: string; // e.g., "Low Risk (1.0% 2-day stroke risk)", "Moderate Risk (4.1%)", "High Risk (8.1%)"
  isAutoCalculated?: boolean;
  manualOverrides?: {
    clinicalFeatures?: boolean;
    duration?: boolean;
    diabetes?: boolean;
    bp?: boolean;
    age?: boolean;
  };
  notes?: string;
}

// 5. Bulbar Examination Structure
export interface BulbarExamDetailed {
  speechArticulation?: string;
  dysarthria?: string;
  dysphonia?: string;
  palatalMovement?: string;
  gagReflex?: string;
  swallowing?: string;
  tongueMovementStrength?: string;
  bulbarNotes?: string;
}

// 6. Sphincter Function Structure
export interface SphincterExamDetailed {
  urinaryControl?: string;
  bowelControl?: string;
  sacralSensoryTone?: string;
  sphincterNotes?: string;
}

// 7. Plantar Reflex Structure
export type PlantarResponse = 'Flexor' | 'Extensor (Babinski +)' | 'Equivocal' | 'Not assessed';

export interface PlantarReflexDetailed {
  right: PlantarResponse;
  left: PlantarResponse;
  notes?: string;
}

// Complete Structured Neurological Examination
export interface NeurologicalExamStructured {
  gcs: GCSScore;
  motor: MotorExamDetailed;
  sensory: SensoryExamDetailed;
  cranialNerves: CranialNervesDetailed;
  bulbar: BulbarExamDetailed;
  sphincter: SphincterExamDetailed;
  plantars: PlantarReflexDetailed;
  generalExamNotes?: string;
  orientationLanguage?: string;
  positiveFindings?: string;
  mentalStatus?: string;
  nihss?: { totalScore?: number; severity?: string; items?: any; notes?: string };
}

// NIHSS Assessment Items
export interface NIHSSAssessmentItems {
  loc1a: number | null; // 0-3
  locQuestions1b: number | null; // 0-2
  locCommands1c: number | null; // 0-2
  bestGaze2: number | null; // 0-2
  visualFields3: number | null; // 0-3
  facialPalsy4: number | null; // 0-3
  motorLeftArm5a: number | 'UN' | null; // 0-4 or UN
  motorRightArm5b: number | 'UN' | null; // 0-4 or UN
  motorLeftLeg6a: number | 'UN' | null; // 0-4 or UN
  motorRightLeg6b: number | 'UN' | null; // 0-4 or UN
  limbAtaxia7: number | 'UN' | null; // 0-2 or UN
  sensory8: number | null; // 0-2
  bestLanguage9: number | null; // 0-3
  dysarthria10: number | 'UN' | null; // 0-2 or UN
  extinction11: number | null; // 0-2
}

export interface NIHSSRecord {
  id: string;
  timestamp: string;
  label?: string; // e.g. "Initial ED baseline", "Post-tPA 1h", "Post-EVT"
  items: NIHSSAssessmentItems;
  totalScore: number;
  isComplete: boolean;
  unscoredCount: number;
  severity: string;
  notes?: string;
}

export type ImagingModality =
  | 'CT Brain (Non-contrast)'
  | 'CT Angiography (CTA Head & Neck)'
  | 'CT Perfusion (CTP)'
  | 'MRI Brain (DWI/FLAIR)'
  | 'MRI Brain (T2*/SWI)'
  | 'MR Angiography (MRA)'
  | 'Carotid Doppler Ultrasound'
  | 'Chest X-Ray'
  | 'ECG Rhythm Strip'
  | 'EEG'
  | 'Medical Document / Lab Report';

export interface MedicalImage {
  id: string;
  caseId: string;
  title: string;
  caption?: string;
  modality: ImagingModality;
  studyDate: string; // ISO string
  dataUrl: string; // Base64 or Blob Data URL
  fileType: string;
  fileSize: number; // in bytes
  aspectsScore?: string;
  interpretation?: string;
  uploadedAt: string;
}

export interface Investigations {
  cbc?: {
    hb?: string;
    wbc?: string;
    platelets?: string;
  };
  bloodGlucose?: string;
  electrolytes?: {
    na?: string;
    k?: string;
    ca?: string;
  };
  renal?: {
    bun?: string;
    cr?: string;
    egfr?: string;
  };
  coagulation?: {
    pt?: string;
    inr?: string;
    aptt?: string;
  };
  cardiacMarkers?: {
    troponin?: string;
  };
  ecgFindings?: string;
  csfAnalysis?: string;
  generalInvestigationsNotes?: string;
}

export interface AssessmentPlan {
  workingDiagnosis: string;
  differentials?: string;
  clinicalLocalization?: string;
  managementPlan: string;
  disposition?: string;
  consultations?: string;
  pendingTasks?: Array<{ id: string; task: string; completed?: boolean; priority?: string }>;
  strokeCodeProtocol?: {
    lkwWithin4_5h?: boolean;
    isCandidateTpa?: boolean;
    isCandidateEvt?: boolean;
    tpaCandidate?: boolean;
    tpaGiven?: boolean;
    tpaDose?: string;
    tpaTime?: string;
    evtCandidate?: boolean;
    evtTime?: string;
    targetBP?: string;
  };
}

export interface ProgressNote {
  id: string;
  timestamp: string;
  author: string;
  category?: string;
  note: string;
}

export interface PatientCase {
  id: string; // Unique Case ID
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  identification: PatientIdentification;
  chiefComplaint: ChiefComplaint;
  history: MedicalHistory;
  vitals: Vitals;
  neuroExam: NeurologicalExamStructured;
  nihssAssessments: NIHSSRecord[]; // Multiple NIHSS records per patient
  abcd2Score?: ABCD2Score;
  investigations: Investigations;
  assessmentPlan: AssessmentPlan;
  progressNotes: ProgressNote[];
}
