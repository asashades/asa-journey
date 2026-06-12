import { resolveAIConfig, ClientAIConfig } from './providerResolver';
import { getMockWeeklyInsight, getMockSuggestedTags, getMockDailyInsight } from './mockResponses';
import { parseAndValidateWeeklyInsight, parseAndValidateTagSuggestions, parseAndValidateDailyInsight } from './validateAIResponse';

export interface GenerateStructuredAIInput {
  userId: string;
  systemPrompt: string;
  userPayload: unknown;
  feature: 'weekly-insight' | 'suggest-tags' | 'daily-insight' | 'refine-note';
  // Fallbacks for mock mode
  fallbackParams?: {
    weekStart?: string;
    weekEnd?: string;
    content?: string;
  };
  aiConfig?: ClientAIConfig;
}

// Helper: parse and return the result based on feature type
function parseResult(input: GenerateStructuredAIInput, rawText: string) {
  if (input.feature === 'weekly-insight') {
    return parseAndValidateWeeklyInsight(rawText, getMockWeeklyInsight(input.userId, input.fallbackParams?.weekStart || '', input.fallbackParams?.weekEnd || ''));
  } else if (input.feature === 'daily-insight') {
    return parseAndValidateDailyInsight(rawText, getMockDailyInsight(input.userId));
  } else if (input.feature === 'refine-note') {
    return parseAIResponse(rawText);
  } else {
    return parseAndValidateTagSuggestions(rawText, getMockSuggestedTags(input.fallbackParams?.content || ''));
  }
}

// Helper: return mock result based on feature type
function getMockResult(input: GenerateStructuredAIInput) {
  if (input.feature === 'weekly-insight') {
    const start = input.fallbackParams?.weekStart || new Date().toISOString().split('T')[0];
    const end = input.fallbackParams?.weekEnd || new Date().toISOString().split('T')[0];
    return getMockWeeklyInsight(input.userId, start, end);
  } else if (input.feature === 'daily-insight') {
    return getMockDailyInsight(input.userId);
  } else if (input.feature === 'refine-note') {
    const action = (input.userPayload as any)?.action || 'beautify';
    const noteContent = (input.userPayload as any)?.noteContent || '';
    if (action === 'beautify') {
      return { refinedText: `# ${noteContent.split('\n')[0]?.replace(/[#*_\-]/g, '').trim() || 'Catatan Refined'}\n\n> [!NOTE] Core Highlight\n> Catatan ini telah dirapikan struktur Markdown-nya dan diperbaiki tata bahasanya agar lebih mudah dibaca dan dipahami.\n\n${noteContent}` };
    } else if (action === 'summarize') {
      return { refinedText: `> [!NOTE]+ AI Summary\n> Catatan ini membahas refleksi ide pengembangan fitur AI notes dan integrasinya dengan halaman sasaran (goals).\n\n${noteContent}\n\n### Action Items\n- [ ] Menambahkan tombol AI Refine di Note Editor\n- [ ] Menghubungkan tugas checklist note dengan Goals Inbox` };
    } else {
      return { refinedText: `${noteContent}\n\n---\n\n### ✨ Extracted Wisdom\n\n> [!LESSON]\n> Menyederhanakan alur kerja akan meningkatkan retensi pengguna.\n> context : Workflow optimization\n\n> [!IDEA]\n> Buat widget mini checklist di dashboard untuk mempermudah akses inbox tasks.\n\n> [!FACT]\n> Rata-rata pengguna menghabiskan 3 menit per sesi journaling.\n> source : UX Research Report\n\n> [!QUOTE]\n> "The unexamined life is not worth living."\n> -- Socrates\n\n> [!THOUGHT]\n> Mungkin integrasi AI harus lebih pasif, tidak terlalu agresif mengoreksi.\n\n> [!EXCERPT]\n> Bagian tentang workflow automation sangat relevan dengan proyek saat ini.\n> -- Self-reflection\n> source : Personal Journal` };
    }
  } else {
    return getMockSuggestedTags(input.fallbackParams?.content || '');
  }
}

