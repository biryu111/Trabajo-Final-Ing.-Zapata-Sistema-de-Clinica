import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { doctorsApi, appointmentsApi } from '../../services/api';
import { Doctor, SlotDisponibilidad } from '../../types';
import { useAuth } from '../../context/AuthContext';
import doctorProfileIllustration from '../../assets/illustrations/doctor_profile.svg';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const DoctorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFecha, setSelectedFecha] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<SlotDisponibilidad[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponibilidad | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    doctorsApi
      .getDoctorById(id)
      .then((data) => setDoctor(data))
      .catch(() => showToast('Error al cargar la información del doctor', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedFecha) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    doctorsApi
      .getDisponibilidad(id, selectedFecha)
      .then((res) => setSlots(res.slots || []))
      .catch(() => showToast('Error al obtener la disponibilidad', 'error'))
      .finally(() => setLoadingSlots(false));
  }, [id, selectedFecha]);

  const handleBook = async () => {
    if (!doctor || !selectedFecha || !selectedSlot) return;
    setBooking(true);
    try {
      await appointmentsApi.createCita({
        doctorId: doctor.id,
        fecha: selectedFecha,
        horaInicio: selectedSlot.horaInicio,
        horaFin: selectedSlot.horaFin,
      });
      showToast('¡Cita agendada exitosamente!', 'success');
      navigate('/cliente/citas');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al agendar la cita';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Doctor no encontrado</h2>
        <Link
          to="/cliente/dashboard"
          className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/cliente/dashboard')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al Catálogo de Especialistas</span>
      </button>

      {/* Tarjeta Principal del Doctor */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="md:col-span-1 flex justify-center">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-emerald-50/60 p-4 border border-emerald-100 flex items-center justify-center">
            <img
              src={doctorProfileIllustration}
              alt={doctor.nombre}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              <Stethoscope className="w-3.5 h-3.5" />
              {doctor.especialidad?.nombre || 'Medicina General'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {doctor.nombre}
            </h1>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {doctor.biografia || 'Médico especialista certificado dedicado a la atención integral y personalizada de la salud.'}
          </p>

          {/* Horarios de atención habituales */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Días y Horarios Habituales de Atención
            </h3>
            <div className="flex flex-wrap gap-2">
              {doctor.horarios && doctor.horarios.length > 0 ? (
                doctor.horarios.map((h) => (
                  <span
                    key={h.id}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                  >
                    <strong>{DIAS_SEMANA[h.diaSemana]}:</strong> {h.horaInicio} - {h.horaFin}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Horarios coordinados por cita previa</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agenda en Tiempo Real (Redis Cache) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6"
      >
        <div className="border-b border-slate-100 pb-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            <Sparkles className="w-3.5 h-3.5" /> Disponibilidad en Vivo (Redis Cache-Aside)
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Reserva tu Consulta Médica
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Selector de fecha */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              1. Selecciona la Fecha Deseada
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <p className="text-xs text-slate-400">
              Los turnos se actualizan automáticamente según la disponibilidad de la base de datos y la caché en memoria.
            </p>
          </div>

          {/* Slots disponibles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                2. Horarios del Día ({selectedFecha})
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
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium text-center">
                El doctor no tiene turnos disponibles para esta fecha. Por favor seleccione otro día.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
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
        </div>

        {/* Botón de Confirmación */}
        {selectedSlot && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-emerald-900 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Turno seleccionado: <strong>{selectedFecha}</strong> a las <strong>{selectedSlot.horaInicio} hrs</strong>
              </span>
            </div>

            <button
              disabled={booking}
              onClick={handleBook}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              {booking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  <span>Confirmar y Agendar Cita</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
