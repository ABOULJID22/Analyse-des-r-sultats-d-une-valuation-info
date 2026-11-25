import { ClassMetadata } from '../types/docimology';

interface AdministrativeCartoucheProps {
  metadata: ClassMetadata;
  teacherNameOverride?: string;
}

export function AdministrativeCartouche({
  metadata,
  teacherNameOverride,
}: AdministrativeCartoucheProps) {
  const effectiveTeacher = teacherNameOverride?.trim() || metadata.teacherName || '—';

  const items = [
    { label: 'Académie', value: metadata.academy || '—' },
    { label: 'Direction Provinciale', value: metadata.province || '—' },
    { label: 'Établissement', value: metadata.school || '—' },
    { label: 'Professeur', value: effectiveTeacher },
    { label: 'Matière', value: metadata.subject || '—' },
    { label: 'Niveau', value: metadata.level || '—' },
    { label: 'Semestre', value: metadata.semester || '—' },
    { label: 'Année scolaire', value: metadata.schoolYear || '—' },
  ];

  return (
    <section
      aria-label="Cartouche d'identité pédagogique"
      className="bg-white border border-slate-200 rounded-xl px-5 py-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate text-left" title={item.value}>
              <bdi dir="auto">{item.value}</bdi>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
