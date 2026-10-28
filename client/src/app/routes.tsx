import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';

// Lazy loaded pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ListingDetailPage = lazy(() => import('@/pages/ListingDetailPage'));
const NewListingPage = lazy(() => import('@/pages/NewListingPage'));
const EditListingPage = lazy(() => import('@/pages/EditListingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const VerifyPage = lazy(() => import('@/pages/VerifyPage'));
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const InboxPage = lazy(() => import('@/pages/InboxPage'));
import { useInbox } from '@/hooks/useChat';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Root layout with auth user and unread count wired
const AppShellWithAuth: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { totalUnread } = useInbox();
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <AppShell user={user} unreadCount={totalUnread} authLocked={user?.mustChangePassword} />;
};

const PageLoader = () => (
  <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-96" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="aspect-[4/3] w-full" />
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShellWithAuth />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'listing/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ListingDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'sell',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <NewListingPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'sell/:id/edit',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <EditListingPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'me',
        element: (
          <ProtectedRoute>
            <Navigate to="/" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'change-password',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ChangePasswordPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: 'verify',
        element: (
          <Suspense fallback={<PageLoader />}>
            <VerifyPage />
          </Suspense>
        ),
      },
      {
        path: 'checkout/:orderId',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <CheckoutPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'inbox',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <InboxPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'inbox/:conversationId',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <InboxPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
