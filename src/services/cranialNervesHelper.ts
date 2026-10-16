import { CranialNervesDetailed } from '../types/medical';

export interface SimplifiedCNValues {
  cn2_pupils: string;
  cn3_4_6_eye_movements: string;
  cn7_facial_symmetry: string;
  cn9_10_12_speech_bulbar: string;
  other_cranial_nerves: string;
}

/**
 * Resolves the 5 simplified cranial nerves points from either new fields
 * or legacy detailed fields, ensuring existing patient data is safely preserved.
 */
export function getSimplifiedCranialNerves(cranial?: CranialNervesDetailed): SimplifiedCNValues {
  if (!cranial) {
    return {
      cn2_pupils: '',
      cn3_4_6_eye_movements: '',
      cn7_facial_symmetry: '',
      cn9_10_12_speech_bulbar: '',
      other_cranial_nerves: '',
    };
  }

  // 1. CN II — Pupils
  const pupilsVal =
    cranial.cn2_pupils ??
    cranial.pupils ??
    cranial.cn2_optic ??
    '';

  // 2. CN III, IV, VI — Eye Movements
  const eomVal =
    cranial.cn3_4_6_eye_movements ??
    cranial.eom ??
    cranial.cn3_4_6_extraocular ??
    '';

  // 3. CN VII — Facial Symmetry
  const facialVal =
    cranial.cn7_facial_symmetry ??
    cranial.facial ??
    cranial.cn7_facial ??
    '';

  // 4. CN IX, X, XII — Speech and Bulbar Function
  let speechBulbarVal =
    cranial.cn9_10_12_speech_bulbar ??
    cranial.palateGag ??
    '';
  if (!speechBulbarVal) {
    const parts = [
      cranial.cn9_10_glossopharyngeal_vagus ? `CN IX/X: ${cranial.cn9_10_glossopharyngeal_vagus}` : null,
      cranial.cn12_hypoglossal ? `CN XII: ${cranial.cn12_hypoglossal}` : null,
    ].filter(Boolean);
    if (parts.length > 0) {
      speechBulbarVal = parts.join('; ');
    }
  }

  // 5. Other Cranial Nerves
  let otherVal = cranial.other_cranial_nerves ?? '';
  if (!otherVal) {
    const legacyOthers = [
      cranial.cn1_olfactory && cranial.cn1_olfactory !== 'Not assessed' ? `CN I: ${cranial.cn1_olfactory}` : null,
      cranial.cn5_trigeminal ? `CN V: ${cranial.cn5_trigeminal}` : null,
      cranial.cn8_vestibulocochlear ? `CN VIII: ${cranial.cn8_vestibulocochlear}` : null,
      cranial.cn11_accessory ? `CN XI: ${cranial.cn11_accessory}` : null,
      cranial.overallCranialNotes ? `Notes: ${cranial.overallCranialNotes}` : null,
    ].filter(Boolean);
    if (legacyOthers.length > 0) {
      otherVal = legacyOthers.join(' | ');
    }
  }

  return {
    cn2_pupils: pupilsVal,
    cn3_4_6_eye_movements: eomVal,
    cn7_facial_symmetry: facialVal,
    cn9_10_12_speech_bulbar: speechBulbarVal,
    other_cranial_nerves: otherVal,
  };
}

export const CRANIAL_NERVE_LABELS = {
  cn2_pupils: '1. CN II — Pupils',
  cn3_4_6_eye_movements: '2. CN III, IV, VI — Eye Movements',
  cn7_facial_symmetry: '3. CN VII — Facial Symmetry',
  cn9_10_12_speech_bulbar: '4. CN IX, X, XII — Speech and Bulbar Function',
  other_cranial_nerves: '5. Other Cranial Nerves',
} as const;

export const CRANIAL_NERVE_DESCRIPTIONS = {
  cn2_pupils: 'Document pupil size, symmetry, and light reaction when assessed.',
  cn3_4_6_eye_movements: 'Document extraocular movements, gaze limitation, and diplopia when relevant.',
  cn7_facial_symmetry: 'Document facial symmetry, forehead sparing, and smile/eye closure findings.',
  cn9_10_12_speech_bulbar: 'Document dysarthria, dysphonia, palate movement, and tongue protrusion.',
  other_cranial_nerves: 'Document other findings when clinically indicated, such as hearing changes, jaw jerk, or corneal reflex.',
} as const;
