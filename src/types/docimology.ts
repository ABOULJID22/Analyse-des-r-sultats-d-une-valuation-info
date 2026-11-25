export type EvaluationColumn = 'G' | 'I' | 'K' | 'M';

export const EVALUATION_COLUMN_LABELS: Record<EvaluationColumn, string> = {
  G: 'DS1 (Colonne G)',
  I: 'DS2 (Colonne I)',
  K: 'DS3 (Colonne K)',
  M: 'Activités intégrées (Colonne M)',
};

export interface StudentRecord {
  rankInClass: number;
  groupNumber: 1 | 2;
  groupId: string;
  className: string;
  massarId: string;
  massarCode: string;
  fullName: string;
  scores: Record<EvaluationColumn, number | null>;
  absent: boolean;
}

export interface ClassMetadata {
  className: string; // I9 (ex: 2APIC-2)
  level: string; // D9 (ex: 2APIC)
  academy: string; // D7
  province: string; // I7
  schoolYear: string; // D13
  sourceFile: string;
}

export interface ImportedClass {
  metadata: ClassMetadata;
  students: StudentRecord[];
}

export interface ScoredStudent {
  rankInClass: number;
  groupNumber: 1 | 2;
  groupId: string;
  className: string;
  massarId: string;
  massarCode: string;
  fullName: string;
  score: number;
}

export interface HistogramBucket {
  bucket: string;
  count: number;
  percentage: number;
  min: number;
  max: number;
}

export type PedagogicalStatus =
  | 'Excellence'
  | 'Satisfaisant'
  | 'Vigilance'
  | 'Remédiation'
  | 'Sans données';

export interface NeedGroupsSplit {
  g1: ScoredStudent[]; // >= 11/20 (En réussite)
  g2: ScoredStudent[]; // 8 - 10.99/20 (Proches du seuil)
  g3: ScoredStudent[]; // < 8/20 (En difficulté)
}

export interface DocimoStats {
  id: string;
  label: string;
  className: string;
  groupNumber?: 1 | 2;
  effectif: number;
  notesCount: number;
  absentCount: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  range: number | null;
  median: number | null;
  variance: number | null;
  stdDev: number | null;
  successCount: number;
  successRate: number | null;
  histogram: HistogramBucket[];
  needGroups: NeedGroupsSplit;
  top3: ScoredStudent[];
  status: PedagogicalStatus;
}

export interface RankedDocimoStats extends DocimoStats {
  rank: number;
}

export interface ItemScoreInput {
  id: string;
  label: string;
  competency: string;
  maxPoints: number;
  /** Average score in upper 27% group (0..maxPoints) */
  upperAvgPoints: number;
  /** Average score in lower 27% group (0..maxPoints) */
  lowerAvgPoints: number;
  /** Overall average score across all graded students (0..maxPoints) */
  overallAvgPoints: number;
}

export interface ItemAnalysisResult {
  id: string;
  label: string;
  competency: string;
  maxPoints: number;
  facilityIndex: number; // F = overallAvgPoints / maxPoints
  discriminationIndex: number; // ID = (upperAvgPoints - lowerAvgPoints) / maxPoints
  facilityTag: 'Trop difficile (F < 0,30)' | 'Adapté (0,30–0,70)' | 'Très facile (F > 0,70)';
  discriminationTag: 'Négatif / À revoir' | 'Faible (< 0,20)' | 'Acceptable (0,20–0,39)' | 'Discriminant (≥ 0,40)';
}

export interface DiagnosticRuleResult {
  id: string;
  conditionLabel: string;
  diagnosticTitle: string;
  interpretation: string;
  action: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
}

export type ActiveTab =
  | 'import'
  | 'groups'
  | 'classes'
  | 'tournament'
  | 'diagnostics';
