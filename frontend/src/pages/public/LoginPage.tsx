import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import medicalCareIllustration from '../../assets/illustrations/medical_care.svg';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      await login({ email, password });
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.rol === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/cliente/dashboard');
      }
    } catch {
      // Manejado en context toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* Lado Izquierdo: Formulario */}
        <div className="p-8 sm:p-10 space-y-6 flex flex-col justify-center">
          <div className="text-center md:text-left space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto md:mx-0 mb-2">
              <Activity className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500">Ingresa a tu cuenta para agendar y gestionar tus citas</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              data-testid="btn-login-submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center md:text-left text-xs text-slate-500">
            ¿No tienes una cuenta de paciente todavía?{' '}
            <Link to="/registro" className="font-bold text-emerald-600 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </div>

        {/* Lado Derecho: Ilustración y Beneficios */}
        <div className="hidden md:flex flex-col justify-center items-center p-10 bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50/40 border-l border-slate-100 space-y-6 text-center">
          <div className="w-64 h-52">
            <img
              src={medicalCareIllustration}
              alt="Atención médica y bienestar"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
          <div className="space-y-2 max-w-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Salud Integral
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Cuidado médico al alcance de tu mano
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulta disponibilidad en tiempo real con doctores certificados y gestiona tus turnos al instante.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
