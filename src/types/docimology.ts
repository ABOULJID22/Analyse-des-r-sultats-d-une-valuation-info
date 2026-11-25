export type EvaluationColumn = 'G' | 'I' | 'K' | 'M';

export const EVALUATION_COLUMN_LABELS: Record<EvaluationColumn, string> = {
  G: 'Contrôle 1',
  I: 'Contrôle 2',
  K: 'Contrôle 3',
  M: 'Activités intégrées',
};

export type OrganizationMode = 'with-groups' | 'without-groups';

export interface AnalysisConfig {
  teacherName: string;
  organizationMode: OrganizationMode | null;
}

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
  className: string; // I9
  level: string; // D9
  academy: string; // D7
  province: string; // I7
  school: string; // O7
  teacherName: string; // O9
  semester: string; // D11
  subject: string; // O11
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

export interface AbsentStudent {
  rankInClass: number;
  groupNumber: 1 | 2;
  groupId: string;
  className: string;
  massarId: string;
  massarCode: string;
  fullName: string;
  reason: 'Note 0' | 'Absent (Col. H)' | 'Note manquante';
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
  zeroCount: number;
  absentStudents: AbsentStudent[];
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
  | 'ranking'
  | 'diagnostics';

export type PdfScopeType = 'group' | 'class' | 'global';
