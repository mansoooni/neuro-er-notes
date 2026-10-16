import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PatientCase,
  MedicalImage,
  CaseStatus,
  ImagingModality,
  PlantarResponse,
  NIHSSRecord,
} from '../types/medical';
import {
  ChevronDown,
  ChevronUp,
  FileDown,
  Camera,
  Plus,
  Trash2,
  Upload,
  Eye,
  Check,
  X,
  AlertTriangle,
  Edit3,
  Loader2,
  Image as ImageIcon,
  Activity,
  CheckCircle2,
  RotateCcw,
  Share2,
  FileImage,
} from 'lucide-react';
import { saveImage, deleteImage, getImagesForCase, saveCase } from '../services/db';
import { exportCaseToPDF } from '../services/pdfExport';
import { exportCaseReportToPNG, exportImagingGalleryToPNG } from '../services/pngExport';
import { MotorBodyDiagram } from './MotorBodyDiagram';
import { NIHSSCalculator } from './NIHSSCalculator';
import { LKWCallout } from './LKWCallout';
import { ABCD2ScoreSection } from './ABCD2ScoreSection';
import { getSimplifiedCranialNerves } from '../services/cranialNervesHelper';

interface Props {
  patientCase: PatientCase;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateCase: (updatedCase: PatientCase) => void;
  onDeleteCase: (caseId: string) => void;
  onOpenImageViewer: (images: MedicalImage[], imageId: string) => void;
}

