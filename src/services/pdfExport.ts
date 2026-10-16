import jsPDF from 'jspdf';
import { PatientCase, MedicalImage } from '../types/medical';
import { generateMotorDiagramCanvasURL } from '../components/MotorBodyDiagram';

// Helper to convert any image (JPEG, PNG, WEBP, or SVG) to an uncompressed/high-quality Canvas Data URL
// Preserves original aspect ratio and high resolution without distortion or aggressive compression
async function prepareImageForPDF(
  dataUrl: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || 800;
        const origH = img.naturalHeight || img.height || 800;

        // Maintain diagnostic clarity: allow up to 2000px dimension
        const maxDim = 2000;
        let targetW = origW;
        let targetH = origH;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((origH * maxDim) / origW);
            targetW = maxDim;
          } else {
            targetW = Math.round((origW * maxDim) / origH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ dataUrl, width: origW, height: origH });
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
        resolve({ dataUrl: jpegUrl, width: origW, height: origH });
      } catch (err) {
        console.warn('Canvas error in prepareImageForPDF:', err);
        resolve({ dataUrl, width: 600, height: 600 });
      }
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function exportCaseToPDF(
  patientCase: PatientCase,
  images: MedicalImage[] = []
): Promise<void> {
  // Pre-process only this patient's attached images
  const caseImages = images.filter((img) => img.caseId === patientCase.id);
  const preparedImages: Array<{
    meta: MedicalImage;
    data: { dataUrl: string; width: number; height: number };
  }> = [];

  for (const img of caseImages) {
    if (img.dataUrl) {
      const prep = await prepareImageForPDF(img.dataUrl);
      if (prep) {
        preparedImages.push({ meta: img, data: prep });
      }
    }
  }

  // Pre-render the Anatomical Motor Body Diagram as PNG for embedding
  const motor = patientCase.neuroExam?.motor;
  const motorDiagramDataUrl = generateMotorDiagramCanvasURL(
    motor?.rightUpperPower ?? 5,
    motor?.leftUpperPower ?? 5,
    motor?.rightLowerPower ?? 5,
    motor?.leftLowerPower ?? 5
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Running header and footer
  const drawPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`NeuroER Consultation Record — Patient ID: ${patientCase.id}`, margin, margin - 12);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, margin - 12, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(margin, margin - 6, pageWidth - margin, margin - 6);
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 30) {
      doc.addPage();
      y = margin + 20;
      drawPageHeader();
    }
  };

  // ---------------- 1. PATIENT IDENTIFICATION (DARK BLUE #0f2b48) ----------------
  doc.setFillColor(15, 43, 72); // dark blue
  doc.roundedRect(margin, y, contentWidth, 64, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18); // 18-22 pt for section headings
  doc.setTextColor(255, 255, 255);
  doc.text('EMERGENCY NEUROLOGY CONSULTATION NOTE', margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11); // comfortable 11-13 pt clinical text
  doc.setTextColor(203, 213, 225);
  const arrTime = patientCase.identification.arrivalTime
    ? new Date(patientCase.identification.arrivalTime).toLocaleString()
    : 'Not documented';
  doc.text(`Case ID: ${patientCase.id}   |   Arrival: ${arrTime}`, margin + 16, y + 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(56, 189, 248); // sky-400
  const statusStr = (patientCase.identification.status || 'Active').toUpperCase().replace('_', ' ');
  doc.text(`STATUS: ${statusStr}`, pageWidth - margin - 16, y + 36, { align: 'right' });

  y += 76;

  // Demographics Box
  ensureSpace(60);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'F');
  doc.setDrawColor(15, 43, 72);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y, contentWidth, 50, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);

  const init = patientCase.identification.initials || 'Unidentified';
  const age = patientCase.identification.age || '—';
  const sex = patientCase.identification.sex || '—';
  const triage = (patientCase.identification.triage || 'Standard').toUpperCase();
  const bed = patientCase.identification.bedLocation || 'ER Bay';

  doc.text(`Patient: ${init}`, margin + 12, y + 18);
  doc.text(`Age/Sex: ${age} yo / ${sex}`, margin + 140, y + 18);
  doc.text(`Triage: ${triage}`, margin + 280, y + 18);
  doc.text(`Bed: ${bed}`, margin + 400, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  const lkwText = patientCase.identification.lastKnownWell
    ? new Date(patientCase.identification.lastKnownWell).toLocaleString()
    : 'Unknown / Not documented';
  doc.text(`Last Known Well (LKW): ${lkwText}`, margin + 12, y + 36);

  const allergies = patientCase.history?.allergies || 'No Known Drug Allergies (NKDA)';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red
  doc.text(`Allergies: ${allergies}`, margin + 280, y + 36);

  y += 62;

  // Section Banner Function with Assigned Colors
  const printSectionBanner = (title: string, rgb: [number, number, number]) => {
    ensureSpace(42);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 12, y + 18);
    y += 34;
  };

  // Sub-header
  const printSubHeader = (title: string, rgb: [number, number, number]) => {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(title, margin, y);
    y += 16;
  };

  // Clinical text field with comfortable 11-12 pt font and generous line height
  const printField = (label: string, text: string | undefined | null) => {
    const content = text && text.trim() ? text.trim() : 'None documented';
    ensureSpace(32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin, y);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11); // Large comfortable 11-12 pt clinical text
    doc.setTextColor(15, 23, 42);

    const splitText = doc.splitTextToSize(content, contentWidth);
    for (let i = 0; i < splitText.length; i++) {
      ensureSpace(16);
      doc.text(splitText[i], margin, y);
      y += 16;
    }
    y += 6;
  };

  // ================= 2. HISTORY (TEAL #0f766e: [15, 118, 110]) =================
  printSectionBanner('1. CHIEF COMPLAINT & HISTORY', [15, 118, 110]);
  printField('Chief Presenting Complaint:', patientCase.chiefComplaint?.symptom);

  const onsetStr = `Onset Duration: ${patientCase.chiefComplaint?.onsetDuration || 'Acute'}  |  Mode of Onset: ${patientCase.chiefComplaint?.mode || 'Sudden'}  |  Associated Symptoms: ${patientCase.chiefComplaint?.associatedSymptoms || 'None'}`;
  printField('Onset & Characteristics:', onsetStr);

  printField('History of Present Illness (HPI):', patientCase.history?.hpi);
  printField('Past Medical History:', patientCase.history?.pastMedical);

  const pastNeuro = patientCase.history?.pastNeurological;
  const pastNeuroStr = pastNeuro?.notes || (pastNeuro?.stroke ? 'Prior Stroke documented' : 'None reported');
  printField('Previous Neurological Events (Stroke, TIA, Seizures):', pastNeuroStr);

  printField('Surgical History:', patientCase.history?.surgical || 'No major surgeries documented');
  printField('Current Medications & Dosing:', patientCase.history?.medications);
  printField('Social History & Risk Factors:', patientCase.history?.socialHistory || 'Non-smoker');

  // ================= 3. GENERAL EXAMINATION & GCS (PURPLE #6b21a8: [107, 33, 168]) =================
  printSectionBanner('2. GENERAL EXAMINATION & GLASGOW COMA SCALE (GCS)', [107, 33, 168]);

  // Vitals
  ensureSpace(32);
  const v = patientCase.vitals;
  const vitalsText = `BP: ${v.bpSys || '—'}/${v.bpDia || '—'} mmHg   |   HR: ${v.hr || '—'} bpm   |   SpO2: ${v.spo2 || '—'}%   |   Temp: ${v.temp || '—'}°C   |   CBG: ${v.cbg || '—'} mg/dL   |   RR: ${v.rr || '16'} /min`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Vital Signs & Capillary Blood Glucose:', margin, y);
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(vitalsText, margin, y);
  y += 22;

  // GCS
  const gcs = patientCase.neuroExam?.gcs;
  const gcsEye = gcs?.eye !== undefined ? `E${gcs.eye}` : 'E4';
  const gcsVerbal = gcs?.verbal !== undefined ? `V${gcs.verbal}` : 'V5';
  const gcsMotor = gcs?.motor !== undefined ? `M${gcs.motor}` : 'M6';
  const gcsScoreStr = gcs?.totalText || `${gcsEye} ${gcsVerbal} ${gcsMotor} = 15/15`;
  printField('Glasgow Coma Scale Breakdown & Total:', gcsScoreStr);
  printField('GCS Examination Notes / Untestable Reasons:', gcs?.notes || 'Patient awake, spontaneous eye opening, oriented.');

  // ================= 4. MOTOR EXAMINATION (RED #b91c1c: [185, 28, 28]) =================
  printSectionBanner('3. MOTOR EXAMINATION & BODY DIAGRAM', [185, 28, 28]);

  // Embed the Anatomical Motor Body Diagram directly in the PDF
  ensureSpace(230);
  try {
    doc.addImage(motorDiagramDataUrl, 'PNG', margin, y, contentWidth, 210);
    y += 220;
  } catch (err) {
    console.warn('Failed to embed motor diagram image in PDF:', err);
  }

  // Four limb power summary text
  const m = patientCase.neuroExam?.motor;
  const powerSummary = `Right Upper Limb (Arm): ${m?.rightUpperPower ?? 5}/5 MRC   |   Left Upper Limb (Arm): ${m?.leftUpperPower ?? 5}/5 MRC\nRight Lower Limb (Leg): ${m?.rightLowerPower ?? 5}/5 MRC   |   Left Lower Limb (Leg): ${m?.leftLowerPower ?? 5}/5 MRC`;
  printField('MRC Muscle Power Breakdown:', powerSummary);

  const motorDetails = [
    m?.toneNotes ? `Muscle Tone: ${m.toneNotes}` : null,
    m?.driftNotes ? `Pronator Drift: ${m.driftNotes}` : null,
    m?.movementsNotes ? `Involuntary Movements: ${m.movementsNotes}` : null,
    m?.generalMotorNotes ? `General Motor Notes: ${m.generalMotorNotes}` : null,
  ].filter(Boolean).join('\n');
  printField('Tone, Pronator Drift & Involuntary Movements:', motorDetails || 'Normal muscle tone throughout. No pronator drift, tremor, or fasciculations.');

  // ================= 5. SENSORY EXAMINATION (ORANGE #c2410c: [194, 65, 12]) =================
  printSectionBanner('4. SENSORY EXAMINATION', [194, 65, 12]);
  const s = patientCase.neuroExam?.sensory;
  const sensoryDetails = [
    s?.lightTouch ? `Light Touch: ${s.lightTouch}` : null,
    s?.pain ? `Pain / Pinprick: ${s.pain}` : null,
    s?.temperature ? `Temperature: ${s.temperature}` : null,
    s?.vibration ? `Vibration: ${s.vibration}` : null,
    s?.jointPositionSense ? `Joint Position Sense (Proprioception): ${s.jointPositionSense}` : null,
    s?.corticalSensory ? `Cortical Sensory: ${s.corticalSensory}` : null,
    s?.overallSensoryNotes ? `Summary: ${s.overallSensoryNotes}` : null,
  ].filter(Boolean).join('\n');
  printField('Sensory Modalities Assessment:', sensoryDetails || 'Sensation intact symmetrically to light touch and pinprick.');

  // ================= 6. CRANIAL NERVES (BLUE #1d4ed8: [29, 78, 216]) =================
  printSectionBanner('5. DETAILED CRANIAL NERVES EXAMINATION (CN I – XII)', [29, 78, 216]);
  const cn = patientCase.neuroExam?.cranialNerves;
  const cranialDetails = [
    cn?.cn1_olfactory ? `CN I (Olfactory): ${cn.cn1_olfactory}` : null,
    cn?.cn2_optic ? `CN II (Optic, Fields, Fundus, Pupils): ${cn.cn2_optic}` : null,
    cn?.cn3_4_6_extraocular ? `CN III, IV, VI (Extraocular Movements, Ptosis, Diplopia): ${cn.cn3_4_6_extraocular}` : null,
    cn?.cn5_trigeminal ? `CN V (Trigeminal, Sensation, Corneal Reflex): ${cn.cn5_trigeminal}` : null,
    cn?.cn7_facial ? `CN VII (Facial Symmetry & Expression): ${cn.cn7_facial}` : null,
    cn?.cn8_vestibulocochlear ? `CN VIII (Hearing & Vestibular): ${cn.cn8_vestibulocochlear}` : null,
    cn?.cn9_10_glossopharyngeal_vagus ? `CN IX, X (Palatal Elevation & Gag Reflex): ${cn.cn9_10_glossopharyngeal_vagus}` : null,
    cn?.cn11_accessory ? `CN XI (Spinal Accessory, SCM, Trapezius): ${cn.cn11_accessory}` : null,
    cn?.cn12_hypoglossal ? `CN XII (Hypoglossal, Tongue): ${cn.cn12_hypoglossal}` : null,
    cn?.overallCranialNotes ? `Overall Cranial Findings: ${cn.overallCranialNotes}` : null,
  ].filter(Boolean).join('\n');
  printField('Cranial Nerves Findings:', cranialDetails || 'Pupils equal, round, and reactive to light. Extraocular movements full without nystagmus. Facial symmetry intact.');

  // ================= 7. BULBAR & SPHINCTER (VIOLET #7c3aed: [124, 58, 237]) =================
  printSectionBanner('6. BULBAR & SPHINCTER EXAMINATION', [124, 58, 237]);
  const b = patientCase.neuroExam?.bulbar;
  const bulbarDetails = [
    b?.speechArticulation ? `Speech Articulation / Dysarthria: ${b.speechArticulation}` : null,
    b?.dysphonia ? `Phonation / Voice: ${b.dysphonia}` : null,
    b?.swallowing ? `Swallowing Safety / Aspiration Risk: ${b.swallowing}` : null,
    b?.palatalMovement ? `Palatal Movement: ${b.palatalMovement}` : null,
    b?.gagReflex ? `Gag Reflex: ${b.gagReflex}` : null,
    b?.tongueMovementStrength ? `Tongue Strength: ${b.tongueMovementStrength}` : null,
    b?.bulbarNotes ? `Bulbar Notes: ${b.bulbarNotes}` : null,
  ].filter(Boolean).join('\n');
  printField('Bulbar Examination Findings:', bulbarDetails || 'Speech clear without dysarthria. Swallowing safe. Bilateral palatal elevation symmetric.');

  const sph = patientCase.neuroExam?.sphincter;
  const sphDetails = [
    sph?.urinaryControl ? `Urinary Continence: ${sph.urinaryControl}` : null,
    sph?.bowelControl ? `Bowel Continence: ${sph.bowelControl}` : null,
    sph?.sacralSensoryTone ? `Anal Sphincter Tone & Sacral Sensation: ${sph.sacralSensoryTone}` : null,
    sph?.sphincterNotes ? `Sphincter Notes: ${sph.sphincterNotes}` : null,
  ].filter(Boolean).join('\n');
  printField('Sphincter Function Findings:', sphDetails || 'Continent of urine and stool. No retention or catheter in situ.');

  // ================= 8. PLANTAR REFLEX (BROWN #854d0e: [133, 77, 14]) =================
  printSectionBanner('7. PLANTAR REFLEX & DEEP TENDON REFLEXES', [133, 77, 14]);
  const p = patientCase.neuroExam?.plantars;
  const plantarText = `Right Plantar Response: ${p?.right || 'Flexor'}   |   Left Plantar Response: ${p?.left || 'Flexor'}`;
  printField('Plantar Responses:', plantarText);
  printField('Plantar & Reflex Notes:', p?.notes || 'Deep tendon reflexes 2+ symmetrically. No ankle clonus or Hoffman sign.');

  // ================= 9. NIHSS ASSESSMENTS (DARK RED #881337: [136, 19, 55]) =================
  printSectionBanner('8. NIH STROKE SCALE (NIHSS) ASSESSMENTS', [136, 19, 55]);
  const nihssRecords = patientCase.nihssAssessments || [];
  if (nihssRecords.length > 0) {
    const latest = nihssRecords[0];
    printSubHeader(`Latest Assessment: ${latest.label || 'Baseline'} (${new Date(latest.timestamp).toLocaleString()})`, [136, 19, 55]);
    printField('Total Score & Severity:', `NIHSS TOTAL: ${latest.totalScore} / 42   (${latest.severity})`);

    // Item-by-item breakdown table
    const it = latest.items;
    const itemsTable = [
      `1a. Level of Consciousness: ${it.loc1a ?? '—'}/3`,
      `1b. LOC Questions: ${it.locQuestions1b ?? '—'}/2`,
      `1c. LOC Commands: ${it.locCommands1c ?? '—'}/2`,
      `2. Best Gaze: ${it.bestGaze2 ?? '—'}/2`,
      `3. Visual Fields: ${it.visualFields3 ?? '—'}/3`,
      `4. Facial Palsy: ${it.facialPalsy4 ?? '—'}/3`,
      `5a. Left Arm Motor: ${it.motorLeftArm5a ?? '—'}/4`,
      `5b. Right Arm Motor: ${it.motorRightArm5b ?? '—'}/4`,
      `6a. Left Leg Motor: ${it.motorLeftLeg6a ?? '—'}/4`,
      `6b. Right Leg Motor: ${it.motorRightLeg6b ?? '—'}/4`,
      `7. Limb Ataxia: ${it.limbAtaxia7 ?? '—'}/2`,
      `8. Sensory: ${it.sensory8 ?? '—'}/2`,
      `9. Best Language: ${it.bestLanguage9 ?? '—'}/3`,
      `10. Dysarthria: ${it.dysarthria10 ?? '—'}/2`,
      `11. Extinction & Inattention: ${it.extinction11 ?? '—'}/2`,
    ].join('   |   ');
    printField('Item-by-Item Breakdown:', itemsTable);
    if (latest.notes) {
      printField('Assessment Notes:', latest.notes);
    }

    // Previous NIHSS assessments table
    if (nihssRecords.length > 1) {
      printSubHeader('Previous Longitudinal NIHSS Assessments:', [136, 19, 55]);
      const prevRows = nihssRecords.slice(1).map(
        (rec) => `• ${new Date(rec.timestamp).toLocaleString()} [${rec.label}]: Score ${rec.totalScore}/42 (${rec.severity}) ${rec.notes ? `— ${rec.notes}` : ''}`
      ).join('\n');
      printField('Assessment History:', prevRows);
    }
  } else if (patientCase.neuroExam?.nihss) {
    printField('NIHSS Total Score:', `Score: ${patientCase.neuroExam.nihss.totalScore}/42 (${patientCase.neuroExam.nihss.severity || 'Assessed'})`);
  } else {
    printField('NIHSS Assessment:', 'Not formally scored during this consultation.');
  }

  // ================= 10. INVESTIGATIONS (GREEN #15803d: [21, 128, 61]) =================
  printSectionBanner('9. LABORATORY INVESTIGATIONS & DIAGNOSTICS', [21, 128, 61]);
  const inv = patientCase.investigations;
  const labsList = [
    inv?.cbc?.hb ? `Hemoglobin: ${inv.cbc.hb}` : null,
    inv?.cbc?.wbc ? `WBC: ${inv.cbc.wbc}` : null,
    inv?.cbc?.platelets ? `Platelets: ${inv.cbc.platelets}` : null,
    inv?.coagulation?.inr ? `INR: ${inv.coagulation.inr}` : null,
    inv?.coagulation?.pt ? `PT: ${inv.coagulation.pt}` : null,
    inv?.coagulation?.aptt ? `aPTT: ${inv.coagulation.aptt}` : null,
    inv?.renal?.cr ? `Creatinine: ${inv.renal.cr}` : null,
    inv?.renal?.bun ? `BUN: ${inv.renal.bun}` : null,
    inv?.electrolytes?.na ? `Sodium (Na): ${inv.electrolytes.na}` : null,
    inv?.electrolytes?.k ? `Potassium (K): ${inv.electrolytes.k}` : null,
    inv?.cardiacMarkers?.troponin ? `Troponin: ${inv.cardiacMarkers.troponin}` : null,
  ].filter(Boolean).join('   |   ');
  printField('Laboratory Blood Test Results:', labsList || 'Standard ER laboratory panels documented in medical record.');

  printField('ECG Rhythm & Diagnostic Findings:', inv?.ecgFindings || 'Normal sinus rhythm without acute ischemic changes.');
  if (inv?.csfAnalysis) {
    printField('CSF Analysis / Lumbar Puncture:', inv.csfAnalysis);
  }

  // ================= 11. ASSESSMENT & PLAN (DARK TEAL #115e59: [17, 94, 89]) =================
  printSectionBanner('10. ASSESSMENT & EMERGENCY PLAN', [17, 94, 89]);
  const plan = patientCase.assessmentPlan;
  printField('Working Diagnosis:', plan?.workingDiagnosis);
  printField('Anatomical Localization & Differentials:', `${plan?.clinicalLocalization ? `Localization: ${plan.clinicalLocalization}\n` : ''}${plan?.differentials ? `Differentials: ${plan.differentials}` : ''}`);
  printField('Emergency Management Plan & Orders:', plan?.managementPlan);
  printField('Patient Disposition / Handoff Destination:', plan?.disposition);

  // ================= 12. PROGRESS NOTES (GRAY #475569: [71, 85, 105]) =================
  if (patientCase.progressNotes && patientCase.progressNotes.length > 0) {
    printSectionBanner(`11. CLINICAL PROGRESS NOTES (${patientCase.progressNotes.length})`, [71, 85, 105]);
    patientCase.progressNotes.forEach((n) => {
      const noteTime = n.timestamp ? new Date(n.timestamp).toLocaleString() : '';
      printField(`[${n.category || 'Note'}] ${noteTime} — ${n.author || 'Neurology Resident'}:`, n.note);
    });
  }

  // ================= 13. NEUROIMAGING STUDIES (INDIGO #4338ca: [67, 56, 202]) =================
  // Placed after written investigations, rendered at MAXIMUM size & clarity (1-2 per page)
  printSectionBanner(`12. NEUROIMAGING STUDIES & RADIOLOGY REPORTS (${preparedImages.length} STUDIES)`, [67, 56, 202]);

  if (preparedImages.length === 0) {
    printField('Imaging Studies:', 'No neuroimaging studies attached to this case.');
  } else {
    for (let i = 0; i < preparedImages.length; i++) {
      const item = preparedImages[i];
      const { width: origW, height: origH } = item.data;
      const ratio = origW / origH;

      // We want to maximize image size on the page for optimal clinical diagnostic viewing
      const maxImgW = contentWidth;
      const maxImgH = 360; // large prominent image height
      let renderW = maxImgW;
      let renderH = renderW / ratio;
      if (renderH > maxImgH) {
        renderH = maxImgH;
        renderW = renderH * ratio;
      }

      // Height required: header (20) + image (renderH) + captions/reports (approx 70)
      const totalBlockHeight = renderH + 95;

      // If this large scan does not fit cleanly on the current page, start a fresh page
      ensureSpace(totalBlockHeight);

      // Card bounding container
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, totalBlockHeight, 4, 4, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1);
      doc.roundedRect(margin, y, contentWidth, totalBlockHeight, 4, 4, 'S');

      // Modality & Title Header Band inside Card
      doc.setFillColor(67, 56, 202); // indigo
      doc.roundedRect(margin, y, contentWidth, 22, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      const studyDateFormatted = item.meta.studyDate
        ? new Date(item.meta.studyDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : 'Date recorded';
      doc.text(`Study ${i + 1} of ${preparedImages.length}: ${item.meta.modality.toUpperCase()}`, margin + 10, y + 15);
      doc.text(studyDateFormatted, pageWidth - margin - 10, y + 15, { align: 'right' });

      // Embed high-resolution image centered in the card
      const imgX = margin + (contentWidth - renderW) / 2;
      const imgY = y + 28;

      try {
        doc.addImage(item.data.dataUrl, 'JPEG', imgX, imgY, renderW, renderH);
        doc.setDrawColor(148, 163, 184);
        doc.rect(imgX, imgY, renderW, renderH, 'S');
      } catch (err) {
        console.warn('Failed to embed scan in PDF:', err);
      }

      // Details below image
      let textY = imgY + renderH + 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Title / Slice: ${item.meta.title}`, margin + 10, textY);
      textY += 14;

      if (item.meta.caption) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Caption: ${item.meta.caption}`, margin + 10, textY);
        textY += 14;
      }

      if (item.meta.interpretation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        const reportLines = doc.splitTextToSize(`Report: ${item.meta.interpretation}`, contentWidth - 20);
        doc.text(reportLines[0] || '', margin + 10, textY);
      }

      y += totalBlockHeight + 16;
    }
  }

  // ---------------- FOOTER ON ALL PAGES ----------------
  const totalPages = doc.getNumberOfPages();
  const exportTimestamp = new Date().toLocaleString();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - margin + 14, pageWidth - margin, pageHeight - margin + 14);
    doc.text(
      `NeuroER Electronic Medical Record — Confidential Patient Data — Exported: ${exportTimestamp}`,
      margin,
      pageHeight - margin + 25
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - margin + 25, { align: 'right' });
  }

  const cleanId = patientCase.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`ER_Case_${cleanId}_${dateStr}.pdf`);
}
