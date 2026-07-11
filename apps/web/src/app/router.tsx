import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/vendors', element: <PlaceholderPage title="Browse vendors" /> },
      {
        path: '/how-it-works',
        element: <PlaceholderPage title="How it works" />,
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
