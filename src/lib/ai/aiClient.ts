import { resolveAIConfig } from './providerResolver';
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
}

export async function generateStructuredAI(input: GenerateStructuredAIInput): Promise<any> {
  const config = await resolveAIConfig(input.userId);

  // 1. Jalankan mode simulasi / Mock jika diaktifkan atau API Key kosong
  if (config.enableMock) {
    console.log(`[AI Client] Running in Simulation Mode (Mock) for feature: ${input.feature}`);
    if (input.feature === 'weekly-insight') {
      const start = input.fallbackParams?.weekStart || new Date().toISOString().split('T')[0];
      const end = input.fallbackParams?.weekEnd || new Date().toISOString().split('T')[0];
      return getMockWeeklyInsight(input.userId, start, end);
    } else if (input.feature === 'daily-insight') {
      return getMockDailyInsight(input.userId);
    } else {
      const content = input.fallbackParams?.content || '';
      return getMockSuggestedTags(content);
    }
  }

  const payloadString = typeof input.userPayload === 'string' 
    ? input.userPayload 
    : JSON.stringify(input.userPayload);

  console.log(`[AI Client] Dispatching server request to ${config.provider} using model ${config.model}`);

  // 2. Integrasi Riil dengan Google Gemini API (Default) dengan Autoretry Fallback
  if (config.provider === 'gemini') {
    // List model fallback yang akan dicoba berurutan jika model utama gagal
    const candidateModels = [
      config.model,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.5-pro',
      'gemini-1.5-pro'
    ];
    
    // Hilangkan duplikasi dan filter model kosong
    const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Client] Attempting Gemini request using model: ${modelName}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`,
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
          throw new Error(`Gemini API returned status code ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error('Gemini API returned empty text candidates.');
        }

        console.log(`[AI Client] Gemini call succeeded using model: ${modelName}`);

        if (input.feature === 'weekly-insight') {
          return parseAndValidateWeeklyInsight(rawText, getMockWeeklyInsight(input.userId, input.fallbackParams?.weekStart || '', input.fallbackParams?.weekEnd || ''));
        } else if (input.feature === 'daily-insight') {
          return parseAndValidateDailyInsight(rawText, getMockDailyInsight(input.userId));
        } else {
          return parseAndValidateTagSuggestions(rawText, getMockSuggestedTags(input.fallbackParams?.content || ''));
        }

      } catch (err: any) {
        console.warn(`[AI Client] Gemini call failed for model ${modelName}:`, err.message || err);
        lastError = err;
        // Lanjut ke model berikutnya di iterasi loop
      }
    }
    
    // Jika semua model gagal
    console.error('[AI Client] All Gemini fallback models exhausted.');
    throw new Error(`Gemini API Call Failed: ${lastError?.message || lastError}`);
  }

  // 3. Integrasi Riil dengan OpenAI API
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
        throw new Error(`OpenAI API returned status code ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error('OpenAI API returned empty message content.');
      }

      if (input.feature === 'weekly-insight') {
        return parseAndValidateWeeklyInsight(rawText, getMockWeeklyInsight(input.userId, input.fallbackParams?.weekStart || '', input.fallbackParams?.weekEnd || ''));
      } else if (input.feature === 'daily-insight') {
        return parseAndValidateDailyInsight(rawText, getMockDailyInsight(input.userId));
      } else {
        return parseAndValidateTagSuggestions(rawText, getMockSuggestedTags(input.fallbackParams?.content || ''));
      }

    } catch (err: any) {
      console.error('[AI Client] OpenAI call failed:', err);
      throw new Error(`OpenAI API Call Failed: ${err.message || err}`);
    }
  }

  // Fallback umum jika tidak ada provider cocok
  if (input.feature === 'weekly-insight') {
    return getMockWeeklyInsight(input.userId, input.fallbackParams?.weekStart || '', input.fallbackParams?.weekEnd || '');
  } else if (input.feature === 'daily-insight') {
    return getMockDailyInsight(input.userId);
  } else {
    return getMockSuggestedTags(input.fallbackParams?.content || '');
  }
}
