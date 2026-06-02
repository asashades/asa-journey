import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheckCircle, faBullseye, faStar } from '@fortawesome/free-solid-svg-icons';
import { AIActionItem } from '@/types/ai';
import ConvertActionItemToTaskModal from './ConvertActionItemToTaskModal';

interface ActionItemCardProps {
  actionItem: AIActionItem;
  insightId: string;
  userId: string;
  onGoalCreated: (bulletId: string) => void;
}

const categoryStyles: Record<string, { bg: string; text: string }> = {
  Health: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', bgDark: 'dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30' },
  Work: { bg: 'bg-blue-50 text-blue-700 border-blue-100', bgDark: 'dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30' },
  Creative: { bg: 'bg-purple-50 text-purple-700 border-purple-100', bgDark: 'dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/30' },
  Relationship: { bg: 'bg-rose-50 text-rose-700 border-rose-100', bgDark: 'dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30' },
  'Self-Care': { bg: 'bg-amber-50 text-amber-700 border-amber-100', bgDark: 'dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' }
} as any;

const priorityStyles = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-700'
};

export default function ActionItemCard({
  actionItem,
  insightId,
  userId,
  onGoalCreated
}: ActionItemCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [localBulletId, setLocalBulletId] = useState(actionItem.bulletId);

  const style = categoryStyles[actionItem.category] || categoryStyles['Self-Care'];
  const priorityStyle = priorityStyles[actionItem.priority] || priorityStyles.medium;
  
  const isTaskAdded = !!localBulletId;

  const handleSuccess = (bulletId: string) => {
    setLocalBulletId(bulletId);
    onGoalCreated(bulletId);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-5 shadow-sm transition-all hover:shadow-md">
      {/* Category and Priority Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.bg}`}>
          {actionItem.category}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityStyle}`}>
          {actionItem.priority}
        </span>
      </div>

      {/* Description Text */}
      <div className="flex-1">
        <h4 className="text-base font-semibold text-[#2F3331]">
          {actionItem.title || actionItem.text}
        </h4>
        {actionItem.description && (
          <p className="mt-1.5 text-sm font-light leading-relaxed text-[#6F7476]">
            {actionItem.description}
          </p>
        )}
      </div>

      {/* Convert CTA */}
      <div className="mt-2 pt-2 border-t border-[#EEF0EF] flex items-center justify-end">
        {isTaskAdded ? (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00DC7D]">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
            ✓ Added to Today's Logs
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#CCD0CF] px-4 py-2 text-xs font-semibold text-[#2F3331] shadow-sm hover:bg-[#F2F2F3] hover:text-[#00DC7D] hover:border-[#00DC7D] transition-all active:scale-95 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            Add to Today's Logs
          </button>
        )}
      </div>

      <ConvertActionItemToTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionItem={actionItem}
        insightId={insightId}
        userId={userId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
