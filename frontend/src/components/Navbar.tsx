import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, Calendar, LogOut, Shield, Menu, X, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo y Marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-green-500 to-amber-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
                Clínica <span className="text-emerald-600">Salud</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
              </span>
              <p className="text-[11px] font-medium text-slate-400 -mt-1 tracking-wider uppercase">
                & Bienestar Integral
              </p>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors py-2 px-1"
            >
              Inicio
            </Link>

            {user?.rol === 'CLIENTE' && (
              <>
                <Link
                  to="/cliente/dashboard"
                  className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors py-2 px-1 flex items-center gap-1.5"
                >
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Reservar Cita
                </Link>
                <Link
                  to="/cliente/citas"
                  className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors py-2 px-1 flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Mis Citas
                </Link>
              </>
            )}

            {user?.rol === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                className="text-sm font-semibold text-slate-700 bg-amber-50 text-amber-900 border border-amber-200/80 px-3.5 py-1.5 rounded-full flex items-center gap-2 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <Shield className="w-4 h-4 text-amber-600" />
                Panel Admin
              </Link>
            )}

            {/* Usuario Auth / Acciones */}
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <Link
                  to="/cliente/perfil"
                  className="flex items-center gap-2.5 bg-slate-100/80 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 rounded-full px-3.5 py-1.5 transition-all text-sm font-medium text-slate-700"
                >
                  <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">
                    {user.nombre.charAt(0)}
                  </div>
                  <span className="max-w-[130px] truncate font-medium">{user.nombre}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-emerald-600 px-4 py-2 rounded-xl transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro"
                  className="text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4 text-amber-300" />
                  Agendar Cita
                </Link>
              </div>
            )}
          </nav>

          {/* Botón Menú Mobile */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 px-4 pt-2 pb-6 space-y-3"
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-base font-semibold text-slate-700 hover:text-emerald-600"
            >
              Inicio
            </Link>

            {user?.rol === 'CLIENTE' && (
              <>
                <Link
                  to="/cliente/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-base font-semibold text-slate-700 hover:text-emerald-600"
                >
                  Reservar Cita
                </Link>
                <Link
                  to="/cliente/citas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-base font-semibold text-slate-700 hover:text-emerald-600"
                >
                  Mis Citas
                </Link>
                <Link
                  to="/cliente/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-base font-semibold text-slate-700 hover:text-emerald-600"
                >
                  Mi Perfil
                </Link>
              </>
            )}

            {user?.rol === 'ADMIN' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-base font-semibold text-amber-700"
              >
                Panel Administrador
              </Link>
            )}

            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-2.5 text-base font-semibold text-rose-600"
              >
                Cerrar Sesión
              </button>
            ) : (
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-semibold text-white bg-emerald-600 rounded-xl"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
