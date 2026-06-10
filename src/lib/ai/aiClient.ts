import { resolveAIConfig, ClientAIConfig } from './providerResolver';
import { getMockWeeklyInsight, getMockSuggestedTags, getMockDailyInsight } from './mockResponses';
import { parseAndValidateWeeklyInsight, parseAndValidateTagSuggestions, parseAndValidateDailyInsight } from './validateAIResponse';

export interface GenerateStructuredAIInput {
  userId: string;
  systemPrompt: string;
  userPayload: unknown;
  feature: 'weekly-insight' | 'suggest-tags' | 'daily-insight';
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
