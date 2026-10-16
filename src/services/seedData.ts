import { PatientCase, MedicalImage, NIHSSRecord } from '../types/medical';

// Generate clean medical CT / MRI synthetic preview scan images as Base64 Data URLs
function generateCTScanSVG(
  type:
    | 'mca_stroke'
    | 'cta_occlusion'
    | 'sah_blood'
    | 'mri_dwi'
    | 'ct_perfusion'
    | 'flair_mismatch'
    | 'carotid_doppler'
    | 'chest_xray'
    | 'ecg_strip'
    | 'ncct_followup'
): string {
  let innerGraphic = '';

  if (type === 'mca_stroke') {
    // Non-contrast CT Brain: Left hemisphere hypodensity & hyperdense MCA sign
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="150" ry="175" fill="#383838"/>
      <path d="M 106 240 C 106 130, 406 130, 406 240 C 406 360, 106 360, 106 240 Z" fill="none" stroke="#e2e8f0" stroke-width="16"/>
      <path d="M 235 200 C 240 220, 240 250, 235 270 C 230 250, 230 220, 235 200 Z" fill="#111111"/>
      <path d="M 277 200 C 272 220, 272 250, 277 270 C 282 250, 282 220, 277 200 Z" fill="#111111"/>
      <ellipse cx="185" cy="235" rx="50" ry="58" fill="#242424" opacity="0.8" filter="blur(6px)"/>
      <line x1="215" y1="230" x2="195" y2="238" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">NCCT BRAIN AXIAL</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">WL: 35 WW: 75 | THK: 5.0mm</text>
      <text x="30" y="470" fill="#ef4444" font-family="sans-serif" font-size="13">ASPECTS: 8 (Loss of Insular Ribbon)</text>
      <text x="360" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">R</text>
      <text x="130" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">L</text>
    `;
  } else if (type === 'cta_occlusion') {
    // CTA: Contrast in Circle of Willis with Left M1 cutoff
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="145" ry="170" fill="#1e1e1e"/>
      <path d="M 111 240 C 111 135, 401 135, 401 240 C 401 355, 111 355, 111 240 Z" fill="none" stroke="#64748b" stroke-width="12"/>
      <line x1="256" y1="310" x2="256" y2="250" stroke="#f1f5f9" stroke-width="6"/>
      <path d="M 256 250 L 315 240 L 350 220 M 315 240 L 355 255" fill="none" stroke="#f1f5f9" stroke-width="5" stroke-linecap="round"/>
      <path d="M 256 250 L 222 245" fill="none" stroke="#f1f5f9" stroke-width="5" stroke-linecap="round"/>
      <circle cx="220" cy="245" r="5" fill="#ef4444"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">CTA HEAD &amp; NECK (MIP)</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Circle of Willis | Contrast enhanced</text>
      <text x="30" y="470" fill="#ef4444" font-family="sans-serif" font-size="13">CRITICAL: Abrupt Left M1 MCA Cutoff (EVT)</text>
      <text x="360" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">R</text>
      <text x="130" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">L</text>
    `;
  } else if (type === 'mri_dwi') {
    // MRI DWI hyperintensity
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="145" ry="170" fill="#18181b"/>
      <path d="M 111 240 C 111 135, 401 135, 401 240 C 401 355, 111 355, 111 240 Z" fill="none" stroke="#52525b" stroke-width="10"/>
      <path d="M 180 200 C 160 210, 150 250, 185 270 C 205 260, 215 230, 200 210 Z" fill="#ffffff" filter="blur(3px)" opacity="0.95"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">MRI BRAIN DWI (b=1000)</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Acute Diffusion Restriction</text>
      <text x="30" y="470" fill="#38bdf8" font-family="sans-serif" font-size="13">High DWI Signal: Acute Left MCA Infarction</text>
      <text x="360" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">R</text>
      <text x="130" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">L</text>
    `;
  } else if (type === 'ct_perfusion') {
    // CT Perfusion Tmax Map
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="145" ry="170" fill="#18181b"/>
      <path d="M 111 240 C 111 135, 401 135, 401 240 C 401 355, 111 355, 111 240 Z" fill="none" stroke="#52525b" stroke-width="8"/>
      <!-- Ischemic penumbra green/red heatmap -->
      <path d="M 170 180 C 140 210, 140 270, 180 290 C 220 280, 220 200, 170 180 Z" fill="#ef4444" opacity="0.85" filter="blur(5px)"/>
      <path d="M 180 220 C 165 230, 165 260, 185 270 C 200 265, 200 230, 180 220 Z" fill="#a855f7" opacity="0.95"/>
      <text x="30" y="40" fill="#a855f7" font-family="sans-serif" font-size="14" font-weight="bold">CT PERFUSION (Tmax > 6s)</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Mismatch Volume: 68 mL | Core: 14 mL</text>
      <text x="30" y="470" fill="#22c55e" font-family="sans-serif" font-size="13">CRITICAL: Large Salvageable Penumbra (EVT Eligible)</text>
      <text x="360" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">R</text>
      <text x="130" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">L</text>
    `;
  } else if (type === 'flair_mismatch') {
    // MRI FLAIR scan
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="145" ry="170" fill="#27272a"/>
      <path d="M 111 240 C 111 135, 401 135, 401 240 C 401 355, 111 355, 111 240 Z" fill="none" stroke="#71717a" stroke-width="10"/>
      <!-- CSF attenuated dark ventricles -->
      <path d="M 240 200 C 245 220, 245 250, 240 270 Z" fill="#09090b"/>
      <path d="M 272 200 C 267 220, 267 250, 272 270 Z" fill="#09090b"/>
      <!-- Subtle or no signal on FLAIR indicating stroke onset < 4.5h -->
      <ellipse cx="185" cy="235" rx="30" ry="35" fill="#3f3f46" opacity="0.4"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">MRI BRAIN FLAIR AXIAL</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">TR 9000 TE 120 TI 2500</text>
      <text x="30" y="470" fill="#22c55e" font-family="sans-serif" font-size="13">DWI-FLAIR Mismatch: Consistent with &lt;4.5h Onset</text>
    `;
  } else if (type === 'carotid_doppler') {
    // Carotid Doppler Ultrasound
    innerGraphic = `
      <rect x="50" y="80" width="412" height="260" fill="#0c1222" rx="8" stroke="#1e293b"/>
      <!-- Color flow Doppler red/blue jet -->
      <path d="M 80 180 C 160 170, 240 210, 320 200 C 370 195, 410 190, 440 190 L 440 240 C 400 240, 360 250, 310 240 C 230 220, 150 210, 80 220 Z" fill="#0284c7" opacity="0.7"/>
      <!-- Stenotic high velocity jet in red/yellow -->
      <polygon points="260,210 295,200 325,208 300,225" fill="#f59e0b"/>
      <!-- Velocity waveform below -->
      <line x1="50" y1="360" x2="462" y2="360" stroke="#475569" stroke-width="1"/>
      <path d="M 60 360 L 80 360 L 90 280 L 105 320 L 120 360 L 160 360 L 170 270 L 185 315 L 200 360 L 240 360 L 250 250 L 270 310 L 290 360 L 330 360 L 340 245 L 360 305 L 380 360" fill="none" stroke="#22c55e" stroke-width="2"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">CAROTID DUPLEX ULTRASOUND</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Left ICA Origin PSV: 285 cm/s | EDV: 92 cm/s</text>
      <text x="30" y="470" fill="#ef4444" font-family="sans-serif" font-size="13">FINDING: High-grade (70-85%) Left Internal Carotid Stenosis</text>
    `;
  } else if (type === 'chest_xray') {
    // Portable AP Chest Radiograph
    innerGraphic = `
      <rect x="70" y="70" width="372" height="370" fill="#111827" rx="8" stroke="#334155"/>
      <!-- Rib cage outline -->
      <ellipse cx="256" cy="245" rx="140" ry="145" fill="#1f2937" stroke="#475569" stroke-width="2"/>
      <!-- Lungs dark radiolucency -->
      <ellipse cx="190" cy="225" rx="50" ry="85" fill="#0f172a"/>
      <ellipse cx="320" cy="220" rx="50" ry="80" fill="#0f172a"/>
      <!-- Cardiac silhouette slightly enlarged to left -->
      <path d="M 230 190 C 240 180, 275 180, 285 200 C 300 230, 290 280, 255 310 C 215 315, 185 270, 205 230 Z" fill="#475569" opacity="0.8"/>
      <!-- Clavicles -->
      <line x1="120" y1="120" x2="240" y2="140" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
      <line x1="392" y1="120" x2="272" y2="140" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
      <text x="30" y="40" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">CHEST RADIOGRAPH (PORTABLE AP)</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Pre-thrombectomy baseline</text>
      <text x="30" y="470" fill="#f8fafc" font-family="sans-serif" font-size="13">FINDINGS: Mild cardiomegaly. Lungs clear, no active infiltrates.</text>
    `;
  } else if (type === 'ecg_strip') {
    // 12-lead ECG Rhythm Strip
    innerGraphic = `
      <!-- ECG pink grid background -->
      <rect x="30" y="80" width="452" height="350" fill="#2d1519" stroke="#991b1b" stroke-width="1"/>
      <path d="M 30 130 H 482 M 30 180 H 482 M 30 230 H 482 M 30 280 H 482 M 30 330 H 482 M 30 380 H 482" stroke="#7f1d1d" stroke-width="0.8" opacity="0.6"/>
      <!-- Lead II rhythm trace with Atrial Fibrillation (irregularly irregular R-R, absent P waves, fibrillatory baseline) -->
      <path d="M 35 250 Q 45 253 55 248 T 75 251 L 82 258 L 88 150 L 95 275 L 102 248 Q 115 240 130 248 T 160 252 Q 175 249 190 252 L 196 256 L 202 145 L 209 278 L 216 250 Q 230 242 245 250 T 270 252 T 290 248 T 310 252 L 316 257 L 322 148 L 329 276 L 336 249 Q 360 242 385 252 L 392 256 L 398 146 L 405 275 L 412 250 Q 435 244 460 250" fill="none" stroke="#4ade80" stroke-width="2.5"/>
      <text x="30" y="40" fill="#4ade80" font-family="sans-serif" font-size="14" font-weight="bold">12-LEAD ECG RHYTHM STRIP (LEAD II)</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Ventricular Rate: 88 bpm | Irregularly Irregular</text>
      <text x="30" y="470" fill="#ef4444" font-family="sans-serif" font-size="13">CRITICAL: Atrial Fibrillation. High Cardioembolic Stroke Risk.</text>
    `;
  } else if (type === 'ncct_followup') {
    // 24-hour Post-EVT Follow-Up CT
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="150" ry="175" fill="#333333"/>
      <path d="M 106 240 C 106 130, 406 130, 406 240 C 406 360, 106 360, 106 240 Z" fill="none" stroke="#e2e8f0" stroke-width="16"/>
      <path d="M 235 200 C 240 220, 240 250, 235 270 C 230 250, 230 220, 235 200 Z" fill="#111111"/>
      <path d="M 277 200 C 272 220, 272 250, 277 270 C 282 250, 282 220, 277 200 Z" fill="#111111"/>
      <!-- Small demarcated infarct, NO hemorrhage -->
      <ellipse cx="185" cy="235" rx="28" ry="32" fill="#1c1c1c" opacity="0.9"/>
      <text x="30" y="40" fill="#22c55e" font-family="sans-serif" font-size="14" font-weight="bold">NCCT BRAIN 24-HOUR FOLLOW-UP</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">Post-Mechanical Thrombectomy (TICI 3)</text>
      <text x="30" y="470" fill="#22c55e" font-family="sans-serif" font-size="13">SUCCESS: Small subcortical infarct only. No hemorrhagic transformation.</text>
    `;
  } else {
    // SAH: Subarachnoid Hemorrhage Hyperdense Cisterns
    innerGraphic = `
      <ellipse cx="256" cy="240" rx="150" ry="175" fill="#383838"/>
      <path d="M 106 240 C 106 130, 406 130, 406 240 C 406 360, 106 360, 106 240 Z" fill="none" stroke="#e2e8f0" stroke-width="16"/>
      <path d="M 256 215 L 275 245 L 295 245 L 270 265 L 285 295 L 256 275 L 227 295 L 242 265 L 217 245 L 237 245 Z" fill="#f8fafc" opacity="0.95"/>
      <line x1="256" y1="120" x2="256" y2="215" stroke="#f8fafc" stroke-width="4"/>
      <line x1="225" y1="245" x2="175" y2="225" stroke="#f8fafc" stroke-width="5"/>
      <line x1="287" y1="245" x2="337" y2="225" stroke="#f8fafc" stroke-width="5"/>
      <text x="30" y="40" fill="#ef4444" font-family="sans-serif" font-size="14" font-weight="bold">NCCT BRAIN - ACUTE THUNDERCLAP</text>
      <text x="30" y="60" fill="#94a3b8" font-family="sans-serif" font-size="12">WL: 40 WW: 80 | SLICE: 4/16</text>
      <text x="30" y="470" fill="#ef4444" font-family="sans-serif" font-size="13">FINDINGS: Diffuse Subarachnoid Blood (Fisher 2)</text>
      <text x="360" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">R</text>
      <text x="130" y="240" fill="#94a3b8" font-family="sans-serif" font-size="14">L</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" style="background:#090d16">
    <rect width="512" height="512" fill="#090d16"/>
    ${innerGraphic}
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function getInitialSeedCases(): { cases: PatientCase[]; images: MedicalImage[] } {
  const now = new Date();
  const case1Time = new Date(now.getTime() - 105 * 60 * 1000); // 1h 45m ago
  const case1LKW = new Date(now.getTime() - 135 * 60 * 1000); // 2h 15m ago

  const case2Time = new Date(now.getTime() - 180 * 60 * 1000);
  const case2LKW = new Date(now.getTime() - 240 * 60 * 1000);

  const case3Time = new Date(now.getTime() - 45 * 60 * 1000);
  const case3LKW = new Date(now.getTime() - 75 * 60 * 1000);

  // 10 realistic, comprehensive neuroimaging scans for Case 1 to test full 10-image PDF export
  const images: MedicalImage[] = [
    {
      id: 'img-seed-101',
      caseId: 'NEURO-2026-0142',
      title: 'NCCT Brain - Hyperacute Left MCA sign',
      caption: 'Axial slice at basal ganglia level showing loss of insular ribbon',
      modality: 'CT Brain (Non-contrast)',
      studyDate: case1Time.toISOString(),
      dataUrl: generateCTScanSVG('mca_stroke'),
      fileType: 'image/svg+xml',
      fileSize: 18450,
      aspectsScore: '8',
      interpretation: 'Early ischemic changes in Left MCA territory with loss of insular ribbon. ASPECTS score 8. Hyperdense MCA sign present.',
      uploadedAt: case1Time.toISOString(),
    },
    {
      id: 'img-seed-102',
      caseId: 'NEURO-2026-0142',
      title: 'CTA Head & Neck - Left M1 Segment Occlusion',
      caption: 'MIP coronal reconstruction demonstrating abrupt M1 cutoff',
      modality: 'CT Angiography (CTA Head & Neck)',
      studyDate: new Date(case1Time.getTime() + 12 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('cta_occlusion'),
      fileType: 'image/svg+xml',
      fileSize: 21100,
      aspectsScore: '',
      interpretation: 'Abrupt cutoff of proximal Left Middle Cerebral Artery (M1 segment). Immediate EVT candidate.',
      uploadedAt: new Date(case1Time.getTime() + 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-103',
      caseId: 'NEURO-2026-0142',
      title: 'MRI Brain DWI - Confirmatory Infarct Core',
      caption: 'Diffusion weighted imaging b=1000 showing cytotoxic edema',
      modality: 'MRI Brain (DWI/FLAIR)',
      studyDate: new Date(case1Time.getTime() + 25 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('mri_dwi'),
      fileType: 'image/svg+xml',
      fileSize: 19800,
      aspectsScore: '',
      interpretation: 'Bright DWI signal in left corona radiata and insula confirming acute ischemia.',
      uploadedAt: new Date(case1Time.getTime() + 28 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-104',
      caseId: 'NEURO-2026-0142',
      title: 'CT Perfusion - Tmax Delay Map',
      caption: 'Mismatch map revealing large salvageable ischemic penumbra',
      modality: 'CT Perfusion (CTP)',
      studyDate: new Date(case1Time.getTime() + 14 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('ct_perfusion'),
      fileType: 'image/svg+xml',
      fileSize: 24200,
      aspectsScore: '',
      interpretation: 'Large hypoperfused tissue volume with small core (Tmax >6s mismatch volume 68mL, core 14mL).',
      uploadedAt: new Date(case1Time.getTime() + 16 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-105',
      caseId: 'NEURO-2026-0142',
      title: 'MRI Brain FLAIR - Symptom Onset Match',
      caption: 'DWI-FLAIR mismatch indicating acute onset under 4.5 hours',
      modality: 'MRI Brain (DWI/FLAIR)',
      studyDate: new Date(case1Time.getTime() + 26 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('flair_mismatch'),
      fileType: 'image/svg+xml',
      fileSize: 20400,
      aspectsScore: '',
      interpretation: 'No hyperintensity in left MCA territory on FLAIR, confirming wake-up/hyperacute stroke within IV thrombolysis window.',
      uploadedAt: new Date(case1Time.getTime() + 29 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-106',
      caseId: 'NEURO-2026-0142',
      title: 'Carotid Duplex Ultrasound - Left ICA Stenosis',
      caption: 'Spectral waveform with PSV 285 cm/s indicating severe tandem stenosis',
      modality: 'Carotid Doppler Ultrasound',
      studyDate: new Date(case1Time.getTime() + 35 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('carotid_doppler'),
      fileType: 'image/svg+xml',
      fileSize: 26100,
      aspectsScore: '',
      interpretation: 'Elevated peak systolic velocity in left internal carotid artery origin consistent with 70-85% hemodynamic stenosis.',
      uploadedAt: new Date(case1Time.getTime() + 38 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-107',
      caseId: 'NEURO-2026-0142',
      title: 'Pre-EVT Portable Chest Radiograph',
      caption: 'AP chest x-ray ruling out acute pulmonary edema or aspiration',
      modality: 'Chest X-Ray',
      studyDate: new Date(case1Time.getTime() + 18 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('chest_xray'),
      fileType: 'image/svg+xml',
      fileSize: 17900,
      aspectsScore: '',
      interpretation: 'Mild cardiomegaly with borderline boot-shaped heart. Lungs are well expanded and clear of focal infiltrates.',
      uploadedAt: new Date(case1Time.getTime() + 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-108',
      caseId: 'NEURO-2026-0142',
      title: '12-Lead ECG Rhythm Strip',
      caption: 'Lead II continuous trace showing Atrial Fibrillation with rapid ventricular response',
      modality: 'ECG Rhythm Strip',
      studyDate: new Date(case1Time.getTime() + 5 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('ecg_strip'),
      fileType: 'image/svg+xml',
      fileSize: 22100,
      aspectsScore: '',
      interpretation: 'Atrial Fibrillation with variable R-R intervals, heart rate 88-104 bpm. No acute ischemic ST elevation.',
      uploadedAt: new Date(case1Time.getTime() + 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-109',
      caseId: 'NEURO-2026-0142',
      title: 'Post-EVT 24-Hour NCCT Brain Scan',
      caption: 'Evaluation for hemorrhagic transformation and final infarct volume',
      modality: 'CT Brain (Non-contrast)',
      studyDate: new Date(case1Time.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      dataUrl: generateCTScanSVG('ncct_followup'),
      fileType: 'image/svg+xml',
      fileSize: 19500,
      aspectsScore: '9',
      interpretation: 'Small subcortical infarct in left corona radiata. No hemorrhagic transformation. Successful reperfusion confirmed.',
      uploadedAt: new Date(case1Time.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'img-seed-110',
      caseId: 'NEURO-2026-0142',
      title: 'NCCT Brain - Axial Midbrain & Basal Cisterns',
      caption: 'Non-contrast slice assessing patent ambient and suprasellar cisterns',
      modality: 'CT Brain (Non-contrast)',
      studyDate: case1Time.toISOString(),
      dataUrl: generateCTScanSVG('mca_stroke'),
      fileType: 'image/svg+xml',
      fileSize: 18450,
      aspectsScore: '',
      interpretation: 'Symmetric basal cisterns without mass effect, midline shift <2mm.',
      uploadedAt: case1Time.toISOString(),
    },
    {
      id: 'img-seed-301',
      caseId: 'NEURO-2026-0319',
      title: 'NCCT Brain - Basal Cistern Subarachnoid Blood',
      caption: 'High attenuation acute blood in suprasellar and interpeduncular cisterns',
      modality: 'CT Brain (Non-contrast)',
      studyDate: case3Time.toISOString(),
      dataUrl: generateCTScanSVG('sah_blood'),
      fileType: 'image/svg+xml',
      fileSize: 22800,
      aspectsScore: '',
      interpretation: 'Acute subarachnoid blood filling basal cisterns and Sylvian fissures. Fisher Grade 2.',
      uploadedAt: case3Time.toISOString(),
    },
  ];

  // Seed NIHSS Records
  const seedNihssCase1: NIHSSRecord[] = [
    {
      id: 'nihss-1-baseline',
      timestamp: case1Time.toISOString(),
      label: 'Initial ED Baseline (Arrival)',
      items: {
        loc1a: 0,
        locQuestions1b: 2,
        locCommands1c: 2,
        bestGaze2: 2,
        visualFields3: 2,
        facialPalsy4: 2,
        motorLeftArm5a: 0,
        motorRightArm5b: 4,
        motorLeftLeg6a: 0,
        motorRightLeg6b: 3,
        limbAtaxia7: 0,
        sensory8: 1,
        bestLanguage9: 3,
        dysarthria10: 2,
        extinction11: 2,
      },
      totalScore: 23,
      isComplete: true,
      unscoredCount: 0,
      severity: 'Severe Stroke (NIHSS 21–42)',
      notes: 'Global aphasia with dense right hemiplegia and forced leftward gaze deviation.',
    },
    {
      id: 'nihss-1-posttpa',
      timestamp: new Date(case1Time.getTime() + 45 * 60 * 1000).toISOString(),
      label: 'Post-Tenecteplase 30 min check',
      items: {
        loc1a: 0,
        locQuestions1b: 1,
        locCommands1c: 1,
        bestGaze2: 1,
        visualFields3: 1,
        facialPalsy4: 2,
        motorLeftArm5a: 0,
        motorRightArm5b: 3,
        motorLeftLeg6a: 0,
        motorRightLeg6b: 2,
        limbAtaxia7: 0,
        sensory8: 1,
        bestLanguage9: 2,
        dysarthria10: 2,
        extinction11: 1,
      },
      totalScore: 14,
      isComplete: true,
      unscoredCount: 0,
      severity: 'Moderate Stroke (NIHSS 5–15)',
      notes: 'Improvement in comprehension and motor power following IV TNK bolus.',
    },
  ];

  const seedNihssCase2: NIHSSRecord[] = [
    {
      id: 'nihss-2-baseline',
      timestamp: case2Time.toISOString(),
      label: 'Post-ictal baseline evaluation',
      items: {
        loc1a: 1,
        locQuestions1b: 1,
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
        bestLanguage9: 1,
        dysarthria10: 1,
        extinction11: 0,
      },
      totalScore: 3,
      isComplete: true,
      unscoredCount: 0,
      severity: 'Minor Neurological Impairment (1–4)',
      notes: 'No focal motor weakness. Encephalopathic/post-ictal slowness.',
    },
  ];

  const seedNihssCase3: NIHSSRecord[] = [
    {
      id: 'nihss-3-baseline',
      timestamp: case3Time.toISOString(),
      label: 'ED Arrival evaluation',
      items: {
        loc1a: 0,
        locQuestions1b: 1,
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
      },
      totalScore: 1,
      isComplete: true,
      unscoredCount: 0,
      severity: 'Minor (SAH Hunt & Hess Grade 2)',
      notes: 'Oriented to person/place, disoriented to date due to intense cephalea.',
    },
  ];

  const cases: PatientCase[] = [
    {
      id: 'NEURO-2026-0142',
      createdAt: case1Time.toISOString(),
      updatedAt: now.toISOString(),
      archived: false,
      identification: {
        id: 'NEURO-2026-0142',
        initials: 'E.V.',
        mrn: 'MRN-84021',
        age: 68,
        sex: 'M',
        arrivalTime: case1Time.toISOString(),
        lastKnownWell: case1LKW.toISOString(),
        triage: 'red',
        status: 'treatment',
        bedLocation: 'Resus 1 (Stroke Code)',
      },
      chiefComplaint: {
        symptom: 'Sudden onset right hemiplegia and severe mixed aphasia',
        onsetDuration: '2 hours 15 minutes since LKW',
        lastKnownWellTime: case1LKW.toISOString(),
        mode: 'sudden',
        associatedSymptoms: 'Right facial droop, inability to speak, eyes deviated left.',
      },
      history: {
        hpi: '68-year-old right-handed male having breakfast with spouse when he suddenly dropped his coffee cup from his right hand, developed right facial droop, and became mute. Paramedics activated Stroke Code. Blood sugar on scene 120 mg/dL.',
        pastMedical: 'Atrial Fibrillation (intermittently compliant with Apixaban), Hypertension x 12 years, Hyperlipidemia.',
        medications: 'Apixaban 5mg BID (spouse reports missed yesterday evening dose), Amlodipine 10mg daily, Atorvastatin 40mg daily.',
        allergies: 'Penicillin (urticaria / rash)',
      },
      vitals: {
        bpSys: 178,
        bpDia: 94,
        hr: 88,
        rr: 16,
        temp: 36.8,
        spo2: 97,
        cbg: 124,
        generalCondition: 'Acute distress, alert but unable to communicate. Eyes forced conjugate gaze to the left.',
      },
      neuroExam: {
        gcs: {
          eye: 4,
          verbal: 2,
          motor: 5,
          totalText: 'E4 V2 M5 = 11/15',
          numericTotal: 11,
          notes: 'Eye opening spontaneous. Verbal incomprehensible sounds. Motor obeys on left.',
        },
        motor: {
          rightUpperPower: 0,
          leftUpperPower: 5,
          rightLowerPower: 1,
          leftLowerPower: 5,
          toneNotes: 'Flaccid tone on right upper and lower extremity. Normal on left.',
          driftNotes: 'Immediate right arm drop to bed.',
          movementsNotes: 'No involuntary movements or tremor.',
          generalMotorNotes: 'Dense right hemiplegia. MRC 0/5 in right arm, 1/5 flicker right hip. Left limbs 5/5 normal.',
        },
        sensory: {
          lightTouch: 'Dense hemisensory reduction over right face, arm, and leg',
          pain: 'Grimaces only to painful stimulation on left, hypoalgesic on right',
          temperature: 'Reduced on right',
          vibration: 'Intact left, not reliably testable on right',
          jointPositionSense: 'Absent proprioception in right fingers and toes',
          corticalSensory: 'Right tactile extinction present',
          overallSensoryNotes: 'Dense right hemisensory loss corresponding to left MCA cortical distribution.',
        },
        cranialNerves: {
          cn1_olfactory: 'Not assessed',
          cn2_optic: 'Right homonymous hemianopia to visual threat. Pupils 3mm PERRL.',
          cn3_4_6_extraocular: 'Forced conjugate gaze deviation to the left; can partially overcome with oculocephalics.',
          cn5_trigeminal: 'Reduced sensation right V1-V3, corneal reflex present.',
          cn7_facial: 'Severe right lower facial droop with flattening of nasolabial fold (UMN pattern).',
          cn8_vestibulocochlear: 'Alert to voice sounds.',
          cn9_10_glossopharyngeal_vagus: 'Reduced elevation of right palatal arch, gag present.',
          cn11_accessory: 'Left sternocleidomastoid intact.',
          cn12_hypoglossal: 'Tongue deviates to the right on attempted protrusion.',
          overallCranialNotes: 'Left hemispheric gaze preference and right UMN cranial neuropathies (VII, XII).',
        },
        bulbar: {
          speechArticulation: 'Non-fluent, severe mixed/global aphasia',
          dysarthria: 'Severe dysarthria',
          dysphonia: 'None',
          palatalMovement: 'Asymmetric elevation',
          gagReflex: 'Intact bilaterally',
          swallowing: 'Unsafe - strictly NPO',
          tongueMovementStrength: 'Weak rightward push against cheek',
          bulbarNotes: 'Aspiration risk confirmed. NPO order placed.',
        },
        sphincter: {
          urinaryControl: 'Incontinent of urine at onset of stroke',
          bowelControl: 'Continent of feces',
          sacralSensoryTone: 'Not formally examined',
          sphincterNotes: 'Foley catheter placed in resuscitation bay.',
        },
        plantars: {
          right: 'Extensor (Babinski +)',
          left: 'Flexor',
          notes: 'Clear right Babinski extensor sign with fanning of toes.',
        },
        generalExamNotes: 'Cardiovascular: irregularly irregular rhythm (AFib). Lungs clear. No signs of head trauma.',
      },
      nihssAssessments: seedNihssCase1,
      investigations: {
        cbc: { hb: '14.2 g/dL', wbc: '8.4 x10^9/L', platelets: '235 x10^9/L' },
        bloodGlucose: '124 mg/dL',
        electrolytes: { na: '139 mmol/L', k: '4.1 mmol/L', ca: '9.2 mg/dL' },
        renal: { bun: '18 mg/dL', cr: '1.0 mg/dL', egfr: '78 mL/min' },
        coagulation: { pt: '12.4s', inr: '1.1', aptt: '31s' },
        cardiacMarkers: { troponin: '<0.01 ng/mL' },
        ecgFindings: 'Atrial Fibrillation with controlled ventricular response (HR 86 bpm). No acute ST elevation.',
        generalInvestigationsNotes: 'Point-of-care blood glucose 124 mg/dL. Anti-Xa level 0.12 ug/mL (subtherapeutic Apixaban). Cleared for Tenecteplase.',
      },
      assessmentPlan: {
        workingDiagnosis: 'Acute Ischemic Stroke secondary to Left Proximal M1 MCA Large Vessel Occlusion (LVO) - Cardioembolic',
        differentials: 'Intracerebral Hemorrhage (ruled out by NCCT), Todd’s Paresis, Complicated Migraine.',
        clinicalLocalization: 'Left Middle Cerebral Artery territory (Broca + Wernicke areas, internal capsule, motor cortex).',
        managementPlan: '1. IV Tenecteplase (TNK) 0.25 mg/kg bolus administered at door-to-needle time of 32 mins.\n2. Direct transfer to Neurointerventional Angiosuite for Mechanical Thrombectomy (EVT).\n3. Maintain BP <180/105 mmHg with IV Labetalol.\n4. NPO, head of bed flat (0 degrees) pending recanalization.',
        disposition: 'Direct admit to Neuro ICU post-thrombectomy.',
      },
      progressNotes: [
        {
          id: 'note-1',
          timestamp: new Date(case1Time.getTime() + 10 * 60 * 1000).toISOString(),
          author: 'Dr. Jennifer Chen, Neuro Resident',
          category: 'Clinical Status',
          note: 'Stroke Code arrived. NIHSS baseline confirmed at 23. NCCT brain negative for hemorrhage, ASPECTS 8. CTA demonstrates proximal Left M1 occlusion. Pre-tPA BP 186/102 treated with 10mg IV Labetalol.',
        },
        {
          id: 'note-2',
          timestamp: new Date(case1Time.getTime() + 35 * 60 * 1000).toISOString(),
          author: 'Dr. Jennifer Chen, Neuro Resident',
          category: 'Treatment Response',
          note: 'Tenecteplase 18mg IV administered at 09:12. Neurological exam stable, BP 158/86 mmHg. Transferring patient now to Angio Suite 3 with Neurovascular team.',
        },
      ],
    },
    {
      id: 'NEURO-2026-0205',
      createdAt: case2Time.toISOString(),
      updatedAt: now.toISOString(),
      archived: false,
      identification: {
        id: 'NEURO-2026-0205',
        initials: 'M.K.',
        mrn: 'MRN-77190',
        age: 29,
        sex: 'F',
        arrivalTime: case2Time.toISOString(),
        lastKnownWell: case2LKW.toISOString(),
        triage: 'orange',
        status: 'investigations',
        bedLocation: 'Bay 3 (Acute)',
      },
      chiefComplaint: {
        symptom: 'Witnessed generalized tonic-clonic seizures and persistent post-ictal confusion with high fever',
        onsetDuration: '3 hours',
        lastKnownWellTime: case2LKW.toISOString(),
        mode: 'fluctuating',
        associatedSymptoms: 'Fever (38.9°C), tongue biting on lateral border, urinary incontinence, severe headache.',
      },
      history: {
        hpi: '29-year-old previously healthy female brought by ambulance after having three generalized convulsive seizures at home over a 2-hour period without fully regaining consciousness between episodes. Roommate reports 2-day history of worsening frontal headache and low-grade fever.',
        pastMedical: 'No prior seizures, no head trauma. Oral contraceptive pills.',
        medications: 'Levonorgestrel/Ethinyl estradiol.',
        allergies: 'No known drug allergies (NKDA)',
      },
      vitals: {
        bpSys: 132,
        bpDia: 78,
        hr: 112,
        rr: 20,
        temp: 38.9,
        spo2: 98,
        cbg: 98,
        generalCondition: 'Somnolent, photophobic, moaning when aroused, lateral tongue laceration.',
      },
      neuroExam: {
        gcs: {
          eye: 3,
          verbal: 3,
          motor: 5,
          totalText: 'E3 V3 M5 = 11/15',
          numericTotal: 11,
          notes: 'Arouses to voice, confused speech, localizes pain.',
        },
        motor: {
          rightUpperPower: 5,
          leftUpperPower: 5,
          rightLowerPower: 5,
          leftLowerPower: 5,
          toneNotes: 'Mild generalized paratonic rigidity.',
          driftNotes: 'No pronator drift observed.',
          movementsNotes: 'No active twitching or myoclonus.',
          generalMotorNotes: 'Withdraws briskly to touch; power 5/5 symmetrical in all 4 limbs.',
        },
        sensory: {
          lightTouch: 'Grossly intact throughout all extremities',
          pain: 'Intact, withdraws symmetrically',
          temperature: 'Not tested',
          vibration: 'Intact',
          jointPositionSense: 'Intact',
          corticalSensory: 'Intact',
          overallSensoryNotes: 'No focal sensory deficit.',
        },
        cranialNerves: {
          cn1_olfactory: 'Not tested',
          cn2_optic: 'Pupils 4mm equal, sluggishly reactive. Discs flat.',
          cn3_4_6_extraocular: 'Full range, no nystagmus or ocular palsy.',
          cn5_trigeminal: 'Intact sensation, brisk corneal reflex.',
          cn7_facial: 'Symmetric, grimaces equally.',
          cn8_vestibulocochlear: 'Intact to bedside voice.',
          cn9_10_glossopharyngeal_vagus: 'Palate midline, gag present.',
          cn11_accessory: 'Resists neck turning.',
          cn12_hypoglossal: 'Midline tongue, left lateral border laceration.',
          overallCranialNotes: 'No cranial nerve palsy.',
        },
        bulbar: {
          speechArticulation: 'Dysphonic, slow articulation',
          dysarthria: 'Mild slurring post-ictal',
          dysphonia: 'Mild',
          palatalMovement: 'Symmetric',
          gagReflex: 'Present',
          swallowing: 'Intact to small sips',
          tongueMovementStrength: 'Full power',
          bulbarNotes: 'Tongue laceration with dried blood on left lateral border.',
        },
        sphincter: {
          urinaryControl: 'Incontinent during seizure episode',
          bowelControl: 'Continent',
          sacralSensoryTone: 'Intact',
          sphincterNotes: 'Cleaned and dry currently.',
        },
        plantars: {
          right: 'Flexor',
          left: 'Flexor',
          notes: 'Downward flexor plantar responses bilaterally.',
        },
        generalExamNotes: 'Marked nuchal rigidity. Positive Kernig and Brudzinski signs.',
      },
      nihssAssessments: seedNihssCase2,
      investigations: {
        cbc: { hb: '12.8 g/dL', wbc: '15.6 x10^9/L', platelets: '280 x10^9/L' },
        bloodGlucose: '98 mg/dL',
        electrolytes: { na: '134 mmol/L', k: '3.9 mmol/L', ca: '9.0 mg/dL' },
        renal: { bun: '14 mg/dL', cr: '0.8 mg/dL', egfr: '>90 mL/min' },
        coagulation: { pt: '11.8s', inr: '1.0', aptt: '28s' },
        cardiacMarkers: { troponin: 'Negative' },
        ecgFindings: 'Sinus Tachycardia at 110 bpm, normal axis.',
        generalInvestigationsNotes: 'Serum lactate 3.4 mmol/L post-ictal. STAT Lumbar Puncture scheduled following head CT.',
      },
      assessmentPlan: {
        workingDiagnosis: 'Status epilepticus (convulsive, now controlled) secondary to acute Meningoencephalitis (Viral vs. Bacterial)',
        differentials: 'HSV-1 encephalitis, Acute Bacterial Meningitis, Autoimmune encephalitis, Cerebral Venous Thrombosis.',
        clinicalLocalization: 'Diffuse meningeal and frontotemporal cortices.',
        managementPlan: '1. IV Levetiracetam 4000 mg IV load completed.\n2. Empiric IV Ceftriaxone 2g q12h + Vancomycin 1.5g + Ampicillin 2g + IV Acyclovir 10mg/kg q8h + Dexamethasone 10mg IV.\n3. STAT NCCT Brain to exclude brain edema.\n4. STAT Diagnostic Lumbar Puncture in ER procedure room.',
        disposition: 'Admit to Neuro-ICU for continuous EEG and LP evaluation.',
      },
      progressNotes: [
        {
          id: 'note-mk-1',
          timestamp: new Date(case2Time.getTime() + 20 * 60 * 1000).toISOString(),
          author: 'Dr. Jennifer Chen, Neuro Resident',
          category: 'Clinical Status',
          note: 'Loaded with 4000mg IV Keppra. No further tonic-clonic convulsions. Temperature 38.9C, marked nuchal rigidity. GCS 11.',
        },
      ],
    },
    {
      id: 'NEURO-2026-0319',
      createdAt: case3Time.toISOString(),
      updatedAt: now.toISOString(),
      archived: false,
      identification: {
        id: 'NEURO-2026-0319',
        initials: 'R.S.',
        mrn: 'MRN-91244',
        age: 46,
        sex: 'M',
        arrivalTime: case3Time.toISOString(),
        lastKnownWell: case3LKW.toISOString(),
        triage: 'red',
        status: 'assessment',
        bedLocation: 'Resus 2',
      },
      chiefComplaint: {
        symptom: 'Sudden "thunderclap" headache (10/10 peak in 10s) with vomiting and syncope',
        onsetDuration: '45 minutes',
        lastKnownWellTime: case3LKW.toISOString(),
        mode: 'sudden',
        associatedSymptoms: 'Violent occipital-nuchal pain, photophobia, emesis x 3, brief syncope.',
      },
      history: {
        hpi: '46-year-old male doing squats at the gym when he experienced "being struck by a hammer in back of head." Pain reached 10/10 severity in seconds. Brief 30s syncope witnessed by gym staff.',
        pastMedical: 'Mild untreated hypertension. No prior surgeries.',
        medications: 'None.',
        allergies: 'No known allergies (NKDA)',
      },
      vitals: {
        bpSys: 184,
        bpDia: 102,
        hr: 62,
        rr: 18,
        temp: 37.1,
        spo2: 99,
        cbg: 110,
        generalCondition: 'Severe distress, holding head in dark room with photophobia. GCS 14 (confused to date).',
      },
      neuroExam: {
        gcs: {
          eye: 4,
          verbal: 4,
          motor: 6,
          totalText: 'E4 V4 M6 = 14/15',
          numericTotal: 14,
          notes: 'Disoriented to exact date; follows all motor commands.',
        },
        motor: {
          rightUpperPower: 5,
          leftUpperPower: 5,
          rightLowerPower: 5,
          leftLowerPower: 5,
          toneNotes: 'Normal tone throughout.',
          driftNotes: 'No pronator drift.',
          movementsNotes: 'None.',
          generalMotorNotes: 'Full 5/5 motor power throughout all 4 limbs.',
        },
        sensory: {
          lightTouch: 'Intact throughout',
          pain: 'Intact bilaterally',
          temperature: 'Intact',
          vibration: 'Intact',
          jointPositionSense: 'Intact',
          corticalSensory: 'Intact',
          overallSensoryNotes: 'No focal sensory deficit.',
        },
        cranialNerves: {
          cn1_olfactory: 'Not tested',
          cn2_optic: 'Pupils 3mm equal, reactive. No subhyaloid hemorrhages.',
          cn3_4_6_extraocular: 'Full range, no CN III palsy (no ptosis, no pupillary dilation).',
          cn5_trigeminal: 'Intact facial sensation.',
          cn7_facial: 'Symmetrical facial movements.',
          cn8_vestibulocochlear: 'Intact.',
          cn9_10_glossopharyngeal_vagus: 'Palate elevates symmetrically.',
          cn11_accessory: 'Marked cervical muscle spasm.',
          cn12_hypoglossal: 'Midline.',
          overallCranialNotes: 'Cranial nerves intact. No cranial nerve III compression.',
        },
        bulbar: {
          speechArticulation: 'Fluent speech, no dysarthria',
          dysarthria: 'None',
          dysphonia: 'None',
          palatalMovement: 'Normal',
          gagReflex: 'Intact',
          swallowing: 'Nauseated, holding water',
          tongueMovementStrength: 'Normal',
          bulbarNotes: 'Nausea and retching with photophobia.',
        },
        sphincter: {
          urinaryControl: 'Normal control',
          bowelControl: 'Normal',
          sacralSensoryTone: 'Intact',
          sphincterNotes: 'No sphincter disturbance.',
        },
        plantars: {
          right: 'Flexor',
          left: 'Flexor',
          notes: 'Bilateral flexor plantar responses.',
        },
        generalExamNotes: 'Marked nuchal rigidity with neck stiffness, Kernig positive. SBP 184.',
      },
      nihssAssessments: seedNihssCase3,
      investigations: {
        cbc: { hb: '15.1 g/dL', wbc: '11.2 x10^9/L', platelets: '260 x10^9/L' },
        bloodGlucose: '110 mg/dL',
        electrolytes: { na: '141 mmol/L', k: '4.0 mmol/L', ca: '9.4 mg/dL' },
        renal: { bun: '16 mg/dL', cr: '0.9 mg/dL', egfr: '88 mL/min' },
        coagulation: { pt: '12.0s', inr: '1.0', aptt: '27s' },
        cardiacMarkers: { troponin: '0.02 ng/mL' },
        ecgFindings: 'Sinus Bradycardia 60 bpm. Neurogenic T-wave inversions in V2-V4.',
        generalInvestigationsNotes: 'NCCT brain confirms diffuse subarachnoid blood in basal cisterns. STAT CTA Head ordered.',
      },
      assessmentPlan: {
        workingDiagnosis: 'Acute Non-traumatic Subarachnoid Hemorrhage (aSAH) - Hunt & Hess Grade 2, Fisher Grade 2',
        differentials: 'Cerebral Venous Sinus Thrombosis, Cervical Artery Dissection, RCVS, Pituitary Apoplexy.',
        clinicalLocalization: 'Subarachnoid space (basal cisterns and interhemispheric fissure).',
        managementPlan: '1. STAT Neurosurgery bedside consult.\n2. STAT CTA Head & Neck to identify aneurysm.\n3. Nicardipine IV infusion titrated to maintain SBP < 140 mmHg.\n4. Nimodipine 60 mg q4h PO.\n5. Analgesia (IV Fentanyl), anti-emetics, dim quiet room.',
        disposition: 'Admit to Neuro-ICU under Neurosurgery service.',
      },
      progressNotes: [
        {
          id: 'note-rs-1',
          timestamp: new Date(case3Time.getTime() + 25 * 60 * 1000).toISOString(),
          author: 'Dr. Jennifer Chen, Neuro Resident',
          category: 'Clinical Status',
          note: 'NCCT confirms SAH. Neurosurgery bedside. Patient on Nicardipine drip; SBP now 138. Awaiting CTA.',
        },
      ],
    },
  ];

  return { cases, images };
}

export function createEmptyCase(caseNumberSeed: number = Math.floor(1000 + Math.random() * 9000)): PatientCase {
  const now = new Date().toISOString();
  const caseId = `NEURO-${new Date().getFullYear()}-${caseNumberSeed}`;

  return {
    id: caseId,
    createdAt: now,
    updatedAt: now,
    archived: false,
    identification: {
      id: caseId,
      initials: '',
      mrn: '',
      age: '',
      sex: 'M',
      arrivalTime: now,
      lastKnownWell: now,
      triage: 'yellow',
      status: 'new',
      bedLocation: '',
    },
    chiefComplaint: {
      symptom: '',
      onsetDuration: '',
      lastKnownWellTime: now,
      mode: 'sudden',
      associatedSymptoms: '',
    },
    history: {
      hpi: '',
      pastMedical: '',
      medications: '',
      allergies: '',
    },
    vitals: {
      bpSys: '',
      bpDia: '',
      hr: '',
      rr: '',
      temp: '',
      spo2: '',
      cbg: '',
      generalCondition: '',
    },
    neuroExam: {
      gcs: {
        eye: 4,
        verbal: 5,
        motor: 6,
        totalText: 'E4 V5 M6 = 15/15',
        numericTotal: 15,
        notes: '',
      },
      motor: {
        rightUpperPower: 5,
        leftUpperPower: 5,
        rightLowerPower: 5,
        leftLowerPower: 5,
        toneNotes: '',
        driftNotes: '',
        movementsNotes: '',
        generalMotorNotes: '',
      },
      sensory: {
        lightTouch: '',
        pain: '',
        temperature: '',
        vibration: '',
        jointPositionSense: '',
        corticalSensory: '',
        overallSensoryNotes: '',
      },
      cranialNerves: {
        cn1_olfactory: '',
        cn2_optic: '',
        cn3_4_6_extraocular: '',
        cn5_trigeminal: '',
        cn7_facial: '',
        cn8_vestibulocochlear: '',
        cn9_10_glossopharyngeal_vagus: '',
        cn11_accessory: '',
        cn12_hypoglossal: '',
        overallCranialNotes: '',
      },
      bulbar: {
        speechArticulation: '',
        dysarthria: '',
        dysphonia: '',
        palatalMovement: '',
        gagReflex: '',
        swallowing: '',
        tongueMovementStrength: '',
        bulbarNotes: '',
      },
      sphincter: {
        urinaryControl: '',
        bowelControl: '',
        sacralSensoryTone: '',
        sphincterNotes: '',
      },
      plantars: {
        right: 'Flexor',
        left: 'Flexor',
        notes: '',
      },
      generalExamNotes: '',
    },
    nihssAssessments: [],
    investigations: {
      cbc: { hb: '', wbc: '', platelets: '' },
      bloodGlucose: '',
      electrolytes: { na: '', k: '', ca: '' },
      renal: { bun: '', cr: '', egfr: '' },
      coagulation: { pt: '', inr: '', aptt: '' },
      cardiacMarkers: { troponin: '' },
      ecgFindings: '',
      csfAnalysis: '',
      generalInvestigationsNotes: '',
    },
    assessmentPlan: {
      workingDiagnosis: '',
      differentials: '',
      clinicalLocalization: '',
      managementPlan: '',
      disposition: '',
    },
    progressNotes: [],
  };
}
