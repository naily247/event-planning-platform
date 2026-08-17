import { createBrowserRouter } from 'react-router-dom';
import { AppRouterLayout } from '../components/layout/AppRouterLayout';
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
import { CustomerAccountSettingsPage } from '../pages/CustomerAccountSettingsPage';
import { CustomerProfilePage } from '../pages/CustomerProfilePage';
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
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '../pages/TermsOfServicePage';
import { CustomerLayout } from '../components/layout/CustomerLayout';
import { VendorLayout } from '../components/layout/VendorLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { NotificationsEntryPage } from '../pages/NotificationsEntryPage';

export const router = createBrowserRouter([
  {
    element: <AppRouterLayout />,
    children: [
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
          {
            path: '/about',
            element: <AboutPage />,
          },
          {
            path: '/contact',
            element: <ContactPage />,
          },
          {
            path: '/privacy',
            element: <PrivacyPolicyPage />,
          },
          {
            path: '/terms',
            element: <TermsOfServicePage />,
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
            <NotificationsEntryPage />
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
        element: (
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <VendorLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/vendor/dashboard',
            element: <VendorDashboardPage />,
          },
          {
            path: '/vendor/notifications',
            element: <NotificationsPage />,
          },
          {
            path: '/vendor/profile',
            element: <VendorProfilePage />,
          },
          {
            path: '/vendor/portfolio',
            element: <VendorPortfolioPage />,
          },
          {
            path: '/vendor/packages',
            element: <VendorPackagesPage />,
          },
          {
            path: '/vendor/availability',
            element: <VendorAvailabilityPage />,
          },
          {
            path: '/vendor/quotation-requests',
            element: <VendorQuotationRequestsPage />,
          },
          {
            path: '/vendor/quotation-requests/:quotationRequestId',
            element: <VendorQuotationRequestDetailPage />,
          },
          {
            path: '/vendor/quotation-requests/:quotationRequestId/quotation',
            element: <VendorQuotationEditorPage />,
          },
          {
            path: '/vendor/bookings',
            element: <VendorBookingsPage />,
          },
          {
            path: '/vendor/bookings/:bookingId',
            element: <VendorBookingDetailPage />,
          },
          {
            path: '/vendor/reviews',
            element: <VendorReviewsPage />,
          },
          {
            path: '/vendor/complaints',
            element: <VendorComplaintsPage />,
          },
          {
            path: '/vendor/settings',
            element: <VendorSettingsPage />,
          },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/customer/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/customer/notifications',
            element: <NotificationsPage />,
          },
          {
            path: '/customer/profile',
            element: <CustomerProfilePage />,
          },
          {
            path: '/customer/account-settings',
            element: <CustomerAccountSettingsPage />,
          },
          {
            path: '/events',
            element: <EventsPage />,
          },
          {
            path: '/events/:eventId',
            element: <EventWorkspacePage />,
          },
          {
            path: '/events/:eventId/vendors/:vendorSlug',
            element: <VendorDetailPage />,
          },
          {
            path: '/events/:eventId/budget',
            element: <BudgetWorkspacePage />,
          },
          {
            path: '/events/:eventId/guests',
            element: <GuestWorkspacePage />,
          },
          {
            path: '/events/:eventId/invitations',
            element: <InvitationWorkspacePage />,
          },
          {
            path: '/events/:eventId/mood-board',
            element: <MoodBoardWorkspacePage />,
          },
          {
            path: '/events/:eventId/documents',
            element: <EventDocumentsWorkspacePage />,
          },
          {
            path: '/events/:eventId/tasks',
            element: <EventTasksWorkspacePage />,
          },
          {
            path: '/events/:eventId/quotations',
            element: <QuotationRequestsWorkspacePage />,
          },
          {
            path: '/events/:eventId/bookings',
            element: <BookingsWorkspacePage />,
          },
          {
            path: '/events/:eventId/reviews',
            element: <ReviewsWorkspacePage />,
          },
          {
            path: '/events/:eventId/complaints',
            element: <ComplaintsWorkspacePage />,
          },
        ],
      },
    ],
  },
]);
