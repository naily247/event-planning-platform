import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken, getAccessTokenPayload } from './auth.storage';

type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = getAccessToken();
  const accessTokenPayload = getAccessTokenPayload();

  if (!accessToken || !accessTokenPayload) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(accessTokenPayload.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
