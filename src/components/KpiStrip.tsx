import { DocimoStats } from '../types/docimology';

interface KpiStripProps {
  stats: DocimoStats;
  classesCount: number;
  groupsCount: number;
}

const fmt = (n: number | null, suffix = ''): string =>
  n === null ? '—' : `${n.toFixed(2).replace('.', ',')}${suffix}`;

export function KpiStrip({ stats, classesCount, groupsCount }: KpiStripProps) {
  const items = [
    {
      label: 'Population analysée',
      value: `${stats.notesCount} / ${stats.effectif}`,
      sub: `${classesCount} classes · ${groupsCount} groupes · ${stats.absentCount} abs.`,
    },
    {
      label: 'Moyenne générale',
      value: fmt(stats.mean, '/20'),
      sub: `Médiane : ${fmt(stats.median, '/20')}`,
    },
    {
      label: 'Taux de réussite (≥10)',
      value: stats.successRate === null ? '—' : `${stats.successRate.toFixed(1).replace('.', ',')}%`,
      sub: `${stats.successCount} élèves admis`,
    },
    {
      label: 'Dispersion (σ / Variance)',
      value: `σ = ${fmt(stats.stdDev)}`,
      sub: `Variance V = ${fmt(stats.variance)}`,
    },
    {
      label: 'Amplitude (Min – Max)',
      value:
        stats.min === null || stats.max === null
          ? '—'
          : `${stats.min.toFixed(2).replace('.', ',')} – ${stats.max.toFixed(2).replace('.', ',')}`,
      sub: `Étendue E = ${fmt(stats.range)}`,
    },
  ];

  return (
    <section
      aria-label="Indicateurs docimologiques clés"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
    >
      {items.map((item) => (
        <div key={item.label} className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">{item.label}</span>
          <span className="mt-1.5 text-xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {item.value}
          </span>
          <span className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {item.sub}
          </span>
        </div>
      ))}
    </section>
  );
}
