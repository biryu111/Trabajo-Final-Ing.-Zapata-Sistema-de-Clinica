import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Search, User as UserIcon, Shield, CheckCircle2, XCircle } from 'lucide-react';

export const AdminUsuariosPage: React.FC = () => {
  const { showToast } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchUsuarios();
  }, [query]);

  const fetchUsuarios = () => {
    setLoading(true);
    adminApi
      .getUsuarios({ q: query })
      .then((res) => setUsuarios(res.data))
      .catch(() => showToast('Error al cargar usuarios', 'error'))
      .finally(() => setLoading(false));
  };

  const handleToggleActivo = async (id: string) => {
    try {
      await adminApi.toggleUsuarioActivo(id);
      showToast('Estado de usuario actualizado', 'success');
      fetchUsuarios();
    } catch {
      showToast('Error al modificar estado', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-xs text-slate-500">Administración de acceso para Administradores y Pacientes</p>
        </div>

        {/* Buscador */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-extrabold text-slate-700">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <div>
                      <span>{u.nombre}</span>
                      <p className="text-[11px] text-slate-400 font-normal">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.rol === 'ADMIN' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">ADMIN</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">CLIENTE</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs">{u.telefono || 'Sin teléfono'}</td>
                  <td className="px-6 py-4">
                    {u.activo ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Activo</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleActivo(u.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        u.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
