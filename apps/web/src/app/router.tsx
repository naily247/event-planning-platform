import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminComplaintsPage } from '../pages/AdminComplaintsPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminPaymentsPage } from '../pages/AdminPaymentsPage';
import { AdminReportsPage } from '../pages/AdminReportsPage';
import { AdminReviewsPage } from '../pages/AdminReviewsPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminVendorApplicationsPage } from '../pages/AdminVendorApplicationsPage';
import { BookingsWorkspacePage } from '../pages/BookingsWorkspacePage';
import { BudgetWorkspacePage } from '../pages/BudgetWorkspacePage';
import { ComplaintsWorkspacePage } from '../pages/ComplaintsWorkspacePage';
import { CustomerRegisterPage } from '../pages/CustomerRegisterPage';
import { DashboardEntryPage } from '../pages/DashboardEntryPage';
import { EventDocumentsWorkspacePage } from '../pages/EventDocumentsWorkspacePage';
import { EventsPage } from '../pages/EventsPage';
import { EventTasksWorkspacePage } from '../pages/EventTasksWorkspacePage';
import { EventWorkspacePage } from '../pages/EventWorkspacePage';
import { GuestWorkspacePage } from '../pages/GuestWorkspacePage';
import { HomePage } from '../pages/HomePage';
import { InvitationWorkspacePage } from '../pages/InvitationWorkspacePage';
import { LoginPage } from '../pages/LoginPage';
import { MoodBoardWorkspacePage } from '../pages/MoodBoardWorkspacePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { PlanningGuidePage } from '../pages/PlanningGuidePage';
import { PublicInvitationPage } from '../pages/PublicInvitationPage';
import { QuotationRequestsWorkspacePage } from '../pages/QuotationRequestsWorkspacePage';
import { RegisterPage } from '../pages/RegisterPage';
import { ReviewsWorkspacePage } from '../pages/ReviewsWorkspacePage';
import { VendorAvailabilityPage } from '../pages/VendorAvailabilityPage';
import { VendorBookingDetailPage } from '../pages/VendorBookingDetailPage';
import { VendorBookingsPage } from '../pages/VendorBookingsPage';
import { VendorComplaintsPage } from '../pages/VendorComplaintsPage';
import { VendorDashboardPage } from '../pages/VendorDashboardPage';
import { VendorDetailPage } from '../pages/VendorDetailPage';
import { VendorPackagesPage } from '../pages/VendorPackagesPage';
import { VendorPortfolioPage } from '../pages/VendorPortfolioPage';
import { VendorProfilePage } from '../pages/VendorProfilePage';
import { VendorQuotationEditorPage } from '../pages/VendorQuotationEditorPage';
import { VendorQuotationRequestDetailPage } from '../pages/VendorQuotationRequestDetailPage';
import { VendorQuotationRequestsPage } from '../pages/VendorQuotationRequestsPage';
import { VendorRegisterPage } from '../pages/VendorRegisterPage';
import { VendorReviewsPage } from '../pages/VendorReviewsPage';
import { VendorSettingsPage } from '../pages/VendorSettingsPage';
import { VendorsPage } from '../pages/VendorsPage';

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
        path: '/invitations/respond/:token',
        element: <PublicInvitationPage />,
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
        <DashboardEntryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminUsersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/vendors',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminVendorApplicationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/payments',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminPaymentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reviews',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminReviewsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/complaints',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminComplaintsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/profile',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/portfolio',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorPortfolioPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/packages',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorPackagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/availability',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorAvailabilityPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/quotation-requests',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorQuotationRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/quotation-requests/:quotationRequestId',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorQuotationRequestDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/quotation-requests/:quotationRequestId/quotation',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorQuotationEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/bookings',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorBookingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/bookings/:bookingId',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorBookingDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/reviews',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorReviewsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/complaints',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorComplaintsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vendor/settings',
    element: (
      <ProtectedRoute allowedRoles={['VENDOR']}>
        <VendorSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <EventsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <EventWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/budget',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <BudgetWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/guests',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <GuestWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/invitations',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <InvitationWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/mood-board',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <MoodBoardWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/documents',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <EventDocumentsWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/tasks',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <EventTasksWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/quotations',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <QuotationRequestsWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/bookings',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <BookingsWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/reviews',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <ReviewsWorkspacePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:eventId/complaints',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <ComplaintsWorkspacePage />
      </ProtectedRoute>
    ),
  },
]);
