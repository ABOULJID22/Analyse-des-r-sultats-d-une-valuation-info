import {
  DiagnosticRuleResult,
  DocimoStats,
  EvaluationColumn,
  HistogramBucket,
  ImportedClass,
  ItemAnalysisResult,
  ItemScoreInput,
  PedagogicalStatus,
  RankedDocimoStats,
  ScoredStudent,
  StudentRecord,
} from '../types/docimology';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function buildGroupId(className: string, groupNumber: 1 | 2): string {
  return `${className} - G${groupNumber}`;
}

export function assignGroupNumber(rankInClass: number): 1 | 2 {
  return rankInClass <= 20 ? 1 : 2;
}

export function getPedagogicalStatus(
  mean: number | null,
  successRate: number | null
): PedagogicalStatus {
  if (mean === null || successRate === null) return 'Sans données';
  if (mean >= 13 && successRate >= 75) return 'Excellence';
  if (mean >= 10 && successRate >= 55) return 'Satisfaisant';
  if (mean >= 8.5 || successRate >= 40) return 'Vigilance';
  return 'Remédiation';
}

export function buildHistogram(scores: number[]): HistogramBucket[] {
  const ranges: { bucket: string; min: number; max: number; inclusiveMax?: boolean }[] = [
    { bucket: '[0-5[', min: 0, max: 5 },
    { bucket: '[5-8[', min: 5, max: 8 },
    { bucket: '[8-10[', min: 8, max: 10 },
    { bucket: '[10-12[', min: 10, max: 12 },
    { bucket: '[12-15[', min: 12, max: 15 },
    { bucket: '[15-20]', min: 15, max: 20, inclusiveMax: true },
  ];

  const total = scores.length;

  return ranges.map((r) => {
    const count = scores.filter((s) =>
      r.inclusiveMax ? s >= r.min && s <= r.max : s >= r.min && s < r.max
    ).length;

    return {
      bucket: r.bucket,
      count,
      percentage: total > 0 ? round2((count / total) * 100) : 0,
      min: r.min,
      max: r.max,
    };
  });
}

export function computeMedian(sortedAsc: number[]): number | null {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return round2(sortedAsc[mid]);
  }
  return round2((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
}

export function computeDocimoStats(
  id: string,
  label: string,
  className: string,
  students: StudentRecord[],
  column: EvaluationColumn,
  groupNumber?: 1 | 2
): DocimoStats {
  const effectif = students.length;

  const scoredStudents: ScoredStudent[] = [];
  for (const s of students) {
    const val = s.scores[column];
    if (!s.absent && val !== null && Number.isFinite(val)) {
      scoredStudents.push({
        rankInClass: s.rankInClass,
        groupNumber: s.groupNumber,
        groupId: s.groupId,
        className: s.className,
        massarId: s.massarId,
        massarCode: s.massarCode,
        fullName: s.fullName,
        score: round2(val),
      });
    }
  }

  const notesCount = scoredStudents.length;
  const absentCount = effectif - notesCount;

  if (notesCount === 0) {
    return {
      id,
      label,
      className,
      groupNumber,
      effectif,
      notesCount: 0,
      absentCount,
      mean: null,
      min: null,
      max: null,
      range: null,
      median: null,
      variance: null,
      stdDev: null,
      successCount: 0,
      successRate: null,
      histogram: buildHistogram([]),
      needGroups: { g1: [], g2: [], g3: [] },
      top3: [],
      status: 'Sans données',
    };
  }

  const values = scoredStudents.map((s) => s.score);
  const sortedAsc = [...values].sort((a, b) => a - b);

  const sum = values.reduce((acc, v) => acc + v, 0);
  const meanRaw = sum / notesCount;
  const mean = round2(meanRaw);
  const min = sortedAsc[0];
  const max = sortedAsc[sortedAsc.length - 1];
  const range = round2(max - min);
  const median = computeMedian(sortedAsc);

  // Population variance: Sum((x_i - x_bar)^2) / N
  const sqDiffSum = values.reduce((acc, v) => acc + (v - meanRaw) ** 2, 0);
  const varianceRaw = sqDiffSum / notesCount;
  const variance = round2(varianceRaw);
  const stdDev = round2(Math.sqrt(varianceRaw));

  const successCount = values.filter((v) => v >= 10).length;
  const successRate = round2((successCount / notesCount) * 100);

  // Sort scored students descending for Top 3 and need groups
  const sortedStudentsDesc = [...scoredStudents].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.rankInClass - b.rankInClass;
  });

  const g1 = sortedStudentsDesc.filter((s) => s.score >= 11);
  const g2 = sortedStudentsDesc.filter((s) => s.score >= 8 && s.score < 11);
  const g3 = sortedStudentsDesc.filter((s) => s.score < 8);

  return {
    id,
    label,
    className,
    groupNumber,
    effectif,
    notesCount,
    absentCount,
    mean,
    min,
    max,
    range,
    median,
    variance,
    stdDev,
    successCount,
    successRate,
    histogram: buildHistogram(values),
    needGroups: { g1, g2, g3 },
    top3: sortedStudentsDesc.slice(0, 3),
    status: getPedagogicalStatus(mean, successRate),
  };
}

