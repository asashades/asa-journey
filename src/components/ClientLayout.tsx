'use client';

import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import BottomNav from '@/components/layout/BottomNav';
import { usePathname, redirect } from 'next/navigation';
import { useEffect } from 'react';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      redirect('/auth');
    }
  }, [loading, user, isAuthPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13111A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C049FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isAuthPage) {
    return null;
  }

  return <>{children}</>;
}

import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AuthGuard>
          <div className="min-h-screen bg-[#13111A] pb-20">
            {children}
          </div>
        </AuthGuard>
        <BottomNavWrapper />
      </DataProvider>
    </AuthProvider>
  );
}

function BottomNavWrapper() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const isAuthRoute = true; // Simplified check

  if (isAuthPage) return null;
  if (!user || loading) return null;

  return <BottomNav />;
}
