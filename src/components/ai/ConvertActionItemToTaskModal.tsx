import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSpinner, faCheckCircle, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { AIActionItem } from '@/types/ai';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { Entry, Bullet } from '@/types';

interface ConvertActionItemToTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionItem: AIActionItem;
  insightId: string;
  userId: string;
  onSuccess: (bulletId: string) => void;
}

export default function ConvertActionItemToTaskModal({
  isOpen,
  onClose,
  actionItem,
  insightId,
  userId,
  onSuccess
}: ConvertActionItemToTaskModalProps) {
  const { entries, saveEntry, getEntryByDate } = useData();
  const [title, setTitle] = useState(actionItem.title || actionItem.text);
  const [deadline, setDeadline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      
      // 1. Get or create today's Entry
      let todayEntry: Entry | null = entries.find(e => e.date === todayDate) || null;
      if (!todayEntry) {
        todayEntry = await getEntryByDate(todayDate);
      }

      const entryToSave: Entry = todayEntry
        ? {
            ...todayEntry,
            bullets: [...(todayEntry.bullets || [])]
          }
        : {
            id: todayDate,
            date: todayDate,
            dream: '',
            bullets: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

      // 2. Create the checklist bullet
      const newBulletId = uuidv4();
      const newBullet: Bullet = {
        id: newBulletId,
        text: title.trim(),
        style: 'checklist',
        isHighlight: false,
        isCompleted: false,
        tags: [],
        mentions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(deadline ? { scheduledAt: new Date(deadline) } : {})
      };

      entryToSave.bullets.push(newBullet);
      entryToSave.updatedAt = new Date();

      // 3. Save entry to local + DB
      await saveEntry(entryToSave);

      // 4. Update the weekly AI Insight document in Firestore to link the bulletId
      const insightDocRef = doc(db, 'users', userId, 'aiInsights', insightId);
      const insightSnap = await getDoc(insightDocRef);

      if (insightSnap.exists()) {
        const insightData = insightSnap.data();
        const updatedActionItems = (insightData.actionItems || []).map((item: any) => {
          if (item.id === actionItem.id) {
            return { ...item, bulletId: newBulletId };
          }
          return item;
        });

        await updateDoc(insightDocRef, {
          actionItems: updatedActionItems
        });
      }

      onSuccess(newBulletId);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while converting task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[500px] rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-[#2F3331] dark:text-[#FAFAFA]">Add to Today's Logs</h3>
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">Task Title</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-[#CCD0CF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#151719] px-4 py-3 text-base text-[#2F3331] dark:text-[#FAFAFA] placeholder-[#A3A7A8] dark:placeholder-[#6F7476] transition-all focus:border-[#00DC7D] focus:ring-2 focus:ring-[#00DC7D]/10 focus:outline-none"
              style={{ minHeight: '80px' }}
              placeholder="Enter task description..."
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">Deadline (optional)</label>
            <div className="relative">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-2xl border border-[#CCD0CF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#151719] px-4 py-3 text-sm text-[#2F3331] dark:text-[#FAFAFA] transition-all focus:border-[#00DC7D] focus:ring-2 focus:ring-[#00DC7D]/10 focus:outline-none"
                disabled={isSaving}
              />
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
                  Adding...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
                  Confirm Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
