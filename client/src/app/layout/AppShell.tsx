import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';

interface AppShellProps {
  user?: {
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  unreadCount?: number;
  authLocked?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ user, unreadCount = 0, authLocked = false }) => {
  const location = useLocation();

  if (authLocked) {
    return (
      <main className="min-h-dvh bg-bg text-ink">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      <Sidebar unreadCount={unreadCount} />
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar user={user} />
        <main className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
};