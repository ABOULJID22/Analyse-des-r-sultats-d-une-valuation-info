import { useMemo, useRef, useState } from 'react';
import { Award, Download, Loader2, Medal, Printer, Trophy, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  AnalysisConfig,
  DocimoStats,
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
  ItemAnalysisResult,
  PdfScopeType,
} from '../types/docimology';
import { generateDiagnostics, rankEntities } from '../utils/docimologyStats';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnalysisConfig;
  classes: ImportedClass[];
  classStats: DocimoStats[];
  groupStats: DocimoStats[];
  globalStats: DocimoStats;
  selectedColumn: EvaluationColumn;
  itemResults: ItemAnalysisResult[];
}

const fmt = (v: number | null, dec = 2) =>
  v === null ? '—' : v.toFixed(dec).replace('.', ',');

const BUCKET_COLORS: Record<string, string> = {
  '[0-5[': '#DC2626',
  '[5-8[': '#EA580C',
  '[8-10[': '#D97706',
  '[10-12[': '#2563EB',
  '[12-15[': '#0D9488',
  '[15-20]': '#059669',
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function PdfExportModal({
  isOpen,
  onClose,
  config,
  classes,
  classStats,
  groupStats,
  globalStats,
  selectedColumn,
  itemResults,
}: PdfExportModalProps) {
  const withGroups = config.organizationMode === 'with-groups';
  const [scopeType, setScopeType] = useState<PdfScopeType>('global');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groupStats[0]?.id ?? ''
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classStats[0]?.className ?? ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const reportRootRef = useRef<HTMLDivElement | null>(null);

  const effectiveScopeType: PdfScopeType =
    !withGroups && scopeType === 'group' ? 'class' : scopeType;

  const targetStats: DocimoStats = useMemo(() => {
    if (effectiveScopeType === 'group' && withGroups) {
      return (
        groupStats.find((g) => g.id === selectedGroupId) ??
        groupStats[0] ??
        globalStats
      );
    }
    if (effectiveScopeType === 'class') {
      return (
        classStats.find((c) => c.className === selectedClassId) ??
        classStats[0] ??
        globalStats
      );
    }
    return globalStats;
  }, [
    effectiveScopeType,
    withGroups,
    groupStats,
    selectedGroupId,
    classStats,
    selectedClassId,
    globalStats,
  ]);

  if (!isOpen) return null;

  const firstMeta = classes[0]?.metadata;
  const targetMeta =
    classes.find((c) => c.metadata.className === targetStats.className)?.metadata ??
    firstMeta;

  const diagnostics = generateDiagnostics(
    targetStats,
    targetStats.id === 'GLOBAL' ? itemResults : []
  );

  // Build comparative bar chart data tailored to chosen scope
  const comparisonData = (() => {
    if (effectiveScopeType === 'global') {
      return classStats.map((c) => ({
        name: c.className,
        moyenne: c.mean ?? 0,
      }));
    }
    if (effectiveScopeType === 'class' && withGroups) {
      const g1 = groupStats.find(
        (g) => g.className === targetStats.className && g.groupNumber === 1
      );
      const g2 = groupStats.find(
        (g) => g.className === targetStats.className && g.groupNumber === 2
      );
      return [
        { name: 'G1 (1–20)', moyenne: g1?.mean ?? 0 },
        { name: 'G2 (21+)', moyenne: g2?.mean ?? 0 },
        { name: targetStats.className, moyenne: targetStats.mean ?? 0 },
        { name: 'Global', moyenne: globalStats.mean ?? 0 },
      ];
    }
    if (effectiveScopeType === 'group') {
      const parentClass = classStats.find(
        (c) => c.className === targetStats.className
      );
      const siblingGroup = groupStats.find(
        (g) =>
          g.className === targetStats.className &&
          g.groupNumber !== targetStats.groupNumber
      );
      return [
        { name: targetStats.label, moyenne: targetStats.mean ?? 0 },
        ...(siblingGroup
          ? [{ name: siblingGroup.label, moyenne: siblingGroup.mean ?? 0 }]
          : []),
        ...(parentClass
          ? [{ name: parentClass.className, moyenne: parentClass.mean ?? 0 }]
          : []),
        { name: 'Global', moyenne: globalStats.mean ?? 0 },
      ];
    }
    return [
      { name: targetStats.label, moyenne: targetStats.mean ?? 0 },
      { name: 'Global 2APIC', moyenne: globalStats.mean ?? 0 },
    ];
  })();

  const donutData = [
    {
      name: 'G1 · En réussite (≥ 11)',
      value: targetStats.needGroups.g1.length,
      color: '#059669',
    },
    {
      name: 'G2 · Proches du seuil (8–10,99)',
      value: targetStats.needGroups.g2.length,
      color: '#D97706',
    },
    {
      name: 'G3 · En difficulté (< 8)',
      value: targetStats.needGroups.g3.length,
      color: '#DC2626',
    },
  ];

  const needGroupBlocks = [
    {
      title: 'Groupe 1 · En réussite (≥ 11/20)',
      action: 'Approfondissement, exercices plus complexes, tutorat.',
      color: '#065F46',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      students: targetStats.needGroups.g1,
    },
    {
      title: 'Groupe 2 · Proches du seuil (8 à 10,99/20)',
      action: 'Soutien ciblé, exercices guidés, consolidation.',
      color: '#92400E',
      bg: '#FFFBEB',
      border: '#FDE68A',
      students: targetStats.needGroups.g2,
    },
    {
      title: 'Groupe 3 · En difficulté (< 8/20)',
      action: 'Remédiation différée, reprise des prérequis, activités progressives.',
      color: '#991B1B',
      bg: '#FEF2F2',
      border: '#FECACA',
      students: targetStats.needGroups.g3,
    },
  ];

  async function handleGeneratePdf() {
    if (!reportRootRef.current) return;
    setIsGenerating(true);
    setPdfError(null);

    try {
      // Allow Recharts SVG layout to flush cleanly
      await new Promise((resolve) => setTimeout(resolve, 150));

      const blocks = Array.from(
        reportRootRef.current.querySelectorAll<HTMLElement>('[data-pdf-block]')
      );
      if (blocks.length === 0) {
        throw new Error('Aucun bloc à exporter.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const maxContentY = pageHeight - margin;
      let cursorY = margin;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const canvas = await html2canvas(block, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          logging: false,
          useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

        if (cursorY !== margin && cursorY + imgHeightMm > maxContentY) {
          pdf.addPage();
          cursorY = margin;
        }

        // If a single block is taller than a whole page, fit proportionally
        if (imgHeightMm > maxContentY - margin) {
          const ratio = (maxContentY - margin) / imgHeightMm;
          const scaledW = contentWidth * ratio;
          const scaledH = imgHeightMm * ratio;
          pdf.addImage(imgData, 'PNG', margin, cursorY, scaledW, scaledH);
          cursorY += scaledH + 4;
        } else {
          pdf.addImage(imgData, 'PNG', margin, cursorY, contentWidth, imgHeightMm);
          cursorY += imgHeightMm + 4;
        }
      }

      const safeScope = targetStats.label.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeEval = EVALUATION_COLUMN_LABELS[selectedColumn].replace(/\s+/g, '_');
      pdf.save(`DocimoStats_Rapport_${safeScope}_${safeEval}.pdf`);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? `Erreur lors de la génération PDF : ${err.message}`
          : 'Impossible de générer le fichier PDF.'
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const rankedClassesGlobal =
    effectiveScopeType === 'global' ? rankEntities(classStats, 'mean') : [];

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h2 id="pdf-modal-title" className="text-lg font-bold text-slate-900">
              Exporter un Rapport Pédagogique PDF complet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inclut l’en-tête officiel, les indicateurs statistiques, les graphiques haute résolution, les Super Stars, le diagnostic et les listes nominatives.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'export PDF"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scope Selection */}
        <div className="space-y-3">
          <span className="block text-xs font-semibold text-slate-700">
            1. Choisissez le périmètre du rapport PDF :
          </span>
          <div className={`grid grid-cols-1 ${withGroups ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
            {withGroups && (
              <button
                type="button"
                onClick={() => setScopeType('group')}
                aria-pressed={effectiveScopeType === 'group'}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  effectiveScopeType === 'group'
                    ? 'border-blue-700 bg-blue-50/60 ring-1 ring-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Un Groupe spécifique</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Ex : {groupStats[0]?.label ?? '2APIC-1 - G1'}
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setScopeType('class')}
              aria-pressed={effectiveScopeType === 'class'}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                effectiveScopeType === 'class'
                  ? 'border-blue-700 bg-blue-50/60 ring-1 ring-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">Une Classe spécifique</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ex : {classStats[0]?.className ?? '2APIC-2'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScopeType('global')}
              aria-pressed={effectiveScopeType === 'global'}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                effectiveScopeType === 'global'
                  ? 'border-blue-700 bg-blue-50/60 ring-1 ring-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">Tout le niveau / Global</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Synthèse des {classStats.length} classes
              </div>
            </button>
          </div>

          {effectiveScopeType === 'group' && withGroups && (
            <div>
              <label htmlFor="pdf-group-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Groupe à exporter :
              </label>
              <select
                id="pdf-group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
              >
                {groupStats.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} (Moy. {fmt(g.mean)}/20 · {g.notesCount} notés)
                  </option>
                ))}
              </select>
            </div>
          )}

          {effectiveScopeType === 'class' && (
            <div>
              <label htmlFor="pdf-class-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Classe à exporter :
              </label>
              <select
                id="pdf-class-select"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
              >
                {classStats.map((c) => (
                  <option key={c.className} value={c.className}>
                    {c.className} (Moy. {fmt(c.mean)}/20 · {c.notesCount} notés)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary of Report Contents */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-1.5">
          <div className="font-bold text-slate-900">
            Aperçu du rapport : {targetStats.label} — {EVALUATION_COLUMN_LABELS[selectedColumn]}
          </div>
          <div className="text-slate-600">
            Professeur : <strong className="text-slate-900">{config.teacherName || 'Non renseigné'}</strong>
          </div>
          <div className="text-slate-600 font-mono tabular-nums">
            Effectif : {targetStats.effectif} · Notés : {targetStats.notesCount} · Absents (0/vide) : {targetStats.absentCount} · Moyenne : {fmt(targetStats.mean)}/20 · Réussite : {fmt(targetStats.successRate, 1)}%
          </div>
          <div className="text-slate-600">
            Contenu généré : En-tête officiel, KPIs, 3 graphiques haute résolution (Histogramme, Comparatif, Donut), Podium Super Stars, Diagnostic docimologique, Groupes de besoins nominatifs et Liste des absents.
          </div>
        </div>

        {pdfError && (
          <p className="text-xs font-semibold text-red-700" role="alert">
            {pdfError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Imprimer (Navigateur)</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGeneratePdf()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Génération du PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Télécharger le rapport PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Off-screen high-resolution A4 Report DOM captured by html2canvas-pro */}
      <div
        ref={reportRootRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-12000px',
          top: 0,
          width: '794px',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          fontFamily: '"DM Sans", system-ui, sans-serif',
        }}
      >
        {/* Block 1: Official Header + Complete KPIs */}
        <div data-pdf-block="header-kpis" style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              borderBottom: '2px solid #0F172A',
              paddingBottom: '12px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', letterSpacing: '0.03em' }}>
                DOCIMOSTATS PRO · RAPPORT PÉDAGOGIQUE OFFICIEL
              </div>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0 0', color: '#0F172A' }}>
                Analyse Docimologique — {targetStats.label}
              </h1>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                {targetMeta?.academy ?? 'AREF'} · {targetMeta?.province ?? 'Direction Provinciale'} · Niveau {targetMeta?.level ?? '2APIC'} · {targetMeta?.schoolYear ?? ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155', lineHeight: 1.5 }}>
              <div>
                Professeur : <strong>{config.teacherName || 'Non renseigné'}</strong>
              </div>
              <div>
                Évaluation : <strong>{EVALUATION_COLUMN_LABELS[selectedColumn]}</strong>
              </div>
            </div>
          </div>

          {/* Complete statistical indicators grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            {[
              { k: 'Effectif total', v: String(targetStats.effectif) },
              { k: 'Élèves notés', v: String(targetStats.notesCount) },
              { k: 'Absents (0 / vide)', v: `${targetStats.absentCount} (${targetStats.zeroCount} note 0)` },
              { k: 'Taux de réussite (≥10)', v: `${fmt(targetStats.successRate, 1)}%` },
              { k: 'Moyenne (x̄)', v: `${fmt(targetStats.mean)} / 20` },
              { k: 'Médiane (Me)', v: `${fmt(targetStats.median)} / 20` },
              { k: 'Écart-type (σ) / Var (V)', v: `${fmt(targetStats.stdDev)} / ${fmt(targetStats.variance)}` },
              { k: 'Min – Max (Étendue)', v: `${fmt(targetStats.min)} – ${fmt(targetStats.max)} (E=${fmt(targetStats.range)})` },
            ].map((cell) => (
              <div
                key={cell.k}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>{cell.k}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {cell.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block 2: High-Resolution Charts */}
        <div data-pdf-block="charts" style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
            Visualisations statistiques & Groupes de besoins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Chart 1: Histogram */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#1E293B' }}>
                Histogramme de distribution des notes (/20)
              </div>
              <BarChart
                width={355}
                height={185}
                data={targetStats.histogram}
                margin={{ top: 6, right: 8, left: -18, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="bucket" interval={0} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} allowDecimals={false} />
                <Bar dataKey="count" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {targetStats.histogram.map((entry) => (
                    <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#1D4ED8'} />
                  ))}
                </Bar>
              </BarChart>
            </div>

            {/* Chart 2: Need Groups Donut */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#1E293B' }}>
                Répartition des 3 Groupes de besoins
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <PieChart width={185} height={175}>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={70}
                    isAnimationActive={false}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div style={{ fontSize: '10px', lineHeight: 1.8, flex: 1 }}>
                  {donutData.map((d) => (
                    <div key={d.name} style={{ color: d.color, fontWeight: 700 }}>
                      ● {d.name.split('·')[0]} : {d.value} élèves
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: Comparative Bar Chart */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#1E293B' }}>
              Comparatif des moyennes (/20) — Seuil de réussite 10/20
            </div>
            <BarChart
              width={735}
              height={175}
              data={comparisonData}
              margin={{ top: 6, right: 12, left: -16, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={comparisonData.length > 5 ? -20 : 0}
                textAnchor={comparisonData.length > 5 ? 'end' : 'middle'}
                height={38}
                tick={{ fontSize: 10, fill: '#334155' }}
              />
              <YAxis domain={[0, 20]} tick={{ fontSize: 10, fill: '#475569' }} />
              <ReferenceLine y={10} stroke="#DC2626" strokeDasharray="4 4" />
              <Bar dataKey="moyenne" fill="#1D4ED8" isAnimationActive={false} radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </div>
        </div>

        {/* Block 3: Podium Super Stars + Automatic Pedagogical Diagnostic */}
        <div data-pdf-block="podium-diagnostics" style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Podium Super Stars — {targetStats.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            {[0, 1, 2].map((idx) => {
              const st = targetStats.top3[idx];
              const labels = ['1er · Or', '2e · Argent', '3e · Bronze'];
              const bgs = ['#FFFBEB', '#F8FAFC', '#FFF7ED'];
              const borders = ['#FCD34D', '#CBD5E1', '#FDBA74'];
              const Icon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
              return (
                <div
                  key={idx}
                  style={{
                    border: `1px solid ${borders[idx]}`,
                    backgroundColor: bgs[idx],
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>{labels[idx]}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                      {st ? st.fullName : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontFamily: '"IBM Plex Mono", monospace' }}>
                      {st ? `${withGroups ? st.groupId : st.className}` : ''}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px', fontFamily: '"IBM Plex Mono", monospace' }}>
                      {st ? `${st.score.toFixed(2).replace('.', ',')}/20` : '—'}
                    </div>
                  </div>
                  <Icon size={22} color="#B45309" />
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Diagnostic pédagogique automatique
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {diagnostics.map((d) => (
              <div
                key={d.id}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0F172A' }}>
                  <span>{d.diagnosticTitle}</span>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: '#475569' }}>
                    {d.conditionLabel}
                  </span>
                </div>
                <div style={{ marginTop: '3px', color: '#334155' }}>
                  <strong>Interprétation :</strong> {d.interpretation}
                </div>
                <div style={{ marginTop: '2px', color: '#1E293B' }}>
                  <strong>Action :</strong> {d.action}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Block 4: Global Classes Summary Table when exporting Global */}
        {effectiveScopeType === 'global' && rankedClassesGlobal.length > 0 && (
          <div data-pdf-block="global-classes-table" style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Tableau synthétique des {rankedClassesGlobal.length} classes
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Rang</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Classe</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Notés/Eff.</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Abs.(0)</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Moyenne</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Médiane</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>σ</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Min–Max</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Réussite</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rankedClassesGlobal.map((c) => (
                  <tr key={c.className} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '5px 6px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>#{c.rank}</td>
                    <td style={{ padding: '5px 6px', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>{c.className}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>{c.notesCount}/{c.effectif}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace', color: '#B91C1C' }}>{c.absentCount}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>{fmt(c.mean)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>{fmt(c.median)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>{fmt(c.stdDev)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>{fmt(c.min, 1)}–{fmt(c.max, 1)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>{fmt(c.successRate, 1)}%</td>
                    <td style={{ padding: '5px 6px' }}>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Block 5+: Need Groups Nominative Lists (chunked by 48 rows / 2-column grid for clean pagination) */}
        {needGroupBlocks.map((grp) => {
          const chunks = chunkArray(grp.students, 44);
          if (chunks.length === 0) {
            return (
              <div
                key={grp.title}
                data-pdf-block={`need-${grp.title}`}
                style={{ padding: '10px 16px', backgroundColor: '#FFFFFF' }}
              >
                <div
                  style={{
                    border: `1px solid ${grp.border}`,
                    backgroundColor: grp.bg,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: grp.color,
                    fontWeight: 700,
                  }}
                >
                  {grp.title} — 0 élève ({grp.action})
                </div>
              </div>
            );
          }

          return chunks.map((chunk, chunkIdx) => (
            <div
              key={`${grp.title}-${chunkIdx}`}
              data-pdf-block={`need-${grp.title}-${chunkIdx}`}
              style={{ padding: '10px 16px', backgroundColor: '#FFFFFF' }}
            >
              <div
                style={{
                  border: `1px solid ${grp.border}`,
                  backgroundColor: grp.bg,
                  borderRadius: '6px 6px 0 0',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: grp.color }}>
                    {grp.title} {chunks.length > 1 ? `(suite ${chunkIdx + 1}/${chunks.length})` : ''}
                  </div>
                  <div style={{ fontSize: '10px', color: grp.color }}>{grp.action}</div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: grp.color, fontFamily: '"IBM Plex Mono", monospace' }}>
                  {grp.students.length} élèves
                </div>
              </div>
              <div
                style={{
                  border: `1px solid ${grp.border}`,
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0 12px',
                  padding: '6px 10px',
                }}
              >
                {chunk.map((st, idx) => (
                  <div
                    key={`${st.massarCode}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      padding: '3px 0',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <span style={{ color: '#0F172A' }}>
                      <strong>{st.fullName}</strong>{' '}
                      <span style={{ color: '#64748B', fontFamily: '"IBM Plex Mono", monospace' }}>
                        ({withGroups ? st.groupId : st.className})
                      </span>
                    </span>
                    <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, color: grp.color }}>
                      {st.score.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ));
        })}

        {/* Final Block: Liste des Absents (0 / Col. H / vide) */}
        <div data-pdf-block="absents-list" style={{ padding: '10px 16px', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px 6px 0 0',
              padding: '8px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
              Liste des élèves absents ou note égale à 0 (exclus des calculs)
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C', fontFamily: '"IBM Plex Mono", monospace' }}>
              {targetStats.absentStudents.length} absent(s) ({targetStats.zeroCount} note 0)
            </div>
          </div>
          <div
            style={{
              border: '1px solid #CBD5E1',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              padding: '6px 10px',
            }}
          >
            {targetStats.absentStudents.length === 0 ? (
              <div style={{ fontSize: '10px', color: '#64748B', padding: '4px 0' }}>
                Aucun élève absent dans ce périmètre.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                {targetStats.absentStudents.map((ab, idx) => (
                  <div
                    key={`${ab.massarCode}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      padding: '3px 0',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <span style={{ color: '#0F172A' }}>
                      <strong>{ab.fullName}</strong>{' '}
                      <span style={{ color: '#64748B', fontFamily: '"IBM Plex Mono", monospace' }}>
                        ({withGroups ? ab.groupId : ab.className})
                      </span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#B91C1C' }}>{ab.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
