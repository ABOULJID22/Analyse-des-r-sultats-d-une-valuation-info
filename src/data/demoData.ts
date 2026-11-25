import { ImportedClass, ItemScoreInput, StudentRecord } from '../types/docimology';
import { assignGroupNumber, buildGroupId } from '../utils/docimologyStats';

const FIRST_NAMES_M = [
  'Youssef', 'Hamza', 'Amine', 'Omar', 'Mehdi', 'Ayoub', 'Ziad', 'Rayane',
  'Ilyas', 'Taha', 'Bilal', 'Saad', 'Anas', 'Walid', 'Nassim', 'Adam',
  'Sami', 'Zakaria', 'Khalid', 'Rida',
];

const FIRST_NAMES_F = [
  'Salma', 'Hiba', 'Ines', 'Meryem', 'Yasmine', 'Chaimae', 'Kenza', 'Nour',
  'Lina', 'Aya', 'Rania', 'Dounia', 'Malak', 'Siham', 'Ghita', 'Sara',
  'Imane', 'Khadija', 'Wissal', 'Asmae',
];

const LAST_NAMES = [
  'El Amrani', 'Benali', 'Tazi', 'Berrada', 'Chraibi', 'Fassi', 'Idrissi',
  'Kettani', 'Lahlou', 'Mansouri', 'Naciri', 'Ouali', 'Qadiri', 'Rahmani',
  'Sabiri', 'Tahiri', 'Alaoui', 'Bennani', 'Cherkaoui', 'Daoudi',
  'El Hachimi', 'Filali', 'Ghazali', 'Haddad', 'Jazouli', 'Kabbaj',
  'Lamrani', 'Mekouar', 'Naji', 'Ouazzani', 'Rifi', 'Sefrioui',
  'Toumi', 'Ziani', 'Benslimane', 'El Moutawakil', 'Bouzid', 'Chakiri',
];

// Deterministic pseudo-random generator for reproducible demo data
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clampGrade(val: number): number {
  const clamped = Math.max(1, Math.min(20, val));
  // Round to 0.25 or 0.5 steps realistic for Moroccan grading
  return Math.round(clamped * 4) / 4;
}

interface ClassProfile {
  className: string;
  count: number;
  g1Center: number;
  g2Center: number;
  spread: number;
  skewLowTail?: boolean;
  absentRanks?: number[];
  zeroRanks?: number[];
}

// 12 realistic classes including 2APIC-2 flagship plus 11 varied pedagogical profiles
const CLASS_PROFILES: ClassProfile[] = [
  { className: '2APIC-1', count: 38, g1Center: 13.8, g2Center: 12.6, spread: 2.3, absentRanks: [14], zeroRanks: [33] },
  { className: '2APIC-2', count: 39, g1Center: 14.2, g2Center: 13.1, spread: 2.2, absentRanks: [27], zeroRanks: [12] },
  { className: '2APIC-3', count: 36, g1Center: 11.4, g2Center: 10.6, spread: 2.7, absentRanks: [8, 31] },
  { className: '2APIC-4', count: 40, g1Center: 8.6, g2Center: 8.2, spread: 1.9, absentRanks: [19], zeroRanks: [6] }, // Difficulté collective (<10, σ < 2.5)
  { className: '2APIC-5', count: 37, g1Center: 12.5, g2Center: 11.8, spread: 2.4 },
  { className: '2APIC-6', count: 38, g1Center: 9.7, g2Center: 8.9, spread: 4.3, absentRanks: [5], zeroRanks: [25] }, // Classe hétérogène (<10, σ >= 3.5)
  { className: '2APIC-7', count: 36, g1Center: 15.1, g2Center: 13.9, spread: 2.0 },
  { className: '2APIC-8', count: 39, g1Center: 10.8, g2Center: 9.8, spread: 3.1, skewLowTail: true, absentRanks: [22] }, // Sous-groupe en difficulté
  { className: '2APIC-9', count: 35, g1Center: 11.9, g2Center: 10.9, spread: 2.5 },
  { className: '2APIC-10', count: 38, g1Center: 9.1, g2Center: 7.9, spread: 2.1, absentRanks: [11, 34] }, // Difficulté collective
  { className: '2APIC-11', count: 37, g1Center: 13.2, g2Center: 12.2, spread: 2.6 },
  { className: '2APIC-12', count: 36, g1Center: 10.2, g2Center: 9.4, spread: 3.9, skewLowTail: true, zeroRanks: [15] }, // Hétérogène + sous-groupe
];

// Authentic student roster excerpt inspired by real 2APIC-2 Massar lists, extended deterministically
const CLASS_2APIC2_NAMES = [
  'ALAOUI SALMA', 'BENALI YOUSSEF', 'BERRADA HIBA', 'CHRAIBI AMINE',
  'EL AMRANI INES', 'FASSI OMAR', 'IDRISSI MERYEM', 'KETTANI MEHDI',
  'LAHLOU YASMINE', 'MANSOURI AYOUB', 'NACIRI CHAIMAE', 'OUALI ZIAD',
  'QADIRI KENZA', 'RAHMANI RAYANE', 'SABIRI NOUR', 'TAHIRI ILYAS',
  'TAZI LINA', 'BENNANI TAHA', 'CHERKAOUI AYA', 'DAOUDI BILAL',
  'EL HACHIMI RANIA', 'FILALI SAAD', 'GHAZALI DOUNIA', 'HADDAD ANAS',
  'JAZOULI MALAK', 'KABBAJ WALID', 'LAMRANI SIHAM', 'MEKOUAR NASSIM',
  'NAJI GHITA', 'OUAZZANI ADAM', 'RIFI SARA', 'SEFRIOUI SAMI',
  'TOUMI IMANE', 'ZIANI ZAKARIA', 'BENSLIMANE KHADIJA', 'BOUZID KHALID',
  'CHAKIRI WISSAL', 'EL MOUTAWAKIL RIDA', 'KARIMI ASMAE',
];