export function computeAllStats(
  classes: ImportedClass[],
  column: EvaluationColumn
): {
  groupStats: DocimoStats[];
  classStats: DocimoStats[];
  globalStats: DocimoStats;
  globalTop3: ScoredStudent[];
} {
  const groupStats: DocimoStats[] = [];
  const classStats: DocimoStats[] = [];
  const allStudents: StudentRecord[] = [];

  for (const cls of classes) {
    const cname = cls.metadata.className;
    allStudents.push(...cls.students);

    classStats.push(computeDocimoStats(cname, cname, cname, cls.students, column));

    const g1Students = cls.students.filter((s) => s.groupNumber === 1);
    const g2Students = cls.students.filter((s) => s.groupNumber === 2);

    if (g1Students.length > 0) {
      const g1Id = buildGroupId(cname, 1);
      groupStats.push(computeDocimoStats(g1Id, g1Id, cname, g1Students, column, 1));
    }
    if (g2Students.length > 0) {
      const g2Id = buildGroupId(cname, 2);
      groupStats.push(computeDocimoStats(g2Id, g2Id, cname, g2Students, column, 2));
    }
  }

  const globalStats = computeDocimoStats(
    'GLOBAL',
    'Niveau Global (2APIC)',
    'Toutes classes',
    allStudents,
    column
  );

  return {
    groupStats,
    classStats,
    globalStats,
    globalTop3: globalStats.top3,
  };
}

