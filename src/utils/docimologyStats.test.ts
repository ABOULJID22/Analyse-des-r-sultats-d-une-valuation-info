import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  assignGroupNumber,
  computeAllStats,
  computeDocimoStats,
  computeItemAnalysis,
  generateDiagnostics,
  rankEntities,
} from './docimologyStats';
import {
  buildMassarWorkbookFromClasses,
  parseMassarWorkbook,
} from './massarParser';
import { generateDemoClasses, DEMO_ITEMS_INFORMATIQUE } from '../data/demoData';
import { StudentRecord } from '../types/docimology';

function makeStudent(
  rankInClass: number,
  scoreG: number | null,
  absent = false
): StudentRecord {
  const groupNumber = assignGroupNumber(rankInClass);
  return {
    rankInClass,
    groupNumber,
    groupId: `2APIC-1 - G${groupNumber}`,
    className: '2APIC-1',
    massarId: String(rankInClass),
    massarCode: `G1300${rankInClass}`,
    fullName: `ELEVE ${rankInClass}`,
    scores: { G: scoreG, I: null, K: null, M: null },
    absent,
  };
}

test('assignGroupNumber splits ranks 1-20 into G1 and 21+ into G2', () => {
  assert.equal(assignGroupNumber(1), 1);
  assert.equal(assignGroupNumber(20), 1);
  assert.equal(assignGroupNumber(21), 2);
  assert.equal(assignGroupNumber(40), 2);
});

test('computeDocimoStats computes exact mean, median, variance, stdDev, range, successRate, and excludes absents', () => {
  // Scores: [6, 8, 10, 14, 17] -> sum = 55, N = 5, mean = 11
  // Deviations: [-5, -3, -1, 3, 6] -> sq = [25, 9, 1, 9, 36] = 80
  // Variance = 80/5 = 16, stdDev = 4
  // Median = 10, Min = 6, Max = 17, Range = 11
  // Success (>= 10): 3/5 = 60%
  const students: StudentRecord[] = [
    makeStudent(1, 6),
    makeStudent(2, 8),
    makeStudent(3, 10),
    makeStudent(4, 14),
    makeStudent(5, 17),
    makeStudent(6, 15, true), // absent: must be excluded from graded stats
    makeStudent(7, null, false), // missing score: excluded from graded stats
  ];

  const stats = computeDocimoStats('2APIC-1', '2APIC-1', '2APIC-1', students, 'G');

  assert.equal(stats.effectif, 7);
  assert.equal(stats.notesCount, 5);
  assert.equal(stats.absentCount, 2);
  assert.equal(stats.mean, 11);
  assert.equal(stats.min, 6);
  assert.equal(stats.max, 17);
  assert.equal(stats.range, 11);
  assert.equal(stats.median, 10);
  assert.equal(stats.variance, 16);
  assert.equal(stats.stdDev, 4);
  assert.equal(stats.successCount, 3);
  assert.equal(stats.successRate, 60);

  // Need groups: >= 11 -> [17, 14], 8..10.99 -> [10, 8], < 8 -> [6]
  assert.deepEqual(
    stats.needGroups.g1.map((s) => s.score),
    [17, 14]
  );
  assert.deepEqual(
    stats.needGroups.g2.map((s) => s.score),
    [10, 8]
  );
  assert.deepEqual(
    stats.needGroups.g3.map((s) => s.score),
    [6]
  );
});

test('computeDocimoStats computes even-length median correctly', () => {
  const students = [
    makeStudent(1, 8),
    makeStudent(2, 10),
    makeStudent(3, 13),
    makeStudent(4, 15),
  ];
  const stats = computeDocimoStats('TEST', 'TEST', 'TEST', students, 'G');
  assert.equal(stats.median, 11.5);
});

test('generateDiagnostics triggers docimological rules accurately', () => {
  // Collective difficulty: mean < 10 and stdDev < 2.5
  const collectiveStats = computeDocimoStats(
    'C1',
    'C1',
    'C1',
    [makeStudent(1, 7), makeStudent(2, 8), makeStudent(3, 9), makeStudent(4, 8)],
    'G'
  );
  const d1 = generateDiagnostics(collectiveStats);
  assert.ok(d1.some((r) => r.diagnosticTitle === 'Difficulté collective'));

  // Heterogeneous class: mean < 10 and stdDev >= 3.5
  const heteroStats = computeDocimoStats(
    'C2',
    'C2',
    'C2',
    [makeStudent(1, 3), makeStudent(2, 4), makeStudent(3, 12), makeStudent(4, 15)],
    'G'
  );
  const d2 = generateDiagnostics(heteroStats);
  assert.ok(d2.some((r) => r.diagnosticTitle === 'Classe hétérogène'));

  // Subgroup struggling: median << mean
  const skewStats = computeDocimoStats(
    'C3',
    'C3',
    'C3',
    [
      makeStudent(1, 6),
      makeStudent(2, 6.5),
      makeStudent(3, 7),
      makeStudent(4, 18),
      makeStudent(5, 19),
    ],
    'G'
  );
  const d3 = generateDiagnostics(skewStats);
  assert.ok(d3.some((r) => r.diagnosticTitle === 'Sous-groupe en difficulté'));
});

test('computeItemAnalysis calculates Facility (F) and Discrimination (ID)', () => {
  const results = computeItemAnalysis(DEMO_ITEMS_INFORMATIQUE);
  assert.equal(results.length, 5);
  // Q3: overallAvg 1.35 / 5 = 0.27 -> Trop difficile (F < 0,30)
  const q3 = results.find((r) => r.id === 'Q3');
  assert.ok(q3);
  assert.equal(q3.facilityIndex, 0.27);
  assert.equal(q3.facilityTag, 'Trop difficile (F < 0,30)');
  // Q3 ID: (3.1 - 0.5) / 5 = 0.52 -> Discriminant
  assert.equal(q3.discriminationIndex, 0.52);
});

test('demo dataset has 12 classes and 24 groups and roundtrips through Massar Excel parser', () => {
  const demo = generateDemoClasses();
  assert.equal(demo.length, 12);

  const { groupStats, classStats, globalStats } = computeAllStats(demo, 'G');
  assert.equal(classStats.length, 12);
  assert.equal(groupStats.length, 24);
  assert.ok(globalStats.notesCount > 400);

  const ranked = rankEntities(classStats, 'mean');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[11].rank, 12);

  // Roundtrip single-class Massar workbook (NotesCC)
  const wbSingle = buildMassarWorkbookFromClasses([demo[1]]); // 2APIC-2
  const buffer = XLSX.write(wbSingle, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const parsed = parseMassarWorkbook(buffer, 'export_notesCC_2APIC-2.xlsx');

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].metadata.className, '2APIC-2');
  assert.equal(parsed[0].metadata.level, '2APIC');
  assert.equal(parsed[0].metadata.schoolYear, '2025/2026');
  assert.equal(parsed[0].students.length, demo[1].students.length);
  assert.equal(parsed[0].students[0].groupNumber, 1);
  assert.equal(parsed[0].students[20].groupNumber, 2);
});
