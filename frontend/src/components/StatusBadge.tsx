import React from 'react';
import { EstadoCita } from '../types';
import { CheckCircle2, Clock, XCircle, UserCheck } from 'lucide-react';

interface StatusBadgeProps {
  estado: EstadoCita;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ estado, className = '' }) => {
  switch (estado) {
    case 'CONFIRMADA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300/60 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Confirmada
        </span>
      );
    case 'PENDIENTE':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300/60 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Pendiente
        </span>
      );
    case 'CANCELADA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300/60 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Cancelada
        </span>
      );
    case 'ATENDIDA':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300/60 ${className}`}>
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          Atendida
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 ${className}`}>
          {estado}
        </span>
      );
  }
};
