import React from 'react';
import {
  Search,
  Plus,
  Maximize2,
  Minimize2,
  Database,
  Moon,
  Sun,
  FileText,
} from 'lucide-react';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onNewCase: () => void;
  onOpenBackup: () => void;
  onOpenHandoff: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
}

export const Header: React.FC<Props> = React.memo(({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onExpandAll,
  onCollapseAll,
  onNewCase,
  onOpenBackup,
  onOpenHandoff,
  darkMode,
  onToggleDarkMode,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Offline Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-700 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            ED
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
                NeuroER Notes
              </h1>
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                  isOnline
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span>{isOnline ? 'Offline Ready' : 'Offline'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Emergency Department Neurology Case Notes
            </p>
          </div>
        </div>

        {/* Action Buttons Right: Prominent + New Case */}
        <div className="flex items-center gap-2">
          {/* Prominent + New Case Button */}
          <button
            onClick={onNewCase}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Case</span>
          </button>

          {/* SBAR Handoff */}
          <button
            onClick={onOpenHandoff}
            className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
            title="SBAR Shift Handoff summary"
          >
            <FileText className="w-4 h-4 text-cyan-600 sm:hidden inline" />
            <span className="hidden sm:inline">Handoff</span>
          </button>

          {/* Backup & Storage */}
          <button
            onClick={onOpenBackup}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title="Backup & Restore database"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Filter, Search & Expand Bar */}
      <div className="bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cases by ID, initials, complaint..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status filter & Expand/Collapse */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="active">Active ER Patients</option>
              <option value="all">All Cases (including archived)</option>
              <option value="new">New</option>
              <option value="assessment">Under Assessment</option>
              <option value="investigations">Investigations Pending</option>
              <option value="treatment">Treatment Initiated</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
              <option value="archived">Archived</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={onExpandAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-xs"
                title="Expand all cards"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Expand All</span>
              </button>
              <button
                onClick={onCollapseAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-xs"
                title="Collapse all cards"
              >
                <Minimize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Collapse All</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});
