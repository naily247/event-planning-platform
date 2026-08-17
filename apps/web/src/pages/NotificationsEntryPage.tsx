import { Navigate } from 'react-router-dom';

import { getAccessTokenPayload } from '../features/auth/auth.storage';
import { NotificationsPage } from './NotificationsPage';

export function NotificationsEntryPage() {
  const accessTokenPayload = getAccessTokenPayload();

  if (!accessTokenPayload) {
    return <Navigate to="/login" replace />;
  }

  switch (accessTokenPayload.role) {
    case 'CUSTOMER':
      return <Navigate to="/customer/notifications" replace />;

    case 'VENDOR':
      return <Navigate to="/vendor/notifications" replace />;

    case 'ADMIN':
      return <NotificationsPage />;

    default:
      return <Navigate to="/login" replace />;
  }
}
