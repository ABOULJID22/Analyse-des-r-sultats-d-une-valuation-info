import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import {
  ActiveTab,
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
  ItemScoreInput,
} from './types/docimology';
import {
  computeAllStats,
  computeItemAnalysis,
} from './utils/docimologyStats';
import { exportStatsToExcel } from './utils/massarParser';
import { DEMO_ITEMS_INFORMATIQUE, generateDemoClasses } from './data/demoData';
import { KpiStrip } from './components/KpiStrip';
import { ImportTab } from './components/ImportTab';
import { GroupAnalysisTab } from './components/GroupAnalysisTab';
import { ClassAnalysisTab } from './components/ClassAnalysisTab';
import { TournamentTab } from './components/TournamentTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { PrintReportView } from './components/PrintReportView';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'import', label: '1. Import & Données' },
  { id: 'groups', label: '2. Analyse par Groupe (24)' },
  { id: 'classes', label: '3. Analyse par Classe (12)' },
  { id: 'tournament', label: '4. Tournoi & Super Stars' },
  { id: 'diagnostics', label: '5. Diagnostic & Groupes de besoins' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');
  const [classes, setClasses] = useState<ImportedClass[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<EvaluationColumn>('G');
  const [items, setItems] = useState<ItemScoreInput[]>(DEMO_ITEMS_INFORMATIQUE);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setClasses(generateDemoClasses());
    }
  }, []);

  const { groupStats, classStats, globalStats, globalTop3 } = useMemo(
    () => computeAllStats(classes, selectedColumn),
    [classes, selectedColumn]
  );

  const itemResults = useMemo(() => computeItemAnalysis(items), [items]);

  function handleAddClasses(incoming: ImportedClass[]) {
    setClasses((prev) => {
      const map = new Map<string, ImportedClass>();
      for (const c of prev) {
        map.set(c.metadata.className, c);
      }
      for (const c of incoming) {
        map.set(c.metadata.className, c);
      }
      return Array.from(map.values()).slice(0, 12);
    });
  }

  function handleLoadDemo() {
    setClasses(generateDemoClasses());
  }

  function handleRemoveClass(className: string) {
    setClasses((prev) => prev.filter((c) => c.metadata.className !== className));
  }

  function handleClearAll() {
    setClasses([]);
  }

  function handleExportExcel() {
    if (classes.length === 0) return;
    exportStatsToExcel(classStats, groupStats, globalStats, selectedColumn);
  }

  function handlePrintPdf() {
    window.print();
  }

  const firstMeta = classes[0]?.metadata;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('import');
            }}
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            DocimoStats Pro
          </a>

          {/* Zone 2: 5 concise single-line nav tabs */}
          <nav
            aria-label="Navigation principale"
            role="tablist"
            className="hidden xl:flex items-center gap-6 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-blue-700 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={classes.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Exporter PDF</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet tab strip (< xl) */}
        <div className="xl:hidden border-t border-slate-100 px-4 overflow-x-auto">
          <div className="flex items-center gap-5" role="tablist" aria-label="Onglets mobiles">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-blue-700 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Application Workspace */}
      <main id="top" className="no-print flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Context & Secondary Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Analyse Docimologique & Pédagogique — Informatique (2APIC)
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Système Massar (NotesCC)</span>
              <span aria-hidden="true">·</span>
              <span>
                {classes.length > 0
                  ? `${classes.length} classes · ${groupStats.length} groupes · ${firstMeta?.academy ?? ''} · ${firstMeta?.schoolYear ?? ''}`
                  : 'Aucune classe importée'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="toolbar-col-select" className="text-xs font-medium text-slate-600">
                Évaluation :
              </label>
              <select
                id="toolbar-col-select"
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value as EvaluationColumn)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                {(Object.keys(EVALUATION_COLUMN_LABELS) as EvaluationColumn[]).map((col) => (
                  <option key={col} value={col}>
                    {EVALUATION_COLUMN_LABELS[col]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={classes.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exporter Excel</span>
            </button>
          </div>
        </div>

        {/* Global KPI Strip when data is present */}
        {classes.length > 0 && (
          <KpiStrip
            stats={globalStats}
            classesCount={classStats.length}
            groupsCount={groupStats.length}
          />
        )}

        {/* Active Tab View */}
        {activeTab === 'import' && (
          <ImportTab
            classes={classes}
            selectedColumn={selectedColumn}
            onChangeColumn={setSelectedColumn}
            onAddClasses={handleAddClasses}
            onLoadDemo={handleLoadDemo}
            onRemoveClass={handleRemoveClass}
            onClearAll={handleClearAll}
          />
        )}

        {activeTab === 'groups' && (
          <GroupAnalysisTab groupStats={groupStats} classStats={classStats} />
        )}

        {activeTab === 'classes' && (
          <ClassAnalysisTab
            classStats={classStats}
            globalStats={globalStats}
            items={items}
            itemResults={itemResults}
            onUpdateItems={setItems}
          />
        )}

        {activeTab === 'tournament' && (
          <TournamentTab
            classStats={classStats}
            groupStats={groupStats}
            globalTop3={globalTop3}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            classStats={classStats}
            groupStats={groupStats}
            globalStats={globalStats}
            itemResults={itemResults}
          />
        )}
      </main>

      {/* Official Print/PDF Report Layout */}
      <PrintReportView
        classes={classes}
        classStats={classStats}
        groupStats={groupStats}
        globalStats={globalStats}
        column={selectedColumn}
        itemResults={itemResults}
      />
    </div>
  );
}
