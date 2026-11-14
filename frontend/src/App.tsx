import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Páginas Públicas
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Páginas Cliente
import { ClientDashboard } from './pages/client/ClientDashboard';
import { MisCitasPage } from './pages/client/MisCitasPage';
import { PerfilPage } from './pages/client/PerfilPage';
import { DoctorDetailPage } from './pages/client/DoctorDetailPage';
import { TwoFactorSetupPage } from './pages/client/TwoFactorSetupPage';

// Páginas Admin
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDoctoresPage } from './pages/admin/AdminDoctoresPage';
import { AdminCitasPage } from './pages/admin/AdminCitasPage';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="flex-grow flex flex-col"
      >
        <Routes location={location} key={location.pathname}>
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
            path="/cliente/doctor/:id"
            element={
              <ProtectedRoute requiredRole="CLIENTE">
                <DoctorDetailPage />
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
          <Route
            path="/seguridad/2fa"
            element={
              <ProtectedRoute>
                <TwoFactorSetupPage />
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

          {/* Ruta 404 personalizada */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <AnimatedRoutes />
          </main>
          <Footer />
          <ToastContainer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
