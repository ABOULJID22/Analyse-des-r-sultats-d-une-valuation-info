import { useState } from 'react';
import { Award, Crown, Medal, Trophy } from 'lucide-react';
import { DocimoStats, RankedDocimoStats, ScoredStudent } from '../types/docimology';
import { rankEntities } from '../utils/docimologyStats';
import { StatusLabel } from './StatusBadge';

interface TournamentTabProps {
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
  globalTop3: ScoredStudent[];
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

function TournamentMatchup({
  a,
  b,
  winner,
  roundLabel,
}: {
  a?: RankedDocimoStats;
  b?: RankedDocimoStats;
  winner?: RankedDocimoStats;
  roundLabel: string;
}) {
  const renderRow = (team?: RankedDocimoStats) => {
    const isWin = team && winner && team.id === winner.id;
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 text-xs ${
          isWin ? 'bg-emerald-50 font-semibold text-emerald-900' : 'bg-white text-slate-700'
        }`}
      >
        <span className="truncate font-mono">
          {team ? `#${team.rank} ${team.label}` : 'Qualifié à définir'}
        </span>
        <span className="font-mono tabular-nums font-bold ml-2 shrink-0">
          {team?.mean !== null && team?.mean !== undefined ? fmt(team.mean) : '—'}
        </span>
      </div>
    );
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-500">
        {roundLabel}
      </div>
      <div className="divide-y divide-slate-100">
        {renderRow(a)}
        {renderRow(b)}
      </div>
    </div>
  );
}

