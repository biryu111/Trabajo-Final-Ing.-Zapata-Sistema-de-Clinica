import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';

// Páginas Públicas
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Páginas Cliente
import { ClientDashboard } from './pages/client/ClientDashboard';
import { MisCitasPage } from './pages/client/MisCitasPage';
import { PerfilPage } from './pages/client/PerfilPage';

// Páginas Admin
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDoctoresPage } from './pages/admin/AdminDoctoresPage';
import { AdminCitasPage } from './pages/admin/AdminCitasPage';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage';

// Guard para rutas autenticadas
const ProtectedRoute: React.FC<{ children: React.ReactElement; requiredRole?: 'ADMIN' | 'CLIENTE' }> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Cargando aplicación...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
          <Navbar />

          <main className="flex-grow">
            <Routes>
              {/* Rutas Públicas */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />

              {/* Rutas Cliente */}
              <Route
                path="/cliente/dashboard"
                element={
                  <ProtectedRoute requiredRole="CLIENTE">
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/citas"
                element={
                  <ProtectedRoute requiredRole="CLIENTE">
                    <MisCitasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cliente/perfil"
                element={
                  <ProtectedRoute>
                    <PerfilPage />
                  </ProtectedRoute>
                }
              />

              {/* Rutas Administrador */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/doctores"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminDoctoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/citas"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminCitasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AdminUsuariosPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
          <ToastContainer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
