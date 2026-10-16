import { PatientCase, MedicalImage } from '../types/medical';
import { generateMotorDiagramCanvasURL } from '../components/MotorBodyDiagram';

// Helper to trigger clean client-side file download
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Helper to load image element asynchronously
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Option A: Complete Case Report as High-Resolution PNG (multi-page)
export async function exportCaseReportToPNG(
  patientCase: PatientCase,
  images: MedicalImage[] = []
): Promise<void> {
  const cleanId = patientCase.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const pageWidth = 1400;
  const pageHeight = 2000;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Render Page 1: Demographics, History, Examination (with Motor Body Diagram)
  const canvas1 = document.createElement('canvas');
  canvas1.width = pageWidth;
  canvas1.height = pageHeight;
  const ctx1 = canvas1.getContext('2d');
  if (!ctx1) throw new Error('Could not get 2D canvas context');

  // Background
  ctx1.fillStyle = '#ffffff';
  ctx1.fillRect(0, 0, pageWidth, pageHeight);

  let y = margin;

  // Header Banner (Dark Blue)
  ctx1.fillStyle = '#0f2b48';
  ctx1.beginPath();
  ctx1.roundRect(margin, y, contentWidth, 70, 8);
  ctx1.fill();

  ctx1.fillStyle = '#ffffff';
  ctx1.font = 'bold 24px Helvetica, Arial, sans-serif';
  ctx1.textAlign = 'left';
  ctx1.fillText('EMERGENCY DEPARTMENT NEUROLOGY CONSULTATION NOTE', margin + 20, y + 34);

  ctx1.fillStyle = '#94a3b8';
  ctx1.font = '14px Helvetica, Arial, sans-serif';
  const arrTime = patientCase.identification.arrivalTime
    ? new Date(patientCase.identification.arrivalTime).toLocaleString()
    : 'Not documented';
  ctx1.fillText(`Case ID: ${patientCase.id}   |   Arrival: ${arrTime}`, margin + 20, y + 56);

  ctx1.fillStyle = '#38bdf8';
  ctx1.font = 'bold 16px Helvetica, Arial, sans-serif';
  ctx1.textAlign = 'right';
  ctx1.fillText(
    `STATUS: ${(patientCase.identification.status || 'Active').toUpperCase().replace('_', ' ')}`,
    pageWidth - margin - 20,
    y + 44
  );

  y += 85;

  // Demographics Box
  ctx1.fillStyle = '#f8fafc';
  ctx1.strokeStyle = '#cbd5e1';
  ctx1.lineWidth = 1.5;
  ctx1.beginPath();
  ctx1.roundRect(margin, y, contentWidth, 54, 6);
  ctx1.fill();
  ctx1.stroke();

  ctx1.fillStyle = '#0f172a';
  ctx1.font = 'bold 13px Helvetica, Arial, sans-serif';
  ctx1.textAlign = 'left';
  const init = patientCase.identification.initials || 'Unidentified';
  const age = patientCase.identification.age || '—';
  const sex = patientCase.identification.sex || '—';
  const triage = (patientCase.identification.triage || 'Standard').toUpperCase();
  const bed = patientCase.identification.bedLocation || 'ER Bay';

  ctx1.fillText(`Patient: ${init}  |  Age/Sex: ${age} yo / ${sex}  |  Triage: ${triage}  |  Bed: ${bed}`, margin + 16, y + 22);

  const lkw = patientCase.identification.lastKnownWell
    ? new Date(patientCase.identification.lastKnownWell).toLocaleString()
    : 'Unknown';
  ctx1.font = 'normal 12px Helvetica, Arial, sans-serif';
  ctx1.fillStyle = '#64748b';
  ctx1.fillText(`Last Known Well (LKW): ${lkw}`, margin + 16, y + 42);

  const allergies = patientCase.history?.allergies || 'No Known Drug Allergies (NKDA)';
  ctx1.fillStyle = '#b91c1c';
  ctx1.font = 'bold 12px Helvetica, Arial, sans-serif';
  ctx1.fillText(`Allergies: ${allergies}`, margin + 650, y + 42);

  y += 70;

  // Section 1: History (Teal #0f766e)
  const drawSectionHeader = (ctx: CanvasRenderingContext2D, title: string, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(margin, y, contentWidth, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, margin + 14, y + 19);
    y += 38;
  };

  const drawTextField = (ctx: CanvasRenderingContext2D, label: string, val: string | undefined | null) => {
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, margin, y);
    y += 16;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'normal 13px Helvetica, Arial, sans-serif';
    const text = (val && val.trim()) ? val.trim() : 'None documented';

    // Simple word wrapping
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > contentWidth && n > 0) {
        ctx.fillText(line, margin, y);
        line = words[n] + ' ';
        y += 18;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, margin, y);
    y += 24;
  };

  // History Section
  drawSectionHeader(ctx1, '1. HISTORY', '#0f766e');
  drawTextField(ctx1, 'Chief Complaint & Onset:', patientCase.chiefComplaint?.symptom);
  drawTextField(ctx1, 'History of Present Illness (HPI):', patientCase.history?.hpi);
  drawTextField(ctx1, 'Past Medical History & Neurological History:', patientCase.history?.pastMedical);
  drawTextField(ctx1, 'Current Medications & Dosing:', patientCase.history?.medications);

  // Section 2: Clinical Examination (Purple #6b21a8)
  drawSectionHeader(ctx1, '2. EXAMINATION & VITAL SIGNS', '#6b21a8');

  // Vitals Bar
  const v = patientCase.vitals;
  const vitalsText = `BP: ${v.bpSys || '—'}/${v.bpDia || '—'} mmHg  |  HR: ${v.hr || '—'} bpm  |  SpO2: ${v.spo2 || '—'}%  |  Temp: ${v.temp || '—'}°C  |  CBG: ${v.cbg || '—'} mg/dL`;
  drawTextField(ctx1, 'Vital Signs & Glucose:', vitalsText);

  // GCS
  const gcs = patientCase.neuroExam?.gcs;
  const gcsText = gcs?.totalText || 'E4 V5 M6 = 15/15';
  drawTextField(ctx1, 'Glasgow Coma Scale (GCS):', `${gcsText}  —  ${gcs?.notes || 'Spontaneous, oriented'}`);

  // Motor Body Diagram Embedding
  const m = patientCase.neuroExam?.motor;
  const diagramUrl = generateMotorDiagramCanvasURL(
    m?.rightUpperPower ?? 5,
    m?.leftUpperPower ?? 5,
    m?.rightLowerPower ?? 5,
    m?.leftLowerPower ?? 5
  );

  try {
    const diagImg = await loadImage(diagramUrl);
    ctx1.drawImage(diagImg, margin, y, contentWidth, 240);
    y += 255;
  } catch (err) {
    console.warn('Could not draw diagram to PNG canvas:', err);
  }

  // Motor Examination Text Field
  drawTextField(
    ctx1,
    'Motor Tone, Pronator Drift & Involuntary Movements:',
    m?.generalMotorNotes || m?.toneNotes || 'Normal tone, no pronator drift or tremor.'
  );

  // Sensory, Cranial, Bulbar, Plantars, General
  const exam = patientCase.neuroExam;
  drawTextField(ctx1, 'Sensory Examination:', exam?.sensory?.overallSensoryNotes || 'Intact bilaterally.');
  drawTextField(ctx1, 'Cranial Nerves (CN I - XII):', exam?.cranialNerves?.overallCranialNotes || 'Pupils PERRL, EOM full, facial symmetry intact.');
  drawTextField(ctx1, 'Bulbar & Sphincter Function:', `${exam?.bulbar?.bulbarNotes || 'Swallowing safe.'}  |  ${exam?.sphincter?.sphincterNotes || 'Continent.'}`);
  drawTextField(ctx1, 'Plantar Reflex:', `Right: ${exam?.plantars?.right || 'Flexor'}  |  Left: ${exam?.plantars?.left || 'Flexor'}  (${exam?.plantars?.notes || 'Normal'})`);
  drawTextField(ctx1, 'General Medical Examination:', exam?.generalExamNotes || 'No acute distress, chest clear, heart sounds normal.');

  // Page 1 Footer
  ctx1.fillStyle = '#94a3b8';
  ctx1.font = '11px Helvetica, Arial, sans-serif';
  ctx1.textAlign = 'center';
  ctx1.fillText(`NeuroER Electronic Case Record - Patient ID: ${patientCase.id} - Page 1 of 2+`, pageWidth / 2, pageHeight - 20);

  // Download Page 1
  canvas1.toBlob((blob) => {
    if (blob) downloadBlob(blob, `ER_Case_${cleanId}_Page_01.png`);
  }, 'image/png');

  // Render Page 2: Investigations, NIHSS, Assessment & Plan, Progress Notes
  const canvas2 = document.createElement('canvas');
  canvas2.width = pageWidth;
  canvas2.height = pageHeight;
  const ctx2 = canvas2.getContext('2d');
  if (!ctx2) return;

  ctx2.fillStyle = '#ffffff';
  ctx2.fillRect(0, 0, pageWidth, pageHeight);
  y = margin;

  // Page 2 Header Banner
  ctx2.fillStyle = '#0f2b48';
  ctx2.beginPath();
  ctx2.roundRect(margin, y, contentWidth, 50, 6);
  ctx2.fill();

  ctx2.fillStyle = '#ffffff';
  ctx2.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx2.textAlign = 'left';
  ctx2.fillText(`CASE: ${patientCase.id} — INVESTIGATIONS & CLINICAL MANAGEMENT PLAN`, margin + 20, y + 32);
  y += 68;

  // Section 3: Investigations (Green #15803d)
  drawSectionHeader(ctx2, '3. INVESTIGATIONS & LABS', '#15803d');
  const inv = patientCase.investigations;
  const labs = [
    inv?.cbc?.hb ? `Hb: ${inv.cbc.hb}` : null,
    inv?.cbc?.platelets ? `Plt: ${inv.cbc.platelets}` : null,
    inv?.coagulation?.inr ? `INR: ${inv.coagulation.inr}` : null,
    inv?.renal?.cr ? `Cr: ${inv.renal.cr}` : null,
    inv?.electrolytes?.na ? `Na: ${inv.electrolytes.na}` : null,
  ].filter(Boolean).join('   |   ');
  drawTextField(ctx2, 'Laboratory Blood Results:', labs || 'CBC, coagulation, and renal panels pending.');
  drawTextField(ctx2, 'ECG & Diagnostics:', inv?.ecgFindings || 'Normal sinus rhythm.');

  // Section: NIHSS Assessment (Dark Red #881337)
  drawSectionHeader(ctx2, 'OFFICIAL NIH STROKE SCALE (NIHSS) ASSESSMENTS', '#881337');
  const nihssList = patientCase.nihssAssessments || [];
  if (nihssList.length > 0) {
    const latest = nihssList[0];
    drawTextField(
      ctx2,
      `Latest NIHSS Evaluation (${latest.label || 'Baseline'} - ${new Date(latest.timestamp).toLocaleTimeString()}):`,
      `TOTAL SCORE: ${latest.totalScore}/42 (${latest.severity}) — Unscored: ${latest.unscoredCount}. ${latest.notes || ''}`
    );

    // List all previous assessments
    if (nihssList.length > 1) {
      const priorText = nihssList
        .slice(1)
        .map((n) => `• ${new Date(n.timestamp).toLocaleTimeString()} [${n.label}]: Score ${n.totalScore}/42 (${n.severity})`)
        .join('\n');
      drawTextField(ctx2, 'Previous Longitudinal NIHSS Assessments:', priorText);
    }
  } else if (patientCase.neuroExam?.nihss) {
    drawTextField(
      ctx2,
      'NIHSS Score:',
      `Score: ${patientCase.neuroExam.nihss.totalScore}/42 (${patientCase.neuroExam.nihss.severity || 'Assessed'})`
    );
  }

  // Section 5: Assessment & Emergency Plan (Dark Teal #115e59)
  drawSectionHeader(ctx2, '5. ASSESSMENT & EMERGENCY PLAN', '#115e59');
  const plan = patientCase.assessmentPlan;
  drawTextField(ctx2, 'Working Diagnosis & Anatomical Localization:', `${plan?.workingDiagnosis || 'Acute neurological presentation.'} ${plan?.clinicalLocalization ? `(${plan.clinicalLocalization})` : ''}`);
  drawTextField(ctx2, 'Differential Diagnoses:', plan?.differentials || 'Stroke, Seizure, Migraine aura.');
  drawTextField(ctx2, 'Emergency Management Plan & Interventions:', plan?.managementPlan || 'Supportive care, monitoring, diagnostic workup.');
  drawTextField(ctx2, 'Patient Disposition:', plan?.disposition || 'ER observation / admission pending.');

  // Progress Notes
  if (patientCase.progressNotes && patientCase.progressNotes.length > 0) {
    drawSectionHeader(ctx2, 'CLINICAL TIMELINE NOTES', '#475569');
    patientCase.progressNotes.forEach((n) => {
      drawTextField(ctx2, `[${n.category || 'Note'}] ${new Date(n.timestamp).toLocaleTimeString()} - ${n.author}:`, n.note);
    });
  }

  // Page 2 Footer
  ctx2.fillStyle = '#94a3b8';
  ctx2.font = '11px Helvetica, Arial, sans-serif';
  ctx2.textAlign = 'center';
  ctx2.fillText(`NeuroER Electronic Case Record - Patient ID: ${patientCase.id} - Page 2 of 2+`, pageWidth / 2, pageHeight - 20);

  // Download Page 2
  canvas2.toBlob((blob) => {
    if (blob) downloadBlob(blob, `ER_Case_${cleanId}_Page_02.png`);
  }, 'image/png');

  // If there are images, render them as separate Page 3+
  const caseImages = images.filter((img) => img.caseId === patientCase.id);
  if (caseImages.length > 0) {
    // Render 1 large image per page for maximum diagnostic clarity
    for (let idx = 0; idx < caseImages.length; idx++) {
      const imgItem = caseImages[idx];
      const canvasImg = document.createElement('canvas');
      canvasImg.width = pageWidth;
      canvasImg.height = pageHeight;
      const ctxImg = canvasImg.getContext('2d');
      if (!ctxImg) continue;

      ctxImg.fillStyle = '#ffffff';
      ctxImg.fillRect(0, 0, pageWidth, pageHeight);

      let imgY = margin;
      ctxImg.fillStyle = '#4338ca'; // Indigo
      ctxImg.beginPath();
      ctxImg.roundRect(margin, imgY, contentWidth, 54, 6);
      ctxImg.fill();

      ctxImg.fillStyle = '#ffffff';
      ctxImg.font = 'bold 18px Helvetica, Arial, sans-serif';
      ctxImg.textAlign = 'left';
      ctxImg.fillText(
        `NEUROIMAGING STUDY ${idx + 1} OF ${caseImages.length}: ${imgItem.modality.toUpperCase()}`,
        margin + 20,
        imgY + 34
      );

      imgY += 75;

      // Draw large scan preserving aspect ratio
      try {
        const scanEl = await loadImage(imgItem.dataUrl);
        const naturalW = scanEl.naturalWidth || scanEl.width || 800;
        const naturalH = scanEl.naturalHeight || scanEl.height || 800;
        const ratio = naturalW / naturalH;

        const maxScanW = contentWidth;
        const maxScanH = 1200;
        let renderW = maxScanW;
        let renderH = renderW / ratio;
        if (renderH > maxScanH) {
          renderH = maxScanH;
          renderW = renderH * ratio;
        }

        const scanX = margin + (contentWidth - renderW) / 2;
        ctxImg.drawImage(scanEl, scanX, imgY, renderW, renderH);

        // Frame
        ctxImg.strokeStyle = '#cbd5e1';
        ctxImg.lineWidth = 2;
        ctxImg.strokeRect(scanX, imgY, renderW, renderH);

        imgY += renderH + 30;

        // Details below scan
        ctxImg.fillStyle = '#0f172a';
        ctxImg.font = 'bold 16px Helvetica, Arial, sans-serif';
        ctxImg.textAlign = 'left';
        ctxImg.fillText(`Title: ${imgItem.title}`, margin, imgY);
        imgY += 24;

        ctxImg.font = 'normal 14px Helvetica, Arial, sans-serif';
        ctxImg.fillStyle = '#475569';
        const studyTime = imgItem.studyDate ? new Date(imgItem.studyDate).toLocaleString() : 'Date recorded';
        ctxImg.fillText(`Study Date: ${studyTime}  |  Modality: ${imgItem.modality}`, margin, imgY);
        imgY += 24;

        if (imgItem.caption) {
          ctxImg.font = 'italic 13px Helvetica, Arial, sans-serif';
          ctxImg.fillStyle = '#334155';
          ctxImg.fillText(`Caption: ${imgItem.caption}`, margin, imgY);
          imgY += 24;
        }

        if (imgItem.interpretation) {
          ctxImg.font = 'normal 14px Helvetica, Arial, sans-serif';
          ctxImg.fillStyle = '#0f172a';
          ctxImg.fillText(`Report: ${imgItem.interpretation}`, margin, imgY);
        }
      } catch (err) {
        console.warn('Failed to draw scan to PNG:', err);
      }

      // Footer
      ctxImg.fillStyle = '#94a3b8';
      ctxImg.font = '11px Helvetica, Arial, sans-serif';
      ctxImg.textAlign = 'center';
      ctxImg.fillText(`NeuroER Electronic Case Record - Patient ID: ${patientCase.id} - Scan ${idx + 1} of ${caseImages.length}`, pageWidth / 2, pageHeight - 20);

      const pageNumStr = String(idx + 3).padStart(2, '0');
      canvasImg.toBlob((blob) => {
        if (blob) downloadBlob(blob, `ER_Case_${cleanId}_Page_${pageNumStr}.png`);
      }, 'image/png');
    }
  }
}

