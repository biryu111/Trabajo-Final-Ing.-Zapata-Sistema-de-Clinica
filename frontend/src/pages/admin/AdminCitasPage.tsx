import React, { useEffect, useState } from 'react';
import { appointmentsApi } from '../../services/api';
import { Cita, EstadoCita } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle } from 'lucide-react';

export const AdminCitasPage: React.FC = () => {
  const { showToast } = useAuth();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  useEffect(() => {
    fetchCitas();
  }, [filtroEstado]);

  const fetchCitas = () => {
    setLoading(true);
    appointmentsApi
      .getAllCitas({ estado: filtroEstado || undefined })
      .then((data) => setCitas(data))
      .catch(() => showToast('Error al obtener lista de citas admin', 'error'))
      .finally(() => setLoading(false));
  };

  const handleCambiarEstado = async (citaId: string, nuevoEstado: EstadoCita) => {
    try {
      await appointmentsApi.updateCitaAdmin(citaId, { estado: nuevoEstado });
      showToast(`Estado actualizado a ${nuevoEstado}`, 'success');
      fetchCitas();
    } catch {
      showToast('Error al actualizar estado de cita', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Supervisión General de Citas</h1>
          <p className="text-xs text-slate-500">Visualiza, filtra y modifica el estado de todas las citas del sistema</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {['', 'CONFIRMADA', 'PENDIENTE', 'ATENDIDA', 'CANCELADA'].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filtroEstado === e
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {e === '' ? 'TODAS' : e}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-extrabold text-slate-700">
              <tr>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Doctor & Especialidad</th>
                <th className="px-6 py-4">Fecha & Hora</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Cambiar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citas.map((cita) => (
                <tr key={cita.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">
                        {cita.paciente?.nombre?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <span>{cita.paciente?.nombre || 'Paciente'}</span>
                        <p className="text-[11px] text-slate-400 font-normal">{cita.paciente?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{cita.doctor.nombre}</span>
                    <p className="text-xs text-emerald-600 font-medium">{cita.doctor.especialidad.nombre}</p>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className="block font-semibold text-slate-800">
                      {new Date(cita.fecha).toLocaleDateString()}
                    </span>
                    <span className="text-slate-500">{cita.horaInicio} - {cita.horaFin}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge estado={cita.estado} />
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    {cita.estado !== 'ATENDIDA' && (
                      <button
                        onClick={() => handleCambiarEstado(cita.id, 'ATENDIDA')}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        Marcar Atendida
                      </button>
                    )}
                    {cita.estado !== 'CANCELADA' && (
                      <button
                        onClick={() => handleCambiarEstado(cita.id, 'CANCELADA')}
                        className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
