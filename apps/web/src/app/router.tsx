import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { PlanningGuidePage } from '../pages/PlanningGuidePage';
import { VendorDetailPage } from '../pages/VendorDetailPage';
import { VendorsPage } from '../pages/VendorsPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/vendors', element: <VendorsPage /> },
      { path: '/vendors/:vendorSlug', element: <VendorDetailPage /> },
      {
        path: '/planning-guide',
        element: <PlanningGuidePage />,
      },
      { path: '/login', element: <PlaceholderPage title="Log in" /> },
      {
        path: '/register',
        element: <PlaceholderPage title="Create your account" />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
]);
