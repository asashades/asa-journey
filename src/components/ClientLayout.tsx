'use client';

import { useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { DataProvider, useData } from '@/contexts/DataContext';
import BottomNav from '@/components/layout/BottomNav';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark, faBell, faClock } from '@fortawesome/free-solid-svg-icons';
import { loadThemeFonts, type ThemeFontKey } from '@/lib/themeFonts';

function NotificationListener() {
  const { tasks, notes, toggleBulletComplete, toggleNoteChecklist } = useData();
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    text: string;
    isFromNote?: boolean;
    noteId?: string;
  } | null>(null);

  const notifiedIds = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request notifications permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Scan pending tasks that have scheduled time
  const pendingScheduledTasks = useMemo(() => {
    const list: {
      id: string;
      text: string;
      date: string;
      scheduledAt: Date;
      isFromNote?: boolean;
      noteId?: string;
    }[] = [];

    (tasks || []).forEach(task => {
      if (!task.isFromNote && !task.isCompleted && task.scheduledAt) {
        list.push({
          id: task.id,
          text: task.text,
          date: task.entryDate,
          scheduledAt: new Date(task.scheduledAt),
        });
      }
    });

    return list;
  }, [tasks]);

  const playCosmicChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.001, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.7);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1568, ctx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.001, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.7);
      }, 120);
    } catch (err) {
      console.warn("Sound blocked:", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nowDayStr = format(now, 'yyyy-MM-dd');

      pendingScheduledTasks.forEach(task => {
        const sDate = new Date(task.scheduledAt);
        const sDayStr = format(sDate, 'yyyy-MM-dd');
        const sMinutes = sDate.getHours() * 60 + sDate.getMinutes();

        // Match day and minute
        if (sDayStr === nowDayStr && sMinutes === nowMinutes) {
          if (!notifiedIds.current.has(task.id)) {
            notifiedIds.current.add(task.id);

            // 1. Trigger System Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification("Task Reminder 🔔", {
                body: task.text,
              });
            }

            // 2. Play Audio Chime
            playCosmicChime();

            // 3. Trigger In-app banner
            setActiveNotification(task);

            // Auto dismiss after 15 seconds
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = setTimeout(() => {
              setActiveNotification(null);
            }, 15000);
          }
        }
      });
    }, 10000); // scan every 10 seconds

    return () => {
      clearInterval(interval);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [pendingScheduledTasks]);

  const handleMarkDone = async () => {
    if (!activeNotification) return;

    if (activeNotification.isFromNote && activeNotification.noteId) {
      await toggleNoteChecklist(activeNotification.noteId, activeNotification.text);
    } else {
      await toggleBulletComplete(activeNotification.id);
    }
    setActiveNotification(null);
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-[400px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-[#55FFB4] flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faBell} className="w-3.5 h-3.5 animate-bounce" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[10px] font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider flex items-center gap-1">
            <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" /> Task Due Now
          </h4>
          <p className="text-xs font-semibold text-[#2F3331] dark:text-[#FAFAFA] mt-0.5 truncate pr-2">
            {activeNotification.text}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleMarkDone}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#00DC7D] text-white rounded-xl hover:bg-[#00B866] transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#00DC7D]/10"
        >
          <FontAwesomeIcon icon={faCheck} className="mr-1 w-2.5 h-2.5" /> Done
        </button>
        <button
          onClick={() => setActiveNotification(null)}
          className="text-gray-400 hover:text-black dark:hover:text-white p-1 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname.startsWith('/auth');
  const isOnboardingPage = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (!isAuthPage && !isOnboardingPage) {
          router.replace('/onboarding');
        }
      } else {
        if (isAuthPage || isOnboardingPage) {
          router.replace('/write');
        }
      }
    }
  }, [loading, user, isAuthPage, isOnboardingPage, router]);

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

  useEffect(() => {
    const savedTheme = userProfile?.settings?.theme;
    if (!savedTheme || typeof window === 'undefined') return;

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadSavedThemeFonts = () => {
      if (cancelled) return;
      loadThemeFonts(savedTheme as ThemeFontKey).catch((error) => {
        console.warn('[ThemeWrapper] Failed to load saved theme fonts:', error);
      });
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadSavedThemeFonts, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(loadSavedThemeFonts, 800);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userProfile?.settings?.theme]);

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
            <NotificationListener />
            {children}
          </ThemeWrapper>
        </AuthGuard>
        <BottomNavWrapper />
      </DataProvider>
    </AuthProvider>
  );
}

function BottomNavWrapper() {
  const { user, loading } = useAuth();
  const { isSpotlightOpen, setIsSpotlightOpen } = useData();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  // Handle global keyboard shortcuts to toggle Spotlight
  useEffect(() => {
    if (!user || loading || isAuthPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(!isSpotlightOpen);
      }
      // Close on Escape
      if (e.key === 'Escape' && isSpotlightOpen) {
        e.preventDefault();
        setIsSpotlightOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, loading, isAuthPage, isSpotlightOpen, setIsSpotlightOpen]);

  if (isAuthPage) return null;
  if (!user || loading) return null;

  return (
    <>
      <BottomNav />
    </>
  );
}
