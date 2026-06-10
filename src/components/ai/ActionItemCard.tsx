import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { AIActionItem } from '@/types/ai';
import ConvertActionItemToTaskModal from './ConvertActionItemToTaskModal';

interface ActionItemCardProps {
  actionItem: AIActionItem;
  insightId: string;
  userId: string;
  onGoalCreated: (bulletId: string) => void;
}

export default function ActionItemCard({
  actionItem,
  insightId,
  userId,
  onGoalCreated
}: ActionItemCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [localBulletId, setLocalBulletId] = useState(actionItem.bulletId);

  const isTaskAdded = !!localBulletId;

  const handleSuccess = (bulletId: string) => {
    setLocalBulletId(bulletId);
    onGoalCreated(bulletId);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#EEF0EF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#202324]/30 p-4 shadow-sm transition-all hover:shadow-md hover:border-[#CCD0CF] dark:hover:border-[#3E4246]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#2F3331] dark:text-[#FAFAFA] leading-snug">
            {actionItem.title || actionItem.text}
          </h4>
          {actionItem.description && (
            <p className="mt-1 text-xs font-light leading-relaxed text-[#6F7476] dark:text-[#A3A7A8]">
              {actionItem.description}
            </p>
          )}
        </div>

        {/* Suggested Deadline */}
        {actionItem.suggestedDeadline && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-[#2E3133]/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8]">
            <FontAwesomeIcon icon={faClock} className="h-2 w-2 text-[#00DC7D]" />
            {actionItem.suggestedDeadline}
          </span>
        )}
      </div>

      {/* Convert CTA */}
      <div className="mt-1 pt-2 border-t border-[#EEF0EF]/60 dark:border-[#2E3133]/40 flex items-center justify-end">
        {isTaskAdded ? (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#00DC7D]">
            <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5" />
            Added to Today's Logs
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#282A2D] border border-[#CCD0CF] dark:border-[#2E3133] px-3 py-1 text-[10px] font-bold text-[#2F3331] dark:text-[#FAFAFA] shadow-sm hover:bg-[#F2F2F3] dark:hover:bg-[#3E4246] hover:text-[#00DC7D] dark:hover:text-[#00DC7D] hover:border-[#00DC7D] dark:hover:border-[#00DC7D] transition-all active:scale-95 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5" />
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
