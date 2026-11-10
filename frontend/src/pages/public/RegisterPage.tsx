import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, ArrowRight, Loader2, HeartHandshake, Sparkles, ShieldCheck } from 'lucide-react';
import medicalCareIllustration from '../../assets/illustrations/medical_care.svg';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !password) return;

    setSubmitting(true);
    try {
      await register({ nombre, email, telefono, password });
      navigate('/cliente/dashboard');
    } catch {
      // Manejado en toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* Lado Izquierdo: Formulario */}
        <div className="p-8 sm:p-10 space-y-6 flex flex-col justify-center">
          <div className="text-center md:text-left space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto md:mx-0 mb-2">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registro de Paciente</h2>
            <p className="text-xs text-slate-500">Crea tu cuenta gratuita para agendar tus citas médicas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  data-testid="input-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Carlos Valdivia"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  data-testid="input-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono Celular
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  data-testid="input-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+51 987 654 321"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  data-testid="input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="btn-register-submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Crear mi Cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center md:text-left text-xs text-slate-500">
            ¿Ya posees una cuenta registrada?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </div>

        {/* Lado Derecho: Ilustración y Beneficios */}
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-gradient-to-br from-amber-50 via-emerald-50 to-teal-50 border-l border-slate-100 space-y-6 text-center">
          <div className="w-64 h-52">
            <img
              src={medicalCareIllustration}
              alt="Bienvenido a la clínica"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
          <div className="space-y-2 max-w-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Registro Rápido
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Tu salud coordinada en un solo lugar
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Crea tu perfil en menos de un minuto y accede al historial completo de tus citas médicas.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
