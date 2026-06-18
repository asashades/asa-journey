import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolveAIConfig } from '@/lib/ai/providerResolver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query: searchQuery, userId, relevantDocs, aiConfig } = body;

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json(
        { success: false, message: 'Search query is required.' },
        { status: 400 }
      );
    }

    const targetUserId = userId || 'anonymous_user';
    console.log(`[AI Search API] Search query: "${searchQuery}" triggered for user ${targetUserId}`);

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
          const monthlyLimit = Number(process.env.AI_SEARCH_MONTHLY_LIMIT) || 50;
          if ((usageData.searchCount || 0) >= monthlyLimit) {
            return NextResponse.json(
              { 
                success: false, 
                message: `You have reached your AI search limit for this month (${monthlyLimit}x per month).` 
              },
              { status: 429 }
            );
          }
        }
      } catch (quotaCheckErr) {
        console.warn(`[AI Search API] Failed to check usage quota from Firestore (likely permission error):`, quotaCheckErr);
      }
    }

    // 3. Handle Simulation / Mock Mode
    if (config.enableMock) {
      console.log(`[AI Search API] Running in Simulation Mode (Mock)`);
      const mockAnswer = `Based on your observatory memories, here is a summary related to **"${searchQuery}"**:
      
> [!NOTE] Simulation Analysis Result
> User searched for "${searchQuery}". This is a simulated response from your Second Brain.
 
Here are some referenced entries:
- You noted several ideas regarding productivity and refined micro-journaling.
- There are creative ideas about token-efficient AI assistant integration.
 
Would you like to add a new task target related to this?`;
      
      const referencedIds = Array.isArray(relevantDocs) ? relevantDocs.slice(0, 2).map((d: any) => d.id) : [];

      return NextResponse.json({
        success: true,
        answer: mockAnswer,
        referencedIds
      });
    }

    // 4. Formulate System Prompt
    const systemPrompt = `You are the AI Search Assistant (Second Brain) for "ASA Journey", an observatory-themed daily micro-journaling and reflection application.
Your goal is to answer the user's search query thoughtfully, clearly, and concisely, drawing ONLY from the provided journal entries, notes, wisdoms, ideas, goals, or tasks in the payload context.

Guidelines:
1. Synthesize an answer to the query based strictly on the provided context (documents). Do not hallucinate or invent details that are not in the provided documents.
2. If the answer cannot be found in the provided documents, politely state that you couldn't find any information about that in their journal or notes.
3. Organize your answer clearly. Use appropriate Markdown formatting: bullet points, bold text, horizontal dividers, and standard callouts if necessary (e.g., > [!NOTE] Key Takeaway).
4. Be supportive, calm, and slightly reflective in tone, maintaining the peaceful "observatory" vibe of the app.
5. Provide the IDs of the documents that were helpful or referenced in your response in a structured manner, so they can be matched back.
Return the result strictly as a JSON object with two keys:
- "answer": the markdown-formatted synthesized response.
- "referencedIds": an array of document IDs (from the provided list) that were actually used or relevant to answer the query.`;

    const payloadString = JSON.stringify({
      query: searchQuery,
      contextDocuments: relevantDocs || []
    });

    let searchResult: { answer: string; referencedIds: string[] } | null = null;

    // 5. Call AI Provider
    if (config.provider === 'gemini') {
      const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('Gemini API Key is not configured.');
      }

      // Try preferred model, fallback to flash
      const modelsToTry = [config.model, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3.5-flash'];
      let lastError: any = null;
      let callSuccess = false;

      for (const modelName of modelsToTry) {
        if (!modelName) continue;
        try {
          console.log(`[AI Search API] Calling Gemini model: ${modelName}`);
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
                      { text: `Berikut adalah payload data query dan dokumen konteks:\n\n${payloadString}` }
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
            searchResult = parseAIResponse(rawText);
            callSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`[AI Search API] Model ${modelName} failed:`, err);
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
        searchResult = parseAIResponse(rawText);
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
        searchResult = parseAIResponse(rawText);
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
        searchResult = parseAIResponse(rawText);
      }
    }

    if (!searchResult) {
      throw new Error('AI did not return any search result.');
    }

    // 6. Update Monthly Quota
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      try {
        const usageSnap = await getDoc(usageDocRef);
        if (usageSnap.exists()) {
          const usageData = usageSnap.data();
          await setDoc(usageDocRef, {
            ...usageData,
            searchCount: (usageData.searchCount || 0) + 1,
            lastSearchAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          await setDoc(usageDocRef, {
            userId: targetUserId,
            month: yyyyMM,
            weeklyInsightCount: 0,
            tagSuggestionCount: 0,
            noteRefineCount: 0,
            searchCount: 1,
            lastSearchAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (quotaUpdateErr) {
        console.warn(`[AI Search API] Failed to update usage quota in Firestore (likely permission error):`, quotaUpdateErr);
      }
    }

    return NextResponse.json({
      success: true,
      answer: searchResult.answer || '',
      referencedIds: searchResult.referencedIds || []
    });

  } catch (err: any) {
    console.error('[AI Search API] Error performing AI search:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to process AI search.' },
      { status: 500 }
    );
  }
}

function parseAIResponse(rawText: string): { answer: string; referencedIds: string[] } {
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
      return {
        answer: parsed.answer || '',
        referencedIds: Array.isArray(parsed.referencedIds) ? parsed.referencedIds : []
      };
    }
  } catch (err) {
    console.warn('[AI Search API] JSON parsing failed, falling back to raw text:', err);
  }
  
  // Fallback if parsing fails
  return {
    answer: cleanText,
    referencedIds: []
  };
}
