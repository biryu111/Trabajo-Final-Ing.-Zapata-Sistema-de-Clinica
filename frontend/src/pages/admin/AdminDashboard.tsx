import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { MetricasAdmin } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  Users,
  Stethoscope,
  Activity,
  Shield,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';

const COLORS = ['#2ECC71', '#FACC15', '#FB7185', '#3B82F6'];

export const AdminDashboard: React.FC = () => {
  const { showToast } = useAuth();
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getMetricas()
      .then((data) => setMetricas(data))
      .catch(() => showToast('Error al cargar métricas del sistema', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            PANEL ADMINISTRATIVO
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard General</h1>
          <p className="text-xs text-slate-500">Métricas globales de atención médica y demanda de pacientes</p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/admin/doctores"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            Gestión Doctores <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/admin/citas"
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
          >
            Gestión Citas <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{metricas?.citasHoy || 0}</span>
            <span className="text-xs font-semibold text-slate-500">Citas Programadas Hoy</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{metricas?.doctoresActivos || 0}</span>
            <span className="text-xs font-semibold text-slate-500">Doctores Activos</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{metricas?.clientesRegistrados || 0}</span>
            <span className="text-xs font-semibold text-slate-500">Pacientes Registrados</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{metricas?.totalCitas || 0}</span>
            <span className="text-xs font-semibold text-slate-500">Total Histórico Citas</span>
          </div>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1: Doctores más solicitados */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" /> Doctores Más Solicitados
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas?.doctoresMasSolicitados || []}>
                <XAxis dataKey="nombre" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Bar dataKey="totalCitas" fill="#16A34A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Citas por Estado */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" /> Distribución de Citas por Estado
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metricas?.citasPorEstado || []}
                  dataKey="cantidad"
                  nameKey="estado"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {(metricas?.citasPorEstado || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