// Daftar model Gemini fallback 2026 yang didukung secara resmi
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
];

// Panggil Gemini API dengan fallback chain otomatis
async function callGeminiWithFallback(
  apiKey: string,
  preferredModel: string,
  input: GenerateStructuredAIInput,
  payloadString: string
): Promise<any> {
  const candidateModels = [preferredModel, ...GEMINI_FALLBACK_MODELS];
  const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI Client] Attempting Gemini request using model: ${modelName}`);
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
                  { text: input.systemPrompt },
                  { text: `Berikut adalah payload datanya:\n\n${payloadString}` }
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
        let errorBody = '';
        try { errorBody = await response.text(); } catch { /* ignore */ }
        
        let errorMsg = `Gemini model "${modelName}" returned status ${response.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch { /* ignore */ }

        console.warn(`[AI Client] Gemini ${modelName} returned ${response.status}: ${errorBody.substring(0, 300)}`);
        
        // Jika error quota/credits depleted (429) atau auth key (401, 403), throw fatal error agar tidak lanjut loop fallback
        if (response.status === 429 || response.status === 401 || response.status === 403) {
          const fatalError = new Error(errorMsg);
          (fatalError as any).fatal = true;
          throw fatalError;
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error(`Gemini model "${modelName}" returned empty text candidates.`);
      }

      console.log(`[AI Client] ✅ Gemini call succeeded using model: ${modelName}`);
      return parseResult(input, rawText);

    } catch (err: any) {
      console.warn(`[AI Client] Gemini call failed for model ${modelName}:`, err.message || err);
      lastError = err;
      if (err.fatal) {
        break; // Stop loop, fail fast
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

export async function generateStructuredAI(input: GenerateStructuredAIInput): Promise<any> {
  const config = await resolveAIConfig(input.userId, input.aiConfig);

  // 1. Mode simulasi / Mock jika diaktifkan atau API Key kosong
  if (config.enableMock) {
    console.log(`[AI Client] Running in Simulation Mode (Mock) for feature: ${input.feature}`);
    return getMockResult(input);
  }

  const payloadString = typeof input.userPayload === 'string' 
    ? input.userPayload 
    : JSON.stringify(input.userPayload);

  console.log(`[AI Client] Dispatching to provider="${config.provider}" model="${config.model}"`);

  // ─── 2. GEMINI (Default & Primary) ───────────────────────────
  if (config.provider === 'gemini') {
    const geminiKey = config.apiKey 
      || (typeof window !== 'undefined' ? '' : process.env.GEMINI_API_KEY || '')
      || (typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '') : '');
    
    if (!geminiKey) {
      console.warn('[AI Client] No Gemini API key available, returning mock.');
      return getMockResult(input);
    }

    return callGeminiWithFallback(geminiKey, config.model, input, payloadString);
  }

  // ─── 3. OPENAI ───────────────────────────────────────────────
  if (config.provider === 'openai') {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: payloadString }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        let errorBody = '';
        try { errorBody = await response.text(); } catch { /* ignore */ }
        throw new Error(`OpenAI API returned status ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error('OpenAI API returned empty message content.');
      }

      return parseResult(input, rawText);

    } catch (err: any) {
      console.error('[AI Client] OpenAI call failed:', err.message);
      const fallbackGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (fallbackGeminiKey) {
        console.log('[AI Client] Falling back from OpenAI → Gemini...');
        try {
          return await callGeminiWithFallback(fallbackGeminiKey, 'gemini-3.5-flash', input, payloadString);
        } catch (geminiErr: any) {
          console.error('[AI Client] Gemini fallback also failed:', geminiErr.message);
        }
      }
      throw new Error(`OpenAI API Call Failed: ${err.message || err}`);
    }
  }

  // ─── 4. ANTHROPIC ────────────────────────────────────────────
  if (config.provider === 'anthropic') {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          system: input.systemPrompt,
          messages: [
            { role: 'user', content: payloadString }
          ]
        })
      });

      if (!response.ok) {
        let errorBody = '';
        try { errorBody = await response.text(); } catch { /* ignore */ }
        throw new Error(`Anthropic API returned status ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text;

      if (!rawText) {
        throw new Error('Anthropic API returned empty content.');
      }

      return parseResult(input, rawText);

    } catch (err: any) {
      console.error('[AI Client] Anthropic call failed:', err.message);
      const fallbackGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (fallbackGeminiKey) {
        console.log('[AI Client] Falling back from Anthropic → Gemini...');
        try {
          return await callGeminiWithFallback(fallbackGeminiKey, 'gemini-3.5-flash', input, payloadString);
        } catch (geminiErr: any) {
          console.error('[AI Client] Gemini fallback also failed:', geminiErr.message);
        }
      }
      throw new Error(`Anthropic API Call Failed: ${err.message || err}`);
    }
  }

  // ─── 5. DEEPSEEK ────────────────────────────────────────────
  if (config.provider === 'deepseek') {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: payloadString }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        let errorBody = '';
        try { errorBody = await response.text(); } catch { /* ignore */ }
        throw new Error(`DeepSeek API returned status ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error('DeepSeek API returned empty message content.');
      }

      return parseResult(input, rawText);

    } catch (err: any) {
      console.error('[AI Client] DeepSeek call failed:', err.message);
      const fallbackGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      if (fallbackGeminiKey) {
        console.log('[AI Client] Falling back from DeepSeek → Gemini...');
        try {
          return await callGeminiWithFallback(fallbackGeminiKey, 'gemini-3.5-flash', input, payloadString);
        } catch (geminiErr: any) {
          console.error('[AI Client] Gemini fallback also failed:', geminiErr.message);
        }
      }
      throw new Error(`DeepSeek API Call Failed: ${err.message || err}`);
    }
  }

  // ─── 6. Provider tidak dikenali → langsung coba Gemini ──────
  console.warn(`[AI Client] Unknown provider "${config.provider}", attempting Gemini fallback...`);
  const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (envGeminiKey) {
    try {
      return await callGeminiWithFallback(envGeminiKey, 'gemini-3.5-flash', input, payloadString);
    } catch (err: any) {
      console.error('[AI Client] Final Gemini fallback failed:', err.message);
    }
  }

  console.warn('[AI Client] All providers failed, returning mock response.');
  return getMockResult(input);
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
    console.warn('[AI Client] JSON parsing failed for refine-note, returning raw text:', err);
  }
  
  return cleanText;
}

export async function refineNoteClientSide(
  noteContent: string,
  action: 'beautify' | 'summarize' | 'wisdom',
  userId: string,
  aiConfig?: ClientAIConfig
): Promise<{ success: boolean; refinedText: string }> {
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
2. Scan the text for any actionable items, tasks, or things to do. Convert them into clean checklist tasks \`- [ ] Task text\` and append them under an "Action Items" header at the bottom of the note.
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

  const result = await generateStructuredAI({
    userId,
    systemPrompt,
    userPayload: { noteContent, action },
    feature: 'refine-note',
    fallbackParams: {
      content: noteContent
    },
    aiConfig
  });

  // Update Firestore usage quota
  const targetUserId = userId || 'anonymous_user';
  const config = await resolveAIConfig(targetUserId, aiConfig);
  const isBYOK = config.mode === 'bring_your_own_key';
  
  if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
    try {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const now = new Date();
      const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageDocId = `ai_${yyyyMM}`;
      const usageDocRef = doc(db, 'users', targetUserId, 'usage', usageDocId);

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
    } catch (quotaErr) {
      console.warn('[AI Client] Failed to update refine usage quota in Firestore:', quotaErr);
    }
  }

  return {
    success: true,
    refinedText: typeof result === 'string' ? result : (result?.refinedText || '')
  };
}
