import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { authApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const TwoFactorSetupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser, showToast } = useAuth();

  const isMfaRequired = searchParams.get('mfaRequired') === 'true';

  // Estados de configuración inicial
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCode: string;
  } | null>(null);

  const [verifyCode, setVerifyCode] = useState('');
  const [submittingEnable, setSubmittingEnable] = useState(false);

  // Códigos de recuperación obtenidos tras activar o regenerar
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Estados para modal de Desactivar o Regenerar
  const [activeModal, setActiveModal] = useState<'disable' | 'regenerate' | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalTotp, setModalTotp] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Cargar estado inicial
  const is2FaEnabled = (user as any)?.twoFactorEnabled ?? false;

  const handleStartSetup = async () => {
    setLoadingSetup(true);
    try {
      const res = await authApi.setup2Fa();
      setSetupData(res);
    } catch {
      showToast('Error al iniciar la configuración de 2FA', 'error');
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleEnable2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) return;

    setSubmittingEnable(true);
    try {
      const res = await authApi.enable2Fa(verifyCode);
      showToast(res.message || '2FA activado exitosamente', 'success');
      setRecoveryCodes(res.recoveryCodes);
      if (user) {
        updateUser({ ...user, twoFactorEnabled: true } as any);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Código TOTP incorrecto';
      showToast(msg, 'error');
    } finally {
      setSubmittingEnable(false);
    }
  };

  const handleCopyCodes = () => {
    if (!recoveryCodes) return;
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    showToast('Códigos copiados al portapapeles', 'success');
  };

  const handleDownloadCodes = () => {
    if (!recoveryCodes) return;
    const content = `CÓDIGOS DE RECUPERACIÓN - SISTEMA CLÍNICA\nGenerados el: ${new Date().toLocaleString()}\nUsuario: ${user?.email}\n\n${recoveryCodes.join(
      '\n'
    )}\n\n* Cada código solo puede ser utilizado una única vez. Guárdalos en un lugar seguro.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codigos-recuperacion-clinica-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Archivo de códigos descargado', 'success');
  };

  const handleDisable2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      const res = await authApi.disable2Fa(modalPassword, modalTotp);
      showToast(res.message, 'success');
      if (user) {
        updateUser({ ...user, twoFactorEnabled: false } as any);
      }
      setActiveModal(null);
      setModalPassword('');
      setModalTotp('');
      setSetupData(null);
      setRecoveryCodes(null);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al desactivar 2FA';
      showToast(msg, 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      const res = await authApi.regenerateRecoveryCodes(modalPassword, modalTotp);
      showToast('Nuevos códigos generados', 'success');
      setRecoveryCodes(res.recoveryCodes);
      setActiveModal(null);
      setModalPassword('');
      setModalTotp('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al regenerar códigos';
      showToast(msg, 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Banner de advertencia si es requerido por política ADMIN */}
      {isMfaRequired && !is2FaEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-4 shadow-sm"
        >
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h3 className="font-extrabold text-base text-amber-950">
              Autenticación de Dos Factores (2FA) Obligatoria
            </h3>
            <p className="text-amber-800 leading-relaxed">
              Como administrador de la clínica, la política de seguridad exige activar la
              autenticación en dos pasos antes de acceder a las funciones administrativas.
            </p>
          </div>
        </motion.div>
      )}

      {/* Cabecera Principal */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <KeyRound className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-black text-slate-900">Seguridad y Segundo Factor</h1>
            </div>
            <p className="text-xs text-slate-500">
              Protege tu cuenta agregando una capa adicional de verificación con una aplicación TOTP.
            </p>
          </div>

          <div>
            {is2FaEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2FA Activado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                2FA Desactivado
              </span>
            )}
          </div>
        </div>

        {/* Modal / Vista de Códigos de Recuperación */}
        {recoveryCodes && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h3 className="text-base font-extrabold text-emerald-950">
                  ¡Guarda tus códigos de recuperación!
                </h3>
                <p className="text-emerald-800 leading-relaxed">
                  Estos códigos te permitirán acceder a tu cuenta si pierdes tu dispositivo. Cada
                  código se puede usar solo una vez. No volverán a mostrarse completos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-4 rounded-xl border border-emerald-100 font-mono text-sm text-center font-bold text-slate-800">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Copiar Códigos
              </button>
              <button
                type="button"
                onClick={handleDownloadCodes}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Descargar (.txt)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryCodes(null);
                  if (user?.rol === 'ADMIN') {
                    navigate('/admin/dashboard');
                  }
                }}
                className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <span>Entendido y Guardado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Caso 1: 2FA Activado */}
        {is2FaEnabled && !recoveryCodes && (
          <div className="space-y-6 pt-2">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-900 text-sm">Tu cuenta está protegida con 2FA</p>
              <p className="leading-relaxed">
                Cada vez que inicies sesión en un nuevo dispositivo, se solicitará un código
                generado por tu aplicación autenticadora.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveModal('regenerate')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerar Códigos de Recuperación
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('disable')}
                className="px-4 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-2 transition-all"
              >
                <AlertTriangle className="w-4 h-4" />
                Desactivar 2FA
              </button>
            </div>
          </div>
        )}

        {/* Caso 2: 2FA No Activado */}
        {!is2FaEnabled && !recoveryCodes && (
          <div className="space-y-6 pt-2">
            {!setupData ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <QrCode className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Configura tu aplicación de autenticación</h3>
                  <p className="text-xs text-slate-500">
                    Compatible con Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden o Authy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartSetup}
                  disabled={loadingSetup}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 inline-flex items-center gap-2"
                >
                  {loadingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Comenzar Configuración</span>
                </button>
              </div>
            ) : (
              /* Flujo con QR y Confirmación */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2"
              >
                <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <img
                      src={setupData.qrCode}
                      alt="Código QR de autenticación TOTP"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">¿No puedes escanear el código?</p>
                    <p className="font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 select-all font-bold text-slate-800">
                      {setupData.secret}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Ingresa el código de 6 dígitos</h3>
                    <p className="text-xs text-slate-500">
                      Introduce el código generado en tu aplicación para confirmar la vinculación.
                    </p>
                  </div>

                  <form onSubmit={handleEnable2Fa} className="space-y-4">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      data-testid="input-setup-totp"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center text-2xl tracking-[0.4em] py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-mono transition-all"
                    />

                    <button
                      type="submit"
                      disabled={submittingEnable || verifyCode.length !== 6}
                      data-testid="btn-enable-2fa"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingEnable ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Activar y Confirmar 2FA</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* MODAL para Desactivar o Regenerar Códigos */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {activeModal === 'disable' ? 'Desactivar Autenticación 2FA' : 'Regenerar Códigos de Recuperación'}
                </h3>
                <p className="text-xs text-slate-500">
                  Por seguridad, introduce tu contraseña actual y un código TOTP de tu aplicación.
                </p>
              </div>

              <form
                onSubmit={activeModal === 'disable' ? handleDisable2Fa : handleRegenerateCodes}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    required
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={modalTotp}
                    onChange={(e) => setModalTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center text-xl tracking-widest py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting || !modalPassword || modalTotp.length !== 6}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 ${
                      activeModal === 'disable'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {modalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
