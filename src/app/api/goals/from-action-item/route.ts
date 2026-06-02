import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, insightId, actionItemId, title, priority, focusMode, category } = body;

    if (!userId || !insightId || !actionItemId || !title) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: userId, insightId, actionItemId, title.' },
        { status: 400 }
      );
    }

    console.log(`[Create Goal API] Converting AI action item ${actionItemId} into Goal for user ${userId}`);

    // 1. Ambil seluruh goal aktif untuk menghitung prioritas maksimal (supaya goal baru ditaruh di bawah)
    const goalsRef = collection(db, 'users', userId, 'goals');
    const goalsSnap = await getDocs(goalsRef);
    const maxPriority = goalsSnap.docs.reduce((max, d) => {
      const g = d.data();
      return Math.max(max, g.priority || 0);
    }, 0);

    // 2. Buat dokumen Goal baru di Firestore
    const goalId = uuidv4();
    const newGoalRef = doc(db, 'users', userId, 'goals', goalId);

    const newGoal = {
      id: goalId,
      content: title,
      priority: maxPriority + 1,
      isCompleted: false,
      progress: 0,
      category: category || 'Self-Care',
      focusMode: focusMode || 'top3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // AI Metadata Source
      source: 'ai_weekly_reflection',
      sourceInsightId: insightId,
      sourceActionItemId: actionItemId
    };

    await setDoc(newGoalRef, newGoal);

    // 3. Perbarui dokumen AI Reflection terkait untuk menautkan goalId pada action item yang sesuai
    const insightDocRef = doc(db, 'users', userId, 'aiInsights', insightId);
    const insightSnap = await getDoc(insightDocRef);

    if (insightSnap.exists()) {
      const insightData = insightSnap.data();
      const updatedActionItems = (insightData.actionItems || []).map((item: any) => {
        if (item.id === actionItemId) {
          return { ...item, goalId };
        }
        return item;
      });

      await updateDoc(insightDocRef, {
        actionItems: updatedActionItems
      });
      console.log(`[Create Goal API] Successfully linked action item ${actionItemId} to goal ${goalId}`);
    } else {
      console.warn(`[Create Goal API] Insight document ${insightId} not found. Skipped linking.`);
    }

    return NextResponse.json({
      success: true,
      goal: newGoal
    });

  } catch (err: any) {
    console.error('[Create Goal API] Error creating goal from AI action item:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal mengubah rencana aksi menjadi tujuan.' },
      { status: 500 }
    );
  }
}
