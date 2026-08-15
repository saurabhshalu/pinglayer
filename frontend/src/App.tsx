import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import {
  AdminRoute,
  ProductRoute,
  PublicRoute,
  RootRedirect,
} from './components/layout/RouteGuards';

// Auth Pages
import { AdminLogin } from './pages/auth/AdminLogin';
import { ProductLogin } from './pages/auth/ProductLogin';

// Admin Pages
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminProductDetail } from './pages/admin/AdminProductDetail';
import { AdminConnections } from './pages/admin/AdminConnections';
import { AdminNotifications } from './pages/admin/AdminNotifications';

// Product Workspace Pages
import { ConnectionsList } from './pages/app/ConnectionsList';
import { ConnectionForm } from './pages/app/ConnectionForm';
import { DefinitionsList } from './pages/app/DefinitionsList';
import { DefinitionDetail } from './pages/app/DefinitionDetail';
import { NotificationsList } from './pages/app/NotificationsList';
import { NotificationDetail } from './pages/app/NotificationDetail';
import { Settings } from './pages/app/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<AdminLogin />} />
              <Route path="/api-login" element={<ProductLogin />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/products/:id" element={<AdminProductDetail />} />
                <Route path="/admin/connections" element={<AdminConnections />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
              </Route>
            </Route>

            {/* Product User Routes */}
            <Route element={<ProductRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/connections" element={<ConnectionsList />} />
                <Route path="/connections/new" element={<ConnectionForm />} />
                <Route path="/connections/:id" element={<ConnectionForm />} />
                <Route path="/definitions" element={<DefinitionsList />} />
                <Route path="/definitions/:id" element={<DefinitionDetail />} />
                <Route path="/notifications" element={<NotificationsList />} />
                <Route path="/notifications/:id" element={<NotificationDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
