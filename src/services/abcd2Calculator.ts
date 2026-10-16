import {
  PatientCase,
  ABCD2Score,
  ABCD2ClinicalFeature,
  ABCD2DurationCategory,
  ABCD2DiabetesStatus,
} from '../types/medical';

export const ABCD2_SAFEGUARD_TEXT =
  'ABCD2 is a risk-stratification tool for suspected TIA, not a diagnostic test. Do not use the score alone to exclude stroke, determine discharge safety, or delay urgent assessment.';

export interface ParsedABCD2Result extends ABCD2Score {
  ageLabel: string;
  bpLabel: string;
  clinicalLabel: string;
  durationLabel: string;
  diabetesLabel: string;
  isComplete: boolean;
  scoreText: string;
  summaryExplanation: string[];
}

/**
 * Automatically computes or updates the ABCD2 score based on patient data,
 * respecting manual overrides if specified by the clinician.
 */
export function calculateABCD2(patientCase: PatientCase): ParsedABCD2Result {
  const existing = patientCase.abcd2Score;
  const overrides = existing?.manualOverrides || {};

  // 1. Age (A): >= 60 -> 1, < 60 -> 0
  let agePoints: number | undefined = undefined;
  let ageAssessed = false;
  let ageLabel = 'Not assessed';

  const rawAge = patientCase.identification.age;
  const numAge = typeof rawAge === 'number' ? rawAge : rawAge ? parseInt(String(rawAge), 10) : NaN;

  if (overrides.age && existing?.agePoints !== undefined) {
    agePoints = existing.agePoints;
    ageAssessed = true;
    ageLabel = agePoints === 1 ? 'Age ≥ 60 years (+1 pt)' : 'Age < 60 years (0 pt)';
  } else if (!isNaN(numAge) && numAge > 0) {
    ageAssessed = true;
    if (numAge >= 60) {
      agePoints = 1;
      ageLabel = `${numAge} yo (≥ 60) (+1 pt)`;
    } else {
      agePoints = 0;
      ageLabel = `${numAge} yo (< 60) (0 pt)`;
    }
  }

  // 2. Blood Pressure (B): SBP >= 140 OR DBP >= 90 -> 1 pt
  let bpPoints: number | undefined = undefined;
  let bpAssessed = false;
  let bpLabel = 'Not assessed';

  const sys = patientCase.vitals.bpSys !== undefined && patientCase.vitals.bpSys !== ''
    ? Number(patientCase.vitals.bpSys)
    : NaN;
  const dia = patientCase.vitals.bpDia !== undefined && patientCase.vitals.bpDia !== ''
    ? Number(patientCase.vitals.bpDia)
    : NaN;

  if (overrides.bp && existing?.bpPoints !== undefined) {
    bpPoints = existing.bpPoints;
    bpAssessed = true;
    bpLabel = bpPoints === 1 ? 'BP ≥ 140/90 mmHg (+1 pt)' : 'BP < 140/90 mmHg (0 pt)';
  } else if (!isNaN(sys) || !isNaN(dia)) {
    const sVal = isNaN(sys) ? 0 : sys;
    const dVal = isNaN(dia) ? 0 : dia;
    bpAssessed = true;
    if (sVal >= 140 || dVal >= 90) {
      bpPoints = 1;
      bpLabel = `${sVal || '—'}/${dVal || '—'} mmHg (≥ 140/90) (+1 pt)`;
    } else if (sVal > 0 && dVal > 0) {
      bpPoints = 0;
      bpLabel = `${sVal}/${dVal} mmHg (< 140/90) (0 pt)`;
    } else {
      // Partial BP entered
      bpAssessed = false;
      bpPoints = undefined;
      bpLabel = 'Incomplete BP';
    }
  }

  // 3. Clinical Features (C):
  // Unilateral weakness -> 2 pts
  // Speech disturbance without weakness -> 1 pt
  // Other symptoms (sensory, visual, etc.) -> 0 pt
  let clinicalFeatures: ABCD2ClinicalFeature = 'not_assessed';
  let clinicalPoints: number | undefined = undefined;
  let clinicalAssessed = false;
  let clinicalLabel = 'Not assessed';

  if (overrides.clinicalFeatures && existing?.clinicalFeatures) {
    clinicalFeatures = existing.clinicalFeatures;
    if (clinicalFeatures === 'unilateral_weakness') {
      clinicalPoints = 2;
      clinicalAssessed = true;
      clinicalLabel = 'Unilateral weakness (+2 pts)';
    } else if (clinicalFeatures === 'speech_without_weakness') {
      clinicalPoints = 1;
      clinicalAssessed = true;
      clinicalLabel = 'Speech disturbance without weakness (+1 pt)';
    } else if (clinicalFeatures === 'other') {
      clinicalPoints = 0;
      clinicalAssessed = true;
      clinicalLabel = 'Other symptoms (isolated sensory/visual) (0 pt)';
    } else {
      clinicalPoints = undefined;
      clinicalAssessed = false;
      clinicalLabel = 'Not assessed';
    }
  } else {
    // Automatic deduction from HPI, Chief Complaint, Motor Power
    const cc = (patientCase.chiefComplaint.symptom || '').toLowerCase();
    const hpi = (patientCase.history.hpi || '').toLowerCase();
    const assoc = (patientCase.chiefComplaint.associatedSymptoms || '').toLowerCase();
    const allText = `${cc} ${hpi} ${assoc}`;

    const motor = patientCase.neuroExam?.motor;
    const rU = Number(motor?.rightUpperPower ?? 5);
    const lU = Number(motor?.leftUpperPower ?? 5);
    const rL = Number(motor?.rightLowerPower ?? 5);
    const lL = Number(motor?.leftLowerPower ?? 5);

    const hasMotorAsymmetry =
      (rU < 5 && lU === 5) ||
      (lU < 5 && rU === 5) ||
      (rL < 5 && lL === 5) ||
      (lL < 5 && rL === 5) ||
      rU <= 3 ||
      lU <= 3;

    const weaknessKeywords = [
      'weakness',
      'weak',
      'hemiparesis',
      'hemiplegia',
      'drift',
      'paresis',
      'drop',
      'arm drop',
      'facial droop',
      'arm weakness',
      'leg weakness',
      'loss of power',
      'clumsy hand',
      'heavy arm',
      'heavy leg',
    ];
    const speechKeywords = [
      'speech',
      'dysarthria',
      'slurred',
      'aphasia',
      'word finding',
      'inability to speak',
      'mute',
      'expressive',
      'dysphasia',
    ];

    const hasWeakness =
      hasMotorAsymmetry ||
      weaknessKeywords.some((kw) => allText.includes(kw));

    const hasSpeech = speechKeywords.some((kw) => allText.includes(kw));

    if (hasWeakness) {
      clinicalFeatures = 'unilateral_weakness';
      clinicalPoints = 2;
      clinicalAssessed = true;
      clinicalLabel = 'Unilateral weakness detected (+2 pts)';
    } else if (hasSpeech && !hasWeakness) {
      clinicalFeatures = 'speech_without_weakness';
      clinicalPoints = 1;
      clinicalAssessed = true;
      clinicalLabel = 'Speech disturbance without weakness (+1 pt)';
    } else if (allText.trim().length > 15) {
      clinicalFeatures = 'other';
      clinicalPoints = 0;
      clinicalAssessed = true;
      clinicalLabel = 'Other symptoms (isolated sensory/visual) (0 pt)';
    } else {
      clinicalFeatures = 'not_assessed';
      clinicalPoints = undefined;
      clinicalAssessed = false;
      clinicalLabel = 'Not assessed';
    }
  }

  // 4. Duration (D1): >= 60 min -> 2 pts; 10-59 min -> 1 pt; < 10 min -> 0 pt
  let durationCategory: ABCD2DurationCategory = 'not_assessed';
  let durationPoints: number | undefined = undefined;
  let durationAssessed = false;
  let durationLabel = 'Not assessed';

  if (overrides.duration && existing?.durationCategory) {
    durationCategory = existing.durationCategory;
    if (durationCategory === 'ge_60') {
      durationPoints = 2;
      durationAssessed = true;
      durationLabel = '≥ 60 minutes (+2 pts)';
    } else if (durationCategory === '10_59') {
      durationPoints = 1;
      durationAssessed = true;
      durationLabel = '10–59 minutes (+1 pt)';
    } else if (durationCategory === 'lt_10') {
      durationPoints = 0;
      durationAssessed = true;
      durationLabel = '< 10 minutes (0 pt)';
    } else {
      durationPoints = undefined;
      durationAssessed = false;
      durationLabel = 'Not assessed';
    }
  } else {
    // Auto-detect from onsetDuration or hpi
    const durStr = `${patientCase.chiefComplaint.onsetDuration || ''} ${patientCase.history.hpi || ''}`.toLowerCase();

    // Check for >= 60 minutes or hours
    const matchHours = durStr.match(/(\d+(\.\d+)?)\s*(hour|hours|hr|hrs)/);
    const matchMins = durStr.match(/(\d+)\s*(min|mins|minute|minutes)/);

    let parsedMinutes: number | null = null;
    if (matchHours) {
      parsedMinutes = parseFloat(matchHours[1]) * 60;
    } else if (matchMins) {
      parsedMinutes = parseInt(matchMins[1], 10);
    }

    if (parsedMinutes !== null && !isNaN(parsedMinutes)) {
      durationAssessed = true;
      if (parsedMinutes >= 60) {
        durationCategory = 'ge_60';
        durationPoints = 2;
        durationLabel = `${parsedMinutes} min (≥ 60 min) (+2 pts)`;
      } else if (parsedMinutes >= 10) {
        durationCategory = '10_59';
        durationPoints = 1;
        durationLabel = `${parsedMinutes} min (10–59 min) (+1 pt)`;
      } else {
        durationCategory = 'lt_10';
        durationPoints = 0;
        durationLabel = `${parsedMinutes} min (< 10 min) (0 pt)`;
      }
    } else if (durStr.includes('>= 60') || durStr.includes('several hours') || durStr.includes('2 hours')) {
      durationCategory = 'ge_60';
      durationPoints = 2;
      durationAssessed = true;
      durationLabel = '≥ 60 minutes (+2 pts)';
    } else if (durStr.includes('transient') && (durStr.includes('second') || durStr.includes('brief') || durStr.includes('instant'))) {
      durationCategory = 'lt_10';
      durationPoints = 0;
      durationAssessed = true;
      durationLabel = '< 10 minutes (0 pt)';
    } else {
      durationCategory = 'not_assessed';
      durationPoints = undefined;
      durationAssessed = false;
      durationLabel = 'Not assessed';
    }
  }

  // 5. Diabetes (D2): Present -> 1 pt, Absent -> 0 pt
  let diabetesStatus: ABCD2DiabetesStatus = 'not_assessed';
  let diabetesPoints: number | undefined = undefined;
  let diabetesAssessed = false;
  let diabetesLabel = 'Not assessed';

  if (overrides.diabetes && existing?.diabetesStatus) {
    diabetesStatus = existing.diabetesStatus;
    if (diabetesStatus === 'yes') {
      diabetesPoints = 1;
      diabetesAssessed = true;
      diabetesLabel = 'Diabetes present (+1 pt)';
    } else if (diabetesStatus === 'no') {
      diabetesPoints = 0;
      diabetesAssessed = true;
      diabetesLabel = 'No diabetes (0 pt)';
    } else {
      diabetesPoints = undefined;
      diabetesAssessed = false;
      diabetesLabel = 'Not assessed';
    }
  } else {
    const medHistory = `${patientCase.history.pastMedical || ''} ${patientCase.history.medications || ''}`.toLowerCase();
    const rf = patientCase.history.riskFactors;

    const dmKeywords = [
      'diabetes',
      'diabetic',
      'dm',
      't2dm',
      't1dm',
      'iddm',
      'niddm',
      'metformin',
      'insulin',
      'glipizide',
      'jardiance',
      'empagliflozin',
      'ozempic',
      'semaglutide',
      'sitagliptin',
      'januvia',
    ];

    if (rf?.diabetes === true || dmKeywords.some((kw) => medHistory.includes(kw))) {
      diabetesStatus = 'yes';
      diabetesPoints = 1;
      diabetesAssessed = true;
      diabetesLabel = 'Diabetes mellitus documented (+1 pt)';
    } else if (
      rf?.diabetes === false ||
      medHistory.includes('no diabetes') ||
      medHistory.includes('non-diabetic') ||
      medHistory.includes('nil past medical')
    ) {
      diabetesStatus = 'no';
      diabetesPoints = 0;
      diabetesAssessed = true;
      diabetesLabel = 'No diabetes documented (0 pt)';
    } else if (patientCase.history.pastMedical?.trim()) {
      // Past medical is documented but does not mention diabetes
      diabetesStatus = 'no';
      diabetesPoints = 0;
      diabetesAssessed = true;
      diabetesLabel = 'No diabetes documented in history (0 pt)';
    } else {
      diabetesStatus = 'not_assessed';
      diabetesPoints = undefined;
      diabetesAssessed = false;
      diabetesLabel = 'Not assessed';
    }
  }

  // Count incomplete items
  const componentsAssessed = [ageAssessed, bpAssessed, clinicalAssessed, durationAssessed, diabetesAssessed];
  const incompleteCount = componentsAssessed.filter((a) => !a).length;
  const isComplete = incompleteCount === 0;

  // Sum points available
  const pointsList = [agePoints, bpPoints, clinicalPoints, durationPoints, diabetesPoints];
  const calculatedTotal = pointsList.reduce((acc: number, pt) => acc + (pt ?? 0), 0);

  // Risk stratification
  let riskCategory = 'Incomplete assessment';
  if (isComplete) {
    if (calculatedTotal <= 3) {
      riskCategory = 'Low Risk (1.0% 2-day stroke risk)';
    } else if (calculatedTotal <= 5) {
      riskCategory = 'Moderate Risk (4.1% 2-day stroke risk)';
    } else {
      riskCategory = 'High Risk (8.1% 2-day stroke risk)';
    }
  } else {
    riskCategory = `Partial assessment (${incompleteCount} component${incompleteCount > 1 ? 's' : ''} not assessed)`;
  }

  const scoreText = isComplete
    ? `ABCD2: ${calculatedTotal}/7`
    : `ABCD2: ${calculatedTotal}/7 (Partial — ${incompleteCount} not assessed)`;

  const summaryExplanation = [
    `Age: ${ageLabel}`,
    `Blood Pressure: ${bpLabel}`,
    `Clinical Features: ${clinicalLabel}`,
    `Duration of Symptoms: ${durationLabel}`,
    `Diabetes: ${diabetesLabel}`,
  ];

  return {
    agePoints,
    ageAssessed,
    bpPoints,
    bpAssessed,
    clinicalFeatures,
    clinicalPoints,
    clinicalAssessed,
    durationCategory,
    durationPoints,
    durationAssessed,
    diabetesStatus,
    diabetesPoints,
    diabetesAssessed,
    totalScore: calculatedTotal,
    maxScore: 7,
    incompleteCount,
    riskCategory,
    isAutoCalculated: true,
    manualOverrides: overrides,
    ageLabel,
    bpLabel,
    clinicalLabel,
    durationLabel,
    diabetesLabel,
    isComplete,
    scoreText,
    summaryExplanation,
    notes: existing?.notes,
  };
}
