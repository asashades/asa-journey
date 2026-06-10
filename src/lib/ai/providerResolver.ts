import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ClientAIConfig {
  mode: 'built_in' | 'bring_your_own_key';
  provider?: 'gemini' | 'openai' | 'anthropic' | 'deepseek';
  apiKey?: string;
  modelName?: string;
  model?: string;
}

export interface ResolvedAIConfig {
  mode: 'built_in' | 'bring_your_own_key';
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek';
  model: string;
  apiKey: string;
  enableMock: boolean;
}

export async function resolveAIConfig(userId: string, clientAiConfig?: ClientAIConfig): Promise<ResolvedAIConfig> {
  let userMode: 'built_in' | 'bring_your_own_key' = 'built_in';
  let userProvider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | undefined = undefined;
  let userApiKey: string | undefined = undefined;
  let userModel: string | undefined = undefined;

  if (clientAiConfig) {
    userMode = clientAiConfig.mode || 'built_in';
    userProvider = clientAiConfig.provider;
    userApiKey = clientAiConfig.apiKey;
    userModel = clientAiConfig.modelName || clientAiConfig.model;
  } else {
    // 1. Ambil data profil pengguna secara asinkronus dari Firestore
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const aiConfig = data.settings?.aiConfig;
        if (aiConfig) {
          userMode = aiConfig.mode || 'built_in';
          userProvider = aiConfig.provider;
          userApiKey = aiConfig.apiKey;
          userModel = aiConfig.modelName;
        }
      }
    } catch (error) {
      console.error(`[resolveAIConfig] Error fetching user AI settings from Firestore:`, error);
    }
  }

  const isServer = typeof window === 'undefined';
  const enableMock = (isServer ? process.env.AI_ENABLE_MOCK_RESPONSE : process.env.NEXT_PUBLIC_AI_ENABLE_MOCK_RESPONSE) === 'true';

  let provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' = 'gemini';
  let apiKey = '';
  let model = '';

  // 2. Evaluasi status kustom BYOK
  if (userMode === 'bring_your_own_key' && userProvider && userApiKey) {
    provider = userProvider;
    apiKey = userApiKey;
    model = userModel || (
      provider === 'gemini'
        ? 'gemini-3.5-flash'
        : provider === 'openai'
        ? 'gpt-4o-mini'
        : provider === 'anthropic'
        ? 'claude-3-haiku-20240307'
        : 'deepseek-chat'
    );
  } else {
    // Mode Built-in (dapat diakses baik di server maupun di client statis via NEXT_PUBLIC)
    provider = (process.env.NEXT_PUBLIC_AI_DEFAULT_PROVIDER || process.env.AI_DEFAULT_PROVIDER || 'gemini') as 'gemini' | 'openai' | 'anthropic' | 'deepseek';
    model = process.env.NEXT_PUBLIC_AI_DEFAULT_MODEL || process.env.AI_DEFAULT_MODEL || (provider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini');
    
    if (provider === 'gemini') {
      apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    } else if (provider === 'openai') {
      apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    } else if (provider === 'anthropic') {
      apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    } else if (provider === 'deepseek') {
      apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '';
    }
  }

  // Normalisasi model Gemini jika masih menggunakan model yang tidak didukung/lama
  if (provider === 'gemini' && model === 'gemini-1.5-flash') {
    model = 'gemini-3.5-flash';
  }

  let finalEnableMock = false;
  if (userMode === 'bring_your_own_key') {
    finalEnableMock = !apiKey;
  } else {
    finalEnableMock = enableMock || !apiKey;
  }

  return {
    mode: userMode,
    provider,
    model,
    apiKey,
    enableMock: finalEnableMock,
  };
}
