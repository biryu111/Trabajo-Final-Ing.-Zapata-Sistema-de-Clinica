import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: 'ADMIN' | 'CLIENTE';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">
        Cargando aplicación...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};
