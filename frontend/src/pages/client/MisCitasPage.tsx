import React, { useEffect, useState } from 'react';
import { appointmentsApi } from '../../services/api';
import { Cita, EstadoCita } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Stethoscope, AlertTriangle, X, Loader2, CheckCircle } from 'lucide-react';

export const MisCitasPage: React.FC = () => {
  const { showToast } = useAuth();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODAS');

  // Cancelar cita modal state
  const [cancelingCita, setCancelingCita] = useState<Cita | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  useEffect(() => {
    fetchCitas();
  }, []);

  const fetchCitas = () => {
    setLoading(true);
    appointmentsApi
      .getMisCitas()
      .then((data) => setCitas(data))
      .catch(() => showToast('Error al cargar historial de citas', 'error'))
      .finally(() => setLoading(false));
  };

  const handleConfirmCancel = async () => {
    if (!cancelingCita) return;
    setSubmittingCancel(true);
    try {
      await appointmentsApi.cancelarCita(cancelingCita.id);
      showToast('Cita cancelada exitosamente', 'success');
      setCancelingCita(null);
      fetchCitas();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al cancelar cita';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const citasFiltradas = citas.filter((c) => {
    if (filtroEstado === 'TODAS') return true;
    return c.estado === filtroEstado;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mis Citas Médicas</h1>
          <p className="text-xs text-slate-500">Historial y reservas activas asociadas a tu cuenta de paciente</p>
        </div>

        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          {['TODAS', 'CONFIRMADA', 'PENDIENTE', 'ATENDIDA', 'CANCELADA'].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filtroEstado === e
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : citasFiltradas.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-700 text-lg">No hay citas registradas</h3>
          <p className="text-xs text-slate-500">No posees citas en este estado actualmente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {citasFiltradas.map((cita) => {
            const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <motion.div
                key={cita.id}
                layout
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-extrabold text-slate-900 text-base">{cita.doctor.nombre}</h3>
                      <StatusBadge estado={cita.estado} />
                    </div>
                    <p className="text-xs font-semibold text-emerald-600">
                      {cita.doctor.especialidad.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="capitalize">{fechaFormateada}</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {cita.horaInicio} - {cita.horaFin}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                {cita.estado !== 'CANCELADA' && cita.estado !== 'ATENDIDA' && (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setCancelingCita(cita)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      Cancelar Cita
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Cancelación de Cita */}
      <AnimatePresence>
        {cancelingCita && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-900">¿Cancelar esta cita?</h3>
                <p className="text-xs text-slate-500">
                  Recuerda que solo se pueden cancelar citas con un mínimo de 2 horas de anticipación.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <p><strong>Doctor:</strong> {cancelingCita.doctor.nombre}</p>
                <p><strong>Fecha:</strong> {new Date(cancelingCita.fecha).toLocaleDateString()}</p>
                <p><strong>Horario:</strong> {cancelingCita.horaInicio} - {cancelingCita.horaFin}</p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCancelingCita(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Volver
                </button>
                <button
                  disabled={submittingCancel}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-2"
                >
                  {submittingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, Cancelar Cita'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
