import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AdminRoute: React.FC = () => {
  const { role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const ProductRoute: React.FC = () => {
  const { role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (role !== 'product') {
    return <Navigate to="/api-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const PublicRoute: React.FC = () => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (role === 'admin') {
    return <Navigate to="/admin/products" replace />;
  }

  if (role === 'product') {
    return <Navigate to="/connections" replace />;
  }

  return <Outlet />;
};

export const RootRedirect: React.FC = () => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (role === 'admin') {
    return <Navigate to="/admin/products" replace />;
  }
  if (role === 'product') {
    return <Navigate to="/connections" replace />;
  }
  return <Navigate to="/login" replace />;
};