// Utility to optimize client-side image files before saving to IndexedDB
async function optimizeImageFile(file: File): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          const maxDim = 1800; // high diagnostic resolution
          let w = img.naturalWidth || img.width || 800;
          let h = img.naturalHeight || img.height || 800;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ dataUrl: rawDataUrl, size: file.size });
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', 0.90);
          resolve({ dataUrl: compressed, size: Math.round(compressed.length * 0.75) });
        } catch (err) {
          resolve({ dataUrl: rawDataUrl, size: file.size });
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const CaseCard: React.FC<Props> = React.memo(({
  patientCase,
  isExpanded,
  onToggleExpand,
  onUpdateCase,
  onDeleteCase,
  onOpenImageViewer,
}) => {
  // Local state for instant typing with zero main thread freeze
  const [localCase, setLocalCase] = useState<PatientCase>(patientCase);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Imaging Section state
  const [isImagingOpen, setIsImagingOpen] = useState(false);
  const [images, setImages] = useState<MedicalImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // In-app Image Deletion Modal state (bypasses window.confirm sandbox limitations!)
  const [imageToDelete, setImageToDelete] = useState<MedicalImage | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imageDeleteError, setImageDeleteError] = useState<string | null>(null);

  // Edit scan details modal state
  const [editingImage, setEditingImage] = useState<MedicalImage | null>(null);

  // Export states
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPNGReport, setIsExportingPNGReport] = useState(false);
  const [isExportingPNGGallery, setIsExportingPNGGallery] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // NIHSS Assessment Calculator expand toggle
  const [isNIHSSCalculatorOpen, setIsNIHSSCalculatorOpen] = useState(false);

  // Case Lifecycle Modals
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [dischargeDisposition, setDischargeDisposition] = useState('Transferred to Neuro Step-Down / Floor');
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);

  // Default upload modality
  const [batchModality, setBatchModality] = useState<ImagingModality>('CT Brain (Non-contrast)');

  // Autosave refs
  const saveTimerRef = useRef<any>(null);
  const latestLocalCaseRef = useRef<PatientCase>(localCase);
  latestLocalCaseRef.current = localCase;

  // Sync if patient ID changes
  useEffect(() => {
    setLocalCase(patientCase);
  }, [patientCase.id]);

  // Load images belonging to this case from IndexedDB
  const refreshImages = useCallback(async () => {
    try {
      const imgs = await getImagesForCase(patientCase.id);
      setImages(imgs);
    } catch (err) {
      console.error('Failed to load images for case:', err);
    }
  }, [patientCase.id]);

  useEffect(() => {
    refreshImages();
  }, [refreshImages]);

  // Flush pending save immediately on unmount or card collapse
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const dataToSave = latestLocalCaseRef.current;
        saveCase(dataToSave).catch(console.error);
        onUpdateCase(dataToSave);
      }
    };
  }, [onUpdateCase]);

  // Fast, non-blocking field update with debounced autosave
  const updateField = useCallback((updater: (prev: PatientCase) => PatientCase) => {
    setLocalCase((prev) => {
      const next = updater(prev);
      latestLocalCaseRef.current = next;

      setSaveStatus('saving');
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveCase(next);
          onUpdateCase(next);
          setSaveStatus('saved');
        } catch (err) {
          console.error('Autosave error:', err);
        }
      }, 600);

      return next;
    });
  }, [onUpdateCase]);

  // Multiple Imaging Upload: Handles selecting and uploading multiple images in a single action
  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const totalFiles = files.length;
    setUploadProgress({ current: 0, total: totalFiles });

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: totalFiles });

        try {
          const { dataUrl, size } = await optimizeImageFile(file);
          const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

          const newImg: MedicalImage = {
            id: `img-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
            caseId: localCase.id,
            title: cleanTitle || `Scan ${images.length + i + 1}`,
            caption: '',
            modality: batchModality,
            studyDate: new Date().toISOString(),
            dataUrl,
            fileType: file.type || 'image/jpeg',
            fileSize: size,
            aspectsScore: '',
            interpretation: '',
            uploadedAt: new Date().toISOString(),
          };

          await saveImage(newImg);
        } catch (fileErr) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          alert(`Could not save image "${file.name}". File might be corrupted.`);
        }
      }

      await refreshImages();
      setIsImagingOpen(true);
    } catch (err) {
      console.error('Batch image upload error:', err);
      alert('Error during image upload: ' + err);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Fixed In-App Image Deletion: completely reliable in sandbox iframes without window.confirm
  const handleConfirmDeleteImage = async () => {
    if (!imageToDelete) return;
    setIsDeletingImage(true);
    setImageDeleteError(null);

    try {
      await deleteImage(imageToDelete.id);
      setImages((prev) => prev.filter((i) => i.id !== imageToDelete.id));
      await refreshImages();
      setImageToDelete(null);
    } catch (err) {
      console.error('Failed to delete image:', err);
      setImageDeleteError('Could not delete scan: ' + err);
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Update image metadata (caption, modality, date, interpretation)
  const handleSaveImageDetails = async () => {
    if (!editingImage) return;
    try {
      await saveImage(editingImage);
      await refreshImages();
      setEditingImage(null);
    } catch (err) {
      console.error('Failed to update scan details:', err);
      alert('Could not update scan details: ' + err);
    }
  };

  // Export Actions
  const handleExportPDF = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsExportMenuOpen(false);
    setIsExportingPDF(true);
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await saveCase(latestLocalCaseRef.current);
      onUpdateCase(latestLocalCaseRef.current);
      setSaveStatus('saved');

      const currentImgs = await getImagesForCase(localCase.id);
      await exportCaseToPDF(latestLocalCaseRef.current, currentImgs);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF: ' + err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportPNGReport = async () => {
    setIsExportMenuOpen(false);
    setIsExportingPNGReport(true);
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await saveCase(latestLocalCaseRef.current);
      onUpdateCase(latestLocalCaseRef.current);
      setSaveStatus('saved');

      const currentImgs = await getImagesForCase(localCase.id);
      await exportCaseReportToPNG(latestLocalCaseRef.current, currentImgs);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Failed to generate PNG report: ' + err);
    } finally {
      setIsExportingPNGReport(false);
    }
  };

  const handleExportPNGGallery = async () => {
    setIsExportMenuOpen(false);
    setIsExportingPNGGallery(true);
    try {
      const currentImgs = await getImagesForCase(localCase.id);
      await exportImagingGalleryToPNG(latestLocalCaseRef.current, currentImgs);
    } catch (err) {
      console.error('Imaging PNG gallery export failed:', err);
      alert('Failed to generate PNG gallery: ' + err);
    } finally {
      setIsExportingPNGGallery(false);
    }
  };

  // Case Lifecycle: Discharge
  const handleConfirmDischarge = () => {
    updateField((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        status: 'discharged',
        dischargedAt: new Date().toISOString(),
      },
      assessmentPlan: {
        ...prev.assessmentPlan,
        disposition: dischargeDisposition,
      },
    }));
    setIsDischargeModalOpen(false);
  };

  // Case Lifecycle: Reopen Discharged Case
  const handleReopenCase = () => {
    updateField((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        status: 'assessment',
      },
    }));
  };

  // Case Lifecycle: Move to Trash
  const handleMoveToTrash = () => {
    updateField((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        status: 'trash',
        trashedAt: new Date().toISOString(),
      },
    }));
  };

  // Case Lifecycle: Restore from Trash
  const handleRestoreFromTrash = () => {
    updateField((prev) => ({
      ...prev,
      identification: {
        ...prev.identification,
        status: 'assessment',
      },
    }));
  };

  // Case Lifecycle: Permanent Delete
  const handleConfirmPermanentDelete = () => {
    setIsPermanentDeleteModalOpen(false);
    onDeleteCase(localCase.id);
  };

  // NIHSS Record Added
  const handleAddNIHSSRecord = (record: NIHSSRecord) => {
    updateField((prev) => {
      const existing = prev.nihssAssessments || [];
      const updatedList = [record, ...existing];
      return {
        ...prev,
        nihssAssessments: updatedList,
        neuroExam: {
          ...prev.neuroExam,
          nihss: {
            totalScore: record.totalScore,
            severity: record.severity,
            notes: record.notes,
          },
        },
      };
    });
  };

  // GCS helpers
  const gcsEye = localCase.neuroExam?.gcs?.eye ?? 4;
  const gcsVerbal = localCase.neuroExam?.gcs?.verbal ?? 5;
  const gcsMotor = localCase.neuroExam?.gcs?.motor ?? 6;
  const numEye = typeof gcsEye === 'number' ? gcsEye : 0;
  const numVerbal = typeof gcsVerbal === 'number' ? gcsVerbal : 0;
  const numMotor = typeof gcsMotor === 'number' ? gcsMotor : 0;
  const numericGcsTotal = numEye + numVerbal + numMotor;

  const updateGCS = (key: 'eye' | 'verbal' | 'motor', value: number | 'U') => {
    updateField((prev) => {
      const curGcs = prev.neuroExam?.gcs || { eye: 4, verbal: 5, motor: 6, totalText: '15/15' };
      const nextGcs = { ...curGcs, [key]: value };
      const nE = typeof nextGcs.eye === 'number' ? nextGcs.eye : 0;
      const nV = typeof nextGcs.verbal === 'number' ? nextGcs.verbal : 0;
      const nM = typeof nextGcs.motor === 'number' ? nextGcs.motor : 0;
      const hasUntestable = nextGcs.eye === 'U' || nextGcs.verbal === 'U' || nextGcs.motor === 'U';
      const totText = hasUntestable
        ? `E${nextGcs.eye} V${nextGcs.verbal} M${nextGcs.motor}`
        : `E${nextGcs.eye} V${nextGcs.verbal} M${nextGcs.motor} = ${nE + nV + nM}/15`;

      return {
        ...prev,
        neuroExam: {
          ...prev.neuroExam,
          gcs: {
            ...nextGcs,
            totalText: totText,
            numericTotal: nE + nV + nM,
          },
        },
      };
    });
  };

  const arrivalFormatted = localCase.identification.arrivalTime
    ? new Date(localCase.identification.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const isDischarged = localCase.identification.status === 'discharged';
  const isTrashed = localCase.identification.status === 'trash';

  return (
    <div
      className={`rounded-xl border shadow-sm transition overflow-hidden ${
        isTrashed
          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
          : isDischarged
          ? 'border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-90'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      {/* ---------------- COLLAPSED / HEADER BAR ---------------- */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 sm:p-4 cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0"
            aria-label={isExpanded ? 'Collapse case' : 'Expand case'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-cyan-600" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {localCase.identification.id}
              </span>

              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {localCase.identification.age || '—'} {localCase.identification.sex}
              </span>

              {localCase.identification.initials && (
                <span className="text-xs text-slate-500">
                  ({localCase.identification.initials})
                </span>
              )}

              <span className="text-xs text-slate-500 font-mono">
                Arr: {arrivalFormatted}
              </span>

              {/* Status Badge */}
              <span
                className={`text-[11px] font-medium capitalize px-2 py-0.5 rounded border ${
                  isTrashed
                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                    : isDischarged
                    ? 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                    : 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200'
                }`}
              >
                {localCase.identification.status.replace('_', ' ')}
              </span>

              {/* Attached Scans Count Indicator */}
              {images.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {images.length} {images.length === 1 ? 'scan' : 'scans'}
                </span>
              )}

              {/* NIHSS Total Badge if available */}
              {(localCase.nihssAssessments?.length > 0 || localCase.neuroExam?.nihss?.totalScore !== undefined) && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold font-mono">
                  NIHSS: {localCase.nihssAssessments?.[0]?.totalScore ?? localCase.neuroExam?.nihss?.totalScore}/42
                </span>
              )}

              {/* Autosave Status */}
              <span className="text-[10px] font-mono ml-auto">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-500">● Saving...</span>
                ) : (
                  <span className="text-slate-400">✓ Saved</span>
                )}
              </span>
            </div>

            {/* Chief Complaint summary */}
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1">
              <strong>Complaint:</strong>{' '}
              {localCase.chiefComplaint?.symptom || (
                <span className="italic text-slate-400">Click to write chief complaint</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls Right */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800"
        >
          {/* If Discharged: Show Reopen button */}
          {isDischarged && (
            <button
              type="button"
              onClick={handleReopenCase}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              title="Reopen case and return to active patient list"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Case</span>
            </button>
          )}

          {/* If Trashed: Restore or Permanent Delete */}
          {isTrashed ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRestoreFromTrash}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPermanentDeleteModalOpen(true)}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                title="Permanently delete case"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Mark as Discharged */}
              {!isDischarged && (
                <button
                  type="button"
                  onClick={() => setIsDischargeModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
                  title="Discharge patient and preserve complete clinical history"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Discharge</span>
                </button>
              )}

              {/* Export Dropdown Menu (PDF + PNG Options) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExportingPDF || isExportingPNGReport || isExportingPNGGallery}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-95"
                >
                  {isExportingPDF || isExportingPNGReport || isExportingPNGGallery ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => handleExportPDF()}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <FileDown className="w-4 h-4 text-cyan-600" />
                      <span>Export Case as PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPNGReport}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <FileImage className="w-4 h-4 text-emerald-600" />
                      <span>Export Case as PNG (Pages)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPNGGallery}
                      disabled={images.length === 0}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>Export Imaging Gallery as PNG</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Move to Trash Button */}
              <button
                type="button"
                onClick={handleMoveToTrash}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Move case to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---------------- EXPANDED VIEW ---------------- */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-950/40 space-y-5">
          {/* Top Quick Details Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={localCase.identification.status}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, status: e.target.value as CaseStatus },
                    }))
                  }
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-medium"
                >
                  <option value="new">New</option>
                  <option value="assessment">Under Assessment</option>
                  <option value="investigations">Investigations Pending</option>
                  <option value="treatment">Treatment Initiated</option>
                  <option value="admitted">Admitted</option>
                  <option value="discharged">Discharged</option>
                  <option value="archived">Archived</option>
                  <option value="trash">Trash</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Initials:</span>
                <input
                  type="text"
                  value={localCase.identification.initials || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, initials: e.target.value.toUpperCase() },
                    }))
                  }
                  className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 uppercase text-center font-bold"
                  placeholder="Initials"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Age:</span>
                <input
                  type="number"
                  value={localCase.identification.age || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, age: e.target.value },
                    }))
                  }
                  className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center"
                  placeholder="Age"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Sex:</span>
                <select
                  value={localCase.identification.sex}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, sex: e.target.value as any },
                    }))
                  }
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Bed:</span>
                <input
                  type="text"
                  value={localCase.identification.bedLocation || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, bedLocation: e.target.value },
                    }))
                  }
                  className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
                  placeholder="Bed / Bay"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">LKW:</span>
                <input
                  type="datetime-local"
                  value={localCase.identification.lastKnownWell ? localCase.identification.lastKnownWell.slice(0, 16) : ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      identification: { ...prev.identification, lastKnownWell: e.target.value ? new Date(e.target.value).toISOString() : '' },
                    }))
                  }
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                />
              </div>
            </div>

            {/* Quick Export Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
            >
              {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>{isExportingPDF ? 'Generating...' : 'Export Case as PDF'}</span>
            </button>
          </div>

          {/* ================= 1. HISTORY SECTION ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>1. History</span>
              <span className="text-xs font-normal text-slate-500">
                Clinical history, onset timing &amp; TIA risk stratification
              </span>
            </h4>

            {/* High Visual Priority Prominent LKW Callout */}
            <LKWCallout patientCase={localCase} onUpdateCase={updateField} />

            {/* Chief Complaint Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Chief Complaint &amp; Onset
              </label>
              <textarea
                rows={2}
                value={localCase.chiefComplaint?.symptom || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    chiefComplaint: { ...prev.chiefComplaint, symptom: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                placeholder="Chief presenting complaint, onset time, mode of onset..."
              />
            </div>

            {/* HPI Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                History of Present Illness (HPI)
              </label>
              <textarea
                rows={4}
                value={localCase.history?.hpi || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    history: { ...prev.history, hpi: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 min-h-[90px]"
                placeholder="Detailed chronological history of present illness, symptom evolution, collateral witnesses..."
              />
            </div>

            {/* Past Medical History Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Past Medical &amp; Neurological History
              </label>
              <textarea
                rows={2}
                value={localCase.history?.pastMedical || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    history: { ...prev.history, pastMedical: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                placeholder="Hypertension, diabetes, prior stroke/TIA, seizures, cardiac history..."
              />
            </div>

            {/* Current Medications & Allergies Plain Text Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Medications (especially Anticoagulants / Antiplatelets)
                </label>
                <textarea
                  rows={2}
                  value={localCase.history?.medications || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      history: { ...prev.history, medications: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                  placeholder="Medication names, dosages, timing of last dose..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mb-1">
                  Drug Allergies
                </label>
                <textarea
                  rows={2}
                  value={localCase.history?.allergies || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      history: { ...prev.history, allergies: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 p-2 text-xs text-slate-900 dark:text-slate-100 font-medium"
                  placeholder="List known drug allergies or 'NKDA'..."
                />
              </div>
            </div>

            {/* ABCD2 Score Calculator (Linked directly to History Section) */}
            <ABCD2ScoreSection patientCase={localCase} onUpdateCase={updateField} />
          </div>

          {/* ================= 2. EXAMINATION SECTION (WITH HUMAN BODY DIAGRAM) ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>2. Examination</span>
              <span className="text-xs font-normal text-slate-500">
                Structured Neurological &amp; General Examination
              </span>
            </h4>

            {/* Vital Signs Row */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Vital Signs &amp; Blood Glucose
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">BP (mmHg)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={localCase.vitals?.bpSys || ''}
                      onChange={(e) =>
                        updateField((prev) => ({
                          ...prev,
                          vitals: { ...prev.vitals, bpSys: e.target.value },
                        }))
                      }
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 font-bold text-center"
                      placeholder="Sys"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={localCase.vitals?.bpDia || ''}
                      onChange={(e) =>
                        updateField((prev) => ({
                          ...prev,
                          vitals: { ...prev.vitals, bpDia: e.target.value },
                        }))
                      }
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 font-bold text-center"
                      placeholder="Dia"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">HR (bpm)</span>
                  <input
                    type="number"
                    value={localCase.vitals?.hr || ''}
                    onChange={(e) =>
                      updateField((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, hr: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-center font-bold"
                    placeholder="HR"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">SpO2 (%)</span>
                  <input
                    type="number"
                    value={localCase.vitals?.spo2 || ''}
                    onChange={(e) =>
                      updateField((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, spo2: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-center font-bold"
                    placeholder="SpO2"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Temp (°C)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={localCase.vitals?.temp || ''}
                    onChange={(e) =>
                      updateField((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, temp: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-center"
                    placeholder="Temp"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold block">CBG (mg/dL)</span>
                  <input
                    type="number"
                    value={localCase.vitals?.cbg || ''}
                    onChange={(e) =>
                      updateField((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, cbg: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-cyan-300 dark:border-cyan-700 p-1 text-center font-bold text-cyan-800 dark:text-cyan-200"
                    placeholder="Glucose"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">NIHSS Score</span>
                  <input
                    type="number"
                    value={localCase.nihssAssessments?.[0]?.totalScore ?? (localCase.neuroExam?.nihss?.totalScore ?? 0)}
                    onChange={(e) => {
                      const score = parseInt(e.target.value, 10) || 0;
                      updateField((prev) => ({
                        ...prev,
                        neuroExam: {
                          ...prev.neuroExam,
                          nihss: { ...prev.neuroExam?.nihss, totalScore: score },
                        },
                      }));
                    }}
                    className="w-full rounded border border-rose-300 dark:border-rose-700 p-1 text-center font-bold text-rose-700 dark:text-rose-300"
                    placeholder="NIHSS"
                  />
                </div>
              </div>
            </div>

            {/* ---------------- 1. GCS ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  1. Glasgow Coma Scale (GCS)
                </span>
                <span className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold ${
                  numericGcsTotal <= 8
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                    : numericGcsTotal <= 12
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                }`}>
                  Total: {localCase.neuroExam?.gcs?.totalText || `${numericGcsTotal}/15`}
                </span>
              </div>

              {/* Eye, Verbal, Motor Button Groups */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Eye Opening (1-4, U) */}
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                    Eye Opening (E: 1–4)
                  </span>
                  <div className="flex items-center gap-1">
                    {[4, 3, 2, 1, 'U'].map((val) => (
                      <button
                        key={`eye-${val}`}
                        type="button"
                        onClick={() => updateGCS('eye', val as any)}
                        className={`flex-1 py-1 rounded border text-xs font-bold transition ${
                          gcsEye === val
                            ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {gcsEye === 4 ? '4: Spontaneous' : gcsEye === 3 ? '3: To speech' : gcsEye === 2 ? '2: To pain' : gcsEye === 1 ? '1: None' : 'U: Untestable'}
                  </span>
                </div>

                {/* Verbal Response (1-5, U) */}
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                    Verbal Response (V: 1–5)
                  </span>
                  <div className="flex items-center gap-1">
                    {[5, 4, 3, 2, 1, 'U'].map((val) => (
                      <button
                        key={`verbal-${val}`}
                        type="button"
                        onClick={() => updateGCS('verbal', val as any)}
                        className={`flex-1 py-1 rounded border text-xs font-bold transition ${
                          gcsVerbal === val
                            ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {gcsVerbal === 5 ? '5: Oriented' : gcsVerbal === 4 ? '4: Confused' : gcsVerbal === 3 ? '3: Words' : gcsVerbal === 2 ? '2: Sounds' : gcsVerbal === 1 ? '1: None' : 'U: Untestable'}
                  </span>
                </div>

                {/* Motor Response (1-6, U) */}
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                    Motor Response (M: 1–6)
                  </span>
                  <div className="flex items-center gap-1">
                    {[6, 5, 4, 3, 2, 1, 'U'].map((val) => (
                      <button
                        key={`motor-${val}`}
                        type="button"
                        onClick={() => updateGCS('motor', val as any)}
                        className={`flex-1 py-1 rounded border text-xs font-bold transition ${
                          gcsMotor === val
                            ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {gcsMotor === 6 ? '6: Obeys' : gcsMotor === 5 ? '5: Localizes' : gcsMotor === 4 ? '4: Flexion' : gcsMotor === 3 ? '3: Decorticate' : gcsMotor === 2 ? '2: Extension' : gcsMotor === 1 ? '1: None' : 'U: Untestable'}
                  </span>
                </div>
              </div>

              {/* GCS Notes */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-0.5">
                  GCS Notes &amp; Untestable Reasons (e.g. Intubated 'T', Aphasic, Eye Swelling, Pupil Reactivity)
                </label>
                <textarea
                  rows={2}
                  value={localCase.neuroExam?.gcs?.notes || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      neuroExam: {
                        ...prev.neuroExam,
                        gcs: { ...prev.neuroExam?.gcs, notes: e.target.value } as any,
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                  placeholder="Document specific stimuli, eye opening details, intubation status, sedatives, pupil symmetry and response..."
                />
              </div>
            </div>

            {/* ---------------- 2. MOTOR EXAMINATION (HUMAN BODY DIAGRAM) ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                2. Motor Examination — Front-Facing Anatomical Body Diagram (MRC 0–5)
              </span>

              {/* Front-Facing Human Body Diagram Component */}
              <MotorBodyDiagram
                rightUpper={localCase.neuroExam?.motor?.rightUpperPower ?? 5}
                leftUpper={localCase.neuroExam?.motor?.leftUpperPower ?? 5}
                rightLower={localCase.neuroExam?.motor?.rightLowerPower ?? 5}
                leftLower={localCase.neuroExam?.motor?.leftLowerPower ?? 5}
                onChange={(limb, grade) => {
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      motor: {
                        ...prev.neuroExam?.motor,
                        [limb]: grade,
                      } as any,
                    },
                  }));
                }}
              />

              {/* Detailed Motor Examination Text Area */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Motor Examination Notes (Muscle tone, pronator drift, involuntary movements, distribution of weakness, reflexes)
                </label>
                <textarea
                  rows={3}
                  value={
                    localCase.neuroExam?.motor?.generalMotorNotes ||
                    localCase.neuroExam?.motor?.toneNotes ||
                    ''
                  }
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      neuroExam: {
                        ...prev.neuroExam,
                        motor: { ...prev.neuroExam?.motor, generalMotorNotes: e.target.value } as any,
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                  placeholder="Document spasticity/rigidity/flaccidity, pronator drift, myoclonus, chorea, asterixis, distal vs proximal weakness..."
                />
              </div>
            </div>

            {/* ---------------- 3. SENSORY EXAMINATION ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                3. Sensory Examination (Light Touch, Pain/Pinprick, Temp, Vibration, Joint Position Sense, Cortical Modalities)
              </span>
              <textarea
                rows={3}
                value={
                  localCase.neuroExam?.sensory?.overallSensoryNotes ||
                  localCase.neuroExam?.sensory?.lightTouch ||
                  ''
                }
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      sensory: { ...prev.neuroExam?.sensory, overallSensoryNotes: e.target.value } as any,
                    },
                  }))
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="Light touch, pinprick, cold sensation, vibration at malleoli/thumbs, proprioception/joint position sense, sensory extinction, tactile neglect..."
              />
            </div>

            {/* ---------------- 4. CRANIAL NERVES ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                4. Cranial Nerves (CN I to XII Assessment)
              </span>
              <textarea
                rows={3}
                value={
                  localCase.neuroExam?.cranialNerves?.overallCranialNotes ||
                  localCase.neuroExam?.cranialNerves?.cn2_optic ||
                  ''
                }
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      cranialNerves: { ...prev.neuroExam?.cranialNerves, overallCranialNotes: e.target.value } as any,
                    },
                  }))
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="CN I (Olfactory), CN II (Visual acuity, fields, pupils PERRL), CN III/IV/VI (EOM, diplopia, ptosis, nystagmus, conjugate gaze), CN V (Facial sensation, corneal reflex), CN VII (Facial symmetry, UMN vs LMN), CN VIII (Hearing, vestibular), CN IX/X (Palate, gag), CN XI (SCM, trapezius), CN XII (Tongue deviation)..."
              />
            </div>

            {/* ---------------- 5. BULBAR EXAMINATION ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                5. Bulbar Examination (Speech Articulation, Swallowing, Phonation, Palatal Movement, Gag Reflex, Tongue)
              </span>
              <textarea
                rows={3}
                value={
                  localCase.neuroExam?.bulbar?.bulbarNotes ||
                  localCase.neuroExam?.bulbar?.speechArticulation ||
                  ''
                }
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      bulbar: { ...prev.neuroExam?.bulbar, bulbarNotes: e.target.value } as any,
                    },
                  }))
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="Dysarthria (flaccid, spastic, ataxic), dysphonia/nasal speech, swallowing safety (aspiration risk / NPO status), bilateral palatal elevation, gag reflex, tongue strength..."
              />
            </div>

            {/* ---------------- 6. SPHINCTER FUNCTION ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                6. Sphincter Function (Urinary &amp; Bowel Continence, Sphincter Tone, Perianal Sensation)
              </span>
              <textarea
                rows={2}
                value={
                  localCase.neuroExam?.sphincter?.sphincterNotes ||
                  localCase.neuroExam?.sphincter?.urinaryControl ||
                  ''
                }
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      sphincter: { ...prev.neuroExam?.sphincter, sphincterNotes: e.target.value } as any,
                    },
                  }))
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="Urinary incontinence, acute retention, Foley catheter, bowel continence, anal sphincter tone, bulbocavernosus reflex, S4-S5 sacral sensation..."
              />
            </div>

            {/* ---------------- 7. PLANTAR REFLEX ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                7. Plantar Reflex &amp; Deep Tendon Reflexes
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Right Plantar */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Right Plantar Response:
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['Flexor', 'Extensor (Babinski +)', 'Equivocal', 'Not assessed'] as PlantarResponse[]).map((resp) => (
                      <button
                        key={`r-plantar-${resp}`}
                        type="button"
                        onClick={() =>
                          updateField((prev) => ({
                            ...prev,
                            neuroExam: {
                              ...prev.neuroExam,
                              plantars: { ...prev.neuroExam?.plantars, right: resp } as any,
                            },
                          }))
                        }
                        className={`py-1 px-1.5 rounded border text-[11px] font-medium transition text-center truncate ${
                          (localCase.neuroExam?.plantars?.right || 'Flexor') === resp
                            ? resp.includes('Extensor')
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-cyan-700 text-white border-cyan-800'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {resp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Left Plantar */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Left Plantar Response:
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['Flexor', 'Extensor (Babinski +)', 'Equivocal', 'Not assessed'] as PlantarResponse[]).map((resp) => (
                      <button
                        key={`l-plantar-${resp}`}
                        type="button"
                        onClick={() =>
                          updateField((prev) => ({
                            ...prev,
                            neuroExam: {
                              ...prev.neuroExam,
                              plantars: { ...prev.neuroExam?.plantars, left: resp } as any,
                            },
                          }))
                        }
                        className={`py-1 px-1.5 rounded border text-[11px] font-medium transition text-center truncate ${
                          (localCase.neuroExam?.plantars?.left || 'Flexor') === resp
                            ? resp.includes('Extensor')
                              ? 'bg-rose-600 text-white border-rose-700'
                              : 'bg-cyan-700 text-white border-cyan-800'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {resp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plantar Notes */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-0.5">
                  Reflex Examination Notes (Deep tendon reflexes: Biceps, Triceps, Brachioradialis, Knee, Ankle, Clonus)
                </label>
                <textarea
                  rows={2}
                  value={localCase.neuroExam?.plantars?.notes || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      neuroExam: {
                        ...prev.neuroExam,
                        plantars: { ...prev.neuroExam?.plantars, notes: e.target.value } as any,
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                  placeholder="Document DTR grades (0-4+), sustained vs unsustained ankle clonus, Hoffman sign, Chaddock/Oppenheim..."
                />
              </div>
            </div>

            {/* ---------------- 8. GENERAL EXAMINATION ---------------- */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                8. General Examination (Dedicated Field Preserved for General Medical Findings)
              </span>
              <textarea
                rows={3}
                value={
                  localCase.neuroExam?.generalExamNotes ||
                  localCase.vitals?.generalCondition ||
                  ''
                }
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    neuroExam: {
                      ...prev.neuroExam,
                      generalExamNotes: e.target.value,
                    },
                  }))
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="General appearance, hydration, cardiovascular (rhythm, murmurs, carotid bruits), respiratory (breath sounds, wheezes, crepitations), abdomen (soft, nontender), meningeal signs (neck stiffness, Kernig, Brudzinski), skin (rashes, stigmata, needle marks), trauma signs (Battle sign, raccoon eyes, lacerations)..."
              />
            </div>
          </div>

          {/* ================= DETAILED NIHSS CALCULATOR SECTION ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  NIH Stroke Scale (NIHSS) Tool
                </h4>
                <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                  Current Score: {localCase.nihssAssessments?.[0]?.totalScore ?? (localCase.neuroExam?.nihss?.totalScore ?? '0')}/42
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsNIHSSCalculatorOpen(!isNIHSSCalculatorOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                <span>{isNIHSSCalculatorOpen ? 'Hide NIHSS Tool' : 'Open NIHSS Bedside Form'}</span>
                {isNIHSSCalculatorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isNIHSSCalculatorOpen ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <NIHSSCalculator
                  records={localCase.nihssAssessments || []}
                  onAddRecord={handleAddNIHSSRecord}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Official 11-item / 15-domain NIH Stroke Scale evaluation. Records baseline and longitudinal assessments with timestamps.
              </p>
            )}
          </div>

          {/* ================= 3. INVESTIGATIONS SECTION ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>3. Investigations</span>
            </h4>

            {/* Quick Labs summary inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">INR (Coags)</label>
                <input
                  type="text"
                  value={localCase.investigations?.coagulation?.inr || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      investigations: {
                        ...prev.investigations,
                        coagulation: { ...prev.investigations.coagulation, inr: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-1.5 font-bold"
                  placeholder="e.g. 1.1"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Platelets</label>
                <input
                  type="text"
                  value={localCase.investigations?.cbc?.platelets || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      investigations: {
                        ...prev.investigations,
                        cbc: { ...prev.investigations.cbc, platelets: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-1.5"
                  placeholder="e.g. 235 x10^9"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Creatinine</label>
                <input
                  type="text"
                  value={localCase.investigations?.renal?.cr || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      investigations: {
                        ...prev.investigations,
                        renal: { ...prev.investigations.renal, cr: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-1.5"
                  placeholder="e.g. 0.9 mg/dL"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Sodium (Na)</label>
                <input
                  type="text"
                  value={localCase.investigations?.electrolytes?.na || ''}
                  onChange={(e) =>
                    updateField((prev) => ({
                      ...prev,
                      investigations: {
                        ...prev.investigations,
                        electrolytes: { ...prev.investigations.electrolytes, na: e.target.value },
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-1.5"
                  placeholder="e.g. 138"
                />
              </div>
            </div>

            {/* Investigations Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Laboratory Findings, CSF Analysis &amp; ECG Findings
              </label>
              <textarea
                rows={3}
                value={localCase.investigations?.ecgFindings || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    investigations: { ...prev.investigations, ecgFindings: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
                placeholder="CBC, electrolytes, troponin, ECG rhythm/changes, lumbar puncture opening pressure, CSF analysis..."
              />
            </div>
          </div>

          {/* ================= 4. IMAGING SECTION (MULTIPLE UPLOADS & EMBEDDED GALLERY) ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>4. Imaging</span>
                <span className="text-xs font-normal text-slate-500">
                  ({images.length} {images.length === 1 ? 'study' : 'studies'} attached)
                </span>
              </h4>

              {/* Toggle Imaging Tray */}
              <button
                type="button"
                onClick={() => setIsImagingOpen(!isImagingOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  isImagingOpen
                    ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 text-cyan-800 dark:text-cyan-200'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-cyan-600" />
                <span>{isImagingOpen ? 'Hide Imaging Gallery' : 'Toggle Add / View Imaging'}</span>
                {isImagingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Toggled Open Imaging Tray */}
            {isImagingOpen ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Upload Control Bar */}
                <div className="p-3 rounded-lg bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Default Modality:
                    </span>
                    <select
                      value={batchModality}
                      onChange={(e) => setBatchModality(e.target.value as any)}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                    >
                      <option value="CT Brain (Non-contrast)">CT Brain (Non-contrast)</option>
                      <option value="CT Angiography (CTA Head & Neck)">CT Angiography (CTA)</option>
                      <option value="CT Perfusion (CTP)">CT Perfusion (CTP)</option>
                      <option value="MRI Brain (DWI/FLAIR)">MRI Brain (DWI/FLAIR)</option>
                      <option value="MRI Brain (T2*/SWI)">MRI Brain (T2*/SWI)</option>
                      <option value="Carotid Doppler Ultrasound">Carotid Doppler</option>
                      <option value="Chest X-Ray">Chest X-Ray</option>
                      <option value="ECG Rhythm Strip">ECG Rhythm Strip</option>
                      <option value="EEG">EEG</option>
                      <option value="Medical Document / Lab Report">Document / Report</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* MULTIPLE IMAGE FILE PICKER */}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-semibold cursor-pointer shadow-sm text-xs transition active:scale-95">
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploadProgress
                          ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`
                          : '+ Select Images to Upload'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleMultiImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Select multiple JPG, JPEG, PNG, or WEBP images from device gallery or files. Each scan is safely stored locally in IndexedDB and automatically embedded in the exported PDF and PNG reports.
                </p>

                {/* Thumbnail Gallery */}
                {images.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg space-y-1">
                    <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">No scans attached yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Click "+ Select Images to Upload" above to add CT, CTA, MRI, or X-Ray scans.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 flex flex-col justify-between text-xs space-y-2 group"
                      >
                        {/* Thumbnail Viewport */}
                        <div
                          onClick={() => onOpenImageViewer(images, img.id)}
                          className="h-32 bg-slate-950 rounded flex items-center justify-center cursor-pointer overflow-hidden relative"
                          title="Click to open full-screen viewer with zoom/pan"
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <span className="px-2 py-1 rounded bg-black/80 text-white text-[11px] flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Open
                            </span>
                          </div>
                        </div>

                        {/* Scan Details */}
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold truncate">
                              {img.modality}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                            {img.title || `Scan ${idx + 1}`}
                          </div>

                          {img.caption && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic truncate mt-0.5">
                              {img.caption}
                            </p>
                          )}

                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(img.studyDate || img.uploadedAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>

                        {/* Action buttons: View, Edit, and CLEARLY VISIBLE TRASH DELETE BUTTON */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenImageViewer(images, img.id)}
                              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingImage({ ...img })}
                              className="text-slate-600 dark:text-slate-400 hover:text-cyan-600 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                          </div>

                          {/* Clearly visible Delete Trash Button with Confirmation Modal trigger */}
                          <button
                            type="button"
                            onClick={() => setImageToDelete(img)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-medium transition"
                            title="Delete this scan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Compact single-line summary when toggled closed */
              <div
                onClick={() => setIsImagingOpen(true)}
                className="cursor-pointer p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:border-cyan-500 transition"
              >
                <span>
                  {images.length > 0 ? (
                    <>
                      📷 <strong>{images.length} {images.length === 1 ? 'scan' : 'scans'} attached</strong>: {images.map((i) => i.modality).slice(0, 3).join(', ')}
                      {images.length > 3 ? ` +${images.length - 3} more` : ''}
                    </>
                  ) : (
                    '📷 No scans attached yet (Click to toggle and add scans)'
                  )}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Click to Open Gallery &rarr;</span>
              </div>
            )}
          </div>

          {/* ================= 5. ASSESSMENT & PLAN SECTION ================= */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>5. Assessment &amp; Plan</span>
            </h4>

            {/* Working Diagnosis Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Working Diagnosis &amp; Clinical Localization
              </label>
              <input
                type="text"
                value={localCase.assessmentPlan?.workingDiagnosis || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    assessmentPlan: { ...prev.assessmentPlan, workingDiagnosis: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-bold text-slate-900 dark:text-slate-100"
                placeholder="e.g. Acute Ischemic Stroke secondary to Left M1 MCA Occlusion"
              />
            </div>

            {/* Management Plan Plain Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Emergency Management Plan &amp; Interventions
              </label>
              <textarea
                rows={5}
                value={localCase.assessmentPlan?.managementPlan || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    assessmentPlan: { ...prev.assessmentPlan, managementPlan: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 min-h-[90px]"
                placeholder="1. Administer IV Tenecteplase...&#10;2. Transport to Angiosuite for thrombectomy...&#10;3. Maintain blood pressure targets...&#10;4. Consultations &amp; disposition..."
              />
            </div>

            {/* Disposition */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Patient Disposition / Transfer
              </label>
              <input
                type="text"
                value={localCase.assessmentPlan?.disposition || ''}
                onChange={(e) =>
                  updateField((prev) => ({
                    ...prev,
                    assessmentPlan: { ...prev.assessmentPlan, disposition: e.target.value },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-xs font-medium text-slate-900 dark:text-slate-100"
                placeholder="e.g. Admit to Neuro ICU Bed 4"
              />
            </div>
          </div>

          {/* Bottom Controls Bar with Export Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Auto-saved locally in browser IndexedDB
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition active:scale-95"
              >
                {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>Export Case as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportPNGReport}
                disabled={isExportingPNGReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs transition"
                title="Export complete case report as high-resolution PNG pages"
              >
                {isExportingPNGReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4 text-emerald-600" />}
                <span>Export as PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- IN-APP IMAGE DELETION CONFIRMATION MODAL ---------------- */}
      {/* Works 100% reliably in sandboxed iframes without window.confirm */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-200 dark:border-rose-900/60 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Confirm Scan Deletion
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete scan <strong className="text-slate-900 dark:text-slate-100">"{imageToDelete.title}"</strong> from this patient's case record?
            </p>
            <p className="text-[11px] text-slate-500">
              This will remove the image file and its reference from IndexedDB and all future PDF/PNG exports. Other scans will remain intact.
            </p>

            {imageDeleteError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-medium">
                {imageDeleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                disabled={isDeletingImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteImage}
                disabled={isDeletingImage}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition active:scale-95"
              >
                {isDeletingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingImage ? 'Deleting...' : 'Delete Scan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DISCHARGE PATIENT MODAL ---------------- */}
      {isDischargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Mark Patient as Discharged
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDischargeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              This will update the case status to <strong>Discharged</strong> and move it from the default Active list to <strong>Discharged / History</strong>.
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-900">
              ✓ All clinical history, NIHSS assessments, progress notes, and neuroimaging studies are strictly preserved and can be reopened or exported at any time.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                Discharge Disposition / Destination:
              </label>
              <input
                type="text"
                value={dischargeDisposition}
                onChange={(e) => setDischargeDisposition(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-xs"
                placeholder="e.g. Discharged home with outpatient Neurology follow-up"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDischargeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDischarge}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                Confirm Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PERMANENT DELETE MODAL ---------------- */}
      {isPermanentDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-rose-300 dark:border-rose-900 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Permanently Delete Case?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete case <strong className="text-slate-900 dark:text-slate-100">{localCase.id}</strong>?
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded">
              Warning: This will permanently erase the case record and all attached scans from local browser storage. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPermanentDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Image Metadata (Caption, Modality, Date, Interpretation) */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Edit Scan Information
              </h3>
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Title / Slice Label
                </label>
                <input
                  type="text"
                  value={editingImage.title}
                  onChange={(e) => setEditingImage({ ...editingImage, title: e.target.value })}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Modality
                </label>
                <select
                  value={editingImage.modality}
                  onChange={(e) => setEditingImage({ ...editingImage, modality: e.target.value as any })}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2"
                >
                  <option value="CT Brain (Non-contrast)">CT Brain (Non-contrast)</option>
                  <option value="CT Angiography (CTA Head & Neck)">CT Angiography (CTA)</option>
                  <option value="CT Perfusion (CTP)">CT Perfusion (CTP)</option>
                  <option value="MRI Brain (DWI/FLAIR)">MRI Brain (DWI/FLAIR)</option>
                  <option value="MRI Brain (T2*/SWI)">MRI Brain (T2*/SWI)</option>
                  <option value="Carotid Doppler Ultrasound">Carotid Doppler</option>
                  <option value="Chest X-Ray">Chest X-Ray</option>
                  <option value="ECG Rhythm Strip">ECG Rhythm Strip</option>
                  <option value="EEG">EEG</option>
                  <option value="Medical Document / Lab Report">Document / Report</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={editingImage.caption || ''}
                  onChange={(e) => setEditingImage({ ...editingImage, caption: e.target.value })}
                  placeholder="e.g. Axial NCCT showing hyperdense left MCA sign"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Radiological Report / Interpretation
                </label>
                <textarea
                  rows={3}
                  value={editingImage.interpretation || ''}
                  onChange={(e) => setEditingImage({ ...editingImage, interpretation: e.target.value })}
                  placeholder="Document radiological findings, absence of hemorrhage, infarct distribution..."
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveImageDetails}
                className="px-4 py-1.5 rounded bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
