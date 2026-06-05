import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { DAILY_INSIGHT_PROMPT } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, date, bullets, dream, weather, condition } = body;

    if (!userId || !date) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: userId, date.' },
        { status: 400 }
      );
    }

    // Prepare text content for context
    const bulletsList = Array.isArray(bullets) ? bullets.map((b: any) => b.text || b) : [];
    
    // Construct user payload containing journal logs and physical metrics
    const aiPayload = {
      date,
      bullets: bulletsList,
      dream: dream || '',
      weather: weather || null,
      condition: condition || null
    };

    // Call Client AI Wrapper
    const aiResult = await generateStructuredAI({
      userId,
      systemPrompt: DAILY_INSIGHT_PROMPT,
      userPayload: aiPayload,
      feature: 'daily-insight'
    });

    const dailyInsight = {
      text: aiResult.insightText || 'Analisis harian selesai.',
      moodScore: typeof aiResult.moodScore === 'number' ? aiResult.moodScore : 7,
      sentiment: aiResult.sentiment || 'neutral',
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      dailyInsight
    });

  } catch (err: any) {
    console.error('[Daily Insight API] Error generating daily insight:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal memproses analisis harian AI.' },
      { status: 500 }
    );
  }
}