// Option B: Imaging Gallery Contact Sheet as High-Resolution PNG
export async function exportImagingGalleryToPNG(
  patientCase: PatientCase,
  images: MedicalImage[] = []
): Promise<void> {
  const caseImages = images.filter((img) => img.caseId === patientCase.id);
  if (caseImages.length === 0) {
    alert('No neuroimaging studies attached to this case to export.');
    return;
  }

  const cleanId = patientCase.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sheetWidth = 1800;
  const numCols = 2;
  const margin = 50;
  const gap = 30;
  const colWidth = (sheetWidth - margin * 2 - gap * (numCols - 1)) / numCols;
  const cardHeight = 620;

  const numRows = Math.ceil(caseImages.length / numCols);
  const sheetHeight = margin * 2 + 90 + numRows * (cardHeight + gap);

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#090d16'; // Medical dark background for high scan contrast
  ctx.fillRect(0, 0, sheetWidth, sheetHeight);

  // Header Banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(margin, margin, sheetWidth - margin * 2, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`NEUROIMAGING CONTACT SHEET — CASE: ${patientCase.id} (${caseImages.length} STUDIES)`, margin + 20, margin + 38);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Patient: ${patientCase.identification.initials || 'Pt'} | Age/Sex: ${patientCase.identification.age}yo ${patientCase.identification.sex}`, sheetWidth - margin - 20, margin + 38);

  let curY = margin + 85;

  for (let i = 0; i < caseImages.length; i++) {
    const col = i % numCols;
    const row = Math.floor(i / numCols);
    const cardX = margin + col * (colWidth + gap);
    const cardY = curY + row * (cardHeight + gap);
    const imgItem = caseImages[i];

    // Card border & background
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, colWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Scan viewport area
    const scanAreaH = 430;
    try {
      const scanEl = await loadImage(imgItem.dataUrl);
      const naturalW = scanEl.naturalWidth || scanEl.width || 800;
      const naturalH = scanEl.naturalHeight || scanEl.height || 800;
      const ratio = naturalW / naturalH;

      let rW = colWidth - 24;
      let rH = rW / ratio;
      if (rH > scanAreaH) {
        rH = scanAreaH;
        rW = rH * ratio;
      }

      const scanX = cardX + (colWidth - rW) / 2;
      const scanY = cardY + 12 + (scanAreaH - rH) / 2;
      ctx.drawImage(scanEl, scanX, scanY, rW, rH);
    } catch (err) {
      console.warn('Failed to load scan on contact sheet:', err);
    }

    // Metadata below scan
    let metaY = cardY + scanAreaH + 28;
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Study #${i + 1}: ${imgItem.modality}`, cardX + 16, metaY);
    metaY += 22;

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.fillText(imgItem.title, cardX + 16, metaY);
    metaY += 20;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Helvetica, Arial, sans-serif';
    const studyDateStr = imgItem.studyDate ? new Date(imgItem.studyDate).toLocaleString() : 'Date recorded';
    ctx.fillText(`Date: ${studyDateStr}`, cardX + 16, metaY);
    metaY += 20;

    if (imgItem.caption) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 12px Helvetica, Arial, sans-serif';
      ctx.fillText(`Caption: ${imgItem.caption}`, cardX + 16, metaY);
      metaY += 20;
    }

    if (imgItem.interpretation) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'normal 12px Helvetica, Arial, sans-serif';
      ctx.fillText(`Report: ${imgItem.interpretation.slice(0, 90)}...`, cardX + 16, metaY);
    }
  }

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `ER_Case_${cleanId}_Imaging_Gallery.png`);
  }, 'image/png');
}
