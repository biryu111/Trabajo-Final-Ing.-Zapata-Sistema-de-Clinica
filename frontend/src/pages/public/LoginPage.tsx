import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import medicalCareIllustration from '../../assets/illustrations/medical_care.svg';
import { TurnstileWidget } from '../../components/TurnstileWidget';

interface LockoutState {
  isLocked: boolean;
  permanente: boolean;
  remainingSeconds: number;
}

export const LoginPage: React.FC = () => {
  const { login, verify2Fa } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Estado de bloqueo de login
  const [lockout, setLockout] = useState<LockoutState | null>(null);

  // Estado de desafío 2FA
  const [twoFactorState, setTwoFactorState] = useState<{
    active: boolean;
    challengeToken: string;
    code: string;
    recoveryCode: string;
    useRecovery: boolean;
  }>({
    active: false,
    challengeToken: '',
    code: '',
    recoveryCode: '',
    useRecovery: false,
  });

  // Temporizador para cuenta regresiva en 423
  useEffect(() => {
    if (!lockout || lockout.permanente || lockout.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockout((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds <= 1) {
          return null;
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      const res = await login({ email, password, turnstileToken });
      if (res && res.requires2FA) {
        setTwoFactorState({
          active: true,
          challengeToken: res.challengeToken || '',
          code: '',
          recoveryCode: '',
          useRecovery: false,
        });
        return;
      }
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.rol === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/cliente/dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 423 || err.response?.data?.error?.code === 'CUENTA_BLOQUEADA') {
        const errorData = err.response?.data?.error || {};
        setLockout({
          isLocked: true,
          permanente: !!errorData.permanente,
          remainingSeconds: errorData.retryAfterSeconds || 420,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await verify2Fa({
        challengeToken: twoFactorState.challengeToken,
        code: twoFactorState.useRecovery ? undefined : twoFactorState.code,
        recoveryCode: twoFactorState.useRecovery ? twoFactorState.recoveryCode : undefined,
      });
      if (user.rol === 'ADMIN') {
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
          <AnimatePresence mode="wait">
            {twoFactorState.active ? (
              /* PASO 2: Verificación de Dos Factores (2FA) */
              <motion.div
                key="step-2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto md:mx-0 mb-2">
                    <KeyRound className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Verificación de Seguridad (2FA)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tu cuenta está protegida. Ingresa el código de tu aplicación autenticadora para continuar.
                  </p>
                </div>

                <form onSubmit={handleVerify2Fa} className="space-y-4">
                  {!twoFactorState.useRecovery ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Código de 6 dígitos
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        pattern="[0-9]{6}"
                        data-testid="input-totp"
                        value={twoFactorState.code}
                        onChange={(e) =>
                          setTwoFactorState({
                            ...twoFactorState,
                            code: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        placeholder="123456"
                        className="w-full text-center text-2xl tracking-[0.4em] py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-mono transition-all"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Código de Recuperación
                      </label>
                      <input
                        type="text"
                        required
                        data-testid="input-recovery-code"
                        value={twoFactorState.recoveryCode}
                        onChange={(e) =>
                          setTwoFactorState({
                            ...twoFactorState,
                            recoveryCode: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="ABCD-1234"
                        className="w-full text-center text-lg tracking-widest py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-mono uppercase transition-all"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      (!twoFactorState.useRecovery && twoFactorState.code.length !== 6) ||
                      (twoFactorState.useRecovery && !twoFactorState.recoveryCode.trim())
                    }
                    data-testid="btn-verify-2fa"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verificar y Acceder</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setTwoFactorState((prev) => ({
                          ...prev,
                          useRecovery: !prev.useRecovery,
                        }))
                      }
                      className="text-emerald-600 hover:underline font-semibold"
                    >
                      {twoFactorState.useRecovery
                        ? 'Usar código TOTP de 6 dígitos'
                        : '¿No tienes tu app? Usar código de recuperación'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTwoFactorState({
                          active: false,
                          challengeToken: '',
                          code: '',
                          recoveryCode: '',
                          useRecovery: false,
                        })
                      }
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Volver
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* PASO 1: Formulario Normal */
              <motion.div
                key="step-login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto md:mx-0 mb-2">
                    <Activity className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Iniciar Sesión
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ingresa a tu cuenta para agendar y gestionar tus citas
                  </p>
                </div>

                {/* Banner de Bloqueo Escalonado 423 */}
                {lockout && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-testid="banner-cuenta-bloqueada"
                    className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-extrabold text-rose-900">
                          {lockout.permanente
                            ? 'Cuenta bloqueada permanentemente'
                            : 'Cuenta bloqueada temporalmente'}
                        </p>
                        <p className="text-rose-700 leading-relaxed">
                          {lockout.permanente
                            ? 'La cuenta ha sido bloqueada de forma permanente tras reiterados intentos fallidos. Contacte a un administrador para su liberación.'
                            : 'Has superado el límite de intentos fallidos. Por seguridad, la cuenta permanecerá bloqueada.'}
                        </p>
                        {!lockout.permanente && (
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 pt-1">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              Podrás intentar de nuevo en:{' '}
                              <span className="font-mono text-sm underline" data-testid="countdown-timer">
                                {formatSeconds(lockout.remainingSeconds)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

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

                  {/* Cloudflare Turnstile */}
                  <TurnstileWidget onToken={(token) => setTurnstileToken(token)} />

                  <button
                    type="submit"
                    disabled={submitting || (lockout?.permanente ?? false) || (lockout?.remainingSeconds ?? 0) > 0}
                    data-testid="btn-login-submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              </motion.div>
            )}
          </AnimatePresence>
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
