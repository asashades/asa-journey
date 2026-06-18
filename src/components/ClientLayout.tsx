'use client';

import { useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { DataProvider, useData } from '@/contexts/DataContext';
import BottomNav from '@/components/layout/BottomNav';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const SearchSpotlight = dynamic(() => import('@/components/search/SearchSpotlight'), {
  ssr: false,
});
import { format } from 'date-fns';
import { loadThemeFonts, type ThemeFontKey } from '@/lib/themeFonts';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function NotificationListener() {
  const { tasks } = useData();
  const { userProfile } = useAuth();

  const notifiedIds = useRef<Set<string>>(new Set());
  const taskTimesRef = useRef<Record<string, number>>({});

  // Manage Web Push subscription in Firestore
  useEffect(() => {
    if (typeof window === 'undefined' || !userProfile?.uid) return;

    let active = true;

    const manageSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Web Push not supported in this browser.');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        
        if (Notification.permission === 'granted') {
          const publicVapidKey = 'BPlaOdWv-YzUwWH3KU9BxfzZrHG1JKg29YixlRANTZT2q8ucppU6RtIDKMdQmmcUtGnlq8wxBJZ5frQlAt1nBnU';
          
          let subscription = await reg.pushManager.getSubscription();
          
          if (!subscription) {
            try {
              subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
              });
            } catch (subscribeErr) {
              console.error('Failed to subscribe to push notifications:', subscribeErr);
            }
          }

          if (subscription && active) {
            const subscriptionId = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '');
            const subRef = doc(db, 'users', userProfile.uid, 'pushSubscriptions', subscriptionId);
            
            const subJSON = subscription.toJSON();
            await setDoc(subRef, {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subJSON.keys?.p256dh || '',
                auth: subJSON.keys?.auth || ''
              },
              updatedAt: serverTimestamp()
            });
            console.log('Web Push subscription registered successfully in Firestore.');
          }
        }
      } catch (err) {
        console.error('Error managing push subscription in Firestore:', err);
      }
    };

    manageSubscription();

    return () => {
      active = false;
    };
  }, [userProfile?.uid]);

  // Request notifications permission on mount & register service worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Register Service Worker for PWA / iOS notifications support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.error('Service Worker registration failed:', err);
          });
      }

      // 2. Fallback permission request for desktop/android on mount
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }

      // 3. Load notified IDs from localStorage
      try {
        const stored = localStorage.getItem('notified_task_reminders');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            notifiedIds.current = new Set(ids);
          }
        }
      } catch (e) {
        console.error('Failed to load notified_task_reminders from localStorage', e);
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

  // Detect rescheduling
  useEffect(() => {
    let changed = false;
    pendingScheduledTasks.forEach(task => {
      const currentScheduledTime = task.scheduledAt.getTime();
      const previousScheduledTime = taskTimesRef.current[task.id];
      
      if (previousScheduledTime !== undefined && previousScheduledTime !== currentScheduledTime) {
        // Task rescheduled! Remove from notified list
        notifiedIds.current.delete(task.id);
        changed = true;
      }
      taskTimesRef.current[task.id] = currentScheduledTime;
    });

    if (changed && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'notified_task_reminders',
          JSON.stringify(Array.from(notifiedIds.current))
        );
      } catch (e) {
        console.error('Failed to save notified_task_reminders to localStorage', e);
      }
    }
  }, [pendingScheduledTasks]);

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
    const reminderOffset = userProfile?.settings?.reminderOffset ?? 0;

    const checkNotifications = () => {
      const now = new Date();
      const nowTime = now.getTime();
      const nowDayStr = format(now, 'yyyy-MM-dd');
      let updatedNotified = false;

      pendingScheduledTasks.forEach(task => {
        const sDate = new Date(task.scheduledAt);
        const sDayStr = format(sDate, 'yyyy-MM-dd');

        // Target reminder time = scheduledAt - offset (in milliseconds)
        const reminderTime = new Date(sDate.getTime() - reminderOffset * 60 * 1000);
        const reminderTimeMs = reminderTime.getTime();

        // Match day and check if reminder time has arrived or passed (and hasn't been notified yet)
        if (sDayStr === nowDayStr && reminderTimeMs <= nowTime && !notifiedIds.current.has(task.id)) {
          notifiedIds.current.add(task.id);
          updatedNotified = true;

          // Prepare notification text (Gen-Z American style)
          let notificationText = task.text;
          if (reminderOffset > 0) {
            notificationText = `in ${reminderOffset} mins: ${task.text} 💅`;
          }

          // System notification is now handled by Cloud Function push.
          // Frontend only plays chime + marks notifiedIds to avoid re-trigger.

          // Play Audio Chime
          playCosmicChime();
        }
      });

      if (updatedNotified && typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'notified_task_reminders',
            JSON.stringify(Array.from(notifiedIds.current))
          );
        } catch (e) {
          console.error('Failed to save notified_task_reminders to localStorage', e);
        }
      }
    };

    // Run check immediately on mount/update (crucial for catch-up!)
    checkNotifications();

    const interval = setInterval(checkNotifications, 10000); // scan every 10 seconds

    // Listen to focus and visibilitychange to catch up immediately when app is opened/resumed
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', checkNotifications);
      document.addEventListener('visibilitychange', checkNotifications);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', checkNotifications);
        document.removeEventListener('visibilitychange', checkNotifications);
      }
    };
  }, [pendingScheduledTasks, userProfile?.settings?.reminderOffset]);

  return null;
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

    loadThemeFonts(savedTheme as ThemeFontKey).catch((error) => {
      console.warn('[ThemeWrapper] Failed to load saved theme fonts:', error);
    });
  }, [userProfile?.settings?.theme]);

  // Handle print event to temporarily switch to light mode for printing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let originalThemeClass: string | null = null;
    let hadDarkClass = false;

    const handleBeforePrint = () => {
      const root = document.documentElement;
      hadDarkClass = root.classList.contains('dark');
      
      // Find the current theme-*-dark class
      const activeThemeClass = Array.from(root.classList).find(c => c.startsWith('theme-') && c.endsWith('-dark'));
      if (activeThemeClass) {
        originalThemeClass = activeThemeClass;
        const lightThemeClass = activeThemeClass.replace('-dark', '-light');
        root.classList.remove(activeThemeClass);
        root.classList.add(lightThemeClass);
      }
      
      if (hadDarkClass) {
        root.classList.remove('dark');
      }
    };

    const handleAfterPrint = () => {
      const root = document.documentElement;
      
      if (originalThemeClass) {
        const lightThemeClass = originalThemeClass.replace('-dark', '-light');
        root.classList.remove(lightThemeClass);
        root.classList.add(originalThemeClass);
      }
      
      if (hadDarkClass) {
        root.classList.add('dark');
      }
      
      originalThemeClass = null;
      hadDarkClass = false;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

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
            <SearchSpotlight />
          </ThemeWrapper>
        </AuthGuard>
        <BottomNavWrapper />
      </DataProvider>
    </AuthProvider>
  );
}

function BottomNavWrapper() {
  const { user, loading } = useAuth();
  const { isSpotlightOpen, setIsSpotlightOpen, isSearchOpen, setIsSearchOpen } = useData();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  // Handle global keyboard shortcuts to toggle Spotlight
  useEffect(() => {
    if (!user || loading || isAuthPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle search on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      // Toggle capture on Cmd+Shift+I or Ctrl+Shift+I
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsSpotlightOpen(!isSpotlightOpen);
      }
      // Close on Escape
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          e.preventDefault();
          setIsSearchOpen(false);
        } else if (isSpotlightOpen) {
          e.preventDefault();
          setIsSpotlightOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, loading, isAuthPage, isSpotlightOpen, setIsSpotlightOpen, isSearchOpen, setIsSearchOpen]);

  if (isAuthPage) return null;
  if (!user || loading) return null;

  return (
    <>
      <BottomNav />
    </>
  );
}
