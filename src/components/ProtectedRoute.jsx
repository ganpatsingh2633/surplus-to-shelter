import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ROLE_DASHBOARDS = {
  donor: '/donor-dashboard',
  shelter: '/shelter-dashboard',
  driver: '/driver-dashboard',
};

export default function ProtectedRoute({ allowedRoles, children }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Verifying credentials and role...</p>
      </div>
    );
  }

  // Not logged in -> send to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = userProfile?.role;

  // If role is required and user's role does not match, redirect to their own role dashboard
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      const targetDashboard = ROLE_DASHBOARDS[userRole] || '/login';
      return <Navigate to={targetDashboard} replace />;
    }
  }

  return children;
}
