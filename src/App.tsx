import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import {
  ActiveTab,
  AnalysisConfig,
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
import { AdministrativeCartouche } from './components/AdministrativeCartouche';
import { ImportTab } from './components/ImportTab';
import { GroupAnalysisTab } from './components/GroupAnalysisTab';
import { ClassAnalysisTab } from './components/ClassAnalysisTab';
import { RankingTab } from './components/RankingTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { PrintReportView } from './components/PrintReportView';
import { PdfExportModal } from './components/PdfExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');
  const [config, setConfig] = useState<AnalysisConfig>({
    teacherName: '',
    organizationMode: null,
  });
  const [classes, setClasses] = useState<ImportedClass[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<EvaluationColumn>('G');
  const [items, setItems] = useState<ItemScoreInput[]>(DEMO_ITEMS_INFORMATIQUE);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const modeParam = params.get('mode') === 'without-groups' ? 'without-groups' : 'with-groups';
      setConfig((prev) => ({
        ...prev,
        teacherName: prev.teacherName || 'Pr. Mohamed ABOULJID',
        organizationMode: modeParam,
      }));
      setClasses(generateDemoClasses());
    }
  }, []);

  const includeGroups = config.organizationMode !== 'without-groups';

  // Ensure user cannot remain on hidden "groups" tab if switching to without-groups
  useEffect(() => {
    if (config.organizationMode === 'without-groups' && activeTab === 'groups') {
      setActiveTab(classes.length > 0 ? 'classes' : 'import');
    }
  }, [config.organizationMode, activeTab, classes.length]);

  const { groupStats, classStats, globalStats, globalTop3 } = useMemo(
    () => computeAllStats(classes, selectedColumn, includeGroups),
    [classes, selectedColumn, includeGroups]
  );

  const itemResults = useMemo(() => computeItemAnalysis(items), [items]);

  const visibleTabs: { id: ActiveTab; label: string }[] = useMemo(() => {
    const base: { id: ActiveTab; label: string }[] = [
      { id: 'import', label: '1. Import & Configuration' },
    ];
    if (config.organizationMode !== 'without-groups') {
      base.push({ id: 'groups', label: '2. Analyse par Groupe (24)' });
    }
    base.push(
      {
        id: 'classes',
        label:
          config.organizationMode === 'without-groups'
            ? '2. Analyse par Classe (12)'
            : '3. Analyse par Classe (12)',
      },
      {
        id: 'ranking',
        label:
          config.organizationMode === 'without-groups'
            ? '3. Classement & Super Stars'
            : '4. Classement & Super Stars',
      },
      {
        id: 'diagnostics',
        label:
          config.organizationMode === 'without-groups'
            ? '4. Diagnostic & Besoins'
            : '5. Diagnostic & Besoins',
      }
    );
    return base;
  }, [config.organizationMode]);

  function handleAddClasses(incoming: ImportedClass[]) {
    const extractedTeacher = incoming.find((c) => c.metadata.teacherName.trim())?.metadata.teacherName.trim();
    if (extractedTeacher) {
      setConfig((prev) =>
        prev.teacherName.trim() ? prev : { ...prev, teacherName: extractedTeacher }
      );
    }

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
    const demo = generateDemoClasses();
    const extractedTeacher = demo[0]?.metadata.teacherName?.trim();
    if (extractedTeacher) {
      setConfig((prev) =>
        prev.teacherName.trim() ? prev : { ...prev, teacherName: extractedTeacher }
      );
    }
    setClasses(demo);
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

  const firstMeta = classes[0]?.metadata;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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

          {/* Zone 2: Concise single-line nav tabs */}
          <nav
            aria-label="Navigation principale"
            role="tablist"
            className="hidden xl:flex items-center gap-4 2xl:gap-6"
          >
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-5 text-[13px] 2xl:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              onClick={() => setIsPdfModalOpen(true)}
              disabled={classes.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Exporter PDF</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet tab strip (< xl) */}
        <div className="xl:hidden border-t border-slate-100 px-4 overflow-x-auto">
          <div className="flex items-center gap-5" role="tablist" aria-label="Onglets mobiles">
            {visibleTabs.map((tab) => {
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
              {config.teacherName.trim() && (
                <>
                  <span className="font-semibold text-slate-800">{config.teacherName}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>
                {config.organizationMode === 'with-groups'
                  ? 'Mode : Avec Groupes (G1 / G2)'
                  : config.organizationMode === 'without-groups'
                  ? 'Mode : Sans Groupes (Classes entières)'
                  : 'Mode non sélectionné'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {classes.length > 0
                  ? `${classes.length} classes${includeGroups ? ` · ${groupStats.length} groupes` : ''} · ${firstMeta?.academy ?? ''}`
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

        {/* Administrative Identity Cartouche & Global KPI Strip when data is present */}
        {classes.length > 0 && firstMeta && (
          <AdministrativeCartouche
            metadata={firstMeta}
            teacherNameOverride={config.teacherName}
          />
        )}

        {classes.length > 0 && (
          <KpiStrip
            stats={globalStats}
            classesCount={classStats.length}
            groupsCount={groupStats.length}
            organizationMode={config.organizationMode}
          />
        )}

        {/* Active Tab View */}
        {activeTab === 'import' && (
          <ImportTab
            config={config}
            onUpdateConfig={setConfig}
            classes={classes}
            selectedColumn={selectedColumn}
            onChangeColumn={setSelectedColumn}
            onAddClasses={handleAddClasses}
            onLoadDemo={handleLoadDemo}
            onRemoveClass={handleRemoveClass}
            onClearAll={handleClearAll}
          />
        )}

        {activeTab === 'groups' && includeGroups && (
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

        {activeTab === 'ranking' && (
          <RankingTab
            classStats={classStats}
            groupStats={groupStats}
            globalTop3={globalTop3}
            organizationMode={config.organizationMode}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            classStats={classStats}
            groupStats={groupStats}
            globalStats={globalStats}
            itemResults={itemResults}
            organizationMode={config.organizationMode}
          />
        )}
      </main>

      {/* PDF Export Scope Selector & High-Res Generator Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        config={config}
        classes={classes}
        classStats={classStats}
        groupStats={groupStats}
        globalStats={globalStats}
        selectedColumn={selectedColumn}
        itemResults={itemResults}
      />

      {/* Official Print/PDF Report Fallback Layout */}
      <PrintReportView
        config={config}
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
