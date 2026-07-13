import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { CustomerRegisterPage } from '../pages/CustomerRegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EventsPage } from '../pages/EventsPage';
import { EventWorkspacePage } from '../pages/EventWorkspacePage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlanningGuidePage } from '../pages/PlanningGuidePage';
import { RegisterPage } from '../pages/RegisterPage';
import { VendorDetailPage } from '../pages/VendorDetailPage';
import { VendorRegisterPage } from '../pages/VendorRegisterPage';
import { VendorsPage } from '../pages/VendorsPage';
import { BudgetWorkspacePage } from '../pages/BudgetWorkspacePage';
import { GuestWorkspacePage } from '../pages/GuestWorkspacePage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/vendors',
        element: <VendorsPage />,
      },
      {
        path: '/vendors/:vendorSlug',
        element: <VendorDetailPage />,
      },
      {
        path: '/planning-guide',
        element: <PlanningGuidePage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/register/customer',
        element: <CustomerRegisterPage />,
      },
      {
        path: '/register/vendor',
        element: <VendorRegisterPage />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events',
    element: (
      <ProtectedRoute>
        <EventsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId',
    element: (
      <ProtectedRoute>
        <EventWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/budget',
    element: (
      <ProtectedRoute>
        <BudgetWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/guests',
    element: (
      <ProtectedRoute>
        <GuestWorkspacePage />
      </ProtectedRoute>
    ),
  },
]);
