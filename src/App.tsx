import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PatientCase, MedicalImage } from './types/medical';
import {
  getAllCases,
  saveCase,
  deleteCase,
  saveImage,
  deleteImage,
} from './services/db';
import { getInitialSeedCases } from './services/seedData';
import { Header } from './components/Header';
import { CaseCard } from './components/CaseCard';
import { NewCaseModal } from './components/NewCaseModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { HandoffModal } from './components/HandoffModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { AlertCircle, Plus, Check } from 'lucide-react';

export default function App() {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('neuroer_darkmode');
    return saved !== null ? saved === 'true' : false; // clean, pleasant default
  });

  // Online status
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Modals
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [handoffCaseId, setHandoffCaseId] = useState<string | undefined>(undefined);

  // Lightbox ImageViewer modal
  const [imageViewerTarget, setImageViewerTarget] = useState<{ images: MedicalImage[]; imageId: string } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('neuroer_darkmode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('neuroer_darkmode', 'false');
    }
  }, [darkMode]);

  // Online / offline listeners & SW registration
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for offline PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize cases from IndexedDB or populate seed cases if fresh install
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    setIsLoading(true);
    try {
      const storedCases = await getAllCases();
      if (!storedCases || storedCases.length === 0) {
        const { cases: seedCases, images: seedImages } = getInitialSeedCases();
        for (const c of seedCases) {
          await saveCase(c);
        }
        for (const img of seedImages) {
          await saveImage(img);
        }
        setCases(seedCases);
        // Expand the first case by default
        if (seedCases.length > 0) {
          setExpandedCaseIds(new Set([seedCases[0].id]));
        }
      } else {
        setCases(storedCases);
        if (storedCases.length > 0) {
          setExpandedCaseIds(new Set([storedCases[0].id]));
        }
      }
    } catch (err) {
      console.error('Failed to load IndexedDB cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stable callback for updating a case in parent state
  const handleUpdateCase = useCallback((updated: PatientCase) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  // Stable callback for deleting a case
  const handleDeleteCase = useCallback(async (caseId: string) => {
    await deleteCase(caseId);
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    setExpandedCaseIds((prev) => {
      const next = new Set(prev);
      next.delete(caseId);
      return next;
    });
    showToast(`Case ${caseId} deleted.`);
  }, [showToast]);

  // New Case created
  const handleCaseCreated = async (newCase: PatientCase) => {
    await saveCase(newCase);
    setCases((prev) => [newCase, ...prev]);
    setIsNewCaseOpen(false);
    setExpandedCaseIds((prev) => new Set([...prev, newCase.id]));
    showToast(`Case ${newCase.id} created.`);
  };

  // Expand / Collapse
  const handleExpandAll = useCallback(() => {
    const allIds = new Set(cases.map((c) => c.id));
    setExpandedCaseIds(allIds);
  }, [cases]);

  const handleCollapseAll = useCallback(() => {
    setExpandedCaseIds(new Set());
  }, []);

  const toggleExpand = useCallback((caseId: string) => {
    setExpandedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }, []);

  const handleOpenImageViewer = useCallback((images: MedicalImage[], imageId: string) => {
    setImageViewerTarget({ images, imageId });
  }, []);

  // Filter cases (minimal, ultra-fast)
  const filteredCases = useMemo(() => {
    let result = cases;

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((c) => !c.archived && c.identification.status !== 'discharged');
    } else if (statusFilter === 'archived') {
      result = result.filter((c) => c.archived || c.identification.status === 'archived');
    } else if (statusFilter !== 'all') {
      result = result.filter((c) => c.identification.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const idMatch = c.identification.id.toLowerCase().includes(q);
        const initialsMatch = (c.identification.initials || '').toLowerCase().includes(q);
        const complaintMatch = (c.chiefComplaint?.symptom || '').toLowerCase().includes(q);
        const dxMatch = (c.assessmentPlan?.workingDiagnosis || '').toLowerCase().includes(q);
        return idMatch || initialsMatch || complaintMatch || dxMatch;
      });
    }

    return result;
  }, [cases, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Clean Minimal Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onNewCase={() => setIsNewCaseOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenHandoff={() => {
          setHandoffCaseId(undefined);
          setIsHandoffOpen(true);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        isOnline={isOnline}
      />

      {/* Main Screen: Clean list of patient cards */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-7 h-7 border-3 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-mono">Loading patient cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No matching patient records
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'active'
                ? 'Try adjusting your search query or status filter.'
                : 'Click below to create your first emergency patient case note.'}
            </p>
            <button
              onClick={() => setIsNewCaseOpen(true)}
              className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> + New Case
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <CaseCard
                key={c.id}
                patientCase={c}
                isExpanded={expandedCaseIds.has(c.id)}
                onToggleExpand={() => toggleExpand(c.id)}
                onUpdateCase={handleUpdateCase}
                onDeleteCase={handleDeleteCase}
                onOpenImageViewer={handleOpenImageViewer}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* New Case Modal */}
      {isNewCaseOpen && (
        <NewCaseModal
          existingCaseIds={cases.map((c) => c.id)}
          onCaseCreated={handleCaseCreated}
          onClose={() => setIsNewCaseOpen(false)}
        />
      )}

      {/* Backup & Restore Modal */}
      {isBackupOpen && (
        <BackupRestoreModal
          cases={cases}
          onReloadRequested={loadDatabase}
          onClose={() => setIsBackupOpen(false)}
        />
      )}

      {/* Shift Handoff SBAR Modal */}
      {isHandoffOpen && (
        <HandoffModal
          cases={cases}
          selectedCaseId={handoffCaseId}
          onClose={() => setIsHandoffOpen(false)}
        />
      )}

      {/* Full-Screen Image Lightbox Viewer with Pan/Zoom/Invert */}
      {imageViewerTarget && (
        <ImageViewerModal
          images={imageViewerTarget.images}
          initialImageId={imageViewerTarget.imageId}
          onClose={() => setImageViewerTarget(null)}
          onDeleteImage={async (imageId) => {
            await deleteImage(imageId);
            setImageViewerTarget(null);
            showToast('Image removed.');
          }}
          onUpdateInterpretation={async (imageId, interpretation, aspects) => {
            const img = imageViewerTarget.images.find((x) => x.id === imageId);
            if (img) {
              img.interpretation = interpretation;
              if (aspects !== undefined) img.aspectsScore = aspects;
              await saveImage(img);
              showToast('Radiology notes updated.');
            }
          }}
        />
      )}
    </div>
  );
}
