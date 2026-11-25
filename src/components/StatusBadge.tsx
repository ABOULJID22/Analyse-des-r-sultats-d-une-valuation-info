import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { PedagogicalStatus } from '../types/docimology';

interface StatusBadgeProps {
  status: PedagogicalStatus;
}

export function StatusLabel({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Excellence':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Excellence</span>
        </span>
      );
    case 'Satisfaisant':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Satisfaisant</span>
        </span>
      );
    case 'Vigilance':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Vigilance</span>
        </span>
      );
    case 'Remédiation':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Remédiation</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <span>Sans données</span>
        </span>
      );
  }
}
