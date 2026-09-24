import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute, { ROLE_DASHBOARDS } from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import DonorDashboard from './pages/DonorDashboard';
import ShelterDashboard from './pages/ShelterDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ImpactDashboard from './pages/ImpactDashboard';
import NotFound from './pages/NotFound';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

/**
 * Root index route redirector.
 * Sends authenticated users to their corresponding role dashboard,
 * or unauthenticated users to `/login`.
 */
function RootRedirect() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-500">Checking routing session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = userProfile?.role || 'donor';
  const target = ROLE_DASHBOARDS[role] || '/donor-dashboard';
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '12px',
              border: '1px solid #334155',
            },
          }}
        />
        <Layout>
          <Routes>
            {/* Root Redirect based on authentication & role */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth & Impact Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/impact" element={<ImpactDashboard />} />

            {/* Role-Protected Routes */}
            <Route
              path="/donor-dashboard"
              element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <DonorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shelter-dashboard"
              element={
                <ProtectedRoute allowedRoles={['shelter']}>
                  <ShelterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-dashboard"
              element={
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
