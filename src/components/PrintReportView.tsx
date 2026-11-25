import {
  DocimoStats,
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
  ItemAnalysisResult,
} from '../types/docimology';
import { generateDiagnostics, rankEntities } from '../utils/docimologyStats';

interface PrintReportViewProps {
  classes: ImportedClass[];
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
  globalStats: DocimoStats;
  column: EvaluationColumn;
  itemResults: ItemAnalysisResult[];
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

export function PrintReportView({
  classes,
  classStats,
  groupStats,
  globalStats,
  column,
  itemResults,
}: PrintReportViewProps) {
  if (classes.length === 0) return null;
  const firstMeta = classes[0].metadata;
  const rankedClasses = rankEntities(classStats, 'mean');
  const rankedGroups = rankEntities(groupStats, 'mean');

  return (
    <div className="hidden print:block text-slate-900 space-y-6">
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold">
            Rapport Docimologique & Pédagogique — Informatique (2APIC)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {firstMeta.academy} · {firstMeta.province} · Année scolaire {firstMeta.schoolYear}
          </p>
        </div>
        <div className="text-right text-xs font-mono">
          <div>Évaluation : {EVALUATION_COLUMN_LABELS[column]}</div>
          <div>DocimoStats Pro · Massar</div>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-5 gap-3 border border-slate-300 rounded p-3 text-xs">
        <div>
          <div className="text-slate-500">Effectif / Notés</div>
          <div className="font-mono font-bold text-sm">
            {globalStats.notesCount} / {globalStats.effectif}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Moyenne globale</div>
          <div className="font-mono font-bold text-sm">{fmt(globalStats.mean)}/20</div>
        </div>
        <div>
          <div className="text-slate-500">Médiane</div>
          <div className="font-mono font-bold text-sm">{fmt(globalStats.median)}/20</div>
        </div>
        <div>
          <div className="text-slate-500">Écart-type (σ)</div>
          <div className="font-mono font-bold text-sm">{fmt(globalStats.stdDev)}</div>
        </div>
        <div>
          <div className="text-slate-500">Taux de réussite</div>
          <div className="font-mono font-bold text-sm">
            {fmt(globalStats.successRate, 1)}%
          </div>
        </div>
      </div>

      {/* Classes Summary Table */}
      <div className="print-break-inside-avoid">
        <h2 className="text-sm font-bold mb-2">
          1. Synthèse statistique & diagnostic par Classe ({rankedClasses.length})
        </h2>
        <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-1.5">Rang</th>
              <th className="p-1.5">Classe</th>
              <th className="p-1.5 text-right">Notés</th>
              <th className="p-1.5 text-right">Moyenne</th>
              <th className="p-1.5 text-right">Médiane</th>
              <th className="p-1.5 text-right">σ</th>
              <th className="p-1.5 text-right">Min–Max</th>
              <th className="p-1.5 text-right">Réussite</th>
              <th className="p-1.5">Diagnostic & Remédiation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rankedClasses.map((c) => {
              const diag = generateDiagnostics(c, itemResults)[0];
              return (
                <tr key={c.className}>
                  <td className="p-1.5 font-mono">#{c.rank}</td>
                  <td className="p-1.5 font-mono font-bold">{c.className}</td>
                  <td className="p-1.5 text-right font-mono">{c.notesCount}/{c.effectif}</td>
                  <td className="p-1.5 text-right font-mono font-bold">{fmt(c.mean)}</td>
                  <td className="p-1.5 text-right font-mono">{fmt(c.median)}</td>
                  <td className="p-1.5 text-right font-mono">{fmt(c.stdDev)}</td>
                  <td className="p-1.5 text-right font-mono">
                    {fmt(c.min, 1)}–{fmt(c.max, 1)}
                  </td>
                  <td className="p-1.5 text-right font-mono">{fmt(c.successRate, 1)}%</td>
                  <td className="p-1.5">
                    <strong>{diag.diagnosticTitle} :</strong> {diag.action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Groups Summary Table */}
      <div className="print-break-before">
        <h2 className="text-sm font-bold mb-2">
          2. Classement détaillé des Groupes ({rankedGroups.length}) & Groupes de besoins
        </h2>
        <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-1.5">Rang</th>
              <th className="p-1.5">Groupe</th>
              <th className="p-1.5 text-right">Notés</th>
              <th className="p-1.5 text-right">Moyenne</th>
              <th className="p-1.5 text-right">Médiane</th>
              <th className="p-1.5 text-right">σ</th>
              <th className="p-1.5 text-right">Réussite</th>
              <th className="p-1.5 text-right">B1 (≥11)</th>
              <th className="p-1.5 text-right">B2 (8-10,99)</th>
              <th className="p-1.5 text-right">B3 (&lt;8)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rankedGroups.map((g) => (
              <tr key={g.id}>
                <td className="p-1.5 font-mono">#{g.rank}</td>
                <td className="p-1.5 font-mono font-bold">{g.label}</td>
                <td className="p-1.5 text-right font-mono">{g.notesCount}/{g.effectif}</td>
                <td className="p-1.5 text-right font-mono font-bold">{fmt(g.mean)}</td>
                <td className="p-1.5 text-right font-mono">{fmt(g.median)}</td>
                <td className="p-1.5 text-right font-mono">{fmt(g.stdDev)}</td>
                <td className="p-1.5 text-right font-mono">{fmt(g.successRate, 1)}%</td>
                <td className="p-1.5 text-right font-mono">{g.needGroups.g1.length}</td>
                <td className="p-1.5 text-right font-mono">{g.needGroups.g2.length}</td>
                <td className="p-1.5 text-right font-mono">{g.needGroups.g3.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
