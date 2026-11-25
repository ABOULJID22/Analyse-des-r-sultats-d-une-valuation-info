import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DocimoStats, HistogramBucket } from '../types/docimology';

const BUCKET_COLORS: Record<string, string> = {
  '[0-5[': '#DC2626',
  '[5-8[': '#EA580C',
  '[8-10[': '#D97706',
  '[10-12[': '#2563EB',
  '[12-15[': '#0D9488',
  '[15-20]': '#059669',
};

export function DistributionHistogram({
  histogram,
  title = 'Distribution des notes (/20)',
  headerRight,
}: {
  histogram: HistogramBucket[];
  title?: string;
  headerRight?: ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {headerRight ?? <span className="text-xs text-slate-500">Effectif par tranche</span>}
      </div>
      <div className="h-64 flex-1 w-full min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="bucket"
              interval={0}
              tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 12, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: unknown, _name, props) => {
                const pct = (props?.payload as HistogramBucket | undefined)?.percentage ?? 0;
                return [`${value} élèves (${pct}%)`, 'Effectif'];
              }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {histogram.map((entry) => (
                <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#1D4ED8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ClassesComparisonChart({ classStats }: { classStats: DocimoStats[] }) {
  const data = classStats.map((c) => ({
    name: c.className,
    moyenne: c.mean ?? 0,
    reussite: c.successRate ?? 0,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Comparatif des 12 classes : Moyenne & Taux de réussite
        </h3>
        <span className="text-xs text-slate-500">Seuil de réussite : 10/20</span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-25}
              textAnchor="end"
              height={46}
              tick={{ fill: '#475569', fontSize: 10.5, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 20]}
              tick={{ fill: '#1D4ED8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: '#059669', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine yAxisId="left" y={10} stroke="#DC2626" strokeDasharray="4 4" />
            <Bar
              yAxisId="left"
              dataKey="moyenne"
              name="Moyenne (/20)"
              fill="#1D4ED8"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="reussite"
              name="Réussite (%)"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#059669' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GroupDuelChart({
  classStats,
  groupStats,
}: {
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
}) {
  const data = classStats.map((c) => {
    const g1 = groupStats.find((g) => g.className === c.className && g.groupNumber === 1);
    const g2 = groupStats.find((g) => g.className === c.className && g.groupNumber === 2);
    return {
      name: c.className,
      G1: g1?.mean ?? 0,
      G2: g2?.mean ?? 0,
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Duel G1 (Rangs 1–20) vs G2 (Rangs 21+) par classe
        </h3>
        <span className="text-xs text-slate-500">Moyenne (/20)</span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-25}
              textAnchor="end"
              height={46}
              tick={{ fill: '#475569', fontSize: 10.5, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 20]}
              tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={10} stroke="#DC2626" strokeDasharray="4 4" />
            <Bar dataKey="G1" name="Groupe 1 (1–20)" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="G2" name="Groupe 2 (21+)" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function NeedGroupsDonut({ stats }: { stats: DocimoStats }) {
  const total =
    stats.needGroups.g1.length +
    stats.needGroups.g2.length +
    stats.needGroups.g3.length;

  const data = [
    {
      name: 'G1 · En réussite (≥ 11)',
      value: stats.needGroups.g1.length,
      color: '#059669',
    },
    {
      name: 'G2 · Proches du seuil (8–10,99)',
      value: stats.needGroups.g2.length,
      color: '#D97706',
    },
    {
      name: 'G3 · En difficulté (< 8)',
      value: stats.needGroups.g3.length,
      color: '#DC2626',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Répartition des Groupes de besoins
        </h3>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {total} élèves notés
        </span>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => {
                const n = Number(value) || 0;
                const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
                return [`${n} élèves (${pct}%)`, 'Effectif'];
              }}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={d.name} className="flex flex-col">
              <span className="font-medium text-slate-700 truncate" title={d.name}>
                {d.name.split('·')[0].trim()}
              </span>
              <span
                className="font-mono tabular-nums font-bold text-sm"
                style={{ color: d.color }}
              >
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DispersionBoxChart({
  entities,
  title = 'Dispersion & Boîtes simplifiées (Min · Médiane · Moyenne · Max)',
}: {
  entities: DocimoStats[];
  title?: string;
}) {
  const valid = entities.filter((e) => e.notesCount > 0 && e.min !== null && e.max !== null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>Trait : Min → Max</span>
          <span className="text-blue-700 font-medium">● Moyenne</span>
          <span className="text-amber-600 font-medium">◆ Médiane</span>
        </div>
      </div>

      {valid.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          Aucune donnée notée disponible pour la dispersion.
        </p>
      ) : (
        <div className="space-y-2.5">
          {valid.map((item) => {
            const minPct = ((item.min ?? 0) / 20) * 100;
            const maxPct = ((item.max ?? 20) / 20) * 100;
            const meanPct = ((item.mean ?? 0) / 20) * 100;
            const medPct = ((item.median ?? 0) / 20) * 100;

            return (
              <div key={item.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-3 sm:col-span-2 font-mono font-medium text-slate-800 truncate">
                  {item.label}
                </div>
                <div className="col-span-7 sm:col-span-8 relative h-6 flex items-center">
                  {/* Scale background */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full relative">
                    {/* 10/20 threshold line */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-red-300"
                      style={{ left: '50%' }}
                      title="Seuil 10/20"
                    />
                    {/* Min to Max span bar */}
                    <div
                      className="absolute top-0 h-1.5 bg-slate-300 rounded-full"
                      style={{
                        left: `${minPct}%`,
                        width: `${Math.max(1, maxPct - minPct)}%`,
                      }}
                    />
                    {/* Min cap */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-500 rounded-sm"
                      style={{ left: `${minPct}%` }}
                      title={`Min: ${item.min}`}
                    />
                    {/* Max cap */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-500 rounded-sm"
                      style={{ left: `${maxPct}%` }}
                      title={`Max: ${item.max}`}
                    />
                    {/* Median diamond */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-500 rotate-45 border border-white"
                      style={{ left: `${medPct}%` }}
                      title={`Médiane: ${item.median}`}
                    />
                    {/* Mean circle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-blue-700 rounded-full border-2 border-white"
                      style={{ left: `${meanPct}%` }}
                      title={`Moyenne: ${item.mean}`}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-right font-mono tabular-nums text-slate-600">
                  {item.min?.toFixed(1)}–{item.max?.toFixed(1)}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-12 items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
            <div className="col-span-3 sm:col-span-2" />
            <div className="col-span-7 sm:col-span-8 flex justify-between">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
            <div className="col-span-2 text-right">Étendue</div>
          </div>
        </div>
      )}
    </div>
  );
}
