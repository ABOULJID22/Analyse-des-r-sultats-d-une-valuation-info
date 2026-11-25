import * as XLSX from 'xlsx';
import {
  ClassMetadata,
  DocimoStats,
  EvaluationColumn,
  EVALUATION_COLUMN_LABELS,
  ImportedClass,
  StudentRecord,
} from '../types/docimology';
import { assignGroupNumber, buildGroupId, rankEntities } from './docimologyStats';

function getCellValue(sheet: XLSX.WorkSheet, address: string): string {
  const cell = sheet[address];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function parseNumericScore(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0 || raw > 20) return null;
    return Math.round(raw * 100) / 100;
  }
  const normalized = String(raw).trim().replace(',', '.');
  if (!normalized) return null;
  // Ignore common absence strings placed directly in score cell
  if (/^(a|abs|absent|غ|غائب|-|--)$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 20) return null;
  return Math.round(parsed * 100) / 100;
}

function isAbsentMarker(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  const text = String(raw).trim();
  if (!text) return false;
  if (/^(0|non|no|false|حاضر)$/i.test(text)) return false;
  return true;
}

export function parseMassarSheet(
  sheet: XLSX.WorkSheet,
  sourceFile: string,
  fallbackClassName: string
): ImportedClass | null {
  const className = getCellValue(sheet, 'I9') || fallbackClassName;
  const level = getCellValue(sheet, 'D9') || '2APIC';
  const academy = getCellValue(sheet, 'D7') || 'Académie Régionale';
  const province = getCellValue(sheet, 'I7') || 'Direction Provinciale';
  const schoolYear = getCellValue(sheet, 'D13') || '2025/2026';

  const metadata: ClassMetadata = {
    className,
    level,
    academy,
    province,
    schoolYear,
    sourceFile,
  };

  const ref = sheet['!ref'];
  if (!ref) return null;
  const range = XLSX.utils.decode_range(ref);

  const students: StudentRecord[] = [];
  let rankCounter = 0;

  // Row 18 in Excel = 0-indexed row 17
  for (let r = 17; r <= range.e.r; r++) {
    const colB = sheet[XLSX.utils.encode_cell({ r, c: 1 })]?.v; // ID Massar
    const colC = sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v; // Code Massar
    const colD = sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v; // Nom et Prénom
    const colG = sheet[XLSX.utils.encode_cell({ r, c: 6 })]?.v; // DS1
    const colH = sheet[XLSX.utils.encode_cell({ r, c: 7 })]?.v; // Absence
    const colI = sheet[XLSX.utils.encode_cell({ r, c: 8 })]?.v; // DS2
    const colK = sheet[XLSX.utils.encode_cell({ r, c: 10 })]?.v; // DS3
    const colM = sheet[XLSX.utils.encode_cell({ r, c: 12 })]?.v; // Activités

    const fullName = colD !== undefined && colD !== null ? String(colD).trim() : '';
    const massarCode = colC !== undefined && colC !== null ? String(colC).trim() : '';
    const massarId = colB !== undefined && colB !== null ? String(colB).trim() : '';

    // Skip empty/footer rows that contain neither name nor Massar code
    if (!fullName && !massarCode) continue;
    // Skip summary rows if Massar export has a footer label
    if (/^(moyenne|total|effectif|المعدل|المجموع)/i.test(fullName)) continue;

    rankCounter += 1;
    const groupNumber = assignGroupNumber(rankCounter);

    students.push({
      rankInClass: rankCounter,
      groupNumber,
      groupId: buildGroupId(className, groupNumber),
      className,
      massarId: massarId || String(rankCounter),
      massarCode: massarCode || `M-${className}-${rankCounter}`,
      fullName: fullName || `Élève ${rankCounter}`,
      scores: {
        G: parseNumericScore(colG),
        I: parseNumericScore(colI),
        K: parseNumericScore(colK),
        M: parseNumericScore(colM),
      },
      absent: isAbsentMarker(colH),
    });
  }

  if (students.length === 0) return null;

  return { metadata, students };
}

