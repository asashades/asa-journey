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
    <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-5 shadow-sm transition-all hover:shadow-md">
      {/* Suggested Deadline */}
      {actionItem.suggestedDeadline && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6F7476]">
            <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5 text-[#00DC7D]" />
            Deadline: {actionItem.suggestedDeadline}
          </span>
        </div>
      )}

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
            Added to Today's Logs
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
