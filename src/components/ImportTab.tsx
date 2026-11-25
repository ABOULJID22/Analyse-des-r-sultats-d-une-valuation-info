import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AnalysisConfig,
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
  OrganizationMode,
} from '../types/docimology';
import {
  buildMassarWorkbookFromClasses,
  parseMassarWorkbook,
} from '../utils/massarParser';
import { isStudentAbsentForColumn } from '../utils/docimologyStats';
import { generateDemoClasses } from '../data/demoData';

interface ImportTabProps {
  config: AnalysisConfig;
  onUpdateConfig: (next: AnalysisConfig) => void;
  classes: ImportedClass[];
  selectedColumn: EvaluationColumn;
  onChangeColumn: (col: EvaluationColumn) => void;
  onAddClasses: (incoming: ImportedClass[]) => void;
  onLoadDemo: () => void;
  onRemoveClass: (className: string) => void;
  onClearAll: () => void;
}

export function ImportTab({
  config,
  onUpdateConfig,
  classes,
  selectedColumn,
  onChangeColumn,
  onAddClasses,
  onLoadDemo,
  onRemoveClass,
  onClearAll,
}: ImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [previewClassName, setPreviewClassName] = useState<string>('');

  const isModeConfigured = config.organizationMode !== null;
  const withGroups = config.organizationMode === 'with-groups';

  const activePreviewClass =
    classes.find((c) => c.metadata.className === previewClassName) ?? classes[0] ?? null;

  function setOrganizationMode(mode: OrganizationMode) {
    onUpdateConfig({ ...config, organizationMode: mode });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!isModeConfigured) {
      setImportError(
        'Veuillez d’abord sélectionner un mode d’organisation des classes (Option A ou Option B).'
      );
      return;
    }
    if (!fileList || fileList.length === 0) return;
    setImportError(null);
    setImportNotice(null);

    const files = Array.from(fileList).slice(0, 12);
    const parsedAll: ImportedClass[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const extracted = parseMassarWorkbook(buffer, file.name);
        if (extracted.length === 0) {
          errors.push(
            `${file.name} : aucune ligne élève détectée à partir de la ligne 18 (feuille NotesCC).`
          );
        } else {
          parsedAll.push(...extracted);
        }
      } catch {
        errors.push(`${file.name} : fichier Excel illisible ou format invalide.`);
      }
    }

    if (parsedAll.length > 0) {
      onAddClasses(parsedAll);
      setPreviewClassName(parsedAll[0].metadata.className);
      setImportNotice(
        `${parsedAll.length} classe(s) importée(s) avec succès (${parsedAll.reduce((a, c) => a + c.students.length, 0)} élèves). Note : toute note égale à 0 est comptée comme absence.`
      );
    }

    if (errors.length > 0) {
      setImportError(errors.join(' '));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleDownloadTemplate() {
    const demo2Apic2 = generateDemoClasses().find(
      (c) => c.metadata.className === '2APIC-2'
    );
    if (!demo2Apic2) return;
    const wb = buildMassarWorkbookFromClasses([demo2Apic2]);
    XLSX.writeFile(wb, 'export_notesCC_2APIC-2.xlsx');
  }

  return (
    <div className="space-y-6">
      {/* 1. Panneau de configuration initiale (obligatoire avant analyse) */}
      <section
        aria-label="Configuration initiale de l'analyse"
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              1. Configuration initiale de l’évaluation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez le nom du professeur et choisissez le mode d’organisation des classes avant d’importer ou de lancer l’analyse.
            </p>
          </div>
          {isModeConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Configuration prête</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-700">
              Choix du mode requis
            </span>
          )}
        </div>

        {/* Teacher name */}
        <div className="max-w-md">
          <label
            htmlFor="teacher-name-input"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Nom du professeur
          </label>
          <input
            id="teacher-name-input"
            type="text"
            value={config.teacherName}
            onChange={(e) =>
              onUpdateConfig({ ...config, teacherName: e.target.value })
            }
            placeholder="Ex : Pr. Mohamed ABOULJID"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Mandatory Organization Mode choice */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            Mode d’organisation des classes (choix obligatoire avant l’analyse)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setOrganizationMode('with-groups')}
              aria-pressed={config.organizationMode === 'with-groups'}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                config.organizationMode === 'with-groups'
                  ? 'border-blue-700 bg-blue-50/50 ring-1 ring-blue-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Layers
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  config.organizationMode === 'with-groups'
                    ? 'text-blue-700'
                    : 'text-slate-500'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Option A : Avec Groupes (G1 / G2)
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Chaque classe est divisée en deux groupes (élèves de 1 à 20 = G1, à partir de 21 = G2). Affiche les statistiques des 24 groupes et des 12 classes.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOrganizationMode('without-groups')}
              aria-pressed={config.organizationMode === 'without-groups'}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                config.organizationMode === 'without-groups'
                  ? 'border-blue-700 bg-blue-50/50 ring-1 ring-blue-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Users
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  config.organizationMode === 'without-groups'
                    ? 'text-blue-700'
                    : 'text-slate-500'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Option B : Sans Groupes (Classes entières uniquement)
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Aucune division G1/G2. L’onglet « Analyse par Groupe » et les duels G1/G2 sont masqués ; l’analyse porte uniquement sur les classes entières et le niveau global.
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Importation & Paramètres d'évaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2. Importation des fichiers Excel Massar (NotesCC)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Importez jusqu’à 12 fichiers <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">export_notesCC_*.xlsx</span> simultanément ou un classeur multi-feuilles. Les cellules vides, marquées absent ou égales à <strong className="font-mono">0</strong> sont traitées comme des absences.
            </p>

            {!isModeConfigured && (
              <p className="mt-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Sélectionnez d’abord Option A ou Option B dans la configuration ci-dessus pour déverrouiller l’importation et le jeu d’exemple.
              </p>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (isModeConfigured) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                !isModeConfigured
                  ? 'border-slate-200 bg-slate-50 opacity-60'
                  : isDragging
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
              }`}
            >
              <Upload className="w-7 h-7 text-blue-700 mx-auto" aria-hidden="true" />
              <p className="mt-2.5 text-sm font-medium text-slate-900">
                Glissez-déposez vos fichiers Excel Massar (.xlsx) ici
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Feuille NotesCC · Données élèves à partir de la ligne 18 (Colonnes B, C, D, G, H, I, K, M)
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={!isModeConfigured}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sélectionner des fichiers (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Modèle Massar 2APIC-2</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                aria-label="Importer des fichiers Excel Massar"
                className="sr-only"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </div>

            {importNotice && (
              <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
                {importNotice}
              </p>
            )}
            {importError && (
              <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                {importError}
              </p>
            )}
          </div>
        </div>

        {/* Right Panel: Evaluation switcher & Demo button */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Évaluation analysée & Démonstration
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Choisissez le contrôle ou les activités à analyser, puis testez l’application avec le jeu d’exemple complet de 12 classes (incluant des notes 0 comptées comme absences).
            </p>

            <div className="mt-4">
              <label
                htmlFor="eval-col-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Évaluation :
              </label>
              <select
                id="eval-col-select"
                value={selectedColumn}
                onChange={(e) => onChangeColumn(e.target.value as EvaluationColumn)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {(Object.keys(EVALUATION_COLUMN_LABELS) as EvaluationColumn[]).map((col) => (
                  <option key={col} value={col}>
                    {EVALUATION_COLUMN_LABELS[col]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!isModeConfigured}
              onClick={() => {
                onLoadDemo();
                setImportError(null);
                setImportNotice(
                  withGroups
                    ? 'Jeu de démonstration chargé : 12 classes (2APIC-1 à 2APIC-12) et 24 groupes.'
                    : 'Jeu de démonstration chargé : 12 classes entières (2APIC-1 à 2APIC-12, sans découpage G1/G2).'
                );
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {withGroups
                  ? 'Charger des données d’exemple (12 classes / 24 groupes)'
                  : 'Charger des données d’exemple (12 classes entières)'}
              </span>
            </button>

            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setImportNotice(null);
                  setImportError(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Réinitialiser les données importées</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Imported Classes Metadata Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Classes extraites ({classes.length} / 12 max recommandées)
            </h3>
            <p className="text-xs text-slate-500">
              {withGroups
                ? 'Mode Avec Groupes : G1 (rangs 1–20) · G2 (rangs 21+) · Notes 0 exclues comme absences'
                : 'Mode Sans Groupes : Classes entières uniquement · Notes 0 exclues comme absences'}
            </p>
          </div>
          {classes.length > 0 && (
            <span className="text-xs font-mono tabular-nums text-slate-600">
              Total élèves : {classes.reduce((acc, c) => acc + c.students.length, 0)}
            </span>
          )}
        </div>

        {classes.length === 0 ? (
          <div className="p-10 text-center">
            <FileSpreadsheet className="w-9 h-9 text-slate-300 mx-auto" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              Aucune classe chargée pour le moment
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isModeConfigured
                ? 'Importez vos fichiers Massar (.xlsx) ou cliquez sur « Charger des données d’exemple ».'
                : 'Commencez par sélectionner Option A ou Option B dans la configuration initiale.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Classe (I9)</th>
                  <th className="py-2.5 px-4">Niveau (D9)</th>
                  <th className="py-2.5 px-4">Académie / Direction (D7 · I7)</th>
                  <th className="py-2.5 px-4">Année (D13)</th>
                  <th className="py-2.5 px-4 text-right">Effectif</th>
                  {withGroups && <th className="py-2.5 px-4 text-right">G1 / G2</th>}
                  <th className="py-2.5 px-4 text-right">Notés</th>
                  <th className="py-2.5 px-4 text-right">Absents (0/vide)</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => {
                  const g1Count = cls.students.filter((s) => s.groupNumber === 1).length;
                  const g2Count = cls.students.filter((s) => s.groupNumber === 2).length;
                  const graded = cls.students.filter(
                    (s) => !isStudentAbsentForColumn(s, selectedColumn).isAbsent
                  ).length;
                  const absent = cls.students.length - graded;
                  const isSelected =
                    activePreviewClass?.metadata.className === cls.metadata.className;

                  return (
                    <tr
                      key={cls.metadata.className}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setPreviewClassName(cls.metadata.className)}
                          className="text-blue-700 hover:underline cursor-pointer"
                        >
                          {cls.metadata.className}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{cls.metadata.level}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-xs">
                        {cls.metadata.academy} · {cls.metadata.province}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                        {cls.metadata.schoolYear}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                        {cls.students.length}
                      </td>
                      {withGroups && (
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {g1Count} / {g2Count}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {graded}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                        {absent}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveClass(cls.metadata.className)}
                          aria-label={`Supprimer la classe ${cls.metadata.className}`}
                          className="text-xs text-slate-500 hover:text-red-700 font-medium cursor-pointer"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview of Students in Selected Class */}
      {activePreviewClass && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Aperçu détaillé des élèves — {activePreviewClass.metadata.className}
              </h3>
              <p className="text-xs text-slate-500">
                Source : {activePreviewClass.metadata.sourceFile} · Toute note égale à 0 est marquée « Absent (0) » pour l’évaluation analysée.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="preview-class-select" className="text-xs font-medium text-slate-600">
                Classe affichée :
              </label>
              <select
                id="preview-class-select"
                value={activePreviewClass.metadata.className}
                onChange={(e) => setPreviewClassName(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
              >
                {classes.map((c) => (
                  <option key={c.metadata.className} value={c.metadata.className}>
                    {c.metadata.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-4">Rang</th>
                  {withGroups && <th className="py-2 px-4">Groupe</th>}
                  <th className="py-2 px-4">Code Massar (C)</th>
                  <th className="py-2 px-4">Nom et Prénom (D)</th>
                  <th className="py-2 px-4 text-right">Contrôle 1</th>
                  <th className="py-2 px-4 text-right">Contrôle 2</th>
                  <th className="py-2 px-4 text-right">Contrôle 3</th>
                  <th className="py-2 px-4 text-right">Activités</th>
                  <th className="py-2 px-4">Statut ({EVALUATION_COLUMN_LABELS[selectedColumn]})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePreviewClass.students.map((st) => {
                  const absCheck = isStudentAbsentForColumn(st, selectedColumn);
                  return (
                    <tr key={`${st.className}-${st.rankInClass}`} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-500">
                        {st.rankInClass}
                      </td>
                      {withGroups && (
                        <td className="py-2 px-4 font-mono font-semibold text-blue-700">
                          G{st.groupNumber}
                        </td>
                      )}
                      <td className="py-2 px-4 font-mono text-slate-600">{st.massarCode}</td>
                      <td className="py-2 px-4 font-medium text-slate-900">{st.fullName}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-800">
                        {st.scores.G !== null ? st.scores.G.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                        {st.scores.I !== null ? st.scores.I.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                        {st.scores.K !== null ? st.scores.K.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                        {st.scores.M !== null ? st.scores.M.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-4">
                        {absCheck.isAbsent ? (
                          <span className="text-red-700 font-semibold">
                            {absCheck.reason === 'Note 0'
                              ? 'Absent (0)'
                              : absCheck.reason === 'Absent (Col. H)'
                              ? 'Absent (Col. H)'
                              : 'Absent (Vide)'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Noté</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
