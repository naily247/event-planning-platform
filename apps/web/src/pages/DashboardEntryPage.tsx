import { Navigate } from 'react-router-dom';
import { getAccessTokenPayload } from '../features/auth/auth.storage';
import { DashboardPage } from './DashboardPage';
import { VendorDashboardPage } from './VendorDashboardPage';

export function DashboardEntryPage() {
  const accessTokenPayload = getAccessTokenPayload();

  if (!accessTokenPayload) {
    return <Navigate to="/login" replace />;
  }

  switch (accessTokenPayload.role) {
    case 'CUSTOMER':
      return <DashboardPage />;

    case 'VENDOR':
      return <VendorDashboardPage />;

    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;

    default:
      return <Navigate to="/login" replace />;
  }
}
