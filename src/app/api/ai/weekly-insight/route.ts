import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { WEEKLY_REFLECTION_PROMPT } from '@/lib/ai/prompts';
import { resolveAIConfig } from '@/lib/ai/providerResolver';
import { AIInsight } from '@/types/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, weekStart, weekEnd, forceRegenerate, aiConfig, entries, activeGoals } = body;

    if (!userId || !weekStart || !weekEnd) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: userId, weekStart, weekEnd.' },
        { status: 400 }
      );
    }

    const docId = `${weekStart}_${weekEnd}`;
    const insightDocRef = doc(db, 'users', userId, 'aiInsights', docId);

    // 1. Cek konfigurasi dan status mock
    const config = await resolveAIConfig(userId, aiConfig);

    // 2. Jika tidak dipaksa untuk regenerasi, cek jika insight minggu ini sudah ada (wrap in try-catch)
    if (!forceRegenerate) {
      try {
        const existingSnap = await getDoc(insightDocRef);
        if (existingSnap.exists()) {
          console.log(`[Weekly Insight API] Returned existing insight for ${docId}`);
          return NextResponse.json({ success: true, insight: existingSnap.data() as AIInsight });
        }
      } catch (checkErr) {
        console.warn(`[Weekly Insight API] Failed to check existing insight in Firestore:`, checkErr);
      }
    }

    // 3. Batasan Kuota Bulanan (hanya diperiksa jika bukan mode mock/simulasi dan bukan BYOK)
    const now = new Date();
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageDocId = `ai_${yyyyMM}`;
    const usageDocRef = doc(db, 'users', userId, 'usage', usageDocId);

    const isBYOK = config.mode === 'bring_your_own_key';
    if (!isBYOK && !config.enableMock) {
      try {
        const usageSnap = await getDoc(usageDocRef);
        if (usageSnap.exists()) {
          const usageData = usageSnap.data();
          const monthlyLimit = Number(process.env.AI_WEEKLY_INSIGHT_MONTHLY_LIMIT) || 3;
          if ((usageData.weeklyInsightCount || 0) >= monthlyLimit) {
            return NextResponse.json(
              { 
                success: false, 
                message: `You have reached your weekly AI reflection limit for this month (${monthlyLimit}x per month). Please try again next month or configure your own API Key.` 
              },
              { status: 429 }
            );
          }
        }
      } catch (quotaCheckErr) {
        console.warn(`[Weekly Insight API] Failed to check usage quota from Firestore:`, quotaCheckErr);
      }
    }

    // 4. Mengambil entri harian pengguna dalam rentang tanggal
    let compactEntries = [];
    if (entries && Array.isArray(entries)) {
      console.log(`[Weekly Insight API] Using entries provided in request body (${entries.length} entries)`);
      // If the entries are already compact entries (bullets is array of string)
      const isAlreadyMapped = entries.length > 0 && Array.isArray(entries[0]?.bullets) && typeof entries[0]?.bullets[0] === 'string';
      if (isAlreadyMapped) {
        compactEntries = entries;
      } else {
        const validEntries = entries.filter(
          (e: any) => (e.bullets && e.bullets.length > 0) || (e.dream && e.dream.trim().length > 0)
        );
        compactEntries = validEntries.map((e: any) => {
          const bulletsList = (e.bullets || []).map((b: any) => typeof b === 'string' ? b : b.text);
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
            weather: e.weather || null,
            condition: e.condition || null,
            dailyInsight: e.dailyInsight || null
          };
        });
      }
    } else {
      console.log(`[Weekly Insight API] Fetching entries from Firestore for user ${userId}`);
      const entriesRef = collection(db, 'users', userId, 'entries');
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
      compactEntries = validEntries.map(e => {
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
          weather: e.weather || null,
          condition: e.condition || null,
          dailyInsight: e.dailyInsight || null
        };
      });
    }

    // 5. Jika tidak ada entri tulisan sama sekali, kembalikan status kosong
    if (compactEntries.length === 0) {
      return NextResponse.json({
        success: false,
        emptyState: true,
        message: 'You have not written any journal entries in the past 7 days. Write some journal entries first so that the AI can summarize your weekly journey!'
      });
    }

    let activeGoalsData = [];
    if (activeGoals && Array.isArray(activeGoals)) {
      activeGoalsData = activeGoals;
    } else {
      console.log(`[Weekly Insight API] Fetching goals from Firestore for user ${userId}`);
      const goalsRef = collection(db, 'users', userId, 'goals');
      const goalsSnap = await getDocs(goalsRef);
      activeGoalsData = goalsSnap.docs
        .map(d => d.data())
        .filter(g => !g.isCompleted)
        .map(g => ({ id: g.id, title: g.content }));
    }

    const aiPayload = {
      dateRange: { start: weekStart, end: weekEnd },
      entryCount: compactEntries.length,
      entries: compactEntries,
      activeGoals: activeGoalsData
    };

    // 7. Panggil Client AI Wrapper
    const aiResult = await generateStructuredAI({
      userId,
      systemPrompt: WEEKLY_REFLECTION_PROMPT,
      userPayload: aiPayload,
      feature: 'weekly-insight',
      fallbackParams: {
        weekStart,
        weekEnd
      },
      aiConfig: config
    });

    // 8. Siapkan dokumen final yang sepenuhnya kompatibel dengan tipe AIInsight baru
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
      summary: aiResult.summary || 'Weekly reflection complete.',
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
      sourceEntryIds: compactEntries.map(e => e.id),
      aiMeta: {
        model: config.model,
        promptVersion: '1.0',
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 9. Simpan hasil ke Firestore (wrap in try-catch)
    try {
      await setDoc(insightDocRef, finalInsight);
    } catch (saveErr) {
      console.warn(`[Weekly Insight API] Failed to save weekly insight to Firestore on server (likely permission error). Continuing.`, saveErr);
    }

    // 10. Perbarui kuota bulanan pengguna jika bukan mode mock dan bukan BYOK
    if (!isBYOK && !config.enableMock) {
      try {
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
      } catch (quotaErr) {
        console.warn(`[Weekly Insight API] Failed to update weekly insight usage quota on server.`, quotaErr);
      }
    }

    console.log(`[Weekly Insight API] Successfully generated, tracked usage, and stored new insight: ${docId}`);
    return NextResponse.json({ success: true, insight: finalInsight });

  } catch (err: any) {
    console.error('[Weekly Insight API] Critical error generating weekly reflection:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to process AI weekly reflection.' },
      { status: 500 }
    );
  }
}
