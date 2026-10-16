import React, { useState, useEffect } from 'react';
import { exportAllDataJSON, importBackupJSON, getStorageStats } from '../services/db';
import { Download, Upload, Database, RefreshCw, AlertTriangle, FileSpreadsheet, HardDrive } from 'lucide-react';
import { PatientCase } from '../types/medical';

interface Props {
  cases: PatientCase[];
  onReloadRequested: () => void;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<Props> = ({ cases, onReloadRequested, onClose }) => {
  const [stats, setStats] = useState<{
    usageBytes: number;
    quotaBytes: number;
    casesCount: number;
    imagesCount: number;
  }>({ usageBytes: 0, quotaBytes: 0, casesCount: 0, imagesCount: 0 });

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await getStorageStats();
    setStats(s);
  };

  const handleDownloadJSON = async () => {
    try {
      const json = await exportAllDataJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `NeuroER_Cases_Backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate backup: ' + e);
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      'Case ID',
      'Age',
      'Sex',
      'Arrival Time',
      'Triage',
      'Status',
      'Chief Complaint',
      'LKW',
      'NIHSS',
      'Working Diagnosis',
      'Disposition',
    ];

    const rows = cases.map((c) => [
      `"${c.id}"`,
      c.identification.age,
      `"${c.identification.sex}"`,
      `"${new Date(c.identification.arrivalTime).toISOString()}"`,
      `"${c.identification.triage}"`,
      `"${c.identification.status}"`,
      `"${(c.chiefComplaint.symptom || '').replace(/"/g, '""')}"`,
      `"${new Date(c.identification.lastKnownWell).toISOString()}"`,
      c.neuroExam?.nihss?.totalScore ?? 0,
      `"${(c.assessmentPlan.workingDiagnosis || '').replace(/"/g, '""')}"`,
      `"${(c.assessmentPlan.disposition || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NeuroER_Case_Index_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        const res = await importBackupJSON(content);
        if (res.success) {
          setImportStatus(`Success! Restored ${res.casesCount} cases and ${res.imagesCount} images.`);
          await loadStats();
          onReloadRequested();
        } else {
          setImportStatus(`Import failed: ${res.error}`);
        }
      } catch (err: any) {
        setImportStatus(`Import error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Offline Storage &amp; Database Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                IndexedDB offline persistence &bull; Export, import, and registry reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium"
          >
            Close
          </button>
        </div>

        {/* Storage stats */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-500" /> Local Storage Usage
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {formatBytes(stats.usageBytes)} of {stats.quotaBytes ? formatBytes(stats.quotaBytes) : 'Available Disk'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block text-[11px]">Saved Patient Cases:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{stats.casesCount}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 block text-[11px]">Saved Medical Scans/Images:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{stats.imagesCount}</span>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Backup &amp; Export Actions
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* JSON Export */}
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 text-left transition group"
            >
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400 group-hover:scale-105 transition">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 dark:text-slate-100 font-semibold">
                  Export Full JSON Backup
                </strong>
                <span className="text-[11px] text-slate-500 block">Includes all cases &amp; images</span>
              </div>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition group"
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 dark:text-slate-100 font-semibold">
                  Export CSV Case Index
                </strong>
                <span className="text-[11px] text-slate-500 block">De-identified logbook for audit</span>
              </div>
            </button>
          </div>

          {/* Import JSON file */}
          <div className="pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 bg-slate-50/50 dark:bg-slate-950/40 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Restore from JSON Backup File
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Select a previously exported NeuroER JSON file to restore
                  </span>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
              <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                Browse
              </span>
            </label>
          </div>

          {importStatus && (
            <div className={`p-3 rounded-lg text-xs font-medium ${importStatus.startsWith('Success') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              {importStatus}
            </div>
          )}
        </div>

        {/* Clinical Safety & Privacy Warning */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed">
            <strong>Clinical Safety Notice:</strong> All case data and medical images are stored exclusively inside this browser’s private IndexedDB sandbox on your device. Clearing browser cache/history or uninstalling the browser will erase local records. Make sure to download a JSON backup at the end of each ER shift.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onReloadRequested}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload / Re-sync Database
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
