import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doctorsApi, appointmentsApi } from '../../services/api';
import { Doctor, Especialidad, SlotDisponibilidad } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>(
    searchParams.get('especialidad') || ''
  );
  const [loading, setLoading] = useState(true);

  // Estado del Modal de Reserva
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Mañana por defecto
  );
  const [slots, setSlots] = useState<SlotDisponibilidad[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponibilidad | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Promise.all([
      doctorsApi.getEspecialidades(),
      doctorsApi.getDoctores(selectedEspecialidad || undefined),
    ])
      .then(([espData, docData]) => {
        setEspecialidades(espData);
        setDoctores(docData);
      })
      .catch(() => showToast('Error al cargar catálogo de doctores', 'error'))
      .finally(() => setLoading(false));
  }, [selectedEspecialidad]);

  // Cargar disponibilidad de slots en Redis cuando se abre el modal o cambia la fecha
  useEffect(() => {
    if (selectedDoctor && selectedFecha) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      doctorsApi
        .getDisponibilidad(selectedDoctor.id, selectedFecha)
        .then((res) => {
          setSlots(res.slots || []);
        })
        .catch(() => showToast('Error al obtener la disponibilidad', 'error'))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctor, selectedFecha]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedFecha || !selectedSlot) return;

    if (!user) {
      showToast('Debe iniciar sesión para agendar una cita', 'info');
      navigate('/login');
      return;
    }

    setBooking(true);
    try {
      await appointmentsApi.createCita({
        doctorId: selectedDoctor.id,
        fecha: selectedFecha,
        horaInicio: selectedSlot.horaInicio,
        horaFin: selectedSlot.horaFin,
      });

      showToast('¡Cita agendada exitosamente!', 'success');
      setSelectedDoctor(null);
      navigate('/cliente/citas');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al agendar la cita';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-amber-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wider uppercase text-amber-200">
            <Sparkles className="w-3.5 h-3.5" /> Reserva Inmediata
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Encuentra a tu especialista ideal
          </h1>
          <p className="text-emerald-100 text-sm leading-relaxed">
            Selecciona una especialidad médica, consulta los horarios disponibles en tiempo real y
            reserva tu cita en segundos.
          </p>
        </div>
      </div>

      {/* Filtros de Especialidades */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <button
          onClick={() => setSelectedEspecialidad('')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            selectedEspecialidad === ''
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Todas las Especialidades
        </button>

        {especialidades.map((esp) => (
          <button
            key={esp.id}
            onClick={() => setSelectedEspecialidad(esp.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              selectedEspecialidad === esp.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {esp.nombre}
          </button>
        ))}
      </div>

      {/* Grid de Doctores */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : doctores.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 space-y-3">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-700 text-lg">No se encontraron doctores</h3>
          <p className="text-xs text-slate-500">Prueba cambiando el filtro de especialidad seleccionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctores.map((doc) => (
            <motion.div
              key={doc.id}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl p-6 space-y-5 flex flex-col justify-between transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-amber-100 text-pink-600 flex items-center justify-center font-bold text-xl shrink-0">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {doc.especialidad.nombre}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg mt-1">{doc.nombre}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {doc.biografia || 'Médico especialista enfocado en brindar una atención personalizada y humana.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>
                    {doc.horarios && doc.horarios.length > 0
                      ? `${doc.horarios.length} turnos configurados`
                      : 'Horarios variables'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4 text-amber-300" />
                  <span>Ver Horarios y Reservar</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Agendamiento de Cita */}
      <AnimatePresence>
        {selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">Reservar Cita Médica</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedDoctor.nombre} - {selectedDoctor.especialidad.nombre}</p>
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Fecha */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  1. Selecciona la Fecha
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedFecha}
                  onChange={(e) => setSelectedFecha(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {/* Slots de Disponibilidad (Redis Cache-Aside) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    2. Horarios Disponibles (Caché Redis)
                  </label>
                  {loadingSlots && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
                </div>

                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-center font-medium">
                    No hay horarios configurados o disponibles para el doctor en esta fecha. Seleccione otra fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        key={slot.horaInicio}
                        disabled={!slot.disponible}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                          !slot.disponible
                            ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                            : selectedSlot?.horaInicio === slot.horaInicio
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                      >
                        {slot.horaInicio}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen y Confirmación */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {selectedSlot && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cita Seleccionada:
                    </p>
                    <p>Fecha: <strong>{selectedFecha}</strong></p>
                    <p>Horario: <strong>{selectedSlot.horaInicio} - {selectedSlot.horaFin}</strong></p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!selectedSlot || booking}
                    onClick={handleBook}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2"
                  >
                    {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Reserva'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
