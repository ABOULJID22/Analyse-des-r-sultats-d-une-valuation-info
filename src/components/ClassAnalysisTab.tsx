import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  DocimoStats,
  ItemAnalysisResult,
  ItemScoreInput,
} from '../types/docimology';
import {
  ClassesComparisonChart,
  DispersionBoxChart,
  DistributionHistogram,
} from './ChartsSuite';
import { StatusLabel } from './StatusBadge';

interface ClassAnalysisTabProps {
  classStats: DocimoStats[];
  globalStats: DocimoStats;
  items: ItemScoreInput[];
  itemResults: ItemAnalysisResult[];
  onUpdateItems: (items: ItemScoreInput[]) => void;
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

export function ClassAnalysisTab({
  classStats,
  globalStats,
  items,
  itemResults,
  onUpdateItems,
}: ClassAnalysisTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('GLOBAL');

  const inspected =
    selectedClassId === 'GLOBAL'
      ? globalStats
      : classStats.find((c) => c.className === selectedClassId) ?? globalStats;

  function handleItemChange(
    idx: number,
    field: keyof ItemScoreInput,
    value: string
  ) {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'label' || field === 'competency' || field === 'id') {
        return { ...item, [field]: value };
      }
      const num = Number(value);
      return { ...item, [field]: Number.isFinite(num) ? Math.max(0, num) : 0 };
    });
    onUpdateItems(updated);
  }

  function handleAddItem() {
    const nextNum = items.length + 1;
    onUpdateItems([
      ...items,
      {
        id: `Q${nextNum}`,
        label: `Q${nextNum} · Nouvelle question`,
        competency: 'Compétence évaluée',
        maxPoints: 4,
        upperAvgPoints: 3.0,
        lowerAvgPoints: 1.2,
        overallAvgPoints: 2.1,
      },
    ]);
  }

  function handleRemoveItem(idx: number) {
    onUpdateItems(items.filter((_, i) => i !== idx));
  }

  if (classStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-800">
          Aucune classe à analyser. Importez des fichiers Massar ou chargez les données d’exemple depuis l’onglet 1.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparative Chart + Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <ClassesComparisonChart classStats={classStats} />
        </div>
        <div className="lg:col-span-5">
          <DistributionHistogram
            histogram={inspected.histogram}
            title={`Histogramme — ${inspected.label}`}
            headerRight={
              <select
                id="hist-class-select"
                aria-label="Histogramme affiché"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
              >
                <option value="GLOBAL">Global (12 classes)</option>
                {classStats.map((c) => (
                  <option key={c.className} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            }
          />
        </div>
      </div>

      {/* 12 Classes Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tableau synthétique par Classe ({classStats.length} classes) & Niveau Global
            </h2>
            <p className="text-xs text-slate-500">
              Cliquez sur une classe pour inspecter son histogramme.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Classe</th>
                <th className="py-2.5 px-3 text-right">Effectif</th>
                <th className="py-2.5 px-3 text-right">Notés</th>
                <th className="py-2.5 px-3 text-right">Abs. (0)</th>
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
              {classStats.map((c) => (
                <tr
                  key={c.className}
                  className={`hover:bg-slate-50 transition-colors ${
                    selectedClassId === c.className ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900">
                    <button
                      type="button"
                      onClick={() => setSelectedClassId(c.className)}
                      className="text-blue-700 hover:underline cursor-pointer"
                    >
                      {c.className}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {c.effectif}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                    {c.notesCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                    {c.absentCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {fmt(c.mean)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {fmt(c.median)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(c.min)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(c.max)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(c.range)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(c.variance)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {fmt(c.stdDev)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {c.successRate === null ? '—' : `${fmt(c.successRate, 1)}%`}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <StatusLabel status={c.status} />
                  </td>
                </tr>
              ))}
              {/* Global Row */}
              <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-semibold">
                <td className="py-2.5 px-3.5 text-slate-900">
                  <button
                    type="button"
                    onClick={() => setSelectedClassId('GLOBAL')}
                    className="text-slate-900 hover:underline cursor-pointer"
                  >
                    Global (2APIC)
                  </button>
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {globalStats.effectif}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {globalStats.notesCount}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                  {globalStats.absentCount}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.mean)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.median)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.min)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.max)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.range)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.variance)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {fmt(globalStats.stdDev)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {globalStats.successRate === null ? '—' : `${fmt(globalStats.successRate, 1)}%`}
                </td>
                <td className="py-2.5 px-3.5">
                  <StatusLabel status={globalStats.status} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Box/Dispersion Chart for 12 Classes */}
      <DispersionBoxChart
        entities={classStats}
        title="Dispersion inter-classes (Min · Médiane · Moyenne · Max)"
      />

      {/* Optional / Configurable Item Analysis (F & ID) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Indices docimologiques par item (Facilité F & Discrimination ID)
            </h3>
            <p className="text-xs text-slate-500">
              Saisissez le barème et les moyennes par question pour calculer automatiquement F et ID (alimente le diagnostic pédagogique).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ajouter un item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-3.5">Question / Item</th>
                <th className="py-2.5 px-3">Compétence</th>
                <th className="py-2.5 px-3 text-right">Barème</th>
                <th className="py-2.5 px-3 text-right">Moy. Globale</th>
                <th className="py-2.5 px-3 text-right">Moy. Fort (27%)</th>
                <th className="py-2.5 px-3 text-right">Moy. Faible (27%)</th>
                <th className="py-2.5 px-3 text-right">Indice F</th>
                <th className="py-2.5 px-3 text-right">Indice ID</th>
                <th className="py-2.5 px-3.5">Interprétation</th>
                <th className="py-2.5 px-3 text-right">Suppr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const res = itemResults[idx];
                const fAlert = res && res.facilityIndex < 0.3;
                const fEasy = res && res.facilityIndex > 0.7;
                const idAlert = res && res.discriminationIndex < 0.15;

                return (
                  <tr key={item.id + idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3.5">
                      <input
                        type="text"
                        aria-label={`Libellé de l'item ${idx + 1}`}
                        value={item.label}
                        onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                        className="w-44 px-2 py-1 border border-slate-200 rounded text-slate-900 font-medium"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        aria-label={`Compétence de l'item ${idx + 1}`}
                        value={item.competency}
                        onChange={(e) =>
                          handleItemChange(idx, 'competency', e.target.value)
                        }
                        className="w-44 px-2 py-1 border border-slate-200 rounded text-slate-700"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="20"
                        aria-label={`Barème item ${idx + 1}`}
                        value={item.maxPoints}
                        onChange={(e) =>
                          handleItemChange(idx, 'maxPoints', e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-right font-mono tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={item.maxPoints}
                        aria-label={`Moyenne globale item ${idx + 1}`}
                        value={item.overallAvgPoints}
                        onChange={(e) =>
                          handleItemChange(idx, 'overallAvgPoints', e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-right font-mono tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={item.maxPoints}
                        aria-label={`Moyenne groupe fort item ${idx + 1}`}
                        value={item.upperAvgPoints}
                        onChange={(e) =>
                          handleItemChange(idx, 'upperAvgPoints', e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-right font-mono tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={item.maxPoints}
                        aria-label={`Moyenne groupe faible item ${idx + 1}`}
                        value={item.lowerAvgPoints}
                        onChange={(e) =>
                          handleItemChange(idx, 'lowerAvgPoints', e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-right font-mono tabular-nums"
                      />
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                        fAlert
                          ? 'text-red-700'
                          : fEasy
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {res ? res.facilityIndex.toFixed(2) : '—'}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                        idAlert ? 'text-red-700' : 'text-blue-700'
                      }`}
                    >
                      {res ? res.discriminationIndex.toFixed(2) : '—'}
                    </td>
                    <td className="py-2 px-3.5 text-slate-700 whitespace-nowrap">
                      {res ? `${res.facilityTag} · ${res.discriminationTag}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        aria-label={`Supprimer ${item.label}`}
                        className="text-slate-400 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
