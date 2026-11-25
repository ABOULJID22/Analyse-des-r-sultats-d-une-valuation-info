import { useState } from 'react';
import { Award, Medal, Trophy } from 'lucide-react';
import {
  DocimoStats,
  OrganizationMode,
  ScoredStudent,
} from '../types/docimology';
import { rankEntities } from '../utils/docimologyStats';
import { StatusLabel } from './StatusBadge';

interface RankingTabProps {
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
  globalTop3: ScoredStudent[];
  organizationMode: OrganizationMode | null;
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700">
        <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>#1 Or</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-600">
        <Medal className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
        <span>#2 Argent</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-700">
        <Award className="w-3.5 h-3.5 text-orange-600 shrink-0" aria-hidden="true" />
        <span>#3 Bronze</span>
      </span>
    );
  }
  return <span className="font-mono tabular-nums font-bold text-slate-900">#{rank}</span>;
}

export function RankingTab({
  classStats,
  groupStats,
  globalTop3,
  organizationMode,
}: RankingTabProps) {
  const withGroups = organizationMode === 'with-groups';
  const [sortBy, setSortBy] = useState<'mean' | 'successRate'>('mean');
  const [groupStarFilter, setGroupStarFilter] = useState<string>('ALL');

  const rankedClasses = rankEntities(classStats, sortBy);
  const rankedGroups = withGroups ? rankEntities(groupStats, sortBy) : [];

  const filteredGroupStars = groupStats.filter(
    (g) => groupStarFilter === 'ALL' || g.className === groupStarFilter
  );

  if (classStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-800">
          Aucune donnée chargée pour générer les podiums Super Stars et les classements.
        </p>
      </div>
    );
  }

  const podiumColors = [
    {
      label: '1er · Or',
      border: 'border-amber-300',
      bg: 'bg-amber-50/50',
      iconColor: 'text-amber-600',
      Icon: Trophy,
    },
    {
      label: '2e · Argent',
      border: 'border-slate-300',
      bg: 'bg-slate-50/70',
      iconColor: 'text-slate-600',
      Icon: Medal,
    },
    {
      label: '3e · Bronze',
      border: 'border-orange-300',
      bg: 'bg-orange-50/40',
      iconColor: 'text-orange-700',
      Icon: Award,
    },
  ];

  const renderStandingsTable = (
    title: string,
    subtitle: string,
    rows: ReturnType<typeof rankEntities>
  ) => (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor={`sort-${title}`} className="text-xs text-slate-600">
            Trier par :
          </label>
          <select
            id={`sort-${title}`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'mean' | 'successRate')}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
          >
            <option value="mean">Moyenne (/20)</option>
            <option value="successRate">Taux de réussite (%)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <th className="py-2.5 px-3.5">Rang</th>
              <th className="py-2.5 px-3.5">Classe / Groupe</th>
              <th className="py-2.5 px-3 text-right">Effectif</th>
              <th className="py-2.5 px-3 text-right">Notés</th>
              <th className="py-2.5 px-3 text-right">Abs. (0)</th>
              <th className="py-2.5 px-3 text-right">Moyenne</th>
              <th className="py-2.5 px-3 text-right">Médiane</th>
              <th className="py-2.5 px-3 text-right">Écart-type</th>
              <th className="py-2.5 px-3 text-right">Min</th>
              <th className="py-2.5 px-3 text-right">Max</th>
              <th className="py-2.5 px-3 text-right">Réussite (%)</th>
              <th className="py-2.5 px-3.5">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isTop3 = row.rank <= 3;
              const isRemediation = row.status === 'Remédiation';
              const rowBg = isTop3
                ? 'bg-emerald-50/45'
                : isRemediation
                ? 'bg-red-50/40'
                : '';

              return (
                <tr key={row.id} className={`${rowBg} hover:bg-slate-50 transition-colors`}>
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {row.effectif}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                    {row.notesCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {row.absentCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {fmt(row.mean)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {fmt(row.median)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {fmt(row.stdDev)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(row.min)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {fmt(row.max)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {row.successRate === null ? '—' : `${fmt(row.successRate, 1)}%`}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <StatusLabel status={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      {/* 1. Podium Super Star Globale (Top 3) */}
      <section aria-label="Podium Super Star Globale">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Super Stars Globales — Podium d’excellence (2APIC)
          </h2>
          <p className="text-xs text-slate-500">
            Les 3 meilleures performances individuelles sur l’ensemble des {classStats.length} classes
            {withGroups ? ` et ${groupStats.length} groupes` : ' entières'}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((idx) => {
            const student = globalTop3[idx];
            const style = podiumColors[idx];
            const Icon = style.Icon;
            return (
              <div
                key={idx}
                className={`border ${style.border} ${style.bg} rounded-xl p-5 flex items-start justify-between gap-4`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-600">
                    {style.label}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-slate-900 truncate">
                    {student ? student.fullName : 'Non attribué'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600 font-mono">
                    {student
                      ? `${withGroups ? student.groupId : student.className} · ${student.massarCode}`
                      : '—'}
                  </p>
                  <p className="mt-3 text-2xl font-extrabold font-mono tabular-nums text-slate-900">
                    {student ? `${student.score.toFixed(2).replace('.', ',')}/20` : '—'}
                  </p>
                </div>
                <Icon className={`w-8 h-8 shrink-0 ${style.iconColor}`} aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Tableau de Classement général des Classes */}
      {renderStandingsTable(
        `Classement général des Classes (${rankedClasses.length})`,
        'Médailles Or, Argent et Bronze pour les 3 meilleures classes · Zones nécessitant une remédiation mises en évidence.',
        rankedClasses
      )}

      {/* 3. Tableau de Classement général des Groupes (uniquement si mode Avec Groupes) */}
      {withGroups &&
        renderStandingsTable(
          `Classement général des Groupes (${rankedGroups.length})`,
          'Palmarès complet des groupes G1 (1–20) et G2 (21+) avec médailles pour le Top 3.',
          rankedGroups
        )}

      {/* 4. Star de chaque Classe */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Star de chaque Classe ({classStats.length} classes)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Meilleure note individuelle obtenue dans chacune des classes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {classStats.map((cls) => {
            const star = cls.top3[0];
            return (
              <div
                key={cls.className}
                className="border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-blue-700">
                    {cls.className}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {star ? star.fullName : 'Aucun noté'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {star
                      ? `${withGroups ? star.groupId : star.className} · ${star.massarCode}`
                      : '—'}
                  </div>
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-700 shrink-0">
                  {star ? `${star.score.toFixed(2).replace('.', ',')}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Top 3 Super Stars de chaque Groupe (uniquement si mode Avec Groupes) */}
      {withGroups && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Top 3 Super Stars par Groupe ({filteredGroupStars.length} groupes)
              </h2>
              <p className="text-xs text-slate-500">
                Podium des 3 meilleures notes au sein de chaque groupe G1 / G2.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="star-class-filter" className="text-xs text-slate-600">
                Filtrer par classe :
              </label>
              <select
                id="star-class-filter"
                value={groupStarFilter}
                onChange={(e) => setGroupStarFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
              >
                <option value="ALL">Toutes les classes</option>
                {classStats.map((c) => (
                  <option key={c.className} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroupStars.map((grp) => (
              <div key={grp.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-baseline justify-between pb-2 mb-2.5 border-b border-slate-100">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {grp.label}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    Moy. {fmt(grp.mean)}/20
                  </span>
                </div>
                {grp.top3.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucune note disponible</p>
                ) : (
                  <ol className="space-y-1.5 text-xs">
                    {grp.top3.map((st, idx) => (
                      <li
                        key={`${grp.id}-${st.massarCode}-${idx}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-slate-800">
                          <span className="font-mono font-semibold text-slate-500 mr-1.5">
                            {idx + 1}.
                          </span>
                          {st.fullName}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                          {st.score.toFixed(2).replace('.', ',')}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
