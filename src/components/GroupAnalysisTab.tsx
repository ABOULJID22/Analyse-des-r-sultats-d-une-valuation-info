import { useState } from 'react';
import { DocimoStats } from '../types/docimology';
import {
  DispersionBoxChart,
  DistributionHistogram,
  GroupDuelChart,
} from './ChartsSuite';
import { StatusLabel } from './StatusBadge';

interface GroupAnalysisTabProps {
  groupStats: DocimoStats[];
  classStats: DocimoStats[];
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

export function GroupAnalysisTab({ groupStats, classStats }: GroupAnalysisTabProps) {
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterGroupNum, setFilterGroupNum] = useState<'ALL' | '1' | '2'>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groupStats[0]?.id ?? ''
  );

  const filtered = groupStats.filter((g) => {
    if (filterClass !== 'ALL' && g.className !== filterClass) return false;
    if (filterGroupNum !== 'ALL' && String(g.groupNumber) !== filterGroupNum)
      return false;
    return true;
  });

  const inspectedGroup =
    groupStats.find((g) => g.id === selectedGroupId) ?? filtered[0] ?? null;

  if (groupStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-800">
          Aucun groupe à analyser. Importez des fichiers Massar ou chargez les données d’exemple depuis l’onglet 1.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Row: G1 vs G2 Duel + Inspected Group Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <GroupDuelChart classStats={classStats} groupStats={groupStats} />
        </div>
        <div className="lg:col-span-5">
          {inspectedGroup && (
            <DistributionHistogram
              histogram={inspectedGroup.histogram}
              title={`Distribution — ${inspectedGroup.label}`}
            />
          )}
        </div>
      </div>

      {/* Filter Bar + 24 Groups Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Analyse statistique complète par Groupe ({filtered.length} affichés / {groupStats.length})
            </h2>
            <p className="text-xs text-slate-500">
              Cliquez sur un groupe pour afficher son histogramme de distribution ci-dessus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="grp-class-filter" className="text-xs text-slate-600">
                Classe :
              </label>
              <select
                id="grp-class-filter"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
              >
                <option value="ALL">Toutes ({classStats.length})</option>
                {classStats.map((c) => (
                  <option key={c.className} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Filtrer par numéro de groupe"
            >
              {(['ALL', '1', '2'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilterGroupNum(opt)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    filterGroupNum === opt
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt === 'ALL' ? 'G1 & G2' : opt === '1' ? 'G1 (1–20)' : 'G2 (21+)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Groupe</th>
                <th className="py-2.5 px-3 text-right">Effectif</th>
                <th className="py-2.5 px-3 text-right">Notés</th>
                <th className="py-2.5 px-3 text-right">Moyenne</th>
                <th className="py-2.5 px-3 text-right">Médiane</th>
                <th className="py-2.5 px-3 text-right">Min</th>
                <th className="py-2.5 px-3 text-right">Max</th>
                <th className="py-2.5 px-3 text-right">Étendue</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3 text-right">Écart-type (σ)</th>
                <th className="py-2.5 px-3 text-right">Réussite (%)</th>
                <th className="py-2.5 px-3.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((g) => {
                const isSelected = inspectedGroup?.id === g.id;
                return (
                  <tr
                    key={g.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId(g.id)}
                        className="text-blue-700 hover:underline cursor-pointer"
                      >
                        {g.label}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {g.effectif}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      {g.notesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {fmt(g.mean)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {fmt(g.median)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {fmt(g.min)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {fmt(g.max)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {fmt(g.range)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {fmt(g.variance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {fmt(g.stdDev)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {g.successRate === null ? '—' : `${fmt(g.successRate, 1)}%`}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <StatusLabel status={g.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispersion Box Chart across filtered groups */}
      <DispersionBoxChart
        entities={filtered}
        title={`Dispersion par Groupe (${filtered.length} groupes)`}
      />
    </div>
  );
}
