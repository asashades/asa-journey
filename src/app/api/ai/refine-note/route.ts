import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolveAIConfig } from '@/lib/ai/providerResolver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { noteContent, action, userId, aiConfig } = body;

    if (!noteContent || !noteContent.trim()) {
      return NextResponse.json(
        { success: false, message: 'Note content is required.' },
        { status: 400 }
      );
    }

    if (!action || !['beautify', 'summarize', 'wisdom'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be beautify, summarize, or wisdom.' },
        { status: 400 }
      );
    }

    const targetUserId = userId || 'anonymous_user';
    console.log(`[Refine Note API] Action "${action}" triggered for user ${targetUserId}`);

    // 1. Resolve AI Config
    const config = await resolveAIConfig(targetUserId, aiConfig);

    // 2. Check Monthly Quota (only for non-mock, non-anonymous, non-BYOK users)
    const now = new Date();
    const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageDocId = `ai_${yyyyMM}`;
    const usageDocRef = doc(db, 'users', targetUserId, 'usage', usageDocId);

    const isBYOK = config.mode === 'bring_your_own_key';
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      try {
        const usageSnap = await getDoc(usageDocRef);
        if (usageSnap.exists()) {
          const usageData = usageSnap.data();
          const monthlyLimit = Number(process.env.AI_NOTE_REFINE_MONTHLY_LIMIT) || 30;
          if ((usageData.noteRefineCount || 0) >= monthlyLimit) {
            return NextResponse.json(
              { 
                success: false, 
                message: `Anda telah mencapai batas kuota pemrosesan catatan AI untuk bulan ini (${monthlyLimit}x per bulan).` 
              },
              { status: 429 }
            );
          }
        }
      } catch (quotaCheckErr) {
        console.warn(`[Refine Note API] Failed to check usage quota from Firestore (likely permission error):`, quotaCheckErr);
      }
    }

    // 3. Handle Simulation / Mock Mode
    if (config.enableMock) {
      console.log(`[Refine Note API] Running in Simulation Mode (Mock) for action: ${action}`);
      let refinedText = '';
      if (action === 'beautify') {
        refinedText = `# ${noteContent.split('\n')[0]?.replace(/[#*_\-]/g, '').trim() || 'Catatan Refined'}\n\n> [!NOTE] Core Highlight\n> Catatan ini telah dirapikan struktur Markdown-nya dan diperbaiki tata bahasanya agar lebih mudah dibaca dan dipahami.\n\n${noteContent}`;
      } else if (action === 'summarize') {
        refinedText = `> [!NOTE]+ AI Summary\n> Catatan ini membahas refleksi ide pengembangan fitur AI notes dan integrasinya dengan halaman sasaran (goals).\n\n${noteContent}\n\n### Action Items\n- [ ] Menambahkan tombol AI Refine di Note Editor\n- [ ] Menghubungkan tugas checklist note dengan Goals Inbox`;
      } else {
        refinedText = `${noteContent}\n\n---\n\n### ✨ Extracted Wisdom\n\n> [!LESSON]\n> Menyederhanakan alur kerja akan meningkatkan retensi pengguna.\n> context : Workflow optimization\n\n> [!IDEA]\n> Buat widget mini checklist di dashboard untuk mempermudah akses inbox tasks.\n\n> [!FACT]\n> Rata-rata pengguna menghabiskan 3 menit per sesi journaling.\n> source : UX Research Report\n\n> [!QUOTE]\n> "The unexamined life is not worth living."\n> -- Socrates\n\n> [!THOUGHT]\n> Mungkin integrasi AI harus lebih pasif, tidak terlalu agresif mengoreksi.\n\n> [!EXCERPT]\n> Bagian tentang workflow automation sangat relevan dengan proyek saat ini.\n> -- Self-reflection\n> source : Personal Journal`;
      }

      return NextResponse.json({
        success: true,
        refinedText
      });
    }

    // 4. Formulate System Prompt based on Action
    let systemPrompt = '';
    if (action === 'beautify') {
      systemPrompt = `You are an expert notes editor. Your task is to refine the provided raw text note and format it into clean, structured, and beautiful Markdown.

Guidelines:
1. Fix spelling, grammar, and improve sentence structure, while strictly preserving the author's original meaning, details, tone, and specific data.
2. Use appropriate Markdown elements such as headers (#, ##, ###), bullet lists, numbered lists, bold text, and horizontal dividers to structure the content.
3. Identify any key quotes, lessons, highlights, or important takeaways that are ALREADY explicitly written in the note content, and wrap them strictly in standard note callouts. You MUST add a short descriptive custom title after the tag (e.g. "Key Insight", "Important", "Highlight"):
   > [!NOTE] Key Insight
   > [The quote, lesson, or important point here]
   Do NOT generate or invent new content. Only wrap text that already exists in the original note.
4. Do NOT use custom wisdom callouts like [!QUOTE], [!LESSON], [!FACT], [!THOUGHT], or [!IDEA]. Only use standard [!NOTE] callouts with a custom title for any highlights.
5. Return the result strictly as a JSON object with a single key "refinedText".`;
    } else if (action === 'summarize') {
      systemPrompt = `You are an expert executive assistant. Analyze the note and generate a brief summary along with actionable checklist tasks.

Guidelines:
 1. Generate a brief summary (1-3 sentences) at the very top of the note inside a foldable note callout box:
    > [!NOTE]+ AI Summary
    > [Summary text here]
2. Scan the text for any actionable items, tasks, or things to do. Convert them into clear checklist tasks \`- [ ] Task text\` and append them under an "Action Items" header at the bottom of the note.
3. Keep the original note's text body intact in the middle, between the summary and the action items.
4. Return the result strictly as a JSON object with a single key "refinedText".`;
    } else {
      systemPrompt = `You are a philosophy and insight extraction assistant. Deeply analyze the note to extract all wisdom, lessons, ideas, facts, quotes, thoughts, and key excerpts.

Guidelines:
1. Do NOT modify or edit the original note text.
2. Append a horizontal divider \`---\` at the bottom of the original note text, followed by a "### ✨ Extracted Wisdom" header.
3. Inside this section, use the following callout types as appropriate. Extract as many as are genuinely present in the text, and write their metadata exactly as specified:
   - **Lessons** (key takeaways or life lessons):
     > [!LESSON]
     > Lesson text here
     > context : [Brief context/domain of the lesson]
   - **Ideas** (creative ideas, proposals, or brainstorms):
     > [!IDEA]
     > Idea text here
     (Do NOT add any metadata lines like author, source, or context for Ideas)
   - **Facts** (verifiable data points, statistics, or factual statements):
     > [!FACT]
     > Fact text here
     > source : [Source where the fact comes from, or "Observation"]
   - **Quotes** (direct quotations from people, books, or other sources):
     > [!QUOTE]
     > "Quote text here"
     > -- [Person who said it]
   - **Thoughts** (personal reflections, opinions, or musings by the note author):
     > [!THOUGHT]
     > Thought text here
     (Do NOT add any metadata lines like author, source, or context for Thoughts)
   - **Excerpts** (important passages or references worth highlighting):
     > [!EXCERPT]
     > Excerpt text here
     > -- [Original author]
     > source : [Source book/document/article]
4. You must strictly follow the individual formatting rules above. Do NOT use the old inline format \`— *author: ... | source: ... | context: ...*\`. If the author or source is not clear but required, use a reasonable guess or general terms (e.g., "Observation" for source).
5. Only extract wisdom items that are genuinely present or strongly implied in the note content. Do not fabricate content.
6. Return the result strictly as a JSON object with a single key "refinedText" containing the full original note text plus the newly appended wisdom blocks.`;
    }

    // 5. Call AI Provider
    let refinedText = '';
    const payloadString = noteContent;

    if (config.provider === 'gemini') {
      const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('Gemini API Key is not configured.');
      }

      // Try preferred model, fallback to flash
      const modelsToTry = [config.model, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
      let lastError: any = null;
      let callSuccess = false;

      for (const modelName of modelsToTry) {
        if (!modelName) continue;
        try {
          console.log(`[Refine Note API] Calling Gemini model: ${modelName}`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: systemPrompt },
                      { text: `Berikut adalah teks catatan:\n\n${payloadString}` }
                    ]
                  }
                ],
                generationConfig: {
                  responseMimeType: 'application/json'
                }
              })
            }
          );

          if (!response.ok) {
            throw new Error(`Status ${response.status}: ${await response.text()}`);
          }

          const resData = await response.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            refinedText = parseAIResponse(rawText);
            callSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`[Refine Note API] Model ${modelName} failed:`, err);
          lastError = err;
        }
      }

      if (!callSuccess) {
        throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
      }
    } else if (config.provider === 'openai') {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('OpenAI API Key is not configured.');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: payloadString }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI error status ${response.status}: ${await response.text()}`);
      }

      const resData = await response.json();
      const rawText = resData.choices?.[0]?.message?.content;
      if (rawText) {
        refinedText = parseAIResponse(rawText);
      }
    } else if (config.provider === 'anthropic') {
      const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        throw new Error('Anthropic API Key is not configured.');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: payloadString }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic error status ${response.status}: ${await response.text()}`);
      }

      const resData = await response.json();
      const rawText = resData.content?.[0]?.text;
      if (rawText) {
        refinedText = parseAIResponse(rawText);
      }
    } else if (config.provider === 'deepseek') {
      const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
      if (!apiKey) {
        throw new Error('DeepSeek API Key is not configured.');
      }

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: payloadString }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek error status ${response.status}: ${await response.text()}`);
      }

      const resData = await response.json();
      const rawText = resData.choices?.[0]?.message?.content;
      if (rawText) {
        refinedText = parseAIResponse(rawText);
      }
    }

    if (!refinedText) {
      throw new Error('AI did not return any refined text.');
    }

    // 6. Update Monthly Quota
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      try {
        const usageSnap = await getDoc(usageDocRef);
        if (usageSnap.exists()) {
          const usageData = usageSnap.data();
          await setDoc(usageDocRef, {
            ...usageData,
            noteRefineCount: (usageData.noteRefineCount || 0) + 1,
            lastNoteRefineAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          await setDoc(usageDocRef, {
            userId: targetUserId,
            month: yyyyMM,
            weeklyInsightCount: 0,
            tagSuggestionCount: 0,
            noteRefineCount: 1,
            lastNoteRefineAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (quotaUpdateErr) {
        console.warn(`[Refine Note API] Failed to update usage quota in Firestore (likely permission error):`, quotaUpdateErr);
      }
    }

    return NextResponse.json({
      success: true,
      refinedText
    });

  } catch (err: any) {
    console.error('[Refine Note API] Error refining note:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal menyempurnakan catatan.' },
      { status: 500 }
    );
  }
}

function parseAIResponse(rawText: string): string {
  const cleanText = rawText.trim();
  
  // Try parsing as JSON first (handling optional markdown code blocks)
  let jsonString = cleanText;
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?/i, '').trim();
    jsonString = jsonString.replace(/```$/, '').trim();
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      if (parsed.refinedText) return parsed.refinedText;
      if (parsed.text) return parsed.text;
    }
  } catch (err) {
    console.warn('[Refine Note API] JSON parsing failed, falling back to raw text:', err);
  }
  
  // If parsing failed or keys don't exist, return the clean raw text directly
  return cleanText;
}
