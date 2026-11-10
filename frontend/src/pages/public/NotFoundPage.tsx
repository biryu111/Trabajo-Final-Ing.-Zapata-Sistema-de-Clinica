import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home } from 'lucide-react';
import notFoundIllustration from '../../assets/illustrations/page_not_found.svg';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-100"
      >
        <div className="w-64 h-52 mx-auto overflow-hidden">
          <img
            src={notFoundIllustration}
            alt="Página no encontrada"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Página No Encontrada
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            El enlace al que intentas acceder no existe, ha sido movido o no está disponible en este momento.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Regresar</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