export function TournamentTab({
  classStats,
  groupStats,
  globalTop3,
}: TournamentTabProps) {
  const [boardScope, setBoardScope] = useState<'groups' | 'classes'>('groups');
  const [sortBy, setSortBy] = useState<'mean' | 'successRate'>('mean');
  const [bracketScope, setBracketScope] = useState<'classes' | 'groups'>('classes');
  const [groupStarFilter, setGroupStarFilter] = useState<string>('ALL');

  const rankedGroups = rankEntities(groupStats, sortBy);
  const rankedClasses = rankEntities(classStats, sortBy);
  const activeBoard = boardScope === 'groups' ? rankedGroups : rankedClasses;

  // Bracket uses Top 8 seeded 1v8, 4v5, 2v7, 3v6
  const bracketSource =
    bracketScope === 'classes'
      ? rankEntities(classStats, sortBy)
      : rankEntities(groupStats, sortBy);
  const seeds = bracketSource.slice(0, 8);

  const pickWinner = (a?: RankedDocimoStats, b?: RankedDocimoStats) => {
    if (!a) return b;
    if (!b) return a;
    const va = sortBy === 'mean' ? a.mean ?? 0 : a.successRate ?? 0;
    const vb = sortBy === 'mean' ? b.mean ?? 0 : b.successRate ?? 0;
    return va >= vb ? a : b;
  };

  const qf1W = pickWinner(seeds[0], seeds[7]);
  const qf2W = pickWinner(seeds[3], seeds[4]);
  const qf3W = pickWinner(seeds[1], seeds[6]);
  const qf4W = pickWinner(seeds[2], seeds[5]);
  const sf1W = pickWinner(qf1W, qf2W);
  const sf2W = pickWinner(qf3W, qf4W);
  const champion = pickWinner(sf1W, sf2W);

  const filteredGroupStars = groupStats.filter(
    (g) => groupStarFilter === 'ALL' || g.className === groupStarFilter
  );

  if (classStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-medium text-slate-800">
          Aucune donnée chargée pour générer les podiums Super Stars et le classement Tournoi.
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

  return (
    <div className="space-y-8">
      {/* 1. Super Star Globale (Top 3 Podium) */}
      <section aria-label="Podium Super Star Globale">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Super Stars Globales — Podium d’excellence (2APIC)
            </h2>
            <p className="text-xs text-slate-500">
              Les 3 meilleures performances individuelles sur l’ensemble des {classStats.length} classes et {groupStats.length} groupes.
            </p>
          </div>
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
                    {student ? `${student.groupId} · ${student.massarCode}` : '—'}
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

      {/* 2. Tournament Standings Table (24 Groups or 12 Classes) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Classement Championnat — {boardScope === 'groups' ? `${rankedGroups.length} Groupes` : `${rankedClasses.length} Classes`}
            </h2>
            <p className="text-xs text-slate-500">
              Top 3 mis en avant (zone d’excellence) · Derniers rangs signalés pour accompagnement ciblé.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setBoardScope('groups')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  boardScope === 'groups'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                24 Groupes
              </button>
              <button
                type="button"
                onClick={() => setBoardScope('classes')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  boardScope === 'classes'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12 Classes
              </button>
            </div>

            {/* Sort toggle */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="tournament-sort" className="text-xs text-slate-600">
                Trier par :
              </label>
              <select
                id="tournament-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'mean' | 'successRate')}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="mean">Moyenne (/20)</option>
                <option value="successRate">Taux de réussite (%)</option>
              </select>
            </div>
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
              {activeBoard.map((row) => {
                const isTop3 = row.rank <= 3;
                const isRemediation = row.status === 'Remédiation';
                const rowBg = isTop3
                  ? 'bg-emerald-50/45'
                  : isRemediation
                  ? 'bg-red-50/40'
                  : '';

                return (
                  <tr key={row.id} className={`${rowBg} hover:bg-slate-50 transition-colors`}>
                    <td className="py-2.5 px-3.5 font-mono tabular-nums font-bold text-slate-900">
                      #{row.rank}
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

      {/* 3. Vue Arbre / Bracket Tournoi */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Arbre du Tournoi — Phase finale (Top 8)
            </h2>
            <p className="text-xs text-slate-500">
              Tableau à élimination directe basé sur {sortBy === 'mean' ? 'la moyenne générale' : 'le taux de réussite'}.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setBracketScope('classes')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                bracketScope === 'classes'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tableau Classes
            </button>
            <button
              type="button"
              onClick={() => setBracketScope('groups')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                bracketScope === 'groups'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tableau Groupes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Quarts */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500">Quarts de finale</div>
            <TournamentMatchup a={seeds[0]} b={seeds[7]} winner={qf1W} roundLabel="Quart 1 (1 vs 8)" />
            <TournamentMatchup a={seeds[3]} b={seeds[4]} winner={qf2W} roundLabel="Quart 2 (4 vs 5)" />
            <TournamentMatchup a={seeds[1]} b={seeds[6]} winner={qf3W} roundLabel="Quart 3 (2 vs 7)" />
            <TournamentMatchup a={seeds[2]} b={seeds[5]} winner={qf4W} roundLabel="Quart 4 (3 vs 6)" />
          </div>

          {/* Demis */}
          <div className="space-y-6">
            <div className="text-xs font-semibold text-slate-500">Demi-finales</div>
            <TournamentMatchup a={qf1W} b={qf2W} winner={sf1W} roundLabel="Demi-finale A" />
            <TournamentMatchup a={qf3W} b={qf4W} winner={sf2W} roundLabel="Demi-finale B" />
          </div>

          {/* Finale */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500">Finale</div>
            <TournamentMatchup a={sf1W} b={sf2W} winner={champion} roundLabel="Grande Finale" />
          </div>

          {/* Champion */}
          <div className="border border-amber-300 bg-amber-50/60 rounded-xl p-5 text-center">
            <Crown className="w-8 h-8 text-amber-600 mx-auto" aria-hidden="true" />
            <div className="mt-2 text-xs font-semibold text-amber-800">
              Vainqueur du Tournoi
            </div>
            <div className="mt-1 text-lg font-extrabold font-mono text-slate-900">
              {champion ? champion.label : '—'}
            </div>
            <div className="mt-1 text-xs font-mono tabular-nums text-slate-700">
              Moy. {fmt(champion?.mean ?? null)}/20 · Réussite {fmt(champion?.successRate ?? null, 1)}%
            </div>
          </div>
        </div>
      </section>

      {/* 4. Star de chaque Classe (12) */}
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
                    {star ? `${star.groupId}` : '—'}
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

      {/* 5. Top 3 Super Stars de chaque Groupe (24) */}
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
    </div>
  );
}
