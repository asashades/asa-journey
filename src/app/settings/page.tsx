'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightFromBracket,
  faCircleInfo,
  faDownload,
  faGear,
  faTag,
  faAt,
  faPen,
  faFire,
  faPalette,
  faMoon,
  faSun,
  faWandMagicSparkles,
  faKey,
  faEye,
  faEyeSlash,
  faLock,
  faUpload,
  faSpinner,
  faCheckCircle,
  faTrophy,
  faBatteryFull,
  faBell,
} from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loadThemeFonts, type ThemeFontKey } from '@/lib/themeFonts';

const THEME_OPTIONS = [
  {
    id: 'journalistic',
    name: 'Orbital Dawn',
    desc: 'Clean Starlight',
    preview: 'bg-[#FAFAFA] border-[#CCD0CF]',
    indicator: 'bg-[#00DC7D]',
  },
  {
    id: 'cosmic',
    name: 'Deep Nebula',
    desc: 'Cosmic Observatory',
    preview: 'bg-[#08090D] border-[#1F2433]',
    indicator: 'bg-[#9CF6F6]',
  },
  {
    id: 'moss',
    name: 'Emerald Station',
    desc: 'Verdant Outpost',
    preview: 'bg-[#111412] border-[#2E3832]',
    indicator: 'bg-[#00DC7D]',
  },
  {
    id: 'nocturne',
    name: 'Twilight Void',
    desc: 'Luminous Darkspace',
    preview: 'bg-[#08090D] border-[#202433]',
    indicator: 'bg-[#B79CFF]',
  },
] as const satisfies ReadonlyArray<{
  id: ThemeFontKey;
  name: string;
  desc: string;
  preview: string;
  indicator: string;
}>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, isGuest, userProfile, updateUserSettings } = useAuth();
  const { entries, highlights, tags, people, wisdoms, notes, ideas } = useData();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState<ThemeFontKey | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Notifications are not supported on this device/browser.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notification permission is blocked. Please enable it in your device or browser settings.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("we are so back! 🔔", {
            body: 'you will receive reminders for scheduled tasks now, bestie!',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
          });
        } else {
          try {
            new Notification("we are so back! 🔔", {
              body: 'you will receive reminders for scheduled tasks now, bestie!',
            });
          } catch (e) {
            console.error('Test notification failed:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const defaultSettings = {
    darkMode: true,
    moduleVisibility: {
      dreams: true,
      highlights: true,
      tags: true,
      people: true,
      notes: true,
      wisdom: true,
      ideas: true,
      focus: false,
    },
    autoTagging: true,
    autoMentioning: true,
    language: 'en' as const,
    dailyWordGoal: 50,
    showStreakWidget: true,
    showWordGoalWidget: true,
    theme: 'journalistic' as const,
    aiConfig: {
      mode: 'built_in' as const,
      provider: 'gemini' as const,
      apiKey: '',
      modelName: '',
    }
  };

  const settings = userProfile?.settings || defaultSettings;
  const aiConfig = settings.aiConfig || defaultSettings.aiConfig;
  const loadingThemeName = THEME_OPTIONS.find((theme) => theme.id === loadingTheme)?.name || 'theme';

  // Local AI Configuration states
  const [aiMode, setAiMode] = useState<'built_in' | 'bring_your_own_key'>(aiConfig.mode || 'built_in');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'deepseek'>(aiConfig.provider || 'gemini');
  const [aiApiKey, setAiApiKey] = useState(aiConfig.apiKey || '');
  const [aiModelName, setAiModelName] = useState(aiConfig.modelName || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Quota usage states
  const [aiUsage, setAiUsage] = useState<{ weeklyInsightCount: number; tagSuggestionCount: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUsage = async () => {
      setLoadingUsage(true);
      try {
        const now = new Date();
        const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const usageDocRef = doc(db, 'users', user.uid, 'usage', `ai_${yyyyMM}`);
        const snap = await getDoc(usageDocRef);
        if (snap.exists()) {
          setAiUsage(snap.data() as any);
        } else {
          setAiUsage({ weeklyInsightCount: 0, tagSuggestionCount: 0 });
        }
      } catch (error) {
        console.error('Error fetching AI usage:', error);
      } finally {
        setLoadingUsage(false);
      }
    };
    fetchUsage();
  }, [user]);

  // Sync state if settings update from context
  useEffect(() => {
    if (settings.aiConfig) {
      setAiMode(settings.aiConfig.mode || 'built_in');
      setAiProvider(settings.aiConfig.provider || 'gemini');
      setAiApiKey(settings.aiConfig.apiKey || '');
      setAiModelName(settings.aiConfig.modelName || '');
    }
  }, [settings.aiConfig]);

  const handleSaveAIConfig = async () => {
    setSaveStatus('saving');
    try {
      await updateUserSettings({
        aiConfig: {
          mode: aiMode,
          provider: aiProvider,
          apiKey: aiApiKey,
          modelName: aiModelName,
        }
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving AI config:', error);
      setSaveStatus('idle');
    }
  };

  const handleThemeChange = async (theme: ThemeFontKey) => {
    if (loadingTheme || (settings.theme || 'journalistic') === theme) return;

    setLoadingTheme(theme);
    try {
      await loadThemeFonts(theme);
      await updateUserSettings({ theme });
    } catch (error) {
      console.error('Error changing theme:', error);
      alert('Gagal mengganti tema. Coba lagi sebentar lagi.');
    } finally {
      setLoadingTheme(null);
    }
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      entries,
      highlights,
      tags,
      people,
      wisdoms,
      notes,
      ideas,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asa-journey-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = '# ASA Journey Export\n\n';
    md += `*Exported on ${format(new Date(), 'MMMM d, yyyy')}*\n\n`;

    md += '## Entries\n\n';
    entries.forEach(entry => {
      md += `## ${entry.date}\n\n`;
      if (entry.dream) md += `**Dream:** ${entry.dream}\n\n`;
      entry.bullets.forEach(bullet => {
        const icon = bullet.style === 'star' ? '*' : bullet.style === 'checklist' ? '- [ ]' : '-';
        const highlight = bullet.isHighlight ? '**' : '';
        md += `${icon} ${highlight}${bullet.text}${highlight}\n`;
      });
      md += '\n---\n\n';
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asa-journey-export-${format(new Date(), 'yyyy-MM-dd')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data || typeof data !== 'object') {
          alert('Format berkas tidak valid.');
          return;
        }
        setImportData(data);
        setImportError('');
        setShowImportConfirm(true);
      } catch (err) {
        alert('Gagal membaca berkas backup.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const executeImport = async (mode: 'merge' | 'overwrite') => {
    if (!user || !importData) return;
    setIsImporting(true);
    setImportError('');

    try {
      // 1. Overwrite mode: delete existing collections first
      if (mode === 'overwrite') {
        const deletePromises: Promise<any>[] = [];
        
        entries.forEach(item => {
          deletePromises.push(deleteDoc(doc(db, 'users', user.uid, 'entries', item.date)));
        });
        wisdoms.forEach(item => {
          deletePromises.push(deleteDoc(doc(db, 'users', user.uid, 'wisdoms', item.id)));
        });
        notes.forEach(item => {
          deletePromises.push(deleteDoc(doc(db, 'users', user.uid, 'notes', item.id)));
        });
        ideas.forEach(item => {
          deletePromises.push(deleteDoc(doc(db, 'users', user.uid, 'ideas', item.id)));
        });

        await Promise.all(deletePromises);
      }

      // Helper to strip undefined values and revive date fields properly for Firestore
      const parseDate = (val: any) => {
        if (!val) return new Date();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      const writePromises: Promise<any>[] = [];

      // Helper to clean object from undefined values
      const cleanUndefined = (obj: any) => {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            result[key] = value;
          }
        }
        return result;
      };

      // 2. Import Entries
      if (Array.isArray(importData.entries)) {
        importData.entries.forEach((entry: any) => {
          if (!entry.date) return;
          const entryRef = doc(db, 'users', user.uid, 'entries', entry.date);
          const cleanEntry = {
            id: entry.id || entry.date,
            date: entry.date,
            dream: entry.dream || '',
            bullets: Array.isArray(entry.bullets) ? entry.bullets.map((b: any) => cleanUndefined({
              id: b.id,
              text: b.text || '',
              style: b.style || 'bullet',
              isHighlight: !!b.isHighlight,
              isCompleted: !!b.isCompleted,
              tags: Array.isArray(b.tags) ? b.tags : [],
              mentions: Array.isArray(b.mentions) ? b.mentions : [],
              createdAt: parseDate(b.createdAt),
              updatedAt: parseDate(b.updatedAt),
              ...(b.source ? { source: b.source } : {}),
              ...(b.sourceType ? { sourceType: b.sourceType } : {}),
              ...(b.sourceId ? { sourceId: b.sourceId } : {}),
              ...(b.scheduledAt ? { scheduledAt: parseDate(b.scheduledAt) } : {}),
            })) : [],
            createdAt: parseDate(entry.createdAt),
            updatedAt: new Date(),
          };
          writePromises.push(setDoc(entryRef, cleanEntry, { merge: true }));
        });
      }

      // 3. Import Wisdoms
      if (Array.isArray(importData.wisdoms)) {
        importData.wisdoms.forEach((w: any) => {
          if (!w.id) return;
          const ref = doc(db, 'users', user.uid, 'wisdoms', w.id);
          const clean = {
            id: w.id,
            type: w.type || 'thought',
            content: w.content || '',
            ...(w.linkedEntryId ? { linkedEntryId: w.linkedEntryId } : {}),
            createdAt: parseDate(w.createdAt),
            updatedAt: new Date(),
          };
          writePromises.push(setDoc(ref, clean, { merge: true }));
        });
      }

      // 4. Import Notes
      if (Array.isArray(importData.notes)) {
        importData.notes.forEach((n: any) => {
          if (!n.id) return;
          const ref = doc(db, 'users', user.uid, 'notes', n.id);
          const clean = cleanUndefined({
            id: n.id,
            title: n.title || 'Untitled',
            content: n.content || '',
            labels: Array.isArray(n.labels) ? n.labels : [],
            ...(n.linkedEntryId || n.linkedDate ? { linkedEntryId: n.linkedEntryId || n.linkedDate, linkedDate: n.linkedEntryId || n.linkedDate } : {}),
            createdAt: parseDate(n.createdAt),
            updatedAt: new Date(),
          });
          writePromises.push(setDoc(ref, clean, { merge: true }));
        });
      }

      // 5. Import Ideas
      if (Array.isArray(importData.ideas)) {
        importData.ideas.forEach((idItem: any) => {
          if (!idItem.id) return;
          const ref = doc(db, 'users', user.uid, 'ideas', idItem.id);
          const clean = cleanUndefined({
            id: idItem.id,
            content: idItem.content || '',
            status: idItem.status || 'cooking',
            solutions: Array.isArray(idItem.solutions) ? idItem.solutions : [],
            linkedEntries: Array.isArray(idItem.linkedEntries) ? idItem.linkedEntries : [],
            createdAt: parseDate(idItem.createdAt),
            updatedAt: new Date(),
          });
          writePromises.push(setDoc(ref, clean, { merge: true }));
        });
      }

      await Promise.all(writePromises);
      setShowImportConfirm(false);
      setImportData(null);
      
      // Show Success Toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Gagal menyimpan data ke Firestore.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const executeSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24 relative">
      {showSuccessToast && (
        <div className="fixed left-1/2 top-6 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2F3331] px-4 py-2 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-3 duration-250">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-[#00DC7D]" />
          Import data berhasil! ✓
        </div>
      )}

      {loadingTheme && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex w-full max-w-[280px] flex-col items-center rounded-3xl border border-[#EEF0EF] bg-white px-6 py-7 text-center shadow-2xl">
            <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
              <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
              <span className="h-2 w-2 rounded-full bg-[#00DC7D] shadow-[0_0_10px_#00DC7D]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2F3331]">Preparing {loadingThemeName}</h3>
            <p className="mt-2 text-xs font-medium text-[#A3A7A8]">Loading theme typography...</p>
          </div>
        </div>
      )}

      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-[480px] p-6 shadow-2xl border border-[#EEF0EF] animate-in zoom-in-95 duration-150 relative">
            <h3 className="text-xl font-bold text-[#2F3331] mb-2 flex items-center gap-2">
              <FontAwesomeIcon icon={faUpload} className="text-[#00DC7D]" />
              Import Backup Data
            </h3>
            <p className="text-sm text-[#6F7476] mb-6 leading-relaxed">
              Pilih metode penggabungan data untuk file backup Anda.
            </p>

            {importError && (
              <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                {importError}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => executeImport('merge')}
                className="w-full p-4 text-left rounded-2xl border-2 border-[#EEF0EF] hover:border-[#00DC7D] hover:bg-[#E9FFF4]/10 transition-all flex items-start gap-3 group disabled:opacity-50"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🧬</span>
                <div>
                  <h4 className="text-sm font-bold text-[#2F3331] group-hover:text-[#00A963] transition-colors">Merge (Gabungkan Data)</h4>
                  <p className="text-xs text-[#A3A7A8] mt-0.5 leading-relaxed">Menyisipkan entri baru dan memperbarui data lama jika ID cocok. Data saat ini tidak terhapus.</p>
                </div>
              </button>

              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  if (window.confirm("PERINGATAN: Seluruh data Anda saat ini akan dihapus dan digantikan oleh file backup. Apakah Anda yakin?")) {
                    executeImport('overwrite');
                  }
                }}
                className="w-full p-4 text-left rounded-2xl border-2 border-[#EEF0EF] hover:border-red-500 hover:bg-red-50/30 transition-all flex items-start gap-3 group disabled:opacity-50"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">⚠️</span>
                <div>
                  <h4 className="text-sm font-bold text-[#2F3331] group-hover:text-red-500 transition-colors">Overwrite (Timpa Penuh)</h4>
                  <p className="text-xs text-[#A3A7A8] mt-0.5 leading-relaxed">Menghapus seluruh koleksi data Anda saat ini dan menulis ulang dari file backup.</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => { setShowImportConfirm(false); setImportData(null); }}
                className="flex-1 py-3 rounded-xl bg-[#F2F2F3] hover:bg-[#E5E5E5] text-xs font-bold text-[#6F7476] transition-colors"
              >
                Batal
              </button>
              {isImporting && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#00DC7D] shrink-0">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin h-4 w-4" />
                  Mengimpor...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] px-6 pt-8">
        <h1 className="mb-2 font-sans text-5xl font-bold text-[#2F3331]">Settings</h1>
        <p className="text-[#6F7476]">account, export, and quick guide</p>
      </div>

      <div className="mx-auto mt-12 max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] space-y-12 px-6">
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F3331]">
              <span className="text-lg font-bold text-white">{(user?.displayName || 'G')[0].toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-sans text-2xl font-bold text-[#2F3331]">{user?.displayName || 'Guest'}</h2>
              <p className="text-sm text-[#A3A7A8]">{user?.email || 'guest mode'}</p>
            </div>
          </div>

          {isGuest && (
            <div className="flex items-start gap-3 rounded-lg bg-[#FFCC33]/20 p-4 text-sm text-[#2F3331]">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-4 w-4 shrink-0" />
              <p>guest data is saved locally and will not sync across devices.</p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Backup & Restore</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportJSON}
                className="rounded-lg bg-[#F2F2F3] px-4 py-3 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E5E5E5] flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                Export JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="rounded-lg bg-[#F2F2F3] px-4 py-3 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E5E5E5] flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                Export Markdown
              </button>
            </div>
            <div>
              <input
                type="file"
                accept=".json"
                id="import-backup-file"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="import-backup-file"
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#CCD0CF] hover:border-[#00DC7D] bg-white px-4 py-3 text-sm font-semibold text-[#2F3331] hover:text-[#00A963] transition-colors cursor-pointer text-center"
              >
                <FontAwesomeIcon icon={faUpload} className="h-3.5 w-3.5" />
                Import Backup (.json)
              </label>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPalette} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Theme & Appearance</h2>
          </div>
          <div className="space-y-4">
            {/* Theme Selector */}
            <div className="rounded-lg border border-[#EEF0EF] bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-[#2F3331]">Select Theme</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEME_OPTIONS.map((themeItem) => {
                  const isActive = (settings.theme || 'journalistic') === themeItem.id;
                  const isLoadingThisTheme = loadingTheme === themeItem.id;
                  return (
                    <button
                      key={themeItem.id}
                      type="button"
                      disabled={loadingTheme !== null}
                      aria-pressed={isActive}
                      aria-busy={isLoadingThisTheme}
                      onClick={() => handleThemeChange(themeItem.id)}
                      className={`flex min-h-[112px] flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all disabled:cursor-wait disabled:opacity-75 ${
                        isActive
                          ? 'border-[#00DC7D] bg-[#E9FFF4]/20'
                          : 'border-[#EEF0EF] hover:border-[#CCD0CF] bg-white'
                      }`}
                    >
                      <div className={`flex h-8 w-full items-center justify-between rounded border ${themeItem.preview} px-2`}>
                        <div className={`h-3 w-3 rounded-full ${themeItem.indicator}`} />
                        <div className="flex gap-0.5">
                          <div className="h-1 w-2 rounded bg-gray-400 opacity-40" />
                          <div className="h-1 w-3 rounded bg-gray-400 opacity-40" />
                        </div>
                      </div>
                      <div className="flex w-full items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#2F3331]">{themeItem.name}</p>
                          <p className="text-[10px] text-[#A3A7A8] leading-tight">{themeItem.desc}</p>
                        </div>
                        {isLoadingThisTheme && (
                          <FontAwesomeIcon icon={faSpinner} className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-[#00DC7D]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Mode Switcher */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={settings.darkMode ? faMoon : faSun} className={`h-5 w-5 ${settings.darkMode ? 'text-[#B79CFF]' : 'text-[#FFCC33]'}`} />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Dark Mode</p>
                  <p className="text-xs text-[#A3A7A8]">switch between light and dark themes</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ darkMode: !settings.darkMode })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.darkMode ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Reminders / Notifications Switcher */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <FontAwesomeIcon icon={faBell} className={`h-5 w-5 shrink-0 ${notificationPermission === 'granted' ? 'text-[#00DC7D]' : 'text-[#A3A7A8]'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2F3331]">Task Reminders</p>
                  <p className="text-xs text-[#A3A7A8] truncate">
                    {notificationPermission === 'granted' 
                      ? 'notifs are active bestie! 💅' 
                      : notificationPermission === 'denied' 
                      ? 'blocked (check settings)' 
                      : 'enable notifications for scheduled tasks'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleNotifications}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all shrink-0 ${
                  notificationPermission === 'granted' ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'
                }`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  notificationPermission === 'granted' ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* AI Configuration Section */}
        <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#00DC7D] to-[#00B866] text-white">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-sans text-2xl font-bold text-[#2F3331]">AI Configuration</h2>
              <p className="text-xs text-[#A3A7A8]">configure built-in intelligence or connect your own API keys</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Choose Mode */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAiMode('built_in')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${
                  aiMode === 'built_in'
                    ? 'border-[#00DC7D] bg-[#E9FFF4]/20'
                    : 'border-[#EEF0EF] hover:border-[#CCD0CF] bg-white'
                }`}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} className="h-5 w-5 text-[#00DC7D]" />
                <div>
                  <p className="text-sm font-bold text-[#2F3331]">Built-in AI</p>
                  <p className="text-[10px] text-[#A3A7A8] leading-tight mt-0.5">Developer quota (free limit)</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAiMode('bring_your_own_key')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${
                  aiMode === 'bring_your_own_key'
                    ? 'border-[#00DC7D] bg-[#E9FFF4]/20'
                    : 'border-[#EEF0EF] hover:border-[#CCD0CF] bg-white'
                }`}
              >
                <FontAwesomeIcon icon={faKey} className="h-5 w-5 text-[#5D8AFF]" />
                <div>
                  <p className="text-sm font-bold text-[#2F3331]">Bring Your Own Key</p>
                  <p className="text-[10px] text-[#A3A7A8] leading-tight mt-0.5">Zero limits with custom keys</p>
                </div>
              </button>
            </div>

            {/* Mode-specific Fields */}
            {aiMode === 'built_in' ? (
              <div className="rounded-2xl bg-[#FAFAFA] p-4 border border-[#EEF0EF]">
                <h3 className="text-xs font-bold text-[#6F7476] uppercase tracking-wider mb-3">Monthly Usage Counters</h3>
                
                {loadingUsage ? (
                  <div className="py-4 text-center text-xs text-[#A3A7A8]">Loading usage stats...</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-[#2F3331]">
                        <span>Weekly Insights Summary</span>
                        <span>{aiUsage?.weeklyInsightCount || 0} / 3 reflections</span>
                      </div>
                      <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00DC7D] transition-all duration-500"
                          style={{ width: `${Math.min(100, ((aiUsage?.weeklyInsightCount || 0) / 3) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-[#2F3331]">
                        <span>Automatic Tag Recommendations</span>
                        <span>{aiUsage?.tagSuggestionCount || 0} / 20 requests</span>
                      </div>
                      <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00DC7D] transition-all duration-500"
                          style={{ width: `${Math.min(100, ((aiUsage?.tagSuggestionCount || 0) / 20) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-[#A3A7A8] leading-relaxed mt-2">
                      💡 Need more reflections or tags? Connect your own API key to bypass limits completely!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl bg-[#FAFAFA] p-5 border border-[#EEF0EF]">
                <div>
                  <label className="block text-xs font-bold text-[#6F7476] uppercase tracking-wider mb-2">Select Provider</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['gemini', 'openai', 'anthropic', 'deepseek'] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => {
                          setAiProvider(prov);
                          setAiModelName(
                            prov === 'gemini'
                              ? 'gemini-3.5-flash'
                              : prov === 'openai'
                              ? 'gpt-4o-mini'
                              : prov === 'anthropic'
                              ? 'claude-3-haiku-20240307'
                              : 'deepseek-chat'
                          );
                        }}
                        className={`rounded-xl border py-2 text-center text-[10px] sm:text-xs font-bold transition-all ${
                          aiProvider === prov
                            ? 'border-[#00DC7D] bg-white text-[#00DC7D] shadow-sm font-extrabold'
                            : 'border-[#E4E7E6] bg-white text-[#6F7476] hover:bg-[#F2F2F3]'
                        }`}
                      >
                        {prov === 'gemini' ? 'Gemini' : prov === 'openai' ? 'OpenAI' : prov === 'anthropic' ? 'Anthropic' : 'DeepSeek'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6F7476] uppercase tracking-wider mb-1.5">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={`Enter your ${aiProvider} API key`}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      className="w-full rounded-xl border border-[#CCD0CF] bg-white pl-4 pr-10 py-3 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A7A8] hover:text-[#6F7476]"
                    >
                      <FontAwesomeIcon icon={showApiKey ? faEyeSlash : faEye} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6F7476] uppercase tracking-wider mb-1.5">Model Name (Optional)</label>
                  <input
                    type="text"
                    placeholder={
                      aiProvider === 'gemini'
                        ? 'gemini-3.5-flash'
                        : aiProvider === 'openai'
                        ? 'gpt-4o-mini'
                        : aiProvider === 'anthropic'
                        ? 'claude-3-haiku-20240307'
                        : 'deepseek-chat'
                    }
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    className="w-full rounded-xl border border-[#CCD0CF] bg-white px-4 py-3 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#A3A7A8] mt-1.5">
                    Leave blank to automatically use standard lightweight models.
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveAIConfig}
              disabled={saveStatus === 'saving'}
              className="w-full rounded-xl bg-[#00DC7D] py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#00B866] disabled:bg-[#CCD0CF]"
            >
              {saveStatus === 'saving' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Config...
                </span>
              ) : saveStatus === 'saved' ? (
                'Settings Saved! ✓'
              ) : (
                'Save AI Configuration'
              )}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Modules</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faTag} className="h-5 w-5 text-[#5D8AFF]" />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Auto-tagging</p>
                  <p className="text-xs text-[#A3A7A8]">automatically tag #hashtags you write</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ autoTagging: !settings.autoTagging })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.autoTagging ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.autoTagging ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faAt} className="h-5 w-5 text-[#E97C9B]" />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Auto-mentioning</p>
                  <p className="text-xs text-[#A3A7A8]">automatically mention @people you write</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ autoMentioning: !settings.autoMentioning })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.autoMentioning ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.autoMentioning ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPen} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Daily Goal & Stats</h2>
          </div>
          <div className="space-y-3">
            {/* Daily Word Goal Input */}
            <div className="rounded-lg border border-[#EEF0EF] bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF6D9] text-[#FFCC33]">
                  <FontAwesomeIcon icon={faTrophy} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Daily Word Target</p>
                  <p className="text-xs text-[#A3A7A8]">set your daily word milestone</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={settings.dailyWordGoal ?? 50}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 5) {
                      updateUserSettings({ dailyWordGoal: val });
                    }
                  }}
                  className="w-16 rounded-lg bg-[#F2F2F3] border border-[#E4E7E6] px-2 py-1.5 text-center text-sm font-bold text-[#2F3331] focus:ring-2 focus:ring-[#00DC7D] focus:outline-none"
                />
                <span className="text-xs font-semibold text-[#6F7476]">words</span>
              </div>
            </div>

            {/* Show/Hide Streak Widget */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF4E6] text-[#FF9933]">
                  <FontAwesomeIcon icon={faFire} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Show Streak Badge</p>
                  <p className="text-xs text-[#A3A7A8]">show daily streak flame on Write page</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ showStreakWidget: settings.showStreakWidget !== false })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.showStreakWidget !== false ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.showStreakWidget !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Show/Hide Word Goal Battery Widget */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F0FF] text-[#5D8AFF]">
                  <FontAwesomeIcon icon={faBatteryFull} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Show Battery Word Goal</p>
                  <p className="text-xs text-[#A3A7A8]">show portrait battery widget on Write page</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ showWordGoalWidget: settings.showWordGoalWidget !== false })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.showWordGoalWidget !== false ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.showWordGoalWidget !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Quick Guide</h2>
          </div>
          <div className="space-y-5 text-sm leading-6 text-[#6F7476]">
            <p><code className="rounded bg-[#F2F2F3] px-2 py-1 text-[#5D8AFF]">#tag</code> creates a tag, and <code className="rounded bg-[#F2F2F3] px-2 py-1 text-[#E97C9B]">@name</code> mentions a person.</p>
            <p>Use wisdom categories for thoughts, quotes, facts, excerpts, and lessons so Collections can filter them cleanly.</p>
            <p>Use the speed dial in Write to add wisdom, notes, ideas, images, and location without leaving the journal.</p>
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FF453A] py-3 font-semibold text-[#FF453A] transition-colors hover:bg-[#FF453A]/5"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-4 w-4" />
          sign out
        </button>
      </div>

      <ConfirmModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={executeSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out? Your data is safely stored in the cloud."
        confirmText="Sign Out"
        isDestructive={false}
      />
    </div>
  );
}
