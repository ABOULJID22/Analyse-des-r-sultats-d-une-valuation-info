import { useState } from 'react';
import { Search } from 'lucide-react';
import { DocimoStats, ItemAnalysisResult } from '../types/docimology';
import { generateDiagnostics } from '../utils/docimologyStats';
import { NeedGroupsDonut } from './ChartsSuite';

interface DiagnosticsTabProps {
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
  globalStats: DocimoStats;
  itemResults: ItemAnalysisResult[];
}

export function DiagnosticsTab({
  classStats,
  groupStats,
  globalStats,
  itemResults,
}: DiagnosticsTabProps) {
  const [selectedScopeId, setSelectedScopeId] = useState<string>('GLOBAL');
  const [studentQuery, setStudentQuery] = useState<string>('');

  const targetStats: DocimoStats =
    selectedScopeId === 'GLOBAL'
      ? globalStats
      : classStats.find((c) => c.className === selectedScopeId) ??
        groupStats.find((g) => g.id === selectedScopeId) ??
        globalStats;

  const activeDiagnostics = generateDiagnostics(targetStats, itemResults);

  const queryNorm = studentQuery.trim().toLowerCase();
  const filterList = <T extends { fullName: string; massarCode: string; groupId: string }>(
    list: T[]
  ) =>
    queryNorm
      ? list.filter(
          (s) =>
            s.fullName.toLowerCase().includes(queryNorm) ||
            s.massarCode.toLowerCase().includes(queryNorm) ||
            s.groupId.toLowerCase().includes(queryNorm)
        )
      : list;

  const g1List = filterList(targetStats.needGroups.g1);
  const g2List = filterList(targetStats.needGroups.g2);
  const g3List = filterList(targetStats.needGroups.g3);

  if (classStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-800">
          Aucune donnée disponible pour générer le diagnostic docimologique et les groupes de besoins.
        </p>
      </div>
    );
  }

  const severityStyle = (sev: 'critical' | 'warning' | 'info' | 'success') => {
    switch (sev) {
      case 'critical':
        return 'text-red-800 bg-red-50/60 border-red-200';
      case 'warning':
        return 'text-amber-800 bg-amber-50/60 border-amber-200';
      case 'success':
        return 'text-emerald-800 bg-emerald-50/60 border-emerald-200';
      default:
        return 'text-blue-800 bg-blue-50/60 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="diag-scope-select" className="text-xs font-semibold text-slate-700">
            Périmètre du diagnostic & des groupes de besoins :
          </label>
          <select
            id="diag-scope-select"
            value={selectedScopeId}
            onChange={(e) => setSelectedScopeId(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
          >
            <option value="GLOBAL">Niveau Global (Toutes classes)</option>
            <optgroup label="Classes (12)">
              {classStats.map((c) => (
                <option key={c.className} value={c.className}>
                  {c.className} (Moy. {c.mean?.toFixed(2) ?? '—'})
                </option>
              ))}
            </optgroup>
            <optgroup label="Groupes (24)">
              {groupStats.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} (Moy. {g.mean?.toFixed(2) ?? '—'})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Rechercher un élève, code Massar..."
            aria-label="Rechercher un élève dans les groupes de besoins"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Diagnostic Engine + Donut Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <h2 className="text-base font-bold text-slate-900">
            Diagnostic docimologique — {targetStats.label}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Règles expertes basées sur la moyenne, la médiane, l’écart-type (σ) et les indices d’items (F, ID).
          </p>

          <div className="space-y-3">
            {activeDiagnostics.map((diag) => (
              <div
                key={diag.id}
                className={`border rounded-lg p-4 ${severityStyle(diag.severity)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold">{diag.diagnosticTitle}</h3>
                  <span className="text-[11px] font-mono opacity-85">
                    {diag.conditionLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed">
                  <strong>Interprétation :</strong> {diag.interpretation}
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  <strong>Action pédagogique :</strong> {diag.action}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <NeedGroupsDonut stats={targetStats} />
        </div>
      </div>

      {/* Synthetic Diagnostic Matrix Across All 12 Classes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            Synthèse des diagnostics automatiques sur les {classStats.length} classes
          </h3>
          <p className="text-xs text-slate-500">
            Cliquez sur une classe pour afficher ses listes nominatives de groupes de besoins.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Classe</th>
                <th className="py-2.5 px-3 text-right">Moyenne</th>
                <th className="py-2.5 px-3 text-right">Médiane</th>
                <th className="py-2.5 px-3 text-right">σ</th>
                <th className="py-2.5 px-4">Diagnostic principal</th>
                <th className="py-2.5 px-4">Action recommandée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStats.map((cls) => {
                const diags = generateDiagnostics(cls, []);
                const main = diags[0];
                const allTitles = diags.map((d) => d.diagnosticTitle).join(' · ');
                return (
                  <tr
                    key={cls.className}
                    className={`hover:bg-slate-50 ${
                      selectedScopeId === cls.className ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedScopeId(cls.className)}
                        className="text-blue-700 hover:underline cursor-pointer"
                      >
                        {cls.className}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {cls.mean?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {cls.median?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {cls.stdDev?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {allTitles}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{main.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 Need Groups with Nominative Lists */}
      <section aria-label="Listes nominatives des 3 groupes de besoins">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Répartition nominative en 3 Groupes de Besoins — {targetStats.label}
          </h2>
          <p className="text-xs text-slate-500">
            Classement automatique selon la note obtenue sur 20 (hors absents).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Groupe 1 >= 11 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 bg-emerald-50/70 border-b border-emerald-200">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-emerald-900">
                  Groupe 1 · En réussite (≥ 11/20)
                </h3>
                <span className="font-mono tabular-nums text-xs font-bold text-emerald-800">
                  {g1List.length} élèves
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                Approfondissement, exercices plus complexes, tutorat.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {g1List.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">Aucun élève dans ce groupe.</p>
              ) : (
                g1List.map((st, idx) => (
                  <div
                    key={`${st.groupId}-${st.massarCode}-${idx}`}
                    className="px-4 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {st.groupId} · {st.massarCode}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 shrink-0">
                      {st.score.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Groupe 2: 8 - 10.99 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 bg-amber-50/70 border-b border-amber-200">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-amber-900">
                  Groupe 2 · Proches du seuil (8–10,99)
                </h3>
                <span className="font-mono tabular-nums text-xs font-bold text-amber-800">
                  {g2List.length} élèves
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Soutien ciblé, exercices guidés, consolidation.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {g2List.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">Aucun élève dans ce groupe.</p>
              ) : (
                g2List.map((st, idx) => (
                  <div
                    key={`${st.groupId}-${st.massarCode}-${idx}`}
                    className="px-4 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {st.groupId} · {st.massarCode}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-amber-700 shrink-0">
                      {st.score.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Groupe 3: < 8 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 bg-red-50/70 border-b border-red-200">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-red-900">
                  Groupe 3 · En difficulté (&lt; 8/20)
                </h3>
                <span className="font-mono tabular-nums text-xs font-bold text-red-800">
                  {g3List.length} élèves
                </span>
              </div>
              <p className="mt-1 text-xs text-red-800">
                Remédiation différée, reprise des prérequis, activités progressives.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {g3List.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">Aucun élève dans ce groupe.</p>
              ) : (
                g3List.map((st, idx) => (
                  <div
                    key={`${st.groupId}-${st.massarCode}-${idx}`}
                    className="px-4 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {st.groupId} · {st.massarCode}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-red-700 shrink-0">
                      {st.score.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
