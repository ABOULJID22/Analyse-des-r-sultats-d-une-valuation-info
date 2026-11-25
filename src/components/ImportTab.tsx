import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
} from '../types/docimology';
import {
  buildMassarWorkbookFromClasses,
  parseMassarWorkbook,
} from '../utils/massarParser';
import { generateDemoClasses } from '../data/demoData';

interface ImportTabProps {
  classes: ImportedClass[];
  selectedColumn: EvaluationColumn;
  onChangeColumn: (col: EvaluationColumn) => void;
  onAddClasses: (incoming: ImportedClass[]) => void;
  onLoadDemo: () => void;
  onRemoveClass: (className: string) => void;
  onClearAll: () => void;
}

export function ImportTab({
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

  const activePreviewClass =
    classes.find((c) => c.metadata.className === previewClassName) ?? classes[0] ?? null;

  async function handleFiles(fileList: FileList | null) {
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
          errors.push(`${file.name} : aucune ligne élève détectée à partir de la ligne 18 (feuille NotesCC).`);
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
        `${parsedAll.length} classe(s) importée(s) avec succès (${parsedAll.reduce((a, c) => a + c.students.length, 0)} élèves).`
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
      {/* Top Action & Upload Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Importation des fichiers Excel Massar (NotesCC)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Importez jusqu’à 12 fichiers <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">export_notesCC_*.xlsx</span> simultanément ou un classeur multi-feuilles. Les métadonnées (<span className="font-mono text-xs">I9</span>, <span className="font-mono text-xs">D9</span>, <span className="font-mono text-xs">D7</span>, <span className="font-mono text-xs">I7</span>, <span className="font-mono text-xs">D13</span>) et les groupes G1 (1–20) / G2 (21+) sont extraits automatiquement.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={`mt-5 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging
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
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
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

        {/* Right Panel: Demo Mode & Evaluation Column Switcher */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Paramètres d’analyse & Démonstration
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Testez immédiatement toutes les fonctionnalités docimologiques avec un jeu complet de 12 classes et 24 groupes, ou choisissez la colonne d’évaluation à analyser.
            </p>

            <div className="mt-4">
              <label
                htmlFor="eval-col-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Colonne Massar analysée
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
              onClick={() => {
                onLoadDemo();
                setImportError(null);
                setImportNotice('Jeu de démonstration chargé : 12 classes (2APIC-1 à 2APIC-12) et 24 groupes.');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Charger des données d’exemple (12 classes / 24 groupes)</span>
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
              Découpage automatique : G1 (rangs 1–20) · G2 (rangs 21+)
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
              Importez vos fichiers Massar (.xlsx) ou cliquez sur « Charger des données d’exemple (12 classes / 24 groupes) ».
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
                  <th className="py-2.5 px-4 text-right">G1 / G2</th>
                  <th className="py-2.5 px-4 text-right">Notés ({selectedColumn})</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => {
                  const g1Count = cls.students.filter((s) => s.groupNumber === 1).length;
                  const g2Count = cls.students.filter((s) => s.groupNumber === 2).length;
                  const graded = cls.students.filter(
                    (s) => !s.absent && s.scores[selectedColumn] !== null
                  ).length;
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
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {g1Count} / {g2Count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {graded}
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
                Source : {activePreviewClass.metadata.sourceFile} · Rangs 1–20 → G1 · Rangs 21+ → G2
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
                  <th className="py-2 px-4">Groupe</th>
                  <th className="py-2 px-4">Code Massar (C)</th>
                  <th className="py-2 px-4">Nom et Prénom (D)</th>
                  <th className="py-2 px-4 text-right">DS1 (G)</th>
                  <th className="py-2 px-4 text-right">DS2 (I)</th>
                  <th className="py-2 px-4 text-right">DS3 (K)</th>
                  <th className="py-2 px-4 text-right">Act. (M)</th>
                  <th className="py-2 px-4">Absence (H)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePreviewClass.students.map((st) => (
                  <tr key={`${st.className}-${st.rankInClass}`} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono tabular-nums text-slate-500">
                      {st.rankInClass}
                    </td>
                    <td className="py-2 px-4 font-mono font-semibold text-blue-700">
                      G{st.groupNumber}
                    </td>
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
                      {st.absent ? (
                        <span className="text-red-700 font-semibold">Absent</span>
                      ) : (
                        <span className="text-slate-400">Présent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
