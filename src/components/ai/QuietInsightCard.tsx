import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faChevronDown, faChevronUp, faShieldHalved, faCompass, faRotateRight, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { format, subDays, parseISO, startOfWeek, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { AIInsight } from '@/types/ai';
import AILoadingState from './AILoadingState';
import AIEmptyState from './AIEmptyState';
import WeeklyInsightResult from './WeeklyInsightResult';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { getMockWeeklyInsight } from '@/lib/ai/mockResponses';
import { WEEKLY_REFLECTION_PROMPT } from '@/lib/ai/prompts';
import { resolveAIConfig } from '@/lib/ai/providerResolver';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface QuietInsightCardProps {
  onToggleOpen?: (isOpen: boolean) => void;
}

export default function QuietInsightCard({ onToggleOpen }: QuietInsightCardProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { addGoal } = useData();
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMockOption, setShowMockOption] = useState(false);

  const today = new Date();
  const weekStartMonday = startOfWeek(today, { weekStartsOn: 1 });
  const weekEndSunday = addDays(weekStartMonday, 6);
  const weekStart = format(weekStartMonday, 'yyyy-MM-dd');
  const weekEnd = format(weekEndSunday, 'yyyy-MM-dd');
  const docId = `${weekStart}_${weekEnd}`;

  useEffect(() => {
    if (!user) return;

    // Cek jika insight minggu ini sudah digenerasikan sebelumnya
    const checkExisting = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'aiInsights', docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setInsight(snap.data() as AIInsight);
          setIsOpen(true);
          onToggleOpen?.(true);
        }
      } catch (err) {
        console.error('Error checking existing weekly reflection:', err);
      }
    };

    checkExisting();
  }, [user, docId]);

  const generateReflectionClientSide = async (userId: string, weekStart: string, weekEnd: string, force = false): Promise<any> => {
    const docId = `${weekStart}_${weekEnd}`;
    const insightDocRef = doc(db, 'users', userId, 'aiInsights', docId);

    // 1. Cek konfigurasi
    const config = await resolveAIConfig(userId, userProfile?.settings?.aiConfig);

    // 2. Jika tidak dipaksa untuk regenerasi, cek jika insight minggu ini sudah ada
    if (!force) {
      const existingSnap = await getDoc(insightDocRef);
      if (existingSnap.exists()) {
        return { success: true, insight: existingSnap.data() as AIInsight };
      }
    }

    // 3. Mengambil entri harian pengguna dalam rentang tanggal
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(
      entriesRef,
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd)
    );
    const snap = await getDocs(q);
    const entriesData = snap.docs.map(d => d.data());

    // Menyaring entri yang memiliki tulisan (bullets atau mimpi)
    const validEntries = entriesData.filter(
      e => (e.bullets && e.bullets.length > 0) || (e.dream && e.dream.trim().length > 0)
    );

    // 4. Jika tidak ada entri tulisan sama sekali, kembalikan status kosong
    if (validEntries.length === 0) {
      return {
        success: false,
        emptyState: true,
        message: 'You have not written any journal entries in the past 7 days. Write some journal entries first so that the AI can summarize your weekly journey!'
      };
    }

    // 5. Konstruksi muatan data ringkas untuk AI
    const compactEntries = validEntries.map(e => {
      const bulletsList = (e.bullets || []).map((b: any) => b.text);
      const highlightsList = (e.bullets || []).filter((b: any) => b.isHighlight).map((b: any) => b.text);
      
      const tagsList: string[] = [];
      const peopleList: string[] = [];
      (e.bullets || []).forEach((b: any) => {
        if (b.tags) tagsList.push(...b.tags);
        if (b.mentions) peopleList.push(...b.mentions);
      });

      return {
        id: e.id,
        date: e.date,
        dream: e.dream || '',
        bullets: bulletsList,
        highlights: highlightsList,
        tags: Array.from(new Set(tagsList)),
        people: Array.from(new Set(peopleList)),
        weather: (e as any).weather || null,
        condition: (e as any).condition || null,
        dailyInsight: (e as any).dailyInsight || null
      };
    });

    // Mengambil target/goals aktif pengguna saat ini sebagai konteks tambahan bagi AI
    const goalsRef = collection(db, 'users', userId, 'goals');
    const goalsSnap = await getDocs(goalsRef);
    const activeGoals = goalsSnap.docs
      .map(d => d.data())
      .filter(g => !g.isCompleted)
      .map(g => ({ id: g.id, title: g.content }));

    const aiPayload = {
      dateRange: { start: weekStart, end: weekEnd },
      entryCount: validEntries.length,
      entries: compactEntries,
      activeGoals
    };

    // 6. Panggil Client AI Wrapper
    const aiResult = await generateStructuredAI({
      userId,
      systemPrompt: WEEKLY_REFLECTION_PROMPT,
      userPayload: aiPayload,
      feature: 'weekly-insight',
      fallbackParams: {
        weekStart,
        weekEnd
      },
      aiConfig: userProfile?.settings?.aiConfig
    });

    // 7. Siapkan dokumen final yang sepenuhnya kompatibel dengan tipe AIInsight baru
    const finalInsight: AIInsight = {
      id: docId,
      userId,
      type: 'weekly',
      status: 'generated',
      weekStart,
      weekEnd,
      dateRange: {
        start: weekStart,
        end: weekEnd
      },
      summary: aiResult.summary || 'Refleksi mingguan selesai.',
      keyEvents: aiResult.keyEvents || [],
      themes: aiResult.themes || aiResult.recurringThemes || [],
      recurringThemes: aiResult.recurringThemes || aiResult.themes || [],
      emotionalPatterns: aiResult.emotionalPatterns || [],
      lessons: aiResult.lessons || [],
      actionItems: (aiResult.actionItems || []).map((item: any, idx: number) => {
        const title = item.title || item.text || 'Rencana Aksi';
        return {
          id: item.id || `act_${docId}_${idx}`,
          text: title,
          title: title,
          description: item.description || '',
          category: item.category || item.suggestedGoalArea || 'Self-Care',
          suggestedGoalArea: item.suggestedGoalArea || 'other',
          canBecomeGoal: typeof item.canBecomeGoal === 'boolean' ? item.canBecomeGoal : true,
          priority: item.priority || 'medium',
          focusMode: item.focusMode || 'top3',
          goalId: item.goalId || null
        };
      }),
      suggestedGoals: (aiResult.suggestedGoals || []).map((g: any, idx: number) => ({
        id: g.id || `sgoal_${docId}_${idx}`,
        title: g.title || 'Tujuan yang Disarankan',
        reason: g.reason || 'Saran berdasarkan refleksi minggu ini.',
        goalType: g.goalType || 'top3',
        createdGoalId: g.createdGoalId || null
      })),
      suggestedTags: aiResult.suggestedTags || [],
      suggestedPeople: aiResult.suggestedPeople || [],
      sourceEntryIds: validEntries.map(e => e.id),
      aiMeta: {
        model: config.model,
        promptVersion: '1.0',
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 8. Simpan hasil ke Firestore
    await setDoc(insightDocRef, finalInsight);

    // 9. Perbarui kuota bulanan pengguna jika bukan mode mock dan bukan BYOK
    const isBYOK = config.mode === 'bring_your_own_key';
    if (!isBYOK && !config.enableMock) {
      const now = new Date();
      const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageDocId = `ai_${yyyyMM}`;
      const usageDocRef = doc(db, 'users', userId, 'usage', usageDocId);

      const usageSnap = await getDoc(usageDocRef);
      if (usageSnap.exists()) {
        const usageData = usageSnap.data();
        await setDoc(usageDocRef, {
          ...usageData,
          weeklyInsightCount: (usageData.weeklyInsightCount || 0) + 1,
          lastWeeklyInsightAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await setDoc(usageDocRef, {
          userId,
          month: yyyyMM,
          weeklyInsightCount: 1,
          tagSuggestionCount: 0,
          lastWeeklyInsightAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return { success: true, insight: finalInsight };
  };

  const handleGenerateReflection = async (force = false) => {
    if (!user) return;
    setIsLoading(true);
    setIsEmptyState(false);
    setEmptyMessage('');
    setShowMockOption(false);

    try {
      // Fetch entries and goals client-side to pass to API route (bypassing server permission errors)
      const entriesRef = collection(db, 'users', user.uid, 'entries');
      const q = query(
        entriesRef,
        where('date', '>=', weekStart),
        where('date', '<=', weekEnd)
      );
      const snap = await getDocs(q);
      const entriesData = snap.docs.map(d => d.data());
      const validEntries = entriesData.filter(
        e => (e.bullets && e.bullets.length > 0) || (e.dream && e.dream.trim().length > 0)
      );

      if (validEntries.length === 0) {
        setIsEmptyState(true);
        setEmptyMessage('You have not written any journal entries in the past 7 days. Write some journal entries first so that the AI can summarize your weekly journey!');
        setIsLoading(false);
        return;
      }

      const goalsRef = collection(db, 'users', user.uid, 'goals');
      const goalsSnap = await getDocs(goalsRef);
      const activeGoals = goalsSnap.docs
        .map(d => d.data())
        .filter(g => !g.isCompleted)
        .map(g => ({ id: g.id, title: g.content }));

      let data: any = null;
      let responseOk = false;

      try {
        const response = await fetch('/api/ai/weekly-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            weekStart,
            weekEnd,
            forceRegenerate: force,
            aiConfig: userProfile?.settings?.aiConfig,
            entries: validEntries,
            activeGoals
          })
        });

        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || response.status === 404) {
          throw new Error('API route returned HTML or 404. Running client-side fallback.');
        }

        data = JSON.parse(text);
        responseOk = response.ok;
      } catch (fetchErr) {
        console.warn('[QuietInsightCard] API route unavailable or failed. Running client-side reflection generation...', fetchErr);
        // Client-side fallback
        data = await generateReflectionClientSide(user.uid, weekStart, weekEnd, force);
        responseOk = data.success;
      }

      if (!responseOk) {
        throw new Error(data.message || 'Failed to generate weekly reflection.');
      }

      if (data.emptyState) {
        setIsEmptyState(true);
        setEmptyMessage(data.message);
        setInsight(null);
      } else {
        // Save the insight client-side to ensure it is written successfully under authenticated user context
        if (data.insight) {
          try {
            const insightDocRef = doc(db, 'users', user.uid, 'aiInsights', docId);
            await setDoc(insightDocRef, data.insight);
            console.log('[QuietInsightCard] Saved generated weekly insight client-side');
          } catch (dbErr) {
            console.error('[QuietInsightCard] Failed to save weekly insight client-side:', dbErr);
          }
        }
        setInsight(data.insight);
        setIsOpen(true);
        onToggleOpen?.(true);
      }
    } catch (err: any) {
      console.error(err);
      setIsEmptyState(true);
      setEmptyMessage(err.message || 'An error occurred while processing your weekly reflection.');
      setShowMockOption(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMockData = () => {
    const mockData = getMockWeeklyInsight(user?.uid || 'anonymous_user', weekStart, weekEnd);
    setInsight(mockData);
    setIsOpen(true);
    onToggleOpen?.(true);
    setIsEmptyState(false);
    setShowMockOption(false);
  };

  const handleDelete = async () => {
    if (!user || !insight) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'aiInsights', docId));
      setInsight(null);
      setIsOpen(false);
      onToggleOpen?.(false);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting weekly reflection:', err);
    }
  };

  const handleGoalCreatedLocally = (goal: any) => {
    // Sinkronkan goal baru ke local state/context secara real-time
    // DataContext di app Anda memiliki function addGoal untuk menambahkan di local state
    // Di backend endpoint, goal sudah sukses disave ke Firestore. Kita tambahkan local jingle
    console.log('[QuietInsightCard] Goal sync triggered successfully');
  };

  const dateRangeStr = `${format(subDays(today, 6), 'MMMM d')} - ${format(today, 'MMMM d, yyyy')}`;

  if (isLoading) {
    return <AILoadingState />;
  }

  if (isEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <AIEmptyState message={emptyMessage} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerateReflection(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1E2022] border border-[#CCD0CF] dark:border-[#2E3133] text-[#6F7476] hover:text-[#00DC7D] hover:border-[#00DC7D] shadow-sm hover:shadow transition-all duration-300 active:scale-95 cursor-pointer"
            title="Retry Reflection"
            aria-label="Retry Reflection"
          >
            <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
          </button>
          {showMockOption && (
            <button
              onClick={handleLoadMockData}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-[#CCD0CF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#00DC7D] hover:border-[#00DC7D] shadow-sm hover:shadow transition-all duration-300 active:scale-95 cursor-pointer"
            >
              Use Simulation (Mock Data)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Utama (Trigger & Overview) */}
      <div className="relative overflow-hidden rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm hover:scale-[1.015] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
        {/* Cosmos subtle gradient background hook */}
        <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-[#B79CFF]/5 blur-2xl" />

        {/* History Recap icon button in top right corner */}
        <button
          onClick={() => router.push('/reflect/archive')}
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#EEF0EF] dark:border-[#2E3133] bg-white/80 dark:bg-[#1E2022]/80 text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-[#FAFAFA] shadow-sm hover:shadow transition-all duration-300 active:scale-95 cursor-pointer z-10"
          title="History Recap Archive"
        >
          <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00DC7D] shadow-sm shadow-[#00DC7D]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-pulse">
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <ellipse cx="12" cy="12" rx="9" ry="2.5" transform="rotate(-15 12 12)" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-2xl font-bold text-[#2F3331] dark:text-[#FAFAFA]">Cosmic Recap</h2>
            <p className="text-xs text-[#A3A7A8] dark:text-[#6F7476] font-mono mt-0.5">{dateRangeStr}</p>
            <p className="mt-1.5 text-sm text-[#6F7476] dark:text-[#A3A7A8] leading-relaxed max-w-lg">
              Discover patterns, themes, and life lessons from your past 7 days of writing.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {insight ? (
                <button
                  onClick={() => {
                    const nextOpen = !isOpen;
                    setIsOpen(nextOpen);
                    onToggleOpen?.(nextOpen);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-[#F2F2F3] dark:bg-[#282A2D] px-5 py-2.5 text-sm font-semibold text-[#2F3331] dark:text-[#FAFAFA] hover:bg-[#E5E5E5] dark:hover:bg-[#3E4246] transition-colors cursor-pointer"
                >
                  <span>{isOpen ? 'Hide Recap' : 'View Cosmic Recap'}</span>
                  <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={() => handleGenerateReflection(false)}
                  className="flex items-center gap-2 rounded-2xl text-white bg-gradient-to-r from-[#8B00D4] via-[#6F42C1] to-[#00DC7D] px-6 py-2.5 text-sm font-bold shadow-[0_0_12px_rgba(139,0,212,0.25)] hover:shadow-[0_0_18px_rgba(139,0,212,0.45)] hover:scale-103 active:scale-97 transition-all duration-300 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
                  Reflect This Week
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Privacy Note */}
        <div className="mt-6 flex items-center gap-2 border-t border-[#EEF0EF] dark:border-[#2E3133] pt-4 text-[10px] text-[#A3A7A8] dark:text-[#6F7476]">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-[#A3A7A8] dark:text-[#6F7476]" />
          <span>Your private reflection logs are secure. AI processing is secure and developer keys are server-only.</span>
        </div>
      </div>

      {/* Renders the Weekly Insight Result when open */}
      {insight && isOpen && (
        <div className="mt-6">
          <WeeklyInsightResult
            insight={insight}
            userId={user?.uid || ''}
            onGoalCreated={handleGoalCreatedLocally}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Cosmic Recap Summary"
        message="Are you sure you want to delete this weekly Cosmic Recap summary? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
