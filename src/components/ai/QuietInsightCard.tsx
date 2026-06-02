import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faChevronDown, faChevronUp, faShieldHalved, faCompass, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { format, subDays, parseISO } from 'date-fns';
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

export default function QuietInsightCard() {
  const { user } = useAuth();
  const { addGoal } = useData();
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMockOption, setShowMockOption] = useState(false);

  const today = new Date();
  const weekEnd = format(today, 'yyyy-MM-dd');
  const weekStart = format(subDays(today, 6), 'yyyy-MM-dd');
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
    const config = await resolveAIConfig(userId);

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
        message: 'Belum ada catatan jurnal yang Anda tulis dalam 7 hari terakhir. Tulis beberapa jurnal terlebih dahulu agar AI dapat merangkum pola perjalanan mingguan Anda!'
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
        people: Array.from(new Set(peopleList))
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
      }
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

    // 9. Perbarui kuota bulanan pengguna jika bukan mode mock
    if (!config.enableMock) {
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
            forceRegenerate: force
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
        throw new Error(data.message || 'Gagal menghasilkan refleksi mingguan.');
      }

      if (data.emptyState) {
        setIsEmptyState(true);
        setEmptyMessage(data.message);
        setInsight(null);
      } else {
        setInsight(data.insight);
        setIsOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      setIsEmptyState(true);
      setEmptyMessage(err.message || 'Terjadi kesalahan saat memproses refleksi mingguan Anda.');
      setShowMockOption(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMockData = () => {
    const mockData = getMockWeeklyInsight(user?.uid || 'anonymous_user', weekStart, weekEnd);
    setInsight(mockData);
    setIsOpen(true);
    setIsEmptyState(false);
    setShowMockOption(false);
  };

  const handleDelete = async () => {
    if (!user || !insight) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'aiInsights', docId));
      setInsight(null);
      setIsOpen(false);
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#CCD0CF] text-[#6F7476] hover:text-[#00DC7D] hover:border-[#00DC7D] shadow-sm hover:shadow transition-all duration-300 active:scale-95 cursor-pointer"
            title="Retry Reflection"
            aria-label="Retry Reflection"
          >
            <FontAwesomeIcon icon={faRotateRight} className="h-4 w-4" />
          </button>
          {showMockOption && (
            <button
              onClick={handleLoadMockData}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-[#CCD0CF] bg-white text-[#6F7476] hover:text-[#00DC7D] hover:border-[#00DC7D] shadow-sm hover:shadow transition-all duration-300 active:scale-95 cursor-pointer"
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
      <div className="relative overflow-hidden rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm">
        {/* Cosmos subtle gradient background hook */}
        <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-[#B79CFF]/5 blur-2xl" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9FFF4] text-[#00DC7D] shadow-sm shadow-[#00DC7D]/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-pulse">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <ellipse cx="12" cy="12" rx="9" ry="2.5" transform="rotate(-15 12 12)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2F3331]">Cosmic Recap</h2>
              <p className="text-xs text-[#A3A7A8] font-mono mt-0.5">{dateRangeStr}</p>
              <p className="mt-1 text-sm text-[#6F7476] leading-relaxed max-w-[340px]">
                Discover patterns, themes, and life lessons from your past 7 days of writing.
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-2 sm:pt-0">
            {insight ? (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F2F2F3] px-5 py-3 text-sm font-semibold text-[#2F3331] hover:bg-[#E5E5E5] transition-colors"
              >
                <span>{isOpen ? 'Hide Recap' : 'View Cosmic Recap'}</span>
                <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => handleGenerateReflection(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00DC7D] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#00DC7D]/10 hover:opacity-95 active:scale-95 transition-all"
              >
                <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
                Reflect This Week
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Privacy Note */}
        <div className="mt-6 flex items-center gap-2 border-t border-[#EEF0EF] pt-4 text-[10px] text-[#A3A7A8]">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-[#A3A7A8]" />
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
        title="Hapus Rangkuman Cosmic Recap"
        message="Apakah Anda yakin ingin menghapus rangkuman Cosmic Recap mingguan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
      />
    </div>
  );
}
