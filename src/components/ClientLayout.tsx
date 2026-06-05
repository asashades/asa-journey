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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        {/* Dynamic Cosmic Orbit Loading Circle */}
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
          <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
          <div className="h-3 w-3 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
        </div>
        <h3 className="font-serif text-xl font-bold text-[#2F3331]">Entering your observatory</h3>
        <p className="mt-2 text-xs text-[#A3A7A8] font-mono animate-pulse">Gathering your stars...</p>
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

