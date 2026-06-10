import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { TAG_SUGGESTION_PROMPT } from '@/lib/ai/prompts';
import { resolveAIConfig } from '@/lib/ai/providerResolver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, userId, aiConfig } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Content parameter is required and cannot be empty.' },
        { status: 400 }
      );
    }

    const targetUserId = userId || 'anonymous_user';

    console.log(`[Suggest Tags API] Extracting tags for user ${targetUserId}`);

    // 1. Cek konfigurasi dan status mock
    const config = await resolveAIConfig(targetUserId, aiConfig);

    // 2. Batasan Kuota Bulanan (hanya diperiksa jika bukan mode mock/simulasi dan bukan BYOK)
    const now = new Date();
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageDocId = `ai_${yyyyMM}`;
    const usageDocRef = doc(db, 'users', targetUserId, 'usage', usageDocId);

    const isBYOK = config.mode === 'bring_your_own_key';
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      const usageSnap = await getDoc(usageDocRef);
      if (usageSnap.exists()) {
        const usageData = usageSnap.data();
        const monthlyLimit = Number(process.env.AI_TAG_SUGGESTION_MONTHLY_LIMIT) || 20;
        if ((usageData.tagSuggestionCount || 0) >= monthlyLimit) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Anda telah mencapai batas kuota rekomendasi tag AI untuk bulan ini (${monthlyLimit}x per bulan).` 
            },
            { status: 429 }
          );
        }
      }
    }

    // 3. Panggil Client AI Wrapper
    const result = await generateStructuredAI({
      userId: targetUserId,
      systemPrompt: TAG_SUGGESTION_PROMPT,
      userPayload: { entryContent: content },
      feature: 'suggest-tags',
      fallbackParams: {
        content
      },
      aiConfig: config
    });

    // 4. Perbarui kuota bulanan pengguna jika bukan mode mock, bukan anonymous, dan bukan BYOK
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      const usageSnap = await getDoc(usageDocRef);
      if (usageSnap.exists()) {
        const usageData = usageSnap.data();
        await setDoc(usageDocRef, {
          ...usageData,
          tagSuggestionCount: (usageData.tagSuggestionCount || 0) + 1,
          lastTagSuggestionAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await setDoc(usageDocRef, {
          userId: targetUserId,
          month: yyyyMM,
          weeklyInsightCount: 0,
          tagSuggestionCount: 1,
          lastTagSuggestionAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      suggestedTags: result.suggestedTags || [],
      suggestedPeople: result.suggestedPeople || []
    });

  } catch (err: any) {
    console.error('[Suggest Tags API] Error extracting tags:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal menghasilkan saran tag.' },
      { status: 500 }
    );
  }
}
