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
    category: goal.category || 'Self-Care',
    priority: (goal.priority || 'medium') as 'low' | 'medium' | 'high',
    focusMode: goal.goalType,
    canBecomeGoal: true
  };

  // Styles for suggested goal categories
  const categoryStyles: Record<string, string> = {
    Health: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    Work: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    Creative: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
    Relationship: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    'Self-Care': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    Learning: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    Finance: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
  };

  const priorityStyles = {
    low: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
  };

  const catStyle = categoryStyles[goal.category || ''] || 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
  const prioStyle = priorityStyles[goal.priority || 'medium'];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] bg-[#FAFAFA] dark:bg-[#202324]/30 p-5 shadow-sm transition-all hover:shadow-md hover:border-[#CCD0CF] dark:hover:border-[#3E4246]">
      <div className="flex flex-wrap items-center gap-2">
        {goal.category && (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${catStyle}`}>
            {goal.category}
          </span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${prioStyle}`}>
          {goal.priority || 'medium'}
        </span>
      </div>

      <div className="flex-1">
        <h4 className="text-base font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{goal.title}</h4>
        <p className="mt-1.5 text-sm font-light leading-relaxed text-[#6F7476] dark:text-[#A3A7A8]">{goal.reason}</p>
      </div>

      <div className="mt-2 pt-2 border-t border-[#EEF0EF] dark:border-[#2E3133] flex items-center justify-end">
        {isGoalAdded ? (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00DC7D]">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
            Adopted to Focus
          </div>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#282A2D] border border-[#CCD0CF] dark:border-[#2E3133] px-4 py-2 text-xs font-semibold text-[#2F3331] dark:text-[#FAFAFA] shadow-sm hover:bg-[#F2F2F3] dark:hover:bg-[#3E4246] hover:text-[#00DC7D] dark:hover:text-[#00DC7D] hover:border-[#00DC7D] dark:hover:border-[#00DC7D] transition-all active:scale-95 cursor-pointer"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Reflections & Observations (7/12 width) */}
        <div className="space-y-8 lg:col-span-7">
          {/* 1. Quiet Summary & Key Events */}
          <section className="relative rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F3] dark:bg-[#282A2D] text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#E5E5E5] dark:hover:bg-[#3E4246] hover:text-[#2F3331] dark:hover:text-white transition-colors"
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

            <p className="font-serif text-lg font-light leading-9 text-[#2F3331] dark:text-[#FAFAFA] first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-[#00DC7D]">
              {insight.summary}
            </p>

            {/* Key Events list in Summary card */}
            {insight.keyEvents && insight.keyEvents.length > 0 && (
              <div className="mt-8 border-t border-[#EEF0EF] dark:border-[#2E3133] pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F7476] dark:text-[#A3A7A8] mb-3 font-mono">Key Events from your Journey</h4>
                <ul className="space-y-2.5">
                  {insight.keyEvents.map((event, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-[#5D6264] dark:text-[#A3A7A8] leading-relaxed">
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
            <section className="rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
              <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#FF6B6B]">
                <FontAwesomeIcon icon={faHeart} className="h-4 w-4 text-[#FF6B6B]" />
                <span>Emotional & Energy Patterns</span>
              </div>
              <div className="grid gap-6 grid-cols-1">
                {insight.emotionalPatterns.map((pattern, index) => {
                  const confidencePercent = Math.round((pattern.confidence || 0.7) * 100);
                  return (
                    <div key={index} className="flex flex-col gap-2 rounded-2xl bg-[#FAFAFA] dark:bg-[#202324]/30 border border-[#EEF0EF] dark:border-[#2E3133] p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-[#2F3331] dark:text-[#FAFAFA]">{pattern.label}</span>
                        <span className="text-[10px] font-bold text-[#FF6B6B] uppercase font-mono tracking-wider">{confidencePercent}% confidence</span>
                      </div>
                      {/* Progress bar */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/40 dark:bg-neutral-800 p-[0.5px]">
                        <div
                          className="h-full rounded-full transition-all duration-500 fiery-progress"
                          style={{ width: `${confidencePercent}%` }}
                        />
                        {confidencePercent > 0 && confidencePercent < 100 && (
                          <div 
                            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)] animate-ping"
                            style={{ 
                              left: `${confidencePercent}%`,
                              backgroundColor: '#FF4500' 
                            }}
                          />
                        )}
                      </div>
                      <p className="text-sm font-light text-[#6F7476] dark:text-[#A3A7A8] leading-relaxed mt-1">
                        {pattern.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Themes & Lessons Grid */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {/* Themes */}
            <section className="rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
              <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#FFB95C]">
                <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
                <span>Recurring Themes</span>
              </div>
              <div className="space-y-4">
                {(insight.recurringThemes || insight.themes || []).map((theme, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFEEAA] dark:bg-[#B86B00]/25 text-xs font-bold text-[#B86B00] dark:text-[#FFD166]">
                      {index + 1}
                    </span>
                    <p className="text-sm font-light leading-relaxed text-[#2F3331] dark:text-[#FAFAFA]">{theme}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Lessons */}
            <section className="rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
              <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-[#C494FF]">
                <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" />
                <span>Lessons Learned</span>
              </div>
              <div className="space-y-4">
                {insight.lessons.map((lesson, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDD6FF] dark:bg-[#6B21A8]/25 text-xs font-bold text-[#6B21A8] dark:text-[#C494FF]">
                      {index + 1}
                    </span>
                    <p className="text-sm font-light leading-relaxed text-[#2F3331] dark:text-[#FAFAFA]">{lesson}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN: Actions & Goals (5/12 width) */}
        <div className="space-y-8 lg:col-span-5">
          {/* 4. Suggested Focus Goals */}
          {insight.suggestedGoals && insight.suggestedGoals.length > 0 && (
            <section className="rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
              <div className="mb-6 flex items-center gap-2.5 text-sm font-bold text-pink-500">
                <FontAwesomeIcon icon={faBullseye} className="h-4 w-4" />
                <span>Suggested Focus Goals</span>
              </div>
              
              <div className="grid gap-4 grid-cols-1">
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
          <section className="rounded-3xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white dark:bg-[#1E2022] p-6 shadow-sm md:p-8 hover:scale-[1.01] hover:border-[#CCD0CF] dark:hover:border-[#3E4246] hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-black/40 transition-all duration-300">
            <div className="mb-6 flex items-center gap-2.5 text-sm font-bold text-[#5D8AFF]">
              <FontAwesomeIcon icon={faListCheck} className="h-4 w-4" />
              <span>Recommended Action Items</span>
            </div>
            
            <div className="grid gap-4 grid-cols-1">
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
        </div>

      </div>

      {/* Subtle model meta display */}
      {insight.aiMeta && (
        <div className="text-[10px] text-[#A3A7A8] dark:text-[#6F7476] font-mono text-center flex items-center justify-center gap-2">
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
