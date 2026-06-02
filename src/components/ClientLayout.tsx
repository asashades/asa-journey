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
  const isOnboardingPage = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (!isAuthPage && !isOnboardingPage) {
          redirect('/onboarding');
        }
      } else {
        if (isAuthPage || isOnboardingPage) {
          redirect('/write');
        }
      }
    }
  }, [loading, user, isAuthPage, isOnboardingPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00DC7D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isAuthPage && !isOnboardingPage) {
    return null;
  }

  return <>{children}</>;
}

import { ReactNode } from 'react';

function ThemeWrapper({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const settings = userProfile?.settings || { darkMode: false, theme: 'journalistic' };
  
  const theme = settings.theme || 'journalistic';
  const isDark = settings.darkMode === true;
  const mode = isDark ? 'dark' : 'light';
  const themeClass = `theme-${theme}-${mode}`;

  useEffect(() => {
    const root = document.documentElement;
    // Remove all old classes starting with "theme-"
    const classesToRemove = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    classesToRemove.forEach(c => root.classList.remove(c));
    
    // Add the new class
    root.classList.add(themeClass);

    // Toggle the standard Tailwind "dark" class on documentElement
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeClass, isDark]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {children}
    </div>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AuthGuard>
          <ThemeWrapper>
            <div className="pb-20">
              {children}
            </div>
          </ThemeWrapper>
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

  if (isAuthPage) return null;
  if (!user || loading) return null;

  return <BottomNav />;
}

