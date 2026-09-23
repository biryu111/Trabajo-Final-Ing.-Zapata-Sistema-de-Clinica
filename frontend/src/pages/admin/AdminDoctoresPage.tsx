import React, { useEffect, useState } from 'react';
import { doctorsApi } from '../../services/api';
import { Doctor, Especialidad } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Stethoscope, Edit, Trash2, X, Loader2, Calendar } from 'lucide-react';

export const AdminDoctoresPage: React.FC = () => {
  const { showToast } = useAuth();
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear Doctor
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [nombreDoc, setNombreDoc] = useState('');
  const [biografiaDoc, setBiografiaDoc] = useState('');
  const [especialidadIdDoc, setEspecialidadIdDoc] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Modal Crear Especialidad
  const [showEspModal, setShowEspModal] = useState(false);
  const [nombreEsp, setNombreEsp] = useState('');
  const [descripcionEsp, setDescripcionEsp] = useState('');
  const [savingEsp, setSavingEsp] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([doctorsApi.getDoctores(), doctorsApi.getEspecialidades()])
      .then(([docData, espData]) => {
        setDoctores(docData);
        setEspecialidades(espData);
        if (espData.length > 0) setEspecialidadIdDoc(espData[0].id);
      })
      .catch(() => showToast('Error al obtener doctores y especialidades', 'error'))
      .finally(() => setLoading(false));
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDoc || !especialidadIdDoc) return;
    setSavingDoc(true);
    try {
      await doctorsApi.createDoctor({
        nombre: nombreDoc,
        biografia: biografiaDoc,
        especialidadId: especialidadIdDoc,
        horarios: [
          { diaSemana: 1, horaInicio: '08:00', horaFin: '13:00' },
          { diaSemana: 3, horaInicio: '08:00', horaFin: '13:00' },
          { diaSemana: 5, horaInicio: '08:00', horaFin: '13:00' },
        ],
      });
      showToast('Doctor creado exitosamente', 'success');
      setShowDoctorModal(false);
      setNombreDoc('');
      setBiografiaDoc('');
      fetchData();
    } catch (err: any) {
      showToast('Error al registrar doctor', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleCreateEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEsp) return;
    setSavingEsp(true);
    try {
      await doctorsApi.createEspecialidad({
        nombre: nombreEsp,
        descripcion: descripcionEsp,
      });
      showToast('Especialidad creada con éxito', 'success');
      setShowEspModal(false);
      setNombreEsp('');
      setDescripcionEsp('');
      fetchData();
    } catch (err: any) {
      showToast('Error al crear especialidad', 'error');
    } finally {
      setSavingEsp(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm('¿Está seguro de desactivar este doctor?')) return;
    try {
      await doctorsApi.deleteDoctor(id);
      showToast('Doctor desactivado', 'info');
      fetchData();
    } catch {
      showToast('Error al desactivar doctor', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestión de Doctores</h1>
          <p className="text-xs text-slate-500">Administra el personal médico y sus especialidades</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEspModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nueva Especialidad
          </button>

          <button
            onClick={() => setShowDoctorModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-300" /> Registrar Nuevo Doctor
          </button>
        </div>
      </div>

      {/* Tabla de Doctores */}
      {loading ? (
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-extrabold text-slate-700">
              <tr>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Especialidad</th>
                <th className="px-6 py-4">Horarios Configurados</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctores.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span>{doc.nombre}</span>
                      <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{doc.biografia || 'Sin biografía'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {doc.especialidad.nombre}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {doc.horarios && doc.horarios.length > 0 ? (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> {doc.horarios.length} días de atención
                      </span>
                    ) : (
                      <span className="text-slate-400">Sin horario</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {doc.activo ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Activo</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteDoctor(doc.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Desactivar Doctor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear Doctor */}
      <AnimatePresence>
        {showDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-lg text-slate-900">Registrar Doctor</h3>
                <button onClick={() => setShowDoctorModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombreDoc}
                    onChange={(e) => setNombreDoc(e.target.value)}
                    placeholder="Ej. Dr. Andrés Caso"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especialidad</label>
                  <select
                    value={especialidadIdDoc}
                    onChange={(e) => setEspecialidadIdDoc(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-sm"
                  >
                    {especialidades.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Biografía</label>
                  <textarea
                    value={biografiaDoc}
                    onChange={(e) => setBiografiaDoc(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowDoctorModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold">Cancelar</button>
                  <button type="submit" disabled={savingDoc} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                    {savingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Doctor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Crear Especialidad */}
      <AnimatePresence>
        {showEspModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-lg text-slate-900">Nueva Especialidad</h3>
                <button onClick={() => setShowEspModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateEspecialidad} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombreEsp}
                    onChange={(e) => setNombreEsp(e.target.value)}
                    placeholder="Ej. Oftalmología"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                  <textarea
                    value={descripcionEsp}
                    onChange={(e) => setDescripcionEsp(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowEspModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold">Cancelar</button>
                  <button type="submit" disabled={savingEsp} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                    {savingEsp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Especialidad'}
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