export function parseMassarWorkbook(
  buffer: ArrayBuffer,
  fileName: string
): ImportedClass[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const results: ImportedClass[] = [];

  // Prioritize NotesCC if present and single-class, or iterate all compatible sheets
  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Ignore non-data helper sheets if NotesCC exists alongside non-Massar tabs
    const hasNotesCC = sheetNames.includes('NotesCC');
    if (hasNotesCC && sheetNames.length === 1 && sheetName !== 'NotesCC') {
      continue;
    }

    const fallbackName =
      sheetName !== 'NotesCC'
        ? sheetName
        : fileName.replace(/\.(xlsx|xls)$/i, '').replace(/^export_notesCC_/i, '') || 'Classe';

    const parsed = parseMassarSheet(sheet, fileName, fallbackName);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

export function buildMassarWorkbookFromClasses(classes: ImportedClass[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  classes.forEach((cls, idx) => {
    const aoa: (string | number | null)[][] = Array.from({ length: 17 }, () =>
      Array(14).fill(null)
    );

    // Massar metadata coordinates (0-indexed)
    // D7 -> r6,c3 | I7 -> r6,c8 | D9 -> r8,c3 | I9 -> r8,c8 | D13 -> r12,c3
    aoa[6][3] = cls.metadata.academy;
    aoa[6][8] = cls.metadata.province;
    aoa[8][3] = cls.metadata.level;
    aoa[8][8] = cls.metadata.className;
    aoa[12][3] = cls.metadata.schoolYear;

    // Headers on row 17 (index 16)
    aoa[16][1] = 'ID Massar';
    aoa[16][2] = 'رقم التلميذ';
    aoa[16][3] = 'إسم التلميذ';
    aoa[16][6] = 'الفرض الأول';
    aoa[16][7] = 'التغيب';
    aoa[16][8] = 'الفرض الثاني';
    aoa[16][10] = 'الفرض الثالث';
    aoa[16][12] = 'الأنشطة';

    for (const st of cls.students) {
      const row: (string | number | null)[] = Array(14).fill(null);
      row[1] = st.massarId;
      row[2] = st.massarCode;
      row[3] = st.fullName;
      row[6] = st.scores.G;
      row[7] = st.absent ? 'A' : '';
      row[8] = st.scores.I;
      row[10] = st.scores.K;
      row[12] = st.scores.M;
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const sheetTitle =
      classes.length === 1
        ? 'NotesCC'
        : (cls.metadata.className || `NotesCC_${idx + 1}`).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  });

  return wb;
}

export function exportStatsToExcel(
  classStats: DocimoStats[],
  groupStats: DocimoStats[],
  globalStats: DocimoStats,
  column: EvaluationColumn
): void {
  const wb = XLSX.utils.book_new();
  const rankedClasses = rankEntities(classStats, 'mean');
  const rankedGroups = rankEntities(groupStats, 'mean');

  const formatRow = (item: DocimoStats, rank?: number) => ({
    Rang: rank ?? '-',
    'Classe / Groupe': item.label,
    Effectif: item.effectif,
    Notés: item.notesCount,
    'Absents (0 / vide)': item.absentCount,
    'Dont notes 0': item.zeroCount,
    Moyenne: item.mean ?? '-',
    Médiane: item.median ?? '-',
    Min: item.min ?? '-',
    Max: item.max ?? '-',
    Étendue: item.range ?? '-',
    Variance: item.variance ?? '-',
    'Écart-type (σ)': item.stdDev ?? '-',
    'Réussite (≥10)': item.successCount,
    'Taux Réussite (%)': item.successRate ?? '-',
    Statut: item.status,
    'Besoin G1 (≥11)': item.needGroups.g1.length,
    'Besoin G2 (8-10.99)': item.needGroups.g2.length,
    'Besoin G3 (<8)': item.needGroups.g3.length,
  });

  const globalSheet = XLSX.utils.json_to_sheet([
    {
      'Évaluation analysée': EVALUATION_COLUMN_LABELS[column],
      ...formatRow(globalStats),
    },
  ]);
  XLSX.utils.book_append_sheet(wb, globalSheet, 'Synthèse Globale');

  const classesSheet = XLSX.utils.json_to_sheet(
    rankedClasses.map((c) => formatRow(c, c.rank))
  );
  XLSX.utils.book_append_sheet(wb, classesSheet, 'Classement Classes');

  if (rankedGroups.length > 0) {
    const groupsSheet = XLSX.utils.json_to_sheet(
      rankedGroups.map((g) => formatRow(g, g.rank))
    );
    XLSX.utils.book_append_sheet(wb, groupsSheet, 'Classement Groupes');
  }

  // Need groups nominative sheet + absents
  const needRows: Record<string, string | number>[] = [];
  const showGroups = rankedGroups.length > 0;
  for (const cls of classStats) {
    for (const s of cls.needGroups.g1) {
      needRows.push({
        Classe: s.className,
        ...(showGroups ? { Groupe: s.groupId } : {}),
        'Code Massar': s.massarCode,
        'Nom & Prénom': s.fullName,
        Note: s.score,
        'Groupe de besoin': 'G1 - En réussite (≥ 11)',
      });
    }
    for (const s of cls.needGroups.g2) {
      needRows.push({
        Classe: s.className,
        ...(showGroups ? { Groupe: s.groupId } : {}),
        'Code Massar': s.massarCode,
        'Nom & Prénom': s.fullName,
        Note: s.score,
        'Groupe de besoin': 'G2 - Proches du seuil (8 - 10,99)',
      });
    }
    for (const s of cls.needGroups.g3) {
      needRows.push({
        Classe: s.className,
        ...(showGroups ? { Groupe: s.groupId } : {}),
        'Code Massar': s.massarCode,
        'Nom & Prénom': s.fullName,
        Note: s.score,
        'Groupe de besoin': 'G3 - En difficulté (< 8)',
      });
    }
    for (const a of cls.absentStudents) {
      needRows.push({
        Classe: a.className,
        ...(showGroups ? { Groupe: a.groupId } : {}),
        'Code Massar': a.massarCode,
        'Nom & Prénom': a.fullName,
        Note: a.reason === 'Note 0' ? 0 : 'Abs',
        'Groupe de besoin': `Absent (${a.reason})`,
      });
    }
  }
  const needsSheet = XLSX.utils.json_to_sheet(needRows);
  XLSX.utils.book_append_sheet(wb, needsSheet, 'Groupes de besoins');

  XLSX.writeFile(wb, `DocimoStats_Rapport_2APIC_${column}.xlsx`);
}
