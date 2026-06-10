import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faSpinner, faPlus, faCheck } from '@fortawesome/free-solid-svg-icons';
import { generateStructuredAI } from '@/lib/ai/aiClient';
import { TAG_SUGGESTION_PROMPT } from '@/lib/ai/prompts';
import { resolveAIConfig } from '@/lib/ai/providerResolver';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedTagChipsProps {
  content: string;
  userId: string;
  onAcceptTag: (tag: string) => void;
  onAcceptPerson: (person: string) => void;
  existingTags: string[];
  existingPeople: string[];
}

export default function SuggestedTagChips({
  content,
  userId,
  onAcceptTag,
  onAcceptPerson,
  existingTags,
  existingPeople
}: SuggestedTagChipsProps) {
  const { userProfile } = useAuth();
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const suggestTagsClientSide = async (content: string, userId: string) => {
    const targetUserId = userId || 'anonymous_user';

    // 1. Cek konfigurasi
    const config = await resolveAIConfig(targetUserId, userProfile?.settings?.aiConfig);

    // 2. Panggil Client AI Wrapper
    const result = await generateStructuredAI({
      userId: targetUserId,
      systemPrompt: TAG_SUGGESTION_PROMPT,
      userPayload: { entryContent: content },
      feature: 'suggest-tags',
      fallbackParams: {
        content
      },
      aiConfig: userProfile?.settings?.aiConfig
    });

    // 3. Perbarui kuota bulanan pengguna jika bukan mode mock, bukan anonymous, dan bukan BYOK
    const isBYOK = config.mode === 'bring_your_own_key';
    if (!isBYOK && !config.enableMock && targetUserId !== 'anonymous_user') {
      const now = new Date();
      const yyyyMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageDocId = `ai_${yyyyMM}`;
      const usageDocRef = doc(db, 'users', targetUserId, 'usage', usageDocId);

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

    return {
      success: true,
      suggestedTags: result.suggestedTags || [],
      suggestedPeople: result.suggestedPeople || []
    };
  };

  const handleFetchSuggestions = async () => {
    if (!content || !content.trim()) return;
    setIsLoading(true);
    try {
      let data: any = null;
      let success = false;

      try {
        const response = await fetch('/api/ai/suggest-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            userId,
            aiConfig: userProfile?.settings?.aiConfig
          })
        });

        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || response.status === 404) {
          throw new Error('API route returned HTML or 404. Running client-side fallback.');
        }

        data = JSON.parse(text);
        success = response.ok && data.success;
      } catch (fetchErr) {
        console.warn('[SuggestedTagChips] API route failed or returned HTML. Extracting tags client-side...', fetchErr);
        data = await suggestTagsClientSide(content, userId);
        success = data.success;
      }

      if (success && data) {
        // Saring rekomendasi agar tidak menampilkan tag/people yang sudah ada di entri jurnal saat ini
        const freshTags = (data.suggestedTags || []).filter(
          (t: string) => !existingTags.some(et => et.toLowerCase() === t.toLowerCase())
        );
        const freshPeople = (data.suggestedPeople || []).filter(
          (p: string) => !existingPeople.some(ep => ep.toLowerCase() === p.toLowerCase())
        );

        setSuggestedTags(freshTags);
        setSuggestedPeople(freshPeople);
      }
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching tag suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTag = (tag: string) => {
    onAcceptTag(tag);
    setSuggestedTags(prev => prev.filter(t => t !== tag));
  };

  const handleAcceptPerson = (person: string) => {
    onAcceptPerson(person);
    setSuggestedPeople(prev => prev.filter(p => p !== person));
  };

  const hasSuggestions = suggestedTags.length > 0 || suggestedPeople.length > 0;

  return (
    <div className="rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#6F7476] uppercase tracking-wider">
          <FontAwesomeIcon icon={faWandMagicSparkles} className="h-3.5 w-3.5 text-[#00DC7D]" />
          <span>AI Tag suggestions</span>
        </div>

        {!hasFetched && !isLoading && (
          <button
            onClick={handleFetchSuggestions}
            disabled={!content.trim()}
            className="rounded-lg bg-white border border-[#CCD0CF] px-3 py-1.5 text-xs font-semibold text-[#2F3331] shadow-sm hover:bg-[#F2F2F3] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Suggest Tags
          </button>
        )}

        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-[#A3A7A8]">
            <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin text-[#00DC7D]" />
            <span>Analyzing text...</span>
          </div>
        )}
      </div>

      {hasFetched && !isLoading && (
        <div className="mt-3">
          {hasSuggestions ? (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {/* Tags Suggestions */}
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAcceptTag(tag)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#E9FFF4] border border-[#00DC7D]/20 px-3 py-1 text-xs font-medium text-[#00DC7D] shadow-sm hover:bg-[#00DC7D] hover:text-white transition-all active:scale-90"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-2 w-2" />
                  #{tag}
                </button>
              ))}

              {/* People Suggestions */}
              {suggestedPeople.map((person) => (
                <button
                  key={person}
                  onClick={() => handleAcceptPerson(person)}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-90"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-2 w-2" />
                  @{person}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#A3A7A8] italic">
              Tidak ada saran tag baru untuk teks ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
