import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export function AdminRoute({ user, children }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
