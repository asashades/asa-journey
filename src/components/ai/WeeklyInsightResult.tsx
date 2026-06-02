import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faTrash, faCopy, faCheck, faCompass, faBookOpen, faListCheck, faBullseye, faPlus, faCheckCircle, faHeart } from '@fortawesome/free-solid-svg-icons';
import { AIInsight, AISuggestedGoal } from '@/types/ai';
import ActionItemCard from './ActionItemCard';
import SuggestedGoalModal from './SuggestedGoalModal';

interface WeeklyInsightResultProps {
  insight: AIInsight;
  userId: string;
  onGoalCreated: (goal: any) => void;
  onDelete: () => void;
}

interface SuggestedGoalCardProps {
  goal: AISuggestedGoal;
  insightId: string;
  userId: string;
  onGoalCreated: (goal: any) => void;
}

function SuggestedGoalCard({ goal, insightId, userId, onGoalCreated }: SuggestedGoalCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [localGoalId, setLocalGoalId] = useState(goal.createdGoalId);

  const isGoalAdded = !!localGoalId;

  const handleSuccess = (newGoal: any) => {
    setLocalGoalId(newGoal.id);
    onGoalCreated(newGoal);
  };

  // Adapter to convert suggested goal to AIActionItem shape for the modal
  const adapterActionItem = {
    id: goal.id,
    text: goal.title,
    title: goal.title,
    category: 'Self-Care',
    priority: 'medium' as const,
    focusMode: goal.goalType,
    canBecomeGoal: true
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF0EF] bg-[#FAFAFA] p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-700">
          <FontAwesomeIcon icon={faBullseye} className="h-2.5 w-2.5" />
          {goal.goalType === 'hyperfocus' ? 'Hyperfocus' : goal.goalType === 'pareto' ? 'Pareto' : 'Top 3'}
        </span>
      </div>

      <div className="flex-1">
        <h4 className="text-base font-semibold text-[#2F3331]">{goal.title}</h4>
        <p className="mt-1.5 text-sm font-light leading-relaxed text-[#6F7476]">{goal.reason}</p>
      </div>

      <div className="mt-2 pt-2 border-t border-[#EEF0EF] flex items-center justify-end">
        {isGoalAdded ? (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00DC7D]">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
            Adopted to Focus
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#CCD0CF] px-4 py-2 text-xs font-semibold text-[#2F3331] shadow-sm hover:bg-[#F2F2F3] hover:text-[#00DC7D] hover:border-[#00DC7D] transition-all active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            Adopt Goal
          </button>
        )}
      </div>

      <SuggestedGoalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionItem={adapterActionItem}
        insightId={insightId}
        userId={userId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function WeeklyInsightResult({
  insight,
  userId,
  onGoalCreated,
  onDelete
}: WeeklyInsightResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Refleksi Mingguan ASA Journey (${insight.weekStart} s/d ${insight.weekEnd})
    
Summary:
${insight.summary}

Key Events:
${(insight.keyEvents || []).map((e, idx) => `- ${e}`).join('\n')}

Themes:
${(insight.recurringThemes || insight.themes || []).map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

Lessons:
${insight.lessons.map((l, idx) => `${idx + 1}. ${l}`).join('\n')}

Action Items:
${insight.actionItems.map((item, idx) => `${idx + 1}. [${item.category}] ${item.title || item.text}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* 1. Quiet Summary & Key Events */}
      <section className="relative rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
        {/* Subtle decorative cosmic glow */}
        <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-[#00DC7D]/5 blur-3xl" />
        
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#00DC7D]">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4 animate-pulse" />
            <span>Quiet Reflection Summary</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F3] text-[#6F7476] hover:bg-[#E5E5E5] hover:text-[#2F3331] transition-colors"
              title="Copy Reflection"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF453A]/10 text-[#FF453A] hover:bg-[#FF453A]/20 transition-colors"
              title="Delete Reflection"
            >
              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="font-serif text-lg font-light leading-9 text-[#2F3331] first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-[#00DC7D]">
          {insight.summary}
        </p>

        {/* Key Events list in Summary card */}
        {insight.keyEvents && insight.keyEvents.length > 0 && (
          <div className="mt-8 border-t border-[#EEF0EF] pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7476] mb-3 font-mono">Key Events from your Journey</h4>
            <ul className="space-y-2.5">
              {insight.keyEvents.map((event, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-[#5D6264] leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00DC7D]" />
                  <span>{event}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 2. Emotional & Energy Patterns */}
      {insight.emotionalPatterns && insight.emotionalPatterns.length > 0 && (
        <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#FF6B6B]">
            <FontAwesomeIcon icon={faHeart} className="h-4 w-4 text-[#FF6B6B]" />
            <span>Emotional & Energy Patterns</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {insight.emotionalPatterns.map((pattern, index) => {
              const confidencePercent = Math.round((pattern.confidence || 0.7) * 100);
              return (
                <div key={index} className="flex flex-col gap-2 rounded-2xl bg-[#FAFAFA] border border-[#EEF0EF] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#2F3331]">{pattern.label}</span>
                    <span className="text-[10px] font-bold text-[#FF6B6B] uppercase font-mono tracking-wider">{confidencePercent}% confidence</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-[#EEF0EF] overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-[#FF6B6B] transition-all duration-500"
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                  <p className="text-sm font-light text-[#6F7476] leading-relaxed mt-1">
                    {pattern.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Themes & Lessons Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Themes */}
        <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#FFB95C]">
            <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
            <span>Recurring Themes</span>
          </div>
          <div className="space-y-4">
            {(insight.recurringThemes || insight.themes || []).map((theme, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFEEAA] text-xs font-bold text-[#B86B00]">
                  {index + 1}
                </span>
                <p className="text-base font-light leading-7 text-[#2F3331]">{theme}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Lessons */}
        <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#C494FF]">
            <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" />
            <span>Lessons Learned</span>
          </div>
          <div className="space-y-4">
            {insight.lessons.map((lesson, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDD6FF] text-xs font-bold text-[#6B21A8]">
                  {index + 1}
                </span>
                <p className="text-base font-light leading-7 text-[#2F3331]">{lesson}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4. Suggested Focus Goals */}
      {insight.suggestedGoals && insight.suggestedGoals.length > 0 && (
        <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-2.5 text-sm font-bold text-pink-500">
            <FontAwesomeIcon icon={faBullseye} className="h-4 w-4" />
            <span>Suggested Focus Goals</span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {insight.suggestedGoals.map((goal) => (
              <SuggestedGoalCard
                key={goal.id}
                goal={goal}
                insightId={insight.id}
                userId={userId}
                onGoalCreated={onGoalCreated}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Action Items */}
      <section className="rounded-3xl border border-[#EEF0EF] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-2.5 text-sm font-bold text-[#5D8AFF]">
          <FontAwesomeIcon icon={faListCheck} className="h-4 w-4" />
          <span>Recommended Action Items</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {insight.actionItems.map((item) => (
            <ActionItemCard
              key={item.id}
              actionItem={item}
              insightId={insight.id}
              userId={userId}
              onGoalCreated={onGoalCreated}
            />
          ))}
        </div>
      </section>

      {/* Subtle model meta display */}
      {insight.aiMeta && (
        <div className="text-[10px] text-[#A3A7A8] font-mono text-center flex items-center justify-center gap-2">
          <span>Model: {insight.aiMeta.model || 'gemini'}</span>
          <span>•</span>
          <span>v{insight.aiMeta.promptVersion}</span>
          <span>•</span>
          <span>Generated: {new Date(insight.aiMeta.generatedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