export function generateDemoClasses(): ImportedClass[] {
  return CLASS_PROFILES.map((profile, classIdx) => {
    const rand = seededRandom(1042 + classIdx * 137);
    const students: StudentRecord[] = [];

    for (let r = 1; r <= profile.count; r++) {
      const groupNumber = assignGroupNumber(r);
      const isAbsent = profile.absentRanks?.includes(r) ?? false;
      const isZero = profile.zeroRanks?.includes(r) ?? false;

      let fullName: string;
      if (profile.className === '2APIC-2' && r <= CLASS_2APIC2_NAMES.length) {
        fullName = CLASS_2APIC2_NAMES[r - 1];
      } else {
        const isFemale = (r + classIdx) % 2 === 0;
        const firstPool = isFemale ? FIRST_NAMES_F : FIRST_NAMES_M;
        const first = firstPool[(r * 3 + classIdx * 5) % firstPool.length];
        const last = LAST_NAMES[(r * 7 + classIdx * 11) % LAST_NAMES.length];
        fullName = `${last.toUpperCase()} ${first.toUpperCase()}`;
      }

      const baseCenter = groupNumber === 1 ? profile.g1Center : profile.g2Center;
      // Box-Muller approx using sum of uniform randoms
      const normalish = (rand() + rand() + rand() - 1.5) * 1.4;

      let ds1 = baseCenter + normalish * profile.spread;
      if (profile.skewLowTail) {
        if (r % 5 === 0) {
          ds1 = 17.5 + (rand() - 0.5) * 2.5;
        } else if (r % 2 === 0) {
          ds1 = 6.2 + (rand() - 0.5) * 2.8;
        }
      }

      // Make sure top performers exist nicely
      if (profile.className === '2APIC-7' && r === 3) ds1 = 19.5;
      if (profile.className === '2APIC-2' && r === 2) ds1 = 19.25;
      if (profile.className === '2APIC-1' && r === 5) ds1 = 19.0;

      const ds1Score = isAbsent ? null : isZero ? 0 : clampGrade(ds1);
      const ds2Score = isAbsent ? null : isZero ? 0 : clampGrade((ds1Score ?? baseCenter) + (rand() - 0.45) * 2.0);
      const ds3Score = isAbsent ? null : clampGrade((ds1Score ?? baseCenter) + (rand() - 0.4) * 2.4);
      const actScore = isAbsent ? null : clampGrade((ds1Score ?? baseCenter) + 1.1 + (rand() - 0.5) * 1.6);

      const massarCode = `G13${String(classIdx + 1).padStart(2, '0')}${String(14000 + r * 37)}`;

      students.push({
        rankInClass: r,
        groupNumber,
        groupId: buildGroupId(profile.className, groupNumber),
        className: profile.className,
        massarId: String(820000 + classIdx * 100 + r),
        massarCode,
        fullName,
        scores: {
          G: ds1Score,
          I: ds2Score,
          K: ds3Score,
          M: actScore,
        },
        absent: isAbsent,
      });
    }

    return {
      metadata: {
        className: profile.className,
        level: '2APIC',
        academy: 'AREF Casablanca-Settat',
        province: 'Direction Provinciale Nouaceur',
        schoolYear: '2025/2026',
        sourceFile: `export_notesCC_${profile.className}.xlsx`,
      },
      students,
    };
  });
}

export const DEMO_ITEMS_INFORMATIQUE: ItemScoreInput[] = [
  {
    id: 'Q1',
    label: 'Q1 · Architecture & Périphériques',
    competency: 'Identifier les composants matériels',
    maxPoints: 3,
    upperAvgPoints: 2.8,
    lowerAvgPoints: 1.9,
    overallAvgPoints: 2.35,
  },
  {
    id: 'Q2',
    label: 'Q2 · Codage Binaire',
    competency: 'Convertir décimal ↔ binaire',
    maxPoints: 4,
    upperAvgPoints: 3.6,
    lowerAvgPoints: 0.9,
    overallAvgPoints: 2.15,
  },
  {
    id: 'Q3',
    label: 'Q3 · Tableur & Formules SI()',
    competency: 'Rédiger une fonction conditionnelle',
    maxPoints: 5,
    upperAvgPoints: 3.1,
    lowerAvgPoints: 0.5,
    overallAvgPoints: 1.35, // F = 0.27 < 0.30
  },
  {
    id: 'Q4',
    label: 'Q4 · Algorithme & Boucles',
    competency: 'Tracer une boucle Pour / Répéter',
    maxPoints: 4,
    upperAvgPoints: 2.4,
    lowerAvgPoints: 0.4,
    overallAvgPoints: 1.1, // F = 0.275 < 0.30
  },
  {
    id: 'Q5',
    label: 'Q5 · Organigramme Scratch',
    competency: 'Associer blocs et instructions',
    maxPoints: 4,
    upperAvgPoints: 3.7,
    lowerAvgPoints: 2.1,
    overallAvgPoints: 2.95, // F = 0.7375 > 0.70
  },
];
