import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSpinner, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { AIActionItem } from '@/types/ai';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface SuggestedGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionItem: AIActionItem;
  insightId: string;
  userId: string;
  onSuccess: (goal: any) => void;
}

export default function SuggestedGoalModal({
  isOpen,
  onClose,
  actionItem,
  insightId,
  userId,
  onSuccess
}: SuggestedGoalModalProps) {
  const [title, setTitle] = useState(actionItem.text);
  const [category, setCategory] = useState(actionItem.category || 'Self-Care');
  const [priority, setPriority] = useState<number>(3); // Default medium (3)
  const [focusMode, setFocusMode] = useState<'hyperfocus' | 'top3' | 'pareto'>(actionItem.focusMode || 'top3');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const createGoalClientSide = async () => {
    // 1. Ambil seluruh goal aktif untuk menghitung prioritas maksimal
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
      content: title.trim(),
      priority: maxPriority + 1,
      isCompleted: false,
      progress: 0,
      category: category || 'Self-Care',
      focusMode: focusMode || 'top3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'ai_weekly_reflection',
      sourceInsightId: insightId,
      sourceActionItemId: actionItem.id
    };

    await setDoc(newGoalRef, newGoal);

    // 3. Perbarui dokumen AI Reflection untuk menautkan goalId
    const insightDocRef = doc(db, 'users', userId, 'aiInsights', insightId);
    const insightSnap = await getDoc(insightDocRef);

    if (insightSnap.exists()) {
      const insightData = insightSnap.data();
      const updatedActionItems = (insightData.actionItems || []).map((item: any) => {
        if (item.id === actionItem.id) {
          return { ...item, goalId };
        }
        return item;
      });

      await updateDoc(insightDocRef, {
        actionItems: updatedActionItems
      });
      console.log(`[Create Goal Client] Successfully linked action item ${actionItem.id} to goal ${goalId}`);
    }

    return { success: true, goal: newGoal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Nama tujuan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let data: any = null;
      let success = false;

      try {
        const response = await fetch('/api/goals/from-action-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            insightId,
            actionItemId: actionItem.id,
            title: title.trim(),
            priority: priority === 5 ? 'high' : priority === 1 ? 'low' : 'medium',
            focusMode,
            category
          })
        });

        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || response.status === 404) {
          throw new Error('API route returned HTML or 404. Running client-side fallback.');
        }

        data = JSON.parse(text);
        success = response.ok && data.success;
      } catch (fetchErr) {
        console.warn('[SuggestedGoalModal] API route failed or returned HTML. Saving goal client-side...', fetchErr);
        data = await createGoalClientSide();
        success = data.success;
      }

      if (!success) {
        throw new Error(data?.message || 'Gagal menyimpan tujuan.');
      }

      onSuccess(data.goal);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat mengonversi tujuan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[500px] rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-[#2F3331] dark:text-[#FAFAFA]">Add Focus Goal</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] dark:text-[#6F7476] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-white transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#FF453A]/10 p-3 text-xs font-semibold text-[#FF453A]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">Goal Title</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-[#CCD0CF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#151719] px-4 py-3 text-base text-[#2F3331] dark:text-[#FAFAFA] placeholder-[#A3A7A8] dark:placeholder-[#6F7476] transition-all focus:border-[#00DC7D] focus:ring-2 focus:ring-[#00DC7D]/10 focus:outline-none"
              style={{ minHeight: '80px' }}
              placeholder="Tulis tujuan Anda..."
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-[#CCD0CF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#151719] px-4 py-3 text-sm text-[#2F3331] dark:text-[#FAFAFA] transition-all focus:border-[#00DC7D] focus:ring-2 focus:ring-[#00DC7D]/10 focus:outline-none"
              disabled={isSaving}
            >
              {['Health', 'Work', 'Creative', 'Relationship', 'Self-Care', 'Spirituality'].map((cat) => (
                <option key={cat} value={cat} className="dark:bg-[#1E2022] dark:text-[#FAFAFA]">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">Priority Level</label>
            <div className="flex items-center gap-3">
              {[
                { val: 1, label: 'Low' },
                { val: 3, label: 'Medium' },
                { val: 5, label: 'High' }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setPriority(p.val)}
                  className={`flex-1 rounded-2xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    priority === p.val
                      ? 'border-[#00DC7D] bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00DC7D] dark:text-[#00DC7D]'
                      : 'border-[#CCD0CF] dark:border-[#2E3133] bg-white dark:bg-[#282A2D] text-[#6F7476] dark:text-[#A3A7A8] hover:border-[#A3A7A8] dark:hover:border-neutral-500'
                  }`}
                  disabled={isSaving}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#CCD0CF] dark:border-[#2E3133] py-3 text-sm font-semibold text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#282A2D] hover:text-[#2F3331] dark:hover:text-white transition-colors cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#00DC7D] py-3 text-sm font-bold text-white shadow-lg shadow-[#00DC7D]/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
                  Confirm Goal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
