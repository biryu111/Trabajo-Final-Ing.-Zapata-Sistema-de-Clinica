import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doctorsApi } from '../../services/api';
import { Especialidad } from '../../types';
import { motion } from 'framer-motion';
import {
  Calendar,
  HeartHandshake,
  ShieldCheck,
  Award,
  ArrowRight,
  Clock,
  Sparkles,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorsApi
      .getEspecialidades()
      .then((data) => setEspecialidades(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 lg:pt-20 pb-16 bg-gradient-to-b from-emerald-50/60 via-amber-50/30 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Texto Hero */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>ATENCIÓN MÉDICA INTEGRAL 24/7</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-none">
                Tu salud en manos de{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-amber-500 bg-clip-text text-transparent">
                  especialistas dedicados
                </span>
              </h1>

              <p className="text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
                Agenda tu cita médica en línea en pocos segundos. Accede a doctores certificados,
                consulta horarios disponibles en tiempo real y gestiona tu salud de forma simple y confiable.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/cliente/dashboard"
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all flex items-center justify-center gap-3 group"
                >
                  <Calendar className="w-5 h-5 text-amber-300" />
                  <span>Agendar Cita Ahora</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/registro"
                  className="px-7 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-sm transition-all text-center"
                >
                  Crear Cuenta Paciente
                </Link>
              </div>

              {/* Badges de confianza */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Médicos Colegiados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Reserva en Tiempo Real</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-pink-500 shrink-0" />
                  <span>Atención de Calidad</span>
                </div>
              </div>
            </motion.div>

            {/* Ilustración / Card Visual Hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-lg">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">Dr. Roberto Mendoza</h4>
                      <p className="text-xs text-slate-500 font-medium">Cardiología Senior</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    Disponible
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Horario de Atención
                  </p>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                    <span>Lunes, Miércoles, Viernes</span>
                    <span className="text-emerald-600">08:00 - 13:00</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/60 text-center">
                    <span className="block text-xl font-black text-amber-600">+12</span>
                    <span className="text-xs font-semibold text-slate-600">Años Experiencia</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200/60 text-center">
                    <span className="block text-xl font-black text-pink-600">4.9 ★</span>
                    <span className="text-xs font-semibold text-slate-600">Satisfacción</span>
                  </div>
                </div>

                <Link
                  to="/cliente/dashboard"
                  className="block w-full text-center py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
                >
                  Consultar Disponibilidad
                </Link>
              </div>

              {/* Elementos decorativos de fondo */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl -z-10"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-pink-300/30 rounded-full blur-2xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sección Especialidades */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            NUESTRAS ESPECIALIDADES
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
            Cuidado médico especializado para toda tu familia
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-200 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {especialidades.map((esp, idx) => (
              <motion.div
                key={esp.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md shadow-slate-200/50 hover:shadow-xl hover:border-emerald-200 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold mb-4 ${
                      idx % 3 === 0
                        ? 'bg-emerald-100 text-emerald-600'
                        : idx % 3 === 1
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-pink-100 text-pink-600'
                    }`}
                  >
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">
                    {esp.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {esp.descripcion || 'Atención especializada con los mejores estándares.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{esp._count?.doctores || 0} Doctores</span>
                  <Link
                    to={`/cliente/dashboard?especialidad=${esp.id}`}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Ver turnos <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Por qué elegirnos */}
      <section className="bg-slate-900 text-white py-16 rounded-3xl mx-4 sm:mx-8 max-w-7xl lg:mx-auto px-6 lg:px-12 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xl text-white">Reserva Anti-Solapamiento</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Garantía transaccional para que tu horario quede asegurado sin cruces ni esperas innecesarias.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xl text-white">Caché de Disponibilidad</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Consulta de turnos ultrarrápida respaldada por Redis para una experiencia inmediata desde tu móvil.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xl text-white">Gestión Flexible</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Reprograma o cancela tus citas con facilidades transparentes directamente desde tu perfil de usuario.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