export function rankEntities(
  entities: DocimoStats[],
  sortBy: 'mean' | 'successRate' = 'mean'
): RankedDocimoStats[] {
  const sorted = [...entities].sort((a, b) => {
    const aPrimary = sortBy === 'mean' ? a.mean : a.successRate;
    const bPrimary = sortBy === 'mean' ? b.mean : b.successRate;

    if (aPrimary === null && bPrimary === null) return 0;
    if (aPrimary === null) return 1;
    if (bPrimary === null) return -1;

    if (bPrimary !== aPrimary) return bPrimary - aPrimary;

    // Tie-breaker: secondary metric then lower stdDev
    const aSec = sortBy === 'mean' ? a.successRate ?? -1 : a.mean ?? -1;
    const bSec = sortBy === 'mean' ? b.successRate ?? -1 : b.mean ?? -1;
    if (bSec !== aSec) return bSec - aSec;

    return (a.stdDev ?? 99) - (b.stdDev ?? 99);
  });

  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

export function computeItemAnalysis(items: ItemScoreInput[]): ItemAnalysisResult[] {
  return items.map((item) => {
    const safeMax = item.maxPoints > 0 ? item.maxPoints : 1;
    const facilityIndex = round2(
      Math.max(0, Math.min(1, item.overallAvgPoints / safeMax))
    );
    const discriminationIndex = round2(
      Math.max(-1, Math.min(1, (item.upperAvgPoints - item.lowerAvgPoints) / safeMax))
    );

    const facilityTag: ItemAnalysisResult['facilityTag'] =
      facilityIndex < 0.3
        ? 'Trop difficile (F < 0,30)'
        : facilityIndex > 0.7
        ? 'Très facile (F > 0,70)'
        : 'Adapté (0,30–0,70)';

    const discriminationTag: ItemAnalysisResult['discriminationTag'] =
      discriminationIndex <= 0
        ? 'Négatif / À revoir'
        : discriminationIndex < 0.2
        ? 'Faible (< 0,20)'
        : discriminationIndex < 0.4
        ? 'Acceptable (0,20–0,39)'
        : 'Discriminant (≥ 0,40)';

    return {
      id: item.id,
      label: item.label,
      competency: item.competency,
      maxPoints: item.maxPoints,
      facilityIndex,
      discriminationIndex,
      facilityTag,
      discriminationTag,
    };
  });
}

export function generateDiagnostics(
  stats: DocimoStats,
  itemResults: ItemAnalysisResult[] = []
): DiagnosticRuleResult[] {
  const results: DiagnosticRuleResult[] = [];
  const { mean, stdDev, median, successRate, notesCount } = stats;

  if (notesCount === 0 || mean === null || stdDev === null || median === null) {
    return [
      {
        id: 'no-data',
        conditionLabel: 'Aucune note disponible',
        diagnosticTitle: 'Données insuffisantes',
        interpretation: 'Aucune note valide n’a été saisie pour la colonne sélectionnée.',
        action: 'Importer un fichier Massar complété ou changer de colonne d’évaluation.',
        severity: 'info',
      },
    ];
  }

  // Rule 1: Moyenne faible (< 10) + Écart-type faible (< 2,5)
  if (mean < 10 && stdDev < 2.5) {
    results.push({
      id: 'collective-difficulty',
      conditionLabel: `Moyenne (${mean.toFixed(2)}) < 10 et σ (${stdDev.toFixed(2)}) < 2,5`,
      diagnosticTitle: 'Difficulté collective',
      interpretation: 'La majorité des élèves n’a pas compris la notion évaluée (échec homogène).',
      action:
        'Remédiation collective : reprendre le cours autrement avec des exemples guidés et des exercices gradués.',
      severity: 'critical',
    });
  }

  // Rule 2: Moyenne faible (< 10) + Écart-type élevé (>= 3,5)
  if (mean < 10 && stdDev >= 3.5) {
    results.push({
      id: 'heterogeneous-class',
      conditionLabel: `Moyenne (${mean.toFixed(2)}) < 10 et σ (${stdDev.toFixed(2)}) ≥ 3,5`,
      diagnosticTitle: 'Classe hétérogène',
      interpretation:
        'Niveaux très disparates et lacunes inégales entre un pôle avancé et un pôle en grande difficulté.',
      action:
        'Mettre en place des groupes de besoins, un soutien ciblé et une pédagogie différenciée.',
      severity: 'critical',
    });
  }

  // Rule 2b: Moyenne faible (< 10) + Écart-type intermédiaire (2.5 <= σ < 3.5)
  if (mean < 10 && stdDev >= 2.5 && stdDev < 3.5) {
    results.push({
      id: 'moderate-fragility',
      conditionLabel: `Moyenne (${mean.toFixed(2)}) < 10 et σ modéré (${stdDev.toFixed(2)})`,
      diagnosticTitle: 'Fragilité générale modérée',
      interpretation:
        'Le niveau moyen reste sous le seuil de maîtrise (10/20) avec une dispersion modérée.',
      action:
        'Consolidation ciblée sur les prérequis et entraînement méthodologique avant le prochain contrôle.',
      severity: 'warning',
    });
  }

  // Rule 3: Médiane très inférieure à la moyenne (mean - median >= 1.0)
  if (mean - median >= 1.0) {
    results.push({
      id: 'subgroup-struggling',
      conditionLabel: `Médiane (${median.toFixed(2)}) très inférieure à la moyenne (${mean.toFixed(2)})`,
      diagnosticTitle: 'Sous-groupe en difficulté',
      interpretation:
        'Quelques très bonnes notes tirent la moyenne vers le haut et masquent plusieurs élèves faibles.',
      action:
        'Organiser un soutien spécifique pour le groupe inférieur et instaurer du tutorat par les pairs.',
      severity: 'warning',
    });
  }

  // Positive / Maintenance status when no statistical weakness triggered
  if (mean >= 10 && stdDev >= 3.5 && results.length === 0) {
    results.push({
      id: 'high-mean-heterogeneous',
      conditionLabel: `Moyenne (${mean.toFixed(2)}) ≥ 10 mais σ (${stdDev.toFixed(2)}) ≥ 3,5`,
      diagnosticTitle: 'Maîtrise hétérogène',
      interpretation:
        'Le taux global est positif mais les écarts entre élèves restent importants.',
      action:
        'Maintenir l’approfondissement pour le groupe 1 tout en ciblant les élèves sous 10/20.',
      severity: 'info',
    });
  }

  if (results.length === 0) {
    results.push({
      id: 'balanced-mastery',
      conditionLabel: `Moyenne ${mean.toFixed(2)}/20 · Réussite ${successRate?.toFixed(1)}% · σ ${stdDev.toFixed(2)}`,
      diagnosticTitle: mean >= 13 ? 'Excellente maîtrise du groupe' : 'Acquisition satisfaisante et équilibrée',
      interpretation:
        'Les indicateurs docimologiques montrent une progression régulière et une bonne homogénéité.',
      action:
        'Poursuivre le rythme pédagogique, valoriser les Super Stars en tutorat et proposer des défis d’algorithmique.',
      severity: 'success',
    });
  }

  // Item rules (if provided, appended after statistical class status)
  if (itemResults.length > 0) {
    const hardItems = itemResults.filter((i) => i.facilityIndex < 0.3);
    if (hardItems.length >= 2) {
      results.push({
        id: 'items-unmastered',
        conditionLabel: `${hardItems.length} items avec F < 0,30`,
        diagnosticTitle: 'Notions non maîtrisées (Items)',
        interpretation: `Plusieurs questions (${hardItems.map((i) => i.label).join(', ')}) présentent une réussite très faible.`,
        action:
          'Revoir l’enseignement des notions concernées et/ou simplifier la formulation des items.',
        severity: 'warning',
      });
    }

    const easyItems = itemResults.filter((i) => i.facilityIndex > 0.7);
    if (easyItems.length > itemResults.length / 2) {
      results.push({
        id: 'items-low-demand',
        conditionLabel: `${easyItems.length}/${itemResults.length} items avec F > 0,70`,
        diagnosticTitle: 'Niveau d’exigence faible (Items)',
        interpretation:
          'La majorité des items est réussie trop facilement, limitant la mesure de l’excellence.',
        action:
          'Rehausser progressivement la complexité cognitive (application, transfert, résolution de problèmes).',
        severity: 'info',
      });
    }

    const poorDiscItems = itemResults.filter((i) => i.discriminationIndex < 0.15);
    if (poorDiscItems.length > 0) {
      results.push({
        id: 'items-poor-id',
        conditionLabel: `${poorDiscItems.length} item(s) avec ID faible ou négatif`,
        diagnosticTitle: 'Question à revoir (ID)',
        interpretation: `L’indice de discrimination est faible ou négatif sur : ${poorDiscItems.map((i) => i.label).join(', ')}.`,
        action:
          'Réécrire, supprimer ou remplacer ces items qui ne distinguent pas les niveaux de maîtrise.',
        severity: 'warning',
      });
    }
  }

  return results;
}
